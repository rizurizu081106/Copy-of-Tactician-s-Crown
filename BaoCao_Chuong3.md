# CHƯƠNG 3. THIẾT KẾ HỆ THỐNG

### 3.1 Kiến trúc hệ thống (System Architecture)
Hệ thống Quản lý giải đấu CTC được thiết kế dựa trên mô hình kiến trúc Client - Server hiện đại, tách biệt hoàn toàn giữa giao diện người dùng (Frontend) và logic xử lý nghiệp vụ (Backend). 
- **Frontend (Client):** Là một ứng dụng web trang đơn (Single Page Application - SPA) được xây dựng bằng ReactJS. Frontend chịu trách nhiệm render giao diện, tiếp nhận tương tác của người dùng và gửi dữ liệu lên Server thông qua giao thức HTTP (sử dụng thư viện Axios).
- **Backend (Server):** Xây dựng bằng ASP.NET Core 8 Web API. Backend đóng vai trò là cầu nối xử lý các logic phức tạp như: thuật toán chia phòng, tính điểm, xác thực JWT và phân quyền.
- **Database:** Sử dụng hệ quản trị cơ sở dữ liệu SQL Server để lưu trữ toàn bộ dữ liệu bền vững của hệ thống. Backend giao tiếp với Database thông qua Entity Framework Core.
- **Kết nối Real-time:** Điểm nổi bật của kiến trúc là việc sử dụng SignalR (WebSockets) để thiết lập luồng dữ liệu hai chiều. Khi Admin duyệt kết quả, Backend sẽ trực tiếp "đẩy" (push) sự kiện cập nhật Bảng xếp hạng xuống tất cả các Client đang online.

> 📌 **PROMPT NHỜ AI VẼ SƠ ĐỒ KIẾN TRÚC TỔNG QUÁT:**
> ```text
> Hãy viết mã PlantUML vẽ Sơ đồ kiến trúc Component Diagram cho hệ thống Web. 
> Các thành phần: 
> 1. Client (ReactJS - Giao diện người dùng)
> 2. API Gateway & Auth (Phân giải request và xác thực JWT)
> 3. Backend Server (.NET 8 Web API - Xử lý logic chia phòng, tính điểm)
> 4. SignalR Hub (Xử lý WebSockets để cập nhật Real-time)
> 5. Database (SQL Server)
> Mối quan hệ: Client kết nối tới API Gateway qua HTTP/REST; Client kết nối tới SignalR Hub qua WebSockets. Gateway chuyển tới Backend Server. Backend đọc/ghi dữ liệu vào Database. Backend kích hoạt SignalR Hub để gửi dữ liệu về Client.
> ```

### 3.2 Phân tích Use Case (Chức năng hệ thống)
Hệ thống xoay quanh 3 đối tượng (Actor) chính: Player (đăng ký tham gia, xem thứ hạng), Host (báo cáo kết quả các ván đấu) và Admin (quản lý toàn bộ giải đấu, duyệt kết quả).

*(Vị trí này bạn chèn lại hình ảnh Biểu đồ Use Case tổng quát từ Chương 2 xuống)*

Để làm rõ luồng hoạt động của các chức năng quan trọng, em tiến hành đặc tả (Use Case Specification) cho hai nghiệp vụ cốt lõi nhất của hệ thống: **Chia phòng tự động** và **Báo cáo kết quả ván đấu**.

**Bảng 3.1: Đặc tả Use Case "Quản lý vòng đấu và chia phòng"**

| Thuộc tính | Mô tả chi tiết |
| :--- | :--- |
| **Tên Use Case** | Quản lý vòng đấu và chia phòng tự động |
| **Tác nhân (Actor)** | Admin |
| **Mục đích** | Hệ thống tự động lấy danh sách người chơi đã được duyệt, tạo vòng đấu mới và chia ngẫu nhiên họ vào các phòng 8 người. |
| **Tiền điều kiện** | Admin đã đăng nhập; Giải đấu đã được tạo và có người chơi đăng ký (đã được duyệt). |
| **Luồng sự kiện chính** | 1. Admin truy cập trang "Quản lý Giải đấu", chọn giải đấu cần thao tác.<br>2. Admin nhấn nút "Tạo vòng đấu mới".<br>3. Hệ thống kiểm tra tổng số người chơi hợp lệ.<br>4. Hệ thống chạy thuật toán xáo trộn (Shuffle) và phân bổ danh sách thành các nhóm 8 người.<br>5. Hệ thống lưu thông tin các phòng đấu (MatchLobby) vào cơ sở dữ liệu.<br>6. Hệ thống hiển thị thông báo thành công và danh sách các phòng vừa tạo. |
| **Luồng ngoại lệ** | - Ở bước 3, nếu số lượng người chơi không đủ để chia phòng, hệ thống báo lỗi và hủy thao tác.<br>- Nếu lỗi kết nối CSDL, hiển thị thông báo "Lỗi máy chủ" và dừng quá trình. |

