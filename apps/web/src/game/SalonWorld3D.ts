import * as THREE from "three";
import { SERVICES, STATIONS, type Player, type RoomState, type StationId } from "@nail-online/shared";

const toWorld = (x: number, y: number) => new THREE.Vector3((x - 480) / 62, 0, (y - 270) / 47);
const materials = {
  floor: new THREE.MeshStandardMaterial({ color: 0xf0ded0, roughness: 0.9 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xfff2eb, roughness: 0.96 }),
  rose: new THREE.MeshStandardMaterial({ color: 0xb76d7f, roughness: 0.62 }),
  blush: new THREE.MeshStandardMaterial({ color: 0xe9b6b4, roughness: 0.7 }),
  wood: new THREE.MeshStandardMaterial({ color: 0xb98668, roughness: 0.75 }),
  cream: new THREE.MeshStandardMaterial({ color: 0xfff9f3, roughness: 0.55 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd5ab69, metalness: 0.55, roughness: 0.3 }),
  green: new THREE.MeshStandardMaterial({ color: 0x658d78, roughness: 0.8 }),
};

function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, top: number, bottom: number, height: number, x: number, y: number, z: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 12), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
function label(text: string, color = "#573845") {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(255,249,245,.94)"; ctx.beginPath(); ctx.roundRect(8, 12, 496, 104, 28); ctx.fill();
  ctx.fillStyle = color; ctx.font = "bold 42px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 64, 470);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(2.5, .63, 1); return sprite;
}

export class SalonWorld3D {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  private renderer: THREE.WebGLRenderer;
  private avatars = new Map<string, THREE.Group>();
  private chairLights = new Map<StationId, THREE.Mesh>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private floor: THREE.Mesh;
  private interactables: THREE.Object3D[] = [];
  private frame = 0;
  private resizeObserver: ResizeObserver;

