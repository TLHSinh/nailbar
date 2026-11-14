import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { io } from "socket.io-client";
import server from "../apps/server/src/app.ts";

const externalBase = process.env.DEPLOYMENT_TEST_URL;
if (!externalBase) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
}
const address = server.address();
if (!externalBase) assert.ok(address && typeof address !== "string");
const base = externalBase ?? `http://127.0.0.1:${address.port}`;
let socket;
try {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "nail-online" });
  if (!externalBase) assert.equal((await fetch(`${base}/health`)).status, 404);

  socket = io(base, { path: "/api/socket.io", transports: ["websocket"], timeout: 5000, forceNew: true });
  await Promise.race([
    once(socket, "connect"),
    once(socket, "connect_error").then(([error]) => { throw error; }),
  ]);
  const roomState = new Promise((resolve) => socket.once("room:state", resolve));
  socket.emit("room:join", { roomId: "main", name: "Vercel Test", guestId: randomUUID() });
  const state = await Promise.race([roomState, new Promise((_, reject) => setTimeout(() => reject(new Error("room:state timeout")), 5000))]);
  assert.equal(state.players.length, 1);
  console.log("GET /api/health and WebSocket /api/socket.io passed.");
} finally {
  socket?.disconnect();
  if (!externalBase) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
