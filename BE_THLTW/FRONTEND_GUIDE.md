# 🚀 Hướng Dẫn Tích Hợp Backend (Dành cho Team Frontend)

Tài liệu này hướng dẫn các bạn Frontend Developer cách khởi chạy toàn bộ hệ thống Backend (bao gồm Database, API Server, và Dữ liệu mẫu) trên máy cá nhân một cách cực kỳ đơn giản bằng Docker, cũng như cách tra cứu API Docs.

---

## 1. Yêu cầu hệ thống (Prerequisites)
Bạn chỉ cần cài đặt duy nhất 1 phần mềm trên máy:
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (Bật sẵn Docker Desktop trước khi chạy lệnh).
- *(Không bắt buộc)* Node.js nếu bạn muốn chạy lệnh qua `npm`.

---

## 2. Cách khởi chạy Backend trong 1 nốt nhạc

Hệ thống đã được đóng gói hoàn chỉnh. Bạn làm theo các bước sau:

**Bước 1:** Clone source code Backend về máy.
**Bước 2:** Copy file cấu hình môi trường:
- Copy file `.env.docker` thành file mới tên là `.env`.
- (Bạn có thể giữ nguyên nội dung mặc định của file này vì nó đã được config sẵn cho Docker).

**Bước 3:** Khởi chạy bằng Docker:
Mở Terminal tại thư mục Backend và chạy lệnh sau:
```bash
docker compose up --build -d
```
*(Hoặc nếu máy có cài Node.js, bạn có thể gõ `npm run docker:up`)*

**Quá trình khởi chạy sẽ tự động làm 3 việc:**
1. Khởi động PostgreSQL database.
2. Nạp cấu trúc bảng và tự động chèn **dữ liệu mẫu (Seed Data)** vào database.
3. Khởi động Node.js Server ở port `5000`.

Khi chạy xong, server backend sẽ hoạt động tại: **`http://localhost:5000/api`**

---

## 3. Tra cứu tài liệu API (Swagger & Postman)

Để làm việc với Backend, bạn có 2 công cụ tùy chọn:

### 🌟 Cách 1: Xem trên Web bằng Swagger UI (Khuyên dùng)
- Truy cập trình duyệt vào: **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**
- Giao diện Swagger cung cấp đầy đủ thông số params, schema body, mô tả lỗi cho tất cả các API.
- Bạn có thể bấm nút **"Try it out"** để gửi request trực tiếp từ trình duyệt!
- Nếu bạn cần dùng file JSON để tự gen TypeScript interfaces (ví dụ dùng `openapi-typescript`), hãy truy cập: `http://localhost:5000/api/docs.json`

### 🌟 Cách 2: Dùng Postman Collection
- Trong thư mục gốc của project có file **`postman_collection.json`**.
- Bạn hãy Import file này vào app Postman.
- File đã được set up tự động điền các biến (như `accessToken`, `sessionId`), chia thành 6 thư mục rõ ràng theo đúng luồng nghiệp vụ thực tế.

---

## 4. Danh sách tài khoản & Dữ liệu mẫu

Để phục vụ quá trình test giao diện, Database đã được tạo sẵn các dữ liệu sau:

### 🧑‍💼 Tài khoản nhân viên
Sử dụng chung **Mật khẩu**: `Password123!`

| Role | Email đăng nhập |
| :--- | :--- |
| **Admin** | `admin@restaurant.com` |
| **Quản lý (Manager)** | `manager@restaurant.com` |
| **Thu ngân (Cashier)** | `cashier@restaurant.com` |
| **Bếp (Kitchen)** | `kitchen@restaurant.com` |
| **Phục vụ (Waiter)** | `waiter@restaurant.com` |

*Cách dùng:* Gọi API `POST /api/auth/login` -> lấy `access_token` -> Gắn vào Header: `Authorization: Bearer <access_token>`

### 📱 Dữ liệu cho App Khách hàng (QR Code)
Hệ thống có sẵn 8 Bàn. Mã QR mặc định dành cho **Bàn 01** để bạn quét thử là: 
👉 `QR-Bàn-01`
*(Bạn có thể thay đổi trên Postman hoặc Swagger để test luồng tạo Session)*

*Cách dùng:* Gọi API `POST /api/customer/scan` với body `{ "qr_code": "QR-Bàn-01" }` -> lấy `session_token` -> Dùng token này cho các API đặt món.

### 🍔 Menu mẫu
Đã có sẵn 3 danh mục thực đơn để bạn hiển thị lên UI:
- **Đồ Nướng (GRILL):** Thịt Bò Nướng Tảng, Sườn Heo...
- **Đồ Uống (BAR):** Coca, Bia Tiger, Sinh tố xoài...
- **Món Nguội (COLD):** Salad, Nem cuốn...

---

## 5. Xoá và Reset Dữ liệu

Nếu trong quá trình test Frontend bạn lỡ tay xóa hay tạo ra quá nhiều dữ liệu rác và muốn reset DB về trạng thái sạch sẽ ban đầu, chỉ cần chạy lệnh sau:

```bash
docker compose down -v && docker compose up --build -d
```
*(Hoặc lệnh `npm run docker:reset`)*
Hệ thống sẽ bị xóa sạch hoàn toàn và tự động nạp lại dữ liệu mẫu nguyên bản từ đầu!

---

*Chúc các bạn Team Frontend code cháy máy và tích hợp mượt mà! 🚀*
