require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI);

const User = mongoose.model("User", new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  email: String,
  password: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}));

const LoyaltyCard = mongoose.model("LoyaltyCard", new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    brand: { type: String, required: false },
    barcode: String,
    code: String,
    codeType: { type: String, enum: ['barcode', 'qrcode'] },
    notes: { type: String, required: false },
    lastUsed: { type: Date, required: false },
    color: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}));

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "30d" });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.sendStatus(401);
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.sendStatus(403);
  }
}

// Register user + send welcome email
app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashed });

  try {
    await mailer.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Welcome!",
      text: "Thanks for registering!",
    });
  } catch (err) {
    console.warn("Email failed:", err);
  }

  res.json({ success: true });
});

// Login user and return token
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = generateToken(user._id);
  res.json({ token });
});

// Profile route with rolling token refresh
app.get("/me", authMiddleware, async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.sendStatus(401);
  // verify token
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.sendStatus(403);
  }  
  // get user id from jwt payload
  const userID = jwt.decode(token).id;
  const newToken = generateToken(userID);
  // retrieve user's email from database
  const user = await User.findById(userID).select("email");
  res.json({ email: user?.email || null, token: newToken });
});

// Loyalty cards routes
app.post("/cards", authMiddleware, async (req, res) => {
  const { title, barcode, color } = req.body;
  const card = await LoyaltyCard.create({
    userId: req.userId,
    title,
    barcode,
    color,
  });
  res.json(card);
});

// update card
app.put("/cards/:id", authMiddleware, async (req, res) => {
  const { title, barcode, color } = req.body;
  const card = await LoyaltyCard.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { title, barcode, color, updatedAt: new Date() },
    { new: true }
  );
  res.json(card);
});

app.get("/cards", authMiddleware, async (req, res) => {
  const cards = await LoyaltyCard.find({ userId: req.userId });
  res.json(cards);
});

app.delete("/cards/:id", authMiddleware, async (req, res) => {
  await LoyaltyCard.deleteOne({ _id: req.params.id, userId: req.userId });
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
