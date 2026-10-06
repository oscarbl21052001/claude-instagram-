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
def build_shell():
    # envolvente y particiones (igual que el modelo verificado sobre el plano)
    wall((125,136),(500,136),EXT,mm="ext"); wall((500,30),(500,136),EXT,mm="ext")
    wall((500,30),(578,30),EXT,mm="ext"); wall((500,136),(578,136),EXT,mm="ext")
    wall((578,12),(578,92),INT); wall((578,12),(668,12),EXT,[DOOR(612,662)],mm="ext")
    wall((668,12),(668,556),EXT,mm="ext"); wall((125,136),(125,154),EXT,mm="ext"); wall((16,154),(125,154),EXT,mm="ext")
    wall((16,154),(16,559),EXT,mm="ext")
    wall((16,559),(380,559),EXT,[(62,160,0.0,2.45),(232,340,0.0,2.45)],mm="ext")   # ventanales piso-techo (como en el catálogo)
    wall((127,154),(127,289),INT); wall((16,287),(127,287),INT,[DOOR(78,122)])
    wall((194,207),(194,559),INT,[DOOR(318,362)]); wall((194,207),(280,207),INT); wall((280,207),(280,366),INT); wall((194,366),(285,366),INT,[DOOR(205,250)])
    wall((285,366),(378,366),INT,[DOOR(300,345)]); wall((378,207),(378,559),0.15)
    wall((380,462),(430,462),INT); wall((620,462),(668,462),INT); wall((430,462),(620,462),0.05,[(430,620,0.0,2.45)],mm="ext")
    wall((380,556),(668,556),0.05,[(380,668,1.10,2.45)],mm="ext")
    # suelos
    pb("suelo_base", 16, 136, 668, 559, -0.15, 0, "porcelanato"); pb("suelo_hall", 500, 12, 668, 136, -0.15, 0, "porcelanato")
    pb("madera_A", 17, 289, 193, 558, 0, 0.01, "roble"); pb("madera_B", 196, 368, 377, 558, 0, 0.01, "roble")
    pb("bano_A", 17, 155, 126, 286, 0, 0.01, "bano"); pb("bano_B", 195, 208, 279, 365, 0, 0.01, "bano"); pb("bano_L", 501, 31, 577, 135, 0, 0.01, "bano")
    pb("suelo_sacada", 380, 462, 668, 559, -0.15, 0.005, "balcon")
    # techo (con falso techo perimetral) y tira LED
    pb("techo", 16, 12, 668, 559, H, H+0.15, "techo")
    pb("ledlinea1", 130, 142, 376, 148, H-0.03, H, "led"); pb("ledlinea2", 384, 212, 664, 218, H-0.03, H, "led")

def build_walls_decor():
    # --- salón: paneles de madera (chapa) a ambos lados, panel TV exento y cocina blanca
    pb("pan_cocina_fondo", 378, 207, 381, 265, 0, H, "madera"); pb("pan_este", 664, 140, 667, 330, 0, H, "madera")
    pb("pan_tv", 477, 300, 503, 462, 0, 2.45, "madera"); pb("pan_tv_negro", 503, 345, 505, 420, 1.0, 1.9, "negro")      # TV
    # cocina (pared oeste del salón, x=378): torre con nevera, bajos blancos, vitrinas altas y salpicadero de mármol
    pb("torre_nevera", 380, 207, 424, 268, 0, H, "madera"); pb("nevera", 382, 211, 421, 264, 0.05, 1.95, "nevera"); pb("nevera_sup", 382, 211, 421, 264, 1.97, 2.55, "blanco")
    pb("bajos", 380, 270, 421, 458, 0, 0.88, "blanco"); pb("encimera", 380, 270, 424, 458, 0.88, 0.92, "marmol")
    pb("salpicadero", 379, 270, 381, 458, 0.92, 1.55, "marmol"); pb("altos", 380, 270, 408, 458, 1.55, H-0.02, "blanco")
    pb("vitrinas", 408, 270, 409, 458, 1.55, 2.5, "led_f") if False else None
    for yy in (270, 316, 362, 408): pb("vitrina", 408, yy+6, 410, yy+40, 1.62, 2.4, "vidrio")
    pb("cooktop", 386, 362, 410, 395, 0.92, 0.93, "negro"); pb("fregadero", 386, 295, 408, 322, 0.91, 0.935, "negro")
    # --- bebida: puerta del hall (madera oscura)
    pb("puerta_entrada", 612, 11, 662, 14, 0, 2.1, "madera")

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

