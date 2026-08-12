/* =========================
   DASHBOARD LITE — dashboard-lite.js
   Pure investment dashboard. No representatives.
   Shares the same backend profit engine as the
   representative dashboard.
========================= */

let currentUser = null;
let balanceHidden = localStorage.getItem("balanceHidden") === "true";

/* ── Auth Guard ── */
const savedUser = JSON.parse(localStorage.getItem("user"));
if (!savedUser) {
  window.location.replace("/signup.html");
}

/* ── Page Load ── */
window.addEventListener("DOMContentLoaded", async () => {
  await loadUser();
  setInterval(loadUser, 5000);
});

/* ── Load User ── */
async function loadUser() {
  const saved = JSON.parse(localStorage.getItem("user"));
  if (!saved) { window.location.replace("/signup.html"); return; }

  const res = await fetch("/get-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: saved.email })
  });

  const data = await res.json();
  if (!data.success) {
    if (data.message?.includes("suspended")) {
      alert(data.message);
      localStorage.removeItem("user");
      window.location.href = "index.html";
    }
    return;
  }

  currentUser = data.user;
  updateDashboard();
}

/* ── Update Dashboard ── */
function updateDashboard() {
  updatePortfolio();
  updateTransactions();
  updateReinvestButton();

  document.getElementById("pendingDeposits").innerText   = currentUser.pendingDeposits  || 0;
  document.getElementById("pendingWithdrawals").innerText = currentUser.pendingWithdrawals || 0;
  document.getElementById("welcomeName").innerText        = currentUser.name || "";

  applyBalanceVisibility();
}

/* ── Portfolio — ONE calculation, shared by all displays and chart ── */
function updatePortfolio() {
  const amount        = Number(currentUser.investmentAmount || 0);
  const profitPercent = Number(currentUser.profitPercent    || 0);
  const duration      = Number(currentUser.investmentDuration || 0);
  const start         = Number(currentUser.investmentStart  || 0);
  const now           = Date.now();

  document.getElementById("portfolioBalance").textContent =
    "$" + Number(currentUser.balance || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });

  document.getElementById("investmentAmount").textContent =
    "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });

  if (!duration || !start) {
    document.getElementById("expectedProfit").innerText  = "$0.00";
    document.getElementById("claimableProfit").innerText = "$0.00";
    document.getElementById("daysRemaining").innerText   = "0";
    document.getElementById("progressFill").style.width  = "0%";
    document.getElementById("todayProfit").innerText     = "$0.00";
    document.getElementById("roiPercent").innerText      = "0.00%";
    return;
  }

  const endTime        = start + duration * 86400000;
  const progress       = Math.min(Math.max((now - start) / (endTime - start), 0), 1);
  const expectedProfit = amount * (profitPercent / 100);
  const claimable      = expectedProfit * progress;
  const todayProfit    = duration > 0 ? expectedProfit / duration : 0;
  const roi            = amount > 0 ? (claimable / amount) * 100 : 0;
  const daysRemaining  = Math.max(0, Math.ceil((endTime - now) / 86400000));

  document.getElementById("expectedProfit").innerText  =
    "$" + expectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 });
  document.getElementById("claimableProfit").innerText =
    "$" + claimable.toLocaleString(undefined, { maximumFractionDigits: 2 });
  document.getElementById("progressFill").style.width  = progress * 100 + "%";
  document.getElementById("daysRemaining").innerText   = daysRemaining;
  document.getElementById("todayProfit").innerText     =
    "$" + todayProfit.toLocaleString(undefined, { maximumFractionDigits: 2 });
  document.getElementById("roiPercent").innerText      = roi.toFixed(2) + "%";

  /* Sync chart with computed claimable — same value, no drift */
  if (typeof drawPortfolioHistory === "function" && currentUser.portfolioHistory) {
    const history = currentUser.portfolioHistory.map((h, i) => {
      if (i === currentUser.portfolioHistory.length - 1) {
        return { ...h, claimableProfit: claimable };
      }
      return h;
    });
    drawPortfolioHistory(history);
  }
}

/* ── Reinvest Button ── */
function updateReinvestButton() {
  const btn = document.getElementById("reinvestBtn");
  if (!btn) return;

  const start          = Number(currentUser.investmentStart  || 0);
  const amount         = Number(currentUser.investmentAmount || 0);
  const cycleCompleted = currentUser.cycleCompleted === true;
  const activeInv      = start > 0 && amount > 0;

  if (activeInv) {
    btn.disabled = true;
    btn.classList.add("reinvest-locked");
    btn.classList.remove("reinvest-ready");
    btn.innerText = "Locked";
    return;
  }

  if (cycleCompleted) {
    if (currentUser.allowReinvestment === true) {
      btn.disabled = false;
      btn.classList.remove("reinvest-locked");
      btn.classList.add("reinvest-ready");
      btn.innerText = "Reinvest Now";
    } else {
      btn.disabled = true;
      btn.classList.add("reinvest-locked");
      btn.classList.remove("reinvest-ready");
      btn.innerText = "Contact Support";
      btn.title = "Please contact support for your next investment.";
    }
    return;
  }

  btn.disabled = true;
  btn.classList.add("reinvest-locked");
  btn.classList.remove("reinvest-ready");
  btn.innerText = "Locked";
}

