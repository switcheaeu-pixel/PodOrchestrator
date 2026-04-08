# PodOrchestrator - AI Podcast Orchestration Platform

A scalable platform that orchestrates multiple AI services to create complete podcasts automatically, with a focus on the Italian market.

## 🎯 Features

- **End-to-end podcast creation** from topic to published episode
- **Italian language optimization** with regional dialect support
- **Cost-aware AI routing** - automatically selects best/cheapest services
- **Multi-tenant architecture** for B2B and individual creators
- **Real-time workflow tracking** with WebSocket updates
- **Comprehensive billing & usage tracking**
- **Multi-payment system** (Stripe, PayPal, Italian bank transfer, Satispay)

## 🏗️ Architecture

```
Frontend (Italian UI) → API Gateway → Workflow Orchestrator → AI Services
```

### Core Components:
1. **Workflow Engine** - Manages podcast creation as state machine
2. **AI Service Manager** - Unified interface to all AI APIs
3. **Cost Router** - Smart routing based on cost/quality
4. **Audio Pipeline** - Handles TTS, editing, mixing
5. **Italian Processor** - Language-specific optimizations
6. **Billing System** - Usage tracking and invoicing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 7+
- Docker (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/ogringocibernetico/PodOrchestrator.git
cd PodOrchestrator

# Install backend dependencies
cd backend
npm install

# Install Python dependencies
cd ../ai-services
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database credentials

# Start services with Docker Compose
docker-compose up -d

# Or start manually
# Start Redis
redis-server

# Start PostgreSQL
sudo service postgresql start

# Initialize database
npm run db:migrate

# Start backend
npm run dev

# Start AI services
cd ai-services
python main.py
```

## 📁 Project Structure

```
PodOrchestrator/
├── backend/                 # Node.js API server
├── frontend/               # React/Next.js Italian UI
├── ai-services/            # Python AI service layer
├── database/               # SQL migrations and schemas
├── docker/                 # Docker configurations
├── docs/                   # Documentation
├── scripts/                # Deployment and utility scripts
├── .env.example            # Environment template
├── docker-compose.yml      # Development setup
├── docker-compose.prod.yml # Production setup
└── README.md               # This file
```

## 🔧 Configuration

### Required API Keys
- OpenAI API key
- ElevenLabs API key
- AssemblyAI API key
- Descript API key (optional)
- Google Cloud TTS API key

### Payment Providers
- Stripe API key
- PayPal Client ID/Secret
- Bank account details (Italian)
- Satispay API key (optional)

## 📊 Database Schema

Key tables:
- `users` - Platform users with tier-based limits
- `podcasts` - Podcast projects and metadata
- `workflow_steps` - Individual steps in podcast creation
- `api_usage` - Detailed API usage tracking
- `italian_voice_profiles` - Custom Italian voice configurations

## 🔌 API Endpoints

### Public API
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/pricing` - Get pricing tiers

### Protected API (requires auth)
- `POST /api/podcasts` - Create new podcast
- `GET /api/podcasts` - List user's podcasts
- `GET /api/podcasts/:id` - Get podcast details
- `GET /api/podcasts/:id/status` - Get creation status
- `POST /api/voices/clone` - Clone Italian voice
- `GET /api/billing/usage` - Get usage statistics

## 💰 Pricing Tiers

| Tier | Monthly Price | Podcasts | Voice Options | Support |
|------|---------------|----------|---------------|---------|
| Free | €0 | 1/month | Basic Italian | Community |
| Creator | €9.99 | 5/month | Premium Italian | Email |
| Pro | €29.99 | Unlimited | Voice Cloning | Priority |
| Business | €99 | Unlimited | White-label | Dedicated |

## 🧪 Testing

```bash
# Run backend tests
cd backend
npm test

# Run AI service tests
cd ai-services
pytest

# Run integration tests
npm run test:integration
```

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes Deployment
```bash
kubectl apply -f k8s/
```

### Manual Deployment
See `DEPLOYMENT.md` for detailed instructions.

## 📈 Monitoring

- **Prometheus** for metrics
- **Grafana** for dashboards
- **Sentry** for error tracking
- **LogDNA** for centralized logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 📞 Support

- GitHub Issues for bug reports
- Discord community for questions
- Email support for business tier

## 🎯 Roadmap

### Phase 1 (MVP)
- [x] Basic podcast creation workflow
- [x] Italian language support
- [x] Cost tracking
- [ ] User dashboard

### Phase 2
- [ ] Voice cloning for Italian
- [ ] Multi-speaker dialogues
- [ ] Advanced audio editing
- [ ] Mobile app

### Phase 3
- [ ] Video podcast generation
- [ ] Live podcast recording
- [ ] Marketplace for Italian voices
- [ ] AI-powered monetization

## 🚀 GitHub Integration

This repository is fully configured for GitHub:
- GitHub Actions workflows for CI/CD
- Issue templates for bug reports and feature requests
- Pull request templates
- Code scanning and security analysis

### GitHub Actions Workflows:
- **CI Pipeline**: Automated testing on push/pull request
- **CD Pipeline**: Automated deployment to staging/production
- **Security Scanning**: Dependency vulnerability checks
- **Code Quality**: Linting and formatting checks

---

**Built with ❤️ for the Italian podcast community by Claudio**

## 📊 Cost Analysis

**Per Podcast Cost Estimates:**
- Free Tier: ~€0.39 (Google TTS + GPT-3.5)
- Creator Tier: ~€2.33 (ElevenLabs + GPT-4)
- Pro Tier: ~€3.50 (Voice cloning + Claude Opus)

**Platform Margins:**
- Creator Plan: ~46% margin
- Pro Plan: ~88% margin
- Business Plan: ~90% margin

## 🔒 Security & Compliance

- GDPR compliant for Italian/EU market
- Italian data residency (EU servers)
- PCI DSS compliant payment processing
- Regular security audits
- Encrypted data at rest and in transit

## 🇮🇹 Italian Market Focus

- Italian language processing layer
- Regional accent support (Northern, Central, Southern)
- Cultural reference database
- Italian payment methods integration
- Italian legal compliance (GDPR, privacy laws)