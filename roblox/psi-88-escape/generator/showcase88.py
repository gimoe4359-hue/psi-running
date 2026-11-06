"""88F 공유 하우스 — art-directed rebuild.

Design brief
  * Human scale. A shared flat built into one corner of the office floor:
    finished floor 0.4 above the slab, 11-stud ceilings, 7.6-stud doors,
    a 7-stud corridor. Everything outside the flat is sealed off and dark.
  * Palette: warm greige walls, white trim, honey laminate, muted per-room
    accent colours. Lighting is motivated only: recessed 2700K downlights,
    a dining pendant, the TV's static, under-cabinet strips, and dusk light
    leaking through boarded windows.
  * Story told sparingly: the chained front door, six slippers where there
    should be seven, a house-rules sheet on the fridge, one used bowl at a
    table laid for six, a planning room someone hasn't left in days.
"""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text
import props as P
import props2 as Q
from props import R

FL = 0.4          # finished floor level
CH = 11.4         # ceiling underside
DOOR_H = 7.6
NC = dict(collide=False)
DEC = dict(collide=False, shadow=False, touch=False, query=False)

# palette
WALL = 0xCFC6B8
TRIM = 0xEDEBE6
OAK = 0xB08A60
OAK_D = 0x7A5A3C
TILE_W = 0xE6E4DE
TILE_D = 0x5A5650
INK = 0x24221F
STEEL = 0xB8BCC0
ROOM_COL = [0xB7C2AE, 0xAEB8C2, 0xC9B3AE, 0xD6CDB6, 0xB9B6B0, 0xC8B68A]
BED_COL = [0x5B6B5A, 0x46566E, 0x8A5A56, 0xB8A27A, 0x5A5A60, 0x7A6A3A]


# ===================================================================== architecture
def wall(b, axis, a0, a1, plane, color, t=0.5, openings=(), y0=0.0, y1=CH, trim=True, name='Wall', base_col=TRIM):
    """Wall with door/window openings: (centre, width, bottom, top) measured from FL.

    Adds white baseboards and a small crown moulding on both faces.
    """
    m = b.model(name)

    def piece(u0, u1, v0, v1, nm='Wall'):
        if u1 - u0 < 0.02 or v1 - v0 < 0.02:
            return
        if axis == 'x':
            m.box(nm, u0, v0, plane - t / 2, u1, v1, plane + t / 2, color, 'SmoothPlastic')
        else:
            m.box(nm, plane - t / 2, v0, u0, plane + t / 2, v1, u1, color, 'SmoothPlastic')

    def strip(u0, u1, v0, v1, depth, col, nm):
        if u1 - u0 < 0.05:
            return
        for s in (-1, 1):
            f0, f1 = plane + s * t / 2, plane + s * (t / 2 + depth)
            lo, hi = min(f0, f1), max(f0, f1)
            if axis == 'x':
                m.box(nm, u0, v0, lo, u1, v1, hi, col, 'SmoothPlastic', **DEC)
            else:
                m.box(nm, lo, v0, u0, hi, v1, u1, col, 'SmoothPlastic', **DEC)

    cur = a0
    for c, w, bot, top in sorted(openings):
        o0, o1 = c - w / 2, c + w / 2
        piece(cur, o0, y0, y1)
        if trim:
            strip(cur, o0, FL, FL + 0.55, 0.1, base_col, 'Baseboard')
        piece(o0, o1, y0, FL + bot, 'Sill' if bot > 0.1 else 'Wall')
        piece(o0, o1, FL + top, y1, 'Header')
        cur = o1
    piece(cur, a1, y0, y1)
    if trim:
        strip(cur, a1, FL, FL + 0.55, 0.1, base_col, 'Baseboard')
        strip(a0, a1, y1 - 0.35, y1, 0.14, TRIM, 'Crown')
    return m


def casing(b, axis, c, plane, w, bot, top, t=0.5):
    """White architrave around an opening, both faces."""
    m = b.model('Casing')
    for s in (-1, 1):
        f = plane + s * (t / 2 + 0.05)
        for u, hw in ((c - w / 2 - 0.2, 0.4), (c + w / 2 + 0.2, 0.4)):
            if axis == 'x':
                m.blk('Jamb', (hw, top - bot, 0.12), (u, FL + (bot + top) / 2, f), TRIM, **DEC)
            else:
                m.blk('Jamb', (0.12, top - bot, hw), (f, FL + (bot + top) / 2, u), TRIM, **DEC)
        if axis == 'x':
            m.blk('Head', (w + 0.8, 0.45, 0.12), (c, FL + top + 0.2, f), TRIM, **DEC)
        else:
            m.blk('Head', (0.12, 0.45, w + 0.8), (f, FL + top + 0.2, c), TRIM, **DEC)
        if bot > 0.1:
            if axis == 'x':
                m.blk('Stool', (w + 0.8, 0.2, 0.5), (c, FL + bot - 0.1, plane + s * (t / 2 + 0.2)), TRIM, **DEC)
            else:
                m.blk('Stool', (0.5, 0.2, w + 0.8), (plane + s * (t / 2 + 0.2), FL + bot - 0.1, c), TRIM, **DEC)
    # jamb liners inside the opening
    for u in (c - w / 2 + 0.06, c + w / 2 - 0.06):
        if axis == 'x':
            m.blk('Liner', (0.12, top - bot, t + 0.02), (u, FL + (bot + top) / 2, plane), TRIM, **DEC)
        else:
            m.blk('Liner', (t + 0.02, top - bot, 0.12), (plane, FL + (bot + top) / 2, u), TRIM, **DEC)
    return m


def door_leaf(b, axis, c, plane, w=3.8, open_deg=0, hinge=-1, swing=1, color=0xE8E2D6, name='Door'):
    """Panel door. hinge=-1 hinges on the low-u side. swing=+1 opens toward +normal."""
    m = b.model(name)
    hu = c + hinge * (w / 2 - 0.05)
    if axis == 'x':
        frame = m.at(T(hu, FL, plane) * Ry(-swing * hinge * open_deg))
        lx = -hinge
        leaf = frame.blk('Leaf', (w - 0.1, DOOR_H - 0.1, 0.2), (lx * (w / 2 - 0.05), DOOR_H / 2, 0), color, 'SmoothPlastic')
        for py in (DOOR_H * 0.68, DOOR_H * 0.28):
            for s in (-1, 1):
                frame.blk('Panel', (w - 1.0, DOOR_H * 0.3, 0.04), (lx * (w / 2 - 0.05), py, s * 0.11), 0xDCD5C8, 'SmoothPlastic', **DEC)
        hx = lx * (w - 0.45)
        frame.cyl('Rose', 0.3, 0.35, (hx, 3.4, 0), STEEL, 'Metal', axis='z', **DEC)
        for s in (-1, 1):
            frame.blk('Lever', (0.6, 0.12, 0.12), (hx - lx * 0.25, 3.4, s * 0.25), STEEL, 'Metal', **DEC)
        for hy in (1.2, DOOR_H - 1.2):
            frame.blk('Hinge', (0.12, 0.5, 0.25), (0, hy, 0), 0x8A8A86, 'Metal', **DEC)
    else:
        frame = m.at(T(plane, FL, hu) * Ry(swing * hinge * open_deg))
        lz = -hinge
        frame.blk('Leaf', (0.2, DOOR_H - 0.1, w - 0.1), (0, DOOR_H / 2, lz * (w / 2 - 0.05)), color, 'SmoothPlastic')
        for py in (DOOR_H * 0.68, DOOR_H * 0.28):
            for s in (-1, 1):
                frame.blk('Panel', (0.04, DOOR_H * 0.3, w - 1.0), (s * 0.11, py, lz * (w / 2 - 0.05)), 0xDCD5C8, 'SmoothPlastic', **DEC)
        hz = lz * (w - 0.45)
        frame.cyl('Rose', 0.3, 0.35, (0, 3.4, hz), STEEL, 'Metal', axis='x', **DEC)
        for s in (-1, 1):
            frame.blk('Lever', (0.12, 0.12, 0.6), (s * 0.25, 3.4, hz - lz * 0.25), STEEL, 'Metal', **DEC)
    return m


def downlight(b, x, z, color=0xFFD9A8, bright=1.1, rng=16, shadows=False, angle=110):
    b.cyl('DownlightTrim', 0.12, 1.3, (x, CH - 0.04, z), TRIM, 'SmoothPlastic', **DEC)
    p = b.cyl('Downlight', 0.1, 0.9, (x, CH - 0.1, z), 0xFFF2DC, 'Neon', **DEC)
    light(p, 'SpotLight', color, bright, rng, shadows, 'Left', angle)   # cylinder axis is local X: 'Left' points down
    return p


def switch(b, x, z, facing):
    sb = b.at(T(x, FL + 3.9, z) * Ry({'-z': 0, '+z': 180, '-x': 90, '+x': -90}[facing]))
    Q.switch_outlet(sb)


