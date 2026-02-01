// app/api/orders/[orderId]/route.js
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

        const { orderId } = params;
        const { searchParams } = new URL(req.url);
        const chainId = searchParams.get('chainId');

        const filter = { requestId: orderId };
        if (chainId) filter.chainId = Number(chainId);

        const order = await Order.findOne(filter).lean();

        if (!order) {
            return NextResponse.json(
                { error: 'Order not found' },
                { status: 404, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        return NextResponse.json(order, {
            headers: Object.fromEntries(corsHandler(req)),
        });
    } catch (error) {
        console.error('Error in GET /api/orders/[orderId]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
