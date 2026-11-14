import * as THREE from "three";
import { SALON_GAME_LAYOUT } from "@nail-online/shared";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// All dimensions are provisional metres derived from the V2 portrait concept, not measured from the shop.
export const SALON_DIMENSIONS = { width: 12, length: 22.5, ceiling: 5.18, aisleWidth: 6.6 } as const;
export const SALON_LAYOUT = {
  architectureScale: [1.2, 1.08, 1.25],
  manicureX: SALON_GAME_LAYOUT.manicureX, manicureZ: SALON_GAME_LAYOUT.manicureZ,
  pedicureX: SALON_GAME_LAYOUT.pedicureX, pedicureZ: SALON_GAME_LAYOUT.pedicureZ,
} as const;
export const SALON_VIEWS = {
  entrance: { label: "Từ cửa vào", position: [-0.15, 2.05, 13.0], target: [0, 1.7, -7.0] },
  overview: { label: "Toàn cảnh", position: [0, 13.5, 14.2], target: [0, 0.8, -1.3] },
  manicure: { label: "Bàn manicure", position: [0.5, 2.55, 6.3], target: [-4.15, 1.0, 0] },
  manicureDetail: { label: "Cận cảnh manicure", position: [-1.3, 1.85, 8.2], target: [-4.15, .85, 6.1] },
  pedicure: { label: "Ghế pedicure", position: [0.4, 2.5, 6.6], target: [4.85, 1.1, -.2] },
  pedicureDetail: { label: "Cận cảnh pedicure", position: [1.9, 1.85, 8.2], target: [4.85, 1.0, 6.125] },
  reception: { label: "Quầy lễ tân", position: [-.2, 2.35, 11.0], target: [-4.5, 1.0, 9.4] },
  lounge: { label: "Sofa và hành lang", position: [0.3, 2.35, -5.7], target: [1.0, 1.8, -11.5] },
  top: { label: "Từ trên cao", position: [0, 25, 1], target: [0, 0, -1] },
} as const;
export type SalonView = keyof typeof SALON_VIEWS;

const mat = (color: number, roughness = .7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  WarmOakFloor: mat(0xb47f5c, .74), CreamWall: mat(0xf3ddd3, .94), IvoryCeiling: mat(0xfff4ec, .94),
  ChampagneGoldMetal: mat(0xd1a964, .28, .72), BrushedBrass: mat(0xac854e, .44, .68),
  BlushPinkFabric: mat(0xdca5a2, .94), DustyRoseSofa: mat(0xe8c8c3, .88), IvoryUpholstery: mat(0xf2e3d7, .94), TaupeLeather: mat(0x6a5147, .76), TaupeLeatherPanel: mat(0x786057, .83),
  BlackGlossyCeramic: mat(0x181a1c, .12), WarmWhiteMarble: mat(0xfff8f0, .24),
  ClearGlass: new THREE.MeshPhysicalMaterial({ color: 0xddeeee, roughness: .08, metalness: 0, transmission: .72, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }),
  SheerCurtain: new THREE.MeshPhysicalMaterial({ color: 0xfff6ef, roughness: .9, transparent: true, opacity: .37, side: THREE.DoubleSide, depthWrite: false }),
  EmissiveWarmLED: new THREE.MeshStandardMaterial({ color: 0xffdfaa, emissive: 0xffc577, emissiveIntensity: 2, roughness: .8 }),
  NaturalPlantLeaves: mat(0x47745b, .87), Water: new THREE.MeshPhysicalMaterial({ color: 0x8bb7b8, metalness: .04, roughness: .12, transparent: true, opacity: .67, side: THREE.DoubleSide }),
  DarkWood: mat(0x805338, .72), Flower: mat(0xe7a4ad, .86), NailPink: mat(0xe29caa, .28),
} satisfies Record<string, THREE.Material>;

