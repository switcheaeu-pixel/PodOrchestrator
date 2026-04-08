# Implementation Guide: AI API & Payment Integration

## Quick Start Implementation

### 1. Set Up Environment Variables

```bash
# Copy and edit environment file
cp .env.example .env

# Edit .env with your API keys:
nano .env

# Required API Keys:
OPENAI_API_KEY=sk-your-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key
ASSEMBLYAI_API_KEY=your-assemblyai-key

# Payment Providers (choose one or more):
STRIPE_SECRET_KEY=sk_test_your_key
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
SATISPAY_API_KEY=your-satispay-key

# Bank Details (for Italian bank transfers):
BANK_IBAN=IT60X0542811101000000123456
BANK_BIC=BPAAITRRXXX
BANK_NAME="Banca Italiana"
```

### 2. Initialize Payment System

```javascript
// backend/src/scripts/init-payments.js
const { PaymentService } = require('../services/PaymentService');
const paymentService = new PaymentService();

async function initializePayments() {
    // Create Stripe products and prices
    await paymentService.createStripeProducts();
    
    // Create PayPal billing plans
    await paymentService.createPayPalPlans();
    
    console.log('Payment system initialized');
}

initializePayments();
```

### 3. Implement AI Service Integration

```python
# ai-services/examples/quick_start.py
from services.ai_service_manager import AIServiceManager
from services.provider_router import ProviderRouter, ServiceTier
from services.cost_tracker import CostTracker

async def create_italian_podcast():
    """Example: Create an Italian podcast using multiple AI services"""
    
    # Initialize services
    ai_manager = AIServiceManager()
    router = ProviderRouter()
    cost_tracker = CostTracker()
    
    user_id = "user_123"
    topic = "Il futuro dell'AI in Italia"
    
    # 1. Route request to best provider
    routing_decision = await router.route_request(
        service_type="text",
        task="script_writing",
        user_id=user_id,
        tier=ServiceTier.STANDARD,
        quality_requirement=8.0,
        language="it",
        additional_params={"duration": 30}
    )
    
    print(f"Selected provider: {routing_decision.provider_name}")
    print(f"Estimated cost: €{routing_decision.estimated_cost:.4f}")
    
    # 2. Generate script
    script_result = await ai_manager.generate_with_retry(
        task="script_writing",
        prompt=f"Scrivi uno script per un podcast italiano di 30 minuti su: {topic}",
        user_id=user_id
    )
    
    # 3. Track cost
    if script_result['success']:
        await cost_tracker.track_usage(
            user_id=user_id,
            service="text_generation",
            provider=script_result['provider'],
            task="script_writing",
            cost=script_result['cost'],
            usage_data=script_result['usage']
        )
    
    return script_result

# Run the example
import asyncio
asyncio.run(create_italian_podcast())
```

## Step-by-Step Integration

### Step 1: Text Generation Integration

```python
# ai-services/integrations/openai_integration.py
import os
from openai import AsyncOpenAI
from typing import Dict, Any

class OpenAIIntegration:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.models = {
            'gpt-4': {'input_cost': 0.03, 'output_cost': 0.06},
            'gpt-3.5-turbo': {'input_cost': 0.0005, 'output_cost': 0.0015}
        }
    
    async def generate_italian_script(self, topic: str, duration: int) -> Dict[str, Any]:
        """Generate Italian podcast script"""
        
        prompt = self._build_italian_prompt(topic, duration)
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "Sei un esperto scrittore di podcast italiani. Scrivi in italiano naturale e colloquiale."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Calculate cost
            usage = response.usage
            cost = self._calculate_cost(usage, 'gpt-4')
            
            return {
                'success': True,
                'content': response.choices[0].message.content,
                'usage': {
                    'prompt_tokens': usage.prompt_tokens,
                    'completion_tokens': usage.completion_tokens,
                    'total_tokens': usage.total_tokens
                },
                'cost': cost,
                'model': 'gpt-4'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cost': 0
            }
    
    def _build_italian_prompt(self, topic: str, duration: int) -> str:
        return f"""
        Scrivi uno script per un podcast italiano.
        
        Argomento: {topic}
        Durata: {duration} minuti
        Stile: Conversazionale e coinvolgente
        
        Struttura:
        1. Introduzione accattivante (1-2 minuti)
        2. Sviluppo con 3-4 punti chiave
        3. Esempi concreti e aneddoti
        4. Conclusioni e call-to-action
        
        Usa un linguaggio naturale italiano con riferimenti culturali appropriati.
        Includi domande retoriche per coinvolgere l'ascoltatore.
        """
    
    def _calculate_cost(self, usage, model: str) -> float:
        """Calculate cost based on token usage"""
        model_costs = self.models[model]
        input_cost = (usage.prompt_tokens / 1000) * model_costs['input_cost']
        output_cost = (usage.completion_tokens / 1000) * model_costs['output_cost']
        return input_cost + output_cost
```

