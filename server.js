const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const app = express();

const multer = require("multer");

const cardUploadDir = path.join(__dirname,"uploads","cards");
if(!fs.existsSync(cardUploadDir)){
  fs.mkdirSync(cardUploadDir, { recursive:true });
}

const cardStorage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, cardUploadDir),
  filename: (req,file,cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random()*1e9);
    cb(null, unique + "-" + file.originalname);
  }
});

const cardUpload = multer({ storage: cardStorage });

// Serve uploaded files (so admin can view them)
app.use("/uploads", express.static(path.join(__dirname,"uploads")));

app.use(cors());
app.use(express.json());

app.use(express.static("public"));

const USERS_FILE =
path.join(__dirname,"database","users.json");

const CARDS_FILE = 
path.join(__dirname,"database","cards.json");

const SITE_SETTINGS_FILE =
  path.join(__dirname, "database", "site-settings.json");

function getSiteSettings() {
  if (!fs.existsSync(SITE_SETTINGS_FILE)) {
    const defaults = {
      announcement: { enabled: false, message: "", type: "info" },
      representatives: {
        "Robert Rachel":  { "Tunisia": 0, "Algeria": 0, "Norway": 0, "Germany": 0, "France": 0 },
        "Michael Scott":  { "Tunisia": 0, "UK": 0, "Italy": 0, "Spain": 0, "Belgium": 0 },
        "Lincoln Hayes":  { "Tunisia": 0, "Brazil": 0, "Japan": 0, "Singapore": 0, "Dubai": 0 },
        "Amber Agrawal":  { "Tunisia": 0, "Australia": 0, "Malaysia": 0, "Thailand": 0, "Indonesia": 0 }
      },
      counters: {}
    };
    fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, "utf8"));
}

function saveSiteSettings(data) {
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(data, null, 2));
}

const DEPOSITS_FILE =
path.join(__dirname,"database","deposits.json");

const CHAT_FILE =
path.join(__dirname,"database","chatMessages.json");

const SHIPMENTS_FILE = path.join(__dirname, "database", "shipments.json");