/* ── Transactions ── */
function updateTransactions() {
  const container = document.getElementById("transactionList");
  if (!container) return;
  container.innerHTML = "";
  const txs = currentUser.transactions || [];
  if (txs.length === 0) {
    container.innerHTML = `<div class="transaction">No transactions yet</div>`;
    return;
  }
  txs.forEach(tx => {
    container.innerHTML += `
      <div class="transaction">
        <b>${tx.type}</b><br>
        $${Number(tx.amount || 0).toLocaleString()}<br>
        <small>${new Date(tx.date).toLocaleString()}</small>
      </div>`;
  });
}

/* ── Deposit ── */
function openDeposit() {
  document.getElementById("depositPopup").style.display = "flex";
}
function closeDeposit() {
  document.getElementById("depositPopup").style.display = "none";
}

function continueDeposit() {
  const amount = Number(document.getElementById("depositAmount").value);
  const plan   = document.getElementById("depositPlan").value;

  if (!plan)   { alert("Please select a plan."); return; }
  if (!amount || amount <= 0) { alert("Please enter a valid amount."); return; }

  /* Validate amount matches plan range */
  const ranges = {
    "Starter Plan":    [200,   999],
    "Standard Plan":   [1000,  2999],
    "Premium Plan":    [3000,  7999],
    "Contact Manager": [8000,  14999],
    "Capital Boost":   [15000, 44999],
    "Rapid Return":    [45000, Infinity]
  };
  const [min, max] = ranges[plan] || [0, Infinity];
  if (amount < min) { alert("Minimum for " + plan + " is $" + min.toLocaleString()); return; }
  if (amount > max) { alert("Maximum for " + plan + " is $" + max.toLocaleString()); return; }

  localStorage.setItem("litePendingPlan",   plan);
  localStorage.setItem("litePendingAmount", amount);
  closeDeposit();
  showWallets();
}

function showWallets() {
  document.getElementById("walletPopup").style.display = "flex";
}
function closeWalletPopup() {
  document.getElementById("walletPopup").style.display = "none";
}

async function submitDeposit() {
  const plan   = localStorage.getItem("litePendingPlan");
  const amount = localStorage.getItem("litePendingAmount");
  if (!plan || !amount) { alert("No plan selected."); return; }

  const user = JSON.parse(localStorage.getItem("user"));

  try {
    const res = await fetch("/request-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount,
        plan,
        representative: null   /* lite mode — no representative */
      })
    });
    const data = await res.json();
    if (data.success) {
      alert("Deposit submitted. Admin will confirm shortly.");
      localStorage.removeItem("litePendingPlan");
      localStorage.removeItem("litePendingAmount");
      closeWalletPopup();
    } else {
      alert(data.message || "Deposit failed.");
    }
  } catch {
    alert("Something went wrong. Please try again.");
  }
}

/* ── Withdraw ── */
function openWithdraw() {
  document.getElementById("withdrawPopup").style.display = "flex";
}
function closeWithdraw() {
  document.getElementById("withdrawPopup").style.display = "none";
}

async function submitWithdraw() {
  const amount = Number(document.getElementById("withdrawAmount").value);
  if (!amount || amount <= 0) { alert("Please enter a valid amount."); return; }

  const btn = document.querySelector("#withdrawPopup .withdraw-btn");
  if (btn) { btn.disabled = true; btn.innerText = "Submitting..."; }

  try {
    const res = await fetch("/request-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, amount })
    });
    const data = await res.json();
    alert(data.message || "Withdrawal submitted.");
    document.getElementById("withdrawAmount").value = "";
    closeWithdraw();
  } catch {
    alert("Something went wrong.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Submit Withdrawal"; }
  }
}

/* ── Plans popup (info + select) ── */
function openPlans() {
  document.getElementById("plansPopup").style.display = "flex";
}
function closePlans() {
  document.getElementById("plansPopup").style.display = "none";
}

function selectPlan(plan, min, max, inputId) {
  const amount = Number(document.getElementById(inputId).value);
  if (!amount)        { alert("Enter an amount."); return; }
  if (amount < min)   { alert("Minimum is $" + min.toLocaleString()); return; }
  if (amount > max)   { alert("Maximum is $" + max.toLocaleString()); return; }

  localStorage.setItem("litePendingPlan",   plan);
  localStorage.setItem("litePendingAmount", amount);
  closePlans();
  showWallets();
}

