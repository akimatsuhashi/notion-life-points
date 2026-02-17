const { Client } = require("@notionhq/client");
const { POINT_SOURCES, getLevel } = require("./config");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// ── Date helpers (all in user's local timezone JST) ──────────────────────────

function toJSTDateString(dateInput) {
    const d = new Date(dateInput);
    // Convert to JST (UTC+9)
    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().slice(0, 10);
}

function getJSTNow() {
    const now = new Date();
    return new Date(now.getTime() + 9 * 60 * 60 * 1000);
}

function getJSTToday() {
    return getJSTNow().toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// Get Monday of the week containing dateStr (ISO week)
function getWeekStart(dateStr) {
    const d = new Date(dateStr + "T00:00:00Z");
    const day = d.getUTCDay(); // Sunday=0
    const diff = day === 0 ? -6 : 1 - day; // Shift to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
}

function getMonthStart(dateStr) {
    return dateStr.slice(0, 7) + "-01";
}

function getMonthEnd(dateStr) {
    const d = new Date(dateStr.slice(0, 7) + "-01T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

// ── Notion API querying ──────────────────────────────────────────────────────

function getDateFromPage(page, source) {
    if (source.dateType === "created_time") {
        return toJSTDateString(page.created_time);
    }
    const prop = page.properties[source.dateProperty];
    if (!prop) return null;

    if (prop.type === "date" && prop.date) {
        return prop.date.start ? prop.date.start.slice(0, 10) : null;
    }
    if (prop.type === "formula" && prop.formula) {
        if (prop.formula.type === "date" && prop.formula.date) {
            return prop.formula.date.start
                ? prop.formula.date.start.slice(0, 10)
                : null;
        }
        if (prop.formula.type === "string" && prop.formula.string) {
            return prop.formula.string.slice(0, 10);
        }
    }
    if (prop.type === "created_time") {
        return toJSTDateString(prop.created_time);
    }
    return null;
}

function getPointsForPage(page, source) {
    if (source.pointsCalc) {
        return source.pointsCalc(page);
    }
    return source.pointsPerItem || 0;
}

async function queryDatabase(dbId, dateFilter, extraFilter) {
    const filters = [];

    if (dateFilter) {
        filters.push(dateFilter);
    }
    if (extraFilter) {
        filters.push(extraFilter);
    }

    const queryParams = {
        database_id: dbId,
        page_size: 100,
    };

    if (filters.length === 1) {
        queryParams.filter = filters[0];
    } else if (filters.length > 1) {
        queryParams.filter = { and: filters };
    }

    const allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
        if (startCursor) queryParams.start_cursor = startCursor;
        const response = await notion.databases.query(queryParams);
        allResults.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor;

        // Safety limit
        if (allResults.length > 5000) break;
    }

    return allResults;
}

// Build a date range filter for a specific source
function buildDateRangeFilter(source, startDate, endDate) {
    if (source.dateType === "created_time") {
        // For created_time, use timestamp filter
        return {
            timestamp: "created_time",
            created_time: {
                on_or_after: startDate + "T00:00:00+09:00",
                ...(endDate
                    ? { on_or_before: endDate + "T23:59:59+09:00" }
                    : {}),
            },
        };
    }

    if (source.dateProperty) {
        const propType =
            source.dateType === "formula" ? "formula" : "date";
        return {
            and: [
                {
                    property: source.dateProperty,
                    date: { on_or_after: startDate },
                },
                ...(endDate
                    ? [
                        {
                            property: source.dateProperty,
                            date: { on_or_before: endDate },
                        },
                    ]
                    : []),
            ],
        };
    }
    return null;
}

// ── Point calculation for a period ───────────────────────────────────────────

async function calculatePoints(startDate, endDate) {
    const breakdown = [];

    // Group sources by DB to avoid duplicate queries for same DB
    const dbGroups = {};
    for (const source of POINT_SOURCES) {
        if (!dbGroups[source.dbId]) {
            dbGroups[source.dbId] = [];
        }
        dbGroups[source.dbId].push(source);
    }

    for (const [dbId, sources] of Object.entries(dbGroups)) {
        // For databases with multiple sources (like Health Tracker),
        // query once and process for each source
        const dateRangeFilter = buildDateRangeFilter(
            sources[0],
            startDate,
            endDate
        );
        const extraFilter = sources[0].filter;

        // If sources share same DB but different filters, query separately
        if (sources.length === 1) {
            const pages = await queryDatabase(
                dbId,
                dateRangeFilter,
                extraFilter
            );
            const filteredPages = pages.filter((page) => {
                const pageDate = getDateFromPage(page, sources[0]);
                if (!pageDate) return false;
                if (pageDate < startDate) return false;
                if (endDate && pageDate > endDate) return false;
                return true;
            });

            let total = 0;
            for (const page of filteredPages) {
                total += getPointsForPage(page, sources[0]);
            }

            breakdown.push({
                id: sources[0].id,
                label: sources[0].label,
                emoji: sources[0].emoji,
                points: total,
                count: filteredPages.length,
            });
        } else {
            // Multiple sources from same DB - query with broader filter
            for (const source of sources) {
                const srcDateFilter = buildDateRangeFilter(
                    source,
                    startDate,
                    endDate
                );
                const pages = await queryDatabase(
                    dbId,
                    srcDateFilter,
                    source.filter
                );
                const filteredPages = pages.filter((page) => {
                    const pageDate = getDateFromPage(page, source);
                    if (!pageDate) return false;
                    if (pageDate < startDate) return false;
                    if (endDate && pageDate > endDate) return false;
                    return true;
                });

                let total = 0;
                for (const page of filteredPages) {
                    total += getPointsForPage(page, source);
                }

                breakdown.push({
                    id: source.id,
                    label: source.label,
                    emoji: source.emoji,
                    points: total,
                    count: filteredPages.length,
                });
            }
        }
    }

    const totalPoints = breakdown.reduce((sum, b) => sum + b.points, 0);
    return { totalPoints, breakdown };
}

// ── Daily history for area chart (last 30 days) ──────────────────────────────

async function calculateDailyHistory(todayStr, days) {
    const startDate = addDays(todayStr, -(days - 1));

    // Fetch all data for the range once
    const dailyMap = {}; // dateStr -> points
    for (let i = 0; i < days; i++) {
        dailyMap[addDays(startDate, i)] = 0;
    }

    for (const source of POINT_SOURCES) {
        const dateFilter = buildDateRangeFilter(source, startDate, todayStr);
        const pages = await queryDatabase(
            source.dbId,
            dateFilter,
            source.filter
        );
        for (const page of pages) {
            const pageDate = getDateFromPage(page, source);
            if (pageDate && dailyMap.hasOwnProperty(pageDate)) {
                dailyMap[pageDate] += getPointsForPage(page, source);
            }
        }
    }

    // Convert to sorted array
    return Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, points]) => ({ date, points }));
}

