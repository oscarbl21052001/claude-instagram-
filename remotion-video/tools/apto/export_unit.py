import bpy, sys, math
sys.path.insert(0, "/tmp/claude-0/-home-user-claude-instagram-/16f988dd-8ad8-54a3-b130-a3272d5d802c/scratchpad/apto")
import scene2 as sc2
sc2.build_all()
# quitar exterior, luces, tiras LED y cielo: solo la unidad
drop = ("jardin", "arena", "mar2", "monte", "vecino", "ledlinea", "cable", "hoja", "maceta", "lama_balcon")
for o in list(bpy.data.objects):
    if o.type != 'MESH' or o.name.startswith(drop) or o.name == "mar": bpy.data.objects.remove(o, do_unlink=True)

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
# vidrio como transparencia simple (más ligero que transmisión)
for m in bpy.data.materials:
    if m.name in ("Vidrio",):
        b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Transmission Weight"].default_value = 0.0
        b.inputs["Alpha"].default_value = 0.28; b.inputs["Base Color"].default_value = (0.55, 0.75, 0.88, 1)
        m.blend_method = 'BLEND' if hasattr(m, "blend_method") else None
# fundir mallas por material (menos objetos), conservando el techo aparte
techo = [o for o in bpy.data.objects if o.name.startswith("techo")]
for o in techo: o.name = "TECHO"
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.data.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=sys.argv[-1], export_format='GLB', use_selection=True, export_apply=True, export_lights=False, export_cameras=False)
tris = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH')
print("EXPORT OK objetos", len(bpy.data.objects), "polígonos", tris)
