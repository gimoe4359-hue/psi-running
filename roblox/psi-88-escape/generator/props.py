"""Reusable furniture / prop builders.

Convention: every prop is built around its own origin, y=0 is the floor,
and the prop "faces" -Z (a chair's sitter looks toward -Z, a TV screen
faces -Z, a desk's user sits on the -Z side).
"""
import random
from rbx import T, Rx, Ry, Rz, light, gui_text, particles, FACING_YAW

R = random.Random(8888)

# ---------------------------------------------------------------- palette
WOOD = 0x6B4A2F
WOOD_L = 0xA07A52
WOOD_D = 0x3E2A1C
WHITE = 0xE9E6DF
OFFWHITE = 0xD6D0C4
GREY = 0x8C8C8C
DGREY = 0x3C3D40
BLACK = 0x18181A
STEEL = 0x9AA0A6
RED = 0x9E1B1B
BLOOD = 0x5E0A0C
BLOOD_D = 0x3A0507
GOLD = 0xC9A24A
SCREEN = 0x0E1418


def at(b, x, z, rot=0, y=0):
    return b.at(T(x, y, z) * Ry(rot))


def face_at(b, x, y, z, facing):
    return b.at(T(x, y, z) * Ry(FACING_YAW[facing]))


# ---------------------------------------------------------------- signs
def sign(b, text, x, y, z, facing, w, h, bg=0x15171A, fg=0xFFFFFF, glow=False, bg_tr=0.0,
         thick=0.15, mat='SmoothPlastic', name='Sign', font=19, ppu=40, part_tr=0.0, stroke=1.0):
    sb = face_at(b, x, y, z, facing)
    p = sb.part(name, (w, h, thick), T(), bg, mat, tr=part_tr, collide=False, shadow=False)
    gui_text(p, text, 'Front', bg=bg, fg=fg, bg_tr=bg_tr, glow=glow, font=font, ppu=ppu, stroke=stroke)
    return p


def wall_text(b, text, x, y, z, facing, w, h, fg=0x7A0A0A, font=9, name='Graffiti'):
    """Painted text directly on a wall (transparent carrier part)."""
    sb = face_at(b, x, y, z, facing)
    p = sb.part(name, (w, h, 0.05), T(), 0x000000, tr=1, collide=False, shadow=False, touch=False, query=False)
    gui_text(p, text, 'Front', fg=fg, bg_tr=1, font=font, ppu=30)
    return p


# ---------------------------------------------------------------- lighting fixtures
def ceiling_light(b, x, z, ceil, color=0xFFF1DE, bright=1.2, rng=20, shadows=False, size=(4, 1.2),
                  neon=0xFFF6EA, broken=False, name='CeilingLight'):
    p = b.blk(name, (size[0], 0.2, size[1]), (x, ceil - 0.15, z), neon if not broken else 0x5A5A5A,
              'Neon' if not broken else 'SmoothPlastic', collide=False, shadow=False)
    b.blk('Housing', (size[0] + 0.3, 0.15, size[1] + 0.3), (x, ceil - 0.02, z), 0xCFCFCF, 'Metal',
          collide=False, shadow=False)
    if not broken:
        light(p, 'SurfaceLight', color, bright, rng, shadows, 'Bottom', 120)
    return p


def bulb(b, x, y, z, color=0xFFC98A, bright=1.2, rng=14, shadows=False, cord=0, d=0.6):
    if cord:
        b.blk('Cord', (0.08, cord, 0.08), (x, y + d / 2 + cord / 2, z), BLACK, collide=False, shadow=False)
    p = b.ball('Bulb', d, (x, y, z), color, 'Neon', collide=False, shadow=False)
    light(p, 'PointLight', color, bright, rng, shadows)
    return p


def pendant(b, x, z, ceil, drop=4, color=0xFFD9A0, bright=1.4, rng=18, shade=0x222222, shadows=False):
    y = ceil - drop
    b.blk('Cord', (0.08, drop, 0.08), (x, ceil - drop / 2, z), BLACK, collide=False, shadow=False)
    b.cyl('Shade', 1.2, 2.2, (x, y + 0.4, z), shade, 'Metal', collide=False)
    return bulb(b, x, y - 0.1, z, color, bright, rng, shadows)


