require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "expense_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

// Password Hashing and Verification via Native Crypto
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(hash, "hex"));
}

function validateUserId(id) {
  const cleanId = String(id || "").trim();
  if (!cleanId) {
    return "User ID is required.";
  }
  if (cleanId.length < 3 || cleanId.length > 50) {
    return "User ID must be between 3 and 50 characters.";
  }
  if (!/^[A-Za-z0-9_.-]+$/.test(cleanId)) {
    return "User ID can only contain letters, numbers, dots, hyphens, and underscores.";
  }
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return "Password must contain at least one special symbol (e.g. ! @ # $ % & *).";
  }
  return null;
}

async function checkDatabase() {
  // 1. Transaction Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`transaction\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`type\` ENUM('Income', 'Expense') NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      transaction_date DATE NOT NULL,
      user_id VARCHAR(50) NULL
    )
  `);

  const [columns] = await pool.query("SHOW COLUMNS FROM `transaction`");
  const names = new Set(columns.map((column) => column.Field));
  const required = ["id", "type", "category", "amount", "transaction_date"];
  const missing = required.filter((name) => !names.has(name));

  if (missing.length) {
    throw new Error(
      "Your transaction table is missing these expected columns: " +
      missing.join(", ") +
      ". Please compare it with README.md before continuing."
    );
  }

  // Ensure user_id column exists
  if (!names.has("user_id")) {
    await pool.query("ALTER TABLE `transaction` ADD COLUMN `user_id` VARCHAR(50) NULL");
  }

  // 2. Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`users\` (
      id VARCHAR(50) NOT NULL PRIMARY KEY,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function validTransaction(body) {
  const type = body.type;
  const category = String(body.category || "").trim();
  const amount = Number(body.amount);
  const date = String(body.transaction_date || "");

  if (!["Income", "Expense"].includes(type)) {
    return "Type must be Income or Expense.";
  }
  if (!category || category.length > 100) {
    return "Category is required and must be 100 characters or fewer.";
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999) {
    return "Amount must be a positive number.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
    return "Please provide a valid date in YYYY-MM-DD format.";
  }
  return null;
}

// ==================== AUTHENTICATION ROUTES ====================

// Register new user (ID must be unique, password complexity enforced)
app.post("/api/auth/register", async (req, res) => {
  const { id, password } = req.body || {};

  const idError = validateUserId(id);
  if (idError) {
    return res.status(400).json({ error: idError });
  }

  const passError = validatePassword(password);
  if (passError) {
    return res.status(400).json({ error: passError });
  }

  const cleanId = String(id).trim();

  try {
    // Check if User ID already exists
    const [existing] = await pool.query("SELECT id FROM `users` WHERE id = ?", [cleanId]);
    if (existing.length > 0) {
      return res.status(409).json({
        error: "This User ID is already taken. Please choose a different ID or sign in."
      });
    }

    const hashed = hashPassword(password);
    await pool.query("INSERT INTO `users` (id, password_hash) VALUES (?, ?)", [cleanId, hashed]);

    res.status(201).json({
      message: "Registration successful! Welcome aboard.",
      user: { id: cleanId }
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// Login existing user
app.post("/api/auth/login", async (req, res) => {
  const { id, password } = req.body || {};
  const cleanId = String(id || "").trim();

  if (!cleanId || !password) {
    return res.status(400).json({ error: "Please enter both User ID and password." });
  }

  try {
    const [users] = await pool.query("SELECT id, password_hash FROM `users` WHERE id = ?", [cleanId]);
    if (users.length === 0) {
      return res.status(401).json({ error: "Invalid User ID or password. Please verify and try again." });
    }

    const user = users[0];
    const passwordMatch = verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid User ID or password. Please verify and try again." });
    }

    res.json({
      message: "Login successful.",
      user: { id: user.id }
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Failed to log in. Please try again." });
  }
});

// Verify active user session
app.get("/api/auth/verify", async (req, res) => {
  const userId = String(req.headers["x-user-id"] || req.query.user_id || "").trim();
  if (!userId) {
    return res.status(401).json({ valid: false, error: "No user session provided." });
  }

  try {
    const [users] = await pool.query("SELECT id FROM `users` WHERE id = ?", [userId]);
    if (users.length === 0) {
      return res.status(401).json({ valid: false, error: "User session expired or invalid." });
    }
    res.json({ valid: true, user: { id: users[0].id } });
  } catch (error) {
    res.status(500).json({ valid: false, error: "Verification failed." });
  }
});

// ==================== DASHBOARD & TRANSACTIONS ====================

app.get("/api/dashboard", async (req, res) => {
  const userId = String(req.headers["x-user-id"] || req.query.user_id || "").trim();

  try {
    let summarySql = `
      SELECT
        COALESCE(SUM(CASE WHEN \`type\` = 'Income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN \`type\` = 'Expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
        COALESCE(SUM(CASE
          WHEN \`type\` = 'Income' THEN amount
          WHEN \`type\` = 'Expense' THEN -amount
          ELSE 0
        END), 0) AS balance
      FROM \`transaction\`
    `;

    let categorySql = `
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM \`transaction\`
      WHERE \`type\` = 'Expense'
    `;

    let recentSql = `
      SELECT id, \`type\`, category, amount, DATE_FORMAT(transaction_date, '%Y-%m-%d') AS transaction_date
      FROM \`transaction\`
    `;

    let params = [];
    if (userId) {
      summarySql += " WHERE user_id = ?";
      categorySql += " AND user_id = ?";
      recentSql += " WHERE user_id = ?";
      params = [userId];
    }

    categorySql += " GROUP BY category ORDER BY total DESC";
    recentSql += " ORDER BY transaction_date DESC, id DESC LIMIT 1000";

    const [summaryRows] = await pool.query(summarySql, params);
    const [categoryRows] = await pool.query(categorySql, params);
    const [recentRows] = await pool.query(recentSql, params);

    res.json({
      summary: summaryRows[0],
      categories: categoryRows,
      transactions: recentRows
    });
  } catch (error) {
    console.error("Dashboard query failed:", error.message);
    res.status(500).json({
      error: "Could not load dashboard data. Check your database settings and table columns."
    });
  }
});

