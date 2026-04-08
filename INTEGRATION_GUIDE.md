# AI API Integration & Payment System Guide

## Table of Contents
1. [AI Service Integration Architecture](#ai-service-integration-architecture)
2. [Supported AI Providers](#supported-ai-providers)
3. [Payment System Integration](#payment-system-integration)
4. [Cost Tracking & Billing](#cost-tracking--billing)
5. [Multi-Provider Routing](#multi-provider-routing)
6. [Implementation Examples](#implementation-examples)
7. [Testing & Monitoring](#testing--monitoring)

## AI Service Integration Architecture

### Unified API Interface Pattern

```python
# Base interface for all AI providers
class AIProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str, **kwargs) -> TextResponse:
        pass
    
    @abstractmethod
    async def generate_speech(self, text: str, **kwargs) -> SpeechResponse:
        pass
    
    @abstractmethod
    def calculate_cost(self, usage: Dict) -> Decimal:
        pass
    
    @abstractmethod
    def get_available_voices(self) -> List[VoiceProfile]:
        pass
```

### Provider Registry System

```python
class ProviderRegistry:
    def __init__(self):
        self.providers = {}
        self.provider_configs = self._load_configs()
    
    def register_provider(self, name: str, provider: AIProvider):
        self.providers[name] = provider
    
    def get_provider(self, name: str) -> Optional[AIProvider]:
        return self.providers.get(name)
    
    def list_providers(self, service_type: str) -> List[str]:
        return [name for name, config in self.provider_configs.items() 
                if config['service_type'] == service_type]
```

## Supported AI Providers

### 1. Text Generation Providers

#### OpenAI (GPT Models)
```python
class OpenAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.models = {
            'gpt-4': {'cost_per_1k_input': 0.03, 'cost_per_1k_output': 0.06},
            'gpt-4-turbo': {'cost_per_1k_input': 0.01, 'cost_per_1k_output': 0.03},
            'gpt-3.5-turbo': {'cost_per_1k_input': 0.0005, 'cost_per_1k_output': 0.0015}
        }
    
    async def generate_text(self, prompt: str, model: str = 'gpt-4', **kwargs):
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            **kwargs
        )
        return TextResponse(
            text=response.choices[0].message.content,
            usage=response.usage,
            model=model
        )
```

#### Anthropic (Claude)
```python
class AnthropicProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.models = {
            'claude-3-opus': {'cost_per_1k_input': 0.015, 'cost_per_1k_output': 0.075},
            'claude-3-sonnet': {'cost_per_1k_input': 0.003, 'cost_per_1k_output': 0.015}
        }
```

#### Google AI (Gemini)
```python
class GoogleAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
        self.models = {
            'gemini-pro': {'cost_per_1k_char': 0.000125},
            'gemini-pro-vision': {'cost_per_1k_char': 0.00025}
        }
```

#### Local LLMs (Italian Focused)
```python
class LocalLLMProvider(AIProvider):
    def __init__(self, model_path: str):
        # Load Italian-tuned model
        self.model = AutoModelForCausalLM.from_pretrained(model_path)
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.models = {
            'llama-italian': {'cost_per_1k_tokens': 0.001}  # Self-hosted cost
        }
```

### 2. Text-to-Speech Providers

#### ElevenLabs (Premium Italian Voices)
```python
class ElevenLabsProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = elevenlabs.Client(api_key=api_key)
        self.voices = self._load_italian_voices()
        self.cost_per_1k_chars = 0.18
    
    def _load_italian_voices(self):
        return {
            'italian_male_1': {'id': 'voice_id_1', 'accent': 'standard'},
            'italian_female_1': {'id': 'voice_id_2', 'accent': 'northern'},
            'italian_male_business': {'id': 'voice_id_3', 'accent': 'central'}
        }
```

#### Google Cloud TTS
```python
class GoogleTTSProvider(AIProvider):
    def __init__(self, credentials_path: str):
        self.client = texttospeech.TextToSpeechClient.from_service_account_file(credentials_path)
        self.voices = self._get_italian_voices()
        self.cost_per_1k_chars = 0.016
    
    def _get_italian_voices(self):
        return [
            {'name': 'it-IT-Standard-A', 'language_code': 'it-IT', 'ssml_gender': 'FEMALE'},
            {'name': 'it-IT-Standard-B', 'language_code': 'it-IT', 'ssml_gender': 'MALE'}
        ]
```

#### Amazon Polly
```python
class AmazonPollyProvider(AIProvider):
    def __init__(self, aws_access_key: str, aws_secret_key: str, region: str):
        self.client = boto3.client('polly',
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=aws_secret_key,
            region_name=region
        )
        self.cost_per_1k_chars = 0.016
        self.voices = {
            'Bianca': {'language_code': 'it-IT', 'gender': 'Female'},
            'Giorgio': {'language_code': 'it-IT', 'gender': 'Male'}
        }
```

#### Microsoft Azure TTS
```python
class AzureTTSProvider(AIProvider):
    def __init__(self, subscription_key: str, region: str):
        self.subscription_key = subscription_key
        self.region = region
        self.cost_per_1k_chars = 0.016
        self.voices = {
            'it-IT-Elsa': {'gender': 'Female', 'style': 'Neutral'},
            'it-IT-Diego': {'gender': 'Male', 'style': 'Neutral'}
        }
```

### 3. Transcription Providers

#### AssemblyAI
```python
class AssemblyAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = assemblyai.Client(api_key=api_key)
        self.cost_per_second = 0.0006
    
    async def transcribe(self, audio_url: str, language: str = 'it'):
        config = assemblyai.TranscriptionConfig(language_code=language)
        transcript = await self.client.transcribe(audio_url, config)
        return TranscriptionResponse(
            text=transcript.text,
            words=transcript.words,
            confidence=transcript.confidence
        )
```

#### Rev.ai
```python
class RevAIProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = revai.Client(api_key=api_key)
        self.cost_per_minute = 0.02
```

#### Whisper (OpenAI)
```python
class WhisperProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = OpenAI(api_key=api_key)
        self.cost_per_minute = 0.006
```

### 4. Audio Editing Providers

#### Descript
```python
class DescriptProvider(AIProvider):
    def __init__(self, api_key: str):
        self.client = descript.Client(api_key=api_key)
        self.cost_per_minute = 0.10
    
    async def edit_audio(self, audio_url: str, edits: List[Edit]):
        # Text-based audio editing
        project = await self.client.create_project(audio_url)
        for edit in edits:
            await project.apply_edit(edit)
        return await project.export()
```

#### Adobe Podcast
```python
class AdobePodcastProvider(AIProvider):
    def __init__(self, client_id: str, client_secret: str):
        self.client = AdobePodcastAPI(client_id, client_secret)
        self.cost_per_minute = 0.15
```

## Payment System Integration

### 1. Stripe Integration (Primary)

#### Setup
```python
# backend/src/services/StripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class StripeService {
    constructor() {
        this.stripe = stripe;
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    }
    
    async createCustomer(user) {
        return await this.stripe.customers.create({
            email: user.email,
            name: user.username,
            metadata: {
                userId: user.id,
                tier: user.tier
            }
        });
    }
    
    async createSubscription(customerId, priceId) {
        return await this.stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });
    }
    
    async createCheckoutSession(customerId, priceId, successUrl, cancelUrl) {
        return await this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId: customerId
            }
        });
    }
    
    async handleWebhook(payload, signature) {
        const event = this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.webhookSecret
        );
        
        switch (event.type) {
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;
        }
    }
}
```

#### Pricing Plans Configuration
```javascript
// backend/src/config/pricing.js
const PRICING_PLANS = {
    free: {
        id: 'price_free',
        name: 'Gratuito',
        price: 0,
        currency: 'eur',
        interval: 'month',
        features: [
            '1 podcast al mese',
            'Voci base italiane',
            '15 minuti max',
            'Supporto community'
        ],
        limits: {
            monthly_podcasts: 1,
            max_duration: 15, // minutes
            voice_options: ['google_tts'],
            api_credits: 5 // €
        }
    },
    creator: {
        id: 'price_creator',
        name: 'Creator',
        price: 9.99,
        currency: 'eur',
        interval: 'month',
        features: [
            '5 podcast al mese',
            'Voci premium italiane',
            '60 minuti max',
            'Editing avanzato',
            'Supporto email'
        ],
        limits: {
            monthly_podcasts: 5,
            max_duration: 60,
            voice_options: ['elevenlabs', 'google_tts'],
            api_credits: 50 // €
        }
    },
    pro: {
        id: 'price_pro',
        name: 'Pro',
        price: 29.99,
        currency: 'eur',
        interval: 'month',
        features: [
            'Podcast illimitati',
            'Clonazione voce',
            'Dialoghi multi-voce',
            'Analytics avanzate',
            'Supporto prioritario'
        ],
        limits: {
            monthly_podcasts: 999, // effectively unlimited
            max_duration: 120,
            voice_options: ['elevenlabs', 'google_tts', 'amazon_polly'],
            api_credits: 200 // €
        }
    },
    business: {
        id: 'price_business',
        name: 'Business',
        price: 99.99,
        currency: 'eur',
        interval: 'month',
        features: [
            'Tutto in Pro',
            'White-label',
            'API access',
            'Account manager',
            'Custom workflows'
        ],
        limits: {
            monthly_podcasts: 9999,
            max_duration: 240,
            voice_options: 'all',
            api_credits: 1000 // €
        }
    }
};
```

### 2. PayPal Integration (Alternative)

```python
# ai-services/services/payment/paypal_service.py
import paypalrestsdk

class PayPalService:
    def __init__(self):
        paypalrestsdk.configure({
            "mode": os.getenv('PAYPAL_MODE', 'sandbox'),
            "client_id": os.getenv('PAYPAL_CLIENT_ID'),
            "client_secret": os.getenv('PAYPAL_CLIENT_SECRET')
        })
    
    async def create_subscription(self, plan_id, user_id):
        subscription = paypalrestsdk.BillingPlan({
            "name": "Podcast AI Monthly",
            "description": "Monthly subscription for Podcast AI Platform",
            "type": "INFINITE",
            "payment_definitions": [{
                "name": "Regular Payments",
                "type": "REGULAR",
                "frequency": "MONTH",
                "frequency_interval": "1",
                "amount": {
                    "value": "9.99",
                    "currency": "EUR"
                },
                "cycles": "0"
            }],
            "merchant_preferences": {
                "return_url": f"{os.getenv('APP_URL')}/paypal/success",
                "cancel_url": f"{os.getenv('APP_URL')}/paypal/cancel",
                "auto_bill_amount": "YES",
                "initial_fail_amount_action": "CONTINUE",
                "max_fail_attempts": "3"
            }
        })
        
        if subscription.create():
            return subscription.id
        return None
```

### 3. Bank Transfer (Italian Banks)

```python
# ai-services/services/payment/bank_transfer_service.py
class BankTransferService:
    def __init__(self):
        self.bank_details = {
            'bank_name': 'Banca Italiana',
            'iban': os.getenv('BANK_IBAN'),
            'bic': os.getenv('BANK_BIC'),
            'account_holder': os.getenv('BANK_ACCOUNT_HOLDER'),
            'reason_template': 'Podcast AI - User {user_id} - {month}/{year}'
        }
    
    def generate_invoice(self, user, amount, period):
        invoice = {
            'invoice_number': f"INV-{datetime.now().strftime('%Y%m%d')}-{user.id[:8]}",
            'date': datetime.now().isoformat(),
            'due_date': (datetime.now() + timedelta(days=30)).isoformat(),
            'user': {
                'name': user.username,
                'email': user.email,
                'address': user.address if hasattr(user, 'address') else None
            },
            'items': [{
                'description': f'Subscription {period}',
                'quantity': 1,
                'unit_price': amount,
                'total': amount
            }],
            'total': amount,
            'vat_rate': 0.22,  # Italian VAT
            'total_with_vat': amount * 1.22,
            'bank_details': self.bank_details,
            'payment_reference': f"PODCASTAI-{user.id[:8]}-{datetime.now().strftime('%Y%m')}"
        }
        
        return self._generate_pdf(invoice)
```

### 4. Satispay (Popular in Italy)

```python
# ai-services/services/payment/satispay_service.py
class SatispayService:
    def __init__(self):
        self.api_key = os.getenv('SATISPAY_API_KEY')
        self.base_url = 'https://authservices.satispay.com'
    
    async def create_payment(self, amount, user_phone, description):
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'flow': 'MATCH_CODE',
            'amount_unit': int(amount * 100),  # Convert to cents
            'currency': 'EUR',
            'description': description,
            'phone_number': user_phone,
            'callback_url': f"{os.getenv('APP_URL')}/satispay/callback"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f'{self.base_url}/wally-services/protocol/tests/signature',
                json=data,
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            return None
```

## Cost Tracking & Billing

### Unified Cost Tracker

```python
# ai-services/services/cost_tracker.py
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import asyn