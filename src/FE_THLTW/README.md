# 🍽️ Restaurant Management System - Frontend

Frontend hiện đại cho hệ thống quản lý nhà hàng, được xây dựng bằng React + Vite + TailwindCSS.

## 🚀 Công nghệ sử dụng

- **React 18** (Vite)
- **TailwindCSS v3** (với thiết kế Glassmorphism)
- **React Router Dom v6**
- **Lucide React** (Icons)
- **Axios** (API)
- **Socket.IO Client** (Real-time)
- **Recharts** (Biểu đồ báo cáo)
- **React Hot Toast** (Thông báo)

## 🛠️ Hướng dẫn cài đặt

Vì máy hiện tại gặp vấn đề về kết nối mạng khi chạy `npm install`, bạn vui lòng thực hiện các bước sau trên máy có internet:

1. **Vào thư mục frontend**:
   ```bash
   cd src/FE_THLTW
   ```

2. **Cài đặt dependencies**:
   ```bash
   npm install
   ```

3. **Khởi chạy môi trường phát triển**:
   ```bash
   npm run dev
   ```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

## 🔗 Kết nối Backend

- Frontend đã được cấu hình Proxy để kết nối với Backend chạy tại `http://localhost:5000`.
- Đảm bảo Backend đã được khởi chạy (Docker hoặc Local) trước khi sử dụng.
- File `.env` chứa cấu hình URL:
  ```env
  VITE_API_URL=http://localhost:5000/api
  VITE_SOCKET_URL=http://localhost:5000
  ```

## 👥 Tài khoản Demo

Mật khẩu chung: `Password123!`

- **Admin**: `admin@restaurant.com`
- **Kitchen**: `kitchen@restaurant.com`
- **Staff/Waiter**: `waiter@restaurant.com`

## ✨ Tính năng đã implement

- **Customer**: Quét mã QR, Xem menu theo trạm (GRILL/BAR/COLD), Giỏ hàng, Đặt món, Theo dõi đơn hàng real-time, Gọi nhân viên/Thanh toán.
- **KDS (Bếp)**: Màn hình hiển thị đơn hàng theo trạm, Cập nhật trạng thái món (PENDING -> PREPARING -> READY -> SERVED).
- **Staff**: Quản lý bàn (Sơ đồ bàn), Thanh toán tiền mặt, Hủy món, Xử lý yêu cầu từ khách.
- **Admin**: Dashboard thống kê doanh thu, Báo cáo món bán chạy, Quản lý Nhân viên (CRUD), Quản lý Bàn, Quản lý Menu (Món ăn/Danh mục/Quota), Quản lý mã QR.