// app/api/order-analytics/users-summary/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';
import { parseTimeRange } from '@/utils/timeRange';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const range   = searchParams.get('range') || '24h';
        const chainId = searchParams.get('chainId');
        const page    = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit   = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        const match = { createdAt: { $gte: parsed.start, $lt: parsed.end } };
        if (chainId) match.chainId = Number(chainId);

        // Get total unique user count + total orders in one pass
        const [totalsAgg] = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    users: { $addToSet: '$userAddress' },
                },
            },
            {
                $project: {
                    _id: 0,
                    totalOrders: 1,
                    totalUsers: { $size: '$users' },
                },
            },
        ]);

        const totalUsers  = totalsAgg?.totalUsers  || 0;
        const totalOrders = totalsAgg?.totalOrders || 0;

        // Paginated user list sorted by volume descending
        const users = await Order.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$userAddress',
                    orderCount:  { $sum: 1 },
                    totalVolume: { $sum: '$amountNaira' },
                    chainsUsed:  { $addToSet: { chainId: '$chainId', chainName: '$chainName' } },
                    tokensUsed:  { $addToSet: '$cryptoSymbol' },
                    lastOrderAt: { $max: '$createdAt' },
                },
            },
            { $sort: { totalVolume: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    userAddress: '$_id',
                    orderCount: 1,
                    totalVolume: { $round: ['$totalVolume', 2] },
                    chainsUsed: 1,
                    tokensUsed: 1,
                    lastOrderAt: 1,
                },
            },
        ]);

        return NextResponse.json({
            range,
            ...(chainId && { chainId: Number(chainId) }),
            totalUsers,
            totalOrders,
            page,
            limit,
            users,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/users-summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch users summary' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
