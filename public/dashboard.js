/* =========================
   REPRESENTATIVES
========================= */

const repPictures = {
  "Michael Scott": "img/IMG_michealscott.PNG",
  "Robert Rachel": "img/IMG_robertrachel.PNG",
  "Lincoln Hayes": "img/IMG_lincolnhayes.PNG",
  "Amber Agrawal": "img/amberagrawal.PNG",
  "Aaliyah Kathe": "img/Aaliyah_kathe.PNG"
};

const repDivisions = {
  "Michael Scott": "Europe Division",
  "Robert Rachel": "North African Division",
  "Lincoln Hayes": "Global Expansion",
  "Amber Agrawal": "Asia-Pacific Division",
  "Aaliyah Kathe": "Nordic & Middle East Division" 
};

let currentUser = null;

/* =========================
   AUTH GUARD
========================= */

const savedUser = JSON.parse(localStorage.getItem("user"));

if (!savedUser) {
  window.location.replace("/signup.html");
}

/* =========================
   PAGE LOAD
========================= */

window.addEventListener("DOMContentLoaded", async () => {

  if (window.location.hash === "#cards") {
    setTimeout(() => {
      document.getElementById("cardsSection")?.scrollIntoView({
        behavior: "smooth"
      });
    }, 600);
  }

  await loadUser();
  setInterval(loadUser, 3000);
});

/* =========================
   LOAD USER
========================= */

async function loadUser() {
const savedUser = JSON.parse(localStorage.getItem("user"));

if (!savedUser) {
  window.location.replace("/signup.html");
  return;
}
  const response = await fetch("/get-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: savedUser.email })
  });

const data = await response.json();
if (!data.success) {
  if (data.message && data.message.includes("suspended")) {
    alert(data.message);
    localStorage.removeItem("user");
    window.location.href = "index.html";
  }
  return;
}

currentUser = data.user;
updateDashboard();
}

/* =========================
   UPDATE DASHBOARD
========================= */
function updateDashboard() {
  const isManual = currentUser.investmentMode === "manual" && 
                 currentUser.dashboardMode !== "representative";

  updatePortfolio();
  updateTransactions();
  updateReinvestButton();
  updateCardsSection();

  document.getElementById("pendingDeposits").innerText   = currentUser.pendingDeposits  || 0;
  document.getElementById("pendingWithdrawals").innerText = currentUser.pendingWithdrawals || 0;
  document.getElementById("welcomeName").innerText        = currentUser.name || "";

  // Rep section — completely removed from DOM in manual mode
  const repSection = document.getElementById("repCardsContainer");
  if (repSection) {
    if (isManual) {
      repSection.innerHTML = "";          // wipe any previously rendered cards
      repSection.style.display = "none";  // take up zero space
    } else {
      repSection.style.display = "";
      updateRepresentative();             // only render reps in representative mode
    }
  }

  applyBalanceVisibility();
}

/* =========================
   PORTFOLIO
========================= */

function updatePortfolio() {
  // ── Raw fields from server ──────────────────────────────────
  const amount        = Number(currentUser.investmentAmount || 0);
  const profitPercent = Number(currentUser.profitPercent    || 0);
  const duration      = Number(currentUser.investmentDuration || 0);
  const start         = Number(currentUser.investmentStart  || 0);
  const now           = Date.now();

  // ── Balance ─────────────────────────────────────────────────
  document.getElementById("portfolioBalance").textContent =
    "$" + Number(currentUser.balance || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });

  // ── Investment Amount ────────────────────────────────────────
  document.getElementById("investmentAmount").textContent =
    "$" + amount.toLocaleString("en-US", {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });

  // ── No active investment → zero everything out ───────────────
  if (!duration || !start) {
    document.getElementById("expectedProfit").innerText  = "$0.00";
    document.getElementById("claimableProfit").innerText = "$0.00";
    document.getElementById("daysRemaining").innerText   = "0";
    document.getElementById("progressFill").style.width  = "0%";
    if (document.getElementById("todayProfit"))
      document.getElementById("todayProfit").innerText   = "$0.00";
    if (document.getElementById("roiPercent"))
      document.getElementById("roiPercent").innerText    = "0.00%";
    return;
  }

  // ── THE ONE CALCULATION ─────────────────────────────────────
  const endTime       = start + duration * 86400000;
  const rawProgress   = (now - start) / (endTime - start);
  const progress      = Math.min(Math.max(rawProgress, 0), 1);   // 0 → 1

  const expectedProfit  = amount * (profitPercent / 100);         // total profit at 100%
  const claimableProfit = expectedProfit * progress;              // earned so far
  const todayProfit     = duration > 0 ? expectedProfit / duration : 0;
  const roi             = amount > 0 ? (claimableProfit / amount) * 100 : 0;
  const daysRemaining   = Math.max(0, Math.ceil((endTime - now) / 86400000));

  // ── Render all stats from the SAME values ───────────────────
  document.getElementById("expectedProfit").innerText =
    "$" + expectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 });

  document.getElementById("claimableProfit").innerText =
    "$" + claimableProfit.toLocaleString(undefined, { maximumFractionDigits: 2 });

  document.getElementById("progressFill").style.width = progress * 100 + "%";
  document.getElementById("daysRemaining").innerText  = daysRemaining;

  if (document.getElementById("todayProfit"))
    document.getElementById("todayProfit").innerText =
      "$" + todayProfit.toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (document.getElementById("roiPercent"))
    document.getElementById("roiPercent").innerText = roi.toFixed(2) + "%";

  // ── Portfolio chart gets the SAME claimableProfit value ─────
  // We do NOT call loadPortfolioHistory() here because the server
  // already pushes a snapshot on every /get-user call.
  // We just pass the current computed value to the chart directly
  // so it always matches what is displayed on screen.
  if (typeof drawPortfolioHistory === "function" && currentUser.portfolioHistory) {
    // Inject the current computed claimableProfit into the last
    // history point so the chart tip always matches the display
    const history = currentUser.portfolioHistory.map((h, i) => {
      // Replace the last point with the freshly computed value
      if (i === currentUser.portfolioHistory.length - 1) {
        return { ...h, claimableProfit };
      }
      return h;
    });
    drawPortfolioHistory(history);
  }
}

