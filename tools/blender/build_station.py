"""
Builds the FootGuard station in Blender from code, so the model can be rebuilt and changed in one place.

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python tools/blender/build_station.py -- --out <dir> [--render] [--samples 128] [--export]

Output in <dir>: station.blend, textures/, previews (with --render), and with --export the per-layer
ambient-occlusion bakes (textures/<layer>-ao.png) and station-raw.glb.

Units are metres. The footprint is 44 × 34 cm, matching src/scene/deviceModel.ts (1 scene unit = 10 cm).
Sizes are illustrative, not engineering dimensions. Front faces -Y, toes point to +Y, Z is up.
Each layer is an Empty named by its DeviceLayerId, placed at its assembled base height; the website explodes them.
"""
import argparse
import math
import os
import random
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

W, D = 0.44, 0.34

LAYERS = ['outerShell', 'pressureSensors', 'supports', 'innerFrame', 'circuit', 'insulation', 'cameras', 'topGlass']

# Base heights in metres, the same as ASSEMBLED_Y and EXPLODED_Y in deviceModel.ts (× 0.1).
ASSEMBLED_Z = {'outerShell': 0.0, 'pressureSensors': 0.012, 'supports': 0.018, 'innerFrame': 0.045,
               'circuit': 0.052, 'insulation': 0.095, 'cameras': 0.102, 'topGlass': 0.13}
EXPLODED_Z = {'outerShell': 0.0, 'pressureSensors': 0.17, 'supports': 0.24, 'innerFrame': 0.32,
              'circuit': 0.44, 'insulation': 0.52, 'cameras': 0.59, 'topGlass': 0.68}

# 4 FSR402 per foot: big toe, inner forefoot, outer forefoot, heel. Left foot is -X.
FSR_LEFT = [(-0.065, 0.10), (-0.055, 0.045), (-0.108, 0.04), (-0.085, -0.095)]
# Tail paths from each sensor to the connector at the back edge, routed around the other sensors.
TAILS_LEFT = [
    [(-0.065, 0.10), (-0.065, 0.148)],
    [(-0.055, 0.045), (-0.042, 0.045), (-0.042, 0.148)],
    [(-0.108, 0.04), (-0.108, 0.148)],
    [(-0.085, -0.095), (-0.085, 0.148)],
]

# Surface colours (sRGB hex), the same palette as COLOR in deviceModel.ts.
MATERIALS = {
    'shell': dict(color=0xeef0ef, rough=0.42),
    'shellInner': dict(color=0xdfe2e1, rough=0.5),
    'rubber': dict(color=0x202324, rough=0.9),
    'statusLed': dict(color=0x2f6bff, rough=0.3, emit=0x2f6bff, emit_strength=6.0),
    'plate': dict(color=0x2a2e31, rough=0.75),
    'fsr': dict(color=0x3b3f42, rough=0.45, metal=0.2),
    'gold': dict(color=0xc9a14a, rough=0.3, metal=1.0),
    'connector': dict(color=0xf1efe8, rough=0.6),
    'grid': dict(color=0x23272a, rough=0.55),
    'frame': dict(color=0xd4d8d8, rough=0.45),
    'pcb': dict(color=0x1f6a3a, rough=0.5),
    'pcbTop': dict(image='pcb.png', rough=0.45),
    'chip': dict(color=0x1a1c1e, rough=0.4),
    'shield': dict(color=0xc9ccce, rough=0.25, metal=1.0),
    'battery': dict(color=0x1f63c9, rough=0.28, coat=0.6),
    'metal': dict(color=0xb9bec2, rough=0.25, metal=1.0),
    'holder': dict(color=0x151719, rough=0.6),
    'insulation': dict(color=0x2c3134, rough=0.6),
    'insulationTop': dict(image='insulation.png', rough=0.8),
    'tray': dict(color=0xb7bcbf, rough=0.3, metal=1.0),
    'camPcb': dict(color=0x1b2433, rough=0.5),
    'lens': dict(color=0x1c2a5e, rough=0.08, metal=0.2, coat=1.0),
    'lensMlx': dict(color=0x4a2440, rough=0.05, metal=0.6, coat=1.0),
    'ledRed': dict(color=0xe0393e, rough=0.3, emit=0xe0393e, emit_strength=4.0),
    'ledBlue': dict(color=0x2f6bff, rough=0.3, emit=0x2f6bff, emit_strength=4.0),
    'glass': dict(color=0xd9ecef, rough=0.04, alpha=0.3),
    'glassRim': dict(color=0x2b2f32, rough=0.4, metal=0.3),
    'footOutline': dict(image='feet.png', rough=0.5, image_alpha=True),
}


# ---------------------------------------------------------------- helpers

def srgb_to_linear(hex_color):
    channels = [(hex_color >> shift & 0xFF) / 255 for shift in (16, 8, 0)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels) + (1.0,)


def rr_points(w, d, r, seg=8):
    """Rounded rectangle outline, counter-clockwise from above, centred on the origin."""
    r = max(min(r, w / 2 - 1e-4, d / 2 - 1e-4), 1e-4)
    corners = [(w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)]
    points = []
    for cx, cy, start in corners:
        for i in range(seg + 1):
            a = math.radians(start + 90 * i / seg)
            points.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return points


