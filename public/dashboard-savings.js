/* =================================================
   GIAI SAVINGS — dashboard-savings.js
   Joint savings account dashboard.
   Auth: savingsAccount in localStorage
================================================= */

let currentAccount = null;
let savingsChart   = null;
let balanceHidden  = localStorage.getItem("savingsBalanceHidden") === "true";
let selectedDepositAsset  = "BTC";
let selectedWithdrawAsset = "BTC";
let txnOpen = false;

const WALLETS = {
  BTC:  "bc1qa4g38u9mxn43td5mt67jh320sy6nne9tfaewg6",
  ETH:  "0x21b7f254a06F222a1bed905f9d7b13665B42Bb65",
  USDT: "TBkxc6SZkXSYTop9NPJLz3TvLayDSrPedQ"
};

/* ── Auth guard ── */
const _sa = JSON.parse(localStorage.getItem("savingsAccount"));
if (!_sa) window.location.replace("/dashboard.html");

/* ── Boot ── */
window.addEventListener("DOMContentLoaded", async () => {
  initChart();
  await loadAccount();
  fetchPrices();
  setInterval(loadAccount, 8000);
  setInterval(fetchPrices, 60000);
});

/* ═══════════════════════════════════
   LOAD ACCOUNT
═══════════════════════════════════ */
async function loadAccount() {
  const saved = JSON.parse(localStorage.getItem("savingsAccount"));
  if (!saved) { window.location.replace("/dashboard.html"); return; }
  try {
    const res  = await fetch("/get-savings-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: saved.email1 || saved.email })
    });
    const data = await res.json();
    if (!data.success) return;
    currentAccount = data.account;

    // Set interestStartTime if missing
    if (currentAccount.balance > 0 && !currentAccount.interestStartTime) {
      await fetch("/patch-savings-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: currentAccount.accountId,
          interestStartTime: Date.now()
        })
      });
      currentAccount.interestStartTime = Date.now();
    }

    localStorage.setItem("savingsAccount", JSON.stringify(currentAccount));
    render();
    await loadPendingApprovals();
  } catch (e) { console.error(e); }
}

