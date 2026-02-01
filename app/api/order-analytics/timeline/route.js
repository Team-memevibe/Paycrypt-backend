// app/api/order-analytics/timeline/route.js
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
        const range    = searchParams.get('range') || '24h';
        const interval = searchParams.get('interval') || 'hour'; // hour | day | month
        const chainId  = searchParams.get('chainId');
        const serviceType = searchParams.get('serviceType');

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        // Build match stage
        const match = { createdAt: { $gte: parsed.start, $lt: parsed.end } };
        if (chainId)     match.chainId = Number(chainId);
        if (serviceType) match.serviceType = serviceType;

        // Build date grouping expression
        const dateGroup = buildDateGroupExpr(interval);

        const pipeline = [
            { $match: match },
            {
                $group: {
                    _id: dateGroup,
                    orderCount:   { $sum: 1 },
                    totalVolume:  { $sum: '$amountNaira' },
                    uniqueUsers:  { $addToSet: '$userAddress' },
                    uniqueTokens: { $addToSet: '$cryptoSymbol' },
                },
            },
            {
                $project: {
                    _id: 0,
                    timestamp:    '$_id',
                    orderCount:   1,
                    totalVolume:  { $round: ['$totalVolume', 2] },
                    uniqueUsers:  { $size: '$uniqueUsers' },
                    uniqueTokens: { $size: '$uniqueTokens' },
                    averageAmount: {
                        $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                    },
                },
            },
            { $sort: { timestamp: 1 } },
        ];

        const timeline = await Order.aggregate(pipeline);

        return NextResponse.json({
            range,
            interval,
            filters: {
                chainId: chainId ? Number(chainId) : 'all',
                serviceType: serviceType || 'all',
            },
            dataPoints: timeline.length,
            timeline,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/timeline:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}

function buildDateGroupExpr(interval) {
    switch (interval) {
        case 'month':
            return {
                $dateFromParts: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: 1,
                },
            };
        case 'day':
            return {
                $dateFromParts: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                },
            };
        case 'hour':
        default:
            return {
                $dateFromParts: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                    hour: { $hour: '$createdAt' },
                },
            };
    }
}
