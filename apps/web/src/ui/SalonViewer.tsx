import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildSalonEnvironmentV2, SALON_DIMENSIONS, SALON_VIEWS, type SalonView } from "../game/SalonEnvironmentV2.ts";
import { loadFurnitureV3 } from "../game/loadFurnitureV3.ts";

export function SalonViewer() {
  const mount = useRef<HTMLDivElement>(null);
  const changeView = useRef<(view: SalonView) => void>(() => {});
  const [view, setView] = useState<SalonView>("entrance");
  const [furnitureStatus, setFurnitureStatus] = useState("Đang tải nội thất V3…");
  useEffect(() => {
    const host = mount.current; if (!host) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6)); renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; host.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0xf4e3db);
    const model = buildSalonEnvironmentV2(); scene.add(model.root);
    const manicureZone = model.root.getObjectByName("03_MANICURE");
    const pedicureZone = model.root.getObjectByName("04_PEDICURE");
    if (manicureZone) manicureZone.visible = false;
    if (pedicureZone) pedicureZone.visible = false;
    let active = true;
    void loadFurnitureV3(model.root, model.materials, () => active).then(() => {
      if (!active) return;
      if (manicureZone) manicureZone.visible = true;
      if (pedicureZone) pedicureZone.visible = true;
      setFurnitureStatus("Nội thất V3 đã tải");
    }).catch((error: unknown) => {
      if (!active) return;
      if (manicureZone) manicureZone.visible = true;
      if (pedicureZone) pedicureZone.visible = true;
      console.error("Could not load V3 furniture", error);
      setFurnitureStatus("Không tải được nội thất V3; hãy tải lại trang hoặc kiểm tra hai tệp GLB");
    });
    const camera = new THREE.PerspectiveCamera(68, 1, .05, 100);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .08; controls.minDistance = .7; controls.maxDistance = 29; controls.maxPolarAngle = Math.PI * .49;
    const ceiling = model.root.getObjectByName("Ceiling"); const entrance = model.root.getObjectByName("Entrance_Doors");
    let activeView: SalonView = "entrance";
    const fieldOfView = (current: SalonView, width: number) =>
      current === "manicureDetail" || current === "pedicureDetail" ? (width < 650 ? 64 : 48) : (width < 650 ? 78 : 65);
    const setCamera = (next: SalonView) => {
      activeView = next;
      const spec = SALON_VIEWS[next];
      camera.fov = fieldOfView(next, host.clientWidth); camera.updateProjectionMatrix();
      if (next === "entrance" && host.clientWidth < 650) {
        camera.position.set(-.8, 2.35, 13.0);
        controls.target.set(0, -.8, -7.0);
      } else {
        camera.position.set(spec.position[0], spec.position[1], spec.position[2]);
        controls.target.set(spec.target[0], spec.target[1], spec.target[2]);
      }
      controls.update();
      if (ceiling) ceiling.visible = next !== "top" && next !== "overview";
      if (entrance) entrance.visible = next !== "top" && next !== "overview" && next !== "entrance";
    };
    changeView.current = setCamera; setCamera("entrance");
    let previousMobile = host.clientWidth < 650;
    const resize = () => { const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); camera.aspect = w / h; camera.fov = fieldOfView(activeView, w); camera.updateProjectionMatrix(); renderer.setSize(w, h); const mobile = w < 650; if (mobile !== previousMobile) { previousMobile = mobile; setCamera(activeView); } };
    const observer = new ResizeObserver(resize); observer.observe(host); resize();
    let frame = 0; const tick = () => { frame = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); }; tick();
    return () => {
      active = false; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      model.root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh) {
          geometries.add(object.geometry);
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) { if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose(); material.dispose(); }
      renderer.dispose(); renderer.domElement.remove(); changeView.current = () => {};
    };
  }, []);
  return <main className="viewer-page">
    <header className="viewer-head"><div><span className="eyebrow">NAIL SALON V2 · MÔ HÌNH 3D</span><h1>Khám phá không gian tiệm</h1><p>Kéo để xoay, chụm hai ngón để phóng to hoặc chọn một góc nhìn.</p></div><div className="viewer-links"><a href="/?view=avatars" className="viewer-back">Xem nhân vật 3D →</a><a href="/" className="viewer-back">← Về tiệm online</a></div></header>
    <div ref={mount} className="salon-viewer" aria-label="Mô hình 3D tiệm nail, không có nhân vật" />
    <nav className="view-buttons" aria-label="Góc camera">{(Object.keys(SALON_VIEWS) as SalonView[]).map((key) => <button key={key} className={view === key ? "active" : ""} aria-pressed={view === key} onClick={() => { setView(key); changeView.current(key); }}>{SALON_VIEWS[key].label}</button>)}</nav>
    <p className="viewer-note" role="status">{furnitureStatus}. Kích thước đang ước lượng: rộng {SALON_DIMENSIONS.width} m × dài {SALON_DIMENSIONS.length} m × trần cao {SALON_DIMENSIONS.ceiling} m. Đây là scene 3D thực, mỗi khu nội thất là một nhóm đối tượng riêng.</p>
  </main>;
}