const group = (parent: THREE.Object3D, name: string, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.name = name; g.position.set(x, y, z); parent.add(g); return g; };
const mesh = (parent: THREE.Object3D, name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geometry, material); m.name = name; m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
};
const box = (p: THREE.Object3D, n: string, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => mesh(p, n, new THREE.BoxGeometry(w, h, d), m, x, y, z);
const softBox = (p: THREE.Object3D, n: string, w: number, h: number, d: number, r: number, x: number, y: number, z: number, m: THREE.Material) => mesh(p, n, new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)), m, x, y, z);
const cyl = (p: THREE.Object3D, n: string, rt: number, rb: number, h: number, x: number, y: number, z: number, m: THREE.Material, segments = 16) => mesh(p, n, new THREE.CylinderGeometry(rt, rb, h, segments), m, x, y, z);
const ball = (p: THREE.Object3D, n: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, m: THREE.Material) => { const o = mesh(p, n, new THREE.SphereGeometry(1, 16, 12), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
const tube = (p: THREE.Object3D, n: string, points: THREE.Vector3[], radius: number, m: THREE.Material, closed = false) => mesh(p, n, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, closed, "centripetal"), 28, radius, 7, closed), m);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const arch = (p: THREE.Object3D, n: string, cx: number, bottom: number, shoulder: number, radius: number, depth: number, m: THREE.Material, plane: "x" | "z") => {
  const pts = [v(cx - radius, bottom, depth), v(cx - radius, shoulder, depth)];
  for (let i = 1; i <= 16; i++) { const a = Math.PI - Math.PI * i / 16; pts.push(v(cx + Math.cos(a) * radius, shoulder + Math.sin(a) * radius, depth)); }
  pts.push(v(cx + radius, bottom, depth));
  if (plane === "x") for (const pt of pts) { const q = pt.x; pt.x = depth; pt.z = q; }
  return tube(p, n, pts, .055, m);
};

