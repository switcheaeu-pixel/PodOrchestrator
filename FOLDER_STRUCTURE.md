# PodOrchestrator - Complete Folder Structure

## 📁 ROOT DIRECTORY
```
PodOrchestrator/
├── 📄 .env.example              # Environment variables template
├── 📄 .gitignore               # Git ignore rules
├── 📄 .github/                 # GitHub Actions & templates
│   ├── 📁 workflows/           # CI/CD pipelines
│   ├── 📁 ISSUE_TEMPLATE/      # Bug/feature templates
│   └── 📄 pull_request_template.md
├── 📄 docker-compose.yml       # Development environment
├── 📄 docker-compose.prod.yml  # Production environment
├── 📄 README.md               # Main documentation
└── 📄 FOLDER_STRUCTURE.md     # This file
```

## 🏗️ ARCHITECTURE DOCUMENTATION
```
📄 ARCHITECTURE.md             # Technical architecture design
📄 DEPLOYMENT.md              # Deployment instructions
📄 DEPLOYMENT_CHECKLIST.md    # Production checklist
📄 IMPLEMENTATION_GUIDE.md    # Step-by-step implementation
📄 INTEGRATION_GUIDE.md       # API & payment integration
📄 TESTING_MONITORING.md      # Testing & monitoring setup
📄 PUSH_INSTRUCTIONS.md       # GitHub push guide
```

## 🎨 FRONTEND (Next.js 14 - Italian UI)
```
frontend/
├── 📁 app/                    # Next.js 14 App Router
│   ├── 📄 layout.tsx         # Root layout
│   ├── 📄 page.tsx           # Home page
│   ├── 📁 auth/              # Authentication pages
│   │   ├── 📄 login/
│   │   ├── 📄 register/
│   │   └── 📄 forgot-password/
│   ├── 📁 dashboard/         # User dashboard
│   │   ├── 📄 overview/
│   │   ├── 📄 podcasts/
│   │   ├── 📄 billing/
│   │   └── 📄 settings/
│   ├── 📁 create/            # Podcast creation wizard
│   │   ├── 📄 topic/
│   │   ├── 📄 script/
│   │   ├── 📄 voice/
│   │   └── 📄 publish/
│   └── 📁 api/               # API routes (if needed)
│
├── 📁 components/            # Reusable UI components
│   ├── 📁 ui/               # Basic components
│   │   ├── 📄 Button.tsx
│   │   ├── 📄 Card.tsx
│   │   ├── 📄 Input.tsx
│   │   └── 📄 Modal.tsx
│   ├── 📁 podcast/          # Podcast-specific components
│   │   ├── 📄 PodcastCard.tsx
│   │   ├── 📄 AudioPlayer.tsx
│   │   └── 📄 Waveform.tsx
│   └── 📁 layout/           # Layout components
│       ├── 📄 Header.tsx
│       ├── 📄 Sidebar.tsx
│       └── 📄 Footer.tsx
│
├── 📁 lib/                  # Utilities & libraries
│   ├── 📄 api.ts           # API client
│   ├── 📄 auth.ts          # Authentication
│   ├── 📄 i18n.ts          # Italian localization
│   └── 📄 utils.ts         # Helper functions
│
├── 📁 hooks/               # Custom React hooks
│   ├── 📄 usePodcast.ts
│   ├── 📄 useAudio.ts
│   └── 📄 useAuth.ts
│
├── 📁 stores/              # Zustand state management
│   ├── 📄 podcastStore.ts
│   ├── 📄 authStore.ts
│   └── 📄 uiStore.ts
│
├── 📁 styles/              # Tailwind CSS styles
│   ├── 📄 globals.css
│   └── 📄 tailwind.config.js
│
├── 📁 public/              # Static assets
│   ├── 📁 images/
│   ├── 📁 icons/
│   └── 📁 audio/
│
├── 📄 package.json         # Dependencies
├── 📄 next.config.js       # Next.js configuration
├── 📄 tsconfig.json        # TypeScript configuration
└── 📄 .eslintrc.json       # ESLint rules
```

