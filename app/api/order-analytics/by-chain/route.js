// app/api/order-analytics/by-chain/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/db/index';
import Order from '@/models/order';
import { corsHandler, handlePreflight } from '@/lib/cors';
import { parseTimeRange } from '@/utils/timeRange';
import { getChainName } from '@/config/chains';

export async function OPTIONS(req) {
    return handlePreflight(req);
}

export async function GET(req) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const range   = searchParams.get('range') || '24h';
        const chainId = searchParams.get('chainId');

        const parsed = parseTimeRange(range);
        if (!parsed) {
            return NextResponse.json(
                { error: "Invalid time range. Use relative formats like '12h','24h','7d' or absolute dates like '2025','2025-12','2025-12-10' or '12/10/2025'" },
                { status: 400, headers: Object.fromEntries(corsHandler(req)) }
            );
        }

        const dateFilter = { createdAt: { $gte: parsed.start, $lt: parsed.end } };

        // ── Specific chain ──────────────────────────────────────────────────
        if (chainId) {
            const cid = Number(chainId);
            const match = { ...dateFilter, chainId: cid };

            const [statsAgg, topTokens, topUsers] = await Promise.all([
                Order.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: null,
                            orderCount:   { $sum: 1 },
                            totalVolume:  { $sum: '$amountNaira' },
                            uniqueUsers:  { $addToSet: '$userAddress' },
                            uniqueTokens: { $addToSet: '$cryptoSymbol' },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            orderCount: 1,
                            totalVolume:  { $round: ['$totalVolume', 2] },
                            uniqueUsers:  { $size: '$uniqueUsers' },
                            uniqueTokens: { $size: '$uniqueTokens' },
                            averageAmount: {
                                $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                            },
                        },
                    },
                ]),
                Order.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: '$cryptoSymbol',
                            chainId:     { $first: '$chainId' },
                            chainName:   { $first: '$chainName' },
                            orderCount:  { $sum: 1 },
                            totalVolume: { $sum: '$amountNaira' },
                        },
                    },
                    { $sort: { totalVolume: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            _id: 0,
                            cryptoSymbol: '$_id',
                            chainId: 1,
                            chainName: 1,
                            orderCount: 1,
                            totalVolume: { $round: ['$totalVolume', 2] },
                        },
                    },
                ]),
                Order.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: '$userAddress',
                            chainId:     { $first: '$chainId' },
                            chainName:   { $first: '$chainName' },
                            orderCount:  { $sum: 1 },
                            totalVolume: { $sum: '$amountNaira' },
                            tokensUsed:  { $addToSet: '$cryptoSymbol' },
                        },
                    },
                    { $sort: { totalVolume: -1 } },
                    { $limit: 10 },
                    {
                        $project: {
                            _id: 0,
                            userAddress: '$_id',
                            chainId: 1,
                            chainName: 1,
                            orderCount: 1,
                            totalVolume: { $round: ['$totalVolume', 2] },
                            tokensUsed: 1,
                        },
                    },
                ]),
            ]);

            const stats = statsAgg[0] || { orderCount: 0, totalVolume: 0, uniqueUsers: 0, uniqueTokens: 0, averageAmount: 0 };

            return NextResponse.json({
                range,
                chainId: cid,
                chainName: getChainName(cid),
                stats,
                topTokens,
                topUsers,
            }, { headers: Object.fromEntries(corsHandler(req)) });
        }

        // ── All chains ──────────────────────────────────────────────────────
        const chains = await Order.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: '$chainId',
                    chainName:    { $first: '$chainName' },
                    orderCount:   { $sum: 1 },
                    totalVolume:  { $sum: '$amountNaira' },
                    uniqueUsers:  { $addToSet: '$userAddress' },
                    uniqueTokens: { $addToSet: '$cryptoSymbol' },
                },
            },
            {
                $project: {
                    _id: 0,
                    chainId:      '$_id',
                    chainName:    1,
                    orderCount:   1,
                    totalVolume:  { $round: ['$totalVolume', 2] },
                    uniqueUsers:  { $size: '$uniqueUsers' },
                    uniqueTokens: { $size: '$uniqueTokens' },
                    averageAmount: {
                        $round: [{ $cond: [{ $eq: ['$orderCount', 0] }, 0, { $divide: ['$totalVolume', '$orderCount'] }] }, 2],
                    },
                },
            },
            { $sort: { totalVolume: -1 } },
        ]);

        return NextResponse.json({
            range,
            totalChains: chains.length,
            chains,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/by-chain:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
