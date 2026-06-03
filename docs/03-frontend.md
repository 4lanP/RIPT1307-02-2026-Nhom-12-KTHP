# 03 - Frontend Documentation

Tài liệu chi tiết cấu trúc, luồng nghiệp vụ và kiến trúc tích hợp của phần Frontend (`src/FE_THLTW`).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

Frontend được xây dựng với mục tiêu tải nhanh, giao diện sống động (Glassmorphism), đáp ứng tốt trên cả Mobile (Khách hàng, Nhân viên chạy bàn) và Desktop (Màn hình KDS, Admin Dashboard).

| Thành phần | Công nghệ / Thư viện |
| :--- | :--- |
| **Core Framework** | React 18 + Vite 5 + TypeScript |
| **UI Library** | Ant Design (antd) v5 & Ant Design Icons |
| **Styling (CSS)** | Tailwind CSS v3 |
| **Routing** | React Router Dom v6 |
| **API Client** | Axios |
| **Real-time** | Socket.IO Client v4 |
| **Biểu đồ & Báo cáo** | Recharts |
| **Thông báo (Toast)** | React Hot Toast |
| **Icon** | Lucide React |

---

## 📁 Cấu trúc thư mục (Directory Structure)

Thư mục frontend được tổ chức tách biệt tại `src/FE_THLTW/`:

```text
src/FE_THLTW/
├── public/                 # Tài sản tĩnh & Cấu hình Vercel rewrites
│   ├── vercel.json          # Cấu hình Single Page Application & API Proxy trên Vercel
│   └── favicon.svg
├── src/
│   ├── components/         # Các Component giao diện dùng chung (Button, Input, Modal, v.v.)
│   ├── contexts/           # Quản lý State toàn cục (AuthContext)
│   ├── layouts/            # Khung giao diện (Layout) theo Role
│   │   ├── AdminLayout.tsx
│   │   ├── CustomerLayout.tsx
│   │   └── StaffLayout.tsx
│   ├── lib/                # Cấu hình tích hợp hạ tầng
│   │   ├── api.ts          # Axios client, Interceptor tự động refresh token & Unwrap DTO
│   │   └── socket.ts       # Trình quản lý kết nối Socket.IO theo Namespaces
│   ├── pages/              # Các màn hình chức năng chính chia theo nhóm người dùng
│   │   ├── admin/          # Quản trị (Dashboard, Báo cáo, CRUD Menu/Bàn/QR/Nhân viên)
│   │   ├── customer/       # Khách hàng (Menu trạm, Giỏ hàng, Đơn đặt, VNPay, Gọi phục vụ)
│   │   ├── kds/            # Màn hình Bếp (Kitchen Display System nhận đơn theo trạm)
│   │   ├── staff/          # Nhân viên (Sơ đồ bàn, Chi tiết bàn, Checkout, Hủy món)
│   │   └── LoginPage.tsx   # Đăng nhập nhân viên nội bộ
│   ├── utils/              # Các hàm bổ trợ (Format tiền tệ, thời gian, validate)
│   ├── App.tsx             # Định tuyến Router, Role Guards & Khởi chạy ứng dụng
│   ├── index.css           # Cấu hình Tailwind & Design System tokens
│   └── main.tsx            # Điểm khởi đầu render ứng dụng React
├── package.json            # Scripts build, run dev, lint và dependencies
└── vite.config.ts          # Cấu hình build Vite & Proxy API local
```

---

## 🔐 Xác thực & Phân quyền (Auth & Routing Guards)

Hệ thống định tuyến sử dụng **React Router Dom v6** kết hợp với **AuthContext** để bảo vệ các tuyến đường riêng tư (Private Routes) dựa trên phân vai (Role-based access control).

### 1. Cơ chế Lưu trữ Tokens
* **Nhân viên (Staff)**: Đăng nhập nhận về `accessToken` (lưu trong bộ nhớ state) và `refreshToken` (lưu tại `localStorage` để tự động khôi phục phiên khi reload).
* **Khách hàng (Customer)**: Không cần đăng nhập tài khoản. Phiên làm việc bắt đầu từ việc quét mã QR, backend trả về `session_token` (lưu trong `localStorage` và chuyển qua header dưới dạng `Bearer <session_token>`).

### 2. Định tuyến Bảo vệ (Route Guards)
Trong `App.tsx`, các Route được bọc bởi các Guard component:
* **`ProtectedRoute`**: Kiểm tra nhân viên đã đăng nhập chưa.
* **`RoleGuard`**: Kiểm tra vai trò của người dùng (`role`) có nằm trong danh sách quyền được truy cập tuyến đường đó hay không.

**Ma trận Phân quyền ở Frontend:**
* `/customer/menu/:sessionId` -> Không cần đăng nhập nhân viên. Yêu cầu `session_token` hợp lệ của khách hàng.
* `/staff/*` -> Chỉ cho phép roles: `WAITER`, `CASHIER`, `MANAGER`, `ADMIN`.
* `/kds` -> Chỉ cho phép roles: `KITCHEN`, `ADMIN`.
* `/admin/*` -> Chỉ cho phép roles: `MANAGER`, `ADMIN` (riêng chức năng quản lý tài khoản nhân viên `/admin/users` chỉ dành riêng cho `ADMIN`).

