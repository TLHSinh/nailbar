# Bộ nhân vật 3D V1

> Đây là bản tạo hình cũ để đối chiếu. Tám GLB tại đường dẫn website đã được thay bằng [bộ V2](AVATARS_V2.md). Chạy script V1 sẽ ghi đè bộ V2; dùng script V2 để khôi phục.

Mở `/?view=avatars` sau khi chạy `npm run dev` để xoay và phóng từng GLB trên máy tính hoặc điện thoại. [Ảnh bốn nhân viên](preview-avatar-staff-v1.png), [ảnh bé gái và khách](preview-avatar-visitors-v1.png), [ảnh kiểm tra trong trình duyệt](preview-avatar-browser-v1.png) là ảnh chụp **từ mô hình 3D**, không thay cho asset.

| Asset | Vai trò | Đặc điểm nhận diện |
| --- | --- | --- |
| `staff_male.glb` | 1 nhân viên nam | Tóc ngắn, áo kem, tạp dề nâu taupe. |
| `staff_female_01.glb` | Nhân viên nữ 1 | Tóc búi, tạp dề hồng đất. |
| `staff_female_02.glb` | Nhân viên nữ 2 | Tóc bob, tạp dề hồng đào. |
| `staff_female_03.glb` | Nhân viên nữ 3 | Tóc buộc, tạp dề xanh sage. |
| `owner_daughter.glb` | Bé gái con chủ tiệm | Dáng nhỏ hơn người lớn, tóc hai bên, váy hồng. Đây là nhân vật hư cấu, chưa mô phỏng một bé gái cụ thể. |
| `customer_female.glb` | Khách nữ mẫu | Tóc dài, áo tím nhạt. |
| `customer_male.glb` | Khách nam mẫu | Áo xanh và quần denim. |
| `customer_senior.glb` | Khách lớn tuổi mẫu | Tóc bạc, áo xanh sage. |

GLB nằm trong [`apps/web/public/models/avatars/`](../apps/web/public/models/avatars/); [`manifest.json`](../apps/web/public/models/avatars/manifest.json) là danh sách mà trang xem tải. Mỗi GLB khoảng **335–435 KB**. File nguồn chỉnh sửa được là [`nail_avatars_v1.blend`](../packages/assets/source/nail_avatars_v1.blend); script dựng và xuất lại là [`build_avatars_v1.py`](../tools/blender/build_avatars_v1.py). Chạy với Blender 5.2:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python tools/blender/build_avatars_v1.py
```

Toàn bộ mesh và vật liệu của bộ này do script tạo mới. Đã kiểm tra file tham khảo nữ ở `Cartoon women` và GLB bé trai trong `Cartoon boy`; chúng chưa được đưa vào repo hay export vì file nữ là mesh tĩnh khác tỷ lệ, còn GLB bé trai khoảng 95 MB, không phù hợp để tải nguyên trạng trên điện thoại. Ảnh JPEG trong `characters cartoon` cũng không được dùng làm texture.

Các nhân vật **chỉ là bản tạo hình đầu tiên**: mesh tách theo đầu, thân, tay, chân, tóc, quần áo để chỉnh từng phần, nhưng **chưa có skeleton/rig, animation đi–ngồi, biểu cảm hay tùy biến ngoại hình**. Chưa đặt họ vào scene V2 hoặc phòng nhiều người. Chiều cao đang theo tỷ lệ tạm của scene; cần chốt tỷ lệ sau khi đối chiếu với ghế và ảnh tham khảo. Trước khi dùng trong game, cần duyệt tạo hình, rig cùng một chuẩn xương, tạo clip đi/ngồi và tối ưu vật liệu/LOD trên điện thoại thật.
