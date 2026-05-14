1. Kết luận tổng quan

Frontend hiện tại: Chưa đủ bàn giao

Lý do: npm run build thành công, nhưng còn lỗi runtime, mismatch API/socket với backend, thiếu validation form, thiếu lint/test, và một số flow quan trọng như Staff table detail, KDS realtime, Admin table/menu CRUD có khả năng lỗi khi dùng thật.

Ghi chú Speckit: .specify/extensions.yml có optional hook speckit.git.commit trước/sau analyze, tôi không chạy vì yêu cầu chỉ phân tích và không sửa code.


2. Các lỗi nghiêm trọng cần sửa trước khi bàn giao
STT	Mức độ	Vấn đề	File/khu vực liên quan	Ảnh hưởng	Cách sửa đề xuất
1	Critical	StaffTableDetailPage dùng <Table2 /> nhưng không import	StaffTableDetailPage.jsx (line 7), StaffTableDetailPage.jsx (line 130)	Vào chi tiết bàn có thể crash runtime	Import Table2 từ lucide-react, thêm lint để bắt lỗi undefined
2	Critical	Staff tables dùng table.id, table.name, nhưng backend trả table_id, table_name	StaffTablesPage.jsx (line 13), StaffTablesPage.jsx (line 30), session.service.js (line 145)	Link /tables/undefined, hiển thị tên bàn sai, staff không mở được phiên bàn	Map response về { id: table_id, name: table_name } hoặc sửa UI dùng đúng field
3	Critical	Customer socket join thiếu session_token, backend bắt buộc session_id và session_token	socket.js (line 16), sockets/index.js (line 25)	Khách không nhận realtime order_status_updated hoặc session_closed	Emit { session_id, session_token }, xử lý join_session_error
4	High	Staff socket event name không khớp backend	StaffTablesPage.jsx (line 58), session.service.js (line 35), session.service.js (line 105)	Realtime bàn/yêu cầu khách không cập nhật	Đổi listener sang table_status_changed và new_customer_request
5	High	KDS socket emit sai shape, backend destructure { station } nhưng frontend gửi string	KDSPage.jsx (line 136), sockets/index.js (line 142)	KDS không join room theo station, realtime đơn mới không đúng	Emit socket.emit('join_station', { station })
6	High	Route /kds cho ADMIN, nhưng backend HTTP /kds/* chỉ cho KITCHEN	App.jsx (line 53), kds.routes.js (line 9)	Admin vào KDS bị 403 khi gọi API	Đồng bộ quyền: cho backend ADMIN hoặc frontend chỉ cho KITCHEN
7	High	Admin tạo bàn thiếu field zone, backend yêu cầu zone	AdminTablesPage.jsx (line 7), admin.validator.js (line 38)	Tạo bàn mới lỗi validation	Thêm input zone và validate bắt buộc
8	High	Admin menu form gửi station/description, nhưng backend create item yêu cầu category_id, không nhận station/description	AdminMenuPage.jsx (line 67), admin.validator.js (line 111)	Tạo/sửa món dễ lỗi hoặc dữ liệu station/description bị bỏ qua	Đồng bộ contract menu item hoặc sửa form theo backend schema
9	Medium	Form đổi password nhân viên có UI nhưng backend update user không nhận password	AdminUsersPage.jsx (line 54), admin.validator.js (line 28)	Người dùng tưởng đổi mật khẩu thành công nhưng không đổi	Thêm endpoint/field update password hoặc bỏ UI
10	Medium	Token staff lưu localStorage, logout dùng localStorage.clear()	AuthContext.jsx (line 18), AuthContext.jsx (line 27)	Rủi ro XSS lấy token, clear cả dữ liệu không thuộc app	Cân nhắc httpOnly cookie hoặc ít nhất key-scoped cleanup

3. Các thiếu sót về UI/UX

Login: có demo account/password hard-code trong UI tại LoginPage.jsx (line 7), không phù hợp bản bàn giao khách hàng.

Customer scan/menu: không có scan camera thật, chỉ nhập mã thủ công và demo QR tại CustomerScanPage.jsx (line 29); các icon button gọi nhân viên/lịch sử/cart thiếu aria-label.

Staff table detail: nút hủy món/refresh icon-only thiếu accessible name, hover-only action khó dùng trên mobile tại StaffTableDetailPage.jsx (line 201).

Admin CRUD modals: label không gắn htmlFor, thiếu inline validation và field error theo backend tại AdminUsersPage.jsx (line 201), AdminMenuPage.jsx (line 270).

Reports: date range không validate from <= to, export không dùng filter đang chọn tại AdminReportsPage.jsx (line 56).


4. Các thiếu sót về API integration

/staff/tables: frontend field mapping sai như mục 2.

/customer Socket.IO: join thiếu session_token, chưa xử lý ack/error.

/staff Socket.IO: event names sai (table:status_update, new_request thay vì table_status_changed, new_customer_request).

/kitchen Socket.IO: payload join_station sai shape.

/admin/tables: frontend thiếu zone.

/admin/menu/items: frontend/backend chưa thống nhất schema station, description, category_id.

/admin/reports/export: frontend gọi không truyền from/to, trong khi route có schema query optional tại admin.validator.js (line 104).

createVNPayPayment có trong API client nhưng không được gọi từ UI tại api.js (line 69).


5. Các vấn đề về auth/routing/permission

ProtectedRoute chuyển người sai role về /login, không có trang 403 nên UX mơ hồ tại App.jsx (line 35).

/kds frontend cho ADMIN, backend HTTP chỉ KITCHEN.

Staff detail hiển thị checkout/cancel cho cả WAITER, nhưng backend checkout/cancel chỉ CASHIER/MANAGER/ADMIN; cần ẩn/disable theo role tại staff.routes.js (line 161).

Auth bootstrap chỉ đọc user từ localStorage, không verify /me hoặc refresh token khi reload tại AuthContext.jsx (line 8).

Refresh token fail redirect bằng window.location.href, dễ phá SPA state và không clear context React tại api.js (line 43).


6. Các vấn đề về code quality

Component quá dài, logic API/state/UI nhồi chung: CustomerMenuPage.jsx (line 20) 530 dòng, AdminMenuPage.jsx (line 18) 331 dòng.

Không có ESLint script: npm run lint fail Missing script: "lint".

Không có test frontend: không tìm thấy file *.test.* hoặc *.spec.*.

npm run build pass nhưng cảnh báo bundle JS 820.84 kB, cần code splitting.

.env thật được commit trong frontend với config runtime tại .env (line 1); không có secret nhưng nên tránh commit file env thật.

Một số import thừa như Check trong admin pages, lỗi này hiện không bị lint bắt.


7. Checklist bàn giao frontend

 Chạy được build production

 Chạy được local theo README cần xác minh với backend thật

 Không còn mock/demo data

 Không còn lỗi runtime

 Không còn console.log/debugger

 Đủ loading/error/empty state

 Đủ validate form

 Route private/public hoạt động đúng

 API/socket khớp backend

 README/env đầy đủ cho production

 Có lint/test tối thiểu


8. Danh sách task cần làm tiếp

Tên task: Sửa staff table mapping; Mô tả: map table_id/table_name sang UI; File: StaffTablesPage.jsx (line 9); Acceptance criteria: link chi tiết bàn dùng ID đúng, tên bàn hiển thị đúng.

Tên task: Sửa lỗi runtime Staff detail; Mô tả: import Table2, thêm lint rule no-undef; File: StaffTableDetailPage.jsx (line 7); Acceptance criteria: mở chi tiết bàn không crash.

Tên task: Đồng bộ Socket.IO frontend/backend; Mô tả: sửa customer token, staff event names, kitchen join payload; File: socket.js (line 9), KDSPage.jsx (line 136); Acceptance criteria: realtime hoạt động cho customer/staff/kitchen.

Tên task: Đồng bộ role KDS và staff actions; Mô tả: khớp UI route/action với backend permission; File: App.jsx (line 52), StaffTableDetailPage.jsx (line 15); Acceptance criteria: role không đủ quyền không thấy action gây 403.

Tên task: Sửa Admin table/menu contracts; Mô tả: thêm zone, đồng bộ menu schema/category/station/description; File: AdminTablesPage.jsx (line 39), AdminMenuPage.jsx (line 64); Acceptance criteria: tạo/sửa bàn/món thành công với backend validation.

Tên task: Bổ sung form validation; Mô tả: validate required/email/password/number/date và show backend field errors; File: admin/customer/staff forms; Acceptance criteria: không submit invalid data, lỗi hiển thị tại field.

Tên task: Thêm quality gates frontend; Mô tả: thêm ESLint, test smoke cho routes/API mapping, CI command; File: package.json (line 5); Acceptance criteria: npm run lint và test pass.

Tên task: Tối ưu bundle; Mô tả: lazy load route admin/recharts/kds; File: App.jsx (line 12); Acceptance criteria: build không còn warning chunk > 500 KB.


9. Đánh giá cuối cùng

UI/UX: 6/10

API integration: 4/10

Auth/routing: 5/10

Code quality: 5/10

Performance: 6/10

Readiness for handoff: 4/10