/* =========================
   REINVEST BUTTON
========================= */

function updateReinvestButton() {
  const btn = document.getElementById("reinvestBtn");
  if (!btn) return;

  const start           = Number(currentUser.investmentStart  || 0);
  const amount          = Number(currentUser.investmentAmount || 0);
  const cycleCompleted  = currentUser.cycleCompleted === true;
  const activeInvestment = start > 0 && amount > 0;
  const isManual        = currentUser.investmentMode === "manual";

  // Active investment — always locked regardless of mode
  if (activeInvestment) {
    btn.disabled = true;
    btn.classList.remove("reinvest-ready");
    btn.classList.add("reinvest-locked");
    btn.innerText = "Locked";
    return;
  }

  if (cycleCompleted) {
    if (isManual) {
      // Manual mode: only unlock if admin explicitly enabled reinvestment
      if (currentUser.allowReinvestment === true) {
        btn.disabled = false;
        btn.classList.remove("reinvest-locked");
        btn.classList.add("reinvest-ready");
        btn.innerText = "Reinvest Now";
        btn.onclick = () => openReinvestPopup();
      } else {
        btn.disabled = true;
        btn.classList.remove("reinvest-ready");
        btn.classList.add("reinvest-locked");
        btn.innerText = "Contact Support";
        btn.title = "Please contact support or wait for your administrator to activate another investment.";
      }
      return;
    }

    // Representative mode — existing logic unchanged
    btn.disabled = false;
    btn.classList.remove("reinvest-locked");
    btn.classList.add("reinvest-ready");
    btn.innerText = "Reinvest Now";
    btn.onclick = () => openReinvestPopup();
    return;
  }

  btn.disabled = true;
  btn.classList.remove("reinvest-ready");
  btn.classList.add("reinvest-locked");
  btn.innerText = "Locked";
}

/* =========================
   REPRESENTATIVE
========================= */

function updateRepresentative() {
  const container = document.getElementById("repCardsContainer");
  if (!container) return;

  const reps = Array.isArray(currentUser.representatives)
    ? currentUser.representatives
    : [];

  // No representatives yet — show the default empty card
  if (reps.length === 0) {
    container.innerHTML = `
      <div class="rep-card">
        <div class="rep-avatar">
          <!-- No representative picture -->
        </div>

        <div class="rep-info">
          <h2>No Representative Selected</h2>
          <p>No Division Assigned</p>
          <p>0 Votes Contributed</p>
          <p>No Active Plan</p>
          <p style="color:#f3ba2f;font-weight:bold;">
            ${currentUser.rank || "Starter Investor"}
          </p>
        </div>
      </div>
    `;
    return;
  }

  // Representatives exist — show their cards
  container.innerHTML = "";

  reps.forEach(rep => {
    const name = rep.name;
    const division = repDivisions[name] || "No Division Assigned";
    const img = repPictures[name?.trim()];

    container.innerHTML += `
      <div class="rep-card">
        <div class="rep-avatar">
          ${img ? `<img src="${img}" alt="${name}">` : ""}
        </div>

        <div class="rep-info">
          <h2>${name}</h2>
          <p>${division}</p>
          <p>${Number(rep.votes || 0)} Votes Contributed</p>
          <p>${currentUser.plan || "No Active Plan"}</p>
          <p style="color:#f3ba2f;font-weight:bold;">
            ${currentUser.rank || "Starter Investor"}
          </p>
        </div>
      </div>
    `;
  });
}
/* =========================
   TRANSACTIONS
========================= */

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

