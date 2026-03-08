import java.util.ArrayList;
import java.util.List;

public class filter {
    public static void main(String[] args) {
        // Tạo một danh sách các số nguyên
        List<Integer> numbers = new ArrayList<>();
        numbers.add(1);
        numbers.add(2);
        numbers.add(3);
        numbers.add(4);
        numbers.add(5);
        numbers.add(6);

        // Tạo một list mới để chứa kết quả đã filter
        List<Integer> evenNumbers = new ArrayList<>();

        // Logic Filter cơ bản: Kiểm tra và lọc ra các số chẵn
        for (Integer number : numbers) {
            if (number % 2 == 0) {
                // Nếu số chẵn thì thêm vào list kết quả đã lọt filter
                evenNumbers.add(number);
            }
        }

        // In danh sách ban đầu
        System.out.println("Danh sach ban dau: " + numbers);
        
        // In kết quả đã được filter
        System.out.println("Danh sach so chan sau khi filter: " + evenNumbers);
    }
}
