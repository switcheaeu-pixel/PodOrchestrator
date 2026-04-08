"""
AI Service Manager - Unified interface for all AI services
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from decimal import Decimal
import json

from config import settings
from utils.cache import cache
from utils.cost_tracker import CostTracker
from services.providers import (
    OpenAIProvider,
    AnthropicProvider,
    LocalLLMProvider,
    GoogleAIProvider
)

logger = logging.getLogger(__name__)

@dataclass
class AIServiceConfig:
    """Configuration for AI service"""
    name: str
    provider: str
    model: str
    max_tokens: int = 2000
    temperature: float = 0.7
    timeout: int = 30
    retries: int = 3
    fallback_provider: Optional[str] = None

class AIServiceBase(ABC):
    """Base class for all AI services"""
    
    @abstractmethod
    async def generate(self, prompt: str, **kwargs) -> Dict[str, Any]:
        """Generate content from prompt"""
        pass
    
    @abstractmethod
    def calculate_cost(self, usage: Dict[str, Any]) -> Decimal:
        """Calculate cost based on usage"""
        pass

class AIServiceManager:
    """Manages multiple AI providers with cost-aware routing"""
    
    def __init__(self):
        self.providers = self._initialize_providers()
        self.cost_tracker = CostTracker()
        self.cache = cache
        
    def _initialize_providers(self) -> Dict[str, AIServiceBase]:
        """Initialize all available AI providers"""
        providers = {}
        
        # OpenAI
        if settings.OPENAI_API_KEY:
            providers['openai'] = OpenAIProvider(
                api_key=settings.OPENAI_API_KEY,
                organization=settings.OPENAI_ORG
            )
        
        # Anthropic
        if settings.ANTHROPIC_API_KEY:
            providers['anthropic'] = AnthropicProvider(
                api_key=settings.ANTHROPIC_API_KEY
            )
        
        # Google AI
        if settings.GOOGLE_AI_API_KEY:
            providers['google'] = GoogleAIProvider(
                api_key=settings.GOOGLE_AI_API_KEY
            )
        
        # Local LLM (Italian fine-tuned)
        if settings.LOCAL_LLM_ENABLED:
            providers['local'] = LocalLLMProvider(
                model_path=settings.LOCAL_LLM_PATH,
                device=settings.LOCAL_LLM_DEVICE
            )
        
        return providers
    
    async def generate_with_retry(
        self,
        task: str,
        prompt: str,
        config: Optional[AIServiceConfig] = None,
        user_id: Optional[str] = None,
        cache_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate content with retry and fallback logic
        
        Args:
            task: Type of task (script_writing, show_notes, etc.)
            prompt: Input prompt
            config: Service configuration
            user_id: User ID for cost tracking
            cache_key: Cache key for response caching
        
        Returns:
            Dictionary with generated content and metadata
        """
        
        # Check cache first
        if cache_key:
            cached = await self.cache.get(cache_key)
            if cached:
                logger.info(f"Cache hit for key: {cache_key}")
                return json.loads(cached)
        
        # Get or create default config
        if not config:
            config = self._get_default_config(task)
        
        # Try primary provider
        result = await self._try_provider(
            provider_name=config.provider,
            task=task,
            prompt=prompt,
            config=config,
            user_id=user_id
        )
        
        # If primary fails and fallback exists, try fallback
        if not result.get('success') and config.fallback_provider:
            logger.warning(f"Primary provider {config.provider} failed, trying fallback {config.fallback_provider}")
            
            result = await self._try_provider(
                provider_name=config.fallback_provider,
                task=task,
                prompt=prompt,
                config=config,
                user_id=user_id,
                is_fallback=True
            )
        
        # Cache successful result
        if result.get('success') and cache_key:
            await self.cache.set(
                cache_key,
                json.dumps(result),
                expire=settings.CACHE_TTL
            )
        
        return result
    
    async def _try_provider(
        self,
        provider_name: str,
        task: str,
        prompt: str,
        config: AIServiceConfig,
        user_id: Optional[str] = None,
        is_fallback: bool = False
    ) -> Dict[str, Any]:
        """Try a specific provider with retry logic"""
        
        provider = self.providers.get(provider_name)
        if not provider:
            return {
                'success': False,
                'error': f'Provider {provider_name} not available',
                'provider': provider_name
            }
        
        for attempt in range(config.retries):
            try:
                logger.info(f"Attempt {attempt + 1} with provider {provider_name} for task {task}")
                
                # Generate content
                response = await asyncio.wait_for(
                    provider.generate(
                        prompt=prompt,
                        model=config.model,
                        max_tokens=config.max_tokens,
                        temperature=config.temperature,
                        task=task
                    ),
                    timeout=config.timeout
                )
                
                # Calculate cost
                cost = provider.calculate_cost(response.get('usage', {}))
                
                # Track cost if user_id provided
                if user_id:
                    await self.cost_tracker.track_usage(
                        user_id=user_id,
                        service=f'ai_{provider_name}',
                        task=task,
                        cost=cost,
                        usage_data=response.get('usage', {})
                    )
                
                result = {
                    'success': True,
                    'content': response.get('content', ''),
                    'provider': provider_name,
                    'model': config.model,
                    'cost': float(cost),
                    'usage': response.get('usage', {}),
                    'is_fallback': is_fallback,
                    'attempts': attempt + 1
                }
                
                # Add task-specific metadata
                if task == 'script_writing':
                    result['word_count'] = len(result['content'].split())
                    result['estimated_duration'] = self._estimate_audio_duration(result['content'])
                
                logger.info(f"Success with provider {provider_name}, cost: ${cost:.4f}")
                return result
                
            except asyncio.TimeoutError:
                logger.warning(f"Provider {provider_name} timeout on attempt {attempt + 1}")
                if attempt == config.retries - 1:
                    return {
                        'success': False,
                        'error': 'Request timeout',
                        'provider': provider_name
                    }
                
            except Exception as e:
                logger.error(f"Provider {provider_name} error on attempt {attempt + 1}: {str(e)}")
                if attempt == config.retries - 1:
                    return {
                        'success': False,
                        'error': str(e),
                        'provider': provider_name
                    }
            
            # Wait before retry
            if attempt < config.retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return {
            'success': False,
            'error': 'All retries exhausted',
            'provider': provider_name
        }
    
    def _get_default_config(self, task: str) -> AIServiceConfig:
        """Get default configuration for a task"""
        
        configs = {
            'topic_expansion': AIServiceConfig(
                name='topic_expansion',
                provider='openai',
                model='gpt-3.5-turbo',
                max_tokens=500,
                temperature=0.8,
                fallback_provider='local'
            ),
            'script_writing': AIServiceConfig(
                name='script_writing',
                provider='openai',
                model='gpt-4',
                max_tokens=4000,
                temperature=0.7,
                fallback_provider='anthropic'
            ),
            'show_notes': AIServiceConfig(
                name='show_notes',
                provider='openai',
                model='gpt-3.5-turbo',
                max_tokens=1000,
                temperature=0.5,
                fallback_provider='local'
            ),
            'interview_questions': AIServiceConfig(
                name='interview_questions',
                provider='anthropic',
                model='claude-3-sonnet-20240229',
                max_tokens=1500,
                temperature=0.6
            ),
            'marketing_copy': AIServiceConfig(
                name='marketing_copy',
                provider='openai',
                model='gpt-4',
                max_tokens=1000,
                temperature=0.8
            ),
            'italian_content': AIServiceConfig(
                name='italian_content',
                provider='local',  # Prefer local Italian-tuned model
                model='llama-italian',
                max_tokens=3000,
                temperature=0.7,
                fallback_provider='openai'
            )
        }
        
        return configs.get(task, AIServiceConfig(
            name='default',
            provider='openai',
            model='gpt-3.5-turbo',
            max_tokens=2000,
            temperature=0.7
        ))
    
    def _estimate_audio_duration(self, text: str, words_per_minute: int = 150) -> int:
        """Estimate audio duration in seconds from text"""
        word_count = len(text.split())
        minutes = word_count / words_per_minute
        return int(minutes * 60)
    
    async def expand_topic(
        self,
        topic: str,
        style: str = 'conversational',
        language: str = 'it',
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Expand a podcast topic into key points"""
        
        prompt = self._build_topic_expansion_prompt(topic, style, language)
        cache_key = f'topic_expansion:{hash(prompt)}'
        
        result = await self.generate_with_retry(
            task='topic_expansion',
            prompt=prompt,
            user_id=user_id,
            cache_key=cache_key
        )
        
        if result['success']:
            # Parse the response into structured data
            content = result['content']
            result['expanded_topics'] = self._parse_expanded_topics(content)
            result['key_points'] = self._extract_key_points(content)
            result['estimated_duration'] = self._estimate_topic_duration(content)
        
        return result
    
    async def write_script(
        self,
        topic: str,
        style: str = 'conversational',
        duration: int = 30,
        language: str = 'it',
        expanded_topics: Optional[List[str]] = None,
        key_points: Optional[List[str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Write a podcast script"""
        
        prompt = self._build_script_prompt(
            topic, style, duration, language, expanded_topics, key_points
        )
        cache_key = f'script:{hash(prompt)}'
        
        result = await self.generate_with_retry(
            task='script_writing',
            prompt=prompt,
            user_id=user_id,
            cache_key=cache_key
        )
        
        if result['success']:
            # Parse and structure the script
            content = result['content']
            result['script'] = self._format_script(content, style)
            result['word_count'] = len(content.split())
            result['estimated_audio_duration'] = self._estimate_audio_duration(content)
        
        return result
    
    async def generate_show_notes(
        self,
        transcript: str,
        original_script: Optional[str] = None,
        language: str = 'it',
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate show notes from transcript"""
        
        prompt = self._build_show_notes_prompt(transcript, original_script, language)
        cache_key = f'show_notes:{hash(prompt)}'
        
        result = await self.generate_with_retry(
            task='show_notes',
            prompt=prompt,
            user_id=user_id,
            cache_key=cache_key
        )
        
        if result['success']:
            # Parse show notes
            content = result['content']
            result['show_notes'] = self._parse_show_notes(content)
            result['summary'] = self._extract_summary(content)
            result['key_points'] = self._extract_key_points(content)
            result['tags'] = self._extract_tags(content)
        
        return result
    
    def _build_topic_expansion_prompt(self, topic: str, style: str, language: str) -> str:
        """Build prompt for topic expansion"""
        
        if language == 'it':
            return f"""
            Espandi il seguente topic per un podcast italiano.
            
            Topic: {topic}
            Stile: {style}
            
            Fornisci:
            1. 3-5 sottotemi principali
            2. Per ogni sottotema, 2-3 punti chiave
            3. Domande interessanti da approfondire
            4. Esempi concreti o aneddoti
            5. Collegamenti con la cultura italiana
            
            Struttura la risposta in modo chiaro e organizzato.
            """
        else:
            return f"""
            Expand the following topic for a podcast.
            
            Topic: {topic}
            Style: {style}
            
            Provide:
            1. 3-5 main subtopics
            2. For each subtopic, 2-3 key points
            3. Interesting questions to explore
            4. Concrete examples or anecdotes
            5. Cultural connections
            
            Structure the response clearly and organized.
            """
    
    def _build_script_prompt(
        self,
        topic: str,
        style: str,
        duration: int,
        language: str,
        expanded_topics: Optional[List[str]],
        key_points: Optional[List[str]]
    ) -> str:
        """Build prompt for script writing"""
        
        expanded_text = ""
        if expanded_topics:
            expanded_text = f"Sottotemi: {', '.join(expanded_topics[:3])}"
        
        key_points_text = ""
        if key_points:
            key_points_text = f"Punti chiave: {', '.join(key_points[:5])}"
        
        if language == 'it':
            return f"""
            Scrivi uno script per un podcast italiano.
            
            Argomento principale: {topic}
            {expanded_text}
            {key_points_text}
            
            Specifiche:
            - Durata: {duration} minuti
            - Stile: {style}
            - Pubblico: Italiano
            - Linguaggio: Naturale e conversazionale
            
            Struttura:
            1. Introduzione coinvolgente (1-2 minuti)
            2. Sviluppo dell'argomento con esempi concreti
            3. Transizioni fluide tra i punti
            4. Domande retoriche per coinvolgere l'ascoltatore
            5. Conclusioni chiare con call-to-action
            
            Includi:
            - Riferimenti alla cultura italiana quando appropriato
            - Esempi pratici e aneddoti
            - Un tono {style} ma professionale
            
            Scrivi lo script completo con indicazioni per il presentatore.
            """
        else:
            return f"""
            Write a script for a podcast.
            
            Main topic: {topic}
            {expanded_text}
            {key_points_text}
            
            Specifications:
            - Duration: {duration} minutes
            - Style: {style}
            - Audience: General
            - Language: Natural and conversational
            
            Structure:
            1. Engaging introduction (1-2 minutes)
            2. Topic development with concrete examples
            3. Smooth transitions between points
            4. Rhetorical questions to engage listeners
            5. Clear conclusions with call-to-action
            
            Include:
            - Cultural references when appropriate
            - Practical examples and anecdotes
            - A {style} yet professional tone
            
            Write the complete script with presenter directions.
            """
    
    def _build_show_notes_prompt(
        self,
        transcript: str,
        original_script: Optional[str],
        language: str
    ) -> str:
        """Build prompt for show notes generation"""
        
        transcript_preview = transcript[:1000] + "..." if len(transcript) > 1000 else transcript
        
        if language == 'it':
            return f"""
            Genera delle show notes professionali per un podcast italiano.
            
            Trascrizione (estratta):
            {transcript_preview}
            
            {"Script originale (se disponibile): " + original_script[:500] + "..." if original_script else ""}
            
            Crea:
            1. Titolo accattivante
            2. Sommario di 3-4 frasi
            3. 5-7 punti chiave principali
            4. Timestamp per i momenti salienti (se possibile)
            5. 5-7 hashtag rilevanti
            6. Call-to-action per l'ascoltatore
            
            Formatta in modo chiaro e professionale.
            Usa un tono adatto alla pubblicazione su piattaforme di podcast.
            """
        else:
            return f"""
            Generate professional show notes for a podcast.
            
            Transcript (excerpt):
            {transcript_preview}
            
            {"Original script (if available): " + original_script[:500] + "..." if original_script else ""}
            
            Create:
            1. Catchy title
            2. 3-4 sentence summary
            3. 5-7 main key points
            4. Timestamps for highlights (if possible)
            5. 5-7 relevant hashtags
            6. Call-to-action for listeners
            
            Format clearly and professionally.
            Use a tone suitable for podcast platform publishing.
            """
    
    def _parse_expanded_top