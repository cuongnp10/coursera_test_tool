# ⚡ Coursera Automation Suite & AI Assistant

Extension hỗ trợ học tập và tự động hóa toàn diện trên Coursera: Bỏ qua đếm ngược hẹn giờ (Timer Bypass), tự động click hoàn thành bài đọc, tự động xem video bài giảng theo nhóm tab, và tích hợp AI giải đề / trắc nghiệm với đa nhà cung cấp.

---

## 🚀 Các Tính Năng Chính

1. **Nút Nổi (Floating Widget) Trên Trang Web**:
   - Biểu tượng nút tròn nổi ⚡ ở góc phải màn hình Coursera, có thể kéo thả di chuyển tùy ý.
   - Bấm vào để bung mở ngay bảng điều khiển dạng kính mờ (Glassmorphism) trên trang mà không cần với lên thanh công cụ Chrome.
2. **Auto-Fill Practice (AI) Tự Động Hoàn Toàn**:
   - Tự động trích xuất ngữ cảnh (`Activity Context`) và đề bài trắc nghiệm / tự luận của Coursera.
   - Gọi AI (Gemini / OpenAI / DeepSeek) để tạo câu trả lời học thuật chuyên sâu bằng 100% Tiếng Anh chuẩn mực.
   - Tự động điền câu trả lời vào trình soạn thảo Rich Text (Slate.js).
   - Tự động tích chọn xác nhận Coursera Honor Code (`#agreement-checkbox-base`) và tự động bấm **Submit**.
3. **Bypass Timers**: Tự động mở khóa các nút hẹn giờ khóa bài đọc hoặc quiz trên Coursera.
4. **Auto-Complete Readings**: Tự động mở bài đọc, đánh dấu hoàn thành và đóng tab gọn gàng.
5. **Auto-Watch Videos**: Tự động gom video vào nhóm tab riêng, mở phát và chuyển bài tự động.
6. **Cấu hình Đa Nhà Cung Cấp AI (Multi-Provider AI)**:
   - **Google Gemini**: Hỗ trợ `gemini-3.8-flash` (Miễn phí, tốc độ cao).
   - **OpenAI**: Hỗ trợ `gpt-4o-mini`, `gpt-4o`, `o3-mini`.
   - **DeepSeek**: Hỗ trợ `deepseek-chat` (V3), `deepseek-reasoner` (R1).
   - **Custom Base URL**: Hỗ trợ tùy biến endpoint (reverse proxy, server nội bộ hoặc Ollama).
   - **Test Connection Trực Tiếp**: Kiểm tra tính hợp lệ và tốc độ phản hồi của API Key ngay trên giao diện.

---

## 🔑 Hướng Dẫn Cấu Hình API Key

Bạn có thể cấu hình API Key theo 2 cách:

### Cách 1: Cấu hình nhanh trên Popup
1. Bấm vào biểu tượng extension trên thanh công cụ Chrome.
2. Bấm vào biểu tượng bánh răng **⚙️** ở góc phải tiêu đề popup.
3. Chọn nhà cung cấp AI (**Gemini**, **OpenAI**, hoặc **DeepSeek**).
4. Dán API key vào ô và chọn Model mong muốn.
5. Bấm nút **🧪 Test** để kiểm tra kết nối xem key có hoạt động hay không.
6. Bấm **💾 Lưu Key**.

### Cách 2: Cấu hình tại Trang Cài Đặt Chi Tiết (Options Page)
1. Trên Popup, bấm vào liên kết **"Chi tiết ↗"** hoặc chuột phải vào icon Extension trên trình duyệt -> chọn **Tùy chọn (Options)**.
2. Tại đây có tab riêng biệt cho từng nhà cung cấp, hiển thị link lấy API key miễn phí, tùy chỉnh Model và Custom Base URL.
3. Bấm **🧪 Kiểm tra kết nối (Test)** và **💾 Lưu cấu hình**.

---

## 🔒 Bảo Mật
- Toàn bộ API Key được lưu trữ cục bộ trong bộ nhớ an toàn của trình duyệt (`chrome.storage.local`).
- Key **không bao giờ** được gửi về bất kỳ máy chủ trung gian nào. Mọi yêu cầu được gửi trực tiếp tới API endpoint chính thức của nhà cung cấp bạn chọn.