### Step 2: TTS Integration (ElevenLabs)

```python
# ai-services/integrations/elevenlabs_integration.py
import os
from elevenlabs import AsyncElevenLabs
from typing import Dict, Any

class ElevenLabsIntegration:
    def __init__(self):
        self.client = AsyncElevenLabs(api_key=os.getenv('ELEVENLABS_API_KEY'))
        self.italian_voices = {
            'luca': 'voice_id_1',  # Standard Italian male
            'sofia': 'voice_id_2',  # Northern Italian female
            'marco': 'voice_id_3',  # Central Italian male (business)
        }
        self.cost_per_1k_chars = 0.18
    
    async def generate_italian_audio(self, text: str, voice: str = 'luca') -> Dict[str, Any]:
        """Generate Italian audio from text"""
        
        try:
            # Optimize text for Italian TTS
            optimized_text = self._optimize_for_italian_tts(text)
            
            # Generate audio
            audio = await self.client.text_to_speech.convert(
                voice_id=self.italian_voices[voice],
                text=optimized_text,
                model_id="eleven_multilingual_v2"
            )
            
            # Calculate cost
            cost = self._calculate_cost(optimized_text)
            
            return {
                'success': True,
                'audio': audio,
                'text_length': len(optimized_text),
                'cost': cost,
                'voice': voice
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'cost': 0
            }
    
    def _optimize_for_italian_tts(self, text: str) -> str:
        """Optimize Italian text for better TTS results"""
        
        # Replace abbreviations
        replacements = {
            'ecc.': 'eccetera',
            'cfr.': 'confronta',
            'es.': 'per esempio',
            'pag.': 'pagina',
            'tel.': 'telefono'
        }
        
        for abbrev, full in replacements.items():
            text = text.replace(abbrev, full)
        
        # Add SSML pauses for better rhythm
        lines = text.split('\n')
        optimized_lines = []
        for line in lines:
            if line.strip() and not line.strip().endswith(('.', '!', '?')):
                line = line + ' .'
            optimized_lines.append(line)
        
        return '\n'.join(optimized_lines)
    
    def _calculate_cost(self, text: str) -> float:
        """Calculate cost based on character count"""
        return (len(text) / 1000) * self.cost_per_1k_chars
```

### Step 3: Payment Integration (Stripe)

```javascript
// backend/src/integrations/stripe-integration.js
const Stripe = require('stripe');

class StripeIntegration {
    constructor() {
        this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        
        // Define Italian pricing plans
        this.plans = {
            free: {
                stripePriceId: 'price_free',
                name: 'Gratuito',
                price: 0,
                features: ['1 podcast/mese', 'Voci base']
            },
            creator: {
                stripePriceId: 'price_creator',
                name: 'Creator',
                price: 9.99,
                features: ['5 podcast/mese', 'Voci premium', 'Supporto email']
            },
            pro: {
                stripePriceId: 'price_pro',
                name: 'Pro',
                price: 29.99,
                features: ['Podcast illimitati', 'Clonazione voce', 'Supporto prioritario']
            }
        };
    }
    
    async createCheckoutSession(user, planId, successUrl, cancelUrl) {
        const plan = this.plans[planId];
        if (!plan) {
            throw new Error('Plan not found');
        }
        
        // Get or create Stripe customer
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await this.stripe.customers.create({
                email: user.email,
                name: user.username,
                metadata: { userId: user.id }
            });
            customerId = customer.id;
        }
        
        // Create checkout session
        const session = await this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: plan.stripePriceId,
                quantity: 1
            }],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            subscription_data: {
                metadata: {
                    userId: user.id,
                    planId: planId
                }
            },
            locale: 'it', // Italian locale
            custom_text: {
                submit: {
                    message: 'Completa il pagamento per attivare il tuo abbonamento'
                }
            }
        });
        
        return {
            sessionId: session.id,
            url: session.url,
            customerId: customerId
        };
    }
    
    async handleWebhook(payload, signature) {
        let event;
        
        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.webhookSecret
            );
        } catch (err) {
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }
        
        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object);
                break;
                
            case 'invoice.payment_succeeded':
                await this.handlePaymentSucceeded(event.data.object);
                break;
                
            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;
        }
        
        return { success: true, event: event.type };
    }
    
    async handleCheckoutCompleted(session) {
        const userId = session.metadata.userId;
        const planId = session.metadata.planId;
        
        // Update user subscription in database
        await this.updateUserSubscription(userId, {
            planId: planId,
            stripeSubscriptionId: session.subscription,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: this.calculatePeriodEnd(new Date(), 'month')
        });
        
        console.log(`User ${userId} subscribed to plan ${planId}`);
    }
    
    calculatePeriodEnd(startDate, interval) {
        const endDate = new Date(startDate);
        if (interval === 'month') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (interval === 'year') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        return endDate;
    }
}
```

