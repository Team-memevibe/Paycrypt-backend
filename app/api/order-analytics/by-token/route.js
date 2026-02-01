// app/api/order-analytics/by-token/route.js
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
        const range        = searchParams.get('range') || '24h';
        const chainId      = searchParams.get('chainId');
        const cryptoSymbol = searchParams.get('cryptoSymbol') || searchParams.get('tokenAddress'); // accept both

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        const dateFilter = { createdAt: { $gte: parsed.start, $lt: parsed.end } };
        if (chainId) dateFilter.chainId = Number(chainId);

        // ── Specific token ──────────────────────────────────────────────────
        if (cryptoSymbol) {
            const match = { ...dateFilter, cryptoSymbol: cryptoSymbol.toUpperCase() };

            const [statsAgg, recentOrders] = await Promise.all([
                Order.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: null,
                            orderCount:  { $sum: 1 },
                            totalVolume: { $sum: '$amountNaira' },
                            uniqueUsers: { $addToSet: '$userAddress' },
                            minAmount:   { $min: '$amountNaira' },
                            maxAmount:   { $max: '$amountNaira' },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            orderCount: 1,
                            totalVolume:  { $round: ['$totalVolume', 2] },
                            uniqueUsers:  { $size: '$uniqueUsers' },
                            averageAmount: {
                                $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                            },
                            minAmount: { $round: ['$minAmount', 2] },
                            maxAmount: { $round: ['$maxAmount', 2] },
                        },
                    },
                ]),
                Order.find(match)
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .select('requestId userAddress amountNaira createdAt transactionHash')
                    .lean(),
            ]);

            const stats = statsAgg[0] || { orderCount: 0, totalVolume: 0, uniqueUsers: 0, averageAmount: 0, minAmount: 0, maxAmount: 0 };

            return NextResponse.json({
                range,
                cryptoSymbol: cryptoSymbol.toUpperCase(),
                ...(chainId && { chainId: Number(chainId) }),
                stats,
                recentOrders: recentOrders.map(o => ({
                    orderId:         o.requestId,
                    userAddress:     o.userAddress,
                    amount:          o.amountNaira,
                    timestamp:       o.createdAt,
                    transactionHash: o.transactionHash,
                })),
            }, { headers: Object.fromEntries(corsHandler(req)) });
        }

        // ── All tokens ──────────────────────────────────────────────────────
        const tokens = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$cryptoSymbol',
                    orderCount:  { $sum: 1 },
                    totalVolume: { $sum: '$amountNaira' },
                    uniqueUsers: { $addToSet: '$userAddress' },
                },
            },
            {
                $project: {
                    _id: 0,
                    cryptoSymbol: '$_id',
                    orderCount: 1,
                    totalVolume:  { $round: ['$totalVolume', 2] },
                    uniqueUsers:  { $size: '$uniqueUsers' },
                    averageAmount: {
                        $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                    },
                },
            },
            { $sort: { totalVolume: -1 } },
        ]);

        return NextResponse.json({
            range,
            ...(chainId && { chainId: Number(chainId) }),
            totalTokens: tokens.length,
            tokens,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/by-token:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