// ── API Handler ──────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const today = getJSTToday();

        // Calculate all periods in parallel
        const todayStart = today;
        const todayEnd = today;
        const yesterdayStart = addDays(today, -1);
        const yesterdayEnd = addDays(today, -1);

        const weekStart = getWeekStart(today);
        const weekEnd = addDays(weekStart, 6);
        const prevWeekStart = addDays(weekStart, -7);
        const prevWeekEnd = addDays(weekStart, -1);

        const monthStart = getMonthStart(today);
        const monthEnd = getMonthEnd(today);
        const prevMonthDate = addDays(monthStart, -1);
        const prevMonthStart = getMonthStart(prevMonthDate);
        const prevMonthEnd = getMonthEnd(prevMonthDate);

        // All-time: from a reasonable start date (2021-01-01)
        const allTimeStart = "2021-01-01";

        const [
            todayResult,
            yesterdayResult,
            weekResult,
            prevWeekResult,
            monthResult,
            prevMonthResult,
            allTimeResult,
            dailyHistory,
        ] = await Promise.all([
            calculatePoints(todayStart, todayEnd),
            calculatePoints(yesterdayStart, yesterdayEnd),
            calculatePoints(weekStart, weekEnd),
            calculatePoints(prevWeekStart, prevWeekEnd),
            calculatePoints(monthStart, monthEnd),
            calculatePoints(prevMonthStart, prevMonthEnd),
            calculatePoints(allTimeStart, today),
            calculateDailyHistory(today, 30),
        ]);

        const levelInfo = getLevel(allTimeResult.totalPoints);

        const response = {
            today: {
                points: todayResult.totalPoints,
                breakdown: todayResult.breakdown,
                comparison: todayResult.totalPoints - yesterdayResult.totalPoints,
                comparisonLabel: "vs 昨日",
            },
            week: {
                points: weekResult.totalPoints,
                breakdown: weekResult.breakdown,
                comparison: weekResult.totalPoints - prevWeekResult.totalPoints,
                comparisonLabel: "vs 先週",
            },
            month: {
                points: monthResult.totalPoints,
                breakdown: monthResult.breakdown,
                comparison:
                    monthResult.totalPoints - prevMonthResult.totalPoints,
                comparisonLabel: "vs 先月",
            },
            total: {
                points: allTimeResult.totalPoints,
                breakdown: allTimeResult.breakdown,
                comparison: null,
                comparisonLabel: null,
            },
            level: {
                current: levelInfo.current,
                next: levelInfo.next,
                totalPoints: allTimeResult.totalPoints,
            },
            dailyHistory,
            generatedAt: new Date().toISOString(),
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error fetching points:", error);
        res.status(500).json({
            error: "Failed to fetch points",
            message: error.message,
        });
    }
};
