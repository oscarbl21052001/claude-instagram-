"""Librería general para construir una unidad (apartamento) en Blender sin interfaz.

Contiene materiales, primitivas, muros con huecos, mobiliario básico, cielo y luces.
Los datos de cada unidad (muros, ambientes, mobiliario, ruta de cámara) viven en specs/<id>.py.
Requiere bpy (pip install bpy==4.5.14, Python 3.11).
"""
import bpy, math, bmesh, sys, time
from mathutils import Vector, Euler
K = 1/56.5; X0, Y0 = 16, 559; H = 2.70
mx = lambda p: (p - X0) * K
my = lambda p: (Y0 - p) * K
bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

# ---------- materiales ----------
def pbsdf(m): return m.node_tree.nodes["Principled BSDF"]
def newmat(name, color, rough=0.6, metal=0.0, spec=0.5, emit=None, emit_s=0.0, trans=0.0, ior=1.45):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = pbsdf(m)
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    for k, v in (("Specular IOR Level", spec), ("Transmission Weight", trans), ("IOR", ior)):
        if k in b.inputs: b.inputs[k].default_value = v
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = emit_s
    return m

def procedural(name, tone_a, tone_b, scale=(1,1,1), noise=8.0, rough=0.5, detail=5.0, bump=0.15, coord="Object"):
    m = newmat(name, tone_a, rough); nt = m.node_tree; b = pbsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = scale
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = noise; nz.inputs["Detail"].default_value = detail
    cr = nt.nodes.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (*tone_a, 1); cr.color_ramp.elements[1].color = (*tone_b, 1)
    nt.links.new(tc.outputs[coord], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = bump
    nt.links.new(nz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], b.inputs["Normal"])
    return m

def tiles(name, c1, c2, w, h, mortar=0.006, rough=0.3, mc=(0.15,0.15,0.15)):
    m = newmat(name, c1, rough); nt = m.node_tree; b = pbsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Color1"].default_value = (*c1, 1); br.inputs["Color2"].default_value = (*c2, 1); br.inputs["Mortar"].default_value = (*mc, 1)
    br.inputs["Scale"].default_value = 1.0; br.inputs["Mortar Size"].default_value = mortar; br.inputs["Brick Width"].default_value = w; br.inputs["Row Height"].default_value = h
    br.offset = 0.5 if w != h else 0.0; br.offset_frequency = 2
    nt.links.new(tc.outputs["Object"], br.inputs["Vector"]); nt.links.new(br.outputs["Color"], b.inputs["Base Color"]); return m

def marble(name):
    m = newmat(name, (0.93, 0.92, 0.9), 0.15); nt = m.node_tree; b = pbsdf(m)
    tc = nt.nodes.new("ShaderNodeTexCoord"); nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 10
    wv = nt.nodes.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 2.5; wv.inputs["Distortion"].default_value = 12.0
    cr = nt.nodes.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.45; cr.color_ramp.elements[0].color = (0.45, 0.45, 0.47, 1); cr.color_ramp.elements[1].position = 0.6; cr.color_ramp.elements[1].color = (0.95, 0.94, 0.92, 1)
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], wv.inputs["Phase Offset"]) if False else None
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"]); nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"]); nt.links.new(cr.outputs["Color"], b.inputs["Base Color"]); return m

