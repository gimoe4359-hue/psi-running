"""Basement floors B1 → B13 and the Earth's inner core."""
import math
from rbx import T, Rx, Ry, Rz, Inst, light, gui_text, particles, lookat
import props as P
from props import R
from building import wall_x, wall_z, door_in_wall_x, door_in_wall_z, tag, rect_minus, slab


# ===================================================================== B1 파르티르레트
def b1(fb, F):
    c = F['h'] - 1
    s = fb.model('Partirlette')
    g = fb.model('Gameplay')
    s.box('Floor', -79, 0, -55, 61, 0.06, 55, 0x2A1C14, 'WoodPlanks', collide=False)
    # inner walls cladding
    s.box('CladN', -79, 0, 54.4, 61, c, 55, 0x1E1410, 'WoodPlanks')
    s.box('CladS', -79, 0, -55, 61, c, -54.4, 0x1E1410, 'WoodPlanks')
    s.box('CladW', -79, 0, -54.4, -78.4, c, 54.4, 0x1E1410, 'WoodPlanks')
    for x in range(-74, 60, 10):
        s.box('GoldTrim', x - 0.1, 0, 54.3, x + 0.1, c, 54.4, P.GOLD, 'Metal', collide=False)
    # big sign
    sg = P.sign(s, 'PARTIRLETTE\n파르티르레트 · 본점?', -10, 10.5, 54.2, '-z', 22, 4.4, bg=0x0E0A08, fg=0xE8C87A, glow=True,
                name='ShopSign', font=8)
    light(sg, 'SurfaceLight', 0xFFD890, 0.8, 14, False, 'Front', 120)
    for i, t in enumerate(('재오픈 준비 중 (또)', '재오픈 날짜: 미정', '에스키모 출입 금지')):
        P.sign(s, t, -60 + i * 26, 7, -54.2, '+z', 9, 1.6, bg=0xF2EEE4 if i != 2 else 0x8A1010,
               fg=0x2A1A10 if i != 2 else 0xFFFFFF, name='Banner')
    # counter with register
    P.counter(P.at(s, -10, 44, 0), w=18, body=0x1E1410, top=0xE8E0D0, top_mat='Marble')
    s.blk('Register', (2, 1.2, 1.6), (-14, 3.8, 44), 0x1A1A1A, 'Metal')
    P.office_chair(P.at(s, -10, 47.5, 0))
    # display tables with fanned ties
    tie_cols = [0x7A1020, 0x1A2A5A, 0x2A4A2A, 0xC8A24A, 0x5A1A5A, 0x1A1A1A, 0x8A6A3A, 0xA03030]
    for ix in range(3):
        for iz in range(2):
            x, z = -50 + ix * 22, -20 + iz * 26
            P.table(P.at(s, x, z), 8, 4, 3, color=0x2A1C14, leg=P.GOLD)
            for k in range(9):
                s.blk('Tie', (0.5, 0.04, 2.6), (x - 3 + k * 0.75, 3.05, z), R.choice(tie_cols), 'Fabric',
                      rot=Ry(R.uniform(-25, 25)), collide=False)
    # glass cases (one with the "not for sale" tie)
    for i in range(4):
        x = -60 + i * 18
        gc = s.model('GlassCase')
        gc.box('Base', x - 3, 0, -42, x + 3, 3, -38, 0x1E1410, 'Wood')
        gc.box('Glass', x - 3, 3, -42, x + 3, 5.5, -38, 0xC8D8E0, 'Glass', tr=0.65)
        gc.blk('Tie', (0.6, 0.04, 3), (x, 3.05, -40), tie_cols[i], 'Fabric', collide=False)
        if i == 2:
            P.sign(gc, '비매품', x, 3.6, -42.05, '-z', 2, 0.6, bg=0xFFFFFF, fg=0x8A1010, name='NotForSale')
            tag(gc, 'SpecialTie')
    # tie racks on the west wall
    for z in range(-45, 46, 3):
        if -8 < z < 8:
            continue
        s.blk('Tie', (0.04, 4.5, 0.55), (-78.3, 6, z), R.choice(tie_cols), 'Fabric', collide=False)
    s.box('Rail', -78.4, 8.2, -45, -78.2, 8.4, 45, P.GOLD, 'Metal', collide=False)
    # mannequins in suits — some turned toward the door
    for i, (x, z, rot) in enumerate(((-30, 20, 180), (-20, 20, 160), (0, 20, 200), (10, 20, 180), (30, -30, 90), (45, 10, 120))):
        P.mannequin(P.at(s, x, z, rot), suit=R.choice([0x1C1E24, 0x2A2A34, 0x3A2A1E]), tie=tie_cols[i % len(tie_cols)],
                    headless=(i == 4))
    # round display platform with mannequins
    s.cyl('DisplayPlatform', 1.2, 14, (12, 0.6, -12), 0x1E1410, 'Wood')
    s.cyl('PlatformTrim', 1.25, 14.4, (12, 0.58, -12), P.GOLD, 'Metal', collide=False)
    for k in range(4):
        a_ = k * 90 + 45
        P.mannequin(s.at(T(12 + math.cos(math.radians(a_)) * 4, 1.2, -12 + math.sin(math.radians(a_)) * 4) * Ry(-a_ + 90)),
                    suit=R.choice([0x1C1E24, 0x2A2A34, 0x4A3A2A]), tie=tie_cols[k])
    # folded shirt walls
    for x in range(22, 58, 6):
        s.box('ShirtShelf', x - 2.6, 0, 52.6, x + 2.6, 9, 54.3, 0x1E1410, 'Wood')
        for lv in range(4):
            for k in range(3):
                s.blk('Shirt', (1.5, 0.5, 1.2), (x - 1.7 + k * 1.7, 1.0 + lv * 2.1, 52.4),
                      R.choice([0xF2F2F2, 0xC8D8F0, 0xF0E0D0, 0x9AB0D0, 0xE8C8C8]), 'Fabric', collide=False)
    # mirrors and fitting rooms
    for x in (30, 38, 46):
        wall_z(s, 30, 46, x, 0, 9, 0x1E1410, mat='WoodPlanks', t=0.4)
    for x in (34, 42):
        s.box('Curtain', x - 3.6, 0.5, 29.6, x + 3.6, 9, 29.9, 0x5A0A14, 'Fabric', collide=False)
        s.blk('Mirror', (0.1, 6, 3), (x + 3.6, 5, 40), 0xC8D4D8, 'Glass', refl=0.7)
    s.blk('FloorMirror', (6, 9, 0.2), (20, 4.5, -54.2), 0xC8D4D8, 'Glass', refl=0.8)
    # stockroom
    wall_x(s, -79, -55, 30, 0, c, 0x1E1410, mat='WoodPlanks', openings=[(-62, 4, 8)])
    for i in range(3):
        P.shelf(P.at(s, -74 + i * 8, 53, 180), w=7, h=9, kind='boxes', color=0x3A2A1E)
    P.boxes_pile(P.at(s, -66, 40), n=8, r=4)
    # lights: warm gold spots + chandeliers
    for x in (-50, -28, -6):
        ch = s.model('Chandelier')
        for k in range(6):
            a = k / 6 * math.tau
            ch.ball('Crystal', 0.6, (x + math.cos(a) * 1.6, c - 2.6, 5 + math.sin(a) * 1.6), 0xF0F0FF, 'Glass', tr=0.3,
                    collide=False)
        ch.blk('Chain', (0.12, 2, 0.12), (x, c - 1, 5), P.GOLD, 'Metal', collide=False)
        P.bulb(ch, x, c - 2.5, 5, color=0xFFD8A0, bright=1.0, rng=22)
    for x in (-40, 0, 30):
        for z in (-30, 30):
            P.ceiling_light(s, x, z, c, color=0xFFD8A0, neon=0xFFE8C0, bright=0.8, rng=18, size=(1.2, 1.2))
    P.ceiling_light(s, -10, 40, c, color=0xFFE0B0, bright=1.0, rng=18, shadows=True, size=(1.5, 1.5))


