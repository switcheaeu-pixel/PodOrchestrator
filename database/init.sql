-- Database initialization script for Podcast AI Platform
-- Italian Market Focus

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'creator', 'pro', 'business', 'admin')),
    language_preference VARCHAR(10) DEFAULT 'it',
    monthly_credit DECIMAL(10,2) DEFAULT 0,
    credit_limit DECIMAL(10,2) DEFAULT 5.00, -- Default €5 for free tier
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    reset_token VARCHAR(100),
    reset_token_expires TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Podcasts table
CREATE TABLE podcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    topic VARCHAR(200),
    style VARCHAR(50) DEFAULT 'conversational' CHECK (style IN ('conversational', 'educational', 'interview', 'storytelling', 'news')),
    target_duration INTEGER DEFAULT 30, -- in minutes
    actual_duration INTEGER, -- in seconds
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'published', 'failed', 'deleted')),
    workflow_id VARCHAR(100),
    cost DECIMAL(10,4) DEFAULT 0,
    audio_url TEXT,
    audio_format VARCHAR(10) DEFAULT 'mp3',
    audio_size INTEGER, -- in bytes
    transcript_url TEXT,
    show_notes TEXT,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    published_at TIMESTAMP
);

-- Workflow steps table
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    step_order INTEGER NOT NULL,
    service_used VARCHAR(50),
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
    error_message TEXT,
    cost DECIMAL(10,4) DEFAULT 0,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    podcast_id UUID REFERENCES podcasts(id) ON DELETE SET NULL,
    service VARCHAR(50) NOT NULL,
    endpoint VARCHAR(100),
    input_tokens INTEGER,
    output_tokens INTEGER,
    characters INTEGER,
    duration_seconds INTEGER,
    cost DECIMAL(10,4) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Italian voice profiles
CREATE TABLE italian_voice_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) CHECK (provider IN ('elevenlabs', 'google', 'amazon', 'custom')),
    voice_id VARCHAR(100),
    accent VARCHAR(50) DEFAULT 'standard' CHECK (accent IN ('standard', 'northern', 'central', 'southern', 'tuscan')),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'neutral')),
    language_code VARCHAR(10) DEFAULT 'it-IT',
    sample_audio_url TEXT,
    is_cloned BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Podcast templates (for Italian market)
CREATE TABLE podcast_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('business', 'education', 'entertainment', 'news', 'technology', 'lifestyle')),
    style VARCHAR(50) DEFAULT 'conversational',
    language VARCHAR(10) DEFAULT 'it',
    template_json JSONB NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Billing and subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    due_date TIMESTAMP,
    paid_at TIMESTAMP,
    invoice_pdf_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Italian content cache (for performance)
CREATE TABLE italian_content_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    language VARCHAR(10) DEFAULT 'it',
    content JSONB NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics
CREATE TABLE podcast_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    podcast_id UUID REFERENCES podcasts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    listens INTEGER DEFAULT 0,
    unique_listeners INTEGER DEFAULT 0,
    average_listen_duration INTEGER DEFAULT 0, -- in seconds
    completion_rate DECIMAL(5,2) DEFAULT 0, -- percentage
    geographic_data JSONB DEFAULT '{}',
    device_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(podcast_id, date)
);

-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    default_voice_id UUID REFERENCES italian_voice_profiles(id) ON DELETE SET NULL,
    default_style VARCHAR(50) DEFAULT 'conversational',
    default_duration INTEGER DEFAULT 30,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "workflow_updates": true}',
    ui_preferences JSONB DEFAULT '{"language": "it", "theme": "light"}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(tier);
