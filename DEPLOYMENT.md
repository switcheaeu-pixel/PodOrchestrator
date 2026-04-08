# Deployment Guide - Podcast AI Platform

This guide covers deployment options for the Podcast AI Platform, from local development to production.

## Table of Contents
1. [Local Development](#local-development)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [Cloud Providers](#cloud-providers)
5. [Scaling Considerations](#scaling-considerations)
6. [Monitoring & Maintenance](#monitoring--maintenance)

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+
- Redis 7+
- Docker (optional)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/podcast-ai-platform.git
cd podcast-ai-platform

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your API keys and configuration

# 3. Start services with Docker Compose (recommended)
docker-compose up -d

# 4. Or start services manually:

# Start PostgreSQL
sudo service postgresql start

# Start Redis
redis-server

# Install backend dependencies
cd backend
npm install

# Install AI services dependencies
cd ../ai-services
pip install -r requirements.txt

# Initialize database
cd ../backend
npm run db:migrate

# Start backend server
npm run dev

# Start AI services (in another terminal)
cd ../ai-services
python main.py

# Start frontend (in another terminal)
cd ../frontend
npm install
npm run dev
```

### Development URLs
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- AI Services: http://localhost:8000
- API Documentation: http://localhost:3001/api-docs
- Database: localhost:5432
- Redis: localhost:6379

## Docker Deployment

### Production Docker Compose

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3 --scale ai-services=2
```

### Building Custom Images

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build backend

# Push to registry
docker tag podcast-ai-platform_backend yourregistry/podcast-backend:latest
docker push yourregistry/podcast-backend:latest
```

### Docker Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  backend:
    image: yourregistry/podcast-backend:${TAG:-latest}
    environment:
      NODE_ENV: production
      # ... other environment variables
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
      restart_policy:
        condition: on-failure
        max_attempts: 3
      update_config:
        parallelism: 1
        delay: 10s

  # ... other services
```

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm (optional)

### Basic Kubernetes Deployment

```bash
# Apply all Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n podcast-ai

# View logs
kubectl logs -f deployment/backend -n podcast-ai

# Scale deployments
kubectl scale deployment backend --replicas=5 -n podcast-ai
```

### Kubernetes Manifests Structure

```
k8s/
├── namespace.yaml
├── config/
│   ├── configmap.yaml
│   └── secrets.yaml
├── storage/
│   ├── postgres-pvc.yaml
│   └── redis-pvc.yaml
├── deployments/
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── backend.yaml
│   ├── ai-services.yaml
│   └── frontend.yaml
├── services/
│   ├── postgres-service.yaml
│   ├── redis-service.yaml
│   ├── backend-service.yaml
│   ├── ai-services-service.yaml
│   └── frontend-service.yaml
├── ingress/
│   └── ingress.yaml
└── monitoring/
    ├── prometheus.yaml
    └── grafana.yaml
```

### Example Backend Deployment

```yaml
# k8s/deployments/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: podcast-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: yourregistry/podcast-backend:latest
        ports:
        - containerPort: 3001
        envFrom:
        - configMapRef:
            name: podcast-config
        - secretRef:
            name: podcast-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Using Helm

```bash
# Create Helm chart
helm create podcast-ai

# Install with Helm
helm install podcast-ai ./podcast-ai \
  --namespace podcast-ai \
  --set image.tag=latest \
  --set replicaCount=3

# Upgrade deployment
helm upgrade podcast-ai ./podcast-ai \
  --set image.tag=v1.1.0

# Uninstall
helm uninstall podcast-ai -n podcast-ai
```

## Cloud Providers

### AWS Deployment

```bash
# Using EKS
eksctl create cluster \
  --name podcast-ai-cluster \
  --region eu-south-1 \
  --node-type t3.medium \
  --nodes 3

# Deploy to EKS
kubectl apply -f k8s/

# Using ECS
# Create ECS cluster and task definitions
```

### Google Cloud (GCP)

```bash
# Create GKE cluster
gcloud container clusters create podcast-ai-cluster \
  --zone europe-west1-b \
  --num-nodes=3 \
  --machine-type=e2-medium

# Deploy to GKE
kubectl apply -f k8s/
```

### Azure

```bash
# Create AKS cluster
az aks create \
  --resource-group podcast-ai-rg \
  --name podcast-ai-cluster \
  --node-count 3 \
  --node-vm-size Standard_B2s

# Deploy to AKS
kubectl apply -f k8s/
```

## Scaling Considerations

### Horizontal Scaling

```yaml
# Auto-scaling configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: podcast-ai
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Database Scaling

```sql
-- PostgreSQL performance tuning
ALTER SYSTEM SET shared_buffers = '2GB';
ALTER SYSTEM SET effective_cache_size = '6GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '512MB';
ALTER SYSTEM SET max_connections = 200;

-- Create read replicas for scaling
-- Use connection pooling (PgBouncer)
```

### Redis Scaling

```bash
# Redis Cluster for horizontal scaling
redis-cli --cluster create \
  node1:6379 node2:6379 node3:6379 \
  node4:6379 node5:6379 node6:6379 \
  --cluster-replicas 1
```

## Monitoring & Maintenance

### Monitoring Stack

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Access dashboards
kubectl port-forward svc/grafana 3000:3000 -n monitoring
# Grafana: http://localhost:3000 (admin/admin)

kubectl port-forward svc/prometheus 9090:9090 -n monitoring
# Prometheus: http://localhost:9090
```

### Key Metrics to Monitor

1. **API Performance**
   - Request latency (p95, p99)
   - Error rates (4xx, 5xx)
   - Request rate per endpoint

2. **AI Service Costs**
   - API usage per service
   - Cost per podcast
   - User credit consumption

3. **Resource Usage**
   - CPU/Memory per service
   - Database connection pool
   - Redis memory usage

4. **Business Metrics**
   - Podcasts created per day
   - User conversion rates
   - Revenue per user

### Logging

```bash
# Centralized logging with ELK/Loki
# Using Loki
helm install loki grafana/loki-stack \
  --namespace monitoring \
  --set promtail.enabled=true

# Query logs
kubectl logs -l app=backend --tail=100 -n podcast-ai

# Structured logging example
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "service": "backend",
  "user_id": "user_123",
  "podcast_id": "podcast_456",
  "action": "podcast_created",
  "duration_ms": 2450,
  "cost": 2.34
}
```

### Backup Strategy

```bash
# Database backups
pg_dump -U podcast_user -d podcast_ai > backup_$(date +%Y%m%d).sql

# S3 backups
aws s3 sync /backups s3://podcast-ai-backups/

# Automated backup cron job
0 2 * * * /usr/local/bin/backup-database.sh
```

### Security Considerations

1. **Network Security**
   ```yaml
   # Network policies
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: backend-policy
   spec:
     podSelector:
       matchLabels:
         app: backend
     ingress:
     - from:
       - podSelector:
           matchLabels:
             app: frontend
       ports:
       - protocol: TCP
         port: 3001
   ```

2. **Secret Management**
   ```bash
   # Use Kubernetes secrets
   kubectl create secret generic podcast-secrets \
     --from-literal=jwt-secret=${JWT_SECRET} \
     --from-literal=openai-api-key=${OPENAI_API_KEY}
   
   # Or use external secret manager
   # AWS Secrets Manager, HashiCorp Vault, etc.
   ```

3. **SSL/TLS Configuration**
   ```yaml
   # Ingress with TLS
   apiVersion: networking.k8s.io/v1
   kind: Ingress
   metadata:
     name: podcast-ingress
     annotations:
       cert-manager.io/cluster-issuer: "letsencrypt-prod"
   spec:
     tls:
     - hosts:
       - podcastai.example.com
       secretName: podcast-tls
     rules:
     - host: podcastai.example.com
       http:
         paths:
         - path: /
           pathType: Prefix
           backend:
             service:
               name: frontend
               port:
                 number: 3000
   ```

### Disaster Recovery

1. **Database Recovery**
   ```bash
   # Restore from backup
   psql -U podcast_user -d podcast_ai < backup_20240115.sql
   
   # Point-in-time recovery
   PITR_ENABLED=true
   ```

2. **Infrastructure as Code**
   ```terraform
   # Terraform configuration for quick recovery
   resource "aws_rds_cluster" "postgres" {
     cluster_identifier = "podcast-ai-db"
     engine = "aurora-postgresql"
     backup_retention_period = 35
     preferred_backup_window = "07:00-09:00"
   }
   ```

### Cost Optimization

1. **AI Service Costs**
   - Implement caching for common requests
   - Use cheaper models for drafts
   - Implement usage quotas per user tier
   - Monitor and alert on cost spikes

2. **Infrastructure Costs**
   - Use spot instances for non-critical workloads
   - Implement auto-scaling
   - Use reserved instances for stable workloads
   - Monitor and clean up unused resources

### Performance Tuning

```javascript
// Backend optimizations
// 1. Database connection pooling
const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 2. Redis caching
app.use(cache({
  store: redisStore,
  ttl: 300, // 5 minutes
  prefix: 'podcast:'
}));

// 3. Request compression
app.use(compression());

// 4. Response caching
app.get('/api/podcasts/:id', cacheMiddleware(300), getPodcast);
```

## Continuous Deployment

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          cd backend && npm test
          cd ../ai-services && pytest

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push Docker images
        run: |
          docker build -t ${{ secrets.REGISTRY }}/backend:${{ github.sha }} ./backend
          docker push ${{ secrets.REGISTRY }}/backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/backend \
            backend=${{ secrets.REGISTRY }}/backend:${{ github.sha }} \
            -n podcast-ai
```

## Support & Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check database status
   kubectl exec -it postgres-pod -- psql -U podcast_user -d podcast_ai
   
   # Check connection pool
   SELECT * FROM pg_stat_activity;
   ```

2. **Redis Memory Issues**
   ```bash
   # Check Redis memory
   redis-cli info memory
   
   # Clear cache if needed
   redis-cli FLUSHALL
   ```

3. **AI Service Rate Limiting**
   ```javascript
   // Implement exponential backoff
   async function callWithRetry(apiCall, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await apiCall();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await sleep(Math.pow(2, i) * 1000);
           continue;
         }
         throw error;
       }
     }
   }
   ```

### Getting Help

- Check logs: `kubectl logs -f deployment/backend`
- Monitor metrics: Grafana dashboards
- API documentation: `/api-docs` endpoint
- GitHub Issues: Report bugs and feature requests

## Conclusion

This deployment guide provides multiple options for deploying the Podcast AI Platform. Start with Docker Compose for development and testing, then move to Kubernetes for production deployments. Remember to:

1. Secure all API keys and secrets
2. Implement proper monitoring and alerting
3. Set up automated backups
4. Plan for scaling as user base grows
5. Regularly update dependencies and security patches

For production deployments, consider using a managed Kubernetes service (EKS, GKE, AKS) and implement all security best practices.