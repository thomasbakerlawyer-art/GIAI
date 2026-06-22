// =========================
// MUTE TOGGLE
// =========================

function toggleMute(button) {
  const video = button.parentElement.querySelector("video");
  if (!video) return;
  video.muted = !video.muted;
  button.innerHTML = video.muted ? "🔇" : "🔊";
}

// =========================
// LIVE MARKET PRICES
// =========================

async function updateMarkets() {
  try {
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,dogecoin,cardano,avalanche-2,chainlink,shiba-inu&vs_currencies=usd";
    const res = await fetch(url);
    const data = await res.json();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = "$" + Number(val).toLocaleString();
    };

    set("btc-price",  data.bitcoin?.usd);
    set("eth-price",  data.ethereum?.usd);
    set("bnb-price",  data.binancecoin?.usd);
    set("sol-price",  data.solana?.usd);
    set("xrp-price",  data.ripple?.usd);
    set("doge-price", data.dogecoin?.usd);
    set("ada-price",  data.cardano?.usd);
    set("avax-price", data["avalanche-2"]?.usd);
    set("link-price", data.chainlink?.usd);
    set("shib-price", data["shiba-inu"]?.usd);

    const ticker = document.getElementById("ticker");
    if (ticker) {
      ticker.textContent =
        `BTC $${Number(data.bitcoin?.usd).toLocaleString()} · ` +
        `ETH $${Number(data.ethereum?.usd).toLocaleString()} · ` +
        `BNB $${Number(data.binancecoin?.usd).toLocaleString()} · ` +
        `SOL $${Number(data.solana?.usd).toLocaleString()} · ` +
        `XRP $${Number(data.ripple?.usd).toLocaleString()} · ` +
        `DOGE $${Number(data.dogecoin?.usd).toLocaleString()} · ` +
        `ADA $${Number(data.cardano?.usd).toLocaleString()} · ` +
        `AVAX $${Number(data["avalanche-2"]?.usd).toLocaleString()} · ` +
        `LINK $${Number(data.chainlink?.usd).toLocaleString()} · ` +
        `SHIB $${Number(data["shiba-inu"]?.usd).toLocaleString()}`;
    }
  } catch(err) {
    console.log("Market fetch error:", err);
  }
}

updateMarkets();
setInterval(updateMarkets, 30000);

/* ========================= */
/* LIVE INVESTORS — SMOOTH   */
/* ========================= */

const investorsElement = document.getElementById("liveInvestors");
let currentInvestors = 8241;
let investorTrend = 1; // 1 = going up, -1 = going down
let trendStreak = 0;
let maxStreak = Math.floor(Math.random() * 8) + 5;

function updateInvestors() {
  if (!investorsElement) return;

  // Decide if we should flip trend
  trendStreak++;
  if (trendStreak >= maxStreak) {
    // Flip direction occasionally
    // But heavily favor going up (70% up, 30% down)
    investorTrend = Math.random() < 0.7 ? 1 : -1;
    trendStreak = 0;
    maxStreak = Math.floor(Math.random() * 10) + 4;
  }

  // Force upward if getting too low
  if (currentInvestors < 7800) {
    investorTrend = 1;
  }

  // Force downward if getting too high
  if (currentInvestors > 13800) {
    investorTrend = -1;
  }

  // Movement amount — small steps, feels natural
  const step = Math.floor(Math.random() * 18) + 3;
  currentInvestors += step * investorTrend;

  // Keep within bounds
  currentInvestors = Math.max(7600, Math.min(14200, currentInvestors));

  investorsElement.innerText = currentInvestors.toLocaleString();
}

// Run every 3.5 seconds
setInterval(updateInvestors, 3500);
setInterval(updateInvestors, 4000);

// =========================
// SCROLL-BASED VIDEOS
// — plays when in view
// — pauses when out
// =========================

const scrollVideos = document.querySelectorAll(".scroll-video");

const videoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
}, { threshold: 0.4 });

scrollVideos.forEach(v => videoObserver.observe(v));

// =========================
// LANGUAGE MENU
// =========================

const langBtn = document.getElementById("lang-btn");
const languageMenu = document.getElementById("languageMenu");

