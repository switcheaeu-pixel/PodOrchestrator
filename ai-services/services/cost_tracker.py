"""
Unified Cost Tracker for AI API Usage
"""

import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
from dataclasses import dataclass
import json

from database import get_db
from utils.cache import cache
from config import settings

logger = logging.getLogger(__name__)

@dataclass
class CostRecord:
    """Record of AI service usage cost"""
    user_id: str
    service: str
    provider: str
    task: str
    cost: Decimal
    usage_data: Dict[str, Any]
    timestamp: datetime
    podcast_id: Optional[str] = None

class CostTracker:
    """Tracks and manages AI service costs"""
    
    def __init__(self):
        self.db = get_db()
        self.cache = cache
        
    async def track_usage(
        self,
        user_id: str,
        service: str,
        provider: str,
        task: str,
        cost: Decimal,
        usage_data: Dict[str, Any],
        podcast_id: Optional[str] = None
    ) -> CostRecord:
        """Track AI service usage and cost"""
        
        record = CostRecord(
            user_id=user_id,
            service=service,
            provider=provider,
            task=task,
            cost=cost,
            usage_data=usage_data,
            timestamp=datetime.now(),
            podcast_id=podcast_id
        )
        
        # Store in database
        await self._store_record(record)
        
        # Update cache for real-time tracking
        await self._update_cache(record)
        
        # Check if user is approaching limits
        await self._check_user_limits(user_id)
        
        logger.info(f"Tracked {service} usage: €{cost:.4f} for user {user_id}")
        return record
    
    async def _store_record(self, record: CostRecord):
        """Store cost record in database"""
        async with self.db.acquire() as conn:
            await conn.execute("""
                INSERT INTO api_usage 
                (user_id, service, provider, task, cost, usage_data, podcast_id, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, 
            record.user_id,
            record.service,
            record.provider,
            record.task,
            float(record.cost),
            json.dumps(record.usage_data),
            record.podcast_id,
            record.timestamp
            )
    
    async def _update_cache(self, record: CostRecord):
        """Update cache with current usage"""
        cache_key = f"user:{record.user_id}:usage"
        
        # Get current usage from cache
        current_usage = await self.cache.get(cache_key)
        if current_usage:
            usage = json.loads(current_usage)
        else:
            usage = {
                'daily_cost': 0,
                'monthly_cost': 0,
                'service_breakdown': {},
                'last_updated': datetime.now().isoformat()
            }
        
        # Update usage
        usage['daily_cost'] += float(record.cost)
        usage['monthly_cost'] += float(record.cost)
        
        # Update service breakdown
        service_key = f"{record.service}:{record.provider}"
        if service_key not in usage['service_breakdown']:
            usage['service_breakdown'][service_key] = {
                'count': 0,
                'total_cost': 0
            }
        usage['service_breakdown'][service_key]['count'] += 1
        usage['service_breakdown'][service_key]['total_cost'] += float(record.cost)
        
        usage['last_updated'] = datetime.now().isoformat()
        
        # Store back in cache
        await self.cache.set(cache_key, json.dumps(usage), expire=86400)  # 24 hours
    
    async def _check_user_limits(self, user_id: str):
        """Check if user is approaching credit limits"""
        monthly_usage = await self.get_user_monthly_usage(user_id)
        user_tier = await self._get_user_tier(user_id)
        
        tier_limits = {
            'free': Decimal('5.00'),
            'creator': Decimal('50.00'),
            'pro': Decimal('200.00'),
            'business': Decimal('1000.00')
        }
        
        limit = tier_limits.get(user_tier, Decimal('5.00'))
        
        # Check if usage exceeds 80% of limit
        if monthly_usage > limit * Decimal('0.8'):
            await self._send_limit_warning(user_id, monthly_usage, limit)
        
        # Check if usage exceeds limit
        if monthly_usage > limit:
            await self._handle_limit_exceeded(user_id, monthly_usage, limit)
    
    async def get_user_monthly_usage(self, user_id: str) -> Decimal:
        """Get user's monthly usage cost"""
        start_of_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT SUM(cost) as total_cost
                FROM api_usage
                WHERE user_id = $1
                  AND timestamp >= $2
            """, user_id, start_of_month)
            
            return Decimal(str(row['total_cost'])) if row['total_cost'] else Decimal('0')
    
    async def get_user_daily_usage(self, user_id: str) -> Decimal:
        """Get user's daily usage cost"""
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT SUM(cost) as total_cost
                FROM api_usage
                WHERE user_id = $1
                  AND timestamp >= $2
            """, user_id, start_of_day)
            
            return Decimal(str(row['total_cost'])) if row['total_cost'] else Decimal('0')
    
    async def get_podcast_cost(self, podcast_id: str) -> Decimal:
        """Get total cost for a podcast"""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT SUM(cost) as total_cost
                FROM api_usage
                WHERE podcast_id = $1
            """, podcast_id)
            
            return Decimal(str(row['total_cost'])) if row['total_cost'] else Decimal('0')
    
    async def get_cost_breakdown(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get detailed cost breakdown for a user"""
        
        if not start_date:
            start_date = datetime.now().replace(day=1)  # Start of month
        if not end_date:
            end_date = datetime.now()
        
        async with self.db.acquire() as conn:
            # Get service breakdown
            rows = await conn.fetch("""
                SELECT 
                    service,
                    provider,
                    COUNT(*) as request_count,
                    SUM(cost) as total_cost,
                    AVG(cost) as avg_cost
                FROM api_usage
                WHERE user_id = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                GROUP BY service, provider
                ORDER BY total_cost DESC
            """, user_id, start_date, end_date)
            
            # Get daily trend
            daily_trend = await conn.fetch("""
                SELECT 
                    DATE(timestamp) as date,
                    SUM(cost) as daily_cost,
                    COUNT(*) as daily_requests
                FROM api_usage
                WHERE user_id = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
                GROUP BY DATE(timestamp)
                ORDER BY date
            """, user_id, start_date, end_date)
            
            # Get total cost
            total_row = await conn.fetchrow("""
                SELECT SUM(cost) as total_cost, COUNT(*) as total_requests
                FROM api_usage
                WHERE user_id = $1
                  AND timestamp >= $2
                  AND timestamp <= $3
            """, user_id, start_date, end_date)
            
            return {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'total': {
                    'cost': float(total_row['total_cost']) if total_row['total_cost'] else 0,
                    'requests': total_row['total_requests'] or 0
                },
                'breakdown': [
                    {
                        'service': row['service'],
                        'provider': row['provider'],
                        'request_count': row['request_count'],
                        'total_cost': float(row['total_cost']),
                        'avg_cost': float(row['avg_cost'])
                    }
                    for row in rows
                ],
                'daily_trend': [
                    {
                        'date': row['date'].isoformat(),
                        'cost': float(row['daily_cost']),
                        'requests': row['daily_requests']
                    }
                    for row in daily_trend
                ]
            }
    
    async def estimate_podcast_cost(
        self,
        duration: int,
        style: str = 'conversational',
        language: str = 'it',
        voice_quality: str = 'standard'
    ) -> Decimal:
        """Estimate cost for creating a podcast"""
        
        # Base estimation based on duration and style
        base_cost_per_minute = Decimal('0.05')
        
        # Adjust for style
        style_multipliers = {
            'conversational': Decimal('1.0'),
            'educational': Decimal('1.2'),
            'interview': Decimal('1.1'),
            'storytelling': Decimal('1.3'),
            'news': Decimal('1.0')
        }
        
        # Adjust for language (Italian might be slightly more expensive)
        language_multipliers = {
            'it': Decimal('1.1'),
            'en': Decimal('1.0'),
            'es': Decimal('1.05'),
            'fr': Decimal('1.05'),
            'de': Decimal('1.05')
        }
        
        # Adjust for voice quality
        voice_multipliers = {
            'basic': Decimal('0.8'),
            'standard': Decimal('1.0'),
            'premium': Decimal('1.5'),
            'cloned': Decimal('2.0')
        }
        
        multiplier = (
            style_multipliers.get(style, Decimal('1.0')) *
            language_multipliers.get(language, Decimal('1.0')) *
            voice_multipliers.get(voice_quality, Decimal('1.0'))
        )
        
        estimated_cost = base_cost_per_minute * Decimal(str(duration)) * multiplier
        
        # Add fixed costs
        estimated_cost += Decimal('0.10')  # Transcription
        estimated_cost += Decimal('0.05')  # Show notes
        estimated_cost += Decimal('0.05')  # Marketing assets
        
        return estimated_cost
    
    async def can_user_create_podcast(
        self,
        user_id: str,
        estimated_cost: Decimal
    ) -> Dict[str, Any]:
        """Check if user can create a podcast based on credits"""
        
        monthly_usage = await self.get_user_monthly_usage(user_id)
        user_tier = await self._get_user_tier(user_id)
        
        tier_limits = {
            'free': Decimal('5.00'),
            'creator': Decimal('50.00'),
            'pro': Decimal('200.00'),
            'business': Decimal('1000.00')
        }
        
        limit = tier_limits.get(user_tier, Decimal('5.00'))
        available_credits = limit - monthly_usage
        
        can_create = available_credits >= estimated_cost
        
        return {
            'can_create': can_create,
            'available_credits': float(available_credits),
            'estimated_cost': float(estimated_cost),
            'monthly_usage': float(monthly_usage),
            'limit': float(limit),
            'user_tier': user_tier,
            'message': (
                f"Crediti insufficienti. Disponibili: €{available_credits:.2f}, "
                f"Necessari: €{estimated_cost:.2f}"
                if not can_create else "OK"
            )
        }
    
    async def _get_user_tier(self, user_id: str) -> str:
        """Get user's tier from database"""
        async with self.db.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT tier FROM users WHERE id = $1
            """, user_id)
            
            return row['tier'] if row else 'free'
    
    async def _send_limit_warning(self, user_id: str, usage: Decimal, limit: Decimal):
        """Send warning when user approaches limit"""
        percentage = (usage / limit) * 100
        
        warning_message = (
            f"⚠️ Attenzione: hai utilizzato il {percentage:.1f}% del tuo credito mensile. "
            f"Crediti rimanenti: €{limit - usage:.2f}"
        )
        
        # Store warning in database
        async with self.db.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_notifications 
                (user_id, type, message, metadata)
                VALUES ($1, $2, $3, $4)
            """, user_id, 'credit_warning', warning_message, json.dumps({
                'usage': float(usage),
                'limit': float(limit),
                'percentage': float(percentage)
            }))
        
        # TODO: Send email/notification
        logger.warning(f"Credit warning for user {user_id}: {warning_message}")
    
    async def _handle_limit_exceeded(self, user_id: str, usage: Decimal, limit: Decimal):
        """Handle when user exceeds credit limit"""
        
        # Update user status
        async with self.db.acquire() as conn:
            await conn.execute("""
                UPDATE users 
                SET can_create_podcasts = FALSE,
                    limit_exceeded_at = NOW()
                WHERE id = $1
            """, user_id)
        
        # Send notification
        notification_message = (
            f"❌ Limite di credito superato. "
            f"Utilizzo: €{usage:.2f}, Limite: €{limit:.2f}. "
            f"Aggiorna il tuo piano per continuare a creare podcast."
        )
        
        async with self.db.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_notifications 
                (user_id, type, message, metadata)
                VALUES ($1, $2, $3, $4)
            """, user_id, 'credit_exceeded', notification_message, json.dumps({
                'usage': float(usage),
                'limit': float(limit)
            }))
        
        logger.warning(f"Credit limit exceeded for user {user_id}")
    
    async def reset_monthly_usage(self):
        """Reset monthly usage for all users (run on 1st of month)"""
        async with self.db.acquire() as conn:
            # Reset users who exceeded limits
            await conn.execute("""
                UPDATE users 
                SET can_create_podcasts = TRUE,
                    limit_exceeded_at = NULL
                WHERE limit_exceeded_at IS NOT NULL
            """)
            
            # Clear monthly usage cache
            await self.cache.delete_pattern("user:*:usage")
            
        logger.info("Monthly usage reset completed")
    
    async def generate_invoice(
        self,
        user_id: str,
        month: Optional[int] = None,
        year: Optional[int] = None
    ) -> Dict[str, Any]:
        """Generate invoice for user"""
        
        if month is None:
            month = datetime.now().month
        if year is None:
            year = datetime.now().year
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        # Get cost breakdown
        breakdown = await self.get_cost_breakdown(user_id, start_date, end_date)
        
        # Get user info
        async with self.db.acquire() as conn:
            user_row = await conn.fetchrow("""
                SELECT email, username, tier
                FROM users
                WHERE id = $1
            """, user_id)
            
            # Get subscription info
            subscription_row = await conn.fetchrow("""
                SELECT plan_id, amount
                FROM subscriptions
                WHERE user_id = $1
                  AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
            """, user_id)
        
        # Calculate totals
        subscription_cost = Decimal(str(subscription_row['amount'])) if subscription_row else Decimal('0')
        usage_cost = Decimal(str(breakdown['total']['cost']))
        total_cost = subscription_cost + usage_cost
        
        # Apply VAT (Italian 22%)
        vat_rate = Decimal('0.22')
        vat_amount = total_cost * vat_rate
        total_with_vat = total_cost + vat_amount
        
        invoice = {
            'invoice_number': f"INV-{year}{month:02d}-{user_id[:8]}",
            'date': datetime.now().isoformat(),
            'due_date': (datetime.now() + timedelta(days=30)).isoformat(),
            'user': {
                'id': user_id,
                'email': user_row['email'],
                'username': user_row['username'],
                'tier': user_row['tier']
            },
            'period': f"{month}/{year}",
            'items': [
                {
                    'description': f"Abbonamento {user_row['tier'].capitalize()}",
                    'quantity': 1,
                    'unit_price': float(subscription_cost),
                    'total': float(subscription_cost)
                },
                {
                    'description': 'Utilizzo servizi AI',
                    'quantity': breakdown['total']['requests'],
                    'unit_price': float(usage_cost / Decimal(str(breakdown['total']['requests']))) if breakdown['total']['requests']