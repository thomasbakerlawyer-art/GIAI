/* ==========================================
   PORTFOLIO CHART
========================================== */
let portfolioChart;
let fullHistory = [];

/* ==========================================
   CREATE CHART
========================================== */
function initializePortfolioChart() {
    const canvas = document.getElementById("portfolioChart");
    if (!canvas) return;

    portfolioChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Profit",
                data: [],
                borderColor: function(context) {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return "#f0b90b";
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                    gradient.addColorStop(0, "rgba(240,185,11,0)");
                    gradient.addColorStop(0.2, "rgba(240,185,11,0.4)");
                    gradient.addColorStop(1, "#f0b90b");
                    return gradient;
                },
                backgroundColor: function(context) {
                    const chart = context.chart;
                    const { ctx, chartArea } = chart;
                    if (!chartArea) return "rgba(240,185,11,0.15)";
                    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                    gradient.addColorStop(0, "rgba(240,185,11,0)");
                    gradient.addColorStop(0.3, "rgba(240,185,11,0.08)");
                    gradient.addColorStop(1, "rgba(240,185,11,0.25)");
                    return gradient;
                },
                fill: true,
                borderWidth: 2.5,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                cubicInterpolationMode: "monotone"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false }
                },
                y: {
                    beginAtZero: false,
                    grace: "20%",
                    grid: { color: "rgba(255,255,255,0.05)" },
                    ticks: {
                        color: "#666",
                        maxTicksLimit: 5,
                        callback: function(value) {
                            if (value < 0) return null;
                            if (value >= 1000) return "$" + (value/1000).toFixed(1) + "k";
                            return "$" + value.toFixed(2);
                        }
                    },
                    afterDataLimits: function(axis) {
                        if (axis.min < 0) axis.min = 0;
                    }
                }
            }
        }
    });
}

/* ==========================================
   DRAW HISTORY
========================================== */
function drawPortfolioHistory(history) {
    if (!portfolioChart) return;

    if (!history || history.length === 0) {
        portfolioChart.data.labels = ["Start"];
        portfolioChart.data.datasets[0].data = [0];
        portfolioChart.update();
        return;
    }

    // Sort oldest to newest
    history.sort((a, b) => a.time - b.time);

    // Clamp every value to minimum 0
    const clampedData = history.map(item =>
        Math.max(0, Number(item.claimableProfit || 0))
    );

    // Take last 20 points for a smooth curve
    const MAX_POINTS = 50;
    const recentData = clampedData.slice(-MAX_POINTS);
    const recentHistory = history.slice(-MAX_POINTS);

    // Build time-based labels (hours ago or day)
    const now = Date.now();
    const chartLabels = recentHistory.map(item => {
        const diff = Math.floor((now - item.time) / 60000);
        if (diff < 60) return diff + "m ago";
        if (diff < 1440) return Math.floor(diff/60) + "h ago";
        return Math.floor(diff/1440) + "d ago";
    });

    portfolioChart.data.labels = chartLabels;
    portfolioChart.data.datasets[0].data = recentData;
    portfolioChart.update();
}

/* ==========================================
   LOAD HISTORY
========================================== */
async function loadPortfolioHistory() {
  const savedUser = JSON.parse(localStorage.getItem("user"));
  if (!savedUser) return;
  try {
    const response = await fetch("/get-portfolio-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: savedUser.email })
    });
    const data = await response.json();
    if (!data.success) return;
    fullHistory = data.history || [];

    // Wait for currentUser to be available
    if (!currentUser) {
      console.log("Portfolio history: currentUser not ready, skipping graph clear check");
    } else {
      if (
        Number(currentUser.investmentAmount || 0) <= 0 ||
        Number(currentUser.investmentDuration || 0) <= 0
      ) {
        fullHistory = [];
      }
    }

    drawPortfolioHistory(fullHistory);
  } catch (err) {
    console.error("Portfolio history error:", err);
  }
}

/* ==========================================
   START
========================================== */
initializePortfolioChart();
loadPortfolioHistory();

/* ==========================================
   TRADINGVIEW
========================================== */
if (window.TradingView) {
    new TradingView.widget({
        autosize: true,
        interval: "15",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "en",
        container_id: "tradingviewChart"
    });
}