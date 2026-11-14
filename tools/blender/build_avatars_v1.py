"""Build a lightweight, editable, static avatar roster for the nail salon.

Run: blender --background --python tools/blender/build_avatars_v1.py
The exported GLBs face Blender -Y (glTF +Z) and stand on the origin.
No borrowed meshes, textures, skeletons, or animations are embedded.
"""

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "apps/web/public/models/avatars"
SOURCE = ROOT / "packages/assets/source/nail_avatars_v1.blend"
PREVIEW_STAFF = ROOT / "docs/preview-avatar-staff-v1.png"
PREVIEW_VISITORS = ROOT / "docs/preview-avatar-visitors-v1.png"
OUTPUT.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for data in bpy.data.materials:
    bpy.data.materials.remove(data)


def material(name, color, roughness=0.75, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return m


SKIN = [
    material("Skin_Warm", (0.72, 0.43, 0.31), .84),
    material("Skin_Peach", (0.89, 0.61, 0.47), .84),
    material("Skin_Tan", (0.60, 0.36, 0.26), .84),
    material("Skin_Light", (0.96, 0.73, 0.60), .84),
]
HAIR = {
    "espresso": material("Hair_Espresso", (.095, .045, .036), .68),
    "chestnut": material("Hair_Chestnut", (.26, .11, .065), .67),
    "mahogany": material("Hair_Mahogany", (.32, .12, .10), .68),
    "black": material("Hair_SoftBlack", (.035, .027, .028), .66),
    "honey": material("Hair_Honey", (.52, .30, .12), .7),
    "silver": material("Hair_Silver", (.53, .49, .45), .75),
}
CREAM = material("Uniform_Ivory", (.88, .78, .68), .85)
ROSE = material("Uniform_DustyRose", (.57, .30, .32), .8)
APRICOT = material("Uniform_Apricot", (.87, .48, .38), .8)
TAUPE = material("Uniform_Taupe", (.30, .23, .21), .82)
DENIM = material("Cloth_Denim", (.20, .30, .36), .85)
SAGE = material("Cloth_Sage", (.28, .43, .36), .85)
LILAC = material("Cloth_Lilac", (.62, .51, .67), .84)
BLUE = material("Cloth_SkyBlue", (.41, .63, .72), .82)
PINK = material("Cloth_SoftPink", (.91, .63, .67), .86)
WHITE = material("Eye_White", (.99, .96, .91), .22)
BROWN = material("Eye_Brown", (.11, .06, .045), .22)
LIP = material("Lip_Rose", (.55, .24, .23), .76)
GOLD = material("Accessory_Gold", (.62, .43, .19), .32, .75)
SHOE = material("Shoe_DarkBrown", (.16, .105, .08), .69)
SOLE = material("Shoe_CreamSole", (.83, .76, .67), .88)


def move_to_collection(obj, collection, root):
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    return obj


def smooth(obj):
    if obj.type == "MESH":
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj


def ellipsoid(collection, root, name, loc, scale, mat, segments=20):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=12, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    smooth(obj)
    return move_to_collection(obj, collection, root)


def rounded_box(collection, root, name, loc, scale, radius, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("Soft_edges", "BEVEL")
    bevel.width = radius
    bevel.segments = 3
    obj.modifiers.new("Weighted_normals", "WEIGHTED_NORMAL")
    obj.data.materials.append(mat)
    return move_to_collection(obj, collection, root)


def line(collection, root, name, points, thickness, mat):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = thickness
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, xyz in zip(spline.bezier_points, points):
        point.co = xyz
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    collection.objects.link(obj)
    obj.parent = root
    curve.materials.append(mat)
    return obj


def limb(collection, root, name, start, end, radius_a, radius_b, mat):
    a, b = Vector(start), Vector(end)
    middle = (a + b) / 2
    direction = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=radius_a, radius2=radius_b,
                                    depth=direction.length, location=middle)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    smooth(obj)
    return move_to_collection(obj, collection, root)


def torso(collection, root, name, z0, z1, widths, depths, mat):
    rings = 5
    vertices, faces = [], []
    for i in range(rings):
        t = i / (rings - 1)
        width = widths[0] * (1 - t) + widths[1] * t
        depth = depths[0] * (1 - t) + depths[1] * t
        for j in range(16):
            angle = 2 * math.pi * j / 16
            vertices.append((math.cos(angle) * width, math.sin(angle) * depth, z0 + t * (z1 - z0)))
    for i in range(rings - 1):
        for j in range(16):
            k = i * 16 + j
            faces.append((k, i * 16 + (j + 1) % 16,
                          (i + 1) * 16 + (j + 1) % 16, k + 16))
    faces += [tuple(reversed(tuple(range(16)))), tuple((rings - 1) * 16 + j for j in range(16))]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    smooth(obj)
    bevel = obj.modifiers.new("Soft_cloth_edges", "BEVEL")
    bevel.width = .035
    bevel.segments = 2
    obj.modifiers.new("Weighted_normals", "WEIGHTED_NORMAL")
    return obj


ROSTER = [
    dict(id="staff_male", label="Nhân viên nam", role="staff", sex="male", skin=1,
         hair="espresso", hairstyle="quiff", top=CREAM, bottom=TAUPE, apron=TAUPE),
    dict(id="staff_female_01", label="Nhân viên nữ 1", role="staff", sex="female", skin=0,
         hair="black", hairstyle="bun", top=CREAM, bottom=TAUPE, apron=ROSE),
    dict(id="staff_female_02", label="Nhân viên nữ 2", role="staff", sex="female", skin=3,
         hair="chestnut", hairstyle="bob", top=CREAM, bottom=TAUPE, apron=APRICOT),
    dict(id="staff_female_03", label="Nhân viên nữ 3", role="staff", sex="female", skin=2,
         hair="mahogany", hairstyle="pony", top=CREAM, bottom=TAUPE, apron=SAGE),
    dict(id="owner_daughter", label="Bé gái con chủ tiệm", role="child", sex="female", skin=1,
         hair="black", hairstyle="pigtails", top=PINK, bottom=PINK, apron=None),
    dict(id="customer_female", label="Khách nữ", role="customer", sex="female", skin=3,
         hair="honey", hairstyle="long", top=LILAC, bottom=CREAM, apron=None),
    dict(id="customer_male", label="Khách nam", role="customer", sex="male", skin=2,
         hair="chestnut", hairstyle="short", top=BLUE, bottom=DENIM, apron=None),
    dict(id="customer_senior", label="Khách lớn tuổi", role="customer", sex="female", skin=0,
         hair="silver", hairstyle="bun", top=SAGE, bottom=TAUPE, apron=None),
]


def make_avatar(spec):
    collection = bpy.data.collections.new(spec["id"])
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(spec["id"], None)
    collection.objects.link(root)
    root["role"] = spec["role"]
    root["display_name"] = spec["label"]
    root["version"] = "1.0-static"
    child = spec["role"] == "child"
    female = spec["sex"] == "female"
    factor = .75 if child else 1
    skin = SKIN[spec["skin"]]
    hair = HAIR[spec["hair"]]
    top = spec["top"]
    bottom = spec["bottom"]

    # Build all proportions at adult scale, then scale the complete hierarchy for the child.
    for side in (-1, 1):
        x = side * .17
        limb(collection, root, f"Leg_{'L' if side < 0 else 'R'}", (x, 0, .15),
             (x * .9, 0, .87), .105 if female else .115, .087, bottom)
        ellipsoid(collection, root, f"Shoe_{'L' if side < 0 else 'R'}",
                  (x, -.075, .095), (.145, .235, .095), SHOE)
        rounded_box(collection, root, "sole", (x, -.095, .035), (.27, .34, .04), .018, SOLE)
    ellipsoid(collection, root, "Hips", (0, 0, .88), (.32 if female else .30, .19, .16), bottom)
    torso(collection, root, "Torso", .93, 1.47,
          (.24 if female else .25, .29 if female else .34), (.17, .19), top)
    if female and spec["role"] != "staff":
        torso(collection, root, "Soft_skirt", .86, 1.02, (.37, .25), (.28, .18), bottom)
    ellipsoid(collection, root, "Neck", (0, 0, 1.49), (.11, .105, .16), skin)
    for side in (-1, 1):
        x = side * (.32 if female else .36)
        limb(collection, root, f"Upper_arm_{side}", (x * .78, 0, 1.38),
             (x * 1.08, -.015, 1.10), .105, .087, top)
        limb(collection, root, f"Forearm_{side}", (x * 1.08, -.015, 1.10),
             (x * 1.16, -.055, .84), .078, .058, skin)
        ellipsoid(collection, root, f"Hand_{side}", (x * 1.16, -.06, .79), (.066, .064, .1), skin)

    # Staff apron is made of separate editable panels, straps and a pocket.
    if spec["apron"]:
        apron = spec["apron"]
        rounded_box(collection, root, "Apron_bib", (0, -.185, 1.18), (.40, .038, .48), .045, apron)
        torso(collection, root, "Apron_skirt", .84, 1.01, (.30, .23), (.19, .16), apron)
        rounded_box(collection, root, "Apron_pocket", (0, -.23, .99), (.30, .025, .16), .023, apron)
        for side in (-1, 1):
            line(collection, root, "Apron_neck_strap", [(side * .17, -.19, 1.40),
                 (side * .11, -.13, 1.53), (0, .015, 1.54)], .018, apron)
            line(collection, root, "Apron_waist_tie", [(side * .21, -.16, 1.03),
                 (side * .33, .04, 1.03), (side * .1, .19, 1.02)], .014, apron)

    # Rounded facial forms and separate eyes make the characters readable at phone scale.
    ellipsoid(collection, root, "Head", (0, -.025, 1.69), (.285, .245, .32), skin, 24)
    for side in (-1, 1):
        ellipsoid(collection, root, f"Ear_{side}", (side * .27, -.025, 1.66), (.055, .045, .085), skin)
        ellipsoid(collection, root, f"Eye_white_{side}",
                  (side * .105, -.247, 1.72), (.072, .024, .048), WHITE)
        ellipsoid(collection, root, f"Iris_{side}",
                  (side * .105, -.269, 1.72), (.032, .014, .039), BROWN)
        ellipsoid(collection, root, f"Catchlight_{side}",
                  (side * .105 - .009, -.282, 1.737), (.009, .006, .012), WHITE)
        line(collection, root, f"Brow_{side}",
             [(side * .055, -.255, 1.825), (side * .11, -.259, 1.835),
              (side * .16, -.242, 1.825)], .009, hair)
    ellipsoid(collection, root, "Nose", (0, -.278, 1.64), (.042, .035, .055), skin)
    line(collection, root, "Smile", [(-.082, -.251, 1.57), (0, -.278, 1.548),
                                     (.082, -.251, 1.57)], .009, LIP)
    for side in (-1, 1):
        ellipsoid(collection, root, f"Cheek_{side}",
                  (side * .185, -.207, 1.61), (.055, .013, .026), PINK)

    ellipsoid(collection, root, "Hair_cap", (0, -.007, 1.89), (.305, .265, .15), hair)
    for x, z in [(-.19, 1.87), (-.07, 1.91), (.08, 1.89), (.21, 1.85)]:
        ellipsoid(collection, root, "Hair_fringe", (x, -.204, z), (.10, .08, .11), hair)
    hairstyle = spec["hairstyle"]
    if hairstyle in ("long", "bob"):
        length = .45 if hairstyle == "bob" else .68
        for side in (-1, 1):
            ellipsoid(collection, root, f"Hair_side_{side}",
                      (side * .255, .03, 1.75 - length * .23), (.11, .18, length * .57), hair)
        ellipsoid(collection, root, "Hair_back", (0, .17, 1.65 - length * .2), (.25, .11, length * .7), hair)
    elif hairstyle == "bun":
        ellipsoid(collection, root, "Hair_back", (0, .17, 1.73), (.24, .105, .28), hair)
        ellipsoid(collection, root, "Hair_bun", (0, .22, 1.95), (.16, .16, .16), hair)
        ellipsoid(collection, root, "Bun_gold_pin", (.065, .30, 1.95), (.025, .008, .025), GOLD)
    elif hairstyle == "pony":
        ellipsoid(collection, root, "Hair_back", (0, .19, 1.75), (.24, .13, .25), hair)
        ellipsoid(collection, root, "Ponytail", (0, .30, 1.54), (.16, .15, .34), hair)
        ellipsoid(collection, root, "Ponytail_tie", (0, .31, 1.83), (.09, .08, .04), GOLD)
    elif hairstyle == "pigtails":
        for side in (-1, 1):
            ellipsoid(collection, root, f"Pigtail_{side}",
                      (side * .30, .12, 1.66), (.13, .13, .26), hair)
            ellipsoid(collection, root, f"Ribbon_{side}",
                      (side * .29, .10, 1.83), (.09, .055, .045), PINK)
    elif hairstyle == "quiff":
        for x, height in [(-.15, 1.96), (-.02, 2.00), (.13, 1.96)]:
            ellipsoid(collection, root, "Hair_quiff", (x, -.14, height), (.12, .11, .10), hair)

    if child:
        # Light dress silhouette, child head/height ratio, and patterned applique.
        torso(collection, root, "Dress_flare", .80, 1.12, (.38, .20), (.27, .17), PINK)
        for x in [-.17, 0, .17]:
            ellipsoid(collection, root, "Dress_flower", (x, -.27, .91), (.035, .012, .035), CREAM)
        root.scale = (.84, .84, .75)
    return root, collection


avatars = []
for spec in ROSTER:
    root, collection = make_avatar(spec)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in collection.objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT / f"{spec['id']}.glb"),
                              export_format="GLB", use_selection=True,
                              export_extras=True, export_apply=True)
    avatars.append((root, spec))
    print("EXPORTED_AVATAR", spec["id"], (OUTPUT / f"{spec['id']}.glb").stat().st_size)

