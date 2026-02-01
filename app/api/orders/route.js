// app/api/orders/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';
import { buildDateFilter, parseTimeRange } from '@/utils/timeRange';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
        const range   = searchParams.get('range');
        const user    = searchParams.get('user');
        const chainId = searchParams.get('chainId');
        const sort    = searchParams.get('sort') || 'createdAt';
        const order   = searchParams.get('order') === 'asc' ? 1 : -1;
        const serviceType = searchParams.get('serviceType');
        const vtpassStatus = searchParams.get('vtpassStatus');

        // Build filter
        const filter = {};

        if (range) {
            const parsed = parseTimeRange(range);
            if (!parsed) {
                return NextResponse.json(
                    { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                    { status: 400, headers: Object.fromEntries(corsHandler(req)) }
                );
            }
            filter.createdAt = { $gte: parsed.start, $lt: parsed.end };
        }

        if (user) filter.userAddress = user.toLowerCase();
        if (chainId) filter.chainId = Number(chainId);
        if (serviceType) filter.serviceType = serviceType;
        if (vtpassStatus) filter.vtpassStatus = vtpassStatus;

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ [sort]: order })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Order.countDocuments(filter),
        ]);

        return NextResponse.json({
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            filters: {
                ...(chainId && { chainId: Number(chainId) }),
                ...(range && { range }),
                ...(user && { user }),
                ...(serviceType && { serviceType }),
                ...(vtpassStatus && { vtpassStatus }),
            },
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/orders:', error);
        return NextResponse.json(
            { error: 'Failed to fetch orders' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