def emergency_light(b, x, y, z, facing, color=0xFF2A1A, bright=1.5, rng=18):
    sb = face_at(b, x, y, z, facing)
    sb.part('EmergencyBox', (1.4, 0.6, 0.4), T(), 0xEDEDED, collide=False, shadow=False)
    p = sb.part('EmergencyLamp', (1.1, 0.35, 0.1), T(0, 0, -0.22), color, 'Neon', collide=False, shadow=False)
    light(p, 'PointLight', color, bright, rng, False)
    return p


def exit_sign(b, x, y, z, facing, text='비상구 EXIT'):
    p = sign(b, text, x, y, z, facing, 3.2, 1.1, bg=0x0E7A3A, fg=0xFFFFFF, glow=True, name='ExitSign')
    light(p, 'PointLight', 0x2AFF7A, 0.6, 8)
    return p


# ---------------------------------------------------------------- seating / tables
def chair(b, color=WOOD, seat_h=1.9, w=1.8, tipped=False, name='Chair'):
    c = b.model(name)
    if tipped:
        c = c.at(T(0, 0.9, 0) * Rx(-90) * T(0, -0.9, 0))
    c.blk('Seat', (w, 0.25, w), (0, seat_h, 0), color, 'Wood')
    for sx in (-1, 1):
        for sz in (-1, 1):
            c.blk('Leg', (0.2, seat_h, 0.2), (sx * (w / 2 - 0.15), seat_h / 2, sz * (w / 2 - 0.15)), color, 'Wood')
    c.blk('Back', (w, 2.0, 0.2), (0, seat_h + 1.1, w / 2 - 0.1), color, 'Wood')
    return c


def office_chair(b, color=BLACK, name='OfficeChair'):
    c = b.model(name)
    c.blk('Seat', (1.9, 0.35, 1.9), (0, 2.0, 0), color, 'Fabric')
    c.blk('Back', (1.8, 2.2, 0.3), (0, 3.3, 0.9), color, 'Fabric', rot=Rx(-8))
    c.cyl('Post', 1.6, 0.25, (0, 1.1, 0), DGREY, 'Metal')
    c.blk('BaseA', (2.2, 0.2, 0.3), (0, 0.3, 0), DGREY, 'Metal')
    c.blk('BaseB', (0.3, 0.2, 2.2), (0, 0.3, 0), DGREY, 'Metal')
    return c


def stool(b, color=0x2A2A2A, h=2.6):
    s = b.model('Stool')
    s.cyl('Seat', 0.3, 1.5, (0, h, 0), color, 'Fabric')
    s.cyl('Post', h, 0.25, (0, h / 2, 0), STEEL, 'Metal')
    s.cyl('Foot', 0.2, 1.3, (0, 0.1, 0), STEEL, 'Metal')
    return s


def table(b, w=6, d=3.5, h=3.0, color=WOOD, mat='Wood', leg=DGREY, cloth=None, name='Table'):
    t = b.model(name)
    t.blk('Top', (w, 0.25, d), (0, h - 0.125, 0), color, mat)
    for sx in (-1, 1):
        for sz in (-1, 1):
            t.blk('Leg', (0.25, h - 0.25, 0.25), (sx * (w / 2 - 0.3), (h - 0.25) / 2, sz * (d / 2 - 0.3)), leg, 'Metal')
    if cloth is not None:
        t.blk('Cloth', (w + 0.4, 0.05, d + 0.4), (0, h + 0.02, 0), cloth, 'Fabric')
        t.blk('ClothDrapeA', (w + 0.4, 1.2, 0.05), (0, h - 0.6, d / 2 + 0.2), cloth, 'Fabric')
        t.blk('ClothDrapeB', (w + 0.4, 1.2, 0.05), (0, h - 0.6, -d / 2 - 0.2), cloth, 'Fabric')
    return t


def round_table(b, d=4, h=3, color=WOOD, mat='Wood', cloth=None):
    t = b.model('RoundTable')
    t.cyl('Top', 0.25, d, (0, h - 0.125, 0), color if cloth is None else cloth, mat if cloth is None else 'Fabric')
    t.cyl('Post', h - 0.25, 0.4, (0, (h - 0.25) / 2, 0), DGREY, 'Metal')
    t.cyl('Foot', 0.2, 1.8, (0, 0.1, 0), DGREY, 'Metal')
    return t


