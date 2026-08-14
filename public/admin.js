/* =========================
   ADMIN AUTH GUARD
========================= */
let adminTyping = false;
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "/admin-login.html";
}
let allUsers = [];
let allDeposits = [];
let allWithdrawals = [];
let allRepresentatives = [];
let allChats = [];
let activeChatEmail = null;
let chatRefreshInterval = null;
/* ========================= */
/* SHOW SECTIONS             */
/* ========================= */
function showSection(section) {
  const allSections = [
    "overview","users","deposits","withdrawals",
    "representatives","statistics","chat","siteControls",
    "reinvestments","cards","shipments"
  ];
  allSections.forEach(name => {
    const el = document.getElementById(name + "Section");
    if (el) el.style.display = "none";
  });
  const target = document.getElementById(section + "Section");
  if (target) target.style.display = "block";
  document.querySelectorAll(".sidebar button").forEach(btn => {
    btn.classList.remove("active-nav");
  });
  event.target.classList.add("active-nav");
  if (section !== "chat" && chatRefreshInterval) {
    clearInterval(chatRefreshInterval);
    chatRefreshInterval = null;
  }
  if (section === "savings") loadSavingsAccounts();
  if (section === "cards") loadCardApplications();
  if (section === "reinvestments") loadReinvestments();
  if (section === "shipments") loadShipments();
  if (section === "siteControls") {
    loadSiteControls();
    loadCounterControls();
  }
}
/* ========================= */
/* LOAD EVERYTHING ON START  */
/* ========================= */
window.onload = async () => {
  await loadUsers();
  await loadDeposits();
  await loadWithdrawals();
  await loadRepresentatives();
  await loadChats();
  renderChatList();
  updateOverview();
};
/* ========================= */
/* OVERVIEW                  */
/* ========================= */
function updateOverview() {
  setTimeout(() => {
    document.getElementById("totalUsers").innerText = allUsers.length;
    document.getElementById("totalDeposits").innerText = allDeposits.length;
    document.getElementById("totalWithdrawals").innerText = allWithdrawals.length;
    const statsUsers = document.getElementById("statsUsers");
    const statsDeposits = document.getElementById("statsDeposits");
    const statsWithdrawals = document.getElementById("statsWithdrawals");
    if (statsUsers) statsUsers.innerText = allUsers.length;
    if (statsDeposits) statsDeposits.innerText = allDeposits.length;
    if (statsWithdrawals) statsWithdrawals.innerText = allWithdrawals.length;
  }, 500);
}
/* ========================= */
/* USERS                     */
/* ========================= */
async function loadUsers() {
  const response = await fetch("/admin-users");
  const data = await response.json();
  allUsers = data.users || [];
  renderUsers();
}
function renderUsers() {
  const container = document.getElementById("userList");
  if (!container) return;
  container.innerHTML = "";
  allUsers.forEach(user => {
    const isBanned = user.status === "BANNED";
    const hasActiveInvestment = Number(user.investmentAmount || 0) > 0;
    const isManual = user.investmentMode === "manual";
    const showEnableReinvest = isManual && user.cycleCompleted && !user.allowReinvestment;

    container.innerHTML += `
    <div class="user-card">
      <div class="user-header" onclick="toggleUser('${user.email}')">
        <span>${user.name}</span>
        <span style="color:#666;font-size:13px;font-weight:normal;">${user.email}</span>
        ${isBanned ? `<span style="color:#ff4444;font-size:12px;margin-left:8px;">BANNED</span>` : ""}
        ${isManual ? `<span style="color:#a78bfa;font-size:12px;margin-left:8px;">MANUAL</span>` : ""}
      </div>
      <div class="user-body" id="user-${user.email}" style="display:none;">
        <p>Balance: <b style="color:#f0b90b">$${Number(user.balance||0).toLocaleString()}</b></p>
        <p>Investment Amount: <b style="color:#f0b90b">$${Number(user.investmentAmount||0).toLocaleString()}</b></p>
        <p>Plan: ${user.plan||"None"} &nbsp;|&nbsp; Rank: ${user.rank||"None"} &nbsp;|&nbsp; Votes: ${user.totalVotes||0}</p>
        ${isManual ? `
        <p style="color:#a78bfa;font-size:13px;margin-top:4px;">
          Mode: Manual Investment
          ${user.allowReinvestment ? " · Reinvestment Enabled ✓" : ""}
          ${user.cycleCompleted ? " · Cycle Completed" : ""}
        </p>` : ""}
        <div style="margin-top:12px;">
          <input type="number" id="balance-${user.email}" placeholder="Amount to add">
          <select id="planSelect-${user.email}">
            <option value="">No Plan (just add to balance)</option>
            <option>Starter Plan</option>
            <option>Standard Plan</option>
            <option>Premium Plan</option>
            <option>Contact Manager</option>
            <option>Capital Boost</option>
            <option>Rapid Return</option>
          </select>
          <button onclick="addBalance('${user.email}')">Add Balance</button>
        </div>
        <div style="margin-top:8px;">
          <input type="number" id="votes-${user.email}" placeholder="Votes to add">
          <button onclick="addVotes('${user.email}')">Add Votes</button>
        </div>
        <div style="margin-top:8px;">
          <select id="rep-${user.email}">
            <option>Michael Scott</option>
            <option>Robert Rachel</option>
            <option>Lincoln Hayes</option>
            <option>Amber Agrawal</option>
            <option>Aaliyah Kathe</option>
          </select>
          <button onclick="assignRep('${user.email}')">Assign Rep</button>
        </div>
        <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">
          <button
            onclick="deactivateInvestment('${user.email}')"
            style="background:${hasActiveInvestment ? '#f0b90b' : '#333'};color:${hasActiveInvestment ? '#000' : '#666'};cursor:${hasActiveInvestment ? 'pointer' : 'not-allowed'};"
            ${hasActiveInvestment ? '' : 'disabled'}>
            Deactivate Investment
          </button>
          <button
            onclick="toggleBan('${user.email}')"
            style="background:${isBanned ? '#00d26a' : '#ff4444'};color:#fff;">
            ${isBanned ? 'Unban User' : 'Ban User'}
          </button>
          <button
            onclick="openManualInvestment('${user.email}')"
            style="background:#7c3aed;color:#fff;border:none;padding:8px 14px;
            border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
            💼 Manual Investment
          </button>
          ${showEnableReinvest ? `
          <button
            onclick="enableManualReinvestment('${user.email}')"
            style="background:#059669;color:#fff;border:none;padding:8px 14px;
            border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">
            ✅ Enable Reinvest
          </button>` : ""}
        </div>
<select id="dashMode-${user.email}" style="padding:8px;border-radius:8px;background:#0b0b0b;color:#fff;border:1px solid #333;">
  <option value="representative" ${(user.dashboardMode||"representative")==="representative"?"selected":""}>Representative Dashboard</option>
  <option value="lite"      ${user.dashboardMode==="lite"     ?"selected":""}>Dashboard Lite</option>
  <option value="savings"   ${user.dashboardMode==="savings"  ?"selected":""}>Dashboard Savings</option>
</select>
<button onclick="setDashboardMode('${user.email}')"
  style="background:#6366f1;color:#fff;border:none;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;">
  Set Dashboard
</button>
      </div>
    </div>`;
  });
}

