import { CUSTOMER_AVATARS, NAIL_COLORS, SALON_GAME_STATIONS, SALON_SERVICES, normalizeCustomerName, type CustomerAvatarId, type NailDesign, type SalonServiceId, type SalonStation } from "@nail-online/shared";

export type CustomerStage = "selecting" | "exploring" | "at-reception" | "walking-to-seat" | "seated" | "designing" | "result";
export type CustomerGameState = {
  stage: CustomerStage;
  avatarId: CustomerAvatarId | null;
  playerName: string | null;
  serviceId: SalonServiceId | null;
  stationId: string | null;
  lastDesign: NailDesign | null;
};

export const initialCustomerGame = (): CustomerGameState => ({ stage: "selecting", avatarId: null, playerName: null, serviceId: null, stationId: null, lastDesign: null });

export function findFreeStation(serviceId: SalonServiceId, occupied: ReadonlySet<string> = new Set()): SalonStation | null {
  const service = SALON_SERVICES.find((item) => item.id === serviceId);
  if (!service) return null;
  return SALON_GAME_STATIONS.find((station) => station.kind === service.stationKind && !occupied.has(station.id)) ?? null;
}

export function isCompleteDesign(design: NailDesign, serviceId: SalonServiceId): boolean {
  const colors = new Set(NAIL_COLORS.map((color) => color.id));
  return design.serviceId === serviceId && design.colors.length === 5 && design.colors.every((color) => colors.has(color))
    && ["round", "almond", "square"].includes(design.shape) && ["plain", "french", "star"].includes(design.pattern);
}

export type CustomerGameEvent =
  | { type: "enter"; avatarId: CustomerAvatarId; playerName: string }
  | { type: "reception" }
  | { type: "leave-reception" }
  | { type: "service"; serviceId: SalonServiceId; occupied?: ReadonlySet<string> }
  | { type: "arrive-seat" }
  | { type: "technician-ready" }
  | { type: "finish"; design: NailDesign }
  | { type: "stand" };

export function advanceCustomerGame(state: CustomerGameState, event: CustomerGameEvent): CustomerGameState {
  if (event.type === "enter" && state.stage === "selecting") {
    if (!CUSTOMER_AVATARS.some((avatar) => avatar.id === event.avatarId)) throw new Error("Nhân vật không hợp lệ");
    const playerName = normalizeCustomerName(event.playerName);
    if (!playerName) throw new Error("Tên khách cần 2–24 ký tự, chỉ gồm chữ, số, khoảng trắng và dấu nối.");
    return { ...state, stage: "exploring", avatarId: event.avatarId, playerName };
  }
  if (event.type === "reception" && state.stage === "exploring") return { ...state, stage: "at-reception" };
  if (event.type === "leave-reception" && state.stage === "at-reception") return { ...state, stage: "exploring" };
  if (event.type === "service" && state.stage === "at-reception") {
    if (!SALON_SERVICES.some((service) => service.id === event.serviceId)) throw new Error("Dịch vụ không hợp lệ");
    const station = findFreeStation(event.serviceId, event.occupied);
    if (!station) throw new Error("Hiện không còn ghế trống cho dịch vụ này. Vui lòng thử lại sau.");
    return { ...state, stage: "walking-to-seat", serviceId: event.serviceId, stationId: station.id };
  }
  if (event.type === "arrive-seat" && state.stage === "walking-to-seat") return { ...state, stage: "seated" };
  if (event.type === "technician-ready" && state.stage === "seated") return { ...state, stage: "designing" };
  if (event.type === "finish" && state.stage === "designing" && state.serviceId && isCompleteDesign(event.design, state.serviceId))
    return { ...state, stage: "result", lastDesign: event.design };
  if (event.type === "stand" && state.stage === "result")
    return { ...state, stage: "exploring", serviceId: null, stationId: null };
  return state;
}
