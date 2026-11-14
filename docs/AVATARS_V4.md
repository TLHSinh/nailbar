# Nhân vật 3D V4: nghiên cứu Blender và chỉnh mesh/texture

Mở `/?view=avatars` sau khi chạy `npm run dev`. Tám GLB V4 giữ nguyên tên file ở `apps/web/public/models/avatars/`. Scene gốc là [nail_avatars_v4.blend](../packages/assets/source/nail_avatars_v4.blend).

## Kết quả có thể xem

| Góc nhìn | Nhân viên | Bé gái và khách |
| --- | --- | --- |
| Toàn thân | [ảnh](preview-avatar-staff-v4.png) | [ảnh](preview-avatar-visitors-v4.png) |
| Góc 3/4 | [ảnh](preview-avatar-staff-three-quarter-v4.png) | [ảnh](preview-avatar-three-quarter-v4.png) |
| Cận mặt | [ảnh](preview-avatar-faces-v4.png) | [ảnh](preview-avatar-visitor-faces-v4.png) |
| Đối chiếu V3 → V4 | [ảnh](preview-avatar-staff-v3-v4.png) | [ảnh](preview-avatar-visitors-v3-v4.png) |

## Những gì học được từ file mẫu

Tôi mở file `cartoon+boy_Blend.zip` do người dùng cung cấp bằng Blender 5.2, tắt tự chạy script của file và kiểm tra scene. Mẫu có khoảng 13.460 đỉnh ở `CC_Base_Body`, mesh mắt, mi, tóc riêng, UV, 103 ảnh được đóng gói, 5 armature và hơn 50 shape key trên khuôn mặt (mắt, miệng, lông mày, má). Mặt có texture 2048² cùng normal/roughness; tóc dùng geometry và các bản đồ diffuse/normal/opacity. Chính sự kết hợp topology, texture và hệ biểu cảm đó làm mẫu có chiều sâu mà V3 chưa có. Gói ZIP không kèm giấy phép; tôi chỉ dùng để nghiên cứu cấu trúc, **không nhúng mesh hoặc texture của mẫu vào GLB V4**.

## Thay đổi thực hiện trong V4

- Tăng mật độ mesh đầu lên 64 × 40, chỉnh đỉnh để tạo hốc mắt, gò má, sống mũi, cằm và gờ lông mày theo tám bộ tỷ lệ khác nhau. Mắt và mí được đặt lại theo bề mặt đầu, giảm độ lồi thấy trong ảnh V3.
- Tô tám bản đồ màu da UV riêng tại `packages/assets/textures/avatars_v4/`: chuyển sắc trán, má, mũi, quầng mắt và hạt màu rất nhẹ. Ảnh được nhúng vào GLB và `.blend`.
- Thêm các sợi tóc hình học mảnh trên khối tóc. Vẫn dùng tên file GLB và `manifest.json` cũ để trình xem hiện có nạp phiên bản mới.

Tái tạo V4:

```powershell
python tools/blender/paint_avatar_textures_v4.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/build_avatars_v4.py
node tools/validate_avatars_v4.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/validate_avatars_v4.py
```

## Đánh giá thực tế

V4 là bước chỉnh mesh và texture có thể tiếp tục sửa trong Blender. **Chưa đạt chất lượng nhân vật game cao cấp của file mẫu.** Khối cơ thể và trang phục vẫn đơn giản, nếp tóc và sắc thái da ở cận cảnh còn thiếu, khuôn mặt chưa có topology biểu cảm như mẫu. GLB hiện vẫn tĩnh, không có rig, skinning hay animation. Chưa kiểm tra FPS trên điện thoại thật. Việc làm tiếp để đạt mức người dùng mong muốn là sculpt từng gương mặt, retopology, vẽ texture tóc/da/trang phục, rig và thử ánh sáng trong game; không thể gọi V4 hiện tại là bản hoàn thiện cao cấp.
