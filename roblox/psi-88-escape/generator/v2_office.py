"""Art-directed office floors: 87 (ruin), 80 (archive), 70 (CCTV), 40 (blackout maze), 8 (team office)."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles
import props as P
import props2 as Q
from props import R
from v2_common import *
from building import tag


def east_edge(b, z0, z1, col):
    """Close the playable zone along the stair/elevator core, leaving the elevator doors visible."""
    if z0 < -16:
        b.box('EdgeA', 61.75, 0, z0, 62.25, CH, -16, col, 'SmoothPlastic')
    if z1 > 16:
        b.box('EdgeB', 62, 0, 16, 64, CH, 18, col, 'SmoothPlastic')
    if z1 > 34:
        b.box('EdgeC', 62, 0, 34, 64, CH, 36, col, 'SmoothPlastic')
        if z1 > 36:
            b.box('EdgeD', 61.75, 0, 36, 62.25, CH, z1, col, 'SmoothPlastic')
    b.box('ElevatorLobbyCeiling', 62, CH, 16, 64, CH + 0.2, 36, 0xEDEBE6, shadow=False)


def column(b, x, z, col=0xC8C4BC, s=2.6):
    b.box('Column', x - s / 2, 0, z - s / 2, x + s / 2, CH, z + s / 2, col, 'Concrete')
    b.box('ColumnBase', x - s / 2 - 0.08, FL, z - s / 2 - 0.08, x + s / 2 + 0.08, FL + 0.5, z + s / 2 + 0.08, 0x3A3836, **DEC)


def desk_island(b, cx, cz, n=3, names=None, leader=None, team=None, screens=None, mess=0.5, dark=False, wreck=0.0):
    """Korean-style team island: two facing rows + team leader desk at the west end."""
    w = 5.6
    L = n * w
    for side in (-1, 1):
        for i in range(n):
            x = cx - L / 2 + w * (i + 0.5)
            z = cz + side * 1.4
            idx = i + (0 if side < 0 else n)
            nm = names[idx] if names and idx < len(names) else None
            scr = screens[idx] if screens and idx < len(screens) else None
            if wreck and R.random() < wreck:
                ws = b.at(T(x + R.uniform(-1, 1), 0, z + side * R.uniform(1, 3)) * Ry(R.uniform(-40, 40)) * T(0, FL + 1.3, 0) * Rx(side * 90) * T(0, -FL - 1.3, 0))
                workstation(ws, w=w, name=None, chair=False, mess=0, dark=True)
                office_chair(b.at(T(x + R.uniform(-3, 3), 0, z + side * R.uniform(3, 6)) * Ry(R.uniform(0, 360))), tipped=R.random() < 0.6)
            else:
                workstation(b.at(T(x, 0, z) * Ry(0 if side > 0 else 180)), w=w, name=nm, screen=scr, mess=mess, dark=dark)
    if leader is not None:
        lx = cx - L / 2 - 3.2
        workstation(b.at(T(lx, 0, cz) * Ry(-90)), w=6.4, d=3.2, top=0x8A6A4A, name=leader, screen=None if dark else '결재 대기 3건',
                    monitors=2, panel=False, mess=mess, dark=dark)
    if team:
        b.blk('SignWire', (0.04, 2.4, 0.04), (cx - 3, CH - 1.2, cz), INK, **DEC)
        b.blk('SignWire', (0.04, 2.4, 0.04), (cx + 3, CH - 1.2, cz), INK, **DEC)
        p = b.blk('TeamSign', (7, 1.2, 0.12), (cx, CH - 3.0, cz), 0x1E2A3A, **NC)
        gui_text(p, team, 'Front', bg=0x1E2A3A, fg=0xFFFFFF, font=19, ppu=40)
        p2 = b.blk('TeamSignB', (7, 1.2, 0.02), (cx, CH - 3.0, cz + 0.07), 0x1E2A3A, rot=Ry(180), **DEC)
        gui_text(p2, team, 'Front', bg=0x1E2A3A, fg=0xFFFFFF, font=19, ppu=40)


def blinds(b, x0, x1, z, h0=FL + 1.6, h1=CH - 0.6, closed=0.5):
    m = b.model('VerticalBlinds')
    m.box('Track', x0, h1, z - 0.15, x1, h1 + 0.25, z + 0.15, 0xEDEBE6, **DEC)
    x = x0 + 0.3
    while x < x1:
        if R.random() < closed:
            m.blk('Slat', (0.6, h1 - h0, 0.04), (x, (h0 + h1) / 2, z), 0xE8E4DC, 'Fabric', rot=Ry(R.uniform(50, 80)), **DEC)
        x += 0.65


# ===================================================================== 87F 폐허
def f87(fb, F):
    s = fb.model('Ruin')
    g = fb.model('Gameplay')
    Z = (-40, 62, -55, 36)
    floor_finish(s, Z, 0x6A6E72, 'Fabric')
    for _ in range(18):
        x, z = R.uniform(-38, 44), R.uniform(-53, 34)
        s.blk('CarpetPatch', (R.uniform(3, 7), 0.02, R.uniform(3, 7)), (x, FL + 0.01, z), R.choice([0x5A5E62, 0x7A7672, 0x4A4E52]), rot=Ry(R.uniform(0, 90)), **DEC)
    wall(s, 'x', -40, 62, 36, 0xB8B4AC, openings=[(4, 8, 0, 9.5)], name='NorthWall')
    wall(s, 'z', -55, 36, -40, 0xB8B4AC, name='WestWall')
    east_edge(s, -55, 36, 0xB8B4AC)
    missing = [(-22, -8, -32, -20), (8, 20, -12, 0), (-36, -24, -2, 10), (28, 40, -44, -32), (0, 8, 24, 36)]
    trof = troffer_grid(Z)
    dead = [t for t in trof if R.random() < 0.65]
    ceiling_grid(s, Z, troffers=[t for t in trof if not any(a <= t[0] <= c and d <= t[1] <= e for a, c, d, e in missing)],
                 dead=dead, col=0xC8C4BC, bright=0.5, missing=missing)
    # collapsed ceiling sections hanging into the room under the holes
    for (a, c, d, e) in missing:
        cx, cz = (a + c) / 2, (d + e) / 2
        s.blk('CollapsedTiles', (c - a - 1, 0.25, (e - d) * 0.7), (cx, CH - 3.2, cz), 0xC8C4BC, 'SmoothPlastic', rot=Rx(R.choice([-1, 1]) * 28))
        s.blk('HangingTBar', (c - a, 0.1, 0.1), (cx, CH - 1.5, cz + 2), 0xB8B8B4, 'Metal', rot=Rz(R.uniform(-20, 20)), **NC)
        s.blk('Duct', (2.6, 2.0, e - d + 6), (cx + 1, CH + 1.2, cz), 0xA8A8A4, 'Metal', rot=Rx(R.uniform(-12, -4)), **NC)
        for _ in range(4):
            Q.d_tile(s.at(T(cx + R.uniform(-5, 5), FL, cz + R.uniform(-5, 5))))
        P.rubble(s.at(T(cx, FL, cz)), n=8, r=3, color=0xB8B4AC, smax=1.6)
    # structural columns (one with the hammer)
    for x in (-24, 8, 40):
        for z in (-36, -4):
            column(s, x, z)
    hm = s.model('EskimoHammer')
    hm.blk('Head', (2.2, 2.2, 4.4), (8, FL + 6.2, -4 + 2.6), 0x3A3A3E, 'Metal', rot=Rx(-8))
    hm.beam('Handle', (8, FL + 6.0, -4 + 4.8), (8.6, FL + 0.8, -4 + 11), 0.55, 0.55, 0x6B4A2F, 'Wood')
    for k in range(9):
        a = k / 9 * math.tau
        L = R.uniform(1.5, 3.5)
        hm.beam('Crack', (8, FL + 6.2, -2.68), (8 + math.cos(a) * L * 0.5, FL + 6.2 + math.sin(a) * L, -2.68), 0.1, 0.1, 0x2A2826, **DEC)
    for k in range(6):
        hm.blk('Chip', (0.6, 0.3, 0.5), (8 + R.uniform(-2, 2), FL + 0.15, -1 + R.uniform(0, 3)), 0xC8C4BC, 'Concrete', rot=Ry(R.uniform(0, 90)), **DEC)
    from vignettes import tape_line, apology_shrine
    tape_line(s, [(3, -9), (3, 1), (13, 1), (13, -9), (3, -9)], y=FL + 3.0)
    # desk islands, partly wrecked
    for i, (cx, cz) in enumerate(((-10, -44), (24, -44), (-10, -18), (26, -18), (-14, 10), (24, 10))):
        desk_island(s, cx, cz, n=3, mess=0.3, dark=True, wreck=0.35 + 0.1 * (i % 2))
    apology_shrine(s.at(T(16, FL, 26)))
    # meeting room: shattered glass wall (frames only)
    mr = s.model('MeetingRoom')
    for x in range(-40, -13, 4):
        mr.box('Mullion', x - 0.08, FL, 19.85, x + 0.08, CH, 20.15, 0x2A2C2E, 'Metal')
    mr.box('Head', -40, CH - 0.3, 19.85, -14, CH, 20.15, 0x2A2C2E, 'Metal')
    mr.box('Sill', -40, FL, 19.85, -14, FL + 0.3, 20.15, 0x2A2C2E, 'Metal')
    mr.box('Remnant', -26, FL + 0.3, 19.94, -22, FL + 3, 20.06, 0xA8C0C8, 'Glass', tr=0.6)
    for _ in range(10):
        Q.d_glass(mr.at(T(R.uniform(-38, -16), FL, R.uniform(16, 24))))
    mr.blk('Table', (14, 0.3, 5), (-27, FL + 2.5, 28), 0x5A4A3A, 'Wood', rot=Rz(6))
    mr.blk('TableLeg', (0.5, 2.4, 3), (-33, FL + 1.2, 28), 0x2A2826, 'Metal')
    for k in range(6):
        office_chair(mr.at(T(-34 + k * 2.6, 0, 28 + R.choice([-4, 4])) * Ry(R.uniform(0, 360))), tipped=R.random() < 0.5)
    wall_art(mr, -39.7, FL + 6, 28, '+x', 6, 3.5, art=0x3A4A5A)
    # kitchenette
    kt = s.model('Kitchenette')
    kt.box('Counter', 22, FL, 33.6, 42, FL + 2.85, 35.75, 0xEDEBE6)
    kt.box('Worktop', 22, FL + 2.85, 33.4, 42, FL + 3.0, 35.75, 0x3A3836, 'Granite')
    kt.box('Uppers', 22, FL + 5.3, 34.4, 42, FL + 8.3, 35.75, 0xEDEBE6)
    kt.blk('FridgeFallen', (3.4, 7.2, 2.6), (30, FL + 1.3, 28), 0xC8CCD0, 'Metal', rot=Rx(78) * Ry(10))
    Q.d_puddle(kt.at(T(29, FL, 25)))
    kt.blk('CoffeeMachine', (1.4, 1.8, 1.4), (24, FL + 3.9, 34.6), INK, 'Metal')
    # breach in the north wall (where something came through)
    P.rubble(s.at(T(4, FL, 33)), n=16, r=4, color=0xB8B4AC, smax=2.4)
    for _ in range(6):
        s.beam('Rebar', (R.uniform(0, 8), FL + 9.5, 36), (R.uniform(-1, 9), R.uniform(FL + 5, FL + 9), 36 - R.uniform(1, 3)), 0.15, 0.15, 0x5A3A2A, 'CorrodedMetal', **NC)
    # work light, cones, sparks, dust
    Q.work_light(s.at(T(16, FL, -8) * Ry(200)))
    for x, z in ((-20, -30), (12, -6), (-30, 2), (34, -40)):
        Q.cone(s.at(T(x, FL, z) * Ry(R.uniform(0, 90))))
    sp = s.blk('Sparks', (0.3, 0.3, 0.3), (14, CH - 0.5, -6), 0xFFC040, 'Neon', **DEC)
    particles(sp, 'sparks', 5)
    light(sp, 'PointLight', 0xFFB040, 0.5, 8)
    du = s.blk('Dust', (60, 1, 40), (-4, FL + 6, -36), 0, tr=1, **DEC)
    particles(du, 'dust', 7)
    for _ in range(80):
        Q.d_paper(s.at(T(R.uniform(-38, 10), FL, R.uniform(-54, -36))))
    P.emergency_light(s, 61.6, FL + 9, 6, '-x')
    P.emergency_light(s, -39.6, FL + 9, -20, '+x')
    downlight(s, 56, -12, bright=0.6, rng=16, shadows=True)
    P.sign(s, '87F  붕괴 위험 · 출입 통제', 61.7, FL + 7.2, 2, '-x', 7, 1.2, bg=0xF0C020, fg=0x1A1A1A, name='Warning')


# ===================================================================== 80F 1급 기밀 문서보관소
def compact_unit(b, L=14, h=9, end_label='A'):
    """Mobile compact shelving unit (open shelves both sides), long axis along Z."""
    m = b.model('CompactShelving')
    m.blk('Carriage', (2.8, 0.5, L), (0, FL + 0.25, 0), 0x3A3C3E, 'Metal')
    m.blk('Spine', (0.15, h, L - 0.4), (0, FL + 0.5 + h / 2, 0), 0x6A6E72, 'Metal')
    m.blk('Top', (2.8, 0.15, L - 0.2), (0, FL + 0.5 + h, 0), 0x8A8E92, 'Metal')
    nlev = 5
    step = (h - 0.4) / nlev
    for k in range(1, int(L / 3.4)):
        z = -L / 2 + k * 3.4
        m.blk('Upright', (2.7, h, 0.12), (0, FL + 0.5 + h / 2, z), 0x7A7E82, 'Metal', **NC)
    for lv in range(nlev):
        y = FL + 0.6 + lv * step
        m.blk('ShelfBoard', (2.7, 0.08, L - 0.4), (0, y, 0), 0x8A8E92, 'Metal', **NC)
        for side in (-1, 1):
            z = -L / 2 + 0.4
            while z < L / 2 - 0.9:
                bw = R.uniform(0.9, 1.5)
                if R.random() < 0.82:
                    bh = step * R.uniform(0.55, 0.85)
                    m.blk('ArchiveBox', (1.15, bh, bw), (side * 0.72, y + 0.04 + bh / 2, z + bw / 2),
                          R.choice([0xC8B08A, 0xB89A6A, 0xD8C8A8, 0xE8E0D0, 0x6A7A8A]), 'Fabric', **NC)
                    if R.random() < 0.5:
                        m.blk('BoxLabel', (0.02, 0.35, 0.5), (side * 1.31, y + 0.04 + bh * 0.6, z + bw / 2), 0xF8F8F4, **DEC)
                z += bw + 0.1
    for e in (-1, 1):
        m.blk('EndPanel', (2.8, h + 0.4, 0.2), (0, FL + 0.7 + h / 2, e * L / 2), 0xC8BEA8, 'SmoothPlastic')
        lab = m.blk('Label', (1.2, 0.7, 0.05), (0, FL + 7.2, e * (L / 2 + 0.13)), 0xF0EDE6, rot=Ry(0 if e < 0 else 180), **DEC)
        gui_text(lab, end_label, 'Front', bg=0xF0EDE6, fg=0x1A1A1A, font=19, ppu=50)
        hz = e * (L / 2 + 0.3)
        m.cyl('WheelHub', 0.3, 0.4, (0, FL + 4.0, hz), STEEL, 'Metal', axis='z', **DEC)
        for k in range(3):
            m.blk('Spoke', (0.12, 1.4, 0.12), (0, FL + 4.0, hz), 0x2A2A2A, 'Metal', rot=Rz(k * 120) * T(0, 0.7, 0), **DEC)
            m.ball('Knob', 0.3, (math.sin(math.radians(k * 120)) * -1.4, FL + 4.0 + math.cos(math.radians(k * 120)) * 1.4, hz), 0x2A2A2A, **DEC)


def f80(fb, F):
    s = fb.model('Archive')
    g = fb.model('Gameplay')
    Z = (-44, 62, -40, 46)
    floor_finish(s, Z, 0x7A7E7A, 'SmoothPlastic')
    wall(s, 'x', -44, 62, -40, 0x9A9E98, name='SouthWall')
    wall(s, 'x', -44, 62, 46, 0x9A9E98, name='NorthWall')
    wall(s, 'z', -40, 46, -44, 0x9A9E98, name='WestWall')
    east_edge(s, -40, 46, 0x9A9E98)
    trof = troffer_grid(Z, 12, 10, (6, 5))
    ceiling_grid(s, Z, troffers=trof, dead=[t for t in trof if R.random() < 0.2], col=0xE0DED8, bright=0.55, color=0xE8F0FF)
    # security cage at the entrance
    cage = s.model('SecurityCage')
    P.bars_along_z(cage, -22, -15.5, 44, FL, CH - 0.3, step=0.6, d=0.12, color=0x2A2C2E, mat='Metal')
    P.bars_along_z(cage, -8.5, -2, 44, FL, CH - 0.3, step=0.6, d=0.12, color=0x2A2C2E, mat='Metal')
    gate = P.bars_along_z(cage.at(T(44, 0, -15.5) * Ry(-70) * T(-44, 0, 15.5)), -15.5, -8.5, 44, FL, FL + 8, step=0.6, d=0.12,
                          color=0x2A2C2E, mat='Metal', name='CageGate')
    cage.box('CageHead', 43.8, FL + 8, -15.5, 44.2, CH, -8.5, 0x2A2C2E, 'Metal')
    rd = cage.blk('BadgeReader', (0.4, 0.7, 0.2), (44.4, FL + 3.8, -16.2), INK, **DEC)
    cage.blk('ReaderLED', (0.15, 0.1, 0.05), (44.52, FL + 4.0, -16.2), 0xFF2020, 'Neon', **DEC)
    P.sign(cage, '1급 기밀 문서보관소\n허가자 외 출입 금지', 44.5, FL + 9.3, -12, '+x', 5.6, 1.6, bg=0x2A0808, fg=0xFF3A3A, name='ArchiveSign')
    workstation(s.at(T(54, 0, -19) * Ry(180)), w=6, screen='출입 기록 조회', name='보안', mess=0.6)
    # compact shelving stacks
    letters = 'ABCDEFGH'
    for bi, zc in enumerate((-31, -13, 9, 31)):
        for i in range(8):
            x = -9 + i * 6.4
            compact_unit(s.at(T(x, 0, zc)), L=14, end_label='%s-%02d' % (letters[i], bi + 1))
    # rolling ladder + book cart in the aisles
    from vignettes import file_cart, shredder
    file_cart(s.at(T(-6, FL, -22) * Ry(90)))
    file_cart(s.at(T(34, FL, 20)))
    shredder(s.at(T(40, FL, -38)))
    for i in range(30):
        Q.d_paper(s.at(T(R.uniform(-10, 42), FL, R.uniform(-38, 44))))
    # reading room (glass, warm)
    rr = s.model('ReadingRoom')
    glass_wall(rr, 'z', 10, 46, -14, doors=[20])
    glass_wall(rr, 'x', -44, -14, 10, doors=[])
    glass_door(rr, 'z', 20, -14, open_deg=30, hinge=-1, swing=-1)
    floor_finish(rr, (-44, -14, 10, 46), 0x5A3A2A, 'WoodPlanks', top=FL + 0.02)
    for tz in (20, 34):
        rr.blk('LongTable', (20, 0.3, 4.4), (-30, FL + 2.5, tz), OAK_D, 'Wood')
        for x in (-38.5, -21.5):
            rr.blk('TableLeg', (0.5, 2.3, 3.6), (x, FL + 1.2, tz), 0x3A2A1E, 'Wood')
        for x in (-36, -30, -24):
            lamp = rr.model('BankerLamp')
            lamp.blk('Base', (0.9, 0.15, 0.6), (x, FL + 2.72, tz), 0xC9A24A, 'Metal', **NC)
            lamp.blk('Stem', (0.1, 0.9, 0.1), (x, FL + 3.2, tz), 0xC9A24A, 'Metal', **NC)
            lamp.cyl('Shade', 1.4, 0.55, (x, FL + 3.7, tz), 0x1E5A3A, 'Glass', axis='x', **NC)
            p = lamp.blk('Glow', (1.2, 0.06, 0.3), (x, FL + 3.45, tz), 0xFFE8B0, 'Neon', **DEC)
            light(p, 'SpotLight', 0xFFD890, 0.9, 10, x == -30, 'Bottom', 100)
            for sd in (-1, 1):
                c = rr.at(T(x, 0, tz + sd * 3.2) * Ry(0 if sd > 0 else 180))
                c.blk('Seat', (1.6, 0.2, 1.6), (0, FL + 1.55, 0), OAK_D, 'Wood')
                c.blk('Back', (1.6, 1.6, 0.18), (0, FL + 2.5, 0.72), OAK_D, 'Wood')
                for lx in (-0.65, 0.65):
                    for lz in (-0.65, 0.65):
                        c.blk('Leg', (0.15, 1.5, 0.15), (lx, FL + 0.78, lz), 0x3A2A1E, 'Wood', **NC)
        for k in range(4):
            rr.blk('OpenFile', (1.4, 0.05, 1.0), (-37 + k * 4.4, FL + 2.68, tz + R.uniform(-1, 1)), 0xC8A86A, rot=Ry(R.uniform(-20, 20)), **DEC)
    cc = rr.model('CardCatalog')
    cc.blk('Body', (6, 5, 2), (-29, FL + 2.5, 44.9), OAK_D, 'Wood')
    for r_ in range(6):
        for c_ in range(8):
            cc.blk('Drawer', (0.6, 0.06, 0.05), (-31.8 + c_ * 0.8, FL + 0.6 + r_ * 0.75, 43.88), 0xC9A24A, 'Metal', **DEC)
    for z in (14, 24, 40):
        bookcase(rr.at(T(-43.15, 0, z) * Ry(-90)), w=6, h=9)
    p = rr.blk('Stamp', (1.6, 0.03, 1.0), (-28, FL + 2.67, 33.4), 0xF0E8D8, rot=Ry(12), **DEC)
    gui_text(p, '1급 기밀', 'Top', bg=0xF0E8D8, fg=0xB01818, font=20, ppu=50)
    # vault
    vt = s.model('Vault')
    vt.box('VaultWall', -14.6, 0, -40, -13.4, CH, 10, 0x6A6E72, 'Concrete')
    vault = g.model('VaultDoor')
    vault.cyl('Door', 1.2, 9.4, (-13.0, FL + 5, -16), 0x8A8E92, 'DiamondPlate', axis='x')
    vault.cyl('Ring', 0.5, 10.6, (-13.3, FL + 5, -16), 0x5A5E62, 'Metal', axis='x')
    vault.cyl('Wheel', 0.4, 3.2, (-12.2, FL + 5, -16), 0xC0C4C8, 'Metal', axis='x')
    for a in (0, 60, 120):
        vault.blk('Spoke', (0.25, 3.4, 0.25), (-12.0, FL + 5, -16), 0xC0C4C8, 'Metal', rot=Rx(a))
    for k in range(8):
        a = k / 8 * math.tau
        vault.cyl('Bolt', 0.4, 0.5, (-12.5, FL + 5 + math.sin(a) * 4.0, -16 + math.cos(a) * 4.0), 0xC0C4C8, 'Metal', axis='x', **NC)
    tag(vault, 'VaultDoor')
    P.sign(vt, 'VAULT  B-0', -12.9, FL + 10.6, -16, '+x', 4, 0.7, bg=0x1A1A1A, fg=0xE8C870, name='VaultSign')
    for z in (-26, -6):
        sp = vt.blk('RedSpot', (0.6, 0.6, 0.6), (-12, CH - 0.4, z), 0x2A0A0A, 'Metal', **DEC)
        light(sp, 'SpotLight', 0xFF3A2A, 1.2, 18, False, 'Bottom', 70)
    # parallel world: one shelving unit stuck to the ceiling
    s.blk('CeilingDesk', (5, 0.2, 2.4), (30, CH - 2.6, -22), 0xEDEBE6, rot=Rz(180), **NC)
    for sx in (-2.2, 2.2):
        s.blk('CeilingDeskLeg', (0.15, 2.4, 0.15), (30 + sx, CH - 1.3, -22), ALU, 'Metal', **NC)
    office_chair(s.at(T(30, CH, -19.5) * Rz(180) * T(0, -FL, 0)))
    downlight(s, 56, -12, bright=0.7, rng=16, shadows=True)


# ===================================================================== 70F CCTV 관제센터
CAMS = ['CAM 88 공유하우스', 'CAM 87 붕괴구역', 'CAM 80 보관소', 'CAM 66 ■■지옥', 'CAM 60 식당', 'CAM 50 조수민 하우스',
        'CAM 44 연회장', 'CAM 40 정전', 'CAM 30 수영장', 'CAM 20 회장실', 'CAM 10 어린이집', 'CAM 08 8팀',
        'CAM 01 로비', 'CAM B1 부티크', 'CAM B2 기니방', 'CAM B3 ■■■', 'CAM B9 보호실', 'CAM B13 ???']


def console_row(b, cx, z, n=4, riser=0.0):
    w = 7.0
    for i in range(n):
        x = cx - (n - 1) * w / 2 + i * w
        m = b.model('Console')
        top = FL + riser + 2.5
        m.blk('Desk', (w - 0.2, 2.5, 3.2), (x, FL + riser + 1.25, z), 0x1E2024, 'Metal')
        m.blk('Top', (w, 0.12, 3.4), (x, top + 0.06, z), 0x2E3034, 'SmoothPlastic')
        m.blk('Fascia', (w - 0.2, 2.2, 0.06), (x, FL + riser + 1.2, z - 1.63), 0x2A2C30, **DEC)
        for k, ang in ((-1, 14), (0, 0), (1, -14)):
            scr = m.blk('Screen', (2.2, 1.35, 0.1), (x + k * 2.2, top + 1.2, z + 1.0 - abs(k) * 0.3), 0x0C0D0F, rot=Ry(ang) * Rx(-8), **NC)
            gui_text(scr, R.choice(CAMS) + '\n' + R.choice(['● LIVE', 'MOTION', 'NO SIGNAL', 'TRACKING ▲']), 'Front',
                     bg=R.choice([0x0A1A12, 0x0A121C, 0x1A0A0A]), fg=R.choice([0x7AF0A0, 0x8AC8FF, 0xFF7A7A]), glow=True, font=10, ppu=30)
            m.blk('ScreenStand', (0.3, 0.6, 0.3), (x + k * 2.2, top + 0.35, z + 1.0 - abs(k) * 0.3), INK, 'Metal', **NC)
        m.blk('Keyboard', (1.6, 0.06, 0.55), (x, top + 0.15, z - 0.6), 0x2A2A2C, **DEC)
        m.blk('Joystick', (0.3, 0.7, 0.3), (x + 1.8, top + 0.45, z - 0.7), INK, **NC)
        m.blk('Phone', (0.9, 0.3, 0.7), (x - 2.2, top + 0.2, z - 0.6), 0x2A2A2C, **NC)
        p = m.blk('TaskLight', (0.8, 0.05, 0.25), (x - 2.6, top + 1.9, z + 0.6), 0xFFE0B0, 'Neon', **DEC)
        light(p, 'SpotLight', 0xFFD8A8, 0.35, 6, False, 'Bottom', 90)
        office_chair(b.at(T(x + R.uniform(-0.5, 0.5), riser, z - 2.6) * Ry(180 + R.uniform(-20, 20))))
        if R.random() < 0.4:
            m.cyl('EnergyDrink', 0.6, 0.3, (x + R.uniform(-2.5, 2.5), top + 0.42, z - 0.9), R.choice([0x1A6AC0, 0x2A2A2A, 0x6AC02A]), 'Metal', **NC)


def f70(fb, F):
    s = fb.model('SecurityOps')
    g = fb.model('Gameplay')
    Z = (-50, 62, -40, 46)
    floor_finish(s, Z, 0x2A2E36, 'Fabric')
    wall(s, 'x', -50, 62, -40, 0x4A4E56, name='SouthWall')
    wall(s, 'x', -50, 62, 46, 0x1E2024, name='NorthWall')
    wall(s, 'z', -40, 46, -50, 0x4A4E56, name='WestWall')
    east_edge(s, -40, 46, 0x4A4E56)
    # corridor + rooms
    wall(s, 'x', -50, 62, -6, 0x3A3E46, openings=[(16, 7.6, 0, 9)], name='OpsSouthWall')
    casing(s, 'x', 16, -6, 7.6, 0, 9)
    wall(s, 'x', -50, 44, -22, 0x4A4E56, openings=[(-30, 3.8, 0, DOOR_H), (10, 3.8, 0, DOOR_H), (39, 3.8, 0, DOOR_H)], name='CorridorSouth')
    for c in (-30, 10, 39):
        casing(s, 'x', c, -22, 3.8, 0, DOOR_H)
    wall(s, 'z', -40, -22, -10, 0x4A4E56, name='LockerBreakWall')
    wall(s, 'z', -40, -22, 30, 0x4A4E56, name='BreakArmoryWall')
    door_leaf(s, 'x', -30, -22, open_deg=40, hinge=-1, swing=-1)
    door_leaf(s, 'x', 10, -22, open_deg=75, hinge=1, swing=-1)
    door_leaf(s, 'x', 39, -22, open_deg=0, hinge=-1, swing=-1)
    trof = troffer_grid((-50, 62, -40, -6), 12, 8, (6, 4))
    ceiling_grid(s, (-50, 62, -40, -6), troffers=trof, col=0xD8D8D4, bright=0.7)
    # ops room: dark, ceiling with blue cove
    s.box('OpsCeiling', -20, CH + 1.0, -6, 62, CH + 1.2, 46, 0x15171A, shadow=False)
    s.box('ServerCeiling', -50, CH, -6, -20, CH + 0.2, 46, 0x2A2C30, shadow=False)
    for (a, c, d, e) in ((-20, 62, -6, -5), (-20, 62, 45, 46), (-20, -19, -6, 46), (61, 62, -6, 46)):
        s.box('Soffit', a, CH, d, c, CH + 1.0, e, 0x1E2024)
    for (a, c, d, e) in ((-19, 61, -4.8, -4.6), (-19, 61, 44.6, 44.8), (-18.8, -18.6, -4.6, 44.6), (60.6, 60.8, -4.6, 44.6)):
        cv = s.box('CoveLight', a, CH + 0.05, d, c, CH + 0.15, e, 0x2A6AFF, 'Neon', **DEC)
    for x in (0, 30):
        for z in (6, 30):
            p = s.blk('CoveGlow', (1, 1, 1), (x, CH + 0.4, z), 0, tr=1, **DEC)
            light(p, 'PointLight', 0x3A6AFF, 0.6, 26)
    # video wall
    vw = s.model('VideoWall')
    vw.box('Backing', -14, FL + 1.5, 44.9, 42, CH - 0.5, 45.75, 0x0A0B0C, 'Metal')
    i = 0
    for row in range(3):
        for col in range(7):
            x = -10 + col * 7.6
            y = FL + 2.9 + row * 2.75
            big = (row == 1 and col == 3)
            scr = vw.blk('Panel', (7.4, 2.65, 0.15), (x, y, 44.75), 0x0C0D0F, **NC)
            t = CAMS[i % len(CAMS)]
            hot = '조수민' in t
            gui_text(scr, ('● REC  ' if hot else '') + t + ('\n▲ 움직임 감지' if hot else ''), 'Front', bg=0x200606 if hot else 0x0A1612,
                     fg=0xFF6A6A if hot else 0x8AF0B0, glow=True, font=10, ppu=24)
            i += 1
    for x in (0, 26):
        p = vw.blk('WallGlow', (1, 1, 1), (x, FL + 5.5, 42), 0, tr=1, **DEC)
        light(p, 'PointLight', 0x6AA8FF, 0.8, 22)
    # tiered consoles
    for k, (z, riser) in enumerate(((34, 0.0), (24, 0.8), (14, 1.6))):
        if riser:
            s.box('Riser', -16, FL, z - 4.5, 40, FL + riser, z + 4.5, 0x23262C, 'Fabric')
            s.box('RiserNose', -16, FL + riser - 0.08, z - 4.55, 40, FL + riser, z - 4.45, 0xC9A24A, 'Metal', **DEC)
        console_row(s, 12, z, n=4, riser=riser)
    # supervisor glass room
    sv = s.model('Supervisor')
    sv.box('Platform', 44, FL, 20, 61.75, FL + 1.6, 45.75, 0x2A2E36, 'Fabric')
    for k in range(4):
        sv.box('Step', 41 + k * 0.75, FL, 26, 41.75 + k * 0.75, FL + 0.4 * (k + 1), 32, 0x2A2E36, 'Fabric')
    glass_wall(sv, 'z', 20, 45.75, 44, doors=[29], h=CH)
    workstation(sv.at(T(53, 1.6, 38) * Ry(180)), w=7, d=3.2, top=0x3A3A3E, monitors=2, panel=False, screen='경보 3건 · 50F', name='상황실장')
    sv.blk('MapBoard', (0.2, 5, 10), (61.6, FL + 6.5, 32), 0x0A1A2A)
    mp = sv.blk('MapPrint', (0.05, 4.6, 9.6), (61.45, FL + 6.5, 32), 0x0A1A2A, **DEC)
    gui_text(mp, 'PSI TOWER\n88 ■■■■■■■■■ 1\nB1 ■■■ B13\n▼ 내핵', 'Left', bg=0x0A1A2A, fg=0x6AC8FF, glow=True, font=10, ppu=24)
    # server room (cold, raised floor)
    sr = s.model('ServerRoom')
    glass_wall(sr, 'z', -6, 46, -20, doors=[4])
    sr.box('RaisedFloor', -50, FL, -6, -20, FL + 0.6, 46, 0xC8CCD0, 'Metal')
    for x in range(-48, -20, 2):
        sr.box('TileSeam', x - 0.03, FL + 0.6, -6, x + 0.03, FL + 0.62, 46, 0x8A8E92, **DEC)
    for row, x in enumerate((-44, -36, -28)):
        for k in range(8):
            z = -2 + k * 5.6
            rk = sr.model('Rack')
            rk.blk('Body', (3.2, 8, 2.4), (x, FL + 4.6, z), 0x111214, 'Metal')
            rk.blk('Mesh', (0.05, 7.6, 2.0), (x + (1.62 if row % 2 == 0 else -1.62), FL + 4.6, z), 0x2A2C30, 'DiamondPlate', **DEC)
            for j in range(10):
                rk.blk('LED', (0.06, 0.08, 0.08), (x + (1.66 if row % 2 == 0 else -1.66), FL + 1.4 + j * 0.65, z + R.uniform(-0.8, 0.8)),
                       R.choice([0x2AFF6A, 0x2AFF6A, 0x6AC8FF, 0xFFB02A]), 'Neon', **DEC)
        sr.blk('CableTray', (1.2, 0.3, 46), (x, CH - 1.4, 20), 0x8A8E92, 'Metal', **NC)
    for z in (6, 26):
        p = sr.blk('ColdLight', (1, 1, 1), (-36, CH - 1, z), 0, tr=1, **DEC)
        light(p, 'PointLight', 0x8AC8FF, 1.0, 22)
    # locker room / break room / armory
    s.box('ArmoryEast', 43.75, 0, -40, 44.25, CH, -22, 0x4A4E56, 'SmoothPlastic')
    P.locker_row(s.at(T(-30, FL, -38.85)), n=12, color=0x3A4A5A)
    s.blk('Bench', (14, 1.5, 1.6), (-30, FL + 0.75, -30), 0x8A6A4A, 'Wood')
    br = s.model('BreakRoom')
    sofa(br.at(T(10, 0, -37.6) * Ry(180)), w=8, col=0x4A4E56)
    coffee_table(br.at(T(10, 0, -32)))
    from vignettes import cot, coffee_station, chicken_box
    coffee_station(br.at(T(27, FL, -32) * Ry(-90)))
    chicken_box(br.at(T(10, FL + 1.45, -32)))
    br.blk('Fridge', (3, 6.5, 2.4), (-6.5, FL + 3.25, -38.5), 0xC8CCD0, 'Metal')
    cot(br.at(T(0, FL, -30) * Ry(90)))
    ar = s.model('Armory')
    ar.box('CageFront', 30, FL, -24, 44, CH, -23.8, 0x2A2C2E, 'DiamondPlate', tr=0.45)
    for k in range(4):
        ar.blk('GunRack', (3, 6, 1), (32 + k * 3.4, FL + 3, -39), 0x2A2826, 'Metal')
    P.sign(ar, '무기고 · 관리자 승인 필요', 37, FL + 9, -23.6, '-z', 6, 1, bg=0x8A1010, fg=0xFFFFFF, name='ArmorySign')
    # corridor details
    for x in (-40, -6, 28):
        mount(s, lambda b: P.camera(b, 0, 0, 0, '-z'), x, CH - 1, -7.2, '-z')
    Q.extinguisher(s.at(T(2, FL + 3, -21.7) * Ry(180)))
    P.sign(s, 'PSI 보안관제센터  SECURITY OPERATIONS', 16, FL + 9.6, -6.35, '+z', 12, 1.2, bg=0x0A0F18, fg=0x6AC8FF, glow=True, name='OpsSign')
    downlight(s, 56, -12, bright=0.7, rng=16, shadows=True)


# ===================================================================== 40F 정전된 칸막이 미로
def f40(fb, F):
    s = fb.model('BlackoutMaze')
    g = fb.model('Gameplay')
    floor_finish(s, (-79, 62, -55, 55), 0x2E3036, 'Fabric')
    cell, nx, nz, x0, z0 = 8, 15, 13, -78, -52
    wv = [[True] * nz for _ in range(nx + 1)]
    wh = [[True] * (nz + 1) for _ in range(nx)]
    seen = [[False] * nz for _ in range(nx)]
    stack = [(nx - 1, 5)]
    seen[nx - 1][5] = True
    while stack:
        i, j = stack[-1]
        nb = [(i + a, j + c, a, c) for a, c in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= i + a < nx and 0 <= j + c < nz and not seen[i + a][j + c]]
        if not nb:
            stack.pop()
            continue
        ni, nj, a, c = R.choice(nb)
        if a:
            wv[max(i, ni)][j] = False
        else:
            wh[i][max(j, nj)] = False
        seen[ni][nj] = True
        stack.append((ni, nj))
    for _ in range(26):
        wv[R.randrange(1, nx)][R.randrange(nz)] = False
    wv[nx][5] = wv[nx][4] = False
    H = FL + 8.6
    fab = 0x4E5560

    def panel_run(axis, a0, a1, plane):
        if axis == 'x':
            s.box('Partition', a0, FL, plane - 0.2, a1, H, plane + 0.2, fab, 'Fabric')
            s.box('PartitionCap', a0, H, plane - 0.24, a1, H + 0.15, plane + 0.24, ALU, 'Metal', **DEC)
            s.box('PartitionKick', a0, FL, plane - 0.24, a1, FL + 0.5, plane + 0.24, 0x2A2C30, 'Metal', **DEC)
        else:
            s.box('Partition', plane - 0.2, FL, a0, plane + 0.2, H, a1, fab, 'Fabric')
            s.box('PartitionCap', plane - 0.24, H, a0, plane + 0.24, H + 0.15, a1, ALU, 'Metal', **DEC)
            s.box('PartitionKick', plane - 0.24, FL, a0, plane + 0.24, FL + 0.5, a1, 0x2A2C30, 'Metal', **DEC)
        n = int((a1 - a0) / 4)
        for k in range(1, n):
            u = a0 + k * 4
            if axis == 'x':
                s.box('PanelSeam', u - 0.05, FL + 0.5, plane - 0.22, u + 0.05, H, plane + 0.22, 0x3A3E46, 'Metal', **DEC)
            else:
                s.box('PanelSeam', plane - 0.22, FL + 0.5, u - 0.05, plane + 0.22, H, u + 0.05, 0x3A3E46, 'Metal', **DEC)

    for i in range(nx + 1):
        j = 0
        while j < nz:
            if wv[i][j]:
                k = j
                while k < nz and wv[i][k]:
                    k += 1
                panel_run('z', z0 + j * cell, z0 + k * cell, x0 + i * cell)
                j = k
            else:
                j += 1
    for j in range(nz + 1):
        i = 0
        while i < nx:
            if wh[i][j]:
                k = i
                while k < nx and wh[k][j]:
                    k += 1
                panel_run('x', x0 + i * cell, x0 + k * cell, z0 + j * cell)
                i = k
            else:
                i += 1
    for i in range(nx + 1):
        for j in range(nz + 1):
            s.box('Post', x0 + i * cell - 0.25, FL, z0 + j * cell - 0.25, x0 + i * cell + 0.25, H + 0.2, z0 + j * cell + 0.25, ALU, 'Metal', **DEC)
    # dead ceiling over everything
    trof = troffer_grid((-79, 62, -55, 55), 8, 8, (2, 4))
    ceiling_grid(s, (-79, 62, -55, 55), troffers=trof, dead=trof, col=0x8A8A86, grid=0x6A6A66)
    # workstations inside some cells
    for _ in range(34):
        i, j = R.randrange(nx), R.randrange(nz)
        cx, cz = x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell
        on = R.random() < 0.2
        workstation(s.at(T(cx, 0, cz + 1.2) * Ry(R.choice([0, 180]))), w=5, d=2.4, panel=False, screen='…' if on else None,
                    dark=not on, mess=0.6, chair=R.random() < 0.7)
        if on:
            p = s.blk('MonitorGlow', (0.2, 0.2, 0.2), (cx, FL + 4, cz + 1), 0, tr=1, **DEC)
            light(p, 'PointLight', 0x6AA8FF, 0.5, 10)
    for _ in range(80):
        Q.d_paper(s.at(T(R.uniform(-77, 40), FL, R.uniform(-51, 51))))
    for i in range(0, nx, 4):
        for j in range(1, nz, 4):
            x, z = x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell
            p = s.blk('EmergencyLamp', (1.2, 0.4, 0.6), (x, CH - 0.35, z), 0xFF2A1A, 'Neon', **DEC)
            light(p, 'SpotLight', 0xFF3A2A, 1.0, 18, False, 'Bottom', 100)
    exit_sign(s, 45, FL + 9.3, -12, '-x', '출구')
    pts = [(44, -10), (30, -14), (22, -26), (6, -30), (-10, -22), (-26, -18), (-40, -6), (-58, -2), (-74, 0)]
    for a, b2 in zip(pts, pts[1:]):
        for t in (0.25, 0.75):
            s.cyl('GlowStick', 0.8, 0.15, (a[0] + (b2[0] - a[0]) * t + R.uniform(-1, 1), FL + 0.1, a[1] + (b2[1] - a[1]) * t + R.uniform(-1, 1)),
                  0x5AFF6A, 'Neon', axis='x', rot=Ry(R.uniform(0, 180)), **DEC)
    for x, z in ((10, -30), (-40, -6)):
        fl = s.cyl('DroppedFlashlight', 1.0, 0.35, (x, FL + 0.18, z), INK, 'Metal', axis='x', rot=Ry(30), **NC)
        light(fl, 'SpotLight', 0xFFF0D0, 1.5, 22, True, 'Right', 45)
    bp = g.model('BreakerPanel')
    bp.box('Panel', -78.9, FL + 3, -2, -78.3, FL + 9, 2, 0x8A8E92, 'Metal')
    for k in range(6):
        bp.blk('Switch', (0.3, 0.5, 0.3), (-78.15, FL + 7.5 - k * 0.8, -1 + (k % 2) * 2), 0x2A2A2A, 'Metal')
    btn = bp.blk('ExitButton', (0.4, 1.2, 1.2), (-78.1, FL + 5, 0), 0xE02020, 'Neon', tags=['ExitButton'])
    light(btn, 'PointLight', 0xFF3030, 0.8, 12)
    P.sign(bp, '분전반 — 전원 복구', -78.2, FL + 10, 0, '+x', 5, 1.1, bg=0xF2D23A, fg=0x111111, name='PanelSign')
    P.sign(s, '40F 정전 · 손전등을 켜세요', 61.7, FL + 7, 4, '-x', 7, 1.4, bg=0x111111, fg=0xC8C8C8, name='Notice')


# ===================================================================== 8F 정보구출반
TEAM8 = ['차강면 차장', '안경수', '이미리', '장세진', '공유', '신입']
SCR8 = ['보고서 v7_최종_진짜최종', '안경 어디 뒀지', '마니또 명단', '오늘 할 일: 탈출', '공유 씨 어디 있어요?', '환영합니다!']


def f8(fb, F):
    s = fb.model('Team8')
    g = fb.model('Gameplay')
    Z = (-56, 62, -55, 30)
    floor_finish(s, Z, 0x4E5664, 'Fabric')
    for x in range(-52, 60, 8):
        s.box('CarpetBand', x, FL, -55, x + 4, FL + 0.01, 30, 0x46505C, **DEC)
    wall(s, 'x', -56, 62, 30, 0xD8D6D0, name='NorthWall')
    wall(s, 'z', -55, 30, -56, 0xD8D6D0, name='WestWall')
    east_edge(s, -55, 30, 0xD8D6D0)
    trof = troffer_grid(Z, 10, 10, (5, 5))
    ceiling_grid(s, Z, troffers=trof, col=0xF0EEEA, bright=0.6, color=0xF6F8FF)
    blinds(s, -55, 61, -54.4, closed=0.65)
    # team islands
    desk_island(s, -6, -40, 3, names=TEAM8, leader='유모자 팀장', team='정보구출반 8팀', screens=SCR8, mess=0.9)
    desk_island(s, 34, -40, 3, names=['7팀'] * 6, leader='7팀장', team='정보구출반 7팀', screens=['로그아웃 됨', None, '7팀 — 전원 실종'], mess=0.4)
    desk_island(s, -6, -12, 3, names=['6팀'] * 6, leader='6팀장', team='정보구출반 6팀', mess=0.5)
    desk_island(s, 34, -12, 3, names=['옆팀'] * 2 + ['에스키모', '엘리자베스'] + ['옆팀'] * 2, leader='옆팀장', team='옆팀',
                screens=[None, None, 'Привет', None], mess=0.5)
    s.blk('BentChair', (2, 0.4, 2), (40, FL + 0.3, -8.4), INK, 'Fabric', rot=Rz(70), **NC)
    # glass rooms along the west: pantry, leader office, meeting room
    glass_wall(s, 'z', -55, 30, -30, doors=[-40, -8, 18])
    glass_wall(s, 'x', -56, -30, -22, doors=[])
    glass_wall(s, 'x', -56, -30, 6, doors=[])
    glass_door(s, 'z', -40, -30, open_deg=20, hinge=1, swing=-1)
    glass_door(s, 'z', -8, -30, open_deg=0, hinge=-1, swing=-1)
    glass_door(s, 'z', 18, -30, open_deg=50, hinge=-1, swing=-1)
    pn = s.model('Pantry')
    pn.box('Counter', -55.75, FL, -54, -53.5, FL + 2.85, -26, 0xEDEBE6)
    pn.box('Worktop', -55.75, FL + 2.85, -54, -53.3, FL + 3.0, -26, 0x3A3836, 'Granite')
    pn.blk('WaterPurifier', (1.4, 2.0, 1.6), (-54.6, FL + 4.0, -50), 0xF4F4F0)
    pn.blk('CoffeeMachine', (1.4, 1.8, 1.4), (-54.6, FL + 3.9, -45), INK, 'Metal')
    pn.blk('Microwave', (1.6, 1.1, 1.4), (-54.6, FL + 3.55, -40), 0x2A2A2C, 'Metal')
    pn.blk('Fridge', (2.6, 6.8, 2.4), (-54.4, FL + 3.4, -30.5), 0xC8CCD0, 'Metal')
    for k in range(3):
        pn.blk('MugShard', (0.4, 0.3, 0.3), (-54 + R.uniform(-0.5, 0.5), FL + 3.15, -36 + R.uniform(-1, 1)), 0xFFFFFF, rot=Ry(R.uniform(0, 90)), **DEC)
    note = pn.blk('Note', (0.03, 0.9, 1.4), (-55.7, FL + 4.4, -36), 0xFFF6C8, **DEC)
    gui_text(note, '에스키모가 또…\nИзвините', 'Right', bg=0xFFF6C8, fg=0x2A2A2A, font=9, ppu=60)
    pn.blk('Table', (5, 0.2, 3), (-42, FL + 2.5, -40), 0xEDEBE6)
    pn.blk('TableBase', (0.4, 2.3, 0.4), (-42, FL + 1.2, -40), ALU, 'Metal')
    for x in (-44, -40):
        for sz in (-1, 1):
            office_chair(pn.at(T(x, 0, -40 + sz * 2.4) * Ry(0 if sz > 0 else 180)))
    cake = pn.model('Cake')
    cake.cyl('Cake', 0.9, 2.0, (-42, FL + 3.05, -40), 0xF8F0F0, **NC)
    P.bulb(cake, -42, FL + 3.8, -40, color=0xFFB060, bright=0.2, rng=5, d=0.12)
    lo = s.model('LeaderOffice')
    workstation(lo.at(T(-44, 0, -6) * Ry(90)), w=7, d=3.2, top=0x6A4A2E, monitors=2, panel=False, name='유모자 팀장', screen='oh my ong!')
    bookcase(lo.at(T(-55.1, 0, -14) * Ry(-90)), w=6, h=8)
    plant(lo.at(T(-53, 0, 3)), h=6)
    sofa(lo.at(T(-36, 0, -18) * Ry(180)), w=6, col=0x3A3A3E)
    motto = lo.blk('Motto', (0.05, 1.2, 6), (-55.7, FL + 7, -6), 0xF6F0E0, **DEC)
    gui_text(motto, '"very very good입니다!"', 'Right', bg=0xF6F0E0, fg=0x2A2A6A, font=19, ppu=40)
    mr = s.model('MeetingRoom')
    mr.blk('Table', (14, 0.25, 5), (-43, FL + 2.5, 18), 0xEDEBE6)
    for x in (-48, -38):
        mr.blk('TableBase', (0.6, 2.3, 3), (x, FL + 1.2, 18), ALU, 'Metal')
    for x in (-48, -43, -38):
        for sz in (-1, 1):
            office_chair(mr.at(T(x, 0, 18 + sz * 3.6) * Ry(0 if sz > 0 else 180)))
    sc = mr.blk('Screen', (0.15, 5, 9), (-55.6, FL + 6, 18), INK)
    gui_text(sc, '주간 보고\n탈출 진행률: 8 / 88', 'Right', bg=0x0A1420, fg=0xC8E0FF, glow=True, font=10, ppu=20)
    # north wall services: lockers, printer, whiteboard, team photo
    P.locker_row(s.at(T(-12, FL, 28.85) * Ry(180)), n=10, color=0x6A7A8A)
    Q.copier(s.at(T(8, FL, 28.6) * Ry(180)))
    Q.paper_reams(s.at(T(12, FL, 28.8) * Ry(180)))
    wb = s.blk('Whiteboard', (12, 5, 0.15), (30, FL + 5.4, 29.65), 0xF8F8F6, rot=Ry(180))
    gui_text(wb, '8팀 회식: 진미국수 9시\n※ 에스키모 씨 기물 파손 주의\n마니또 진행 중 (신입 포함!)\n보고서 마감: 오늘 (오늘?)', 'Front',
             bg=0xF8F8F6, fg=0x1A3A8A, font=9, ppu=30)
    wall_art(s, 46, FL + 6, 29.7, '-z', 5, 3.2, art=0xC8C0B0)
    plq = s.blk('TeamPhotoLabel', (4, 0.6, 0.05), (46, FL + 3.9, 29.6), 0xEDEBE6, rot=Ry(180), **DEC)
    gui_text(plq, '8팀 단체사진 (공유만 흐릿함)', 'Front', bg=0xEDEBE6, fg=0x2A2A2A, font=19, ppu=40)
    for x, z in ((-28, 26), (16, -55 + 2), (54, 26), (-28, -52)):
        plant(s.at(T(x, 0, z)), h=5.5)
    Q.water_cooler(s.at(T(58, FL, 28.6) * Ry(180)))
    # parallel world: 공유's chair on the ceiling above his empty desk
    office_chair(s.at(T(-0.4, CH, -38.4) * Rz(180) * T(0, -FL, 0)))
    downlight(s, 56, -12, bright=0.7, rng=16)
