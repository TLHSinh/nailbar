# Đi làm nail online

Bản chơi thử 3D cho tiệm nail trên trình duyệt. Tại `/`, người chơi **là khách hàng**: chọn một trong ba mẫu ngoại hình V4, nhập tên hiển thị, vào tiệm, gặp lễ tân NPC **Hue Trinh**, chọn dịch vụ, tự đi tới ghế, ngồi chờ thợ NPC nam **Quang Tran** rồi thiết kế bộ móng. Tên của cả ba nhân vật hiện trên đầu trong cảnh 3D. Sau khi xem kết quả, người chơi đứng dậy để khám phá hoặc chọn dịch vụ tiếp. Bản này chạy offline trong một tab; phòng nhiều người trước đây vẫn ở `/?view=legacy-online`.

Xem ảnh MVP [sau tối ưu trên desktop](docs/perf-after-desktop.png) và [trong viewport điện thoại](docs/perf-after-mobile.png); [ảnh trước tối ưu](docs/mvp-preview-desktop.png) dùng để đối chiếu nội thất V3. Ảnh [desktop cũ](docs/preview-3d-desktop.png) và [mobile cũ](docs/preview-3d-mobile.png) ghi lại phiên bản phòng nhiều người trước đây.

## Mô hình tiệm V2

Mở `http://localhost:5173/?view=salon-v2` để xem **riêng kiến trúc và nội thất**, không có nhân vật. Có thể xoay/phóng bằng chuột hoặc cảm ứng và chọn chín góc camera. Phòng ước lượng khoảng 12 × 22,5 × 5,18 m, với **bốn bộ bàn manicure và bốn bộ ghế pedicure**; quầy lễ tân đã dịch về cửa, các trạm được đặt gần nhau hơn. Hai ghế manicure ở hai cạnh dài của bàn, còn ghế pedicure tựa lưng vào tường phải. Kiến trúc dựng bằng hình học Three.js trong [`apps/web/src/game/SalonEnvironmentV2.ts`](apps/web/src/game/SalonEnvironmentV2.ts). Bàn ghế V3 là hai GLB tự dựng bằng Blender, có [file `.blend` và script dựng lại](packages/assets/README.md). Xem [báo cáo mô hình V2/V3](docs/SALON_V2_MODEL.md) để biết các kích thước tạm tính và giới hạn hiện tại.

Mở `http://localhost:5173/?view=avatars` để xoay/phóng **tám asset nhân vật 3D V4**: một nam và ba nữ nhân viên, bé gái con chủ tiệm, ba mẫu khách. V4 có mesh đầu được chỉnh thêm và texture da UV riêng; xem [ảnh chính diện, góc 3/4, cận mặt, file Blender và đánh giá giới hạn](docs/AVATARS_V4.md). Bản chơi chọn được ba mẫu khách; lễ tân và thợ dùng các mẫu nhân viên. Tay/chân chuyển động theo chu kỳ bước chân; GLB gốc chưa có skeleton, còn tư thế ngồi và thao tác làm móng là hoạt ảnh đơn giản.

## Chạy thử

Yêu cầu Node.js 24+ và trình duyệt có WebGL. Chạy `npm install`, sau đó `npm run dev`. Mở `http://localhost:5173`: chọn mẫu ngoại hình, nhập tên 2–24 ký tự rồi nhấn **Vào tiệm**. Dùng WASD/phím mũi tên để đi, chạm sàn để đi tới, kéo để xoay camera, nhấn **E**, chạm quầy hoặc nút **Gặp lễ tân**. Khi chạm sàn, nhân vật đi thẳng tới điểm chọn nếu không có vật cản, xoay mượt theo đường đi và camera tiếp tục bám hướng nhìn lúc dừng. Sau khi kéo xoay thủ công, camera chờ một lát trước khi tự bám lại. Bảng hướng dẫn nhỏ mặc định mở, nhấn **−** để thu thành bong bóng chat và chạm bong bóng để mở lại. Tại quầy lễ tân, nhấn **×**, **Escape** hoặc **Để sau, tiếp tục khám phá tiệm** để rời menu mà không chọn dịch vụ. Chọn **Sơn gel**, **Vẽ móng**, **Chăm sóc móng** hoặc **Chăm sóc chân**; hệ thống xếp một trong bốn bàn manicure hoặc bốn ghế pedicure đúng loại. Nhân vật tự đi và ngồi, Quang Tran tới vị trí phục vụ. Chọn dáng móng, màu, họa tiết rồi chạm vào từng móng trong bảng thiết kế; làm đủ năm móng để xem kết quả. Nhấn **Đứng dậy và khám phá** để trả ghế và tiếp tục chơi. Thời gian dịch vụ là thông tin dự kiến, không phải đồng hồ chờ thật. Bản chơi cục bộ chưa đồng bộ nhiều người.

