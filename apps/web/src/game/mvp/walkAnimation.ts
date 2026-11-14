import * as THREE from "three";

export type WalkRig = {
  root: THREE.Object3D;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  phase: number;
  blend: number;
  restY: number;
};

function reparentParts(root: THREE.Object3D, pivot: THREE.Group, prefixes: string[]) {
  for (const child of [...root.children])
    if (prefixes.some((prefix) => child.name.startsWith(prefix))) pivot.attach(child);
}

/** The V4 characters have separate rigid limbs, so animate those around real hip/shoulder pivots. */
export function createWalkRig(visual: THREE.Group): WalkRig {
  const root = visual.children.find((child) => child.name.startsWith("staff_") || child.name.startsWith("customer_"));
  if (!root) throw new Error("V4 avatar root is missing");
  const pivot = (name: string, x: number, y: number) => {
    const group = new THREE.Group(); group.name = name; group.position.set(x, y, 0); root.add(group); return group;
  };
  const leftLeg = pivot("Walk_Left_Hip", -.15, .9);
  const rightLeg = pivot("Walk_Right_Hip", .15, .9);
  const leftArm = pivot("Walk_Left_Shoulder", -.33, 1.4);
  const rightArm = pivot("Walk_Right_Shoulder", .33, 1.4);
  root.updateMatrixWorld(true);
  reparentParts(root, leftLeg, ["Leg_L", "Pant_cuff_-1", "Shoe_L", "Shoe_sole_-1", "Shoe_lace_-1"]);
  reparentParts(root, rightLeg, ["Leg_R", "Pant_cuff_1", "Shoe_R", "Shoe_sole_1", "Shoe_lace_1"]);
  reparentParts(root, leftArm, ["Sleeve_-1", "Sleeve_cuff_-1", "Bare_forearm_-1", "Hand_-1", "Thumb_-1"]);
  reparentParts(root, rightArm, ["Sleeve_1", "Sleeve_cuff_1", "Bare_forearm_1", "Hand_1", "Thumb_1"]);
  return { root, leftLeg, rightLeg, leftArm, rightArm, phase: 0, blend: 0, restY: root.position.y };
}

export function updateWalkRig(rig: WalkRig, distanceMetres: number, dt: number, running = false) {
  const moving = distanceMetres > .001;
  rig.phase += distanceMetres * Math.PI * 2 / (running ? 1.45 : 1.2);
  rig.blend += (Number(moving) - rig.blend) * (1 - Math.exp(-dt * 12));
  const stride = Math.sin(rig.phase) * rig.blend;
  const legAngle = running ? .53 : .38;
  rig.leftLeg.rotation.x = stride * legAngle;
  rig.rightLeg.rotation.x = -stride * legAngle;
  rig.leftArm.rotation.x = -stride * .28;
  rig.rightArm.rotation.x = stride * .28;
  rig.root.position.y = rig.restY + Math.abs(Math.sin(rig.phase)) * .018 * rig.blend;
}
