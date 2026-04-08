# Testing & Monitoring Guide

## Table of Contents
1. [Testing Strategy](#testing-strategy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Cost Testing](#cost-testing)
5. [Monitoring Setup](#monitoring-setup)
6. [Alerting Configuration](#alerting-configuration)
7. [Performance Testing](#performance-testing)

## Testing Strategy

### Test Pyramid
```
        E2E Tests (10%)
           │
    Integration Tests (20%)
           │
      Unit Tests (70%)
```

### Test Environment Setup

```bash
# Create test environment
cp .env.example .env.test

# Set test-specific values
echo "NODE_ENV=test" >> .env.test
echo "DB_NAME=podcast_ai_test" >> .env.test
echo "STRIPE_SECRET_KEY=sk_test_..." >> .env.test

# Use mock API keys for testing
echo "OPENAI_API_KEY=mock_openai_key" >> .env.test
echo "ELEVENLABS_API_KEY=mock_elevenlabs_key" >> .env.test
```

## Unit Tests

### AI Service Unit Tests

```python
# ai-services/tests/test_ai_service_manager.py
import pytest
from unittest.mock import AsyncMock, patch
from services.ai_service_manager import AIServiceManager
from services.provider_router import ServiceTier

@pytest.mark.asyncio
async def test_generate_with_retry_success():
    """Test successful AI generation with retry"""
    
    with patch('services.ai_service_manager.OpenAIProvider') as mock_provider:
        # Mock successful response
        mock_provider.return_value.generate.return_value = {
            'content': 'Test script content',
            'usage': {'prompt_tokens': 100, 'completion_tokens': 200},
            'cost': 0.05
        }
        
        ai_manager = AIServiceManager()
        result = await ai_manager.generate_with_retry(
            task='script_writing',
            prompt='Test prompt',
            user_id='test_user'
        )
        
        assert result['success'] == True
        assert 'content' in result
        assert result['cost'] > 0

@pytest.mark.asyncio
async def test_generate_with_retry_fallback():
    """Test fallback to secondary provider"""
    
    with patch('services.ai_service_manager.OpenAIProvider') as mock_openai:
        # Mock primary provider failure
        mock_openai.return_value.generate.side_effect = Exception('API Error')
        
        with patch('services.ai_service_manager.LocalLLMProvider') as mock_local:
            # Mock fallback success
            mock_local.return_value.generate.return_value = {
                'content': 'Fallback content',
                'usage': {'tokens': 150},
                'cost': 0.01
            }
            
            ai_manager = AIServiceManager()
            result = await ai_manager.generate_with_retry(
                task='script_writing',
                prompt='Test prompt',
                user_id='test_user'
            )
            
            assert result['success'] == True
            assert result['is_fallback'] == True

def test_cost_calculation():
    """Test cost calculation for different providers"""
    
    ai_manager = AIServiceManager()
    
    # Test OpenAI cost
    openai_usage = {'prompt_tokens': 1000, 'completion_tokens': 500}
    openai_cost = ai_manager._calculate_openai_cost(openai_usage, 'gpt-4')
    assert openai_cost == (1000/1000*0.03 + 500/1000*0.06)
    
    # Test ElevenLabs cost
    elevenlabs_cost = ai_manager._calculate_elevenlabs_cost(5000)  # 5000 characters
    assert elevenlabs_cost == (5000/1000) * 0.18
```

### Payment Service Unit Tests

```javascript
// backend/tests/payment-service.test.js
const { PaymentService } = require('../src/services/PaymentService');
const Stripe = require('stripe');

jest.mock('stripe');

describe('PaymentService', () => {
    let paymentService;
    let mockStripe;
    
    beforeEach(() => {
        mockStripe = {
            customers: {
                create: jest.fn()
            },
            checkout: {
                sessions: {
                    create: jest.fn()
                }
            }
        };
        
        Stripe.mockImplementation(() => mockStripe);
        
        process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
        process.env.APP_URL = 'http://localhost:3000';
        
        paymentService = new PaymentService();
    });
    
    test('createStripeSubscription success', async () => {
        const mockUser = {
            id: 'user_123',
            email: 'test@example.com',
            username: 'testuser'
        };
        
        const mockPlan = {
            id: 'creator',
            stripePriceId: 'price_creator',
            name: 'Creator',
            price: 9.99
        };
        
        // Mock Stripe responses
        mockStripe.customers.create.mockResolvedValue({
            id: 'cus_mock123'
        });
        
        mockStripe.checkout.sessions.create.mockResolvedValue({
            id: 'cs_mock123',
            url: 'https://checkout.stripe.com/mock',
            subscription: 'sub_mock123'
        });
        
        const result = await paymentService.createStripeSubscription(mockUser, mockPlan);
        
        expect(result.success).toBe(true);
        expect(result.checkoutUrl).toBeDefined();
        expect(mockStripe.customers.create).toHaveBeenCalledWith({
            email: mockUser.email,
            name: mockUser.username,
            metadata: { userId: mockUser.id }
        });
    });
    
    test('handleStripeWebhook valid signature', async () => {
        const mockPayload = 'test_payload';
        const mockSignature = 'test_signature';
        const mockEvent = {
            type: 'invoice.payment_succeeded',
            data: { object: { id: 'inv_123', customer: 'cus_123' } }
        };
        
        // Mock webhook verification
        mockStripe.webhooks = {
            constructEvent: jest.fn().mockReturnValue(mockEvent)
        };
        
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
        
        const result = await paymentService.handleStripeWebhook(mockPayload, mockSignature);
        
        expect(result.success).toBe(true);
        expect(result.event).toBe('invoice.payment_succeeded');
    });
});
```

### Cost Tracker Unit Tests

```python
# ai-services/tests/test_cost_tracker.py
import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from services.cost_tracker import CostTracker, CostRecord

@pytest.mark.asyncio
async def test_track_usage():
    """Test tracking AI service usage"""
    
    cost_tracker = CostTracker()
    
    record = await cost_tracker.track_usage(
        user_id='test_user',
        service='text_generation',
        provider='openai',
        task='script_writing',
        cost=Decimal('0.25'),
        usage_data={'tokens': 1500}
    )
    
    assert record.user_id == 'test_user'
    assert record.cost == Decimal('0.25')
    assert record.service == 'text_generation'

@pytest.mark.asyncio
async def test_get_user_monthly_usage():
    """Test retrieving user's monthly usage"""
    
    cost_tracker = CostTracker()
    
    # Mock database query
    with patch('services.cost_tracker.get_db') as mock_db:
        mock_conn = AsyncMock()
        mock_conn.fetchrow.return_value = {'total_cost': 15.75}
        mock_db.acquire.return_value.__aenter__.return_value = mock_conn
        
        usage = await cost_tracker.get_user_monthly_usage('test_user')
        
        assert usage == Decimal('15.75')

def test_estimate_podcast_cost():
    """Test podcast cost estimation"""
    
    cost_tracker = CostTracker()
    
    # Test 30-minute conversational podcast in Italian
    estimated_cost = cost_tracker.estimate_podcast_cost(
        duration=30,
        style='conversational',
        language='it',
        voice_quality='standard'
    )
    
    assert estimated_cost > Decimal('0')
    assert estimated_cost < Decimal('10')  # Should be reasonable
    
    # Test premium voice
    premium_cost = cost_tracker.estimate_podcast_cost(
        duration=30,
        voice_quality='premium'
    )
    
    assert premium_cost > estimated_cost  # Premium should cost more
```

## Integration Tests

### AI Provider Integration Tests

```python
# ai-services/tests/integration/test_openai_integration.py
import pytest
import os
from integrations.openai_integration import OpenAIIntegration

@pytest.mark.integration
@pytest.mark.asyncio
async def test_openai_real_api():
    """Test real OpenAI API call (requires API key)"""
    
    if not os.getenv('OPENAI_API_KEY'):
        pytest.skip('OpenAI API key not configured')
    
    openai = OpenAIIntegration()
    
    result = await openai.generate_italian_script(
        topic="L'intelligenza artificiale nella vita quotidiana",
        duration=5  # Short for testing
    )
    
    assert result['success'] == True
    assert len(result['content']) > 100
    assert result['cost'] > 0
    assert 'gpt-4' in result.get('model', '')

@pytest.mark.integration
@pytest.mark.asyncio
async def test_elevenlabs_real_api():
    """Test real ElevenLabs API call"""
    
    if not os.getenv('ELEVENLABS_API_KEY'):
        pytest.skip('ElevenLabs API key not configured')
    
    from integrations.elevenlabs_integration import ElevenLabsIntegration
    
    elevenlabs = ElevenLabsIntegration()
    
    result = await elevenlabs.generate_italian_audio(
        text="Ciao, questo è un test della sintesi vocale in italiano.",
        voice='luca'
    )
    
    assert result['success'] == True
    assert len(result['audio']) > 0
    assert result['cost'] > 0
```

### Payment Integration Tests

```javascript
// backend/tests/integration/stripe-integration.test.js
const { StripeIntegration } = require('../../src/integrations/stripe-integration');

describe('Stripe Integration - Real API', () => {
    let stripeIntegration;
    
    beforeAll(() => {
        if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('test')) {
            console.log('Skipping real Stripe tests - test key not configured');
            return;
        }
        
        stripeIntegration = new StripeIntegration();
    });
    
    test('create real checkout session', async () => {
        if (!stripeIntegration) return;
        
        const mockUser = {
            id: 'test_user_real',
            email: 'test@example.com',
            username: 'testuser'
        };
        
        const result = await stripeIntegration.createCheckoutSession(
            mockUser,
            'creator',
            'http://localhost:3000/success',
            'http://localhost:3000/cancel'
        );
        
        expect(result.sessionId).toBeDefined();
        expect(result.url).toContain('checkout.stripe.com');
    }, 30000); // Longer timeout for API calls
});
```

## Cost Testing

### Cost Simulation Tests

```python
# ai-services/tests/cost_simulation.py
import asyncio
from decimal import Decimal
from services.cost_tracker import CostTracker
from services.provider_router import ProviderRouter, ServiceTier

async def simulate_user_workload(user_id, num_podcasts=10):
    """Simulate a user creating multiple podcasts"""
    
    cost_tracker = CostTracker()
    router = ProviderRouter()
    
    total_cost = Decimal('0')
    
    for i in range(num_podcasts):
        # Simulate different podcast types
        duration = 30 if i % 2 == 0 else 15
        tier = ServiceTier.PREMIUM if i < 2 else ServiceTier.STANDARD
        
        # Estimate cost
        estimated_cost = await cost_tracker.estimate_podcast_cost(
            duration=duration,
            style='conversational',
            language='it',
            voice_quality='premium' if tier == ServiceTier.PREMIUM else 'standard'
        )
        
        # Check if user can afford it
        can_create = await cost_tracker.can_user_create_podcast(user_id, estimated_cost)
        
        if can_create['can_create']:
            # Simulate actual usage (random cost around estimate)
            actual_cost = estimated_cost * Decimal('0.8') + Decimal(str(random.random() * 0.4))
            
            await cost_tracker.track_usage(
                user_id=user_id,
                service='simulation',
                provider='simulated',
                task=f'podcast_{i}',
                cost=actual_cost,
                usage_data={'duration': duration, 'tier': tier.value}
            )
            
            total_cost += actual_cost
            print(f"Podcast {i+1}: €{actual_cost:.2f} (estimated: €{estimated_cost:.2f})")
        else:
            print(f"Podcast {i+1}: Credit limit reached")
            break
    
    monthly_usage = await cost_tracker.get_user_monthly_usage(user_id)
    print(f"\nTotal monthly usage: €{monthly_usage:.2f}")
    print(f"Simulated cost: €{total_cost:.2f}")
    
    return total_cost

async def test_cost_limits():
    """Test user credit limits"""
    
    cost_tracker = CostTracker()
    
    # Test free tier user
    free_user = 'user_free'
    free_limit = Decimal('5.00')
    
    print("Testing free tier user...")
    free_cost = await simulate_user_workload(free_user, 5)
    
    assert free_cost <= free_limit, f"Free user exceeded limit: €{free_cost} > €{free_limit}"
    
    # Test pro tier user
    pro_user = 'user_pro'
    pro_limit = Decimal('200.00')
    
    print("\nTesting pro tier user...")
    pro_cost = await simulate_user_workload(pro_user, 20)
    
    assert pro_cost <= pro_limit, f"Pro user exceeded limit: €{pro_cost} > €{pro_limit}"

if __name__ == '__main__':
    asyncio.run(test_cost_limits())
```

### Cost Optimization Tests

```python
# ai-services/tests/test_cost_optimization.py
import pytest
from services.provider_router import ProviderRouter, ServiceTier

def test_cost_aware_routing():
    """Test that router selects appropriate providers based on cost"""
    
    router = ProviderRouter()
    
    # Test budget tier - should select cheapest provider
    budget_decision = router.route_request(
        service_type='tts',
        task='italian_voice',
        user_id='test_user',
        tier=ServiceTier.BUDGET,
        max_cost=Decimal('0.10')
    )
    
    assert budget_decision.provider_config.cost_per_unit <= Decimal('0.02')
    assert 'google_tts' in budget_decision.provider_name or 'amazon_polly' in budget_decision.provider_name
    
    # Test premium tier - should select highest quality
    premium_decision = router.route_request(
        service_type='tts',
        task='italian_voice',
        user_id='test_user',
        tier=ServiceTier.PREMIUM
    )
    
    assert premium_decision.provider_config.quality_score >= 9.0
    assert 'elevenlabs' in premium_decision.provider_name

def test_fallback_routing():
    """Test fallback to secondary providers"""
    
    router = ProviderRouter()
    
    # Mark primary provider as unhealthy
    router.provider_health['elevenlabs_premium'] = {
        'unhealthy_until': float('inf'),  # Mark as permanently unhealthy
        'error_rate': 1.0
    }
    
    decision = router.route_request(
        service_type='tts',
        task='italian_voice',
        user_id='test_user',
        tier=ServiceTier.STANDARD
    )
    
    # Should select fallback provider
    assert decision.provider_name != 'elevenlabs_premium'
    assert decision.fallback_provider is not None
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'podcast-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    
  - job_name: 'ai-services'
    static_configs:
      - targets: ['ai-services:8000']
    metrics_path: '/metrics'
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

rule_files:
  - "alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

### Grafana Dashboards

```json
{
  "dashboard": {
    "title": "Podcast AI Platform - Cost Monitoring",
    "panels": [
      {
        "title": "AI API Costs by Provider",
        "targets": [
          {
            "expr": "sum(ai_api_cost_total{service=\"text_generation\"}) by (provider)",
            "legendFormat": "{{provider}}"
          }
        ],
        "type": "piechart"
      },
      {
        "title": "Cost per User Tier",
        "targets": [
          {
            "expr": "sum(ai_api_cost_total) by (user_tier)",
            "legendFormat": "{{user_tier}}"
          }
        ],
