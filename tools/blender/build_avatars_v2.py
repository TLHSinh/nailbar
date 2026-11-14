"""Build the second, differentiated character roster for the nail salon.

Run: blender --background --python tools/blender/build_avatars_v2.py
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
SOURCE = ROOT / "packages/assets/source/nail_avatars_v2.blend"
PREVIEW_STAFF = ROOT / "docs/preview-avatar-staff-v2.png"
PREVIEW_VISITORS = ROOT / "docs/preview-avatar-visitors-v2.png"
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
    material("Skin_GoldenBrown", (0.49, 0.28, 0.18), .81),
    material("Skin_WarmPeach", (0.75, 0.47, 0.34), .81),
    material("Skin_DeepTan", (0.36, 0.19, 0.12), .81),
    material("Skin_LightPeach", (0.86, 0.63, 0.49), .81),
]
HAIR = {
    "espresso": material("Hair_Espresso", (.075, .036, .027), .62),
    "chestnut": material("Hair_Chestnut", (.27, .11, .055), .62),
    "mahogany": material("Hair_Mahogany", (.25, .068, .057), .62),
    "black": material("Hair_SoftBlack", (.026, .021, .023), .63),
    "honey": material("Hair_Honey", (.54, .31, .12), .65),
    "silver": material("Hair_Silver", (.58, .53, .48), .67),
}
CREAM = material("Uniform_Ivory", (.78, .67, .56), .81)
ROSE = material("Uniform_DustyRose", (.49, .20, .24), .69)
APRICOT = material("Uniform_Apricot", (.75, .31, .23), .72)
TAUPE = material("Uniform_Taupe", (.20, .14, .13), .76)
DENIM = material("Cloth_Denim", (.12, .20, .27), .78)
SAGE = material("Cloth_Sage", (.18, .33, .29), .77)
LILAC = material("Cloth_Lilac", (.47, .36, .53), .78)
BLUE = material("Cloth_SkyBlue", (.20, .39, .54), .76)
PINK = material("Cloth_SoftPink", (.78, .43, .48), .81)
WHITE = material("Eye_White", (.91, .90, .84), .26)
BROWN = material("Eye_Brown", (.07, .035, .025), .21)
LIP = material("Lip_Rose", (.49, .16, .18), .62)
BLUSH = material("Skin_Blush", (.66, .32, .29), .9)
GOLD = material("Accessory_Gold", (.68, .45, .17), .29, .78)
SHOE = material("Shoe_DarkBrown", (.11, .065, .053), .62)
SOLE = material("Shoe_CreamSole", (.71, .65, .57), .82)
LEATHER = material("Accessory_Leather", (.25, .10, .065), .55)


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


def line(collection, root, name, points, thickness, mat, radii=None):
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
    if radii:
        for point, radius in zip(spline.bezier_points, radii):
            point.radius = radius
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
        width = widths[i] if len(widths) == rings else widths[0] * (1 - t) + widths[1] * t
        depth = depths[i] if len(depths) == rings else depths[0] * (1 - t) + depths[1] * t
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
    bevel.width = .018
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = .55
    obj.modifiers.new("Weighted_normals", "WEIGHTED_NORMAL")
    return obj


ROSTER = [
    dict(id="staff_male", label="Nhân viên nam", role="staff", sex="male", skin=1,
         hair="espresso", hairstyle="side_part", top=CREAM, bottom=TAUPE, apron=TAUPE, scale=1.04, pose="tool",
         appearance="Tóc rẽ ngôi, tạp dề nâu taupe, tay cầm cọ làm móng"),
    dict(id="staff_female_01", label="Nhân viên nữ 1", role="staff", sex="female", skin=0,
         hair="black", hairstyle="bun", top=CREAM, bottom=TAUPE, apron=ROSE, scale=.96, pose="rest",
         appearance="Tóc búi gọn, da nâu ấm, tạp dề hồng đất"),
    dict(id="staff_female_02", label="Nhân viên nữ 2", role="staff", sex="female", skin=3,
         hair="chestnut", hairstyle="wavy_bob", top=CREAM, bottom=TAUPE, apron=APRICOT, scale=.93, pose="hip",
         appearance="Tóc bob gợn nhẹ, tạp dề hồng đào, tay chống hông"),
    dict(id="staff_female_03", label="Nhân viên nữ 3", role="staff", sex="female", skin=2,
         hair="mahogany", hairstyle="braid", top=CREAM, bottom=TAUPE, apron=SAGE, scale=1.0, pose="tool",
         appearance="Da nâu đậm, tóc tết lệch, tạp dề xanh sage"),
    dict(id="owner_daughter", label="Bé gái con chủ tiệm", role="child", sex="female", skin=1,
         hair="black", hairstyle="pigtails", top=PINK, bottom=PINK, apron=None, scale=.80, pose="wave",
         appearance="Dáng nhỏ, tóc hai bên, váy hồng và tay vẫy chào"),
    dict(id="customer_female", label="Khách nữ", role="customer", sex="female", skin=3,
         hair="honey", hairstyle="waves", top=LILAC, bottom=CREAM, apron=None, scale=.98, pose="bag",
         appearance="Tóc vàng dài, áo tím nhạt, túi đeo chéo"),
    dict(id="customer_male", label="Khách nam", role="customer", sex="male", skin=2,
         hair="chestnut", hairstyle="short", top=BLUE, bottom=DENIM, apron=None, scale=1.07, pose="pocket",
         appearance="Áo khoác xanh, quần denim, dáng cao"),
    dict(id="customer_senior", label="Khách lớn tuổi", role="customer", sex="female", skin=0,
         hair="silver", hairstyle="silver_bob", top=SAGE, bottom=TAUPE, apron=None, scale=.93, pose="rest",
         appearance="Tóc bạc, kính vàng, áo khoác xanh sage"),
]


def add_hair(collection, root, style, mat):
    ellipsoid(collection, root, "Hair_base", (0, .07, 1.81), (.266, .22, .245), mat, 24)
    # Tapered locks give a distinct silhouette while keeping actual mesh geometry.
    if style in ("side_part", "short"):
        line(collection, root, "swept_forelock", [(-.22, -.11, 1.94),
             (-.04, -.20, 1.96), (.15, -.20, 1.89)], .07, mat, [1.15, 1, .18])
        for side in (-1, 1):
            ellipsoid(collection, root, f"Hair_sideburn_{side}",
                      (side * .245, .01, 1.74), (.055, .075, .15), mat)
        if style == "side_part":
            line(collection, root, "quiff_sculpt", [(-.12, -.08, 2.02),
                 (.02, -.15, 2.07), (.18, -.17, 1.94)], .06, mat, [1.1, .95, .12])
    elif style == "bun":
        line(collection, root, "smooth_side_sweep", [(.21, -.10, 1.96),
             (.05, -.20, 1.92), (-.20, -.17, 1.81)], .075, mat, [1.1, .9, .2])
        ellipsoid(collection, root, "large_twisted_bun", (0, .27, 1.88), (.18, .16, .17), mat)
        for i in range(3):
            a = i * 2.1
            line(collection, root, "bun_wrap", [(.11 * math.cos(a), .37, 1.90 + .10 * math.sin(a)),
                 (.10 * math.cos(a + 1), .42, 1.90 + .10 * math.sin(a + 1))], .012, mat)
        ellipsoid(collection, root, "gold_hair_pin", (.11, .38, 1.93), (.048, .012, .018), GOLD)
    elif style in ("wavy_bob", "waves"):
        long = style == "waves"
        for side in (-1, 1):
            x = side * .235
            end_z = 1.18 if long else 1.47
            line(collection, root, f"wave_lock_{side}", [(x, .06, 1.92),
                 (x + side * .045, -.025, 1.71), (x + side * .035, -.025, 1.51),
                 (x + side * .06, .015, end_z)], .085, mat, [1.05, .98, .80, .20])
            line(collection, root, f"surface_strand_{side}", [(x + side * .035, -.10, 1.84),
                 (x + side * .06, -.12, 1.64), (x + side * .05, -.075, end_z + .08)],
                 .018, mat, [1, .8, .1])
        ellipsoid(collection, root, "hair_back_volume", (0, .19, 1.55 if long else 1.68),
                  (.27, .11, .39 if long else .25), mat)
        line(collection, root, "side_fringe", [(-.22, -.12, 1.93),
             (-.08, -.21, 1.93), (.16, -.20, 1.83)], .06, mat, [1, .8, .12])
    elif style == "braid":
        line(collection, root, "swept_hairline", [(-.20, -.12, 1.96),
             (0, -.22, 1.92), (.22, -.10, 1.88)], .065, mat, [1, .8, .18])
        ellipsoid(collection, root, "braid_base", (0, .27, 1.85), (.12, .11, .12), mat)
        for i in range(5):
            ellipsoid(collection, root, f"braid_segment_{i}",
                      ((-1) ** i * .035, .31 + i * .015, 1.70 - i * .105),
                      (.10 - i * .008, .085, .085), mat)
        ellipsoid(collection, root, "braid_gold_tie", (0, .38, 1.25), (.06, .05, .025), GOLD)
        line(collection, root, "visible_side_braid", [(.20, .06, 1.88),
             (.31, -.10, 1.64), (.30, -.14, 1.37), (.24, -.16, 1.17)],
             .05, mat, [1.1, .95, .75, .12])
        for i in range(3):
            ellipsoid(collection, root, f"side_braid_link_{i}",
                      (.31 - i * .02, -.15, 1.53 - i * .11),
                      (.045, .04, .052), mat)
    elif style == "pigtails":
        for side in (-1, 1):
            line(collection, root, f"child_pigtail_{side}", [(side * .20, .12, 1.90),
                 (side * .34, .16, 1.76), (side * .36, .13, 1.52)], .075, mat, [1.1, 1, .12])
            ellipsoid(collection, root, f"pink_bow_{side}",
                      (side * .31, -.01, 1.81), (.075, .025, .055), PINK)
        line(collection, root, "child_fringe", [(-.19, -.12, 1.92),
             (-.06, -.21, 1.87), (.10, -.21, 1.86), (.21, -.11, 1.91)],
             .05, mat, [.8, 1, 1, .25])
    elif style == "silver_bob":
        ellipsoid(collection, root, "rounded_bob_back", (0, .18, 1.72), (.28, .15, .27), mat)
        for side in (-1, 1):
            line(collection, root, f"silver_side_{side}", [(side * .20, .01, 1.95),
                 (side * .30, -.04, 1.72), (side * .25, -.03, 1.52)],
                 .075, mat, [1, .95, .25])
        line(collection, root, "silver_side_part", [(.19, -.12, 1.96),
             (.02, -.20, 1.92), (-.18, -.18, 1.84)], .055, mat, [.9, .8, .12])


def make_avatar(spec):
    collection = bpy.data.collections.new(spec["id"])
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(spec["id"], None)
    collection.objects.link(root)
    root["role"] = spec["role"]
    root["display_name"] = spec["label"]
    root["version"] = "2.0-static"
    child = spec["role"] == "child"
    female = spec["sex"] == "female"
    staff = spec["role"] == "staff"
    skin = SKIN[spec["skin"]]
    hair = HAIR[spec["hair"]]
    top = spec["top"]
    bottom = spec["bottom"]

    # Distinct proportions and garments are assembled as separately editable meshes.
    hips = .29 if female else .31
    shoulders = .29 if female else .36
    for side in (-1, 1):
        x = side * (.165 if female else .18)
        limb(collection, root, f"Leg_{'L' if side < 0 else 'R'}", (x, 0, .17),
             (x * .88, 0, .90), .088 if female else .105, .102, bottom)
        rounded_box(collection, root, f"Pant_cuff_{side}",
                    (x, 0, .18), (.17 if female else .19, .19, .06), .026, bottom)
        ellipsoid(collection, root, f"Shoe_{'L' if side < 0 else 'R'}",
                  (x, -.085, .09), (.125, .195, .09), SHOE)
        rounded_box(collection, root, f"Shoe_sole_{side}",
                    (x, -.095, .038), (.24, .30, .036), .016, SOLE)
        for stripe in (-.018, .013):
            line(collection, root, f"Shoe_lace_{side}",
                 [(x - .045, -.21, .12 + stripe), (x + .045, -.21, .12 + stripe)], .005, SOLE)
    if not staff:
        ellipsoid(collection, root, "Tailored_hips", (0, 0, .90),
                  (hips, .16, .10), bottom)
    torso(collection, root, "Clothed_torso", .91, 1.48,
          (.245, .22, .21, .255, shoulders), (.165, .15, .16, .18, .17), top)
    ellipsoid(collection, root, "Neck", (0, 0, 1.50), (.09, .09, .14), skin)
    for side in (-1, 1):
        arm_x = side * (shoulders + .04)
        elbow = (arm_x, -.014, 1.20)
        hand = (arm_x + side * .045, -.075, .82)
        if side == 1 and spec["pose"] == "wave":
            elbow = (arm_x + .08, -.06, 1.34)
            hand = (arm_x + .11, -.12, 1.70)
        elif side == 1 and spec["pose"] == "tool":
            elbow = (arm_x + .07, -.06, 1.12)
            hand = (.18, -.29, 1.03)
        elif side == 1 and spec["pose"] == "hip":
            elbow = (arm_x + .07, -.02, 1.13)
            hand = (.28, -.20, .94)
        elif side == 1 and spec["pose"] == "bag":
            elbow = (arm_x + .04, -.04, 1.13)
            hand = (.35, -.18, .95)
        elif side == 1 and spec["pose"] == "pocket":
            elbow = (arm_x + .02, -.02, 1.12)
            hand = (.23, -.18, .88)
        limb(collection, root, f"Sleeve_{side}",
             (side * shoulders, 0, 1.40), elbow, .09, .082, top)
        ellipsoid(collection, root, f"Sleeve_cuff_{side}",
                  elbow, (.086, .082, .025), CREAM if staff else top)
        limb(collection, root, f"Bare_forearm_{side}",
             elbow, hand, .066, .052, skin)
        ellipsoid(collection, root, f"Hand_{side}",
                  hand, (.059, .047, .08), skin)
        ellipsoid(collection, root, f"Thumb_{side}",
                  (hand[0] - side * .025, hand[1] - .045, hand[2] + .015),
                  (.025, .023, .045), skin)
        if side == 1 and spec["pose"] == "tool":
            limb(collection, root, "Brush_held_in_hand", (hand[0], hand[1] - .045, hand[2] - .035),
                 (hand[0], hand[1] - .045, hand[2] + .16), .009, .006, GOLD)

    if staff:
        apron = spec["apron"]
        torso(collection, root, "Apron_lower", .77, 1.06,
              (.32, .30, .27, .24, .22), (.172, .17, .165, .16, .16), apron)
        rounded_box(collection, root, "Apron_bib", (0, -.185, 1.25),
                    (.35, .028, .34), .034, apron)
        rounded_box(collection, root, "Apron_pocket", (0, -.18, .92),
                    (.23, .024, .12), .021, apron)
        line(collection, root, "Pocket_seam", [(-.09, -.197, .96),
             (0, -.199, .95), (.09, -.197, .96)], .005, CREAM)
        for side in (-1, 1):
            line(collection, root, f"Apron_neck_strap_{side}",
                 [(side * .15, -.19, 1.40), (side * .12, -.10, 1.51),
                  (side * .035, .02, 1.52)], .013, apron)
            line(collection, root, f"Apron_waist_tie_{side}",
                 [(side * .22, -.15, 1.05), (side * .30, .05, 1.04),
                  (side * .1, .18, 1.04)], .012, apron)
        rounded_box(collection, root, "Gold_name_pin", (.095, -.207, 1.30),
                    (.08, .012, .025), .005, GOLD)
        limb(collection, root, "Manicure_brush_in_pocket",
             (.075, -.20, .97), (.075, -.20, 1.09), .006, .006, GOLD)
        line(collection, root, "Shirt_collar", [(-.13, -.09, 1.49),
             (0, -.16, 1.41), (.13, -.09, 1.49)], .012, CREAM)
    elif spec["id"] == "owner_daughter":
        torso(collection, root, "Layered_flared_dress", .70, 1.12,
              (.39, .37, .32, .25, .22), (.27, .25, .22, .17, .16), PINK)
        line(collection, root, "Dress_hem", [(-.36, -.17, .73),
             (0, -.27, .72), (.36, -.17, .73)], .012, CREAM)
        for x in (-.18, 0, .18):
            ellipsoid(collection, root, "Tiny_dress_flower", (x, -.26, .94),
                      (.027, .012, .027), CREAM)
        line(collection, root, "Dress_round_collar", [(-.12, -.11, 1.48),
             (0, -.18, 1.42), (.12, -.11, 1.48)], .018, CREAM)
    elif spec["id"] == "customer_female":
        rounded_box(collection, root, "Blouse_neckline", (0, -.17, 1.41),
                    (.22, .024, .08), .036, CREAM)
        line(collection, root, "Gold_waist_belt", [(-.21, -.15, .99),
             (0, -.18, .99), (.21, -.15, .99)], .013, GOLD)
        rounded_box(collection, root, "Crossbody_bag", (.34, -.04, .92),
                    (.24, .13, .25), .045, LEATHER)
        line(collection, root, "Bag_strap", [(-.22, -.10, 1.42),
             (.02, -.18, 1.20), (.34, -.06, 1.03)], .018, LEATHER)
        rounded_box(collection, root, "Bag_gold_clasp", (.34, -.116, .95),
                    (.055, .008, .018), .005, GOLD)
    elif spec["id"] == "customer_male":
        rounded_box(collection, root, "Jacket_open_shirt", (0, -.172, 1.25),
                    (.20, .027, .38), .027, CREAM)
        for side in (-1, 1):
            line(collection, root, f"Jacket_lapel_{side}",
                 [(side * .23, -.15, 1.46), (side * .10, -.19, 1.30),
                  (side * .16, -.18, 1.16)], .024, BLUE)
        rounded_box(collection, root, "Gold_belt_buckle", (0, -.177, .96),
                    (.06, .012, .04), .009, GOLD)
    elif spec["id"] == "customer_senior":
        torso(collection, root, "Tailored_skirt", .73, 1.0,
              (.36, .34, .30, .27, .25), (.24, .22, .19, .18, .17), TAUPE)
        line(collection, root, "Cardigan_edge_left", [(-.14, -.17, 1.46),
             (-.14, -.19, 1.18), (-.16, -.16, .98)], .013, CREAM)
        line(collection, root, "Cardigan_edge_right", [(.14, -.17, 1.46),
             (.14, -.19, 1.18), (.16, -.16, .98)], .013, CREAM)
        ellipsoid(collection, root, "Brooch", (.16, -.175, 1.35), (.031, .014, .031), GOLD)

    # Face is modeled as warm skin with restrained features, not painted on a plane.
    head_width = .285 if child else (.245 if female else .255)
    ellipsoid(collection, root, "Head", (0, -.02, 1.69),
              (head_width, .23, .30 if child else .285), skin, 24)
    ellipsoid(collection, root, "Soft_jaw", (0, -.065, 1.57), (.19, .19, .12), skin)
    for side in (-1, 1):
        ellipsoid(collection, root, f"Ear_{side}", (side * head_width, -.02, 1.67),
                  (.045, .035, .074), skin)
        ellipsoid(collection, root, f"Eye_white_{side}",
                  (side * .096, -.235, 1.73), (.053, .021, .040), WHITE)
        ellipsoid(collection, root, f"Iris_{side}",
                  (side * .096, -.255, 1.73), (.027, .014, .031), BROWN)
        ellipsoid(collection, root, f"Pupil_{side}",
                  (side * .096, -.269, 1.73), (.014, .008, .022), BROWN)
        ellipsoid(collection, root, f"Catchlight_{side}",
                  (side * .096 - .008, -.279, 1.744), (.007, .004, .009), WHITE)
        line(collection, root, f"Brow_{side}",
             [(side * .052, -.24, 1.815), (side * .105, -.245, 1.825),
              (side * .15, -.225, 1.811)], .009, hair)
        if female:
            line(collection, root, f"Upper_lash_{side}",
                 [(side * .063, -.257, 1.756), (side * .12, -.255, 1.761),
                  (side * .153, -.238, 1.754)], .007, BROWN)
        ellipsoid(collection, root, f"Cheek_{side}",
                  (side * .17, -.20, 1.625), (.045, .008, .018), BLUSH)
    ellipsoid(collection, root, "Nose", (0, -.255, 1.64), (.032, .031, .045), skin)
    line(collection, root, "Smile", [(-.067, -.236, 1.558),
         (0, -.255, 1.545), (.067, -.236, 1.558)], .007, LIP)
    add_hair(collection, root, spec["hairstyle"], hair)

    if spec["id"] in ("staff_female_01", "staff_female_02", "staff_female_03", "customer_female"):
        for side in (-1, 1):
            ellipsoid(collection, root, f"Gold_ear_stud_{side}",
                      (side * (head_width + .012), -.057, 1.64),
                      (.019, .013, .027), GOLD)
    if spec["id"] == "staff_female_03":
        line(collection, root, "Sage_neckerchief", [(-.12, -.11, 1.47),
             (0, -.19, 1.42), (.12, -.11, 1.47)], .02, SAGE)
    if spec["id"] == "customer_senior":
        for side in (-1, 1):
            line(collection, root, f"Glass_rim_{side}",
                 [(side * .045, -.267, 1.73), (side * .095, -.278, 1.77),
                  (side * .148, -.254, 1.73), (side * .095, -.278, 1.69),
                  (side * .045, -.267, 1.73)], .008, GOLD)
        line(collection, root, "Glass_bridge", [(-.044, -.27, 1.735),
             (0, -.275, 1.744), (.044, -.27, 1.735)], .007, GOLD)

    if child:
        root.scale = (.83, .83, .74)
    else:
        root.scale = (spec["scale"], spec["scale"], spec["scale"])
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
    "version": 2,
    "forward": "glTF +Z",
    "animated": False,
    "avatars": [{"id": spec["id"], "label": spec["label"],
                 "role": spec["role"], "appearance": spec["appearance"],
                 "url": f"/models/avatars/{spec['id']}.glb"}
                for spec in ROSTER],
}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Source scene and a contact render. These are not used as the web models.
studio = bpy.data.collections.new("PREVIEW_STUDIO")
bpy.context.scene.collection.children.link(studio)
studio_root = bpy.data.objects.new("PREVIEW_STUDIO_root", None)
studio.objects.link(studio_root)
studio_mat = material("Studio_Background", (.68, .51, .45), .93)
rounded_box(studio, studio_root, "Studio_floor", (0, 0, -.13), (10, 6.5, .25), .08, studio_mat)
for index, (avatar, spec) in enumerate(avatars):
    column = index % 4
    row = index // 4
    avatar.location = (-3.3 + column * 2.2, row * 3.1, 0)

world = bpy.context.scene.world
world.color = (.6, .6, .6)
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (.95, .81, .73, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = .52

def area_light(name, position, energy, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    studio.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat("-Z", "Y").to_euler()

area_light("Key_softbox", (-4, -6, 8), 1100, 8)
area_light("Fill_softbox", (5, 1, 6), 520, 6)
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
bpy.ops.render.render(write_still=True)
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index < 4
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