---

## 📘 Di trú TypeScript & Tích hợp Ant Design

### 1. Di trú sang TypeScript (Type Safety)
Toàn bộ mã nguồn Frontend đã được di trú thành công sang **TypeScript (TS/TSX)** để nâng cao độ tin cậy và hạn chế tối đa các lỗi runtime. Các interface khai báo kiểu dữ liệu cho toàn bộ nghiệp vụ (User, Session, Table, Category, MenuItem, Order, OrderItem, StaffRequest) được quản lý tập trung tại `src/types/index.ts`.
*(Chi tiết về quá trình di trú và các interface, vui lòng xem tại hướng dẫn chuyên sâu [src/FE_THLTW/TS_MIGRATION.md](../src/FE_THLTW/TS_MIGRATION.md))*

### 2. Tích hợp thư viện UI Ant Design (antd)
Hệ thống đã tích hợp nâng cấp thư viện **Ant Design v5** cho các chức năng quản trị, vừa đảm bảo tính thẩm mỹ, hiện đại vừa tuân thủ tuyệt đối các yêu cầu công nghệ của dự án. 
Thực tế triển khai tại trang quản lý nhân viên **`src/pages/admin/AdminUsersPage.tsx`**:
- **`<Modal>`**: Hộp thoại popup chất lượng cao dùng để Thêm mới/Chỉnh sửa thông tin nhân viên, hỗ trợ hiệu ứng blur nền cực kỳ mượt mà.
- **`<Form>` & `<Form.Item>`**: Điều khiển quản lý và xác thực form tự động (Validation) các trường dữ liệu ở client trước khi gửi lên API.
- **`<Input>` & `<Input.Password>`**: Các ô nhập Họ tên, Email, Mật khẩu có hỗ trợ nút show/hide mật khẩu tinh tế.
- **`<Select>`**: Lựa chọn Chức vụ (ADMIN, MANAGER, WAITER, KITCHEN, CASHIER) chuẩn hóa đầu vào.
- **`<Button>`**: Nút bấm tự động hiển thị trạng thái xoay loading (`loading={saving}`) khi gọi API gửi dữ liệu để nâng cao trải nghiệm người dùng.

### 3. Trang Gửi Email Báo cáo Doanh thu Admin (`AdminEmailSendPage.tsx`)
Bổ sung trang **`src/pages/admin/AdminEmailSendPage.tsx`** độc lập dành riêng cho vai trò `ADMIN` để:
- Xem trạng thái SMTP, cấu hình danh sách người nhận email.
- Nhập nhanh địa chỉ email để kiểm tra/gửi báo cáo tức thì (`POST /api/admin/reports/daily-email/send-now`).
- Chọn ngày doanh thu muốn báo cáo theo lịch.
- Có đầy đủ loader trạng thái và nút Submit bị vô hiệu hóa khi đang gửi để tránh nhấn trùng lặp (Duplicate-Submit).

---

## 🔄 Các luồng nghiệp vụ chính (Core Application Flows)

### 1. Luồng Khách hàng đặt món (QR Ordering Flow)
1. **Quét QR**: Khách quét mã QR tại bàn (`POST /customer/scan` gửi `{ qr_code }`). Hệ thống nhận diện `session_token` và lưu vào bộ nhớ.
2. **Đọc thông tin phiên**: Lấy trạng thái session hiện tại (`GET /customer/session`) để hiển thị số tiền tạm tính, phiên bản session (`version`).
3. **Hiển thị Menu**: Đọc danh sách món ăn phân theo trạm (`GET /customer/menu?station=GRILL|BAR|COLD`).
4. **Đặt món**: Gửi yêu cầu đặt món (`POST /customer/orders`). Request bắt buộc đính kèm `session_version` để tránh xung đột dữ liệu (Optimistic Locking). Nếu nhận mã lỗi `409` (Conflict), frontend sẽ tự động tải lại session và thông báo khách hàng thử lại.
5. **Real-time Tracking**: Khách hàng lắng nghe sự kiện thay đổi qua Socket.IO để xem trạng thái trạm bếp đang chuẩn bị món.
6. **Thanh toán (VNPay)**: Gọi `POST /customer/payment/vnpay` để nhận link thanh toán từ VNPay, chuyển hướng khách hàng và nhận kết quả tại `/payment-result`.

