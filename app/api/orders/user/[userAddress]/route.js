// app/api/orders/user/[userAddress]/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req, { params }) {
    try {
        await dbConnect();

        const userAddress = params.userAddress.toLowerCase();
        const { searchParams } = new URL(req.url);
        const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const chainId = searchParams.get('chainId');

        const filter = { userAddress };
        if (chainId) filter.chainId = Number(chainId);

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        return NextResponse.json({
            userAddress,
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/orders/user/[userAddress]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user orders' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