function toggleUser(email) {
  const box = document.getElementById("user-" + email);
  if (box) box.style.display = box.style.display === "none" ? "block" : "none";
}
function filterUsers() {
  const search = document.getElementById("searchUser").value.toLowerCase();
  document.querySelectorAll(".user-card").forEach(card => {
    card.style.display = card.innerText.toLowerCase().includes(search) ? "block" : "none";
  });
}
/* ========================= */
/* BALANCE / VOTES / REP     */
/* ========================= */
async function addBalance(email) {
  const amount = document.getElementById("balance-" + email).value;
  const plan = document.getElementById("planSelect-" + email).value;
  if (!amount) return;
  const res = await fetch("/admin-add-balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, amount, plan })
  });
  const data = await res.json();
  alert(data.message || "Balance updated.");
  loadUsers();
}
async function addVotes(email) {
  const votes = document.getElementById("votes-" + email).value;
  if (!votes) return;
  await fetch("/admin-add-votes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, votes })
  });
  loadUsers();
}
async function assignRep(email) {
  const representative = document.getElementById("rep-" + email).value;
  const res = await fetch("/admin-assign-rep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, representative })
  });
  const data = await res.json();
  alert(data.message || "Representative assigned.");
  loadUsers();
}
/* ========================= */
/* BAN / UNBAN               */
/* ========================= */
async function toggleBan(email) {
  const res = await fetch("/admin-ban-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (data.success) {
    alert("User is now " + data.status);
    loadUsers();
  } else {
    alert("Failed to update user status.");
  }
}
/* ========================= */
/* DEACTIVATE INVESTMENT      */
/* ========================= */
async function deactivateInvestment(email) {
  if (!confirm("Deactivate this user's investment?")) return;
  const res = await fetch("/admin-deactivate-investment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  alert(data.message || "Investment deactivated.");
  loadUsers();
}
/* ========================= */
/* MANUAL INVESTMENT         */
/* ========================= */
let manualInvestEmail = "";

function openManualInvestment(email) {
  manualInvestEmail = email;
  document.getElementById("manualInvestEmail").innerText = email;
  document.getElementById("manualAmount").value = "";
  document.getElementById("manualProfit").value = "";
  document.getElementById("manualDuration").value = "";
  document.getElementById("manualDurationUnit").value = "days";
  document.getElementById("manualAllowReinvest").checked = false;
  document.getElementById("manualInvestmentPopup").style.display = "flex";
}

function closeManualInvestment() {
  document.getElementById("manualInvestmentPopup").style.display = "none";
}

async function submitManualInvestment() {
  const investmentAmount   = document.getElementById("manualAmount").value;
  const expectedProfit     = document.getElementById("manualProfit").value;
  const investmentDuration = document.getElementById("manualDuration").value;
  const durationUnit       = document.getElementById("manualDurationUnit").value;
  const allowReinvestment  = document.getElementById("manualAllowReinvest").checked;

  if (!investmentAmount || !expectedProfit || !investmentDuration) {
    alert("Please fill in all fields.");
    return;
  }

  const res = await fetch("/admin-manual-investment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: manualInvestEmail,
      investmentAmount,
      expectedProfit,
      investmentDuration,
      durationUnit,
      allowReinvestment
    })
  });

  const data = await res.json();
  alert(data.message || (data.success ? "Manual investment activated." : "Failed."));
  if (data.success) {
    closeManualInvestment();
    loadUsers();
  }
}

