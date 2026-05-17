# Báo cáo kiểm tra frontend sau test

## 1. Kết luận tổng quan
- Frontend hiện tại: **Chưa đủ bàn giao**.
- Lý do ngắn gọn: production build chạy được, nhưng có lỗi runtime chắc chắn ở trang chi tiết bàn nhân viên, nhiều mismatch giữa frontend và backend API/socket, thiếu xử lý quyền ở UI, thiếu test/lint, thiếu accessibility cơ bản và tài liệu chạy đang lệch port backend hiện tại.

## 2. Các lỗi nghiêm trọng cần sửa trước khi bàn giao

| STT | Mức độ | Vấn đề | File/khu vực liên quan | Ảnh hưởng | Cách sửa đề xuất |
|---:|---|---|---|---|---|
| 1 | Critical | Trang chi tiết bàn dùng `<Table2 />` nhưng không import `Table2` | `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:130` | Vào trang `/tables/:id` có thể lỗi runtime `ReferenceError`, chặn luồng phục vụ/checkout | Import `Table2` từ `lucide-react` hoặc thay bằng icon đã import; thêm lint để bắt undefined JSX |
| 2 | Critical | Mapping danh sách bàn staff sai field backend trả về | `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx:13`, `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx:35`, backend `src/BE_THLTW/src/services/session.service.js:143` | Link thành `/tables/undefined`, tên bàn trống, nhân viên không mở được chi tiết bàn đúng | Dùng `table.table_id` và `table.table_name`, hoặc chuẩn hóa DTO ở API client |
| 3 | Critical | Socket customer thiếu `session_token` khi join session | `src/FE_THLTW/src/lib/socket.js:16`, `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx:46`, backend `src/BE_THLTW/src/sockets/index.js:14` | Khách không nhận realtime cập nhật trạng thái order/session vì backend reject join | Truyền cả `session_id` và `session_token`; lưu token session rõ ràng trong customer flow |
| 4 | High | Event socket staff không khớp backend | `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx:67`, `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx:68`, backend `src/BE_THLTW/src/services/session.service.js:35`, `src/BE_THLTW/src/services/session.service.js:105` | Bàn/request mới không cập nhật realtime; tester thấy dữ liệu stale | Đổi listener sang `table_status_changed` và `new_customer_request`, hoặc thống nhất event contract |
| 5 | High | KDS join station sai payload | `src/FE_THLTW/src/pages/kds/KDSPage.jsx:136`, backend `src/BE_THLTW/src/sockets/index.js:142` | KDS không join đúng room station, có thể không nhận `new_order` theo bếp/bar | Emit `socket.emit('join_station', { station })` và kiểm tra reconnect |
| 6 | High | Form tạo bàn admin thiếu field bắt buộc `zone` | `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx:7`, `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx:46`, backend `src/BE_THLTW/src/validators/admin.validator.js:38` | Tạo bàn mới bị backend reject 400, chức năng quản trị bàn chưa bàn giao được | Thêm input `zone`, validate required trước submit, hiển thị lỗi backend tại form |
| 7 | High | UI staff hiển thị action cho role không đủ quyền backend | `src/FE_THLTW/src/App.jsx:60`, `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:201`, `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:268`, backend `src/BE_THLTW/src/routes/staff.routes.js:161` | WAITER thấy nút checkout/cancel nhưng bấm bị 403; gây lỗi nghiệp vụ và UX xấu | Ẩn/disable action theo role; xử lý 403 thân thiện; đồng bộ permission matrix frontend-backend |
| 8 | High | Admin menu thiếu quản trị category/option dù API có sẵn; form item có field không khớp schema | `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx:64`, `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx:270`, `src/FE_THLTW/src/lib/api.js:117`, backend `src/BE_THLTW/src/validators/admin.validator.js:111` | Không quản lý đầy đủ menu; gửi field dư như `station`, `description`; rủi ro lỗi hoặc dữ liệu không lưu như kỳ vọng | Bổ sung UI category/option, bỏ field không có contract hoặc cập nhật backend contract, validate schema client |
| 9 | Medium | Socket URL fallback và README lệch port backend Docker hiện tại | `src/FE_THLTW/src/lib/socket.js:3`, `src/FE_THLTW/README.md:39`, `src/FE_THLTW/vite.config.js:11` | Chạy theo README dễ kết nối sai `5000` thay vì backend Docker `5001`; socket không hoạt động | Chuẩn hóa `.env.example`, README và fallback; khuyến nghị dùng proxy `/api` + `VITE_SOCKET_URL=http://localhost:5001` |
| 10 | Medium | Không có lint/test frontend | `src/FE_THLTW/package.json:6` | Build không bắt lỗi undefined JSX/import, regressions dễ lọt sang tester | Thêm ESLint, test runner tối thiểu, CI command `npm run lint && npm run build` |

