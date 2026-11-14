import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildSalonEnvironmentV2 } from "../SalonEnvironmentV2.ts";
import { loadFurnitureGameV3 } from "../loadFurnitureV3.ts";
import { CUSTOMER_AVATARS, SALON_GAME_STATIONS, SALON_NPCS, normalizeCustomerName, type CustomerAvatarId, type NailDesign, type SalonServiceId, type SalonStation } from "@nail-online/shared";
import { BOUNDS, OBSTACLES, canStand, findPath, type Point } from "./navigation.ts";
import { advanceCustomerGame, initialCustomerGame, type CustomerGameState } from "./customerFlow.ts";
import { createWalkRig, updateWalkRig, type WalkRig } from "./walkAnimation.ts";
import { maxPixelRatioForViewport, nextPixelRatio } from "./quality.ts";
import { addNameTag, addSpeechBubble } from "./nameTag.ts";
import { cameraYawBehind, movementDelta, turnCameraToward, turnYawToward } from "./cameraFollow.ts";
import { ENABLE_RECEPTION_PRANK, RECEPTION_PRANK_SPOT, startReceptionPrank, updateReceptionPrank, type ReceptionPrank } from "./receptionPrank.ts";

export type GameSnapshot = { game: CustomerGameState; nearReception: boolean; ready: boolean; busy: boolean; prankRunning: boolean; message: string };
const RECEPTION_APPROACH = { x: -2.55, z: 8.1 };
const TECHNICIAN_START = { x: 1.1, z: -7.3 };

export class SalonMvpWorld {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(68, 1, .05, 60);
  private readonly model = buildSalonEnvironmentV2();
  private readonly entranceGlass = this.model.root.getObjectByName("Entrance_Doors")?.children.filter((child) => child.name.includes("glass")) ?? [];
  private readonly loader = new GLTFLoader();
  private readonly player = new THREE.Group();
  private readonly receptionist = new THREE.Group();
  private readonly technician = new THREE.Group();
  private readonly keys = new Set<string>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly cameraBlocks = OBSTACLES.map((o, i) => new THREE.Box3(
    new THREE.Vector3(o.minX - .12, 0, o.minZ - .12),
    new THREE.Vector3(o.maxX + .12, i === 0 ? 1.55 : i > 4 && i < 9 ? 2.05 : 1.45, o.maxZ + .12),
  ));
  private readonly callback: (snapshot: GameSnapshot) => void;
  private readonly host: HTMLDivElement;
  private readonly observer: ResizeObserver;
  private game = initialCustomerGame();
  private playerPath: Point[] = [];
  private receptionPrank: ReceptionPrank | null = null;
  private playerGoalYaw: number | null = null;
  private technicianPath: Point[] = [];
  private playerSeating: { from: Point; elapsed: number } | null = null;
  private technicianSeating: { from: Point; elapsed: number } | null = null;
  private technicianWalking = false;
  private pendingReception = false;
  private cameraYaw = 0;
  private cameraPitch = .27;
  private movementYaw: number | null = null;
  private manualCameraUntil = 0;
  private pointer: { id: number; x: number; y: number; moved: boolean } | null = null;
  private frame = 0;
  private last = 0;
  private lastPublish = 0;
  private renderPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  private viewportWidth = 0;
  private viewportHeight = 0;
  private qualityStarted = 0;
  private qualityFrames = 0;
  private lastQualityChange = 0;
  private disposed = false;
  private ready = false;
  private busy = false;
  private message = "Đang tải tiệm và lễ tân…";
  private playerVisual: THREE.Group | null = null;
  private receptionistVisual: THREE.Group | null = null;
  private receptionistRig: WalkRig | null = null;
  private receptionistBubble: THREE.Sprite | null = null;
  private receptionistBubbleSeconds = 0;
  private technicianVisual: THREE.Group | null = null;
  private playerRig: WalkRig | null = null;
  private technicianRig: WalkRig | null = null;
  private readonly technicianCache = new Map<string, { visual: THREE.Group; rig: WalkRig }>();

