# Deployment Checklist - Podcast AI Platform

## Pre-Deployment Checklist

### ✅ Infrastructure Setup
- [ ] Cloud provider account (AWS/GCP/Azure)
- [ ] Domain name registered (podcastai.it)
- [ ] SSL certificates configured
- [ ] DNS records set up

### ✅ Environment Configuration
- [ ] `.env` file created with all API keys
- [ ] Database credentials secured
- [ ] Redis password set
- [ ] S3/MinIO bucket created
- [ ] CDN configured (optional)

### ✅ AI API Accounts
- [ ] OpenAI API account with credits
- [ ] ElevenLabs account with Italian voices
- [ ] AssemblyAI account for transcription
- [ ] Google Cloud account (for TTS)
- [ ] AWS account (for Polly, optional)

### ✅ Payment Providers
- [ ] Stripe account (primary)
- [ ] PayPal business account
- [ ] Italian bank account for transfers
- [ ] Satispay merchant account (optional)

## Deployment Steps

### Phase 1: Initial Deployment

#### 1. Clone and Configure
```bash
# Clone repository
git clone https://github.com/yourusername/podcast-ai-platform.git
cd podcast-ai-platform

# Configure environment
cp .env.example .env
# Edit .env with your production values
nano .env

# Set production environment
export NODE_ENV=production
```

#### 2. Database Setup
```bash
# Initialize production database
docker-compose -f docker-compose.prod.yml up -d postgres

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm backend npm run db:migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml run --rm backend npm run db:seed
```

#### 3. Start Core Services
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### 4. Configure Reverse Proxy (Nginx)
```nginx
# /etc/nginx/sites-available/podcastai.it
server {
    listen 80;
    server_name podcastai.it www.podcastai.it;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name podcastai.it www.podcastai.it;
    
    ssl_certificate /etc/letsencrypt/live/podcastai.it/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/podcastai.it/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # AI Services
    location /ai/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Phase 2: Payment System Setup

#### 1. Stripe Configuration
```bash
# Create Stripe products and prices
curl https://api.stripe.com/v1/products \
  -u sk_live_your_key: \
  -d name="Creator Plan" \
  -d description="5 podcast al mese, voci premium"

curl https://api.stripe.com/v1/prices \
  -u sk_live_your_key: \
  -d product="prod_creator" \
  -d unit_amount=999 \
  -d currency="eur" \
  -d recurring[interval]="month"
```

#### 2. PayPal Configuration
1. Log into PayPal Developer Dashboard
2. Create new REST API app
3. Get Client ID and Secret
4. Configure webhooks for:
   - PAYMENT.SALE.COMPLETED
   - BILLING.SUBSCRIPTION.ACTIVATED
   - BILLING.SUBSCRIPTION.CANCELLED

#### 3. Bank Transfer Setup
```bash
# Configure bank details in environment
BANK_NAME="Banca Italiana"
BANK_IBAN="IT60X0542811101000000123456"
BANK_BIC="BPAAITRRXXX"
BANK_ACCOUNT_HOLDER="Podcast AI Platform Srl"
```

### Phase 3: AI Service Configuration

#### 1. OpenAI Configuration
```bash
# Set up usage alerts
# In OpenAI dashboard:
# 1. Set usage limits per user
# 2. Configure billing alerts
# 3. Enable Italian language models
```

#### 2. ElevenLabs Configuration
```bash
# Configure Italian voices
# 1. Purchase character credits
# 2. Test Italian voice samples
# 3. Set up voice cloning (if offering)
```

#### 3. AssemblyAI Configuration
```bash
# Set up Italian transcription
# 1. Enable Italian language support
# 2. Configure webhooks for completion
# 3. Set up speaker diarization
```

### Phase 4: Monitoring Setup

#### 1. Prometheus & Grafana
```bash
# Deploy monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: https://podcastai.it:3000 (admin/admin)
# Prometheus: https://podcastai.it:9090
```

#### 2. Logging Setup
```bash
# Configure centralized logging
# Option 1: ELK Stack
# Option 2: Loki + Grafana
# Option 3: Cloud provider logging
```

#### 3. Alerting Configuration
```yaml
# monitoring/alerts/alerts.yml
groups:
  - name: cost_alerts
    rules:
      - alert: HighAICost
        expr: sum(ai_api_cost_total{service="text_generation"}) > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High AI API costs detected"
          description: "AI API costs have exceeded €100 in the last 5 minutes"
```

## Post-Deployment Verification

### ✅ Service Health Checks
```bash
# Check all services
curl https://podcastai.it/health
curl https://podcastai.it/api/health
curl https://podcastai.it/ai/health

# Check database connection
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check Redis connection
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### ✅ Payment System Tests
```bash
# Test Stripe webhooks
stripe listen --forward-to https://podcastai.it/api/webhooks/stripe

# Test PayPal sandbox
# Create test payment in PayPal sandbox
```

### ✅ AI Service Tests
```python
# Test AI integration
python ai-services/tests/integration/test_all_apis.py

# Expected output:
# ✅ OpenAI: Connected
# ✅ ElevenLabs: Italian voices available
# ✅ AssemblyAI: Transcription working
# ✅ Google TTS: Italian voices available
```

