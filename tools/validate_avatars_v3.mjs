import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3 } from "three";

const directory = resolve("apps/web/public/models/avatars");
const loader = new GLTFLoader();
const manifest = JSON.parse(readFileSync(resolve(directory, "manifest.json"), "utf8"));
assert.equal(manifest.version, 3);
assert.equal(manifest.animated, false);
assert.equal(manifest.avatars.length, 8);
assert.equal(new Set(manifest.avatars.map((avatar) => avatar.id)).size, 8);

for (const avatar of manifest.avatars) {
  const file = resolve(directory, `${avatar.id}.glb`);
  const buffer = readFileSync(file);
  assert.equal(buffer.toString("ascii", 0, 4), "glTF", avatar.id);
  assert.equal(buffer.readUInt32LE(8), buffer.length, avatar.id);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a, avatar.id);
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength));
  assert.ok(gltf.scenes?.length > 0, `${avatar.id}: no scene`);
  assert.ok(gltf.meshes?.length > 0, `${avatar.id}: no meshes`);
  assert.ok(gltf.materials?.length > 0, `${avatar.id}: no materials`);
  for (const mesh of gltf.meshes) {
    for (const primitive of mesh.primitives) {
      assert.ok(primitive.attributes.POSITION !== undefined, `${avatar.id}: missing positions`);
      assert.ok(primitive.attributes.NORMAL !== undefined, `${avatar.id}: missing normals`);
      assert.ok(primitive.indices !== undefined, `${avatar.id}: missing indices`);
    }
  }
  assert.equal(gltf.animations?.length ?? 0, 0, avatar.id);
  const names = gltf.nodes.map((node) => node.name ?? "");
  for (const part of ["Head", "Eye_white_-1", "Eye_white_1", "Iris_-1", "Iris_1"]) {
    assert.ok(names.some((name) => name === part || name.startsWith(`${part}.`)), `${avatar.id}: missing ${part}`);
  }
  if (avatar.role === "child") {
    assert.ok(names.some((name) => name.startsWith("Child_hoodie")), `${avatar.id}: missing child body`);
  }
  const model = await loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), "");
  assert.ok(model.scene.children.length > 0, `${avatar.id}: empty Three.js scene`);
  const bounds = new Box3().setFromObject(model.scene);
  assert.ok(bounds.min.y >= -0.03 && bounds.min.y <= 0.10, `${avatar.id}: feet not near origin`);
  assert.ok(bounds.max.y >= 1.2 && bounds.max.y <= 2.6, `${avatar.id}: unexpected height`);
  console.log(`${avatar.id}: ${gltf.meshes.length} meshes, ${gltf.materials.length} materials, ${(buffer.length / 1024).toFixed(0)} KiB`);
}
console.log("Eight V3 GLBs passed structural validation.");