# ===================================================================== B2 기니방
def b2(fb, F):
    c = F['h'] - 1
    s = fb.model('GuineaRoom')
    g = fb.model('Gameplay')
    s.box('Shavings', -79, 0, -55, 61, 0.6, 55, 0xD8BC8A, 'Sand')
    for _ in range(60):
        s.blk('Shaving', (R.uniform(0.6, 1.4), 0.15, R.uniform(0.3, 0.6)), (R.uniform(-78, 60), 0.65, R.uniform(-54, 54)),
              R.choice([0xE8CC9A, 0xC8A878, 0xF0D8A8]), 'Wood', rot=Ry(R.uniform(0, 180)), collide=False, shadow=False)
    # giant cage bars along the walls
    P.bars_along_x(s, -78, 60, 54.0, 0.6, c, step=3.2, d=0.5, color=0xC8CCD0, mat='Metal')
    P.bars_along_x(s, -78, 60, -54.0, 0.6, c, step=3.2, d=0.5, color=0xC8CCD0, mat='Metal')
    P.bars_along_z(s, -54, 54, -78, 0.6, c, step=3.2, d=0.5, color=0xC8CCD0, mat='Metal')
    # water bottle
    wb = s.model('WaterBottle')
    wb.cyl('Bottle', 14, 6, (-40, 9, 50.5), 0xC8E0F0, 'Glass', axis='y', tr=0.55, rot=Rx(-15))
    wb.cyl('Water', 9, 5.4, (-40, 7.5, 50.1), 0x5AA0E0, 'Glass', axis='y', tr=0.4, rot=Rx(-15))
    wb.cyl('Nozzle', 4, 0.9, (-40, 1.8, 48.6), 0xB8BCC0, 'Metal', axis='y', rot=Rx(-15))
    wb.ball('Drop', 0.8, (-40, 0.9, 48.2), 0x5AA0E0, 'Glass', tr=0.3)
    # wheel
    wh = s.model('Wheel')
    cx, cy, cz, r = 20, 11, 30, 10
    for k in range(28):
        a = k / 28 * math.tau
        wh.blk('Slat', (6, 0.4, 2.4), (cx, cy + math.sin(a) * r, cz + math.cos(a) * r), 0x5AA0D0, 'SmoothPlastic',
               rot=Rx(-math.degrees(a)))
    wh.cyl('Axle', 7, 1.2, (cx, cy, cz), P.STEEL, 'Metal', axis='x')
    wh.beam('Stand', (cx + 3.4, 0.6, cz - 6), (cx + 3.4, cy, cz), 0.8, 0.8, P.STEEL, 'Metal')
    wh.beam('Stand', (cx + 3.4, 0.6, cz + 6), (cx + 3.4, cy, cz), 0.8, 0.8, P.STEEL, 'Metal')
    # hideout huts
    for x, z, rot in ((-55, -30, 20), (-10, -40, -10), (35, -20, 70)):
        hut = s.at(T(x, 0, z) * Ry(rot)).model('Hideout')
        hut.box('Back', -6, 0.6, 4, 6, 8, 5, 0xB08050, 'WoodPlanks')
        hut.box('SideL', -6, 0.6, -4, -5, 8, 4, 0xB08050, 'WoodPlanks')
        hut.box('SideR', 5, 0.6, -4, 6, 8, 4, 0xB08050, 'WoodPlanks')
        hut.box('Roof', -6.5, 8, -4.5, 6.5, 9, 5.5, 0x9A6A3A, 'WoodPlanks')
        hut.box('FrontL', -5, 0.6, -4, -2.5, 8, -3, 0xB08050, 'WoodPlanks')
        hut.box('FrontR', 2.5, 0.6, -4, 5, 8, -3, 0xB08050, 'WoodPlanks')
        hut.box('FrontTop', -2.5, 5.5, -4, 2.5, 8, -3, 0xB08050, 'WoodPlanks')
    # hay, pellets, veggies
    for _ in range(10):
        x, z = R.uniform(-70, 50), R.uniform(-45, 45)
        for k in range(5):
            s.blk('Hay', (R.uniform(2, 5), 0.3, 0.3), (x + R.uniform(-2, 2), 0.8 + k * 0.2, z + R.uniform(-2, 2)),
                  0xD8C870, 'Grass', rot=Ry(R.uniform(0, 180)) * Rz(R.uniform(-10, 10)), collide=False)
    for _ in range(26):
        s.cyl('Pellet', 1.4, 0.9, (R.uniform(-70, 55), 1.0, R.uniform(-48, 48)), 0x8A6A3A, 'Sand', axis='x',
              rot=Ry(R.uniform(0, 180)))
    bowl = s.model('FoodBowl')
    bowl.cyl('Bowl', 2.4, 12, (-5, 1.8, 10), 0xE8E4DA, 'SmoothPlastic')
    for _ in range(18):
        bowl.cyl('Pellet', 1.4, 0.9, (-5 + R.uniform(-4, 4), 3.2, 10 + R.uniform(-4, 4)), 0x8A6A3A, 'Sand', axis='x',
                 rot=Ry(R.uniform(0, 180)), collide=False)
    car = s.model('Carrot')
    car.cyl('Root', 12, 2.4, (10, 1.8, -10), 0xF07A20, 'SmoothPlastic', axis='x', rot=Ry(30))
    for k in range(4):
        car.blk('Leaf', (0.4, 4, 1.2), (4.6 - k * 0.3, 3.6 + k * 0.2, -6.8 + k * 0.4), 0x4A9A3A, 'Grass', rot=Rx(30 + k * 15))
    for _ in range(6):
        s.blk('Lettuce', (4, 0.2, 3), (R.uniform(-60, 40), 0.8, R.uniform(-40, 40)), 0x7AC04A, 'Grass',
              rot=Ry(R.uniform(0, 180)) * Rx(R.uniform(-15, 15)), collide=False)
    # Gini the giant guinea pig (asleep)
    gp = g.model('Gini')
    bx, bz = -55, 25
    for dx, dz, d, col in ((0, 0, 14, 0xA86A3A), (5, 0, 12, 0xF2EEE6), (-5, 1, 12, 0xA86A3A), (9, 0, 9, 0xF2EEE6),
                           (-8, -1, 9, 0x5A3A22)):
        gp.ball('Body', d, (bx + dx, d / 2 - 0.4, bz + dz), col, 'Fabric')
    gp.ball('EarL', 2.4, (bx + 11, 8.5, bz - 3), 0xC88A6A, 'Fabric')
    gp.ball('EarR', 2.4, (bx + 11, 8.5, bz + 3), 0xC88A6A, 'Fabric')
    gp.blk('EyeL', (0.3, 0.2, 1.2), (bx + 13.3, 6.2, bz - 2.2), P.BLACK, rot=Ry(20))
    gp.blk('EyeR', (0.3, 0.2, 1.2), (bx + 13.3, 6.2, bz + 2.2), P.BLACK, rot=Ry(-20))
    gp.ball('Nose', 1.0, (bx + 13.6, 4.4, bz), 0xD88A8A, 'SmoothPlastic')
    for k in range(3):
        zz = P.sign(gp, 'Z', bx + 12 + k * 2, 12 + k * 2.5, bz - 2, '-z', 1.5 + k * 0.5, 1.5 + k * 0.5, bg=0, fg=0xFFFFFF,
                    bg_tr=1, part_tr=1, name='Zzz')
    P.sign(s, '기니방 — 기니 깨우지 마시오', 61.8, 9, 6, '-x', 9, 1.6, bg=0xF2EEE4, fg=0x8A3A1A, name='RoomSign')
    hl = s.blk('HeatLamp', (3, 1.2, 3), (-55, c - 1, 25), 0x3A3A3A, 'Metal')
    P.bulb(s, -55, c - 2, 25, color=0xFF7A3A, bright=1.6, rng=30, d=1.4, shadows=True)
    for x in (-30, 0, 30):
        for z in (-30, 0, 30):
            P.ceiling_light(s, x, z, c, color=0xFFF0D8, bright=0.8, rng=22)