def prism(bm, points, h, z0=0.0, offset=(0.0, 0.0)):
    ox, oy = offset
    bottom = [bm.verts.new((x + ox, y + oy, z0)) for x, y in points]
    top = [bm.verts.new((x + ox, y + oy, z0 + h)) for x, y in points]
    bm.faces.new(list(reversed(bottom)))
    bm.faces.new(top)
    n = len(points)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))


def plate(bm, w, d, h, r, z0=0.0, offset=(0.0, 0.0)):
    prism(bm, rr_points(w, d, r), h, z0, offset)


def ring(bm, w, d, r, wall, h, z0=0.0):
    """Rounded rectangular wall, like the sides of a tray."""
    outer = rr_points(w, d, r)
    inner = rr_points(w - 2 * wall, d - 2 * wall, max(r - wall, 0.002))
    ob = [bm.verts.new((x, y, z0)) for x, y in outer]
    ot = [bm.verts.new((x, y, z0 + h)) for x, y in outer]
    ib = [bm.verts.new((x, y, z0)) for x, y in inner]
    it = [bm.verts.new((x, y, z0 + h)) for x, y in inner]
    n = len(outer)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((ot[i], ot[j], it[j], it[i]))
        bm.faces.new((ob[j], ob[i], ib[i], ib[j]))
        bm.faces.new((ob[i], ob[j], ot[j], ot[i]))
        bm.faces.new((ib[j], ib[i], it[i], it[j]))


