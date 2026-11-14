import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SERVICES, type ClientToServerEvents, type RoomState, type ServerToClientEvents, type ServiceId } from "@nail-online/shared";
import { SalonWorld3D } from "../game/SalonWorld3D.ts";
import { ServiceMenu } from "../features/catalog/ServiceMenu.tsx";

type SalonSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
const guestId = () => {
  const saved = sessionStorage.getItem("nail-guest-id");
  if (saved) return saved;
  const id = crypto.randomUUID();
  sessionStorage.setItem("nail-guest-id", id);
  return id;
};

export function LegacyGame() {
  const mount = useRef<HTMLDivElement>(null);
  const scene = useRef<SalonWorld3D | null>(null);
  const socket = useRef<SalonSocket | null>(null);
  const identity = useRef<string>(guestId());
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [status, setStatus] = useState("Nhập tên để vào tiệm");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!joined || !mount.current) return;
    const connection: SalonSocket = io(import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001");
    socket.current = connection;
    const salon = new SalonWorld3D(mount.current, (x, y) => connection.emit("player:move", { x, y }), () => connection.emit("player:reception"));
    scene.current = salon;
    connection.on("connect", () => { setStatus("Đang ở trong tiệm"); connection.emit("room:join", { roomId: "main", name, guestId: identity.current }); });
    connection.on("disconnect", () => setStatus("Đang kết nối lại…"));
    connection.on("room:state", (state) => {
      setRoom(state);
      const self = state.players.find((player) => player.id === identity.current);
      if (self?.phase === "at_reception") setMenuOpen(true);
      else setMenuOpen(false);
      scene.current?.sync(state, identity.current);
    });
    connection.on("room:error", ({ message }) => setStatus(message));
    return () => { connection.disconnect(); salon.destroy(); socket.current = null; scene.current = null; };
  }, [joined, name]);

  const self = room?.players.find((player) => player.id === identity.current);
  const service = SERVICES.find((item) => item.id === self?.serviceId);
  const select = (id: ServiceId) => { socket.current?.emit("service:select", { serviceId: id }); setMenuOpen(false); };
  return <main className="page">
    <header><span className="eyebrow">NAIL BAR · THẾ GIỚI ẢO</span><h1>Đi làm nail online</h1><p>Ghé tiệm, gặp bạn bè và khám phá mẫu móng yêu thích.</p></header>
    <a className="viewer-link" href="/?view=salon-v2">Xem mô hình tiệm 3D V2 (không có nhân vật) →</a>
    <a className="viewer-link" href="/?view=avatars">Xem bộ nhân vật 3D →</a>
    {!joined ? <form className="entry" onSubmit={(event) => { event.preventDefault(); if (name.trim()) setJoined(true); }}>
      <label htmlFor="name">Tên nhân vật</label>
      <input id="name" maxLength={24} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Mây" autoComplete="off" required />
      <button type="submit">Vào tiệm</button>
    </form> : <>
      <div className="meta"><span role="status">{status}</span><span>{room?.players.length ?? 0} khách · {room?.stations.filter((station) => !station.occupantId).length ?? 3} ghế trống</span></div>
      {!service && <div className="salon-actions"><span>Chạm sàn để đi lại, chạm quầy để chọn dịch vụ.</span><button onClick={() => socket.current?.emit("player:reception")}>Đến quầy tiếp tân</button></div>}
      <div className="game-shell"><div ref={mount} className="game" aria-label="Không gian tiệm nail ảo" />{menuOpen && room && self?.phase === "at_reception" && <ServiceMenu stations={room.stations} onSelect={select} onClose={() => setMenuOpen(false)} />}</div>
      {service && <div className="current-service"><span>{self?.phase === "walking" ? "Đang đi tới ghế" : "Đang ngồi làm nail"}: <strong>{service.name}</strong></span><button onClick={() => socket.current?.emit("station:stand")}>Đứng dậy</button></div>}
      <button className="leave" onClick={() => { setJoined(false); setRoom(null); setMenuOpen(false); }}>Rời tiệm</button>
    </>}
    <footer>Bản thử nghiệm · bước tiếp theo: thiết kế bộ móng cận cảnh</footer>
  </main>;
}
