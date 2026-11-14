# Kiểm tra hiệu năng bản chơi thử 3D

Ngày kiểm tra: 2026-11-11. Chrome chạy trên Windows với GPU `NVIDIA GeForce RTX 3060 Laptop GPU / Direct3D11`. Đo trang `http://localhost:5173/` ở 1365 × 768, DPR 1; dùng `requestAnimationFrame` để tính FPS và đếm lệnh vẽ WebGL. Mỗi phép A/B giữ cùng cảnh và vị trí camera trong khoảng 6–8 giây. Các con số là phép đo trên máy này, không phải cam kết cho mọi thiết bị.

| Điều kiện | FPS xấp xỉ | Lệnh vẽ/khung |
| --- | ---: | ---: |
| Bản dev, đứng yên ở cửa | 33–36 | 3.131 |
| Bản production, cùng góc nhìn | 35,7 | 3.131 |
| Tắt toàn bộ bóng đổ tạm thời | 48 | 2.030 |
| Ẩn 4 trạm manicure và 4 trạm pedicure tạm thời | 58,3 | 1.405 |
| Chỉ cho mesh lớn đổ bóng (567 thay vì 1.103) | 39,6 | 2.595 |
| Giảm render scale xuống 0,75 | 35,5 | 3.131 |
| Tắt đèn điểm tạm thời | 36,2 | 3.131 |

Mô phỏng viewport điện thoại 390 × 844, DPR 3 trên **cùng GPU laptop**: canvas thực tế 585 × 1.266 vì pixel ratio được chặn ở 1,5; FPS đứng yên 41,7 và 2.282 lệnh vẽ/khung. Đây không phải phép đo trên điện thoại thật.

Thời gian từ mở trang đến khi hai nhân vật và nội thất sẵn sàng khoảng 9 giây trên localhost. Bốn GLB cần cho MVP có tổng dung lượng khoảng 3,8 MB. Chúng chứa 300 primitive riêng trước khi nhân bản: 73 ở một trạm manicure, 68 ở một trạm pedicure, 78 ở nhân viên và 81 ở khách. Cảnh sau khi nạp có 1.118 mesh, 1.103 mesh được đánh dấu `castShadow`; riêng tám trạm V3 là 580 mesh. Camera và nội thất lặp lại làm lượng lệnh vẽ thay đổi theo góc nhìn, giải thích vì sao di chuyển có lúc nhanh hơn và có lúc giật hơn.

## Nguyên nhân đã xác nhận

1. [`SalonEnvironmentV2.ts`](../apps/web/src/game/SalonEnvironmentV2.ts) mặc định bật `castShadow` cho gần như mọi mesh, kể cả chi tiết rất nhỏ. [`loadFurnitureV3.ts`](../apps/web/src/game/loadFurnitureV3.ts) bật bóng cho toàn bộ mesh của tám trạm. Một lượt vẽ bổ sung để tạo bóng chiếm khoảng 1.100 lệnh vẽ/khung ở góc đầu.
2. Mỗi trạm GLB là tập hợp nhiều mesh riêng; bốn bản sao vẫn tạo nhiều lệnh vẽ dù dùng chung geometry. Việc ẩn tám trạm cải thiện FPS rõ hơn mọi thay đổi đơn lẻ khác trong phép thử.
3. [`SalonMvpWorld.ts`](../apps/web/src/game/mvp/SalonMvpWorld.ts) render toàn cảnh ở mọi `requestAnimationFrame`. Trước tối ưu, 27–35 ms/khung ở góc đầu chưa đạt cảm giác 60 FPS. Avatar V4 chưa có skeleton, nên bản cũ chỉ dịch chuyển và lắc nhẹ.

Vite dev, số đèn điểm và độ phân giải không phải nguyên nhân chính trong phép đo trên RTX 3060. Giảm pixel ratio vẫn có thể hữu ích trên GPU điện thoại yếu hơn nhưng cần đo bằng thiết bị thật.

## Sau khi triển khai tối ưu

Game dùng hai GLB sinh từ [`nail_furniture_v3.blend`](../packages/assets/source/nail_furniture_v3.blend): 73 → 14 nhóm vật liệu cho manicure và 68 → 14 cho pedicure. Các nhóm này được instancing ở bốn vị trí mỗi loại. File nguồn và GLB chi tiết của trang xem mô hình không đổi. Game tắt toàn bộ bóng đổ thời gian thực như yêu cầu; vật liệu PBR, ánh sáng và hình học V3 vẫn được giữ. Scene còn 582 mesh/InstancedMesh, trong đó 31 InstancedMesh (gồm ba nhóm có sẵn của kiến trúc) và **0 shadow caster** trong gameplay.

| Cùng Chrome/GPU, sau tối ưu | FPS xấp xỉ | Lệnh vẽ/khung | p95 khung |
| --- | ---: | ---: | ---: |
| Desktop 1365 × 768, đứng ở cửa | 56–60 | 952–964 | khoảng 21 ms |
| Desktop, nhân viên di chuyển | 73–82 | 638–645 | khoảng 21 ms |
| Viewport 390 × 844 DPR 3 trên GPU laptop, đứng yên | 68–70 | 799 | khoảng 21 ms |

