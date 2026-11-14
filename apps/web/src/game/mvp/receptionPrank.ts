import * as THREE from "three";
import type { Point } from "./navigation.ts";
import type { WalkRig } from "./walkAnimation.ts";
import { updateWalkRig } from "./walkAnimation.ts";
import { turnYawToward } from "./cameraFollow.ts";

// Optional offline-only joke. Set this flag to false to disable it; delete this
// module and its imports/calls in SalonMvpWorld and MvpGame to remove it entirely.
export const ENABLE_RECEPTION_PRANK = true;
export const RECEPTION_PRANK_SPOT: Point = { x: -2.55, z: 8.1 };
const RECEPTIONIST_PRANK_SPOT: Point = { x: -2.85, z: 8.42 };
const RECEPTION_DESK_SIDE_X = -2.85;
const RECEPTION_DESK_BACK_Z = 10.45;
const RECEPTIONIST_SPEED = 1.8;

/** Walk behind the curved desk, around its right end, then toward the player. */
export function receptionistPrankRoute(start: Point): Point[] {
  return [
    { x: start.x, z: RECEPTION_DESK_BACK_Z },
    { x: RECEPTION_DESK_SIDE_X, z: RECEPTION_DESK_BACK_Z },
    RECEPTIONIST_PRANK_SPOT,
  ];
}

export type ReceptionPrank = {
  phase: "walking" | "gathering" | "swinging" | "returning";
  elapsed: number;
  impactShown: boolean;
  receptionistStart: Point;
  receptionistStartYaw: number;
  waypointIndex: number;
};

export function startReceptionPrank(receptionist: THREE.Group): ReceptionPrank {
  return { phase: "walking", elapsed: 0, impactShown: false, waypointIndex: 0,
    receptionistStart: { x: receptionist.position.x, z: receptionist.position.z }, receptionistStartYaw: receptionist.rotation.y };
}

function walkReceptionist(prank: ReceptionPrank, receptionist: THREE.Group, route: readonly Point[], dt: number): number {
  let remaining = RECEPTIONIST_SPEED * dt, travelled = 0;
  while (remaining > 0 && prank.waypointIndex < route.length) {
    const target = route[prank.waypointIndex];
    const dx = target.x - receptionist.position.x, dz = target.z - receptionist.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < .001) { prank.waypointIndex++; continue; }
    const step = Math.min(distance, remaining);
    receptionist.position.x += dx / distance * step;
    receptionist.position.z += dz / distance * step;
    receptionist.rotation.y = turnYawToward(receptionist.rotation.y, Math.atan2(dx, dz), dt, 9);
    remaining -= step;
    travelled += step;
    if (step >= distance - .001) prank.waypointIndex++;
  }
  return travelled;
}

/** Advances one brief, non-damaging comic gesture and restores both rigs afterwards. */
export function updateReceptionPrank(
  prank: ReceptionPrank, dt: number, player: THREE.Group, receptionist: THREE.Group,
  playerRig: WalkRig, receptionistRig: WalkRig,
): { impact: boolean; finished: boolean } {
  if (prank.phase === "walking") return { impact: false, finished: false };
  prank.elapsed += dt;
  const route = receptionistPrankRoute(prank.receptionistStart);
  if (prank.phase === "gathering") {
    updateWalkRig(receptionistRig, walkReceptionist(prank, receptionist, route, dt), dt);
    if (prank.waypointIndex >= route.length) { prank.phase = "swinging"; prank.elapsed = 0; prank.waypointIndex = 0; }
    return { impact: false, finished: false };
  }
  if (prank.phase === "swinging") {
    updateWalkRig(receptionistRig, 0, dt);
    const targetYaw = Math.atan2(receptionist.position.x - player.position.x, receptionist.position.z - player.position.z);
    player.rotation.y = turnYawToward(player.rotation.y, targetYaw, dt, 10);
    receptionist.rotation.y = turnYawToward(receptionist.rotation.y, targetYaw + Math.PI, dt, 10);
    const swing = Math.sin(Math.PI * Math.min(1, prank.elapsed / .9));
    playerRig.rightArm.rotation.x = -1.45 * swing;
    playerRig.rightArm.rotation.z = -.22 * swing;
    const impact = !prank.impactShown && prank.elapsed >= .45;
    if (impact) prank.impactShown = true;
    if (prank.impactShown) {
      receptionistRig.leftArm.rotation.x = -1.05;
      receptionistRig.rightArm.rotation.x = -1.05;
      receptionistRig.root.rotation.z = -.12;
    }
    if (prank.elapsed >= 1.35) { prank.phase = "returning"; prank.elapsed = 0; prank.waypointIndex = 0; }
    return { impact, finished: false };
  }
  const returnRoute = [route[1], route[0], prank.receptionistStart];
  updateWalkRig(receptionistRig, walkReceptionist(prank, receptionist, returnRoute, dt), dt);
  receptionistRig.leftArm.rotation.x = -.55;
  receptionistRig.rightArm.rotation.x = -.55;
  receptionistRig.root.rotation.z = -.06;
  playerRig.rightArm.rotation.z = 0;
  if (prank.waypointIndex >= returnRoute.length) {
    playerRig.rightArm.rotation.x = 0;
    receptionistRig.leftArm.rotation.x = 0;
    receptionistRig.rightArm.rotation.x = 0;
    receptionistRig.leftLeg.rotation.x = 0;
    receptionistRig.rightLeg.rotation.x = 0;
    receptionistRig.root.rotation.z = 0;
    receptionistRig.root.position.y = receptionistRig.restY;
    receptionist.rotation.y = prank.receptionistStartYaw;
    return { impact: false, finished: true };
  }
  return { impact: false, finished: false };
}