/* ═══════════════════════════════════
   RENDER
═══════════════════════════════════ */
function render() {
  const acc     = currentAccount;
  const balance = Number(acc.balance || 0);
  const interest = Number(acc.totalInterest || 0);
  const deposited = Number(acc.totalDeposited || balance);
  const rate    = Number(acc.interestRate || 0);
  const growth  = deposited > 0
    ? Math.max(0, ((balance - deposited) / deposited) * 100).toFixed(2)
    : "0.00";

  /* Top bar */
  document.getElementById("topBarName").textContent =
    firstNameOf(acc) + "'s Savings";

  /* Joint name */
  document.getElementById("jointNameDisplay").textContent =
    acc.jointName || acc.nickname || "Joint Savings";

  /* Balance */
  setText("savingsBalance",
    "$" + balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

  document.getElementById("interestLine").textContent =
    "+" + fmt(interest) + " interest earned";

  /* Meta */
  document.getElementById("interestRateDisplay").textContent = rate.toFixed(2) + "% / mo";
  document.getElementById("totalDepositedDisplay").textContent = fmt(deposited);

  /* Graph stats */
  document.getElementById("gsDeposited").textContent = fmt(deposited);
  document.getElementById("gsInterest").textContent  = fmt(interest);
  document.getElementById("gsGrowth").textContent    = growth + "%";

  /* Card */
  document.getElementById("cardJointName").textContent = acc.jointName || "—";
  document.getElementById("cardAccountId").textContent = acc.accountId || "—";
  document.getElementById("cardSince").textContent =
    acc.createdAt
      ? new Date(acc.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "—";

  /* Members */
  const n1 = acc.name1 || (acc.email1 || "").split("@")[0];
  const n2 = acc.name2 || (acc.email2 || "").split("@")[0];
  document.getElementById("member1Name").textContent   = n1;
  document.getElementById("member2Name").textContent   = n2;
  document.getElementById("member1Avatar").textContent = n1.charAt(0).toUpperCase();
  document.getElementById("member2Avatar").textContent = n2.charAt(0).toUpperCase();

  /* Notifications dot */
  const hasPending = acc.pendingDeposits > 0 || acc.pendingWithdrawals > 0;
  document.getElementById("notifDot").style.display = hasPending ? "block" : "none";

  /* Chart */
  updateChart();

  /* Transactions */
  renderTransactions();

  /* Balance visibility */
  applyBalanceVisibility();
}
/* Start live interest ticker */
  startLiveInterest();

/* ═══════════════════════════════════
   LIVE INTEREST ENGINE
═══════════════════════════════════ */
let interestTimer = null;

function startLiveInterest() {
  if (interestTimer) clearInterval(interestTimer);

  interestTimer = setInterval(() => {
    const acc     = currentAccount;
    const balance = Number(acc.balance || 0);
    const rate    = Number(acc.interestRate || 0);
    const start   = Number(acc.interestStartTime || 0);

if (!balance || !rate) return;
const effectiveStart = start || Date.now();

const elapsed      = now - effectiveStart;
const msPerMonth   = 30 * 24 * 60 * 60 * 1000;
const monthlyRate  = rate / 100;
const liveInterest = balance * monthlyRate * (elapsed / msPerMonth);

    /* Update interest line */
    document.getElementById("interestLine").textContent =
      "+" + fmt(liveInterest) + " interest earned";

    /* Update graph stat */
    document.getElementById("gsInterest").textContent = fmt(liveInterest);

    /* Update growth % */
    const deposited = Number(acc.totalDeposited || balance);
    const growth = deposited > 0
      ? Math.max(0, ((balance + liveInterest - deposited) / deposited) * 100).toFixed(2)
      : "0.00";
    document.getElementById("gsGrowth").textContent = growth + "%";

  }, 1000); // ticks every second
}

function stopLiveInterest() {
  if (interestTimer) clearInterval(interestTimer);
  interestTimer = null;
}

/* ═══════════════════════════════════
   CHART
═══════════════════════════════════ */
function initChart() {
  const canvas = document.getElementById("savingsChart");
  if (!canvas) return;

  savingsChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: "#f0b90b",
        backgroundColor: ctx => {
          const { chartArea, ctx: c } = ctx.chart;
          if (!chartArea) return "rgba(240,185,11,0.1)";
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, "rgba(240,185,11,0.2)");
          g.addColorStop(1, "rgba(240,185,11,0)");
          return g;
        },
        fill: true,
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        cubicInterpolationMode: "monotone"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          beginAtZero: false,
          grace: "15%",
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#6b6b7a",
            maxTicksLimit: 4,
            callback: v => v >= 1000
              ? "$" + (v / 1000).toFixed(1) + "k"
              : "$" + v.toFixed(0)
          },
          afterDataLimits: a => { if (a.min < 0) a.min = 0; }
        }
      }
    }
  });
}

function updateChart() {
  if (!savingsChart || !currentAccount) return;
  const balance  = Number(currentAccount.balance || 0);
  const start    = Number(currentAccount.interestStartTime || Date.now());
  const rate     = Number(currentAccount.interestRate || 0);
  const now      = Date.now();

  // Build 10 points from start to now
  const points   = 10;
  const labels   = [];
  const values   = [];
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i <= points; i++) {
    const t       = start + ((now - start) * (i / points));
    const elapsed = t - start;
    const interest = balance * (rate / 100) * (elapsed / msPerMonth);
    values.push(parseFloat((balance + interest).toFixed(2)));

    const diff = Math.floor((now - t) / 60000);
    if (diff < 60)        labels.push(diff + "m ago");
    else if (diff < 1440) labels.push(Math.floor(diff / 60) + "h ago");
    else                  labels.push(Math.floor(diff / 1440) + "d ago");
  }

  // Last label is always "Now"
  labels[labels.length - 1] = "Now";

  savingsChart.data.labels             = labels;
  savingsChart.data.datasets[0].data   = values;
  savingsChart.update();
}

