# 💰 Expense Tracker — Personal Finance & Expense Management Dashboard

A modern, full-stack personal finance SaaS application built with **Node.js, Express, MySQL, HTML5, CSS3, and JavaScript**. Features secure user authentication, multi-timeframe analytics (Weekly, Monthly, Yearly), interactive charts, and a responsive transaction ledger.

---

## ✨ Features

- **🔐 User Authentication System**:
  - Registration with unique User ID and password validation.
  - Password rules: Minimum 8 characters, uppercase, lowercase, number, and special symbol.
  - Live interactive password checklist with real-time checkmarks.
  - Salted PBKDF2 hashing using Node.js native `crypto` module.
  - Private, user-isolated expense ledgers.

- **📊 Comprehensive Financial Overview**:
  - Live summary cards: Total Income, Total Expenses, Net Balance, and Total Transactions.
  - Animated counting numbers and Indian Rupee (`₹`) number formatting.
  - Timeframe filter tabs: **All Time**, **This Week**, **This Month**, and **This Year**.

- **🗓️ Weekly, Monthly & Yearly Records**:
  - Side-by-side snapshot cards showing current Week, Month, and Year performance.
  - Aggregated periodic ledger under **Reports & Analytics**.

- **📈 Visual Analytics & Charts (Chart.js)**:
  - Cash flow bar chart with grouping toggles: **Daily**, **Weekly**, **Monthly**, and **Yearly**.
  - Interactive category expense breakdown doughnut chart.
  - Income vs Expense distribution chart.

- **📑 Transaction Ledger**:
  - Live instant search by category, amount, or date.
  - Type filters (`All`, `Income`, `Expense`), category filter dropdown, and timeframe filter.
  - Client-side pagination and sorting (newest, oldest, highest amount, lowest amount).
  - Modal form for recording transactions with category chips and delete confirmation dialogs.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL (`mysql2/promise`)
- **Frontend**: Semantic HTML5, Custom CSS3 Design System, Vanilla JavaScript (ES6+)
- **Data Visualization**: Chart.js
- **Security**: Node.js `crypto` (Salted PBKDF2 with SHA-512)

---

## 🚀 Getting Started

Follow these steps to run the project on your local machine:

### 1. Prerequisites
- **Node.js LTS** (v18 or higher) installed from [nodejs.org](https://nodejs.org/)
- **MySQL Server** (and MySQL Workbench) installed and running locally

---

### 2. Database Setup
1. Open **MySQL Workbench** (or MySQL CLI).
2. Open and run the included [`schema.sql`](schema.sql) file:
   ```sql
   CREATE DATABASE IF NOT EXISTS `expense_tracker`;
   USE `expense_tracker`;

   CREATE TABLE IF NOT EXISTS `users` (
     `id` VARCHAR(50) NOT NULL PRIMARY KEY,
     `password_hash` VARCHAR(255) NOT NULL,
     `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE TABLE IF NOT EXISTS `transaction` (
     `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     `type` ENUM('Income', 'Expense') NOT NULL,
     `category` VARCHAR(100) NOT NULL,
     `amount` DECIMAL(12,2) NOT NULL,
     `transaction_date` DATE NOT NULL,
     `user_id` VARCHAR(50) NULL
   );
   ```

---

### 3. Configure Environment Variables
1. In the project root directory, locate or create a `.env` file (you can copy `.env.example`):
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=expense_tracker
   ```
2. Replace `your_mysql_password` with your actual local MySQL password.

---

### 4. Install Dependencies & Start Server

In your terminal / command prompt inside the project folder:

```bash
# Install dependencies
npm install

# Start the web server
npm start
```

Once started, open your browser and visit:
👉 **http://localhost:3000**

---

## 📁 Project Directory Structure

```text
├── public/
│   ├── index.html       # Application shell, dashboard layout & modals
│   ├── styles.css       # Complete SaaS design system and responsive styles
│   └── app.js           # Frontend logic, charts, filtering, & auth engine
├── server.js            # Express API server, MySQL pool, & auth routes
├── schema.sql           # Database creation & table schema script
├── package.json         # Project metadata and dependencies
├── .env.example         # Example configuration file
└── README.md            # Project documentation and setup instructions
```

---

## 📄 License
This project is open-source and free to use for educational and personal finance management purposes.
