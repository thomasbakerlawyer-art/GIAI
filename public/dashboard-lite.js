let currentUser = null;
let balanceHidden = localStorage.getItem("liteBalanceHidden") === "true";

let selectedPlan = null;
let selectedAsset = "BTC";

const WALLETS = {
  BTC:  "bc1qa4g38u9mxn43td5mt67jh320sy6nne9tfaewg6",
  ETH:  "0x4B0897b0513fdBeEc7C469D9aF4fA6C0752aBea7",
  USDT: "TXo9nGyk3JZqjSSMhh6ZWLDLzXqNZDTt6y"
};

let savedUser = null;
try {
  savedUser = JSON.parse(localStorage.getItem("user"));
} catch {
  savedUser = null;
}
if (!savedUser) window.location.replace("/signup.html");

// This script tag sits at the end of <body>, so the DOM is already
// ready by the time this file runs. Reveal the page immediately instead
// of waiting for window "load", which blocks on every resource
// (including the Chart.js CDN) and can hang the page hidden indefinitely
// if that request is slow, blocked, or offline.
document.body.style.visibility = "visible";

window.addEventListener("DOMContentLoaded", async () => {
  setupOverlayBackdropClose();
  resetDepositForm();
  await loadUser();
  setInterval(loadUser, 5000);
});

/* ── Load / render user data ── */
async function loadUser() {
  const saved = JSON.parse(localStorage.getItem("user"));
  if (!saved) { window.location.replace("/signup.html"); return; }

  try {
    const res = await fetch("/get-lite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: saved.email })
    });

    const data = await res.json();
    if (!data.success) return;

    currentUser = data.user;
    updateDashboard();
  } catch {
    /* network hiccup - keep last known state, next interval will retry */
  }
}

function updateDashboard() {
  setVal("welcomeName", currentUser.name || "");
  setVal("pendingDeposits", currentUser.pendingDeposits || 0);
  setVal("pendingWithdrawals", currentUser.pendingWithdrawals || 0);
  updatePortfolio();
  updateTransactions();
  updateReinvestButton();
  applyBalanceVisibility();
}

function updatePortfolio() {
  const balance   = Number(currentUser.liteBalance || 0);
  const amount    = Number(currentUser.liteInvestmentAmount || 0);
  const expected  = Number(currentUser.expectedProfit || 0);
  const claimable = Number(currentUser.claimableProfit || 0);
  const today     = Number(currentUser.todayProfit || 0);
  const roi       = Number(currentUser.roi || 0);
  const days      = Number(currentUser.daysRemaining || 0);
  const progress  = Number(currentUser.progress || 0);

  const fmt = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  setVal("portfolioBalance", fmt(balance));
  setVal("investmentAmount", fmt(amount));
  setVal("expectedProfit",   fmt(expected));
  setVal("claimableProfit",  fmt(claimable));
  setVal("todayProfit",      fmt(today));
  setVal("roiPercent",       roi.toFixed(2) + "%");
  setVal("daysRemaining",    days);

  const bar = document.getElementById("progressFill");
  if (bar) bar.style.width = Math.max(0, Math.min(100, progress * 100)) + "%";

  updateLiteChart(currentUser.litePortfolioHistory || []);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) { el.dataset.real = val; el.innerText = val; }
}

function updateReinvestButton() {
  const btn = document.getElementById("reinvestBtn");
  if (!btn) return;
  const start  = Number(currentUser.liteInvestmentStart  || 0);
  const amount = Number(currentUser.liteInvestmentAmount || 0);
  const done   = currentUser.liteCycleCompleted === true;

  if (start > 0 && amount > 0) {
    btn.disabled = true;
    btn.className = "reinvest-locked";
    btn.innerText = "Locked";
    btn.onclick = null;
    return;
  }
  if (done) {
    btn.disabled = false;
    btn.className = "reinvest-ready";
    btn.innerText = "Reinvest Now";
    btn.onclick = openReinvest;
    return;
  }
  btn.disabled = true;
  btn.className = "reinvest-locked";
  btn.innerText = "Locked";
  btn.onclick = null;
}

/* ── Transaction history ── */
function updateTransactions() {
  const container = document.getElementById("transactionList");
  if (!container) return;

  const txs = currentUser.liteTransactions || [];
  if (txs.length === 0) {
    container.className = "txn-empty";
    container.textContent = "No transactions yet";
    return;
  }

  container.className = "";
  container.innerHTML = "";

  txs.slice().reverse().forEach(tx => {
    const type = String(tx.type || "").toLowerCase();
    const isWithdraw = type.includes("withdraw");
    const isDeposit  = type.includes("deposit");
    const iconClass  = isDeposit ? "dep" : isWithdraw ? "wd" : "int";
    const amountClass = isWithdraw ? "neg" : "pos";
    const sign = isWithdraw ? "-" : "+";

    const row = document.createElement("div");
    row.className = "txn-row";

    const icon = document.createElement("div");
    icon.className = "txn-icon " + iconClass;
    icon.innerHTML = txnIconSvg(iconClass);

    const info = document.createElement("div");
    info.className = "txn-info";
    const typeEl = document.createElement("div");
    typeEl.className = "txn-type";
    typeEl.textContent = tx.type || "Transaction";
    const dateEl = document.createElement("div");
    dateEl.className = "txn-date";
    dateEl.textContent = tx.date ? new Date(tx.date).toLocaleString() : "";
    info.appendChild(typeEl);
    info.appendChild(dateEl);

    const amountEl = document.createElement("div");
    amountEl.className = "txn-amount " + amountClass;
    amountEl.textContent = sign + "$" + Number(tx.amount || 0).toLocaleString();

    row.appendChild(icon);
    row.appendChild(info);
    row.appendChild(amountEl);
    container.appendChild(row);
  });
}