### 2. Luồng Màn hình Bếp (Kitchen Display System - KDS Flow)
1. **Đăng nhập & Chọn trạm**: Nhân viên bếp đăng nhập, chọn trạm làm việc (`GRILL` - Nướng, `BAR` - Pha chế, `COLD` - Món lạnh).
2. **Đồng bộ đơn hàng**: Gọi `GET /kds/orders?station=...` để nạp danh sách món đang chờ.
3. **Cập nhật trạng thái**: Nhân viên bếp tương tác cập nhật món từ `PENDING` (Chờ làm) -> `PREPARING` (Đang làm) -> `READY` (Sẵn sàng) -> `SERVED` (Đã phục vụ) qua lệnh `PATCH /kds/items/{id}/status`.
4. **Real-time Notification**: Nhận đơn mới tức thời từ Socket room theo trạm mà không cần tải lại trang.

### 3. Luồng Nhân viên Phục vụ & Thu ngân (Staff Flow)
1. **Sơ đồ bàn**: Hiển thị lưới sơ đồ bàn ăn cùng trạng thái thời gian thực (`FREE` - Trống, `ACTIVE` - Có khách, `RESERVED` - Đã đặt).
2. **Chi tiết bàn & Gọi phục vụ**: Nhân viên quản lý các yêu cầu hỗ trợ (gọi nước, dọn bàn, thanh toán tiền mặt) từ khách gửi lên và đánh dấu xử lý (`PATCH /staff/requests/{id}/resolve`).
3. **Hủy món**: Nhân viên có quyền `CASHIER`, `MANAGER`, `ADMIN` có thể chọn hủy món ăn trong đơn của khách nếu có lỗi phát sinh (`PATCH /staff/orders/items/{id}/cancel`).
4. **Thanh toán tiền mặt**: Thu ngân thực hiện tất toán và đóng bàn (`POST /staff/sessions/{id}/checkout`), hệ thống tự tính tiền thừa và cập nhật trạng thái bàn về trống.

---

## ⚡ Tích hợp Socket.IO (Real-time Event Handling)

Để đạt hiệu năng truyền thông điệp tức thời và đồng bộ dữ liệu tốt nhất, Socket.IO Client được chia kết nối theo các namespaces an toàn:

### 1. `/customer` Namespace
* **Kết nối**: Khách hàng kết nối tự động bằng cách gửi sự kiện `join_session` kèm payload gồm `{ session_id, session_token }`.
* **Sự kiện lắng nghe**:
  * `order:status_update`: Nhận cập nhật khi trạm bếp đổi trạng thái món ăn trong đơn.
  * `session_closed`: Nhận thông báo khi thu ngân đã checkout thành công và đóng phiên tại bàn.

### 2. `/kitchen` Namespace
* **Xác thực**: Truyền `accessToken` trong phần header của handshake. Chỉ cho quyền `KITCHEN` và `ADMIN`.
* **Cơ chế**: Emit sự kiện `join_station` với payload `{ station: 'GRILL' | 'BAR' | 'COLD' }`.
* **Sự kiện lắng nghe**:
  * `order:new`: Nhận thông báo tức thời khi có khách hàng vừa đặt món mới thuộc trạm bếp này để tự động chèn vào danh sách hiển thị KDS.

### 3. `/staff` Namespace
* **Xác thực**: Truyền `accessToken`. Chỉ cho các roles thuộc khối vận hành.
* **Sự kiện lắng nghe**:
  * `table_status_changed`: Nhận cập nhật sơ đồ bàn khi có bàn đổi trạng thái hoặc có khách quét QR mở bàn mới.
  * `new_customer_request`: Nhận thông báo âm thanh/visual khi khách bấm nút "Gọi nhân viên" tại bàn.

---

## 🌐 Môi trường & Cơ chế Proxy (Development & Production Proxy)

Để tối ưu hóa bảo mật và tránh các lỗi chặn tên miền chéo (CORS - Cross-Origin Resource Sharing), Frontend áp dụng cấu hình proxy toàn phần.

### 1. Local Development (Vite Proxy)
Trong tệp `vite.config.ts`, Vite được cấu hình proxy tự động để chuyển tiếp các request nội bộ từ cổng `3000` sang cổng `5000` (hoặc `5001` trên Docker) của Backend:
```typescript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    },
    '/socket.io': {
      target: 'http://localhost:5000',
      ws: true
    }
  }
}
```

### 2. Production Deployment (Vercel Rewrite Proxy)
Vercel hỗ trợ xử lý Single Page Application bằng cách chuyển hướng toàn bộ route ảo về `index.html`. Dự án đã được đóng gói cấu hình chuyển tiếp request trong file `src/FE_THLTW/public/vercel.json`:
```text
/api/*  https://ript1307-02-2026-nhom-12-kthp.onrender.com/api/:splat  200
/socket.io/*  https://ript1307-02-2026-nhom-12-kthp.onrender.com/socket.io/:splat  200
/* /index.html 200
```
* **Lợi ích**: Frontend chỉ cần gọi API thông qua URL tương đối (ví dụ `/api/customer/menu` hoặc `/socket.io`). Hệ thống định tuyến Vercel sẽ tự động proxy ngầm tới Render Backend mà không cần cấu hình CORS mở rộng ở Backend, đảm bảo an toàn tuyệt đối cho ứng dụng.
