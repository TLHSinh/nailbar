# Bộ nhân vật 3D V3

Mở `/?view=avatars` sau khi chạy `npm run dev` để xem và xoay từng GLB. Bộ gồm 1 nhân viên nam, 3 nhân viên nữ, bé gái con chủ tiệm và 3 khách. Tám tên file và đường dẫn trong `apps/web/public/models/avatars/` được giữ ổn định.

## Kiểm tra trực quan

| Góc xem | Nhân viên | Bé gái và khách |
| --- | --- | --- |
| Toàn thân chính diện | [V3](preview-avatar-staff-v3.png) | [V3](preview-avatar-visitors-v3.png) |
| Góc 3/4 | [V3](preview-avatar-staff-three-quarter-v3.png) | [V3](preview-avatar-three-quarter-v3.png) |
| Cận mặt | [V3](preview-avatar-faces-v3.png) | [V3](preview-avatar-visitor-faces-v3.png) |
| Trước khi sửa | [V2 nhân viên](preview-avatar-staff-v2.png) | [V2 bé gái và khách](preview-avatar-visitors-v2.png) |

Ảnh ghép đối chiếu trực tiếp: [nhóm nhân viên](preview-avatar-staff-before-after.png) và [bé gái cùng khách](preview-avatar-visitors-before-after.png).

## Thay đổi trong V3

- Dựng lại đầu dưới dạng mesh có độ rộng, chiều sâu, má và hàm khác nhau cho từng người. Từng nhân vật có khoảng cách, kích thước mắt, độ nhướng mày, mũi và nét cười riêng. Mắt có lòng trắng, mống mắt, đồng tử, điểm sáng và mí trên bằng hình học độc lập. Tóc được hạ sát trán và chỉnh theo từng kiểu.
- Bé gái có thân hình dựng riêng: chân ngắn, vai nhỏ, đầu lớn hơn tương quan với người lớn, tóc dài với băng đô và trang phục áo có mũ cùng váy. Không dùng thân người lớn thu nhỏ.
- Vật liệu PBR và cấu trúc mesh được giữ trong GLB; không dùng hình tham chiếu làm mặt phẳng thay mô hình. Các asset được tạo mới bằng Blender, không sao chép mesh từ ảnh mẫu.

File nguồn: [nail_avatars_v3.blend](../packages/assets/source/nail_avatars_v3.blend). Script tái tạo: [build_avatars_v3.py](../tools/blender/build_avatars_v3.py). Tại thư mục gốc, chạy:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/build_avatars_v3.py
```

Script xuất 8 GLB, `manifest.json` và các ảnh kiểm tra trên. Hướng mặt là glTF `+Z`; chân đặt tại gốc tọa độ. Từng bộ phận mặt, tóc, áo và phụ kiện có tên để sửa trong Blender. Tham khảo nguyên tắc tỷ lệ, khối và biểu cảm từ [Blender Studio](https://studio.blender.org/training/stylized-character-workflow/) và quy ước asset thời gian thực từ [Khronos](https://github.com/KhronosGroup/3DC-Asset-Creation/blob/main/asset-creation-guidelines/RealtimeAssetCreationGuidelines.md).

Chạy `node tools/validate_avatars_v3.mjs` để kiểm tra đủ tám file, cấu trúc GLB, hình học mặt, material, normals và việc nạp bằng `GLTFLoader` của Three.js. Lệnh này kiểm tra kỹ thuật asset; nó không thay thế việc xem trực quan trên điện thoại.

## Giới hạn hiện tại

V3 cải thiện cấu trúc khuôn mặt và tỷ lệ bé gái so với V2, nhưng **chưa đạt mức hoàn thiện của hai ảnh tham chiếu người dùng**: tóc, da, trang phục và bàn tay vẫn còn đơn giản khi nhìn cận cảnh. Đây là bộ mesh tĩnh, chưa có UV texture vẽ tay, rig, skinning hoặc hoạt ảnh. Chưa đo FPS trên điện thoại thật. Trang `/?view=avatars` là trình xem asset; phòng nhiều người ở `/` chưa dùng các GLB này. Các bước tiếp theo nên tập trung sculpt và retopology thủ công cho từng gương mặt, vẽ texture tóc/da, rig và kiểm tra trên thiết bị di động.