M = {}
M["pared"] = newmat("Pared", (0.86, 0.85, 0.82), 0.9)
M["techo"] = newmat("Techo", (0.96, 0.95, 0.93), 0.9)
M["ext"] = newmat("Exterior", (0.85, 0.83, 0.79), 0.9)
M["madera"] = procedural("Chapa madera", (0.38, 0.20, 0.09), (0.62, 0.38, 0.18), scale=(90, 90, 1.5), noise=9, detail=8, rough=0.38, bump=0.12)
M["lamas"] = procedural("Celosía", (0.55, 0.33, 0.16), (0.72, 0.47, 0.25), scale=(4, 4, 4), noise=9, rough=0.4, bump=0.05)
M["roble"] = tiles("Roble claro", (0.72, 0.55, 0.37), (0.80, 0.63, 0.44), 1.2, 0.18, mortar=0.003, rough=0.45, mc=(0.35, 0.25, 0.15))
M["porcelanato"] = tiles("Porcelanato", (0.58, 0.56, 0.53), (0.63, 0.61, 0.57), 0.9, 0.9, mortar=0.004, rough=0.2, mc=(0.55, 0.54, 0.52))
M["mosaico"] = tiles("Mosaico negro", (0.015, 0.016, 0.02), (0.03, 0.03, 0.035), 0.05, 0.05, mortar=0.12, rough=0.15, mc=(0.01, 0.01, 0.012))
M["bano"] = tiles("Azulejo bano", (0.78, 0.8, 0.8), (0.85, 0.86, 0.86), 0.6, 0.3, mortar=0.01, rough=0.2, mc=(0.6, 0.6, 0.6))
M["balcon"] = tiles("Piso balcon", (0.45, 0.46, 0.47), (0.5, 0.51, 0.52), 0.6, 0.6, mortar=0.008, rough=0.5, mc=(0.3, 0.3, 0.3))
M["marmol"] = marble("Marmol")
M["blanco"] = newmat("Laca blanca", (0.9, 0.9, 0.88), 0.35)
M["negro"] = newmat("Negro", (0.025, 0.025, 0.028), 0.35, metal=0.3)
M["nevera"] = newmat("Nevera", (0.06, 0.065, 0.07), 0.25, metal=0.6)
M["boucle"] = procedural("Boucle", (0.78, 0.74, 0.68), (0.86, 0.82, 0.76), scale=(40, 40, 40), noise=40, rough=1.0, bump=0.4)
M["gris_verde"] = procedural("Sofa", (0.36, 0.42, 0.37), (0.46, 0.52, 0.46), scale=(60, 60, 60), noise=60, rough=1.0, bump=0.5)
M["cabecero"] = newmat("Cabecero", (0.65, 0.6, 0.55), 0.95)
M["mimbre"] = procedural("Mimbre", (0.62, 0.50, 0.32), (0.78, 0.66, 0.44), scale=(50, 50, 50), noise=30, rough=0.7, bump=0.6)
M["lampara"] = newmat("Lampara", (0.92, 0.85, 0.72), 0.9, emit=(1.0, 0.72, 0.4), emit_s=2.2)
M["cortina"] = newmat("Cortina", (0.9, 0.86, 0.78), 0.95, trans=0.0)
M["cortina_g"] = newmat("CortinaGris", (0.38, 0.35, 0.33), 0.95)
M["alfombra"] = procedural("Alfombra", (0.72, 0.70, 0.66), (0.86, 0.84, 0.80), scale=(25, 25, 25), noise=14, rough=1.0, bump=0.2)
M["planta"] = newmat("Hoja", (0.10, 0.28, 0.08), 0.6); M["maceta"] = newmat("Maceta", (0.4, 0.35, 0.3), 0.9)
M["cuadro"] = newmat("Cuadro", (0.93, 0.92, 0.9), 0.95); M["marco"] = newmat("Marco", (0.07, 0.07, 0.07), 0.5)
M["led"] = newmat("LED", (1, 0.85, 0.6), 0.5, emit=(1.0, 0.72, 0.42), emit_s=6.0)
M["led_f"] = newmat("LEDfrio", (1, 0.9, 0.8), 0.5, emit=(1.0, 0.88, 0.7), emit_s=10.0)
M["agua"] = newmat("Mar", (0.04, 0.32, 0.48), 0.12, metal=0.0)
M["arena"] = newmat("Arena", (0.82, 0.72, 0.55), 0.9); M["cesped"] = newmat("Cesped", (0.2, 0.45, 0.14), 0.95)
M["monte"] = newmat("Monte", (0.20, 0.30, 0.22), 0.95); M["edif"] = newmat("Edificio", (0.88, 0.86, 0.82), 0.9)
g = newmat("Vidrio", (0.9, 0.95, 0.97), 0.0, trans=1.0, ior=1.45); M["vidrio"] = g
M["marco_v"] = newmat("MarcoVentana", (0.03, 0.03, 0.035), 0.4, metal=0.5)

# ---------- primitivas ----------
def _fin(o, m):
    o.data.materials.append(M[m]); return o
def box(name, x0, y0, z0, x1, y1, z1, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=((x0+x1)/2, (y0+y1)/2, (z0+z1)/2)); o = bpy.context.active_object; o.name = name
    o.scale = (abs(x1-x0)/2, abs(y1-y0)/2, abs(z1-z0)/2); bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bv = o.modifiers.new("b", 'BEVEL'); bv.width = bevel; bv.segments = 3
    return _fin(o, m)
def pb(name, px0, py0, px1, py1, z0, z1, m, bevel=0.0):
    return box(name, mx(min(px0,px1)), my(max(py0,py1)), z0, mx(max(px0,px1)), my(min(py0,py1)), z1, m, bevel)
