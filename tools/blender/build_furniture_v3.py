"""Build editable V3 manicure/pedicure furniture and export game-ready GLBs.

Run: blender --background --python tools/blender/build_furniture_v3.py
Coordinates in helpers are Three.js coordinates: X right, Y up, Z toward aisle.
The source .blend preserves named independent objects and modifiers already applied.
"""
import bpy
import math
import struct
import zlib
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps" / "web" / "public" / "models"
SOURCE = ROOT / "packages" / "assets" / "source"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)


def rgb(hex_color):
    # Blender node colors are linear; convert authored sRGB hex before GLB export.
    def linear(channel):
        c = channel / 255
        return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return tuple(linear((hex_color >> shift) & 255) for shift in (16, 8, 0))


def material(name, color, rough=.55, metal=0, emission=None, strength=0, alpha=1):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*rgb(color), alpha)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*rgb(color), 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emission is not None:
        p.inputs["Emission Color"].default_value = (*rgb(emission), 1)
        p.inputs["Emission Strength"].default_value = strength
    p.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        m.surface_render_method = "DITHERED"
    return m


MAT = {
    "marble": material("WarmWhiteMarble_V3", 0xf8ede5, .2),
    "gold": material("ChampagneGoldMetal_V3", 0xcaa05a, .25, .86),
    "brass": material("BrushedBrass_V3", 0xaa8249, .33, .8),
    "ivory": material("IvoryUpholstery_V3", 0xeeddd1, .77),
    "ivory_seam": material("IvoryStitch_V3", 0xd5bcae, .9),
    "rose": material("DustyRoseFabric_V3", 0xd9a19e, .82),
    "pink": material("BlushPinkLeather_V3", 0xd39a91, .55),
    "black": material("MatteBlackMechanism_V3", 0x242126, .68),
    "leather": material("DarkBrownLeather_V3", 0x574139, .46),
    "leather_lite": material("DarkBrownLeatherInset_V3", 0x6d554a, .52),
    "leather_seam": material("TaupeStitch_V3", 0x49372f, .74),
    "basin": material("BlackGlossyCeramic_V3", 0x171719, .1),
    "water": material("ClearWater_V3", 0x92b6b4, .12, alpha=.58),
    "uv": material("UVLampPurpleGlow_V3", 0xc48aff, .25, emission=0x9e50ff, strength=2.6),
    "cream": material("WarmCreamPlastic_V3", 0xfaf2e9, .42),
    "screen": material("UVDisplay_V3", 0x27232d, .22),
}


def marble_texture():
    """A subtle, authored albedo map; visible on the real slab mesh, never a scene backdrop."""
    size = 512
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            u, v = x / size, y / size
            drift = .07 * math.sin(8 * u + 3 * v) + .025 * math.sin(19 * u - 5 * v)
            vein1 = abs(v - (.28 + drift))
            vein2 = abs(v - (.75 - .06 * math.sin(7 * u + 1.2)))
            vein = max(math.exp(-vein1 * 220) * .19, math.exp(-vein2 * 310) * .12)
            cloud = .022 * (math.sin(31 * u + 17 * v) + math.sin(13 * u - 29 * v))
            row.extend((int(max(0, min(255, 248 - 65 * vein + 8 * cloud))),
                        int(max(0, min(255, 239 - 88 * vein + 5 * cloud))),
                        int(max(0, min(255, 231 - 90 * vein + 4 * cloud))), 255))
        rows.append(b"\x00" + row)

    def chunk(tag, payload):
        return struct.pack("!I", len(payload)) + tag + payload + struct.pack("!I", zlib.crc32(tag + payload) & 0xffffffff)

    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack("!2I5B", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b"")
    path = SOURCE / "warm_marble_v3.png"
    path.write_bytes(data)
    image = bpy.data.images.load(str(path), check_existing=True)
    nodes = MAT["marble"].node_tree.nodes
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    MAT["marble"].node_tree.links.new(texture.outputs["Color"], nodes.get("Principled BSDF").inputs["Base Color"])


marble_texture()

ASSETS = {"manicure": [], "pedicure": []}
asset = "manicure"
parent = None


def xyz(v):
    return (v[0], -v[2], v[1])


def track(o, name, mat=None):
    o.name = name
    if mat is not None and hasattr(o.data, "materials"):
        o.data.materials.append(mat)
    if parent is not None:
        o.parent = parent
    ASSETS[asset].append(o)
    return o


