"""Build the third character roster with softer, cleaner facial geometry.

Run: blender --background --python tools/blender/build_avatars_v3.py
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
SOURCE = ROOT / "packages/assets/source/nail_avatars_v3.blend"
PREVIEW_STAFF = ROOT / "docs/preview-avatar-staff-v3.png"
PREVIEW_VISITORS = ROOT / "docs/preview-avatar-visitors-v3.png"
PREVIEW_THREE_QUARTER = ROOT / "docs/preview-avatar-three-quarter-v3.png"
PREVIEW_FACES = ROOT / "docs/preview-avatar-faces-v3.png"
PREVIEW_STAFF_THREE_QUARTER = ROOT / "docs/preview-avatar-staff-three-quarter-v3.png"
PREVIEW_VISITOR_FACES = ROOT / "docs/preview-avatar-visitor-faces-v3.png"
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
WHITE = material("Eye_Ivory", (.90, .88, .82), .34)
IRIS_BROWN = material("Iris_WarmBrown", (.18, .088, .04), .35)
IRIS_HAZEL = material("Iris_Hazel", (.27, .20, .09), .35)
PUPIL = material("Pupil_Dark", (.025, .015, .012), .22)
LIP = material("Lip_Rose", (.47, .18, .18), .69)
LIP_NUDE = material("Lip_Natural", (.31, .13, .10), .75)
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


def shaped_head(collection, root, design, mat):
    """One continuous head with character-specific brow, cheek and jaw proportions."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20,
                                         location=(0, -.02, 1.69))
    obj = bpy.context.object
    obj.name = "Head"
    for vertex in obj.data.vertices:
        lower = max(0, -vertex.co.z)
        cheek = max(0, 1 - abs(vertex.co.z + .12) * 2.6)
        vertex.co.x *= 1 - design["jaw"] * lower ** 1.3 + design["cheek"] * cheek
        vertex.co.y *= 1 - .055 * lower
    obj.scale = (design["width"], design["depth"], design["height"])
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
         hair="black", hairstyle="child_long", top=APRICOT, bottom=PINK, apron=None, scale=.82, pose="wave",
         appearance="Dáng trẻ em, tóc đen dài với băng đô hồng, váy xòe và tay vẫy chào"),
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

# These are independent facial designs, not one base head recoloured eight times.
# Sizes are provisional metres in the editable Blender scene.
FACE_DESIGNS = {
    "staff_male": dict(width=.267, depth=.238, height=.306, jaw=.065, cheek=.010,
                       eyes=.108, eye_size=1.08, brow=.004, smile=.015, nose=.025),
    "staff_female_01": dict(width=.274, depth=.252, height=.313, jaw=.26, cheek=.055,
                            eyes=.109, eye_size=1.16, brow=.013, smile=.024, nose=.020),
    "staff_female_02": dict(width=.237, depth=.226, height=.334, jaw=.17, cheek=.012,
                            eyes=.097, eye_size=1.05, brow=.016, smile=.014, nose=.018),
    "staff_female_03": dict(width=.262, depth=.246, height=.301, jaw=.15, cheek=.035,
                            eyes=.110, eye_size=1.14, brow=.001, smile=.020, nose=.021),
    "owner_daughter": dict(width=.316, depth=.275, height=.350, jaw=.09, cheek=.075,
                           eyes=.119, eye_size=1.31, brow=.014, smile=.020, nose=.016),
    "customer_female": dict(width=.251, depth=.239, height=.326, jaw=.23, cheek=.022,
                            eyes=.103, eye_size=1.14, brow=.016, smile=.018, nose=.019),
    "customer_male": dict(width=.283, depth=.254, height=.294, jaw=.035, cheek=.006,
                          eyes=.111, eye_size=1.04, brow=-.004, smile=.011, nose=.026),
    "customer_senior": dict(width=.271, depth=.249, height=.301, jaw=-.015, cheek=.042,
                            eyes=.101, eye_size=.96, brow=.006, smile=.020, nose=.020),
}


def add_hair(collection, root, style, mat, design):
    ellipsoid(collection, root, "Hair_base", (0, .025, 1.82),
              (design["width"] * 1.07, design["depth"] * 1.10,
               design["height"] * .83), mat, 24)
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
    elif style == "child_long":
        ellipsoid(collection, root, "Long_hair_back", (0, .15, 1.60),
                  (.31, .17, .47), mat)
        for side in (-1, 1):
            line(collection, root, f"Long_child_lock_{side}",
                 [(side * .24, -.02, 1.94), (side * .32, -.09, 1.69),
                  (side * .32, -.07, 1.38), (side * .27, -.04, 1.25)],
                 .08, mat, [1.12, 1.1, .82, .10])
        for x in (-.21, -.1, .02, .14, .23):
            line(collection, root, "Soft_child_fringe",
                 [(x, -.17, 2.005), (x + .012, -.25, 1.91),
                  (x + .025, -.26, 1.85)], .045, mat, [1.0, .85, .12])
        line(collection, root, "Coral_headband", [(-.29, -.105, 1.95),
             (-.16, -.09, 2.045), (0, -.055, 2.075),
             (.16, -.09, 2.045), (.29, -.105, 1.95)], .025, PINK)
    elif style == "silver_bob":
        ellipsoid(collection, root, "rounded_bob_back", (0, .18, 1.72), (.28, .15, .27), mat)
        for side in (-1, 1):
            line(collection, root, f"silver_side_{side}", [(side * .20, .01, 1.95),
                 (side * .30, -.04, 1.72), (side * .25, -.03, 1.52)],
                 .075, mat, [1, .95, .25])
        line(collection, root, "silver_side_part", [(.19, -.12, 1.96),
             (.02, -.20, 1.92), (-.18, -.18, 1.84)], .055, mat, [.9, .8, .12])