def build_furniture():
    # salón
    sofa(612, 318, 664, 442, "gris_verde")
    box("mesa_centro", mx(552), my(398), 0.0, mx(592), my(348), 0.4, "madera", bevel=0.04)
    pb("alfombra", 515, 308, 650, 452, 0.0, 0.015, "alfombra")
    # comedor ovalado (tablero redondeado) + 6 sillas + pendiente de fibra
    cx, cy = (mx(545)+mx(652))/2, (my(214)+my(278))/2
    t = sph("mesa_tablero", cx, cy, 0.74, 1.05, 0.52, 0.04, "madera", seg=48); cyl("mesa_pie", cx, cy, 0, 0.72, 0.18, "madera", 24)
    for i, dx in enumerate((-0.6, 0.0, 0.6)):
        silla(cx+dx, cy-0.72, 0); silla(cx+dx, cy+0.72, 1)
    pendant(cx, cy, 1.55, 0.36)
    # balcón
    cyl("mesa_balcon", mx(520), my(505), 0, 0.74, 0.04, "marmol", 12); cyl("mesa_balcon_tab", mx(520), my(505), 0.72, 0.76, 0.52, "marmol", 40)
    for ang in (45, 135, 225, 315): silla(mx(520)+0.78*math.cos(math.radians(ang)), my(505)+0.78*math.sin(math.radians(ang)), 0)
    pb("parrilla", 381, 478, 420, 520, 0.0, 1.15, "marmol"); pb("parrilla_h", 381, 485, 396, 512, 0.5, 0.95, "negro")
    # techo de madera de lamas en el balcón
    for i in range(18): pb("lama_balcon", 380, 462 + i*5.4, 668, 462 + i*5.4 + 3.4, H-0.06, H, "madera")
    # paredes de mosaico en el balcón
    pb("mosaico_o", 379, 462, 383, 556, 0, H, "mosaico"); pb("mosaico_e", 664, 462, 668, 556, 0, H, "mosaico")
    # suites: cabeceros / celosía, cama, mesillas, cuadros, cortinas
    for (bx0, by0, bx1, by1, wallx) in ((85, 395, 178, 492, 22), (235, 405, 345, 515, 202)):
        # celosía de madera tras el cabecero (muro oeste de cada suite)
        w0, w1 = my(by1) - 0.7, my(by0) + 0.7
        ox = mx(wallx)
        for k in range(int((w1-w0)/0.085)):
            yy = w0 + k*0.085; box("celosia_v", ox, yy, 0.0, ox+0.035, yy+0.03, 2.55, "lamas")
        for k in range(int(2.55/0.085)):
            zz = k*0.085; box("celosia_h", ox+0.03, w0, zz, ox+0.06, w1, zz+0.03, "lamas")
        # cama de base tapizada con cabecero con canales
        cx0, cx1, cy0, cy1 = mx(bx0), mx(bx1), my(by1), my(by0)
        base = box("cama_base", cx0+0.1, cy0, 0.12, cx1, cy1, 0.42, "boucle", bevel=0.06)
        box("colchon", cx0+0.12, cy0+0.04, 0.42, cx1-0.05, cy1-0.04, 0.62, "blanco", bevel=0.08)
        box("manta", cx0+0.8, cy0+0.03, 0.62, cx1-0.0, cy1-0.03, 0.66, "cortina_g", bevel=0.02)
        for i in range(8): box("canal", cx0, cy0 + (cy1-cy0)*i/8, 0.35, cx0+0.12, cy0 + (cy1-cy0)*(i+1)/8 - 0.01, 1.15, "cabecero", bevel=0.03)
        box("almohada1", cx0+0.14, cy0+0.12, 0.62, cx0+0.48, cy0+(cy1-cy0)/2-0.04, 0.78, "blanco", bevel=0.07)
        box("almohada2", cx0+0.14, cy0+(cy1-cy0)/2+0.04, 0.62, cx0+0.48, cy1-0.12, 0.78, "blanco", bevel=0.07)
        for yy in (cy0-0.5, cy1+0.05): box("mesilla", cx0+0.1, yy, 0.0, cx0+0.45, yy+0.45, 0.5, "blanco", bevel=0.02)
        cuadro(ox+0.07, (cy0+cy1)/2-0.35, 1.2, 0.7, 1.0, 'x'); cuadro(ox+0.07, (cy0+cy1)/2+0.45, 1.2, 0.7, 1.0, 'x')
        bpy.ops.object.light_add(type='POINT', location=(cx0+0.3, cy0-0.3, 1.2)); l = bpy.context.active_object; l.data.energy = 14; l.data.color = (1.0, 0.75, 0.5)
        box("alfombra_dorm", cx0+0.6, cy0-0.4, 0.0, cx1+0.5, cy1+0.4, 0.012, "alfombra")
    # armarios de madera
    pb("armario_A", 20, 290, 125, 318, 0, 2.5, "madera"); pb("armario_B", 358, 410, 377, 520, 0, 2.5, "madera")
    # cortinas: salón (sheer crema), suites (gris)
    for (a, b) in ((432, 468), (584, 618)): cortina(mx(a), mx(b), my(460)-0.12, 2.5, "cortina", 5, 0.05)
    for (a, b) in ((62, 84), (138, 160), (232, 254), (318, 340)): cortina(mx(a), mx(b), my(559)+0.14, 2.5, "cortina_g", 3, 0.05)
    planta(mx(640), my(150), 0.9); planta(mx(70), my(530), 1.0)
    # baños (sanitarios básicos)
    box("inodoro_A", mx(100), my(262), 0.0, mx(118), my(238), 0.4, "blanco", bevel=0.04); box("lavabo_A", mx(35), my(205), 0.8, mx(75), my(175), 0.9, "blanco", bevel=0.03)
    box("inodoro_B", mx(255), my(345), 0.0, mx(273), my(320), 0.4, "blanco", bevel=0.04); box("lavabo_B", mx(210), my(235), 0.8, mx(250), my(210), 0.9, "blanco", bevel=0.03)
    box("inodoro_L", mx(520), my(122), 0.0, mx(538), my(98), 0.4, "blanco", bevel=0.04)

