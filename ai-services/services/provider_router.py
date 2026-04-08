"""
Multi-Provider Router with Cost-Aware Routing
"""

import asyncio
from decimal import Decimal
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import logging
from dataclasses import dataclass
import json

from config import settings
from utils.cache import cache
from .cost_tracker import CostTracker

logger = logging.getLogger(__name__)

class ServiceTier(Enum):
    BUDGET = "budget"
    STANDARD = "standard"
    PREMIUM = "premium"

@dataclass
class ProviderConfig:
    """Configuration for an AI provider"""
    name: str
    service_type: str  # text, tts, transcription, audio_edit
    cost_per_unit: Decimal
    quality_score: float  # 1-10
    max_concurrent: int
    rate_limit: int  # requests per minute
    timeout: int  # seconds
    enabled: bool = True
    fallback_to: Optional[str] = None
    features: List[str] = None
    
    def __post_init__(self):
        if self.features is None:
            self.features = []

@dataclass
class RoutingDecision:
    """Result of provider routing decision"""
    provider_name: str
    provider_config: ProviderConfig
    estimated_cost: Decimal
    reason: str
    fallback_provider: Optional[str] = None

class ProviderRouter:
    """Routes requests to appropriate AI providers based on cost, quality, and availability"""
    
    def __init__(self):
        self.cost_tracker = CostTracker()
        self.cache = cache
        self.provider_configs = self._load_provider_configs()
        self.provider_health = {}  # Track provider health status
        self.provider_stats = {}   # Track provider statistics
        
    def _load_provider_configs(self) -> Dict[str, ProviderConfig]:
        """Load provider configurations from settings"""
        
        configs = {
            # Text Generation Providers
            'openai_gpt4': ProviderConfig(
                name='openai_gpt4',
                service_type='text',
                cost_per_unit=Decimal('0.03'),  # per 1K input tokens
                quality_score=9.5,
                max_concurrent=10,
                rate_limit=10000,
                timeout=30,
                features=['italian_content', 'script_writing', 'show_notes']
            ),
            'openai_gpt35': ProviderConfig(
                name='openai_gpt35',
                service_type='text',
                cost_per_unit=Decimal('0.0005'),
                quality_score=7.0,
                max_concurrent=20,
                rate_limit=60000,
                timeout=30,
                fallback_to='openai_gpt4',
                features=['draft_generation', 'simple_tasks']
            ),
            'anthropic_claude': ProviderConfig(
                name='anthropic_claude',
                service_type='text',
                cost_per_unit=Decimal('0.003'),
                quality_score=9.0,
                max_concurrent=5,
                rate_limit=5000,
                timeout=30,
                features=['long_context', 'reasoning']
            ),
            'local_llama_italian': ProviderConfig(
                name='local_llama_italian',
                service_type='text',
                cost_per_unit=Decimal('0.001'),  # Self-hosted cost
                quality_score=8.5,
                max_concurrent=2,
                rate_limit=100,
                timeout=60,
                features=['italian_optimized', 'offline']
            ),
            
            # TTS Providers
            'elevenlabs_premium': ProviderConfig(
                name='elevenlabs_premium',
                service_type='tts',
                cost_per_unit=Decimal('0.18'),  # per 1K characters
                quality_score=9.8,
                max_concurrent=5,
                rate_limit=1000,
                timeout=60,
                features=['italian_voices', 'voice_cloning', 'emotion']
            ),
            'google_tts': ProviderConfig(
                name='google_tts',
                service_type='tts',
                cost_per_unit=Decimal('0.016'),
                quality_score=7.5,
                max_concurrent=20,
                rate_limit=10000,
                timeout=30,
                fallback_to='elevenlabs_premium',
                features=['italian_voices', 'reliable']
            ),
            'amazon_polly': ProviderConfig(
                name='amazon_polly',
                service_type='tts',
                cost_per_unit=Decimal('0.016'),
                quality_score=7.0,
                max_concurrent=15,
                rate_limit=5000,
                timeout=30,
                features=['italian_voices', 'aws_integration']
            ),
            'azure_tts': ProviderConfig(
                name='azure_tts',
                service_type='tts',
                cost_per_unit=Decimal('0.016'),
                quality_score=7.2,
                max_concurrent=10,
                rate_limit=3000,
                timeout=30,
                features=['italian_voices', 'enterprise']
            ),
            
            # Transcription Providers
            'assemblyai': ProviderConfig(
                name='assemblyai',
                service_type='transcription',
                cost_per_unit=Decimal('0.0006'),  # per second
                quality_score=9.0,
                max_concurrent=10,
                rate_limit=1000,
                timeout=300,
                features=['italian_support', 'speaker_diarization']
            ),
            'rev_ai': ProviderConfig(
                name='rev_ai',
                service_type='transcription',
                cost_per_unit=Decimal('0.02'),  # per minute
                quality_score=8.5,
                max_concurrent=8,
                rate_limit=500,
                timeout=300,
                fallback_to='assemblyai'
            ),
            'whisper': ProviderConfig(
                name='whisper',
                service_type='transcription',
                cost_per_unit=Decimal('0.006'),  # per minute
                quality_score=8.0,
                max_concurrent=5,
                rate_limit=3000,
                timeout=180,
                features=['multilingual', 'openai']
            ),
            
            # Audio Editing Providers
            'descript': ProviderConfig(
                name='descript',
                service_type='audio_edit',
                cost_per_unit=Decimal('0.10'),  # per minute
                quality_score=9.5,
                max_concurrent=3,
                rate_limit=100,
                timeout=600,
                features=['text_based_editing', 'filler_word_removal']
            ),
            'adobe_podcast': ProviderConfig(
                name='adobe_podcast',
                service_type='audio_edit',
                cost_per_unit=Decimal('0.15'),
                quality_score=9.0,
                max_concurrent=2,
                rate_limit=50,
                timeout=600,
                features=['noise_reduction', 'enhancement']
            )
        }
        
        # Filter based on environment settings
        filtered_configs = {}
        for name, config in configs.items():
            # Check if provider is enabled in settings
            env_var = f"{name.upper()}_ENABLED"
            if hasattr(settings, env_var) and not getattr(settings, env_var, True):
                continue
            
            # Check if API key is available
            if 'openai' in name and not settings.OPENAI_API_KEY:
                continue
            if 'elevenlabs' in name and not settings.ELEVENLABS_API_KEY:
                continue
            if 'assemblyai' in name and not settings.ASSEMBLYAI_API_KEY:
                continue
            
            filtered_configs[name] = config
        
        return filtered_configs
    
    async def route_request(
        self,
        service_type: str,
        task: str,
        user_id: str,
        tier: ServiceTier = ServiceTier.STANDARD,
        quality_requirement: float = 7.0,
        max_cost: Optional[Decimal] = None,
        language: str = 'it',
        additional_params: Optional[Dict] = None
    ) -> RoutingDecision:
        """
        Route a request to the best provider
        
        Args:
            service_type: Type of service (text, tts, transcription, audio_edit)
            task: Specific task (script_writing, italian_voice, etc.)
            user_id: User ID for cost tracking
            tier: Service tier (budget, standard, premium)
            quality_requirement: Minimum quality score required
            max_cost: Maximum cost allowed
            language: Language requirement
            additional_params: Additional routing parameters
        
        Returns:
            RoutingDecision with selected provider
        """
        
        # Get available providers for this service type
        available_providers = self._get_available_providers(
            service_type, task, language, tier
        )
        
        if not available_providers:
            raise ValueError(f"No providers available for {service_type}/{task}")
        
        # Filter by quality requirement
        quality_providers = [
            (name, config) for name, config in available_providers
            if config.quality_score >= quality_requirement
        ]
        
        if not quality_providers:
            logger.warning(f"No providers meet quality requirement {quality_requirement}")
            # Fall back to best available
            quality_providers = sorted(
                available_providers,
                key=lambda x: x[1].quality_score,
                reverse=True
            )[:3]
        
        # Filter by health status
        healthy_providers = []
        for name, config in quality_providers:
            if self._is_provider_healthy(name):
                healthy_providers.append((name, config))
            else:
                logger.warning(f"Provider {name} is unhealthy, skipping")
        
        if not healthy_providers:
            # If no healthy providers, try unhealthy ones as last resort
            healthy_providers = quality_providers
            logger.error("No healthy providers available, using unhealthy as fallback")
        
        # Estimate costs and select best provider
        selected_provider = None
        selected_config = None
        estimated_cost = Decimal('0')
        reason = ""
        
        for provider_name, config in healthy_providers:
            # Estimate cost for this provider
            cost_estimate = await self._estimate_cost(
                provider_name, config, task, additional_params
            )
            
            # Check if within max cost
            if max_cost and cost_estimate > max_cost:
                continue
            
            # Select based on tier strategy
            if tier == ServiceTier.BUDGET:
                # Cheapest that meets requirements
                if not selected_provider or cost_estimate < estimated_cost:
                    selected_provider = provider_name
                    selected_config = config
                    estimated_cost = cost_estimate
                    reason = f"Budget selection: {provider_name} (€{cost_estimate:.4f})"
            
            elif tier == ServiceTier.STANDARD:
                # Best value (cost/quality ratio)
                value_score = config.quality_score / float(cost_estimate) if cost_estimate > 0 else 0
                current_value = selected_config.quality_score / float(estimated_cost) if selected_config and estimated_cost > 0 else 0
                
                if not selected_provider or value_score > current_value:
                    selected_provider = provider_name
                    selected_config = config
                    estimated_cost = cost_estimate
                    reason = f"Value selection: {provider_name} (quality/cost: {value_score:.2f})"
            
            elif tier == ServiceTier.PREMIUM:
                # Highest quality regardless of cost
                if not selected_provider or config.quality_score > selected_config.quality_score:
                    selected_provider = provider_name
                    selected_config = config
                    estimated_cost = cost_estimate
                    reason = f"Premium selection: {provider_name} (quality: {config.quality_score})"
        
        if not selected_provider:
            raise ValueError("No suitable provider found for request")
        
        # Get fallback provider
        fallback_provider = None
        if selected_config.fallback_to:
            fallback_config = self.provider_configs.get(selected_config.fallback_to)
            if fallback_config and self._is_provider_healthy(selected_config.fallback_to):
                fallback_provider = selected_config.fallback_to
        
        return RoutingDecision(
            provider_name=selected_provider,
            provider_config=selected_config,
            estimated_cost=estimated_cost,
            reason=reason,
            fallback_provider=fallback_provider
        )
    
    def _get_available_providers(
        self,
        service_type: str,
        task: str,
        language: str,
        tier: ServiceTier
    ) -> List[Tuple[str, ProviderConfig]]:
        """Get available providers for given criteria"""
        
        providers = []
        
        for name, config in self.provider_configs.items():
            # Filter by service type
            if config.service_type != service_type:
                continue
            
            # Filter by language support
            if language == 'it' and 'italian' not in ' '.join(config.features).lower():
                # For Italian, prefer providers with Italian support
                # but don't exclude others completely
                pass
            
            # Filter by task-specific features
            task_feature_map = {
                'script_writing': ['script_writing', 'italian_content'],
                'show_notes': ['show_notes'],
                'italian_voice': ['italian_voices'],
                'voice_cloning': ['voice_cloning'],
                'transcription_it': ['italian_support', 'transcription']
            }
            
            required_features = task_feature_map.get(task, [])
            if required_features and not any(f in config.features for f in required_features):
                continue
            
            # Filter by tier
            if tier == ServiceTier.BUDGET and config.cost_per_unit > Decimal('0.02'):
                continue  # Skip expensive providers for budget tier
            
            providers.append((name, config))
        
        return providers
    
    async def _estimate_cost(
        self,
        provider_name: str,
        config: ProviderConfig,
        task: str,
        additional_params: Optional[Dict]
    ) -> Decimal:
        """Estimate cost for a provider and task"""
        
        # Default estimates based on task
        task_estimates = {
            'text': {
                'topic_expansion': Decimal('0.05'),
                'script_writing': Decimal('0.30'),
                'show_notes': Decimal('0.10'),
                'interview_questions': Decimal('0.15')
            },
            'tts': {
                '30_min_podcast': Decimal('0.81'),  # 4500 chars * 0.00018
                '15_min_podcast': Decimal('0.41'),
                '5_min_podcast': Decimal('0.14')
            },
            'transcription': {
                '30_min_audio': Decimal('1.08'),  # 1800 seconds * 0.0006
                '15_min_audio': Decimal('0.54'),
                '5_min_audio': Decimal('0.18')
            },
            'audio_edit': {
                '30_min_audio': Decimal('3.00'),  # 30 minutes * 0.10
                '15_min_audio': Decimal('1.50'),
                '5_min_audio': Decimal('0.50')
            }
        }
        
        # Get base estimate
        service_type = config.service_type
        base_estimate = task_estimates.get(service_type, {}).get(task, Decimal('0.10'))
        
        # Adjust for provider cost
        cost_multiplier = config.cost_per_unit / Decimal('0.01')  # Normalize to base cost
        
        # Adjust for additional parameters
        if additional_params:
            if 'duration' in additional_params:
                duration = additional_params['duration']
                if service_type == 'tts':
                    # Estimate characters based on duration (150 words/minute * 5 chars/word)
                    estimated_chars = duration * 150 * 5
                    base_estimate = Decimal(str(estimated_chars / 1000)) * config.cost_per_unit
                elif service_type == 'transcription':
                    base_estimate = Decimal(str(duration * 60)) * config.cost_per_unit
                elif service_type == 'audio_edit':
                    base_estimate = Decimal(str(duration)) * config.cost_per_unit
        
        estimated_cost = base_estimate * cost_multiplier
        
        # Add minimum cost
        if estimated_cost < Decimal('0.01'):
            estimated_cost = Decimal('0.01')
        
        return estimated_cost
    
    def _is_provider_healthy(self, provider_name: str) -> bool:
        """Check if provider is healthy"""
        if provider_name not in self.provider_health:
            return True  # Assume healthy if not checked yet
        
        health = self.provider_health[provider_name]
        
        # Check if recently marked unhealthy
        if health.get('unhealthy_until'):
            if health['unhealthy_until'] > asyncio.get_event_loop().time():
                return False
        
        # Check error rate
        error_rate = health.get('error_rate', 0)
        if error_rate > 0.5:  # More than 50% errors
            return False
        
        # Check recent failures
        recent_failures = health.get('recent_failures', 0)
        if recent_failures >= 3:
            return False
        
        return True
    
    async def update_provider_health(
        self,
        provider_name: str,
        success: bool,
        response_time: float,
        error_message: Optional[str] = None
    ):
        """Update provider health status"""
        
        if provider_name not in self.provider_health:
            self.provider_health[provider_name] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'total_response_time': 0,
                'recent_failures': 0,
                'last_failure': None,
                'error_rate': 0
            }
        
        health = self.provider_health[provider_name]
        health['total_requests'] += 1
        health['total_response_time'] += response_time
        
        if success:
            health['successful_requests'] += 1
