# Sơ đồ thư mục và ranh giới trách nhiệm

```text
nail bar/
├─ apps/
│  ├─ web/
│  │  ├─ src/game/              # Three.js: cảnh 3D, nhân vật, camera, raycast tương tác
│  │  ├─ src/ui/                # React: màn hình vào tiệm và giao diện ngoài canvas
│  │  ├─ src/features/          # Mỗi tính năng có UI, state và API client riêng
│  │  │  ├─ catalog/            # Danh sách dịch vụ và mẫu có thể làm thật
│  │  │  ├─ nail-designer/      # Dáng, độ dài, màu, họa tiết và xem trước
│  │  │  ├─ booking/            # Chọn lịch và gửi yêu cầu
│  │  │  └─ social/             # Mời bạn, biểu cảm, bình chọn, chia sẻ ảnh
│  │  └─ public/               # Tài nguyên tĩnh đã tối ưu để trình duyệt tải
│  └─ server/
│     └─ src/
│        ├─ rooms/             # Trạng thái phòng tạm thời và quy tắc thời gian thực
│        ├─ modules/           # API nghiệp vụ: catalog, designs, booking, admin
│        └─ index.ts           # Khởi tạo HTTP và Socket.IO
├─ packages/
│  ├─ shared/src/              # Schema/kiểu sự kiện và dữ liệu chung
│  └─ assets/                  # Nguồn đồ họa, âm thanh, giấy phép và manifest
├─ database/migrations/       # Thay đổi schema PostgreSQL có thứ tự
├─ tests/e2e/                 # Luồng hai trình duyệt, điện thoại và đặt lịch
└─ docs/                      # Kiến trúc, lộ trình, quyết định thiết kế
```

Bản chơi offline ở `/` dùng `src/game/mvp/customerFlow.ts` cho trạng thái khách hàng, tên đã kiểm tra và phân trạm, `SalonMvpWorld.ts` cho cảnh 3D, đường đi, camera và NPC; `nameTag.ts` dựng bảng tên quay theo camera trên đầu nhân vật. `src/ui/MvpGame.tsx` nối thế giới 3D với giao diện React; `src/features/catalog/CustomerServiceMenu.tsx` hiển thị dịch vụ, `src/features/nail-designer/NailDesigner.tsx` là bảng thiết kế năm móng tương tác. Dữ liệu mẫu ngoại hình, hai NPC, dịch vụ, vị trí tám trạm và kiểu bộ móng nằm trong `packages/shared/src/customerGame.ts`. Mô hình V2, nội thất V3 và nhân vật V4 được nạp từ các tệp hiện có. Luồng này chạy cục bộ trong một tab. Bản nhiều người cũ ở `/?view=legacy-online` dùng `src/ui/LegacyGame.tsx` và Socket.IO; các quy tắc ghế của máy chủ chưa nối với bản 3D mới.

Quy tắc phụ thuộc: `web` và `server` cùng dùng `shared`; `shared` không phụ thuộc vào ứng dụng nào. Trong phòng nhiều người, quy tắc đặt ghế và di chuyển hợp lệ nằm ở `server`; React không trực tiếp thay đổi trạng thái phòng trong máy chủ. `booking` dùng API và database, không dùng sự kiện phòng làm nguồn dữ liệu chính.

Phòng mẫu và luồng chọn dịch vụ/ngồi ghế đã có mã hoạt động. Các thư mục còn lại có tệp README để chỉ vị trí code và sẽ được điền theo [`ROADMAP.md`](ROADMAP.md).