function floorTexture() {
  const c = document.createElement("canvas"); c.width = 256; c.height = 512;
  const ctx = c.getContext("2d")!; ctx.fillStyle = "#c08b64"; ctx.fillRect(0, 0, 256, 512);
  let seed = 29; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 190; i++) { ctx.beginPath(); ctx.strokeStyle = `rgba(${random() < .5 ? "80,41,22" : "255,226,183"},${.025 + random() * .1})`; ctx.lineWidth = .3 + random() * 2; const x = random() * 256; ctx.moveTo(x, 0); ctx.bezierCurveTo(x + random() * 15, 170, x - random() * 15, 360, x + random() * 10, 512); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

function addArchitecture(root: THREE.Group) {
  const a = group(root, "01_ARCHITECTURE"); const floor = group(a, "Floor");
  box(floor, "subfloor", 10.2, .2, 18.2, 0, -.13, 0, M.DarkWood);
  box(floor, "entrance-threshold", 10, .08, 2.1, 0, -.03, 10.05, M.WarmWhiteMarble);
  softBox(floor, "beige-doormat", 3.2, .035, 1.25, .018, 0, .03, 9.76, M.IvoryUpholstery);
  box(floor, "brass-threshold-strip", 10, .018, .045, 0, .025, 9.03, M.BrushedBrass);
  const wood = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: .76, color: 0xffffff });
  const plankGeometry = new THREE.BoxGeometry(.62, .035, 1.94);
  const boards = new THREE.InstancedMesh(plankGeometry, wood, 16 * 9); boards.name = "WarmOakPlanks"; boards.receiveShadow = true;
  const dummy = new THREE.Object3D(); let index = 0;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) { dummy.position.set(-4.66 + i * .62, -.015, -7.85 + j * 1.96 + (i % 2) * .25); dummy.updateMatrix(); boards.setMatrixAt(index++, dummy.matrix); }
  floor.add(boards);
  const walls = group(a, "Walls"); box(walls, "rear-left", 7.25, 4.8, .2, -1.375, 2.4, -9, M.CreamWall); box(walls, "rear-right", .25, 4.8, .2, 4.875, 2.4, -9, M.CreamWall);
  box(walls, "rear-arch-header", 2.5, 1.0, .2, 3.5, 4.3, -9, M.CreamWall);
  // Four pedicure niches are open in the wall mesh and backed 35 cm deeper.
  for (const [start, end] of [[-9, -5.65], [-3.75, -2.45], [-.55, .75], [2.65, 3.95], [5.85, 9]])
    box(walls, "right-wall-solid", .22, 4.8, end - start, 5.1, 2.4, (start + end) / 2, M.CreamWall);
  for (const z of [-7.9, -5.5, -3.1, -.7, 1.7, 4.1, 6.5, 8.35]) box(walls, `left-pier-${z}`, .22, 4.8, z === 8.35 ? 1.3 : .42, -5.1, 2.4, z, M.CreamWall);
  const windows = group(a, "Left_Arched_Windows");
  for (const [i, z] of [-6.7, -4.3, -1.9, .5, 2.9, 5.3, 7.3].entries()) {
    const w = group(windows, `Window_${i + 1}`, 0, 0, z);
    box(w, "sill", .42, .12, 1.87, -5.08, .55, 0, M.WarmWhiteMarble);
    box(w, "top-spandrel", .22, 1.1, 1.96, -5.1, 4.25, 0, M.CreamWall);
    const glassOutline = new THREE.Shape(); glassOutline.moveTo(-.83, .62); glassOutline.lineTo(.83, .62); glassOutline.lineTo(.83, 2.75); glassOutline.absarc(0, 2.75, .83, 0, Math.PI, false); glassOutline.lineTo(-.83, .62);
    const glass = mesh(w, "arched-glass-pane", new THREE.ShapeGeometry(glassOutline, 20), M.ClearGlass, -5.12, 0, 0); glass.rotation.y = Math.PI / 2; glass.castShadow = false;
    arch(w, "arched-frame", 0, .62, 2.75, .83, -5.09, M.DarkWood, "x");
    box(w, "center-mullion", .06, 2.75, .06, -5.08, 1.94, 0, M.DarkWood);
    for (const h of [1.3, 2.15]) box(w, `crossbar-${h}`, .06, .04, 1.7, -5.08, h, 0, M.DarkWood);
    const curtain = mesh(w, "sheer-curtain", new THREE.PlaneGeometry(1.48, 3.25, 14, 1), M.SheerCurtain, -4.9, 2.15, 0); curtain.rotation.y = Math.PI / 2;
    const positions = curtain.geometry.attributes.position; for (let k = 0; k < positions.count; k++) positions.setZ(k, Math.sin(positions.getX(k) * 28) * .055); positions.needsUpdate = true; curtain.geometry.computeVertexNormals();
  }
  const entrance = group(a, "Entrance_Doors");
  for (const x of [-2.55, 2.55]) box(entrance, "side-glass", 4.7, 3.5, .035, x, 1.9, 9.05, M.ClearGlass);
  for (const x of [-4.95, -.9, .9, 4.95]) box(entrance, "gold-post", .055, 3.65, .08, x, 1.88, 9.02, M.ChampagneGoldMetal);
  box(entrance, "gold-header", 10, .08, .1, 0, 3.72, 9.02, M.ChampagneGoldMetal);
  for (const x of [-.45, .45]) { box(entrance, "door-glass", .035, 3.48, .88, x, 1.9, 9.03, M.ClearGlass); cyl(entrance, "handle", .022, .022, .58, x > 0 ? .1 : -.1, 1.35, 8.94, M.ChampagneGoldMetal); }
  const ceiling = group(a, "Ceiling"); box(ceiling, "ivory-slab", 10.15, .14, 18.15, 0, 4.8, 0, M.IvoryCeiling);
  for (let x = -4.5; x <= 4.5; x += 1.5) box(ceiling, "ceiling-grid-long", .017, .022, 18, x, 4.71, 0, M.BrushedBrass);
  for (let z = -8.4; z <= 8.4; z += 2.4) box(ceiling, "ceiling-grid-cross", 10, .022, .017, 0, 4.71, z, M.BrushedBrass);
  const panels = group(ceiling, "recessed-light-panels");
  for (const z of [-7.3, -4.6, -1.9, .8, 3.5, 6.2]) for (const x of [-1.55, 1.55]) { softBox(panels, "panel-frame", .95, .045, .52, .018, x, 4.69, z, M.WarmWhiteMarble); box(panels, "warm-panel", .82, .009, .39, x, 4.66, z, M.EmissiveWarmLED); }
  for (const x of [-4.85, 4.85]) box(ceiling, "cove-led", .035, .015, 17.5, x, 4.61, 0, M.EmissiveWarmLED);
  const corridor = group(a, "Rear_Corridor");
  box(corridor, "corridor-floor", 2.25, .18, 4.4, 3.57, -.1, -11.3, M.WarmOakFloor);
  for (const x of [2.45, 4.7]) box(corridor, "corridor-wall", .18, 4.5, 4.3, x, 2.25, -11.2, M.CreamWall);
  box(corridor, "corridor-roof", 2.45, .12, 4.3, 3.57, 4.55, -11.2, M.IvoryCeiling);
  for (const z of [-9.06, -10.45, -11.9]) { arch(corridor, "real-depth-arch", 3.57, .1, 2.86, 1.06, z, M.WarmWhiteMarble, "z"); arch(corridor, "arch-led", 3.57, .18, 2.86, .96, z + .025, M.EmissiveWarmLED, "z"); }
  box(corridor, "closed-corridor-end", 2.28, 4.5, .16, 3.57, 2.25, -13.38, M.CreamWall);
  const niches = group(a, "Right_Wall_Arches");
  for (const [i, z] of [-4.7, -1.5, 1.7, 4.9].entries()) {
    const n = group(niches, `Niche_${i + 1}`, 0, 0, z);
    box(n, "recess-back", .035, 3.35, 1.9, 5.34, 2.08, 0, M.IvoryUpholstery);
    box(n, "solid-wall-below-recess", .22, .44, 1.9, 5.1, .22, 0, M.CreamWall);
    const crown = new THREE.Shape(); crown.moveTo(-.95, 2.65); crown.lineTo(-.95, 4.8); crown.lineTo(.95, 4.8); crown.lineTo(.95, 2.65); crown.absarc(0, 2.65, .95, 0, Math.PI, false);
    const archWall = mesh(n, "arched-wall-crown", new THREE.ExtrudeGeometry(crown, { depth: .22, bevelEnabled: false, curveSegments: 20 }), M.CreamWall, 4.99, 0, 0); archWall.rotation.y = Math.PI / 2;
    arch(n, "raised-arch-lip", 0, .44, 2.65, .93, 5.02, M.WarmWhiteMarble, "x");
    arch(n, "warm-recess-led", 0, .5, 2.65, .85, 5.04, M.EmissiveWarmLED, "x");
    for (const q of [-.93, .93]) box(n, "side-reveal", .35, 2.23, .04, 5.18, 1.55, q, M.CreamWall);
  }
  return { floor: box(floor, "floor-raycast", 10, .015, 18, 0, .005, 0, new THREE.MeshBasicMaterial({ visible: false })) };
}