# ===================================================================== B3 짱큰베리
def b3(fb, F):
    c = F['h'] - 1
    s = fb.model('JjangkeunBerry')
    g = fb.model('Gameplay')
    s.box('Soil', -79, 0, -55, 61, 0.3, 55, 0x2A1A14, 'Ground')
    # raised beds with mutant berry bushes
    for ix in range(5):
        for iz in range(3):
            x, z = -66 + ix * 22, -38 + iz * 30
            if abs(x - (-10)) < 14 and abs(z) < 14:
                continue
            bed = s.model('GrowBed')
            bed.box('Frame', x - 8, 0, z - 3, x + 8, 2.4, z + 3, 0x3A2A1E, 'WoodPlanks')
            bed.box('Dirt', x - 7.6, 2.4, z - 2.6, x + 7.6, 2.6, z + 2.6, 0x2A1A10, 'Ground')
            for k in range(5):
                px = x - 6 + k * 3
                bed.ball('Bush', R.uniform(2.4, 3.4), (px, 3.8, z + R.uniform(-1, 1)), 0x1E3A1A, 'Grass')
                for _ in range(3):
                    ber = bed.ball('Berry', R.uniform(0.7, 1.3), (px + R.uniform(-1.4, 1.4), 4 + R.uniform(-0.6, 1.2), z + R.uniform(-1.6, 1.6)),
                                   R.choice([0x8A0A1E, 0x5A0A3A, 0xB0102A]), 'Neon' if R.random() < 0.25 else 'SmoothPlastic',
                                   collide=False)
            lamp = bed.blk('GrowLight', (14, 0.3, 0.8), (x, 9, z), 0xB040FF, 'Neon', collide=False, shadow=False)
            bed.blk('Hanger', (0.1, c - 9, 0.1), (x, (c + 9) / 2, z), P.BLACK, collide=False, shadow=False)
            if (ix + iz) % 2 == 0:
                light(lamp, 'SurfaceLight', 0xA040FF, 0.9, 12, False, 'Bottom', 120)
    # vines on walls & ceiling, roots on the floor
    for _ in range(70):
        side = R.choice(['N', 'S', 'W', 'C'])
        if side == 'C':
            a = (R.uniform(-75, 55), c - 0.3, R.uniform(-50, 50))
            b2_ = (a[0] + R.uniform(-14, 14), c - R.uniform(0.3, 6), a[2] + R.uniform(-14, 14))
        elif side == 'N':
            a = (R.uniform(-75, 55), c, 54.6)
            b2_ = (a[0] + R.uniform(-6, 6), R.uniform(0, c - 3), 54.6)
        elif side == 'S':
            a = (R.uniform(-75, 55), c, -54.6)
            b2_ = (a[0] + R.uniform(-6, 6), R.uniform(0, c - 3), -54.6)
        else:
            a = (-78.6, c, R.uniform(-50, 50))
            b2_ = (-78.6, R.uniform(0, c - 3), a[2] + R.uniform(-6, 6))
        s.beam('Vine', a, b2_, R.uniform(0.3, 0.7), R.uniform(0.3, 0.7), R.choice([0x1E3A1A, 0x2A4A1E, 0x3A1A2A]), 'Grass',
               collide=False, shadow=False)
    for _ in range(24):
        a = (-10 + R.uniform(-4, 4), 0.4, R.uniform(-4, 4))
        ang = R.uniform(0, math.tau)
        L = R.uniform(12, 40)
        s.beam('Root', a, (a[0] + math.cos(ang) * L, 0.3, a[2] + math.sin(ang) * L), R.uniform(0.8, 2), 0.8, 0x3A2418, 'Wood',
               collide=False)
    # the Jjangkeun Berry itself
    jb = g.model('JjangkeunBerry')
    core = jb.ball('Berry', 14, (-10, 9, 0), 0x6A0418, 'Neon')
    light(core, 'PointLight', 0xFF1030, 2.2, 40, True)
    for k in range(60):
        th = R.uniform(0, math.tau)
        ph = math.acos(R.uniform(-1, 1))
        v = (math.sin(ph) * math.cos(th), math.cos(ph), math.sin(ph) * math.sin(th))
        jb.ball('Seed', 0.5, (-10 + v[0] * 7, 9 + v[1] * 7, v[2] * 7), 0xE8C040, 'SmoothPlastic', collide=False)
    for k in range(6):
        a = k / 6 * math.tau
        jb.blk('Sepal', (5, 0.4, 2), (-10 + math.cos(a) * 3, 16, math.sin(a) * 3), 0x1E3A1A, 'Grass',
               rot=Ry(-math.degrees(a)) * Rz(-25))
    jb.cyl('Stalk', 4, 1, (-10, 18, 0), 0x1E3A1A, 'Grass')
    jb.cyl('Pedestal', 2, 10, (-10, 1, 0), 0x3A2418, 'Wood')
    tag(jb, 'JjangkeunBerry')
    fogp = s.blk('FogSource', (120, 0.5, 100), (-10, 1.5, 0), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
    particles(fogp, 'fog', 8)
    # specimen shelf
    for i in range(3):
        sh = P.shelf(P.at(s, 30 + i * 9, 53.4, 180), w=8, h=9, kind='bottles', color=0x2A2A2A, mat='Metal')
    for i in range(8):
        s.cyl('Jar', 1.6, 1.2, (28 + i * 2.6, 4.2, 53.2), 0x9AC8A0, 'Glass', tr=0.5, collide=False)
        s.ball('Specimen', 0.8, (28 + i * 2.6, 4.0, 53.2), 0x8A0A1E, collide=False)
    P.wall_text(s, '먹지 마', -40, 10, 54.5, '-z', 10, 3, fg=0xA01018, font=9)
    P.wall_text(s, '짱큰베리는 보고 있다', 20, 8, -54.5, '+z', 16, 2.4, fg=0xA01018, font=9)
    P.wall_text(s, '먹지 마 먹지 마 먹지 마', -78.5, 6, -20, '+x', 18, 1.8, fg=0x6A0A10, font=9)
    s.blk('Wheelbarrow', (2.6, 1.4, 4), (40, 1.4, -40), 0x5A6A4A, 'CorrodedMetal', rot=Ry(30) * Rz(15))
    s.beam('Rake', (45, 0.3, -30), (43, 5, -27), 0.3, 0.3, P.WOOD, 'Wood')
    for x, z in ((40, -15), (-60, 40)):
        P.bulb(s, x, c - 3, z, color=0x6AFF6A, bright=0.4, rng=14, cord=2.5)
    P.emergency_light(s, 55, 10, -24.6, '-z', color=0xFF1A1A, bright=1.0)


# ===================================================================== B6 ~ B13 짱큰 지하병원
HOSP_THEME = {
    -6: ('접수 · 원무과', ['waiting', 'office', 'exam', 'waiting', 'toilet', 'office', 'exam', 'storage']),
    -7: ('일반 병동', ['ward'] * 8),
    -8: ('상담 · 진료실', ['consult', 'exam', 'consult', 'exam', 'consult', 'storage', 'exam', 'consult']),
    -9: ('보호실', ['padded'] * 8),
    -10: ('수술실', ['surgery', 'surgery', 'storage', 'surgery', 'ward', 'surgery', 'storage', 'surgery']),
    -11: ('약제실 · 기록보관', ['pharmacy', 'records', 'pharmacy', 'records', 'records', 'pharmacy', 'records', 'storage']),
    -12: ('격리 병동', ['cell'] * 8),
    -13: ('원장실 · 봉인실', ['director', 'consult', 'records', 'storage', 'cell', 'cell']),
}
ROOM_XS = [-79, -64, -49, -34, -19, -4, 11, 26, 41]


def _room(b, kind, x0, x1, z0, z1, side, c, label):
    """Fill one hospital room. side = 'N' (door on south wall) or 'S' (door on north wall)."""
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    back = z1 - 1.5 if side == 'N' else z0 + 1.5
    rot_back = 180 if side == 'N' else 0  # props face away from the back wall
    m = b.model('Room_' + label)
    if kind == 'ward':
        for k in range(3):
            x = x0 + 2.5 + k * 4.6
            P.bed(P.at(m, x + 0.5, back - 4.5 * (1 if side == 'N' else -1), rot_back + 180), w=3.2, l=7,
                  blanket=0xC8D8D0, frame=0xC8CCD0, messy=True)
            P.iv_stand(P.at(m, x + 2.6, back - 1.5 * (1 if side == 'N' else -1)))
        m.box('CurtainRail', x0 + 0.5, c - 1, cz - 0.1, x1 - 0.5, c - 0.8, cz + 0.1, P.STEEL, 'Metal', collide=False)
        m.box('Curtain', x0 + 2, 1.5, cz - 0.05, x0 + 7, c - 1, cz + 0.05, 0xA8C0B8, 'Fabric', collide=False, tr=0.1)
    elif kind == 'waiting':
        for row in range(3):
            for k in range(4):
                P.chair(P.at(m, x0 + 3 + k * 3, cz + (row - 1) * 5, rot_back + 180), color=0x6A8A9A)
        P.wall_text(m, '번호표: 088', cx, 8, back + (0.9 if side == 'N' else -0.9), '-z' if side == 'N' else '+z', 6, 1.4,
                    fg=0x1A1A1A, font=10)
    elif kind == 'office':
        P.desk(P.at(m, cx, cz, rot_back), w=6, screen_text='환자 기록\n조수민 — 퇴원 불가')
        P.filing_cabinet(P.at(m, x0 + 2, back, rot_back))
        P.filing_cabinet(P.at(m, x0 + 4, back, rot_back), open_=True)
    elif kind == 'exam':
        P.gurney(P.at(m, cx - 2, cz, 90))
        P.counter(P.at(m, cx, back, rot_back), w=10, body=0xE8ECEC, top=0xD8DCDC, top_mat='Marble')
        P.iv_stand(P.at(m, cx + 4, cz + 2))
    elif kind == 'consult':
        P.desk(P.at(m, cx, cz + (2 if side == 'N' else -2), rot_back), w=6, chair_=True)
        P.sofa(P.at(m, cx, cz - (3 if side == 'N' else -3), rot_back + 180), w=6, color=0x5A6A5A)
        P.shelf(P.at(m, x0 + 1.5, cz, -90), w=8, h=8, kind='books')
    elif kind == 'storage':
        for k in range(2):
            P.shelf(P.at(m, x0 + 4 + k * 7, back, rot_back), w=6, h=9, kind='boxes', color=0x6A6E72, mat='Metal')
        P.boxes_pile(P.at(m, cx, cz), n=5, r=3)
        P.wheelchair(P.at(m, x1 - 3, cz, 30), tipped=R.random() < 0.5)
    elif kind == 'toilet':
        for k in range(3):
            wall_z(m, min(back, cz), max(back, cz) + 0.01, x0 + 4 + k * 4, 0, 7, 0xB8C8C4, t=0.3)
            m.blk('Toilet', (1.8, 1.8, 2.6), (x0 + 2 + k * 4, 0.9, back), 0xE8E8E8)
        m.blk('Mirror', (8, 3, 0.1), (cx, 6.5, z0 + 0.4 if side == 'S' else z1 - 0.4), 0xB8C4C8, 'Glass', refl=0.5)
    elif kind == 'padded':
        pad = 0xE8E6DC
        m.box('PadA', x0 + 0.4, 0, z0 + 0.4, x0 + 1.0, c, z1 - 0.4, pad, 'Fabric')
        m.box('PadB', x1 - 1.0, 0, z0 + 0.4, x1 - 0.4, c, z1 - 0.4, pad, 'Fabric')
        m.box('PadC', x0 + 0.4, 0, back - 0.5 if side == 'N' else back - 1.0, x1 - 0.4, c, back + 1.0 if side == 'N' else back + 0.5, pad, 'Fabric')
        m.box('PadFloor', x0 + 1, 0, z0 + 1, x1 - 1, 0.3, z1 - 1, pad, 'Fabric')
        P.bed(P.at(m, cx, cz, 90), w=3.4, l=7, blanket=0xF0F0F0, frame=0xC8CCD0, messy=False)
        for k in range(2):
            m.blk('Strap', (3.8, 0.15, 0.6), (cx - 1.5 + k * 3, 2.1, cz), 0x3A2A1A, 'Fabric', collide=False)
        P.tally(m, x0 + 1.05, 6, cz, '+x', groups=R.randint(4, 14), color=0x6A6A6A)
        P.wall_text(m, R.choice(['여기서 꺼내줘', '짱큰 선생님은 거짓말쟁이', '88', '수민이가 온다']), cx, 8,
                    back + (-0.6 if side == 'N' else 0.6), '-z' if side == 'N' else '+z', 9, 1.6, fg=0x5A5A5A, font=9)
    elif kind == 'surgery':
        tb = m.model('OperatingTable')
        tb.blk('Base', (1.4, 3, 1.4), (cx, 1.5, cz), P.STEEL, 'Metal')
        tb.blk('Top', (3, 0.4, 7.5), (cx, 3.2, cz), 0x4A6A6A, 'Fabric')
        tb.blk('Sheet', (3.2, 0.1, 4), (cx, 3.45, cz - 1.4), 0x7AA0A0, 'Fabric', collide=False)
        P.splat(tb, cx + 0.3, cz + 0.4, 0.9, y=3.52)
        lamp = m.cyl('ORLamp', 0.6, 4, (cx, c - 2.6, cz), 0xE8ECEC, 'Metal', collide=False)
        lens = m.cyl('ORLens', 0.1, 3.2, (cx, c - 2.95, cz), 0xFFFFFF, 'Neon', collide=False)
        light(lens, 'SpotLight', 0xE8FFFF, 2.2, 22, True, 'Left', 60)
        m.blk('LampArm', (0.3, 2.2, 0.3), (cx, c - 1.1, cz), P.STEEL, 'Metal', collide=False)
        tray = m.model('Tray')
        tray.blk('TrayTop', (2.4, 0.1, 1.4), (cx + 3, 3.6, cz + 2), P.STEEL, 'Metal')
        tray.blk('TrayLeg', (0.15, 3.5, 0.15), (cx + 3, 1.8, cz + 2), P.STEEL, 'Metal')
        for k in range(4):
            tray.blk('Tool', (0.12, 0.05, 1.0), (cx + 2.3 + k * 0.45, 3.68, cz + 2), 0xD8DCE0, 'Metal', collide=False)
        mon = m.blk('Monitor', (2.4, 1.8, 0.4), (cx - 3, 5.5, cz - 2), P.BLACK)
        gui_text(mon, '♥ ---\nSpO2 --', 'Front', bg=0x041008, fg=0x3AFF6A, glow=True, font=10, ppu=30)
        P.counter(P.at(m, cx, back, rot_back), w=10, body=0xC8D0D0, top=0xA8B0B0, top_mat='Metal')
        P.splat(m, cx - 2, cz + 3, 1.4)
        P.drips(m, cx, 5, back + (-0.6 if side == 'N' else 0.6), '-z' if side == 'N' else '+z', n=4)
    elif kind == 'pharmacy':
        for k in range(2):
            P.shelf(P.at(m, x0 + 4 + k * 7, back, rot_back), w=6, h=9, levels=6, kind='bottles', color=0xE8ECEC,
                    mat='SmoothPlastic')
        P.counter(P.at(m, cx, cz, rot_back), w=10, body=0xE8ECEC, top=0xC8CCCC, top_mat='Marble')
        for _ in range(10):
            m.blk('Pill', (0.25, 0.12, 0.12), (cx + R.uniform(-5, 5), 0.06, cz + R.uniform(-4, 4)),
                  R.choice([0xF0F0F0, 0xE04040, 0x40A0E0]), collide=False, shadow=False)
    elif kind == 'records':
        for k in range(3):
            P.filing_cabinet(P.at(m, x0 + 2.5 + k * 2.2, back, rot_back), h=5, color=0x6A6E5A, open_=R.random() < 0.4)
        P.shelf(P.at(m, x1 - 4, back, rot_back), w=6, h=9, kind='boxes', color=0x5A5E62, mat='Metal')
        for _ in range(16):
            m.blk('File', (0.9, 0.04, 1.2), (cx + R.uniform(-5, 5), 0.04, cz + R.uniform(-5, 5)), 0xD8C8A0,
                  rot=Ry(R.uniform(0, 360)), collide=False, shadow=False)
    elif kind == 'cell':
        P.bed(P.at(m, x0 + 3, cz, 0), w=3, l=6.5, blanket=0x8A8A7A, frame=0x5A5A5A)
        for k in range(3):
            m.beam('Chain', (x1 - 1, 7, cz - 2 + k * 2), (x1 - 1.5, 1, cz - 1 + k * 2), 0.3, 0.3, 0x5A5650, 'CorrodedMetal',
                   collide=False)
        P.tally(m, x1 - 0.65, 6, cz, '-x', groups=R.randint(6, 16), color=0x3A3A3A)
        P.handprint(m, cx, 4, back + (-0.6 if side == 'N' else 0.6), '-z' if side == 'N' else '+z')
    elif kind == 'director':
        P.desk(P.at(m, cx, cz, rot_back), w=8, top=0x3A2214, screen_text='원장 짱큰\n오늘의 환자: 6명', nameplate='원장 짱큰')
        P.shelf(P.at(m, x0 + 2, back, rot_back), w=4, h=9, kind='books')
        P.shelf(P.at(m, x1 - 3, back, rot_back), w=5, h=9, kind='bottles')
        pt = P.sign(m, '원장 짱큰', cx, 8, back + (-0.5 if side == 'N' else 0.5), '-z' if side == 'N' else '+z', 4, 5,
                    bg=0x1A1418, fg=0xE8C870, name='Portrait')
    # common: room light (some broken) + door number
    P.ceiling_light(m, cx, cz, c, color=0xE8FFF4, neon=0xF0FFF8, bright=0.8, rng=16, broken=R.random() < 0.35)


def hospital(fb, F):
    n = F['n']
    c = F['h'] - 1
    title, rooms = HOSP_THEME[n]
    s = fb.model('Hospital_B%d' % -n)
    g = fb.model('Gameplay')
    s.box('Lino', -79, 0, -55, 61, 0.05, 55, 0xB8BCA8, 'SmoothPlastic', collide=False)
    s.box('CorridorStripe', -79, 0.05, -1, 46, 0.08, 1, 0x4A7A6A, collide=False, shadow=False)
    wall_col, tile = 0xD8DCD0, 0x9FB8A8
    xs = ROOM_XS
    west_x = -79
    if n == -13:
        xs = [-34, -19, -4, 11, 26, 41]
        west_x = -34
    openings = [((xs[i] + xs[i + 1]) / 2, 4, 8) for i in range(len(xs) - 1)]
    for zc, side in ((6, 'N'), (-6, 'S')):
        if n == -12:
            wall_x(s, west_x, 41, zc, 0, c, wall_col, openings=[(o[0], 13, c) for o in openings])
            for i in range(len(xs) - 1):
                cell = P.bars_along_x(s, xs[i] + 0.8, xs[i + 1] - 0.8, zc, 0, c - 0.3, step=1.2, name='CellBars')
                tag(cell, 'CellBars')
        else:
            wall_x(s, west_x, 41, zc, 0, c, wall_col, openings=openings)
            wall_x(s, west_x, 41, zc + (-0.35 if side == 'N' else 0.35), 0, 4, tile, mat='Marble', t=0.1,
                   openings=openings, name='Wainscot')
        for i in range(len(xs) - 1):
            x0, x1 = xs[i], xs[i + 1]
            label = 'B%d-%02d%s' % (-n, i + 1, side)
            if n != -12:
                st = R.random()
                if st < 0.45:
                    door_in_wall_x(s, (x0 + x1) / 2, zc, 3.8, 7.8, open_deg=R.choice([60, 85]) * (1 if side == 'S' else -1),
                                   color=0xC8D0C8, frame=0x8A9A8A, window=True)
                elif st < 0.75:
                    door_in_wall_x(s, (x0 + x1) / 2, zc, 3.8, 7.8, open_deg=0, color=0xC8D0C8, frame=0x8A9A8A,
                                   window=True, locked=R.random() < 0.5)
            P.sign(s, label, (x0 + x1) / 2 + 3.5, 6.5, zc + (-0.4 if side == 'N' else 0.4), '-z' if side == 'N' else '+z',
                   2.4, 0.8, bg=0xF0F0E8, fg=0x2A3A2A, name='RoomNo')
            z0, z1 = (6.3, 55) if side == 'N' else (-55, -6.3)
            kind = rooms[(i * 2 + (0 if side == 'N' else 1)) % len(rooms)]
            _room(s, kind, x0, x1, z0, z1, side, c, label)
    for x in xs[1:-1] + [41]:
        wall_z(s, 6.3, 55, x, 0, c, wall_col)
        wall_z(s, -55, -6.3, x, 0, c, wall_col)
    # nurse station / lobby east
    ns = s.model('NurseStation')
    P.counter(P.at(ns, 52, 22, 90), w=14, body=0xE0E8E0, top=0xC8D0C8, top_mat='Marble')
    P.desk(P.at(ns, 56, 22, 90), w=5, screen_text='호출: B%d-0%d' % (-n, R.randint(1, 8)), chair_=True)
    P.sign(ns, '짱큰 지하병원 · B%d %s' % (-n, title), 61.8, 9.5, 2, '-x', 12, 1.6, bg=0x1E3A2E, fg=0xE8F4EC,
           name='WardSign')
    P.sign(ns, 'B%d' % -n, 61.8, 7.2, 2, '-x', 3, 1.4, bg=0x1E3A2E, fg=0xFFFFFF, name='WardNo')
    if n == -6:
        big = P.sign(s, '레전드 정신병원\n짱큰 지하병원', 52, 10.5, 54.3, '-z', 16, 4, bg=0x1E3A2E, fg=0xE8F4EC, glow=True,
                     name='HospitalSign')
        for k in range(8):
            P.chair(P.at(s, 46 + (k % 4) * 3, 40 + (k // 4) * 5, 180), color=0x6A8A9A)
    # corridor clutter
    for _ in range(4):
        P.wheelchair(P.at(s, R.uniform(-70, 35), R.uniform(-3.5, 3.5), R.uniform(0, 360)), tipped=R.random() < 0.4)
    for _ in range(3):
        P.gurney(P.at(s, R.uniform(-70, 35), R.choice([-3, 3]), 90 + R.uniform(-10, 10)), stained=R.random() < 0.5)
    for _ in range(3):
        P.iv_stand(P.at(s, R.uniform(-70, 40), R.uniform(-4, 4)))
    for _ in range(25):
        s.blk('Paper', (0.85, 0.02, 1.1), (R.uniform(-75, 45), 0.08, R.uniform(-5, 5)), 0xF2F0EA, rot=Ry(R.uniform(0, 360)),
              collide=False, shadow=False, touch=False, query=False)
    for _ in range(5):
        P.splat(s, R.uniform(-75, 45), R.uniform(-4, 4), R.uniform(0.8, 2.2), y=0.09,
                color=R.choice([P.BLOOD, 0x2A3438, 0x3A3A20]))
    for x in range(-74, 42, 12):
        P.ceiling_light(s, x, 0, c, color=0xD8FFE8, neon=0xE8FFF0, bright=0.9, rng=18, broken=R.random() < 0.3)
    P.ceiling_light(s, 52, 15, c, color=0xD8FFE8, bright=0.8, rng=20, shadows=True)
    P.emergency_light(s, -78.4, 9, 0, '+x')
    P.wall_text(s, R.choice(['도망쳐', '다음은 너야', '짱큰 선생님이 지켜본다', '아래로 가지 마']), -20, 9, 5.6, '-z', 14, 1.8,
                fg=0x5A0A0A, font=9)

    if n == -13:
        sealed(fb, s, g, c)


def sealed(fb, s, g, c):
    """B13 west: the sealed room with the crack down to the inner core."""
    wall_z(s, -55, 55, -34, 0, c, 0x5A5A5A, t=1.2, openings=[(0, 10, 10)])
    sr = s.model('SealedRoom')
    for sgn in (-1, 1):
        sr.blk('BrokenDoor', (0.6, 9.6, 4.8), (-36.5, 4.8, sgn * 5.5), 0x4A4A4A, 'DiamondPlate', rot=Ry(sgn * 70))
    P.sign(sr, '봉인실 — 절대 열지 마시오', -33.3, 11, 0, '+x', 10, 1.6, bg=0x8A1010, fg=0xFFFFFF, name='SealSign')
    # cracked floor glowing orange around the hole
    for k in range(22):
        a = R.uniform(0, math.tau)
        r0 = R.uniform(9, 11)
        L = R.uniform(5, 16)
        sr.beam('Crack', (-54 + math.cos(a) * r0, 0.07, math.sin(a) * r0),
                (-54 + math.cos(a) * (r0 + L), 0.07, math.sin(a) * (r0 + L)), R.uniform(0.2, 0.6), 0.1, 0xFF6A1A, 'Neon',
                collide=False, shadow=False)
    for x0, z0, x1, z1 in ((-63, -9, -45, -8), (-63, 8, -45, 9), (-63, -8, -62, 8), (-46, -8, -45, 8)):
        sr.box('HoleRim', x0, 0, z0, x1, 0.6, z1, 0x3A3430, 'Basalt')
    glow = sr.blk('CoreGlow', (14, 0.2, 14), (-54, -2, 0), 0xFF5A1A, 'Neon', tr=0.6, collide=False, shadow=False)
    light(glow, 'PointLight', 0xFF6A2A, 2.5, 40)
    e = sr.blk('EmberSource', (12, 0.5, 12), (-54, -6, 0), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
    particles(e, 'embers', 10)
    for k in range(10):
        a = k / 10 * math.tau
        sr.cyl('ChainPost', 4, 0.6, (-54 + math.cos(a) * 12, 2, math.sin(a) * 12), 0x3A3A3A, 'Metal')
    for k in range(10):
        a, b_ = k / 10 * math.tau, (k + 1) / 10 * math.tau
        sr.beam('Chain', (-54 + math.cos(a) * 12, 3.4, math.sin(a) * 12), (-54 + math.cos(b_) * 12, 3.0, math.sin(b_) * 12),
                0.25, 0.25, 0x5A5650, 'CorrodedMetal', collide=False)
    for k in range(14):
        sr.blk('Talisman', (0.05, 2, 0.8), (-78.5, R.uniform(3, 11), R.uniform(-40, 40)), 0xF2D23A, 'SmoothPlastic',
               rot=Rx(R.uniform(-10, 10)), collide=False)
    P.sign(sr, '이 아래는 지구 내핵입니다', -78.4, 9, 0, '+x', 16, 2.4, bg=0x1A0A06, fg=0xFF8A3A, glow=True,
           name='CoreWarning')
    P.wall_text(sr, '↓ 열쇠는 여기 아래에', -54, 6, 54.5, '-z', 12, 1.8, fg=0xFF6A1A)
    for x, z in ((-70, -40), (-70, 40), (-45, -40), (-45, 40)):
        P.ceiling_light(sr, x, z, c, color=0xFFB080, bright=0.5, rng=18, broken=(x == -45))


# ===================================================================== 지구 내핵
def core(world, y_top):
    """Cavern under B13. y_top = world y of B13 slab bottom."""
    m = world.model('F_내핵_InnerCore')
    st = m.model('Cavern')
    g = m.model('Gameplay')
    cx, cz = -10, 0
    hole = (-62, -46, -8, 8)
    slab(st, y_top - 5, y_top, [hole], 0x2A2220, 'Basalt', outer=(-100, 80, -90, 90), name='RockCeiling')
    # rock walls (ring)
    tiers = 6
    for t in range(tiers):
        y = y_top - 8 - t * 17
        for k in range(26):
            a = k / 26 * math.tau
            r = 80 + R.uniform(-3, 3)
            st.blk('RockWall', (22, 20, 10), (cx + math.cos(a) * r, y, cz + math.sin(a) * r),
                   R.choice([0x2A2220, 0x3A2E28, 0x241C18]), R.choice(['Basalt', 'Rock']),
                   rot=Ry(-math.degrees(a) + 90) * Rx(R.uniform(-12, 12)) * Rz(R.uniform(-8, 8)))
    # stalactites
    for _ in range(30):
        a, r = R.uniform(0, math.tau), R.uniform(10, 75)
        L = R.uniform(6, 22)
        st.wedge('Stalactite', (3, L, 3), T(cx + math.cos(a) * r, y_top - 5 - L / 2, cz + math.sin(a) * r) * Rx(180),
                 0x2A2220, 'Basalt')
    # magma lake (kill)
    y_magma = y_top - 102
    lake = g.model('Magma')
    tag(lake, 'KillBrick')
    lake.cyl('MagmaLake', 4, 176, (cx, y_magma - 2, cz), 0xFF5A1A, 'CrackedLava', tags=['KillBrick'])
    glow = lake.cyl('MagmaGlow', 0.5, 170, (cx, y_magma + 0.3, cz), 0xFF6A1A, 'Neon', tr=0.75, collide=False,
                    tags=['KillBrick'])
    for k in range(6):
        a = k / 6 * math.tau
        lp = st.blk('MagmaLight', (1, 1, 1), (cx + math.cos(a) * 50, y_magma + 4, cz + math.sin(a) * 50), 0xFF6A1A, 'Neon',
                    tr=1, collide=False, shadow=False)
        light(lp, 'PointLight', 0xFF6A2A, 2, 60)
    em = st.blk('Embers', (150, 1, 150), (cx, y_magma + 2, cz), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
    particles(em, 'embers', 30)
    # the inner core
    cy = y_top - 62
    corep = g.ball('InnerCore', 40, (cx, cy, cz), 0xFFB040, 'Neon', collide=True)
    light(corep, 'PointLight', 0xFFA040, 4, 60, True)
    g.ball('CoreShell', 48, (cx, cy, cz), 0xFF5A1A, 'ForceField', tr=0.2, collide=False)
    for k in range(10):
        a = k / 10 * math.tau
        g.beam('CoreRing', (cx + math.cos(a) * 30, cy, cz + math.sin(a) * 30),
               (cx + math.cos(a + math.tau / 10) * 30, cy, cz + math.sin(a + math.tau / 10) * 30), 1.2, 1.2, 0xFFD080,
               'Neon', collide=False)
    # landing platform under the hole + spiral path down to the key
    y0, y1 = y_top - 16, y_top - 82
    r = 44
    a0 = math.pi
    turns = 1.5
    nseg = 44
    st.cyl('LandingRock', 3, 16, (-54, y0 - 1.5, 0), 0x3A2E28, 'Basalt')
    pts = []
    for i in range(nseg + 1):
        t = i / nseg
        a = a0 + t * turns * math.tau
        pts.append((cx + math.cos(a) * r, y0 + (y1 - y0) * t, cz + math.sin(a) * r))
    path = st.model('SpiralPath')
    for i in range(nseg):
        a, b_ = pts[i], pts[i + 1]
        d = [(b_[j] - a[j]) for j in range(3)]
        Ld = math.sqrt(sum(v * v for v in d))
        e = [v / Ld * 0.8 for v in d]
        path.beam('Ledge', (a[0] - e[0], a[1] - 1 - e[1], a[2] - e[2]), (b_[0] + e[0], b_[1] - 1 + e[1], b_[2] + e[2]), 10, 2,
                  0x3A2E28, 'Basalt')
        if i % 3 == 0:
            P.rubble(path.at(T(*a)), n=2, r=3, color=0x2A2220, mat='Basalt', smin=0.5, smax=1.4)
        if i % 6 == 3:
            lp = path.blk('PathCrystal', (0.8, 2.4, 0.8), (a[0], a[1] + 1.2, a[2]), 0xFF8A3A, 'Neon', collide=False,
                          rot=Rz(R.uniform(-20, 20)))
            light(lp, 'PointLight', 0xFF8A3A, 0.8, 16)
    # key platform
    kx, ky, kz = pts[-1][0] + 6, y1, pts[-1][2]
    st.cyl('KeyPlatform', 4, 22, (kx, ky - 2, kz), 0x3A2E28, 'Basalt')
    st.cyl('Pedestal', 4, 3, (kx + 2, ky + 2, kz), 0x2A2220, 'Basalt')
    key = g.model('Key')
    tag(key, 'Key')
    key.cyl('Bow', 0.4, 2.2, (kx + 2, ky + 6.6, kz), 0xFFD23A, 'Neon', axis='z')
    key.blk('Shaft', (0.4, 3.2, 0.4), (kx + 2, ky + 4.4, kz), 0xFFD23A, 'Neon')
    key.blk('Tooth', (0.9, 0.4, 0.4), (kx + 2.4, ky + 3.2, kz), 0xFFD23A, 'Neon')
    key.blk('Tooth', (0.7, 0.4, 0.4), (kx + 2.3, ky + 3.9, kz), 0xFFD23A, 'Neon')
    kl = key.blk('KeyGlow', (0.2, 0.2, 0.2), (kx + 2, ky + 5, kz), 0xFFD23A, 'Neon', tr=1, collide=False)
    light(kl, 'PointLight', 0xFFD060, 2, 20, True)
    P.sign(st, '정문 열쇠 · 지구 내핵', kx + 9, ky + 3, kz, '-x', 6, 1.4, bg=0x1A0A06, fg=0xFFD23A, glow=True,
           name='KeySign')
    return m