CREATE INDEX idx_podcasts_user_id ON podcasts(user_id);
CREATE INDEX idx_podcasts_status ON podcasts(status);
CREATE INDEX idx_podcasts_created_at ON podcasts(created_at);
CREATE INDEX idx_workflow_steps_podcast_id ON workflow_steps(podcast_id);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_italian_voice_profiles_user_id ON italian_voice_profiles(user_id);
CREATE INDEX idx_italian_content_cache_content_hash ON italian_content_cache(content_hash);
CREATE INDEX idx_italian_content_cache_expires_at ON italian_content_cache(expires_at);
CREATE INDEX idx_podcast_analytics_podcast_id_date ON podcast_analytics(podcast_id, date);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_podcasts_updated_at BEFORE UPDATE ON podcasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_italian_voice_profiles_updated_at BEFORE UPDATE ON italian_voice_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user's current month usage
CREATE OR REPLACE FUNCTION get_user_monthly_usage(user_uuid UUID)
RETURNS DECIMAL(10,4) AS $$
DECLARE
    total_cost DECIMAL(10,4);
BEGIN
    SELECT COALESCE(SUM(cost), 0) INTO total_cost
    FROM api_usage
    WHERE user_id = user_uuid
      AND timestamp >= date_trunc('month', CURRENT_DATE);
    
    RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can create podcast
CREATE OR REPLACE FUNCTION can_user_create_podcast(user_uuid UUID, estimated_cost DECIMAL)
RETURNS TABLE(can_create BOOLEAN, reason TEXT) AS $$
DECLARE
    user_tier VARCHAR(20);
    user_credit_limit DECIMAL(10,2);
    current_usage DECIMAL(10,4);
BEGIN
    -- Get user tier and credit limit
    SELECT tier, credit_limit INTO user_tier, user_credit_limit
    FROM users WHERE id = user_uuid;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'User not found';
        RETURN;
    END IF;
    
    -- Get current month usage
    current_usage := get_user_monthly_usage(user_uuid);
    
    -- Check if adding estimated cost would exceed limit
    IF current_usage + estimated_cost > user_credit_limit THEN
        RETURN QUERY SELECT FALSE, 'Credit limit exceeded';
    ELSE
        RETURN QUERY SELECT TRUE, 'OK';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Initial data (optional)
INSERT INTO podcast_templates (name, description, category, style, language, template_json, is_public) VALUES
(
    'Intervista Business Italiana',
    'Template per interviste business in italiano',
    'business',
    'interview',
    'it',
    '{
        "structure": ["introduzione", "presentazione_ospite", "domande_tecniche", "domande_personali", "conclusioni"],
        "default_duration": 45,
        "suggested_voices": ["italian_male_business", "italian_female_professional"],
        "prompt_template": "Crea un''intervista con {nome_ospite} su {argomento}..."
    }'::jsonb,
    TRUE
),
(
    'Podcast Educativo',
    'Template per contenuti educativi in italiano',
    'education',
    'educational',
    'it',
    '{
        "structure": ["introduzione_argomento", "teoria", "esempi_pratici", "esercizi", "riepilogo"],
        "default_duration": 30,
        "suggested_voices": ["italian_male_teacher", "italian_female_teacher"],
        "prompt_template": "Spiega {argomento} in modo chiaro e didattico..."
    }'::jsonb,
    TRUE
);

-- Create admin user (password: admin123 - change in production!)
INSERT INTO users (email, username, password_hash, tier, language_preference, monthly_credit, credit_limit, is_active, email_verified)
VALUES (
    'admin@podcastai.it',
    'admin',
    -- bcrypt hash for 'admin123'
    '$2a$12$Y3Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q5Q',
    'admin',
    'it',
    1000.00,
    1000.00,
    TRUE,
    TRUE
);

COMMENT ON TABLE users IS 'Platform users with tier-based access';
COMMENT ON TABLE podcasts IS 'Podcast projects created by users';
COMMENT ON TABLE workflow_steps IS 'Individual steps in podcast creation workflow';
COMMENT ON TABLE api_usage IS 'Detailed tracking of API usage for billing';
COMMENT ON TABLE italian_voice_profiles IS 'Italian voice configurations for TTS';
COMMENT ON TABLE podcast_templates IS 'Pre-defined templates for Italian podcasts';
COMMENT ON TABLE italian_content_cache IS 'Cache for Italian language content to reduce API calls';