if (langBtn && languageMenu) {
  langBtn.addEventListener("click", () => {
    languageMenu.classList.toggle("show-language");
  });
}

function changeLanguage(lang) {
  localStorage.setItem("giai_language", lang);
  const select = document.querySelector(".goog-te-combo");
  if (select) {
    select.value = lang;
    select.dispatchEvent(new Event("change"));
  }
  const labels = {
    "en": "🇺🇸 EN", "fr": "🇫🇷 FR", "es": "🇪🇸 ES",
    "de": "🇩🇪 DE", "ar": "🇸🇦 AR", "zh-CN": "🇨🇳 CN"
  };
  const btn = document.getElementById("lang-btn");
  if (btn) btn.textContent = (labels[lang] || "🇺🇸 EN") + " ▼";
  languageMenu.classList.remove("show-language");
}

// =========================
// LIVE PROFIT POPUP
// =========================

window.addEventListener("DOMContentLoaded", () => {

  const namePools = {
    USA:         { first:["James","Michael","David","Chris","Emma","Sophia"], last:["Johnson","Smith","Brown","Taylor","Wilson"] },
    UK:          { first:["Oliver","Harry","George","Amelia","Emily","Grace"], last:["Smith","Jones","Brown","Taylor","Williams"] },
    Canada:      { first:["Liam","Noah","Ethan","Olivia","Ava","Isla"], last:["Martin","Roy","Lee","Tremblay"] },
    Australia:   { first:["Jack","Lucas","Noah","Chloe","Mia","Olivia"], last:["Smith","Brown","Wilson","Taylor","White"] },
    France:      { first:["Lucas","Louis","Hugo","Emma","Chloe","Manon"], last:["Martin","Bernard","Dubois","Thomas","Robert"] },
    Germany:     { first:["Lukas","Leon","Finn","Mia","Emma","Sophie"], last:["Müller","Schmidt","Schneider","Fischer","Weber"] },
    Netherlands: { first:["Daan","Lars","Jasper","Emma","Sophie","Julia"], last:["de Jong","Jansen","de Vries","Bakker","Visser"] },
    Switzerland: { first:["Noah","Leon","Luca","Emma","Mia","Sofia"], last:["Meier","Schmid","Keller","Weber","Fischer"] },
    Italy:       { first:["Luca","Marco","Giovanni","Sofia","Giulia","Chiara"], last:["Rossi","Russo","Ferrari","Esposito","Bianchi"] },
    UAE:         { first:["Mohammed","Ahmed","Omar","Ali","Yousef","Khalid"], last:["Al Farsi","Al Mansouri","Al Nuaimi","Al Shehhi","Al Habsi"] },
    Tunisia:     { first:["Mohamed","Ahmed","Karim","Youssef","Ali","Hichem"], last:["Ben Ali","Trabelsi","Haddad","Masmoudi","Ben Youssef"] },
    Sudan:       { first:["Mohamed","Ahmed","Abdullah","Ibrahim","Yasir","Omar"], last:["El Amin","Hassan","Mahmoud","Abdelrahman","Ali"] }
  };

  const countries = Object.keys(namePools);
  const plans = [
    { name:"Starter Plan",    min:250,    max:1500   },
    { name:"Standard Plan",   min:1500,   max:6000   },
    { name:"Premium Plan",    min:6000,   max:20000  },
    { name:"Capital Boost",   min:20000,  max:50000  },
    { name:"Rapid Return",    min:50000,  max:120000 },
    { name:"VIP Portfolio",   min:120000, max:300000 }
  ];

  function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  let recentUsers = [];

  function generateInvestor() {
    let full;
    do {
      const country = randomItem(countries);
      const pool = namePools[country];
      full = `${randomItem(pool.first)} ${randomItem(pool.last)} • ${country}`;
    } while (recentUsers.includes(full));
    recentUsers.push(full);
    if (recentUsers.length > 20) recentUsers.shift();
    return full;
  }

  function updateProfitPopup() {
    const userEl   = document.getElementById("profitUser");
    const amountEl = document.getElementById("profitAmount");
    const planEl   = document.getElementById("profitPlan");
    const popup    = document.getElementById("profitPopup");
    if (!userEl || !amountEl || !planEl || !popup) return;

    const plan   = randomItem(plans);
    const amount = Math.floor(Math.random() * (plan.max - plan.min) + plan.min);

    userEl.innerText   = generateInvestor();
    amountEl.innerText = `+$${amount.toLocaleString()}`;
    planEl.innerText   = plan.name;

    popup.style.animation = "none";
    void popup.offsetWidth;
    popup.style.animation = "floatProfit 3s ease-out forwards";
  }

  function loopPopup() {
    updateProfitPopup();
    setTimeout(loopPopup, 4000);
  }

  loopPopup();
});