def sofa(b, w=7, color=0x4A4F57, name='Sofa'):
    s = b.model(name)
    s.blk('Base', (w, 1.4, 3.2), (0, 0.9, 0), color, 'Fabric')
    s.blk('Cushion', (w - 1.2, 0.5, 2.6), (0, 1.85, -0.2), color, 'Fabric')
    s.blk('Back', (w, 2.4, 0.8), (0, 2.2, 1.2), color, 'Fabric')
    for sx in (-1, 1):
        s.blk('Arm', (0.6, 2.0, 3.2), (sx * (w / 2 - 0.3), 1.6, 0), color, 'Fabric')
    for sx in (-1, 1):
        for sz in (-1, 1):
            s.blk('Foot', (0.3, 0.2, 0.3), (sx * (w / 2 - 0.4), 0.1, sz * 1.3), WOOD_D, 'Wood')
    return s


def bed(b, w=4.5, l=8, blanket=0x6E7F8F, frame=WOOD, name='Bed', messy=True):
    m = b.model(name)
    m.blk('Frame', (w + 0.4, 1.0, l + 0.4), (0, 0.6, 0), frame, 'Wood')
    m.blk('Mattress', (w, 0.8, l), (0, 1.5, 0), 0xE8E4DA, 'Fabric')
    m.blk('Headboard', (w + 0.4, 3.5, 0.4), (0, 1.75, l / 2 + 0.2), frame, 'Wood')
    m.blk('Pillow', (w - 1, 0.5, 1.4), (0, 2.1, l / 2 - 1.1), 0xF4F1EA, 'Fabric')
    rot = Ry(R.uniform(-8, 8)) if messy else None
    m.blk('Blanket', (w + 0.2, 0.25, l * 0.6), (0, 2.0, -l * 0.15), blanket, 'Fabric', rot=rot)
    return m


def floor_mattress(b, w=4, l=7.5, color=0xD8D2C2, blanket=0x5B6B5A):
    m = b.model('FloorMattress')
    m.blk('Mattress', (w, 0.7, l), (0, 0.35, 0), color, 'Fabric')
    m.blk('Pillow', (w - 1, 0.4, 1.2), (0, 0.9, l / 2 - 1), 0xEFEBE2, 'Fabric')
    m.blk('Blanket', (w + 0.3, 0.2, l * 0.55), (0.2, 0.8, -l * 0.15), blanket, 'Fabric', rot=Ry(R.uniform(-15, 15)))
    return m


# ---------------------------------------------------------------- office
def desk(b, w=6, d=3, h=3.1, top=0xD9D4CA, frame=DGREY, monitor=True, chair_=True, screen_text=None,
         nameplate=None, clutter=True, name='Desk'):
    m = b.model(name)
    m.blk('Top', (w, 0.2, d), (0, h - 0.1, 0), top, 'Wood')
    for sx in (-1, 1):
        m.blk('Side', (0.2, h - 0.2, d - 0.2), (sx * (w / 2 - 0.15), (h - 0.2) / 2, 0), frame, 'Metal')
    m.blk('Modesty', (w - 0.4, 1.6, 0.1), (0, h - 1.2, d / 2 - 0.2), frame, 'Metal')
    if monitor:
        m.blk('MonStand', (0.4, 0.8, 0.4), (0, h + 0.4, d / 2 - 0.7), BLACK, 'Metal')
        scr = m.blk('Monitor', (2.8, 1.7, 0.15), (0, h + 1.5, d / 2 - 0.75), BLACK, 'SmoothPlastic')
        if screen_text:
            gui_text(scr, screen_text, 'Front', bg=0x0B2238, fg=0x8FD3FF, glow=True, font=10, ppu=30)
        m.blk('Keyboard', (1.8, 0.08, 0.6), (0, h + 0.04, -0.2), 0x2B2B2B)
        m.blk('Mouse', (0.25, 0.1, 0.4), (1.3, h + 0.05, -0.2), 0x2B2B2B)
    if clutter:
        for _ in range(R.randint(1, 3)):
            m.blk('Paper', (0.85, 0.02, 1.1), (R.uniform(-w / 2 + 0.6, w / 2 - 0.6), h + 0.01, R.uniform(-d / 2 + 0.6, d / 2 - 0.6)),
                  0xF2F0EA, rot=Ry(R.uniform(0, 360)), collide=False)
        if R.random() < 0.5:
            m.cyl('Mug', 0.5, 0.4, (w / 2 - 0.6, h + 0.25, -0.5), R.choice([0xFFFFFF, 0xC04040, 0x305080]), 'SmoothPlastic', collide=False)
    if nameplate:
        p = m.blk('Nameplate', (1.8, 0.45, 0.12), (-w / 2 + 1.2, h + 0.25, -d / 2 + 0.25), 0x1C1C1C, 'Metal', rot=Rx(-15))
        gui_text(p, nameplate, 'Front', bg=0x1C1C1C, fg=0xE8D9A8, font=19, ppu=60)
    if chair_:
        office_chair(b.at(T(0, 0, -d / 2 - 1.1) * Ry(180)))
    return m