function getShipments() {
  if (!fs.existsSync(SHIPMENTS_FILE)) {
    fs.writeFileSync(SHIPMENTS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(SHIPMENTS_FILE, "utf8"));
}

function saveShipments(data) {
  fs.writeFileSync(SHIPMENTS_FILE, JSON.stringify(data, null, 2));
}

function getReinvestmentLimit(plan){

if(plan === "Starter Plan") return 1;

if(plan === "Standard Plan") return 2;

if(plan === "Premium Plan") return 3;

if(plan === "Contact Manager") return 4;

if(plan === "Capital Boost") return 5;

if(plan === "Rapid Return") return 10;

return 0;

}

/* =========================
   READ WITHDRAWALS
========================= */

const WITHDRAWALS_FILE = path.join(__dirname, "database", "withdrawals.json");

function getWithdrawals() {
  if (!fs.existsSync(WITHDRAWALS_FILE)) {
    fs.writeFileSync(WITHDRAWALS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(WITHDRAWALS_FILE, "utf8"));
}

function saveWithdrawals(withdrawals) {
  fs.writeFileSync(
    WITHDRAWALS_FILE,
    JSON.stringify(withdrawals, null, 2)
  );
}

/* =========================
   READ USERS
========================= */

function getUsers(){

const data =
fs.readFileSync(USERS_FILE);

return JSON.parse(data);

}

/* =========================
   SAVE USERS
========================= */

function saveUsers(users){

fs.writeFileSync(
USERS_FILE,
JSON.stringify(users,null,2)
);

}

/* =========================
   READ DEPOSITS
========================= */

function getDeposits(){

const data =
fs.readFileSync(DEPOSITS_FILE);

return JSON.parse(data);

}

/* =========================
   SAVE DEPOSITS
========================= */

function saveDeposits(deposits){

fs.writeFileSync(
DEPOSITS_FILE,
JSON.stringify(deposits,null,2)
);

}

function getChats(){

if(!fs.existsSync(CHAT_FILE)){

fs.writeFileSync(
CHAT_FILE,
"[]"
);

}

return JSON.parse(
fs.readFileSync(
CHAT_FILE,
"utf8"
)
);

}

function saveChats(chats){

fs.writeFileSync(
CHAT_FILE,
JSON.stringify(
chats,
null,
2
)
);

}

const REINVESTMENTS_FILE = path.join(__dirname,"reinvestments.json");

function getReinvestments(){
  if(!fs.existsSync(REINVESTMENTS_FILE)){
    fs.writeFileSync(REINVESTMENTS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(REINVESTMENTS_FILE,"utf8"));
}

function saveReinvestments(data){
  fs.writeFileSync(REINVESTMENTS_FILE, JSON.stringify(data,null,2));
}

/* =========================
   REPRESENTATIVES
========================= */

const REPS_FILE =
path.join(
__dirname,
"database",
"representatives.json"
);

function getRepresentatives(){

return JSON.parse(
fs.readFileSync(REPS_FILE)
);

}

function saveRepresentatives(data){

fs.writeFileSync(
REPS_FILE,
JSON.stringify(data,null,2)
);

}

/* =========================
   ADMIN REPRESENTATIVES
========================= */

app.get(
"/admin-representatives",
(req,res)=>{

const reps =
getRepresentatives();

res.json(reps);

}
);

/* =========================
   REMOVE VOTES
========================= */

app.post(
"/admin-remove-votes",
(req,res)=>{

const {
representative,
votes
} = req.body;

const reps =
getRepresentatives();

const rep =
reps.find(
r => r.name === representative
);

if(!rep){

return res.json({
success:false
});

}

rep.votes -= Number(votes);

if(rep.votes < 0){

rep.votes = 0;

}

saveRepresentatives(reps);

res.json({
success:true
});

}
);

app.post("/chat/send",(req,res)=>{

const {
email,
name,
message
} = req.body;

if(
!email ||
!message
){

return res.json({
success:false
});

}

const chats =
getChats();

let conversation =
chats.find(
c => c.email === email
);

if(!conversation){

conversation = {

id:Date.now(),

email,

name,

messages:[]

};

chats.push(
conversation
);

}

conversation.unread = true;

conversation.messages.push({

sender:"user",

text:message,

date:new Date()

});

const msg = message.toLowerCase();
let autoReply = "";

// GREETINGS
if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("good morning") || msg.includes("good evening") || msg.includes("good afternoon")) {
  autoReply = "Hello 👋 Welcome to Binance GIAI Support! How can we assist you today? You can ask us about deposits, withdrawals, investment plans, representatives, profits, voting, or reinvestments.";
}

// DEPOSIT
else if (msg.includes("how to deposit") || msg.includes("make a deposit") || msg.includes("how do i deposit") || msg.includes("deposit money") || msg.includes("fund my account")) {
  autoReply = "💰 To make a deposit:\n\n1. Log into your account and open your Dashboard\n2. Click the 'Deposit' button\n3. Select your preferred Representative\n4. Choose an Investment Plan that matches your budget\n5. You will be shown our wallet addresses (BTC, USDT TRC20, or ETH)\n6. Send the exact amount to any of the wallets\n7. Click 'I HAVE PAID' to submit your deposit request\n8. Our team will verify and approve your deposit — your balance will update automatically.\n\nMinimum deposit is $200. Need help choosing a plan?";
}

else if (msg.includes("deposit") || msg.includes("fund") || msg.includes("top up") || msg.includes("add money")) {
  autoReply = "💰 To deposit funds, go to your Dashboard and click 'Deposit'. Select a representative, choose a plan, and send payment to one of our wallet addresses. Once confirmed, click 'I HAVE PAID' and our team will approve it shortly.";
}

// WITHDRAWAL
else if (msg.includes("how to withdraw") || msg.includes("how do i withdraw") || msg.includes("withdrawal process") || msg.includes("request withdrawal")) {
  autoReply = "🏦 To withdraw your funds:\n\n1. Open your Dashboard\n2. Click the 'Withdraw' button\n3. Enter the amount you wish to withdraw\n4. Submit your withdrawal request\n5. Our team reviews and approves withdrawals manually\n\n⚠️ Important: Withdrawals are only available after your active investment plan has completed its full duration. If your plan is still running, you must wait until it finishes before withdrawing.";
}

else if (msg.includes("withdraw") || msg.includes("cash out") || msg.includes("take out") || msg.includes("payout")) {
  autoReply = "🏦 You can withdraw from your Dashboard by clicking 'Withdraw', entering your wallet address and amount. Note: withdrawals are only processed after your investment plan duration has ended. Our team approves all withdrawal requests manually.";
}

// INVESTMENT PLANS
else if (msg.includes("what are the plans") || msg.includes("investment plans") || msg.includes("available plans") || msg.includes("which plan") || msg.includes("plan options")) {
  autoReply = "📊 Here are our current Investment Plans:\n\n• Starter Plan — $200 to $999 — 25% return — 1 Day\n• Standard Plan — $1,000 to $2,999 — 45% return — 2 Days\n• Premium Plan — $3,000 to $7,999 — 55% return — 5 Days\n• Contact Manager — $8,000 to $14,999 — 85% return — 14 Days\n• Capital Boost — $15,000 to $44,999 — 95% return — 22 Days\n• Rapid Return — $45,000+ — 100.15% return — 35 Days\n\nAll plans are AI-managed and returns are calculated automatically. To activate a plan, go to Dashboard → Deposit → Choose Plan.";
}

else if (msg.includes("starter plan") || msg.includes("basic plan")) {
  autoReply = "📌 The Starter Plan requires a deposit of $200 to $999. It offers a 25% return and completes in 1 day. It is perfect for new investors getting started with GIAI.";
}

else if (msg.includes("standard plan")) {
  autoReply = "📌 The Standard Plan requires $1,000 to $2,999. It offers a 45% return over 2 days. Great for investors looking for faster mid-range growth.";
}

else if (msg.includes("premium plan")) {
  autoReply = "📌 The Premium Plan requires $3,000 to $7,999. It offers a 55% return over 5 days. Designed for serious investors seeking strong consistent returns.";
}

else if (msg.includes("contact manager") || msg.includes("manager plan")) {
  autoReply = "📌 The Contact Manager Plan requires $8,000 to $14,999. It offers an 85% return over 14 days. This tier includes priority support from a dedicated investment manager.";
}

else if (msg.includes("capital boost")) {
  autoReply = "📌 The Capital Boost Plan requires $15,000 to $44,999. It offers a 95% return over 22 days. This is our high-performance institutional-grade plan.";
}

else if (msg.includes("rapid return")) {
  autoReply = "📌 The Rapid Return Plan requires $45,000 or more. It offers a 100.15% return over 35 days. This is our most powerful plan, designed for elite investors seeking maximum portfolio growth.";
}

else if (msg.includes("plan") || msg.includes("invest") || msg.includes("package")) {
  autoReply = "📊 We offer 6 investment plans ranging from $200 to $45,000+, with returns from 25% to 100.15%. To see all plans and activate one, go to your Dashboard and click 'Plans'. Would you like details on a specific plan?";
}

// PROFIT
else if (msg.includes("how does profit work") || msg.includes("how is profit calculated") || msg.includes("when do i get profit")) {
  autoReply = "💹 Profit is calculated based on your deposit amount and the interest rate of your chosen plan. For example, if you deposit $1,000 on the Standard Plan (45%), your total return will be $1,450 after 2 days.\n\nYour Dashboard shows:\n• Expected Profit — total profit at plan completion\n• Claimable Profit — profit earned so far based on time elapsed\n• Progress Bar — how far along your investment is\n\nOnce the plan completes, your profit is added to your balance automatically.";
}

else if (msg.includes("profit") || msg.includes("earnings") || msg.includes("returns") || msg.includes("interest")) {
  autoReply = "💹 Your profit is shown in real time on your Dashboard under 'Expected Profit' and 'Claimable Profit'. Returns depend on your plan — ranging from 25% to 100.15%. Profit is credited to your balance once your investment duration completes.";
}

// VOTING
else if (msg.includes("how to vote") || msg.includes("how do i vote") || msg.includes("voting system") || msg.includes("how does voting work")) {
  autoReply = "🗳️ Voting in GIAI works automatically through your investments:\n\n1. When you deposit and select a Representative, votes are assigned to them based on your deposit amount\n2. Every $500 deposited = 1 vote contributed to your chosen representative\n3. Your total votes are shown on your Dashboard under 'Votes Contributed'\n4. Representatives with the most votes climb the global rankings\n\nYou do not need to manually vote — simply investing under a representative automatically supports them in the GIAI competition.";
}

else if (msg.includes("vote") || msg.includes("representative ranking") || msg.includes("leaderboard")) {
  autoReply = "🗳️ Votes are earned automatically — every $500 you invest under a representative gives them 1 vote. The more you invest, the more you support their global ranking. Check the Live Rankings section on the homepage to see current standings.";
}

// REPRESENTATIVES
else if (msg.includes("how to choose representative") || msg.includes("which representative") || msg.includes("who should i pick") || msg.includes("best representative")) {
  autoReply = "👤 Choosing a representative is based on your region or preference:\n\n• Robert Rachel — North African & Canadian markets\n• Michael Scott — European markets (UK, Italy, Spain, Belgium)\n• Lincoln Hayes — Global Expansion (Brazil, Japan, Singapore, Dubai)\n• Amber Agrawal — Asia-Pacific (Australia, Malaysia, Thailand, Indonesia)\n\nYou can select your representative during the deposit process. Your choice supports their global GIAI ranking.";
}

else if (msg.includes("representative") || msg.includes("rep ")) {
  autoReply = "👤 Representatives are GIAI competition participants you support through your investments. You select one when making a deposit. To change your representative, make a new deposit and select a different one. Your current representative is shown on your Dashboard.";
}

// REINVESTMENT
else if (msg.includes("how to reinvest") || msg.includes("how does reinvestment work") || msg.includes("reinvestment process") || msg.includes("can i reinvest")) {
  autoReply = "🔄 Reinvestment allows you to grow your portfolio using your earned profits:\n\n1. After your investment plan completes, your profits appear as 'Claimable Profit' on your Dashboard\n2. You can reinvest those profits back into a new plan to compound your earnings\n3. Each plan has a reinvestment limit — higher plans allow more reinvestment cycles\n4. To increase your reinvestment cycles, top up your investment by at least 20% of your current amount\n\nReinvestment limits by plan:\n• Starter Plan — 1 reinvestment\n• Standard Plan — 2 reinvestments\n• Premium Plan — 3 reinvestments\n• Contact Manager — 4 reinvestments\n• Capital Boost — 5 reinvestments\n• Rapid Return — 10 reinvestments";
}

else if (msg.includes("reinvest") || msg.includes("compound") || msg.includes("roll over")) {
  autoReply = "🔄 You can reinvest your profits once your plan completes. Go to your Dashboard and use the Reinvestment option. Higher plans allow more reinvestment cycles. To unlock additional cycles, you'll have to top up votes and it varies based on plan so basically more capital to your existing investment.";
}

// BALANCE
else if (msg.includes("my balance") || msg.includes("check balance") || msg.includes("where is my money") || msg.includes("account balance")) {
  autoReply = "💼 Your account balance is displayed at the top of your Dashboard under 'Total Portfolio Balance'. This includes your deposited capital plus any approved profits. If you recently made a deposit, it will reflect once our team approves it.";
}

// ACCOUNT / LOGIN
else if (msg.includes("forgot password") || msg.includes("cant login") || msg.includes("can't login") || msg.includes("login issue") || msg.includes("reset password")) {
  autoReply = "🔐 If you are having trouble logging in, please ensure you are using the correct email and password you registered with. If you continue to have issues, contact our live support team through this chat and a representative will assist you directly.";
}

else if (msg.includes("create account") || msg.includes("sign up") || msg.includes("register") || msg.includes("how to join")) {
  autoReply = "✅ To create an account:\n\n1. Click 'Create Account' on the homepage\n2. Fill in your username, full name, email, phone number, and password\n3. Select your country\n4. Optionally enter a referral ID if someone invited you\n5. Click 'Create Account'\n\nOnce registered, you can log in and access your Dashboard immediately.";
}

// SECURITY / VERIFICATION
else if (msg.includes("is this legit") || msg.includes("is this real") || msg.includes("is this safe") || msg.includes("scam") || msg.includes("trust")) {
  autoReply = "🔒 Binance GIAI is a verified Global Investor Acquisition Initiative operating under the Binance infrastructure. All investments are processed through blockchain-verified systems with AI-powered security. Our platform has been active since 2017 with over 300 million users worldwide across 180+ countries. Your funds are secured through enterprise-grade blockchain infrastructure.";
}

else if (msg.includes("verification") || msg.includes("kyc") || msg.includes("verify account")) {
  autoReply = "✅ Account verification is handled automatically through our AI onboarding system when you make your first deposit. No manual KYC documents are required for standard investment plans. For larger plans (Capital Boost and above), a support representative may reach out for additional verification.";
}

// WALLET ADDRESSES
else if (msg.includes("wallet address") || msg.includes("where to send") || msg.includes("btc address") || msg.includes("usdt address") || msg.includes("eth address") || msg.includes("payment address")) {
  autoReply = "💳 Our current payment wallet addresses are:\n\n• BTC: bc1qa4g38u9mxn43td5mt67jh320sy6nne9tfaewg6\n• USDT TRC20: TBkxc6SZkXSYTop9NPJLz3TvLayDSrPedQ\n• ETH: 0x21b7f254a06F222a1bed905f9d7b13665B42Bb65\n\nSend your deposit to any of these addresses, then return to the dashboard and click 'I HAVE PAID' to notify our team.";
}

// DURATION / TIMING
else if (msg.includes("how long") || msg.includes("duration") || msg.includes("when will") || msg.includes("how many days")) {
  autoReply = "⏱️ Investment durations depend on your plan:\n\n• Starter — 1 Day\n• Standard — 2 Days\n• Premium — 5 Days\n• Contact Manager — 14 Days\n• Capital Boost — 22 Days\n• Rapid Return — 35 Days\n\nYour Dashboard shows a progress bar and days remaining for your active investment.";
}

// SUPPORT / CONTACT
else if (msg.includes("speak to someone") || msg.includes("talk to agent") || msg.includes("human support") || msg.includes("live support") || msg.includes("contact support")) {
  autoReply = "🧑‍💼 A live support representative will respond to your message shortly. Our team is available 24/7 to assist with all investment-related queries. Please leave your question here and we will get back to you as soon as possible.";
}

else if (msg.includes("thank") || msg.includes("thanks") || msg.includes("appreciate") || msg.includes("helpful")) {
  autoReply = "😊 You're welcome! If you have any other questions about your investments, plans, or account, feel free to ask anytime. Our team is always here to help.";
}

// MERCH
else if (msg.includes("merch") || msg.includes("merchandise") || msg.includes("clothing") || msg.includes("shop") || msg.includes("buy")) {
  autoReply = "🛍️ Binance GIAI official merchandise is available in our Merch Store. Click 'Explore Merchandise' on the homepage to browse exclusive branded apparel and investor accessories. New collections are released each investment season.";
}

// RANKINGS
else if (msg.includes("ranking") || msg.includes("rankings") || msg.includes("leaderboard") || msg.includes("standings")) {
  autoReply = "🏆 Live representative rankings are updated in real time based on verified investor activity and votes. You can view the current rankings by clicking 'Live Rankings' on the homepage. Rankings increase as more investors support a representative through deposits.";
}

// DEFAULT
else {
  autoReply = "🤝 Thank you for reaching out to Binance GIAI Support. A live representative will respond to your message shortly.\n\nIn the meantime, you can ask about:\n• How to deposit or withdraw\n• Investment plans and returns\n• How voting and rankings work\n• How reinvestment works\n• Your balance or active plan\n• Wallet addresses for payment";
}

conversation.messages.push({

sender:"bot",

text:autoReply,

date:new Date()

});

saveChats(chats);

res.json({
success:true
});

});

app.get("/chat/messages/:email",(req,res)=>{

const email =
req.params.email;

const chats =
getChats();

const conversation =
chats.find(
c => c.email === email
);

res.json({
success:true,
messages:
conversation ?
conversation.messages : []
});

});

app.get("/chat/list",(req,res)=>{

res.json({
success:true,
chats:getChats()
});

});

app.post("/chat/reply",(req,res)=>{

const {
email,
message
} = req.body;

const chats =
getChats();

const conversation =
chats.find(
c => c.email === email
);

if(!conversation){

return res.json({
success:false
});

}

conversation.unread = false;

conversation.messages.push({

sender:"admin",

text:message,

date:new Date()

});

saveChats(chats);

res.json({
success:true
});

});

/* =========================
   SIGNUP
========================= */

app.post("/signup", (req, res) => {

  const {
    name,
    email,
    password,
    username,
    phone,
    country,
    referrer,
    wallet,
    secretQuestion,
    secretAnswer
  } = req.body;

  if (!name || !email || !password) {
    return res.json({
      success: false,
      message: "Please fill in all required fields."
    });
  }

  if (!secretQuestion || !secretAnswer) {
    return res.json({
      success: false,
      message: "Please select and answer a security question."
    });
  }

  const users = getUsers();

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.json({
      success: false,
      message: "An account with this email already exists."
    });
  }

  const existingUsername = users.find(u => u.username === username);
  if (existingUsername) {
    return res.json({
      success: false,
      message: "That username is already taken. Please choose another."
    });
  }

  const newUser = {
    id:             Date.now(),
    username:       username || "",
    name:           name,
    email:          email,
    password:       password,
    phone:          phone || "",
    country:        country || "",
    referrer:       referrer || "",
    wallet: {
      btc:       wallet?.btc       || "",
      eth:       wallet?.eth       || "",
      usdt_trc20: wallet?.usdt_trc20 || ""
    },
    secretQuestion: secretQuestion,
    secretAnswer:   secretAnswer.trim().toLowerCase(),
    balance:        0,
    plan:           "None",
    rank:           "Starter Investor",
    totalVotes:     0,
    status:         "ACTIVE",
    transactions:   [],
    representatives: []
  };

  users.push(newUser);
  saveUsers(users);

  res.json({
    success: true,
    message: "Account created successfully",
    user:    newUser
  });
});

app.post("/reject-reinvestment",(req,res)=>{
  const { id } = req.body;
  const requests = getReinvestments();
  const request = requests.find(r => r.id == id);

  if(!request){
    return res.json({ success:false });
  }

  request.status = "REJECTED";
  saveReinvestments(requests);

  res.json({ success:true });
});


/* =========================
   LOGIN
========================= */

app.post("/login",(req,res)=>{

const {
email,
password
} = req.body;

const users = getUsers();

const user =
users.find(
u =>
u.email === email &&
u.password === password
);

if(!user){

return res.json({
success:false,
message:"Invalid email or password"
});

}

if(user.status === "BANNED"){
  return res.json({ success:false, message:"Your account has been suspended. Contact support." });
}

res.json({
success:true,
message:"Login successful",
user
});

});

/* =========================
   ACTIVATE PLAN
========================= */

app.post("/activate-plan",(req,res)=>{

const {
email,
plan,
amount
} = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.plan = plan;

/* RANK */

if(user.balance >= 1000){

user.rank = "Silver Investor";

}

if(user.balance >= 5000){

user.rank = "Gold Investor";

}

if(user.balance >= 10000){

user.rank = "VIP Investor";

}

/* TRANSACTION */

user.transactions.unshift({

type:"PLAN ACTIVATED",

amount,

plan,

date:new Date()

});

saveUsers(users);

res.json({

success:true,
message:"Plan activated successfully",
user

});

});

app.post("/submit-card-shipping", async (req, res) => {
  const { email, cardType, address } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  const flag = cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
  user[flag] = "shipping";

  const addrField = cardType === "gold" ? "goldCardShipping" : "blackCardShipping";
  user[addrField] = address;

  user.transactions.unshift({
    type: (cardType === "gold" ? "GOLD" : "BLACK") + " CARD SHIPPING SUBMITTED",
    amount: 0,
    date: new Date()
  });

  saveUsers(users);

  // Auto-generate the route immediately (default 14 days, admin can adjust later)
  try {
    await autoCreateShipmentRoute(email, cardType, address, 14);
  } catch (err) {
    console.log("⚠️ Could not auto-generate route:", err.message);
  }

  res.json({ success: true });
});

/* =========================
   REQUEST DEPOSIT
========================= */

app.post("/request-deposit",(req,res)=>{

const {
email,
amount,
plan,
representative
} = req.body;

const deposits =
getDeposits();

const newDeposit = {

id:Date.now(),

email,
amount,

plan,
representative,

status:"PENDING",

date:new Date()

};

deposits.push(newDeposit);

saveDeposits(deposits);

res.json({

success:true,
message:"Deposit request submitted"

});

});

/* =========================
   UPDATE USER
========================= */

app.post("/admin-update-user",(req,res)=>{

const {
email,
balance,
votes,
representative,
rank,
status
} = req.body;

const users = getUsers();

const user =
users.find(
u=>u.email===email
);

if(!user){

return res.json({
success:false
});

}

if(balance !== undefined){

user.balance =
Number(balance);

}

if(votes !== undefined){

user.totalVotes =
Number(votes);

}

if(representative){

user.representative =
representative;

}

if(rank){

user.rank =
rank;

}

if(status){

user.status =
status;

}

saveUsers(users);

res.json({
success:true,
user
});

});

/* =========================
   ADMIN USERS
========================= */

app.get("/admin-users",(req,res)=>{

const users = getUsers();

res.json({
users
});

});

/* =========================
   ADMIN DEPOSITS
========================= */

app.get("/admin-deposits",(req,res)=>{

const deposits =
getDeposits();

res.json({
deposits
});

});

/* =========================
   REJECT DEPOSIT
========================= */

app.post("/reject-deposit",(req,res)=>{

const { id } = req.body;

const deposits =
getDeposits();

const deposit =
deposits.find(
d => d.id == id
);

if(!deposit){

return res.json({
success:false,
message:"Deposit not found"
});

}

deposit.status = "REJECTED";

saveDeposits(deposits);

res.json({

success:true,
message:"Deposit rejected"

});

});

/* =========================
   CLAIM PROFIT
========================= */

app.post("/claim-profit", (req, res) => {

  const { email } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  if (user.plan === "None") {
    return res.json({ success: false, message: "No active plan" });
  }

  const profit = Math.floor(
    Number(user.investmentAmount || 0) * (Number(user.profitPercent || 0) / 100)
  );

  user.claimableProfit = Number(user.claimableProfit || 0) + profit;

  user.transactions.unshift({
    type:   "PROFIT GENERATED",
    amount: profit,
    date:   new Date()
  });

  saveUsers(users);

  res.json({
    success:         true,
    message:         "Profit generated",
    profit,
    claimableProfit: user.claimableProfit,
    user
  });
});

/* =========================
   REINVEST PROFIT
========================= */

app.post("/reinvest-profit", (req, res) => {

  const { email } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  const limit = getReinvestmentLimit(user.plan);
  const count = Number(user.reinvestmentCount || 0);

  if (count >= limit) {
    return res.json({
      success: false,
      message: "Reinvestment limit reached. Please top up at least 20%."
    });
  }

  const profit = Math.floor(
    Number(user.investmentAmount || 0) * (Number(user.profitPercent || 0) / 100)
  );

  user.investmentAmount  += profit;
  user.reinvestmentCount += 1;

  user.transactions.unshift({
    type:   "PROFIT REINVESTED",
    amount: profit,
    date:   new Date()
  });

  saveUsers(users);

  res.json({ success: true, message: "Profit reinvested", user });
});

/* =========================
   SERVER
========================= */

app.post("/request-withdrawal",(req,res)=>{
  const { email, amount } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if(!user) return res.json({ success:false, message:"User not found" });

  if(Number(user.investmentAmount || 0) > 0){
    return res.json({ success:false, message:"Investment cycle still active. Capital cannot be withdrawn until it completes." });
  }

  if(Number(amount) > Number(user.balance || 0)){
    return res.json({ success:false, message:"Insufficient balance." });
  }

  const withdrawals = getWithdrawals();
  withdrawals.push({ id:Date.now(), email, amount, status:"PENDING", date:new Date() });
  saveWithdrawals(withdrawals);

  res.json({ success:true, message:"Withdrawal request submitted" });
});

/* =========================
   COMPLETE INVESTMENT
========================= */

app.post("/complete-investment", (req, res) => {

  const { email } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "User not found" });
  }

  if (!user.investmentAmount || Number(user.investmentAmount) === 0) {
    return res.json({ success: false, message: "No active investment" });
  }

  const amount  = Number(user.investmentAmount || 0);
  const percent = Number(user.profitPercent || 0);
  const profit  = amount * (percent / 100);

  user.balance = Number(user.balance || 0) + profit;

  user.transactions.unshift({
    type:   "PROFIT CREDITED",
    amount: profit,
    date:   new Date()
  });

  user.investmentAmount   = 0;
  user.profitPercent      = 0;
  user.investmentDuration = 0;
  user.investmentStart    = 0;
  user.cycleCompleted     = true;
  user.balanceIsAdminFunded = false; // profit money — must go through Reinvest, not direct invest

  saveUsers(users);

  res.json({ success: true, message: "Investment completed", user });
});

