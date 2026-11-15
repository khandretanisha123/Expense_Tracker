
import java.time.LocalDate;

public class Transaction {
    String type;
    String category;
    double amount;
    LocalDate date;

    // Constructor
    public Transaction(String type, String category, double amount) {
        this.type = type;
        this.category = category;
        this.amount = amount;
        this.date = LocalDate.now();
    }

    // Display transaction details
    public void display() {
        System.out.println("Type: " + type);
        System.out.println("Category: " + category);
        System.out.println("Amount: Rs. " + amount);
        System.out.println("Date: " + date);
    }
}