def cyl(name, x, y, z0, z1, r, m, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=z1-z0, location=(x, y, (z0+z1)/2)); o = bpy.context.active_object; o.name = name; return _fin(o, m)
def sph(name, x, y, z, rx, ry, rz, m, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=16, location=(x, y, z)); o = bpy.context.active_object; o.name = name
    o.scale = (rx, ry, rz); bpy.ops.object.transform_apply(scale=True); return _fin(o, m)
def soft(o, lv=2):
    s = o.modifiers.new("s", 'SUBSURF'); s.levels = lv; s.render_levels = lv
    for p in o.data.polygons: p.use_smooth = True
    return o
cnt = [0]
def wall(p0, p1, th, ops=(), mm="pared", name="w", glass=False):
    (xa, ya), (xb, yb) = p0, p1; horiz = abs(ya - yb) < 1
    a, b = (min(xa, xb), max(xa, xb)) if horiz else (min(ya, yb), max(ya, yb)); t = th / K / 2
    pieces, cur = [], a
    for (o0, o1, zb, zt) in sorted(ops):
        if o0 > cur: pieces.append((cur, o0, 0, H))
        if zb > 0: pieces.append((o0, o1, 0, zb))
        if zt < H: pieces.append((o0, o1, zt, H))
        cur = o1
    if cur < b: pieces.append((cur, b, 0, H))
    for (s0, s1, z0, z1) in pieces:
        cnt[0] += 1
        if horiz: pb(f"{name}{cnt[0]}", s0, ya-t, s1, ya+t, z0, z1, mm)
        else:     pb(f"{name}{cnt[0]}", xa-t, s0, xa+t, s1, z0, z1, mm)
    for (o0, o1, zb, zt) in ops:
        if zt - zb > 0.5 and (zb > 0 or zt >= 2.3):         # ventana o cristal: vidrio + marco negro
            if horiz:
                pb(f"vid{cnt[0]}", o0, ya-0.5, o1, ya+0.5, zb, zt, "vidrio")
                for xx in (o0, o1): pb("mar", xx-1.5, ya-3, xx+1.5, ya+3, zb, zt, "marco_v")
                pb("marT", o0, ya-3, o1, ya+3, zt-0.04, zt, "marco_v"); pb("marB", o0, ya-3, o1, ya+3, zb, zb+0.04, "marco_v")
            else:
                pb(f"vid{cnt[0]}", xa-0.5, o0, xa+0.5, o1, zb, zt, "vidrio")

DOOR = lambda a, b: (a, b, 0, 2.10)
EXT, INT = 0.20, 0.12

def configure(px_per_m, origin, height):
    """Escala del plano (píxeles por metro), esquina inferior izquierda del apartamento en píxeles y altura de techo."""
    global K, X0, Y0, H
    K = 1 / px_per_m
    X0, Y0 = origin
    H = height

def sofa(x0, y0, x1, y1, m):               # sofá modular con asiento, respaldo y brazo redondeados
    px = lambda p: mx(p); py = lambda p: my(p)
    L = box("sofa_base", px(x0), py(y1), 0.08, px(x1), py(y0), 0.42, m, bevel=0.06); soft(L, 1)
    box("sofa_resp", px(x1)-0.28, py(y1), 0.38, px(x1), py(y0), 0.9, m, bevel=0.1)
    box("sofa_brazo1", px(x0), py(y0)-0.2, 0.38, px(x1), py(y0), 0.65, m, bevel=0.08); box("sofa_brazo2", px(x0), py(y1), 0.38, px(x1), py(y1)+0.2, 0.65, m, bevel=0.08)
    for i in range(3):
        yy = py(y1) + 0.2 + i * (py(y0) - py(y1) - 0.4) / 3
        c = box(f"cojin{i}", px(x1)-0.62, yy+0.02, 0.45, px(x1)-0.3, yy+(py(y0)-py(y1)-0.4)/3-0.02, 0.8, m, bevel=0.07)
def silla(x, y, rot):
    o = box("silla_asiento", x-0.22, y-0.22, 0.42, x+0.22, y+0.22, 0.5, "boucle", bevel=0.05)
    r = box("silla_resp", x-0.22, y-0.22 if rot == 0 else y+0.2, 0.5, x+0.22, y-0.2 if rot == 0 else y+0.24, 0.9, "boucle", bevel=0.07)
    for dx in (-0.19, 0.19):
        for dy in (-0.19, 0.19): cyl("pata", x+dx, y+dy, 0, 0.42, 0.012, "negro", 8)