# ===================================================================== furniture (scaled for a 5.5-stud character)
def sofa(b, w=8, col=0x6A6458):
    m = b.model('Sofa')
    m.blk('Plinth', (w, 0.9, 3.2), (0, FL + 0.75, 0), col, 'Fabric')
    n = 3 if w > 6 else 2
    cw = (w - 1.4) / n
    for i in range(n):
        x = -w / 2 + 0.7 + cw * (i + 0.5)
        m.blk('SeatCushion', (cw - 0.08, 0.55, 2.5), (x, FL + 1.45, -0.25), col, 'Fabric')
        m.blk('BackCushion', (cw - 0.1, 1.9, 0.75), (x, FL + 2.45, 1.05), col, 'Fabric', rot=Rx(-10))
    m.blk('Back', (w, 2.2, 0.5), (0, FL + 2.0, 1.4), col, 'Fabric')
    for s in (-1, 1):
        m.blk('Arm', (0.7, 1.3, 3.2), (s * (w / 2 - 0.35), FL + 1.45, 0), col, 'Fabric')
        m.cyl('ArmRoll', 3.2, 0.75, (s * (w / 2 - 0.35), FL + 2.1, 0), col, 'Fabric', axis='z')
        for z in (-1.3, 1.3):
            m.cyl('Leg', 0.3, 0.22, (s * (w / 2 - 0.5), FL + 0.15, z), OAK_D, 'Wood', **NC)
    m.blk('Pillow', (1.3, 1.2, 0.4), (-w / 2 + 1.5, FL + 2.2, 0.4), 0xC8A86A, 'Fabric', rot=Rx(-15) * Rz(12), **NC)
    m.blk('Pillow', (1.2, 1.1, 0.4), (w / 2 - 1.5, FL + 2.2, 0.4), 0x8A9A8A, 'Fabric', rot=Rx(-15) * Rz(-10), **NC)
    m.blk('Throw', (2.6, 0.12, 2.4), (w / 2 - 2.0, FL + 1.78, -0.3), 0x8A6A5A, 'Fabric', rot=Ry(14), **DEC)
    m.blk('ThrowDrape', (2.6, 1.1, 0.1), (w / 2 - 2.2, FL + 1.25, -1.55), 0x8A6A5A, 'Fabric', rot=Ry(14), **DEC)


def coffee_table(b, w=4.4, d=2.4):
    m = b.model('CoffeeTable')
    m.blk('Top', (w, 0.18, d), (0, FL + 1.35, 0), OAK, 'Wood')
    m.blk('Shelf', (w - 0.5, 0.12, d - 0.5), (0, FL + 0.45, 0), OAK, 'Wood')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Leg', (0.2, 1.3, 0.2), (sx * (w / 2 - 0.2), FL + 0.65, sz * (d / 2 - 0.2)), OAK_D, 'Wood')
    m.blk('Remote', (0.3, 0.08, 0.9), (0.8, FL + 1.48, 0.2), INK, rot=Ry(25), **DEC)
    m.cyl('Mug', 0.5, 0.42, (-1.1, FL + 1.7, -0.3), 0xE8E2D6, **NC)
    for i in range(3):
        m.blk('Book', (1.1, 0.2, 1.5), (-0.1, FL + 0.6 + i * 0.2, 0.1), [0x3A4A5A, 0x8A3A2A, 0xD8C8A8][i], 'Fabric', rot=Ry(i * 7), **DEC)


def armchair(b, col=0x8A6A4A):
    m = b.model('Armchair')
    m.blk('Seat', (2.8, 0.8, 2.8), (0, FL + 1.1, 0), col, 'Fabric')
    m.blk('Back', (2.8, 2.2, 0.6), (0, FL + 2.3, 1.1), col, 'Fabric', rot=Rx(-8))
    for s in (-1, 1):
        m.blk('Arm', (0.5, 1.0, 2.8), (s * 1.25, FL + 1.9, 0), col, 'Fabric')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Leg', (0.18, 0.75, 0.18), (sx * 1.15, FL + 0.38, sz * 1.15), OAK_D, 'Wood', rot=Rx(sz * 8) * Rz(-sx * 8), **NC)


def tv_console(b, w=8):
    m = b.model('TVConsole')
    m.blk('Console', (w, 1.6, 1.6), (0, FL + 0.8, 0), 0x3A3530, 'Wood')
    for i in range(3):
        m.blk('Front', (w / 3 - 0.15, 1.3, 0.05), (-w / 3 + i * w / 3, FL + 0.8, -0.82), 0x4A443E, 'Wood', **DEC)
    m.blk('TVStand', (1.4, 0.15, 0.9), (0, FL + 1.68, 0), INK, 'Metal')
    m.blk('TVNeck', (0.3, 0.6, 0.2), (0, FL + 2.05, 0.2), INK, 'Metal')
    scr = m.blk('TV', (6.4, 3.7, 0.25), (0, FL + 4.15, 0.2), 0x0C0C0E, 'SmoothPlastic')
    lp = m.blk('TVGlow', (6.0, 3.3, 0.05), (0, FL + 4.15, 0.06), 0x3A4A5C, 'Neon', tr=0.35, **DEC)
    for i in range(10):
        m.blk('Static', (6.0, 0.06, 0.02), (0, FL + 2.6 + R.uniform(0, 3.1), 0.03), 0x7A8A9C, 'Neon', tr=0.5, **DEC)
    light(lp, 'SurfaceLight', 0x8AA8D0, 0.7, 14, False, 'Front', 120)
    m.blk('Console2', (1.2, 0.35, 1.0), (2.4, FL + 1.78, 0), 0xE8E8E8, 'Plastic', **NC)
    m.blk('Router', (0.8, 0.25, 0.6), (-2.6, FL + 1.73, 0.2), 0x1A1A1A, **NC)
    P.bulb(m, -2.4, FL + 1.88, -0.2, color=0x3AFF6A, bright=0.1, rng=3, d=0.06)


def bookcase(b, w=4, h=7):
    m = b.model('Bookcase')
    col = 0xEDEBE6
    m.blk('SideL', (0.2, h, 1.3), (-w / 2 + 0.1, FL + h / 2, 0), col, 'SmoothPlastic')
    m.blk('SideR', (0.2, h, 1.3), (w / 2 - 0.1, FL + h / 2, 0), col, 'SmoothPlastic')
    m.blk('Back', (w, h, 0.08), (0, FL + h / 2, 0.61), col, 'SmoothPlastic')
    nlev = 5
    for i in range(nlev + 1):
        y = FL + 0.1 + i * (h - 0.2) / nlev
        m.blk('Shelf', (w - 0.4, 0.12, 1.2), (0, y, 0), col, 'SmoothPlastic')
        if i == nlev:
            break
        x = -w / 2 + 0.3
        step = (h - 0.2) / nlev
        while x < w / 2 - 0.4:
            if R.random() < 0.12:
                x += 0.6
                continue
            bw = R.uniform(0.18, 0.32)
            bh = step * R.uniform(0.6, 0.85)
            lean = R.random() < 0.08
            m.blk('Book', (bw, bh, R.uniform(0.75, 1.0)), (x + bw / 2, y + 0.06 + bh / 2, -0.05),
                  R.choice([0x3A4A5A, 0x8A3A2A, 0xD8C8A8, 0x4A5A3A, 0x2A2A2A, 0xB89A6A, 0x6A4A6A, 0xE8E2D6]), 'Fabric',
                  rot=Rz(-12) if lean else None, **NC)
            x += bw + 0.02
        if i == 2 and R.random() < 0.7:
            m.cyl('Vase', 0.9, 0.5, (w / 2 - 0.6, y + 0.5, 0), 0x6A8A9A, 'Glass', **NC)


def plant(b, h=4.5, pot=0xD8D0C4):
    m = b.model('Plant')
    m.cyl('Pot', 1.5, 1.4, (0, FL + 0.75, 0), pot, 'Concrete')
    m.cyl('PotRim', 0.15, 1.5, (0, FL + 1.48, 0), pot, 'Concrete', **DEC)
    m.cyl('Soil', 0.08, 1.25, (0, FL + 1.45, 0), 0x2E2016, 'Ground', **DEC)
    for i in range(14):
        a = i * 26 + R.uniform(-10, 10)
        L = R.uniform(1.6, h - 1.4)
        tilt = R.uniform(15, 45)
        stem = m.at(T(0, FL + 1.45, 0) * Ry(a) * Rz(tilt))
        stem.blk('Stem', (0.08, L, 0.08), (0, L / 2, 0), 0x3A5A2A, **DEC)
        stem.blk('Leaf', (0.5, 1.5, 0.04), (0, L, 0.1), R.choice([0x3E6B35, 0x4A7A3A, 0x2E5A2A]), 'Grass', rot=Rx(R.uniform(20, 50)), **DEC)


def floor_lamp(b):
    m = b.model('FloorLamp')
    m.cyl('Base', 0.15, 1.1, (0, FL + 0.08, 0), INK, 'Metal')
    m.cyl('Pole', 5.4, 0.12, (0, FL + 2.8, 0), INK, 'Metal')
    m.cyl('Shade', 1.1, 1.5, (0, FL + 5.7, 0), 0xE8DCC0, 'Fabric', **NC)
    P.bulb(m, 0, FL + 5.5, 0, color=0xFFC890, bright=0.7, rng=14, d=0.35, shadows=True)


