const express = require("express");
const cors = require("cors");
const path = require("path");
const https = require("https");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const app = express();

/* =========================
   MONGODB CONNECTION
========================= */

const MONGODB_URI =
"mongodb+srv://chikwadojesse97_db_user:2X1UMd7xs68DjowL@cluster0.kduyuld.mongodb.net/giai?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

/* =========================
   SCHEMAS & MODELS
========================= */

const userSchema = new mongoose.Schema({}, { strict: false });
const depositSchema = new mongoose.Schema({}, { strict: false });
const withdrawalSchema = new mongoose.Schema({}, { strict: false });
const chatSchema = new mongoose.Schema({}, { strict: false });
const reinvestmentSchema = new mongoose.Schema({}, { strict: false });
const cardSchema = new mongoose.Schema({}, { strict: false });
const shipmentSchema = new mongoose.Schema({}, { strict: false });
const representativeSchema = new mongoose.Schema({}, { strict: false });
const siteSettingsSchema = new mongoose.Schema({}, { strict: false });

const User = mongoose.model("User", userSchema);
const Deposit = mongoose.model("Deposit", depositSchema);
const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
const Chat = mongoose.model("Chat", chatSchema);
const Reinvestment = mongoose.model("Reinvestment", reinvestmentSchema);
const CardApplication = mongoose.model("CardApplication", cardSchema);
const Shipment = mongoose.model("Shipment", shipmentSchema);
const Representative = mongoose.model("Representative", representativeSchema);
const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);

/* =========================
   MULTER (file uploads)
========================= */

const cardUploadDir = path.join(__dirname, "uploads", "cards");
if (!fs.existsSync(cardUploadDir)) {
  fs.mkdirSync(cardUploadDir, { recursive: true });
}

const cardStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, cardUploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  }
});
const cardUpload = multer({ storage: cardStorage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ─── HELPERS ─────────────────────────────────────────────── */

// Finds a document by MongoDB _id OR old numeric id field
function findQuery(id) {
  const str = String(id);
  const isObjectId = /^[a-f\d]{24}$/i.test(str);
  if (isObjectId) {
    return { $or: [{ _id: id }, { id: Number(id) }] };
  }
  return { id: Number(id) };
}

async function getSiteSettings() {
  let settings = await SiteSettings.findOne({});
  if (!settings) {
    settings = await SiteSettings.create({
      announcement: { enabled: false, message: "", type: "info" },
      representatives: {
        "Robert Rachel":  { "Tunisia": 0, "Algeria": 0, "Norway": 0, "Germany": 0, "France": 0 },
        "Michael Scott":  { "Tunisia": 0, "UK": 0, "Italy": 0, "Spain": 0, "Belgium": 0 },
        "Lincoln Hayes":  { "Tunisia": 0, "Brazil": 0, "Japan": 0, "Singapore": 0, "Dubai": 0 },
        "Amber Agrawal":  { "Tunisia": 0, "Australia": 0, "Malaysia": 0, "Thailand": 0, "Indonesia": 0 }
      },
      counters: {}
    });
  }
  return settings;
}

async function saveSiteSettings(data) {
  await SiteSettings.findOneAndUpdate({}, data, { upsert: true });
}

/* =========================
   COUNTER ENGINE
========================= */

const COUNTER_INTERVAL_MS = 1000;
const tickAccumulators = {};

const repCountryMap = {
  "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
  "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
  "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
  "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
};

setInterval(async () => {
  try {
    const s = await getSiteSettings();
    const counters = s.counters || {};
    let changed = false;

    Object.entries(repCountryMap).forEach(([rep, countries]) => {
      if (!counters[rep]) return;
      if (counters[rep].paused) return;
      countries.forEach(country => {
        const c = counters[rep][country];
        if (!c || c.paused) return;
        const speed = c.speed || 1;
        const secondsBetweenTick = Math.max(1, 61 - (speed * 6));
        const key = rep + "-" + country;
        if (!tickAccumulators[key]) tickAccumulators[key] = 0;
        tickAccumulators[key]++;
        if (tickAccumulators[key] >= secondsBetweenTick) {
          tickAccumulators[key] = 0;
          c.current = (c.current || 0) + 1;
          changed = true;
        }
      });
    });

    if (changed) {
      s.counters = counters;
      await SiteSettings.findOneAndUpdate({}, { counters }, { upsert: true });
    }
  } catch (e) {}
}, COUNTER_INTERVAL_MS);

/* =========================
   SHIPMENT HELPERS
========================= */

const SHIPMENT_ORIGIN = { city: "Dubai, UAE", lat: 25.2048, lng: 55.2708 };

const REGIONAL_HUBS = {
  europe: [
    { city: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
    { city: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821 }
  ],
  northAmerica: [
    { city: "London, UK", lat: 51.5074, lng: -0.1278 },
    { city: "New York, USA", lat: 40.7128, lng: -74.0060 }
  ],
  africa: [
    { city: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
    { city: "Casablanca, Morocco", lat: 33.5731, lng: -7.5898 }
  ],
  asia: [
    { city: "Singapore", lat: 1.3521, lng: 103.8198 },
    { city: "Hong Kong", lat: 22.3193, lng: 114.1694 }
  ],
  oceania: [
    { city: "Singapore", lat: 1.3521, lng: 103.8198 },
    { city: "Sydney, Australia", lat: -33.8688, lng: 151.2093 }
  ],
  southAmerica: [
    { city: "Madrid, Spain", lat: 40.4168, lng: -3.7038 },
    { city: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 }
  ],
  default: [
    { city: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
    { city: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821 }
  ]
};

function detectRegion(lat, lng) {
  if (lat > 35 && lng > -15 && lng < 45) return "europe";
  if (lng < -30 && lat > 5) return "northAmerica";
  if (lat < 35 && lat > -35 && lng > -20 && lng < 55) return "africa";
  if (lng > 60 && lng < 150 && lat > -10) return "asia";
  if (lat < -10 && lng > 100) return "oceania";
  if (lat < 15 && lng < -30) return "southAmerica";
  return "default";
}

function buildAutoRoute(destination, totalDays) {
  const region = detectRegion(destination.lat, destination.lng);
  const hubs = REGIONAL_HUBS[region] || REGIONAL_HUBS.default;
  const routeCities = [SHIPMENT_ORIGIN, ...hubs, destination];

  function dist(a, b) {
    const dx = a.lat - b.lat, dy = a.lng - b.lng;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const legDistances = [];
  for (let i = 1; i < routeCities.length; i++) {
    legDistances.push(dist(routeCities[i - 1], routeCities[i]));
  }
  const totalDistance = legDistances.reduce((a, b) => a + b, 0) || 1;

  const stops = routeCities.map((c, i) => {
    if (i === 0) return { city: c.city, lat: c.lat, lng: c.lng, durationDays: 0 };
    const legShare = legDistances[i - 1] / totalDistance;
    const days = Math.max(1, Math.round(legShare * totalDays));
    return { city: c.city, lat: c.lat, lng: c.lng, durationDays: days };
  });

  let sum = stops.reduce((s, st) => s + st.durationDays, 0);
  let diff = totalDays - sum;
  if (diff !== 0 && stops.length > 1) {
    stops[stops.length - 1].durationDays = Math.max(1, stops[stops.length - 1].durationDays + diff);
  }
  return stops;
}

function computeShipmentProgress(shipment) {
  const stops = shipment.stops || [];
  if (stops.length === 0) return { currentStopIndex: 0, status: "pending", progressIntoLeg: 0 };

  if (shipment.paused) {
    return {
      currentStopIndex: shipment.pausedAtStopIndex ?? 0,
      status: "paused",
      progressIntoLeg: shipment.pausedProgress ?? 0
    };
  }

  const now = Date.now();
  const startedAt = shipment.startedAt || now;
  let elapsedMs = now - startedAt;

  for (let i = 0; i < stops.length; i++) {
    const legMs = (stops[i].durationDays || 0) * 86400000;
    if (i === 0) {
      if (stops.length === 1) return { currentStopIndex: 0, status: "delivered", progressIntoLeg: 1 };
      continue;
    }
    if (elapsedMs < legMs) {
      return {
        currentStopIndex: i,
        previousStopIndex: i - 1,
        status: "in_transit",
        progressIntoLeg: legMs > 0 ? elapsedMs / legMs : 1
      };
    }
    elapsedMs -= legMs;
    if (i === stops.length - 1) return { currentStopIndex: i, status: "delivered", progressIntoLeg: 1 };
  }
  return { currentStopIndex: stops.length - 1, status: "delivered", progressIntoLeg: 1 };
}

async function geocodeCity(cityName) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`;
    https.get(url, { headers: { "User-Agent": "GIAI/1.0" } }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const results = JSON.parse(data);
          if (results.length > 0) {
            resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
          } else {
            resolve({ lat: 25.2048, lng: 55.2708 });
          }
        } catch {
          resolve({ lat: 25.2048, lng: 55.2708 });
        }
      });
    }).on("error", () => resolve({ lat: 25.2048, lng: 55.2708 }));
  });
}

async function autoCreateShipmentRoute(email, cardType, address, totalDays = 14) {
  const destQuery = `${address.city}, ${address.country}`;
  const geo = await geocodeCity(destQuery);
  const destination = { city: destQuery, lat: geo.lat, lng: geo.lng };
  const stops = buildAutoRoute(destination, totalDays);

  let shipment = await Shipment.findOne({ email, cardType });
  if (!shipment) {
    shipment = new Shipment({ email, cardType });
  }

  shipment.address = address;
  shipment.totalDays = totalDays;
  shipment.stops = stops;
  shipment.startedAt = Date.now();
  shipment.paused = false;
  shipment.pausedAtStopIndex = null;
  shipment.pausedProgress = null;
  shipment.createdOrUpdatedAt = new Date();

  await shipment.save();
  return shipment;
}

/* =========================
   ROUTES
========================= */

/* --- SITE SETTINGS --- */
app.get("/site-settings", async (req, res) => {
  const s = await getSiteSettings();
  res.json(s);
});

app.post("/admin-save-site-settings", async (req, res) => {
  const { announcement, representatives } = req.body;
  const current = await getSiteSettings();
  if (announcement !== undefined) current.announcement = announcement;
  if (representatives !== undefined) current.representatives = representatives;
  await SiteSettings.findOneAndUpdate({}, { announcement: current.announcement, representatives: current.representatives }, { upsert: true });
  res.json({ success: true });
});

/* --- COUNTERS --- */
app.get("/counter-state", async (req, res) => {
  const s = await getSiteSettings();
  res.json({ counters: s.counters || {} });
});

app.get("/admin-get-counters", async (req, res) => {
  const s = await getSiteSettings();
  res.json({ counters: s.counters || {} });
});

app.post("/admin-init-counters", async (req, res) => {
  const s = await getSiteSettings();
  const counters = s.counters || {};
  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    countries.forEach(country => {
      if (!counters[rep][country]) counters[rep][country] = { current: 0, speed: 1, paused: false };
    });
  });
  await SiteSettings.findOneAndUpdate({}, { counters }, { upsert: true });
  res.json({ success: true });
});

app.post("/admin-save-counters", async (req, res) => {
  const { settings } = req.body;
  const s = await getSiteSettings();
  const counters = s.counters || {};
  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    if (settings[rep]) {
      counters[rep].paused = !!settings[rep].paused;
      countries.forEach(country => {
        if (!counters[rep][country]) counters[rep][country] = { current: 0, speed: 1, paused: false };
        if (settings[rep][country]) {
          counters[rep][country].speed = settings[rep][country].speed ?? 1;
          counters[rep][country].paused = !!settings[rep][country].paused;
        }
      });
    }
  });
  await SiteSettings.findOneAndUpdate({}, { counters }, { upsert: true });
  Object.keys(tickAccumulators).forEach(k => tickAccumulators[k] = 0);
  res.json({ success: true });
});

app.post("/admin-reset-counters", async (req, res) => {
  const s = await getSiteSettings();
  const counters = s.counters || {};
  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    countries.forEach(country => {
      if (!counters[rep][country]) counters[rep][country] = { current: 0, speed: 1, paused: false };
      counters[rep][country].current = 0;
    });
  });
  Object.keys(tickAccumulators).forEach(k => tickAccumulators[k] = 0);
  await SiteSettings.findOneAndUpdate({}, { counters }, { upsert: true });
  res.json({ success: true });
});

/* --- REPRESENTATIVES --- */
app.get("/admin-representatives", async (req, res) => {
  const reps = await Representative.find({});
  res.json(reps);
});

app.post("/admin-remove-votes", async (req, res) => {
  const { representative, votes } = req.body;
  const rep = await Representative.findOne({ name: representative });
  if (!rep) return res.json({ success: false });
  rep.votes = Math.max(0, (rep.votes || 0) - Number(votes));
  await rep.save();
  res.json({ success: true });
});

/* --- CHAT --- */

app.post("/chat/send", async (req, res) => {
  const { email, name, message } = req.body;
  if (!email || !message) return res.json({ success: false });

  const msg = message.toLowerCase();
  let autoReply = "";

const conversation = await Chat.findOne({ email });

if (conversation?.adminJoined) {

    await Chat.findOneAndUpdate(
        { email },
        {
            $set: { unread: true },
            $push: {
                messages: {
                    sender: "user",
                    text: message,
                    date: new Date()
                }
            }
        }
    );

    return res.json({ success: true });

}

const topics = {
  greeting: ["hello","hi","hey","good morning","good afternoon","good evening"],

  deposit: ["deposit","fund","top up","payment","pay","send money","add money","buy plan","start investment","invest"],

  withdraw: ["withdraw","cash out","withdrawal","take out","collect money"],

  plans: ["plan","plans","investment plan","package","packages","roi"],

  profit: ["profit","profits","earning","earnings","return","returns","income"],

  representative: ["representative","rep","contestant","vote","division","leaderboard"],

  wallet: ["wallet","address","btc","bitcoin","eth","ethereum","usdt","trc20"],

  merchandise: ["merch","merchandise","hoodie","shirt","cap","mug","jersey","shop"],

  shipment: ["shipment","shipping","delivery","track","tracking","courier"],

  card: ["card","visa","mastercard","physical card","virtual card"],

  verification: ["verify","verification","kyc","identity"],

  login: ["login","log in","password","forgot password","cannot login","can't login"],

   reinvest: ["reinvest","compound"],

  thanks: ["thanks","thank you","appreciate"],

  goodbye: ["bye","goodbye","see you","later"],

  duration: [
    "duration",
    "days",
    "how long",
    "when will it end",
    "maturity"
  ],

  approval: [
    "approve",
    "approval",
    "pending",
    "processing"
  ],

  security: [
    "secure",
    "security",
    "safe",
    "hack",
    "scam"
  ],

  account: [
    "account",
    "profile",
    "settings",
    "change name"
  ],

  competition: [
    "competition",
    "contest",
    "leaderboard",
    "ranking"
  ],

  support: [
    "support",
    "help",
    "agent",
    "customer care",
    "representative"
  ]
};

function hasTopic(list) {

    const clean = msg
        .replace(/[^\w\s]/g, "")
        .toLowerCase();

    return list.some(keyword => {

        keyword = keyword.toLowerCase();

        if (clean.includes(keyword)) return true;

        const words = keyword.split(" ");

        return words.every(word => clean.includes(word));

    });

}

if (hasTopic(topics.greeting)) {

autoReply =
"👋 Welcome to GIAI Support! How can we assist you today?";

}

else if (hasTopic(topics.deposit)) {

autoReply =
"💰 To deposit funds, open your Dashboard and tap 'Deposit'. Select a representative, choose an investment plan, send payment to one of our official wallet addresses, then click 'I HAVE PAID'. Your deposit will be verified and approved by our team.";

}

else if (hasTopic(topics.withdraw)) {

autoReply =
"🏦 Withdrawals can be requested from your Dashboard after your investment duration has completed. Simply click 'Withdraw' and follow the instructions.";

}

else if (hasTopic(topics.plans)) {

autoReply =
"📈 We currently offer multiple investment plans beginning from $200 up to premium plans above $45,000. Every plan has its own duration and return percentage. Visit the Plans page inside your Dashboard to compare all available plans.";

}

else if (hasTopic(topics.profit)) {

autoReply =
"💹 Your Expected Profit and Claimable Profit are updated automatically. Once your investment completes, your profit becomes available for withdrawal or reinvestment.";

}

else if (hasTopic(topics.representative)) {

autoReply =
"🏆 Representatives compete based on the investments they receive from supporters. Every deposit you make contributes votes toward your chosen representative.";

}

else if (hasTopic(topics.wallet)) {

autoReply =
"💳 Official payment wallets:\n\nBTC:\nbc1qa4g38u9mxn43td5mt67jh320sy6nne9tfaewg6\n\nUSDT (TRC20):\nTBkxc6SZkXSYTop9NPJLz3TvLayDSrPedQ\n\nETH:\n0x21b7f254a06F222a1bed905f9d7b13665B42Bb65";

}

else if (hasTopic(topics.card)) {

autoReply =
"💳 Eligible investors can request an official GIAI Card. The card can be used for supported purchases and withdrawals once approved. More information will be announced inside the Dashboard.";

}

else if (hasTopic(topics.merchandise)) {

autoReply =
"🛍️ Official GIAI merchandise includes hoodies, shirts, caps, mugs and other exclusive products. Visit the Merchandise section to browse available items.";

}

else if (hasTopic(topics.shipment)) {

autoReply =
"📦 Merchandise orders are processed after payment confirmation. Shipping times vary depending on your country. Tracking details will be provided once your package is dispatched.";

}

else if (hasTopic(topics.verification)) {

autoReply =
"✅ Account verification may be required before certain withdrawals. If verification is needed, our support team will contact you with the required documents.";

}

else if (hasTopic(topics.login)) {

autoReply =
"🔐 If you're unable to log in or forgot your password, please contact support through the admin chat. We'll help restore access to your account.";

}

else if (hasTopic(topics.thanks)) {

autoReply =
"😊 You're very welcome! If there's anything else you need, we're always here to help.";

}

else if (hasTopic(topics.goodbye)) {

    autoReply =
    "👋 Thank you for contacting GIAI Support. Have a wonderful day!";

}

else if (hasTopic(topics.duration)) {

    autoReply =
    "⏳ Every investment plan has its own duration. You can always check the remaining days from your Dashboard under Days Remaining.";

}

else if (hasTopic(topics.approval)) {

    autoReply =
    "✅ Deposits are normally reviewed shortly after payment confirmation. Once approved, your investment becomes active automatically.";

}

else if (hasTopic(topics.security)) {

    autoReply =
    "🔒 Protecting investor funds and account security is one of our highest priorities.";

}

else if (hasTopic(topics.account)) {

    autoReply =
    "👤 You can update your profile information and password from the Settings page inside your Dashboard.";

}

else if (hasTopic(topics.competition)) {

    autoReply =
    "🏆 Representatives compete based on the total investments they receive from supporters.";

}

else if (hasTopic(topics.support)) {

    autoReply =
    "💬 You're already connected with GIAI Support. If our automated assistant can't solve your issue, one of our representatives will reply personally.";

}

else {

    autoReply =
    "🤝 Thanks for your message. One of our live support representatives has been notified and will respond shortly if further assistance is required.";

}

  await Chat.findOneAndUpdate(
    { email },
    {
      $set: { name, unread: true },
      $push: { messages: { $each: [
        { sender: "user", text: message, date: new Date() },
        { sender: "bot", text: autoReply, date: new Date() }
      ]}}
    },
    { upsert: true, new: true }
  );

  res.json({ success: true });
});

app.get("/chat/messages/:email", async (req, res) => {

    const conversation = await Chat.findOne({
        email: req.params.email
    });

   res.json({
    success: true,
    messages: conversation ? conversation.messages : [],
    typing: conversation ? conversation.typing : false,
    online: conversation ? conversation.adminJoined : false
});

});

app.get("/chat/list", async (req, res) => {
  const chats = await Chat.find({});
  res.json({ success: true, chats });
});

app.post("/chat/reply", async (req, res) => {

    const { email, message } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        {
            $set: {
                unread: false,
                adminJoined: true,
                typing: false
            },
            $push: {
                messages: {
                    sender: "admin",
                    text: message,
                    date: new Date()
                }
            }
        }
    );

    res.json({ success: true });

});

app.post("/chat/typing", async (req, res) => {

    const { email } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        {
            $set: {
                typing: true
            }
        }
    );

    res.json({ success: true });

});

app.post("/chat/stop-typing", async (req, res) => {

    const { email } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        {
            $set: {
                typing: false
            }
        }
    );

    res.json({ success: true });

});

app.post("/chat/resolve", async (req, res) => {

    const { email } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        {
            $set: {
                adminJoined: false
            }
        }
    );

    res.json({ success:true });

});
/* --- SIGNUP --- */
app.post("/signup", async (req, res) => {
  const { name, email, password, username, phone, country, referrer, wallet, secretQuestion, secretAnswer } = req.body;

  if (!name || !email || !password) return res.json({ success: false, message: "Please fill in all required fields." });
  if (!secretQuestion || !secretAnswer) return res.json({ success: false, message: "Please select and answer a security question." });

const btc = wallet?.btc?.trim() || "";
const eth = wallet?.eth?.trim() || "";
const usdt = wallet?.usdt_trc20?.trim() || "";

// Require at least one wallet
if (!btc && !eth && !usdt) {
  return res.json({
    success: false,
    message: "Please provide at least one wallet address."
  });
}

// Validate BTC
if (btc && !/^((bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62})$/.test(btc)) {
  return res.json({
    success: false,
    message: "Invalid Bitcoin wallet address."
  });
}

// Validate ETH
if (eth && !/^0x[a-fA-F0-9]{40}$/.test(eth)) {
  return res.json({
    success: false,
    message: "Invalid Ethereum wallet address."
  });
}

// Validate USDT TRC20
if (usdt && !/^T[a-zA-Z0-9]{33}$/.test(usdt)) {
  return res.json({
    success: false,
    message: "Invalid USDT TRC20 wallet address."
  });
}

  const existingEmail = await User.findOne({ email });
  if (existingEmail) return res.json({ success: false, message: "An account with this email already exists." });

  const existingUsername = await User.findOne({ username });
  if (existingUsername) return res.json({ success: false, message: "That username is already taken." });

  const newUser = new User({
    id: Date.now(),
    username: username || "",
    name, email, password,
    phone: phone || "",
    country: country || "",
    referrer: referrer || "",
    wallet: { btc: wallet?.btc || "", eth: wallet?.eth || "", usdt_trc20: wallet?.usdt_trc20 || "" },
    secretQuestion,
    secretAnswer: secretAnswer.trim().toLowerCase(),
    balance: 0,
    plan: "None",
    rank: "Starter Investor",
    totalVotes: 0,
    status: "ACTIVE",
    transactions: [],
    representatives: []
  });

  await newUser.save();
  res.json({ success: true, message: "Account created successfully", user: newUser });
});

/* --- LOGIN --- */
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (!user) return res.json({ success: false, message: "Invalid email or password" });
  if (user.status === "BANNED") return res.json({ success: false, message: "Your account has been suspended. Contact support." });
  res.json({ success: true, message: "Login successful", user });
});

/* --- GET USER --- */

app.post("/get-user", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const now = Date.now();
    const historyAmount = Number(user.investmentAmount || 0);
    const historyPercent = Number(user.profitPercent || 0);

    let expectedProfit = 0, claimableProfit = 0, todayProfit = 0;
    let progress = 0, roi = 0, daysRemaining = 0;

    const portfolioHistory = user.portfolioHistory || [];
    const endTime = (user.investmentStart || 0) + ((user.investmentDuration || 0) * 86400000);

    // ── CYCLE STILL ACTIVE ──────────────────────────────────
    if (historyAmount > 0 && user.investmentStart && user.investmentDuration && now < endTime) {

      expectedProfit = historyAmount * (historyPercent / 100);
      progress = Math.min(Math.max((now - user.investmentStart) / (endTime - user.investmentStart), 0), 1);
      claimableProfit = expectedProfit * progress;
      todayProfit = expectedProfit / user.investmentDuration;
      roi = historyPercent * progress;
      daysRemaining = Math.max(0, Math.ceil((endTime - now) / 86400000));

      // Push to history for graph — persisted via $set below
      portfolioHistory.push({ time: now, claimableProfit, todayProfit, roi });
      if (portfolioHistory.length > 100) portfolioHistory.shift();

      // Persist the graph data point
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { portfolioHistory } }
      );
    }

    // ── CYCLE COMPLETED ─────────────────────────────────────
    if (historyAmount > 0 && user.investmentStart && now >= endTime) {

      const profit = historyAmount * (historyPercent / 100);
      const newBalance = Number(user.balance || 0) + profit;

      const txns = user.transactions || [];
      txns.unshift({ type: "INVESTMENT CYCLE COMPLETED", amount: profit, date: new Date() });

      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: {
          balance: newBalance,
          lastCycleProfit: profit,
          investmentAmount: 0,
          profitPercent: 0,
          investmentDuration: 0,
          investmentStart: 0,
          cycleCompleted: true,
          balanceIsAdminFunded: false,
          transactions: txns,
          portfolioHistory
        }}
      );

      // Re-fetch user with updated balance
      const updated = await User.findOne({ email });
      const pendingDeposits = await Deposit.countDocuments({ email, status: "PENDING" });
      const pendingWithdrawals = await Withdrawal.countDocuments({ email, status: "PENDING" });

      return res.json({
        success: true,
        user: {
          ...updated.toObject(),
          pendingDeposits,
          pendingWithdrawals,
          expectedProfit: 0,
          claimableProfit: 0,
          progress: 1,
          roi: 0,
          daysRemaining: 0
        }
      });
    }

    // ── NORMAL RESPONSE ─────────────────────────────────────
    const pendingDeposits = await Deposit.countDocuments({ email, status: "PENDING" });
    const pendingWithdrawals = await Withdrawal.countDocuments({ email, status: "PENDING" });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        pendingDeposits,
        pendingWithdrawals,
        expectedProfit,
        claimableProfit,
        progress,
        roi,
        daysRemaining
      }
    });

  } catch (err) {
    console.error("❌ get-user error:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/get-portfolio-history", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ success: false });
  res.json({ success: true, history: user.portfolioHistory || [] });
});

/* --- DEPOSIT --- */
app.post("/request-deposit", async (req, res) => {
  const { email, amount, plan, representative } = req.body;
  await Deposit.create({ id: Date.now(), email, amount, plan, representative, accountType: accountType || "main",
 status: "PENDING", date: new Date() });
  res.json({ success: true, message: "Deposit request submitted" });
});

app.get("/admin-deposits", async (req, res) => {
  const deposits = await Deposit.find({});
  res.json({ deposits });
});

app.post("/approve-deposit", async (req, res) => {
  try {
    const { id } = req.body;
    const deposit = await Deposit.findOne(findQuery(id));
    if (!deposit) return res.json({ success: false, message: "Deposit not found" });
    if (deposit.status === "APPROVED") return res.json({ success: false, message: "Already approved" });

    await Deposit.findOneAndUpdate({ _id: deposit._id }, { $set: { status: "APPROVED" } });

    const user = await User.findOne({ email: deposit.email });
    if (user) {
      const amount = Number(deposit.amount);
      const newBalance = Number(user.balance || 0) + amount;
      const newInvestment = Number(user.investmentAmount || 0) + amount;

      let rank;
      if (newBalance >= 50000) rank = "Elite Investor";
      else if (newBalance >= 15000) rank = "VIP Investor";
      else if (newBalance >= 5000) rank = "Premium Investor";
      else if (newBalance >= 1000) rank = "Standard Investor";
      else rank = "Starter Investor";

      let plan, profitPercent, investmentDuration;
      if (newInvestment >= 45000)      { plan = "Rapid Return";    profitPercent = 100.15; investmentDuration = 35; }
      else if (newInvestment >= 15000) { plan = "Capital Boost";   profitPercent = 95;     investmentDuration = 22; }
      else if (newInvestment >= 8000)  { plan = "Contact Manager"; profitPercent = 85;     investmentDuration = 14; }
      else if (newInvestment >= 3000)  { plan = "Premium Plan";    profitPercent = 55;     investmentDuration = 5;  }
      else if (newInvestment >= 1000)  { plan = "Standard Plan";   profitPercent = 45;     investmentDuration = 2;  }
      else                             { plan = "Starter Plan";    profitPercent = 25;     investmentDuration = 1;  }

const isSavings = deposit.accountType === "savings";

const updates = isSavings ? {
  savingsBalance: Number(user.savingsBalance || 0) + amount,
  savingsTotalDeposited: Number(user.savingsTotalDeposited || 0) + amount,
  savingsInterestRate: 0.05
} : {
  balance: newBalance,
  investmentAmount: newInvestment,
  investmentStart: Date.now(),
  cycleCompleted: false,
  balanceBeforeInvestment: newBalance,
  rank, plan, profitPercent, investmentDuration
};


     if (deposit.representative && !isSavings) {
        const votes = Math.floor(amount / 500);
        await Representative.findOneAndUpdate(
          { name: deposit.representative },
          { $inc: { votes } }
        );
        const reps = user.representatives || [];
        const entry = reps.find(r => r.name === deposit.representative);
        if (entry) entry.votes += votes;
        else reps.push({ name: deposit.representative, votes });
        updates.representatives = reps;
        updates.representative = deposit.representative;
        updates.totalVotes = reps.reduce((s, r) => s + r.votes, 0);
      }

const txns = user.transactions || [];
txns.unshift({
  type: isSavings ? "SAVINGS DEPOSIT APPROVED" : "DEPOSIT APPROVED",
  amount,
  date: new Date()
});
updates.transactions = txns;

      await User.findOneAndUpdate({ _id: user._id }, { $set: updates });
      console.log("✅ Deposit approved — balance:", newBalance, "plan:", plan);
    }

    res.json({ success: true, message: "Deposit approved" });
  } catch (err) {
    console.error("❌ approve-deposit:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/reject-deposit", async (req, res) => {
  try {
    const { id } = req.body;
    const deposit = await Deposit.findOne(findQuery(id));
    if (!deposit) return res.json({ success: false, message: "Deposit not found" });
    await Deposit.findOneAndUpdate({ _id: deposit._id }, { $set: { status: "REJECTED" } });
    res.json({ success: true, message: "Deposit rejected" });
  } catch (err) {
    console.error("❌ reject-deposit:", err.message);
    res.json({ success: false, message: err.message });
  }
});

/* --- WITHDRAWAL --- */
app.post("/request-withdrawal", async (req, res) => {
  const { email, amount } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "User not found" });
  if (Number(user.investmentAmount || 0) > 0) return res.json({ success: false, message: "Investment cycle still active." });
  if (Number(amount) > Number(user.balance || 0)) return res.json({ success: false, message: "Insufficient balance." });
  await Withdrawal.create({ id: Date.now(), email, amount, status: "PENDING", date: new Date() });
  res.json({ success: true, message: "Withdrawal request submitted" });
});

app.get("/admin-withdrawals", async (req, res) => {
  const withdrawals = await Withdrawal.find({});
  res.json({ withdrawals });
});

app.post("/approve-withdrawal", async (req, res) => {
  try {
    const { id } = req.body;
    const withdrawal = await Withdrawal.findOne(findQuery(id));
    if (!withdrawal) return res.json({ success: false, message: "Withdrawal not found" });
    if (withdrawal.status === "APPROVED") return res.json({ success: false, message: "Already approved" });

    const user = await User.findOne({ email: withdrawal.email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const amount = Number(withdrawal.amount);
    if (Number(user.balance || 0) < amount) return res.json({ success: false, message: "Insufficient balance" });

    const newBalance = Number(user.balance) - amount;
    const removedVotes = Math.floor(amount / 500);
    const newVotes = Math.max(0, Number(user.totalVotes || 0) - removedVotes);

    let rank;
    if (newBalance >= 50000) rank = "Elite Investor";
    else if (newBalance >= 15000) rank = "VIP Investor";
    else if (newBalance >= 5000) rank = "Premium Investor";
    else if (newBalance >= 1000) rank = "Standard Investor";
    else rank = "Starter Investor";

    const txns = user.transactions || [];
    txns.unshift({ type: "WITHDRAWAL APPROVED", amount, date: new Date() });

    const updates = { balance: newBalance, totalVotes: newVotes, rank, transactions: txns };
    if (newBalance <= 0) {
      updates.plan = "None";
      updates.investmentAmount = 0;
      updates.investmentStart = 0;
      updates.profitPercent = 0;
      updates.investmentDuration = 0;
    }

    await User.findOneAndUpdate({ _id: user._id }, { $set: updates });
    await Withdrawal.findOneAndUpdate({ _id: withdrawal._id }, { $set: { status: "APPROVED" } });

    res.json({ success: true, message: "Withdrawal approved" });
  } catch (err) {
    console.error("❌ approve-withdrawal:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/reject-withdrawal", async (req, res) => {
  try {
    const { id } = req.body;
    const withdrawal = await Withdrawal.findOne(findQuery(id));
    if (!withdrawal) return res.json({ success: false, message: "Withdrawal not found" });
    await Withdrawal.findOneAndUpdate({ _id: withdrawal._id }, { $set: { status: "REJECTED" } });
    res.json({ success: true, message: "Withdrawal rejected" });
  } catch (err) {
    console.error("❌ reject-withdrawal:", err.message);
    res.json({ success: false, message: err.message });
  }
});

/* --- ADMIN USER MANAGEMENT --- */
app.get("/admin-users", async (req, res) => {
  const users = await User.find({});
  res.json({ users });
});

app.post("/admin-add-balance", async (req, res) => {
  try {
    const { email, amount, plan } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const newBalance = Number(user.balance || 0) + Number(amount || 0);
    const updates = { balance: newBalance };

    if (plan) {
      updates.investmentAmount = Number(user.investmentAmount || 0) + Number(amount || 0);
      updates.plan = plan;
      updates.investmentStart = Date.now();
      updates.cycleCompleted = false;
      updates.balanceIsAdminFunded = false;
      if (plan === "Starter Plan")    { updates.profitPercent = 25;     updates.investmentDuration = 1;  }
      else if (plan === "Standard Plan")  { updates.profitPercent = 45; updates.investmentDuration = 2;  }
      else if (plan === "Premium Plan")   { updates.profitPercent = 55; updates.investmentDuration = 5;  }
      else if (plan === "Contact Manager"){ updates.profitPercent = 85; updates.investmentDuration = 14; }
      else if (plan === "Capital Boost")  { updates.profitPercent = 95; updates.investmentDuration = 22; }
      else if (plan === "Rapid Return")   { updates.profitPercent = 100.15; updates.investmentDuration = 35; }
    } else {
      updates.balanceIsAdminFunded = true;
    }

    const txns = user.transactions || [];
    txns.unshift({ type: plan ? "ADMIN FUND + PLAN ACTIVATED" : "ADMIN FUND", amount, date: new Date() });
    updates.transactions = txns;

    await User.findOneAndUpdate({ _id: user._id }, { $set: updates });
    const updated = await User.findOne({ _id: user._id });
    res.json({ success: true, message: "Balance added successfully", user: updated });
  } catch (err) {
    console.error("❌ admin-add-balance:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-remove-balance", async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    const newBalance = Math.max(0, Number(user.balance || 0) - Number(amount));
    await User.findOneAndUpdate({ _id: user._id }, { $set: { balance: newBalance } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-update-user", async (req, res) => {
  try {
    const { email, balance, votes, representative, rank, status } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    const updates = {};
    if (balance !== undefined) updates.balance = Number(balance);
    if (votes !== undefined) updates.totalVotes = Number(votes);
    if (representative) updates.representative = representative;
    if (rank) updates.rank = rank;
    if (status) updates.status = status;
    const updated = await User.findOneAndUpdate({ _id: user._id }, { $set: updates }, { new: true });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-ban-user", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false });
    const newStatus = user.status === "BANNED" ? "ACTIVE" : "BANNED";
    await User.findOneAndUpdate({ _id: user._id }, { $set: { status: newStatus } });
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-set-plan", async (req, res) => {
  try {
    const { email, plan } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false });
    await User.findOneAndUpdate({ _id: user._id }, { $set: { plan } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-set-rank", async (req, res) => {
  try {
    const { email, rank } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false });
    await User.findOneAndUpdate({ _id: user._id }, { $set: { rank } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-add-votes", async (req, res) => {
  try {
    const { email, votes } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false });
    const newVotes = Number(user.totalVotes || 0) + Number(votes || 0);
    await User.findOneAndUpdate({ _id: user._id }, { $set: { totalVotes: newVotes } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-remove-votes", async (req, res) => {
  try {
    const { representative, votes } = req.body;
    const rep = await Representative.findOne({ name: representative });
    if (!rep) return res.json({ success: false });
    const newVotes = Math.max(0, Number(rep.votes || 0) - Number(votes));
    await Representative.findOneAndUpdate({ _id: rep._id }, { $set: { votes: newVotes } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-assign-rep", async (req, res) => {
  try {
    const { email, representative } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false });
    const reps = user.representatives || [];
    if (!reps.find(r => r.name === representative)) {
      reps.push({ name: representative, votes: 0 });
    }
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { representative, representatives: reps } }
    );
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-deactivate-investment", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false });
    if (Number(user.investmentAmount || 0) <= 0) return res.json({ success: false, message: "No active investment." });
    const txns = user.transactions || [];
    txns.unshift({ type: "INVESTMENT DEACTIVATED BY ADMIN", amount: 0, date: new Date() });

   await User.findOneAndUpdate(
  { _id: user._id },
  {
$set: {
    investmentAmount: 0,
    profitPercent: 0,
    investmentDuration: 0,
    investmentStart: 0,
    cycleCompleted: false,
    plan: "None",
    claimableProfit: 0,
    expectedProfit: 0,
    portfolioHistory: [],
    transactions: txns
}
 }
);
    res.json({ success: true, message: "Investment deactivated." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-fund-user", async (req, res) => {
  try {
    const { email, amount } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });
    const newBalance = Number(user.balance || 0) + Number(amount);
    const txns = user.transactions || [];
    txns.unshift({ type: "ADMIN FUND", amount, date: new Date() });
    await User.findOneAndUpdate({ _id: user._id }, { $set: { balance: newBalance, transactions: txns } });
    res.json({ success: true, message: "Balance added" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-update-balance", async (req, res) => {
  try {
    const { id, balance } = req.body;
    const user = await User.findOne(findQuery(id));
    if (!user) return res.json({ success: false });
    await User.findOneAndUpdate({ _id: user._id }, { $set: { balance: Number(balance) } });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-approve-investment", async (req, res) => {
  try {
    const { email, plan, amount, representative } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false });

    const updates = {
      plan,
      representative,
      votes: Math.floor(Number(amount) / 500),
      investmentStart: Date.now(),
      balance: Number(user.balance || 0) + Number(amount)
    };

    if (plan === "Starter Plan")    { updates.profitPercent = 25;     updates.investmentDuration = 1;  }
    else if (plan === "Standard Plan")  { updates.profitPercent = 45; updates.investmentDuration = 2;  }
    else if (plan === "Premium Plan")   { updates.profitPercent = 55; updates.investmentDuration = 5;  }
    else if (plan === "Contact Manager"){ updates.profitPercent = 85; updates.investmentDuration = 14; }
    else if (plan === "Capital Boost")  { updates.profitPercent = 95; updates.investmentDuration = 22; }
    else if (plan === "Rapid Return")   { updates.profitPercent = 100.15; updates.investmentDuration = 35; }

    const txns = user.transactions || [];
    txns.unshift({ type: "PLAN ACTIVATED", plan, amount, date: new Date() });
    updates.transactions = txns;

    await User.findOneAndUpdate({ _id: user._id }, { $set: updates });
    res.json({ success: true, message: "Investment approved" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;

 const ADMIN_EMAIL = "support@giai.com";
 const ADMIN_PASSWORD = "Clement$family77";

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      success: true
    });
  }

  res.json({
    success: false,
    message: "Invalid admin credentials."
  });
});

/* --- INVEST EXISTING BALANCE --- */

app.post("/invest-existing-balance", async (req, res) => {
  try {
    const { email, representative } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const balance = Number(user.balance || 0);
    if (balance < 200) return res.json({ success: false, message: "Minimum investment is $200" });
    if (!user.balanceIsAdminFunded) return res.json({ success: false, message: "This balance came from a completed cycle. Please use Reinvest." });
    if (!representative) return res.json({ success: false, message: "Please select a representative." });

    let plan, profitPercent, investmentDuration;
    if (balance >= 45000)      { plan = "Rapid Return";    profitPercent = 100.15; investmentDuration = 35; }
    else if (balance >= 15000) { plan = "Capital Boost";   profitPercent = 95;     investmentDuration = 22; }
    else if (balance >= 8000)  { plan = "Contact Manager"; profitPercent = 85;     investmentDuration = 14; }
    else if (balance >= 3000)  { plan = "Premium Plan";    profitPercent = 55;     investmentDuration = 5;  }
    else if (balance >= 1000)  { plan = "Standard Plan";   profitPercent = 45;     investmentDuration = 2;  }
    else                       { plan = "Starter Plan";    profitPercent = 25;     investmentDuration = 1;  }

    const votes = Math.floor(balance / 500);
    await Representative.findOneAndUpdate(
      { name: representative },
      { $inc: { votes } }
    );

    const reps = user.representatives || [];
    const entry = reps.find(r => r.name === representative);
    if (entry) entry.votes += votes;
    else reps.push({ name: representative, votes });

    let rank;
    if (balance >= 50000) rank = "Elite Investor";
    else if (balance >= 15000) rank = "VIP Investor";
    else if (balance >= 5000) rank = "Premium Investor";
    else if (balance >= 1000) rank = "Standard Investor";
    else rank = "Starter Investor";

    const txns = user.transactions || [];
    txns.unshift({ type: "BALANCE INVESTED", amount: balance, plan, date: new Date() });

    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: {
        investmentAmount: balance,
        investmentStart: Date.now(),
        plan, profitPercent, investmentDuration,
        representative,
        representatives: reps,
        totalVotes: reps.reduce((s, r) => s + r.votes, 0),
        reinvestmentCount: 0,
        cycleCompleted: false,
        balanceIsAdminFunded: false,
        rank,
        transactions: txns
      }}
    );

    res.json({ success: true, message: "Investment activated", plan });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* --- REINVESTMENT --- */
app.post("/request-reinvestment", async (req, res) => {
  const { email, topup, representative } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });
  const claimableProfit = Number(user.lastCycleProfit || 0);
  await Reinvestment.create({ id: Date.now(), email, profit: claimableProfit, topup: Number(topup || 0), representative, status: "PENDING", date: new Date() });
  res.json({ success: true });
});

app.get("/admin-reinvestments", async (req, res) => {
  const requests = await Reinvestment.find({});
  res.json({ requests });
});

app.post("/approve-reinvestment", async (req, res) => {
  try {
    const { id } = req.body;
    const request = await Reinvestment.findOne(findQuery(id));
    if (!request) return res.json({ success: false, message: "Reinvestment not found" });

    const user = await User.findOne({ email: request.email });
    if (!user) return res.json({ success: false, message: "User not found" });

    const freshMoney = Number(request.topup || 0);
    const newBalance = Number(user.balance || 0) + freshMoney;
    const newInvestment = newBalance;

    let plan, profitPercent, investmentDuration;
    if (newInvestment >= 45000)      { plan = "Rapid Return";    profitPercent = 100.15; investmentDuration = 35; }
    else if (newInvestment >= 15000) { plan = "Capital Boost";   profitPercent = 95;     investmentDuration = 22; }
    else if (newInvestment >= 8000)  { plan = "Contact Manager"; profitPercent = 85;     investmentDuration = 14; }
    else if (newInvestment >= 3000)  { plan = "Premium Plan";    profitPercent = 55;     investmentDuration = 5;  }
    else if (newInvestment >= 1000)  { plan = "Standard Plan";   profitPercent = 45;     investmentDuration = 2;  }
    else                             { plan = "Starter Plan";    profitPercent = 25;     investmentDuration = 1;  }

    const updates = {
      balance: newBalance,
      investmentAmount: newInvestment,
      investmentStart: Date.now(),
      cycleCompleted: false,
      reinvestmentCount: Number(user.reinvestmentCount || 0) + 1,
      plan, profitPercent, investmentDuration
    };

    if (request.representative && freshMoney > 0) {
      const votes = Math.floor(freshMoney / 500);
      await Representative.findOneAndUpdate(
        { name: request.representative },
        { $inc: { votes } }
      );
      const reps = user.representatives || [];
      const entry = reps.find(r => r.name === request.representative);
      if (entry) entry.votes += votes;
      else reps.push({ name: request.representative, votes });
      updates.representatives = reps;
      updates.representative = request.representative;
      updates.totalVotes = reps.reduce((s, r) => s + r.votes, 0);
    }

    const txns = user.transactions || [];
    txns.unshift({ type: "REINVESTMENT APPROVED", amount: newInvestment, date: new Date() });
    updates.transactions = txns;

    await User.findOneAndUpdate({ _id: user._id }, { $set: updates });
    await Reinvestment.findOneAndUpdate({ _id: request._id }, { $set: { status: "APPROVED" } });

    res.json({ success: true, message: "Reinvestment approved" });
  } catch (err) {
    console.error("❌ approve-reinvestment:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/reject-reinvestment", async (req, res) => {
  try {
    const { id } = req.body;
    const request = await Reinvestment.findOne(findQuery(id));
    if (!request) return res.json({ success: false, message: "Reinvestment not found" });
    await Reinvestment.findOneAndUpdate({ _id: request._id }, { $set: { status: "REJECTED" } });
    res.json({ success: true, message: "Reinvestment rejected" });
  } catch (err) {
    console.error("❌ reject-reinvestment:", err.message);
    res.json({ success: false, message: err.message });
  }
});

/* --- COMPLETE INVESTMENT --- */
app.post("/complete-investment", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json({ success: false });
    if (!user.investmentAmount || Number(user.investmentAmount) === 0) return res.json({ success: false, message: "No active investment" });

    const amount = Number(user.investmentAmount || 0);
    const percent = Number(user.profitPercent || 0);
    const profit = amount * (percent / 100);
    const newBalance = Number(user.balance || 0) + profit;

    const txns = user.transactions || [];
    txns.unshift({ type: "PROFIT CREDITED", amount: profit, date: new Date() });

    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { balance: newBalance, investmentAmount: 0, profitPercent: 0, investmentDuration: 0, investmentStart: 0, cycleCompleted: true, balanceIsAdminFunded: false, transactions: txns } }
    );
    res.json({ success: true, message: "Investment completed" });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* --- ACTIVATE PLAN --- */
app.post("/activate-plan", async (req, res) => {
  const { email, plan, amount } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });
  user.plan = plan;
  if (user.balance >= 1000) user.rank = "Silver Investor";
  if (user.balance >= 5000) user.rank = "Gold Investor";
  if (user.balance >= 10000) user.rank = "VIP Investor";
  user.transactions.unshift({ type: "PLAN ACTIVATED", amount, plan, date: new Date() });
  await user.save();
  res.json({ success: true, user });
});

/* --- CLAIM PROFIT --- */
app.post("/claim-profit", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ success: false });
  if (user.plan === "None") return res.json({ success: false, message: "No active plan" });
  const profit = Math.floor(Number(user.investmentAmount || 0) * (Number(user.profitPercent || 0) / 100));
  user.claimableProfit = Number(user.claimableProfit || 0) + profit;
  user.transactions.unshift({ type: "PROFIT GENERATED", amount: profit, date: new Date() });
  await user.save();
  res.json({ success: true, profit, claimableProfit: user.claimableProfit, user });
});

/* --- REINVEST PROFIT --- */
app.post("/reinvest-profit", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ success: false });
  const limit = getReinvestmentLimit(user.plan);
  const count = Number(user.reinvestmentCount || 0);
  if (count >= limit) return res.json({ success: false, message: "Reinvestment limit reached." });
  const profit = Math.floor(Number(user.investmentAmount || 0) * (Number(user.profitPercent || 0) / 100));
  user.investmentAmount += profit;
  user.reinvestmentCount += 1;
  user.transactions.unshift({ type: "PROFIT REINVESTED", amount: profit, date: new Date() });
  await user.save();
  res.json({ success: true, user });
});

/* --- SECURITY QUESTION / PASSWORD RESET --- */
app.post("/get-security-question", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json({ success: false, message: "No account found." });
  if (!user.secretQuestion) return res.json({ success: false, message: "No security question set." });
  const labels = {
    pet: "What was the name of your first pet?",
    mother: "What is your mother's maiden name?",
    city: "What city were you born in?",
    school: "What was the name of your primary school?",
    food: "What is your favourite food?",
    car: "What was your first car?",
    friend: "What is the name of your childhood best friend?"
  };
  res.json({ success: true, question: labels[user.secretQuestion] || user.secretQuestion });
});

app.post("/verify-security-answer", async (req, res) => {
  const { email, answer } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false, message: "Account not found." });
  const submitted = (answer || "").trim().toLowerCase();
  const stored = (user.secretAnswer || "").trim().toLowerCase();
  if (submitted !== stored) return res.json({ success: false, message: "Incorrect answer." });
  res.json({ success: true });
});

app.post("/update-settings", async (req, res) => {
  try {
    const { email, name, currentPassword, newPassword } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found."
      });
    }

    // Update name if provided
    if (name && name.trim() !== "") {
      user.name = name.trim();
    }

    // Change password if requested
    if (newPassword) {
      if (user.password !== currentPassword) {
        return res.json({
          success: false,
          message: "Current password is incorrect."
        });
      }

      user.password = newPassword;
    }

    await user.save();

    res.json({
      success: true,
      message: "Settings updated successfully."
    });

  } catch (err) {
    console.error(err);
    res.json({
      success: false,
      message: "Server error."
    });
  }
});

/* --- CARD APPLICATIONS --- */
app.post("/request-card", cardUpload.fields([
  { name: "idFile", maxCount: 1 },
  { name: "proofFile", maxCount: 1 }
]), async (req, res) => {
  const { email, cardType, employment, occupation, income } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });

  const flag = cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
  if (user[flag] === "active" || user[flag] === "pending") return res.json({ success: false, message: "Application already submitted." });

  user[flag] = "pending";
  await user.save();

  const idFile = req.files?.idFile?.[0];
  const proofFile = req.files?.proofFile?.[0];

  await CardApplication.create({
    id: Date.now(), email, cardType, employment, occupation, income,
    idFile: idFile ? idFile.filename : null,
    proofFile: proofFile ? proofFile.filename : null,
    status: "PENDING", date: new Date()
  });

  res.json({ success: true });
});

app.get("/admin-cards", async (req, res) => {
  const applications = await CardApplication.find({});
  res.json({ applications });
});

app.post("/approve-card", async (req, res) => {
  try {
    const { id } = req.body;
    const application = await CardApplication.findOne(findQuery(id));
    if (!application) return res.json({ success: false, message: "Application not found" });

    await CardApplication.findOneAndUpdate({ _id: application._id }, { $set: { status: "APPROVED" } });

    const user = await User.findOne({ email: application.email });
    if (user) {
      const flag = application.cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
      const numField = application.cardType === "gold" ? "goldCardNumber" : "blackCardNumber";
      const cardNumber = "GIAI" + Math.floor(1000000000000000 + Math.random() * 8999999999999999);
      const txns = user.transactions || [];
      txns.unshift({ type: (application.cardType === "gold" ? "GOLD" : "BLACK") + " CARD ACTIVATED", amount: 0, date: new Date() });
      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { [flag]: "active", [numField]: String(cardNumber), transactions: txns } }
      );
    }

    res.json({ success: true, message: "Card approved" });
  } catch (err) {
    console.error("❌ approve-card:", err.message);
    res.json({ success: false, message: err.message });
  }
});

app.post("/submit-card-shipping", async (req, res) => {
  const { email, cardType, address } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });

  const flag = cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
  user[flag] = "shipping";
  const addrField = cardType === "gold" ? "goldCardShipping" : "blackCardShipping";
  user[addrField] = address;
  user.transactions.unshift({ type: (cardType === "gold" ? "GOLD" : "BLACK") + " CARD SHIPPING SUBMITTED", amount: 0, date: new Date() });
  await user.save();

  try { await autoCreateShipmentRoute(email, cardType, address, 14); } catch (err) {}
  res.json({ success: true });
});

/* --- SHIPMENTS --- */
app.post("/get-shipment-route", async (req, res) => {
  const { email, cardType } = req.body;
  const shipment = await Shipment.findOne({ email, cardType });
  if (!shipment || !shipment.stops || shipment.stops.length === 0) return res.json({ success: true, route: null });

  const progress = computeShipmentProgress(shipment);
  res.json({
    success: true,
    route: {
      stops: shipment.stops,
      startedAt: shipment.startedAt,
      totalDays: shipment.totalDays,
      paused: shipment.paused || false,
      currentStopIndex: progress.currentStopIndex,
      previousStopIndex: progress.previousStopIndex ?? null,
      status: progress.status,
      progressIntoLeg: progress.progressIntoLeg
    }
  });
});

app.get("/admin-shipments", async (req, res) => {
  const shipments = await Shipment.find({});
  const withProgress = shipments.map(s => ({ ...s.toObject(), progress: computeShipmentProgress(s) }));
  res.json({ shipments: withProgress });
});

app.post("/admin-set-shipment-days", async (req, res) => {
  const { email, cardType, totalDays } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: false });
  const addrField = cardType === "gold" ? "goldCardShipping" : "blackCardShipping";
  const address = user[addrField];
  if (!address) return res.json({ success: false, message: "No address on file." });
  try {
    const shipment = await autoCreateShipmentRoute(email, cardType, address, Number(totalDays));
    res.json({ success: true, shipment });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-pause-shipment", async (req, res) => {
  const { email, cardType } = req.body;
  const shipment = await Shipment.findOne({ email, cardType });
  if (!shipment) return res.json({ success: false });
  const progress = computeShipmentProgress(shipment);
  shipment.paused = true;
  shipment.pausedAtStopIndex = progress.currentStopIndex;
  shipment.pausedProgress = progress.progressIntoLeg;
  await shipment.save();
  res.json({ success: true });
});

app.post("/chat/typing", async (req, res) => {

    const { email } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        { typing: true }
    );

    res.json({ success:true });

});

app.post("/chat/stop-typing", async (req, res) => {

    const { email } = req.body;

    await Chat.findOneAndUpdate(
        { email },
        { typing:false }
    );

    res.json({ success:true });

});

app.post("/admin-resume-shipment", async (req, res) => {
  const { email, cardType } = req.body;
  const shipment = await Shipment.findOne({ email, cardType });
  if (!shipment) return res.json({ success: false });
  const stops = shipment.stops || [];
  let elapsedBeforePause = 0;
  for (let i = 1; i < (shipment.pausedAtStopIndex ?? 0); i++) {
    elapsedBeforePause += (stops[i].durationDays || 0) * 86400000;
  }
  const currentLegMs = stops[shipment.pausedAtStopIndex] ? (stops[shipment.pausedAtStopIndex].durationDays || 0) * 86400000 : 0;
  elapsedBeforePause += currentLegMs * (shipment.pausedProgress || 0);
  shipment.startedAt = Date.now() - elapsedBeforePause;
  shipment.paused = false;
  shipment.pausedAtStopIndex = null;
  shipment.pausedProgress = null;
  await shipment.save();
  res.json({ success: true });
});

/* --- ADMIN: Activate Manual Investment --- */
app.post("/admin-manual-investment", async (req, res) => {
  try {
    const { email, investmentAmount, expectedProfit, investmentDuration, durationUnit, allowReinvestment } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found." });

    // Convert duration to days
    const durationDays = durationUnit === "hours"
      ? Number(investmentDuration) / 24
      : Number(investmentDuration);

    const amount   = Number(investmentAmount);
    const profit   = Number(expectedProfit);

    if (!amount || !profit || !durationDays) {
      return res.json({ success: false, message: "Please fill in all fields." });
    }

    // profitPercent is derived from expectedProfit / investmentAmount * 100
    // so the existing profit engine calculates correctly
    const profitPercent = (profit / amount) * 100;

    const txns = user.transactions || [];
    txns.unshift({
      type: "MANUAL INVESTMENT ACTIVATED",
      amount,
      date: new Date()
    });

    await User.findOneAndUpdate(
      { _id: user._id },
      {
        $set: {
          investmentMode:     "manual",
          investmentAmount:   amount,
          balance:            amount,
          profitPercent,
          investmentDuration: durationDays,
          investmentStart:    Date.now(),
          cycleCompleted:     false,
          allowReinvestment:  !!allowReinvestment,
          portfolioHistory:   [],
          plan:               "Manual Investment",
          transactions:       txns
        }
      }
    );

    res.json({ success: true, message: "Manual investment activated." });
  } catch (err) {
    console.error("❌ admin-manual-investment:", err.message);
    res.json({ success: false, message: err.message });
  }
});

/* --- ADMIN: Enable Reinvestment for Manual Investment --- */
app.post("/admin-enable-manual-reinvestment", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found." });
    await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { allowReinvestment: true } }
    );
    res.json({ success: true, message: "Reinvestment enabled." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/request-savings-card", async (req, res) => {
  try {
    const { email, employment, occupation, income } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: "User not found." });
    if (user.savingsCardStatus === "pending" || user.savingsCardStatus === "active") {
      return res.json({ success: false, message: "Application already submitted." });
    }
    await User.findOneAndUpdate({ _id: user._id }, { $set: { savingsCardStatus: "pending" } });
    res.json({ success: true, message: "Card application submitted. Admin will review shortly." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ── Savings Account Schema ── */
const savingsSchema = new mongoose.Schema({}, { strict: false });
const SavingsAccount = mongoose.model("SavingsAccount", savingsSchema);

/* ── Interest Engine ──
   Runs every hour. For each savings account with a
   balance > 0 and an interestRate set by admin,
   calculates interest accrued since last credit
   and adds it to the balance.
   Admin sets interestRate (% per month) per account.
   Formula: dailyRate = monthlyRate / 30
            interest  = balance * dailyRate / 100
================================================= */
setInterval(async () => {
  try {
    const accounts = await SavingsAccount.find({
      interestRate: { $gt: 0 },
      balance:      { $gt: 0 }
    });

    for (const acc of accounts) {
      const now          = Date.now();
      const lastTick     = acc.lastInterestTick || acc.createdAt || now;
      const hoursElapsed = (now - new Date(lastTick).getTime()) / 3600000;
      if (hoursElapsed < 1) continue;

      const monthlyRate = Number(acc.interestRate || 0);
      const hourlyRate  = monthlyRate / 30 / 24 / 100;
      const balance     = Number(acc.balance || 0);
      const interest    = parseFloat((balance * hourlyRate).toFixed(6));
      if (interest <= 0) continue;

      const history = acc.profitHistory || [];
      history.push({ time: now, balance: balance + interest, interest });
      if (history.length > 200) history.shift();

      await SavingsAccount.findOneAndUpdate(
        { _id: acc._id },
        { $set: {
          balance:          balance + interest,
          totalInterest:    Number(acc.totalInterest || 0) + interest,
          lastInterestTick: now,
          profitHistory:    history
        }}
      );
    }
  } catch (e) {
    console.error("Interest engine error:", e.message);
  }
}, 3600000);

/* ─────────────────────────────────────────────
   CREATE JOINT SAVINGS ACCOUNT
   Called from the "Switch to Savings" popup
───────────────────────────────────────────── */
app.post("/create-savings-account", async (req, res) => {
  try {
    const { nickname, email1, email2, password } = req.body;

    if (!nickname || !email1 || !email2 || !password) {
      return res.json({ success: false, message: "All fields are required." });
    }

    if (email1.toLowerCase() === email2.toLowerCase()) {
      return res.json({ success: false, message: "Both emails must be different." });
    }

    /* Check not already in a savings account */
    const existing = await SavingsAccount.findOne({
      $or: [{ email1: email1.toLowerCase() }, { email2: email1.toLowerCase() }]
    });
    if (existing) {
      return res.json({ success: false, message: "You already have a savings account." });
    }

    /* Derive display names from GIAI user records if they exist,
       otherwise just use the part before @ */
    const user1 = await User.findOne({ email: email1.toLowerCase() });
    const user2 = await User.findOne({ email: email2.toLowerCase() });

    const name1 = user1 ? (user1.name || "").split(" ")[0] : email1.split("@")[0];
    const name2 = user2 ? (user2.name || "").split(" ")[0] : email2.split("@")[0];

    const accountId = "SAV-" + Date.now().toString().slice(-8);

    const account = await SavingsAccount.create({
      accountId,
      nickname,
      jointName:    name1 + " & " + name2,
      email1:       email1.toLowerCase(),
      email2:       email2.toLowerCase(),
      name1,
      name2,
      password,          /* plain for now — same pattern as GIAI main */
      balance:      0,
      interestRate: 0,   /* admin sets this later */
      totalInterest:0,
      status:       "ACTIVE",
      createdAt:    new Date(),
      transactions: [],
      profitHistory:[]
    });

    res.json({
      success: true,
      message: "Joint savings account created.",
      account: {
        accountId:  account.accountId,
        jointName:  account.jointName,
        email1:     account.email1,
        email2:     account.email2,
        balance:    0
      }
    });

  } catch (err) {
    console.error("create-savings-account:", err.message);
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   SAVINGS LOGIN — used when switching to savings
───────────────────────────────────────────── */
app.post("/savings-login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const account = await SavingsAccount.findOne({
      $or: [{ email1: email.toLowerCase() }, { email2: email.toLowerCase() }],
      password
    });

    if (!account) {
      return res.json({ success: false, message: "No savings account found or wrong password." });
    }
    if (account.status === "SUSPENDED") {
      return res.json({ success: false, message: "This savings account has been suspended." });
    }

    res.json({
      success: true,
      account: {
        accountId:    account.accountId,
        jointName:    account.jointName,
        nickname:     account.nickname,
        email1:       account.email1,
        email2:       account.email2,
        name1:        account.name1,
        name2:        account.name2,
        balance:      account.balance,
        totalInterest:account.totalInterest || 0,
        interestRate: account.interestRate  || 0,
        status:       account.status,
        createdAt:    account.createdAt
      }
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET SAVINGS ACCOUNT — called on every refresh
───────────────────────────────────────────── */
app.post("/get-savings-account", async (req, res) => {
  try {
    const { email } = req.body;
    const account = await SavingsAccount.findOne({
      $or: [{ email1: email.toLowerCase() }, { email2: email.toLowerCase() }]
    });

    if (!account) return res.json({ success: false, message: "Account not found." });

    const pendingDeposits    = await Deposit.countDocuments({
      savingsAccountId: account.accountId, status: "PENDING"
    });
    const pendingWithdrawals = await Withdrawal.countDocuments({
      savingsAccountId: account.accountId, status: "PENDING"
    });

    res.json({
      success: true,
      account: {
        accountId:       account.accountId,
        jointName:       account.jointName,
        nickname:        account.nickname,
        email1:          account.email1,
        email2:          account.email2,
        name1:           account.name1,
        name2:           account.name2,
        balance:         account.balance,
        totalInterest:   account.totalInterest  || 0,
        interestRate:    account.interestRate   || 0,
        transactions:    account.transactions   || [],
        profitHistory:   account.profitHistory  || [],
        lastInterestTick:account.lastInterestTick,
        status:          account.status,
        createdAt:       account.createdAt,
        pendingDeposits,
        pendingWithdrawals
      }
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   SAVINGS DEPOSIT REQUEST
───────────────────────────────────────────── */
app.post("/request-savings-deposit", async (req, res) => {
  try {
    const { email, amount, asset } = req.body;
    const account = await SavingsAccount.findOne({
      $or: [{ email1: email.toLowerCase() }, { email2: email.toLowerCase() }]
    });
    if (!account) return res.json({ success: false, message: "Account not found." });
    if (!amount || Number(amount) <= 0) {
      return res.json({ success: false, message: "Invalid amount." });
    }

    await Deposit.create({
      id:               Date.now(),
      savingsAccountId: account.accountId,
      jointName:        account.jointName,
      email:            email.toLowerCase(),
      amount:           Number(amount),
      asset:            asset || "USDT",
      plan:             "Savings Deposit",
      representative:   null,
      status:           "PENDING",
      date:             new Date()
    });

    res.json({ success: true, message: "Deposit submitted. Awaiting admin confirmation." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   SAVINGS WITHDRAWAL REQUEST
   Both holders must approve before admin processes.
   When requester submits → status = "AWAITING_PARTNER"
   When partner approves → status = "PENDING" (admin sees it)
───────────────────────────────────────────── */
app.post("/request-savings-withdrawal", async (req, res) => {
  try {
    const { email, amount, asset, destinationWallet } = req.body;
    const account = await SavingsAccount.findOne({
      $or: [{ email1: email.toLowerCase() }, { email2: email.toLowerCase() }]
    });
    if (!account) return res.json({ success: false, message: "Account not found." });
    if (!amount || Number(amount) <= 0) {
      return res.json({ success: false, message: "Invalid amount." });
    }
    if (Number(amount) > Number(account.balance || 0)) {
      return res.json({ success: false, message: "Insufficient balance." });
    }
    if (!destinationWallet) {
      return res.json({ success: false, message: "Please provide a destination wallet address." });
    }

    const partnerEmail = account.email1.toLowerCase() === email.toLowerCase()
      ? account.email2
      : account.email1;

    await Withdrawal.create({
      id:               Date.now(),
      savingsAccountId: account.accountId,
      jointName:        account.jointName,
      email:            email.toLowerCase(),
      partnerEmail,
      amount:           Number(amount),
      asset:            asset || "USDT",
      destinationWallet,
      status:           "AWAITING_PARTNER",  /* partner must approve first */
      partnerApproved:  false,
      date:             new Date()
    });

    res.json({
      success: true,
      message: "Withdrawal submitted. Your partner must approve before it is processed."
    });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   PARTNER APPROVES WITHDRAWAL
   Partner clicks Approve on their dashboard.
   Status changes to PENDING — admin now sees it.
───────────────────────────────────────────── */
app.post("/partner-approve-withdrawal", async (req, res) => {
  try {
    const { email, withdrawalId } = req.body;
    const withdrawal = await Withdrawal.findOne({ id: Number(withdrawalId) });

    if (!withdrawal) return res.json({ success: false, message: "Withdrawal not found." });
    if (withdrawal.partnerEmail.toLowerCase() !== email.toLowerCase()) {
      return res.json({ success: false, message: "You are not the partner for this withdrawal." });
    }
    if (withdrawal.status !== "AWAITING_PARTNER") {
      return res.json({ success: false, message: "This withdrawal is no longer awaiting approval." });
    }

    await Withdrawal.findOneAndUpdate(
      { _id: withdrawal._id },
      { $set: { status: "PENDING", partnerApproved: true, partnerApprovedAt: new Date() } }
    );

    res.json({ success: true, message: "Withdrawal approved. Admin will process it shortly." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   PARTNER REJECTS WITHDRAWAL
───────────────────────────────────────────── */
app.post("/partner-reject-withdrawal", async (req, res) => {
  try {
    const { email, withdrawalId } = req.body;
    const withdrawal = await Withdrawal.findOne({ id: Number(withdrawalId) });

    if (!withdrawal) return res.json({ success: false, message: "Not found." });
    if (withdrawal.partnerEmail.toLowerCase() !== email.toLowerCase()) {
      return res.json({ success: false, message: "Not authorized." });
    }

    await Withdrawal.findOneAndUpdate(
      { _id: withdrawal._id },
      { $set: { status: "REJECTED_BY_PARTNER" } }
    );

    res.json({ success: true, message: "Withdrawal rejected." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN: APPROVE SAVINGS DEPOSIT
   Updates the savings account balance
───────────────────────────────────────────── */
app.post("/approve-savings-deposit", async (req, res) => {
  try {
    const { id } = req.body;
    const deposit = await Deposit.findOne({ $or: [{ _id: id }, { id: Number(id) }] });
    if (!deposit) return res.json({ success: false, message: "Deposit not found." });
    if (deposit.status === "APPROVED") return res.json({ success: false, message: "Already approved." });

    const account = await SavingsAccount.findOne({ accountId: deposit.savingsAccountId });
    if (!account) return res.json({ success: false, message: "Savings account not found." });

    const amount     = Number(deposit.amount);
    const newBalance = Number(account.balance || 0) + amount;

    const history = account.profitHistory || [];
    history.push({ time: Date.now(), balance: newBalance, interest: 0 });
    if (history.length > 200) history.shift();

    const txns = account.transactions || [];
    txns.unshift({
      type:   "DEPOSIT APPROVED",
      amount,
      asset:  deposit.asset || "USDT",
      date:   new Date()
    });

    await SavingsAccount.findOneAndUpdate(
      { _id: account._id },
      { $set: {
        balance:       newBalance,
        profitHistory: history,
        transactions:  txns,
        totalDeposited: Number(account.totalDeposited || 0) + amount
      }}
    );

    await Deposit.findOneAndUpdate({ _id: deposit._id }, { $set: { status: "APPROVED" } });

    res.json({ success: true, message: "Savings deposit approved. Balance updated." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN: APPROVE SAVINGS WITHDRAWAL
───────────────────────────────────────────── */
app.post("/approve-savings-withdrawal", async (req, res) => {
  try {
    const { id } = req.body;
    const withdrawal = await Withdrawal.findOne({ $or: [{ _id: id }, { id: Number(id) }] });
    if (!withdrawal) return res.json({ success: false, message: "Withdrawal not found." });
    if (withdrawal.status === "APPROVED") return res.json({ success: false, message: "Already approved." });

    const account = await SavingsAccount.findOne({ accountId: withdrawal.savingsAccountId });
    if (!account) return res.json({ success: false, message: "Account not found." });

    const amount = Number(withdrawal.amount);
    if (amount > Number(account.balance || 0)) {
      return res.json({ success: false, message: "Insufficient balance." });
    }

const start        = Number(account.interestStartTime || 0);
const msPerMonth   = 30 * 24 * 60 * 60 * 1000;
const monthlyRate  = Number(account.interestRate || 0) / 100;
const elapsed      = Date.now() - start;
const interestEarned = start
  ? Number(account.balance) * monthlyRate * (elapsed / msPerMonth)
  : 0;

const totalPayout  = amount + interestEarned;
const newBalance   = Math.max(0, Number(account.balance) - amount);
const newInterestStart = newBalance > 0 ? Date.now() : 0;   const txns = account.transactions || [];
    txns.unshift({
      type:   "WITHDRAWAL APPROVED",
      amount,
      asset:  withdrawal.asset || "USDT",
      date:   new Date()
    });

    await SavingsAccount.findOneAndUpdate(
      { _id: account._id },
      { $set: { balance: newBalance, transactions: txns } }
    );

    await Withdrawal.findOneAndUpdate(
      { _id: withdrawal._id },
      { $set: { status: "APPROVED" } }
    );

    res.json({ success: true, message: "Savings withdrawal approved." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN: SET INTEREST RATE for a savings account
───────────────────────────────────────────── */

app.post("/admin-set-savings-interest", async (req, res) => {
  try {
    const { accountId, interestRate } = req.body;
    await SavingsAccount.findOneAndUpdate(
      { accountId },
      { $set: { interestRate: Number(interestRate) } }
    );
    res.json({ success: true, message: "Interest rate updated." });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   ADMIN: GET ALL SAVINGS ACCOUNTS
───────────────────────────────────────────── */
app.get("/admin-savings-accounts", async (req, res) => {
  try {
    const accounts = await SavingsAccount.find({});
    res.json({ success: true, accounts });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

/* ─────────────────────────────────────────────
   GET PENDING WITHDRAWAL APPROVALS
   For the partner to see what they need to approve
───────────────────────────────────────────── */
app.post("/get-savings-pending-approvals", async (req, res) => {
  try {
    const { email } = req.body;
    const pending = await Withdrawal.find({
      partnerEmail: email.toLowerCase(),
      status:       "AWAITING_PARTNER"
    });
    res.json({ success: true, pending });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 GIAI Server running on port ${PORT}`);
});