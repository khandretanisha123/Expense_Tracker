
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DataBaseTest {
    public static void main(String[] args) {

        String url = "jdbc:mysql://localhost:3306/expense_tracker";
        String username = "root";
        String password = "En24169412@";

        try (Connection con =
                DriverManager.getConnection(url, username, password)) {

            System.out.println("MySQL connected successfully!");
            System.out.println("Database: expense_tracker");

        } catch (SQLException e) {
            System.out.println("Connection failed!");
            System.out.println(e.getMessage());
        }
    }
}