/* =========================
   ADMIN WITHDRAWALS
========================= */

app.get("/admin-withdrawals",(req,res)=>{

const withdrawalsFile =
path.join(
__dirname,
"database",
"withdrawals.json"
);

if(!fs.existsSync(withdrawalsFile)){

fs.writeFileSync(
withdrawalsFile,
"[]"
);

}

const withdrawals =
JSON.parse(
fs.readFileSync(withdrawalsFile)
);

res.json({
withdrawals
});

});

/* =========================
   APPROVE WITHDRAWAL
========================= */

app.post("/approve-withdrawal",(req,res)=>{

const { id } = req.body;

const withdrawalsFile =
path.join(
__dirname,
"database",
"withdrawals.json"
);

const withdrawals =
JSON.parse(
fs.readFileSync(withdrawalsFile)
);

const withdrawal =
withdrawals.find(
w => w.id === id
);

if(!withdrawal){

return res.json({
success:false,
message:"Withdrawal not found"
});

}

if(withdrawal.status === "APPROVED"){

return res.json({
success:false,
message:"Already approved"
});

}

const users = getUsers();

const user =
users.find(
u => u.email === withdrawal.email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

if(user.balance < Number(withdrawal.amount)){

return res.json({
success:false,
message:"Insufficient balance"
});

}

const amount =
Number(withdrawal.amount);

if(
user.balance < amount
){

return res.json({

success:false,

message:
"Insufficient balance"

});

}

user.balance -= amount;

const removedVotes =
Math.floor(amount / 500);

user.totalVotes =
Math.max(
0,
(user.totalVotes || 0)
-
removedVotes
);

if(user.balance >= 50000){

user.rank =
"Elite Investor";

}

else if(
user.balance >= 15000
){

user.rank =
"VIP Investor";

}

else if(
user.balance >= 5000
){

user.rank =
"Premium Investor";

}

else if(
user.balance >= 1000
){

user.rank =
"Standard Investor";

}

else{

user.rank =
"Starter Investor";

}

if(user.balance <= 0){

user.plan = "None";

user.investmentAmount = 0;

user.investmentStart = 0;

user.profitPercent = 0;

user.investmentDuration = 0;

}

user.transactions.unshift({

type:"WITHDRAWAL APPROVED",

amount:withdrawal.amount,

date:new Date()

});

withdrawal.status =
"APPROVED";

saveUsers(users);

fs.writeFileSync(

withdrawalsFile,

JSON.stringify(
withdrawals,
null,
2
)

);

res.json({

success:true,

message:"Withdrawal approved"

});

});

/* =========================
   ADMIN ADD VOTES
========================= */

app.post("/admin-add-votes",(req,res)=>{

const { email, votes } = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.totalVotes =
Number(user.totalVotes || 0)
+
Number(votes || 0);

saveUsers(users);

res.json({
success:true,
message:"Votes added",
user
});

});

/* =========================
   ADMIN FUND USER
========================= */

app.post("/admin-fund-user",(req,res)=>{

const {
email,
amount
} = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.balance +=
Number(amount);

user.transactions.unshift({

type:"ADMIN FUND",

amount,

date:new Date()

});

saveUsers(users);

res.json({

success:true,

message:"Balance added",

user

});

});

/* =========================
   ADMIN SET PLAN
========================= */

app.post("/admin-set-plan",(req,res)=>{

const {
email,
plan
} = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.plan = plan;

saveUsers(users);

res.json({

success:true,

message:"Plan updated",

user

});

});

/* =========================
   ADMIN SET RANK
========================= */

app.post("/admin-set-rank",(req,res)=>{

const {
email,
rank
} = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.rank = rank;

saveUsers(users);

res.json({

success:true,

message:"Rank updated",

user

});

});

/* =========================
   ADMIN REMOVE BALANCE
========================= */

app.post(
"/admin-remove-balance",
(req,res)=>{

const {
email,
amount
} = req.body;

const users =
getUsers();

const user =
users.find(
u=>u.email===email
);

if(!user){

return res.json({
success:false
});

}

user.balance -=
Number(amount);

if(user.balance < 0){

user.balance = 0;

}

saveUsers(users);

res.json({
success:true
});

});

/* =========================
   GET USER
========================= */

app.post("/get-user",(req,res)=>{
const { email } = req.body;
const users = getUsers();
const user = users.find(u => u.email === email);
if(!user){
return res.json({ success:false, message:"User not found" });
}

const now = Date.now();
const endTime = (user.investmentStart || 0) + ((user.investmentDuration || 0) * 86400000);

if (user.investmentAmount > 0 && user.investmentStart && now >= endTime) {

  const profit = Number(user.investmentAmount) * (Number(user.profitPercent || 0) / 100);

  user.balance = Number(user.balance || 0) + profit;
  user.lastCycleProfit = profit;

  user.transactions.unshift({ type:"INVESTMENT CYCLE COMPLETED", amount:profit, date:new Date() });

  user.investmentAmount = 0;
  user.profitPercent = 0;
  user.investmentDuration = 0;
  user.investmentStart = 0;
  user.cycleCompleted = true;
  user.balanceIsAdminFunded = false; // profit money — must go through Reinvest, not direct invest

  saveUsers(users);
}

const deposits = getDeposits();
const withdrawals = JSON.parse(fs.readFileSync(path.join(__dirname,"database","withdrawals.json")));

const pendingDeposits = deposits.filter(d => d.email === email && d.status === "PENDING").length;
const pendingWithdrawals = withdrawals.filter(w => w.email === email && w.status === "PENDING").length;

res.json({
success:true,
user:{
...user,
pendingDeposits,
pendingWithdrawals
}
});
});

/* =========================
   ADMIN APPROVE INVESTMENT
========================= */

app.post("/admin-approve-investment",(req,res)=>{

const {
email,
plan,
amount,
representative
} = req.body;

const users = getUsers();

const user =
users.find(
u => u.email === email
);

if(!user){

return res.json({
success:false,
message:"User not found"
});

}

user.plan = plan;

user.representative =
representative;

/* VOTES */

user.votes =
Math.floor(
Number(amount) / 500
);

/* PROFIT + DURATION */

if(plan === "Starter Plan"){

user.profitPercent = 25;
user.investmentDuration = 1;

}

else if(plan === "Standard Plan"){

user.profitPercent = 45;
user.investmentDuration = 2;

}

else if(plan === "Premium Plan"){

user.profitPercent = 55;
user.investmentDuration = 5;

}

else if(plan === "Contact Manager"){

user.profitPercent = 85;
user.investmentDuration = 14;

}

else if(plan === "Capital Boost"){

user.profitPercent = 95;
user.investmentDuration = 22;

}

else if(plan === "Rapid Return"){

user.profitPercent = 100.15;
user.investmentDuration = 35;

}

user.investmentStart =
Date.now();

user.balance +=
Number(amount);

user.transactions.unshift({

type:"PLAN ACTIVATED",

plan,

amount,

date:new Date()

});

saveUsers(users);

res.json({

success:true,
message:"Investment approved"

});

});

app.post(
"/admin-update-balance",
(req,res)=>{

const {
id,
balance
} = req.body;

const users =
getUsers();

const user =
users.find(
u=>u.id==id
);

if(!user){

return res.json({
success:false
});

}

user.balance =
Number(balance);

saveUsers(users);

res.json({
success:true
});

});

/* =========================
   ADMIN ASSIGN REP
========================= */

app.post("/admin-assign-rep",(req,res)=>{
  const { email, representative } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if(!user){
    return res.json({ success:false, message:"User not found" });
  }

  user.representative = representative;

  if(!user.representatives) user.representatives = [];
  const existing = user.representatives.find(r => r.name === representative);
  if(!existing){
    user.representatives.push({ name: representative, votes: 0 });
  }

  saveUsers(users);
  res.json({ success:true, message:"Representative assigned" });
});

app.post("/reject-withdrawal",(req,res)=>{

const { id } = req.body;

const withdrawalsFile =
path.join(
__dirname,
"database",
"withdrawals.json"
);

const withdrawals =
JSON.parse(
fs.readFileSync(withdrawalsFile)
);

const withdrawal =
withdrawals.find(
w => w.id == id
);

if(!withdrawal){

return res.json({
success:false
});

}

withdrawal.status =
"REJECTED";

fs.writeFileSync(
withdrawalsFile,
JSON.stringify(
withdrawals,
null,
2
)
);

res.json({
success:true
});

});

app.post("/request-reinvestment",(req,res)=>{
  const { email, topup, representative } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if(!user){
    return res.json({ success:false, message:"User not found" });
  }

  // Use the profit saved when the cycle completed
  const claimableProfit = Number(user.lastCycleProfit || 0);

  const requests = getReinvestments();

  requests.push({
    id: Date.now(),
    email,
    profit: claimableProfit,
    topup: Number(topup || 0),
    representative,
    status: "PENDING",
    date: new Date().toISOString()
  });

  saveReinvestments(requests);
  res.json({ success:true });
});

app.get(
"/admin-reinvestments",
(req,res)=>{

const requests =
JSON.parse(
fs.readFileSync(
"reinvestments.json",
"utf8"
)
);

res.json({
requests
});

});

app.post("/approve-reinvestment",(req,res)=>{
  const { id } = req.body;
  const requests = getReinvestments();
  const request = requests.find(r => r.id == id);

  if(!request) return res.json({ success:false });

  const users = getUsers();
  const user = users.find(u => u.email === request.email);
  if(!user) return res.json({ success:false });

  const freshMoney = Number(request.topup || 0);

  // balance already includes last cycle's profit; investmentAmount = balance + topup
  user.balance = Number(user.balance || 0) + freshMoney;
  user.investmentAmount = Number(user.balance);

  user.investmentStart = Date.now();
  user.cycleCompleted = false;
  user.reinvestmentCount = Number(user.reinvestmentCount || 0) + 1;

  // PLAN TIER based on new investmentAmount
  const amount = user.investmentAmount;
  if(amount >= 200 && amount <= 999){ user.plan="Starter Plan"; user.profitPercent=25; user.investmentDuration=1; }
  else if(amount <= 2999){ user.plan="Standard Plan"; user.profitPercent=45; user.investmentDuration=2; }
  else if(amount <= 7999){ user.plan="Premium Plan"; user.profitPercent=55; user.investmentDuration=5; }
  else if(amount <= 14999){ user.plan="Contact Manager"; user.profitPercent=85; user.investmentDuration=14; }
  else if(amount <= 44999){ user.plan="Capital Boost"; user.profitPercent=95; user.investmentDuration=22; }
  else { user.plan="Rapid Return"; user.profitPercent=100.15; user.investmentDuration=35; }

  // REPRESENTATIVE — votes only on fresh topup money
  if(request.representative){
    const reps = getRepresentatives();
    const rep = reps.find(r => r.name === request.representative);

    if(!user.representatives) user.representatives = [];

    if(freshMoney > 0){
      const votes = Math.floor(freshMoney / 500);
      if(rep) rep.votes += votes;

      let entry = user.representatives.find(r => r.name === request.representative);
      if(entry){ entry.votes += votes; }
      else { user.representatives.push({ name: request.representative, votes }); }

      saveRepresentatives(reps);
    } else if(!user.representatives.find(r => r.name === request.representative)){
      user.representatives.push({ name: request.representative, votes: 0 });
    }

    user.representative = request.representative;
    user.totalVotes = user.representatives.reduce((s,r)=>s+r.votes,0);
  }

  user.transactions.unshift({ type:"REINVESTMENT APPROVED", amount, date:new Date() });

  request.status = "APPROVED";

  saveUsers(users);
  saveReinvestments(requests);
  res.json({ success:true });
});

/* =========================
   PUBLIC: GET SITE SETTINGS
   index.html calls this
========================= */

app.get("/site-settings", (req, res) => {
  res.json(getSiteSettings());
});

/* =========================
   ADMIN: SAVE SITE SETTINGS
========================= */

app.post("/admin-save-site-settings", (req, res) => {
  const { announcement, representatives } = req.body;
  const current = getSiteSettings();

  if (announcement !== undefined) current.announcement = announcement;
  if (representatives !== undefined) current.representatives = representatives;

  saveSiteSettings(current);
  res.json({ success: true, message: "Site settings saved" });
});

function getCardApplications(){
  if(!fs.existsSync(CARDS_FILE)){
    fs.writeFileSync(CARDS_FILE, "[]");
  }
  return JSON.parse(fs.readFileSync(CARDS_FILE,"utf8"));
}

function saveCardApplications(data){
  fs.writeFileSync(CARDS_FILE, JSON.stringify(data,null,2));
}

app.post("/admin-add-balance",(req,res)=>{
  const { email, amount, plan } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if(!user) return res.json({ success:false, message:"User not found" });

  // Always add to balance
  user.balance = Number(user.balance || 0) + Number(amount || 0);

  // If plan selected, also track as investment — but DON'T deduct balance
  if (plan) {
    user.investmentAmount = Number(user.investmentAmount || 0) + Number(amount || 0);
    user.plan             = plan;
    user.investmentStart  = Date.now();
    user.cycleCompleted   = false;
    user.balanceIsAdminFunded = false; // already invested, nothing "available" to invest separately

    if(plan === "Starter Plan")   { user.profitPercent=25;     user.investmentDuration=1;  }
    else if(plan === "Standard Plan") { user.profitPercent=45; user.investmentDuration=2;  }
    else if(plan === "Premium Plan")  { user.profitPercent=55; user.investmentDuration=5;  }
    else if(plan === "Contact Manager"){ user.profitPercent=85; user.investmentDuration=14; }
    else if(plan === "Capital Boost") { user.profitPercent=95; user.investmentDuration=22; }
    else if(plan === "Rapid Return")  { user.profitPercent=100.15; user.investmentDuration=35; }
  } else {
    // No plan selected — this is pure available balance the user can choose to invest
    user.balanceIsAdminFunded = true;
  }

  user.transactions.unshift({
    type:   plan ? "ADMIN FUND + PLAN ACTIVATED" : "ADMIN FUND",
    amount: amount,
    date:   new Date()
  });

  saveUsers(users);
  res.json({ success:true, message:"Balance added successfully", user });
});

app.post("/request-card", cardUpload.fields([
  { name:"idFile", maxCount:1 },
  { name:"proofFile", maxCount:1 }
]), (req,res)=>{

  const { email, cardType, employment, occupation, income } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if(!user){
    return res.json({ success:false, message:"User not found" });
  }

  const flag = cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
  if(user[flag] === "active" || user[flag] === "pending"){
    return res.json({ success:false, message:"Application already submitted." });
  }

  user[flag] = "pending";
  saveUsers(users);

  const idFile = req.files?.idFile?.[0];
  const proofFile = req.files?.proofFile?.[0];

  const apps = getCardApplications();
  apps.push({
    id: Date.now(),
    email,
    cardType,
    employment,
    occupation,
    income,
    idFile: idFile ? idFile.filename : null,
    proofFile: proofFile ? proofFile.filename : null,
    status: "PENDING",
    date: new Date()
  });
  saveCardApplications(apps);

  res.json({ success:true });
});

app.get("/admin-cards",(req,res)=>{
  res.json({ applications: getCardApplications() });
});

app.post("/approve-card",(req,res)=>{
  const { id } = req.body;
  const apps = getCardApplications();
  const application = apps.find(a => a.id == id);

  if(!application){
    return res.json({ success:false });
  }

  application.status = "APPROVED";

  const users = getUsers();
  const user = users.find(u => u.email === application.email);

  if(user){
    const flag = application.cardType === "gold" ? "goldCardStatus" : "blackCardStatus";
    user[flag] = "active";

const cardNumber = "GIAI" + Math.floor(1000000000000000 + Math.random() * 8999999999999999);
const numField = application.cardType === "gold" ? "goldCardNumber" : "blackCardNumber";
user[numField] = String(cardNumber);

    user.transactions.unshift({
      type: (application.cardType === "gold" ? "GOLD" : "BLACK") + " CARD ACTIVATED",
      amount: 0,
      date: new Date()
    });

    saveUsers(users);
  }

  saveCardApplications(apps);
  res.json({ success:true });
});

/* =========================
   APPROVE DEPOSIT
========================= */

app.post("/approve-deposit", (req, res) => {

  const { id } = req.body;
  const deposits = getDeposits();
  const deposit  = deposits.find(d => d.id == id);

  if (!deposit) return res.json({ success: false, message: "Deposit not found" });
  if (deposit.status === "APPROVED") return res.json({ success: false, message: "Already approved" });

  deposit.status = "APPROVED";

  const users = getUsers();
  const user  = users.find(u => u.email === deposit.email);

  if (user) {
    const amount = Number(deposit.amount);

    // Balance goes up — this is their money
    user.balance = Number(user.balance || 0) + amount;

    // Investment tracking — separate from balance
    user.investmentAmount   = Number(user.investmentAmount || 0) + amount;
    user.investmentStart    = Date.now();
    user.cycleCompleted     = false;

    // Save the original balance BEFORE investment
    // so deactivation can restore it
    user.balanceBeforeInvestment = user.balance;

    // RANK based on balance
    if (user.balance >= 50000)      user.rank = "Elite Investor";
    else if (user.balance >= 15000) user.rank = "VIP Investor";
    else if (user.balance >= 5000)  user.rank = "Premium Investor";
    else if (user.balance >= 1000)  user.rank = "Standard Investor";
    else                            user.rank = "Starter Investor";

    // PLAN based on investmentAmount
    const inv = user.investmentAmount;
    if      (inv >= 45000) { user.plan = "Rapid Return";     user.profitPercent = 100.15; user.investmentDuration = 35; }
    else if (inv >= 15000) { user.plan = "Capital Boost";    user.profitPercent = 95;     user.investmentDuration = 22; }
    else if (inv >= 8000)  { user.plan = "Contact Manager";  user.profitPercent = 85;     user.investmentDuration = 14; }
    else if (inv >= 3000)  { user.plan = "Premium Plan";     user.profitPercent = 55;     user.investmentDuration = 5;  }
    else if (inv >= 1000)  { user.plan = "Standard Plan";    user.profitPercent = 45;     user.investmentDuration = 2;  }
    else                   { user.plan = "Starter Plan";     user.profitPercent = 25;     user.investmentDuration = 1;  }

    // REPRESENTATIVE
    if (deposit.representative) {
      const reps = getRepresentatives();
      const rep  = reps.find(r => r.name === deposit.representative);
      if (rep) {
        const votes = Math.floor(amount / 500);
        rep.votes += votes;

        if (!user.representatives) user.representatives = [];
        const entry = user.representatives.find(r => r.name === deposit.representative);
        if (entry) { entry.votes += votes; }
        else { user.representatives.push({ name: deposit.representative, votes }); }

        user.representative = deposit.representative;
        user.totalVotes = user.representatives.reduce((s, r) => s + r.votes, 0);
        saveRepresentatives(reps);
      }
    }

    user.transactions.unshift({
      type:   "DEPOSIT APPROVED",
      amount: amount,
      date:   new Date()
    });

    saveUsers(users);
  }

  saveDeposits(deposits);
  res.json({ success: true, message: "Deposit approved" });
});

/* =========================
   ADMIN DEACTIVATE INVESTMENT
========================= */

app.post("/admin-deactivate-investment", (req, res) => {

  const { email } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) return res.json({ success: false, message: "User not found" });

  if (Number(user.investmentAmount || 0) <= 0) {
    return res.json({ success: false, message: "No active investment to deactivate." });
  }

  // Balance stays exactly as it is — we never deducted it
  // Just clear the investment tracking fields
  user.investmentAmount    = 0;
  user.profitPercent       = 0;
  user.investmentDuration  = 0;
  user.investmentStart     = 0;
  user.cycleCompleted      = false;
  user.plan                = "None";

  user.transactions.unshift({
    type:   "INVESTMENT DEACTIVATED BY ADMIN",
    amount: 0,
    date:   new Date()
  });

  saveUsers(users);
  res.json({
    success: true,
    message: "Investment deactivated. Balance preserved. User can now withdraw."
  });
});

