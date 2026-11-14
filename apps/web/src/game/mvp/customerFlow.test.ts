import test from "node:test";
import assert from "node:assert/strict";
import { SALON_GAME_STATIONS, SALON_NPCS, SALON_SERVICES, normalizeCustomerName, type NailDesign } from "@nail-online/shared";
import { advanceCustomerGame, findFreeStation, initialCustomerGame } from "./customerFlow.ts";
import { canStand, findPath } from "./navigation.ts";

test("customer journey requires reception, a seat, technician and five finished nails", () => {
  let state = initialCustomerGame();
  assert.equal(advanceCustomerGame(state, { type: "service", serviceId: "gel" }), state);
  state = advanceCustomerGame(state, { type: "enter", avatarId: "customer_female", playerName: "  Nguyễn  An  " });
  assert.equal(state.playerName, "Nguyễn An");
  state = advanceCustomerGame(state, { type: "reception" });
  state = advanceCustomerGame(state, { type: "service", serviceId: "gel" });
  assert.equal(state.stationId, "manicure-1");
  state = advanceCustomerGame(state, { type: "arrive-seat" });
  assert.equal(state.stage, "seated");
  state = advanceCustomerGame(state, { type: "technician-ready" });
  const design: NailDesign = { serviceId: "gel", shape: "almond", pattern: "french", colors: ["rose", "rose", "peach", "rose", "peach"] };
  assert.equal(advanceCustomerGame(state, { type: "finish", design: { ...design, colors: ["rose"] } }), state);
  state = advanceCustomerGame(state, { type: "finish", design });
  assert.equal(state.stage, "result");
  state = advanceCustomerGame(state, { type: "stand" });
  assert.equal(state.stationId, null);
  assert.equal(state.playerName, "Nguyễn An");
  assert.deepEqual(state.lastDesign, design);
  state = advanceCustomerGame(state, { type: "reception" });
  state = advanceCustomerGame(state, { type: "service", serviceId: "spa" });
  assert.equal(state.stationId, "pedicure-1");
});

test("allocation skips an occupied station and reports a full area", () => {
  assert.equal(findFreeStation("gel", new Set(["manicure-1"]))?.id, "manicure-2");
  assert.equal(findFreeStation("spa", new Set(["pedicure-1"]))?.id, "pedicure-2");
  const occupied = new Set(SALON_GAME_STATIONS.filter((item) => item.kind === "manicure").map((item) => item.id));
  assert.equal(findFreeStation("gel", occupied), null);
  const state = advanceCustomerGame(advanceCustomerGame(initialCustomerGame(), { type: "enter", avatarId: "customer_male", playerName: "Quốc Bảo" }), { type: "reception" });
  assert.throws(() => advanceCustomerGame(state, { type: "service", serviceId: "gel", occupied }), /không còn ghế trống/);
});

test("player names are validated and staff names and assets stay fixed", () => {
  assert.equal(normalizeCustomerName("  Hà    My "), "Hà My");
  assert.equal(normalizeCustomerName("A"), null);
  assert.equal(normalizeCustomerName("<script>"), null);
  assert.equal(normalizeCustomerName("A".repeat(25)), null);
  assert.throws(() => advanceCustomerGame(initialCustomerGame(), { type: "enter", avatarId: "customer_senior", playerName: " " }), /Tên khách/);
  assert.deepEqual(SALON_NPCS.receptionist, { name: "Hue Trinh", role: "Lễ tân", asset: "staff_female_01" });
  assert.deepEqual(SALON_NPCS.technician, { name: "Quang Tran", role: "Thợ nail", asset: "staff_male" });
  assert.equal(SALON_SERVICES.length, 4);
});

test("all eight station approaches remain reachable from the centre aisle", () => {
  for (const station of SALON_GAME_STATIONS) {
    const path = findPath({ x: 0, z: 8.4 }, station.approach);
    assert.ok(path.length > 0, station.id);
    assert.ok(path.every((point) => canStand(point)), station.id);
  }
});