## 3. Các thiếu sót về UI/UX

### Layout staff/admin
- `src/FE_THLTW/src/layouts/StaffLayout.jsx:162`: ô search trên header đang là UI tĩnh, không có handler/filter; nên bỏ hoặc nối chức năng tìm kiếm thật.
- `src/FE_THLTW/src/layouts/StaffLayout.jsx:173`: nút chuông thông báo không có dữ liệu/action; gây kỳ vọng sai cho người dùng.
- `src/FE_THLTW/src/layouts/StaffLayout.jsx:156`: nhiều nút icon-only thiếu `aria-label`, ảnh hưởng accessibility và keyboard/screen reader.

### Staff tables/detail
- `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx:90`: có loading state, nhưng realtime đang sai event nên UI dễ stale.
- `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:201`: nút hủy item chỉ hiện khi hover, khó dùng trên mobile/tablet.
- `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:70`: dùng `window.confirm()` cho thao tác destructive, khó tùy biến nội dung và không nhất quán UI.
- `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx:282`: modal checkout thiếu `role="dialog"`, focus trap và keyboard close rõ ràng.

### Customer menu/cart
- `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx:41`: khi session hết hạn/chưa có session chỉ hiển thị lỗi text, chưa có hướng dẫn quét lại QR hoặc quay lại flow hợp lệ.
- `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx:383`: nút tăng/giảm số lượng là icon-only, thiếu accessible name.
- `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx:398`: nút xóa item hover-only, kém trên touch device.
- `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx:157`: request bill chỉ báo chung chung, chưa có trạng thái chờ nhân viên xác nhận hoặc timeout/retry.

### Admin menu/tables/users/reports
- `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx:270`: form label không gắn `htmlFor`/`id`, accessibility thấp.
- `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx:152`: form tạo/sửa bàn thiếu `zone`, thiếu validate required đầy đủ.
- `src/FE_THLTW/src/pages/admin/AdminUsersPage.jsx:214`: field đổi mật khẩu hiển thị trong edit nhưng backend update không hỗ trợ, dễ gây hiểu nhầm.
- `src/FE_THLTW/src/pages/admin/AdminReportsPage.jsx:91`: có empty state nhưng export báo cáo không thể hiện rõ đang export theo filter nào.
- `src/FE_THLTW/src/pages/admin/AdminDashboardPage.jsx:236`: nút “Xem tất cả báo cáo” chưa có action điều hướng.

## 4. Các thiếu sót về API integration

