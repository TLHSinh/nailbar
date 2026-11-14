# Đề xuất kỹ thuật: Đi làm nail online

Ngày khảo sát: 09/11/2026. Tài liệu này mô tả một website công khai, chơi trên điện thoại và máy tính, nơi mỗi khách điều khiển nhân vật của chính mình trong tiệm nail ảo. Đặt lịch tại tiệm thật là một chức năng riêng và được phân biệt rõ với dịch vụ mô phỏng.

## 1. Kết luận kiến trúc

**Khuyến nghị:** xây một dự án mới bằng TypeScript, React, Phaser 4, Node.js và Socket.IO; dùng PostgreSQL cho dữ liệu dịch vụ, mẫu móng, đặt lịch và người dùng. Bắt đầu với một máy chủ ứng dụng và một phòng tiệm 2D góc nghiêng. Chỉ thêm Redis và nhiều máy chủ khi đo được nhu cầu thực tế.

Repo tham khảo `mashupsolution/tu-tien-online` có giá trị như ví dụ về cách tổ chức dự án, dựng cảnh bằng Phaser, hợp đồng dữ liệu dùng chung, quản trị, mô phỏng và kiểm thử. Không nên biến trực tiếp repo đó thành website công khai: nó được thiết kế cho người phát TikTok LIVE chạy ứng dụng trên máy cá nhân, còn người xem tham gia qua bình luận/quà tặng; `/game` và `/overlay` là màn hình phát, không phải trình chơi độc lập của từng khách. Máy chủ chỉ lắng nghe `127.0.0.1` và các API quản trị không có xác thực người dùng theo mô hình website công khai. Nguồn: [README](https://github.com/mashupsolution/tu-tien-online), [PRODUCT.md](https://raw.githubusercontent.com/mashupsolution/tu-tien-online/main/PRODUCT.md), [index.ts](https://raw.githubusercontent.com/mashupsolution/tu-tien-online/main/apps/server/src/index.ts), [app.ts](https://raw.githubusercontent.com/mashupsolution/tu-tien-online/main/apps/server/src/app.ts).

### Phần tái sử dụng ở mức ý tưởng

| Trong repo tu tiên | Áp dụng cho tiệm nail | Cần thay đổi |
| --- | --- | --- |
| `apps/web` với React + Phaser | Giao diện web và cảnh 2D | Camera ngang/góc nghiêng, điều khiển chạm, màn cận cảnh bàn tay |
| `apps/server` với engine có thẩm quyền | Máy chủ quyết định trạng thái nhân vật/dịch vụ | Thêm người chơi độc lập, phòng, điều hướng, ghế, booking |
| `packages/shared` và Zod | Kiểu dữ liệu và kiểm tra thông điệp | Hợp đồng `join`, `move`, `interact`, `service`, `design`, `react` |
| WebSocket snapshot | Đồng bộ những người trong phòng | Chỉ gửi trạng thái của phòng, snapshot lúc vào + các thay đổi; tránh phát toàn bộ trạng thái cho mọi khách |
| Chế độ mock | Thử người chơi giả và hành động giả | Giả lập nhiều trình duyệt, mất kết nối và ghế bận |
| `/admin` | Quản lý mẫu/dịch vụ, duyệt nội dung, xem lịch | Đăng nhập và phân quyền thật, nhật ký thao tác |
| SQLite lưu một JSON `state` | Thích hợp để học cơ chế của bản demo | Dữ liệu công khai/booking cần bảng có ràng buộc, truy vấn và sao lưu rõ ràng |

Trong [app.ts](https://raw.githubusercontent.com/mashupsolution/tu-tien-online/main/apps/server/src/app.ts), máy chủ gửi snapshot cho mọi WebSocket client khi trạng thái đổi và mỗi 2 giây. [Store hiện tại](https://raw.githubusercontent.com/mashupsolution/tu-tien-online/main/apps/server/src/store.ts) lưu trạng thái chung vào một bản ghi JSON và sự kiện vào SQLite. Cách này hợp với một cảnh LIVE giới hạn 40 nhân vật nhưng không nên bê nguyên sang nhiều phòng và lịch hẹn kinh doanh. README của repo cũng ghi rõ chưa nên triển khai công khai như dịch vụ có xác thực.

**Giấy phép:** tại thời điểm khảo sát không thấy tệp LICENSE trong danh sách gốc và `package.json` không khai báo license. Vì vậy chỉ dùng repo làm tài liệu tham khảo; trước khi sao chép mã, hình, âm thanh hoặc làm bản phái sinh thương mại, cần xác minh quyền sử dụng với chủ repo. [GitHub giải thích về repo không có giấy phép](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

## 2. Sản phẩm cần xây

### Vòng trải nghiệm chính

1. Khách mở URL trên điện thoại, chọn tên hiển thị và nhân vật. Hệ thống cấp phiên khách tạm, không bắt đăng ký.
2. Khách vào sảnh, thấy tối đa khoảng 20–30 nhân vật trong cùng phòng; chạm điểm đến để nhân vật đi tới. Nếu phòng đầy, chuyển sang phòng giống hệt hoặc vào phòng riêng bằng liên kết mời.
3. Tại quầy, khách chọn dịch vụ mô phỏng: sơn gel, vẽ móng, đắp móng, chăm sóc móng. Mỗi dịch vụ có thời lượng trải nghiệm, mẫu hợp lệ và khoảng giá dịch vụ thật do chủ tiệm nhập.
4. Nhân vật đi đến một ghế còn trống. Máy chủ giữ ghế trong thời gian ngắn, tránh hai người ngồi cùng ghế. Rời phòng hoặc hết thời gian thì trả ghế.
5. Mở giao diện cận cảnh bàn tay: chọn hình dáng, độ dài, màu nền, họa tiết, điểm nhấn. Hiển thị giá tham khảo và thời gian làm thật nếu có. Thao tác mô phỏng ngắn tạo cảm giác tham gia, không phụ thuộc vào kỹ năng để có kết quả đẹp.
6. Khi hoàn thành, bộ móng xuất hiện trên tay nhân vật ở mức đơn giản và trên ảnh cận cảnh ở mức chi tiết. Khách nhận thẻ ảnh mẫu có mã thiết kế.
7. Khách có thể lưu ảnh, sao chép liên kết, gửi bạn bè, thả cảm xúc cho thành quả công khai và chuyển sang đặt lịch thật. Đặt lịch mang theo mã thiết kế để nhân viên xem được mẫu.

### Tương tác xã hội nên có theo thứ tự

| Ưu tiên | Tính năng | Lý do |
| --- | --- | --- |
| P0 | Thấy người khác, tên và hoạt ảnh; biểu cảm định sẵn | Tạo cảm giác cùng ở trong tiệm, ít gánh kiểm duyệt |
| P0 | Mời bạn bằng liên kết phòng | Có lý do chia sẻ và vào cùng lúc |
| P1 | Bình chọn hai mẫu móng, chụp ảnh nhóm | Nội dung tự nhiên để chia sẻ |
| P2 | Chat chữ tự do | Chỉ thêm khi có chặn spam, báo cáo, ẩn và người vận hành duyệt được |
| P3 | Sự kiện theo mùa, khách mời hoặc LIVE | Sau khi vòng trải nghiệm chính hoạt động tốt |

Không xây bảng xếp hạng dựa trên chi tiêu/quà tặng trong bản đầu. Nên thưởng bằng huy hiệu và mẫu chia sẻ; doanh thu chính cần được đo từ lịch hẹn thật.

## 3. Công nghệ được chọn

| Lớp | Công nghệ | Vai trò và lý do |
| --- | --- | --- |
| Web | React + TypeScript + Vite | Trang vào tiệm, catalog, bảng chọn mẫu, booking, quản trị. Cùng hệ công nghệ với repo tham khảo. |
| Cảnh chơi | Phaser 4 | Nhân vật, hoạt ảnh, bản đồ 2D, điểm tương tác và camera. Phaser 4 đã phát hành và repo tham khảo dùng 4.2.1. |
| Bản đồ | Tiled hoặc dữ liệu JSON tự thiết kế | Phân lớp nền/đồ vật/tường đi được/điểm đứng; pathfinding trên lưới nhỏ. |
| Thời gian thực | Socket.IO trên Node.js | Phòng, thông điệp hai chiều, ngắt/kết nối lại. Chấp nhận đổi từ `ws` của repo vì website có nhiều người chơi/phòng. |
| API | Express + Zod | Dịch vụ, mẫu, booking, phiên, admin; kiểm tra dữ liệu ở ranh giới. Có thể dùng Express 5 như repo. |
| Dữ liệu | PostgreSQL | Catalog, mẫu móng, phiên người dùng, lịch hẹn, trạng thái duyệt, sự kiện đo lường. |
| Hình | Lưu trữ đối tượng tương thích S3 + CDN | Ảnh mẫu nail và ảnh kết quả; database chỉ giữ metadata/URL. Bản thử nhỏ có thể bắt đầu bằng tài nguyên tĩnh có sẵn. |
| Xác thực | Phiên khách tạm + tài khoản quản trị | Khách chơi nhanh; nhân viên có quyền riêng. Khi đặt lịch mới yêu cầu thông tin liên hệ cần thiết. |
| Kiểm thử | Vitest hoặc Node test runner + Playwright | Logic phòng/ghế/booking; luồng hai trình duyệt, thiết bị di động và quản trị. |
| Triển khai | Hosting tĩnh/CDN cho web; máy chủ Node hỗ trợ WebSocket; PostgreSQL được sao lưu | Không đưa máy chủ trò chơi lên nền chỉ chạy hàm ngắn hạn nếu không hỗ trợ kết nối dài. |

Nguồn kỹ thuật: [Phaser 4](https://phaser.io/news/2026/05/phaser-3-vs-phaser-4), [Socket.IO rooms](https://socket.io/docs/v4/rooms/), [Socket.IO về kết nối lại](https://socket.io/docs/v4/server-options), [PostgreSQL locking](https://www.postgresql.org/docs/18/explicit-locking.html).

**Lựa chọn `ws` hay Socket.IO:** giữ `ws` nếu mục tiêu chỉ là một cảnh trình chiếu đơn giản, không có nhiều phòng. Với nhiều khách tự di chuyển và vào/ra phòng, Socket.IO giúp tiết kiệm công làm tầng giao tiếp. Dù dùng thư viện nào, việc xác nhận vị trí, ghế và thiết kế hợp lệ vẫn phải nằm ở máy chủ.

**SQLite hay PostgreSQL:** một bản chơi thử cục bộ có thể dùng SQLite. Khi mở website để khách đặt lịch, PostgreSQL phù hợp hơn vì cần dữ liệu có cấu trúc, giao dịch và chống đặt trùng giờ. Không chuyển lịch hẹn thành một phần của JSON trạng thái game.

## 4. Mô hình thời gian thực

### Trạng thái máy chủ quản lý

```text
roomId
  players: playerId, displayName, appearance, position, facing, action,
           currentStationId, selectedDesignId, lastSeenAt
  stations: stationId, type, occupantId, reservedUntil
  roomTheme, capacity, version
```

Client gửi **ý định** (`moveTo`, `useStation`, `chooseService`, `applyDesign`, `emote`), không gửi vị trí/điểm/thành quả cuối cùng để máy chủ tin ngay. Máy chủ kiểm tra phiên, phòng, tốc độ di chuyển, vùng được phép, ghế còn trống và nội dung mẫu; sau đó phát kết quả cho người trong phòng. Gửi snapshot khi khách vào hoặc kết nối lại; giữa các snapshot chỉ phát thay đổi. Vị trí có thể gửi khoảng 5–10 lần/giây và client nội suy để chuyển động mượt; các con số này là điểm khởi đầu cần đo trên điện thoại thật.

### Thông điệp tối thiểu

```text
client -> server: room.join { roomId, inviteCode? }
client -> server: player.moveTo { x, y, requestId }
client -> server: station.use { stationId, requestId }
client -> server: service.select { serviceId }
client -> server: design.update { shapeId, lengthId, colorId, artIds[] }
client -> server: player.emote { emoteId }
server -> client: room.snapshot { version, players[], stations[] }
server -> room:  player.changed / station.changed / design.completed
server -> client: action.rejected { requestId, reason }
```

Mỗi hành động thay đổi trạng thái cần `requestId` để tránh lặp khi mạng chập chờn. Phiên người chơi ổn định phải tách khỏi Socket.IO `socket.id`, vì ID kết nối có thể đổi sau khi tải lại trang hoặc mất mạng. [Tài liệu Socket.IO](https://socket.io/docs/v4/server-socket-instance).

### Trạng thái làm nail

```text
enter -> browsing -> selecting_service -> walking_to_chair
      -> seated -> designing -> mini_game -> reveal -> done
```

Mỗi bước có sự kiện vào/ra và timeout. Nếu mất kết nối khi ngồi ghế, giữ chỗ ngắn để khách quay lại rồi giải phóng. Thiết kế đang làm có thể lưu tạm; ảnh kết quả chỉ được tạo sau khi cấu hình đã hợp lệ. Không để hoạt ảnh ở client quyết định lịch hẹn hoặc giá.

## 5. Dữ liệu và API nghiệp vụ

### Bảng dữ liệu cốt lõi

| Bảng | Trường chính |
| --- | --- |
| `services` | id, tên, mô tả, thời lượng thật, giá tham khảo, trạng thái hiển thị |
| `designs` | id, dịch vụ, kiểu móng, màu, họa tiết, ảnh, nhãn, độ khó, trạng thái duyệt |
| `guest_sessions` | id, mã phiên băm, ngày tạo, hạn dùng |
| `creations` | id, guest/session, cấu hình thiết kế, ảnh kết quả, chế độ riêng tư, ngày tạo |
| `staff`, `availability` | nhân viên, dịch vụ làm được, khung giờ mở |
| `appointments` | id, creation_id, dịch vụ, ngày giờ, liên hệ, trạng thái, mã chống gửi trùng |
| `moderation_reports` | nội dung bị báo cáo, loại, trạng thái, người xử lý |
| `events` | loại sự kiện, phiên, thời điểm, nguồn chiến dịch; không lưu thêm dữ liệu cá nhân không cần thiết |

API HTTP dự kiến: `GET /api/services`, `GET /api/designs`, `POST /api/creations`, `GET /api/availability`, `POST /api/appointments`, `GET /api/appointments/:id`, `GET/PUT /api/admin/...`. Admin cần xác thực riêng. Đặt lịch cần giao dịch tại máy chủ và một ràng buộc hoặc cơ chế khóa để hai yêu cầu cùng lúc không chiếm một chỗ. Nếu tiệm đã có phần mềm lịch hẹn, nên tích hợp với hệ thống đó thay vì duy trì hai lịch độc lập.

## 6. Hình ảnh và hiệu năng

Thiết kế hai lớp hình:

1. **Tiệm và nhân vật:** 2D góc nghiêng, sprite ít khung hình, các vùng chạm lớn. Đây là lớp tạo cảm giác nhập vai và nhìn thấy bạn bè.
2. **Bàn tay và móng:** hình vector/canvas hoặc lớp ảnh chồng để đổi dáng, màu, hoa văn thật rõ. Đây là lớp quyết định khách có muốn lưu mẫu và đặt lịch không.

Nhân vật ở góc nhìn toàn tiệm chỉ cần hiển thị màu/họa tiết nhận biết được; không nên cố vẽ chi tiết móng cực nhỏ lên sprite. Mẫu nail do tiệm thật cung cấp nên có ảnh chụp thật, kèm nhãn `Có thể làm tại tiệm`. Mẫu chỉ mang tính sáng tạo nên ghi `Mô phỏng`; báo giá cuối cùng và thời gian làm do tiệm xác nhận.

Mốc kiểm tra đầu: tải được trên điện thoại phổ thông, thao tác chạm không che cảnh, ổn định khoảng 30 FPS với 20 nhân vật trong phòng, hình và âm thanh tải theo nhu cầu, ảnh chia sẻ có phương án tải xuống khi `Web Share API` không được hỗ trợ. [MDN về Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API).

## 7. An toàn vận hành

- Trang công khai dùng HTTPS/WSS; kiểm tra Origin và phiên khi mở socket; xác nhận quyền với từng hành động, giới hạn kích thước/tần suất thông điệp. [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html).
- Mặc định chỉ có biểu cảm và câu nói định sẵn. Nếu bật chat tự do: lọc từ, giới hạn tần suất, chặn/ẩn người chơi, báo cáo, duyệt và nhật ký xử lý.
- Tên nhân vật, chat và lời nhắn là văn bản không tin cậy; không render thành HTML. Quản trị dùng vai trò và phiên riêng, không dựa vào tham số `role=admin` trên URL socket như repo cục bộ.
- Nếu cho khách tải ảnh móng lên: giới hạn loại/dung lượng, xác minh nội dung tệp, đổi tên tệp, lưu riêng và duyệt trước khi công khai. [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- Thông tin đặt lịch chỉ thu thập khi cần đặt lịch; nêu mục đích dùng, thời hạn lưu và cách yêu cầu xóa. Tránh đưa số điện thoại vào trạng thái phòng hoặc ảnh chia sẻ.
- Thiết lập sao lưu cơ sở dữ liệu, theo dõi lỗi, tỷ lệ mất kết nối, phòng đầy và thời gian tải trang. Test khôi phục bản sao lưu trước khi mở rộng.

## 8. Các giai đoạn triển khai và nghiệm thu

### Giai đoạn 0: xác định dịch vụ và thiết kế

Đầu vào cần từ tiệm: tên/nhận diện, menu và khoảng giá, 10–20 mẫu làm được thật, ảnh không gian hoặc phong cách mong muốn, giờ làm, số nhân viên/ghế, cách nhận lịch hiện tại. Kết quả: sơ đồ phòng, luồng màn hình, quy tắc `Có thể làm tại tiệm` và danh sách dữ liệu cần nhập.

### Giai đoạn 1: bản chơi một người

Một phòng 2D, nhân vật đi bằng chạm, các điểm tương tác, chọn dịch vụ, ghế, thiết kế bộ móng, trò thao tác ngắn, ảnh kết quả. Có chế độ mock cho nhân vật khác. **Nghiệm thu:** khách dùng điện thoại hoàn thành một lượt mà không cần hướng dẫn và xuất được ảnh rõ.

### Giai đoạn 2: nhiều người cùng phòng

Phiên khách tạm, 20–30 người/phòng, phòng mời bạn, thấy vị trí/hành động, biểu cảm, giữ ghế, kết nối lại. **Nghiệm thu:** hai điện thoại thấy nhau vào, đi, ngồi, đứng dậy và rời phòng; mất mạng rồi quay lại không tạo nhân vật trùng.

### Giai đoạn 3: liên kết kinh doanh

Catalog quản trị, mẫu làm được thật, đặt lịch, chống đặt trùng, xác nhận lịch, đo tỷ lệ từ chơi đến đặt lịch. **Nghiệm thu:** nhân viên nhận đúng mã mẫu, dịch vụ và thời gian; khách thấy tình trạng lịch rõ ràng; không có hai lịch trùng một nguồn lực.

### Giai đoạn 4: cộng đồng và sự kiện

Bình chọn mẫu, chụp nhóm, thử thách theo mùa, quà tặng phi tiền tệ. Chat chữ và LIVE chỉ thêm khi có nhu cầu đo được và người vận hành đủ khả năng kiểm duyệt.

## 9. Thứ tự bắt đầu trong repo mới

```text
nail-online/
  apps/web/              # React, Phaser, trang chơi/đặt lịch
  apps/server/           # HTTP, Socket.IO, room engine, booking
  packages/shared/      # Zod schemas, types, event contracts
  packages/assets/      # ảnh, sprite, atlas, thông tin bản quyền
  tests/                # hai client, ghế, reconnect, booking
  docs/                 # sản phẩm, kiến trúc, quyết định kỹ thuật
```

Làm một **vertical slice** trước: `vào tiệm → đi đến quầy → chọn một mẫu → ngồi ghế → xem bộ móng → chia sẻ`. Sau khi luồng này chạy tốt trên hai điện thoại, mới thêm nhiều mẫu, phòng và booking. Cách này cho thấy ngay liệu trải nghiệm có hấp dẫn và chuyển được khách tới tiệm hay không.

## 10. Điều cần xác minh trước khi chốt bản triển khai

- Tiệm đang nhận lịch bằng phần mềm nào, hay chỉ qua điện thoại/Zalo/Facebook? Đây là quyết định tích hợp quan trọng nhất.
- Khách mục tiêu dùng điện thoại là chính hay bạn muốn phát trên TikTok LIVE song song? Nếu cần LIVE, `/overlay` nên là một đầu ra bổ sung, không phải cách chơi chính.
- Chủ repo tu tiên có cho phép sử dụng mã/tài sản của họ cho dự án thương mại không? Nếu chưa rõ, triển khai độc lập theo kiến trúc đã phân tích.
- Cần thử hiệu năng thật trên thiết bị của khách và lưu lượng dự kiến trước khi ấn định số người/phòng. Các mức 20–30 người, 5–10 cập nhật vị trí/giây và 30 FPS trong tài liệu là mục tiêu thử nghiệm, không phải kết quả đo đã có của web nail.
