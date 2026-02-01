// app/api/orders/analytics/summary/route.js  (Legacy summary)
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
        const range = searchParams.get('range') || '24h';

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        const dateFilter = { createdAt: { $gte: parsed.start, $lt: parsed.end } };

        const [summaryAgg, topTokens, topUsers] = await Promise.all([
            Order.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalVolume: { $sum: '$amountNaira' },
                        uniqueUsers: { $addToSet: '$userAddress' },
                        uniqueTokens: { $addToSet: '$cryptoSymbol' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalOrders: 1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                        uniqueUsers: { $size: '$uniqueUsers' },
                        uniqueTokens: { $size: '$uniqueTokens' },
                        averageAmount: {
                            $round: [{ $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalVolume', '$totalOrders'] }] }, 2],
                        },
                    },
                },
            ]),
            Order.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$cryptoSymbol', orderCount: { $sum: 1 }, totalVolume: { $sum: '$amountNaira' } } },
                { $sort: { totalVolume: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, cryptoSymbol: '$_id', orderCount: 1, totalVolume: { $round: ['$totalVolume', 2] } } },
            ]),
            Order.aggregate([
                { $match: dateFilter },
                { $group: { _id: '$userAddress', orderCount: { $sum: 1 }, totalVolume: { $sum: '$amountNaira' } } },
                { $sort: { totalVolume: -1 } },
                { $limit: 10 },
                { $project: { _id: 0, userAddress: '$_id', orderCount: 1, totalVolume: { $round: ['$totalVolume', 2] } } },
            ]),
        ]);

        const summary = summaryAgg[0] || { totalOrders: 0, totalVolume: 0, uniqueUsers: 0, uniqueTokens: 0, averageAmount: 0 };

        return NextResponse.json({
            range,
            summary,
            topTokens,
            topUsers,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/orders/analytics/summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
