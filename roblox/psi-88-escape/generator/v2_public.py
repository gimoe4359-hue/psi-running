"""Art-directed public floors: 60 (cafeteria), 1 (lobby), 20 (chairman), 10 (daycare), 30 (pool & gym)."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles, Inst
import props as P
import props2 as Q
from props import R
from v2_common import *
from v2_office import east_edge, column, office_chair, blinds
from building import tag

WALNUT = 0x4A2E1E
WALNUT_D = 0x2E1C12
BRASS = 0xC9A24A
MARBLE = 0xE8E2D6


def booth(b, w=6, col=0x8A2A24):
    m = b.model('Booth')
    for s in (-1, 1):
        m.blk('BenchSeat', (w, 1.2, 2.0), (0, FL + 0.9, s * 2.6), col, 'Fabric')
        m.blk('BenchBack', (w, 3.4, 0.6), (0, FL + 2.8, s * 3.45), col, 'Fabric')
        m.blk('BenchBase', (w, 0.9, 1.8), (0, FL + 0.45, s * 2.6), 0x2A2826, 'Wood')
        for k in range(1, 3):
            m.blk('Tuft', (0.06, 2.8, 0.05), (-w / 2 + k * w / 3, FL + 2.9, s * 3.13), 0x5A1A16, **DEC)
    m.blk('Table', (w - 0.6, 0.2, 2.6), (0, FL + 2.45, 0), 0xD8C8A8, 'Wood')
    m.blk('TableLeg', (0.4, 2.3, 0.4), (0, FL + 1.2, 0), INK, 'Metal')
    m.blk('TableFoot', (2.2, 0.1, 1.4), (0, FL + 0.05, 0), INK, 'Metal')
    m.blk('Napkins', (0.6, 0.5, 0.4), (w / 2 - 0.9, FL + 2.8, 0), 0xF0F0EC, **NC)
    m.cyl('Sauce', 0.7, 0.3, (w / 2 - 1.5, FL + 2.9, 0.3), 0xC02020, **NC)


def square_table(b, top=0xD8C8A8, chair_col=0x3A3836, n=4):
    m = b.model('Table4')
    m.blk('Top', (3.2, 0.18, 3.2), (0, FL + 2.45, 0), top, 'Wood')
    m.blk('Leg', (0.35, 2.3, 0.35), (0, FL + 1.2, 0), INK, 'Metal')
    m.blk('Foot', (1.8, 0.1, 1.8), (0, FL + 0.05, 0), INK, 'Metal')
    for k in range(n):
        a = k * 90 + R.uniform(-10, 10)
        c = m.at(T(math.sin(math.radians(a)) * 2.4, 0, math.cos(math.radians(a)) * 2.4) * Ry(a))
        c.blk('Seat', (1.5, 0.15, 1.5), (0, FL + 1.55, 0), chair_col, 'Wood')
        c.blk('Back', (1.5, 1.4, 0.12), (0, FL + 2.4, 0.7), chair_col, 'Wood')
        for lx in (-0.6, 0.6):
            for lz in (-0.6, 0.6):
                c.blk('Leg', (0.1, 1.5, 0.1), (lx, FL + 0.78, lz), INK, 'Metal', **NC)


def indoor_tree(b, h=14, pot=0x3A3836):
    m = b.model('IndoorTree')
    m.box('Planter', -2.2, FL, -2.2, 2.2, FL + 2.6, 2.2, pot, 'Concrete')
    m.box('Soil', -2.0, FL + 2.5, -2.0, 2.0, FL + 2.65, 2.0, 0x2E2016, 'Ground', **DEC)
    m.cyl('Trunk', h - 4, 0.6, (0, FL + 2.6 + (h - 4) / 2, 0), 0x5A4430, 'Wood')
    for k in range(10):
        a = R.uniform(0, math.tau)
        r = R.uniform(0.5, 3)
        m.ball('Canopy', R.uniform(2.6, 4), (math.cos(a) * r, FL + h - R.uniform(0, 4), math.sin(a) * r), R.choice([0x3E6B35, 0x4A7A3A, 0x2E5A2A]), 'Grass')


def stanchions(b, pts, rope=0x8A0A14):
    for i, (x, z) in enumerate(pts):
        b.cyl('Stanchion', 3.0, 0.25, (x, FL + 1.5, z), BRASS, 'Metal')
        b.cyl('StanchionBase', 0.15, 1.0, (x, FL + 0.08, z), BRASS, 'Metal')
        if i:
            px, pz = pts[i - 1]
            b.beam('Rope', (px, FL + 2.8, pz), ((px + x) / 2, FL + 2.3, (pz + z) / 2), 0.18, 0.18, rope, 'Fabric', **NC)
            b.beam('Rope', ((px + x) / 2, FL + 2.3, (pz + z) / 2), (x, FL + 2.8, z), 0.18, 0.18, rope, 'Fabric', **NC)


def fluted_panel(b, axis, a0, a1, plane, side, y0=FL, y1=CH, col=WALNUT, step=1.2):
    """Walnut panelling with vertical fluting on one face of a wall (side=+1/-1 = which face)."""
    m = b.model('Panelling')
    d = 0.18
    if axis == 'x':
        m.box('Panel', a0, y0, plane + side * 0.25, a1, y1, plane + side * (0.25 + d), col, 'Wood')
    else:
        m.box('Panel', plane + side * 0.25, y0, a0, plane + side * (0.25 + d), y1, a1, col, 'Wood')
    u = a0 + step / 2
    while u < a1:
        if axis == 'x':
            m.box('Flute', u - 0.12, y0 + 0.8, plane + side * (0.25 + d), u + 0.12, y1 - 0.6, plane + side * (0.25 + d + 0.08), WALNUT_D, 'Wood', **DEC)
        else:
            m.box('Flute', plane + side * (0.25 + d), y0 + 0.8, u - 0.12, plane + side * (0.25 + d + 0.08), y1 - 0.6, u + 0.12, WALNUT_D, 'Wood', **DEC)
        u += step
    for yy in (y0 + 0.5, y1 - 0.4):
        if axis == 'x':
            m.box('Rail', a0, yy - 0.12, plane + side * (0.25 + d), a1, yy + 0.12, plane + side * (0.25 + d + 0.12), BRASS, 'Metal', **DEC)
        else:
            m.box('Rail', plane + side * (0.25 + d), yy - 0.12, a0, plane + side * (0.25 + d + 0.12), yy + 0.12, a1, BRASS, 'Metal', **DEC)


def picture_light(b, x, y, z, facing):
    yaw = {'-z': 0, '+z': 180, '-x': 90, '+x': -90}[facing]
    m = b.at(T(x, y, z) * Ry(yaw))
    m.blk('PicLightArm', (0.12, 0.12, 0.8), (0, 0, -0.4), BRASS, 'Metal', **DEC)
    p = m.cyl('PicLight', 1.6, 0.3, (0, 0, -0.8), BRASS, 'Metal', axis='x', **DEC)
    light(p, 'SpotLight', 0xFFD8A0, 0.8, 8, False, 'Bottom', 70)


def chandelier(b, x, z, y, r=2.2, n=8):
    m = b.model('Chandelier')
    m.blk('Chain', (0.1, CH - y, 0.1), (x, (CH + y) / 2, z), BRASS, 'Metal', **DEC)
    m.cyl('Ring', 0.25, r * 2, (x, y, z), BRASS, 'Metal', **NC)
    for k in range(n):
        a = k / n * math.tau
        m.ball('Crystal', 0.45, (x + math.cos(a) * r, y - 0.5, z + math.sin(a) * r), 0xF0F0FF, 'Glass', tr=0.3, **DEC)
        m.cyl('Candle', 0.6, 0.18, (x + math.cos(a) * r * 0.8, y + 0.4, z + math.sin(a) * r * 0.8), 0xF4F0E8, **DEC)
    P.bulb(m, x, y - 0.3, z, color=0xFFD0A0, bright=1.0, rng=22, d=0.5, shadows=True)


# ===================================================================== 60F 사내식당
def f60(fb, F):
    s = fb.model('Cafeteria')
    g = fb.model('Gameplay')
    Z = (-56, 62, -55, 40)
    floor_finish(s, (-56, 62, -55, 14), 0xC8BEB0, 'Granite')
    floor_finish(s, (-56, 62, 14, 40), 0xB8C0C0, 'Slate')
    wall(s, 'x', -56, 62, 40, 0xE0DCD4, name='NorthWall')
    wall(s, 'z', -55, 40, -56, 0xD8C8B0, name='WestWall')
    east_edge(s, -55, 40, 0xD8C8B0)
    wall(s, 'x', -56, 62, 14, 0xD8C8B0, openings=[(5, 46, 3.3, 8.2), (-32, 14, 2.8, 6.0), (46, 3.8, 0, DOOR_H)], name='ServeryWall')
    door_leaf(s, 'x', 46, 14, open_deg=0, hinge=-1, swing=1, color=0xB8BCC0)
    s.box('ServeryHeader', -18, FL + 8.2, 13.5, 28, FL + 10, 13.75, 0x2A1A14, 'Wood')
    sg = P.sign(s, '진미국수  PSI점', 5, FL + 9.1, 13.4, '-z', 14, 1.5, bg=0x2A1A14, fg=0xF2D8A0, glow=True, name='BrandSign', font=20)
    light(sg, 'SurfaceLight', 0xFFD8A0, 0.6, 10, False, 'Front', 110)
    trof = troffer_grid((-56, 62, -55, 14), 12, 10, (6, 5))
    ceiling_grid(s, (-56, 62, -55, 14), troffers=trof, col=0xEDEBE6, bright=0.55, color=0xFFF0DC)
    ceiling_grid(s, (-56, 62, 14, 40), troffers=troffer_grid((-56, 62, 14, 40), 10, 8, (5, 4)), col=0xE8ECEC, bright=0.8, color=0xF4F8FF)
    blinds(s, -55, 61, -54.4, closed=0.3)
    # serving line
    sv = s.model('ServingLine')
    sv.box('Counter', -18, FL, 11.2, 28, FL + 3.2, 13.75, 0xB8BCC0, 'Metal')
    sv.box('CounterTop', -18.2, FL + 3.2, 11.0, 28.2, FL + 3.35, 13.75, 0xD8DCE0, 'Metal')
    for k in range(9):
        x = -15 + k * 5
        sv.blk('Well', (4.2, 0.25, 1.8), (x, FL + 3.4, 12.4), 0x8A8E92, 'Metal', **NC)
        sv.blk('Food', (3.8, 0.12, 1.5), (x, FL + 3.5, 12.4), R.choice([0xC83A1A, 0xE8D8A0, 0x5A8A3A, 0x2B1A0E, 0xD8B070, 0xF0E8C8]), **DEC)
        sv.blk('Ladle', (0.12, 0.12, 1.4), (x + 1.2, FL + 3.75, 12.0), 0xC8CCD0, 'Metal', rot=Rx(-20), **DEC)
    sv.box('SneezeGuard', -18, FL + 5.4, 10.9, 28, FL + 5.5, 12.6, 0xC8E0E8, 'Glass', tr=0.6)
    for x in range(-18, 29, 6):
        sv.blk('GuardPost', (0.12, 2.2, 0.12), (x, FL + 4.4, 11.2), 0xC8CCD0, 'Metal', **NC)
        p = sv.blk('HeatLamp', (0.8, 0.12, 0.5), (x + 3, FL + 5.35, 12.2), 0xFFA060, 'Neon', **DEC)
        light(p, 'SpotLight', 0xFFA060, 0.5, 6, False, 'Bottom', 80)
    for z in (9.6, 10.2):
        sv.box('TrayRail', -18, FL + 2.85, z - 0.08, 28, FL + 3.0, z + 0.08, 0xC8CCD0, 'Metal')
    for x in range(-16, 28, 6):
        sv.blk('RailBracket', (0.12, 0.6, 0.8), (x, FL + 2.6, 10.6), 0xC8CCD0, 'Metal', **NC)
    for x, txt in ((-30, '식판 반납'), (36, '수저 · 식판')):
        P.sign(s, txt, x, FL + 6.9, 13.45, '-z', 4, 0.8, bg=0xF0EDE6, fg=0x2A2A2A, name='StationSign')
    # tray/cutlery station + tray return
    from vignettes import ticket_machine, bowl_stack
    ts = s.model('TrayStation')
    ts.box('Cabinet', 32, FL, 10.6, 40, FL + 3, 13.75, 0xB8BCC0, 'Metal')
    for i in range(12):
        ts.blk('Tray', (2.2, 0.08, 1.6), (34 + R.uniform(-0.05, 0.05), FL + 3.05 + i * 0.09, 12), 0x7A8A9A, **NC)
    for i, col in enumerate((0xC8CCD0, 0xC8CCD0, 0xC8A050)):
        ts.blk('CutleryBin', (0.9, 0.8, 0.9), (37 + i, FL + 3.4, 12), col, 'Metal', **NC)
    ts.box('ReturnBelt', -39, FL + 2.8, 12, -25, FL + 3.0, 15.5, 0x2A2A2A, 'Fabric')
    ticket_machine(s.at(T(48, FL, -2) * Ry(180)))
    # seating: booths along the windows, communal tables, 4-tops
    for x in range(-48, 46, 9):
        booth(s.at(T(x, 0, -50.4)), w=6)
    for z in (-28, -8):
        for x0 in (-44, 0):
            s.blk('CommunalTop', (30, 0.25, 4.2), (x0 + 15, FL + 2.5, z), 0x8A6A48, 'Wood')
            for xx in (x0 + 2, x0 + 15, x0 + 28):
                s.blk('CommunalLeg', (0.5, 2.3, 3.4), (xx, FL + 1.2, z), INK, 'Metal')
            for k in range(7):
                for sd in (-1, 1):
                    st = s.at(T(x0 + 2.5 + k * 4.2 + R.uniform(-0.3, 0.3), 0, z + sd * 3.2))
                    st.cyl('StoolSeat', 0.25, 1.3, (0, FL + 1.75, 0), 0x2A2826, 'Wood')
                    st.cyl('StoolPost', 1.6, 0.15, (0, FL + 0.85, 0), INK, 'Metal', **NC)
                    st.cyl('StoolBase', 0.1, 0.9, (0, FL + 0.05, 0), INK, 'Metal', **NC)
            for xx in (x0 + 6, x0 + 15, x0 + 24):
                pendant(s, xx, z, drop=4.2)
            for k in range(4):
                bx = x0 + R.uniform(2, 28)
                s.cyl('Bowl', 0.45, 1.2, (bx, FL + 2.85, z + R.uniform(-1, 1)), 0xF4F0E8, **NC)
    rs = s.blk('Reserved', (2.6, 1.0, 0.1), (15, FL + 3.1, -28), 0xF6F0E0, rot=Rx(-20))
    gui_text(rs, '8팀 예약 21:00', 'Front', bg=0xF6F0E0, fg=0x8A1010, font=19, ppu=50)
    for x in range(-48, 46, 9):
        if -12 < x < 0:
            continue
        square_table(s.at(T(x, 0, 2.5) * Ry(R.uniform(-8, 8))))
    for x in (-24, 12, 36):
        Q.planter_long(s.at(T(x, FL, -18) * Ry(90)))
    Q.water_cooler(s.at(T(-54.6, FL, -30) * Ry(-90)))
    Q.water_cooler(s.at(T(-54.6, FL, -26) * Ry(-90)))
    Q.trash_bins(s.at(T(-54.4, FL, -10) * Ry(-90)))
    wall_art(s, -55.7, FL + 6, 0, '+x', 6, 3.6, art=0xC8A060)
    # kitchen
    kt = s.model('Kitchen')
    kt.box('PrepLine', -50, FL, 37.6, 40, FL + 2.9, 39.75, 0xB8BCC0, 'Metal')
    kt.box('PrepTop', -50, FL + 2.9, 37.4, 40, FL + 3.05, 39.75, 0xD8DCE0, 'Metal')
    kt.box('Hood', -40, FL + 7.6, 34, 0, FL + 9.2, 39.75, 0xB8BCC0, 'Metal')
    for k in range(5):
        x = -36 + k * 8
        kt.blk('Range', (4, 2.9, 3), (x, FL + 1.45, 36), 0x3A3A3C, 'Metal')
        kt.cyl('StockPot', 3, 3.2, (x, FL + 4.4, 36), 0xA8ACB0, 'Metal')
        st = kt.blk('SteamP', (1, 0.2, 1), (x, FL + 6.0, 36), 0, tr=1, **DEC)
        particles(st, 'steam', 4)
    kt.box('Island', -30, FL, 22, 20, FL + 2.9, 27, 0xB8BCC0, 'Metal')
    kt.box('IslandTop', -30, FL + 2.9, 22, 20, FL + 3.05, 27, 0xD8DCE0, 'Metal')
    for x in (-24, -10, 4, 14):
        bowl_stack(kt.at(T(x, FL + 3.05, 24.5)), 8)
    kt.box('WalkInDoor', 52, FL, 39.4, 58, FL + 8, 39.75, 0xC8CCD0, 'Metal')
    kt.blk('WalkInHandle', (0.3, 1.6, 0.3), (56.8, FL + 4, 39.2), 0x2A2A2A, 'Metal')
    for i in range(5):
        kt.blk('RiceSack', (2.4, 0.9, 1.6), (-54 + R.uniform(-0.2, 0.2), FL + 0.45 + i * 0.85, 30), 0xE8E0C8, 'Fabric', rot=Ry(R.uniform(-10, 10)))
    downlight(s, 56, -12, bright=0.7, rng=16, shadows=True)


# ===================================================================== 1F 로비
def f1(fb, F):
    c = F['h'] - 1
    s = fb.model('Lobby')
    g = fb.model('Gameplay')
    floor_finish(s, (-79, 62, -55, 55), MARBLE, 'Marble')
    for x in range(-72, 62, 8):
        s.box('Inlay', x - 0.08, FL, -55, x + 0.08, FL + 0.01, 55, 0xB8B0A4, **DEC)
    for z in range(-48, 55, 8):
        s.box('Inlay', -79, FL, z - 0.08, 62, FL + 0.01, z + 0.08, 0xB8B0A4, **DEC)
    s.cyl('Medallion', 0.03, 16, (0, FL + 0.02, -10), 0x3A3634, 'Marble', **DEC)
    s.cyl('MedallionIn', 0.035, 12, (0, FL + 0.025, -10), 0x8A1010, 'Marble', **DEC)
    s.cyl('MedallionCore', 0.04, 7, (0, FL + 0.03, -10), MARBLE, 'Marble', **DEC)
    # feature wall + reception
    fw = s.model('FeatureWall')
    fw.box('Wall', -26, 0, 45.5, 26, c, 47, 0x2A1E16, 'Wood')
    for x in range(-25, 26, 1):
        fw.box('Slat', x - 0.25, FL, 45.2, x + 0.25, c - 1, 45.5, 0x6A4A30 if x % 2 else 0x5A3E28, 'Wood', **DEC)
    logo = P.sign(fw, 'PSI', 0, FL + 15, 45.0, '-z', 20, 8, bg=0x2A1E16, fg=0xF2E8D0, glow=True, name='Logo', font=20, part_tr=1)
    for x in (-18, 0, 18):
        p = fw.blk('WallWasher', (1.2, 0.4, 0.6), (x, c - 1.2, 43.5), INK, 'Metal', **DEC)
        light(p, 'SpotLight', 0xFFD8A8, 1.4, 24, x == 0, 'Back', 60)
    rc = s.model('Reception')
    for i in range(11):
        a = math.radians(-50 + i * 10)
        x, z = math.sin(a) * 18, 36 - math.cos(a) * 9
        rc.blk('DeskBody', (3.4, 3.8, 2.2), (x, FL + 1.9, z), 0xF0EDE6, 'Marble', rot=Ry(-math.degrees(a) * 0.55))
        rc.blk('DeskTop', (3.6, 0.2, 2.8), (x, FL + 3.9, z + 0.2), 0x2A2826, 'Granite', rot=Ry(-math.degrees(a) * 0.55))
        rc.blk('DeskBand', (3.45, 0.2, 0.05), (x, FL + 0.6, z - 1.12), BRASS, 'Metal', rot=Ry(-math.degrees(a) * 0.55), **DEC)
    for x in (-5, 5):
        workstation(rc.at(T(x, 0, 39.5)), w=4.4, d=2.2, top=0x2A2826, panel=False, screen='방문객 0명' if x < 0 else 'B13 — 신호 없음', mess=0.3)
    rc.blk('Bell', (0.6, 0.4, 0.6), (0, FL + 4.2, 27.2), BRASS, 'Metal', **NC)
    # columns
    for x in (-48, -24, 24, 48):
        for z in (-36, 10):
            s.cyl('Column', c - 1.6, 3.2, (x, FL + 0.8 + (c - 1.6) / 2, z), 0xEDE8DE, 'Marble')
            s.box('ColumnBase', x - 2.0, FL, z - 2.0, x + 2.0, FL + 0.8, z + 2.0, 0x3A3634, 'Marble')
            s.cyl('ColumnCap', 0.8, 4.0, (x, c - 0.4, z), 0xEDE8DE, 'Marble')
            p = s.blk('Uplight', (0.6, 0.2, 0.6), (x, FL + 0.9, z - 2.1), 0xFFE0B0, 'Neon', **DEC)
            light(p, 'SpotLight', 0xFFD8A8, 0.8, 18, False, 'Top', 40)
    # security gates
    for i in range(6):
        z = -7 + i * 4
        s.box('GatePod', 38, FL, z - 0.45, 43, FL + 3.4, z + 0.45, 0xD8DCE0, 'Metal')
        s.box('GateTop', 38, FL + 3.4, z - 0.5, 43, FL + 3.55, z + 0.5, 0x2A2C2E, 'Glass')
        s.blk('Flap', (0.1, 2.0, 1.6), (40.5, FL + 2.6, z + 1.2), 0xA8C8D8, 'Glass', tr=0.4, **NC)
        s.blk('Reader', (0.8, 0.06, 0.8), (38.8, FL + 3.6, z), 0x2AFF6A, 'Neon', **DEC)
    workstation(s.at(T(50, 0, 32) * Ry(-90)), w=6, d=2.8, top=0x2A2826, panel=False, screen='CCTV  B13 — 신호 없음', name='보안', mess=0.4)
    # lounges
    for (lx, lz) in ((-56, -18), (-56, 30)):
        rug(s.at(T(lx, 0, lz)), 18, 14, 0x3A2E28, 0x4A3A30)
        sofa(s.at(T(lx, 0, lz + 5) * Ry(180)), w=10, col=0x2A2C30)
        sofa(s.at(T(lx, 0, lz - 5)), w=10, col=0x2A2C30)
        coffee_table(s.at(T(lx, 0, lz)), w=6, d=3)
        armchair(s.at(T(lx - 8, 0, lz) * Ry(90)), col=0x6A4A30)
        floor_lamp(s.at(T(lx + 7, 0, lz + 6)))
    for x, z in ((-70, -46), (-70, 46), (30, -46), (-30, -46), (60, 44)):
        indoor_tree(s.at(T(x, 0, z)), h=16)
    from vignettes import coffee_kiosk
    coffee_kiosk(s.at(T(-30, FL, 42) * Ry(180)))
    stanchions(s, [(36, -9 + k * 3) for k in range(9)])
    Q.atm(s.at(T(-78.3, FL, 4) * Ry(-90)))
    Q.newspaper_rack(s.at(T(-78.4, FL, 10) * Ry(-90)))
    dr = s.blk('Directory', (0.4, 13, 6), (61.3, FL + 7.5, 40), 0x14161A, 'Metal')
    gui_text(dr, '층별 안내\n88F 공유 하우스\n87F (출입 통제)\n80F 문서보관소\n77F (존재하지 않는 층)\n70F 보안관제센터\n66F ■■ 지옥\n60F 사내식당\n50F 조수민 하우스\n'
             '44F 연회장\n40F 오피스\n30F 피트니스\n20F 회장실\n10F 어린이집\n8F 정보구출반\n1F 로비\nB1 파르티르레트\nB2 기니방\nB3 ■■■■\nB6~13 지하병원\n▼ 지구 내핵',
             'Left', bg=0x14161A, fg=0xE8E0C8, glow=True, font=19, ppu=30, pad=0.05)
    # linear pendants + chandelier ring
    for x in (-40, 0, 40):
        for z in (-30, 0, 30):
            s.blk('Cable', (0.06, 8, 0.06), (x, c - 4, z), INK, **DEC)
            p = s.blk('LinearPendant', (10, 0.4, 0.6), (x, c - 8, z), 0x2A2826, 'Metal', **NC)
            q = s.blk('LinearGlow', (9.6, 0.06, 0.4), (x, c - 8.22, z), 0xFFF0D8, 'Neon', **DEC)
            light(q, 'SurfaceLight', 0xFFE8C8, 1.2, 30, x == 0 and z == 0, 'Bottom', 120)
    # sculpture
    sc = s.model('Sculpture')
    for i in range(7):
        sc.blk('Cube', (4 - i * 0.4,) * 3, (0, FL + 3 + i * 3.4, -10), 0x8A1010 if i % 2 else 0x1A1A1A, 'Metal', refl=0.2, rot=Ry(i * 21) * Rx(i * 9))
    p = sc.blk('SculptLight', (1, 1, 1), (0, FL + 1, -18), 0, tr=1, **DEC)
    light(p, 'SpotLight', 0xFFE0C0, 1.5, 30, True, 'Top', 35)
    # main entrance (gameplay)
    mg = g.model('MainEntrance')
    mg.box('PortalFrameL', -14, 0, -56.5, -12, 16, -54.5, 0x1A1A1A, 'Metal')
    mg.box('PortalFrameR', 12, 0, -56.5, 14, 16, -54.5, 0x1A1A1A, 'Metal')
    mg.box('PortalHeader', -14, 16, -56.5, 14, 19, -54.5, 0x1A1A1A, 'Metal')
    mg.box('UpperGlass', -12, 19, -56, 12, c, -55.6, 0x31424A, 'Glass', tr=0.45)
    mg.cyl('RevolvingDrum', 10, 9, (0, FL + 5, -55.5), 0x9AB0B8, 'Glass', tr=0.6)
    mg.cyl('RevolvingCap', 1, 9.6, (0, FL + 10.5, -55.5), 0x1A1A1A, 'Metal')
    for a in (0, 90):
        mg.blk('Wing', (8.6, 9.4, 0.15), (0, FL + 5, -55.5), 0xB8C8D0, 'Glass', tr=0.5, rot=Ry(a + 20))
    for xc in (-8, 8):
        mg.box('DoorGlass', xc - 3.6, FL, -55.8, xc + 3.6, FL + 12, -55.4, 0x9AB0B8, 'Glass', tr=0.5)
        mg.box('DoorBar', xc - 0.15, FL, -55.9, xc + 0.15, FL + 12, -55.3, 0x1A1A1A, 'Metal')
        P.chains_x(mg.at(T(xc, FL, -54.6)), 6.5, 12, z=0)
    mg.box('MainGate', -12, 0, -56.6, 12, 16, -54.2, 0xFF00FF, tr=1, tags=['MainGate'])
    P.sign(mg, '정문 — 열쇠가 필요합니다', 0, FL + 13.5, -54.0, '+z', 10, 1.4, bg=0x111111, fg=0xFFD23A, name='GateSign')
    ks = mg.model('KeySlot')
    ks.box('Panel', 15, FL + 3.5, -54.6, 17.5, FL + 7, -54.2, 0x2A2A2E, 'Metal')
    hole = ks.blk('KeyHole', (0.5, 1.0, 0.1), (16.25, FL + 5.4, -54.15), BRASS, 'Neon', tags=['KeySlot'])
    light(hole, 'PointLight', 0xFFD060, 0.6, 8)
    P.sign(ks, '열쇠 구멍', 16.25, FL + 6.6, -54.1, '+z', 2.3, 0.6, bg=0x2A2A2E, fg=0xFFD23A, name='KeyHint')
    mg.box('EntryMat', -14, FL, -54, 14, FL + 0.04, -46, 0x2A2826, 'Fabric', **DEC)
    P.sign(s, '지하로 → B1 파르티르레트', 61.7, FL + 6, -18, '-x', 7, 1.2, bg=0x111111, fg=0xC8C8C8, name='Down')


# ===================================================================== 20F 회장실
def f20(fb, F):
    s = fb.model('Executive')
    g = fb.model('Gameplay')
    Z = (-79, 62, -40, 40)
    floor_finish(s, Z, 0xE0D8CA, 'Marble')
    wall(s, 'x', -79, 62, -40, 0xD8CFC0, name='SouthWall')
    wall(s, 'x', -79, 62, 40, 0xD8CFC0, name='NorthWall')
    east_edge(s, -40, 40, 0xD8CFC0)
    s.box('Ceiling', -79, CH, -40, 62, CH + 0.3, 40, 0xF2EEE6, shadow=False)
    # gallery corridor z[-6,6]
    wall(s, 'x', -30, 44, 6, 0xD8CFC0, openings=[(12, 3.8, 0, DOOR_H)], name='GalleryNorth')
    wall(s, 'x', -30, 44, -6, 0xD8CFC0, openings=[(12, 3.8, 0, DOOR_H)], name='GallerySouth')
    for side, plane in ((1, -6), (-1, 6)):
        fluted_panel(s, 'x', -30, 10, plane, side)
        fluted_panel(s, 'x', 14, 44, plane, side)
    s.box('Runner', -30, FL, -2, 44, FL + 0.04, 2, 0x6A1018, 'Fabric', **DEC)
    s.box('RunnerBorder', -30, FL, -2.4, 44, FL + 0.015, 2.4, BRASS, 'Fabric', **DEC)
    for i, x in enumerate((-22, -6, 26, 38)):
        for zz, f in ((-5.3, '+z'), (5.3, '-z')):
            wall_art(s, x, FL + 6, zz, f, 4.4, 3.2, art=R.choice([0x3A2A20, 0x5A3A2A, 0x2A3A4A, 0x6A5A40]))
            picture_light(s, x, FL + 8.6, zz, f)
    for x in (-14, 2, 20, 32):
        Q.pedestal_vase(s.at(T(x, FL, -4.6) * Ry(180)))
    for x in range(-24, 44, 12):
        downlight(s, x, 0, bright=0.4, rng=12)
    door_leaf(s, 'x', 12, 6, open_deg=60, hinge=-1, swing=1, color=WALNUT)
    door_leaf(s, 'x', 12, -6, open_deg=45, hinge=1, swing=-1, color=WALNUT)
    # reception / secretary near the stairs
    sec = s.model('Secretary')
    workstation(sec.at(T(48, 0, -30) * Ry(-90)), w=7, d=3, top=WALNUT, panel=False, screen='오늘 일정\n— 없음 —', name='비서실', mess=0.5)
    sofa(sec.at(T(56, 0, 30) * Ry(180)), w=8, col=0x3A1A1A)
    Q.pedestal_vase(sec.at(T(46, FL, 36) * Ry(180)))
    indoor_tree(sec.at(T(58, 0, -35)), h=10, pot=WALNUT_D)
    # chairman office (west)
    wall(s, 'z', -40, 40, -30, 0xD8CFC0, openings=[(0, 7.6, 0, 9)], name='OfficeWall')
    fluted_panel(s, 'z', -40, -4, -30, -1)
    fluted_panel(s, 'z', 4, 40, -30, -1)
    fluted_panel(s, 'x', -79, -30, 40, -1)
    fluted_panel(s, 'x', -79, -30, -40, 1)
    for sg in (-1, 1):
        s.blk('OfficeDoor', (0.3, 8.8, 3.6), (-31.4, FL + 4.4, sg * 3.3), WALNUT, 'Wood', rot=Ry(sg * 55))
    P.sign(s, '회장실', -29.4, FL + 10, 0, '+x', 4, 0.9, bg=WALNUT_D, fg=BRASS, name='OfficeSign')
    of = s.model('Office')
    for x in range(-76, -32, 6):
        of.box('CofferBeam', x - 0.3, CH - 0.9, -40, x + 0.3, CH, 40, WALNUT, 'Wood', **DEC)
    for z in range(-36, 40, 6):
        of.box('CofferBeam', -79, CH - 0.9, z - 0.3, -30, CH, z + 0.3, WALNUT, 'Wood', **DEC)
    rug(of.at(T(-56, 0, 0)), 28, 22, 0x5A1018, 0x7A2028)
    of.blk('RugBorder', (24, 0.06, 18), (-56, FL + 0.04, 0), 0x3A0A10, 'Fabric', **DEC)
    of.blk('RugCenter', (10, 0.07, 8), (-56, FL + 0.045, 0), 0xB8862A, 'Fabric', **DEC)
    dk = of.model('GrandDesk')
    dk.box('Top', -68, FL + 2.8, -6, -60, FL + 3.15, 6, WALNUT_D, 'Wood')
    dk.box('Pedestal', -67.6, FL, -5.6, -66, FL + 2.8, 5.6, WALNUT, 'Wood')
    dk.box('Pedestal', -62, FL, -5.6, -60.4, FL + 2.8, 5.6, WALNUT, 'Wood')
    dk.box('Modesty', -60.6, FL + 0.5, -5.6, -60.3, FL + 2.8, 5.6, WALNUT, 'Wood')
    dk.box('Inlay', -67.8, FL + 3.15, -5.8, -60.2, FL + 3.16, 5.8, 0x2A3A2A, 'Fabric', **DEC)
    dk.blk('Lamp', (0.3, 1.4, 0.3), (-65, FL + 3.85, -4.5), BRASS, 'Metal', **NC)
    dk.cyl('LampShade', 1.4, 0.5, (-65, FL + 4.6, -4.5), 0x1E5A3A, 'Glass', axis='z', **NC)
    P.bulb(dk, -65, FL + 4.4, -4.5, color=0xFFD890, bright=0.8, rng=12, shadows=True, d=0.3)
    dk.blk('Pen', (0.1, 0.1, 1.0), (-63, FL + 3.22, 1), BRASS, 'Metal', rot=Ry(30), **DEC)
    dk.blk('Folder', (1.4, 0.1, 1.9), (-63.5, FL + 3.22, -1), 0x5A1018, rot=Ry(8), **DEC)
    ch = of.model('ChairmanChair')
    ch.blk('Seat', (3, 0.7, 3), (-70.5, FL + 2.0, 0), 0x1A0A08, 'Fabric')
    ch.blk('Back', (0.7, 5.2, 3), (-71.9, FL + 4.6, 0), 0x1A0A08, 'Fabric', rot=Rz(8))
    ch.cyl('Post', 1.6, 0.4, (-70.5, FL + 0.9, 0), INK, 'Metal')
    for z in (-34, -22, 22, 34):
        bookcase(of.at(T(-76.8, 0, z) * Ry(-90)), w=10, h=10)
    fp = of.model('Fireplace')
    fp.box('Surround', -50, FL, -39.75, -38, FL + 8, -37.6, 0xE8E2D6, 'Marble')
    fp.box('Opening', -47, FL + 0.6, -37.65, -41, FL + 5, -37.55, 0x111111)
    fp.box('Mantel', -51, FL + 8, -39.75, -37, FL + 8.6, -37.2, 0xE8E2D6, 'Marble')
    fire = fp.blk('Logs', (4, 0.6, 1.2), (-44, FL + 1.0, -38.6), 0x3A1A0A, 'Wood')
    fi = Inst('Fire', 'Fire', fire)
    fi.prop('float', 'size_xml', 4)
    fi.prop('float', 'heat_xml', 6)
    fi.prop('Color3', 'Color', 0xFF8A2A)
    fi.prop('Color3', 'SecondaryColor', 0xFF3A0A)
    light(fire, 'PointLight', 0xFF8A3A, 1.6, 22, True)
    for i in range(3):
        fp.blk('MantelItem', (0.8, R.uniform(1, 2), 0.8), (-48 + i * 4, FL + 9.3, -38.5), R.choice([BRASS, 0x1A1A1A, 0xE8E2D6]), 'Metal', **NC)
    wall_art(fp, -44, FL + 12, -39.6, '+z', 6, 4, art=0x1A1418)
    sofa(of.at(T(-44, 0, -28) * Ry(180)), w=9, col=0x2A0A0A)
    armchair(of.at(T(-36, 0, -32) * Ry(-90)), col=0x3A1A10)
    armchair(of.at(T(-52, 0, -32) * Ry(90)), col=0x3A1A10)
    coffee_table(of.at(T(-44, 0, -32)), w=5, d=2.6)
    from vignettes import chess_table, grand_piano, aquarium
    chess_table(of.at(T(-42, FL, 26)))
    Q.grandfather_clock(of.at(T(-31.2, FL, 30) * Ry(90)))
    Q.bar_cart(of.at(T(-33, FL, 18) * Ry(90)))
    globe = of.model('Globe')
    globe.blk('Stand', (0.4, 3, 0.4), (-58, FL + 1.5, 22), WALNUT_D, 'Wood')
    globe.ball('Globe', 2.6, (-58, FL + 4.2, 22), 0x3A6A8A)
    safe = g.model('Safe')
    safe.box('Body', -78.6, FL, 8, -75, FL + 4, 12, 0x2A2A2E, 'Metal')
    safe.cyl('Dial', 0.3, 1.2, (-74.85, FL + 2.4, 10), STEEL, 'Metal', axis='x')
    tag(safe, 'Safe')
    for x in (-62, -44):
        for z in (-18, 18):
            chandelier(of, x, z, CH - 2.6)
    for z in (-30, -14, 14, 30):
        p = of.blk('PortraitLight', (1, 1, 1), (-70, CH - 0.4, z), 0, tr=1, **DEC)
    for i, z in enumerate((-12, 12)):
        wall_art(of, -31.0, FL + 7, z, '-x', 3.6, 4.6, art=0x1A1418)
        of.ball('Face', 1.8, (-31.25, FL + 7.6, z), 0xC8B8A8, **DEC)
        picture_light(of, -31.0, FL + 9.9, z, '-x')
    # board room (north)
    br = s.model('BoardRoom')
    br.blk('LongTable', (40, 0.35, 7), (6, FL + 2.6, 24), WALNUT_D, 'Wood')
    for x in (-8, 6, 20):
        br.blk('TableBase', (2, 2.4, 3), (x, FL + 1.2, 24), INK, 'Metal')
    for k in range(9):
        x = -12 + k * 4.5
        for sd in (-1, 1):
            office_chair(br.at(T(x, 0, 24 + sd * 4.8) * Ry(0 if sd > 0 else 180)), col=0x2A0A0A)
    scr = br.blk('Screen', (14, 7, 0.3), (6, FL + 6, 39.6), INK)
    gui_text(scr, '분기 실적\n인원: 88 → 6', 'Front', bg=0x0A0A0A, fg=0xC8C8C8, glow=True, font=10, ppu=20)
    for x in (-6, 6, 18):
        pendant(br, x, 24, drop=4.4)
    # executive lounge (south)
    lg = s.model('ExecLounge')
    for x in (-20, -4, 22):
        armchair(lg.at(T(x, 0, -30) * Ry(R.uniform(150, 210))), col=0x3A1A10)
        armchair(lg.at(T(x + 5, 0, -30) * Ry(R.uniform(150, 210))), col=0x3A1A10)
        lg.cyl('SideTable', 0.2, 1.6, (x + 2.5, FL + 2.0, -30), WALNUT_D, 'Wood', **NC)
        lg.cyl('SideTablePost', 1.9, 0.3, (x + 2.5, FL + 1.0, -30), BRASS, 'Metal', **NC)
        lg.cyl('Whisky', 0.5, 0.4, (x + 2.5, FL + 2.35, -30), 0x8A5A20, 'Glass', tr=0.2, **NC)
    lg.box('BarBack', -10, FL, -39.75, 10, FL + 8, -38, WALNUT_D, 'Wood')
    for k in range(10):
        lg.cyl('Bottle', 1.2, 0.4, (-8 + k * 1.8, FL + 5.2, -38.7), R.choice([0x5A3A10, 0x1A3A1A, 0xE8E8E0, 0x6A1010]), 'Glass', **NC)
    lg.box('BarShelf', -10, FL + 4.5, -39.75, 10, FL + 4.6, -37.8, BRASS, 'Metal')
    aquarium(lg.at(T(30, FL, -38.2) * Ry(180)))
    for x in (-14, 6, 26):
        chandelier(lg, x, -24, CH - 2.4, r=1.6, n=6)
    downlight(s, 56, -12, bright=0.7, rng=16)


# ===================================================================== 10F 사내 어린이집
PASTEL = [0xC8E4D8, 0xF4D8C8, 0xF4ECC0, 0xD8D8F0, 0xF0D0D8]


def kid_table(b, col):
    m = b.model('KidTable')
    m.blk('Top', (4.4, 0.18, 2.6), (0, FL + 1.75, 0), col, 'SmoothPlastic')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.cyl('Leg', 1.65, 0.25, (sx * 1.9, FL + 0.85, sz * 1.0), 0xEDEBE6, **NC)
    for k in range(4):
        sx, sz = (-1.1 if k % 2 else 1.1), (-1 if k < 2 else 1)
        c = m.at(T(sx, 0, sz * 2.0) * Ry(0 if sz > 0 else 180))
        cc = R.choice([0xE86A5A, 0x5A8AE8, 0xF0C040, 0x5AB06A])
        c.blk('Seat', (1.1, 0.15, 1.1), (0, FL + 1.05, 0), cc)
        c.blk('Back', (1.1, 0.9, 0.12), (0, FL + 1.6, 0.5), cc)
        for lx in (-0.45, 0.45):
            for lz in (-0.45, 0.45):
                c.blk('Leg', (0.1, 1.0, 0.1), (lx, FL + 0.5, lz), cc, **NC)
    for k in range(R.randint(1, 4)):
        m.cyl('Crayon', 0.6, 0.12, (R.uniform(-1.6, 1.6), FL + 1.9, R.uniform(-0.8, 0.8)), R.choice([0xE03030, 0x3060E0, 0xF0C020]), axis='x', rot=Ry(R.uniform(0, 180)), **DEC)
    if R.random() < 0.6:
        m.blk('Drawing', (1.4, 0.02, 1.0), (R.uniform(-1, 1), FL + 1.86, 0), 0xFAF8F0, rot=Ry(R.uniform(-20, 20)), **DEC)


def cubbies(b, names, col=0xF4ECC0):
    m = b.model('Cubbies')
    w = 2.2
    for i, n in enumerate(names):
        x = (i - (len(names) - 1) / 2) * w
        m.blk('Cubby', (w - 0.1, 5, 1.6), (x, FL + 2.5, 0), col, 'SmoothPlastic')
        m.blk('Hole', (w - 0.5, 1.8, 0.05), (x, FL + 3.4, -0.81), 0xC8BC90, **DEC)
        m.blk('Bag', (1.2, 1.2, 0.6), (x, FL + 3.2, -0.6), R.choice([0xE86A5A, 0x5A8AE8, 0xF0C040, 0x5AB06A, 0xC86AC8]), 'Fabric', **NC)
        m.blk('Shoes', (1.0, 0.35, 0.8), (x, FL + 0.6, -0.6), R.choice([0xF06AA0, 0x6AA0F0, 0xF0F0F0]), **NC)
        t = m.blk('NameTag', (1.6, 0.45, 0.04), (x, FL + 4.7, -0.82), 0xFFFFFF, **DEC)
        gui_text(t, n if n != '조수민' else '조수민 (만지지 마)', 'Front', bg=0xFFFFFF, fg=0xC01010 if n == '조수민' else 0x2A2A2A, font=9, ppu=60)


def f10(fb, F):
    s = fb.model('Daycare')
    g = fb.model('Gameplay')
    Z = (-79, 62, -55, 40)
    floor_finish(s, Z, 0xD8C0A0, 'WoodPlanks')
    wall(s, 'x', -79, 62, 40, 0xF0E8D8, name='NorthWall')
    east_edge(s, -55, 40, 0xF0E8D8)
    s.box('Ceiling', -79, CH, -55, 62, CH + 0.3, 40, 0xFAF6EE, shadow=False)
    # room walls
    wall(s, 'z', -55, 6, -30, PASTEL[3], openings=[(-20, 3.8, 0, DOOR_H)], name='NapWall')
    wall(s, 'x', -79, 30, 6, PASTEL[1], openings=[(-50, 3.8, 0, DOOR_H), (-2, 6, 0, 8.4), (20, 3.8, 0, DOOR_H)], name='MidWall')
    wall(s, 'z', 6, 40, -10, PASTEL[2], name='PlayWashWall')
    wall(s, 'z', -55, 40, 30, PASTEL[0], openings=[(-20, 6, 0, 8.4), (20, 3.8, 0, DOOR_H)], name='EntryWall')
    for c_, pl, ax, w in ((-20, -30, 'z', 3.8), (-50, 6, 'x', 3.8), (-2, 6, 'x', 6), (20, 6, 'x', 3.8), (-20, 30, 'z', 6), (20, 30, 'z', 3.8)):
        casing(s, ax, c_, pl, w, 0, DOOR_H if w < 5 else 8.4)
    door_leaf(s, 'z', -20, -30, open_deg=25, hinge=1, swing=-1, color=0xF0D0D8)
    door_leaf(s, 'x', -50, 6, open_deg=70, hinge=-1, swing=1, color=0xF4ECC0)
    door_leaf(s, 'x', 20, 6, open_deg=80, hinge=1, swing=1, color=0xC8E4D8)
    door_leaf(s, 'z', 20, 30, open_deg=0, hinge=-1, swing=1, color=0xD8D8F0)
    # wainscot stripes in each room
    for (a, c_, z) in ((-79, 30, 5.7), (-79, 30, 6.3)):
        s.box('ChairRail', a, FL + 3.4, z - 0.07, c_, FL + 3.6, z + 0.07, 0xFFFFFF, **DEC)
    # entry hall: cubbies, tiny shoes, stroller
    cubbies(s.at(T(46, 0, 39) * Ry(180)), ['지우', '민준', '서연', '하준', '조수민', '도윤', '서아', '하윤'])
    Q.stroller(s.at(T(36, FL, 30) * Ry(30)))
    Q.coat_hooks(s.at(T(30.35, FL + 4.5, -30) * Ry(-90)), small=True)
    P.sign(s, '햇살반 · PSI 사내 어린이집', 30.35, FL + 9, -20, '+x', 8, 1.4, bg=0xFFF0C8, fg=0xC06020, name='DaycareSign', font=9)
    # classroom
    cl = s.model('Classroom')
    road = cl.model('RoadRug')
    road.blk('Rug', (20, 0.05, 14), (0, FL + 0.03, -30), 0x6AAA6A, 'Fabric', **DEC)
    road.blk('Road', (18, 0.055, 2.6), (0, FL + 0.035, -30), 0x4A4A4E, 'Fabric', **DEC)
    road.blk('Road', (2.6, 0.055, 12), (-4, FL + 0.035, -30), 0x4A4A4E, 'Fabric', **DEC)
    for x in range(-8, 9, 2):
        road.blk('Lane', (1.0, 0.06, 0.2), (x, FL + 0.04, -30), 0xF0F0F0, **DEC)
    for i, (x, z) in enumerate(((-20, -46), (-6, -46), (8, -46), (-20, -12), (8, -12))):
        kid_table(cl.at(T(x, 0, z)), PASTEL[i % 5])
    for k in range(3):
        bookcase(cl.at(T(-28, 0, -50 + k * 5) * Ry(-90)), w=4, h=4)
    for k in range(5):
        Q.cushions(cl.at(T(-24 + R.uniform(-2, 2), FL - 0.4, -36 + R.uniform(-4, 4))))
    for x in (14, 20):
        Q.easel(cl.at(T(x, FL, 4.8) * Ry(180)))
    Q.toy_bin(cl.at(T(26, FL, -10) * Ry(-90)))
    Q.toy_bin(cl.at(T(26, FL, -20) * Ry(-90)))
    from vignettes import block_castle
    block_castle(cl.at(T(18, FL, -30)))
    drawings = ['수민이 언니\n무서워', '도망쳐', '우리 가족\n(수민이 빼고)', '88층에서\n나가고 싶어요', '내 짝꿍\n조수민 ㅠㅠ', '♥ 선생님 ♥', '언니가 또\n때렸어요', '여기 있어']
    for i, t in enumerate(drawings):
        x = -26 + i * 6.6
        p = cl.blk('Drawing', (4.6, 3.4, 0.05), (x, FL + 6.4, 5.68), 0xFAF8F0, rot=Ry(180) * Rz(R.uniform(-5, 5)), **DEC)
        gui_text(p, t, 'Front', bg=0xFAF8F0, fg=R.choice([0xD03030, 0x3050D0, 0x202020]), font=9, ppu=30)
    lone = cl.at(T(-2, 0, -20) * Ry(180))
    lone.blk('Seat', (1.1, 0.15, 1.1), (0, FL + 1.05, 0), 0xE86A5A)
    lone.blk('Back', (1.1, 0.9, 0.12), (0, FL + 1.6, 0.5), 0xE86A5A)
    bn = cl.blk('Banner', (16, 1.8, 0.05), (0, FL + 9.6, 5.68), 0xF0B0C0, rot=Ry(180), **DEC)
    gui_text(bn, '생일 축하해 ▓▓아!', 'Front', bg=0xF0B0C0, fg=0x8A1030, font=9, ppu=30)
    for x in (-18, 0, 18):
        for z in (-44, -24, -4):
            downlight(cl, x, z, color=0xFFE8C8, bright=0.5, rng=14)
    blinds(s, -29, 29, -54.4, closed=0.8)
    # nap room (dim) with chaser spawn
    nr = s.model('NapRoom')
    for i in range(4):
        for j in range(4):
            x, z = -72 + i * 11, -48 + j * 12
            nr.blk('Mat', (3, 0.35, 6), (x, FL + 0.18, z), R.choice([0xF0D0E0, 0xD0E0F0, 0xE8E0B0]), 'Fabric')
            nr.blk('Blanket', (3.2, 0.15, 3.2), (x + 0.1, FL + 0.42, z - 0.8), R.choice([0xF4ECC0, 0xC8E4D8]), 'Fabric', rot=Ry(R.uniform(-10, 10)), **DEC)
            nr.blk('Pillow', (2.2, 0.35, 1.0), (x, FL + 0.5, z + 2.2), 0xFAF6EE, 'Fabric', **DEC)
    from vignettes import mobile_hanging
    for x, z in ((-70, -40), (-48, -24), (-60, -8)):
        mobile_hanging(nr.at(T(x, 0, z)), CH)
    nl = nr.blk('NightLight', (0.6, 0.6, 0.3), (-78.6, FL + 1.4, -20), 0xFFB0D0, 'Neon', **DEC)
    light(nl, 'PointLight', 0xFFA0C8, 0.7, 18)
    g.blk('ChaserSpawn', (4, 6, 4), (-50, FL + 3, -30), 0xFF0000, tr=1, collide=False, tags=['ChaserSpawn'])
    for i in range(5):
        P.handprint(nr, -30.32, FL + 1.4 + (i % 2) * 0.5, -40 + i * 1.6, '-x', color=0xC02020)
    blinds(s, -78, -31, -54.4, closed=1.0)
    # play room
    pl = s.model('PlayRoom')
    pl.box('SoftFloor', -79, FL, 6, -10, FL + 0.3, 40, 0x6AB0E0, 'Fabric')
    for x in range(-76, -12, 8):
        pl.box('MatSeam', x - 0.05, FL + 0.3, 6, x + 0.05, FL + 0.31, 40, 0x4A90C0, **DEC)
    pit = pl.model('BallPit')
    for (a, c_, d, e) in ((-74, -56, 30, 31), (-74, -56, 38.6, 39.6), (-74, -73, 30, 39.6), (-57, -56, 30, 39.6)):
        pit.box('PitWall', a, FL + 0.3, d, c_, FL + 2.6, e, 0xF0C040, 'SmoothPlastic')
    pit.box('BallFill', -73, FL + 0.3, 31, -57, FL + 1.8, 38.6, 0xE86A5A, tr=1)
    for _ in range(110):
        pit.ball('Ball', 0.8, (R.uniform(-72.5, -57.5), R.uniform(FL + 0.7, FL + 2.0), R.uniform(31.5, 38)),
                 R.choice([0xE86A5A, 0x5A8AE8, 0xF0C040, 0x5AB06A, 0xF07AC0]), **DEC)
    sl = pl.model('Slide')
    sl.box('Platform', -32, FL + 6.0, 30, -26, FL + 6.4, 36, 0xE86A5A)
    for x, z in ((-32, 30), (-26, 30), (-32, 36), (-26, 36)):
        sl.blk('Post', (0.4, 6.4, 0.4), (x, FL + 3.2, z), 0xF0C040)
    sl.beam('SlideBed', (-29, FL + 6.2, 30), (-29, FL + 0.8, 16), 3, 0.3, 0x5A8AE8)
    for sx in (-1.5, 1.5):
        sl.beam('SlideRail', (-29 + sx, FL + 6.8, 30), (-29 + sx, FL + 1.4, 16), 0.2, 0.6, 0x5A8AE8, **NC)
    for k in range(6):
        sl.blk('LadderRung', (3, 0.2, 0.2), (-29, FL + 1 + k * 0.95, 36.6), 0xF0C040)
    for k in range(6):
        pl.blk('FoamBlock', (2.4, 1.6, 2.4), (-50 + (k % 3) * 2.6, FL + 1.1 + (k // 3) * 1.6, 14), R.choice([0xE86A5A, 0x5A8AE8, 0xF0C040, 0x5AB06A]), 'Fabric')
    P.teddy(pl.at(T(-20, FL, 20) * Ry(30)), s=1.2, color=0xF0C0D0, torn=True)
    for x in (-60, -36, -18):
        downlight(pl, x, 22, color=0xFFE8C8, bright=0.45, rng=14)
    # washroom
    wr = s.model('Washroom')
    floor_finish(wr, (-10, 30, 6, 40), 0xF4F4F0, 'Marble', top=FL + 0.02)
    for i in range(6):
        wr.blk('MiniSink', (2, 2, 1.4), (-6 + i * 2.8, FL + 1.0, 38.9), 0xF4F4F0)
        wr.blk('Faucet', (0.2, 0.6, 0.6), (-6 + i * 2.8, FL + 2.3, 39.4), STEEL, 'Metal', **NC)
        wr.blk('Mirror', (2.2, 2.4, 0.08), (-6 + i * 2.8, FL + 4.4, 39.7), 0xC8D4D8, 'Glass', refl=0.6, **DEC)
    for i in range(3):
        x = 12 + i * 5
        wall(wr, 'z', 26, 40, x - 2.5, 0xF0D0D8, y1=FL + 6, trim=False) if i else None
        wr.blk('KidToilet', (1.4, 1.4, 2), (x, FL + 0.7, 38.6), 0xF4F4F0)
    downlight(wr, 10, 24, color=0xF4F8FF, bright=0.6, rng=14)
    # teacher office (north-east)
    workstation(s.at(T(44, 0, 20) * Ry(180)), w=6, screen='출석부\n조수민 — 결석 (?)', mess=0.7)
    Q.files_cab(s.at(T(58, FL, 38.6) * Ry(180)))
    downlight(s, 46, -12, bright=0.7, rng=16)
    downlight(s, 46, 20, bright=0.6, rng=16)
    Q.footprints(s.at(T(0, FL, 0)), (55, -11.5), (32, -20), color=0x5A1A14, small=True, step=1.2)


# ===================================================================== 30F 피트니스 · 수영장
def treadmill(b):
    m = b.model('Treadmill')
    m.blk('Deck', (2.6, 0.6, 6), (0, FL + 0.4, 0), 0x1A1A1C, 'Metal')
    m.blk('Belt', (2.0, 0.05, 5.6), (0, FL + 0.72, 0.1), 0x2A2A2C, 'Fabric', **DEC)
    for s_ in (-1, 1):
        m.beam('Upright', (s_ * 1.1, FL + 0.6, -2.6), (s_ * 1.1, FL + 4.6, -2.9), 0.25, 0.25, 0x3A3A3E, 'Metal')
        m.blk('Handrail', (0.2, 0.2, 2.0), (s_ * 1.1, FL + 3.6, -1.9), 0x3A3A3E, 'Metal', **NC)
    con = m.blk('Console', (2.6, 1.0, 0.5), (0, FL + 4.7, -2.9), 0x2A2A2C, rot=Rx(25))
    gui_text(con, '00:00  0.0km', 'Front', bg=0x061018, fg=0xFF5A2A, glow=True, font=10, ppu=30)


def f30(fb, F):
    s = fb.model('PoolGym')
    g = fb.model('Gameplay')
    tile = 0xE8EEF0
    floor_finish(s, (10, 62, -55, 40), 0x2A2C30, 'Fabric')
    wall(s, 'x', -79, 62, 40, 0xE8EEF0, name='NorthWall')
    east_edge(s, -55, 40, 0xE8EEF0)
    s.box('Ceiling', -79, CH + 3, -55, 10, CH + 3.3, 40, 0xF0F4F4, shadow=False)
    s.box('CeilingGym', 10, CH, -55, 62, CH + 0.3, 40, 0xEDEBE6, shadow=False)
    glass_wall(s, 'z', -55, 40, 10, doors=[20], h=CH)
    glass_door(s, 'z', 20, 10, open_deg=30, hinge=-1, swing=1)
    # pool deck (raised) + basin
    DH = 3.0
    deck = (-79, 10, -55, 40)
    basin = (-66, -10, -42, 22)
    for (a, c_, d, e) in rect_minus(deck, [basin]):
        s.box('Deck', a, 0, d, c_, FL + DH, e, tile, 'Marble')
    s.box('BasinFloor', basin[0], 0, basin[2], basin[1], FL, basin[3], 0x8AC4D2, 'Marble')
    for i in range(1, 7):
        z = basin[2] + i * (basin[3] - basin[2]) / 7
        s.box('LaneLine', basin[0] + 2, FL, z - 0.3, basin[1] - 2, FL + 0.02, z + 0.3, 0x1A3A5A, **DEC)
        s.box('LaneT', basin[1] - 3, FL, z - 1.2, basin[1] - 2.4, FL + 0.02, z + 1.2, 0x1A3A5A, **DEC)
    for (a, c_, d, e) in ((basin[0] - 0.6, basin[1] + 0.6, basin[2] - 0.6, basin[2]), (basin[0] - 0.6, basin[1] + 0.6, basin[3], basin[3] + 0.6),
                          (basin[0] - 0.6, basin[0], basin[2], basin[3]), (basin[1], basin[1] + 0.6, basin[2], basin[3])):
        s.box('Coping', a, FL + DH, d, c_, FL + DH + 0.25, e, 0xF4F4F0, 'Marble')
    s.box('BlueBand', basin[0], FL + DH - 0.6, basin[2] + 0.02, basin[1], FL + DH - 0.3, basin[2] + 0.04, 0x2A6AA0, **DEC)
    s.box('BlueBandN', basin[0], FL + DH - 0.6, basin[3] - 0.04, basin[1], FL + DH - 0.3, basin[3] - 0.02, 0x2A6AA0, **DEC)
    s.box('MurkyWater', basin[0], FL, basin[2], basin[0] + 14, FL + 0.6, basin[3], 0x2E4A30, 'Glass', tr=0.35, refl=0.2, **NC)
    for k, z in enumerate(range(-39, 22, 9)):
        blk = s.model('StartBlock')
        blk.blk('Block', (2, 2, 2), (basin[1] + 1.4, FL + DH + 1.0, z + 4), 0xF4F4F0)
        blk.blk('Top', (2.2, 0.15, 2.2), (basin[1] + 1.2, FL + DH + 2.1, z + 4), 0x2A6AA0, rot=Rz(-8))
        P.sign(blk, str(k + 1), basin[1] + 0.38, FL + DH + 1.2, z + 4, '-x', 1.2, 1.2, bg=0x2A6AA0, fg=0xFFFFFF, name='LaneNo')
    for zz in (basin[2] + 5, basin[3] - 5):
        for sx in (-0.7, 0.7):
            s.beam('LadderRail', (basin[1] + 0.8, FL + DH + 2.6, zz + sx), (basin[1] - 0.6, FL + DH - 0.2, zz + sx), 0.2, 0.2, STEEL, 'Metal', **NC)
            s.blk('LadderLeg', (0.2, DH, 0.2), (basin[1] - 0.6, FL + DH / 2, zz + sx), STEEL, 'Metal', **NC)
        for k in range(3):
            s.blk('Rung', (0.5, 0.12, 1.4), (basin[1] - 0.35, FL + 0.6 + k * 0.85, zz), STEEL, 'Metal')
    for k in range(6):
        s.box('DeckStep', 10 + k * 1.2, 0, -14, 10 + (k + 1) * 1.2, FL + DH - k * 0.5, -4, tile, 'Marble')
    P.wall_text(s, '수심 1.2m', -38, FL + DH - 1.4, basin[2] + 0.06, '+z', 6, 1.0, fg=0x1A3A5A, font=19)
    P.wall_text(s, '수심 2.5m', -38, FL + DH - 1.4, basin[3] - 0.06, '-z', 6, 1.0, fg=0x1A3A5A, font=19)
    lc = s.model('LifeguardChair')
    for dx in (-1, 1):
        for dz in (-1, 1):
            lc.blk('Leg', (0.3, 7, 0.3), (-72 + dx * 1.2, FL + DH + 3.5, 0 + dz * 1.2), 0xF4F4F0, 'Metal')
    lc.blk('Seat', (3, 0.3, 3), (-72, FL + DH + 7, 0), 0xD02020)
    lc.blk('Back', (0.3, 2.4, 3), (-73.4, FL + DH + 8.3, 0), 0xD02020)
    for x in (-60, -44, -28, -14):
        Q.lounge_chair(s.at(T(x, FL + DH - FL, 31) * Ry(180)))
    for i in range(6):
        s.blk('Kickboard', (1.6, 0.25, 2.2), (6, FL + DH + 0.15 + i * 0.25, 34), R.choice([0x2A6AC0, 0xF0D040]), rot=Ry(R.uniform(-10, 10)))
    Q.lifebuoy(s.at(T(-40, FL + DH + 5, 39.7) * Ry(180)))
    rules = s.blk('PoolRules', (10, 3.4, 0.1), (-60, FL + DH + 6, 39.7), 0x2A6AA0, rot=Ry(180))
    gui_text(rules, '수영장 이용 규칙\n1. 샤워 후 입장  2. 다이빙 금지\n3. 물이 빠졌습니다', 'Front', bg=0x2A6AA0, fg=0xFFFFFF, font=19, ppu=30)
    s.ball('RubberDuck', 2.2, (-58, FL + 1.1, 10), 0xF0D020, refl=0.1, **NC)
    s.ball('DuckHead', 1.3, (-58.8, FL + 2.5, 10), 0xF0D020, **NC)
    s.blk('Beak', (0.8, 0.3, 0.5), (-59.7, FL + 2.4, 10), 0xF08020, **NC)
    for x in (-60, -38, -16):
        for z in (-30, 0, 24):
            p = s.blk('PoolLight', (2.4, 0.15, 2.4), (x, CH + 2.85, z), 0xE8FCFF, 'Neon', **DEC)
            light(p, 'SurfaceLight', 0xC8F0FF, 0.9, 24, (x, z) == (-38, 0), 'Bottom', 120)
    # gym
    gy = s.model('Gym')
    for k in range(6):
        treadmill(gy.at(T(16 + k * 4, 0, -50) * Ry(180)))
    for k in range(4):
        Q.spin_bike(gy.at(T(16 + k * 3.6, FL, -38) * Ry(180)))
    Q.kettlebell_rack(gy.at(T(56, FL, -40) * Ry(-90)))
    for i, z in enumerate((-26, -12, 2)):
        bp = gy.model('BenchPress')
        bp.blk('Bench', (1.6, 1.8, 6), (36, FL + 0.9, z), 0x1A1A1A, 'Fabric')
        for sx in (-2.4, 2.4):
            bp.blk('Upright', (0.3, 5, 0.3), (36 + sx, FL + 2.5, z + 2.6), 0x3A3A3E, 'Metal')
        if i == 1:
            bp.beam('BentBarL', (30, FL + 4.8, z + 2.6), (36, FL + 3.6, z + 2.6), 0.3, 0.3, STEEL, 'Metal')
            bp.beam('BentBarR', (36, FL + 3.6, z + 2.6), (42, FL + 4.8, z + 2.6), 0.3, 0.3, STEEL, 'Metal')
            P.sign(bp, '에스키모 전용 (또 휘었음)', 36, FL + 2.2, z - 3.1, '-z', 5, 0.9, bg=0xF2F2F2, fg=0x2A4A9A, name='EskimoSign')
        else:
            bp.cyl('Barbell', 12, 0.3, (36, FL + 4.8, z + 2.6), STEEL, 'Metal', axis='x')
        for sx in (-1, 1):
            bp.cyl('Plate', 0.5, 3.2, (36 + sx * 5, FL + 4.7, z + 2.6), 0x1A1A1A, 'Metal', axis='x')
    gy.box('MirrorWall', 61.6, FL + 0.6, 0, 61.75, CH - 0.6, 38, 0xC8D4D8, 'Glass', refl=0.6)
    from vignettes import punching_bag
    punching_bag(gy.at(T(20, FL, 24)), CH)
    punching_bag(gy.at(T(26, FL, 24)), CH)
    gy.blk('GymMat', (14, 0.2, 10), (23, FL + 0.1, 20), 0x2A3A5A, 'Fabric', **DEC)
    for i in range(3):
        gy.blk('Poster', (3, 4, 0.05), (14 + i * 6, FL + 6, 39.7), [0x1A1A1A, 0xC01818, 0xF8F8F4][i], rot=Ry(180), **DEC)
    for x in (18, 34, 50):
        for z in (-44, -24, -4, 16, 32):
            downlight(gy, x, z, color=0xF4F8FF, bright=0.5, rng=14)
    blinds(s, 11, 61, -54.4, closed=0.4)
