import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    message: 'PodOrchestrator API is working!',
    status: 'ok',
    timestamp: new Date().toISOString()
  })
}