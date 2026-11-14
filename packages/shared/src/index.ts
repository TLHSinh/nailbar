import { z } from "zod";
import { SERVICES, STATIONS } from "./catalog.ts";
export { SERVICES, STATIONS } from "./catalog.ts";
export type { ServiceId, StationId } from "./catalog.ts";
export { SALON_GAME_LAYOUT, SALON_GAME_STATIONS, SALON_SERVICES, CUSTOMER_AVATARS, SALON_NPCS, NAIL_COLORS, normalizeCustomerName } from "./customerGame.ts";
export type { CustomerAvatarId, SalonServiceId, SalonStation, SalonStationKind, NailColorId, NailShape, NailPattern, NailDesign } from "./customerGame.ts";

export const joinSchema = z.object({ roomId: z.literal("main"), name: z.string().trim().min(1).max(24), guestId: z.uuid() });
export const moveSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
export const serviceSchema = z.object({ serviceId: z.enum(SERVICES.map((s) => s.id)), stationId: z.enum(STATIONS.map((s) => s.id)).optional() });

export type Player = { id: string; name: string; x: number; y: number; appearanceId: string; phase: "browsing" | "at_reception" | "walking" | "seated"; serviceId: import("./catalog.ts").ServiceId | null; stationId: import("./catalog.ts").StationId | null };
export type Station = { id: import("./catalog.ts").StationId; x: number; y: number; occupantId: string | null };
export type RoomState = { id: string; players: Player[]; stations: Station[] };
export interface ClientToServerEvents {
  "room:join": (payload: z.infer<typeof joinSchema>) => void;
  "player:move": (payload: z.infer<typeof moveSchema>) => void;
  "player:reception": () => void;
  "service:select": (payload: z.infer<typeof serviceSchema>) => void;
  "station:stand": () => void;
}
export interface ServerToClientEvents {
  "room:state": (state: RoomState) => void;
  "room:error": (error: { message: string }) => void;
}
