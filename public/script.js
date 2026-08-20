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
    const url = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,dogecoin,cardano,avalanche-2,chainlink,shiba-inu&vs_currencies=usd";
    const res = await fetch(url);
    const data = await res.json();

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = "$" + Number(val).toLocaleString();
    };

    set("btc-price",  data.bitcoin?.usd);
    set("eth-price",  data.ethereum?.usd);
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

async function loadSiteSettings() {
  try {
    const res = await fetch("/site-settings");
    const data = await res.json();

    // Announcement banner
    const banner = document.getElementById("announcementBanner");
    if (banner && data.announcement && data.announcement.enabled) {
      banner.style.display = "block";
      banner.className = "type-" + (data.announcement.type || "info");
      const textEl = document.getElementById("announcementText");
      if (textEl) textEl.textContent = data.announcement.message;
      updateNavPosition();
    }

    // Representatives data
    if (data.representatives) {
      Object.entries(data.representatives).forEach(([rep, countries]) => {
        const repKey = rep.replace(/\s+/g, "-");
        let total = 0;
        Object.entries(countries).forEach(([country, count]) => {
          const countryKey = country.replace(/\s+/g, "-");
          const el = document.getElementById("counter-" + repKey + "-" + countryKey);
          if (el) el.innerText = Number(count).toLocaleString();
          total += Number(count);
        });
        const totalEl = document.getElementById("total-" + repKey);
        if (totalEl) totalEl.innerText = total.toLocaleString();
      });
    }
  } catch(e) {
    console.log("loadSiteSettings error:", e);
  }
}

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
      video.currentTime = 0; // Optional: restart when it comes back
    }
  });
}, {
  threshold: 0.1,
  rootMargin: "150px 0px"
});

scrollVideos.forEach(video => {
  video.preload = "auto";
  video.muted = true;
  videoObserver.observe(video);
});

// ==========================================
// VIDEO SOUND BUTTONS
// ==========================================

document.querySelectorAll(".scroll-video").forEach(video => {

    const wrapper = video.parentElement;
    wrapper.style.position = "relative";

    const btn = document.createElement("button");
    btn.className = "video-sound-btn";

    btn.innerHTML = `
    <svg class="sound-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line class="mute-line" x1="23" y1="9" x2="17" y2="15"></line>
        <line class="mute-line" x1="17" y1="9" x2="23" y2="15"></line>
    </svg>
    `;

    Object.assign(btn.style, {
        position: "absolute",
        bottom: "18px",
        right: "18px",
        width: "46px",
        height: "46px",
        border: "none",
        borderRadius: "50%",
        background: "rgba(0,0,0,.45)",
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "20",
        transition: "all .25s ease"
    });

    btn.addEventListener("mouseenter", () => {
        btn.style.background = "rgba(0,0,0,.7)";
    });

    btn.addEventListener("mouseleave", () => {
        btn.style.background = "rgba(0,0,0,.45)";
    });

    video.muted = true;

    btn.onclick = (e) => {

        e.stopPropagation();

        video.muted = !video.muted;

        const lines = btn.querySelectorAll(".mute-line");

        lines.forEach(line => {
            line.style.display = video.muted ? "block" : "none";
        });

    };

    wrapper.appendChild(btn);

});

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

function openDashboard() {
  const user = localStorage.getItem("user");

  if (user) {
    const userData = JSON.parse(user);
    const mode = userData.dashboardMode || "representative";

    if (mode === "lite") {
      window.location.href = "/dashboard-lite.html";
    } else if (mode === "savings") {
      window.location.href = "/dashboard-savings.html";
    } else {
      window.location.href = "/dashboard.html";
    }
  } else {
    window.location.href = "signup.html";
  }
}

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
  window.location.href = "signup.html";
}

function closeAuth() {
  document.querySelector(".auth-section").style.display = "none";
}

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

  if (!currentUser) {
    alert("Please login first");
    return;
  }

  const input = document.getElementById("userMessage");
  const message = input.value.trim();

  if (!message) return;

  input.value = "";

  const messages = document.getElementById("chatMessages");

  messages.innerHTML += `
      <div class="typing-indicator" id="typingIndicator">
          <span></span>
          <span></span>
          <span></span>
      </div>
  `;

  messages.scrollTop = messages.scrollHeight;

  try {

    await fetch("/chat/send", {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        email:currentUser.email,
        name:currentUser.name,
        message
      })
    });

    setTimeout(async()=>{

      document.getElementById("typingIndicator")?.remove();

      await loadMessages();

    },1500);

  } catch(err){

    document.getElementById("typingIndicator")?.remove();

    messages.innerHTML +=
    `<div class="bot-message">Message failed to send.</div>`;

  }

}

async function loadMessages() {
  const currentUser = JSON.parse(localStorage.getItem("user"));
  if (!currentUser) return;
  const response = await fetch(`/chat/messages/${currentUser.email}`);
  const data     = await response.json();

const status = document.getElementById("supportStatus");

if (status) {
    status.textContent = data.online ? "🟢 Support Online" : "⚪ Support Offline";
}

  const messages = document.getElementById("chatMessages");
  messages.innerHTML = "";
if (data.typing) {

    messages.innerHTML += `
    <div class="bot-message typing-indicator">
        <span></span>
        <span></span>
        <span></span>
        <small style="display:block;margin-top:8px;color:#999;">
            Support is typing...
        </small>
    </div>`;

}
  data.messages.forEach(msg => {
   const cls =
msg.sender === "user"
? "user-message"
: msg.sender === "admin"
? "admin-message"
: "bot-message";

if (msg.sender === "user") {

messages.innerHTML += `
<div class="user-message">
${msg.text}
</div>
`;

} else {

messages.innerHTML += `
<div class="support-message">
    <div class="support-avatar">
        <img src="img/supportlogo.png" alt="Support">
    </div>

    <div class="bot-message">
        ${msg.text}
    </div>
</div>
`;

}
  });
if (data.typing) {

messages.innerHTML += `
<div class="support-message typing-indicator">

    <div class="support-avatar">
        <img src="img/supportlogo.png" alt="Support">
    </div>

    <div class="bot-message">
        <span></span>
        <span></span>
        <span></span>

        <small style="display:block;margin-top:8px;color:#999;">
            Support is typing...
        </small>
    </div>

</div>
`;

}

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
// LIVE COUNTERS
// =========================

const repCountryMap = {
  "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
  "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
  "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
  "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"],
  "Aaliyah Kathe": ["Norway","Sweden","Denmark","UAE","Qatar"],
  "Jyuon Yeon": ["Malaysia","South Korea","Japan","Thailand","Singapore"]
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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("video").forEach(video => {
    video.muted = true;
    video.play().catch(() => {});
  });
});

/* =========================
   PASSWORD TOGGLE
========================= */

function togglePassword(inputId, button){

    const input = document.getElementById(inputId);

    const icon = button.querySelector("svg");

    if(input.type === "password"){

        input.type = "text";

        icon.innerHTML = `
            <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.77 21.77 0 0 1 5.06-6.94"></path>
            <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.31 21.31 0 0 1-2.16 3.19"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;

    }else{

        input.type = "password";

        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;

    }

}

function validateWallet(wallet, type) {
  wallet = wallet.trim();

  switch (type) {

    case "btc":
      return /^(bc1[a-zA-HJ-NP-Z0-9]{25,59}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(wallet);

    case "eth":
      return /^0x[a-fA-F0-9]{40}$/.test(wallet);

    case "usdt":
      return /^T[a-zA-Z0-9]{33}$/.test(wallet);

    default:
      return false;
  }
}

