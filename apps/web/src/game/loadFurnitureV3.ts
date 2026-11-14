import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SALON_LAYOUT } from "./SalonEnvironmentV2.ts";

function zones(root: THREE.Group) {
  const manicure = root.getObjectByName("03_MANICURE");
  const pedicure = root.getObjectByName("04_PEDICURE");
  if (!(manicure instanceof THREE.Group) || !(pedicure instanceof THREE.Group)) throw new Error("Salon zones are missing");
  return { manicure, pedicure };
}

function removeProvisional(zone: THREE.Group, sharedMaterials: Record<string, THREE.Material>) {
  const shared = new Set<THREE.Material>(Object.values(sharedMaterials));
  for (const child of [...zone.children]) {
    if (child.name === "Pendant_Lights") continue;
    zone.remove(child);
    child.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        if (!shared.has(material)) material.dispose();
    });
  }
}

/** Replaces the provisional furniture with the editable Blender V3 station assets. */
export async function loadFurnitureV3(root: THREE.Group, sharedMaterials: Record<string, THREE.Material>, isActive = () => true) {
  const { manicure, pedicure } = zones(root);

  const loader = new GLTFLoader();
  const [manicureGltf, pedicureGltf] = await Promise.all([
    loader.loadAsync("/models/manicure_station_v3.glb"),
    loader.loadAsync("/models/pedicure_station_v3.glb"),
  ]);
  if (!isActive()) return { manicureStations: 0, pedicureStations: 0 };

  removeProvisional(manicure, sharedMaterials);
  removeProvisional(pedicure, sharedMaterials);

  const addStations = (zone: THREE.Group, source: THREE.Group, prefix: string, x: number, locations: readonly number[], yaw = 0) => {
    locations.forEach((z, index) => {
      const station = source.clone(true);
      station.name = `${prefix}_0${index + 1}`;
      station.position.set(x, 0, z);
      station.rotation.y = yaw;
      station.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      zone.add(station);
    });
  };
  addStations(manicure, manicureGltf.scene, "Nail_Station", SALON_LAYOUT.manicureX, SALON_LAYOUT.manicureZ);
  addStations(pedicure, pedicureGltf.scene, "Spa_Station", SALON_LAYOUT.pedicureX, SALON_LAYOUT.pedicureZ, -Math.PI / 2);
  return { manicureStations: SALON_LAYOUT.manicureZ.length, pedicureStations: SALON_LAYOUT.pedicureZ.length };
}

/** Loads material-batched game exports and draws each repeated part in one instanced call. */
export async function loadFurnitureGameV3(root: THREE.Group, sharedMaterials: Record<string, THREE.Material>, isActive = () => true) {
  const { manicure, pedicure } = zones(root);
  const loader = new GLTFLoader();
  const [manicureGltf, pedicureGltf] = await Promise.all([
    loader.loadAsync("/models/game/manicure_station_v3_game.glb"),
    loader.loadAsync("/models/game/pedicure_station_v3_game.glb"),
  ]);
  if (!isActive()) return { manicureStations: 0, pedicureStations: 0, batches: 0 };
  removeProvisional(manicure, sharedMaterials);
  removeProvisional(pedicure, sharedMaterials);

  const instanceStations = (zone: THREE.Group, source: THREE.Group, prefix: string, x: number, locations: readonly number[], yaw = 0) => {
    source.updateMatrixWorld(true);
    const placement = new THREE.Matrix4();
    const origin = new THREE.Vector3();
    const scale = new THREE.Vector3(1, 1, 1);
    const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    let batches = 0;
    source.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const instances = new THREE.InstancedMesh(object.geometry, object.material, locations.length);
      instances.name = `${prefix}_${object.name}`;
      instances.castShadow = false;
      instances.receiveShadow = false;
      locations.forEach((z, index) => {
        origin.set(x, 0, z);
        placement.compose(origin, rotation, scale).multiply(object.matrixWorld);
        instances.setMatrixAt(index, placement);
      });
      instances.instanceMatrix.needsUpdate = true;
      zone.add(instances);
      batches++;
    });
    return batches;
  };
  const manicureBatches = instanceStations(manicure, manicureGltf.scene, "Nail_Stations", SALON_LAYOUT.manicureX, SALON_LAYOUT.manicureZ);
  const pedicureBatches = instanceStations(pedicure, pedicureGltf.scene, "Spa_Stations", SALON_LAYOUT.pedicureX, SALON_LAYOUT.pedicureZ, -Math.PI / 2);
  return { manicureStations: SALON_LAYOUT.manicureZ.length, pedicureStations: SALON_LAYOUT.pedicureZ.length, batches: manicureBatches + pedicureBatches };
}