Nút **Đánh lễ tân 1 cái** là tương tác vui chỉ có trong bản offline: khách đi tới quầy, Hue Trinh đi vòng qua cạnh quầy, phản ứng rồi trở về chỗ theo cùng lối đi. Câu **“Hue Trinh đang khóc huhu”** xuất hiện trong bong bóng trên bảng tên của cô; bảng hướng dẫn tự thu nhỏ để không che câu thoại. Chức năng nằm riêng trong [`receptionPrank.ts`](apps/web/src/game/mvp/receptionPrank.ts); đặt `ENABLE_RECEPTION_PRANK = false` để ẩn và ngừng chạy ngay, hoặc xóa file cùng các chỗ gọi để loại bỏ hoàn toàn. Nó không ảnh hưởng chọn dịch vụ hay phòng nhiều người.

Ảnh [chọn nhân vật](docs/customer-game-select-mobile.png), [bảng hướng dẫn thu nhỏ](docs/customer-game-guide-closed-mobile.png), [camera theo hướng đi](docs/customer-game-camera-follow-mobile.png), [gặp lễ tân](docs/customer-game-reception-mobile.png), [Quang Tran phục vụ](docs/customer-game-technician-mobile.png), [thiết kế móng](docs/customer-game-design-mobile.png), [kết quả](docs/customer-game-mobile.png) được chụp ở viewport điện thoại; [ảnh desktop](docs/customer-game-camera-follow-desktop.png) cho thấy góc camera khi đổi hướng. Bảng thiết kế hiện là cận cảnh SVG tương tác; màu sơn chưa được gắn lên mesh bàn tay 3D. Bản chơi chưa có thanh toán, đặt lịch, lưu thiết kế hay trò chuyện.

Để thử phòng nhiều người trước đây, mở `http://localhost:5173/?view=legacy-online` trên hai tab với hai tên khác nhau. Máy chủ chạy ở `http://localhost:3001`; `GET /health` trả tình trạng dịch vụ. Phòng cũ vẫn có luồng quầy tiếp tân, ba ghế và đồng bộ ghế.

`npm run check` kiểm tra TypeScript; `npm test` kiểm tra luồng khách hàng, đường đi tới tám trạm, phân ghế và quy tắc phòng/ghế cũ; `npm run build` tạo bản production. Có thể chạy `node tests/customer-game-smoke.mjs` khi Vite đang mở trên cổng 5173 và máy có Chrome tại đường dẫn Windows trong script để thử luồng tự động ở viewport điện thoại. Phòng online cũ giữ trạng thái trong bộ nhớ: khởi động lại máy chủ sẽ xóa phiên. Mã khách trong `sessionStorage` giúp nối lại sau khi mạng chập chờn; đây chưa phải cơ chế xác thực cho website công khai. `DATABASE_URL` trong `.env.example` dành cho giai đoạn PostgreSQL, chưa được dùng.

MVP dùng GLB nội thất gộp theo vật liệu và instancing cho tám trạm, tắt bóng đổ thời gian thực; trang xem mô hình V2 vẫn dùng GLB V3 gốc để đối chiếu. Viewport điện thoại và desktop tự điều chỉnh độ phân giải; cửa sổ lớn được giới hạn khoảng 3,2 triệu pixel render ban đầu. Nếu Chrome giật mạnh, kiểm tra tăng tốc đồ họa tại `chrome://settings/system` và GPU tại `chrome://gpu`. Xem [báo cáo đo FPS trước/sau](docs/PERFORMANCE_AUDIT_MVP.md) và [cách dựng lại GLB game](packages/assets/README.md).

## Cấu trúc

```text
apps/web/          React, Vite, Three.js; màn hình khách chơi và cảnh 3D
apps/server/       Express, Socket.IO; quy tắc và trạng thái phòng
packages/shared/   Zod schema và kiểu thông điệp dùng chung
packages/assets/   Quy ước mô hình, texture và âm thanh
docs/              Lộ trình, kiến trúc và hướng dẫn đồ họa
database/          Migration PostgreSQL cho giai đoạn dữ liệu bền vững
tests/             Vị trí cho kiểm thử đầu cuối
```

Xem thêm [`docs/STRUCTURE.md`](docs/STRUCTURE.md) để biết vị trí từng tính năng và ranh giới giữa web, máy chủ, dữ liệu. Nghiên cứu cảnh 3D và nguồn mô hình nằm ở [`docs/3D_RESEARCH.md`](docs/3D_RESEARCH.md); phân tích nền ở [`NAIL_ONLINE_TECH_PLAN.md`](NAIL_ONLINE_TECH_PLAN.md). Dự án được viết mới, không sao chép mã hoặc tài sản từ các trang tham khảo.