def pendant(x, y, z, r):
    cyl("cable", x, y, z+0.35, H, 0.004, "negro", 6); s = sph("lampara", x, y, z, r, r, r*0.55, "lampara"); 
    bpy.ops.object.light_add(type='POINT', location=(x, y, z-0.05)); l = bpy.context.active_object; l.data.energy = 35; l.data.color = (1.0, 0.78, 0.55); l.data.shadow_soft_size = 0.2
def planta(x, y, h):
    cyl("maceta", x, y, 0, 0.35, 0.17, "maceta", 16)
    for i in range(9):
        a = i * 0.7; s = sph("hoja", x + math.cos(a)*0.12, y + math.sin(a)*0.12, 0.35 + h*(0.4+0.07*i), 0.05, 0.015, 0.26, "planta", 10)
        s.rotation_euler = (math.radians(35)*math.sin(a), math.radians(35)*math.cos(a), a)
def cuadro(x, y, z, w, h, axis):
    if axis == 'x': box("marco", x-0.02, y-w/2, z, x+0.02, y+w/2, z+h, "marco"); box("lienzo", x-0.015, y-w/2+0.03, z+0.03, x+0.025, y+w/2-0.03, z+h-0.03, "cuadro")
    else: box("marco", x-w/2, y-0.02, z, x+w/2, y+0.02, z+h, "marco"); box("lienzo", x-w/2+0.03, y-0.015, z+0.03, x+w/2-0.03, y+0.025, z+h-0.03, "cuadro")
def cortina(x0, x1, y, zt, mat, folds=14, amp=0.05):
    bm = bmesh.new(); nx, nz = folds*6, 8
    for i in range(nx+1):
        for j in range(nz+1):
            u = i / nx; x = x0 + (x1-x0)*u; yy = y + amp*math.sin(u*folds*2*math.pi); bm.verts.new((x, yy, zt*(1-j/nz)))
    bm.verts.ensure_lookup_table()
    for i in range(nx):
        for j in range(nz): bm.faces.new((bm.verts[i*(nz+1)+j], bm.verts[(i+1)*(nz+1)+j], bm.verts[(i+1)*(nz+1)+j+1], bm.verts[i*(nz+1)+j+1]))
    me = bpy.data.meshes.new("cortina"); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new("cortina", me); S.collection.objects.link(o)
    sd = o.modifiers.new("sol", 'SOLIDIFY'); sd.thickness = 0.01; o.data.materials.append(M[mat])

def build_exterior():
    # fondo visible por los ventanales: césped, calle/arena, mar, monte y edificios vecinos
    box("jardin", -40, -48, -11.4, 45, -4, -11, "cesped"); box("arena", -40, -62, -11.45, 45, -48, -11, "arena")
    box("oceano", -260, -420, -11.5, 260, -62, -11.3, "agua"); box("oceano2", -260, -1400, -11.5, 260, -420, -11.3, "agua")
    sph("monte", -150, -430, -11.3, 160, 90, 38, "monte", 40)
    for i, (x, y, w, h) in enumerate([(-26, -18, 9, 7), (-16, -26, 7, 10), (24, -20, 8, 6), (34, -34, 9, 9), (-34, -30, 8, 8)]):
        box("vecino", x, y, -11, x+w, y+8, -11+h, "edif")

def build_sky():
    # cielo + sol que entra por los ventanales
    w = bpy.data.worlds.new("cielo"); S.world = w; w.use_nodes = True; nt = w.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    sky = nt.nodes.new("ShaderNodeTexSky"); sky.sky_type = 'NISHITA'
    sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(200); sky.sun_disc = False; sky.altitude = 12.0; sky.air_density = 1.0; sky.dust_density = 1.2
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 0.8; out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    d = Vector((0.45, -0.75, 0.55)).normalized()
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 20)); sun = bpy.context.active_object; sun.data.energy = 4.5; sun.data.angle = math.radians(1.2); sun.data.color = (1.0, 0.93, 0.82)
    sun.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()

def add_area_lights(lights):
    """Apoyo interior: áreas suaves en el techo de cada estancia. lights = [(px, py, energía)]."""
    for (px, py, e) in lights:
        bpy.ops.object.light_add(type='AREA', location=(mx(px), my(py), H-0.05)); l = bpy.context.active_object
        l.data.shape = 'RECTANGLE'; l.data.size = 1.6; l.data.size_y = 1.0; l.data.energy = e; l.data.color = (1.0, 0.86, 0.7)