def cubicle(b, w=8, d=8, h=6, color=0x6D7178, openside='-z'):
    """Three-sided cubicle partition around origin, open toward `openside`."""
    m = b.model('Cubicle')
    sides = {'-z': (0, -d / 2, w, 0.3), '+z': (0, d / 2, w, 0.3), '-x': (-w / 2, 0, 0.3, d), '+x': (w / 2, 0, 0.3, d)}
    for k, (x, z, sx, sz) in sides.items():
        if k != openside:
            m.blk('Panel', (sx, h, sz), (x, h / 2, z), color, 'Fabric')
            m.blk('Cap', (sx + 0.05, 0.12, sz + 0.05), (x, h + 0.06, z), 0x9A9EA4, 'Metal')
    return m


def filing_cabinet(b, h=4.5, color=0x7E8288, open_=False):
    m = b.model('FilingCabinet')
    m.blk('Body', (1.8, h, 2.4), (0, h / 2, 0), color, 'Metal')
    n = int(h // 1.4)
    for i in range(n):
        y = 0.8 + i * (h - 0.4) / n
        m.blk('Handle', (0.8, 0.12, 0.1), (0, y, -1.25), STEEL, 'Metal')
    if open_:
        m.blk('Drawer', (1.6, 1.0, 1.8), (0, h - 0.9, -1.9), color, 'Metal')
    return m


def shelf(b, w=8, d=2, h=10, levels=5, kind='books', color=WOOD_D, mat='Wood', name='Shelf'):
    m = b.model(name)
    m.blk('SideL', (0.25, h, d), (-w / 2 + 0.125, h / 2, 0), color, mat)
    m.blk('SideR', (0.25, h, d), (w / 2 - 0.125, h / 2, 0), color, mat)
    m.blk('BackPanel', (w, h, 0.15), (0, h / 2, d / 2 - 0.075), color, mat)
    step = (h - 0.4) / levels
    for i in range(levels + 1):
        y = 0.2 + i * step
        m.blk('Board', (w - 0.5, 0.18, d - 0.1), (0, y, 0), color, mat)
        if i == levels:
            break
        x = -w / 2 + 0.4
        if kind == 'books':
            while x < w / 2 - 1.0:
                bw = R.uniform(1.4, 2.6)
                bh = step * R.uniform(0.6, 0.85)
                if R.random() < 0.85:
                    m.blk('Books', (bw, bh, d * 0.7), (x + bw / 2, y + 0.09 + bh / 2, -0.05),
                          R.choice([0x7A2B2B, 0x2B4A7A, 0x3D5E3A, 0x6B5A3A, 0x40303A, 0x8A7A5A, 0x2A2A2A]), 'Fabric')
                x += bw + R.uniform(0.1, 0.8)
        elif kind == 'boxes':
            while x < w / 2 - 1.3:
                bw = R.uniform(1.8, 2.6)
                bh = step * R.uniform(0.55, 0.8)
                if R.random() < 0.8:
                    m.blk('Box', (bw, bh, d * 0.8), (x + bw / 2, y + 0.09 + bh / 2, 0),
                          R.choice([0xB89A6A, 0xA88A5A, 0xC8B08A, 0xE8E4DA]), 'Fabric', rot=Ry(R.uniform(-4, 4)))
                x += bw + 0.15
        elif kind == 'bottles':
            while x < w / 2 - 0.6:
                bh = R.uniform(0.6, 1.2)
                m.cyl('Bottle', bh, 0.45, (x + 0.25, y + 0.09 + bh / 2, R.uniform(-0.3, 0.2)),
                      R.choice([0x7A4A1A, 0xE8E8E8, 0x3A6A8A, 0x8A2A2A, 0xC8C8A0]),
                      'Glass', tr=0.15, collide=False)
                x += R.uniform(0.5, 1.0)
    return m


def plant(b, h=4.5, pot=0x4A4A4A, leaf=0x3E6B35, dead=False):
    m = b.model('Plant')
    m.cyl('Pot', 1.6, 1.6, (0, 0.8, 0), pot, 'Concrete')
    m.cyl('Soil', 0.1, 1.4, (0, 1.6, 0), 0x2E2016, 'Ground')
    col = 0x6B5A3A if dead else leaf
    m.blk('Stem', (0.2, h - 1.6, 0.2), (0, 1.6 + (h - 1.6) / 2, 0), 0x4A3A22, 'Wood')
    for i in range(5):
        dx, dz = R.uniform(-0.7, 0.7), R.uniform(-0.7, 0.7)
        m.ball('Leaves', R.uniform(1.4, 2.2), (dx, h - R.uniform(0, 1.6), dz), col, 'Grass')
    return m


def counter(b, w=10, d=2.6, h=3.2, body=0xEDEAE4, top=0x2E2E30, top_mat='Granite'):
    m = b.model('Counter')
    m.blk('Body', (w, h - 0.2, d), (0, (h - 0.2) / 2, 0), body, 'Wood')
    m.blk('Top', (w + 0.2, 0.2, d + 0.2), (0, h - 0.1, 0), top, top_mat)
    return m


def fridge(b, color=0xD8D8D8):
    m = b.model('Fridge')
    m.blk('Body', (3, 6.5, 2.6), (0, 3.25, 0), color, 'Metal')
    m.blk('Seam', (3.02, 0.06, 2.62), (0, 4.4, 0), 0x9A9A9A, 'Metal')
    m.blk('Handle', (0.12, 1.6, 0.15), (1.1, 5.2, -1.38), STEEL, 'Metal')
    m.blk('Handle2', (0.12, 1.6, 0.15), (1.1, 3.4, -1.38), STEEL, 'Metal')
    return m


def tv(b, w=6, h=3.4, stand=True, text=None):
    m = b.model('TV')
    if stand:
        m.blk('Stand', (w + 1, 2, 2), (0, 1, 0), WOOD_D, 'Wood')
    scr = m.blk('Screen', (w, h, 0.25), (0, 2 + h / 2 + 0.3, 0.2), BLACK)
    if text:
        gui_text(scr, text, 'Front', bg=0x1A1A1A, fg=0x9A9A9A, glow=True, font=10, ppu=25)
    return m


def locker_row(b, n=6, color=0x5A6E7A, h=7):
    m = b.model('Lockers')
    w = 1.6
    for i in range(n):
        x = (i - (n - 1) / 2) * w
        m.blk('Locker', (w - 0.05, h, 1.8), (x, h / 2, 0), color, 'Metal')
        m.blk('Vent', (0.9, 0.5, 0.05), (x, h - 1, -0.92), 0x3A3A3A, 'Metal')
        m.blk('Handle', (0.1, 0.6, 0.1), (x + 0.5, h / 2, -0.95), STEEL, 'Metal')
    return m


# ---------------------------------------------------------------- doors
def door(b, w=4, h=8, color=WOOD, frame=0xE0DCD4, open_deg=0, locked=False, name='Door', window=False):
    """Door centred on origin in a wall that runs along X (wall thickness ~0.6).

    open_deg rotates the leaf around its hinge (at -X side) into -Z.
    """
    m = b.model(name)
    m.blk('FrameL', (0.3, h, 0.8), (-w / 2 - 0.15, h / 2, 0), frame, 'Wood')
    m.blk('FrameR', (0.3, h, 0.8), (w / 2 + 0.15, h / 2, 0), frame, 'Wood')
    m.blk('FrameT', (w + 0.6, 0.3, 0.8), (0, h + 0.15, 0), frame, 'Wood')
    lb = m.at(T(-w / 2, 0, 0) * Ry(open_deg) * T(w / 2, 0, 0))
    leaf = lb.blk('Leaf', (w - 0.1, h - 0.1, 0.25), (0, h / 2, 0), color, 'Wood')
    lb.blk('Knob', (0.3, 0.3, 0.5), (w / 2 - 0.5, h / 2 - 0.4, 0), STEEL, 'Metal', collide=False)
    if window:
        lb.blk('Window', (w * 0.4, h * 0.25, 0.3), (0, h * 0.68, 0), 0x9FB8C0, 'Glass', tr=0.5)
    if locked:
        lb.blk('Padlock', (0.5, 0.6, 0.6), (w / 2 - 0.5, h / 2 - 1.2, -0.35), GOLD, 'Metal', collide=False)
    return m


def chains_x(b, w, h, z=-0.4):
    """Two chains crossing a door opening that lies in the XY plane."""
    m = b.model('Chains')
    m.beam('Chain', (-w / 2 - 0.3, h * 0.12, z), (w / 2 + 0.3, h * 0.82, z), 0.35, 0.35, 0x5A5650, 'CorrodedMetal', collide=False)
    m.beam('Chain', (-w / 2 - 0.3, h * 0.82, z), (w / 2 + 0.3, h * 0.12, z), 0.35, 0.35, 0x5A5650, 'CorrodedMetal', collide=False)
    m.beam('Chain', (-w / 2 - 0.3, h * 0.47, z - 0.1), (w / 2 + 0.3, h * 0.47, z - 0.1), 0.35, 0.35, 0x5A5650, 'CorrodedMetal', collide=False)
    m.blk('Padlock', (0.9, 1.1, 0.5), (0, h * 0.47, z - 0.4), GOLD, 'Metal', collide=False)
    return m


# ---------------------------------------------------------------- mess & horror
def rubble(b, n=10, r=3, color=0x9A968E, smin=0.6, smax=2.4, mat='Concrete'):
    m = b.model('Rubble')
    for _ in range(n):
        s = (R.uniform(smin, smax), R.uniform(smin * 0.5, smax * 0.6), R.uniform(smin, smax))
        x, z = R.uniform(-r, r), R.uniform(-r, r)
        m.blk('Chunk', s, (x, s[1] * 0.35, z), color, mat,
              rot=Ry(R.uniform(0, 360)) * Rx(R.uniform(-25, 25)) * Rz(R.uniform(-25, 25)))
    return m


def splat(b, x, z, r=1.5, y=0.02, color=BLOOD, name='Stain'):
    return b.cyl(name, 0.04, r * 2, (x, y, z), color, 'SmoothPlastic', refl=0.08, collide=False, shadow=False,
                 touch=False, query=False)


def wall_splat(b, x, y, z, facing, r=1.0, color=BLOOD):
    axis = 'x' if facing in ('-x', '+x') else 'z'
    return b.cyl('WallStain', 0.04, r * 2, (x, y, z), color, 'SmoothPlastic', axis=axis, collide=False,
                 shadow=False, touch=False, query=False)


def drips(b, x, y, z, facing, n=4, color=BLOOD, w=2.0):
    """Vertical drip streaks on a wall."""
    for i in range(n):
        L = R.uniform(0.8, 3.0)
        off = (i - (n - 1) / 2) * (w / n) + R.uniform(-0.15, 0.15)
        if facing in ('-x', '+x'):
            b.blk('Drip', (0.04, L, 0.18), (x, y - L / 2, z + off), color, collide=False, shadow=False, touch=False, query=False)
        else:
            b.blk('Drip', (0.18, L, 0.04), (x + off, y - L / 2, z), color, collide=False, shadow=False, touch=False, query=False)


def handprint(b, x, y, z, facing, color=BLOOD):
    sb = face_at(b, x, y, z, facing)
    sb.part('Hand', (0.9, 1.0, 0.04), T(), color, collide=False, shadow=False, touch=False, query=False)
    for i in range(4):
        sb.part('Finger', (0.16, 0.6, 0.04), T(-0.33 + i * 0.22, 0.75, 0) * Rz((i - 1.5) * 8), color,
                collide=False, shadow=False, touch=False, query=False)
    sb.part('Thumb', (0.16, 0.5, 0.04), T(0.6, 0.2, 0) * Rz(-50), color, collide=False, shadow=False, touch=False, query=False)


def tally(b, x, y, z, facing, groups=8, color=0x2A2A2A):
    """Prison-style tally marks (groups of 5) painted on a wall."""
    sb = face_at(b, x, y, z, facing)
    for g in range(groups):
        gx = (g % 4) * 1.6 - 2.4
        gy = -(g // 4) * 1.4
        for i in range(4):
            sb.part('Mark', (0.08, 1.0, 0.03), T(gx + i * 0.25, gy, 0), color, collide=False, shadow=False, touch=False, query=False)
        sb.part('Mark', (0.08, 1.25, 0.03), T(gx + 0.37, gy, 0) * Rz(60), color, collide=False, shadow=False, touch=False, query=False)


def scribbles(b, x, y, z, facing, n=10, w=6, h=3, colors=(0xD03030, 0x3050D0, 0x202020, 0xE0A020)):
    sb = face_at(b, x, y, z, facing)
    for _ in range(n):
        sb.part('Crayon', (R.uniform(0.6, 2.2), 0.12, 0.03), T(R.uniform(-w / 2, w / 2), R.uniform(-h / 2, h / 2), 0) * Rz(R.uniform(0, 180)),
                R.choice(colors), collide=False, shadow=False, touch=False, query=False)


def bars_along_x(b, x0, x1, z, y0, y1, step=1.4, d=0.22, color=0x3A3836, mat='CorrodedMetal', name='Bars'):
    m = b.model(name)
    n = int((x1 - x0) / step)
    for i in range(n + 1):
        m.cyl('Bar', y1 - y0, d, (x0 + i * (x1 - x0) / max(n, 1), (y0 + y1) / 2, z), color, mat)
    m.blk('RailTop', (x1 - x0, 0.3, 0.3), ((x0 + x1) / 2, y1 - 0.4, z), color, mat)
    m.blk('RailBot', (x1 - x0, 0.3, 0.3), ((x0 + x1) / 2, y0 + 0.4, z), color, mat)
    return m


def bars_along_z(b, z0, z1, x, y0, y1, step=1.4, d=0.22, color=0x3A3836, mat='CorrodedMetal', name='Bars'):
    m = b.model(name)
    n = int((z1 - z0) / step)
    for i in range(n + 1):
        m.cyl('Bar', y1 - y0, d, (x, (y0 + y1) / 2, z0 + i * (z1 - z0) / max(n, 1)), color, mat)
    m.blk('RailTop', (0.3, 0.3, z1 - z0), (x, y1 - 0.4, (z0 + z1) / 2), color, mat)
    m.blk('RailBot', (0.3, 0.3, z1 - z0), (x, y0 + 0.4, (z0 + z1) / 2), color, mat)
    return m


def boxes_pile(b, n=6, r=3, colors=(0xB89A6A, 0xA88A5A, 0xC8B08A)):
    m = b.model('Boxes')
    y_at = {}
    for i in range(n):
        s = R.uniform(1.6, 3.0)
        x, z = R.uniform(-r, r), R.uniform(-r, r)
        key = (round(x / 3), round(z / 3))
        base = y_at.get(key, 0)
        m.blk('Box', (s, s * 0.8, s), (x, base + s * 0.4, z), R.choice(colors), 'Fabric', rot=Ry(R.uniform(0, 30)))
        y_at[key] = base + s * 0.8
    return m


def gurney(b, color=0xC8CCD0, sheet=0xE8E8E0, stained=False):
    m = b.model('Gurney')
    m.blk('Bed', (3, 0.4, 7), (0, 3, 0), color, 'Metal')
    m.blk('Mat', (2.8, 0.4, 6.8), (0, 3.4, 0), sheet, 'Fabric')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Leg', (0.15, 2.8, 0.15), (sx * 1.3, 1.4, sz * 3.2), STEEL, 'Metal')
            m.cyl('Wheel', 0.2, 0.5, (sx * 1.3, 0.25, sz * 3.2), BLACK, 'Plastic', axis='x')
    if stained:
        splat(m, 0.3, -0.5, 0.9, y=3.62)
    return m


def wheelchair(b, tipped=False):
    m = b.model('Wheelchair')
    if tipped:
        m = m.at(T(0, 1.2, 0) * Rz(85) * T(0, -1.2, 0))
    m.blk('Seat', (2, 0.2, 2), (0, 1.8, 0), 0x2A2A2A, 'Fabric')
    m.blk('Back', (2, 2, 0.2), (0, 2.9, 1), 0x2A2A2A, 'Fabric')
    for sx in (-1, 1):
        m.cyl('Wheel', 0.15, 2.6, (sx * 1.15, 1.3, 0.3), DGREY, 'Metal', axis='x')
        m.cyl('Caster', 0.15, 0.6, (sx * 0.8, 0.3, -1), BLACK, 'Plastic', axis='x')
    return m


def iv_stand(b):
    m = b.model('IVStand')
    m.cyl('Pole', 6, 0.15, (0, 3, 0), STEEL, 'Metal')
    m.blk('Hook', (1.2, 0.1, 0.1), (0, 6, 0), STEEL, 'Metal')
    m.blk('Bag', (0.6, 0.9, 0.2), (0.5, 5.4, 0), 0xC8E0E8, 'Glass', tr=0.3)
    m.blk('BaseA', (1.6, 0.15, 0.2), (0, 0.1, 0), STEEL, 'Metal')
    m.blk('BaseB', (0.2, 0.15, 1.6), (0, 0.1, 0), STEEL, 'Metal')
    return m


def mannequin(b, suit=0x1C1E24, shirt=0xE8E4DA, tie=0x7A1020, skin=0xD8CFC4, headless=False):
    m = b.model('Mannequin')
    m.cyl('Base', 0.2, 1.6, (0, 0.1, 0), BLACK, 'Metal')
    m.cyl('Pole', 2.4, 0.2, (0, 1.3, 0), STEEL, 'Metal')
    m.blk('LegL', (0.7, 2.6, 0.7), (-0.4, 2.0, 0), suit, 'Fabric')
    m.blk('LegR', (0.7, 2.6, 0.7), (0.4, 2.0, 0), suit, 'Fabric')
    m.blk('Torso', (2.0, 2.4, 1.0), (0, 4.5, 0), suit, 'Fabric')
    m.blk('Shirt', (0.6, 1.6, 0.05), (0, 4.9, -0.51), shirt, 'Fabric')
    m.blk('Tie', (0.25, 1.4, 0.05), (0, 4.8, -0.54), tie, 'Fabric')
    m.blk('ArmL', (0.6, 2.3, 0.6), (-1.3, 4.3, 0), suit, 'Fabric')
    m.blk('ArmR', (0.6, 2.3, 0.6), (1.3, 4.3, 0), suit, 'Fabric')
    if not headless:
        m.ball('Head', 1.3, (0, 6.4, 0), skin, 'SmoothPlastic')
    return m


def teddy(b, s=1.0, color=0x8A6A4A, eye=BLACK, torn=False):
    m = b.model('Teddy')
    m.ball('Body', 2.4 * s, (0, 1.3 * s, 0), color, 'Fabric')
    m.ball('Head', 1.8 * s, (0, 3.0 * s, 0), color, 'Fabric')
    for sx in (-1, 1):
        m.ball('Ear', 0.7 * s, (sx * 0.7 * s, 3.8 * s, 0), color, 'Fabric')
        m.ball('Arm', 0.9 * s, (sx * 1.2 * s, 1.6 * s, -0.2 * s), color, 'Fabric')
        m.ball('Leg', 1.0 * s, (sx * 0.7 * s, 0.4 * s, -0.6 * s), color, 'Fabric')
        if not (torn and sx > 0):
            m.ball('Eye', 0.25 * s, (sx * 0.35 * s, 3.2 * s, -0.8 * s), eye, 'SmoothPlastic')
    m.ball('Snout', 0.7 * s, (0, 2.85 * s, -0.75 * s), 0xC8A882, 'Fabric')
    if torn:
        m.blk('Stuffing', (0.6 * s, 0.5 * s, 0.4 * s), (0.4 * s, 1.6 * s, -1.1 * s), 0xF0F0F0, 'Fabric')
    return m


def balloon(b, x, z, y, color):
    b.ball('Balloon', 1.6, (x, y, z), color, 'SmoothPlastic', refl=0.15, collide=False)
    b.blk('String', (0.04, y - 0.8, 0.04), (x, (y - 0.8) / 2, z), 0xEEEEEE, collide=False, shadow=False)


def camera(b, x, y, z, facing):
    sb = face_at(b, x, y, z, facing)
    m = sb.model('SecurityCamera')
    m.blk('Mount', (0.4, 0.8, 0.4), (0, 0.4, 0.6), 0xDDDDDD, 'Metal')
    m.blk('Body', (0.8, 0.7, 1.6), (0, 0, 0), 0xEEEEEE, 'SmoothPlastic', rot=Rx(15))
    m.cyl('Lens', 0.2, 0.5, (0, -0.15, -0.85), BLACK, 'Glass', axis='z')
    p = m.ball('RecLed', 0.15, (0.25, 0.25, -0.75), 0xFF2020, 'Neon')
    return m


def pipe_run(b, a, bpt, d=0.6, color=0x6A6A6A, mat='Metal'):
    return b.beam('Pipe', a, bpt, d, d, color, mat, collide=False)