/* =========================
   INVEST EXISTING BALANCE
========================= */
app.post("/invest-existing-balance", (req, res) => {
  const { email, representative } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);
  if (!user) return res.json({ success: false, message: "User not found" });

  const balance = Number(user.balance || 0);
  if (balance < 200) {
    return res.json({ success: false, message: "Minimum investment is $200" });
  }

  // LOOPHOLE GUARD: block if this balance came from a completed cycle's profit.
  // Only admin-funded balance can be invested directly here — profit must go through Reinvest.
  if (!user.balanceIsAdminFunded) {
    return res.json({
      success: false,
      message: "This balance came from a completed investment cycle. Please use Reinvest to continue growing it."
    });
  }

  if (!representative) {
    return res.json({ success: false, message: "Please select a representative." });
  }

  // Determine plan tier from balance amount — same logic as /approve-deposit
  let plan, profitPercent, duration;
  if (balance >= 45000)      { plan = "Rapid Return";     profitPercent = 100.15; duration = 35; }
  else if (balance >= 15000) { plan = "Capital Boost";    profitPercent = 95;     duration = 22; }
  else if (balance >= 8000)  { plan = "Contact Manager";  profitPercent = 85;     duration = 14; }
  else if (balance >= 3000)  { plan = "Premium Plan";     profitPercent = 55;     duration = 5;  }
  else if (balance >= 1000)  { plan = "Standard Plan";    profitPercent = 45;     duration = 2;  }
  else                       { plan = "Starter Plan";     profitPercent = 25;     duration = 1;  }

  user.investmentAmount    = balance;
  user.investmentStart     = Date.now();
  user.plan                = plan;
  user.profitPercent       = profitPercent;
  user.investmentDuration  = duration;
  user.representative      = representative;
  user.reinvestmentCount   = 0;
  user.cycleCompleted      = false;
  user.balanceIsAdminFunded = false; // consumed — locked into investment now

  const votes = Math.floor(balance / 500);
  user.totalVotes = Number(user.totalVotes || 0) + votes;

  const reps = getRepresentatives();
  const rep  = reps.find(r => r.name === representative);
  if (rep) {
    rep.votes = Number(rep.votes || 0) + votes;
    if (!user.representatives) user.representatives = [];
    const entry = user.representatives.find(r => r.name === representative);
    if (entry) { entry.votes += votes; }
    else { user.representatives.push({ name: representative, votes }); }
    user.totalVotes = user.representatives.reduce((s, r) => s + r.votes, 0);
    saveRepresentatives(reps);
  }

  if (balance >= 50000)      user.rank = "Elite Investor";
  else if (balance >= 15000) user.rank = "VIP Investor";
  else if (balance >= 5000)  user.rank = "Premium Investor";
  else if (balance >= 1000)  user.rank = "Standard Investor";
  else                       user.rank = "Starter Investor";

  user.transactions.unshift({
    type:   "BALANCE INVESTED",
    amount: balance,
    plan:   plan,
    date:   new Date()
  });

  saveUsers(users);
  res.json({ success: true, message: "Investment activated", plan, user });
});

