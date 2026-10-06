"""Especificación de la unidad: apartamento tipo 101/201/301 (80 m², 2 suítes).

Todas las coordenadas (px, py) son píxeles de la imagen del plano recortado; lib.configure fija la escala.
Para una unidad nueva: copiar este archivo, cambiar PLAN/ROOMS/muros/mobiliario y la ruta WALK_KNOTS.
"""
import lib
ID = "tipo101"
PLAN = dict(px_per_m=56.5, origin=(16, 559), height=2.70)      # escala calibrada con las superficies del catálogo
lib.configure(**PLAN)
from lib import *  # noqa: E402,F401,F403

TITLE = {"tag": "Unidad tipo", "lines": ["80 M²", "2 SUITES"]}
FOOTNOTE = "Recreación 3D ilustrativa. Medidas aproximadas."
# (nombre, superficie, posición en el plano en px) -> etiquetas ancladas en 3D
ROOMS = [("Salón y cocina", "23,37 m²", (520, 330)), ("Balcón", "6,44 m²", (524, 510)),
         ("Suite B", "12,45 m²", (285, 470)), ("Suite A", "14,22 m²", (105, 425))]
# luces de apoyo interior (px, py, energía)
LIGHTS = [(520, 330, 55), (400, 330, 85), (460, 235, 35), (300, 250, 20), (100, 430, 22), (285, 460, 22), (560, 505, 18), (590, 70, 14), (80, 220, 8)]
# ruta del recorrido: (segundo, posición px, objetivo px). Mantener la cámara a >0,7 m de muebles altos y postes.
WALK_KNOTS = [(0.0, (640, 30), (640, 150)), (2.0, (640, 100), (580, 230)), (3.5, (590, 160), (470, 270)), (5.0, (565, 215), (410, 330)),
      (6.5, (545, 290), (440, 360)), (8.0, (540, 380), (540, 520)), (9.3, (540, 455), (520, 545)), (10.6, (545, 478), (430, 505)),
      (12.0, (545, 420), (500, 250)), (12.8, (520, 300), (440, 200)), (13.4, (470, 190), (380, 175)), (14.0, (380, 170), (320, 215)),
      (14.6, (330, 230), (318, 330)), (15.4, (320, 330), (318, 410)), (16.2, (322, 400), (225, 470))]
# objetos que no se exportan al .glb (exterior, plantas sueltas, techo de lamas del balcón)
EXPORT_DROP = ("jardin", "arena", "oceano", "monte", "vecino", "ledlinea", "cable", "hoja", "maceta", "lama_balcon")


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


def build():
    build_shell(); build_walls_decor(); build_furniture(); build_exterior(); build_sky(); add_area_lights(LIGHTS)