/* =========================
   SCROLL TO TRANSACTIONS
========================= */

function scrollTransactions() {
  const box = document.getElementById("transactionsBox");
  if (!box) return;
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =========================
   DEPOSIT
========================= */

function openDeposit() {
  const balance = Number(currentUser.balance || 0);
  const investing = Number(currentUser.investmentAmount || 0);

  if (balance > 0 && investing === 0) {
    document.getElementById("useBalanceInfo").innerText =
      "You have $" + balance.toLocaleString() + " available in your balance. Would you like to invest it directly, or make a new deposit?";
    document.getElementById("useBalancePopup").style.display = "flex";
    return;
  }

  document.getElementById("depositPopup").style.display = "flex";
}

async function confirmBalanceRep() {
  const representative = document.getElementById("balanceRepSelect")?.value;

  if (!representative) {
    alert("Please select a representative to continue.");
    return;
  }

  document.getElementById("balanceRepPopup").style.display = "none";

  try {
    const response = await fetch("/invest-existing-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, representative })
    });
    const data = await response.json();
    if (data.success) {
      alert("Your balance of $" + Number(currentUser.balance).toLocaleString() + " has been moved into a new investment cycle under the " + data.plan + ".");
      await loadUser();
    } else {
      alert(data.message || "Something went wrong.");
    }
  } catch (err) {
    alert("Something went wrong. Please try again.");
  }
}

function closeBalanceRepPopup() {
  document.getElementById("balanceRepPopup").style.display = "none";
}

function closeDeposit() {
  document.getElementById("depositPopup").style.display = "none";
}

function continueDeposit() {
  const representative = document.getElementById("depositRepresentative").value;

  if (!representative) {
    alert("Please select a representative to continue.");
    return;
  }

  localStorage.setItem("pendingRepresentative", representative);

  closeDeposit();
  openPlans();
}

/* =========================
   WITHDRAW
========================= */

function openWithdraw() {
  document.getElementById("withdrawPopup").style.display = "flex";
}

function closeWithdraw() {
  document.getElementById("withdrawPopup").style.display = "none";
}

/* =========================
   POPUPS
========================= */

function openPlans() {
  document.getElementById("plansPopup").style.display = "flex";
}

function closePlans() {
  document.getElementById("plansPopup").style.display = "none";
}

function showWallets() {
  document.getElementById("walletPopup").style.display = "flex";
}

function closeWalletPopup() {
  document.getElementById("walletPopup").style.display = "none";
}

/* =========================
   SETTINGS TABS
========================= */

function showSettingsTab(tab, btn) {
  document.querySelectorAll(".stab-content").forEach(el => el.style.display = "none");
  document.querySelectorAll(".stab").forEach(el => el.classList.remove("active"));
  document.getElementById("stab-" + tab).style.display = "block";
  btn.classList.add("active");
}

/* =========================
   SETTINGS
========================= */

/* ===========================
   SETTINGS
=========================== */

function openSettings() {
  if (currentUser) {
    const nameEl = document.getElementById("settingsName");
    const emailEl = document.getElementById("settingsEmail");

    if (nameEl) nameEl.value = currentUser.name || "";
    if (emailEl) emailEl.value = currentUser.email || "";
  }

  showSettingsTab("profile");

  document.getElementById("settingsPopup").style.display = "flex";
}

function closeSettings() {
  document.getElementById("settingsPopup").style.display = "none";
}

function showSettingsTab(tabName, button = null) {

  document.querySelectorAll(".stab-content").forEach(tab => {
    tab.style.display = "none";
  });

  document.querySelectorAll(".stab").forEach(btn => {
    btn.classList.remove("active");
  });

  const activeTab = document.getElementById("stab-" + tabName);
  if (activeTab) {
    activeTab.style.display = "block";
  }

  if (button) {
    button.classList.add("active");
  } else {
    const firstButton = document.querySelector('.stab[onclick*="' + tabName + '"]');
    if (firstButton) firstButton.classList.add("active");
  }
}