function addPlant(p: THREE.Object3D, name: string, x: number, z: number, height = 1.45) {
  const plant = group(p, name, x, 0, z);
  cyl(plant, "cream-pot", .23, .19, .42, 0, .22, 0, M.IvoryUpholstery);
  cyl(plant, "pot-rim", .245, .245, .055, 0, .44, 0, M.ChampagneGoldMetal);
  cyl(plant, "stem", .035, .05, height * .65, 0, .7, 0, M.DarkWood);
  for (let i = 0; i < 10; i++) {
    const angle = i * 2.399;
    const radius = .29 + (i % 3) * .08;
    const y = .85 + (i % 4) * .2;
    ball(plant, `leaf-${i}`, Math.cos(angle) * radius, y, Math.sin(angle) * radius, .16, .35, .1, M.NaturalPlantLeaves).rotation.y = angle;
  }
  return plant;
}

function addReception(root: THREE.Group) {
  const r = group(root, "02_RECEPTION", -.7, 0, 2.8); const desk = group(r, "Reception_Desk", -3.75, 0, 6.6);
  // A thick curved countertop, curved face and individual vertical timber flutes.
  const outline = new THREE.Shape(); outline.moveTo(-1.05, -.56); outline.lineTo(.65, -.56); outline.quadraticCurveTo(1.1, -.55, 1.12, -.1); outline.lineTo(1.12, .42); outline.quadraticCurveTo(1.1, .58, .9, .6); outline.lineTo(-1.05, .6); outline.quadraticCurveTo(-1.22, .58, -1.22, .4); outline.lineTo(-1.22, -.38); outline.quadraticCurveTo(-1.22, -.56, -1.05, -.56);
  const top = mesh(desk, "rounded-marble-top", new THREE.ExtrudeGeometry(outline, { depth: .095, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 3, steps: 1 }), M.WarmWhiteMarble, 0, 1.04, 0); top.rotation.x = -Math.PI / 2;
  const base = softBox(desk, "rounded-wood-body", 2.15, 1.02, .96, .14, -.02, .53, 0, M.DarkWood);
  for (let x = -1.07; x <= 1.08; x += .075) box(desk, `vertical-flute-${x.toFixed(2)}`, .027, .84, .025, x, .55, .495, M.WarmOakFloor);
  box(desk, "brass-toe-kick", 2.12, .045, 1, -.02, .06, 0, M.ChampagneGoldMetal);
  box(desk, "warm-under-counter-light", 2.12, .025, .03, -.02, .97, .49, M.EmissiveWarmLED);
  const pos = group(r, "POS_Terminal", -3.9, 1.17, 6.38); softBox(pos, "black-screen", .4, .27, .035, .02, 0, .19, 0, M.BlackGlossyCeramic); box(pos, "brass-stand", .06, .18, .055, 0, .05, -.05, M.BrushedBrass);
  const vase = group(r, "Flower_Vase", -4.58, 1.17, 6.36); cyl(vase, "gold-vase", .1, .16, .24, 0, .12, 0, M.ChampagneGoldMetal);
  for (let i = 0; i < 7; i++) { const a = i * 2.4; tube(vase, "stem", [v(0, .23, 0), v(Math.cos(a) * .11, .38, Math.sin(a) * .11), v(Math.cos(a) * .18, .54, Math.sin(a) * .18)], .008, M.NaturalPlantLeaves); ball(vase, "pastel-rose", Math.cos(a) * .18, .54, Math.sin(a) * .18, .09, .08, .09, M.Flower); }
  const lamp = group(r, "Decorations", -3.16, 1.16, 6.38); cyl(lamp, "lamp-base", .1, .1, .04, 0, .02, 0, M.BrushedBrass); cyl(lamp, "lamp-stem", .012, .012, .21, 0, .13, 0, M.BrushedBrass); ball(lamp, "glowing-shade", 0, .3, 0, .15, .11, .15, M.EmissiveWarmLED);
  addPlant(r, "reception-plant", -4.6, 5.1);
  const hit = box(desk, "Reception_Interaction", 2.6, 1.7, 1.6, 0, .8, 0, new THREE.MeshBasicMaterial({ visible: false })); hit.userData.action = "reception";
  return hit;
}