// =========================
// NAVIGATION HELPERS
// =========================

function openDashboard() { window.location.href = "dashboard.html"; }

function scrollToRankings() {
  const reps = document.querySelector(".representatives");
  if (reps) reps.scrollIntoView({ behavior: "smooth" });
}

function openPlans() {
  const plans = document.querySelector(".plans");
  if (plans) plans.scrollIntoView({ behavior: "smooth" });
}

function goToPlan(plan) {
  localStorage.setItem("selectedPlan", plan);
  window.location.href = "dashboard.html";
}

function openAuth() {
  document.querySelector(".auth-section").style.display = "flex";
}

function closeAuth() {
  document.querySelector(".auth-section").style.display = "none";
}

// =========================
// COUNTRY DROPDOWN
// =========================

const countryList = document.getElementById("countryList");
const countrySearch = document.getElementById("countrySearch");

const countryNames = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia",
  "Australia","Austria","Azerbaijan","Bahrain","Bangladesh","Belgium","Brazil",
  "Bulgaria","Canada","China","Croatia","Cyprus","Czech Republic","Denmark",
  "Egypt","Estonia","Finland","France","Germany","Ghana","Greece","Hong Kong",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel",
  "Italy","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon",
  "Libya","Lithuania","Luxembourg","Malaysia","Mexico","Monaco","Morocco",
  "Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Singapore",
  "Slovakia","South Africa","South Korea","Spain","Sweden","Switzerland",
  "Thailand","Tunisia","Turkey","UAE","Ukraine","United Kingdom","United States","Vietnam"
];

function loadCountries() {
  if (!countryList) return;
  countryList.innerHTML = "";
  countryNames.sort().forEach(country => {
    const div = document.createElement("div");
    div.classList.add("country-item");
    div.innerText = country;
    div.onclick = () => {
      if (countrySearch) countrySearch.value = country;
      countryList.style.display = "none";
    };
    countryList.appendChild(div);
  });
}

loadCountries();

function toggleCountryList() {
  if (countryList) countryList.style.display = "block";
}

function filterCountries() {
  if (!countrySearch || !countryList) return;
  const value = countrySearch.value.toLowerCase();
  document.querySelectorAll(".country-item").forEach(item => {
    item.style.display = item.innerText.toLowerCase().includes(value) ? "block" : "none";
  });
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".country-select-wrapper") && countryList) {
    countryList.style.display = "none";
  }
});

// =========================
// CHAT
// =========================

const chatButton = document.getElementById("chatButton");
const chatWindow = document.getElementById("chatWindow");
const closeChat  = document.getElementById("closeChat");

if (chatButton) chatButton.onclick = () => { chatWindow.style.display = "flex"; loadMessages(); };
if (closeChat)  closeChat.onclick  = () => { chatWindow.style.display = "none"; };

async function sendMessage() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if (!currentUser) { alert("Please login first"); return; }
  const input   = document.getElementById("userMessage");
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  try {
    await fetch("/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentUser.email, name: currentUser.name, message })
    });
    await loadMessages();
  } catch(err) {
    document.getElementById("chatMessages").innerHTML += `<div class="bot-message">Message failed to send.</div>`;
  }
}

async function loadMessages() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if (!currentUser) return;
  const response = await fetch(`/chat/messages/${currentUser.email}`);
  const data     = await response.json();
  const messages = document.getElementById("chatMessages");
  messages.innerHTML = "";
  data.messages.forEach(msg => {
    messages.innerHTML += `<div class="${msg.sender === "user" ? "user-message" : msg.sender === "admin" ? "admin-message" : "bot-message"}">${msg.text}</div>`;
  });
  messages.scrollTop = messages.scrollHeight;
}