app.post("/admin-ban-user",(req,res)=>{
  const { email } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if(!user) return res.json({ success:false, message:"User not found" });

  user.status = user.status === "BANNED" ? "ACTIVE" : "BANNED";

  saveUsers(users);
  res.json({ success:true, status:user.status });
});

/* =========================
   GET SECURITY QUESTION
========================= */

app.post("/get-security-question", (req, res) => {
  const { email } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({
      success: false,
      message: "No account found with that email address."
    });
  }

  if (!user.secretQuestion) {
    return res.json({
      success: false,
      message: "This account has no security question set. Please contact support."
    });
  }

  const questionLabels = {
    pet:    "What was the name of your first pet?",
    mother: "What is your mother's maiden name?",
    city:   "What city were you born in?",
    school: "What was the name of your primary school?",
    food:   "What is your favourite food?",
    car:    "What was your first car?",
    friend: "What is the name of your childhood best friend?"
  };

  res.json({
    success:  true,
    question: questionLabels[user.secretQuestion] || user.secretQuestion
  });
});

/* =========================
   VERIFY SECURITY ANSWER
========================= */

app.post("/verify-security-answer", (req, res) => {
  const { email, answer } = req.body;
  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "Account not found." });
  }

  const submitted = (answer || "").trim().toLowerCase();
  const stored    = (user.secretAnswer || "").trim().toLowerCase();

  if (submitted !== stored) {
    return res.json({
      success: false,
      message: "Incorrect answer. Please try again."
    });
  }

  res.json({ success: true });
});