app.post("/api/transactions", async (req, res) => {
  const validationError = validTransaction(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const userId = String(req.headers["x-user-id"] || req.body.user_id || "").trim() || null;

  try {
    const { type, category, amount, transaction_date } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO `transaction` (`type`, category, amount, transaction_date, user_id) VALUES (?, ?, ?, ?, ?)",
      [type, category.trim(), Number(amount), transaction_date, userId]
    );
    res.status(201).json({ message: "Transaction added.", id: result.insertId });
  } catch (error) {
    console.error("Insert failed:", error.message);
    res.status(500).json({ error: "Could not save transaction. Check the database table structure." });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid transaction ID." });
  }

  const userId = String(req.headers["x-user-id"] || req.query.user_id || "").trim() || null;

  try {
    let delSql = "DELETE FROM `transaction` WHERE id = ?";
    let delParams = [id];
    if (userId) {
      delSql += " AND (user_id = ? OR user_id IS NULL)";
      delParams.push(userId);
    }

    const [result] = await pool.execute(delSql, delParams);
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Transaction not found." });
    }
    res.json({ message: "Transaction deleted." });
  } catch (error) {
    console.error("Delete failed:", error.message);
    res.status(500).json({ error: "Could not delete transaction." });
  }
});

async function start() {
  try {
    await checkDatabase();
    console.log("Connected to MySQL database successfully.");
  } catch (error) {
    console.warn("\n[Database Warning]: Could not connect to MySQL database on startup:");
    console.warn(error.message);
    console.warn("If deploying to the cloud (e.g. Render), please configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in your Environment Variables.\n");
  }

  app.listen(PORT, () => {
    console.log(`Expense Tracker running at http://localhost:${PORT}`);
  });
}

start();

module.exports = app;