setInterval(loadMessages, 3000);

// Enter key sends message
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && document.getElementById("userMessage") === document.activeElement) {
    sendMessage();
  }
});

// =========================
// ANNOUNCEMENT BANNER
// =========================
const bannerStyle = document.createElement("style");
bannerStyle.textContent = `
#announcementBanner { display:none; position:fixed; top:0; left:0; width:100%; z-index:99998; padding:14px 50px 14px 20px; text-align:center; font-size:15px; font-weight:600; line-height:1.5; }
#announcementBanner.type-info    { background:#1a3a5c; color:#7ec8ff; border-bottom:1px solid #2a5a8c; }
#announcementBanner.type-success { background:#0d2e1a; color:#00d26a; border-bottom:1px solid #1a5a34; }
#announcementBanner.type-warning { background:#2e2200; color:#f0b90b; border-bottom:1px solid #5a4400; }
#announcementBanner.type-urgent  { background:#2e0a0a; color:#ff5555; border-bottom:1px solid #5a1a1a; }
#announcementClose { position:absolute; right:16px; top:50%; transform:translateY(-50%); cursor:pointer; font-size:20px; background:none; border:none; color:inherit; opacity:0.7; }
#announcementClose:hover { opacity:1; }
`;
document.head.appendChild(bannerStyle);

function updateNavPosition() {
  const banner = document.getElementById("announcementBanner");
  const nav = document.querySelector(".top-nav");
  if (!nav) return;
  if (banner && banner.style.display !== "none") {
    nav.style.top = (45 + banner.offsetHeight) + "px";
  } else {
    nav.style.top = "45px";
  }
}

async function loadSiteSettings() {
  try {
    const res = await fetch("/site-settings");
    if (!res.ok) return;
    const data = await res.json();
    const ann = data.announcement;
    if (ann && ann.enabled && ann.message && ann.message.trim() !== "") {
      const banner = document.getElementById("announcementBanner");
      document.getElementById("announcementText").textContent = ann.message;
      banner.className = "type-" + (ann.type || "info");
      banner.style.display = "block";
      updateNavPosition();
    } else {
      updateNavPosition();
    }
  } catch(e) {
    console.warn("Site settings could not load:", e.message);
  }
}

// Close button
const closeBtn = document.getElementById("announcementClose");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    const banner = document.getElementById("announcementBanner");
    if (banner) banner.style.display = "none";
    updateNavPosition();
  });
}

loadSiteSettings();

// =========================
// LIVE COUNTERS
// =========================

const repCountryMap = {
  "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
  "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
  "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
  "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
};

async function fetchAndUpdateCounters() {
  try {
    const res = await fetch("/counter-state");
    const data = await res.json();
    const counters = data.counters || {};
    let repTotals = {};

    Object.entries(repCountryMap).forEach(([rep, countries]) => {
      const repKey = rep.replace(/\s+/g, "-");
      const repData = counters[rep] || {};
      let total = 0;

      countries.forEach(country => {
        const countryKey = country.replace(/\s+/g, "-");
        const current = (repData[country] || {}).current || 0;
        total += current;
        const el = document.getElementById("counter-" + repKey + "-" + countryKey);
        if (el) el.innerText = current.toLocaleString();
      });

      repTotals[rep] = total;
      const totalEl = document.getElementById("total-" + repKey);
      if (totalEl) totalEl.innerText = total.toLocaleString();
    });

    // Update rankings based on total votes
    const sorted = Object.entries(repTotals).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([rep], index) => {
      const rankEl = document.getElementById("rank-" + rep.replace(/\s+/g, "-"));
      if (rankEl) rankEl.innerText = "#" + (index + 1);
    });

  } catch(e) {
    console.log("Counter fetch failed", e);
  }
}

loadSiteSettings();
fetchAndUpdateCounters();
setInterval(fetchAndUpdateCounters, 10000);

const scrollVideoObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const video = entry.target;
    if (entry.isIntersecting) {
      video.muted = false;
      video.play().catch(() => {
        // Browser blocked unmuted autoplay, fall back to muted
        video.muted = true;
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  });
}, { threshold: 0.5 });