/* =========================
   RESET PASSWORD
========================= */

app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return res.json({
      success: false,
      message: "Password must be at least 6 characters."
    });
  }

  const users = getUsers();
  const user  = users.find(u => u.email === email);

  if (!user) {
    return res.json({ success: false, message: "Account not found." });
  }

  user.password = newPassword;
  saveUsers(users);

  res.json({ success: true, message: "Password reset successfully." });
});

/* ========================= */
/* COUNTER ENGINE             */
/* ========================= */

const COUNTER_INTERVAL_MS = 1000;
const tickAccumulators = {};

const repCountryMap = {
  "Robert Rachel":  ["Tunisia","Algeria","Norway","Germany","France"],
  "Michael Scott":  ["Tunisia","UK","Italy","Spain","Belgium"],
  "Lincoln Hayes":  ["Tunisia","Brazil","Japan","Singapore","Dubai"],
  "Amber Agrawal":  ["Tunisia","Australia","Malaysia","Thailand","Indonesia"]
};

function getCounters() {
  const s = getSiteSettings();
  if (!s.counters) s.counters = {};
  return s.counters;
}

function saveCounters(counters) {
  const s = getSiteSettings();
  s.counters = counters;
  saveSiteSettings(s);
}

setInterval(() => {
  const counters = getCounters();
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

  if (changed) saveCounters(counters);
}, COUNTER_INTERVAL_MS);