async function saveSettings() {

  const name = document.getElementById("settingsName").value.trim();

  const currentPassword = document.getElementById("settingsCurrentPassword").value;

  const newPassword = document.getElementById("settingsNewPassword").value;

  const confirmPassword = document.getElementById("settingsConfirmPassword").value;

  if (newPassword || currentPassword) {

    if (!currentPassword) {
      alert("Enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("New passwords do not match.");
      return;
    }

  }

  try {

    const payload = {
      email: currentUser.email,
      name
    };

    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    const response = await fetch("/update-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.success) {

      alert("Settings updated successfully.");

      document.getElementById("settingsCurrentPassword").value = "";
      document.getElementById("settingsNewPassword").value = "";
      document.getElementById("settingsConfirmPassword").value = "";

      closeSettings();

      await loadUser();

    } else {

      alert(data.message || "Unable to update settings.");

    }

  } catch (err) {

    console.error(err);
    alert("Something went wrong.");

  }

}

/* =========================
   PLAN ACTIVATION
========================= */

function activatePlan(plan, min, max, inputId) {
  const amount = Number(document.getElementById(inputId).value);

  if (!amount) { alert("Enter amount"); return; }
  if (amount < min) { alert("Minimum amount is $" + min); return; }
  if (amount > max) { alert("Maximum amount is $" + max); return; }

  localStorage.setItem("selectedPlan", plan);
  localStorage.setItem("selectedAmount", amount);

  closePlans();
  showWallets();
  openDeposit();
}

/* =========================
   DEPOSIT SUBMISSION
========================= */

async function submitDeposit() {
  const representative =
    document.getElementById("depositRepresentative").value ||
    localStorage.getItem("pendingRepresentative");

  if (!representative) {
    alert("No representative selected. Please start again.");
    closeWalletPopup();
    openDeposit();
    return;
  }

  const plan = localStorage.getItem("selectedPlan");
  const amount = localStorage.getItem("selectedAmount");
  if (!plan || !amount) { alert("No plan selected. Please choose a plan first."); return; }

  const user = JSON.parse(localStorage.getItem("user"));

  try {
    const response = await fetch("/request-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, amount, plan, representative })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("selectedRepresentative", representative);
      localStorage.removeItem("pendingRepresentative");
      alert("Deposit request submitted successfully. Admin will confirm shortly.");
      closeWalletPopup();
    } else {
      alert(data.message || "Deposit request failed. Please try again.");
    }
  } catch (err) {
    alert("Something went wrong. Please check your connection and try again.");
  }
}

/* =========================
   WITHDRAW SUBMISSION
========================= */

async function submitWithdraw() {
  const amountEl = document.getElementById("withdrawAmount");
  const amount = Number(amountEl.value);

  if (!amount || amount <= 0) { alert("Please enter a valid amount."); return; }

  const btn = document.querySelector("#withdrawPopup .withdraw-btn");
  if (btn) { btn.disabled = true; btn.innerText = "Submitting..."; }

  try {
    const response = await fetch("/request-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, amount })
    });

    const data = await response.json();
    alert(data.message || "Withdrawal request submitted successfully.");
    amountEl.value = "";
    closeWithdraw();

  } catch (err) {
    alert("Something went wrong. Please check your connection and try again.");
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = "Submit Withdrawal"; }
  }
}

/* =========================
   REINVEST
========================= */

const planVoteMinimums = {
  "Starter Plan": 1,
  "Standard Plan": 2,
  "Premium Plan": 4,
  "Contact Manager": 8,
  "Capital Boost": 12,
  "Rapid Return": 20
};

function openReinvestPopup() {
  const plan = currentUser.plan || "Starter Plan";
  const minVotes = planVoteMinimums[plan] || 1;
  const minAmount = minVotes * 500;

  document.getElementById("reinvestPlanName").innerText = plan;
  document.getElementById("reinvestMinInfo").innerText =
    "Minimum top-up for " + plan + " is " + minVotes +
    " vote" + (minVotes > 1 ? "s" : "") + " ($" + minAmount.toLocaleString() + ")";

  document.getElementById("reinvestTopupAmount").value = "";
  document.getElementById("reinvestVoteDisplay").innerText = "";

  document.getElementById("reinvestPopup").style.display = "flex";
}

function closeReinvestPopup() {
  document.getElementById("reinvestPopup").style.display = "none";
}

function updateReinvestVoteDisplay() {
  const amount = Number(document.getElementById("reinvestTopupAmount").value || 0);
  const votes = Math.floor(amount / 500);
  document.getElementById("reinvestVoteDisplay").innerText =
    amount > 0 ? ("= " + votes + " vote" + (votes !== 1 ? "s" : "")) : "";
}