function txnIconSvg(kind) {
  if (kind === "dep") {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0b90b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
  }
  if (kind === "wd") {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
  }
  return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d26a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';
}

function toggleTransactions() {
  const body  = document.getElementById("txnBody");
  const arrow = document.getElementById("txnArrow");
  if (!body) return;
  body.classList.toggle("open");
  if (arrow) arrow.classList.toggle("open");
}

/* ── Chart ── */
let liteChart = null;

function updateLiteChart(history) {
  const canvas = document.getElementById("portfolioChart");
  if (!canvas || typeof Chart === "undefined") return;

  const balance = Number(currentUser.liteBalance || 0);

  if (!liteChart) {
    liteChart = new Chart(canvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [{
          data: [],
          borderColor: "#f0b90b",
          backgroundColor: "rgba(240,185,11,0.08)",
          fill: true,
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: {
            beginAtZero: false,
            grid: { color: "rgba(255,255,255,0.04)" },
            ticks: {
              color: "#555",
              maxTicksLimit: 4,
              callback: v => v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v.toFixed(0)
            }
          }
        }
      }
    });
  }

  if (!history || history.length === 0) {
    liteChart.data.labels = ["Start", "Now"];
    liteChart.data.datasets[0].data = [0, balance];
    liteChart.update();
    return;
  }

  const MAX = 30;
  const recent = history.slice(-MAX);
  const labels = recent.map(h => {
    const diff = Math.floor((Date.now() - h.time) / 60000);
    if (diff < 60) return diff + "m";
    if (diff < 1440) return Math.floor(diff / 60) + "h";
    return Math.floor(diff / 1440) + "d";
  });
  const values = recent.map(h => Math.max(0, Number(h.claimableProfit || 0)));
  if (values.length) values[values.length - 1] = Number(currentUser.claimableProfit || 0);

  liteChart.data.labels = labels;
  liteChart.data.datasets[0].data = values;
  liteChart.update();
}

/* ── Overlay helpers ── */
function openOverlay(id) {
  const ov = document.getElementById(id);
  if (ov) ov.classList.add("open");
}
function closeOverlay(id) {
  const ov = document.getElementById(id);
  if (ov) ov.classList.remove("open");
}
function setupOverlayBackdropClose() {
  document.querySelectorAll(".overlay").forEach(ov => {
    ov.addEventListener("click", (e) => {
      if (e.target === ov) ov.classList.remove("open");
    });
  });
}

/* ── Deposit ── */
function openDeposit() {
  openOverlay("depositOverlay");
}

function closeDeposit() {
  closeOverlay("depositOverlay");
  resetDepositForm();
}

function resetDepositForm() {
  selectedPlan = null;
  selectedAsset = "BTC";

  const amt = document.getElementById("depositAmount");
  if (amt) amt.value = "";

  document.querySelectorAll(".plan-option").forEach(p => p.classList.remove("selected"));
  document.querySelectorAll(".asset-btn").forEach((b, i) => b.classList.toggle("active", i === 0));

  const label = document.getElementById("depositAssetLabel");
  const addr  = document.getElementById("depositWalletAddr");
  if (label) label.textContent = "BTC Network";
  if (addr)  addr.textContent  = WALLETS.BTC;
}

function selectPlanOption(name, min, max, el) {
  selectedPlan = { name, min, max };
  document.querySelectorAll(".plan-option").forEach(p => p.classList.remove("selected"));
  if (el) el.classList.add("selected");
}

function selectAsset(asset, el) {
  selectedAsset = asset;
  document.querySelectorAll(".asset-btn").forEach(b => b.classList.remove("active"));
  if (el) el.classList.add("active");

  const label = document.getElementById("depositAssetLabel");
  const addr  = document.getElementById("depositWalletAddr");
  if (label) label.textContent = asset + " Network";
  if (addr)  addr.textContent  = WALLETS[asset] || "";
}

function copyWalletAddr() {
  const addr = document.getElementById("depositWalletAddr");
  if (!addr || !addr.textContent) return;
  navigator.clipboard.writeText(addr.textContent)
    .then(() => showToast("Address copied"))
    .catch(() => showToast("Could not copy address", "error"));
}