async function enableManualReinvestment(email) {
  if (!confirm("Enable reinvestment for " + email + "?")) return;
  const res = await fetch("/admin-enable-manual-reinvestment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Reinvestment enabled." : "Failed."));
  if (data.success) loadUsers();
}

async function setDashboardMode(email) {
  const mode = document.getElementById("dashMode-" + email).value;
  const res  = await fetch("/admin-set-dashboard-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, dashboardMode: mode })
  });
  const data = await res.json();
  alert(data.success ? "Dashboard mode updated." : "Failed.");
  loadUsers();
}

/* ========================= */
/* DEPOSITS                  */
/* ========================= */
async function loadDeposits() {
  const response = await fetch("/admin-deposits");
  const data = await response.json();
  allDeposits = data.deposits || [];
  const container = document.getElementById("depositList");
  if (!container) return;
  container.innerHTML = "";
  if (allDeposits.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No deposits yet.</p>`;
    return;
  }
  allDeposits.forEach(dep => {
    const statusColor =
      dep.status === "APPROVED" ? "#00d26a" :
      dep.status === "REJECTED" ? "#ff4444" : "#f0b90b";
    container.innerHTML += `
    <div class="deposit-card">
      <div>
        <p>${dep.email}</p>
        <p style="color:#f0b90b;font-size:20px;font-weight:800;margin-top:4px;">
          $${Number(dep.amount).toLocaleString()}
        </p>
        <p style="margin-top:4px;">${dep.plan || ""} &nbsp;·&nbsp; ${dep.representative || ""}</p>
        <p style="color:${statusColor};margin-top:4px;font-size:13px;">${dep.status}</p>
        <p style="color:#666;font-size:12px;">${new Date(dep.date).toLocaleString()}</p>
      </div>
      <div class="card-actions">

<button class="approve-btn" onclick="approveDeposit('${dep._id}', '${dep.plan}')">✓ Approve</button>
       <button class="deny-btn" onclick="rejectDeposit('${dep._id}')">✕ Deny</button>
      </div>
    </div>`;
  });
}
async function approveDeposit(id, plan) {
  const route = plan === "Savings Deposit" 
    ? "/approve-savings-deposit" 
    : "/approve-deposit";

  const res = await fetch(route, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Approved" : "Failed"));
  loadDeposits();
  loadUsers();
}
async function rejectDeposit(id) {
  await fetch("/reject-deposit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  loadDeposits();
}
/* ========================= */
/* WITHDRAWALS               */
/* ========================= */
async function loadWithdrawals() {
  const response = await fetch("/admin-withdrawals");
  const data = await response.json();
  allWithdrawals = data.withdrawals || [];
  const container = document.getElementById("withdrawalList");
  if (!container) return;
  container.innerHTML = "";
  if (allWithdrawals.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No withdrawals yet.</p>`;
    return;
  }
  allWithdrawals.forEach(item => {
    const statusColor =
      item.status === "APPROVED" ? "#00d26a" :
      item.status === "REJECTED" ? "#ff4444" : "#f0b90b";
    container.innerHTML += `
    <div class="withdraw-card">
      <div>
        <p>${item.email}</p>
        <p style="color:#f0b90b;font-size:20px;font-weight:800;margin-top:4px;">
          $${Number(item.amount).toLocaleString()}
        </p>
        <p style="color:${statusColor};margin-top:4px;font-size:13px;">${item.status}</p>
        <p style="color:#666;font-size:12px;">${new Date(item.date).toLocaleString()}</p>
      </div>
      <div class="card-actions">
        <button class="approve-btn" onclick="approveWithdrawal('${item._id}')">✓ Approve</button>
        <button class="deny-btn" onclick="rejectWithdrawal('${item._id}')">✕ Deny</button>
      </div>
    </div>`;
  });
}
async function approveWithdrawal(id) {
  const res = await fetch("/approve-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Approved" : "Failed"));
  loadWithdrawals();
  loadUsers();
}
async function rejectWithdrawal(id) {
  await fetch("/reject-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  loadWithdrawals();
}
/* ========================= */
/* REPRESENTATIVES           */
/* ========================= */
async function loadRepresentatives() {
  const response = await fetch("/admin-representatives");
  allRepresentatives = await response.json();
  const container = document.getElementById("repList");
  if (!container) return;
  container.innerHTML = "";
  allRepresentatives.forEach(rep => {
    container.innerHTML += `
    <div class="rep-card">
      <h3>${rep.name}</h3>
      <p>Total Votes: <b style="color:#f0b90b">${rep.votes}</b></p>
    </div>`;
  });
}
/* ========================= */
/* REINVESTMENTS             */
/* ========================= */
async function loadReinvestments() {
  const res = await fetch("/admin-reinvestments");
  const data = await res.json();
  const container = document.getElementById("reinvestmentList");
  if (!container) return;
  container.innerHTML = "";
  const pending = (data.requests || []).filter(r => r.status === "PENDING");
  if (pending.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No pending reinvestment requests.</p>`;
    return;
  }
  pending.forEach(r => {
    container.innerHTML += `
    <div class="deposit-card">
      <div>
        <p>${r.email}</p>
        <p style="color:#f0b90b;font-size:20px;font-weight:800;margin-top:4px;">
          Profit: $${Number(r.profit).toLocaleString()} &nbsp;+&nbsp; Top-up: $${Number(r.topup).toLocaleString()}
        </p>
        <p style="margin-top:4px;">Representative: ${r.representative || "-"}</p>
        <p style="color:#666;font-size:12px;">${new Date(r.date).toLocaleString()}</p>
      </div>
      <div class="card-actions">
        <button class="approve-btn" onclick="approveReinvestment('${r._id}')">✓ Approve</button>
        <button class="deny-btn" onclick="rejectReinvestment('${r._id}')">✕ Deny</button>
      </div>
    </div>`;
  });
}
async function approveReinvestment(id) {
  const res = await fetch("/approve-reinvestment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.success ? "Reinvestment approved" : "Approval failed");
  loadReinvestments();
  loadUsers();
}
async function rejectReinvestment(id) {
  const res = await fetch("/reject-reinvestment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  if (data.success) {
    alert("Reinvestment rejected");
    loadReinvestments();
  }
}
/* ========================= */
/* CARD APPLICATIONS         */
/* ========================= */
async function loadCardApplications() {
  const res = await fetch("/admin-cards");
  const data = await res.json();
  const container = document.getElementById("cardAppList");
  if (!container) return;
  container.innerHTML = "";
  const pending = (data.applications || []).filter(a => a.status === "PENDING");
  if (pending.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No pending card applications.</p>`;
    return;
  }
  pending.forEach(a => {
    container.innerHTML += `
    <div class="deposit-card">
      <div>
        <p>${a.email}</p>
        <p style="color:#f0b90b;font-size:18px;font-weight:800;margin-top:4px;">
          ${a.cardType.toUpperCase()} CARD
        </p>
        <p style="margin-top:4px;">${a.employment} · ${a.occupation} · ${a.income}</p>
        <p style="color:#666;font-size:12px;">${new Date(a.date).toLocaleString()}</p>
        <p style="margin-top:6px;">
          ${a.idFile ? `<a href="/uploads/cards/${a.idFile}" target="_blank" style="color:#F0B90B;">View ID</a>` : "No ID uploaded"}
          &nbsp;&nbsp;
          ${a.proofFile ? `<a href="/uploads/cards/${a.proofFile}" target="_blank" style="color:#F0B90B;">View Proof of Funds</a>` : "No proof uploaded"}
        </p>
      </div>
      <div class="card-actions">
        <button class="approve-btn" onclick="approveCard('${a._id}')">✓ Approve</button>
      </div>
    </div>`;
  });
}
async function approveCard(id) {
  const res = await fetch("/approve-card", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.success ? "Card approved." : "Approval failed.");
  loadCardApplications();
}
/* ========================= */
/* SHIPMENTS                 */
/* ========================= */
let allShipments = [];
async function loadShipments() {
  await loadUsers();
  const res = await fetch("/admin-shipments");
  const data = await res.json();
  allShipments = data.shipments || [];
  const container = document.getElementById("shipmentList");
  if (!container) return;
  container.innerHTML = "";
  const candidates = [];
  allUsers.forEach(user => {
    ["gold", "black"].forEach(type => {
      const statusField = type === "gold" ? "goldCardStatus" : "blackCardStatus";
      if (user[statusField] === "shipping" || user[statusField] === "active") {
        const existing = allShipments.find(s => s.email === user.email && s.cardType === type);
        if (existing || user[statusField] === "shipping") {
          candidates.push({ user, cardType: type, shipment: existing || null });
        }
      }
    });
  });
  if (candidates.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No shipments yet.</p>`;
    return;
  }
  candidates.forEach(({ user, cardType, shipment }) => {
    const safeId = (user.email + "-" + cardType).replace(/[^a-zA-Z0-9]/g, "_");
    const hasRoute = shipment && shipment.stops && shipment.stops.length > 0;
    const addrField = cardType === "gold" ? "goldCardShipping" : "blackCardShipping";
    const address = user[addrField];
    let statusLine = "Waiting for route generation.";
    let stopsHtml = "";
    let currentDays = shipment?.totalDays || 14;
    if (hasRoute) {
      const progress = shipment.progress || {};
      const currentStop = shipment.stops[progress.currentStopIndex] || shipment.stops[0];
      if (progress.status === "delivered") {
        statusLine = `<span style="color:#00d26a;">Delivered — arrived at ${currentStop.city}</span>`;
      } else if (progress.status === "paused") {
        statusLine = `<span style="color:#f0b90b;">Paused — currently near ${currentStop.city}</span>`;
      } else {
        const pct = Math.round((progress.progressIntoLeg || 0) * 100);
        statusLine = `<span style="color:#f0b90b;">In transit toward ${currentStop.city} (${pct}%)</span>`;
      }
      stopsHtml = shipment.stops.map((s, i) => `
        <div style="display:flex;justify-content:space-between;padding:6px 10px;background:${i === progress.currentStopIndex ? 'rgba(240,185,11,0.12)' : 'transparent'};border-radius:6px;margin-bottom:4px;">
          <span>${i + 1}. ${s.city}</span>
          <span style="color:#888;">${i === 0 ? "Origin" : s.durationDays + " days"}</span>
        </div>
      `).join("");
    }
    const addressHtml = address ? `
      <div style="margin-top:10px;padding:10px 12px;background:#0b0b0b;border-radius:8px;font-size:0.85rem;color:#aaa;">
        <b style="color:#ccc;">Delivery Address:</b> ${address.address}, ${address.city}, ${address.country} ${address.postal}
      </div>
    ` : `<p style="color:#666;margin-top:8px;font-size:0.85rem;">No address submitted yet.</p>`;
    container.innerHTML += `
    <div class="deposit-card" style="flex-direction:column;align-items:stretch;">
      <div>
        <p>${user.name} &nbsp;·&nbsp; ${user.email}</p>
        <p style="color:#f0b90b;font-size:18px;font-weight:800;margin-top:4px;">
          ${cardType.toUpperCase()} CARD SHIPMENT
        </p>
        <p style="margin-top:6px;">${statusLine}</p>
        ${addressHtml}
      </div>
      ${hasRoute ? `<div style="margin-top:14px;">${stopsHtml}</div>` : ``}
      <div style="margin-top:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <label style="color:#999;font-size:0.85rem;">Total Delivery Days:</label>
        <input type="number" id="days-${safeId}" value="${currentDays}" min="1" style="width:80px;">
        <button class="approve-btn" onclick="setShipmentDays('${safeId}','${user.email}','${cardType}')">
          ${hasRoute ? "🔄 Update Route" : "🚚 Generate Route"}
        </button>
        ${hasRoute ? (shipment.paused
          ? `<button class="approve-btn" onclick="resumeShipment('${user.email}','${cardType}')">▶ Resume</button>`
          : `<button class="deny-btn" onclick="pauseShipment('${user.email}','${cardType}')">⏸ Pause</button>`)
          : ``}
      </div>
    </div>`;
  });
}
async function setShipmentDays(safeId, email, cardType) {
  const input = document.getElementById("days-" + safeId);
  const totalDays = parseInt(input?.value, 10);
  if (!totalDays || totalDays < 1) { alert("Enter a valid number of days."); return; }
  const res = await fetch("/admin-set-shipment-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, cardType, totalDays })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Route generated." : "Failed."));
  if (data.success) loadShipments();
}
async function pauseShipment(email, cardType) {
  const res = await fetch("/admin-pause-shipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, cardType })
  });
  const data = await res.json();
  alert(data.message || "Shipment paused.");
  loadShipments();
}
async function resumeShipment(email, cardType) {
  const res = await fetch("/admin-resume-shipment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, cardType })
  });
  const data = await res.json();
  alert(data.message || "Shipment resumed.");
  loadShipments();
}
/* ========================= */
/* CHAT                      */
/* ========================= */
async function loadChats() {
  const response = await fetch("/chat/list");
  const data = await response.json();
  allChats = data.chats || [];
  renderChatList();
  if (activeChatEmail) {
    const chat = allChats.find(c => c.email === activeChatEmail);
    if (chat) renderConversation(chat);
  }
}
function renderChatList() {
  const container = document.getElementById("chatUserList");
  if (!container) return;
  container.innerHTML = "";
  if (allChats.length === 0) {
    container.innerHTML = `<div style="padding:20px;color:#444;font-size:14px;">No conversations yet.</div>`;
    return;
  }
  allChats.forEach(chat => {
    const lastMsg = chat.messages[chat.messages.length - 1];
    const preview = lastMsg ? lastMsg.text.substring(0, 38) + (lastMsg.text.length > 38 ? "…" : "") : "No messages";
    const initials = (chat.name || "?").charAt(0).toUpperCase();
    const isActive = chat.email === activeChatEmail;
    const hasUnread = chat.unread;
    container.innerHTML += `
    <div class="chat-user-item ${isActive ? "active" : ""}" onclick="openChat('${chat.email}')">
      <div class="chat-avatar">${initials}</div>
      <div class="chat-user-info">
        <div class="chat-user-name">
          ${chat.name}
          ${chat.unread ? '<span class="unread-badge">1</span>' : ''}
        </div>
        <div class="chat-user-preview">${preview}</div>
      </div>
      ${hasUnread && !isActive ? `<div class="chat-unread-badge">!</div>` : ""}
    </div>`;
  });
}
function openChat(email) {
  activeChatEmail = email;
  const chat = allChats.find(c => c.email === email);
  if (chat) chat.unread = false;
  if (!chat) return;
  renderChatList();
  renderConversation(chat);
  if (chatRefreshInterval) clearInterval(chatRefreshInterval);
  chatRefreshInterval = setInterval(() => {
    const activeInput = document.activeElement;
    if (activeInput && activeInput.id && activeInput.id.startsWith("replyInput-")) return;
    loadChats();
  }, 3000);
}
function renderConversation(chat) {
  const conv = document.getElementById("chatConversation");
  if (!conv) return;
  const initials = (chat.name || "?").charAt(0).toUpperCase();
  const messagesHtml = chat.messages.map(m => {
    const fromClass = m.sender === "user" ? "from-user" : m.sender === "admin" ? "from-admin" : "from-bot";
    const time = new Date(m.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `
    <div class="msg-row ${fromClass}">
      <div class="msg-bubble">${m.text}</div>
      <div class="msg-time">${m.sender === "admin" ? "You" : chat.name} · ${time}</div>
    </div>`;
  }).join("");
  conv.innerHTML = `
    <div class="chat-conv-header">
      <div class="chat-avatar">${initials}</div>
      <div style="flex:1;">
        <div class="chat-conv-name">${chat.name}</div>
        <div class="chat-conv-email">${chat.email}</div>
      </div>
      <button onclick="resolveChat('${chat.email}')" class="resolve-btn">✓ Resolve</button>
    </div>
    <div class="chat-messages" id="chatMessages">${messagesHtml}</div>
    <div class="chat-reply-box">
      <input type="text" id="replyInput-${chat.email}" placeholder="Type a reply…"
        onkeydown="if(event.key==='Enter') sendReply('${chat.email}')">
      <button class="chat-send-btn" onclick="sendReply('${chat.email}')">➤</button>
    </div>`;
  const replyBox = document.getElementById(`replyInput-${chat.email}`);
  let typingTimeout;
  replyBox.addEventListener("input", async () => {
    await fetch("/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: chat.email })
    });
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(async () => {
      await fetch("/chat/stop-typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: chat.email })
      });
    }, 1000);
  });
  const msgs = document.getElementById("chatMessages");
  requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
}
async function sendReply(email) {
  const input = document.getElementById("replyInput-" + email);
  if (!input) return;
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  await fetch("/chat/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, message })
  });
  await fetch("/chat/stop-typing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  adminTyping = false;
  await loadChats();
  setTimeout(() => {
    const msgs = document.getElementById("chatMessages");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 50);
}
async function resolveChat(email) {
  await fetch("/chat/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  loadChats();
}
/* ========================= */
/* SITE CONTROLS             */
/* ========================= */
async function loadSiteControls() {
  const res = await fetch("/site-settings");
  const data = await res.json();
  document.getElementById("announcementEnabled").checked = data.announcement.enabled;
  document.getElementById("announcementMessage").value = data.announcement.message;
  document.getElementById("announcementType").value = data.announcement.type || "info";
  const reps = data.representatives;
  const repConfig = {
    "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
    "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
    "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
    "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
    "Aaliyah Kathe": ["Norway","Sweden","Denmark","UAE","Qatar"]
  };
  Object.entries(repConfig).forEach(([name, countries]) => {
    countries.forEach(country => {
      const id = "rep-" + name.replace(/\s+/g,"-") + "-" + country.replace(/\s+/g,"-");
      const el = document.getElementById(id);
      if (el && reps[name]) el.value = reps[name][country] || 0;
    });
  });
}
async function saveSiteControls() {
  const announcement = {
    enabled: document.getElementById("announcementEnabled").checked,
    message: document.getElementById("announcementMessage").value.trim(),
    type:    document.getElementById("announcementType").value
  };
  const repConfig = {
    "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
    "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
    "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
    "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
    "Aaliyah Kathe": ["Norway","Sweden","Denmark","UAE","Qatar"]
  };
  const representatives = {};
  Object.entries(repConfig).forEach(([name, countries]) => {
    representatives[name] = {};
    countries.forEach(country => {
      const id  = "rep-" + name.replace(/\s+/g,"-") + "-" + country.replace(/\s+/g,"-");
      const val = parseInt(document.getElementById(id)?.value || "0", 10);
      representatives[name][country] = isNaN(val) ? 0 : val;
    });
  });
  const response = await fetch("/admin-save-site-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ announcement, representatives })
  });
  const data = await response.json();
  alert(data.success ? "✅ Changes saved!" : "❌ Failed to save.");
}
/* ========================= */
/* LIVE COUNTER CONTROLS     */
/* ========================= */
const repCountryConfig = {
  "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
  "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
  "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
  "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
  "Aaliyah Kathe": ["Norway","Sweden","Denmark","UAE","Qatar"]
};
let counterPollInterval = null;
async function loadCounterControls() {
  await fetch("/admin-init-counters", { method: "POST" });
  const res = await fetch("/admin-get-counters");
  const data = await res.json();
  const counters = data.counters || {};
  Object.entries(repCountryConfig).forEach(([name, countries]) => {
    const repKey = name.replace(/\s+/g, "-");
    const repData = counters[name] || {};
    const pauseEl = document.getElementById("pause-" + repKey);
    if (pauseEl) pauseEl.checked = !!repData.paused;
    countries.forEach(country => {
      const countryKey = country.replace(/\s+/g, "-");
      const c = repData[country] || {};
      const speedEl  = document.getElementById("cspeed-" + repKey + "-" + countryKey);
      const pauseEl2 = document.getElementById("cpause-" + repKey + "-" + countryKey);
      const liveEl   = document.getElementById("clive-"  + repKey + "-" + countryKey);
      if (speedEl)  speedEl.value    = c.speed   ?? 1;
      if (pauseEl2) pauseEl2.checked = !!c.paused;
      if (liveEl)   liveEl.innerText = (c.current ?? 0).toLocaleString();
    });
  });
  if (counterPollInterval) clearInterval(counterPollInterval);
  counterPollInterval = setInterval(async () => {
    const r = await fetch("/admin-get-counters");
    const d = await r.json();
    const ctrs = d.counters || {};
    Object.entries(repCountryConfig).forEach(([name, countries]) => {
      const repKey = name.replace(/\s+/g, "-");
      const repData = ctrs[name] || {};
      countries.forEach(country => {
        const countryKey = country.replace(/\s+/g, "-");
        const liveEl = document.getElementById("clive-" + repKey + "-" + countryKey);
        if (liveEl) liveEl.innerText = ((repData[country] || {}).current ?? 0).toLocaleString();
      });
    });
  }, 5000);
}
async function saveCounterControls() {
  const settings = {};
  Object.entries(repCountryConfig).forEach(([name, countries]) => {
    const repKey = name.replace(/\s+/g, "-");
    settings[name] = { paused: !!document.getElementById("pause-" + repKey)?.checked };
    countries.forEach(country => {
      const countryKey = country.replace(/\s+/g, "-");
      const speed  = parseInt(document.getElementById("cspeed-" + repKey + "-" + countryKey)?.value, 10);
      const paused = !!document.getElementById("cpause-" + repKey + "-" + countryKey)?.checked;
      settings[name][country] = { speed: isNaN(speed) ? 1 : Math.min(10, Math.max(1, speed)), paused };
    });
  });
  const res = await fetch("/admin-save-counters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings })
  });
  const data = await res.json();
  alert(data.success ? "✅ Speed settings saved!" : "❌ Failed to save.");
}
async function resetAllCounters() {
  if (!confirm("Reset ALL counters to zero?")) return;
  const res = await fetch("/admin-reset-counters", { method: "POST" });
  const data = await res.json();
  if (data.success) { alert("✅ All counters reset."); loadCounterControls(); }
  else alert("❌ Failed to reset.");
}
function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("active");
  document.getElementById("sidebarOverlay").classList.toggle("active");
  document.body.classList.toggle("sidebar-open");
}
function adminLogout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "/admin-login.html";
}
function toggleAdminPassword() {
  const input = document.getElementById("adminPassword");
  if (input.type === "password") {
    input.type = "text";
  } else {
    input.type = "password";
  }
}

/* =========================
   LOAD SAVINGS ACCOUNTS
========================= */
async function loadSavingsAccounts() {
  const res = await fetch("/admin-savings-accounts");
  const data = await res.json();
  const accounts = data.accounts || [];
  const container = document.getElementById("savingsAccountList");
  if (!container) return;
  container.innerHTML = "";

  if (accounts.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No savings accounts yet.</p>`;
    return;
  }

  accounts.forEach(acc => {
    container.innerHTML += `
    <div class="deposit-card">
      <div>
        <p style="color:#f0b90b;font-weight:700;">${acc.jointName || "Joint Account"}</p>
        <p style="font-size:12px;color:#888;">${acc.email1} &nbsp;·&nbsp; ${acc.email2 || ""}</p>
        <p style="color:#f0b90b;font-size:20px;font-weight:800;margin-top:4px;">
          $${Number(acc.balance || 0).toLocaleString()}
        </p>
        <p style="margin-top:4px;font-size:13px;">
          Interest Rate: <span style="color:#00d26a;">${acc.interestRate || 0}% / mo</span>
        </p>
        <p style="font-size:12px;color:#666;">
          Total Deposited: $${Number(acc.totalDeposited || 0).toLocaleString()}
        </p>
        <p style="font-size:12px;color:#666;">Account ID: ${acc.accountId}</p>
      </div>
      <div class="card-actions">
        <input 
          type="number" 
          id="rate_${acc.accountId}" 
          placeholder="New rate %" 
          style="width:100px;padding:6px;border-radius:6px;border:1px solid #333;background:#1a1a1a;color:#fff;margin-bottom:8px;"
        >
        <button class="approve-btn" onclick="setSavingsInterest('${acc.accountId}')">
          Set Rate
        </button>
      </div>
    </div>`;
  });

  // Load pending savings withdrawals below accounts
  loadSavingsWithdrawals();
}

/* =========================
   SET INTEREST RATE
========================= */
async function setSavingsInterest(accountId) {
  const input = document.getElementById(`rate_${accountId}`);
  const interestRate = Number(input.value);

  if (!interestRate && interestRate !== 0) {
    alert("Enter a valid interest rate");
    return;
  }

  const res = await fetch("/admin-set-savings-interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, interestRate })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Rate updated" : "Failed"));
  loadSavingsAccounts();
}