async function submitReinvestment() {
  const topup = Number(document.getElementById("reinvestTopupAmount").value || 0);
  const representative = document.getElementById("reinvestRepresentative").value;

  if (!representative) { alert("Please select a representative."); return; }
  if (!topup || topup <= 0) { alert("Please enter a top-up amount."); return; }

  const plan = currentUser.plan || "Starter Plan";
  const minVotes = planVoteMinimums[plan] || 1;
  const minTopup = minVotes * 500;

  if (topup < minTopup) {
    alert("Minimum top-up for " + plan + " is " + minVotes +
      " vote" + (minVotes > 1 ? "s" : "") + " ($" + minTopup.toLocaleString() + ")");
    return;
  }

  try {
    const response = await fetch("/request-reinvestment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, topup, representative })
    });

    const data = await response.json();
    if (data.success) {
      alert("Reinvestment request submitted. Admin will confirm shortly.");
      closeReinvestPopup();
    } else {
      alert(data.message || "Request failed.");
    }
  } catch (err) {
    alert("Something went wrong. Please try again.");
  }
}

/* =========================
   CARDS
========================= */

const goldEligiblePlans  = ["Contact Manager","Capital Boost","Rapid Return"];

let pendingCardType = null;

function isBlackEligible() {
  const plan = currentUser.plan || "None";
  const balance = Number(currentUser.balance || 0);
  return (plan === "Capital Boost" || plan === "Rapid Return") && balance >= 30000;
}

function updateCardsSection() {
  const plan = currentUser.plan || "None";
  const name = currentUser.name || "—";

  document.getElementById("goldCardName").innerText = name.toUpperCase();
  document.getElementById("blackCardName").innerText = name.toUpperCase();

  const goldStatus  = currentUser.goldCardStatus  || "none";
  const blackStatus = currentUser.blackCardStatus || "none";

  if (goldStatus === "active" || goldStatus === "shipping") {
    document.getElementById("goldCardLast4").innerText =
      currentUser.goldCardNumber?.slice(-4) || "0000";
  }
  if (blackStatus === "active" || blackStatus === "shipping") {
    document.getElementById("blackCardLast4").innerText =
      currentUser.blackCardNumber?.slice(-4) || "0000";
  }

  setupCard("gold", goldEligiblePlans.includes(plan), goldStatus);
  setupCard("black", isBlackEligible(), blackStatus);

  toggleShippingPrompt("gold", goldStatus);
  toggleShippingPrompt("black", blackStatus);
}

function setupCard(type, eligible, status) {
  const overlay = document.getElementById(type + "CardOverlay");
  const btn = document.getElementById(type + "CardBtn");

  if (overlay) overlay.style.display = "none";

  if (status === "active") {
    btn.disabled = true;
    btn.innerText = (type === "gold" ? "Gold" : "Black") + " Card Active";
    btn.classList.remove("card-btn-locked");
    btn.onclick = null;
    return;
  }

  if (status === "pending") {
    btn.disabled = true;
    btn.innerText = "Application Pending";
    btn.classList.remove("card-btn-locked");
    return;
  }

  if (status === "shipping") {
    btn.disabled = true;
    btn.innerText = "Shipping Details Submitted";
    btn.classList.remove("card-btn-locked");
    return;
  }

  if (type === "gold") {
    /* Gold: ALWAYS clickable. Eligibility is checked on SUBMIT, not on open. */
    btn.disabled = false;
    btn.innerText = "Get Gold Card";
    btn.classList.remove("card-btn-locked");
    btn.onclick = () => openCardApply("gold");
  } else {
    /*
      Black: must remain CLICKABLE even when not eligible.
      A disabled button never fires onclick, so the eligibility
      popup would never show. We keep it enabled and just style
      it as "locked" — the actual gate happens inside openCardApply().
    */
    btn.disabled = false;
    btn.innerText = eligible ? "Get Black Card" : "🔒 Get Black Card";
    btn.classList.toggle("card-btn-locked", !eligible);
    btn.onclick = () => openCardApply("black");
  }
}

function openCardApply(type) {
  /* BLACK: eligibility checked immediately on click, before popup opens */
  if (type === "black") {
    if (!isBlackEligible()) {
      alert(
        "You're not eligible for the Black Card yet.\n\n" +
        "Required: Capital Boost or Rapid Return plan with a balance of at least $30,000.\n" +
        "Your current plan: " + (currentUser.plan || "None") +
        "\nYour current balance: $" + Number(currentUser.balance || 0).toLocaleString()
      );
      return;
    }
  }

  /* GOLD: popup always opens, no pre-check (checked on submit instead) */
  pendingCardType = type;

  const titleEl = document.getElementById("cardApplyTitle");
  const subEl = document.getElementById("cardApplySubtitle");

  /* Reset the form each time it opens */
  document.getElementById("cardEmployment").value = "";
  document.getElementById("cardOccupation").value = "";
  document.getElementById("cardIncome").value = "";
  document.getElementById("cardCollateralConfirm").checked = false;
  document.getElementById("cardIdUpload").value = "";
  document.getElementById("cardProofUpload").value = "";

  if (type === "gold") {
    titleEl.innerText = "Apply for GIAI Gold Card";
    subEl.innerText = "Limit range: $50,000 – $80,000";
  } else {
    titleEl.innerText = "Apply for GIAI Black Card";
    subEl.innerText = "Limit range: $200,000 – $500,000";
  }

  document.getElementById("cardApplyPopup").style.display = "flex";
}

