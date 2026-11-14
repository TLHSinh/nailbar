# Mô hình tiệm nail V2 với nội thất V3 — bố cục mở rộng

Tham chiếu: [không gian V2](NAIL_SALON_3D_CONCEPT_V2.md) và [hai concept nội thất V3](FURNITURE_CONCEPT_V3.md). Kiến trúc được dựng bằng Three.js trong [`SalonEnvironmentV2.ts`](../apps/web/src/game/SalonEnvironmentV2.ts); bàn ghế V3 là hai GLB dựng bằng Blender và nạp qua [`loadFurnitureV3.ts`](../apps/web/src/game/loadFurnitureV3.ts). Giao diện xem ở [`SalonViewer.tsx`](../apps/web/src/ui/SalonViewer.tsx). Mở `/?view=salon-v2` sau khi chạy `npm run dev`. Đây là môi trường 3D có thể xoay và kiểm tra từ nhiều góc; không chứa nhân vật.

Ảnh kiểm tra mới từ scene thực: [góc cửa vào trên máy tính](preview-salon-v5-desktop.png), [điện thoại](preview-salon-v5-mobile.png), [từ trên cao](preview-salon-v5-top.png). [Bố cục ba trạm trước đây](preview-salon-v4-top.png) được giữ để đối chiếu.

## Bố cục và kích thước

- Trục X: trái là manicure, phải là pedicure. Trục Z: cửa chính ở khoảng `+11,25`, sofa và hành lang ở khoảng `-11,25`. Trục Y thẳng đứng, sàn tại `0`. Đơn vị code là mét ước lượng.
- Phòng chính: **rộng 12 m, dài 22,5 m, cao 5,18 m**, lối giữa thông thoáng khoảng **6,6 m** sau khi quay ghế. Trước bản nới phòng V4, mô hình là 10 × 18 × 4,8 m. Kích thước hiện vẫn **tạm tính từ ảnh**, chưa đo tại tiệm. Hành lang sau sâu thêm khoảng **5,5 m** theo tỷ lệ scene.
- Tâm **bốn bàn manicure** cách nhau **4 m** theo trục Z (bản trước 5,2 m). Ghế khách và ghế thợ đặt đối diện ở **hai cạnh dài** của mỗi bàn. **Bốn ghế pedicure** quay 90° để lưng sát tường phải, mặt ghế và bồn hướng ra lối giữa; khoảng cách tâm các ghế **4 m** (bản trước 5,75–5,88 m). Bốn hốc đèn tường phải được đặt theo cùng nhịp ghế.
- Quầy lễ tân được dịch **1,2 m về phía cửa** so với bản trước để có khoảng trống với bàn manicure đầu tiên. Tọa độ và khoảng cách là số ước lượng trong scene, chưa phải số đo tiệm thật.
- Tỷ lệ nội thất V3 lấy từ hình chiếu: mặt bàn manicure dài khoảng **2,2 lần** chiều cao mặt bàn; thân ghế spa pedicure cao khoảng **1,5 lần** bề ngang. Các tỷ lệ này dùng để chuẩn hóa mesh, không phải số đo tuyệt đối từ nhà sản xuất.
- Quầy cong ở trước bên trái; bốn bàn manicure theo chiều sâu dọc cửa sổ trái; bốn ghế spa pedicure và bồn đen ở phải; sofa và kệ sơn ở cuối; cửa vòm hành lang cuối phòng bên phải. Không có phòng chức năng mới.

## Đã dựng thành hình học 3D

| Nhóm scene | Hiện trạng |
| --- | --- |
| `01_ARCHITECTURE` | Sàn gỗ gồm các tấm ván instance và texture vân tạo bằng code; tường và trần ô hình học; cửa kính khung vàng; bảy cửa sổ vòm có kính, khung, thanh chia và rèm; bốn hốc tường phải có lòng hốc sâu; hành lang 3D với ba vòm nối tiếp. |
| `02_RECEPTION` | Quầy cong với mặt sáng, thân nan dọc, viền và LED; POS, lọ hoa, đèn, cây. |
| `03_MANICURE` | Bốn bản sao của GLB V3: bàn mặt đá/chân ống chữ U, ghế khách và ghế xoay thợ ở hai cạnh dài, UV/LED tím, lọ sơn, gối kê tay, khay, cốc cọ. Đèn thả là geometry riêng của scene. |
| `04_PEDICURE` | Bốn bản sao của GLB V3 xoay mặt ra lối đi và lưng sát tường phải: ghế spa da nâu với tựa cao và đường chần hình thoi, tay vịn, gối đầu, bảng nút vàng; bồn rỗng đen viền vàng, nước, vòi cổ ngỗng và xe đẩy hai tầng. |
| `05_REAR_LOUNGE` | Sofa hồng nhạt, gối hồng, bàn tròn, thảm oval, hoa và cây. |
| `06_DISPLAY` | Kệ bốn tầng, 100 lọ sơn instance có nắp riêng, hai bảng mẫu nổi. |
| `07_DECORATIONS`, `08_LIGHTING` | Cây xanh, ánh sáng mặt trời từ trái, đèn trần, đèn thả, LED trang trí và bóng tiếp xúc. |
| `09_CAMERAS` | Chín điểm camera: cửa vào, toàn cảnh, manicure, cận cảnh manicure, pedicure, cận cảnh pedicure, lễ tân, sofa/hành lang, trên cao. Kéo/xoay và chụm ngón nhờ OrbitControls. |

