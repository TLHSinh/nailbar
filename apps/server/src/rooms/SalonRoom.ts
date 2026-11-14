import type { Player, RoomState, ServiceId, Station, StationId } from "@nail-online/shared";
import { SERVICES, STATIONS } from "../../../../packages/shared/src/catalog.ts";

export class SalonRoom {
  private players = new Map<string, Player>();
  private stations = new Map<StationId, Station>(STATIONS.map((station) => [station.id, { ...station, occupantId: null }]));
  readonly id: string;
  readonly capacity: number;
  constructor(id: string, capacity = 30) { this.id = id; this.capacity = capacity; }

  join(playerId: string, name: string): RoomState {
    if (this.players.has(playerId)) return this.snapshot();
    if (this.players.size >= this.capacity) throw new Error("Phòng đã đầy");
    this.players.set(playerId, { id: playerId, name: name.trim(), x: 480, y: 250, appearanceId: "guest-default", phase: "browsing", serviceId: null, stationId: null });
    return this.snapshot();
  }
  move(playerId: string, x: number, y: number): RoomState | null {
    const player = this.players.get(playerId);
    if (!player || player.phase === "seated" || player.phase === "walking") return null;
    this.players.set(playerId, { ...player, x: Math.max(48, Math.min(912, x)), y: Math.max(190, Math.min(492, y)), phase: "browsing" });
    return this.snapshot();
  }
  reception(playerId: string): RoomState | null {
    const player = this.players.get(playerId);
    if (!player || player.phase === "seated" || player.phase === "walking") return null;
    this.players.set(playerId, { ...player, x: 210, y: 215, phase: "at_reception" });
    return this.snapshot();
  }
  selectService(playerId: string, serviceId: ServiceId, requestedStationId?: StationId): RoomState {
    const player = this.players.get(playerId);
    if (!player || player.phase !== "at_reception") throw new Error("Hãy đến quầy tiếp tân trước");
    if (!SERVICES.some((service) => service.id === serviceId)) throw new Error("Dịch vụ không hợp lệ");
    const station = requestedStationId ? this.stations.get(requestedStationId) : [...this.stations.values()].find((item) => !item.occupantId);
    if (!station) throw new Error("Không còn ghế trống");
    if (station.occupantId) throw new Error("Ghế đã có khách");
    this.stations.set(station.id, { ...station, occupantId: playerId });
    this.players.set(playerId, { ...player, phase: "walking", serviceId, stationId: station.id });
    return this.snapshot();
  }
  seat(playerId: string): RoomState | null {
    const player = this.players.get(playerId);
    if (!player || player.phase !== "walking" || !player.stationId) return null;
    const station = this.stations.get(player.stationId);
    if (!station || station.occupantId !== playerId) return null;
    this.players.set(playerId, { ...player, x: station.x, y: station.y, phase: "seated" });
    return this.snapshot();
  }
  stand(playerId: string): RoomState | null {
    const player = this.players.get(playerId);
    if (!player || !player.stationId || (player.phase !== "seated" && player.phase !== "walking")) return null;
    const station = this.stations.get(player.stationId)!;
    if (station.occupantId === playerId) this.stations.set(station.id, { ...station, occupantId: null });
    this.players.set(playerId, { ...player, x: station.x + 60, y: station.y + 82, phase: "browsing", serviceId: null, stationId: null });
    return this.snapshot();
  }
  leave(playerId: string): RoomState {
    const player = this.players.get(playerId);
    if (player?.stationId) {
      const station = this.stations.get(player.stationId)!;
      if (station.occupantId === playerId) this.stations.set(station.id, { ...station, occupantId: null });
    }
    this.players.delete(playerId);
    return this.snapshot();
  }
  has(playerId: string) { return this.players.has(playerId); }
  snapshot(): RoomState { return { id: this.id, players: [...this.players.values()], stations: [...this.stations.values()] }; }
}