function closeCardApply() {
  document.getElementById("cardApplyPopup").style.display = "none";
}

async function submitCardApplication() {
  const employment = document.getElementById("cardEmployment").value;
  const occupation = document.getElementById("cardOccupation").value.trim();
  const income = document.getElementById("cardIncome").value;
  const confirmed = document.getElementById("cardCollateralConfirm").checked;
  const idFile = document.getElementById("cardIdUpload").files[0];
  const proofFile = document.getElementById("cardProofUpload").files[0];

  if (!employment) { alert("Please select your employment status."); return; }
  if (!occupation) { alert("Please enter your occupation."); return; }
  if (!income) { alert("Please select your income range."); return; }
  if (!idFile) { alert("Please upload a valid government ID (passport, driver's license, or national ID)."); return; }
  if (!proofFile) { alert("Please upload proof of funds (bank statement or transaction history)."); return; }
  if (!confirmed) { alert("Please confirm the collateral terms to continue."); return; }

  /* GOLD: eligibility checked HERE, after the form is filled */
  if (pendingCardType === "gold") {
    const plan = currentUser.plan || "None";
    if (!goldEligiblePlans.includes(plan)) {
      alert(
        "Sorry, you're not eligible for the Gold Card yet.\n\n" +
        "Required plan: Contact Manager, Capital Boost, or Rapid Return\n" +
        "Your current plan: " + plan +
        "\n\nKeep growing your investment to unlock this card."
      );
      closeCardApply();
      return;
    }
  }

  /* BLACK: re-check eligibility at submit time too, in case state changed */
  if (pendingCardType === "black" && !isBlackEligible()) {
    alert(
      "You're no longer eligible for the Black Card.\n\n" +
      "Required: Capital Boost or Rapid Return plan with a balance of at least $30,000."
    );
    closeCardApply();
    return;
  }

  const formData = new FormData();
  formData.append("email", currentUser.email);
  formData.append("cardType", pendingCardType);
  formData.append("employment", employment);
  formData.append("occupation", occupation);
  formData.append("income", income);
  formData.append("idFile", idFile);
  formData.append("proofFile", proofFile);

  try {
    const response = await fetch("/request-card", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.success) {
      alert("Application submitted. Admin will review shortly.");
      closeCardApply();
      await loadUser();
    } else {
      alert(data.message || "Application failed.");
    }
  } catch (err) {
    alert("Something went wrong. Please try again.");
  }
}

function toggleShippingPrompt(type, status) {
  const btn = document.getElementById(type + "CardBtn");
  if (status === "active") {
    btn.disabled = false;
    btn.innerText = "Enter Shipping Details";
    btn.classList.remove("card-btn-locked");
    btn.onclick = () => openShippingForm(type);
  }

  if (status === "shipping") {
    /* Once admin has built a route, the button becomes a live tracker.
       We check this on every dashboard refresh so it flips over
       automatically the moment admin sets up the shipment. */
    checkRouteExistsThenSetButton(type, btn);
  }
}

async function checkRouteExistsThenSetButton(type, btn) {
  try {
    const response = await fetch("/get-shipment-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, cardType: type })
    });
    const data = await response.json();

    if (data.success && data.route && data.route.stops && data.route.stops.length > 0) {
      btn.disabled = false;
      btn.innerText = "Track My Shipment";
      btn.classList.remove("card-btn-locked");
      btn.onclick = () => openTrackingView(type);
    } else {
      btn.disabled = true;
      btn.innerText = "Shipping Details Submitted";
      btn.classList.remove("card-btn-locked");
    }
  } catch (err) {
    /* leave button as-is on network error */
  }
}

let pendingShipType = null;

function openShippingForm(type) {
  pendingShipType = type;
  document.getElementById("shipName").value = currentUser.name || "";
  document.getElementById("shippingPopup").style.display = "flex";
}

function closeShipping() {
  document.getElementById("shippingPopup").style.display = "none";
}