def rug(b, w, d, col, border=None):
    b.blk('Rug', (w, 0.05, d), (0, FL + 0.03, 0), col, 'Fabric', **DEC)
    if border:
        b.blk('RugInner', (w - 1, 0.055, d - 1), (0, FL + 0.035, 0), border, 'Fabric', **DEC)


def dining_set(b):
    m = b.model('Dining')
    m.blk('Top', (8, 0.25, 3.8), (0, FL + 2.55, 0), OAK, 'Wood')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Leg', (0.3, 2.4, 0.3), (sx * 3.6, FL + 1.2, sz * 1.5), OAK_D, 'Wood')
    m.blk('Apron', (7.4, 0.4, 3.2), (0, FL + 2.25, 0), OAK_D, 'Wood', **NC)
    for i, x in enumerate((-2.6, 0, 2.6)):
        for s in (-1, 1):
            c = m.at(T(x + R.uniform(-0.15, 0.15), 0, s * 2.7) * Ry((0 if s > 0 else 180) + R.uniform(-8, 8)))
            c.blk('Seat', (1.6, 0.18, 1.6), (0, FL + 1.55, 0), OAK, 'Wood')
            for lx in (-0.65, 0.65):
                for lz in (-0.65, 0.65):
                    c.blk('Leg', (0.15, 1.5, 0.15), (lx, FL + 0.78, lz), OAK_D, 'Wood', **NC)
            c.blk('BackRail', (1.6, 0.35, 0.15), (0, FL + 3.4, 0.7), OAK, 'Wood')
            c.blk('Spindle', (0.12, 1.6, 0.12), (-0.5, FL + 2.45, 0.7), OAK_D, 'Wood', **NC)
            c.blk('Spindle', (0.12, 1.6, 0.12), (0.5, FL + 2.45, 0.7), OAK_D, 'Wood', **NC)
            m.blk('Placemat', (1.6, 0.03, 1.1), (x, FL + 2.69, s * 1.2), 0xC8B89A, 'Fabric', **DEC)
    # a table laid for six, one bowl used
    for i, x in enumerate((-2.6, 0, 2.6)):
        for s in (-1, 1):
            used = (i == 0 and s < 0)
            m.cyl('Bowl', 0.35, 0.85, (x, FL + 2.88, s * 1.2), 0xF4F0E8 if used else 0xE0DCD4, **NC)
            m.blk('Spoon', (0.1, 0.04, 0.9), (x + 0.6, FL + 2.72, s * 1.2), STEEL, 'Metal', **DEC)
            m.blk('Chopsticks', (0.06, 0.05, 1.0), (x + 0.8, FL + 2.72, s * 1.2), STEEL, 'Metal', **DEC)
    m.blk('KimchiDish', (0.9, 0.2, 0.6), (-1.3, FL + 2.78, 0), 0xC83A1A, **NC)
    m.cyl('WaterJug', 1.1, 0.6, (1.2, FL + 3.25, 0.1), 0xC8E0E8, 'Glass', tr=0.35, **NC)


def pendant(b, x, z, drop=3.6):
    b.blk('Cord', (0.06, drop, 0.06), (x, CH - drop / 2, z), INK, **DEC)
    b.cyl('Canopy', 0.15, 0.6, (x, CH - 0.08, z), INK, 'Metal', **DEC)
    b.cyl('Shade', 1.0, 2.2, (x, CH - drop - 0.3, z), 0x2A2826, 'Metal', **NC)
    b.cyl('ShadeLip', 0.1, 2.3, (x, CH - drop - 0.8, z), 0xC9A24A, 'Metal', **DEC)
    p = b.ball('Bulb', 0.5, (x, CH - drop - 0.7, z), 0xFFE0B0, 'Neon', **DEC)
    light(p, 'PointLight', 0xFFC890, 1.3, 18, True)


def kitchen_run(b, x0, x1, zwall, sign=1):
    """Base + upper cabinets along a wall at z=zwall; cabinets extend toward +sign*z."""
    m = b.model('Kitchen')
    d = 2.2
    zc = zwall + sign * d / 2
    top_y = FL + 2.85
    m.box('Plinth', x0, FL, zc - sign * (d / 2 - 0.15) - 0.01, x1, FL + 0.35, zc + sign * (d / 2 - 0.15), 0x2A2826)
    m.box('Carcass', x0, FL + 0.35, min(zwall, zwall + sign * d), x1, top_y - 0.12, max(zwall, zwall + sign * d), 0xF0EDE6, 'SmoothPlastic')
    m.box('Worktop', x0 - 0.05, top_y - 0.12, min(zwall, zwall + sign * (d + 0.15)), x1 + 0.05, top_y, max(zwall, zwall + sign * (d + 0.15)),
          0x3A3836, 'Granite')
    face = zwall + sign * (d + 0.02)
    x = x0
    n = 0
    while x < x1 - 0.5:
        w = min(2.0, x1 - x)
        # door seams + handles: alternate drawer stacks and doors
        if n % 3 == 1:
            for k in range(3):
                y = FL + 0.75 + k * 0.62
                m.blk('DrawerSeam', (w - 0.1, 0.04, 0.03), (x + w / 2, y + 0.3, face), 0xC8C4BC, **DEC)
                m.blk('Pull', (0.8, 0.08, 0.1), (x + w / 2, y + 0.05, face + sign * 0.05), STEEL, 'Metal', **DEC)
        else:
            m.blk('DoorSeam', (0.04, 2.0, 0.03), (x + w - 0.02, FL + 1.45, face), 0xC8C4BC, **DEC)
            m.blk('Pull', (0.08, 0.8, 0.1), (x + w - 0.3, FL + 2.1, face + sign * 0.05), STEEL, 'Metal', **DEC)
        x += w
        n += 1
    # uppers
    ud = 1.3
    m.box('Uppers', x0, FL + 5.3, min(zwall, zwall + sign * ud), x1, FL + 8.4, max(zwall, zwall + sign * ud), 0xF0EDE6, 'SmoothPlastic')
    uf = zwall + sign * (ud + 0.02)
    x = x0
    while x < x1 - 0.5:
        w = min(2.0, x1 - x)
        m.blk('UpperSeam', (0.04, 3.0, 0.03), (x + w - 0.02, FL + 6.85, uf), 0xC8C4BC, **DEC)
        m.blk('UpperPull', (0.08, 0.6, 0.1), (x + w - 0.3, FL + 5.7, uf + sign * 0.05), STEEL, 'Metal', **DEC)
        x += w
    # backsplash subway tile
    bz = zwall + sign * 0.03
    m.box('Backsplash', x0, top_y, min(bz, bz + sign * 0.04), x1, FL + 5.3, max(bz, bz + sign * 0.04), 0xEDEBE6, 'SmoothPlastic', **DEC)
    for k in range(1, 7):
        y = top_y + k * (FL + 5.3 - top_y) / 7
        m.box('Grout', x0, y - 0.02, min(bz, bz + sign * 0.06), x1, y + 0.02, max(bz, bz + sign * 0.06), 0xC8C4BC, **DEC)
    # under-cabinet light
    strip = m.box('UnderLight', x0 + 0.2, FL + 5.2, min(zwall, zwall + sign * 1.1), x1 - 0.2, FL + 5.28, max(zwall, zwall + sign * 1.1),
                  0xFFF0D8, 'Neon', **DEC)
    light(strip, 'SurfaceLight', 0xFFE2B8, 0.8, 8, False, 'Bottom', 120)
    return m, top_y, face


def fridge(b, col=0xC8CCD0):
    m = b.model('Fridge')
    m.blk('Body', (3.4, 7.2, 2.6), (0, FL + 3.6, 0), col, 'Metal')
    m.blk('Split', (0.04, 7.0, 0.04), (0, FL + 3.6, -1.32), 0x8A8E92, **DEC)
    for s in (-1, 1):
        m.blk('Handle', (0.1, 2.4, 0.15), (s * 0.25, FL + 4.4, -1.42), 0xE8E8E8, 'Metal', **DEC)
    return m


def range_hood(b):
    m = b.model('Hood')
    m.blk('Canopy', (3.0, 0.6, 1.9), (0, FL + 7.2, 0), STEEL, 'Metal')
    m.blk('Chimney', (1.2, 3.2, 1.0), (0, FL + 9.5, 0.4), STEEL, 'Metal')
    p = m.blk('HoodLight', (0.8, 0.05, 0.4), (0, FL + 6.88, -0.3), 0xFFF0D8, 'Neon', **DEC)
    light(p, 'SpotLight', 0xFFE0B8, 0.6, 7, False, 'Bottom', 90)


def cooktop(b):
    b.blk('Glass', (2.6, 0.05, 1.8), (0, 0.03, 0), 0x0C0C0E, 'Glass', refl=0.2, **DEC)
    for x, z, d in ((-0.6, -0.4, 0.9), (0.6, -0.4, 0.7), (-0.6, 0.45, 0.7), (0.6, 0.45, 0.9)):
        b.cyl('Ring', 0.02, d, (x, 0.06, z), 0x3A3A3A, **DEC)
    b.cyl('Pot', 0.9, 1.1, (-0.6, 0.5, -0.4), 0x8A8E92, 'Metal', **NC)
    b.blk('PotHandle', (0.8, 0.1, 0.12), (-1.4, 0.8, -0.4), INK, **DEC)


