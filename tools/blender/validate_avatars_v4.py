"""Round-trip import all eight textured GLBs in Blender."""

import json
from pathlib import Path
import bpy

root = Path(__file__).resolve().parents[2]
folder = root / "apps/web/public/models/avatars"
manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
assert manifest["version"] == 4
for item in manifest["avatars"]:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(folder / f"{item['id']}.glb"))
    meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    images = [image for image in bpy.data.images if image.users > 0]
    assert meshes, item["id"]
    assert images, f"{item['id']}: no texture images"
    assert all(len(mesh.data.polygons) > 0 for mesh in meshes)
    print("IMPORTED", item["id"], len(meshes), "meshes", len(images), "images")