def empty(name, loc=(0, 0, 0), yaw=0):
    o = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(o)
    track(o, name)
    o.location = xyz(loc)
    o.rotation_euler.z = yaw
    return o


def bevel_box(name, loc, size, mat, radius=.04, segments=4):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.object
    track(o, name, mat)
    o.location = xyz(loc)
    o.dimensions = (size[0], size[2], size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if radius:
        mod = o.modifiers.new("soft rounded upholstery/edge", "BEVEL")
        mod.width = min(radius, min(size) * .47)
        mod.segments = segments
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
        norm = o.modifiers.new("weighted corner normals", "WEIGHTED_NORMAL")
        bpy.ops.object.modifier_apply(modifier=norm.name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def cylinder(name, loc, radius, height, mat, vertices=24, bevel=.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=height)
    o = bpy.context.object
    track(o, name, mat)
    o.location = xyz(loc)
    if bevel:
        mod = o.modifiers.new("soft circular edge", "BEVEL")
        mod.width = min(bevel, height * .25)
        mod.segments = 3
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def sphere(name, loc, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12)
    o = bpy.context.object
    track(o, name, mat)
    o.location = xyz(loc)
    o.scale = (scale[0], scale[2], scale[1])
    for p in o.data.polygons:
        p.use_smooth = True
    return o


def tube(name, pts, radius, mat, resolution=4):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new("POLY")
    spline.points.add(len(pts) - 1)
    for point, val in zip(spline.points, pts):
        point.co = (*xyz(val), 1)
    o = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(o)
    track(o, name)
    o.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target="MESH")
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def custom_mesh(name, vertices, faces, mat, bevel=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([xyz(v) for v in vertices], [], faces)
    mesh.update()
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    track(o, name, mat)
    if bevel:
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        mod = o.modifiers.new("rounded modeled edge", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for poly in o.data.polygons:
        poly.use_smooth = True
    return o


def set_parent(new_parent):
    global parent
    old = parent
    parent = new_parent
    return old


def bottle(name, x, y, z, color, pump=False):
    tint = material(f"{name}_tint", color, .27)
    bevel_box(name + "_glass_body", (x, y + .065, z), (.1, .13, .09), tint, .018)
    cylinder(name + "_gold_neck", (x, y + .15, z), .031, .045, MAT["gold"], 16)
    if pump:
        tube(name + "_pump", [(x, y + .16, z), (x, y + .24, z), (x + .052, y + .24, z)], .012, MAT["gold"])
    else:
        cylinder(name + "_gold_cap", (x, y + .21, z), .033, .11, MAT["gold"], 16)


def client_chair():
    global parent
    # Both seats face the long 1.91 m edges of the table across its 0.87 m depth.
    root = empty("Client_Armchair", (0, 0, .95), math.pi)
    old = set_parent(root)
    # Continuous rounded tub shell, higher at the back and lower at the open front.
    center = [(-.45, .27), (-.49, .08), (-.47, -.1), (-.39, -.3), (-.23, -.42), (0, -.46), (.23, -.42), (.39, -.3), (.47, -.1), (.49, .08), (.45, .27)]
    heights = [.89, .94, 1.05, 1.20, 1.31, 1.35, 1.31, 1.20, 1.05, .94, .89]
    verts = []
    for (x, z), h in zip(center, heights):
        nx = 1 if x > .1 else -1 if x < -.1 else 0
        nz = -.75 if abs(x) < .35 else -.3
        mag = math.hypot(nx, nz)
        nx, nz = nx / mag * .10, nz / mag * .10
        verts.extend([(x + nx, .54, z + nz), (x - nx, .54, z - nz), (x + nx, h, z + nz), (x - nx, h, z - nz)])
    faces = []
    for i in range(len(center) - 1):
        a = i * 4
        b = (i + 1) * 4
        faces.extend([(a, b, b + 2, a + 2), (a + 1, a + 3, b + 3, b + 1), (a + 2, b + 2, b + 3, a + 3), (a, a + 1, b + 1, b)])
    faces.extend([(0, 2, 3, 1), (len(verts) - 4, len(verts) - 3, len(verts) - 1, len(verts) - 2)])
    custom_mesh("continuous_rounded_tub_shell", verts, faces, MAT["ivory"], .045)
    bevel_box("thick_soft_seat", (0, .62, 0), (.81, .20, .69), MAT["ivory"], .085)
    pillow = bevel_box("dusty_rose_lumbar_pillow", (0, .93, -.22), (.64, .30, .14), MAT["rose"], .065)
    pillow.rotation_euler.x = -.16
    for x in [-.36, -.18, 0, .18, .36]:
        tube("vertical_upholstery_seam", [(x, .68, -.455), (x, 1.03, -.50), (x * .72, 1.25, -.48)], .004, MAT["ivory_seam"])
    for x in [-.35, .35]:
        for z in [-.25, .25]:
            leg = cylinder("splayed_tapered_gold_leg", (x * 1.10, .24, z * 1.14), .034, .45, MAT["gold"], 16)
            leg.rotation_euler.y = -.08 if x > 0 else .08
            cylinder("gold_ferrule", (x * 1.15, .07, z * 1.2), .038, .11, MAT["brass"], 16)
    parent = old


def technician_stool():
    global parent
    root = empty("Technician_Swivel_Stool", (0, 0, -.92), 0)
    old = set_parent(root)
    cylinder("round_blush_seat", (0, .56, 0), .30, .16, MAT["pink"], 32, .055)
    bevel_box("rounded_blush_backrest", (0, .98, -.24), (.49, .39, .15), MAT["pink"], .07)
    tube("matte_black_L_back_support", [(0, .52, -.15), (0, .78, -.27), (0, .98, -.27)], .022, MAT["black"])
    cylinder("black_gas_lift", (0, .33, 0), .046, .41, MAT["black"])
    tube("height_adjustment_lever", [(0, .51, 0), (.20, .51, 0), (.24, .48, 0)], .012, MAT["black"])
    for i in range(5):
        a = i * math.tau / 5
        x, z = .32 * math.cos(a), .32 * math.sin(a)
        tube("five_star_black_base", [(0, .13, 0), (x, .11, z)], .031, MAT["black"])
        for q in [-.035, .035]:
            sphere("dual_wheel_caster", (x + q, .055, z), (.05, .05, .043), MAT["black"])
    parent = old


def manicure():
    global asset, parent
    asset = "manicure"
    parent = None
    root = empty("Nail_Station_V3")
    set_parent(root)
    table = empty("Manicure_Table")
    old = set_parent(table)
    bevel_box("rounded_marble_slab", (0, .84, 0), (1.91, .10, .87), MAT["marble"], .055)
    # Polished U loops are continuous bent tubes at the two ends of the slab.
    for x in [-.80, .80]:
        points = [(x, .79, -.34), (x, .69, -.34), (x, .10, -.34), (x, .055, -.29), (x, .055, .29), (x, .10, .34), (x, .69, .34), (x, .79, .34)]
        tube("continuous_champagne_U_leg", points, .028, MAT["gold"], 6)
    for z in [-.31, .31]:
        tube("under_table_gold_long_rail", [(-.80, .76, z), (.80, .76, z)], .016, MAT["brass"])
    parent = old
    client_chair()
    technician_stool()
    props = empty("Tabletop_Tools")
    old = set_parent(props)
    bevel_box("blush_desk_mat", (0, .898, 0), (.48, .012, .35), MAT["rose"], .012)
    bevel_box("soft_armrest_cushion", (0, .95, 0), (.37, .10, .16), MAT["pink"], .045)
    bevel_box("gold_oval_polish_tray", (-.62, .915, -.19), (.40, .035, .22), MAT["gold"], .09)
    for i, color in enumerate([0xe9b5ac, 0xf1d3c8, 0xc88490]):
        bottle(f"polish_bottle_{i + 1}", -.75 + i * .12, .935, -.19, color)
    cylinder("ribbed_blush_brush_cup", (.42, .99, -.22), .095, .20, MAT["pink"], 24)
    for i in range(12):
        a = i * math.tau / 12
        tube("cup_vertical_rib", [(.42 + .094 * math.cos(a), .90, -.22 + .094 * math.sin(a)), (.42 + .094 * math.cos(a), 1.08, -.22 + .094 * math.sin(a))], .004, MAT["rose"])
    for i in range(3):
        tube("nail_brush_tool", [(.38 + i * .038, 1.05, -.23), (.38 + i * .038, 1.34 - i * .04, -.23)], .007, MAT["gold"])
    uv = empty("UV_LED_Lamp", (.55, .90, .18))
    parent = uv
    bevel_box("arched_white_shell", (0, .12, 0), (.44, .23, .31), MAT["cream"], .10)
    bevel_box("dark_inset_display", (0, .235, -.06), (.19, .009, .08), MAT["screen"], .008)
    bevel_box("violet_emissive_opening", (0, .047, .158), (.34, .08, .022), MAT["uv"], .02)
    bevel_box("violet_inner_floor", (0, .014, .08), (.32, .01, .22), MAT["uv"], .006)
    parent = old
    parent = None


def diamond_quilt():
    # Embossed cushion with diagonal stitched lines on its forward-facing surface.
    bevel_box("diamond_quilted_back_insert", (0, 1.58, -.60), (.77, 1.12, .12), MAT["leather_lite"], .05)
    vertices, faces = [], []
    cols, rows = 40, 56
    for j in range(rows + 1):
        y = 1.11 + .94 * j / rows
        for i in range(cols + 1):
            x = -.35 + .70 * i / cols
            u = (x / .20 + (y - 1.11) / .28) % 1
            w = (x / .20 - (y - 1.11) / .28) % 1
            edge_fade = min(1, (x + .35) / .05, (.35 - x) / .05, (y - 1.11) / .05, (2.05 - y) / .05)
            puff = max(0, edge_fade) * math.sin(math.pi * u) ** 2 * math.sin(math.pi * w) ** 2
            vertices.append((x, y, -.536 + .012 * puff))
    for j in range(rows):
        for i in range(cols):
            a = j * (cols + 1) + i
            faces.append((a, a + 1, a + cols + 2, a + cols + 1))
    custom_mesh("raised_diamond_quilt_geometry", vertices, faces, MAT["leather_lite"])
    xmin, xmax, ymin, ymax = -.36, .36, 1.10, 2.06
    slope = .72
    for sign in [-1, 1]:
        for offset in [i * .21 for i in range(-8, 9)]:
            pts = []
            for step in range(49):
                x = xmin + (xmax - xmin) * step / 48
                y = 1.58 + sign * slope * x + offset
                if ymin <= y <= ymax:
                    pts.append((x, y, -.519))
            if len(pts) > 1:
                tube("diamond_quilted_stitch", pts, .0035, MAT["leather_seam"], 2)


def basin():
    global parent
    root = empty("Black_Gold_Foot_Basin", (0, 0, .88))
    old = set_parent(root)
    # Multiple elliptical rings form real exterior, thick rim and recessed inner bowl.
    rings = [(0.05, .54, .43), (.12, .62, .49), (.43, .65, .51), (.48, .63, .50), (.48, .54, .42), (.34, .48, .37), (.18, .34, .26), (.15, .10, .08)]
    verts = []
    sides = 48
    for h, rx, rz in rings:
        for k in range(sides):
            a = math.tau * k / sides
            verts.append((rx * math.cos(a), h, rz * math.sin(a)))
    faces = []
    for row in range(len(rings) - 1):
        for k in range(sides):
            n = (k + 1) % sides
            faces.append((row * sides + k, row * sides + n, (row + 1) * sides + n, (row + 1) * sides + k))
    custom_mesh("hollow_elliptical_black_ceramic", verts, faces, MAT["basin"])
    tube("continuous_brushed_gold_rim", [(.635 * math.cos(math.tau * i / 64), .485, .50 * math.sin(math.tau * i / 64)) for i in range(65)], .018, MAT["gold"])
    water = cylinder("transparent_recessed_water", (0, .23, 0), .35, .008, MAT["water"], 48, 0)
    water.scale.y = .78
    cylinder("gold_central_drain", (0, .244, 0), .045, .01, MAT["gold"])
    faucet = empty("Gooseneck_Gold_Faucet", (-.46, 0, -.28))
    parent = faucet
    cylinder("faucet_pedestal", (0, .50, 0), .067, .11, MAT["gold"])
    tube("high_arc_water_spout", [(0, .53, 0), (0, .77, 0), (.04, .94, .04), (.17, 1.0, .16), (.30, .94, .22), (.32, .78, .22)], .026, MAT["gold"])
    tube("gold_water_control_lever", [(-.10, .55, 0), (-.19, .55, 0)], .018, MAT["gold"])
    tube("transparent_running_water", [(.32, .77, .22), (.32, .53, .22), (.32, .25, .22)], .009, MAT["water"], 3)
    parent = old
    parent = None


def pedicure_cart():
    global parent
    root = empty("Two_Tier_Gold_Trolley", (1.22, 0, -.05))
    old = set_parent(root)
    for x in [-.26, .26]:
        for z in [-.20, .20]:
            tube("gold_vertical_cart_frame", [(x, .09, z), (x, .82, z), (x, .94, z + (-.04 if z > 0 else .04))], .015, MAT["gold"])
            sphere("black_swivel_caster", (x, .055, z), (.045, .045, .045), MAT["black"])
    for h in [.27, .75]:
        bevel_box("ivory_two_tier_tray", (0, h, 0), (.62, .045, .49), MAT["marble"], .025)
        for z in [-.20, .20]:
            tube("raised_gold_tray_rail", [(-.27, h + .05, z), (.27, h + .05, z)], .009, MAT["gold"])
    for i, color in enumerate([0xe2a4a4, 0xf8e9dc, 0xd8c5af]):
        bottle(f"pump_lotion_{i + 1}", -.17 + i * .17, .80, -.05, color, True)
    for i in range(2):
        bevel_box("thick_folded_ivory_towel", (0, .32 + i * .085, .02), (.43, .075, .27), MAT["ivory"], .025)
    parent = old


def pedicure():
    global asset, parent
    asset = "pedicure"
    parent = None
    root = empty("Spa_Station_V3")
    set_parent(root)
    chair = empty("Quilted_Leather_Chair")
    old = set_parent(chair)
    bevel_box("grounded_leather_plinth", (0, .24, -.30), (1.36, .46, 1.29), MAT["leather"], .16)
    bevel_box("basin_to_chair_connector", (0, .18, .43), (1.05, .33, .35), MAT["basin"], .08)
    bevel_box("deep_contoured_seat", (0, .71, -.21), (1.20, .32, 1.04), MAT["leather_lite"], .15)
    for x in [-.68, .68]:
        bevel_box("continuous_full_height_side_shell", (x, .61, -.35), (.29, 1.16, 1.20), MAT["leather"], .13)
        bevel_box("soft_padded_arm_cap", (x, 1.15, -.19), (.32, .19, .97), MAT["leather_lite"], .085)
    back = empty("Reclining_Backrest", (0, 0, 0))
    parent = back
    shell = bevel_box("high_reclining_padded_back", (0, 1.61, -.75), (1.20, 1.62, .35), MAT["leather"], .16)
    shell.rotation_euler.x = -.14
    diamond_quilt()
    bevel_box("soft_peach_lumbar_pillow", (0, 1.16, -.30), (.63, .32, .14), MAT["rose"], .07)
    head = bevel_box("thick_pillowed_headrest", (0, 2.39, -.91), (1.16, .38, .36), MAT["leather_lite"], .16)
    head.rotation_euler.x = -.1
    for x in [-.30, .30]:
        tube("headrest_vertical_seam", [(x, 2.23, -.70), (x, 2.40, -.68), (x, 2.54, -.73)], .004, MAT["leather_seam"])
    parent = chair
    for x in [-.82, .82]:
        bevel_box("gold_side_control_plate", (x, .94, -.27), (.016, .10, .23), MAT["gold"], .009)
        for z in [-.32, -.21]:
            sphere("round_massage_control", (x * 1.02, .94, z), (.018, .022, .022), MAT["brass"])
    sphere("headrest_gold_side_button", (.64, 2.34, -.89), (.025, .028, .028), MAT["gold"])
    # The front-view concept gives a chair height roughly 1.5 times its width.
    # Scale the chair alone; basin and two-tier cart keep their practical height.
    chair.scale.z = .80
    parent = old
    basin()
    pedicure_cart()
    parent = None


manicure()
pedicure()

for key, filename in [("manicure", "manicure_station_v3.glb"), ("pedicure", "pedicure_station_v3.glb")]:
    bpy.ops.object.select_all(action="DESELECT")
    for o in ASSETS[key]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ASSETS[key][0]
    bpy.ops.export_scene.gltf(filepath=str(OUT / filename), export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
    print(f"EXPORTED {filename}: {len(ASSETS[key])} named objects")

bpy.ops.object.select_all(action="SELECT")
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE / "nail_furniture_v3.blend"))
print("SOURCE_SAVED nail_furniture_v3.blend")