/* =========================
   LOAD SAVINGS WITHDRAWALS
========================= */
async function loadSavingsWithdrawals() {
  const res = await fetch("/admin-withdrawals");
  const data = await res.json();
  const withdrawals = (data.withdrawals || []).filter(
    w => w.savingsAccountId
  );

  const container = document.getElementById("savingsWithdrawalList");
  if (!container) return;
  container.innerHTML = "";

  if (withdrawals.length === 0) {
    container.innerHTML = `<p style="color:#444;padding:20px;">No savings withdrawals yet.</p>`;
    return;
  }

  withdrawals.forEach(w => {
    const statusColor =
      w.status === "APPROVED"          ? "#00d26a" :
      w.status === "REJECTED"          ? "#ff4444" :
      w.status === "AWAITING_PARTNER"  ? "#888"    : "#f0b90b";

    container.innerHTML += `
    <div class="deposit-card">
      <div>
        <p style="color:#f0b90b;font-weight:700;">${w.jointName || "Joint Account"}</p>
        <p style="font-size:12px;color:#888;">${w.email}</p>
        <p style="color:#f0b90b;font-size:20px;font-weight:800;margin-top:4px;">
          $${Number(w.amount).toLocaleString()}
        </p>
        <p style="margin-top:4px;font-size:13px;">
          Asset: ${w.asset || "USDT"}
        </p>
        <p style="font-size:12px;color:#aaa;">
          Wallet: ${w.destinationWallet || "—"}
        </p>
        <p style="color:${statusColor};margin-top:4px;font-size:13px;">${w.status}</p>
        <p style="color:#666;font-size:12px;">${new Date(w.date).toLocaleString()}</p>
      </div>
      <div class="card-actions">
        ${w.status === "PENDING" ? `
          <button class="approve-btn" onclick="approveSavingsWithdrawal('${w._id}')">
            ✓ Approve
          </button>
          <button class="deny-btn" onclick="rejectSavingsWithdrawal('${w._id}')">
            ✕ Deny
          </button>
        ` : `<p style="color:${statusColor};font-size:13px;">${w.status}</p>`}
      </div>
    </div>`;
  });
}

/* =========================
   APPROVE SAVINGS WITHDRAWAL
========================= */
async function approveSavingsWithdrawal(id) {
  const res = await fetch("/approve-savings-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Approved" : "Failed"));
  loadSavingsAccounts();
}

/* =========================
   REJECT SAVINGS WITHDRAWAL
========================= */
async function rejectSavingsWithdrawal(id) {
  const res = await fetch("/reject-withdrawal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id })
  });
  const data = await res.json();
  alert(data.message || (data.success ? "Rejected" : "Failed"));
  loadSavingsAccounts();
}