## ⚙️ BACKEND (Node.js/Express API)
```
backend/
├── 📁 src/
│   ├── 📄 index.js         # Main server entry point
│   │
│   ├── 📁 routes/          # API routes
│   │   ├── 📄 auth.js      # Authentication
│   │   ├── 📄 podcasts.js  # Podcast management
│   │   ├── 📄 users.js     # User management
│   │   ├── 📄 billing.js   # Payment & billing
│   │   └── 📄 webhooks.js  # External webhooks
│   │
│   ├── 📁 controllers/     # Route controllers
│   │   ├── 📄 authController.js
│   │   ├── 📄 podcastController.js
│   │   └── 📄 userController.js
│   │
│   ├── 📁 services/        # Business logic
│   │   ├── 📄 WorkflowEngine.js    # Podcast creation workflow
│   │   ├── 📄 PaymentService.js    # Multi-payment system
│   │   ├── 📄 AIService.js         # AI integration
│   │   ├── 📄 AudioService.js      # Audio processing
│   │   └── 📄 EmailService.js      # Email notifications
│   │
│   ├── 📁 models/          # Database models
│   │   ├── 📄 User.js
│   │   ├── 📄 Podcast.js
│   │   ├── 📄 Episode.js
│   │   └── 📄 Payment.js
│   │
│   ├── 📁 middleware/      # Express middleware
│   │   ├── 📄 auth.js      # Authentication
│   │   ├── 📄 validation.js # Request validation
│   │   └── 📄 errorHandler.js
│   │
│   ├── 📁 utils/           # Utilities
│   │   ├── 📄 logger.js    # Logging
│   │   ├── 📄 validators.js # Validation helpers
│   │   └── 📄 constants.js  # Constants
│   │
│   └── 📁 config/          # Configuration
│       ├── 📄 database.js  # DB connection
│       ├── 📄 redis.js     # Redis connection
│       └── 📄 stripe.js    # Stripe setup
│
├── 📄 package.json         # Dependencies
├── 📄 Dockerfile           # Container configuration
├── 📄 .env.example         # Environment variables
└── 📄 ecosystem.config.js  # PM2 configuration
```

## 🤖 AI SERVICES (Python/FastAPI)
```
ai-services/
├── 📄 main.py              # FastAPI application
│
├── 📁 services/            # AI service implementations
│   ├── 📄 ai_service_manager.py    # Main orchestrator
│   ├── 📄 provider_router.py       # Cost-aware routing
│   ├── 📄 cost_tracker.py          # Usage tracking
│   │
│   ├── 📁 integrations/            # AI provider integrations
│   │   ├── 📄 openai_service.py    # OpenAI GPT
│   │   ├── 📄 elevenlabs_service.py # ElevenLabs TTS
│   │   ├── 📄 assemblyai_service.py # AssemblyAI transcription
│   │   ├── 📄 anthropic_service.py  # Anthropic Claude
│   │   └── 📄 google_ai_service.py  # Google AI
│   │
│   ├── 📁 italian/                 # Italian-specific processing
│   │   ├── 📄 language_processor.py
│   │   ├── 📄 accent_handler.py
│   │   └── 📄 cultural_references.py
│   │
│   └── 📁 audio/                   # Audio processing
│       ├── 📄 audio_editor.py
│       ├── 📄 voice_cloner.py
│       └── 📄 podcast_mixer.py
│
├── 📁 config/              # Configuration files
│   ├── 📄 providers.yaml   # AI provider configurations
│   └── 📄 italian_config.yaml # Italian market settings
│
├── 📁 models/              # Data models
│   ├── 📄 schemas.py       # Pydantic schemas
│   └── 📄 database.py      # Database models
│
├── 📁 utils/               # Utilities
│   ├── 📄 logger.py        # Logging
│   ├── 📄 cache.py         # Caching
│   └── 📄 metrics.py       # Performance metrics
│
├── 📄 requirements.txt     # Python dependencies
├── 📄 Dockerfile           # Container configuration
├── 📄 .env.example         # Environment variables
└── 📄 alembic/             # Database migrations (optional)
```

## 🗄️ DATABASE (PostgreSQL)
```
database/
├── 📄 init.sql             # Initial schema
├── 📁 migrations/          # Database migrations
│   ├── 📄 001_initial_schema.sql
│   ├── 📄 002_add_italian_features.sql
│   └── 📄 003_add_payment_tables.sql
│
├── 📁 seeds/               # Seed data
│   ├── 📄 italian_voices.sql
│   ├── 📄 pricing_tiers.sql
│   └── 📄 sample_podcasts.sql
│
└── 📁 queries/             # Common queries
    ├── 📄 analytics.sql
    ├── 📄 billing.sql
    └── 📄 user_stats.sql
```

## 🐳 DOCKER CONFIGURATION
```
docker/
├── 📄 Dockerfile.backend   # Backend container
├── 📄 Dockerfile.frontend  # Frontend container
├── 📄 Dockerfile.ai        # AI services container
├── 📄 docker-compose.dev.yml   # Development
├── 📄 docker-compose.staging.yml # Staging
├── 📄 docker-compose.prod.yml   # Production
└── 📁 nginx/               # Reverse proxy config
    ├── 📄 nginx.conf
    └── 📄 ssl/             # SSL certificates
```

## 📊 MONITORING & LOGGING
```
monitoring/
├── 📁 prometheus/          # Metrics collection
│   ├── 📄 prometheus.yml
│   └── 📁 rules/           # Alerting rules
│
├── 📁 grafana/             # Dashboards
│   ├── 📄 dashboards/
│   └── 📄 datasources/
│
├── 📁 loki/                # Log aggregation
│   └── 📄 loki-config.yaml
│
└── 📁 alerts/              # Alert configurations
    ├── 📄 email_alerts.yaml
    └── 📄 slack_alerts.yaml
```