- `staffApi.getTables()` trả field `table_id`, `table_name`, nhưng `StaffTablesPage` dùng `id`, `name`; cần chuẩn hóa mapping.
- `getCustomerSocket(sessionId)` thiếu `session_token`; backend namespace `/customer` yêu cầu cả hai field.
- `StaffTablesPage` nghe `table:status_update` và `new_request`, trong khi backend emit `table_status_changed` và `new_customer_request`.
- `KDSPage` gửi `join_station` bằng string, backend nhận object `{ station }`.
- `adminApi.createTable(form)` thiếu `zone`; backend validator yêu cầu `name`, `zone`, `capacity`.
- `AdminMenuPage` gửi field `station`, `description` trong khi backend create/update item schema hiện không định nghĩa các field này.
- `adminApi.createCategory/updateCategory/deleteCategory` và `adminApi.createOption/updateOption/deleteOption` có trong API client nhưng chưa có UI sử dụng; chức năng quản trị menu chưa đầy đủ.
- `adminApi.exportReport()` đang được gọi không truyền `from/to` dù UI có filter ngày; backend hiện cũng chưa thể hiện rõ filter trong export.
- API client `src/FE_THLTW/src/lib/api.js` chưa có timeout, chưa chuẩn hóa lỗi network/timeout, và interceptor 401 chưa queue concurrent refresh request.
- `src/FE_THLTW/src/lib/socket.js:3` hard-code fallback `http://localhost:5000`, không khớp cấu hình Docker/proxy hiện tại `5001`.

## 5. Các vấn đề về auth/routing/permission

- `src/FE_THLTW/src/App.jsx:51`: route `/admin/*` có guard role `ADMIN`, `MANAGER`; hướng đúng, nhưng cần kiểm tra lại từng action vì frontend vẫn gọi API có permission chi tiết hơn.
- `src/FE_THLTW/src/App.jsx:60`: route `/tables/*` cho phép `WAITER`, nhưng trang chi tiết hiển thị cancel/checkout cho role có thể không được backend cho phép.
- `src/FE_THLTW/src/App.jsx:70`: route `/kds` cho `KITCHEN`, `BAR`, `ADMIN`, `MANAGER`; nếu station của user chỉ là bếp hoặc bar thì UI cần tránh cho join/switch station sai quyền.
- `src/FE_THLTW/src/contexts/AuthContext.jsx:8`: khởi tạo user từ `localStorage` mà không verify token còn hợp lệ; user cũ có thể thấy UI logged-in đến khi API trả 401.
- `src/FE_THLTW/src/contexts/AuthContext.jsx:27`: logout dùng `localStorage.clear()`, có thể xóa dữ liệu không thuộc app; nên xóa đúng key.
- `src/FE_THLTW/src/lib/api.js:15`: token lấy từ `localStorage` hoặc `sessionStorage`, nhưng login hiện lưu localStorage; sessionStorage fallback chưa rõ luồng sử dụng.
- `src/FE_THLTW/src/lib/api.js:31`: refresh token flow có nhưng chưa xử lý queue/race condition khi nhiều request cùng 401.
- Customer routes `/menu/:sessionId` và `/order-status/:sessionId` không có route-level validation token; nếu session/token không hợp lệ chỉ xử lý sau khi gọi API/socket.

## 6. Các vấn đề về code quality

- `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx`: khoảng 530 dòng, trộn API calls, socket, cart logic, modal và render; nên tách hook/service/component nhỏ.
- `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx`: khoảng 331 dòng, trộn filter, CRUD, modal form và item table; khó maintain khi thêm category/option.
- `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx`: khoảng 323 dòng, chứa nhiều action nghiệp vụ và modal; hiện đã lọt lỗi undefined `Table2`.
- `src/FE_THLTW/src/pages/admin/AdminDashboardPage.jsx:123`: trend `+12.5%` và `+8.2%` đang hard-code, dễ gây sai số liệu dashboard.
- `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx:86`, `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx:55`, `src/FE_THLTW/src/pages/admin/AdminUsersPage.jsx:67`: dùng `window.confirm()` lặp lại, nên có confirm modal chung.
- `src/FE_THLTW/src/lib/api.js`: interceptor vừa unwrap `response.data`, vừa refresh token, vừa redirect; nên tách rõ error normalization để UI hiển thị lỗi nhất quán.
- `src/FE_THLTW/package.json`: thiếu `lint`, `test`, `format`; không có gate tự động trước bàn giao.
- Repository frontend hiện chưa có test unit/integration/e2e (`*.test.*`, `*.spec.*` không có trong `src/FE_THLTW`).
- `npm run build` thành công nhưng cảnh báo bundle chính khoảng 826 kB, lớn hơn ngưỡng Vite 500 kB.