(OUTPUT / "manifest.json").write_text(json.dumps({
    "version": 1,
    "forward": "glTF +Z",
    "animated": False,
    "avatars": [{"id": spec["id"], "label": spec["label"],
                 "role": spec["role"], "url": f"/models/avatars/{spec['id']}.glb"}
                for spec in ROSTER],
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Source scene and a contact render. These are not used as the web models.
studio = bpy.data.collections.new("PREVIEW_STUDIO")
bpy.context.scene.collection.children.link(studio)
studio_root = bpy.data.objects.new("PREVIEW_STUDIO_root", None)
studio.objects.link(studio_root)
studio_mat = material("Studio_Background", (.85, .72, .65), .95)
rounded_box(studio, studio_root, "Studio_floor", (0, 0, -.13), (10, 6.5, .25), .08, studio_mat)
for index, (avatar, spec) in enumerate(avatars):
    column = index % 4
    row = index // 4
    avatar.location = (-3.3 + column * 2.2, row * 3.1, 0)
    bpy.ops.object.text_add(location=(avatar.location.x, avatar.location.y - .55, .04))
    label = bpy.context.object
    label.name = f"Label_{spec['id']}"
    label.data.body = spec["id"].replace("_", " ")
    label.data.align_x = "CENTER"
    label.data.size = .18
    label.data.extrude = .001
    label.rotation_euler = (math.pi / 2, 0, 0)
    label.data.materials.append(TAUPE)
    move_to_collection(label, studio, studio_root)

world = bpy.context.scene.world
world.color = (.6, .6, .6)
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.95, .81, .73, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .75

def area_light(name, position, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat("-Z", "Y").to_euler()

area_light("Key_softbox", (-4, -6, 8), 1500, 8)
area_light("Fill_softbox", (5, 1, 6), 900, 6)
bpy.ops.object.camera_add(location=(0, -11, 3.8))
camera = bpy.context.object
camera.name = "Roster_Preview_Camera"
move_to_collection(camera, studio, studio_root)
camera.rotation_euler = (Vector((0, 0, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 10.5
bpy.context.scene.camera = camera
bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.resolution_x = 2200
bpy.context.scene.render.resolution_y = 750
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.image_settings.file_format = "PNG"
bpy.context.scene.render.filepath = str(PREVIEW_STAFF)
bpy.context.scene.render.film_transparent = False
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index >= 4
for obj in studio.objects:
    if obj.name.startswith("Label_"):
        obj.hide_render = obj.name.removeprefix("Label_") not in {spec["id"] for spec in ROSTER[:4]}
bpy.ops.render.render(write_still=True)
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index < 4
for obj in studio.objects:
    if obj.name.startswith("Label_"):
        obj.hide_render = obj.name.removeprefix("Label_") not in {spec["id"] for spec in ROSTER[4:]}
camera.location.y = -7.9
camera.rotation_euler = (Vector((0, 3.1, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = str(PREVIEW_VISITORS)
bpy.ops.render.render(write_still=True)
for avatar, _ in avatars:
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = False
for obj in studio.objects:
    obj.hide_render = False
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
print("SOURCE_SAVED", SOURCE)
print("PREVIEW_SAVED", PREVIEW_STAFF, PREVIEW_VISITORS)
