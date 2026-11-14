# Nghiên cứu không gian tiệm nail 3D

## Điều đã quan sát

| Tham khảo | Bằng chứng | Điều áp dụng |
| --- | --- | --- |
| [GauGau](https://gaugau.io.vn/) | Trang công khai yêu cầu đăng nhập/đăng ký; mô tả quán nhậu 3D có ngồi chung bàn, cụng ly và nghe nhạc YouTube cùng phòng. Phân tích trình duyệt REA: `ev_da451712a4c2cdc915a9fe3c3c8de580f6ceb1dd26e739dd292000d7dea5f01f`. | Lấy ý tưởng phòng chung, tương tác tại vị trí cụ thể và hoạt động xã hội. Chưa xác minh bên trong phòng hoặc mã nguồn. |
| `C:/Users/ASUS/OneDrive/Desktop/DamCuoiV1/DamCuoiV1/app` | REA phân tích bốn tệp JavaScript: `ev_fc95890ce19730b6639a938fa56e625d0ba18445643134c077dc1fe67913f038`. `overlay.js`/`overlay.html` dùng nền JPG, khách PNG và CSS để tạo sân khấu nhìn có chiều sâu. | Học cách đặt vị trí và sắp lớp nhân vật; không xem đây là hệ thống mô hình 3D. Không sao chép mã hay hình. |
| [Đi Chùa Online](https://github.com/workaipvlinh-byte/di-chua-online) | README mô tả chánh điện 3D, nhân vật đi, lạy rồi về chỗ, camera phóng gần và hàng chờ. `package.json` dùng Three.js. | Hành động có chuỗi trạng thái, camera nhấn mạnh tương tác, giới hạn số người ở từng khu. Giấy phép MIT của mã không mặc nhiên cho phép dùng lại FBX/hình trong `public/assets`. |

## Quyết định kỹ thuật đã triển khai

- React hiển thị giao diện vào tiệm, menu dịch vụ và trạng thái; Three.js vẽ cảnh 3D trong canvas. Socket.IO tiếp tục đồng bộ phòng. Máy chủ giữ quyền cấp và trả ghế; cảnh 3D chỉ biểu diễn trạng thái từ máy chủ.
- Cảnh được dựng bằng hình học Three.js: sàn, hai tường, quầy lễ tân, ba bàn/ghế nail, đèn trạng thái ghế, kệ màu, cây, bảng hiệu và nhân vật riêng cho từng khách. Raycaster nhận chạm quầy và sàn. Đây là mô hình tạm có thể chạy ngay, chưa phải bản sao của một tiệm cụ thể.
- Tọa độ phòng hiện hữu được chuyển sang mặt sàn 3D. Nhân vật nội suy tới vị trí máy chủ gửi; khi ngồi có trạng thái hình ảnh. Nút tiếp tân bổ sung trên điện thoại để thao tác dễ hơn.
- Không nhập tài sản của ba trang tham khảo. Theo [hướng dẫn Three.js](https://threejs.org/manual/pages/loading-3d-models.html), định dạng ưu tiên khi bổ sung mô hình là glTF/GLB.

## Mô hình cần chuẩn bị cho bản hình ảnh hoàn thiện

1. Đo hoặc phác sơ đồ tiệm thật: kích thước sàn, vị trí quầy, ba ghế, cửa, bảng hiệu và bảng màu thương hiệu. Sau đó dựng bản gốc trong Blender, xuất GLB theo từng cụm để thay thế hình học tạm.
2. Quầy tiếp tân, bàn nail, ghế, đèn UV, lọ sơn và kệ màu cần mức chi tiết vừa đủ cho điện thoại. Có thể khảo sát [Kenney Furniture Kit (CC0)](https://kenney.nl/assets/furniture-kit) hoặc [Poly Haven](https://polyhaven.com/models/furniture) để làm mẫu thay thế; cần kiểm tra từng tệp và ghi nguồn trong `packages/assets` trước khi đưa vào dự án.
3. Nhân vật cần một bộ GLB có xương và các clip `idle`, `walk`, `sit`, `stand`; cùng tỉ lệ với ghế. Với bộ móng, dựng bàn tay và bộ móng riêng cho góc máy cận cảnh, không tăng độ chi tiết toàn bộ phòng.
4. Giới hạn kích thước GLB, dùng texture nén và LOD, tải cảnh theo cụm. Kiểm tra FPS, bộ nhớ và thời gian vào phòng trên điện thoại thật trước khi thay mô hình tạm.

## Giới hạn hiện tại

GauGau chỉ quan sát được màn hình công khai vì cần tài khoản. Cảnh 3D hiện là bản dựng nguyên bản, chưa có mô hình đo theo tiệm thật, hoạt ảnh xương, va chạm vật cản, thiết kế bộ móng cận cảnh hoặc tối ưu GPU trên thiết bị thật. Không được suy ra các tính năng nội bộ của website tham khảo từ nội dung quảng bá.
