require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

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

async function checkDatabase() {
  // Uses the existing table if it is already present.
  // Creates a compatible table only if no transaction table exists.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`transaction\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      \`type\` ENUM('Income', 'Expense') NOT NULL,
      category VARCHAR(100) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      transaction_date DATE NOT NULL
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

app.get("/api/dashboard", async (_req, res) => {
  try {
    const [summaryRows] = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN \`type\` = 'Income' THEN amount ELSE 0 END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN \`type\` = 'Expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
        COALESCE(SUM(CASE
          WHEN \`type\` = 'Income' THEN amount
          WHEN \`type\` = 'Expense' THEN -amount
          ELSE 0
        END), 0) AS balance
      FROM \`transaction\`
    `);

    const [categoryRows] = await pool.query(`
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM \`transaction\`
      WHERE \`type\` = 'Expense'
      GROUP BY category
      ORDER BY total DESC
    `);

    const [recentRows] = await pool.query(`
      SELECT id, \`type\`, category, amount, DATE_FORMAT(transaction_date, '%Y-%m-%d') AS transaction_date
      FROM \`transaction\`
      ORDER BY transaction_date DESC, id DESC
      LIMIT 100
    `);

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

  try {
    const { type, category, amount, transaction_date } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO `transaction` (`type`, category, amount, transaction_date) VALUES (?, ?, ?, ?)",
      [type, category.trim(), Number(amount), transaction_date]
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

  try {
    const [result] = await pool.execute("DELETE FROM `transaction` WHERE id = ?", [id]);
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
    app.listen(PORT, () => {
      console.log(`Expense Tracker running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("\nCould not start Expense Tracker:");
    console.error(error.message);
    console.error("\nCheck your .env file, MySQL service, and transaction table.");
    process.exit(1);
  }
}

start();