def annulus(bm, cx, cy, r_out, r_in, h, z0=0.0, seg=40):
    outer = [(cx + r_out * math.cos(2 * math.pi * i / seg), cy + r_out * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    inner = [(cx + r_in * math.cos(2 * math.pi * i / seg), cy + r_in * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    ob = [bm.verts.new((x, y, z0)) for x, y in outer]
    ot = [bm.verts.new((x, y, z0 + h)) for x, y in outer]
    ib = [bm.verts.new((x, y, z0)) for x, y in inner]
    it = [bm.verts.new((x, y, z0 + h)) for x, y in inner]
    for i in range(seg):
        j = (i + 1) % seg
        bm.faces.new((ot[i], ot[j], it[j], it[i]))
        bm.faces.new((ob[j], ob[i], ib[i], ib[j]))
        bm.faces.new((ob[i], ob[j], ot[j], ot[i]))
        bm.faces.new((ib[j], ib[i], it[i], it[j]))


def box(bm, cx, cy, z0, w, d, h):
    m = Matrix.Translation((cx, cy, z0 + h / 2)) @ Matrix.Diagonal((w, d, h, 1.0))
    bmesh.ops.create_cube(bm, size=1.0, matrix=m)


def cylinder(bm, cx, cy, z0, r, h, seg=40, r_top=None, axis='Z'):
    """Cylinder standing on (cx, cy, z0) for axis Z; lying along X or Y it is centred on (cx, cy, z0)."""
    if axis == 'Z':
        m = Matrix.Translation((cx, cy, z0 + h / 2))
    else:
        turn = Matrix.Rotation(math.radians(90), 4, 'Y' if axis == 'X' else 'X')
        m = Matrix.Translation((cx, cy, z0)) @ turn
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=r if r_top is None else r_top, depth=h, matrix=m)


def uv_plane(bm, w, d, z):
    """A flat rectangle facing up, with UVs spanning the whole texture."""
    uv = bm.loops.layers.uv.verify()
    verts = [bm.verts.new((x, y, z)) for x, y in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2))]
    face = bm.faces.new(verts)
    for loop in face.loops:
        loop[uv].uv = ((loop.vert.co.x + w / 2) / w, (loop.vert.co.y + d / 2) / d)


# ---------------------------------------------------------------- textures

class Textures:
    def __init__(self, folder):
        self.folder = folder
        os.makedirs(folder, exist_ok=True)

    def save(self, name, rgba):
        h, w, _ = rgba.shape
        image = bpy.data.images.new(name, w, h, alpha=True)
        image.pixels.foreach_set(np.clip(rgba, 0, 1).astype(np.float32).ravel())
        image.filepath_raw = os.path.join(self.folder, name)
        image.file_format = 'PNG'
        image.save()
        return image


def grid(width_m, depth_m, px_w):
    px_h = round(px_w * depth_m / width_m)
    xs = (np.arange(px_w) + 0.5) / px_w * width_m - width_m / 2
    ys = (np.arange(px_h) + 0.5) / px_h * depth_m - depth_m / 2
    return np.meshgrid(xs, ys), width_m / px_w


def hex_rgb(hex_color):
    return np.array([(hex_color >> s & 0xFF) / 255 for s in (16, 8, 0)])


def insulation_texture(w, d):
    """Dark plate with a staggered grid of holes, clear of the edges."""
    (X, Y), px = grid(w, d, 1024)
    pitch, radius, margin = 0.009, 0.0019, 0.012
    dist = np.full(X.shape, np.inf)
    row_pitch = pitch * 0.866
    for k in (0, 1):
        row = np.floor(Y / row_pitch) + k
        cy = row * row_pitch
        shift = (np.abs(row) % 2) * pitch / 2
        cx = np.round((X - shift) / pitch) * pitch + shift
        dist = np.minimum(dist, np.hypot(X - cx, Y - cy))
    inside = (np.abs(X) < w / 2 - margin) & (np.abs(Y) < d / 2 - margin)
    hole = np.clip((radius - dist) / px + 0.5, 0, 1) * inside
    base, dark = hex_rgb(0x3a4044), hex_rgb(0x111315)
    rgb = base * (1 - hole[..., None]) + dark * hole[..., None]
    return np.dstack([rgb, np.ones(X.shape)])


def ellipse_sdf(X, Y, cx, cy, rx, ry):
    dx, dy = X - cx, Y - cy
    k0 = np.sqrt((dx / rx) ** 2 + (dy / ry) ** 2)
    k1 = np.sqrt((dx / rx ** 2) ** 2 + (dy / ry ** 2) ** 2) + 1e-9
    return k0 * (k0 - 1) / k1


def smooth_min(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def foot_sdf(S, Y):
    """Left-foot outline in (s, y) metres; s points to the inner (big-toe) side."""
    sole = smooth_min(ellipse_sdf(S, Y, 0.0, 0.045, 0.046, 0.055), ellipse_sdf(S, Y, 0.003, -0.085, 0.031, 0.040), 0.02)
    sole = smooth_min(sole, ellipse_sdf(S, Y, -0.014, -0.02, 0.030, 0.065), 0.02)
    toes = [(0.023, 0.1136, 0.015, 0.018), (-0.0005, 0.1125, 0.0075, 0.0095), (-0.0165, 0.1083, 0.007, 0.009),
            (-0.031, 0.0971, 0.0065, 0.0085), (-0.0435, 0.0739, 0.006, 0.008)]
    result = sole
    for cx, cy, rx, ry in toes:
        result = np.minimum(result, ellipse_sdf(S, Y, cx, cy, rx, ry))
    return result


def feet_texture(w, d):
    (X, Y), px = grid(w, d, 1024)
    sdf = np.minimum(foot_sdf(X + 0.085, Y), foot_sdf(0.085 - X, Y))
    line = np.clip((0.0008 - np.abs(sdf)) / px + 0.5, 0, 1)
    fill = np.clip(-sdf / px + 0.5, 0, 1) * 0.10
    alpha = np.maximum(line * 0.85, fill)
    return np.dstack([np.ones(X.shape), np.ones(X.shape), np.ones(X.shape), alpha])


def pcb_texture(w, d, footprints):
    """Solder mask with copper traces, vias and silkscreen outlines around the parts."""
    (X, Y), px = grid(w, d, 1536)
    rgb = np.broadcast_to(hex_rgb(0x1d6537), X.shape + (3,)).copy()
    trace, silk, copper = hex_rgb(0x2f8a4e), hex_rgb(0xe9ece6), hex_rgb(0xc9a14a)

    def paint(mask, color):
        rgb[mask] = color

    rand = random.Random(11)
    half = 0.0004
    for _ in range(90):
        x0, y0 = rand.uniform(-w / 2 + 0.01, w / 2 - 0.01), rand.uniform(-d / 2 + 0.01, d / 2 - 0.01)
        x1, y1 = x0 + rand.uniform(-0.08, 0.08), y0 + rand.uniform(-0.05, 0.05)
        x1, y1 = np.clip(x1, -w / 2 + 0.01, w / 2 - 0.01), np.clip(y1, -d / 2 + 0.01, d / 2 - 0.01)
        paint((np.abs(Y - y0) < half) & (X >= min(x0, x1)) & (X <= max(x0, x1)), trace)
        paint((np.abs(X - x1) < half) & (Y >= min(y0, y1)) & (Y <= max(y0, y1)), trace)
        for vx, vy in ((x0, y0), (x1, y1)):
            r = np.hypot(X - vx, Y - vy)
            paint(r < 0.0011, copper)
            paint(r < 0.0005, hex_rgb(0x0d0f0e))
    for cx, cy, fw, fd in footprints:
        ox, oy = fw / 2 + 0.0015, fd / 2 + 0.0015
        edge = (np.abs(np.abs(X - cx) - ox) < 0.00035) & (np.abs(Y - cy) <= oy) | \
               (np.abs(np.abs(Y - cy) - oy) < 0.00035) & (np.abs(X - cx) <= ox)
        paint(edge, silk)
    # Mounting holes in the corners.
    for sx in (-1, 1):
        for sy in (-1, 1):
            r = np.hypot(X - sx * (w / 2 - 0.008), Y - sy * (d / 2 - 0.008))
            paint(r < 0.0035, copper)
            paint(r < 0.0018, hex_rgb(0x0d0f0e))
    return np.dstack([rgb, np.ones(X.shape)])


# ---------------------------------------------------------------- materials

def new_material(name, spec, images):
    material = bpy.data.materials.new(name)
    if bpy.app.version < (5, 0, 0):
        material.use_nodes = True
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        nodes.clear()
        bsdf = nodes.new('ShaderNodeBsdfPrincipled')
        out = nodes.new('ShaderNodeOutputMaterial')
        links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    inputs = bsdf.inputs
    inputs['Roughness'].default_value = spec.get('rough', 0.5)
    inputs['Metallic'].default_value = spec.get('metal', 0.0)
    if 'color' in spec:
        inputs['Base Color'].default_value = srgb_to_linear(spec['color'])
    if 'image' in spec:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = images[spec['image']]
        tex.interpolation = 'Cubic'
        links.new(tex.outputs['Color'], inputs['Base Color'])
        if spec.get('image_alpha'):
            links.new(tex.outputs['Alpha'], inputs['Alpha'])
    if 'alpha' in spec:
        inputs['Alpha'].default_value = spec['alpha']
    if 'alpha' in spec or spec.get('image_alpha'):
        if hasattr(material, 'surface_render_method'):
            material.surface_render_method = 'BLENDED'
        else:
            material.blend_method = 'BLEND'
    if 'emit' in spec:
        inputs['Emission Color'].default_value = srgb_to_linear(spec['emit'])
        inputs['Emission Strength'].default_value = spec['emit_strength']
    if spec.get('coat'):
        inputs['Coat Weight'].default_value = spec['coat']
        inputs['Coat Roughness'].default_value = 0.03
    return material


class LayerMaterials:
    """Materials are made per layer, so no two layers share one and the site can fade each layer on its own."""

    def __init__(self, layer, images):
        self.layer, self.images, self.cache = layer, images, {}

    def __getitem__(self, key):
        if key not in self.cache:
            self.cache[key] = new_material(f'{self.layer}.{key}', MATERIALS[key], self.images)
        return self.cache[key]


# ---------------------------------------------------------------- objects

def link(obj, collection):
    collection.objects.link(obj)
    return obj


def mesh_object(name, bm, collection):
    me = bpy.data.meshes.new(name)
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me), collection)


