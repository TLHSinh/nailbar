import test from "node:test";
import assert from "node:assert/strict";
import { BOUNDS, canStand, canTravelDirectly, findPath } from "./navigation.ts";
import { advanceService, initialServiceState } from "./serviceFlow.ts";
import { maxPixelRatioForViewport, nextPixelRatio } from "./quality.ts";
import { cameraYawBehind, movementDelta, turnCameraToward, turnYawToward } from "./cameraFollow.ts";

test("click path reaches the client and avoids station furniture", () => {
  const start = { x: 0, z: 8.4 }, target = { x: 4, z: 3.9 };
  const path = findPath(start, target);
  assert.ok(path.length > 1);
  for (const point of path) assert.equal(canStand(point), true);
  for (let i = 0; i < path.length; i++) assert.equal(canTravelDirectly(i ? path[i - 1] : start, path[i]), true);
  assert.ok(Math.hypot(path.at(-1)!.x - target.x, path.at(-1)!.z - target.z) < .5);
});

test("an unobstructed floor click travels in one straight segment", () => {
  const goal = { x: 1.3, z: -5 };
  assert.deepEqual(findPath({ x: 0, z: 8.4 }, goal), [goal]);
});

test("walls and furniture block movement", () => {
  assert.equal(canStand({ x: BOUNDS.maxX + 1, z: 0 }), false);
  assert.equal(canStand({ x: -4.15, z: 6.1 }), false);
  assert.equal(canStand({ x: 4.85, z: 6.125 }), false);
  assert.equal(canStand({ x: 0, z: 0 }), true);
});

test("service only progresses through accepted, seated and working states", () => {
  let state = initialServiceState();
  assert.equal(advanceService(state, "start").stage, "waiting");
  state = advanceService(state, "accept");
  assert.equal(state.stage, "walking");
  state = advanceService(state, "arrive");
  assert.equal(state.stage, "seated");
  state = advanceService(state, "start");
  state = advanceService(state, "tick", 6);
  assert.equal(state.progress, .5);
  state = advanceService(state, "tick", 6);
  assert.equal(state.stage, "complete");
  state = advanceService(state, "reset");
  assert.deepEqual(state, initialServiceState());
});

test("large desktop windows start within the pixel budget", () => {
  assert.equal(maxPixelRatioForViewport(388, 763, 1.5), 1.5);
  assert.equal(maxPixelRatioForViewport(1365, 768, 1.5), 1.5);
  assert.ok(maxPixelRatioForViewport(2560, 1300, 1.5) < 1);
});

test("render resolution drops under load and recovers without oscillating near target FPS", () => {
  assert.equal(nextPixelRatio(1.5, 25, 1.5), 1.25);
  assert.equal(nextPixelRatio(1.25, 39, 1.5), 1.07);
  assert.equal(nextPixelRatio(1.07, 60, 1.5), 1.07);
  assert.equal(nextPixelRatio(1.07, 72, 1.5), 1.17);
});

test("camera follows the direction of travel without curving a held key", () => {
  const first = movementDelta(1, 0, 0, 1);
  assert.ok(Math.abs(first.x - 1) < 1e-9);
  assert.ok(Math.abs(first.z) < 1e-9);
  const heading = Math.atan2(first.x, first.z);
  const targetYaw = cameraYawBehind(heading);
  assert.ok(Math.abs(targetYaw - Math.PI / 2) < 1e-9);
  const nextYaw = turnCameraToward(0, targetYaw, .1);
  assert.ok(nextYaw > 0 && nextYaw < targetYaw);
  assert.deepEqual(movementDelta(1, 0, 0, 1), first);
  assert.ok(Math.abs(movementDelta(0, 1, targetYaw, 1).x - 1) < 1e-9);
});

test("camera takes the shortest turn across the angle boundary", () => {
  const current = Math.PI - .1;
  const next = turnCameraToward(current, -Math.PI + .1, .1);
  assert.ok(next > current);
  assert.ok(next - current < .2);
});

test("avatar heading approaches the click direction without an instant snap", () => {
  const target = Math.PI / 2;
  const first = turnYawToward(Math.PI, target, 1 / 60, 10);
  assert.ok(first < Math.PI && first > target);
  let yaw = first;
  for (let frame = 0; frame < 60; frame++) yaw = turnYawToward(yaw, target, 1 / 60, 10);
  assert.ok(Math.abs(yaw - target) < .001);
});
