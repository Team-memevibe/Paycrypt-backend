// middleware.js — runs before every matched request
import { NextResponse } from 'next/server';

// Routes that bypass API-key checking (preflight & health-check)
const PUBLIC_PATHS = ['/api/health'];

const ALLOWED_ORIGINS = [
    'https://paycryptv1.vercel.app',
    'https://admin-paycrypt.vercel.app',
    'https://www.paycrypt.org',
    'https://admin.paycrypt.org',
    'https://miniapp.paycrypt.org',
];

export function middleware(req) {
    const { pathname } = req.nextUrl;
    const origin = req.headers.get('origin');

    // ── CORS preflight — must respond with full CORS headers ────────────
    if (req.method === 'OPTIONS') {
        const headers = new Headers();

        if (ALLOWED_ORIGINS.includes(origin)) {
            headers.set('Access-Control-Allow-Origin', origin);
        }

        headers.set('Access-Control-Allow-Credentials', 'true');
        headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-api-key');

        return new NextResponse(null, { status: 200, headers });
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
