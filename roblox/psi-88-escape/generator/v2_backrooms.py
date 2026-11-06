"""77F 백룸 (with 쭉쭉이) and B3 짱큰베리 (김태영's giant white cat, 베리)."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles
import props as P
import props2 as Q
from props import R
from v2_common import *
from v2_office import east_edge
from building import tag

MONO = 0xC9B36A        # mono-yellow wallpaper
MONO_D = 0xA8924E
CARPET = 0xB09A5C


# ===================================================================== 쭉쭉이
def zzukzzuk(b, hunch=True):
    """A pale, impossibly stretched figure. Stands ~17 studs tall, so it has to stoop under the 11-stud ceiling."""
    m = b.model('ZzukZzuk')
    skin = 0xE6E2DA
    dark = 0x1A1816
    # legs: two very long thin legs, slightly bent
    for s in (-1, 1):
        m.beam('Thigh', (s * 0.7, FL + 4.6, 0), (s * 0.9, FL + 8.6, -0.6), 0.5, 0.5, skin, 'SmoothPlastic')
        m.beam('Shin', (s * 0.9, FL + 0.3, 0.4), (s * 0.7, FL + 4.6, 0), 0.4, 0.4, skin, 'SmoothPlastic')
        m.blk('Foot', (0.5, 0.25, 1.8), (s * 0.9, FL + 0.15, -0.2), skin, 'SmoothPlastic')
    # torso stretched upward, then folding forward under the ceiling
    m.beam('Hips', (-0.9, FL + 8.6, -0.6), (0.9, FL + 8.6, -0.6), 0.7, 0.7, skin, 'SmoothPlastic')
    m.beam('Spine', (0, FL + 8.6, -0.6), (0, FL + 10.4, -1.4), 1.1, 0.8, skin, 'SmoothPlastic')
    m.beam('Chest', (0, FL + 10.4, -1.4), (0, FL + 10.6, -5.4), 1.4, 0.9, skin, 'SmoothPlastic')
    for k in range(5):
        m.beam('Rib', (-0.72, FL + 10.45 - 0.0, -2.0 - k * 0.7), (0.72, FL + 10.45, -2.0 - k * 0.7), 0.08, 0.12, 0xC8C2B8, **DEC)
    m.beam('Neck', (0, FL + 10.6, -5.4), (0, FL + 9.2, -8.2), 0.45, 0.45, skin, 'SmoothPlastic')
    head = m.at(T(0, FL + 8.7, -8.9) * Rx(25))
    head.ball('Head', 1.6, (0, 0, 0), skin, 'SmoothPlastic')
    head.blk('Jaw', (1.0, 1.4, 1.0), (0, -0.9, -0.15), skin, 'SmoothPlastic')
    for s in (-1, 1):
        head.ball('Eye', 0.42, (s * 0.36, 0.15, -0.66), dark, 'SmoothPlastic', **DEC)
    head.blk('Mouth', (0.6, 0.9, 0.05), (0, -1.0, -0.66), dark, **DEC)
    # arms: absurdly long, one dragging on the carpet, one reaching along the ceiling
    m.beam('ArmL1', (-0.9, FL + 10.5, -4.8), (-2.6, FL + 6.0, -7.2), 0.32, 0.32, skin, 'SmoothPlastic')
    m.beam('ArmL2', (-2.6, FL + 6.0, -7.2), (-3.2, FL + 0.6, -10.8), 0.28, 0.28, skin, 'SmoothPlastic')
    for k in range(4):
        m.beam('FingerL', (-3.2, FL + 0.6, -10.8), (-3.2 + (k - 1.5) * 0.35, FL + 0.15, -12.6), 0.1, 0.1, skin, 'SmoothPlastic', **NC)
    m.beam('ArmR1', (0.9, FL + 10.5, -4.8), (2.4, FL + 10.8, -9.6), 0.32, 0.32, skin, 'SmoothPlastic')
    m.beam('ArmR2', (2.4, FL + 10.8, -9.6), (2.8, FL + 10.6, -15.6), 0.28, 0.28, skin, 'SmoothPlastic')
    for k in range(4):
        m.beam('FingerR', (2.8, FL + 10.6, -15.6), (2.8 + (k - 1.5) * 0.35, FL + 10.9, -17.6), 0.1, 0.1, skin, 'SmoothPlastic', **NC)
    tag(m, 'ZzukZzuk')
    return m


# ===================================================================== 77F 백룸
def f77(fb, F):
    s = fb.model('Backrooms')
    g = fb.model('Gameplay')
    Z = (-79, 62, -55, 55)
    floor_finish(s, Z, CARPET, 'Fabric')
    # damp patches in the carpet
    for _ in range(26):
        s.cyl('DampCarpet', 0.02, R.uniform(2.5, 7), (R.uniform(-76, 58), FL + 0.012, R.uniform(-52, 52)), 0x8A7A44, 'Fabric', **DEC)
    trof = troffer_grid(Z, 8, 8, (4, 4))
    dead = [t for t in trof if R.random() < 0.18]
    ceiling_grid(s, Z, troffers=trof, dead=dead, col=0xE2D8B0, grid=0xC0B488, bright=0.7, color=0xFFF4C8, shadows_every=9)
    # outer walls in the same wallpaper so there is no "edge" to the room
    for (axis, a0, a1, pl) in (('x', -79, 62, -55), ('x', -79, 62, 55), ('z', -55, 55, -79)):
        wall(s, axis, a0, a1, pl, MONO, base_col=MONO_D)
    east_edge(s, -55, 55, MONO)
    # irregular rooms: a coarse grid with random wall pieces, pillars and openings
    cell = 12
    xs = list(range(-79, 63, cell))
    zs = list(range(-55, 56, cell))
    walls = s.model('Walls')
    for i, x in enumerate(xs[1:-1], 1):
        for j in range(len(zs) - 1):
            z0, z1 = zs[j], zs[j + 1]
            if x > 40 and -26 < (z0 + z1) / 2 < 4:
                continue                      # keep the stair approach open
            if -70 < x < -40 and z1 > 25:
                continue                      # 쭉쭉이's hall
            r = R.random()
            if r < 0.42:
                op = [((z0 + z1) / 2 + R.uniform(-2, 2), R.choice([4, 5, 6]), 0, R.choice([8.4, 9.5]))] if R.random() < 0.55 else []
                wall(walls, 'z', z0, z1, x, MONO, openings=op, base_col=MONO_D)
            elif r < 0.55:
                walls.box('Pillar', x - 1.2, 0, (z0 + z1) / 2 - 1.2, x + 1.2, CH, (z0 + z1) / 2 + 1.2, MONO, 'SmoothPlastic')
    for j, z in enumerate(zs[1:-1], 1):
        for i in range(len(xs) - 1):
            x0, x1 = xs[i], xs[i + 1]
            if x0 > 40 and -26 < z < 4:
                continue
            if -79 <= x0 < -31 and z > 25:
                continue
            if R.random() < 0.38:
                op = [((x0 + x1) / 2 + R.uniform(-2, 2), R.choice([4, 5, 6]), 0, R.choice([8.4, 9.5]))] if R.random() < 0.55 else []
                wall(walls, 'x', x0, x1, z, MONO, openings=op, base_col=MONO_D)
    # wallpaper detail: faint vertical pattern strips + water damage on some walls
    for (axis, a0, a1, pl, side) in (('x', -79, 62, -54.73, 1), ('x', -79, 62, 54.73, -1)):
        u = a0 + 2
        while u < a1:
            if R.random() < 0.3:
                L = R.uniform(2, 6)
                for k in range(R.randint(2, 4)):
                    uu = u + R.uniform(-1, 1)
                    s.blk('WaterStreak', (R.uniform(0.15, 0.4), L, 0.03), (uu, CH - 0.4 - L / 2, pl + side * 0.02), 0x8A7A3C, **DEC)
            u += R.uniform(4, 9)
    # things left behind
    for x, z in ((-40, -30), (10, 40), (-66, 24)):
        s.cyl('AlmondWater', 1.0, 0.45, (x, FL + 0.5, z), 0xE8F0F0, 'Glass', tr=0.3, **NC)
        s.cyl('Cap', 0.15, 0.4, (x, FL + 1.05, z), 0x2A6AC0, **DEC)
    s.blk('Backpack', (1.4, 1.8, 0.8), (-52, FL + 0.9, -8), 0x2A3A5A, 'Fabric', rot=Ry(30))
    s.blk('Flashlight', (0.35, 0.35, 1.0), (-50.5, FL + 0.18, -7), 0x1A1A1A, 'Metal', rot=Ry(70), **NC)
    for txt, x, z, f in (('쭉쭉이 조심', -78.7, -20, '+x'), ('뛰지 마\n소리 내지 마', 20, -54.7, '+z'), ('여긴 77층이 아니야', -30, 54.7, '-z'),
                         ('돌아가', -78.7, 30, '+x')):
        P.wall_text(s, txt, x, FL + 5.5, z, f, 8, 2.4, fg=0x4A2A14, font=9)
    for _ in range(18):
        Q.d_paper(s.at(T(R.uniform(-76, 40), FL, R.uniform(-52, 52))))
    # an exit sign that leads nowhere
    ex = P.sign(s, 'EXIT', -78.6, FL + 8.6, -44, '+x', 2.6, 0.9, bg=0x0E7A3A, fg=0xFFFFFF, glow=True, name='FakeExit')
    light(ex, 'PointLight', 0x2AFF7A, 0.4, 7)
    # 쭉쭉이 in the far corner, plus long scratch marks along the ceiling where it drags its hand
    zz = zzukzzuk(g.at(T(-58, 0, 40) * Ry(150)))
    g.blk('ChaserSpawn', (4, 6, 4), (-58, FL + 3, 40), 0xFF0000, tr=1, collide=False, tags=['ChaserSpawn'])
    for k in range(6):
        s.beam('CeilingScratch', (-50 + k * 0.4, CH - 0.02, 30 - k * 6), (-48 + k * 0.4, CH - 0.02, 26 - k * 6), 0.12, 0.04, 0x4A3A1A, **DEC)
    for k in range(8):
        s.blk('DragMark', (0.3, 0.02, 3.2), (-56 + k * 1.6 + R.uniform(-0.4, 0.4), FL + 0.015, 30 - k * 3.4), 0x6A5A2E, rot=Ry(150 + R.uniform(-10, 10)), **DEC)
    downlight(s, 56, -12, color=0xFFF4C8, bright=0.7, rng=16)
    P.sign(s, '77F', 61.7, FL + 7, 4, '-x', 3, 1.4, bg=0xC9B36A, fg=0x3A2A0A, name='FloorNo')


# ===================================================================== B3 짱큰베리 (giant Berry)
WHITE = 0xF2F0EA
FUR = 'Fabric'


def giant_berry(b, s=1.0):
    """김태영's white cat 베리, lying in a loaf, staring at whoever comes in. Faces +X."""
    m = b.model('Berry')
    def B_(name, d, pos, col=WHITE, **kw):
        m.ball(name, d * s, (pos[0] * s, pos[1] * s, pos[2] * s), col, FUR, **kw)
    # body loaf
    for x, y, d in ((-14, 7.0, 15), (-9, 7.6, 16), (-4, 7.4, 15), (0, 7.0, 13)):
        B_('Body', d, (x, y, 0))
    B_('Haunch', 10, (-16, 5.5, 4.5))
    B_('Haunch', 10, (-16, 5.5, -4.5))
    B_('Chest', 11, (3, 6.0, 0))
    # front paws tucked forward
    for z in (-3.6, 3.6):
        B_('Paw', 3.8, (8.5, 1.9, z))
        m.cyl('PawToe', 0.4 * s, 2.0 * s, (10.2 * s, 1.5 * s, z * s), 0xE4E0D8, FUR, axis='x', **DEC)
    # head
    hd = m.at(T(7 * s, 13 * s, 0))
    hd.ball('Head', 11 * s, (0, 0, 0), WHITE, FUR)
    hd.ball('Cheek', 6 * s, (2.6 * s, -1.8 * s, 2.6 * s), WHITE, FUR)
    hd.ball('Cheek', 6 * s, (2.6 * s, -1.8 * s, -2.6 * s), WHITE, FUR)
    hd.ball('Muzzle', 4.4 * s, (4.4 * s, -1.6 * s, 0), WHITE, FUR)
    for z in (-2.8, 2.8):
        ear = hd.at(T(-0.5 * s, 4.6 * s, z * s) * Rx(-z * 4))
        ear.wedge('Ear', (2.6 * s, 3.6 * s, 3.2 * s), T(0, 0, 0) * Ry(-90), WHITE, FUR)
        ear.wedge('EarInner', (1.6 * s, 2.4 * s, 0.4 * s), T(0.9 * s, -0.4 * s, 0) * Ry(-90), 0xE8B0B8, 'SmoothPlastic', **DEC)
    # glowing yellow eyes with slit pupils — the only bright thing in the room
    for z in (-2.1, 2.1):
        e = hd.cyl('Eye', 0.3 * s, 2.4 * s, (5.0 * s, 0.9 * s, z * s), 0xF6D21A, 'Neon', axis='x', **DEC)
        hd.blk('Pupil', (0.1 * s, 2.0 * s, 0.35 * s), (5.2 * s, 0.9 * s, z * s), 0x0A0A0A, **DEC)
        light(e, 'PointLight', 0xFFD020, 1.2, 18)
    hd.wedge('Nose', (0.7 * s, 0.5 * s, 0.9 * s), T(6.5 * s, -1.0 * s, 0) * Rz(90) * Ry(90), 0xE89AA6, 'SmoothPlastic', **DEC)
    for z in (-1, 1):
        for k in range(3):
            hd.beam('Whisker', (6.2 * s, (-1.6 + k * 0.35) * s, z * 1.2 * s), (7.0 * s, (-1.4 + k * 0.6) * s, z * 6.5 * s), 0.06 * s, 0.06 * s, 0xFFFFFF, **DEC)
    # collar with a bell and a name tag
    m.cyl('Collar', 0.9 * s, 9.4 * s, (5.4 * s, 9.2 * s, 0), 0xB01818, 'Fabric', axis='x', rot=Rz(-25))
    m.ball('Bell', 1.6 * s, (9.0 * s, 7.4 * s, 0), 0xD8B030, 'Metal', refl=0.3)
    t = m.blk('NameTag', (0.1 * s, 1.6 * s, 2.2 * s), (9.4 * s, 5.9 * s, 0), 0xD8B030, 'Metal')
    gui_text(t, '베리\n보호자: 김태영', 'Right', bg=0xD8B030, fg=0x2A1A0A, font=9, ppu=50)
    # tail curling round the front
    pts = [(-20, 3, 4), (-20, 2.4, 9), (-14, 2.0, 11), (-6, 1.8, 11.5), (2, 1.8, 10)]
    for a, c in zip(pts, pts[1:]):
        m.beam('Tail', (a[0] * s, a[1] * s, a[2] * s), (c[0] * s, c[1] * s, c[2] * s), 2.2 * s, 2.2 * s, WHITE, FUR)
    m.ball('TailTip', 2.4 * s, (2 * s, 1.8 * s, 10 * s), WHITE, FUR)
    tag(m, 'JjangkeunBerry')
    return m


