import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { startReceptionPrank, updateReceptionPrank } from "./receptionPrank.ts";
import type { WalkRig } from "./walkAnimation.ts";

const rig = (): WalkRig => ({ root: new THREE.Group(), leftLeg: new THREE.Group(), rightLeg: new THREE.Group(),
  leftArm: new THREE.Group(), rightArm: new THREE.Group(), phase: 0, blend: 0, restY: 0 });

test("optional reception joke reports one impact and returns the receptionist to her desk", () => {
  const player = new THREE.Group(), receptionist = new THREE.Group();
  player.position.set(-2.55, 0, 8.1);
  receptionist.position.set(-4.55, 0, 10.2);
  const customerRig = rig(), staffRig = rig();
  const joke = startReceptionPrank(receptionist);
  assert.equal(updateReceptionPrank(joke, .1, player, receptionist, customerRig, staffRig).impact, false);
  joke.phase = "gathering";
  let impacts = 0, finished = false;
  for (let frame = 0; frame < 500 && !finished; frame++) {
    const result = updateReceptionPrank(joke, 1 / 60, player, receptionist, customerRig, staffRig);
    // The desk footprint, including its rounded counter edge, stays clear throughout the walk.
    const insideDesk = receptionist.position.x > -5.7 && receptionist.position.x < -3.16
      && receptionist.position.z > 8.8 && receptionist.position.z < 10.18;
    assert.equal(insideDesk, false);
    if (result.impact) impacts++;
    finished = result.finished;
  }
  assert.equal(impacts, 1);
  assert.equal(finished, true);
  assert.ok(Math.abs(receptionist.position.x + 4.55) < .001);
  assert.ok(Math.abs(receptionist.position.z - 10.2) < .001);
  assert.equal(customerRig.rightArm.rotation.x, 0);
  assert.equal(staffRig.root.rotation.z, 0);
});
