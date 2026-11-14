import { useEffect, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

type Avatar = { id: string; label: string; role: "staff" | "child" | "customer"; appearance?: string; url: string };
type Manifest = { version: number; animated: boolean; avatars: Avatar[] };

export function AvatarViewer() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("Đang tải danh sách nhân vật…");
  const [host, setHost] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/models/avatars/manifest.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Manifest>;
      })
      .then((manifest) => {
        if (!Array.isArray(manifest.avatars) || manifest.avatars.length === 0) throw new Error("Danh sách rỗng");
        setAvatars(manifest.avatars);
        setSelected(manifest.avatars[0].id);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Could not load avatar manifest", error);
        setStatus("Không tải được danh sách nhân vật");
      });
    return () => controller.abort();
  }, []);

  const avatar = avatars.find((item) => item.id === selected);
  useEffect(() => {
    if (!host || !avatar) return;
    let active = true;
    setStatus(`Đang tải ${avatar.label}…`);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.6));
    renderer.setSize(Math.max(1, host.clientWidth), Math.max(1, host.clientHeight));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4e4dc);
    scene.add(new THREE.HemisphereLight(0xfff7ed, 0xb69585, 1.5));
    const key = new THREE.DirectionalLight(0xfff2df, 2.2);
    key.position.set(-2, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd7ca, .8);
    fill.position.set(3, 3, -2);
    scene.add(fill);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.16, .085, 48),
      new THREE.MeshStandardMaterial({ color: 0xe8c8bd, roughness: .85 }));
    podium.position.y = -.085;
    podium.receiveShadow = true;
    scene.add(podium);

    const camera = new THREE.PerspectiveCamera(42, 1, .05, 30);
    const child = avatar.role === "child";
    camera.position.set(1.4, child ? 1.2 : 1.55, child ? 2.8 : 3.3);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, child ? .78 : .98, 0);
    controls.minDistance = 1.2;
    controls.maxDistance = 7;
    controls.update();
    let model: THREE.Group | undefined;
    const disposeModel = (group: THREE.Group) => group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
    });
    void new GLTFLoader().loadAsync(avatar.url).then((gltf) => {
      if (!active) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      model.name = avatar.id;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = false; }
      });
      scene.add(model);
      setStatus(`${avatar.label} · mô hình 3D tĩnh, có thể xoay và phóng to`);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error("Could not load avatar", error);
      setStatus(`Không tải được mô hình ${avatar.label}`);
    });

    const resize = () => {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    let frame = 0;
    const tick = () => { frame = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); };
    tick();
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      if (model) disposeModel(model);
      podium.geometry.dispose();
      (podium.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [host, avatar?.id]);

  return <main className="viewer-page avatar-page">
    <header className="viewer-head"><div><span className="eyebrow">NAIL BAR · NHÂN VẬT 3D</span><h1>Bộ nhân vật tiệm nail</h1><p>Chọn nhân vật, kéo để xoay và chụm hai ngón để phóng to.</p></div><a className="viewer-back" href="/?view=salon-v2">← Xem tiệm</a></header>
    <div ref={setHost} className="salon-viewer avatar-canvas" aria-label="Mô hình nhân vật 3D có thể xoay" />
    <nav className="avatar-picker" aria-label="Chọn nhân vật">{avatars.map((item) =>
      <button key={item.id} className={selected === item.id ? "active" : ""} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>{item.label}</button>)}</nav>
    <p className="avatar-description">{avatar?.appearance}</p>
    <p className="viewer-note" role="status">{status}. Đây là asset để kiểm tra tạo hình; chưa có rig, hoạt ảnh hay trạng thái trong phòng nhiều người.</p>
  </main>;
}