## 🧪 TESTING
```
tests/
├── 📁 frontend/            # Frontend tests
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
├── 📁 backend/             # Backend tests
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 api/
│
├── 📁 ai-services/         # AI services tests
│   ├── 📁 unit/
│   └── 📁 integration/
│
└── 📁 performance/         # Performance tests
    ├── 📄 load_test.js
    └── 📄 stress_test.py
```

## 📚 DOCUMENTATION
```
docs/
├── 📁 api/                 # API documentation
│   ├── 📄 openapi.yaml    # OpenAPI spec
│   └── 📄 postman.json    # Postman collection
│
├── 📁 architecture/        # Architecture docs
│   ├── 📄 system_design.md
│   └── 📄 data_flow.md
│
├── 📁 user/               # User documentation
│   ├── 📄 getting_started.md
│   └── 📄 user_guide.md
│
├── 📁 developer/          # Developer docs
│   ├── 📄 setup.md
│   └── 📄 contributing.md
│
└── 📁 italian/            # Italian market docs
    ├── 📄 market_analysis.md
    └── 📄 localization.md
```

## 🔧 SCRIPTS & TOOLS
```
scripts/
├── 📄 setup.sh            # Initial setup script
├── 📄 deploy.sh           # Deployment script
├── 📄 backup.sh           # Database backup
├── 📄 migrate.sh          # Database migration
├── 📄 seed.sh            # Seed data
└── 📄 health_check.sh    # System health check
```

## 🚀 DEPLOYMENT CONFIGURATIONS
```
k8s/                       # Kubernetes configurations
├── 📁 namespaces/
├── 📁 deployments/
├── 📁 services/
├── 📁 ingress/
├── 📁 configmaps/
└── 📁 secrets/

terraform/                 # Infrastructure as Code
├── 📁 aws/
├── 📁 gcp/
└── 📁 azure/
```

## 📦 ASSET STRUCTURE
```
assets/
├── 📁 audio/              # Audio assets
│   ├── 📁 templates/      # Podcast templates
│   ├── 📁 music/          # Background music
│   └── 📁 effects/        # Sound effects
│
├── 📁 images/             # Image assets
│   ├── 📁 logos/
│   ├── 📁 icons/
│   └── 📁 illustrations/
│
├── 📁 fonts/              # Fonts (Italian typography)
│   ├── 📁 regular/
│   └── 📁 italic/
│
└── 📁 voices/             # Voice profiles
    ├── 📁 italian_male/
    ├── 📁 italian_female/
    └── 📁 regional/
```

## 🔐 SECURITY
```
security/
├── 📄 audit.log           # Security audit log
├── 📁 policies/           # Security policies
│   ├── 📄 access_control.md
│   └── 📄 data_protection.md
│
└── 📁 certificates/       # SSL certificates
    ├── 📄 ssl.crt
    └── 📄 ssl.key
```

## 🇮🇹 ITALIAN MARKET SPECIFIC
```
italian-market/
├── 📁 localization/       # Italian translations
│   ├── 📄 it.json
│   └── 📄 regional_dialects/
│
├── 📁 cultural/           # Cultural references
│   ├── 📄 holidays.json
│   ├── 📄 idioms.json
│   └── 📄 references.json
│
├── 📁 legal/              # Italian legal compliance
│   ├── 📄 gdpr_compliance.md
│   └── 📄 privacy_policy_it.md
│
└── 📁 payments/           # Italian payment methods
    ├── 📄 satispay_integration.md
    └── 📄 bank_transfer_it.md
```

---

## 📊 SUMMARY BY TECHNOLOGY

### **Frontend (Next.js 14)**
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand + React Query
- **Internationalization**: React Intl (Italian focus)

### **Backend (Node.js)**
- **Framework**: Express.js
- **Language**: JavaScript/Node.js
- **Database**: PostgreSQL with Prisma/Sequelize
- **Authentication**: JWT + OAuth
- **Real-time**: Socket.io

### **AI Services (Python)**
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **AI Integration**: Multiple providers
- **Audio Processing**: FFmpeg, librosa
- **Cost Tracking**: Custom cost router

### **Infrastructure**
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (optional)
- **Database**: PostgreSQL
- **Cache**: Redis
- **Storage**: S3/R2 for audio files

### **Monitoring**
- **Metrics**: Prometheus
- **Logging**: Loki + Grafana
- **Error Tracking**: Sentry
- **APM**: OpenTelemetry

---

This structure is designed for **scalability, maintainability, and Italian market focus**. Each service is independently deployable and follows modern best practices.