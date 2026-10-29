

import java.time.LocalDate;

public class Transaction {
    String type;
    String category;
    double amount;
    LocalDate date;

    // For creating a new transaction
    public Transaction(String type, String category, double amount) {
        this.type = type;
        this.category = category;
        this.amount = amount;
        this.date = LocalDate.now();
    }

    // For loading a saved transaction
    public Transaction(String type, String category,
                       double amount, LocalDate date) {
        this.type = type;
        this.category = category;
        this.amount = amount;
        this.date = date;
    }

    public void display() {
        System.out.println("Type: " + type);
        System.out.println("Category: " + category);
        System.out.println("Amount: Rs. " + amount);
        System.out.println("Date: " + date);
    }
}

