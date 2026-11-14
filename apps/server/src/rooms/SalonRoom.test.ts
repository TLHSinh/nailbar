import test from "node:test";
import assert from "node:assert/strict";
import { SalonRoom } from "./SalonRoom.ts";

test("phòng giới hạn số khách và không cho khách lạ di chuyển", () => {
  const room = new SalonRoom("main", 1);
  room.join("a", "Mây");
  assert.throws(() => room.join("b", "Hoa"), /đầy/);
  assert.equal(room.move("b", 100, 100), null);
  assert.equal(room.move("a", 9999, -2)?.players[0].x, 912);
  assert.equal(room.move("a", 9999, -2)?.players[0].y, 190);
  room.leave("a");
  assert.equal(room.snapshot().players.length, 0);
});

test("hai khách không thể giữ cùng một ghế", () => {
  const room = new SalonRoom("main");
  room.join("a", "Mây"); room.join("b", "Hoa");
  room.reception("a"); room.reception("b");
  room.selectService("a", "gel", "chair-1");
  assert.throws(() => room.selectService("b", "art", "chair-1"), /có khách/);
  assert.equal(room.snapshot().stations[0].occupantId, "a");
  assert.equal(room.snapshot().players.find((p) => p.id === "b")?.phase, "at_reception");
});

test("hết ghế thì từ chối; đứng dậy giải phóng ghế", () => {
  const room = new SalonRoom("main");
  for (const id of ["a", "b", "c", "d"]) { room.join(id, id); room.reception(id); }
  for (const id of ["a", "b", "c"]) room.selectService(id, "gel");
  assert.throws(() => room.selectService("d", "gel"), /Không còn ghế/);
  room.seat("a");
  assert.equal(room.snapshot().players.find((p) => p.id === "a")?.phase, "seated");
  room.stand("a");
  assert.equal(room.snapshot().stations[0].occupantId, null);
  room.selectService("d", "care");
  assert.equal(room.snapshot().stations[0].occupantId, "d");
});

test("rời phòng khi đang giữ ghế thì ghế trống; tham gia lại không tạo bản sao", () => {
  const room = new SalonRoom("main");
  room.join("a", "Mây"); room.reception("a"); room.selectService("a", "art");
  room.leave("a");
  assert.equal(room.snapshot().players.length, 0);
  assert.equal(room.snapshot().stations[0].occupantId, null);
  room.join("a", "Mây"); room.join("a", "Mây");
  assert.equal(room.snapshot().players.length, 1);
});
