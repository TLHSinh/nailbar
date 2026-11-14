export const SERVICES = [
  { id: "gel", name: "Sơn gel", description: "Màu sắc bền đẹp cho đôi tay hằng ngày.", minutes: 45 },
  { id: "art", name: "Vẽ móng", description: "Thêm họa tiết và điểm nhấn theo phong cách của bạn.", minutes: 75 },
  { id: "care", name: "Chăm sóc móng", description: "Thư giãn, tạo dáng và chăm sóc móng gọn gàng.", minutes: 30 },
] as const;
export type ServiceId = (typeof SERVICES)[number]["id"];
export const STATIONS = [
  { id: "chair-1", x: 300, y: 352 },
  { id: "chair-2", x: 500, y: 352 },
  { id: "chair-3", x: 700, y: 352 },
] as const;
export type StationId = (typeof STATIONS)[number]["id"];