async function submitDeposit() {
  if (!selectedPlan) { showToast("Please select a plan.", "error"); return; }

  const amountInput = document.getElementById("depositAmount");
  const amount = Number(amountInput ? amountInput.value : 0);
  if (!amount || amount <= 0) { showToast("Enter a valid amount.", "error"); return; }
  if (amount < selectedPlan.min) { showToast(`Minimum for ${selectedPlan.name} is $${selectedPlan.min.toLocaleString()}`, "error"); return; }
  if (amount > selectedPlan.max) { showToast(`Maximum for ${selectedPlan.name} is $${selectedPlan.max.toLocaleString()}`, "error"); return; }

  const email = getUserEmail();
  if (!email) { showToast("Session expired. Please log in again.", "error"); return; }

  try {
    const res = await fetch("/request-lite-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount, plan: selectedPlan.name, asset: selectedAsset })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Deposit submitted. Admin will confirm shortly.");
      closeDeposit();
      await loadUser();
    } else {
      showToast(data.message || "Deposit failed.", "error");
    }
  } catch {
    showToast("Something went wrong.", "error");
  }
}

/* ── Withdraw ── */
function openWithdraw() {
  openOverlay("withdrawOverlay");
}

function closeWithdraw() {
  closeOverlay("withdrawOverlay");
  const el = document.getElementById("withdrawAmount");
  if (el) el.value = "";
}

async function submitWithdraw() {
  const amountInput = document.getElementById("withdrawAmount");
  const amount = Number(amountInput ? amountInput.value : 0);
  if (!amount || amount <= 0) { showToast("Enter a valid amount.", "error"); return; }

  const email = getUserEmail();
  if (!email) { showToast("Session expired. Please log in again.", "error"); return; }

  try {
    const res = await fetch("/request-lite-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || "Withdrawal submitted.");
      closeWithdraw();
      await loadUser();
    } else {
      showToast(data.message || "Withdrawal failed.", "error");
    }
  } catch {
    showToast("Something went wrong.", "error");
  }
}

/* ── Reinvest ── */
function openReinvest() {
  openOverlay("reinvestOverlay");
}

function closeReinvest() {
  closeOverlay("reinvestOverlay");
  const el = document.getElementById("reinvestTopupAmount");
  if (el) el.value = "";
}

async function submitReinvestment() {
  const topupInput = document.getElementById("reinvestTopupAmount");
  const topup = Number(topupInput ? topupInput.value : 0);
  if (!topup || topup <= 0) { showToast("Enter a top-up amount.", "error"); return; }

  const email = getUserEmail();
  if (!email) { showToast("Session expired. Please log in again.", "error"); return; }

  try {
    const res = await fetch("/request-reinvestment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, topup })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Reinvestment submitted.");
      closeReinvest();
      await loadUser();
    } else {
      showToast(data.message || "Reinvestment failed.", "error");
    }
  } catch {
    showToast("Something went wrong.", "error");
  }
}

/* ── Profile ── */
function openProfile() {
  const saved = JSON.parse(localStorage.getItem("user") || "null");
  const name  = (currentUser && currentUser.name)  || (saved && saved.name)  || "—";
  const email = (currentUser && currentUser.email) || (saved && saved.email) || "—";
  const plan  = (currentUser && currentUser.litePlan) || "No active plan";
  const rank  = (currentUser && currentUser.rank) || (saved && saved.rank) || "Investor";

  const container = document.getElementById("profileContent");
  if (container) {
    container.innerHTML = "";
    [
      ["Name", name],
      ["Email", email],
      ["Active Plan", plan],
      ["Rank", rank]
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "profile-row";
      const l = document.createElement("span");
      l.className = "profile-row-label";
      l.textContent = label;
      const v = document.createElement("span");
      v.className = "profile-row-value";
      v.textContent = value;
      row.appendChild(l);
      row.appendChild(v);
      container.appendChild(row);
    });
  }

  openOverlay("profileOverlay");
}

function closeProfile() {
  closeOverlay("profileOverlay");
}

function logoutUser() {
  localStorage.removeItem("user");
  window.location.href = "/index.html";
}

/* ── Balance visibility ── */
function toggleBalanceVisibility() {
  balanceHidden = !balanceHidden;
  localStorage.setItem("liteBalanceHidden", balanceHidden);
  applyBalanceVisibility();
}

function applyBalanceVisibility() {
  const ids = ["portfolioBalance", "expectedProfit", "claimableProfit", "investmentAmount", "daysRemaining", "todayProfit", "roiPercent"];
  const eye = document.getElementById("eyeIcon");
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (balanceHidden) {
      if (el.innerText !== "••••") el.dataset.real = el.innerText;
      el.innerText = "••••";
    } else {
      if (el.dataset.real) el.innerText = el.dataset.real;
    }
  });
  if (eye) {
    eye.innerHTML = balanceHidden
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  }
}

/* ── Helpers ── */
function getUserEmail() {
  if (currentUser && currentUser.email) return currentUser.email;
  const saved = JSON.parse(localStorage.getItem("user") || "null");
  return saved ? saved.email : null;
}

function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = type === "error" ? "error" : "";
  t.style.opacity = "1";
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

window.addEventListener("load", () => {
  // Safety net in case something above threw before the visibility
  // line ran (shouldn't happen, but this guarantees the page isn't
  // stuck hidden either way).
  document.body.style.visibility = "visible";
});