function addLounge(root: THREE.Group) {
  const l = group(root, "05_REAR_LOUNGE", 0, 0, -2.3);
  const sofa = group(l, "Sofa", -.8, 0, -7.28);
  softBox(sofa, "upholstered-base", 2.75, .39, .87, .17, 0, .53, 0, M.DustyRoseSofa);
  softBox(sofa, "deep-seat-cushion", 2.53, .17, .78, .08, 0, .81, .06, M.DustyRoseSofa);
  const back = softBox(sofa, "soft-curved-back", 2.62, .76, .27, .13, 0, 1.12, -.36, M.DustyRoseSofa); back.rotation.x = -.1;
  for (const x of [-1.28, 1.28]) { softBox(sofa, "rounded-arm", .25, .69, .95, .12, x, .9, -.02, M.DustyRoseSofa); cyl(sofa, "slim-gold-foot", .025, .025, .13, x, .07, .3, M.ChampagneGoldMetal); }
  for (const x of [-.87, .8]) ball(sofa, "blush-pillow", x, 1.04, -.12, .3, .24, .14, M.BlushPinkFabric);
  const rug = cyl(l, "oval-cream-rug", 1, 1, .025, -.75, .026, -6.13, M.IvoryUpholstery, 48); rug.scale.set(1.93, 1, 1.14); rug.castShadow = false;
  const table = group(l, "Coffee_Table", -.7, 0, -6.1);
  cyl(table, "round-marble-top", .54, .54, .055, 0, .43, 0, M.WarmWhiteMarble, 32);
  cyl(table, "brass-rim", .55, .55, .024, 0, .405, 0, M.ChampagneGoldMetal, 32);
  cyl(table, "brass-column", .12, .16, .38, 0, .2, 0, M.BrushedBrass, 20);
  cyl(table, "small-flower-vase", .085, .105, .15, 0, .52, 0, M.ChampagneGoldMetal);
  for (let i = 0; i < 5; i++) ball(table, "pink-flowers", Math.cos(i * 2.4) * .11, .67, Math.sin(i * 2.4) * .11, .06, .055, .06, M.Flower);
  addPlant(l, "lounge-plant-left", -3.08, -7.7); addPlant(l, "lounge-plant-right", 1.24, -7.7);
}

