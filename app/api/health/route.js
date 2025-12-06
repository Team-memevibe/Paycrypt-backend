// app/api/health/route.js
// Health check endpoint that runs migrations on first call

import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import { corsHandler, handlePreflight } from '@/lib/cors';
import { runMigrationsIfNeeded } from '@/lib/migrations';

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req) {
    try {
        // Check database connection
        await dbConnect();

        // Run migrations if needed (on first health check after deploy)
        await runMigrationsIfNeeded();

        // Return healthy status
        return new Response(
            JSON.stringify({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                database: 'connected',
                message: 'API is running and migrations checked'
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    ...Object.fromEntries(corsHandler(req))
                }
            }
        );
    } catch (error) {
        console.error('Health check error:', error);
        return new Response(
            JSON.stringify({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            }),
            {
                status: 503,
                headers: {
                    'Content-Type': 'application/json',
                    ...Object.fromEntries(corsHandler(req))
                }
            }
        );
    }
}