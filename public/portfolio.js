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
  borderColor: "#f0b90b",
  backgroundColor: "rgba(240,185,11,.15)",
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

            plugins: {

                legend: {

                    display: false

                }

            },

            scales: {

                x: {

                    display: false,

                    grid: {

                        display: false

                    }

                },

y: {
  beginAtZero: false,
  suggestedMin: 0,
  grace: "10%",
  grid: { color: "rgba(255,255,255,.05)" },
  ticks: { color: "#666" }
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
        portfolioChart.data.labels = [];
        portfolioChart.data.datasets[0].data = [];
        portfolioChart.update();
        return;
    }
    history.sort((a, b) => a.time - b.time);

    // Clamp all values to 0 minimum — never show negative
    const clampedData = history.map(item => Math.max(0, Number(item.claimableProfit || 0)));

    // Remove leading zeros so chart starts when profit actually begins
    let startIndex = 0;
    for (let i = 0; i < clampedData.length; i++) {
        if (clampedData[i] > 0) { startIndex = i; break; }
    }
const MAX_POINTS = 29;
const recentData = clampedData.slice(-MAX_POINTS);
const recentLabels = history.slice(-MAX_POINTS).map((_, i) => i + 2);

// Always start from 0 so chart shows growth from bottom
const trimmedData = [0, ...recentData];
const trimmedLabels = [1, ...recentLabels];

    portfolioChart.data.labels = trimmedLabels.length > 0 ? trimmedLabels : [1];
    portfolioChart.data.datasets[0].data = trimmedData.length > 0 ? trimmedData : [0];
    portfolioChart.update();
}
/* ==========================================
   LOAD HISTORY
========================================== */

async function loadPortfolioHistory(){

    const savedUser =
        JSON.parse(localStorage.getItem("user"));

    if(!savedUser) return;

    try{

        const response = await fetch("/get-portfolio-history",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                email:savedUser.email

            })

        });

        const data = await response.json();

        if(!data.success) return;

        fullHistory = data.history || [];

        drawPortfolioHistory(fullHistory);

    }catch(err){

        console.error(err);

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

if(window.TradingView){

    new TradingView.widget({

        autosize:true,

        interval:"15",

        timezone:"Etc/UTC",

        theme:"dark",

        style:"1",

        locale:"en",

        container_id:"tradingviewChart"

    });

}