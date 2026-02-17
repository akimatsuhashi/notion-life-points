// ── Life Points Widget ──────────────────────────────────────────────────────

(function () {
    "use strict";

    let data = null;
    let activePeriod = "today";

    const BAR_COLORS = {
        tasks: "c-tasks",
        books: "c-books",
        cinema: "c-cinema",
        insights: "c-insights",
        health_light: "c-health_light",
        health_steps: "c-health_steps",
    };

    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

    const el = {
        levelTag: $("#levelTag"),
        levelTitle: $("#levelTitle"),
        levelBar: $("#levelBar"),
        levelPts: $("#levelPts"),
        scoreNum: $("#scoreNum"),
        scoreDiff: $("#scoreDiff"),
        breakdown: $("#breakdown"),
        scorePanel: $("#scorePanel"),
        chartPanel: $("#chartPanel"),
        chartTotalNum: $("#chartTotalNum"),
        chartSvg: $("#chartSvg"),
        chartLabelStart: $("#chartLabelStart"),
        chartLabelEnd: $("#chartLabelEnd"),
        loading: $("#loading"),
    };

    // ── Fetch ──────────────────────────────────────────────────────────────────

    async function fetchPoints() {
        try {
            const res = await fetch("/api/points");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            data = await res.json();
            render();
        } catch (err) {
            console.error("Failed to fetch points:", err);
            el.scoreNum.textContent = "—";
            el.scoreDiff.textContent = "取得失敗";
            el.scoreDiff.className = "score-diff flat";
        } finally {
            el.loading.classList.add("hidden");
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    function render() {
        if (!data) return;
        renderLevel();
        renderPeriod();
    }

    function renderLevel() {
        const { current, next, totalPoints } = data.level;
        el.levelTag.textContent = `Lv.${current.level}`;
        // Show title without the emoji prefix
        const titleParts = current.title.split(" ");
        el.levelTitle.textContent = titleParts.length > 1 ? titleParts.slice(1).join(" ") : titleParts[0];

        if (next) {
            const progress = totalPoints - current.threshold;
            const range = next.threshold - current.threshold;
            const pct = Math.min(100, Math.round((progress / range) * 100));
            el.levelBar.style.width = pct + "%";
            el.levelPts.textContent = `${totalPoints}/${next.threshold}`;
        } else {
            el.levelBar.style.width = "100%";
            el.levelPts.textContent = `${totalPoints} MAX`;
        }
    }

    function renderPeriod() {
        const isTotal = activePeriod === "total";

        el.scorePanel.classList.toggle("hidden", isTotal);
        el.chartPanel.classList.toggle("hidden", !isTotal);

        if (isTotal) {
            renderChart();
        } else {
            renderScore();
        }
    }

    function renderScore() {
        const period = data[activePeriod];
        if (!period) return;

        animateNumber(el.scoreNum, period.points);

        // Comparison
        if (period.comparison != null) {
            const d = period.comparison;
            const sign = d > 0 ? "+" : "";
            const arrow = d > 0 ? "↑" : d < 0 ? "↓" : "→";
            const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
            el.scoreDiff.textContent = `${sign}${d} ${arrow}`;
            el.scoreDiff.className = `score-diff ${cls}`;
        } else {
            el.scoreDiff.textContent = "";
            el.scoreDiff.className = "score-diff";
        }

        renderBreakdown(period.breakdown);
    }

    function renderBreakdown(breakdown) {
        const maxPts = Math.max(...breakdown.map((b) => b.points), 1);
        el.breakdown.innerHTML = breakdown
            .sort((a, b) => b.points - a.points)
            .map(
                (b) => `
        <div class="bd-row">
          <span class="bd-icon">${b.emoji}</span>
          <span class="bd-name">${b.label}</span>
          <div class="bd-bar-bg">
            <div class="bd-bar ${BAR_COLORS[b.id] || "c-tasks"}"
                 style="width:${b.points > 0 ? Math.max(4, Math.round((b.points / maxPts) * 100)) : 0}%"></div>
          </div>
          <span class="bd-pts">${b.points}</span>
        </div>`
            )
            .join("");
    }

    // ── Area Chart (SVG) ──────────────────────────────────────────────────────

    function renderChart() {
        const total = data.total;
        animateNumber(el.chartTotalNum, total.points);

        const history = data.dailyHistory;
        if (!history || history.length === 0) {
            el.chartSvg.innerHTML = "";
            return;
        }

        // Compute cumulative values for area chart
        const cumulative = [];
        let sum = 0;
        for (const day of history) {
            sum += day.points;
            cumulative.push({ date: day.date, value: sum });
        }

        // Chart labels
        const firstDate = history[0].date;
        const lastDate = history[history.length - 1].date;
        el.chartLabelStart.textContent = formatShortDate(firstDate);
        el.chartLabelEnd.textContent = formatShortDate(lastDate);

        // SVG dimensions
        const W = 348;
        const H = 100;
        const maxVal = Math.max(...cumulative.map((d) => d.value), 1);
        const len = cumulative.length;

        // Build path
        const points = cumulative.map((d, i) => {
            const x = (i / (len - 1)) * W;
            const y = H - (d.value / maxVal) * (H - 8);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const linePath = `M${points.join(" L")}`;
        const areaPath = `${linePath} L${W},${H} L0,${H} Z`;

        // Accent colour from CSS
        const accent = getComputedStyle(document.documentElement)
            .getPropertyValue("--accent")
            .trim();

        el.chartSvg.setAttribute("viewBox", `0 0 ${W} ${H}`);
        el.chartSvg.innerHTML = `
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#areaGrad)" />
      <path d="${linePath}" fill="none" stroke="${accent}" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round" />`;
    }

    function formatShortDate(dateStr) {
        const [, m, d] = dateStr.split("-");
        return `${parseInt(m)}/${parseInt(d)}`;
    }

    // ── Number animation ──────────────────────────────────────────────────────

    function animateNumber(element, target) {
        const duration = 500;
        const start = parseInt(element.textContent) || 0;
        const diff = target - start;
        if (diff === 0) { element.textContent = target; return; }
        const t0 = performance.now();
        function step(now) {
            const p = Math.min((now - t0) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            element.textContent = Math.round(start + diff * ease);
            if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ── Tabs ───────────────────────────────────────────────────────────────────

    function setupTabs() {
        $$(".tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                $$(".tab").forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                activePeriod = tab.dataset.period;
                renderPeriod();
            });
        });
    }

    // ── Init ───────────────────────────────────────────────────────────────────

    function init() {
        setupTabs();
        fetchPoints();
        setInterval(fetchPoints, 5 * 60 * 1000);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