  constructor(host: HTMLDivElement, callback: (snapshot: GameSnapshot) => void) {
    this.host = host; this.callback = callback;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.renderPixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = false;
    this.host.appendChild(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xf4e3db);
    this.scene.add(this.model.root);
    this.model.root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
      if (object instanceof THREE.Light) object.castShadow = false;
    });
    const sun = this.model.root.getObjectByName("Natural_Light_from_left_windows");
    if (sun instanceof THREE.DirectionalLight) sun.castShadow = false;
    this.player.name = "Player_Customer"; this.player.position.set(0, 0, 8.4); this.scene.add(this.player);
    this.receptionist.name = "Receptionist_NPC"; this.receptionist.position.set(-4.55, 0, 10.2); this.receptionist.rotation.y = Math.PI / 2; this.scene.add(this.receptionist);
    this.technician.name = "Technician_NPC"; this.technician.position.set(TECHNICIAN_START.x, 0, TECHNICIAN_START.z); this.technician.visible = false; this.scene.add(this.technician);
    this.camera.position.set(0, 2.8, 8.5);
    this.camera.lookAt(0, 1.1, 6);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(this.host); this.resize();
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerCancel);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    this.publish();
    this.frame = requestAnimationFrame(this.tick);
    void this.load();
  }

  private async load() {
    try {
      const mannequin = this.model.root.getObjectByName("03_MANICURE");
      const spa = this.model.root.getObjectByName("04_PEDICURE");
      if (mannequin) mannequin.visible = false;
      if (spa) spa.visible = false;
      const [staff] = await Promise.all([
        this.loader.loadAsync(`/models/avatars/${SALON_NPCS.receptionist.asset}.glb`),
        loadFurnitureGameV3(this.model.root, this.model.materials, () => !this.disposed),
      ]);
      if (this.disposed) return;
      this.receptionistVisual = this.installAvatar(this.receptionist, staff.scene, 1.7);
      if (ENABLE_RECEPTION_PRANK) this.receptionistRig = createWalkRig(this.receptionistVisual);
      addNameTag(this.receptionist, SALON_NPCS.receptionist.name, SALON_NPCS.receptionist.role, 1.7);
      if (ENABLE_RECEPTION_PRANK) this.receptionistBubble = addSpeechBubble(this.receptionist, "Hue Trinh đang khóc huhu", 1.7);
      if (mannequin) mannequin.visible = true;
      if (spa) spa.visible = true;
      this.ready = true;
      this.qualityStarted = performance.now();
      this.lastQualityChange = this.qualityStarted;
      this.qualityFrames = 0;
      this.message = "Chọn nhân vật để bước vào tiệm."; this.publish();
    } catch (error) {
      console.error("Could not load salon MVP", error);
      this.message = "Không tải được mô hình 3D. Hãy tải lại trang và kiểm tra các tệp GLB."; this.publish();
    }
  }

  async enterSalon(avatarId: CustomerAvatarId, rawName: string) {
    if (!this.ready || this.busy || this.game.stage !== "selecting") return;
    const avatar = CUSTOMER_AVATARS.find((item) => item.id === avatarId);
    if (!avatar) return;
    const playerName = normalizeCustomerName(rawName);
    if (!playerName) { this.message = "Tên khách cần 2–24 ký tự, chỉ gồm chữ, số, khoảng trắng và dấu nối."; this.publish(); return; }
    this.busy = true; this.message = `Đang chuẩn bị nhân vật ${playerName}…`; this.publish();
    try {
      const gltf = await this.loader.loadAsync(avatar.url);
      if (this.disposed) return;
      const height = avatarId === "customer_senior" ? 1.58 : 1.7;
      this.playerVisual = this.installAvatar(this.player, gltf.scene, height);
      this.playerRig = createWalkRig(this.playerVisual);
      addNameTag(this.player, playerName, "Khách hàng", height);
      this.player.rotation.y = Math.PI;
      this.game = advanceCustomerGame(this.game, { type: "enter", avatarId, playerName });
      this.message = "Chạm quầy lễ tân hoặc chọn Gặp lễ tân.";
    } catch (error) {
      console.error("Could not load customer avatar", error);
      this.message = "Không tải được nhân vật. Hãy chọn lại hoặc tải lại trang.";
    } finally { this.busy = false; this.publish(); }
  }

  private async prepareTechnician(assetId: string) {
    try {
      let cached = this.technicianCache.get(assetId);
      if (!cached) {
        const gltf = await this.loader.loadAsync(`/models/avatars/${assetId}.glb`);
        if (this.disposed) return;
        const visual = this.installAvatar(this.technician, gltf.scene, 1.7);
        cached = { visual, rig: createWalkRig(visual) };
        this.technicianCache.set(assetId, cached);
        addNameTag(this.technician, SALON_NPCS.technician.name, SALON_NPCS.technician.role, 1.7);
      }
      for (const entry of this.technicianCache.values()) entry.visual.visible = false;
      cached.visual.visible = true;
      this.technicianVisual = cached.visual;
      this.technicianRig = cached.rig;
      if (this.game.stage === "seated") this.startTechnicianWalk();
    } catch (error) {
      console.error("Could not load technician avatar", error);
      this.message = "Không tải được nhân viên phục vụ. Hãy tải lại trang."; this.publish();
    }
  }

  chooseService(serviceId: SalonServiceId) {
    if (this.game.stage !== "at-reception") return;
    try {
      const next = advanceCustomerGame(this.game, { type: "service", serviceId });
      const station = SALON_GAME_STATIONS.find((item) => item.id === next.stationId)!;
      const path = findPath({ x: this.player.position.x, z: this.player.position.z }, station.approach);
      if (!path.length) { this.message = "Lối đến ghế đang bị cản. Hãy thử dịch vụ khác."; this.publish(); return; }
      this.game = next;
      this.playerPath = path;
      this.movementYaw = null;
      this.playerSeating = null;
      this.technicianVisual = null; this.technicianRig = null; this.technicianWalking = false;
      this.technician.visible = false;
      this.message = `Đã xếp ${station.name}. Nhân vật đang đi tới ghế.`;
      this.publish();
      void this.prepareTechnician(SALON_NPCS.technician.asset);
    } catch (error) { this.message = error instanceof Error ? error.message : "Không chọn được dịch vụ."; this.publish(); }
  }

  private activeStation(): SalonStation | null { return SALON_GAME_STATIONS.find((station) => station.id === this.game.stationId) ?? null; }

  private startTechnicianWalk() {
    const station = this.activeStation();
    if (!station || !this.technicianVisual || this.technicianWalking || this.game.stage !== "seated") return;
    this.technician.position.set(TECHNICIAN_START.x, 0, TECHNICIAN_START.z);
    this.technician.visible = true;
    this.technicianPath = findPath(TECHNICIAN_START, station.technicianApproach);
    this.technicianSeating = null;
    this.technicianWalking = true;
    this.message = `Bạn đã ngồi. ${SALON_NPCS.technician.name} đang đến phục vụ.`; this.publish();
  }

  completeDesign(design: NailDesign) {
    const next = advanceCustomerGame(this.game, { type: "finish", design });
    if (next === this.game) return;
    this.game = next;
    this.message = "Bộ móng đã hoàn thành! Xem kết quả rồi đứng dậy.";
    this.publish();
  }

  standUp() {
    if (this.game.stage !== "result") return;
    const station = this.activeStation();
    this.game = advanceCustomerGame(this.game, { type: "stand" });
    if (station) this.player.position.set(station.approach.x, 0, station.approach.z);
    this.setSitting(this.playerRig, false, false);
    this.setSitting(this.technicianRig, false, false);
    this.technician.visible = false;
    this.technicianWalking = false;
    this.playerSeating = null;
    this.technicianSeating = null;
    this.movementYaw = null;
    this.message = "Bạn có thể khám phá tiệm hoặc quay lại quầy để chọn dịch vụ khác.";
    this.publish();
  }

  private setSitting(rig: WalkRig | null, seated: boolean, pedicure: boolean) {
    if (!rig) return;
    rig.blend = 0;
    rig.leftLeg.rotation.x = seated ? -1.05 : 0;
    rig.rightLeg.rotation.x = seated ? -1.05 : 0;
    rig.leftArm.rotation.x = seated ? -.25 : 0;
    rig.rightArm.rotation.x = seated ? -.25 : 0;
    rig.root.position.y = rig.restY + (seated ? pedicure ? -.08 : -.28 : 0);
  }

  private installAvatar(anchor: THREE.Group, visual: THREE.Group, height: number) {
    const box = new THREE.Box3().setFromObject(visual);
    const size = new THREE.Vector3(); box.getSize(size);
    const scale = height / Math.max(.01, size.y);
    visual.scale.setScalar(scale);
    visual.position.y = -box.min.y * scale;
    visual.traverse((object) => { if (object instanceof THREE.Mesh) { object.castShadow = false; object.receiveShadow = false; } });
    anchor.add(visual); return visual;
  }

  private resize = () => {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight);
    const maximum = maxPixelRatioForViewport(w, h, window.devicePixelRatio || 1);
    if (w !== this.viewportWidth || h !== this.viewportHeight) {
      this.viewportWidth = w; this.viewportHeight = h;
      this.renderPixelRatio = maximum;
      this.qualityStarted = performance.now();
      this.lastQualityChange = this.qualityStarted;
      this.qualityFrames = 0;
    } else {
      this.renderPixelRatio = Math.min(this.renderPixelRatio, maximum);
    }
    this.renderer.setPixelRatio(this.renderPixelRatio);
    this.camera.aspect = w / h;
    this.camera.fov = w < 650 ? 77 : 68;
    this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h);
  };
  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    if (event.key === "Escape" && this.game.stage === "at-reception") { event.preventDefault(); this.leaveReception(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "e", "shift"].includes(event.key.toLowerCase())) event.preventDefault();
    this.keys.add(event.key.toLowerCase()); if (event.key.toLowerCase() === "e" && !event.repeat) this.interact();
  };
  private onKeyUp = (event: KeyboardEvent) => { this.keys.delete(event.key.toLowerCase()); };
  private onBlur = () => { this.keys.clear(); this.movementYaw = null; this.pointer = null; };
  private onPointerDown = (event: PointerEvent) => {
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };
  private onPointerMove = (event: PointerEvent) => {
    if (!this.pointer || event.pointerId !== this.pointer.id) return;
    const dx = event.clientX - this.pointer.x, dy = event.clientY - this.pointer.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) this.pointer.moved = true;
    if (this.pointer.moved) { this.cameraYaw -= dx * .006; this.cameraPitch = THREE.MathUtils.clamp(this.cameraPitch + dy * .004, -.05, .72); this.manualCameraUntil = performance.now() + 1600; }
    this.pointer.x = event.clientX; this.pointer.y = event.clientY;
  };
  private onPointerUp = (event: PointerEvent) => {
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    this.pointer = null;
    if (pointer.moved || !this.ready || this.game.stage !== "exploring") return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    if (this.raycaster.intersectObject(this.model.receptionHit, true).length) { this.interact(); return; }
    const point = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.ground, point)) this.moveTo({ x: point.x, z: point.z });
  };
  private onPointerCancel = () => { this.pointer = null; };

  moveTo(goal: Point) {
    if (!this.ready || this.game.stage !== "exploring" || this.receptionPrank) return;
    this.movementYaw = null;
    const start = { x: this.player.position.x, z: this.player.position.z };
    this.playerPath = findPath(start, goal);
    const last = this.playerPath.at(-1);
    const beforeLast = this.playerPath.at(-2) ?? start;
    this.playerGoalYaw = last && Math.hypot(last.x - beforeLast.x, last.z - beforeLast.z) > .1
      ? Math.atan2(last.x - beforeLast.x, last.z - beforeLast.z) : null;
    if (!this.playerPath.length) { this.message = "Không thể đi tới vị trí đó."; this.publish(); }
  }

  interact() {
    if (!this.ready || this.game.stage !== "exploring" || this.receptionPrank) return;
    this.movementYaw = null;
    this.playerGoalYaw = null;
    if (Math.hypot(this.player.position.x - RECEPTION_APPROACH.x, this.player.position.z - RECEPTION_APPROACH.z) < 1.3) {
      this.pendingReception = false;
      this.game = advanceCustomerGame(this.game, { type: "reception" });
      this.cameraYaw = -1.35;
      this.message = `${SALON_NPCS.receptionist.name} chào đón bạn. Hãy chọn dịch vụ yêu thích.`;
    } else {
      this.playerPath = findPath({ x: this.player.position.x, z: this.player.position.z }, RECEPTION_APPROACH);
      if (!this.playerPath.length) { this.message = "Không tìm được đường tới quầy lễ tân."; this.publish(); return; }
      this.pendingReception = true;
      this.message = "Đang đi đến quầy lễ tân…";
    }
    this.publish();
  }

  leaveReception() {
    if (this.game.stage !== "at-reception") return;
    this.pendingReception = false;
    this.playerPath = [];
    this.playerGoalYaw = null;
    this.game = advanceCustomerGame(this.game, { type: "leave-reception" });
    this.message = "Bạn có thể khám phá tiệm và quay lại quầy bất cứ lúc nào.";
    this.publish();
  }

  // Self-contained optional interaction; no customer-flow or online-room event is changed.
  playReceptionPrank() {
    if (!ENABLE_RECEPTION_PRANK || !this.ready || this.game.stage !== "exploring" || this.receptionPrank || !this.playerRig || !this.receptionistRig) return false;
    const path = findPath({ x: this.player.position.x, z: this.player.position.z }, RECEPTION_PRANK_SPOT);
    if (!path.length) { this.message = "Không tìm được lối đến quầy lễ tân."; this.publish(); return false; }
    this.pendingReception = false;
    this.movementYaw = null;
    this.playerGoalYaw = null;
    this.playerPath = path;
    this.receptionPrank = startReceptionPrank(this.receptionist);
    if (this.receptionistBubble) this.receptionistBubble.visible = false;
    this.receptionistBubbleSeconds = 0;
    this.message = "Đang đi đến quầy lễ tân để thử tương tác vui…";
    this.publish();
    return true;
  }

  private distance(a: THREE.Object3D, b: THREE.Object3D) { return Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z); }
  private followPath(actor: THREE.Group, path: Point[], speed: number, dt: number): boolean {
    while (path.length) {
      const next = path[0], dx = next.x - actor.position.x, dz = next.z - actor.position.z, distance = Math.hypot(dx, dz);
      if (distance < .09) { path.shift(); continue; }
      const step = Math.min(distance, speed * dt);
      actor.position.x += dx / distance * step; actor.position.z += dz / distance * step;
      actor.rotation.y = turnYawToward(actor.rotation.y, Math.atan2(dx, dz), dt, 10);
      return true;
    }
    return false;
  }

  private easeIntoSeat(actor: THREE.Group, motion: { from: Point; elapsed: number }, target: Point, dt: number): boolean {
    motion.elapsed = Math.min(.85, motion.elapsed + dt);
    const t = motion.elapsed / .85;
    const eased = t * t * (3 - 2 * t);
    actor.position.x = THREE.MathUtils.lerp(motion.from.x, target.x, eased);
    actor.position.z = THREE.MathUtils.lerp(motion.from.z, target.z, eased);
    actor.rotation.y = Math.atan2(target.x - motion.from.x, target.z - motion.from.z);
    return t >= 1;
  }

  private tick = (time: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const elapsed = this.last ? (time - this.last) / 1000 : .016;
    const dt = Math.min(.25, elapsed); this.last = time;
    if (this.ready && this.game.stage !== "selecting") {
      if (this.receptionistBubbleSeconds > 0) {
        this.receptionistBubbleSeconds = Math.max(0, this.receptionistBubbleSeconds - dt);
        if (!this.receptionistBubbleSeconds && this.receptionistBubble) this.receptionistBubble.visible = false;
      }
      const horizontal = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
      const vertical = Number(this.keys.has("w") || this.keys.has("arrowup")) - Number(this.keys.has("s") || this.keys.has("arrowdown"));
      const previousPlayerX = this.player.position.x, previousPlayerZ = this.player.position.z;
      if (this.game.stage === "exploring" && !this.receptionPrank && (horizontal || vertical)) {
        this.playerPath = [];
        this.playerGoalYaw = null;
        this.movementYaw ??= this.cameraYaw;
        const { x: dx, z: dz } = movementDelta(horizontal, vertical, this.movementYaw, (this.keys.has("shift") ? 3.7 : 2.55) * dt);
        const x = this.player.position.x + dx, z = this.player.position.z + dz;
        if (canStand({ x, z: this.player.position.z })) this.player.position.x = x;
        if (canStand({ x: this.player.position.x, z })) this.player.position.z = z;
        if (this.player.position.x !== previousPlayerX || this.player.position.z !== previousPlayerZ)
          this.player.rotation.y = Math.atan2(this.player.position.x - previousPlayerX, this.player.position.z - previousPlayerZ);
      } else if (this.game.stage === "exploring" || this.game.stage === "walking-to-seat") {
        this.movementYaw = null;
        const moving = this.followPath(this.player, this.playerPath, 2.55, dt);
        if (this.receptionPrank?.phase === "walking" && !moving && !this.playerPath.length) {
          this.receptionPrank.phase = "gathering";
          this.receptionPrank.elapsed = 0;
        }
        if (this.game.stage === "exploring" && !moving && this.playerGoalYaw !== null) {
          this.player.rotation.y = turnYawToward(this.player.rotation.y, this.playerGoalYaw, dt, 10);
          const difference = Math.atan2(Math.sin(this.playerGoalYaw - this.player.rotation.y), Math.cos(this.playerGoalYaw - this.player.rotation.y));
          const cameraTarget = cameraYawBehind(this.playerGoalYaw);
          const cameraDifference = Math.atan2(Math.sin(cameraTarget - this.cameraYaw), Math.cos(cameraTarget - this.cameraYaw));
          if (Math.abs(difference) < .015 && Math.abs(cameraDifference) < .025) this.playerGoalYaw = null;
        }
        if (this.game.stage === "walking-to-seat" && !moving && !this.playerPath.length) {
          const station = this.activeStation();
          if (station) {
            this.playerSeating ??= { from: { x: this.player.position.x, z: this.player.position.z }, elapsed: 0 };
            if (this.easeIntoSeat(this.player, this.playerSeating, station.seat, dt)) {
              this.player.rotation.y = station.kind === "pedicure" ? -Math.PI / 2 : Math.PI;
              this.cameraYaw = station.kind === "pedicure" ? Math.PI / 2 : -Math.PI / 2;
              this.setSitting(this.playerRig, true, station.kind === "pedicure");
              this.playerSeating = null;
              this.game = advanceCustomerGame(this.game, { type: "arrive-seat" });
              this.message = `Bạn đã ngồi tại ${station.name}. Nhân viên đang đến.`;
              this.publish();
              this.startTechnicianWalk();
            }
          }
        }
      }
      const movedPlayer = Math.hypot(this.player.position.x - previousPlayerX, this.player.position.z - previousPlayerZ);
      const prankCloseUp = this.receptionPrank !== null && this.receptionPrank.phase !== "walking";
      if (prankCloseUp && time >= this.manualCameraUntil && !this.pointer?.moved)
        this.cameraYaw = turnCameraToward(this.cameraYaw, .6, dt);
      else if ((movedPlayer > .001 || this.playerGoalYaw !== null || this.receptionPrank !== null) && (this.game.stage === "exploring" || this.game.stage === "walking-to-seat") && time >= this.manualCameraUntil && !this.pointer?.moved)
        this.cameraYaw = turnCameraToward(this.cameraYaw, cameraYawBehind(this.player.rotation.y), dt);
      if (this.pendingReception && this.game.stage === "exploring" && Math.hypot(this.player.position.x - RECEPTION_APPROACH.x, this.player.position.z - RECEPTION_APPROACH.z) < 1.3) this.interact();
      const previousTechnicianX = this.technician.position.x, previousTechnicianZ = this.technician.position.z;
      if (this.game.stage === "seated" && this.technicianWalking) {
        const moving = this.followPath(this.technician, this.technicianPath, 1.65, dt);
        if (!moving && !this.technicianPath.length) {
          const station = this.activeStation();
          if (station) {
            this.technicianSeating ??= { from: { x: this.technician.position.x, z: this.technician.position.z }, elapsed: 0 };
            if (this.easeIntoSeat(this.technician, this.technicianSeating, station.technicianSeat, dt)) {
              this.technician.rotation.y = station.kind === "pedicure" ? Math.PI / 2 : 0;
              this.setSitting(this.technicianRig, station.kind === "manicure", false);
              this.technicianSeating = null;
              this.technicianWalking = false;
              this.game = advanceCustomerGame(this.game, { type: "technician-ready" });
              this.message = `${SALON_NPCS.technician.name} đã sẵn sàng. Chạm từng móng để hoàn thiện bộ móng của bạn.`;
              this.publish();
            }
          }
        }
      }
      if (this.playerRig && (this.game.stage === "exploring" || this.game.stage === "walking-to-seat"))
        updateWalkRig(this.playerRig, Math.hypot(this.player.position.x - previousPlayerX, this.player.position.z - previousPlayerZ), dt, this.keys.has("shift"));
      if (this.receptionPrank && this.playerRig && this.receptionistRig) {
        const result = updateReceptionPrank(this.receptionPrank, dt, this.player, this.receptionist, this.playerRig, this.receptionistRig);
        if (result.impact) {
          if (this.receptionistBubble) this.receptionistBubble.visible = true;
          this.receptionistBubbleSeconds = 8;
          this.message = "Hue Trinh đang khóc huhu";
          this.publish();
        }
        if (result.finished) { this.receptionPrank = null; this.publish(); }
      }
      if (this.technicianRig && this.technicianWalking)
        updateWalkRig(this.technicianRig, Math.hypot(this.technician.position.x - previousTechnicianX, this.technician.position.z - previousTechnicianZ), dt);
      if (this.technicianRig && this.game.stage === "designing") {
        this.technicianRig.leftArm.rotation.x = -.25 + Math.sin(time * .004) * .12;
        this.technicianRig.rightArm.rotation.x = -.25 - Math.sin(time * .004) * .12;
      }
      const atReception = this.game.stage === "at-reception";
      const stationView = ["seated", "designing", "result"].includes(this.game.stage) ? this.activeStation() : null;
      const lookingAhead = this.game.stage === "exploring" || this.game.stage === "walking-to-seat";
      const look = prankCloseUp ? new THREE.Vector3((this.player.position.x + this.receptionist.position.x) / 2, 1.25, (this.player.position.z + this.receptionist.position.z) / 2)
        : atReception ? new THREE.Vector3(-3.55, 1.32, 9.15)
        : stationView ? new THREE.Vector3((stationView.seat.x + stationView.technicianSeat.x) / 2, 1.32, (stationView.seat.z + stationView.technicianSeat.z) / 2)
          : new THREE.Vector3(this.player.position.x + (lookingAhead ? Math.sin(this.player.rotation.y) * .3 : 0), 1.32, this.player.position.z + (lookingAhead ? Math.cos(this.player.rotation.y) * .3 : 0));
      const distance = prankCloseUp ? (this.host.clientWidth < 650 ? 3.8 : 4.2)
        : atReception ? (this.host.clientWidth < 650 ? 4.1 : 4.6)
        : stationView ? (this.host.clientWidth < 650 ? 4.3 : 4.8)
          : (this.host.clientWidth < 650 ? 3.25 : 4.05);
      const desired = new THREE.Vector3(
        look.x - Math.sin(this.cameraYaw) * distance * Math.cos(this.cameraPitch),
        Math.min(4.28, look.y + .65 + Math.sin(this.cameraPitch) * distance),
        look.z + Math.cos(this.cameraYaw) * distance * Math.cos(this.cameraPitch),
      );
      desired.x = THREE.MathUtils.clamp(desired.x, BOUNDS.minX + .38, BOUNDS.maxX - .38);
      desired.z = THREE.MathUtils.clamp(desired.z, -8.48, 12);
      const back = desired.clone().sub(look), backDistance = back.length();
      const ray = new THREE.Ray(look, back.normalize());
      let clearDistance = backDistance;
      if (!atReception && !prankCloseUp) for (const block of this.cameraBlocks) {
        if (block.containsPoint(look)) continue;
        const hit = ray.intersectBox(block, new THREE.Vector3());
        if (hit) clearDistance = Math.min(clearDistance, Math.max(.65, look.distanceTo(hit) - .22));
      }
      desired.copy(look).addScaledVector(back, clearDistance);
      this.camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
      this.camera.lookAt(look);
      // Hide glazing only while the follow camera is almost inside the entrance.
      for (const pane of this.entranceGlass) pane.visible = this.camera.position.z < 9.3;
      if (time - this.lastPublish > 150) { this.lastPublish = time; this.publish(); }
    }
    this.renderer.render(this.scene, this.camera);
    if (this.ready) {
      if (!this.qualityStarted) this.qualityStarted = time;
      this.qualityFrames++;
      if (time - this.qualityStarted >= 3000) {
        const fps = this.qualityFrames * 1000 / (time - this.qualityStarted);
        if (time - this.lastQualityChange >= 6000) {
          const maximum = maxPixelRatioForViewport(this.host.clientWidth, this.host.clientHeight, window.devicePixelRatio || 1);
          const next = nextPixelRatio(this.renderPixelRatio, fps, maximum);
          if (next !== this.renderPixelRatio) {
            this.renderPixelRatio = next;
            this.renderer.setPixelRatio(next);
            this.resize();
            this.lastQualityChange = time;
          }
        }
        this.qualityStarted = time;
        this.qualityFrames = 0;
      }
    } else { this.qualityStarted = 0; this.qualityFrames = 0; }
  };

  private publish() {
    this.callback({ game: { ...this.game }, ready: this.ready, busy: this.busy, prankRunning: this.receptionPrank !== null, message: this.message,
      nearReception: Math.hypot(this.player.position.x - RECEPTION_APPROACH.x, this.player.position.z - RECEPTION_APPROACH.z) < 1.3 });
  }

  dispose() {
    this.disposed = true; cancelAnimationFrame(this.frame); this.observer.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener("pointerdown", this.onPointerDown); canvas.removeEventListener("pointermove", this.onPointerMove);
    canvas.removeEventListener("pointerup", this.onPointerUp); canvas.removeEventListener("pointercancel", this.onPointerCancel);
    window.removeEventListener("keydown", this.onKeyDown); window.removeEventListener("keyup", this.onKeyUp); window.removeEventListener("blur", this.onBlur);
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) { geometries.add(object.geometry); for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material); }
      if (object instanceof THREE.Sprite) { object.material.map?.dispose(); object.material.dispose(); }
    });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) { if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose(); material.dispose(); }
    this.renderer.dispose(); canvas.remove();
  }
}
