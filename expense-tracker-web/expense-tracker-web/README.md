# Expense Tracker Web Dashboard

A beginner-friendly web app connected to your existing MySQL database. It displays total income, total expenses, current balance, category-wise expenses, and recent transactions. You can add and delete transactions.

## Requirements

Install these first:
1. **Node.js LTS** from https://nodejs.org/
2. **MySQL Server** (your existing installation)
3. **Visual Studio Code** (recommended)
4. Your existing MySQL database named `expense_tracker`

## Step 1 — Open the project

Extract the ZIP file. In Visual Studio Code, choose **File → Open Folder** and select the `expense-tracker-web` folder.

## Step 2 — Configure database credentials

1. In the project folder, copy `.env.example` and rename the copy to `.env`.
2. Open `.env`.
3. Set `DB_USER` and `DB_PASSWORD` to the MySQL account you use in MySQL Workbench.
4. Keep `DB_NAME=expense_tracker` unless your database has a different name.

Example:
```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=expense_tracker
```

Do not share your `.env` file or put it in a public repository.

## Step 3 — Check the existing table

In MySQL Workbench, run:
```sql
USE expense_tracker;
DESCRIBE `transaction`;
SELECT * FROM `transaction`;
```

This project expects these columns:
- `id`
- `type` (values `Income` or `Expense`)
- `category`
- `amount`
- `transaction_date`

The app does not add a balance column. Balance is calculated from income minus expenses.

If your table has different column names, adjust the code in `server.js` to match your schema before starting.

## Step 4 — Install dependencies

In VS Code, open **Terminal → New Terminal**. Make sure the terminal is inside the `expense-tracker-web` project folder, then run:
```
npm install
```

## Step 5 — Start the web server

Run:
```
npm start
```

A successful start prints:
```
Expense Tracker running at http://localhost:3000
```

Keep this terminal open while you use the application.

## Step 6 — Open the dashboard

Open your browser and visit:
http://localhost:3000

The dashboard loads its figures from MySQL. Add a test transaction through the form and check MySQL Workbench to confirm it is stored in the `transaction` table.

## Common problems

### Access denied for user
Check `DB_USER` and `DB_PASSWORD` in `.env`. Use the same MySQL account credentials that work in Workbench.

### Cannot connect to MySQL
Make sure MySQL Server is running and `DB_HOST=localhost`, `DB_PORT=3306` match your setup.

### Table or column error
Run `DESCRIBE transaction;` in MySQL Workbench. The expected columns are listed above. The table name is wrapped in backticks in SQL because `transaction` can conflict with SQL keywords.

### `npm` is not recognized
Install Node.js LTS, close and reopen VS Code, and run `node -v` and `npm -v` in the terminal.

### Port already in use
Change `PORT=3000` in `.env` to `PORT=3001`, restart the server, and open http://localhost:3001.

## API endpoints

- `GET /api/dashboard` — summary, category report, and latest transactions
- `POST /api/transactions` — create a transaction
- `DELETE /api/transactions/:id` — delete a transaction

## Safety notes

This is a local learning project, not a production-ready public finance application. Do not expose it directly to the internet. Use a dedicated MySQL user with only the permissions the app needs for a real deployment.
