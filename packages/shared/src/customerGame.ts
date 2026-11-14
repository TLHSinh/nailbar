/** Shared identifiers and 3D anchors for the offline game and future online room. */
export const SALON_GAME_LAYOUT = {
  manicureX: -4.15,
  manicureZ: [6.1, 2.1, -1.9, -5.9],
  pedicureX: 4.85,
  pedicureZ: [6.125, 2.125, -1.875, -5.875],
} as const;

export const CUSTOMER_AVATARS = [
  { id: "customer_female", label: "Mẫu nữ", description: "Tóc vàng, trang phục tím dịu", url: "/models/avatars/customer_female.glb" },
  { id: "customer_male", label: "Mẫu nam", description: "Áo xanh, phong cách năng động", url: "/models/avatars/customer_male.glb" },
  { id: "customer_senior", label: "Mẫu lớn tuổi", description: "Tóc bạc, trang phục xanh sage", url: "/models/avatars/customer_senior.glb" },
] as const;
export type CustomerAvatarId = (typeof CUSTOMER_AVATARS)[number]["id"];

export const SALON_NPCS = {
  receptionist: { name: "Hue Trinh", role: "Lễ tân", asset: "staff_female_01" },
  technician: { name: "Quang Tran", role: "Thợ nail", asset: "staff_male" },
} as const;

/** One display name per offline customer; reject control characters and overly long labels. */
export function normalizeCustomerName(value: string): string | null {
  const name = value.trim().replace(/\s+/gu, " ");
  const characters = Array.from(name);
  if (characters.length < 2 || characters.length > 24) return null;
  if (!/^[\p{L}\p{M}\p{N} .'-]+$/u.test(name) || !/\p{L}/u.test(name)) return null;
  return name;
}

export const SALON_SERVICES = [
  { id: "gel", name: "Sơn gel", description: "Chọn màu và hoàn thiện từng móng tay.", minutes: 45, stationKind: "manicure" },
  { id: "art", name: "Vẽ móng", description: "Phối màu với họa tiết tạo điểm nhấn.", minutes: 75, stationKind: "manicure" },
  { id: "care", name: "Chăm sóc móng", description: "Tạo dáng và phủ lớp dưỡng nhẹ.", minutes: 30, stationKind: "manicure" },
  { id: "spa", name: "Chăm sóc chân", description: "Thư giãn tại ghế spa và làm đẹp móng chân.", minutes: 50, stationKind: "pedicure" },
] as const;
export type SalonServiceId = (typeof SALON_SERVICES)[number]["id"];
export type SalonStationKind = "manicure" | "pedicure";

export type SalonStation = {
  id: string;
  name: string;
  kind: SalonStationKind;
  x: number;
  z: number;
  approach: { x: number; z: number };
  seat: { x: number; z: number };
  technicianApproach: { x: number; z: number };
  technicianSeat: { x: number; z: number };
};

export const SALON_GAME_STATIONS: readonly SalonStation[] = [
  ...SALON_GAME_LAYOUT.manicureZ.map((z, index) => ({
    id: `manicure-${index + 1}`, name: `Bàn manicure ${index + 1}`, kind: "manicure" as const,
    x: SALON_GAME_LAYOUT.manicureX, z,
    approach: { x: -2.55, z: z + .95 }, seat: { x: SALON_GAME_LAYOUT.manicureX, z: z + .95 },
    technicianApproach: { x: -2.55, z: z - .95 }, technicianSeat: { x: SALON_GAME_LAYOUT.manicureX, z: z - .95 },
  })),
  ...SALON_GAME_LAYOUT.pedicureZ.map((z, index) => ({
    id: `pedicure-${index + 1}`, name: `Ghế pedicure ${index + 1}`, kind: "pedicure" as const,
    x: SALON_GAME_LAYOUT.pedicureX, z,
    approach: { x: 2.75, z }, seat: { x: SALON_GAME_LAYOUT.pedicureX, z },
    technicianApproach: { x: 2.75, z: z + .65 }, technicianSeat: { x: 2.75, z: z + .65 },
  })),
];

export const NAIL_COLORS = [
  { id: "rose", name: "Hồng phấn", hex: "#db8f9e" },
  { id: "peach", name: "Đào sữa", hex: "#eeb4a4" },
  { id: "nude", name: "Nude", hex: "#c99a88" },
  { id: "cream", name: "Kem", hex: "#f4e6d4" },
  { id: "wine", name: "Đỏ rượu", hex: "#9a425a" },
  { id: "sage", name: "Xanh sage", hex: "#8daba0" },
  { id: "lavender", name: "Tím nhạt", hex: "#b3a2c9" },
  { id: "clear", name: "Dưỡng trong", hex: "#f6d8cd" },
] as const;
export type NailColorId = (typeof NAIL_COLORS)[number]["id"];
export type NailShape = "round" | "almond" | "square";
export type NailPattern = "plain" | "french" | "star";
export type NailDesign = { serviceId: SalonServiceId; shape: NailShape; pattern: NailPattern; colors: NailColorId[] };