def build_child_body(collection, root, skin):
    """Purpose-built child silhouette: short legs, small shoulders and larger head."""
    for side in (-1, 1):
        x = side * .12
        limb(collection, root, f"Child_leg_{side}", (x, 0, .14),
             (x, 0, .73), .064, .072, skin)
        rounded_box(collection, root, f"Child_sock_{side}",
                    (x, -.015, .20), (.13, .14, .15), .035, CREAM)
        ellipsoid(collection, root, f"Child_shoe_{side}",
                  (x, -.08, .075), (.105, .16, .072), APRICOT)
        rounded_box(collection, root, f"Child_sole_{side}",
                    (x, -.08, .033), (.20, .26, .035), .014, SOLE)
    torso(collection, root, "Child_pleated_skirt", .67, 1.04,
          (.32, .31, .28, .22, .18), (.22, .21, .20, .17, .14), PINK)
    for side in (-1, 1):
        line(collection, root, f"Skirt_pleat_{side}",
             [(side * .08, -.18, 1.02), (side * .12, -.23, .84),
              (side * .18, -.20, .69)], .007, ROSE)
    torso(collection, root, "Child_hoodie", .98, 1.48,
          (.18, .20, .21, .22, .225), (.145, .16, .17, .18, .18), APRICOT)
    rounded_box(collection, root, "Hoodie_front_pocket", (0, -.181, 1.13),
                (.25, .018, .13), .04, APRICOT)
    line(collection, root, "Hoodie_pocket_edge", [(-.11, -.196, 1.18),
         (0, -.203, 1.19), (.11, -.196, 1.18)], .006, ROSE)
    for side in (-1, 1):
        ellipsoid(collection, root, f"Child_sleeve_{side}",
                  (side * .29, -.005, 1.25), (.09, .105, .24), APRICOT)
        rounded_box(collection, root, f"Child_cuff_{side}",
                    (side * .29, -.01, 1.02), (.13, .14, .08), .035, ROSE)
        ellipsoid(collection, root, f"Child_hand_{side}",
                  (side * .29, -.03, .93), (.055, .05, .09), skin)
    ellipsoid(collection, root, "Child_neck", (0, 0, 1.49), (.075, .077, .10), skin)
    line(collection, root, "Hoodie_collar", [(-.12, -.09, 1.46),
         (0, -.18, 1.41), (.12, -.09, 1.46)], .018, ROSE)
    for side in (-1, 1):
        line(collection, root, f"Hoodie_drawstring_{side}",
             [(side * .055, -.18, 1.43), (side * .06, -.19, 1.27)], .007, CREAM)
        ellipsoid(collection, root, f"Drawstring_tip_{side}",
                  (side * .06, -.19, 1.26), (.012, .013, .018), GOLD)