  constructor(private host: HTMLElement, private onMove: (x: number, y: number) => void, private onReception: () => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xf8e9e4);
    this.scene.fog = new THREE.Fog(0xf8e9e4, 18, 36);
    this.camera.position.set(9.5, 11.5, 15.5); this.camera.lookAt(0, .5, .2);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xc9a99c, 1.65));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1); sun.position.set(-5, 13, 8); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -12; sun.shadow.camera.right = 12; sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12; this.scene.add(sun);
    const room = new THREE.Group(); this.scene.add(room);
    this.floor = box(room, 16, .25, 12, 0, -.16, 0, materials.floor);
    box(room, 16, 5, .2, 0, 2.35, -6, materials.wall);
    box(room, .2, 5, 12, -8, 2.35, 0, materials.wall);
    box(room, 16.6, .2, .45, 0, 4.76, -6, materials.gold);
    box(room, .25, .08, 11.8, -7.84, .02, 0, materials.wood);
    for (let x = -7; x <= 7; x += 2) box(room, .035, .014, 12, x, -.025, 0, materials.cream);
    this.addReception(room);
    this.addStations(room);
    this.addDecor(room);
    this.renderer.domElement.addEventListener("pointerdown", this.handlePointer);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host); this.resize(); this.tick();
  }

  private addReception(room: THREE.Group) {
    const p = toWorld(190, 150);
    box(room, 3.1, 1.2, 1.15, p.x, .6, p.z, materials.wood);
    box(room, 3.35, .18, 1.35, p.x, 1.27, p.z, materials.cream);
    box(room, 2.9, .45, .08, p.x, .86, p.z + .59, materials.rose);
    const sign = label("LỄ TÂN  •  CHỌN DỊCH VỤ"); sign.position.set(p.x, 2.45, -5.7); sign.scale.set(4.1, 1, 1); room.add(sign);
    const hit = box(room, 3.7, 2.5, 2.2, p.x, 1.1, p.z, new THREE.MeshBasicMaterial({ visible: false })); hit.userData.action = "reception"; this.interactables.push(hit);
    for (const x of [-5.7, -4.9, -4.1]) { cylinder(room, .11, .11, .28, x, 1.52, p.z + .15, materials.gold); cylinder(room, .16, .16, .08, x, 1.7, p.z + .15, materials.blush); }
  }
  private addStations(room: THREE.Group) {
    for (const [index, station] of STATIONS.entries()) {
      const p = toWorld(station.x, station.y);
      box(room, 2.2, .12, 1.05, p.x, 1.03, p.z - .75, materials.cream);
      for (const dx of [-.88, .88]) box(room, .11, 1, .1, p.x + dx, .51, p.z - .75, materials.gold);
      box(room, 1.14, .3, .9, p.x, .54, p.z + .12, materials.rose);
      box(room, 1.14, 1.08, .22, p.x, 1.12, p.z + .6, materials.rose);
      cylinder(room, .12, .16, .28, p.x, .23, p.z + .12, materials.gold);
      const light = new THREE.Mesh(new THREE.SphereGeometry(.12, 12, 8), new THREE.MeshStandardMaterial({ color: 0x87b8a0, emissive: 0x44745a, emissiveIntensity: .4 })); light.position.set(p.x + 1.05, 1.45, p.z - .83); room.add(light); this.chairLights.set(station.id, light);
      const marker = label(`GHẾ ${index + 1}`); marker.position.set(p.x, 2.45, p.z - 1.2); marker.scale.set(1.6, .42, 1); room.add(marker);
      for (const dx of [-.45, 0, .45]) cylinder(room, .09, .1, .28, p.x + dx, 1.24, p.z - .73, dx === 0 ? materials.rose : materials.gold);
    }
  }
  private addDecor(room: THREE.Group) {
    const logo = label("NAIL BAR  ✦  STUDIO"); logo.position.set(1.7, 3.4, -5.72); logo.scale.set(5.5, 1.22, 1); room.add(logo);
    for (const x of [1.5, 2.2, 2.9, 3.6, 4.3, 5]) box(room, .36, .44, .16, x, 2.1, -5.75, [materials.rose, materials.blush, materials.gold, materials.green][Math.round(x * 10) % 4]);
    for (const x of [-6.8, 6.8]) {
      cylinder(room, .34, .26, .5, x, .25, -4.5, materials.cream);
      cylinder(room, .07, .09, 1.65, x, 1.25, -4.5, materials.wood);
      for (const [dx, dy] of [[-.4, 1.8], [.45, 2.1], [0, 2.45]]) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(.46, 10, 8), materials.green); leaf.scale.set(.8, 1.5, .65); leaf.position.set(x + dx, dy, -4.5); room.add(leaf); }
    }
    box(room, 3.8, .035, 2.2, 0, -.015, 4.1, new THREE.MeshStandardMaterial({ color: 0xe9c5c2, roughness: 1 }));
    const lamp = new THREE.PointLight(0xffdab7, 14, 7); lamp.position.set(0, 3.9, 0); room.add(lamp);
    cylinder(room, .22, .22, .12, 0, 4.25, 0, materials.gold);
  }

  sync(state: RoomState, selfId: string) {
    for (const station of state.stations) {
      const mesh = this.chairLights.get(station.id);
      const material = mesh?.material as THREE.MeshStandardMaterial | undefined;
      material?.color.set(station.occupantId ? 0xdf8c84 : 0x87b8a0);
    }
    const present = new Set(state.players.map((p) => p.id));
    for (const [id, avatar] of this.avatars) if (!present.has(id)) { this.scene.remove(avatar); this.disposeAvatar(avatar); this.avatars.delete(id); }
    for (const player of state.players) {
      let avatar = this.avatars.get(player.id);
      if (!avatar) { avatar = this.createAvatar(player, player.id === selfId); this.avatars.set(player.id, avatar); this.scene.add(avatar); }
      const target = player.phase === "walking" ? STATIONS.find((s) => s.id === player.stationId) : null;
      avatar.userData.target = toWorld(target?.x ?? player.x, target?.y ?? player.y);
      avatar.userData.seated = player.phase === "seated";
      avatar.userData.walking = player.phase === "walking";
      if (player.phase === "seated") avatar.userData.service = SERVICES.find((s) => s.id === player.serviceId)?.name;
    }
  }
  private createAvatar(player: Player, self: boolean) {
    const group = new THREE.Group(); const p = toWorld(player.x, player.y); group.position.copy(p);
    const dress = new THREE.MeshStandardMaterial({ color: self ? 0x9f5673 : 0x5e8b83, roughness: .8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xedbea5, roughness: .8 });
    cylinder(group, .28, .42, .8, 0, .63, 0, dress);
    cylinder(group, .16, .16, .35, -.16, .19, 0, materials.wood); cylinder(group, .16, .16, .35, .16, .19, 0, materials.wood);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.27, 12, 10), skin); head.position.y = 1.25; group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 10), new THREE.MeshStandardMaterial({ color: 0x4b3437 })); hair.scale.set(1, .58, 1); hair.position.y = 1.43; group.add(hair);
    const tag = label(player.name); tag.position.y = 1.95; tag.scale.set(1.65, .43, 1); group.add(tag);
    group.userData.target = p.clone(); return group;
  }
  private disposeAvatar(group: THREE.Group) { group.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); if (object instanceof THREE.Sprite) (object.material as THREE.SpriteMaterial).map?.dispose(); }); }
  private handlePointer = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.raycaster.intersectObjects(this.interactables)[0]) { this.onReception(); return; }
    const hit = this.raycaster.intersectObject(this.floor)[0];
    if (hit) this.onMove(Math.max(48, Math.min(912, hit.point.x * 62 + 480)), Math.max(190, Math.min(492, hit.point.z * 47 + 270)));
  };
  private resize() { const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  private tick = () => { this.frame = requestAnimationFrame(this.tick); for (const avatar of this.avatars.values()) { avatar.position.lerp(avatar.userData.target, avatar.userData.walking ? .045 : .18); avatar.scale.y += ((avatar.userData.seated ? .72 : 1) - avatar.scale.y) * .16; } this.renderer.render(this.scene, this.camera); };
  destroy() { cancelAnimationFrame(this.frame); this.resizeObserver.disconnect(); this.renderer.domElement.removeEventListener("pointerdown", this.handlePointer); for (const avatar of this.avatars.values()) this.disposeAvatar(avatar); this.scene.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); if (object instanceof THREE.Sprite) (object.material as THREE.SpriteMaterial).map?.dispose(); }); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
