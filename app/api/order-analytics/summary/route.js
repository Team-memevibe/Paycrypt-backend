// app/api/order-analytics/summary/route.js  (Comprehensive summary)
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

        const match = { createdAt: { $gte: parsed.start, $lt: parsed.end } };
        if (chainId)      match.chainId = Number(chainId);
        if (cryptoSymbol) match.cryptoSymbol = cryptoSymbol.toUpperCase();

        const [overallAgg, chainBreakdown, topTokens, topUsers] = await Promise.all([
            // ── Overall summary ─────────────────────────────────────────────
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalOrders:  { $sum: 1 },
                        totalVolume:  { $sum: '$amountNaira' },
                        uniqueUsers:  { $addToSet: '$userAddress' },
                        uniqueTokens: { $addToSet: '$cryptoSymbol' },
                        uniqueChains: { $addToSet: '$chainId' },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalOrders: 1,
                        totalVolume:  { $round: ['$totalVolume', 2] },
                        uniqueUsers:  { $size: '$uniqueUsers' },
                        uniqueTokens: { $size: '$uniqueTokens' },
                        uniqueChains: { $size: '$uniqueChains' },
                        averageAmount: {
                            $round: [{ $cond: [{ $eq: ['$totalOrders', 0] }, 0, { $divide: ['$totalVolume', '$totalOrders'] }] }, 2],
                        },
                    },
                },
            ]),

            // ── Chain breakdown ─────────────────────────────────────────────
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
                { $sort: { totalVolume: -1 } },
                {
                    $project: {
                        _id: 0,
                        chainId:     '$_id',
                        chainName:   1,
                        orderCount:  1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                    },
                },
            ]),

            // ── Top tokens ──────────────────────────────────────────────────
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$cryptoSymbol',
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
                        orderCount: 1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                    },
                },
            ]),

            // ── Top users ───────────────────────────────────────────────────
            Order.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: '$userAddress',
                        orderCount:  { $sum: 1 },
                        totalVolume: { $sum: '$amountNaira' },
                    },
                },
                { $sort: { totalVolume: -1 } },
                { $limit: 10 },
                {
                    $project: {
                        _id: 0,
                        userAddress: '$_id',
                        orderCount: 1,
                        totalVolume: { $round: ['$totalVolume', 2] },
                    },
                },
            ]),
        ]);

        const summary = overallAgg[0] || {
            totalOrders: 0, totalVolume: 0, uniqueUsers: 0,
            uniqueTokens: 0, uniqueChains: 0, averageAmount: 0,
        };

        // Compute percentage of total for chain breakdown and top tokens/users
        const tv = summary.totalVolume || 1;

        const chainsWithPct = chainBreakdown.map(c => ({
            ...c,
            percentageOfTotal: ((c.totalVolume / tv) * 100).toFixed(2),
        }));

        const tokensWithPct = topTokens.map(t => ({
            ...t,
            percentageOfTotal: ((t.totalVolume / tv) * 100).toFixed(2),
        }));

        const usersWithPct = topUsers.map(u => ({
            ...u,
            percentageOfTotal: ((u.totalVolume / tv) * 100).toFixed(2),
        }));

        return NextResponse.json({
            range,
            filters: {
                chainId: chainId ? Number(chainId) : 'all',
                cryptoSymbol: cryptoSymbol || 'all',
            },
            summary,
            chainBreakdown: chainsWithPct,
            topTokens: tokensWithPct,
            topUsers: usersWithPct,
        }, { headers: Object.fromEntries(corsHandler(req)) });
    } catch (error) {
        console.error('Error in GET /api/order-analytics/summary:', error);
        return NextResponse.json(
            { error: 'Failed to fetch order analytics' },
            { status: 500, headers: Object.fromEntries(corsHandler(req)) }
        );
    }
}
