#!/bin/bash

# Podcast AI Platform Setup Script
# Italian Market Focus

set -e

echo "🎙️  Setting up Podcast AI Platform..."
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓ Docker is installed${NC}"
    else
        echo -e "${RED}✗ Docker is not installed${NC}"
        echo "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose is installed${NC}"
    else
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
        echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        if (( $(echo "$NODE_VERSION >= 18.0" | bc -l) )); then
            echo -e "${GREEN}✓ Node.js $NODE_VERSION is installed${NC}"
        else
            echo -e "${RED}✗ Node.js version must be >= 18.0${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ Node.js is not installed (optional for development)${NC}"
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        if (( $(echo "$PYTHON_VERSION >= 3.9" | bc -l) )); then
            echo -e "${GREEN}✓ Python $PYTHON_VERSION is installed${NC}"
        else
            echo -e "${RED}✗ Python version must be >= 3.9${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}⚠ Python 3 is not installed (optional for development)${NC}"
    fi
}

# Setup environment
setup_environment() {
    echo -e "\n⚙️  Setting up environment..."
    
    # Check if .env exists
    if [ -f .env ]; then
        echo -e "${YELLOW}⚠ .env file already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.example .env
            echo -e "${GREEN}✓ Created new .env file${NC}"
        else
            echo -e "${YELLOW}⚠ Keeping existing .env file${NC}"
        fi
    else
        cp .env.example .env
        echo -e "${GREEN}✓ Created .env file${NC}"
    fi
    
    # Prompt for API keys
    echo -e "\n🔑 Please configure your API keys in the .env file:"
    echo -e "${YELLOW}Important: Edit .env and add your API keys before continuing${NC}"
    echo "Required API keys:"
    echo "  - OPENAI_API_KEY"
    echo "  - ELEVENLABS_API_KEY"
    echo "  - ASSEMBLYAI_API_KEY"
    echo ""
    read -p "Press Enter when you have updated the .env file..."
}

# Build and start services
start_services() {
    echo -e "\n🚀 Starting services with Docker Compose..."
    
    # Build images
    echo "Building Docker images..."
    docker-compose build
    
    # Start services
    echo "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check service status
    echo -e "\n📊 Service status:"
    docker-compose ps
}

# Initialize database
initialize_database() {
    echo -e "\n🗄️  Initializing database..."
    
    # Wait for PostgreSQL to be ready
    echo "Waiting for PostgreSQL..."
    until docker-compose exec -T postgres pg_isready -U podcast_user; do
        sleep 2
    done
    
    # Run database migrations
    echo "Running database migrations..."
    docker-compose exec backend npm run db:migrate
    
    # Seed database if needed
    if [ "$SEED_DATABASE" = "true" ]; then
        echo "Seeding database..."
        docker-compose exec backend npm run db:seed
    fi
    
    echo -e "${GREEN}✓ Database initialized${NC}"
}

# Setup complete
setup_complete() {
    echo -e "\n🎉 Setup complete!"
    echo "======================================"
    echo -e "${GREEN}Podcast AI Platform is now running!${NC}"
    echo ""
    echo "📱 Access the application:"
    echo "  Frontend:    http://localhost:3000"
    echo "  Backend API: http://localhost:3001"
    echo "  API Docs:    http://localhost:3001/api-docs"
    echo "  AI Services: http://localhost:8000"
    echo ""
    echo "🔧 Useful commands:"
    echo "  View logs:              docker-compose logs -f"
    echo "  Stop services:          docker-compose down"
    echo "  Restart services:       docker-compose restart"
    echo "  Rebuild and restart:    docker-compose up -d --build"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Register a user at http://localhost:3000/register"
    echo "  2. Create your first Italian podcast"
    echo "  3. Check the API documentation for integration options"
    echo ""
    echo "🇮🇹 Benvenuto nel Podcast AI Platform per il mercato italiano!"
}

# Development setup
development_setup() {
    echo -e "\n💻 Setting up for development..."
    
    # Install backend dependencies
    if [ -d "backend" ]; then
        echo "Installing backend dependencies..."
        cd backend
        npm install
        cd ..
    fi
    
    # Install frontend dependencies
    if [ -d "frontend" ]; then
        echo "Installing frontend dependencies..."
        cd frontend
        npm install
        cd ..
    fi
    
    # Install AI services dependencies
    if [ -d "ai-services" ]; then
        echo "Installing AI services dependencies..."
        cd ai-services
        pip install -r requirements.txt
        cd ..
    fi
    
    echo -e "${GREEN}✓ Development dependencies installed${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  Podcast AI Platform Setup${NC}"
    echo -e "${GREEN}  Italian Market Focus${NC}"
    echo -e "${GREEN}======================================${NC}"
    
    # Parse arguments
    SEED_DATABASE="false"
    DEV_MODE="false"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --seed)
                SEED_DATABASE="true"
                shift
                ;;
            --dev)
                DEV_MODE="true"
                shift
                ;;
            --help)
                echo "Usage: ./setup.sh [options]"
                echo ""
                echo "Options:"
                echo "  --seed     Seed database with sample data"
                echo "  --dev      Install development dependencies"
                echo "  --help     Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run setup steps
    check_prerequisites
    setup_environment
    
    if [ "$DEV_MODE" = "true" ]; then
        development_setup
    fi
    
    start_services
    initialize_database
    setup_complete
}

# Run main function
main "$@"