#!/usr/bin/env python3
"""
AI Services for Podcast Orchestration Platform
Italian Market Focus
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn

from config import settings
from database import init_db, close_db
from middleware import LoggingMiddleware, RateLimitMiddleware
from routers import (
    ai_services,
    tts_services,
    audio_services,
    transcription_services,
    italian_services,
    health
)
from utils.logger import setup_logging
from utils.monitoring import setup_metrics, setup_sentry

# Setup logging
logger = setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    logger.info("Starting AI Services...")
    
    # Initialize database
    await init_db()
    logger.info("Database initialized")
    
    # Initialize monitoring
    if settings.SENTRY_DSN:
        setup_sentry(settings.SENTRY_DSN)
        logger.info("Sentry initialized")
    
    setup_metrics()
    logger.info("Metrics initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Services...")
    await close_db()
    logger.info("Database connections closed")

# Create FastAPI app
app = FastAPI(
    title="AI Podcast Services API",
    description="AI services for Italian podcast creation and processing",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(ai_services.router, prefix="/ai", tags=["ai-services"])
app.include_router(tts_services.router, prefix="/tts", tags=["tts-services"])
app.include_router(audio_services.router, prefix="/audio", tags=["audio-services"])
app.include_router(transcription_services.router, prefix="/transcription", tags=["transcription"])
app.include_router(italian_services.router, prefix="/italian", tags=["italian-services"])

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "AI Podcast Services",
        "version": "1.0.0",
        "description": "AI services for Italian podcast creation",
        "documentation": "/docs" if settings.DEBUG else None,
        "endpoints": {
            "ai_services": "/ai",
            "tts_services": "/tts",
            "audio_services": "/audio",
            "transcription": "/transcription",
            "italian_services": "/italian",
            "health": "/health"
        }
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP error: {exc.status_code} - {exc.detail}")
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions"""
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return {
        "error": "Internal server error",
        "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
        access_log=False
    )