## 7. Checklist bàn giao frontend

- [x] Chạy được local qua Vite dev server.
- [x] Build production thành công bằng `npm run build`.
- [ ] Không còn mock/hard-code dữ liệu hiển thị nghiệp vụ như trend dashboard.
- [ ] Không còn console/debugger/import undefined; cần lint để xác nhận tự động.
- [ ] Đủ loading/error/empty state cho mọi màn hình chính và action destructive.
- [ ] Đủ validate form, gồm `zone` khi tạo bàn và schema item menu.
- [ ] Route private/public hoạt động đúng với role và action-level permission.
- [ ] API khớp backend, gồm table DTO, socket events, customer socket token, KDS station payload.
- [ ] README/env đầy đủ và khớp Docker/backend port hiện tại.
- [ ] Có test tối thiểu cho auth routing, API client mapping và các form quan trọng.
- [ ] Accessibility cơ bản đạt yêu cầu: label, aria-label, dialog role, keyboard flow.

## 8. Danh sách task cần làm tiếp

### Task 1: Sửa lỗi runtime trang chi tiết bàn staff
- Mô tả: Import hoặc thay thế icon `Table2` đang được render nhưng chưa khai báo.
- File liên quan: `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx`.
- Acceptance criteria: Mở trực tiếp `/tables/:id` không lỗi runtime; build vẫn thành công; lint bắt được undefined JSX trong tương lai.

### Task 2: Chuẩn hóa DTO danh sách bàn staff
- Mô tả: Đồng bộ field frontend với backend `table_id`, `table_name`, `active_session_id` hoặc map về model FE thống nhất.
- File liên quan: `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx`, `src/FE_THLTW/src/lib/api.js`.
- Acceptance criteria: Danh sách hiển thị đúng tên bàn; link điều hướng tới `/tables/{table_id}`; không còn `/tables/undefined`.

### Task 3: Đồng bộ Socket.IO customer/staff/KDS
- Mô tả: Sửa payload join customer có `session_token`, đổi event staff theo backend, sửa `join_station` thành object.
- File liên quan: `src/FE_THLTW/src/lib/socket.js`, `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx`, `src/FE_THLTW/src/pages/staff/StaffTablesPage.jsx`, `src/FE_THLTW/src/pages/kds/KDSPage.jsx`.
- Acceptance criteria: Customer nhận order/session updates; staff nhận bàn/request mới realtime; KDS nhận order theo station sau reload/reconnect.

### Task 4: Sửa form quản trị bàn
- Mô tả: Thêm field `zone`, validate client-side và hiển thị lỗi backend đúng vị trí.
- File liên quan: `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx`.
- Acceptance criteria: Tạo/sửa bàn thành công với backend validator; submit thiếu `zone` bị chặn trước khi gọi API.

### Task 5: Đồng bộ permission action staff
- Mô tả: Ẩn hoặc disable checkout/cancel theo role thực tế backend cho phép; xử lý 403 thân thiện.
- File liên quan: `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx`, `src/FE_THLTW/src/contexts/AuthContext.jsx`.
- Acceptance criteria: WAITER không thấy action không có quyền; CASHIER/MANAGER/ADMIN vẫn thao tác đúng; lỗi 403 hiển thị rõ.

### Task 6: Hoàn thiện quản trị menu/category/option
- Mô tả: Kiểm tra contract backend item, bỏ field không hỗ trợ hoặc cập nhật backend; thêm UI quản lý category và options nếu thuộc scope bàn giao.
- File liên quan: `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx`, `src/FE_THLTW/src/lib/api.js`.
- Acceptance criteria: CRUD item/category/option hoạt động đúng API; form không gửi field ngoài contract; lỗi validation hiển thị tại field.

