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
const JWT_SECRET2 = process.env.JWT_SECRET2
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!JWT_SECRET || !JWT_SECRET2 || !MONGO_URI) {
  console.error("Missing required environment variables: JWT_SECRET, JWT_SECRET2, MONGO_URI");
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

const User = mongoose.model("User", new mongoose.Schema({
  id: mongoose.Schema.Types.ObjectId,
  email: String,
  password: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}));

const LoyaltyCard = mongoose.model("LoyaltyCard", new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    brand: { type: String, required: false },
    code: { type: String, required: true },
    codeType: { type: String, enum: ['barcode', 'qrcode'], default: 'barcode' },
    notes: { type: String, required: false },
    lastUsed: { type: Date, required: false },
    color: { type: String, default: '#4F6BFF' },
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
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

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
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

const generateResetToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET2, { expiresIn: "1h" });
};

//Forgot password route
app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ success: true, message: "If that email exists, a reset link has been sent." });
    
    const resetToken = generateResetToken(user._id);
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    try {
      await mailer.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: "Password Reset",
        text: `Click the link to reset your TomasCards password: ${resetLink}`,
      });
      res.json({ success: true });
    } catch (err) {
      console.warn("Email failed:", err);
      res.status(500).json({ error: "Failed to send email" });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset password route
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET2);
    const userId = decoded.id;
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword, updatedAt: new Date() },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(400).json({ error: "Invalid or expired token" });
  }
});

// Login user and return token
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const token = generateToken(user._id);
    res.json({ token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Profile route with rolling token refresh
app.get("/me", authMiddleware, async (req, res) => {
  try {
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
    if (!user) return res.status(404).json({ error: "User not found" });
    
    res.json({ email: user.email, token: newToken });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Loyalty cards routes
app.post("/cards", authMiddleware, async (req, res) => {
  try {
    const { name, brand, code, codeType, color, notes } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }
    
    const card = await LoyaltyCard.create({
      userId: req.userId,
      name,
      brand,
      code,
      codeType: codeType || 'barcode',
      color: color || '#4F6BFF',
      notes,
    });
    
    res.json(card);
  } catch (error) {
    console.error("Create card error:", error);
    res.status(500).json({ error: "Failed to create card" });
  }
});

// update card
app.put("/cards/:id", authMiddleware, async (req, res) => {
  try {
    const { name, brand, code, codeType, color, notes } = req.body;
    
    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({ error: "Name and code are required" });
    }
    
    const card = await LoyaltyCard.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        name, 
        brand, 
        code, 
        codeType: codeType || 'barcode',
        color: color || '#4F6BFF', 
        notes,
        updatedAt: new Date() 
      },
      { new: true }
    );
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    res.json(card);
  } catch (error) {
    console.error("Update card error:", error);
    res.status(500).json({ error: "Failed to update card" });
  }
});

app.get("/cards", authMiddleware, async (req, res) => {
  try {
    console.log("Fetching cards for user:", req.userId);
    
    if (!req.userId) {
      return res.sendStatus(401);
    }
    
    // Fetch all loyalty cards for the authenticated user
    const cards = await LoyaltyCard.find({ userId: req.userId }).sort({ createdAt: -1 });
    console.log(`Found ${cards.length} cards for user ${req.userId}`);
    
    res.json(cards);
  } catch (error) {
    console.error("Get cards error:", error);
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

app.delete("/cards/:id", authMiddleware, async (req, res) => {
  try {
    const result = await LoyaltyCard.deleteOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Delete card error:", error);
    res.status(500).json({ error: "Failed to delete card" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));