"""Exporta una unidad a .glb y genera su configuración para Remotion.

Uso (desde remotion-video/, con el entorno donde está instalado bpy):
    python tools/unidad/export_unit.py tipo101

Crea:  public/models/<ID>.glb            modelo ligero con el techo como pieza aparte (TECHO)
       src/Unidad/units/<ID>.ts          configuración (centro, ambientes y textos) para la composición
"""
import importlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, HERE)
import bpy
from mathutils import Vector

spec = importlib.import_module("specs." + sys.argv[-1])
spec.build()
L = spec

# 1) dejar solo la unidad: sin exterior, luces, tiras LED ni objetos sueltos
drop = tuple(spec.EXPORT_DROP)
for o in list(bpy.data.objects):
    if o.type != 'MESH' or o.name.startswith(drop): bpy.data.objects.remove(o, do_unlink=True)

# 2) colores planos (glTF no exporta materiales procedurales) y vidrio como transparencia simple
FLAT = {"Pared": (0.88,0.87,0.84), "Techo": (0.95,0.94,0.92), "Exterior": (0.82,0.80,0.76), "MuroExterior": (0.82,0.80,0.76),
 "Chapa madera": (0.50,0.30,0.14), "Celosía": (0.62,0.40,0.20), "Roble claro": (0.74,0.56,0.36), "Porcelanato": (0.56,0.54,0.52),
 "Mosaico negro": (0.04,0.04,0.05), "Azulejo bano": (0.74,0.77,0.78), "Piso balcon": (0.42,0.43,0.44), "Marmol": (0.92,0.91,0.89),
 "Laca blanca": (0.92,0.92,0.90), "Negro": (0.04,0.04,0.045), "Nevera": (0.09,0.09,0.10), "Boucle": (0.82,0.78,0.72),
 "Sofa": (0.36,0.45,0.38), "Cabecero": (0.68,0.63,0.57), "Mimbre": (0.72,0.58,0.38), "Lampara": (0.95,0.86,0.70),
 "Cortina": (0.92,0.88,0.80), "CortinaGris": (0.40,0.37,0.35), "Alfombra": (0.80,0.78,0.74), "Cuadro": (0.94,0.93,0.91),
 "Marco": (0.06,0.06,0.06), "Encimera": (0.45,0.46,0.48), "MarcoVentana": (0.04,0.04,0.045)}
for m in bpy.data.materials:
    if not m.use_nodes: continue
    nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
    if b is None: continue
    for l in list(nt.links):
        if l.to_node == b and l.to_socket.name in ("Base Color", "Normal"): nt.links.remove(l)
    if m.name in FLAT: b.inputs["Base Color"].default_value = (*FLAT[m.name], 1)
    if m.name == "Lampara": b.inputs["Emission Strength"].default_value = 0.0
    if m.name == "Vidrio":
        b.inputs["Transmission Weight"].default_value = 0.0; b.inputs["Alpha"].default_value = 0.28; b.inputs["Base Color"].default_value = (0.55, 0.75, 0.88, 1)

# 3) el techo se llama TECHO para poder levantarlo en la animación
for o in bpy.data.objects:
    if o.name.startswith("techo"): o.name = "TECHO"

# 4) caja envolvente (ejes de Blender: z arriba) -> centro y tamaño en ejes de three.js (y arriba, norte = -z)
pts = [o.matrix_world @ Vector(c) for o in bpy.data.objects if o.type == 'MESH' for c in o.bound_box]
mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); mx_ = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
center = [round((mn.x + mx_.x) / 2, 3), round((mn.z + mx_.z) / 2, 3), round(-(mn.y + mx_.y) / 2, 3)]
size = [round(mx_.x - mn.x, 3), round(mx_.z - mn.z, 3), round(mx_.y - mn.y, 3)]

# 5) exportar el .glb
glb = os.path.join(ROOT, "public", "models", f"{spec.ID}.glb"); os.makedirs(os.path.dirname(glb), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=True, export_lights=False, export_cameras=False)

# 6) configuración para Remotion (posiciones de las etiquetas en ejes de three.js)
rooms = [{"name": n, "area": a, "position": [round(spec.mx(px), 3), 0.05, round(-spec.my(py), 3)]} for (n, a, (px, py)) in spec.ROOMS]
ts = f'''import type {{ UnitConfig }} from "../UnidadFlotante";

// Generado por tools/unidad/export_unit.py (especificación: {spec.ID}). Editar la especificación, no este archivo.
const config: UnitConfig = {json.dumps({"id": spec.ID, "glb": f"models/{spec.ID}.glb", "center": center, "size": size, "rooms": rooms, "title": spec.TITLE, "footnote": spec.FOOTNOTE}, ensure_ascii=False, indent=2)};

export default config;
'''
out = os.path.join(ROOT, "src", "Unidad", "units", f"{spec.ID}.ts"); os.makedirs(os.path.dirname(out), exist_ok=True); open(out, "w").write(ts)
print("EXPORTADO", spec.ID, "| polígonos", sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'), "| tamaño (m)", size, "| centro", center)