### Task 7: Chuẩn hóa cấu hình môi trường và README
- Mô tả: Cập nhật `.env.example`, README và socket fallback theo Docker/backend port hiện tại.
- File liên quan: `src/FE_THLTW/.env.example`, `src/FE_THLTW/README.md`, `src/FE_THLTW/src/lib/socket.js`, `src/FE_THLTW/vite.config.js`.
- Acceptance criteria: Làm theo README từ clean checkout chạy được frontend + backend; API và socket kết nối đúng môi trường local.

### Task 8: Thêm lint/test gate frontend
- Mô tả: Cấu hình ESLint và test tối thiểu cho các luồng quan trọng.
- File liên quan: `src/FE_THLTW/package.json`, cấu hình lint/test mới, các test cạnh page/API client.
- Acceptance criteria: Có `npm run lint` và `npm test`; lint bắt undefined component/import unused; CI/local handoff chạy được.

### Task 9: Cải thiện form validation và double submit
- Mô tả: Rà soát login, admin users, menu, tables, customer cart/order để validate trước submit và disable nút khi đang gửi.
- File liên quan: `src/FE_THLTW/src/pages/LoginPage.jsx`, `src/FE_THLTW/src/pages/admin/AdminUsersPage.jsx`, `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx`, `src/FE_THLTW/src/pages/admin/AdminTablesPage.jsx`, `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx`.
- Acceptance criteria: Field required/number/email/password được validate; lỗi backend hiển thị đúng; double-click submit không tạo request trùng.

### Task 10: Cải thiện accessibility cơ bản
- Mô tả: Thêm `aria-label` cho icon buttons, `htmlFor/id` cho form label, dialog roles, keyboard close/focus management cho modal.
- File liên quan: `src/FE_THLTW/src/layouts/StaffLayout.jsx`, `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx`, `src/FE_THLTW/src/pages/admin/*.jsx`, `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx`.
- Acceptance criteria: Điều hướng keyboard được qua các modal/action chính; screen reader có tên cho nút icon; label liên kết đúng input.

### Task 11: Tách component/hook cho các page lớn
- Mô tả: Tách cart/order logic, modal form, table rows, socket subscriptions thành hook/component nhỏ.
- File liên quan: `src/FE_THLTW/src/pages/customer/CustomerMenuPage.jsx`, `src/FE_THLTW/src/pages/admin/AdminMenuPage.jsx`, `src/FE_THLTW/src/pages/staff/StaffTableDetailPage.jsx`.
- Acceptance criteria: Mỗi page giảm trách nhiệm rõ ràng; logic API/socket có thể test độc lập; không đổi hành vi người dùng.

### Task 12: Tối ưu bundle và route loading
- Mô tả: Dùng lazy loading cho route lớn và xem lại dependency nặng nếu cần.
- File liên quan: `src/FE_THLTW/src/App.jsx`, các page admin/customer/staff/kds.
- Acceptance criteria: Build không còn cảnh báo chunk chính vượt ngưỡng hoặc có chiến lược chunk hợp lý; route vẫn render đúng.

## 9. Đánh giá cuối cùng

- UI/UX: **5/10** — giao diện chính đã có nhưng còn thiếu accessibility, một số nút/flow là UI tĩnh hoặc khó dùng trên mobile.
- API integration: **4/10** — có API client đầy đủ một phần, nhưng tồn tại nhiều mismatch DTO/socket/schema ảnh hưởng trực tiếp chức năng.
- Auth/routing: **5/10** — route guard cơ bản có, nhưng action-level permission và token lifecycle chưa đủ chắc.
- Code quality: **5/10** — build qua, cấu trúc thư mục tương đối rõ, nhưng page lớn, thiếu lint/test và đã lọt lỗi runtime.
- Performance: **6/10** — chưa thấy vòng lặp API nghiêm trọng, nhưng bundle chính lớn và chưa có lazy route rõ ràng.
- Readiness for handoff: **4/10** — chưa nên bàn giao cho khách hàng/tester nếu chưa sửa các lỗi Critical/High ở trên.