app.get("/counter-state", (req, res) => {
  res.json({ counters: getCounters() });
});

app.get("/admin-get-counters", (req, res) => {
  res.json({ counters: getCounters() });
});

app.post("/admin-init-counters", (req, res) => {
  const counters = getCounters();
  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    countries.forEach(country => {
      if (!counters[rep][country]) {
        counters[rep][country] = { current: 0, speed: 1, paused: false };
      }
    });
  });
  saveCounters(counters);
  res.json({ success: true });
});

app.post("/admin-save-counters", (req, res) => {
  const { settings } = req.body;
  const counters = getCounters();

  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    if (settings[rep]) {
      counters[rep].paused = !!settings[rep].paused;
      countries.forEach(country => {
        if (!counters[rep][country]) counters[rep][country] = { current: 0, speed: 1, paused: false };
        if (settings[rep][country]) {
          counters[rep][country].speed  = settings[rep][country].speed  ?? 1;
          counters[rep][country].paused = !!settings[rep][country].paused;
        }
      });
    }
  });

  saveCounters(counters);
  Object.keys(tickAccumulators).forEach(k => tickAccumulators[k] = 0);
  res.json({ success: true });
});

app.post("/admin-reset-counters", (req, res) => {
  const counters = getCounters();
  Object.entries(repCountryMap).forEach(([rep, countries]) => {
    if (!counters[rep]) counters[rep] = { paused: false };
    countries.forEach(country => {
      if (!counters[rep][country]) counters[rep][country] = { current: 0, speed: 1, paused: false };
      counters[rep][country].current = 0;
    });
  });
  Object.keys(tickAccumulators).forEach(k => tickAccumulators[k] = 0);
  saveCounters(counters);
  res.json({ success: true });
});

