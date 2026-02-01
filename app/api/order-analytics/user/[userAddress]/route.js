// app/api/order-analytics/user/[userAddress]/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';
import { parseTimeRange } from '@/utils/timeRange';
import { getChainName } from '@/config/chains';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req, { params }) {
    try {
        await dbConnect();

        const userAddress = params.userAddress.toLowerCase();
        const { searchParams } = new URL(req.url);
        const range        = searchParams.get('range') || '24h';
        const chainId      = searchParams.get('chainId');
        const cryptoSymbol = searchParams.get('cryptoSymbol');

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        const match = {
            userAddress,
            createdAt: { $gte: parsed.start, $lt: parsed.end },
        };
        if (chainId)      match.chainId = Number(chainId);
        if (cryptoSymbol) match.cryptoSymbol = cryptoSymbol.toUpperCase();

        const [statsAgg, chainBreakdown, tokenBreakdown, recentOrders] = await Promise.all([
            // Overall stats
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        orderCount:   { $sum: 1 },
                        totalVolume:  { $sum: '$amountNaira' },
                        uniqueChains: { $addToSet: '$chainId' },
                        uniqueTokens: { $addToSet: '$cryptoSymbol' },
                        firstOrder:   { $min: '$createdAt' },
                        lastOrder:    { $max: '$createdAt' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        orderCount: 1,
                        totalVolume:  { $round: ['$totalVolume', 2] },
                        uniqueChains: { $size: '$uniqueChains' },
                        uniqueTokens: { $size: '$uniqueTokens' },
                        averageAmount: {
                            $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                        },
                        firstOrder: 1,
                        lastOrder: 1,
                    },
                },
            ]),

            // Breakdown by chain
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$chainId',
                        chainName:   { $first: '$chainName' },
                        orderCount:  { $sum: 1 },
                        totalVolume: { $sum: '$amountNaira' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        chainId:     '$_id',
                        chainName:   1,
                        orderCount:  1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                    },
                },
                { $sort: { totalVolume: -1 } },
            ]),

            // Breakdown by token
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$cryptoSymbol',
                        orderCount:  { $sum: 1 },
                        totalVolume: { $sum: '$amountNaira' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        cryptoSymbol: '$_id',
                        orderCount: 1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                    },
                },
                { $sort: { totalVolume: -1 } },
            ]),

            // Recent orders
            Order.find(match)
                .sort({ createdAt: -1 })
                .limit(20)
                .select('requestId chainId cryptoSymbol amountNaira createdAt transactionHash serviceType')
                .lean(),
        ]);

        const stats = statsAgg[0] || {
            orderCount: 0, totalVolume: 0, uniqueChains: 0, uniqueTokens: 0,
            averageAmount: 0, firstOrder: null, lastOrder: null,
        };

        return NextResponse.json({
            range,
            userAddress,
            filters: {
                chainId: chainId ? Number(chainId) : 'all',
                cryptoSymbol: cryptoSymbol || 'all',
            },
            stats,
            chainBreakdown,
            tokenBreakdown,
            recentOrders: recentOrders.map(o => ({
                orderId:         o.requestId,
                chainId:         o.chainId,
                cryptoSymbol:    o.cryptoSymbol,
                amount:          o.amountNaira,
                timestamp:       o.createdAt,
                transactionHash: o.transactionHash,
                serviceType:     o.serviceType,
            })),
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/user/[userAddress]:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