async function submitShipping() {
  const address = {
    name: document.getElementById("shipName").value.trim(),
    address: document.getElementById("shipAddress").value.trim(),
    city: document.getElementById("shipCity").value.trim(),
    country: document.getElementById("shipCountry").value.trim(),
    postal: document.getElementById("shipPostal").value.trim()
  };

  if (!address.name || !address.address || !address.city || !address.country || !address.postal) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const response = await fetch("/submit-card-shipping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentUser.email,
        cardType: pendingShipType,
        address
      })
    });

    const data = await response.json();
    if (data.success) {
      alert("Shipping details submitted. Your card is on its way!");
      closeShipping();
      await loadUser();
    } else {
      alert(data.message || "Failed to submit.");
    }
  } catch (err) {
    alert("Something went wrong. Please try again.");
  }
}

async function openTrackingView(type) {
  try {
    const response = await fetch("/get-shipment-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, cardType: type })
    });
    const data = await response.json();

    if (!data.success || !data.route || !data.route.stops || data.route.stops.length === 0) {
      alert("Tracking information is not available yet.");
      return;
    }

    const route = data.route;
    const stops = route.stops;

    let statusLabel = "", currentLat, currentLng, etaText = "";

    const totalDays = route.totalDays || stops.reduce((s, st) => s + st.durationDays, 0);
    const deliveryDate = new Date((route.startedAt || Date.now()) + totalDays * 86400000);
    etaText = deliveryDate.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

    if (route.status === "delivered") {
      statusLabel = "Delivered";
      const last = stops[stops.length - 1];
      currentLat = last.lat; currentLng = last.lng;
    } else if (route.status === "paused") {
      statusLabel = "On Hold";
      const cur = stops[route.currentStopIndex];
      currentLat = cur.lat; currentLng = cur.lng;
    } else if (route.status === "in_transit") {
      statusLabel = "In Transit";
      const from = stops[route.previousStopIndex];
      const to = stops[route.currentStopIndex];
      const t = route.progressIntoLeg || 0;
      currentLat = from.lat + (to.lat - from.lat) * t;
      currentLng = from.lng + (to.lng - from.lng) * t;
    } else {
      statusLabel = "Preparing Shipment";
      currentLat = stops[0].lat; currentLng = stops[0].lng;
    }

    const existing = document.getElementById("trackingPopup");
    if (existing) existing.remove();

    // Build timeline with estimated dates per stop
    let runningMs = route.startedAt || Date.now();
    const timelineHtml = stops.map((s, i) => {
      if (i > 0) runningMs += (stops[i - 1].durationDays || 0) * 86400000;
      const stopDate = new Date(runningMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const isPast = i < route.currentStopIndex || route.status === "delivered";
      const isCurrent = i === route.currentStopIndex && route.status !== "delivered";

      const icon = isPast ? "✓" : isCurrent ? "📍" : "○";
      const dotColor = isPast ? "#00d26a" : isCurrent ? "#f0b90b" : "#444";

      return `
        <div style="display:flex;gap:16px;padding:14px 0;border-left:2px solid ${isPast ? "#00d26a" : "#2a2a2a"};margin-left:10px;padding-left:24px;position:relative;">
          <div style="position:absolute;left:-11px;top:14px;width:20px;height:20px;border-radius:50%;background:${dotColor};display:flex;align-items:center;justify-content:center;font-size:11px;color:#000;font-weight:700;">${isPast ? "✓" : ""}</div>
          <div>
            <div style="color:${isCurrent ? "#f0b90b" : "#fff"};font-weight:${isCurrent ? "700" : "500"};font-size:15px;">${s.city}</div>
            <div style="color:#777;font-size:13px;margin-top:2px;">${i === 0 ? "Shipped" : isCurrent ? "Currently here" : isPast ? "Departed" : "Estimated"} · ${stopDate}</div>
          </div>
        </div>`;
    }).join("");

    const popupHtml = `
      <div id="trackingPopup" style="position:fixed;inset:0;background:#070707;z-index:99999;overflow-y:auto;">
        <div style="position:sticky;top:0;background:#0d0d0d;border-bottom:1px solid #222;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;z-index:10;">
          <div>
            <div style="color:#777;font-size:13px;">${type === "gold" ? "Gold" : "Black"} Card Shipment</div>
            <div style="color:#f0b90b;font-size:20px;font-weight:700;">${statusLabel}</div>
          </div>
          <button onclick="document.getElementById('trackingPopup').remove()" style="background:#1a1a1a;border:1px solid #333;color:#fff;font-size:18px;cursor:pointer;width:38px;height:38px;border-radius:50%;">&times;</button>
        </div>

        <div id="trackingMap" style="width:100%;height:340px;"></div>

        <div style="max-width:680px;margin:0 auto;padding:24px;">
          <div style="background:#111;border:1px solid #222;border-radius:14px;padding:18px 20px;margin-bottom:24px;display:flex;justify-content:space-between;">
            <div>
              <div style="color:#777;font-size:12px;">ESTIMATED DELIVERY</div>
              <div style="color:#fff;font-size:16px;font-weight:700;margin-top:4px;">${etaText}</div>
            </div>
            <div style="text-align:right;">
              <div style="color:#777;font-size:12px;">DESTINATION</div>
              <div style="color:#fff;font-size:16px;font-weight:700;margin-top:4px;">${stops[stops.length - 1].city}</div>
            </div>
          </div>

          <div style="color:#999;font-size:13px;font-weight:700;letter-spacing:0.5px;margin-bottom:8px;">SHIPMENT TIMELINE</div>
          <div>${timelineHtml}</div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", popupHtml);

    if (!window.L) {
      await new Promise((resolve) => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = resolve;
        document.head.appendChild(script);
      });
    }

    setTimeout(() => {
      const map = L.map("trackingMap", { zoomControl: true }).setView([currentLat, currentLng], 3);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap, © CARTO",
        maxZoom: 18
      }).addTo(map);

      const routeLatLngs = stops.map(s => [s.lat, s.lng]);
      L.polyline(routeLatLngs, { color: "#444", weight: 2, dashArray: "6,6" }).addTo(map);

      stops.forEach((s, i) => {
        const isPast = i < route.currentStopIndex || route.status === "delivered";
        const color = isPast ? "#00d26a" : "#666";
        L.circleMarker([s.lat, s.lng], {
          radius: 6, color: color, fillColor: color, fillOpacity: 1, weight: 2
        }).addTo(map).bindPopup(s.city);
      });

      const currentIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#f0b90b;border:3px solid #fff;box-shadow:0 0 14px #f0b90b;"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([currentLat, currentLng], { icon: currentIcon }).addTo(map);

      if (routeLatLngs.length > 1) {
        map.fitBounds(routeLatLngs, { padding: [50, 50] });
      }
    }, 50);

  } catch (err) {
    console.error(err);
    alert("Could not load tracking information. Please try again.");
  }
}

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

function openProfilePopup() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return;

  document.getElementById("profileName").innerText = user.fullName || user.name || "—";
  document.getElementById("profileEmail").innerText = user.email || "—";
  document.getElementById("profilePlan").innerText = user.plan || "No active plan";
  document.getElementById("profileRank").innerText = user.rank || "Standard Investor";

  document.getElementById("profilePopup").style.display = "flex";
}

function closeProfilePopup() {
  document.getElementById("profilePopup").style.display = "none";
}

function logoutUser() {
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

let balanceHidden = localStorage.getItem("balanceHidden") === "true";

function toggleBalanceVisibility() {
  balanceHidden = !balanceHidden;
  localStorage.setItem("balanceHidden", balanceHidden);

  if (!balanceHidden) {
    // Restore real values from dataset when unhiding
    const ids = ["portfolioBalance", "expectedProfit", "claimableProfit", "investmentAmount", "daysRemaining"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.real) {
        el.innerText = el.dataset.real;
      }
    });
  }

  applyBalanceVisibility();
}

function applyBalanceVisibility() {
  const ids = ["portfolioBalance", "expectedProfit", "claimableProfit", "investmentAmount", "daysRemaining"];
  const eyeIcon = document.getElementById("eyeIcon");

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    if (balanceHidden) {
      // Save real value only if not already hidden
      if (el.innerText !== "••••") {
        el.dataset.real = el.innerText;
      }
      el.innerText = "••••";
    }
    // When NOT hidden — do nothing. Let updatePortfolio() write the value directly.
    // dataset.real is only used when toggling back from hidden state.
  });

  if (eyeIcon) {
    if (balanceHidden) {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
        <line x1="3" y1="3" x2="21" y2="21"/>
      `;
    } else {
      eyeIcon.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      `;
    }
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      alert("Copied!");
    })
    .catch(() => {
      alert("Unable to copy.");
    });
}

function showToast(message,type="success"){

    const toast=document.getElementById("toast");

    toast.innerHTML=message;

    toast.className="";

    toast.classList.add(type);

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },2000);

}

async function copyWallet(id,button){

    const text=document.getElementById(id).innerText;

    try{

        await navigator.clipboard.writeText(text);

        button.classList.add("success");

        button.innerHTML=`

        <svg xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round">

        <polyline points="20 6 9 17 4 12"></polyline>

        </svg>`;

        showToast("Wallet address copied");

        setTimeout(()=>{

            button.classList.remove("success");

            button.innerHTML=`

            <svg xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">

            <rect x="9" y="9" width="13" height="13" rx="2"></rect>

            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>

            </svg>`;

        },1400);

    }

    catch{

        showToast("Copy failed","error");

    }

}

window.addEventListener("load", () => {
    document.body.style.visibility = "visible";
});