def make_avatar(spec):
    collection = bpy.data.collections.new(spec["id"])
    bpy.context.scene.collection.children.link(collection)
    root = bpy.data.objects.new(spec["id"], None)
    collection.objects.link(root)
    root["role"] = spec["role"]
    root["display_name"] = spec["label"]
    root["version"] = "3.0-static"
    child = spec["role"] == "child"
    female = spec["sex"] == "female"
    staff = spec["role"] == "staff"
    skin = SKIN[spec["skin"]]
    hair = HAIR[spec["hair"]]
    top = spec["top"]
    bottom = spec["bottom"]

    if child:
        build_child_body(collection, root, skin)
    else:
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

    # Character-specific head mesh and expressive eye geometry are preserved in GLB.
    design = FACE_DESIGNS[spec["id"]]
    head_width = design["width"]
    shaped_head(collection, root, design, skin)
    iris_mat = IRIS_HAZEL if spec["hair"] in ("honey", "chestnut", "silver") else IRIS_BROWN
    for side in (-1, 1):
        ellipsoid(collection, root, f"Ear_{side}",
                  (side * design["width"] * .98, -.01, 1.66),
                  (.036 if child else .033, .027, .059), skin)
        eye_x = side * design["eyes"]
        eye_z = 1.736 if child else 1.728
        # Follow the curved head surface at each character's unique eye spacing.
        front = -.02 - design["depth"] * math.sqrt(max(.2,
            1 - (eye_x / design["width"]) ** 2
              - ((eye_z - 1.69) / design["height"]) ** 2))
        factor = design["eye_size"] * 1.27
        ellipsoid(collection, root, f"Eye_white_{side}",
                  (eye_x, front - .009, eye_z),
                  (.055 * factor, .015, .042 * factor), WHITE, 32)
        ellipsoid(collection, root, f"Iris_{side}",
                  (eye_x + side * .003, front - .022, eye_z - .003),
                  (.032 * factor, .007, .034 * factor), iris_mat, 32)
        ellipsoid(collection, root, f"Pupil_{side}",
                  (eye_x + side * .003, front - .028, eye_z - .001),
                  (.019 * factor, .004, .026 * factor), PUPIL, 32)
        ellipsoid(collection, root, f"Eye_glint_{side}",
                  (eye_x - .011, front - .032, eye_z + .013),
                  (.006, .002, .008), WHITE)
        line(collection, root, f"Upper_lid_{side}",
             [(eye_x - .055 * factor, front - .014, eye_z + .015),
              (eye_x, front - .023, eye_z + .041 * factor),
              (eye_x + .055 * factor, front - .014, eye_z + .015)],
             .008 if child else .0065, skin)
        lift = design["brow"]
        line(collection, root, f"Expressive_brow_{side}",
             [(eye_x - .044, front + .004, eye_z + .078 + lift),
              (eye_x, front - .004, eye_z + .089 + lift),
              (eye_x + .046, front + .005, eye_z + .076 + lift)],
             .009 if spec["id"] == "customer_male" else .0065, hair)
        if female:
            line(collection, root, f"Outer_lash_{side}",
                 [(eye_x + side * .030, front - .022, eye_z + .034),
                  (eye_x + side * .059, front - .014, eye_z + .037),
                  (eye_x + side * .070, front - .004, eye_z + .048)],
                 .0045, PUPIL)
    nose_depth = design["nose"]
    ellipsoid(collection, root, "Soft_nose", (0, -design["depth"] - nose_depth * .52, 1.625),
              (.016 if child else .017, nose_depth * .67, .015), skin)
    # Mouth corners lift subtly; each preset changes width and expression.
    mouth_y = -design["depth"] + .012
    smile = design["smile"]
    lip = LIP if female else LIP_NUDE
    line(collection, root, "Natural_smile",
         [(-.048 - smile, mouth_y + .012, 1.555 + smile * .33),
          (0, mouth_y - .012, 1.550),
          (.048 + smile, mouth_y + .012, 1.555 + smile * .33)],
         .0045 if child else .005, lip)
    for side in (-1, 1):
        ellipsoid(collection, root, f"Smile_dimple_{side}",
                  (side * (.047 + smile), mouth_y + .006, 1.556 + smile * .33),
                  (.006, .004, .006), lip)
    add_hair(collection, root, spec["hairstyle"], hair, design)

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
                 [(side * .045, -.25, 1.73), (side * .095, -.263, 1.765),
                  (side * .145, -.244, 1.73), (side * .095, -.263, 1.695),
                  (side * .045, -.25, 1.73)], .006, GOLD)
        line(collection, root, "Glass_bridge", [(-.044, -.255, 1.735),
             (0, -.26, 1.744), (.044, -.255, 1.735)], .006, GOLD)

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
    "version": 3,
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
bpy.context.scene.view_settings.view_transform = "AgX"
bpy.context.scene.view_settings.look = "AgX - Medium High Contrast"
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
camera.location = (5.2, -10.8, 3.2)
camera.rotation_euler = (Vector((0, 0, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = str(PREVIEW_STAFF_THREE_QUARTER)
bpy.ops.render.render(write_still=True)
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index < 4
camera.location.y = -7.9
camera.rotation_euler = (Vector((0, 3.1, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = str(PREVIEW_VISITORS)
bpy.ops.render.render(write_still=True)
camera.location = (5.2, -10.8, 3.2)
camera.rotation_euler = (Vector((0, 3.1, 1.0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = str(PREVIEW_THREE_QUARTER)
bpy.ops.render.render(write_still=True)
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index >= 4
camera.location = (0, -8, 1.73)
camera.rotation_euler = (Vector((0, 0, 1.73)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.ortho_scale = 8.5
bpy.context.scene.render.resolution_y = 600
bpy.context.scene.render.filepath = str(PREVIEW_FACES)
bpy.ops.render.render(write_still=True)
for index, (avatar, _) in enumerate(avatars):
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = index < 4
camera.location.y = -4.9
camera.rotation_euler = (Vector((0, 3.1, 1.73)) - camera.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.render.filepath = str(PREVIEW_VISITOR_FACES)
bpy.ops.render.render(write_still=True)
for avatar, _ in avatars:
    for obj in [avatar, *avatar.children_recursive]:
        obj.hide_render = False
for obj in studio.objects:
    obj.hide_render = False
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE))
print("SOURCE_SAVED", SOURCE)
print("PREVIEW_SAVED", PREVIEW_STAFF, PREVIEW_VISITORS)