function addDisplay(root: THREE.Group) {
  const d = group(root, "06_DISPLAY", 0, 0, -2.25); const shelf = group(d, "Nail_Polish_Shelves", -1.45, 0, -8.79);
  softBox(shelf, "rounded-shelf-back", 3.7, 1.72, .18, .06, 0, 3.06, 0, M.IvoryUpholstery);
  for (const y of [2.48, 2.82, 3.16, 3.5]) { box(shelf, "gold-shelf", 3.42, .025, .24, 0, y, .16, M.ChampagneGoldMetal); box(shelf, "led-under-shelf", 3.38, .012, .045, 0, y - .028, .27, M.EmissiveWarmLED); }
  const bottles = group(d, "Nail_Polish_Bottles", -1.45, 0, -8.49);
  const count = 4 * 25; const bodyGeometry = new RoundedBoxGeometry(.088, .128, .08, 2, .012); const capGeometry = new THREE.CylinderGeometry(.026, .026, .078, 8);
  const body = new THREE.InstancedMesh(bodyGeometry, M.NailPink, count); body.name = "100-individually-positioned-bottle-bodies"; const caps = new THREE.InstancedMesh(capGeometry, M.BlackGlossyCeramic, count); caps.name = "100-bottle-caps";
  const dummy = new THREE.Object3D(); let k = 0;
  for (let row = 0; row < 4; row++) for (let col = 0; col < 25; col++) {
    const x = -1.61 + col * .134, y = 2.56 + row * .34;
    dummy.position.set(x, y, 0); dummy.updateMatrix(); body.setMatrixAt(k, dummy.matrix);
    dummy.position.y = y + .103; dummy.updateMatrix(); caps.setMatrixAt(k, dummy.matrix);
    const color = new THREE.Color().setHSL(((col / 25) * .9 + row * .035) % 1, .48, .63); body.setColorAt(k, color); k++;
  }
  bottles.add(body, caps);
  const frames = group(d, "Nail_Sample_Frames", 1.3, 0, -8.78);
  for (const [j, x] of [-.48, .48].entries()) {
    const f = group(frames, `Sample_Board_0${j + 1}`, x, 3.05, 0);
    softBox(f, "cream-rounded-frame", .82, 1.38, .08, .045, 0, 0, 0, M.WarmWhiteMarble);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) { const nail = softBox(f, "raised-sample-nail", .11, .22, .025, .012, -.27 + col * .18, .43 - row * .27, .06, mat([0xf1c6bb, 0xd5a39b, 0xb78682, 0xe8d2bc, 0xc38e9c][(row + col + j) % 5], .35)); nail.rotation.z = (col - 1.5) * .06; }
  }
}