def sink(b):
    b.blk('Basin', (2.2, 0.05, 1.5), (0, 0.02, 0), 0xA8ACB0, 'Metal', **DEC)
    b.blk('BasinRim', (2.4, 0.06, 1.7), (0, 0.0, 0), 0xC8CCD0, 'Metal', **DEC)
    b.cyl('FaucetBase', 0.5, 0.25, (0, 0.25, 0.75), STEEL, 'Metal', **NC)
    b.beam('Spout', (0, 0.5, 0.75), (0, 1.3, 0.55), 0.15, 0.15, STEEL, 'Metal', **DEC)
    b.beam('Spout2', (0, 1.3, 0.55), (0, 1.0, 0.1), 0.15, 0.15, STEEL, 'Metal', **DEC)
    for i in range(3):
        b.cyl('Dish', 0.08, 0.9, (R.uniform(-0.5, 0.5), 0.1 + i * 0.09, R.uniform(-0.3, 0.3)), 0xF0EDE6, **DEC)


def bed(b, col, frame=OAK, w=4.4, l=7.6):
    m = b.model('Bed')
    m.blk('Frame', (w + 0.3, 0.8, l + 0.3), (0, FL + 0.7, 0), frame, 'Wood')
    m.blk('Mattress', (w, 0.7, l), (0, FL + 1.45, 0), 0xEFEBE2, 'Fabric')
    m.blk('Headboard', (w + 0.3, 3.0, 0.3), (0, FL + 1.8, l / 2 + 0.15), frame, 'Wood')
    m.blk('HeadPanel', (w - 0.6, 1.8, 0.05), (0, FL + 2.3, l / 2 - 0.02), 0xD8D0C4, 'Fabric', **DEC)
    m.blk('Pillow', (w - 1.0, 0.45, 1.3), (0, FL + 2.0, l / 2 - 1.0), 0xF6F3EC, 'Fabric', rot=Rx(-8))
    m.blk('Duvet', (w + 0.25, 0.4, l * 0.62), (0, FL + 1.95, -l * 0.17), col, 'Fabric')
    m.blk('DuvetFold', (w + 0.3, 0.45, 0.8), (0, FL + 2.15, l * 0.12), 0xF0EDE6, 'Fabric')
    m.blk('DuvetSide', (0.12, 1.1, l * 0.62), (-w / 2 - 0.1, FL + 1.5, -l * 0.17), col, 'Fabric', **DEC)
    m.blk('DuvetSide', (0.12, 1.1, l * 0.62), (w / 2 + 0.1, FL + 1.5, -l * 0.17), col, 'Fabric', **DEC)
    return m


def nightstand(b, lamp_col=0xFFC890):
    m = b.model('Nightstand')
    m.blk('Body', (1.8, 1.9, 1.6), (0, FL + 0.95, 0), OAK, 'Wood')
    m.blk('Drawer', (1.6, 0.04, 0.03), (0, FL + 1.3, -0.81), OAK_D, **DEC)
    m.blk('Knob', (0.15, 0.15, 0.1), (0, FL + 1.55, -0.85), STEEL, 'Metal', **DEC)
    m.cyl('LampBase', 0.8, 0.45, (0.3, FL + 2.3, 0.2), 0xD8D0C4, 'Concrete', **NC)
    m.cyl('LampShade', 0.8, 1.0, (0.3, FL + 3.1, 0.2), 0xF0E6D0, 'Fabric', **NC)
    P.bulb(m, 0.3, FL + 2.9, 0.2, color=lamp_col, bright=0.6, rng=10, d=0.25)
    m.blk('Phone', (0.4, 0.05, 0.75), (-0.4, FL + 1.93, -0.2), INK, rot=Ry(15), **DEC)


def desk(b, col=OAK):
    m = b.model('Desk')
    m.blk('Top', (5, 0.2, 2.4), (0, FL + 2.45, 0), col, 'Wood')
    m.blk('Pedestal', (1.6, 2.35, 2.2), (1.6, FL + 1.18, 0), col, 'Wood')
    for k in range(3):
        m.blk('DrawerSeam', (1.5, 0.04, 0.03), (1.6, FL + 0.8 + k * 0.6, -1.11), OAK_D, **DEC)
    m.blk('LegL', (0.2, 2.35, 2.2), (-2.4, FL + 1.18, 0), col, 'Wood')
    m.blk('Laptop', (1.5, 0.07, 1.05), (-0.4, FL + 2.59, -0.1), 0xA8ACB0, 'Metal', **NC)
    scr = m.blk('LaptopScreen', (1.5, 1.0, 0.05), (-0.4, FL + 3.1, 0.42), 0xA8ACB0, 'Metal', rot=Rx(-12), **NC)
    gui_text(scr, '', 'Front', bg=0x1A2A3A, fg=0xFFFFFF, glow=True, ppu=8)
    m.cyl('Mug', 0.45, 0.38, (1.6, FL + 2.78, -0.4), R.choice([0xE8E2D6, 0x3A4A5A, 0xA83A2A]), **NC)
    for i in range(R.randint(1, 3)):
        m.blk('Book', (1.0, 0.2, 1.3), (1.4, FL + 2.65 + i * 0.2, 0.4), R.choice([0x3A4A5A, 0x8A3A2A, 0xD8C8A8]), 'Fabric', rot=Ry(R.uniform(-15, 15)), **NC)
    c = m.at(T(-0.4, 0, -1.8) * Ry(180 + R.uniform(-20, 20)))
    c.blk('Seat', (1.7, 0.3, 1.7), (0, FL + 1.6, 0), 0x2A2826, 'Fabric')
    c.blk('Back', (1.6, 1.9, 0.25), (0, FL + 2.7, 0.8), 0x2A2826, 'Fabric', rot=Rx(-8))
    c.cyl('Post', 1.2, 0.2, (0, FL + 0.9, 0), 0x6A6A6A, 'Metal', **NC)
    c.blk('Star', (1.8, 0.15, 0.25), (0, FL + 0.2, 0), 0x3A3A3A, 'Metal', **NC)
    c.blk('Star', (0.25, 0.15, 1.8), (0, FL + 0.2, 0), 0x3A3A3A, 'Metal', **NC)


def wardrobe(b, col=0xEDEBE6, w=4.4):
    m = b.model('Wardrobe')
    m.blk('Body', (w, 8.6, 2.2), (0, FL + 4.3, 0), col, 'SmoothPlastic')
    m.blk('Split', (0.04, 8.2, 0.03), (0, FL + 4.3, -1.11), 0xC8C4BC, **DEC)
    for s in (-1, 1):
        m.blk('Handle', (0.08, 1.0, 0.1), (s * 0.25, FL + 4.4, -1.16), STEEL, 'Metal', **DEC)
    m.blk('TopBox', (2.0, 1.0, 1.6), (R.uniform(-0.6, 0.6), FL + 9.1, 0), 0xC8A878, 'Fabric', rot=Ry(R.uniform(-6, 6)), **NC)


def window_boarded(b, x, zwall, w=7, bot=3.0, top=8.0, glow=0xFF9A70):
    """Boarded window on the north wall: light leaks through the gaps."""
    m = b.model('BoardedWindow')
    yb, yt = FL + bot, FL + top
    gl = m.blk('DuskGlow', (w - 0.2, top - bot - 0.2, 0.05), (x, (yb + yt) / 2, zwall + 0.15), glow, 'Neon', tr=0.25, **DEC)
    light(gl, 'SurfaceLight', 0xFF8C6A, 1.4, 22, True, 'Front', 100)
    n = 5
    hgt = (top - bot) / n
    for i in range(n):
        y = yb + hgt * (i + 0.5)
        m.blk('Board', (w + 1.4, hgt * 0.7, 0.25), (x + R.uniform(-0.3, 0.3), y, zwall - 0.32), R.choice([0x8A6A48, 0x7A5A3A, 0x9A7A56]), 'WoodPlanks',
              rot=Rz(R.uniform(-4, 4)))
        for s in (-1, 1):
            m.cyl('Nail', 0.1, 0.12, (x + s * (w / 2 + 0.3), y, zwall - 0.46), 0x3A3A3A, 'Metal', axis='z', **DEC)
    m.blk('Rod', (w + 3, 0.12, 0.12), (x, FL + 9.0, zwall - 0.7), STEEL, 'Metal', **DEC)
    for s in (-1, 1):
        for k in range(3):
            m.blk('Curtain', (0.8, 8.4, 0.12), (x + s * (w / 2 + 0.6 + k * 0.45), FL + 4.75, zwall - 0.75 - (k % 2) * 0.2), 0xB8A88A, 'Fabric', **DEC)


