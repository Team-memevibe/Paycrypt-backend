// utils/timeRange.js

/**
 * Parses a time range string into a MongoDB date filter ({ $gte, $lt }).
 *
 * Supported formats:
 *   Relative:  12h, 24h, day, month, year, 7d, 2w, 6m
 *   Absolute:  2025, 2025-12, 2025-12-10, 12/10/2025
 *
 * Returns { start: Date, end: Date } or null if the format is invalid.
 */
export function parseTimeRange(range) {
    if (!range) return null;

    const now = new Date();

    // --- named shortcuts ---
    if (range === 'day')   return relative(now, 24, 'h');
    if (range === 'month') return relative(now, 30, 'd');
    if (range === 'year')  return relative(now, 365, 'd');

    // --- relative: {number}{unit} ---
    const relMatch = range.match(/^(\d+)(h|d|w|m)$/);
    if (relMatch) {
        const num  = parseInt(relMatch[1], 10);
        const unit = relMatch[2];
        return relative(now, num, unit);
    }

    // --- absolute: full year (e.g. 2025) ---
    if (/^\d{4}$/.test(range)) {
        const y = parseInt(range, 10);
        return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) };
    }

    // --- absolute: year-month (e.g. 2025-12) ---
    if (/^\d{4}-\d{1,2}$/.test(range)) {
        const [y, m] = range.split('-').map(Number);
        return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
    }

    // --- absolute: ISO date (e.g. 2025-12-10) ---
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(range)) {
        const [y, m, d] = range.split('-').map(Number);
        return { start: new Date(Date.UTC(y, m - 1, d)), end: new Date(Date.UTC(y, m - 1, d + 1)) };
    }

    // --- absolute: US date (e.g. 12/10/2025) ---
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(range)) {
        const [m, d, y] = range.split('/').map(Number);
        return { start: new Date(Date.UTC(y, m - 1, d)), end: new Date(Date.UTC(y, m - 1, d + 1)) };
    }

    return null; // unrecognised format
}

/**
 * Converts a parsed time range into a Mongoose query filter on `createdAt`.
 * Returns {} if range is null/invalid so callers can spread safely.
 */
export function buildDateFilter(range) {
    const parsed = parseTimeRange(range);
    if (!parsed) return {};
    return { createdAt: { $gte: parsed.start, $lt: parsed.end } };
}

// ─── helpers ────────────────────────────────────────────────────────────

function relative(now, num, unit) {
    const ms = {
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
        m: 30 * 24 * 60 * 60 * 1000,
    };
    const start = new Date(now.getTime() - num * ms[unit]);
    return { start, end: now };
}