/* =========================
   SHIPMENT TRACKING — AUTO ROUTE
========================= */

// Fixed warehouse origin + realistic regional hub cities for routing
const SHIPMENT_ORIGIN = { city: "Dubai, UAE", lat: 25.2048, lng: 55.2708 };

const REGIONAL_HUBS = {
  // Europe
  europe: [
    { city: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
    { city: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821 }
  ],
  // North America
  northAmerica: [
    { city: "London, UK", lat: 51.5074, lng: -0.1278 },
    { city: "New York, USA", lat: 40.7128, lng: -74.0060 }
  ],
  // Africa
  africa: [
    { city: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
    { city: "Casablanca, Morocco", lat: 33.5731, lng: -7.5898 }
  ],
  // Asia
  asia: [
    { city: "Singapore", lat: 1.3521, lng: 103.8198 },
    { city: "Hong Kong", lat: 22.3193, lng: 114.1694 }
  ],
  // Oceania
  oceania: [
    { city: "Singapore", lat: 1.3521, lng: 103.8198 },
    { city: "Sydney, Australia", lat: -33.8688, lng: 151.2093 }
  ],
  // South America
  southAmerica: [
    { city: "Madrid, Spain", lat: 40.4168, lng: -3.7038 },
    { city: "São Paulo, Brazil", lat: -23.5505, lng: -46.6333 }
  ],
  default: [
    { city: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
    { city: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821 }
  ]
};

// Rough region detection by destination longitude/latitude
function detectRegion(lat, lng) {
  if (lat > 35 && lng > -15 && lng < 45) return "europe";
  if (lng < -30 && lat > 5) return "northAmerica";
  if (lat < 35 && lat > -35 && lng > -20 && lng < 55) return "africa";
  if (lng > 60 && lng < 150 && lat > -10) return "asia";
  if (lat < -10 && lng > 100) return "oceania";
  if (lat < 15 && lng < -30) return "southAmerica";
  return "default";
}

// Builds a realistic multi-hop route from origin to destination,
// distributing totalDays across legs (longer legs get more time)
function buildAutoRoute(destination, totalDays) {
  const region = detectRegion(destination.lat, destination.lng);
  const hubs = REGIONAL_HUBS[region] || REGIONAL_HUBS.default;

  const routeCities = [SHIPMENT_ORIGIN, ...hubs, destination];

  // Compute straight-line distance per leg (rough) to weight day distribution
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

  // Adjust rounding so total matches exactly
  let sum = stops.reduce((s, st) => s + st.durationDays, 0);
  let diff = totalDays - sum;
  if (diff !== 0 && stops.length > 1) {
    stops[stops.length - 1].durationDays = Math.max(1, stops[stops.length - 1].durationDays + diff);
  }

  return stops;
}

function computeShipmentProgress(shipment) {
  const stops = shipment.stops || [];
  if (stops.length === 0) {
    return { currentStopIndex: 0, status: "pending", progressIntoLeg: 0 };
  }

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
      if (stops.length === 1) {
        return { currentStopIndex: 0, status: "delivered", progressIntoLeg: 1 };
      }
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

    if (i === stops.length - 1) {
      return { currentStopIndex: i, status: "delivered", progressIntoLeg: 1 };
    }
  }

  return { currentStopIndex: stops.length - 1, status: "delivered", progressIntoLeg: 1 };
}

// Called automatically when user submits their shipping address —
// admin just needs to set totalDays afterward (default 14 if not set yet)
async function autoCreateShipmentRoute(email, cardType, address, totalDays = 14) {
  const destQuery = `${address.city}, ${address.country}`;
  const geo = await geocodeCity(destQuery);

  const destination = { city: destQuery, lat: geo.lat, lng: geo.lng };
  const stops = buildAutoRoute(destination, totalDays);

  const shipments = getShipments();
  let shipment = shipments.find(s => s.email === email && s.cardType === cardType);

  if (!shipment) {
    shipment = { id: Date.now(), email, cardType };
    shipments.push(shipment);
  }

  shipment.address = address;
  shipment.totalDays = totalDays;
  shipment.stops = stops;
  shipment.startedAt = Date.now();
  shipment.paused = false;
  shipment.pausedAtStopIndex = null;
  shipment.pausedProgress = null;
  shipment.createdOrUpdatedAt = new Date();

  saveShipments(shipments);
  return shipment;
}

app.post("/admin-set-shipment-days", async (req, res) => {
  const { email, cardType, totalDays } = req.body;
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) return res.json({ success: false, message: "User not found." });

  const addrField = cardType === "gold" ? "goldCardShipping" : "blackCardShipping";
  const address = user[addrField];

  if (!address) {
    return res.json({ success: false, message: "No address on file yet for this user." });
  }

  try {
    const shipment = await autoCreateShipmentRoute(email, cardType, address, Number(totalDays));
    res.json({ success: true, message: "Route generated.", shipment });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

app.post("/admin-pause-shipment", (req, res) => {
  const { email, cardType } = req.body;
  const shipments = getShipments();
  const shipment = shipments.find(s => s.email === email && s.cardType === cardType);

  if (!shipment) return res.json({ success: false, message: "Shipment not found." });

  const progress = computeShipmentProgress(shipment);

  shipment.paused = true;
  shipment.pausedAtStopIndex = progress.currentStopIndex;
  shipment.pausedProgress = progress.progressIntoLeg;

  saveShipments(shipments);
  res.json({ success: true, message: "Shipment paused." });
});

app.post("/admin-resume-shipment", (req, res) => {
  const { email, cardType } = req.body;
  const shipments = getShipments();
  const shipment = shipments.find(s => s.email === email && s.cardType === cardType);

  if (!shipment) return res.json({ success: false, message: "Shipment not found." });

  const stops = shipment.stops || [];
  let elapsedBeforePause = 0;

  for (let i = 1; i < (shipment.pausedAtStopIndex ?? 0); i++) {
    elapsedBeforePause += (stops[i].durationDays || 0) * 86400000;
  }

  const currentLegMs = stops[shipment.pausedAtStopIndex]
    ? (stops[shipment.pausedAtStopIndex].durationDays || 0) * 86400000
    : 0;

  elapsedBeforePause += currentLegMs * (shipment.pausedProgress || 0);

  shipment.startedAt = Date.now() - elapsedBeforePause;
  shipment.paused = false;
  shipment.pausedAtStopIndex = null;
  shipment.pausedProgress = null;

  saveShipments(shipments);
  res.json({ success: true, message: "Shipment resumed." });
});

app.get("/admin-shipments", (req, res) => {
  const shipments = getShipments();
  const withProgress = shipments.map(s => ({
    ...s,
    progress: computeShipmentProgress(s)
  }));
  res.json({ shipments: withProgress });
});

app.post("/get-shipment-route", (req, res) => {
  const { email, cardType } = req.body;
  const shipments = getShipments();
  const shipment = shipments.find(s => s.email === email && s.cardType === cardType);

  if (!shipment || !shipment.stops || shipment.stops.length === 0) {
    return res.json({ success: true, route: null });
  }

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

app.listen(process.env.PORT || 3000,()=>{

console.log(
"Server running on port 3000"
);

});