def toilet(b):
    m = b.model('Toilet')
    m.blk('Tank', (1.8, 1.6, 0.7), (0, FL + 2.3, 0.85), 0xF4F4F0, 'SmoothPlastic')
    m.cyl('Bowl', 1.4, 1.5, (0, FL + 0.7, -0.1), 0xF4F4F0, 'SmoothPlastic')
    m.blk('BowlFront', (1.5, 1.4, 1.0), (0, FL + 0.7, 0.4), 0xF4F4F0, 'SmoothPlastic')
    m.cyl('Seat', 0.12, 1.6, (0, FL + 1.45, -0.1), 0xF0F0EC, 'SmoothPlastic', **NC)
    m.blk('Flush', (0.3, 0.1, 0.15), (0.6, FL + 3.1, 0.85), STEEL, 'Metal', **DEC)


def vanity(b):
    m = b.model('Vanity')
    m.blk('Cabinet', (3.6, 2.4, 1.6), (0, FL + 1.2, 0), 0xEDEBE6, 'SmoothPlastic')
    m.blk('Top', (3.8, 0.15, 1.8), (0, FL + 2.48, 0), 0xF4F4F0, 'Marble')
    m.blk('Basin', (1.6, 0.05, 1.0), (0, FL + 2.53, -0.1), 0xE0E0DC, **DEC)
    m.beam('Spout', (0, FL + 2.6, 0.6), (0, FL + 3.3, 0.3), 0.12, 0.12, STEEL, 'Metal', **DEC)
    m.blk('Mirror', (3.2, 3.6, 0.1), (0, FL + 5.3, 0.78), 0xC8D4D8, 'Glass', refl=0.7, **NC)
    m.blk('MirrorLight', (3.0, 0.2, 0.2), (0, FL + 7.3, 0.7), 0xFFF2DC, 'Neon', **DEC)
    cup = m.cyl('Cup', 0.7, 0.5, (1.3, FL + 2.9, 0.4), 0xC8E0E8, 'Glass', tr=0.3, **NC)
    for i, col in enumerate((0xE04040, 0x40A0E0, 0x40B040, 0xF0C020, 0xF0F0F0, 0xA060E0)):
        m.blk('Toothbrush', (0.08, 1.0, 0.08), (1.15 + (i % 3) * 0.12, FL + 3.25, 0.32 + (i // 3) * 0.14), col, rot=Rz((i - 2.5) * 6), **DEC)


def shower(b):
    m = b.model('Shower')
    m.blk('Tray', (4.4, 0.25, 4.4), (0, FL + 0.12, 0), 0xF0F0EC, 'SmoothPlastic')
    m.blk('Screen', (0.12, 7.4, 4.4), (-2.2, FL + 3.95, 0), 0xC8E0E8, 'Glass', tr=0.7)
    m.blk('ScreenFront', (2.6, 7.4, 0.12), (-0.9, FL + 3.95, 2.2), 0xC8E0E8, 'Glass', tr=0.7)
    m.blk('Rail', (0.1, 4, 0.1), (2.05, FL + 5, -1.0), STEEL, 'Metal', **NC)
    m.cyl('Head', 0.2, 1.0, (1.7, FL + 7.3, -1.0), STEEL, 'Metal', **NC)
    m.cyl('Drain', 0.03, 0.5, (0, FL + 0.26, 0), 0x8A8E92, 'Metal', **DEC)


def washer(b, col=0xF0F0EC, front=True):
    m = b.model('Washer')
    m.blk('Body', (2.8, 3.4, 2.6), (0, FL + 1.7, 0), col, 'SmoothPlastic')
    m.cyl('DoorRing', 0.15, 2.0, (0, FL + 1.6, -1.32), 0xC8CCD0, 'Metal', axis='z', **DEC)
    m.cyl('DoorGlass', 0.12, 1.6, (0, FL + 1.6, -1.36), 0x3A4A5A, 'Glass', axis='z', **DEC)
    m.blk('Panel', (2.6, 0.5, 0.05), (0, FL + 3.1, -1.31), 0xD8D8D4, **DEC)
    m.cyl('Dial', 0.1, 0.4, (0.8, FL + 3.1, -1.36), 0x8A8E92, axis='z', **DEC)


def shoe_cabinet(b, w=12, h=8.2):
    m = b.model('ShoeCabinet')
    m.blk('Body', (w, h, 1.6), (0, FL + 0.6 + h / 2, 0), 0xEDEBE6, 'SmoothPlastic')
    n = int(w / 2)
    for i in range(1, n):
        m.blk('Seam', (0.04, h - 0.2, 0.03), (-w / 2 + i * w / n, FL + 0.6 + h / 2, -0.81), 0xC8C4BC, **DEC)
    for i in range(n):
        m.blk('Pull', (0.08, 0.6, 0.1), (-w / 2 + (i + 0.5) * w / n + 0.6, FL + 3.4, -0.86), STEEL, 'Metal', **DEC)
    m.blk('Toe', (w, 0.6, 1.2), (0, FL + 0.3, 0.2), 0x2A2826, **NC)
    strip = m.blk('ToeLight', (w - 0.4, 0.06, 0.1), (0, FL + 0.58, -0.45), 0xFFF0D8, 'Neon', **DEC)
    light(strip, 'SurfaceLight', 0xFFE2B8, 0.5, 6, False, 'Bottom', 120)


def slippers(b, col):
    for s in (-1, 1):
        b.blk('Slipper', (0.5, 0.18, 1.1), (s * 0.3, 0.09, 0), col, 'Fabric', rot=Ry(s * 4), **DEC)


def frame(b, w, h, art=None, col=0x2A2826):
    b.blk('Frame', (w + 0.25, h + 0.25, 0.12), (0, 0, -0.06), col, 'Wood', **DEC)
    b.blk('Mat', (w, h, 0.05), (0, 0, -0.13), 0xF0EDE6, **DEC)
    b.blk('Art', (w * 0.75, h * 0.75, 0.04), (0, 0, -0.16), art or R.choice([0x6A7A8A, 0xA88A6A, 0x8A9A7A, 0xC8B8A0]), **DEC)


def corkboard(b):
    m = b.model('PlanBoard')
    m.blk('Cork', (10, 5.6, 0.15), (0, 0, -0.08), 0xA8845A, 'Fabric', **DEC)
    m.blk('Frame', (10.3, 5.9, 0.1), (0, 0, -0.03), OAK_D, 'Wood', **DEC)
    pts = []
    for i in range(12):
        x, y = R.uniform(-4.4, 4.4), R.uniform(-2.3, 2.3)
        pts.append((x, y))
        m.blk('Pinned', (R.uniform(0.9, 1.5), R.uniform(0.7, 1.1), 0.03), (x, y, -0.18), R.choice([0xF2F0EA, 0xE8E0C8, 0xD8DCE0]), rot=Rz(R.uniform(-6, 6)), **DEC)
        m.ball('Pin', 0.14, (x, y + 0.4, -0.22), 0xC01818, **DEC)
    for i in range(9):
        a, c = R.sample(pts, 2)
        m.beam('String', (a[0], a[1] + 0.4, -0.24), (c[0], c[1] + 0.4, -0.24), 0.05, 0.05, 0xB01010, **DEC)
    t = m.blk('Title', (5, 0.6, 0.03), (0, 2.6, -0.2), 0xF2F0EA, **DEC)
    gui_text(t, '88층 → 1층 탈출 경로', 'Front', bg=0xF2F0EA, fg=0x8A1010, font=9, ppu=40)


# ===================================================================== the flat
X0, X1, Z0, Z1 = -24.0, 62.0, -22.0, 53.6
ROOMS = [(-24, -8), (-8, 8), (8, 24), (24, 40), (40, 56)]


def build(fb, F):
    s = fb.model('SharedHouse')
    arch = s.model('Architecture')
    g = fb.model('Gameplay')

    # ---------------- floors
    from building import rect_minus
    tiled = [(50, 62, -22, -2), (-4, 14, 10, 27), (-24, -4, -22, 10), (56, 62, 34, 53.6)]
    for (a, b2, c0, c1) in rect_minus((X0, X1, Z0, Z1), tiled):
        arch.box('Laminate', a, 0, c0, b2, FL, c1, OAK, 'WoodPlanks')
    arch.box('EntryTile', 50, 0, -22, 62, 0.12, -2, TILE_D, 'Slate')
    arch.box('EntryStep', 50, 0.12, -2.4, 62, FL, -2, OAK_D, 'Wood')
    arch.box('BathTile', -4, 0, 10, 14, FL, 27, TILE_W, 'Marble')
    arch.box('LaundryTile', -24, 0, -22, -4, FL, 10, 0xB8B4AC, 'Slate')
    arch.box('BoilerTile', 56, 0, 34, 62, FL, 53.6, 0x9A968E, 'Concrete')
    for i in range(1, 6):
        arch.box('EntryGrout', 50, 0.12, -22 + i * 3.3, 62, 0.13, -22 + i * 3.3 + 0.06, 0x3A3632, **DEC)
    # drop ceiling
    arch.box('Ceiling', X0, CH, Z0, X1, CH + 0.3, Z1, 0xF2F0EC, 'SmoothPlastic', shadow=False)

    # ---------------- shell
    win = [(a + 11, 5, 3.0, 8.0) for a, b2 in ROOMS]
    wall(arch, 'x', X0, X1, -22, WALL, name='WallSouth')
    wall(arch, 'z', Z0, Z1, X0, WALL, name='WallWestOuter')
    wall(arch, 'z', -22, -16, 61.75, WALL, name='WallEastA')
    wall(arch, 'z', 16, Z1, 61.75, WALL, name='WallEastB')
    wall(arch, 'x', X0, X1, 53.85, WALL, openings=win, name='WindowWall')
    for a, b2 in ROOMS:
        casing(arch, 'x', a + 11, 53.85, 5, 3.0, 8.0)
    # corridor
    bed_doors = [(a + 3.4, 3.8, 0, DOOR_H) for a, b2 in ROOMS] + [(59, 3.4, 0, DOOR_H)]
    wall(arch, 'x', X0, X1, 34, WALL, openings=bed_doors, name='CorridorNorth')
    south_doors = [(-14, 3.8, 0, DOOR_H), (5, 3.8, 0, DOOR_H), (56, 8, 0, 9.0)]
    wall(arch, 'x', X0, X1, 27, WALL, openings=south_doors, name='CorridorSouth')
    for c, w, bt, tp in bed_doors + south_doors:
        casing(arch, 'x', c, 34 if (c, w, bt, tp) in bed_doors else 27, w, bt, tp)
    for i, (a, b2) in enumerate(ROOMS[1:] + [(56, 62)]):
        wall(arch, 'z', 34, Z1, a, ROOM_COL[i], name='Partition')
    # west block
    wall(arch, 'z', -22, 27, -4, WALL, openings=[(-6, 3.8, 0, DOOR_H)], name='WestBlockA')
    wall(arch, 'x', X0, 14, 10, WALL, name='WestBlockB')
    wall(arch, 'z', -22, 27, 14, WALL, openings=[(-6, 3.8, 0, DOOR_H)], name='WestBlockC')
    casing(arch, 'z', -6, -4, 3.8, 0, DOOR_H)
    casing(arch, 'z', -6, 14, 3.8, 0, DOOR_H)
    # entry wall with built-in shoe cabinet
    wall(arch, 'z', -22, -8, 50, WALL, name='EntryWall')

    # bedroom accent walls (paint the inner faces)
    for i, (a, b2) in enumerate(ROOMS):
        arch.box('Paint', a + 0.26, FL + 0.55, 34.26, b2 - 0.26, CH - 0.35, 34.3, ROOM_COL[i], **DEC)
        arch.box('Paint', a + 0.26, FL + 0.55, 53.56, b2 - 0.26, CH - 0.35, 53.6, ROOM_COL[i], **DEC)

    # ---------------- doors
    doors = s.model('Doors')
    for i, (a, b2) in enumerate(ROOMS):
        door_leaf(doors, 'x', a + 3.4, 34, open_deg=[70, 25, 90, 0, 55][i], hinge=-1, swing=1, name='BedroomDoor')
    door_leaf(doors, 'x', 59, 34, w=3.4, open_deg=0, hinge=1, swing=1, name='BoilerDoor')
    door_leaf(doors, 'x', -14, 27, open_deg=35, hinge=1, swing=-1, name='Room6Door')
    door_leaf(doors, 'x', 5, 27, open_deg=80, hinge=-1, swing=-1, name='BathDoor')
    door_leaf(doors, 'z', -6, 14, open_deg=60, hinge=-1, swing=-1, name='PlanDoor')
    door_leaf(doors, 'z', -6, -4, open_deg=0, hinge=1, swing=1, name='LaundryDoor')
    P.sign(doors, '보일러실', 59, FL + 6.2, 33.7, '-z', 1.8, 0.5, bg=0xEDEBE6, fg=0x5A5650, name='BoilerSign')
    for i, (a, b2) in enumerate(ROOMS):
        P.sign(doors, str(801 + i), a + 3.4, FL + 8.3, 33.7, '-z', 1.0, 0.45, bg=0xC9A24A, fg=0x2A2826, name='RoomNumber')
    P.sign(doors, '806', -14, FL + 8.3, 27.3, '+z', 1.0, 0.45, bg=0xC9A24A, fg=0x2A2826, name='RoomNumber')

    # ---------------- lighting plan
    lt = s.model('Lighting')
    for x in range(-18, 60, 12):
        downlight(lt, x, 30.5, bright=0.8, rng=14)
    for a, b2 in ROOMS:
        downlight(lt, (a + b2) / 2, 42, bright=0.55, rng=14, shadows=True)
    for x, z in ((20, -16), (32, -16), (42, -16), (30, -10)):
        downlight(lt, x, z, bright=0.7, rng=14)
    for x, z in ((40, 12), (54, 22), (54, 4)):
        downlight(lt, x, z, bright=0.45, rng=14)
    downlight(lt, 56, -12, bright=0.9, rng=16, shadows=True)
    downlight(lt, 5, 18, color=0xF4F8FF, bright=0.9, rng=14)
    downlight(lt, -14, -6, color=0xF4F8FF, bright=0.6, rng=14)
    downlight(lt, 5, -6, bright=0.5, rng=14, shadows=True)
    downlight(lt, -14, 18, bright=0.35, rng=12)
    downlight(lt, 59, 44, color=0xF4F8FF, bright=0.4, rng=10)

    # ---------------- 현관 (entry)
    en = s.model('Entry')
    shoe_cabinet(en.at(T(51.1, 0, -15) * Ry(-90)), w=13, h=8.2)
    for i, col in enumerate((0x6A8AC0, 0xE0A0B0, 0x8A9A7A, 0xC8A878, 0x5A5A60, 0xA86A5A)):
        slippers(en.at(T(57 - i * 1.4, FL, -1.4) * Ry(180)), col)
    for x, z, a, col in ((58, -17, 30, 0xF0F0F0), (55.5, -19, -60, 0x2A2A2A), (60, -6, 100, 0x8A3030), (53, -10, 15, 0x30508A)):
        en.blk('Shoe', (0.6, 0.45, 1.25), (x, 0.35, z), col, rot=Ry(a), **NC)
        en.blk('Shoe', (0.6, 0.45, 1.25), (x + 0.5, 0.35, z + 0.3), col, rot=Ry(a + 10), **NC)
    Q.umbrella_stand(en.at(T(60.6, 0.12, -20.6)))
    note = en.blk('DoorNote', (0.04, 1.2, 0.9), (61.8, FL + 5.2, -11.5), 0xF8F4E8, **DEC)
    gui_text(note, '절대\n열지 마', 'Left', bg=0xF8F4E8, fg=0x8A1010, font=9, ppu=60)
    switch(en, 61.7, -5.5, '-x')

    # ---------------- kitchen
    k = s.model('Kitchen')
    km, top_y, face = kitchen_run(k, 15, 44, -21.75, sign=1)
    fridge(k.at(T(46.2, 0, -20.4) * Ry(180)))
    for i, (txt, col) in enumerate((('공유 하우스 규칙\n1. 밤 10시 이후 외출 금지\n2. 현관문에 손대지 말 것\n3. 수민이가 오면 숨을 것', 0xF8F4E8),
                                    ('D+1,247', 0xF8F080))):
        n_ = k.blk('FridgeNote', (1.4 if i == 0 else 1.0, 1.8 if i == 0 else 0.8, 0.03), (45.6 + i * 1.3, FL + 4.6 + i * 1.6, -21.72 + 2.62),
                   col, rot=Ry(180) * Rz((i - 0.5) * 6), **DEC)
        gui_text(n_, txt, 'Front', bg=col, fg=0x2A2826, font=9, ppu=60)
    sink(k.at(T(23, top_y, -20.4)))
    cooktop(k.at(T(34, top_y, -20.6)))
    range_hood(k.at(T(34, 0, -21.2) * Ry(180)))
    k.cyl('RiceCooker', 1.1, 1.4, (40.5, top_y + 0.55, -20.6), 0xF0F0EC, **NC)
    k.blk('Kettle', (0.9, 1.1, 0.9), (17.5, top_y + 0.55, -20.9), 0xC8CCD0, 'Metal', **NC)
    k.blk('DishRack', (2.0, 0.9, 1.3), (27, top_y + 0.45, -20.8), STEEL, 'Metal', **NC)
    for i in range(4):
        k.cyl('Plate', 1.2, 0.08, (26.4 + i * 0.4, top_y + 0.7, -20.8), 0xF0EDE6, axis='x', **DEC)
    k.blk('Board', (1.8, 0.12, 1.2), (30, top_y + 0.06, -20.4), 0xD8B07A, 'Wood', rot=Ry(8), **DEC)
    k.blk('Knife', (0.12, 0.04, 1.1), (30.4, top_y + 0.14, -20.4), STEEL, 'Metal', rot=Ry(30), **DEC)
    for i in range(6):
        k.blk('RamenStack', (1.0, 0.45, 1.0), (42.6, top_y + 0.22 + i * 0.45, -20.6), 0xE04020 if i % 2 else 0xF0C020, rot=Ry(R.uniform(-8, 8)), **NC)
    # island
    k.box('Island', 24, FL, -12.6, 36, top_y - 0.12, -9.6, 0x3A4A52, 'SmoothPlastic')
    k.box('IslandTop', 23.7, top_y - 0.12, -12.9, 36.3, top_y, -8.9, 0x3A3836, 'Granite')
    for x in (26.5, 30, 33.5):
        st = k.at(T(x, 0, -7.6))
        st.cyl('StoolSeat', 0.25, 1.4, (0, FL + 2.0, 0), 0x2A2826, 'Fabric')
        st.cyl('StoolPost', 1.9, 0.15, (0, FL + 1.0, 0), STEEL, 'Metal', **NC)
        st.cyl('StoolRing', 0.08, 1.0, (0, FL + 0.8, 0), STEEL, 'Metal', **DEC)
        st.cyl('StoolBase', 0.12, 1.1, (0, FL + 0.06, 0), STEEL, 'Metal', **NC)
    k.blk('FruitBowl', (1.6, 0.4, 1.6), (30, top_y + 0.2, -11), 0xD8D0C4, **NC)
    for i in range(3):
        k.ball('Fruit', 0.5, (29.6 + i * 0.4, top_y + 0.55, -11 + R.uniform(-0.2, 0.2)), R.choice([0xC03020, 0xE0A020, 0x6A9A2A]), **DEC)

    # ---------------- dining
    dining_set(s.at(T(24, 0, 4)))
    pendant(s, 22, 4)
    pendant(s, 26, 4)
    rug(s.at(T(24, 0, 4)), 11, 7.5, 0x6A5A4A, 0x7A6A56)
    frame(s.at(T(14.3, FL + 6, 4) * Ry(-90)), 5, 3.4, art=0x7A8A9A)
    Q.clock(s.at(T(14.3, FL + 8.9, -6) * Ry(-90)))
    switch(s, 14.3, -3.2, '+x')

    # ---------------- living
    lv = s.model('Living')
    rug(lv.at(T(50, 0, 19)), 15, 11, 0x4A4E52, 0x5A5E62)
    sofa(lv.at(T(44.6, 0, 20) * Ry(-90)), w=9, col=0x6A6458)
    coffee_table(lv.at(T(51, 0, 20)))
    tv_console(lv.at(T(60.9, 0, 21) * Ry(90)), w=8)
    armchair(lv.at(T(53, 0, 10.5) * Ry(160)), col=0x8A6A4A)
    floor_lamp(lv.at(T(45, 0, 13)))
    plant(lv.at(T(60, 0, 8.5)), h=5)
    bookcase(lv.at(T(39, 0, 26.1)), w=4.4, h=7.4)
    frame(lv.at(T(61.45, FL + 7.6, 12) * Ry(90)), 3, 2.2)
    for i in range(3):
        lv.blk('Pad', (0.8, 0.2, 0.5), (49 + i * 1.5, FL + 0.12, 24 - i * 0.6), 0x2A2A2A, rot=Ry(R.uniform(0, 90)), **DEC)
    switch(lv, 52, 26.7, '-z')
    # console behind the sofa, side table, standing AC, low divider shelf, wall shelf above the TV
    lv.blk('SofaConsole', (8, 0.2, 1.2), (42.8, FL + 2.5, 20), OAK, 'Wood', rot=Ry(90))
    for zz in (16.4, 23.6):
        lv.blk('SofaConsoleLeg', (1.0, 2.4, 0.2), (42.8, FL + 1.2, zz), OAK_D, 'Wood')
    lv.cyl('ConsoleLampBase', 0.9, 0.5, (42.8, FL + 3.05, 17.2), 0xC8B8A0, 'Concrete', **NC)
    lv.cyl('ConsoleLampShade', 0.9, 1.1, (42.8, FL + 3.9, 17.2), 0xF0E6D0, 'Fabric', **NC)
    P.bulb(lv, 42.8, FL + 3.7, 17.2, color=0xFFC890, bright=0.5, rng=10, d=0.25)
    for i in range(3):
        lv.blk('ConsoleBook', (1.2, 0.2, 0.9), (42.8, FL + 2.7 + i * 0.2, 22.6), [0x3A4A5A, 0xD8C8A8, 0x8A3A2A][i], 'Fabric', rot=Ry(i * 9), **DEC)
    st = lv.at(T(46, 0, 25.4))
    st.cyl('SideTable', 0.15, 1.6, (0, FL + 1.9, 0), OAK, 'Wood')
    st.cyl('SideTablePost', 1.8, 0.2, (0, FL + 0.95, 0), INK, 'Metal', **NC)
    st.cyl('SideTableFoot', 0.1, 1.0, (0, FL + 0.05, 0), INK, 'Metal', **NC)
    st.cyl('Glass', 0.6, 0.35, (0.3, FL + 2.3, 0.1), 0xC8E0E8, 'Glass', tr=0.35, **DEC)
    ac = lv.model('StandAC')
    ac.blk('Body', (1.8, 6.4, 1.4), (60.4, FL + 3.2, 25.4), 0xF4F4F0, 'SmoothPlastic')
    ac.blk('Vent', (1.4, 2.0, 0.05), (60.4, FL + 5.0, 24.68), 0x8A8E92, **DEC)
    for i in range(6):
        ac.blk('Louver', (1.4, 0.06, 0.08), (60.4, FL + 4.1 + i * 0.35, 24.64), 0xD8D8D4, **DEC)
    ac.blk('LED', (0.5, 0.15, 0.03), (60.4, FL + 3.3, 24.68), 0x2A6AC0, 'Neon', **DEC)
    dv = lv.model('DividerShelf')
    for xx in (34, 38, 42):
        dv.blk('Upright', (0.2, 4.2, 1.4), (xx, FL + 2.1, 9), 0x2A2826, 'Metal')
    for yy in (0.15, 2.0, 4.1):
        dv.blk('Board', (8.2, 0.15, 1.4), (38, FL + yy, 9), OAK, 'Wood')
    for xx in (35, 36.6, 39, 40.8):
        dv.blk('Item', (R.uniform(0.6, 1.2), R.uniform(0.8, 1.5), 0.8), (xx, FL + 2.6, 9), R.choice([0xD8D0C4, 0x6A8A9A, 0x3A4A5A, 0xB8A27A]), **NC)
    plant(dv.at(T(36.2, FL + 4.15 - FL, 9)), h=2.6)
    ws = lv.model('TVShelf')
    ws.blk('Shelf', (0.9, 0.15, 6), (61.3, FL + 7.2, 21), OAK, 'Wood')
    for i in range(4):
        ws.blk('Thing', (0.6, R.uniform(0.6, 1.2), 0.7), (61.2, FL + 7.6, 18.8 + i * 1.4), R.choice([0xD8D0C4, 0x3A4A5A, 0x8A6A4A, 0xC8B89A]), **DEC)


    # ---------------- corridor
    cr = s.model('Corridor')
    cr.blk('Runner', (60, 0.05, 3.2), (17, FL + 0.03, 30.5), 0x5A3A30, 'Fabric', **DEC)
    cr.blk('RunnerInner', (59, 0.055, 2.4), (17, FL + 0.035, 30.5), 0x7A4A3A, 'Fabric', **DEC)
    for x in (-10, 18, 46):
        frame(cr.at(T(x, FL + 6.2, 27.3) * Ry(180)), R.uniform(2.6, 4), R.uniform(2, 3))
    cr.blk('ConsoleTable', (5, 0.2, 1.4), (3.5, FL + 2.7, 33.0), OAK, 'Wood')
    for x in (1.2, 5.8):
        cr.blk('ConsoleLeg', (0.2, 2.6, 1.2), (x, FL + 1.3, 33.0), OAK_D, 'Wood')
    cr.blk('Keys', (0.5, 0.08, 0.3), (4.5, FL + 2.84, 32.8), 0xC9A24A, 'Metal', **DEC)
    cr.blk('Mail', (1.2, 0.2, 0.8), (2.5, FL + 2.9, 33.0), 0xF2F0EA, rot=Ry(10), **DEC)
    plant(cr.at(T(-22.6, 0, 28.6)), h=4)
    Q.extinguisher(cr.at(T(61.45, FL + 3, 30.5) * Ry(90)))

    # ---------------- bedrooms (spawns)
    personal = [
        lambda r, a, b2: Q.guitar(r.at(T(b2 - 1.0, FL - 0.4, 41) * Ry(-90))),
        lambda r, a, b2: bookcase(r.at(T(b2 - 0.9, 0, 40.6) * Ry(-90)), w=3.6, h=6),
        lambda r, a, b2: plant(r.at(T(b2 - 1.3, 0, 40.8)), h=4),
        lambda r, a, b2: Q.backpack(r.at(T(b2 - 1.2, FL - 0.4, 41) * Ry(-70))),
        lambda r, a, b2: Q.laundry_basket(r.at(T(b2 - 1.4, FL - 0.4, 41) * Ry(-90))),
    ]
    for i, (a, b2) in enumerate(ROOMS):
        r = s.model('Room%d' % (801 + i))
        cx = (a + b2) / 2
        bed(r.at(T(a + 2.75, 0, 49.2)), BED_COL[i])
        nightstand(r.at(T(a + 6.1, 0, 52.4)))
        desk(r.at(T(b2 - 1.5, 0, 46.5) * Ry(90)))
        wardrobe(r.at(T(b2 - 2.6, 0, 35.4) * Ry(180)))
        window_boarded(r, a + 11, 53.6, w=5)
        rug(r.at(T(cx - 1, 0, 43.5)), 6, 4.5, R.choice([0xC8B89A, 0x9AA0A8, 0xB8A0A0]))
        frame(r.at(T(a + 0.33, FL + 6.2, 46) * Ry(-90)), 2.4, 3.2)
        personal[i](r, a, b2)
        switch(r, a + 6.0, 34.3, '+z')
        Q.outlet(r.at(T(b2 - 0.27, FL + 1.0, 44) * Ry(90)))
        sp = g.blk('Spawn%d' % (i + 1), (5, 0.2, 5), (cx - 1, FL + 0.1, 42), OAK, 'WoodPlanks', cls='SpawnLocation', tags=['PlayerSpawn'])
        sp.prop('bool', 'Neutral', True)
        sp.prop('int', 'Duration', 0)
        sp.prop('float', 'Transparency', 1)
    # tally marks in 801 only — someone counted the days
    P.tally(s, -8.32, FL + 6.5, 40, '-x', groups=16, color=0x3A3632)

    # ---------------- room 806 (공유) — interior room, lamp-lit, unmade
    r6 = s.model('Room806')
    r6.box('Paint', -23.74, FL + 0.55, 10.26, -4.26, CH - 0.35, 10.3, ROOM_COL[5], **DEC)
    bed(r6.at(T(-19.6, 0, 14.4) * Ry(180)), BED_COL[5])
    nightstand(r6.at(T(-15.9, 0, 11.1) * Ry(180)), lamp_col=0xFFB070)
    desk(r6.at(T(-5.5, 0, 20) * Ry(90)))
    wardrobe(r6.at(T(-21.6, 0, 25.6)), w=4)
    for k_ in range(4):
        r6.blk('Clothes', (R.uniform(1, 1.8), 0.25, R.uniform(0.8, 1.3)), (R.uniform(-17, -9), FL + 0.13, R.uniform(12, 24)),
               R.choice([0x3A4A6A, 0xE8E8E8, 0x2A2A2A]), 'Fabric', rot=Ry(R.uniform(0, 180)), **DEC)
    frame(r6.at(T(-23.67, FL + 6, 19) * Ry(-90)), 3.2, 2.2, art=0x3A3A3A)
    sp = g.blk('Spawn6', (5, 0.2, 5), (-13, FL + 0.1, 19), OAK, 'WoodPlanks', cls='SpawnLocation', tags=['PlayerSpawn'])
    sp.prop('bool', 'Neutral', True)
    sp.prop('int', 'Duration', 0)
    sp.prop('float', 'Transparency', 1)

    # ---------------- bathroom
    bt = s.model('Bathroom')
    for z in range(11, 27, 2):
        bt.box('WallTileLine', -3.73, FL + 0.6, z - 0.02, -3.69, FL + 5.5, z + 0.02, 0xC8C8C4, **DEC)
    bt.box('Wainscot', -3.74, FL, 10.26, 13.74, FL + 5.5, 10.3, TILE_W, 'Marble', **DEC)
    toilet(bt.at(T(-1.5, 0, 12.2) * Ry(180)))
    vanity(bt.at(T(4.5, 0, 11.1) * Ry(180)))
    shower(bt.at(T(11.4, 0, 12.6)))
    for i, col in enumerate((0xF0F0F0, 0x6AA8D0, 0xE0A0B0)):
        bt.blk('Towel', (1.3, 2.4, 0.15), (-3.6 + 0.1, FL + 5.2, 18 + i * 1.6), col, 'Fabric', rot=Ry(90), **DEC)
    bt.blk('TowelRail', (0.1, 0.1, 5.2), (-3.55, FL + 6.5, 19.6), STEEL, 'Metal', **DEC)
    P.wall_text(bt, '나가고 싶어', -1.2, FL + 6.6, 10.34, '+z', 3, 0.7, fg=0x9A9A96, font=9)

    # ---------------- laundry / utility
    ld = s.model('Laundry')
    washer(ld.at(T(-21.6, 0, -20.4) * Ry(180)))
    washer(ld.at(T(-18.6, 0, -20.4) * Ry(180)))
    ld.box('Shelf', -23.6, FL + 6.2, -21.7, -13, FL + 6.4, -20.2, OAK, 'Wood')
    for i in range(5):
        ld.cyl('Bottle', 1.1, 0.6, (-23 + i * 1.6, FL + 6.95, -21), R.choice([0x2A6AC0, 0xF0F0F0, 0xE04040, 0x6AC0A0]), 'Plastic', **NC)
    for k_ in range(2):
        Q.laundry_basket(ld.at(T(-11 + k_ * 3, FL - 0.4, -20.5)))
    ld.beam('Line', (-23.5, FL + 8.5, 2), (-5, FL + 8.5, 2), 0.06, 0.06, 0xE8E8E8, **DEC)
    for i in range(8):
        x = -22 + i * 2.2
        ld.blk('Hung', (1.3, R.uniform(1.4, 2.4), 0.06), (x, FL + 7.4, 2), R.choice([0xF0F0F0, 0x6A8AC0, 0xE0A0B0, 0x3A3A3A]), 'Fabric', **DEC)
    downlight(ld, -14, -12, color=0xF4F8FF, bright=0.5, rng=12)

    # ---------------- planning room (someone hasn't left it)
    pr = s.model('PlanRoom')
    corkboard(pr.at(T(5, FL + 5.5, -21.72) * Ry(180)))
    pr.blk('Table', (7, 0.2, 3.4), (5, FL + 2.5, -14), OAK, 'Wood')
    for sx in (-3.2, 3.2):
        for sz in (-1.4, 1.4):
            pr.blk('Leg', (0.2, 2.4, 0.2), (5 + sx, FL + 1.2, -14 + sz), OAK_D, 'Wood')
    bp = pr.blk('Blueprint', (5, 0.03, 2.8), (5, FL + 2.62, -14), 0x2A4A8A, rot=Ry(4), **DEC)
    gui_text(bp, 'PSI 88F ─┐\n          └ B13 ▼', 'Top', bg=0x2A4A8A, fg=0xE8F0FF, font=10, ppu=30)
    pr.cyl('Mug', 0.45, 0.38, (7.6, FL + 2.85, -13.2), 0xE8E2D6, **NC)
    for i in range(5):
        pr.cyl('CoffeeCup', 0.5, 0.35, (R.uniform(1, 9), FL + 0.3, R.uniform(-20, -6)), 0xE8E2D6, axis='x', rot=Ry(R.uniform(0, 180)), **DEC)
    c = pr.at(T(5, 0, -10.8) * Ry(185))
    c.blk('Seat', (1.6, 0.18, 1.6), (0, FL + 1.55, 0), OAK, 'Wood')
    c.blk('Back', (1.6, 1.9, 0.15), (0, FL + 2.55, 0.7), OAK, 'Wood')
    for lx in (-0.65, 0.65):
        for lz in (-0.65, 0.65):
            c.blk('Leg', (0.15, 1.5, 0.15), (lx, FL + 0.78, lz), OAK_D, 'Wood', **NC)
    from vignettes import escape_kit
    escape_kit(pr.at(T(10.5, FL, -3.5) * Ry(-30)))
    pr.blk('SleepingBag', (2.6, 0.4, 6), (0.2, FL + 0.2, -17.5), 0x3A5A7A, 'Fabric', rot=Ry(78))
    P.bulb(pr, 8.6, FL + 3.4, -15.2, color=0xFFC080, bright=0.6, rng=12, d=0.3, shadows=True)
    pr.blk('DeskLamp', (0.3, 0.9, 0.3), (8.6, FL + 3.0, -15.2), INK, 'Metal', **NC)

    # ---------------- boiler room
    bo = s.model('BoilerRoom')
    bo.blk('Boiler', (2.6, 4, 1.4), (59, FL + 6, 52.8), 0xF0F0EC, 'Metal')
    for x in (58.4, 59.6):
        bo.blk('Pipe', (0.25, 5.6, 0.25), (x, FL + 2.8, 52.6), 0xB8762A, 'Metal', **NC)
    bo.blk('Panel', (0.8, 0.5, 0.1), (59, FL + 5.4, 52.04), 0x1A2A1A, **DEC)
    Q.mop_bucket(bo.at(T(58, FL - 0.4, 38) * Ry(180)))
    Q.boxes(bo.at(T(59, FL - 0.4, 46)))

    # ---------------- outside the flat: dark, empty office the tenants never see
    out = s.model('SealedOffice')
    for x, z in ((-50, -30), (-60, 10), (-45, 30), (20, -40), (-10, -40)):
        P.desk(out.at(T(x, 0, z) * Ry(R.uniform(-30, 30))), chair_=False, clutter=False, monitor=R.random() < 0.5)
    P.boxes_pile(out.at(T(-70, 0, -45)), n=6, r=3)
    for _ in range(25):
        Q.d_dust(out.at(T(R.uniform(-75, -30), 0, R.uniform(-50, 50))))
    P.emergency_light(out, -78.4, 10, -20, '+x', color=0xFF2A1A, bright=0.6, rng=14)