**Bảng 3.2: Đặc tả Use Case "Báo cáo kết quả ván đấu"**

| Thuộc tính | Mô tả chi tiết |
| :--- | :--- |
| **Tên Use Case** | Báo cáo kết quả ván đấu |
| **Tác nhân (Actor)** | Host (Trưởng phòng) |
| **Mục đích** | Host nhập thứ hạng thực tế của trận đấu (từ Top 1 đến Top 8) và gửi cho Admin phê duyệt. |
| **Tiền điều kiện** | Host đã đăng nhập, đã được phân bổ vào phòng và trận đấu đã kết thúc. |
| **Luồng sự kiện chính** | 1. Host chọn phòng đấu của mình trên giao diện Hệ thống.<br>2. Host chọn thứ hạng (Top 1-8) tương ứng cho từng người chơi trong phòng (thông qua dropdown).<br>3. Host nhấn nút "Gửi kết quả".<br>4. Hệ thống validate để đảm bảo không có thứ hạng nào bị trùng lặp.<br>5. Hệ thống lưu kết quả vào CSDL với trạng thái "Pending" (Chờ duyệt).<br>6. Thông báo thành công tới Host. |
| **Luồng ngoại lệ** | - Ở bước 4, nếu Host nhập 2 người cùng 1 thứ hạng (VD: Hai người Top 1), hệ thống chặn lại và báo lỗi "Thứ hạng không được trùng lặp".<br>- Nếu Host chưa nhập đủ 8 người, nút "Gửi kết quả" bị vô hiệu hóa. |


### 3.3 Thiết kế Hành vi / Luồng xử lý
Một trong những quy trình phức tạp nhất trong hệ thống là luồng **Ghi nhận và Phân phối kết quả trận đấu**. Quá trình này đòi hỏi sự tương tác của cả 3 Actor và tính năng Real-time.

**Logic hoạt động:**
1. Host gửi điểm lên hệ thống. Kết quả được lưu tạm ở trạng thái Chờ duyệt.
2. Admin nhận được thông báo, vào kiểm tra. Khi Admin nhấn "Phê duyệt" (Approve), Server sẽ cập nhật trạng thái kết quả, quy đổi Top (1-8) thành Điểm số tương ứng.
3. Ngay lập tức, Server lưu Bảng xếp hạng mới vào Database, đồng thời gọi đến SignalR Hub.
4. SignalR Hub phát (broadcast) bảng xếp hạng mới nhất đến toàn bộ Player đang mở trang web.

> 📌 **PROMPT NHỜ AI VẼ SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM):**
> ```text
> Hãy viết mã PlantUML vẽ Sơ đồ Tuần tự (Sequence Diagram) cho quy trình "Báo cáo và Phê duyệt kết quả Real-time".
> Các thực thể tham gia (Participant) theo thứ tự: Host, React_UI, DotNet_API, Database, Admin, SignalR_Hub, Player.
> Luồng chạy:
> 1. Host -> React_UI: Nhập Top 1-8 và bấm Gửi.
> 2. React_UI -> DotNet_API: POST /api/match/submit-result.
> 3. DotNet_API -> Database: Lưu kết quả (Trạng thái Pending).
> 4. DotNet_API --> React_UI: Return Success.
> 5. Admin -> React_UI: Xem danh sách Pending và bấm Approve.
> 6. React_UI -> DotNet_API: PUT /api/match/approve.
> 7. DotNet_API -> Database: Cập nhật trạng thái và Tính điểm người chơi.
> 8. DotNet_API -> SignalR_Hub: Gửi sự kiện UpdateLeaderboard(data).
> 9. SignalR_Hub -> Player: Đẩy dữ liệu Bảng xếp hạng mới qua WebSockets.
> 10. SignalR_Hub -> Host: Đẩy dữ liệu Bảng xếp hạng mới qua WebSockets.
> ```

