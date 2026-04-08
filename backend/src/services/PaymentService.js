/**
 * Unified Payment Service for Podcast AI Platform
 * Supports multiple payment providers with fallback
 */

const Stripe = require('stripe');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PaymentService {
    constructor() {
        // Initialize Stripe
        if (process.env.STRIPE_SECRET_KEY) {
            this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            this.stripeEnabled = true;
        } else {
            this.stripeEnabled = false;
            logger.warn('Stripe not configured');
        }
        
        // Initialize PayPal
        this.paypalEnabled = !!process.env.PAYPAL_CLIENT_ID;
        
        // Initialize Satispay (Italian payment method)
        this.satispayEnabled = !!process.env.SATISPAY_API_KEY;
        
        // Bank transfer is always available
        this.bankTransferEnabled = true;
    }
    
    /**
     * Create a customer in all payment systems
     */
    async createCustomer(user) {
        const customerData = {
            email: user.email,
            name: user.username || user.email,
            metadata: {
                userId: user.id,
                tier: user.tier || 'free'
            }
        };
        
        const results = {};
        
        // Create Stripe customer
        if (this.stripeEnabled) {
            try {
                const stripeCustomer = await this.stripe.customers.create(customerData);
                results.stripe = {
                    customerId: stripeCustomer.id,
                    success: true
                };
            } catch (error) {
                logger.error('Failed to create Stripe customer:', error);
                results.stripe = {
                    error: error.message,
                    success: false
                };
            }
        }
        
        // Create PayPal customer (if needed)
        if (this.paypalEnabled) {
            // PayPal doesn't have customer objects in the same way
            // We'll store the user email for future reference
            results.paypal = {
                customerEmail: user.email,
                success: true
            };
        }
        
        return results;
    }
    
    /**
     * Create a subscription for a user
     */
    async createSubscription(userId, planId, paymentMethod = 'stripe') {
        const user = await this.getUser(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        const plan = this.getPlan(planId);
        if (!plan) {
            throw new Error('Plan not found');
        }
        
        switch (paymentMethod.toLowerCase()) {
            case 'stripe':
                return await this.createStripeSubscription(user, plan);
            case 'paypal':
                return await this.createPayPalSubscription(user, plan);
            case 'bank_transfer':
                return await this.createBankTransferSubscription(user, plan);
            case 'satispay':
                return await this.createSatispaySubscription(user, plan);
            default:
                throw new Error(`Unsupported payment method: ${paymentMethod}`);
        }
    }
    
    /**
     * Create Stripe subscription
     */
    async createStripeSubscription(user, plan) {
        if (!this.stripeEnabled) {
            throw new Error('Stripe is not configured');
        }
        
        try {
            // Get or create Stripe customer
            let stripeCustomerId = user.paymentMetadata?.stripeCustomerId;
            if (!stripeCustomerId) {
                const customer = await this.stripe.customers.create({
                    email: user.email,
                    name: user.username,
                    metadata: { userId: user.id }
                });
                stripeCustomerId = customer.id;
                
                // Update user with Stripe customer ID
                await this.updateUserPaymentMetadata(user.id, {
                    stripeCustomerId: customer.id
                });
            }
            
            // Create subscription
            const subscription = await this.stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: plan.stripePriceId }],
                payment_behavior: 'default_incomplete',
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    userId: user.id,
                    planId: plan.id,
                    tier: plan.tier
                }
            });
            
            // Create checkout session for payment
            const session = await this.stripe.checkout.sessions.create({
                customer: stripeCustomerId,
                payment_method_types: ['card'],
                line_items: [{
                    price: plan.stripePriceId,
                    quantity: 1
                }],
                mode: 'subscription',
                success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.APP_URL}/payment/cancel`,
                subscription_data: {
                    metadata: {
                        userId: user.id,
                        planId: plan.id
                    }
                }
            });
            
            return {
                success: true,
                paymentMethod: 'stripe',
                subscriptionId: subscription.id,
                checkoutUrl: session.url,
                requiresAction: true,
                clientSecret: subscription.latest_invoice.payment_intent.client_secret,
                metadata: {
                    stripeCustomerId,
                    sessionId: session.id
                }
            };
            
        } catch (error) {
            logger.error('Stripe subscription creation failed:', error);
            throw new Error(`Stripe error: ${error.message}`);
        }
    }
    
    /**
     * Create PayPal subscription
     */
    async createPayPalSubscription(user, plan) {
        if (!this.paypalEnabled) {
            throw new Error('PayPal is not configured');
        }
        
        try {
            // Get PayPal access token
            const auth = Buffer.from(
                `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
            ).toString('base64');
            
            const tokenResponse = await axios.post(
                `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`,
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            const accessToken = tokenResponse.data.access_token;
            
            // Create subscription plan in PayPal
            const subscriptionData = {
                plan_id: plan.paypalPlanId || this.createPayPalPlanId(plan),
                start_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // Start in 5 minutes
                quantity: '1',
                shipping_amount: {
                    currency_code: plan.currency,
                    value: '0'
                },
                subscriber: {
                    name: {
                        given_name: user.username || user.email.split('@')[0]
                    },
                    email_address: user.email
                },
                application_context: {
                    brand_name: 'Podcast AI',
                    locale: 'it-IT',
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'SUBSCRIBE_NOW',
                    payment_method: {
                        payer_selected: 'PAYPAL',
                        payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                    },
                    return_url: `${process.env.APP_URL}/paypal/success`,
                    cancel_url: `${process.env.APP_URL}/paypal/cancel`
                }
            };
            
            const subscriptionResponse = await axios.post(
                `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions`,
                subscriptionData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const subscription = subscriptionResponse.data;
            
            // Extract approval URL
            let approvalUrl = '';
            for (const link of subscription.links) {
                if (link.rel === 'approve') {
                    approvalUrl = link.href;
                    break;
                }
            }
            
            return {
                success: true,
                paymentMethod: 'paypal',
                subscriptionId: subscription.id,
                checkoutUrl: approvalUrl,
                requiresAction: true,
                metadata: {
                    paypalSubscriptionId: subscription.id,
                    status: subscription.status
                }
            };
            
        } catch (error) {
            logger.error('PayPal subscription creation failed:', error);
            throw new Error(`PayPal error: ${error.response?.data?.message || error.message}`);
        }
    }
    
    /**
     * Create bank transfer subscription (common in Italy)
     */
    async createBankTransferSubscription(user, plan) {
        // Generate unique payment reference
        const paymentReference = `PODCASTAI-${user.id.slice(0, 8)}-${Date.now().toString().slice(-6)}`;
        
        // Bank details (configured in environment)
        const bankDetails = {
            bankName: process.env.BANK_NAME || 'Banca Italiana',
            accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'Podcast AI Platform',
            iban: process.env.BANK_IBAN,
            bic: process.env.BANK_BIC,
            reason: `Abbonamento ${plan.name} - ${user.email}`
        };
        
        if (!bankDetails.iban) {
            throw new Error('Bank transfer not configured');
        }
        
        // Calculate amount with VAT (Italian 22%)
        const vatRate = 0.22;
        const amountWithoutVat = plan.price;
        const vatAmount = amountWithoutVat * vatRate;
        const totalAmount = amountWithoutVat + vatAmount;
        
        // Create pending subscription in database
        const subscriptionId = uuidv4();
        await this.createPendingSubscription({
            id: subscriptionId,
            userId: user.id,
            planId: plan.id,
            paymentMethod: 'bank_transfer',
            amount: totalAmount,
            currency: plan.currency,
            status: 'pending',
            paymentReference,
            bankDetails,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        });
        
        // Generate invoice PDF (simplified)
        const invoice = await this.generateInvoice({
            subscriptionId,
            user,
            plan,
            amount: totalAmount,
            vatAmount,
            paymentReference,
            bankDetails
        });
        
        return {
            success: true,
            paymentMethod: 'bank_transfer',
            subscriptionId,
            requiresAction: false,
            instructions: {
                amount: totalAmount.toFixed(2),
                currency: plan.currency,
                paymentReference,
                bankDetails,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                invoiceUrl: invoice.url
            },
            metadata: {
                paymentReference,
                invoiceGenerated: true
            }
        };
    }
    
    /**
     * Create Satispay subscription (popular in Italy)
     */
    async createSatispaySubscription(user, plan) {
        if (!this.satispayEnabled) {
            throw new Error('Satispay is not configured');
        }
        
        try {
            // Satispay API integration
            const paymentData = {
                flow: 'MATCH_CODE',
                amount_unit: Math.round(plan.price * 100), // Convert to cents
                currency: plan.currency,
                description: `Abbonamento ${plan.name} - Podcast AI`,
                phone_number: user.phone, // User must provide phone number
                callback_url: `${process.env.APP_URL}/satispay/callback`,
                metadata: {
                    userId: user.id,
                    planId: plan.id,
                    email: user.email
                }
            };
            
            const response = await axios.post(
                'https://authservices.satispay.com/wally-services/protocol/tests/signature',
                paymentData,
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.SATISPAY_API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            const payment = response.data;
            
            return {
                success: true,
                paymentMethod: 'satispay',
                paymentId: payment.id,
                requiresAction: true,
                instructions: {
                    matchCode: payment.match_code,
                    expirationDate: payment.expiration_date,
                    phoneNumber: user.phone
                },
                metadata: {
                    satispayPaymentId: payment.id,
                    status: payment.status
                }
            };
            
        } catch (error) {
            logger.error('Satispay payment creation failed:', error);
            throw new Error(`Satispay error: ${error.response?.data?.message || error.message}`);
        }
    }
    
    /**
     * Handle payment webhooks
     */
    async handleWebhook(payload, signature, provider) {
        switch (provider) {
            case 'stripe':
                return await this.handleStripeWebhook(payload, signature);
            case 'paypal':
                return await this.handlePayPalWebhook(payload);
            case 'satispay':
                return await this.handleSatispayWebhook(payload);
            default:
                throw new Error(`Unsupported webhook provider: ${provider}`);
        }
    }
    
    /**
     * Handle Stripe webhook
     */
    async handleStripeWebhook(payload, signature) {
        if (!this.stripeEnabled) {
            throw new Error('Stripe is not configured');
        }
        
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET
            );
        } catch (error) {
            logger.error('Stripe webhook signature verification failed:', error);
            throw new Error(`Webhook signature verification failed: ${error.message}`);
        }
        
        const eventType = event.type;
        const data = event.data.object;
        
        logger.info(`Processing Stripe webhook: ${eventType}`);
        
        switch (eventType) {
            case 'checkout.session.completed':
                await this.handleStripeCheckoutCompleted(data);
                break;
                
            case 'invoice.payment_succeeded':
                await this.handleStripePaymentSucceeded(data);
                break;
                
            case 'invoice.payment_failed':
                await this.handleStripePaymentFailed(data);
                break;
                
            case 'customer.subscription.updated':
                await this.handleStripeSubscriptionUpdated(data);
                break;
                
            case 'customer.subscription.deleted':
                await this.handleStripeSubscriptionDeleted(data);
                break;
                
            default:
                logger.info(`Unhandled Stripe event type: ${eventType}`);
        }
        
        return { success: true, event: eventType };
    }
    
    /**
     * Handle PayPal webhook
     */
    async handlePayPalWebhook(payload) {
        // Verify PayPal webhook signature
        const verifyResponse = await axios.post(
            `${process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com'}/v1/notifications/verify-webhook-signature`,
            {
                transmission_id: payload.transmission_id,
                transmission_time: payload.transmission_time,
                transmission_sig: payload.transmission_sig,
                cert_url: payload.cert_url,
                auth_algo: payload.auth_algo,
                webhook_id: process.env.PAYPAL_WEBHOOK_ID,
                webhook_event: payload
            },
            {
                headers: {
                    'Authorization': `Bearer ${await this.getPayPalAccessToken()}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (verifyResponse.data.verification_status !== 'SUCCESS') {
            throw new Error('PayPal webhook signature verification failed');
        }
        
        const eventType = payload.event_type;
        
        switch (eventType) {
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
                await this.handlePayPalSubscriptionActivated(payload);
                break;
                
            case 'BILLING.SUBSCRIPTION.CANCELLED':
                await this.handlePayPalSubscriptionCancelled(payload);
                break;
                
            case 'PAYMENT.SALE.COMPLETED':
                await this.handlePayPalPaymentCompleted(payload);
                break;
                
            default:
                logger.info(`Unhandled PayPal event type: ${eventType}`);
        }
        
        return { success: true, event: eventType };
    }
    
    /**
     * Handle Satispay webhook
     */
    async handleSatispayWebhook(payload) {
        // Verify Satispay webhook signature
        const expectedSignature = this.generateSatispaySignature(payload);
        if (payload.signature !== expectedSignature) {
            throw new Error('Satispay webhook signature verification failed');
        }
        
        const eventType = payload.event_type;
        const paymentId = payload.payment_id;
        
        switch (eventType) {
            case 'payment.completed':
                await this.handleSatispayPaymentCompleted(paymentId);
                break;
                
            case 'payment.failed':
                await this.handleSatispayPaymentFailed(paymentId);
                break;
                
            default:
                logger.info(`Unhandled Satispay event type: ${eventType}`);
        }
        
        return { success: true, event: eventType };
    }
    
    /**
     * Get available payment methods for a user/country
     */
    async getAvailablePaymentMethods(userId, country = 'IT') {
        const methods = [];
        
        // Always available
        methods.push({
            id: 'bank_transfer',
            name: 'Bonifico Bancario',
            description: 'Pagamento tramite bonifico bancario',
            icon: 'bank',
            supportedCountries: ['IT', 'EU'],
            processingTime: '1-3 giorni lavorativi',
            fees: '0€'
        });
        
        // Stripe (card payments)
        if (this.stripeEnabled) {
            methods.push({
                id: 'stripe',
                name: 'Carta di Credito',
                description: 'Pagamento sicuro con carta di credito',
                icon: 'credit-card',
                supportedCountries: ['IT', 'EU', 'US', 'GB'],
                processingTime: 'Immediato',
                fees: '2.9% + 0.30€'
            });
        }
        
        // PayPal
        if (this.paypalEnabled) {
            methods.push({
                id: 'paypal',
                name: 'PayPal',
                description: 'Pagamento tramite PayPal',
                icon: 'paypal',
                supportedCountries: ['IT', 'EU', 'US', 'GB'],
                processing