/* ═══════════════════════════════════
   TRANSACTIONS
═══════════════════════════════════ */
function renderTransactions() {
  const container = document.getElementById("transactionList");
  if (!container) return;

  const txs = (currentAccount.transactions || []).slice(0, 40);

  if (txs.length === 0) {
    container.innerHTML = `<div class="txn-empty">No transactions yet</div>`;
    return;
  }

  container.innerHTML = txs.map(tx => {
    const isDeposit  = tx.type?.toLowerCase().includes("deposit");
    const isInterest = tx.type?.toLowerCase().includes("interest");
    const isWithdraw = tx.type?.toLowerCase().includes("withdraw");

    const iconClass = isInterest ? "int" : isDeposit ? "dep" : "wd";
    const icon      = isInterest
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d26a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`
      : isDeposit
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0b90b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>`;

    const statusClass = (tx.status || "approved").toLowerCase();
    const amtClass    = isWithdraw ? "neg" : "pos";
    const sign        = isWithdraw ? "−" : "+";

    return `
    <div class="txn-row">
      <div class="txn-icon ${iconClass}">${icon}</div>
      <div class="txn-info">
        <div class="txn-type">${tx.type}</div>
        <div class="txn-date">${new Date(tx.date).toLocaleString()}</div>
        <span class="txn-status ${statusClass}">${tx.status || "Approved"}</span>
      </div>
      <div class="txn-amount ${amtClass}">${sign}${fmt(tx.amount)}</div>
    </div>`;
  }).join("");
}

function toggleTransactions() {
  txnOpen = !txnOpen;
  const body  = document.getElementById("txnBody");
  const arrow = document.getElementById("txnArrow");
  body.classList.toggle("open", txnOpen);
  arrow.classList.toggle("open", txnOpen);
}

/* ═══════════════════════════════════
   PENDING PARTNER APPROVALS
═══════════════════════════════════ */
async function loadPendingApprovals() {
  const saved = JSON.parse(localStorage.getItem("savingsAccount"));
  if (!saved) return;

  try {
    const myEmail = saved.email1 || saved.email;
    const res  = await fetch("/get-savings-pending-approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: myEmail })
    });
    const data = await res.json();
    const pending = data.pending || [];

    const banner = document.getElementById("approvalBanner");
    const list   = document.getElementById("approvalList");

    if (pending.length === 0) {
      banner.classList.remove("visible");
      return;
    }

    banner.classList.add("visible");
    list.innerHTML = pending.map(w => `
      <div class="approval-item">
        <div class="approval-item-desc">
          Withdrawal request: <b>${fmt(w.amount)}</b> ${w.asset || "USDT"}
          <br><span style="font-size:12px;color:#6b6b7a;">To: ${w.destinationWallet}</span>
        </div>
        <div class="approval-item-btns">
          <button class="btn-approve" onclick="partnerApprove(${w.id})">Approve</button>
          <button class="btn-reject"  onclick="partnerReject(${w.id})">Reject</button>
        </div>
      </div>`).join("");
  } catch (e) { console.error(e); }
}

async function partnerApprove(id) {
  const saved = JSON.parse(localStorage.getItem("savingsAccount"));
  const res   = await fetch("/partner-approve-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: saved.email1 || saved.email, withdrawalId: id })
  });
  const data = await res.json();
  toast(data.message || "Approved.");
  await loadAccount();
}

async function partnerReject(id) {
  const saved = JSON.parse(localStorage.getItem("savingsAccount"));
  const res   = await fetch("/partner-reject-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: saved.email1 || saved.email, withdrawalId: id })
  });
  const data = await res.json();
  toast(data.message || "Rejected.");
  await loadAccount();
}

/* ═══════════════════════════════════
   DEPOSIT SHEET
═══════════════════════════════════ */
function openDepositSheet() {
  document.getElementById("depositOverlay").classList.add("open");
}
function closeDepositSheet() {
  document.getElementById("depositOverlay").classList.remove("open");
}