### ✅ User Flow Tests
1. **Registration**: Create new account
2. **Subscription**: Subscribe to Creator plan
3. **Podcast Creation**: Create 30-minute Italian podcast
4. **Payment**: Verify payment processing
5. **Download**: Download completed podcast

## Scaling Configuration

### Horizontal Scaling
```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
  
  ai-services:
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Database Scaling
```sql
-- Create read replicas
CREATE PUBLICATION podcast_publication FOR ALL TABLES;
-- On replica:
CREATE SUBSCRIPTION podcast_subscription 
CONNECTION 'host=primary dbname=podcast_ai' 
PUBLICATION podcast_publication;
```

### Cache Scaling
```bash
# Redis Cluster setup
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

## Security Checklist

### ✅ Network Security
- [ ] Firewall configured (only necessary ports open)
- [ ] VPC/Network isolation
- [ ] DDoS protection enabled
- [ ] WAF configured

### ✅ Application Security
- [ ] All dependencies updated
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection prevention

### ✅ Data Security
- [ ] Database encrypted at rest
- [ ] Backups encrypted
- [ ] SSL/TLS for all connections
- [ ] API keys rotated regularly

### ✅ Compliance
- [ ] GDPR compliance (Italian data protection)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented

## Backup Strategy

### Daily Backups
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d)

# Database backup
pg_dump -U podcast_user -d podcast_ai > /backups/db_$DATE.sql

# File backup
aws s3 sync /app/uploads s3://podcast-ai-backups/uploads_$DATE/

# Config backup
tar -czf /backups/config_$DATE.tar.gz /app/.env /app/docker-compose*.yml

# Rotate old backups (keep 30 days)
find /backups -name "*.sql" -mtime +30 -delete
```

### Disaster Recovery
```bash
# Recovery script
#!/bin/bash
# restore.sh DATE=20240115

# Restore database
psql -U podcast_user -d podcast_ai < /backups/db_$DATE.sql

# Restore files
aws s3 sync s3://podcast-ai-backups/uploads_$DATE/ /app/uploads/

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Cost Optimization

### AI Cost Management
```python
# Enable cost-saving features
COST_OPTIMIZATION = {
    'enable_caching': True,
    'cache_ttl': 3600,
    'use_cheaper_for_drafts': True,
    'batch_requests': True,
    'fallback_to_local': True
}
```

### Infrastructure Costs
```bash
# Use reserved instances for stable workloads
# Use spot instances for non-critical workloads
# Implement auto-scaling
# Monitor and clean up unused resources
```

### Monitoring Costs
```bash
# Set up cost alerts
# Monitor AI API usage daily
# Review infrastructure costs weekly
# Optimize based on usage patterns
```

## Italian Market Specific

### ✅ Localization
- [ ] Italian language interface
- [ ] Italian customer support
- [ ] Italian payment methods
- [ ] Italian legal documents

### ✅ Cultural Adaptation
- [ ] Italian holiday awareness
- [ ] Regional accent support
- [ ] Cultural reference database
- [ ] Italian business hours

### ✅ Marketing Setup
- [ ] Italian SEO optimization
- [ ] Social media accounts (Italian)
- [ ] Italian content marketing
- [ ] Local partnerships

## Go-Live Checklist

### 24 Hours Before Launch
- [ ] Final backup taken
- [ ] DNS TTL reduced
- [ ] Team notified
- [ ] Monitoring alerts tested

### Launch Moment
- [ ] DNS switched to production
- [ ] Services verified
- [ ] Payment processing tested
- [ ] First test transaction

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Watch payment failures
- [ ] Check AI API usage
- [ ] User feedback collection

## Support Setup

### Customer Support
```bash
# Support channels:
# 1. Email: support@podcastai.it
# 2. WhatsApp: +39 123 456 7890
# 3. Help center: https://help.podcastai.it
# 4. Italian phone support (business hours)
```

### Technical Support
```bash
# Monitoring tools:
# 1. Sentry for error tracking
# 2. Grafana for metrics
# 3. Log aggregation
# 4. Uptime monitoring
```

### Emergency Contacts
```
Technical Lead: +39 123 456 7891
Payment Issues: +39 123 456 7892
AI Service Issues: +39 123 456 7893
```

## Success Metrics

### Key Performance Indicators
```yaml
kpis:
  daily_active_users: > 100
  monthly_recurring_revenue: > €1,000
  cost_per_podcast: < €2.50
  user_satisfaction: > 4.5/5
  churn_rate: < 5%
```

### Monitoring Dashboard
```
https://grafana.podcastai.it/dashboard/podcast-ai-overview
```

## Maintenance Schedule

### Daily
- [ ] Check service health
- [ ] Review error logs
- [ ] Monitor costs
- [ ] Backup verification

### Weekly
- [ ] Security updates
- [ ] Performance review
- [ ] Cost optimization
- [ ] User feedback review

### Monthly
- [ ] Infrastructure review
- [ ] AI model updates
- [ ] Payment reconciliation
- [ ] Growth analysis

---

**Deployment Complete!** 🎉

Your Podcast AI Platform is now live and ready for Italian users. Monitor closely for the first week and be prepared to scale based on user adoption.

For emergency issues, refer to the [Emergency Procedures](EMERGENCY_PROCEDURES.md) document.