function addDecorAndLights(root: THREE.Group) {
  const decor = group(root, "07_DECORATIONS");
  addPlant(decor, "window-plant-front", -5.55, 9.1); addPlant(decor, "window-plant-middle", -5.55, -1.6);
  addPlant(decor, "pedicure-plant", 5.5, -9.1); addPlant(decor, "corridor-plant", 3.2, -14.3, 1.05);
  const lights = group(root, "08_LIGHTING");
  lights.add(new THREE.HemisphereLight(0xfff9ed, 0xb89e8d, 1.45));
  const sun = new THREE.DirectionalLight(0xffe3c5, 2.35); sun.name = "Natural_Light_from_left_windows"; sun.position.set(-8, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15; sun.shadow.camera.near = .5; sun.shadow.camera.far = 30; sun.shadow.bias = -.0002; lights.add(sun);
  for (const z of [5.4, 0, -5.4, -9.5]) { const point = new THREE.PointLight(0xffe2be, 18, 9, 2); point.position.set(.5, 4.8, z); point.name = "Ceiling_Lights"; lights.add(point); }
  const deskLight = new THREE.PointLight(0xffc68e, 5, 3, 2); deskLight.position.set(-4.0, 1.68, 9.35); deskLight.name = "Decorative_LED_reception"; lights.add(deskLight);
  const cameras = group(root, "09_CAMERAS");
  for (const [name, spec] of Object.entries(SALON_VIEWS)) { const marker = group(cameras, name, ...spec.position); marker.userData.target = spec.target; }
}

function addManicurePendants(root: THREE.Group) {
  const zone = group(root, "03_MANICURE");
  const pendant = group(zone, "Pendant_Lights", 0, .4, 0);
  for (const [i, z] of SALON_LAYOUT.manicureZ.entries()) {
    const lamp = group(pendant, `Pendant_0${i + 1}`, SALON_LAYOUT.manicureX, 0, z);
    cyl(lamp, "suspension-cable", .012, .012, 1.55, 0, 3.94, 0, M.BrushedBrass, 8);
    const shade = mesh(lamp, "ribbed-glass-bell", new THREE.LatheGeometry([new THREE.Vector2(.12, 0), new THREE.Vector2(.31, .04), new THREE.Vector2(.37, .13), new THREE.Vector2(.33, .27), new THREE.Vector2(.18, .37), new THREE.Vector2(.08, .4)], 20), new THREE.MeshPhysicalMaterial({ color: 0xffddb1, roughness: .25, transparent: true, opacity: .65, side: THREE.DoubleSide }), 0, 2.98, 0);
    shade.castShadow = false;
    cyl(lamp, "gold-rim", .36, .36, .025, 0, 3.0, 0, M.ChampagneGoldMetal);
    ball(lamp, "warm-bulb", 0, 3.07, 0, .12, .12, .12, M.EmissiveWarmLED);
    if (i === 1) { const light = new THREE.PointLight(0xffd1a5, 12, 6, 2); light.position.set(0, 3.04, 0); lamp.add(light); }
  }
}

export function buildSalonEnvironmentV2() {
  const root = new THREE.Group(); root.name = "NAIL_SALON_V2";
  const architecture = addArchitecture(root);
  root.getObjectByName("01_ARCHITECTURE")?.scale.set(...SALON_LAYOUT.architectureScale);
  const receptionHit = addReception(root);
  addManicurePendants(root); group(root, "04_PEDICURE");
  const manicureSeats = SALON_LAYOUT.manicureZ.map((z) => v(SALON_LAYOUT.manicureX, 0, z + .95));
  addLounge(root); addDisplay(root); addDecorAndLights(root);
  return { root, floor: architecture.floor, receptionHit, manicureSeats, materials: M };
}