function selectAsset(asset, btn) {
  selectedDepositAsset = asset;
  document.querySelectorAll("#depositOverlay .asset-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("depositAssetLabel").textContent  = asset + " Network";
  document.getElementById("depositWalletAddr").textContent  = WALLETS[asset] || "—";
}

function copyWalletAddr() {
  const addr = WALLETS[selectedDepositAsset];
  navigator.clipboard.writeText(addr).then(() => toast("Address copied!"));
}

async function submitDeposit() {
  const amount = Number(document.getElementById("depositAmount").value);
  if (!amount || amount <= 0) { toast("Enter a valid amount."); return; }

  const saved = JSON.parse(localStorage.getItem("savingsAccount"));

  const res  = await fetch("/request-savings-deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:  saved.email1 || saved.email,
      amount,
      asset:  selectedDepositAsset
    })
  });
  const data = await res.json();
  toast(data.message || (data.success ? "Deposit submitted." : "Failed."));
  if (data.success) {
    document.getElementById("depositAmount").value = "";
    closeDepositSheet();
    await loadAccount();
  }
}

/* ═══════════════════════════════════
   WITHDRAW SHEET
═══════════════════════════════════ */
function openWithdrawSheet() {
  document.getElementById("withdrawOverlay").classList.add("open");
}
function closeWithdrawSheet() {
  document.getElementById("withdrawOverlay").classList.remove("open");
}

function selectWithdrawAsset(asset, btn) {
  selectedWithdrawAsset = asset;
  document.querySelectorAll("#withdrawOverlay .asset-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

async function submitWithdraw() {
  const amount = Number(document.getElementById("withdrawAmount").value);
  const wallet = document.getElementById("withdrawWallet").value.trim();

  if (!amount || amount <= 0) { toast("Enter a valid amount."); return; }
  if (!wallet)                { toast("Enter destination wallet."); return; }
  if (amount > Number(currentAccount.balance || 0)) {
    toast("Insufficient balance."); return;
  }

  const saved = JSON.parse(localStorage.getItem("savingsAccount"));

  const res  = await fetch("/request-savings-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email:             saved.email1 || saved.email,
      amount,
      asset:             selectedWithdrawAsset,
      destinationWallet: wallet
    })
  });
  const data = await res.json();
  toast(data.message || (data.success ? "Submitted." : "Failed."));
  if (data.success) {
    document.getElementById("withdrawAmount").value = "";
    document.getElementById("withdrawWallet").value = "";
    closeWithdrawSheet();
    await loadAccount();
  }
}

