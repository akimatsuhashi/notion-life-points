// Simple test server with mock data for UI visual testing
const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
};

// Generate 30-day mock daily history
function generateDailyHistory() {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        // Random-ish points 5-25
        const pts = Math.floor(Math.random() * 20) + 5;
        days.push({ date: dateStr, points: pts });
    }
    return days;
}

const dailyHistory = generateDailyHistory();

const MOCK_DATA = {
    today: {
        points: 18,
        breakdown: [
            { id: "tasks", label: "タスク完了", emoji: "✅", points: 8, count: 8 },
            { id: "health_light", label: "朝の光", emoji: "☀️", points: 5, count: 1 },
            { id: "health_steps", label: "ウォーキング", emoji: "🚶", points: 3, count: 1 },
            { id: "cinema", label: "映画鑑賞", emoji: "🎬", points: 0, count: 0 },
            { id: "books", label: "読書", emoji: "📚", points: 0, count: 0 },
            { id: "insights", label: "インサイト", emoji: "💡", points: 2, count: 1 },
        ],
        comparison: 5,
        comparisonLabel: "vs 昨日",
    },
    week: {
        points: 87,
        breakdown: [
            { id: "tasks", label: "タスク完了", emoji: "✅", points: 34, count: 34 },
            { id: "health_light", label: "朝の光", emoji: "☀️", points: 23, count: 6 },
            { id: "health_steps", label: "ウォーキング", emoji: "🚶", points: 18, count: 5 },
            { id: "cinema", label: "映画鑑賞", emoji: "🎬", points: 3, count: 1 },
            { id: "books", label: "読書", emoji: "📚", points: 3, count: 1 },
            { id: "insights", label: "インサイト", emoji: "💡", points: 6, count: 3 },
        ],
        comparison: 12,
        comparisonLabel: "vs 先週",
    },
    month: {
        points: 342,
        breakdown: [
            { id: "tasks", label: "タスク完了", emoji: "✅", points: 145, count: 145 },
            { id: "health_light", label: "朝の光", emoji: "☀️", points: 68, count: 18 },
            { id: "health_steps", label: "ウォーキング", emoji: "🚶", points: 56, count: 14 },
            { id: "cinema", label: "映画鑑賞", emoji: "🎬", points: 21, count: 7 },
            { id: "books", label: "読書", emoji: "📚", points: 27, count: 9 },
            { id: "insights", label: "インサイト", emoji: "💡", points: 25, count: 12 },
        ],
        comparison: -18,
        comparisonLabel: "vs 先月",
    },
    total: {
        points: 342,
        breakdown: [
            { id: "tasks", label: "タスク完了", emoji: "✅", points: 145, count: 145 },
            { id: "health_light", label: "朝の光", emoji: "☀️", points: 68, count: 18 },
            { id: "health_steps", label: "ウォーキング", emoji: "🚶", points: 56, count: 14 },
            { id: "cinema", label: "映画鑑賞", emoji: "🎬", points: 21, count: 7 },
            { id: "books", label: "読書", emoji: "📚", points: 27, count: 9 },
            { id: "insights", label: "インサイト", emoji: "💡", points: 25, count: 12 },
        ],
        comparison: null,
        comparisonLabel: null,
    },
    level: {
        current: { level: 3, threshold: 150, title: "🌳 Sapling" },
        next: { level: 4, threshold: 400, title: "🌲 Tree" },
        totalPoints: 342,
    },
    dailyHistory,
    generatedAt: new Date().toISOString(),
};

const server = http.createServer((req, res) => {
    if (req.url === "/api/points") {
        res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(MOCK_DATA));
        return;
    }

    let filePath = req.url === "/" ? "/index.html" : req.url;
    const fullPath = path.join(__dirname, "public", filePath);
    const ext = path.extname(fullPath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    try {
        const content = fs.readFileSync(fullPath);
        res.writeHead(200, { "Content-Type": mimeType });
        res.end(content);
    } catch (e) {
        res.writeHead(404);
        res.end("Not found");
    }
});

const PORT = 3457;
server.listen(PORT, () => {
    console.log(`Test server running at http://localhost:${PORT}`);
});