Các nhóm, trạm và vật dụng chính có tên riêng để chọn/chỉnh từng phần. Hai GLB nguồn ở [`apps/web/public/models`](../apps/web/public/models) có file Blender chỉnh sửa được trong [`packages/assets/source`](../packages/assets/source) và script tái tạo trong [`tools/blender`](../tools/blender). Bốn trạm mỗi loại clone chung geometry/material khi tải. Ván sàn và lọ sơn kệ sử dụng instances. Material dùng PBR với roughness, metalness và alpha khác nhau.

## Giới hạn và đối chiếu ảnh

- **Kích thước:** chưa có bản đo thực tế, nên chiều rộng, chiều sâu, chiều cao, độ rộng lối đi, khoảng cách bàn/ghế và kích thước đồ nội thất đều là ước lượng. Cần số đo hoặc sơ đồ tiệm để chốt tỷ lệ.
- **Yêu cầu phóng rộng/cao gấp 10 lần ở lượt trước:** bản hiện tại thực hiện yêu cầu mới là nới không gian và khoảng cách giữa trạm, chưa đổi kích thước vật lý lên 100 m/48 m vì sẽ không còn giữ bố cục V2. Nếu cần mức đó, phải xác định lại kích thước tiệm và số lượng khu vực.
- **Độ chi tiết:** bàn/ghế V3 đã có mesh cong và chi tiết tách rời; tấm tựa chần có lưới mesh nổi nhẹ và đường chỉ riêng, nhưng chưa có độ lún sâu hay texture/normal map vải da. Bồn có lòng lõm và mặt nước đơn giản, chưa mô phỏng nước động. Sofa, cây, rèm và đèn vẫn là geometry cách điệu. Vân gỗ được sinh bằng code. Do concept không phải bản vẽ kỹ thuật đo đạc, không thể khẳng định khớp 100% kích thước hay cấu tạo thật.
- **Khác ảnh:** ảnh V2 có nhân vật nhưng scene này cố ý không có theo yêu cầu. Sofa được đổi sang hồng nhạt theo mô tả mới dù ảnh V2 trông gần ivory. Cửa sổ nhìn ra nền sáng đơn giản, chưa có cảnh cây ngoài trời. Góc xem từ cửa vào ẩn hệ cửa để không bị kính che nội thất; hệ cửa vẫn là geometry trong scene và quan sát được ở các góc khác. Ánh sáng được gần đúng bằng đèn thời gian thực, chưa phải render kiến trúc offline.
- **Tích hợp:** cảnh V2 hiện ở trang xem riêng. Phòng nhiều người tại `/` vẫn dùng cảnh cũ và quy tắc ghế máy chủ hiện có. Chưa nối collision, vị trí ghế, điểm tương tác và đường đi trong V2 với hệ thống nhiều người. Chưa thêm nhân vật hoặc hoạt ảnh.
- **Hiệu năng:** đã dùng instance cho các đối tượng lặp lớn và giới hạn độ phân giải renderer; vẫn cần đo FPS, RAM và nhiệt trên điện thoại thật trước khi chọn mức chi tiết cuối cùng.

## Bước tiếp theo trước khi dùng trong game

1. Đo kích thước tiệm và đối chiếu ảnh từ nhiều góc; chỉnh vị trí/tỷ lệ các nhóm độc lập.
2. Nếu cần mức cận cảnh sát ảnh hơn, bổ sung normal/roughness map cho da, vải, đá và cây; tinh chỉnh độ lún bề mặt chần, lòng bồn và cấu tạo chân ghế bằng chính file Blender V3.
3. Tối ưu và thử trên điện thoại thật; tạo mức chi tiết phù hợp.
4. Gắn tọa độ quầy và ghế V2 vào dữ liệu phòng nhiều người, thêm va chạm/lối đi, giữ máy chủ quyết định ghế.

Không có dữ liệu thanh toán, đặt lịch, nhân vật hay phòng chức năng mới trong scene này.