/* ═══════════════════════════════════
   PROFILE SHEET
═══════════════════════════════════ */
function openProfileSheet() {
  if (currentAccount) {
    document.getElementById("profileContent").innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="background:#141418;border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:#6b6b7a;margin-bottom:3px;">JOINT ACCOUNT</div>
          <div style="font-size:16px;font-weight:700;">${currentAccount.jointName || "—"}</div>
        </div>
        <div style="background:#141418;border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:#6b6b7a;margin-bottom:3px;">ACCOUNT ID</div>
          <div style="font-size:14px;font-weight:600;color:#f0b90b;">${currentAccount.accountId || "—"}</div>
        </div>
        <div style="background:#141418;border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:#6b6b7a;margin-bottom:3px;">HOLDER 1</div>
          <div style="font-size:14px;font-weight:600;">${currentAccount.name1 || currentAccount.email1 || "—"}</div>
        </div>
        <div style="background:#141418;border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:#6b6b7a;margin-bottom:3px;">HOLDER 2</div>
          <div style="font-size:14px;font-weight:600;">${currentAccount.name2 || currentAccount.email2 || "—"}</div>
        </div>
        <div style="background:#141418;border-radius:12px;padding:14px;">
          <div style="font-size:11px;color:#6b6b7a;margin-bottom:3px;">BALANCE</div>
          <div style="font-size:18px;font-weight:800;color:#f0b90b;">${fmt(currentAccount.balance)}</div>
        </div>
      </div>`;
  }
  document.getElementById("profileOverlay").classList.add("open");
}

function closeProfileSheet() {
  document.getElementById("profileOverlay").classList.remove("open");
}

/* ═══════════════════════════════════
   CRYPTO PRICES
═══════════════════════════════════ */
async function fetchPrices() {
  try {
    const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin&vs_currencies=usd&include_24hr_change=true");
    const data = await res.json();
    setPrice("BTC", data.bitcoin?.usd, data.bitcoin?.usd_24h_change);
    setPrice("ETH", data.ethereum?.usd, data.ethereum?.usd_24h_change);
    setPrice("BNB", data.binancecoin?.usd, data.binancecoin?.usd_24h_change);
  } catch { /* silently fail */ }
}

function setPrice(sym, price, change) {
  const pEl = document.getElementById("price" + sym);
  const cEl = document.getElementById("change" + sym);
  if (!pEl) return;
  if (price) {
    pEl.textContent = price >= 1000
      ? "$" + price.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : "$" + price.toFixed(2);
  }
  if (cEl && change !== undefined) {
    const up = change >= 0;
    cEl.textContent = (up ? "+" : "") + change.toFixed(2) + "%";
    cEl.className   = "price-change " + (up ? "up" : "down");
  }
}

/* ═══════════════════════════════════
   NOTIFICATIONS PANEL (simple toggle)
═══════════════════════════════════ */
function toggleNotifications() {
  if (!currentAccount) return;
  const pd = currentAccount.pendingDeposits    || 0;
  const pw = currentAccount.pendingWithdrawals || 0;

  if (pd === 0 && pw === 0) {
    toast("No pending notifications.");
    return;
  }

  let msg = "";
  if (pd > 0) msg += pd + " deposit" + (pd > 1 ? "s" : "") + " pending. ";
  if (pw > 0) msg += pw + " withdrawal" + (pw > 1 ? "s" : "") + " pending.";
  toast(msg.trim());
}

/* ═══════════════════════════════════
   BALANCE HIDE / SHOW
═══════════════════════════════════ */
function toggleBalanceVisibility() {
  balanceHidden = !balanceHidden;
  localStorage.setItem("savingsBalanceHidden", balanceHidden);
  if (!balanceHidden) {
    const el = document.getElementById("savingsBalance");
    if (el && el.dataset.real) el.textContent = el.dataset.real;
  }
  applyBalanceVisibility();
}

function applyBalanceVisibility() {
  const el  = document.getElementById("savingsBalance");
  const eye = document.getElementById("eyeIcon");
  if (!el) return;

  if (balanceHidden) {
    if (el.textContent !== "••••") el.dataset.real = el.textContent;
    el.textContent = "••••";
  }

  if (eye) {
    eye.innerHTML = balanceHidden
      ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

/* ═══════════════════════════════════
   NAVIGATION HELPERS
═══════════════════════════════════ */
function switchBackToMain() {
  window.location.href = "/dashboard.html";
}

function logoutSavings() {
  localStorage.removeItem("savingsAccount");
  window.location.href = "/dashboard.html";
}

function scrollTop() {
  document.querySelector(".scroll-content")?.scrollTo({ top: 0, behavior: "smooth" });
}

/* ═══════════════════════════════════
   UTILITIES
═══════════════════════════════════ */
function fmt(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function firstNameOf(acc) {
  const saved = JSON.parse(localStorage.getItem("savingsAccount"));
  const myEmail = (saved?.email1 || saved?.email || "").toLowerCase();
  if (acc.email1?.toLowerCase() === myEmail) return acc.name1 || "You";
  return acc.name2 || "You";
}

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent   = msg;
  t.style.opacity = "1";
  setTimeout(() => { t.style.opacity = "0"; }, 2500);
}

/* ── Visibility on load ── */
window.addEventListener("load", () => {
  document.body.style.visibility = "visible";
});