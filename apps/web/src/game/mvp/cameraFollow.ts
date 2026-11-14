import type { Point } from "./navigation.ts";

/** Freeze referenceYaw for a continuous key press so camera rotation cannot bend the route. */
export function movementDelta(horizontal: number, vertical: number, referenceYaw: number, distance: number): Point {
  const magnitude = Math.hypot(horizontal, vertical) || 1;
  return {
    x: (horizontal * Math.cos(referenceYaw) + vertical * Math.sin(referenceYaw)) * distance / magnitude,
    z: (horizontal * Math.sin(referenceYaw) - vertical * Math.cos(referenceYaw)) * distance / magnitude,
  };
}

/** The avatar's local +Z is its facing direction; camera offset points backward. */
export function cameraYawBehind(avatarYaw: number): number { return Math.PI - avatarYaw; }

export function turnYawToward(currentYaw: number, targetYaw: number, dt: number, responsiveness = 4.5): number {
  const difference = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  return currentYaw + difference * (1 - Math.exp(-dt * responsiveness));
}

export function turnCameraToward(currentYaw: number, targetYaw: number, dt: number): number {
  return turnYawToward(currentYaw, targetYaw, dt);
}