### 3.4 Thiết kế Cơ sở dữ liệu (Database Design)
Dữ liệu của hệ thống được tổ chức thành các thực thể quan hệ chặt chẽ với nhau. 

*(Vị trí này bạn dán hình ảnh Sơ đồ ERD từ prompt PlantUML)*

> 📌 **PROMPT VẼ SƠ ĐỒ ERD (Thực thể Liên kết):**
> ```text
> Viết mã PlantUML vẽ ERD cho 4 bảng:
> 1. Accounts: Id (PK), Email, RiotId, PasswordHash, Role, IsApproved
> 2. Tournaments: Id (PK), Name, MaxPlayers, Status
> 3. MatchLobbies: Id (PK), TournamentId (FK), RoundNumber, LobbyName
> 4. MatchResults: Id (PK), MatchLobbyId (FK), PlayerId (FK), Placement, Score
> Quan hệ: Tournaments (1) -- (N) MatchLobbies; MatchLobbies (1) -- (N) MatchResults; Accounts (1) -- (N) MatchResults.
> ```

Dưới đây là Từ điển dữ liệu (Data Dictionary) chi tiết cấu trúc của các bảng cốt lõi trong CSDL SQL Server:

**Bảng 3.3: Từ điển dữ liệu bảng Accounts (Tài khoản người dùng)**
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | Int | Khóa chính (PK), Identity | Mã định danh người dùng tự tăng |
| `Email` | NVarChar(100) | Unique, Not Null | Email dùng để đăng nhập |
| `RiotId` | NVarChar(50) | Unique, Not Null | Tên trong game (VD: Kudo#VN1) |
| `PasswordHash` | NVarChar(MAX) | Not Null | Mật khẩu đã được mã hóa BCrypt |
| `Role` | NVarChar(20) | Not Null | Vai trò (Player, Admin, Host) |
| `IsApproved` | Bit (Boolean)| Default 0 | Trạng thái phê duyệt (1=Đã duyệt) |

**Bảng 3.4: Từ điển dữ liệu bảng MatchLobbies (Phòng đấu)**
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | Int | Khóa chính (PK), Identity | Mã định danh phòng đấu |
| `TournamentId`| Int | Khóa ngoại (FK), Not Null | Thuộc về giải đấu nào |
| `RoundNumber` | Int | Not Null | Vòng đấu thứ mấy (1, 2, 3...) |
| `LobbyName` | NVarChar(50) | Not Null | Tên phòng (VD: Phòng A - Vòng 1) |
| `Status` | NVarChar(20) | Not Null | Trạng thái (Pending, Completed) |

**Bảng 3.5: Từ điển dữ liệu bảng MatchResults (Kết quả ván đấu)**
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
| :--- | :--- | :--- | :--- |
| `Id` | Int | Khóa chính (PK), Identity | Mã định danh dòng kết quả |
| `MatchLobbyId`| Int | Khóa ngoại (FK), Not Null | Trỏ đến phòng đấu |
| `PlayerId` | Int | Khóa ngoại (FK), Not Null | Trỏ đến người chơi (Accounts) |
| `Placement` | Int | Check (1-8), Not Null| Thứ hạng đạt được (Top 1 -> Top 8)|
| `Score` | Int | Not Null | Điểm số quy đổi từ thứ hạng |

### 3.5 Thiết kế Giao diện (UI/UX)
Giao diện của hệ thống CTC được thiết kế với triết lý tối giản, trực quan và mang đậm phong cách eSports.
- **Trải nghiệm người dùng (UX):** Áp dụng kiến trúc Single Page Application (SPA), người dùng khi chuyển giữa trang Dashboard, trang Báo cáo điểm hay Bảng xếp hạng sẽ không bị tải lại trang (reload) gây gián đoạn. Các thông báo lỗi (Toast Notification) được xuất hiện ở góc màn hình để phản hồi ngay lập tức.
- **Tông màu chủ đạo (Color Palette):** Giao diện sử dụng nền đen mờ (`#0f0606`) làm chủ đạo (Dark Mode) để không gây chói mắt. Các nút bấm và tiêu đề quan trọng được nhấn mạnh bằng màu Đỏ sẫm (`#650000`) và Vàng Gold (`#ffcc00`) tạo sự kịch tính và sang trọng giống với thiết kế của game Đấu Trường Chân Lý.

*(Vị trí này bạn chèn các ảnh chụp màn hình Giao diện Đăng nhập, Dashboard Admin và Bảng xếp hạng từ web của bạn)*