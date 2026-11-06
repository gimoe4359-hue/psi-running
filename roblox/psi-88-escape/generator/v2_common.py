"""Shared building blocks for the art-directed floors (same scale rules as 88F)."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles
import props as P
import props2 as Q
from props import R
from showcase88 import (FL, CH, DOOR_H, NC, DEC, TRIM, OAK, OAK_D, INK, STEEL, wall, casing, door_leaf, downlight,
                        pendant, switch, frame, plant, rug, bookcase, sofa, armchair, coffee_table, floor_lamp)
from building import rect_minus

ALU = 0xB8BCC0


def floor_finish(b, rect, color, mat, holes=(), name='FloorFinish', top=FL):
    for (a, c, d, e) in rect_minus(rect, list(holes)):
        b.box(name, a, 0, d, c, top, e, color, mat)


def seal(b, rect, color=0x6A6660):
    """Walls around a rectangle that is NOT part of the playable space (dark storage)."""
    x0, x1, z0, z1 = rect
    b.box('SealS', x0, 0, z0 - 0.25, x1, CH, z0 + 0.25, color, 'Concrete')
    b.box('SealN', x0, 0, z1 - 0.25, x1, CH, z1 + 0.25, color, 'Concrete')
    b.box('SealW', x0 - 0.25, 0, z0, x0 + 0.25, CH, z1, color, 'Concrete')
    b.box('SealE', x1 - 0.25, 0, z0, x1 + 0.25, CH, z1, color, 'Concrete')


def ceiling_grid(b, rect, troffers=(), col=0xEDEBE6, grid=0xC8C6C0, dead=(), bright=0.85, color=0xF4F6FF, missing=(),
                 shadows_every=5):
    """Suspended ceiling with T-bars and 2x4 troffers. `missing` = tile rects left open (dark plenum)."""
    x0, x1, z0, z1 = rect
    m = b.model('SuspendedCeiling')
    for (a, c, d, e) in rect_minus(rect, list(missing)):
        m.box('CeilingTile', a, CH, d, c, CH + 0.2, e, col, 'SmoothPlastic', shadow=False)
    x = x0 + 4
    while x < x1:
        m.box('TBar', x - 0.06, CH - 0.08, z0, x + 0.06, CH, z1, grid, 'Metal', **DEC)
        x += 4
    z = z0 + 4
    while z < z1:
        m.box('TBar', x0, CH - 0.08, z - 0.06, x1, CH, z + 0.06, grid, 'Metal', **DEC)
        z += 4
    for i, (tx, tz) in enumerate(troffers):
        off = (tx, tz) in dead
        m.blk('TrofferFrame', (2.2, 0.1, 4.2), (tx, CH - 0.03, tz), 0xE8E8E4, 'Metal', **DEC)
        p = m.blk('Troffer', (1.9, 0.08, 3.9), (tx, CH - 0.08, tz), color if not off else 0x8A8A86, 'Neon' if not off else 'SmoothPlastic', **DEC)
        if not off:
            light(p, 'SurfaceLight', color, bright, 18, i % shadows_every == 0, 'Bottom', 120)
    for (a, c, d, e) in missing:
        m.box('Plenum', a, CH + 2.5, d, c, CH + 2.7, e, 0x1A1816, **DEC)
        for _ in range(2):
            m.beam('LooseCable', (R.uniform(a, c), CH + 1, R.uniform(d, e)), (R.uniform(a, c), CH - R.uniform(1, 3), R.uniform(d, e)),
                   0.08, 0.08, INK, **DEC)
    return m


def glass_wall(b, axis, a0, a1, plane, doors=(), frame_col=0x2A2C2E, tint=0xA8C0C8, tr=0.65, bay=4, h=CH):
    """Aluminium-framed glazed partition. doors: list of door centres (3.8 wide)."""
    m = b.model('GlassWall')
    cuts = sorted(doors)
    cur = a0
    segs = []
    for c in cuts:
        segs.append((cur, c - 2.0))
        cur = c + 2.0
    segs.append((cur, a1))

    def box(u0, u1, v0, v1, t, col, mat, nm, **kw):
        if axis == 'x':
            m.box(nm, u0, v0, plane - t / 2, u1, v1, plane + t / 2, col, mat, **kw)
        else:
            m.box(nm, plane - t / 2, v0, u0, plane + t / 2, v1, u1, col, mat, **kw)

    for u0, u1 in segs:
        if u1 - u0 < 0.2:
            continue
        box(u0, u1, FL, h, 0.12, tint, 'Glass', 'Pane', tr=tr, refl=0.08, shadow=False)
        box(u0, u1, FL, FL + 0.3, 0.3, frame_col, 'Metal', 'Sill')
        box(u0, u1, h - 0.3, h, 0.3, frame_col, 'Metal', 'Head')
        n = max(1, int(round((u1 - u0) / bay)))
        for i in range(n + 1):
            u = u0 + i * (u1 - u0) / n
            box(u - 0.08, u + 0.08, FL, h, 0.3, frame_col, 'Metal', 'Mullion', **NC)
        box(u0, u1, FL + 3.3, FL + 3.5, 0.14, 0xF0F0EC, 'SmoothPlastic', 'Manifestation', **DEC)
    for c in cuts:
        box(c - 2.0, c + 2.0, FL + DOOR_H + 0.3, h, 0.12, tint, 'Glass', 'Transom', tr=tr, shadow=False)
        box(c - 2.0, c + 2.0, FL + DOOR_H, FL + DOOR_H + 0.3, 0.3, frame_col, 'Metal', 'DoorHead')
    return m


def glass_door(b, axis, c, plane, open_deg=0, hinge=-1, swing=1, frame_col=0x2A2C2E):
    m = b.model('GlassDoor')
    w = 3.8
    hu = c + hinge * (w / 2 - 0.05)
    if axis == 'x':
        f = m.at(T(hu, FL, plane) * Ry(-swing * hinge * open_deg))
        lx = -hinge
        f.blk('Glass', (w - 0.3, DOOR_H - 0.3, 0.1), (lx * (w / 2), DOOR_H / 2, 0), 0xA8C0C8, 'Glass', tr=0.6, shadow=False)
        f.blk('Stile', (0.15, DOOR_H, 0.2), (0, DOOR_H / 2, 0), frame_col, 'Metal')
        f.blk('Stile', (0.15, DOOR_H, 0.2), (lx * (w - 0.1), DOOR_H / 2, 0), frame_col, 'Metal')
        f.blk('Rail', (w, 0.3, 0.2), (lx * w / 2, 0.15, 0), frame_col, 'Metal')
        f.blk('Rail', (w, 0.2, 0.2), (lx * w / 2, DOOR_H - 0.1, 0), frame_col, 'Metal')
        f.blk('Pull', (0.12, 2.4, 0.12), (lx * (w - 0.5), 3.6, 0.25), STEEL, 'Metal', **NC)
    else:
        f = m.at(T(plane, FL, hu) * Ry(swing * hinge * open_deg))
        lz = -hinge
        f.blk('Glass', (0.1, DOOR_H - 0.3, w - 0.3), (0, DOOR_H / 2, lz * (w / 2)), 0xA8C0C8, 'Glass', tr=0.6, shadow=False)
        f.blk('Stile', (0.2, DOOR_H, 0.15), (0, DOOR_H / 2, 0), frame_col, 'Metal')
        f.blk('Stile', (0.2, DOOR_H, 0.15), (0, DOOR_H / 2, lz * (w - 0.1)), frame_col, 'Metal')
        f.blk('Rail', (0.2, 0.3, w), (0, 0.15, lz * w / 2), frame_col, 'Metal')
        f.blk('Pull', (0.12, 2.4, 0.12), (0.25, 3.6, lz * (w - 0.5)), STEEL, 'Metal', **NC)


def office_chair(b, col=0x2A2C30, tipped=False):
    m = b.model('TaskChair')
    if tipped:
        m = m.at(T(0, FL + 1.0, 0) * Rz(85) * T(0, -FL - 1.0, 0))
    m.blk('Seat', (1.8, 0.35, 1.8), (0, FL + 1.75, 0), col, 'Fabric')
    m.blk('Back', (1.7, 2.1, 0.2), (0, FL + 3.1, 0.85), 0x1A1C1E, 'Fabric', rot=Rx(-10))
    m.blk('BackFrame', (1.8, 2.2, 0.1), (0, FL + 3.1, 0.97), 0x3A3C3E, 'Metal', rot=Rx(-10), **NC)
    for s in (-1, 1):
        m.blk('Arm', (0.15, 0.9, 1.0), (s * 0.95, FL + 2.3, 0.1), 0x3A3C3E, 'Plastic', **NC)
        m.blk('ArmPad', (0.3, 0.12, 1.1), (s * 0.95, FL + 2.75, 0.1), 0x1A1C1E, **NC)
    m.cyl('Gas', 1.2, 0.2, (0, FL + 1.0, 0), 0x6A6A6A, 'Metal', **NC)
    for k in range(5):
        a = k * 72
        m.blk('Leg', (1.0, 0.12, 0.2), (0, FL + 0.32, 0), 0x2A2C2E, 'Metal', rot=Ry(a) * T(0.5, 0, 0), **NC)
        m.cyl('Caster', 0.15, 0.25, (math.cos(math.radians(a)) * 1.0, FL + 0.14, -math.sin(math.radians(a)) * 1.0), INK, axis='x', **DEC)


def workstation(b, w=5.6, d=2.8, top=0xEDEBE6, screen=None, name=None, chair=True, mess=0.5, monitors=1, panel=True,
                panel_col=0x5A6470, dark=False):
    """Office bench desk; user sits on the -Z side."""
    m = b.model('Workstation')
    h = FL + 2.45
    m.blk('Top', (w, 0.12, d), (0, h, 0), top, 'SmoothPlastic')
    m.blk('Edge', (w, 0.1, 0.04), (0, h - 0.02, -d / 2), 0x8A8E92, 'Metal', **DEC)
    for sx in (-1, 1):
        m.blk('Leg', (0.15, h - FL, 0.15), (sx * (w / 2 - 0.25), FL + (h - FL) / 2, -d / 2 + 0.3), ALU, 'Metal')
        m.blk('Leg', (0.15, h - FL, 0.15), (sx * (w / 2 - 0.25), FL + (h - FL) / 2, d / 2 - 0.3), ALU, 'Metal')
        m.blk('Foot', (0.15, 0.1, d - 0.4), (sx * (w / 2 - 0.25), FL + 0.05, 0), ALU, 'Metal', **NC)
    m.blk('Beam', (w - 0.5, 0.15, 0.15), (0, h - 0.3, 0), ALU, 'Metal', **NC)
    m.blk('Pedestal', (1.4, 1.9, 2.0), (w / 2 - 1.0, FL + 0.95, 0.1), 0xD8D8D4, 'Metal')
    for k in range(3):
        m.blk('PedSeam', (1.3, 0.04, 0.03), (w / 2 - 1.0, FL + 0.6 + k * 0.55, -0.91), 0x9A9A96, **DEC)
    if panel:
        m.blk('Screen', (w, 1.5, 0.12), (0, h + 0.75, d / 2 - 0.06), panel_col, 'Fabric')
        m.blk('ScreenCap', (w, 0.06, 0.14), (0, h + 1.53, d / 2 - 0.06), ALU, 'Metal', **DEC)
    for i in range(monitors):
        mx = 0 if monitors == 1 else (-0.95 + i * 1.9)
        m.blk('MonArm', (0.12, 0.9, 0.12), (mx, h + 0.45, d / 2 - 0.5), INK, 'Metal', **NC)
        mon = m.blk('Monitor', (2.4, 1.45, 0.1), (mx, h + 1.4, d / 2 - 0.6), 0x111214, 'SmoothPlastic', rot=Ry(0 if monitors == 1 else (12 if i == 0 else -12)), **NC)
        if screen and not dark:
            gui_text(mon, screen if i == 0 else '', 'Front', bg=0x10202E, fg=0x9FD2FF, glow=True, font=10, ppu=30)
    m.blk('Keyboard', (1.6, 0.06, 0.55), (0, h + 0.09, -0.3), 0x2A2A2C, **DEC)
    m.blk('Mouse', (0.22, 0.08, 0.36), (1.1, h + 0.1, -0.3), 0x2A2A2C, **DEC)
    if name:
        p = m.blk('NamePlate', (1.6, 0.4, 0.06), (-w / 2 + 1.0, h + 1.2, d / 2 - 0.15), 0xEDEBE6, **DEC)
        gui_text(p, name, 'Front', bg=0xEDEBE6, fg=0x2A2C2E, font=19, ppu=60)
    if R.random() < mess:
        m.cyl('Mug', 0.42, 0.36, (-w / 2 + 0.7, h + 0.27, -0.6), R.choice([0xEDEBE6, 0x3A4A6A, 0xB0403A]), **NC)
    if R.random() < mess:
        for k in range(R.randint(1, 3)):
            m.blk('Folder', (1.0, 0.1, 1.3), (-w / 2 + 1.0, h + 0.11 + k * 0.1, 0.5), R.choice([0x2A4A8A, 0xE8D8A0, 0x3A7A3A]), rot=Ry(R.uniform(-8, 8)), **DEC)
    if R.random() < mess * 0.6:
        Q.desk_clutter(m.at(T(0, FL, 0)), w, d, h - FL)
    if chair:
        office_chair(b.at(T(R.uniform(-0.4, 0.4), 0, -d / 2 - 1.0) * Ry(180 + R.uniform(-25, 25))))
    return m


def troffer_grid(rect, sx=12, sz=12, offset=(6, 6)):
    x0, x1, z0, z1 = rect
    out = []
    x = x0 + offset[0]
    while x < x1 - 2:
        z = z0 + offset[1]
        while z < z1 - 2:
            out.append((x, z))
            z += sz
        x += sx
    return out


def exit_sign(b, x, y, z, facing, text='비상구'):
    p = P.sign(b, text + '  ⇢', x, y, z, facing, 2.6, 0.9, bg=0x0E7A3A, fg=0xFFFFFF, glow=True, name='ExitSign')
    light(p, 'PointLight', 0x2AFF7A, 0.4, 7)


def wall_art(b, x, y, z, facing, w, h, art=None):
    yaw = {'-z': 0, '+z': 180, '-x': 90, '+x': -90}[facing]
    frame(b.at(T(x, y, z) * Ry(yaw)), w, h, art=art)


def mount(b, fn, x, y, z, facing):
    yaw = {'-z': 0, '+z': 180, '-x': 90, '+x': -90}[facing]
    fn(b.at(T(x, y, z) * Ry(yaw)))


def stain_ceiling(b, x, z, d=3):
    b.cyl('WaterStain', 0.04, d, (x, CH - 0.05, z), 0x8A7A5A, **DEC)
    b.cyl('WaterStainCore', 0.04, d * 0.5, (x + 0.3, CH - 0.06, z - 0.2), 0x6A5A40, **DEC)
