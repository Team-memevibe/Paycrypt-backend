// middleware.js
// Run migrations on app startup (first request)

import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/migrations';

let migrationsRun = false;

export async function middleware(request) {
    // Run migrations only once on first request
    if (!migrationsRun) {
        migrationsRun = true;
        try {
            await runMigrations();
        } catch (error) {
            console.error('Middleware migration error:', error);
            // Continue anyway
        }
    }

    return NextResponse.next();
}

// Run middleware on all requests
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
