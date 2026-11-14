import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { joinSchema, moveSchema, serviceSchema, type ClientToServerEvents, type ServerToClientEvents } from "@nail-online/shared";
import { SalonRoom } from "./rooms/SalonRoom.ts";

const app = express();
app.disable("x-powered-by");
app.get("/health", (_req, res) => res.json({ ok: true, service: "nail-online" }));
const httpServer = createServer(app);
const origin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, { cors: { origin }, maxHttpBufferSize: 16_384 });
const rooms = new Map([["main", new SalonRoom("main")]]);
const owners = new Map<string, string>();

io.on("connection", (socket) => {
  let playerId: string | null = null;
  socket.on("room:join", (payload) => {
    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) { socket.emit("room:error", { message: "Tên hoặc phòng không hợp lệ" }); return; }
    if (playerId && playerId !== parsed.data.guestId) { socket.emit("room:error", { message: "Phiên khách không hợp lệ" }); return; }
    const room = rooms.get(parsed.data.roomId);
    if (!room) { socket.emit("room:error", { message: "Không tìm thấy phòng" }); return; }
    try {
      const previousSocket = owners.get(parsed.data.guestId);
      playerId = parsed.data.guestId;
      owners.set(playerId, socket.id);
      socket.join(room.id);
      io.to(room.id).emit("room:state", room.join(playerId, parsed.data.name));
      if (previousSocket && previousSocket !== socket.id) io.sockets.sockets.get(previousSocket)?.disconnect(true);
    } catch { if (playerId) owners.delete(playerId); playerId = null; socket.leave(room.id); socket.emit("room:error", { message: "Phòng đã đầy" }); }
  });
  socket.on("player:move", (payload) => {
    const parsed = moveSchema.safeParse(payload);
    if (!parsed.success || !playerId || owners.get(playerId) !== socket.id) return;
    for (const room of rooms.values()) {
      const state = room.move(playerId, parsed.data.x, parsed.data.y);
      if (state) { io.to(room.id).emit("room:state", state); break; }
    }
  });
  socket.on("player:reception", () => {
    if (!playerId || owners.get(playerId) !== socket.id) return;
    const room = rooms.get("main")!;
    const state = room.reception(playerId);
    if (state) io.to(room.id).emit("room:state", state);
  });
  socket.on("service:select", (payload) => {
    if (!playerId || owners.get(playerId) !== socket.id) return;
    const parsed = serviceSchema.safeParse(payload);
    if (!parsed.success) { socket.emit("room:error", { message: "Dịch vụ hoặc ghế không hợp lệ" }); return; }
    const room = rooms.get("main")!;
    try {
      io.to(room.id).emit("room:state", room.selectService(playerId, parsed.data.serviceId, parsed.data.stationId));
      const selectedPlayer = playerId;
      setTimeout(() => { const state = room.seat(selectedPlayer); if (state) io.to(room.id).emit("room:state", state); }, 850);
    } catch (error) { socket.emit("room:error", { message: error instanceof Error ? error.message : "Không thể chọn dịch vụ" }); }
  });
  socket.on("station:stand", () => {
    if (!playerId || owners.get(playerId) !== socket.id) return;
    const room = rooms.get("main")!;
    const state = room.stand(playerId);
    if (state) io.to(room.id).emit("room:state", state);
  });
  socket.on("disconnect", () => {
    if (!playerId || owners.get(playerId) !== socket.id) return;
    owners.delete(playerId);
    for (const room of rooms.values()) {
      if (room.has(playerId)) io.to(room.id).emit("room:state", room.leave(playerId));
    }
  });
});

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, "127.0.0.1", () => console.log(`Nail Online server: http://localhost:${port}`));