def build_exterior():
    # fondo visible por los ventanales: césped, calle/arena, mar, monte y edificios vecinos
    box("jardin", -40, -48, -11.4, 45, -4, -11, "cesped"); box("arena", -40, -62, -11.45, 45, -48, -11, "arena")
    box("mar", -260, -420, -11.5, 260, -62, -11.3, "agua"); box("mar2", -260, -1400, -11.5, 260, -420, -11.3, "agua")
    sph("monte", -150, -430, -11.3, 160, 90, 38, "monte", 40)
    for i, (x, y, w, h) in enumerate([(-26, -18, 9, 7), (-16, -26, 7, 10), (24, -20, 8, 6), (34, -34, 9, 9), (-34, -30, 8, 8)]):
        box("vecino", x, y, -11, x+w, y+8, -11+h, "edif")

def build_lights():
    # cielo + sol que entra por los ventanales
    w = bpy.data.worlds.new("cielo"); S.world = w; w.use_nodes = True; nt = w.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    sky = nt.nodes.new("ShaderNodeTexSky"); sky.sky_type = 'NISHITA' if hasattr(sky, "sky_type") else 'NISHITA'
    sky.sun_elevation = math.radians(38); sky.sun_rotation = math.radians(200); sky.sun_disc = False; sky.altitude = 12.0; sky.air_density = 1.0; sky.dust_density = 1.2
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 0.8; out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    d = Vector((0.45, -0.75, 0.55)).normalized()
    bpy.ops.object.light_add(type='SUN', location=(0, 0, 20)); sun = bpy.context.active_object; sun.data.energy = 4.5; sun.data.angle = math.radians(1.2); sun.data.color = (1.0, 0.93, 0.82)
    sun.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    # apoyo interior: pequeñas áreas suaves en el techo de cada estancia (ayudan a que la GI converja con pocas muestras)
    for (px, py, e) in ((520, 330, 55), (400, 330, 85), (460, 235, 35), (300, 250, 20), (100, 430, 22), (285, 460, 22), (560, 505, 18), (590, 70, 14), (80, 220, 8)):
        bpy.ops.object.light_add(type='AREA', location=(mx(px), my(py), H-0.05)); l = bpy.context.active_object
        l.data.shape = 'RECTANGLE'; l.data.size = 1.6; l.data.size_y = 1.0; l.data.energy = e; l.data.color = (1.0, 0.86, 0.7)

def build_all():
    build_shell(); build_walls_decor(); build_furniture(); build_exterior(); build_lights()
if __name__ == "__main__":
    t0 = time.time(); build_all(); print("ESCENA", len(bpy.data.objects), "objetos en", round(time.time()-t0, 1), "s")