So [ảnh trước](mvp-preview-desktop.png) với [ảnh sau](perf-after-desktop.png) ở góc cửa và [ảnh điện thoại](perf-after-mobile.png): bàn/ghế, màu sắc và bố cục V3 được giữ; ảnh sau ít chiều sâu do đã bỏ bóng đổ. Kính cửa chính tạm ẩn khi camera gần sát lối vào để tránh lớp màu tam giác trên sàn, tự hiện lại khi camera đi sâu hơn. Luồng tiếp khách → ngồi → hoàn thành Sơn gel đã chạy qua trong Chrome sau thay đổi.

Hai nhân vật hiện có chu kỳ đi bằng cách xoay các nhóm chân, giày, tay áo và bàn tay quanh hông/vai theo quãng đường di chuyển ([khung A](walk-frame-a.png), [khung B](walk-frame-b.png)); đây là hoạt ảnh tay/chân thật trên hình học V4, **chưa phải rig xương/skinning**. Độ phân giải viewport điện thoại tự giảm khi FPS thấp và tăng lại khi có dư hiệu năng. Phép thử CPU chậm làm pixel ratio từ 1,5 xuống 1,0; sau khi bỏ giới hạn, nó tăng lại lên 1,15 trong 24 giây.

Các GLB game khoảng 1,15 MB, tương đương hai GLB trưng bày khoảng 1,11 MB: thay đổi này giảm draw call, chưa giảm đáng kể dung lượng tải. Thời gian tải lần đầu trên localhost vẫn khoảng 9–10 giây. Chưa đo trên điện thoại thật; bước tiếp theo là thử máy tầm trung, sau đó cân nhắc nén mesh/texture, LOD và rig xương cho hoạt ảnh ngồi/làm móng.

## Vì sao cửa sổ ChatGPT mượt hơn Chrome/Edge (đo 2026-11-12)

Trong trình duyệt nhúng ChatGPT, canvas của trang là **582 × 1.144** pixel ở viewport 388 × 763. Một cửa sổ Chrome 2.560 × 1.300 ở DPR 1,5 trước thay đổi render **3.840 × 1.950** pixel: hơn 11 lần số pixel. Cả Chrome và Edge ở profile thử nghiệm sạch đều nhận `NVIDIA GeForce RTX 3060 Laptop GPU / Direct3D11`; vì vậy trình duyệt nhúng không có đặc quyền GPU riêng trong phép thử này.

| Phép thử trên cùng laptop | Canvas | Đứng yên | Di chuyển bằng W |
| --- | ---: | ---: | ---: |
| Chrome, viewport bằng ô ChatGPT, trước thay đổi mới | 582 × 1.144 | 65,8 FPS | 99,2 FPS |
| Chrome, viewport 2.560 × 1.300, trước thay đổi mới | 3.840 × 1.950 | 35,9 FPS | 36,6 FPS |
| Chrome, cùng viewport lớn, sau giới hạn pixel | 2.510 × 1.274 | 56–65 FPS qua hai lượt | khoảng 69 FPS |
| Edge, cùng viewport lớn, sau giới hạn pixel | 2.510 × 1.274 | 68,7 FPS | 75,1 FPS |

Game hiện giới hạn canvas ban đầu khoảng **3,2 triệu pixel** và điều chỉnh pixel ratio trên cả desktop lẫn điện thoại theo FPS, với khoảng trễ và ngưỡng để tránh thay đổi liên tục. [Ảnh Chrome cửa sổ lớn sau thay đổi](perf-wide-desktop-after.png) cho thấy nội thất và chữ vẫn rõ ở mức pixel này. Tại viewport lớn, hai phép đo Chrome trước/sau giữ cùng trang, GPU, DPR và góc khởi đầu. Các số trên lấy từ profile trình duyệt thử nghiệm riêng; không đo trực tiếp profile Chrome/Edge thường dùng của chủ máy.

Đọc riêng khóa cấu hình `hardware_acceleration_mode.enabled` trong `Chrome/User Data/Local State` của profile thường dùng cho giá trị **false**. Khi ép Chrome thử nghiệm dùng SwiftShader thay GPU, renderer chuyển sang phần mềm và FPS rơi xuống dưới 1 ở viewport 1.365 × 768. Đây là phép thử cực đoan, không phải FPS đo trực tiếp trên profile thường dùng, nhưng cho thấy việc tắt tăng tốc đồ họa có thể gây giật rất nặng. Cấu hình Edge không có khóa tắt tương ứng; chưa xác nhận GPU thực tế của profile Edge thường dùng.

Để kiểm tra profile thật: trong Chrome mở `chrome://settings/system`, bật **Use graphics acceleration when available** rồi khởi động lại; xem `chrome://gpu` để xác nhận WebGL dùng GPU. Trong Edge kiểm tra `edge://gpu` và mục tăng tốc đồ họa trong Settings → System and performance. [Google hướng dẫn bật tăng tốc đồ họa](https://support.google.com/meet/answer/9302964/change-your-computer%E2%80%99s-video-and-audio-settings-computer?co=GENIE.Platform%3DDesktop), [Microsoft mô tả vị trí cài đặt Chrome/Edge](https://support.microsoft.com/en-us/topic/exporting-from-clipchamp-troubleshooting-61dad49a-666f-4982-b8a7-8807617ae16a).