### Step 4: Bank Transfer Integration (Italian)

```javascript
// backend/src/integrations/bank-transfer-integration.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class BankTransferIntegration {
    constructor() {
        this.bankDetails = {
            name: process.env.BANK_NAME || 'Banca Italiana',
            accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'Podcast AI Platform',
            iban: process.env.BANK_IBAN,
            bic: process.env.BANK_BIC,
            address: process.env.BANK_ADDRESS || 'Milano, Italia'
        };
        
        if (!this.bankDetails.iban) {
            throw new Error('Bank IBAN not configured');
        }
    }
    
    async generateInvoice(user, plan, subscriptionId) {
        // Calculate amounts with Italian VAT (22%)
        const vatRate = 0.22;
        const amountWithoutVat = plan.price;
        const vatAmount = amountWithoutVat * vatRate;
        const totalAmount = amountWithoutVat + vatAmount;
        
        // Generate payment reference
        const paymentReference = `PODCASTAI-${user.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
        
        // Create invoice data
        const invoiceData = {
            invoiceNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${subscriptionId.slice(0, 8)}`,
            date: new Date().toLocaleDateString('it-IT'),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('it-IT'),
            user: {
                name: user.username || user.email,
                email: user.email,
                address: user.address || 'Indirizzo non specificato'
            },
            items: [{
                description: `Abbonamento ${plan.name} - Podcast AI Platform`,
                quantity: 1,
                unitPrice: amountWithoutVat.toFixed(2),
                total: amountWithoutVat.toFixed(2)
            }],
            subtotal: amountWithoutVat.toFixed(2),
            vatRate: '22%',
            vatAmount: vatAmount.toFixed(2),
            total: totalAmount.toFixed(2),
            paymentReference: paymentReference,
            bankDetails: this.bankDetails
        };
        
        // Generate PDF invoice
        const pdfPath = await this.generatePDFInvoice(invoiceData);
        
        return {
            success: true,
            invoiceData: invoiceData,
            pdfPath: pdfPath,
            paymentReference: paymentReference,
            instructions: this.getPaymentInstructions(invoiceData)
        };
    }
    
    async generatePDFInvoice(invoiceData) {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const filename = `invoice-${invoiceData.invoiceNumber}.pdf`;
            const filepath = path.join(__dirname, '../../invoices', filename);
            
            // Ensure invoices directory exists
            const dir = path.dirname(filepath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            const stream = fs.createWriteStream(filepath);
            doc.pipe(stream);
            
            // Header
            doc.fontSize(20).text('FATTURA', { align: 'center' });
            doc.moveDown();
            
            // Invoice details
            doc.fontSize(12);
            doc.text(`Numero: ${invoiceData.invoiceNumber}`);
            doc.text(`Data: ${invoiceData.date}`);
            doc.text(`Scadenza: ${invoiceData.dueDate}`);
            doc.moveDown();
            
            // Customer details
            doc.text('Cliente:');
            doc.text(invoiceData.user.name);
            doc.text(invoiceData.user.email);
            doc.text(invoiceData.user.address);
            doc.moveDown();
            
            // Items table
            doc.text('Descrizione', 50, doc.y);
            doc.text('Importo', 400, doc.y);
            doc.moveDown();
            doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
            doc.moveDown();
            
            invoiceData.items.forEach(item => {
                doc.text(item.description, 50);
                doc.text(`€ ${item.total}`, 400);
                doc.moveDown();
            });
            
            // Totals
            doc.moveDown();
            doc.text(`Imponibile: € ${invoiceData.subtotal}`, { align: 'right' });
            doc.text(`IVA (${invoiceData.vatRate}): € ${invoiceData.vatAmount}`, { align: 'right' });
            doc.text(`Totale: € ${invoiceData.total}`, { align: 'right', bold