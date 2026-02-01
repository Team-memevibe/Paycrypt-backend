// app/api/orders/recent/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const count = Math.min(100, Math.max(1, parseInt(searchParams.get('count') || '10', 10)));

        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(count)
            .lean();

        return NextResponse.json({
            orders,
            count: orders.length,
            requested: count,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/orders/recent:', error);
        return NextResponse.json(
            { error: 'Failed to fetch recent orders' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
