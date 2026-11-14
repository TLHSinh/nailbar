"""Create material-batched game GLBs from the editable V3 Blender source.

Run from the repository root:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" --background --python tools/blender/optimize_furniture_for_game.py

The source .blend and presentation GLBs are never overwritten. Each output contains
one mesh per material, ready to instance four times in Three.js.
"""

import bpy
from collections import defaultdict
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "packages" / "assets" / "source" / "nail_furniture_v3.blend"
OUTPUT = ROOT / "apps" / "web" / "public" / "models" / "game"
OUTPUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
bpy.context.view_layer.update()


def descendants(root):
    return [obj for obj in root.children_recursive if obj.type == "MESH"]


def bounds(objects):
    vertices = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    return tuple(round(min(p[i] for p in vertices), 4) for i in range(3)), tuple(
        round(max(p[i] for p in vertices), 4) for i in range(3)
    )


def export_station(root_name, filename, extra_roots=()):
    source_root = bpy.data.objects.get(root_name)
    if source_root is None:
        raise RuntimeError(f"Missing source hierarchy: {root_name}")
    originals = descendants(source_root)
    for name in extra_roots:
        extra = bpy.data.objects.get(name)
        if extra is None:
            raise RuntimeError(f"Missing source hierarchy: {name}")
        originals.extend(descendants(extra))
    if not originals:
        raise RuntimeError(f"No source meshes below {root_name}")
    before = bounds(originals)
    batches = defaultdict(list)
    for obj in originals:
        materials = tuple(slot.material.name if slot.material else "Unassigned" for slot in obj.material_slots)
        if len(materials) != 1:
            raise RuntimeError(f"Expected one material on {obj.name}, found {materials}")
        copy = obj.copy()
        copy.data = obj.data.copy()
        bpy.context.collection.objects.link(copy)
        world = obj.matrix_world.copy()
        copy.parent = None
        copy.matrix_world = world
        copy.name = f"GAME_{obj.name}"
        batches[materials[0]].append(copy)

    merged = []
    for material_name, objects in sorted(batches.items()):
        bpy.ops.object.select_all(action="DESELECT")
        for obj in objects:
            obj.select_set(True)
        active = objects[0]
        bpy.context.view_layer.objects.active = active
        if len(objects) > 1:
            bpy.ops.object.join()
        active.name = f"Batch_{material_name}"
        merged.append(active)

    after = bounds(merged)
    if any(abs(a - b) > .002 for a, b in zip(before[0] + before[1], after[0] + after[1])):
        raise RuntimeError(f"Bounds changed for {root_name}: {before} -> {after}")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in merged:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = merged[0]
    target = OUTPUT / filename
    bpy.ops.export_scene.gltf(
        filepath=str(target), export_format="GLB", use_selection=True,
        export_apply=True, export_yup=True,
    )
    print(f"GAME_ASSET {filename}: {len(originals)} source meshes -> {len(merged)} material batches; bounds {before}; bytes {target.stat().st_size}")
    for obj in merged:
        bpy.data.objects.remove(obj, do_unlink=True)


export_station("Nail_Station_V3", "manicure_station_v3_game.glb")
# The original V3 builder left the cart as a separate editable root, while the
# presentation GLB selected it together with the chair and basin.
export_station("Spa_Station_V3", "pedicure_station_v3_game.glb", ("Two_Tier_Gold_Trolley",))
