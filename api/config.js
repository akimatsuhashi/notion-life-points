// Point source configuration
// To add a new source, simply add a new entry to this array.

const POINT_SOURCES = [
    {
        id: "tasks",
        label: "タスク完了",
        emoji: "✅",
        dbId: "2fb2f3b8-e9a2-8029-ad0b-c5968306d326",
        dateProperty: "Start",
        dateType: "property", // uses a date property
        filter: {
            property: "State",
            status: { equals: "Done" },
        },
        pointsPerItem: 1,
    },
    {
        id: "books",
        label: "読書",
        emoji: "📚",
        dbId: "7d7964ba-9502-4234-9a7f-496b35adb3c3",
        dateProperty: "読了日",
        dateType: "property",
        filter: {
            property: "読了日",
            date: { is_not_empty: true },
        },
        pointsPerItem: 3,
    },
    {
        id: "cinema",
        label: "映画鑑賞",
        emoji: "🎬",
        dbId: "7df76879-14fc-427a-9f7c-9353e13629c1",
        dateProperty: "y/m/d",
        dateType: "property",
        filter: {
            property: "y/m/d",
            date: { is_not_empty: true },
        },
        pointsPerItem: 3,
    },
    {
        id: "insights",
        label: "インサイト",
        emoji: "💡",
        dbId: "3022f3b8-e9a2-800c-892a-cda4a4d90460",
        dateProperty: null,
        dateType: "created_time", // uses created_time of the page
        filter: null, // all pages count
        pointsPerItem: 2,
    },
    {
        id: "health_light",
        label: "朝の光",
        emoji: "☀️",
        dbId: "3012f3b8-e9a2-80fc-9ced-f7c3e720fd21",
        dateProperty: "Date",
        dateType: "property",
        filter: {
            property: "光",
            select: { is_not_empty: true },
        },
        pointsCalc: (page) => {
            const val = page.properties["光"]?.select?.name;
            if (!val) return 0;
            if (val.startsWith("A")) return 5;
            if (val.startsWith("B")) return 3;
            if (val.startsWith("C")) return 1;
            return 0;
        },
    },
    {
        id: "health_steps",
        label: "ウォーキング",
        emoji: "🚶",
        dbId: "3012f3b8-e9a2-80fc-9ced-f7c3e720fd21",
        dateProperty: "Date",
        dateType: "property",
        filter: {
            property: "歩数",
            number: { is_not_empty: true },
        },
        pointsCalc: (page) => {
            const steps = page.properties["歩数"]?.number || 0;
            return Math.floor(steps / 1000);
        },
    },
];

// Level system
const LEVELS = [
    { level: 1, threshold: 0, title: "🌱 Seedling" },
    { level: 2, threshold: 50, title: "🌿 Sprout" },
    { level: 3, threshold: 150, title: "🌳 Sapling" },
    { level: 4, threshold: 400, title: "🌲 Tree" },
    { level: 5, threshold: 800, title: "🏔️ Mountain" },
    { level: 6, threshold: 1500, title: "⭐ Star" },
    { level: 7, threshold: 3000, title: "🌟 Constellation" },
    { level: 8, threshold: 5000, title: "🌙 Moon" },
    { level: 9, threshold: 8000, title: "☀️ Sun" },
    { level: 10, threshold: 12000, title: "🌌 Galaxy" },
];

function getLevel(totalPoints) {
    let current = LEVELS[0];
    let next = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (totalPoints >= LEVELS[i].threshold) {
            current = LEVELS[i];
            next = LEVELS[i + 1] || null;
            break;
        }
    }
    return { current, next };
}

module.exports = { POINT_SOURCES, LEVELS, getLevel };
