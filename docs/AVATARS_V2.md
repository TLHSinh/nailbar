# Bộ nhân vật tiệm nail 3D V2

Mở `/?view=avatars` sau khi chạy `npm run dev`. Tám GLB ở [`apps/web/public/models/avatars/`](../apps/web/public/models/avatars/) là mô hình 3D thật, xem và xoay từng người bằng chuột hoặc cảm ứng. [Bốn nhân viên V2](preview-avatar-staff-v2.png) và [bé gái cùng ba khách V2](preview-avatar-visitors-v2.png) là ảnh render kiểm tra; xem thêm [ảnh trên trình duyệt](preview-avatar-browser-v2.png) và [điện thoại](preview-avatar-mobile-v2.png). [Ảnh V1](preview-avatar-staff-v1.png) được giữ để đối chiếu.

## Những thay đổi so với V1

- Giảm tỷ lệ đầu so với thân ở người lớn; thay tóc dạng các búi tròn giống nhau bằng tóc rẽ ngôi, búi, bob, bím lệch, tóc dài và tóc bạc có khối riêng.
- Đổi phom tạp dề và áo, thêm nếp viền, cổ áo, bảng tên, túi dụng cụ, cọ, dây túi, kính và phụ kiện nhỏ. Ba nữ nhân viên khác nhau về da, kiểu tóc, màu tạp dề và dáng đứng.
- Bé gái có tỷ lệ nhỏ hơn, váy xòe, tóc hai bên và tay vẫy. Ba mẫu khách có trang phục, tuổi hình tượng và phụ kiện khác nhau.
- Tinh chỉnh mắt, mày, mũi, miệng và vật liệu; dùng tư thế nghỉ khác nhau để người chơi nhận ra vai trò từ xa.

| Asset | Dấu hiệu nhận diện |
| --- | --- |
| `staff_male.glb` | Tóc rẽ ngôi, tạp dề taupe, cầm cọ. |
| `staff_female_01.glb` | Da nâu ấm, tóc búi, tạp dề hồng đất. |
| `staff_female_02.glb` | Tóc bob, tạp dề hồng đào, tay chống hông. |
| `staff_female_03.glb` | Da nâu đậm, tóc tết lệch, tạp dề xanh sage. |
| `owner_daughter.glb` | Bé gái hư cấu có váy hồng và tay vẫy. |
| `customer_female.glb` | Tóc vàng dài, áo tím và túi đeo chéo. |
| `customer_male.glb` | Dáng cao, áo khoác xanh, quần denim. |
| `customer_senior.glb` | Tóc bạc, kính vàng, áo xanh sage. |

## Nguồn và kỹ thuật

Bộ này được dựng mới bằng geometry Blender; không sao chép mesh hay texture của các mẫu tìm thấy trên mạng. Tham khảo cách ưu tiên dáng tổng thể và chất liệu vẽ tay trong [quy trình nhân vật stylized của Blender Studio](https://studio.blender.org/training/stylized-character-workflow/) và [ví dụ nhân vật game di động của tác giả Alena Garnatko](https://alena_garnatko_3d.artstation.com/projects/x3WmxE). Quy ước GLB, tọa độ gốc, vật liệu PBR và giới hạn hiệu năng dựa vào [hướng dẫn tạo asset thời gian thực của Khronos](https://github.com/KhronosGroup/3DC-Asset-Creation/blob/main/asset-creation-guidelines/RealtimeAssetCreationGuidelines.md).

Script chỉnh sửa được: [`build_avatars_v2.py`](../tools/blender/build_avatars_v2.py). Scene gốc: [`nail_avatars_v2.blend`](../packages/assets/source/nail_avatars_v2.blend). Chạy trong thư mục repo:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/build_avatars_v2.py
```

Script xuất tám GLB và [`manifest.json`](../apps/web/public/models/avatars/manifest.json). Mỗi GLB khoảng **480–680 KB**. Mô hình đặt chân tại gốc tọa độ, mặt hướng về glTF `+Z`. Các vật thể mặt, tóc, trang phục và phụ kiện có tên riêng trong scene để chỉnh từng phần. File nữ FBX người dùng gửi có mô hình T-pose và texture rời; GLB bé trai gần 95 MB. Chúng đã được kiểm tra làm tham chiếu nhưng không được nhúng vào bộ V2 để giữ bộ mới đồng nhất và nhẹ hơn trên web.

## Giới hạn thực tế

Đây là **bộ tạo hình stylized V2**, có chi tiết và sự khác biệt rõ hơn V1 nhưng chưa đạt độ hoàn thiện cận cảnh như nhân vật trong ảnh concept V2. Tất cả nhân vật hiện là mesh tĩnh; chưa có bộ xương, skinning, hoạt ảnh đi/ngồi, biểu cảm, UV/texture vải da cận cảnh hay kiểm tra FPS trên điện thoại thật. Bé gái là nhân vật tưởng tượng, chưa dựa trên ảnh một người cụ thể. Bộ này chưa xuất hiện trong phòng nhiều người ở `/`; trang `/?view=avatars` chỉ để xem, so sánh và tiếp tục chỉnh tạo hình.
