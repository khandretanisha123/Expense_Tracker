

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Date;
import java.util.ArrayList;
import java.util.Scanner;
import java.time.LocalDate;

public class Main {

    static ArrayList<Transaction> transactions = new ArrayList<>();
    static Scanner sc = new Scanner(System.in);

    private static final String DB_URL =
        "jdbc:mysql://localhost:3306/expense_tracker";
    private static final String DB_USER = "root";
    private static final String DB_PASSWORD =
        "En24169412@";

    public static void main(String[] args) {

        loadTransactions();

        int choice = 0;

        do {
            System.out.println("\n=== PERSONAL EXPENSE TRACKER ===");
            System.out.println("1. Add Income");
            System.out.println("2. Add Expense");
            System.out.println("3. View Transactions");
            System.out.println("4. View Financial Summary");
            System.out.println("5. Exit");
            System.out.print("Enter your choice: ");

            if (!sc.hasNextInt()) {
                System.out.println("Please enter a number from 1 to 5.");
                sc.nextLine();
                continue;
            }

            choice = sc.nextInt();
            sc.nextLine();

            switch (choice) {
                case 1:
                    addTransaction("Income");
                    break;
                case 2:
                    addTransaction("Expense");
                    break;
                case 3:
                    viewTransactions();
                    break;
                case 4:
                    showSummary();
                    break;
                case 5:
                    System.out.println("Thank you for using the app!");
                    break;
                default:
                    System.out.println("Invalid choice. Try again.");
            }

        } while (choice != 5);

        sc.close();
    }

    // Connect to MySQL
    static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(
                DB_URL, DB_USER, DB_PASSWORD);
    }

    // Add a transaction to MySQL
    static void addTransaction(String type) {

        System.out.print("Enter category: ");
        String category = sc.nextLine().trim();

        if (category.isEmpty() || category.contains("|")) {
            System.out.println("Invalid category. Try again.");
            return;
        }

        double amount;

        while (true) {
            System.out.print("Enter amount: ");

            if (sc.hasNextDouble()) {
                amount = sc.nextDouble();
                sc.nextLine();

                if (Double.isFinite(amount)
                        && amount > 0
                        && amount <= 9999999999.99) {
                    break;
                }

                System.out.println(
                        "Enter an amount greater than zero "
                        + "with at most 2 decimal places.");
            } else {
                System.out.println("Please enter a valid number.");
                sc.nextLine();
            }
        }

        Transaction t = new Transaction(type, category, amount);

        String sql = "INSERT INTO `transaction` "
                + "(type, category, amount, transaction_date) "
                + "VALUES (?, ?, ?, ?)";

        try (Connection con = getConnection();
             PreparedStatement ps = con.prepareStatement(sql)) {

            ps.setString(1, t.type);
            ps.setString(2, t.category);
            ps.setDouble(3, t.amount);
            ps.setDate(4, Date.valueOf(t.date));

            int rows = ps.executeUpdate();

            if (rows > 0) {
                transactions.add(t);
                System.out.println(type + " added successfully!");
            }

        } catch (SQLException e) {
            System.out.println("Could not save transaction.");
            System.out.println(e.getMessage());
        }
    }

    // View transactions loaded from MySQL
    static void viewTransactions() {

        if (transactions.isEmpty()) {
            System.out.println("No transactions found.");
            return;
        }

        for (Transaction t : transactions) {
            System.out.println("--------------------");
            t.display();
        }
    }

    // Calculate the financial summary
    static void showSummary() {

        double totalIncome = 0;
        double totalExpenses = 0;

        for (Transaction t : transactions) {
            if ("Income".equals(t.type)) {
                totalIncome += t.amount;
            } else if ("Expense".equals(t.type)) {
                totalExpenses += t.amount;
            }
        }

        System.out.println("\n=== FINANCIAL SUMMARY ===");
        System.out.printf("Total Income: Rs. %.2f%n", totalIncome);
        System.out.printf("Total Expenses: Rs. %.2f%n", totalExpenses);
        System.out.printf("Remaining Balance: Rs. %.2f%n",
                totalIncome - totalExpenses);
    }

    // Load transactions from MySQL at startup
    static void loadTransactions() {

        String sql = "SELECT type, category, amount, transaction_date "
        + "FROM `transaction` ORDER BY id";

        transactions.clear();

        try (Connection con = getConnection();
             PreparedStatement ps = con.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            while (rs.next()) {
                String type = rs.getString("type");
                String category = rs.getString("category");
                double amount = rs.getBigDecimal("amount").doubleValue();
                LocalDate date =
                        rs.getDate("transaction_date").toLocalDate();

                Transaction t =
                        new Transaction(type, category, amount, date);

                transactions.add(t);
            }

            System.out.println("Transactions loaded from MySQL: "
                    + transactions.size());

        } catch (SQLException e) {
            System.out.println("Error loading transactions from MySQL.");
            System.out.println(e.getMessage());
        }
    }
}