/* ── Reinvest ── */
function openReinvestPopup() {
  document.getElementById("reinvestPopup").style.display = "flex";
}
function closeReinvestPopup() {
  document.getElementById("reinvestPopup").style.display = "none";
}

async function submitReinvestment() {
  const topup = Number(document.getElementById("reinvestTopupAmount").value || 0);
  if (!topup || topup <= 0) { alert("Please enter a top-up amount."); return; }

  try {
    const res = await fetch("/request-reinvestment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentUser.email,
        topup,
        representative: null  /* lite mode */
      })
    });
    const data = await res.json();
    if (data.success) {
      alert("Reinvestment request submitted. Admin will confirm shortly.");
      closeReinvestPopup();
    } else {
      alert(data.message || "Failed.");
    }
  } catch {
    alert("Something went wrong.");
  }
}

/* ── Settings ── */
function openSettings() {
  if (currentUser) {
    document.getElementById("settingsName").value  = currentUser.name  || "";
    document.getElementById("settingsEmail").value = currentUser.email || "";
  }
  showSettingsTab("profile");
  document.getElementById("settingsPopup").style.display = "flex";
}
function closeSettings() {
  document.getElementById("settingsPopup").style.display = "none";
}
function showSettingsTab(tabName, button) {
  document.querySelectorAll(".stab-content").forEach(t => t.style.display = "none");
  document.querySelectorAll(".stab").forEach(b => b.classList.remove("active"));
  const el = document.getElementById("stab-" + tabName);
  if (el) el.style.display = "block";
  if (button) button.classList.add("active");
  else {
    const first = document.querySelector('.stab[onclick*="' + tabName + '"]');
    if (first) first.classList.add("active");
  }
}
async function saveSettings() {
  const name            = document.getElementById("settingsName").value.trim();
  const currentPassword = document.getElementById("settingsCurrentPassword").value;
  const newPassword     = document.getElementById("settingsNewPassword").value;
  const confirmPassword = document.getElementById("settingsConfirmPassword").value;

  if (newPassword || currentPassword) {
    if (!currentPassword) { alert("Enter your current password."); return; }
    if (newPassword.length < 6) { alert("New password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { alert("Passwords do not match."); return; }
  }

  try {
    const payload = { email: currentUser.email, name };
    if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }

    const res  = await fetch("/update-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      alert("Settings saved.");
      closeSettings();
      await loadUser();
    } else {
      alert(data.message || "Failed to save.");
    }
  } catch {
    alert("Something went wrong.");
  }
}

/* ── Profile popup ── */
function openProfilePopup() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;
  document.getElementById("profileName").innerText  = user.name  || "—";
  document.getElementById("profileEmail").innerText = user.email || "—";
  document.getElementById("profilePlan").innerText  = user.plan  || "No active plan";
  document.getElementById("profileRank").innerText  = user.rank  || "Investor";
  document.getElementById("profilePopup").style.display = "flex";
}
function closeProfilePopup() {
  document.getElementById("profilePopup").style.display = "none";
}

/* ── Auth ── */
function logoutUser() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

/* ── Sidebar (mobile) ── */
function toggleSidebar() {
  const sidebar  = document.querySelector(".sidebar");
  const overlay  = document.getElementById("sidebarOverlay");
  const isOpen   = sidebar.classList.contains("sidebar-open");
  if (isOpen) {
    sidebar.classList.remove("sidebar-open");
    overlay.classList.remove("active");
  } else {
    sidebar.classList.add("sidebar-open");
    overlay.classList.add("active");
  }
}

function smoothScrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Balance hide/show ── */
function toggleBalanceVisibility() {
  balanceHidden = !balanceHidden;
  localStorage.setItem("balanceHidden", balanceHidden);
  if (!balanceHidden) {
    const ids = ["portfolioBalance","expectedProfit","claimableProfit","investmentAmount","daysRemaining"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.real) el.innerText = el.dataset.real;
    });
  }
  applyBalanceVisibility();
}

function applyBalanceVisibility() {
  const ids = ["portfolioBalance","expectedProfit","claimableProfit","investmentAmount","daysRemaining"];
  const eye = document.getElementById("eyeIcon");
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (balanceHidden) {
      if (el.innerText !== "••••") el.dataset.real = el.innerText;
      el.innerText = "••••";
    }
  });
  if (eye) {
    eye.innerHTML = balanceHidden
      ? `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;
  toast.className = type;
  toast.style.opacity = "1";
  setTimeout(() => { toast.style.opacity = "0"; }, 2000);
}

window.addEventListener("load", () => {
  document.body.style.visibility = "visible";
});