def apply_modifiers(obj):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    me = bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True, depsgraph=depsgraph)
    old = obj.data
    obj.modifiers.clear()
    obj.data = me
    bpy.data.meshes.remove(old)


def finish(obj, material, bevel, cutters=(), collection=None):
    """Booleans, rounded edges and clean normals, all applied so the export matches the preview."""
    me = obj.data
    temp = []
    for i, cutter_bm in enumerate(cutters):
        cutter = mesh_object(f'{obj.name}.cut{i}', cutter_bm, collection)
        temp.append(cutter)
        mod = obj.modifiers.new(f'cut{i}', 'BOOLEAN')
        mod.operation = 'DIFFERENCE'
        mod.solver = 'EXACT'
        mod.object = cutter
    if bevel > 0:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        mod = obj.modifiers.new('bevel', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = 'ANGLE'
        mod.angle_limit = math.radians(30)
        mod.use_clamp_overlap = True
        mod.harden_normals = True
        wn = obj.modifiers.new('normals', 'WEIGHTED_NORMAL')
        wn.mode = 'FACE_AREA'
        wn.keep_sharp = True
    if obj.modifiers:
        apply_modifiers(obj)
    for cutter in temp:
        mesh = cutter.data
        bpy.data.objects.remove(cutter)
        bpy.data.meshes.remove(mesh)
    obj.data.name = obj.name
    obj.data.materials.clear()
    obj.data.materials.append(material)


class Group:
    """An Empty whose geometry is collected per material, then turned into one object per material."""

    def __init__(self, name, collection, materials, parent=None, location=(0, 0, 0)):
        self.name, self.collection, self.materials = name, collection, materials
        self.empty = link(bpy.data.objects.new(name, None), collection)
        self.empty.empty_display_size = 0.05
        self.empty.parent = parent
        self.empty.location = location
        self.parts = {}

    def bm(self, material, bevel=0.0015):
        key = (material, bevel)
        if key not in self.parts:
            self.parts[key] = bmesh.new()
        return self.parts[key]

    def solid(self, label, material, bm, bevel, cutters=()):
        """A single object that needs booleans (openings, slots) before its edges are rounded."""
        obj = mesh_object(f'{self.name}.{label}', bm, self.collection)
        finish(obj, self.materials[material], bevel, cutters, self.collection)
        obj.parent = self.empty

    def build(self):
        for (material, bevel), bm in self.parts.items():
            obj = mesh_object(f'{self.name}.{material}', bm, self.collection)
            finish(obj, self.materials[material], bevel)
            obj.parent = self.empty
        self.parts.clear()


def new_bm():
    return bmesh.new()


# ---------------------------------------------------------------- layers

def build_outer_shell(g):
    h, r, wall, floor = 0.13, 0.045, 0.016, 0.012
    shell = new_bm()
    plate(shell, W, D, h, r)
    cavity = new_bm()
    plate(cavity, W - 2 * wall, D - 2 * wall, 0.2, r - wall, z0=floor)
    # Front window: a rounded opening in the front wall, as in the concept render.
    window = new_bm()
    prism(window, [(x, y + 0.062) for x, y in rr_points(0.30, 0.064, 0.016)], 0.06, z0=0.14)
    bmesh.ops.rotate(window, verts=window.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    g.solid('shell', 'shell', shell, 0.004, cutters=[cavity, window])

    # Status light to the right of the window, and four rubber feet.
    cylinder(g.bm('statusLed', 0.0005), 0.185, -D / 2 - 0.0005, 0.062, 0.0035, 0.002, seg=24, axis='Y')
    feet = g.bm('rubber', 0.002)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder(feet, sx * 0.17, sy * 0.12, -0.008, 0.022, 0.0085, seg=40)
    g.build()


def build_pressure_sensors(g):
    plate(g.bm('plate', 0.0015), W - 0.04, D - 0.04, 0.005, 0.03)
    fsr, gold = g.bm('fsr', 0.0004), g.bm('gold', 0.0003)
    sensors = FSR_LEFT + [(-x, y) for x, y in FSR_LEFT]
    for x, y in sensors:
        cylinder(fsr, x, y, 0.005, 0.014, 0.0012, seg=48)
        annulus(gold, x, y, 0.0145, 0.0128, 0.0016, z0=0.005, seg=48)
    tails = g.bm('gold', 0.0)
    for path in TAILS_LEFT + [[(-x, y) for x, y in p] for p in TAILS_LEFT]:
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            tw = 0.006
            box(tails, (x0 + x1) / 2, (y0 + y1) / 2, 0.005, abs(x1 - x0) + tw, abs(y1 - y0) + tw, 0.0006)
    box(g.bm('connector', 0.001), 0.0, 0.152, 0.005, 0.24, 0.012, 0.008)
    g.build()


def build_supports(g):
    black = g.bm('grid', 0.0015)
    w, d, h, bar = W - 0.06, D - 0.06, 0.024, 0.012
    box(black, 0, -d / 2, 0, w, bar, h)
    box(black, 0, d / 2, 0, w, bar, h)
    box(black, -w / 2, 0, 0, bar, d, h)
    box(black, w / 2, 0, 0, bar, d, h)
    for i in range(1, 11):
        box(black, -w / 2 + i * w / 11, 0, 0, 0.005, d - 0.01, h * 0.75)
    for i in range(1, 7):
        box(black, 0, -d / 2 + i * d / 7, 0, w - 0.01, 0.005, h * 0.75)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(black, sx * w / 2, sy * d / 2, 0, 0.022, 0.022, 0.027)
    g.build()


def build_inner_frame(g):
    w, d, h, r, wall, floor = W - 0.036, D - 0.036, 0.072, 0.035, 0.012, 0.006
    tray = new_bm()
    plate(tray, w, d, h, r)
    cavity = new_bm()
    plate(cavity, w - 2 * wall, d - 2 * wall, 0.2, r - wall, z0=floor)
    # Cable slot in the floor and a vent slot in the front wall.
    slot = new_bm()
    plate(slot, 0.24, 0.05, 0.03, 0.008, z0=-0.01, offset=(0, -0.075))
    vent = new_bm()
    prism(vent, [(x, y + 0.036) for x, y in rr_points(0.24, 0.026, 0.008)], 0.05, z0=0.13)
    bmesh.ops.rotate(vent, verts=vent.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, 'X'))
    g.solid('tray', 'frame', tray, 0.0025, cutters=[cavity, slot, vent])
    bosses = g.bm('frame', 0.0008)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder(bosses, sx * 0.165, sy * 0.11, floor, 0.007, 0.012, seg=24, r_top=0.006)
            cylinder(g.bm('metal', 0.0003), sx * 0.165, sy * 0.11, floor + 0.012, 0.0025, 0.0012, seg=16)
    g.build()


CIRCUIT_CHIPS = [(0.015, 0.06, 0.042, 0.042, 0.005), (0.085, 0.065, 0.03, 0.03, 0.004), (0.135, 0.045, 0.022, 0.035, 0.004),
                 (0.055, 0.005, 0.026, 0.026, 0.004), (-0.02, 0.005, 0.034, 0.02, 0.004)]
CIRCUIT_CONNECTORS = [(0.155, 0.0, 0.028, 0.042, 0.016), (-0.155, 0.085, 0.03, 0.03, 0.014), (0.11, 0.105, 0.06, 0.012, 0.01)]
ESP32 = (-0.095, 0.05)


def build_circuit(g):
    w, d, top = 0.37, 0.25, 0.0025
    plate(g.bm('pcb', 0.0006), w, d, top, 0.008)

    chip = g.bm('chip', 0.0005)
    for x, y, cw, cd, ch in CIRCUIT_CHIPS:
        box(chip, x, y, top, cw, cd, ch)
    # ESP32-S3 module: its own small board, a metal shield, and the antenna end sticking out at the back.
    mx, my = ESP32
    box(g.bm('camPcb', 0.0004), mx, my + 0.008, top, 0.05, 0.072, 0.0012)
    box(g.bm('shield', 0.0006), mx, my, top + 0.0012, 0.045, 0.05, 0.0045)
    connector = g.bm('connector', 0.0008)
    for x, y, cw, cd, ch in CIRCUIT_CONNECTORS:
        box(connector, x, y, top, cw, cd, ch)

    # Battery pack: three cells in a black holder along the front edge.
    holder = g.bm('holder', 0.001)
    box(holder, -0.005, -0.078, top, 0.25, 0.032, 0.008)
    battery, metal = g.bm('battery', 0.0015), g.bm('metal', 0.0004)
    for i in range(3):
        x = -0.09 + i * 0.085
        cylinder(battery, x, -0.078, top + 0.013, 0.0115, 0.068, seg=40, axis='X')
        for side in (-1, 1):
            cylinder(metal, x + side * 0.0348, -0.078, top + 0.013, 0.009, 0.0016, seg=32, axis='X')

    # Header pins on a black plastic strip, and small surface-mount parts.
    pins, strip = g.bm('gold', 0.0), g.bm('holder', 0.0004)
    box(strip, -0.16 + 15 * 0.0035, -0.1095, top, 16 * 0.007 + 0.004, 0.012, 0.0025)
    for i in range(16):
        for y in (-0.113, -0.106):
            box(pins, -0.16 + i * 0.007, y, top, 0.0022, 0.0022, 0.011)
    rand = random.Random(7)
    smd = g.bm('chip', 0.0)
    placed = 0
    while placed < 70:
        x, y = rand.uniform(-0.17, 0.17), rand.uniform(-0.055, 0.11)
        near_chip = any(abs(x - cx) < cw / 2 + 0.006 and abs(y - cy) < cd / 2 + 0.006 for cx, cy, cw, cd, _ in CIRCUIT_CHIPS + CIRCUIT_CONNECTORS)
        near_module = abs(x - mx) < 0.035 and abs(y - my) < 0.045
        if near_chip or near_module:
            continue
        long = rand.random() > 0.5
        box(smd, x, y, top, 0.007 if long else 0.0035, 0.0035 if long else 0.007, 0.0022)
        placed += 1
    caps = g.bm('metal', 0.0003)
    for x, y in ((0.12, -0.03), (0.135, -0.03), (-0.04, 0.09), (0.03, 0.105)):
        cylinder(caps, x, y, top, 0.0035, 0.007, seg=24)

    footprints = [(x, y, cw, cd) for x, y, cw, cd, _ in CIRCUIT_CHIPS + CIRCUIT_CONNECTORS]
    footprints.append((mx, my + 0.008, 0.05, 0.072))
    uv_plane(g.bm('pcbTop', 0.0), w - 0.002, d - 0.002, top + 0.0002)
    g.build()
    return footprints


def build_insulation(g):
    w, d = W - 0.04, D - 0.04
    ring(g.bm('insulation', 0.0015), w, d, 0.032, 0.012, 0.009)
    plate(g.bm('insulation', 0.0015), w - 0.02, d - 0.02, 0.0045, 0.024)
    uv_plane(g.bm('insulationTop', 0.0), w - 0.022, d - 0.022, 0.0047)
    g.build()


def build_camera_module(g, kind):
    plate(g.bm('camPcb', 0.0005), 0.062, 0.062, 0.004, 0.005)
    screws = g.bm('metal', 0.0002)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cylinder(screws, sx * 0.025, sy * 0.025, 0.004, 0.0022, 0.001, seg=16)
    if kind == 'mlxCamera':
        # Thermal sensor: a metal can with a dark window on top.
        cylinder(g.bm('shield', 0.0008), 0, 0, 0.004, 0.015, 0.016, seg=48)
        cylinder(g.bm('lensMlx', 0.0004), 0, 0, 0.02, 0.009, 0.0012, seg=48)
        box(g.bm('ledRed', 0.0005), 0.024, 0.022, 0.004, 0.006, 0.006, 0.003)
    else:
        # Colour camera: a lens holder with a round lens.
        box(g.bm('chip', 0.001), 0, 0, 0.004, 0.03, 0.03, 0.012)
        cylinder(g.bm('chip', 0.001), 0, 0, 0.016, 0.012, 0.01, seg=48, r_top=0.011)
        cylinder(g.bm('lens', 0.0004), 0, 0, 0.026, 0.0075, 0.0012, seg=48)
        box(g.bm('ledBlue', 0.0005), -0.024, 0.022, 0.004, 0.006, 0.006, 0.003)
    g.build()


def build_cameras(g, collection):
    w, d = W - 0.04, D - 0.07
    ring(g.bm('tray', 0.0015), w, d, 0.022, 0.014, 0.022)
    plate(g.bm('plate', 0.001), w - 0.02, d - 0.02, 0.003, 0.015)
    box(g.bm('tray', 0.0015), 0, 0, 0.003, w - 0.03, 0.07, 0.006)
    g.build()
    for kind, x in (('esp32Camera', -0.085), ('mlxCamera', 0.085)):
        part = Group(kind, collection, g.materials, parent=g.empty, location=(x, 0, 0.009))
        build_camera_module(part, kind)


def build_top_glass(g):
    ring(g.bm('glassRim', 0.002), W, D, 0.045, 0.007, 0.013)
    plate(g.bm('glass', 0.002), W - 0.012, D - 0.012, 0.01, 0.04, z0=0.0015)
    uv_plane(g.bm('footOutline', 0.0), 0.42, 0.315, 0.0118)
    g.build()


# ---------------------------------------------------------------- scene

def build_station(out_dir):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    station = bpy.data.collections.new('Station')
    scene.collection.children.link(station)

    tex = Textures(os.path.join(out_dir, 'textures'))
    pcb_footprints = [(x, y, cw, cd) for x, y, cw, cd, _ in CIRCUIT_CHIPS + CIRCUIT_CONNECTORS] + [(ESP32[0], ESP32[1] + 0.008, 0.05, 0.072)]
    images = {
        'insulation.png': tex.save('insulation.png', insulation_texture(W - 0.062, D - 0.062)),
        'feet.png': tex.save('feet.png', feet_texture(0.42, 0.315)),
        'pcb.png': tex.save('pcb.png', pcb_texture(0.368, 0.248, pcb_footprints)),
    }

    builders = {
        'outerShell': build_outer_shell, 'pressureSensors': build_pressure_sensors, 'supports': build_supports,
        'innerFrame': build_inner_frame, 'circuit': build_circuit, 'insulation': build_insulation,
        'topGlass': build_top_glass,
    }
    for layer in LAYERS:
        g = Group(layer, station, LayerMaterials(layer, images), location=(0, 0, ASSEMBLED_Z[layer]))
        if layer == 'cameras':
            build_cameras(g, station)
        else:
            builders[layer](g)
    return station


def report(station):
    total = 0
    for layer in LAYERS:
        empty = bpy.data.objects[layer]
        tris = 0
        for obj in empty.children_recursive:
            if obj.type == 'MESH':
                tris += sum(len(p.vertices) - 2 for p in obj.data.polygons)
        total += tris
        parts = [c.name for c in empty.children if c.type == 'EMPTY']
        print(f'  {layer:16s} {tris:7d} tris' + (f'  parts: {", ".join(parts)}' if parts else ''))
    print(f'  {"total":16s} {total:7d} tris')


# ---------------------------------------------------------------- baked ambient occlusion

AO_SIZE = 1024
# How far Cycles looks for nearby surfaces. A few centimetres gives contact shading without darkening whole parts.
AO_DISTANCE = 0.03
AO_SAMPLES = 64


def use_gpu(scene):
    scene.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for device in prefs.devices:
            device.use = True
        scene.cycles.device = 'GPU'
    except (TypeError, AttributeError):
        scene.cycles.device = 'CPU'


def gltf_output_group():
    """The node group the glTF exporter reads the occlusion map from."""
    name = 'glTF Material Output'
    group = bpy.data.node_groups.get(name)
    if group is None:
        group = bpy.data.node_groups.new(name, 'ShaderNodeTree')
        group.interface.new_socket(name='Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
        group.nodes.new('NodeGroupInput')
    return group


def add_ao_nodes(material, image):
    """Points a material's occlusion at the layer's AO image, and makes that image the bake target."""
    nodes, links = material.node_tree.nodes, material.node_tree.links
    uv = nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'AO'
    tex = nodes.new('ShaderNodeTexImage')
    tex.image = image
    links.new(uv.outputs['UV'], tex.inputs['Vector'])
    split = nodes.new('ShaderNodeSeparateColor')
    links.new(tex.outputs['Color'], split.inputs['Color'])
    output = nodes.new('ShaderNodeGroup')
    output.node_tree = gltf_output_group()
    links.new(split.outputs['Red'], output.inputs['Occlusion'])
    nodes.active = tex


def is_blended(obj):
    material = obj.active_material
    return material is not None and getattr(material, 'surface_render_method', '') == 'BLENDED'


def select_only(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]


def unwrap_for_ao(objects):
    """A second UV map, 'AO', that packs every part of the layer into one texture without overlaps."""
    for obj in objects:
        uv = obj.data.uv_layers.get('AO') or obj.data.uv_layers.new(name='AO')
        obj.data.uv_layers.active = uv
    select_only(objects)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
    bpy.ops.object.mode_set(mode='OBJECT')


def bake_ambient_occlusion(station, out_dir):
    """Bakes each layer on its own, so the shading stays right when the website pulls the layers apart."""
    scene = bpy.context.scene
    use_gpu(scene)
    scene.cycles.samples = AO_SAMPLES
    scene.render.bake.margin = 8
    if scene.world is None:
        scene.world = bpy.data.worlds.new('Bake')
    scene.world.light_settings.distance = AO_DISTANCE

    folder = os.path.join(out_dir, 'textures')
    for layer in LAYERS:
        meshes = [o for o in bpy.data.objects[layer].children_recursive if o.type == 'MESH']
        targets = [o for o in meshes if not is_blended(o)]
        # White where no part lands, so texels bleeding past a UV edge can only lighten, never darken.
        image = bpy.data.images.new(f'{layer}-ao', AO_SIZE, AO_SIZE, alpha=False)
        image.generated_color = (1.0, 1.0, 1.0, 1.0)
        image.colorspace_settings.name = 'Non-Color'
        for material in {slot.material for o in targets for slot in o.material_slots if slot.material}:
            add_ao_nodes(material, image)

        others = [o for o in station.all_objects if o.type == 'MESH' and o not in meshes]
        for obj in others:
            obj.hide_render = True
        unwrap_for_ao(targets)
        select_only(targets)
        bpy.ops.object.bake(type='AO', use_clear=False)
        for obj in others:
            obj.hide_render = False

        image.filepath_raw = os.path.join(folder, f'{layer}-ao.png')
        image.file_format = 'PNG'
        image.save()
        print(f'  baked {layer} ambient occlusion')


def set_explode(amount):
    for layer in LAYERS:
        z0, z1 = ASSEMBLED_Z[layer], EXPLODED_Z[layer]
        bpy.data.objects[layer].location.z = z0 + (z1 - z0) * amount


def setup_studio(samples):
    scene = bpy.context.scene
    studio = bpy.data.collections.new('Studio')
    scene.collection.children.link(studio)

    use_gpu(scene)
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = 'AgX'
    for look in ('AgX - Medium High Contrast', 'Medium High Contrast'):
        try:
            scene.view_settings.look = look
            break
        except TypeError:
            continue
    scene.view_settings.exposure = -0.4
    scene.render.film_transparent = False

    world = bpy.data.worlds.new('Studio')
    scene.world = world
    if bpy.app.version < (5, 0, 0):
        world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    nodes.clear()
    env = nodes.new('ShaderNodeTexEnvironment')
    hdri = os.path.join(os.path.dirname(bpy.app.binary_path), '..', 'Resources',
                        f'{bpy.app.version[0]}.{bpy.app.version[1]}', 'datafiles', 'studiolights', 'world', 'studio.exr')
    env.image = bpy.data.images.load(os.path.normpath(hdri))
    background = nodes.new('ShaderNodeBackground')
    background.inputs['Strength'].default_value = 0.35
    output = nodes.new('ShaderNodeOutputWorld')
    links.new(env.outputs['Color'], background.inputs['Color'])
    links.new(background.outputs['Background'], output.inputs['Surface'])

    floor_bm = bmesh.new()
    bmesh.ops.create_grid(floor_bm, x_segments=1, y_segments=1, size=80)
    floor = mesh_object('floor', floor_bm, studio)
    floor.location.z = -0.0085
    floor.data.materials.append(new_material('floor', dict(color=0xa9bfc1, rough=0.8), {}))

    def area(name, loc, energy, size, color=(1, 1, 1)):
        light = bpy.data.lights.new(name, 'AREA')
        light.energy, light.size, light.color = energy, size, color
        obj = link(bpy.data.objects.new(name, light), studio)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 0.1)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()

    area('key', (-0.9, -1.0, 1.3), 120, 1.2)
    area('fill', (1.1, -0.6, 0.6), 30, 1.0, (0.92, 0.97, 1.0))
    area('rim', (0.4, 1.2, 1.0), 90, 0.8)

    cam_data = bpy.data.cameras.new('camera')
    camera = link(bpy.data.objects.new('camera', cam_data), studio)
    scene.camera = camera
    return camera


def render(path, camera, location, target, size, lens=50, hidden=()):
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = size
    camera.data.lens = lens
    camera.location = location
    camera.rotation_euler = (Vector(target) - Vector(location)).to_track_quat('-Z', 'Y').to_euler()
    hidden_objects = [o for layer in hidden for o in [bpy.data.objects[layer], *bpy.data.objects[layer].children_recursive]]
    for obj in hidden_objects:
        obj.hide_render = True
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for obj in hidden_objects:
        obj.hide_render = False
    print(f'  rendered {path}')


def export_glb(path, station):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in station.all_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_cameras=False, export_lights=False)
    print(f'  exported {path} ({os.path.getsize(path) / 1e6:.2f} MB)')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', required=True)
    parser.add_argument('--render', action='store_true')
    parser.add_argument('--export', action='store_true')
    parser.add_argument('--samples', type=int, default=128)
    args = parser.parse_args(argv)
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)

    station = build_station(out)
    print('Station built:')
    report(station)

    if args.export:
        bake_ambient_occlusion(station, out)
        export_glb(os.path.join(out, 'station-raw.glb'), station)

    if args.render:
        camera = setup_studio(args.samples)
        set_explode(0)
        render(os.path.join(out, 'preview-assembled.png'), camera, (-0.42, -0.8, 0.5), (0, 0, 0.055), (1600, 1000))
        render(os.path.join(out, 'preview-cameras.png'), camera, (-0.2, -0.34, 0.36), (0, 0.0, 0.11), (1600, 1000),
               hidden=['topGlass'])
        set_explode(1)
        render(os.path.join(out, 'preview-exploded.png'), camera, (-0.9, -1.45, 1.35), (0, 0, 0.34), (1200, 1500))
        set_explode(0)

    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'station.blend'))
    print(f'  saved {os.path.join(out, "station.blend")}')


if __name__ == '__main__':
    main()
