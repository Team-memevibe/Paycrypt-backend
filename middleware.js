// middleware.js — runs before every matched request
import { NextResponse } from 'next/server';

// Routes that bypass API-key checking (preflight & health-check)
const PUBLIC_PATHS = ['/api/health'];

export function middleware(req) {
    const { pathname } = req.nextUrl;

    // Let CORS preflight through unconditionally
    if (req.method === 'OPTIONS') {
        return NextResponse.next();
    }

    // Allow explicitly public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // ── API key check ───────────────────────────────────────────────────
    const apiKey = process.env.PAYCRYPT_API_KEY;

    if (!apiKey) {
        // If the env var is not set the server is misconfigured — fail closed
        console.error('PAYCRYPT_API_KEY is not configured. Rejecting request.');
        return NextResponse.json(
            { error: 'Server misconfiguration. API key not set.' },
            { status: 500 }
        );
    }

    const provided = req.headers.get('x-api-key');

    if (!provided || provided !== apiKey) {
        return NextResponse.json(
            { error: 'Unauthorized. A valid x-api-key header is required.' },
            { status: 401 }
        );
    }

    return NextResponse.next();
}

// Only run on /api/* routes
export const config = {
    matcher: '/api/:path*',
};