def fB3(fb, F):
    c = F['h'] - 1
    s = fb.model('JjangkeunBerry')
    g = fb.model('Gameplay')
    floor_finish(s, (-79, 62, -55, 55), 0x4A4642, 'Concrete')
    s.box('LowCeiling', -79, c - 0.4, -55, 62, c, 55, 0x2A2826, shadow=False)
    # the cat
    giant_berry(g.at(T(-14, FL, 0)), s=1.25)
    # giant cat things, all scaled to her
    bowl = s.model('FoodBowl')
    bowl.cyl('Bowl', 3.4, 16, (24, FL + 1.7, 30), 0xE8E4DA, 'SmoothPlastic')
    bowl.cyl('BowlInner', 0.3, 14, (24, FL + 3.3, 30), 0x8A5A30, 'Sand', **DEC)
    for k in range(20):
        bowl.cyl('Kibble', 0.9, 1.4, (24 + R.uniform(-6, 6), FL + 3.6, 30 + R.uniform(-6, 6)), 0x7A4A22, 'Sand', axis='x', rot=Ry(R.uniform(0, 180)), **DEC)
    nb = bowl.blk('BowlName', (6, 1.4, 0.05), (24, FL + 1.8, 21.9), 0xE8E4DA, **DEC)
    gui_text(nb, '베리', 'Front', bg=0xE8E4DA, fg=0xC03050, font=9, ppu=40)
    wb = s.model('WaterBowl')
    wb.cyl('Bowl', 3.0, 12, (38, FL + 1.5, 30), 0x6AA8D0, 'SmoothPlastic')
    wb.cyl('Water', 0.2, 10.6, (38, FL + 2.9, 30), 0x8AC8E8, 'Glass', tr=0.3, refl=0.3, **DEC)
    yarn = s.model('Yarn')
    yarn.ball('YarnBall', 7, (28, FL + 3.5, -30), 0xC83A6A, 'Fabric')
    for k in range(6):
        yarn.beam('YarnLoop', (28 + R.uniform(-3, 3), FL + R.uniform(1, 6), -30 + R.uniform(-3, 3)),
                  (28 + R.uniform(-3, 3), FL + R.uniform(1, 6), -30 + R.uniform(-3, 3)), 0.25, 0.25, 0xA82A52, 'Fabric', **DEC)
    pts = [(24, -27), (10, -20), (0, -26), (-8, -40), (-30, -44)]
    for a, b2 in zip(pts, pts[1:]):
        yarn.beam('Thread', (a[0], FL + 0.15, a[1]), (b2[0], FL + 0.15, b2[1]), 0.3, 0.2, 0xC83A6A, 'Fabric', **DEC)
    tower = s.model('CatTower')
    for k, (y, d) in enumerate(((0, 8), (6, 6), (11, 7))):
        tower.box('Platform', -70 - d / 2, FL + y + 4.6, 30 - d / 2, -70 + d / 2, FL + y + 5.4, 30 + d / 2, 0xB8A890, 'Fabric')
    tower.cyl('Post', 16, 2.2, (-70, FL + 8, 30), 0xC8A878, 'Fabric')
    for k in range(20):
        tower.cyl('Sisal', 0.15, 2.3, (-70, FL + 0.6 + k * 0.8, 30), 0xA88858, 'Fabric', **DEC)
    tower.box('Base', -76, FL, 24, -64, FL + 1.0, 36, 0xB8A890, 'Fabric')
    fish = s.model('FishToy')
    fish.beam('Wand', (40, FL + 0.2, -10), (46, FL + 0.2, -22), 0.3, 0.3, 0x8A6A3A, 'Wood', **NC)
    fish.blk('Fish', (4, 1.6, 1.0), (40, FL + 0.8, -8), 0x3A8AC0, 'Fabric', rot=Ry(30))
    # what she did to the room: claw slashes, a shredded sofa, fur everywhere
    for (x, z, f) in ((-78.7, -10, '+x'), (-78.7, 12, '+x'), (-20, 54.7, '-z'), (10, -54.7, '+z')):
        yaw = {'-z': 0, '+z': 180, '-x': 90, '+x': -90}[f]
        cl = s.at(T(x, FL + 7, z) * Ry(yaw))
        for k in range(4):
            cl.blk('Claw', (0.35, 7, 0.05), (k * 1.1 - 1.6, -k * 0.2, -0.03), 0x1A1816, rot=Rz(-18), **DEC)
    sofa(s.at(T(30, 0, 0) * Ry(-90)), w=9, col=0x6A5A50)
    for k in range(10):
        s.blk('Stuffing', (R.uniform(0.6, 1.4),) * 3, (30 + R.uniform(-4, 4), FL + R.uniform(0.3, 2.5), R.uniform(-5, 5)), 0xF0F0EC, 'Fabric', rot=Ry(R.uniform(0, 90)), **DEC)
    for k in range(4):
        s.blk('Rip', (0.1, 1.6, 0.05), (28.8, FL + 2.4, -2 + k * 1.2), 0x2A2420, rot=Rz(20), **DEC)
    for _ in range(70):
        s.ball('FurTuft', R.uniform(0.4, 1.1), (R.uniform(-60, 50), FL + 0.25, R.uniform(-50, 50)), WHITE, FUR, **DEC)
    # 김태영's corner: a small desk, his photo with Berry when she was small
    workstation(s.at(T(50, 0, 40) * Ry(180)), w=5, panel=False, screen='베리 몸무게 기록\n3.2kg → 3.4kg → ■■■kg', mess=0.6, chair=True)
    ph = s.blk('Photo', (2.4, 1.8, 0.08), (50, FL + 5.2, 44.6), 0xF2EEE4, rot=Ry(180))
    gui_text(ph, '태영이랑 아기 베리 ♥', 'Front', bg=0xF2EEE4, fg=0x5A3A2A, font=9, ppu=40)
    Q.d_paper(s.at(T(46, FL, 36)))
    # lighting: almost nothing — one swinging bare bulb, her eyes, a red emergency light
    P.bulb(s, 20, c - 3.5, 0, color=0xFFC880, bright=0.9, rng=26, cord=2.6, shadows=True)
    P.emergency_light(s, 61.6, FL + 9, 6, '-x', color=0xFF1A1A, bright=0.8)
    fg = s.blk('FogSource', (120, 0.5, 100), (-10, FL + 1.5, 0), 0, tr=1, **DEC)
    particles(fg, 'dust', 5)
    for txt, x, z, f in (('베리가 보고 있어', -40, 54.7, '-z'), ('눈 마주치지 마', 0, -54.7, '+z'), ('간식은 위층에…', -78.7, -36, '+x')):
        P.wall_text(s, txt, x, FL + 5, z, f, 10, 2.2, fg=0x8A6A10, font=9)
    P.sign(s, 'B3', 61.7, FL + 7, 4, '-x', 3, 1.4, bg=0x1A1816, fg=0xF6D21A, name='FloorNo')
