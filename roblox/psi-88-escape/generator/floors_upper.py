"""Floors 88 → 50."""
import math
from rbx import T, Rx, Ry, Rz, Inst, light, gui_text, particles
import props as P
from props import R
from building import wall_x, wall_z, door_in_wall_x, door_in_wall_z, tag, BX0, BX1, BZ0, BZ1

WALL = 0xCFC8BC


def marker(b, name, pos, size=(4, 1, 4), tags=None):
    return b.blk(name, size, pos, 0xFF00FF, tr=1, collide=False, shadow=False, tags=tags or [name])


# ===================================================================== 88 공유 하우스
def f88(fb, F):
    c = F['h'] - 1
    s = fb.model('SharedHouse')
    g = fb.model('Gameplay')
    wallc = 0xD9CDB8
    # --- bedroom row (north)
    xs = [-79, -64, -49, -34, -19, -4, 11]
    for x in xs[1:-1]:
        wall_z(s, 30, 55, x, 0, c, wallc)
    wall_z(s, 30, 55, 11, 0, c, wallc)
    wall_x(s, -79, 11, 30, 0, c, wallc, openings=[((xs[i] + xs[i + 1]) / 2 + 3, 4, 8) for i in range(6)])
    blankets = [0x6E5A7A, 0x4F6B5A, 0x7A5A4A, 0x4A5A7A, 0x7A7A4A, 0x5A4A4A]
    for i in range(6):
        x0, x1 = xs[i], xs[i + 1]
        cx = (x0 + x1) / 2
        door_in_wall_x(s, cx + 3, 30, 4, 8, open_deg=-70, color=0x7A6048)
        P.sign(s, '방 %d' % (i + 1), cx + 6, 9, 29.6, '-z', 2.2, 0.9, bg=0xEDE6D6, fg=0x3A2A1A, name='RoomSign')
        if i % 2 == 0:
            P.floor_mattress(P.at(s, x0 + 3.5, 49, 0), blanket=blankets[i])
        else:
            P.bed(P.at(s, x0 + 3.5, 50.5, 0), w=4, l=8, blanket=blankets[i])
        P.table(P.at(s, x1 - 2.5, 50, 90), 4, 2.4, 2.8, color=P.WOOD_L)
        P.chair(P.at(s, x1 - 4.6, 50, -90))
        P.bulb(s, cx, c - 2.5, 42, color=0xFFC07A, bright=0.9, rng=14, cord=2.3)
        P.tally(s, x1 - 0.35, 6.5, 40, '-x', groups=R.randint(5, 12))
        P.boxes_pile(P.at(s, x0 + 3, 34, 0), n=2, r=1.2)
        sp = g.blk('Spawn%d' % (i + 1), (5, 0.2, 5), (cx, 0.1, 40), 0x8A6A4A, 'WoodPlanks', cls='SpawnLocation',
                   tags=['PlayerSpawn'])
        sp.prop('bool', 'Neutral', True)
        sp.prop('int', 'Duration', 0)
        sp.prop('float', 'Transparency', 1)
    # --- kitchen
    k = s.model('Kitchen')
    P.counter(P.at(k, 27, 53.6, 180), w=28)
    for x in range(15, 41, 5):
        k.blk('UpperCabinet', (4.6, 3, 1.6), (x, 10, 54.2), 0xE6E0D4, 'Wood')
    k.blk('Sink', (3, 0.3, 1.6), (22, 3.15, 53.6), P.STEEL, 'Metal')
    k.blk('Stove', (3.2, 0.2, 2), (32, 3.25, 53.6), P.BLACK, 'Metal')
    fr = P.fridge(P.at(k, 44, 53.4, 180))
    P.chains_x(k.at(T(44, 0, 51.9) * Ry(0)), 3, 6)
    P.sign(k, '자물쇠 열쇠: 관리자만', 44, 7.2, 52.0, '-z', 3, 0.8, bg=0xEFEFEF, fg=0x8A1010, name='FridgeNote')
    P.counter(P.at(k, 27, 42, 0), w=12, d=3.5)
    for x in (23, 27, 31):
        P.stool(P.at(k, x, 39.4))
    for i in range(7):
        k.cyl('RamenCup', 0.9, 1.0, (21 + i * 1.4, 3.65, 42 + R.uniform(-0.8, 0.8)), 0xD8402A, 'SmoothPlastic', collide=False)
    # --- living room
    lv = s.model('Living')
    lv.blk('Rug', (22, 0.06, 14), (-40, 0.03, 12), 0x6A3A3A, 'Fabric', collide=False)
    P.sofa(P.at(lv, -40, 20, 0), w=12, color=0x5A5048)
    P.sofa(P.at(lv, -50, 12, -90), w=8, color=0x5A5048)
    P.table(P.at(lv, -40, 12, 0), 7, 3.5, 1.6, color=P.WOOD_D)
    P.tv(P.at(lv, -40, 2, 180), text='신호 없음\nNO SIGNAL')
    P.table(P.at(lv, -10, 12, 0), 12, 5, 3, color=P.WOOD)
    for i, x in enumerate((-14, -10, -6)):
        P.chair(P.at(lv, x, 16.3, 0))
        P.chair(P.at(lv, x, 7.7, 180))
        lv.blk('Tray', (1.8, 0.1, 1.3), (x, 3.06, 13.4 if i % 2 else 10.6), 0x8A9AA0, 'Metal', collide=False)
    P.shelf(P.at(lv, -76, 12, -90), w=10, h=9, kind='books')
    P.plant(P.at(lv, -76, 26), dead=True)
    P.sign(lv, 'D+1,247', -25, 9, 29.65, '-z', 4, 1.6, bg=0xF2EEE4, fg=0x8A1010, name='Calendar')
    P.sign(lv, '공유 하우스 규칙\n1. 밤 10시 이후 외출 금지\n2. 현관문에 손대지 말 것\n3. 조수민이 오면 숨을 것',
           -60, 7, 29.65, '-z', 6, 4, bg=0xF7F3E8, fg=0x222222, font=17, name='HouseRules')
    for x, z in ((-40, 12), (-10, 12), (25, 15), (-60, -10)):
        P.pendant(lv, x, z, c, drop=4, color=0xFFC28A, bright=1.2, rng=22)
    # --- south rooms
    wall_x(s, -79, 45, -25, 0, c, wallc, openings=[(-62, 4, 8), (-27, 4, 8), (8, 4, 8), (35, 4, 8)])
    for x in (-45, -10, 25):
        wall_z(s, -55, -25, x, 0, c, wallc)
    # laundry
    for i in range(3):
        m = s.model('Washer')
        m.blk('Body', (3, 3.4, 3), (-74 + i * 3.4, 1.7, -52.5), 0xECECEC, 'SmoothPlastic')
        m.cyl('DoorGlass', 0.2, 2, (-74 + i * 3.4, 1.9, -50.95), 0x5A7080, 'Glass', axis='z', tr=0.3)
    P.boxes_pile(P.at(s, -55, -45), n=5, r=3, colors=(0x6A7A8A, 0x8A7A6A, 0xD8D0C0))
    P.ceiling_light(s, -62, -40, c, bright=0.7, rng=16)
    # escape plan room
    pr = s.model('PlanRoom')
    pr.blk('Corkboard', (16, 8, 0.3), (-27, 6.5, -25.5), 0xA8845A, 'Fabric')
    pts = []
    for i in range(14):
        x, y = -27 + R.uniform(-7, 7), 6.5 + R.uniform(-3.4, 3.4)
        pts.append((x, y))
        pr.blk('Photo', (1.4, 1.0, 0.05), (x, y, -25.7), R.choice([0xEDEDED, 0xD8D0C0, 0xC0C8D0]), collide=False)
    for i in range(12):
        a, b2 = R.sample(pts, 2)
        pr.beam('RedString', (a[0], a[1], -25.78), (b2[0], b2[1], -25.78), 0.06, 0.06, 0xC01818, 'Neon', collide=False,
                shadow=False)
    P.sign(pr, '탈출 계획 — 88층 → 1층', -27, 11.4, -25.7, '-z', 9, 1.2, bg=0xF0E8D8, fg=0x8A1010, name='PlanTitle')
    P.table(P.at(pr, -27, -40), 8, 4, 3, color=P.WOOD_L)
    pr.blk('Blueprint', (6, 0.03, 3), (-27, 3.02, -40), 0x2A4A8A, collide=False)
    P.chair(P.at(pr, -27, -43, 180))
    P.ceiling_light(pr, -27, -40, c, bright=0.9, rng=18, shadows=True)
    # bathroom
    bt = s.model('Bathroom')
    for i in range(3):
        x0 = -8 + i * 6
        wall_z(bt, -55, -46, x0, 0, 7.5, 0xBFCFD4, t=0.3)
        bt.blk('Toilet', (1.8, 1.8, 2.6), (x0 + 3, 0.9, -53), 0xF2F2F2, 'SmoothPlastic')
        bt.blk('Tank', (2, 2, 0.8), (x0 + 3, 2.5, -54.4), 0xF2F2F2, 'SmoothPlastic')
    P.counter(P.at(bt, 8, -27, 0), w=12, d=2.6, body=0xD8E0E2, top=0xEFEFEF, top_mat='Marble')
    bt.blk('Mirror', (11, 4, 0.1), (8, 7, -25.4), 0xC8D4D8, 'Glass', refl=0.6)
    P.wall_text(bt, '나가고 싶어', 8, 7, -25.5, '-z', 6, 1.6, fg=0x8A1010)
    P.ceiling_light(bt, 8, -40, c, color=0xE8F4FF, bright=0.8)
    # storage
    for i in range(3):
        P.shelf(P.at(s, 28 + i * 6, -53.5, 180), w=5, h=8, d=2, kind='boxes')
    # --- front door corner
    P.sign(s, '절대 나가지 마', 61.8, 9.5, -16, '-x', 4, 1.2, bg=0x111111, fg=0xE02020, name='DontLeave')
    for i in range(6):
        P.at(s, 58 - i * 1.6, -2.5).blk('Shoes', (1.0, 0.5, 1.6), (0, 0.25, 0), R.choice([0x2A2A2A, 0xEDEDED, 0x8A3030, 0x30508A]))
    s.blk('ShoeRack', (10, 3, 1.8), (53, 1.5, -0.5), P.WOOD_L, 'Wood')
    # --- boards over most windows, bars over bedroom windows
    wb = s.model('WindowBlocks')
    P.bars_along_x(wb, -78.5, 10.5, 54.6, 1.5, c - 1.2, step=1.6)
    for x in range(-76, 80, 8):
        for zf, side in ((-54.6, 'S'),):
            wb.blk('Board', (9, 0.9, 0.3), (x + 4, 7, zf), 0x7A5A3A, 'WoodPlanks', rot=Rz(R.uniform(25, 35)))
            wb.blk('Board', (9, 0.9, 0.3), (x + 4, 7, zf), 0x6A4A2E, 'WoodPlanks', rot=Rz(R.uniform(-35, -25)))
    for z in range(-52, 56, 8):
        for xf in (-78.6, 78.6):
            wb.blk('Board', (0.3, 0.9, 9), (xf, 7, z), 0x7A5A3A, 'WoodPlanks', rot=Rx(R.uniform(25, 35)))
            wb.blk('Board', (0.3, 0.9, 9), (xf, 7, z), 0x6A4A2E, 'WoodPlanks', rot=Rx(R.uniform(-35, -25)))
    for x in range(14, 58, 8):
        wb.blk('Board', (9, 0.9, 0.3), (x + 4, 7, 54.6), 0x7A5A3A, 'WoodPlanks', rot=Rz(30))
    # ceiling hatch hint
    s.blk('Hatch', (4, 0.1, 4), (-20, c - 0.25, -5), 0x9A948A, 'Metal')


# ===================================================================== 87 폐허
def f87(fb, F):
    c = F['h'] - 1
    s = fb.model('Ruins')
    g = fb.model('Gameplay')
    # remnants of an office: desk grid, many destroyed
    for ix in range(6):
        for iz in range(4):
            x, z = -70 + ix * 18, -42 + iz * 22
            if R.random() < 0.3:
                continue
            roll = R.random()
            if roll < 0.35:
                P.desk(s.at(T(x, 1.55, z) * Rx(90) * T(0, -1.55, 0)), monitor=False, chair_=False, clutter=False)
            elif roll < 0.6:
                P.desk(P.at(s, x, z, R.uniform(-40, 40)), screen_text=None, chair_=False)
                P.office_chair(s.at(T(x + 3, 1.0, z - 3) * Rz(80)))
            else:
                P.desk(P.at(s, x, z, R.uniform(-10, 10)), chair_=True)
            P.rubble(P.at(s, x + R.uniform(-6, 6), z + R.uniform(-6, 6)), n=R.randint(6, 14), r=4)
    # broken partitions with jagged tops
    for x0, z0, L in ((-60, -10, 30), (-10, 15, 26), (20, -30, 20)):
        n = int(L / 2)
        for i in range(n):
            hgt = R.uniform(1.5, 5) if R.random() < 0.2 else R.uniform(9, c)
            s.box('BrokenWall', x0 + i * 2, 0, z0 - 0.3, x0 + i * 2 + 2, hgt, z0 + 0.3, WALL, 'Concrete')
    # collapsed ceiling panels
    for _ in range(9):
        x, z = R.uniform(-70, 40), R.uniform(-45, 45)
        s.blk('FallenSlab', (R.uniform(8, 14), 1, R.uniform(6, 10)), (x, 3, z), 0xA8A49C, 'Concrete',
              rot=Ry(R.uniform(0, 360)) * Rx(R.uniform(15, 30)))
        for i in range(4):
            s.beam('Rebar', (x + R.uniform(-3, 3), c - 0.3, z + R.uniform(-3, 3)),
                   (x + R.uniform(-4, 4), c - R.uniform(3, 6), z + R.uniform(-4, 4)), 0.18, 0.18, 0x5A3A2A,
                   'CorrodedMetal', collide=False)
    for _ in range(18):
        P.rubble(P.at(s, R.uniform(-75, 45), R.uniform(-50, 50)), n=R.randint(4, 10), r=3, smax=3)
    # holes in the ceiling (exposed slab underside)
    for _ in range(5):
        x, z = R.uniform(-60, 30), R.uniform(-40, 40)
        s.blk('CeilingHole', (R.uniform(5, 9), 0.3, R.uniform(5, 9)), (x, c - 0.25, z), 0x2A2826, 'Concrete',
              rot=Ry(R.uniform(0, 90)), collide=False)
    # the hammer
    hm = s.model('EskimoHammer')
    s.box('HammerWall', -2, 0, 14.7, 8, c, 15.3, WALL, 'Concrete')
    hm.blk('Head', (3, 3, 6), (3, 7, 16.2), 0x4A4A4E, 'Metal', rot=Rz(10))
    hm.beam('Handle', (3, 7, 13), (5, 1.2, 1), 0.7, 0.7, 0x6B4A2F, 'Wood')
    for i in range(10):
        a = i / 10 * math.tau
        s.beam('Crack', (3, 7, 14.62), (3 + math.cos(a) * R.uniform(2.5, 4.8), 7 + math.sin(a) * R.uniform(2, 5), 14.62),
               0.15, 0.15, 0x1A1A1A, collide=False, shadow=False)
    s.box('GraffitiWall', -56, 0, -10.3, -36, c, -9.7, WALL, 'Concrete')
    P.wall_text(s, 'Извините', -46, 9, -10.38, '-z', 14, 3, fg=0x2A4A9A)
    P.wall_text(s, '에스키모 출입 금지!!', -46, 5, -10.38, '-z', 12, 2.4, fg=0xB01818)
    P.wall_text(s, '고쳐 줄게… 안 부수겠다…', -6, 4, 14.62, '-z', 7, 1.4, fg=0x3A3A3A)
    # vending machine knocked over
    s.blk('VendingMachine', (4, 7, 3), (30, 1.5, 10), 0xB01818, 'Metal', rot=Rx(90) * Ry(20))
    for i in range(8):
        s.cyl('Can', 0.6, 0.35, (28 + R.uniform(-3, 5), 0.18, 6 + R.uniform(-3, 3)), R.choice([0xD02020, 0x2050D0, 0xE0E0E0]),
              'Metal', axis='x', rot=Ry(R.uniform(0, 180)), collide=False)
    # puddles and stains
    for _ in range(7):
        P.splat(s, R.uniform(-70, 50), R.uniform(-50, 50), R.uniform(1.5, 4), color=0x2A3438, name='Puddle')
    # dangling wires with sparks
    for x, z in ((-40, 0), (10, -20), (-5, 35)):
        p = s.beam('Cable', (x, c, z), (x + 1, c - 5, z + 1), 0.15, 0.15, P.BLACK, collide=False)
        sp = s.blk('SparkPoint', (0.3, 0.3, 0.3), (x + 1, c - 5, z + 1), 0xFFC040, 'Neon', collide=False)
        particles(sp, 'sparks', 6)
        light(sp, 'PointLight', 0xFFB040, 0.6, 8)
    dust = s.blk('DustSource', (100, 1, 80), (-15, c - 2, 0), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
    particles(dust, 'dust', 6)
    # lights: mostly broken, two hanging lamps + red emergency
    for x, z in ((-60, -30), (-20, 20), (20, 40), (-50, 40)):
        P.ceiling_light(s, x, z, c, broken=True)
    hang = s.beam('HangingFixture', (-30, c, -20), (-28, c - 5, -18), 0.5, 3, 0xCFCFCF, 'Metal', collide=False)
    P.bulb(s, -28, c - 5.6, -18, color=0xFFF0D8, bright=1.2, rng=22, shadows=True)
    P.bulb(s, 30, c - 3, 30, color=0xFFF0D8, bright=0.8, rng=16)
    P.emergency_light(s, 55, 10, -24.7, '-z')
    P.emergency_light(s, -78.4, 10, 0, '+x')
    P.sign(s, '87F  오피스 (복구 불가)', 40, 8, 54.7, '-z', 10, 2, bg=0x2A2A2A, fg=0xC8C8C8, name='OldSign')


# ===================================================================== 80 1급 기밀 문서보관소
def f80(fb, F):
    c = F['h'] - 1
    s = fb.model('Archive')
    g = fb.model('Gameplay')
    # shelving maze
    rows = list(range(-48, 50, 7))
    for zi, z in enumerate(rows):
        x = -56
        while x < 38:
            if R.random() < 0.18 or (-12 < x < -2) or (zi % 3 == 1 and abs(x - (-40 + zi * 4)) < 6):
                x += 9
                continue
            P.shelf(P.at(s, x + 4, z, 0 if zi % 2 else 180), w=8.6, d=2.4, h=12, levels=5, kind='boxes',
                    color=0x5A5E62, mat='Metal')
            x += 9
    # reading desk and lamps
    P.table(P.at(s, -7, 0), 8, 4, 3, color=P.WOOD_D)
    P.chair(P.at(s, -7, -3, 180))
    lamp = s.blk('DeskLamp', (0.5, 1.4, 0.5), (-5, 3.7, 1), 0x2A4A2A, 'Metal')
    P.bulb(s, -5, 4.6, 1, color=0xFFD890, bright=1.0, rng=12, shadows=True)
    for i in range(5):
        s.blk('Folder', (1.2, 0.08, 1.6), (-9 + i * 0.4, 3.05 + i * 0.08, -0.4), 0xC8A86A, rot=Ry(R.uniform(-15, 15)), collide=False)
    stamp = P.sign(s, '1급 기밀\nTOP SECRET', -7, 3.1, 0.8, '-z', 2.5, 1.2, bg=0xF0E8D8, fg=0xB01818, name='Stamp')
    # vault room at west
    wall_z(s, -55, 55, -58, 0, c, 0x6A6E72, t=1.2, openings=[(0, 9, 10)])
    vault = s.model('Vault')
    vault.cyl('VaultDoor', 1.2, 9.6, (-57.6, 5, 0), 0x8A8E92, 'DiamondPlate', axis='x')
    vault.cyl('Wheel', 0.4, 3.5, (-56.8, 5, 0), 0xC0C4C8, 'Metal', axis='x')
    for a in range(0, 180, 45):
        vault.blk('Spoke', (0.3, 3.6, 0.3), (-56.6, 5, 0), 0xC0C4C8, 'Metal', rot=Rx(a))
    tag(vault, 'VaultDoor')
    for i in range(6):
        P.filing_cabinet(P.at(s, -76, -40 + i * 6, -90), h=5, color=0x4A4E52, open_=(i == 3))
    P.sign(s, '1급 기밀 문서보관소\n허가자 외 출입 금지', 45, 9, -22.6, '-z', 8, 2.6, bg=0x2A0808, fg=0xFF3030, name='ArchiveSign')
    # scattered papers
    for _ in range(60):
        s.blk('Paper', (0.85, 0.02, 1.1), (R.uniform(-55, 45), 0.02, R.uniform(-52, 52)), 0xF2F0EA,
              rot=Ry(R.uniform(0, 360)), collide=False, shadow=False)
    # parallel world: desk + chair glued upside down on the ceiling
    P.desk(s.at(T(20, c, 30) * Rz(180)), chair_=False)
    P.chair(s.at(T(20, c, 33) * Rz(180)))
    # red lights
    for x in range(-50, 41, 22):
        for z in (-30, 0, 30):
            p = P.ceiling_light(s, x, z, c, color=0xFF3A2A, neon=0xFF5A4A, bright=0.9, rng=20, size=(2, 2))
    P.ceiling_light(s, -68, 0, c, color=0xBFD8FF, bright=1.0, rng=22, shadows=True)


# ===================================================================== 70 CCTV 관제실
CAMS = ['CAM 88 공유하우스', 'CAM 87 폐허', 'CAM 80 기밀보관소', 'CAM 66 짜장지옥', 'CAM 60 사내식당',
        'CAM 50 조수민 하우스', 'CAM 44 피의 축제', 'CAM 40 미로', 'CAM 30 수영장', 'CAM 20 회장실',
        'CAM 10 어린이집', 'CAM 08 8팀', 'CAM 01 로비', 'CAM B1 파르티르레트', 'CAM B2 기니방',
        'CAM B3 ■■■■', 'CAM B6 병원', 'CAM B9 보호실', 'CAM B13 ???', 'CAM ?? 내핵', 'CAM 50 조수민 하우스',
        'NO SIGNAL', 'CAM 88 공유하우스', 'CAM 50 조수민 하우스']


def f70(fb, F):
    c = F['h'] - 1
    s = fb.model('ControlRoom')
    g = fb.model('Gameplay')
    s.blk('Carpet', (70, 0.05, 50), (10, 0.03, 17), 0x2A2E36, 'Fabric', collide=False)
    # control room walls
    wall_x(s, -25, 45, -8, 0, c, 0x3A3E46, openings=[(30, 6, 9)])
    wall_z(s, -8, 55, -25, 0, c, 0x3A3E46, openings=[(20, 5, 8)])
    s.box('GlassWall', 45, 0, -8, 45.4, c, 30, 0x3A4A5A, 'Glass', tr=0.5)
    # monitor wall
    mw = s.model('MonitorWall')
    mw.box('Backing', -22, 0, 53.8, 42, c, 54.6, 0x15171A, 'Metal')
    i = 0
    for row in range(4):
        for col in range(6):
            x = -17 + col * 10
            y = 2.6 + row * 3.0
            scr = mw.blk('Monitor', (9.4, 2.7, 0.3), (x, y, 53.6), P.BLACK, 'SmoothPlastic')
            t = CAMS[i % len(CAMS)]
            col_bg = 0x0B1A12 if 'NO' not in t else 0x202020
            if '조수민' in t:
                col_bg = 0x2A0606
            gui_text(scr, ('● REC  ' if '조수민' in t else '') + t, 'Front', bg=col_bg,
                     fg=0x9AF0B0 if '조수민' not in t else 0xFF5A5A, glow=True, font=10, ppu=24)
            light(scr, 'SurfaceLight', 0x6AC0FF if '조수민' not in t else 0xFF3030, 0.25, 10, False, 'Front', 90)
            i += 1
    # console desks (3 tiers)
    for tier, z in enumerate((44, 36, 28)):
        for x in range(-16, 40, 9):
            m = s.model('Console')
            m.blk('Desk', (8.6, 3, 3), (x, 1.5 + tier * 0.6, z), 0x24272C, 'Metal')
            m.blk('Top', (8.8, 0.15, 3.2), (x, 3.08 + tier * 0.6, z), 0x111111, 'SmoothPlastic')
            sc = m.blk('Screen', (3, 1.8, 0.15), (x - 2, 4.3 + tier * 0.6, z + 1.2), P.BLACK, rot=Rx(-10))
            gui_text(sc, '%s\n%s' % (CAMS[R.randrange(len(CAMS))], R.choice(['MOTION', 'IDLE', 'LOST', 'TRACKING'])),
                     'Front', bg=0x061018, fg=0x6ADFFF, glow=True, font=10, ppu=30)
            sc2 = m.blk('Screen', (3, 1.8, 0.15), (x + 2, 4.3 + tier * 0.6, z + 1.2), P.BLACK, rot=Rx(-10))
            gui_text(sc2, 'FLOOR MAP\n▣▣▣□▣\n▣□▣▣▣', 'Front', bg=0x061018, fg=0x6AFF9A, glow=True, font=10, ppu=30)
            m.blk('Joystick', (0.3, 0.8, 0.3), (x + 3.4, 3.5 + tier * 0.6, z - 0.8), P.BLACK)
            P.office_chair(P.at(s, x, z - 3, 180, y=tier * 0.6))
        if tier > 0:
            s.box('Riser', -22, 0, z - 4.5, 42, tier * 0.6, z + 4.5, 0x2A2E36, 'Fabric')
    P.sign(s, 'PSI 보안관제센터 · SECURITY', 10, 11.5, -7.6, '-z', 14, 2, bg=0x0A0F18, fg=0x6AC8FF, glow=True,
           name='RoomSign')
    # server room (west)
    srv = s.model('ServerRoom')
    for row in range(4):
        for i in range(7):
            x, z = -70 + row * 10, -45 + i * 7.5
            if -10 < z < 6:
                continue
            srv.blk('Rack', (2.8, 9, 6), (x, 4.5, z), 0x15161A, 'Metal')
            for j in range(4):
                srv.blk('LED', (0.1, 0.12, 0.12), (x - 1.42, 2 + j * 1.8, z - 2 + R.uniform(0, 4)),
                        R.choice([0x2AFF6A, 0x2AFF6A, 0xFFB02A, 0xFF2A2A]), 'Neon', collide=False, shadow=False)
    for x in (-70, -50):
        P.ceiling_light(srv, x, -20, c, color=0x8AB8FF, bright=0.8)
        P.ceiling_light(srv, x, 25, c, color=0x8AB8FF, bright=0.8)
    for _ in range(10):
        srv.beam('CableBundle', (R.uniform(-75, -35), c - 0.4, R.uniform(-45, 45)),
                 (R.uniform(-75, -35), c - 0.4, R.uniform(-45, 45)), 0.6, 0.3, 0x2A2A2A, collide=False, shadow=False)
    # guard office south
    wall_x(s, -25, 45, -30, 0, c, 0x6A6E72, openings=[(10, 5, 8)])
    P.locker_row(P.at(s, 0, -53.6, 180), n=10, color=0x4A5A6A)
    P.desk(P.at(s, 20, -42, 0), screen_text='출입 기록\n50F 조수민 — 23:58\n50F 조수민 — 00:03\n50F 조수민 — 00:07')
    s.blk('Cage', (12, 9, 0.2), (32, 4.5, -42), 0x3A3A3A, 'DiamondPlate', tr=0.4)
    P.sign(s, '무기고 · 관리자 승인 필요', 32, 9.5, -42.2, '-z', 6, 1, bg=0x8A1010, fg=0xFFFFFF, name='ArmorySign')
    # cameras in corridors
    for x, z, f in ((40, -10, '+z'), (-24, 50, '+x'), (55, -25, '-x'), (-78, -50, '+x')):
        P.camera(s, x, c - 1.2, z, f)
    for x, z in ((0, 20), (25, 20), (10, -42), (55, 35)):
        P.ceiling_light(s, x, z, c, color=0xBFD0FF, bright=0.6, rng=18)
    P.ceiling_light(s, 10, 40, c, color=0x9ABFFF, bright=0.5, rng=24, shadows=True)


# ===================================================================== 66 짜장 지옥
def f66(fb, F):
    c = F['h'] - 1
    s = fb.model('JjajangHell')
    g = fb.model('Gameplay')
    JJ = 0x2B1A0E
    # sauce pool (kill brick) everywhere except the start tray
    pool = g.model('Jjajang')
    tag(pool, 'KillBrick')
    from building import rect_minus
    for (x0, x1, z0, z1) in rect_minus((-79, 62, -55, 55), [(44, 62, -24, 0), (60, 62, 16, 55)]):
        pool.box('Jjajang', x0, 0, z0, x1, 1.2, z1, JJ, 'Plastic', refl=0.18, tags=['KillBrick'])
    pool.box('Jjajang', 62, 0, -55, 79, 1.2, -16, JJ, 'Plastic', refl=0.18, tags=['KillBrick'])
    pool.box('Jjajang', 62, 0, 34, 79, 1.2, 55, JJ, 'Plastic', refl=0.18, tags=['KillBrick'])
    for _ in range(40):
        s.ball('Bubble', R.uniform(1, 3), (R.uniform(-75, 40), 1.1, R.uniform(-50, 50)), 0x3A2414, 'Plastic',
               refl=0.2, collide=False)
    for _ in range(14):
        s.cyl('Onion', 0.6, R.uniform(1.5, 2.5), (R.uniform(-75, 40), 1.25, R.uniform(-50, 50)), 0xF0EEDC,
              'SmoothPlastic', tr=0.2, collide=False)
    steam = s.blk('SteamSource', (110, 0.5, 100), (-18, 1.6, 0), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
    particles(steam, 'steam', 18)
    # start tray
    s.box('StartTray', 44, 0, -24, 62, 1.6, 0, 0x8A5A2A, 'WoodPlanks')
    P.sign(s, '66F 짜장 지옥\n빠지면 처음부터!', 61.8, 12, 6, '-x', 10, 4, bg=0x2B1A0E, fg=0xFFD23A, name='Warning')
    g.blk('Checkpoint0', (6, 0.2, 6), (54, 1.7, -12), 0x00FF00, tr=1, collide=False, tags=['Checkpoint'])
    # jump route (loop: south band → west → north band → goal → chopstick bridge back)
    route = []
    wps = [(38, -29), (-64, -36), (-68, 36), (40, 40)]
    y = 2.6
    step = 0
    for (ax, az), (bx, bz) in zip(wps, wps[1:]):
        L = math.hypot(bx - ax, bz - az)
        n = max(1, round(L / 10.5))
        ux, uz = (bx - ax) / L, (bz - az) / L
        for k in range(n):
            t = k / n
            off = 2.6 if step % 2 else -2.6
            x, z = ax + (bx - ax) * t - uz * off, az + (bz - az) * t + ux * off
            if step:
                y = max(3.0, min(17.0, y + R.choice([1.5, 1.0, 0.5, 1.0, -1.0, -2.0] if y > 9 else [1.5, 1.0, 0.5, 1.5])))
            route.append((x, z, y))
            step += 1
    route.append((40, 40, y))
    kinds = ['danmuji', 'mandu', 'danmuji', 'onion', 'danmuji', 'mandu', 'egg']
    cps = {11: 'Checkpoint1', 22: 'Checkpoint2'}
    for i, (x, z, y) in enumerate(route):
        k = kinds[i % len(kinds)]
        if i in cps:
            s.cyl('BigDanmuji', 1.6, 10, (x, y - 0.8, z), 0xF2D23A, 'SmoothPlastic')
            g.blk(cps[i], (6, 0.2, 6), (x, y + 0.1, z), 0x00FF00, tr=1, collide=False, tags=['Checkpoint'])
        elif k == 'danmuji':
            s.cyl('Danmuji', 1.4, R.uniform(5.5, 7), (x, y - 0.7, z), 0xF2D23A, 'SmoothPlastic')
            s.cyl('DanmujiRing', 1.42, 1.2, (x, y - 0.7, z), 0xE8C020, 'SmoothPlastic')
        elif k == 'mandu':
            s.blk('Mandu', (6, 1.6, 4), (x, y - 0.8, z), 0xC8904A, 'Sand', rot=Ry(R.uniform(0, 180)))
            s.blk('ManduCrisp', (5.4, 0.3, 3.4), (x, y - 1.75, z), 0x8A5A22, 'Sand', rot=Ry(R.uniform(0, 180)))
        elif k == 'onion':
            s.blk('OnionCube', (5, 1.6, 5), (x, y - 0.8, z), 0xF0EEDC, 'Glass', tr=0.25, rot=Ry(R.uniform(0, 90)))
        else:
            s.ball('QuailEgg', 6, (x, y - 3, z), 0xF4EEE0, 'SmoothPlastic')
        # supports: chopsticks stuck in the sauce
        if y > 6:
            s.cyl('ChopstickPost', y - 1.6, 0.5, (x + 0.6, (y - 1.6) / 2 + 0.6, z + 0.3), 0xC8A050, 'Wood',
                  collide=False)
    # chopstick balance bridge from goal back to start
    gx, gz, gy = 52, 44, route[-1][2]
    s.cyl('GoalPlate', 1.6, 12, (gx, gy - 0.8, gz), 0xF6F2EA, 'SmoothPlastic')
    s.cyl('GoalPlateRim', 1.0, 13, (gx, gy - 1.4, gz), 0xD8D0C4, 'SmoothPlastic')
    btn = g.blk('ExitButton', (2, 1, 2), (gx, gy + 0.5, gz + 3), 0xE02020, 'Neon', tags=['ExitButton'])
    g.blk('ButtonBase', (3, 0.6, 3), (gx, gy + 0.1, gz + 3), 0x3A3A3A, 'Metal')
    P.sign(g, '이 버튼을 누르면 계단이 열린다', gx, gy + 4, gz + 6, '-z', 6, 1.2, bg=0x111111, fg=0xFFD23A,
           name='ButtonSign')
    s.beam('ReturnChopstickA', (gx - 0.7, gy - 0.3, gz - 6), (54 - 0.7, 1.4, 0), 1.0, 0.8, 0xC8A050, 'Wood')
    s.beam('ReturnChopstickB', (gx + 0.7, gy - 0.3, gz - 6), (54 + 0.7, 1.4, 0), 1.0, 0.8, 0xC8A050, 'Wood')
    # giant bowl island in the middle with noodles and a ladle
    bowl = s.model('GiantBowl')
    bowl.cyl('BowlBase', 3, 22, (-15, 1.5, 0), 0xEDE7DA, 'SmoothPlastic')
    for i in range(20):
        a = i / 20 * math.tau
        bowl.blk('BowlRim', (4, 6, 1.2), (-15 + math.cos(a) * 14, 3, math.sin(a) * 14), 0xEDE7DA, 'SmoothPlastic',
                 rot=Ry(-math.degrees(a) + 90) * Rx(-20))
    bowl.cyl('BowlSauce', 0.4, 26, (-15, 3.2, 0), JJ, 'Plastic', refl=0.2, tags=['KillBrick'])
    for i in range(16):
        a = R.uniform(0, math.tau)
        r = R.uniform(0, 10)
        bowl.beam('Noodle', (-15 + math.cos(a) * r, 3.5, math.sin(a) * r), (-15 + R.uniform(-12, 12), 3.4, R.uniform(-12, 12)),
                  0.4, 0.4, 0xF2DC8A, 'SmoothPlastic', collide=False)
    s.beam('LadleHandle', (-5, 4, 6), (12, c - 4, 20), 1.2, 1.2, 0xB0B4B8, 'Metal', collide=False)
    # noodles hanging from the ceiling (visual)
    for _ in range(26):
        x, z = R.uniform(-75, 45), R.uniform(-50, 50)
        L = R.uniform(6, 16)
        s.cyl('HangingNoodle', L, 0.35, (x, c - L / 2, z), 0xF2DC8A, 'SmoothPlastic', collide=False, shadow=False)
    # sauce stains on walls
    for _ in range(14):
        P.wall_splat(s, R.uniform(-78, 60), R.uniform(4, 25), 54.65, '-z', R.uniform(1, 3), color=JJ)
    P.sign(s, '춘장 100%', -78.4, 18, -20, '+x', 10, 3, bg=0x2B1A0E, fg=0xF2D23A, name='Brand')
    for x in range(-60, 50, 30):
        for z in (-30, 0, 30):
            P.ceiling_light(s, x, z, c, color=0xFFB060, neon=0xFFC880, bright=1.2, rng=30)
    P.ceiling_light(s, 52, -12, c, color=0xFFE0B0, bright=1.4, rng=34, shadows=True)


# ===================================================================== 60 사내식당
def f60(fb, F):
    c = F['h'] - 1
    s = fb.model('Cafeteria')
    g = fb.model('Gameplay')
    s.box('KitchenFloor', -79, 0, 30, 40, 0.05, 55, 0xBCC4C4, 'Slate', collide=False)
    wall_x(s, -79, 40, 30, 0, c, 0xDCE4E4, openings=[(-50, 5, 8), (0, 18, 4.6)])
    P.counter(P.at(s, 0, 28.6, 0), w=18, d=2.2, h=3.4, body=0xB8C0C0, top=0x9AA0A6, top_mat='Metal')
    s.blk('SneezeGuard', (18, 0.15, 1.6), (0, 6.3, 28.6), 0xD8E8EC, 'Glass', tr=0.5)
    for i in range(6):
        s.blk('FoodPan', (2.4, 0.4, 1.6), (-7.5 + i * 3, 3.3, 28.6), 0x9AA0A6, 'Metal')
        s.blk('Food', (2.2, 0.15, 1.4), (-7.5 + i * 3, 3.5, 28.6), R.choice([0xC83A1A, 0xE8D8A0, 0x5A8A3A, 0x2B1A0E]), collide=False)
    for i in range(4):
        s.cyl('Pot', 3, 3.4, (-60 + i * 7, 4.6, 52), 0xA8AEB4, 'Metal')
        s.blk('Burner', (4, 3, 4), (-60 + i * 7, 1.5, 52), 0x3A3A3A, 'Metal')
        st = s.blk('SteamP', (1, 0.2, 1), (-60 + i * 7, 6.2, 52), 0, tr=1, collide=False, shadow=False, touch=False, query=False)
        particles(st, 'steam', 4)
    P.counter(P.at(s, -20, 50, 180), w=24, body=0xB8C0C0, top=0x9AA0A6, top_mat='Metal')
    for i in range(3):
        P.fridge(P.at(s, 20 + i * 3.4, 53, 180), color=0xC8CCD0)
    P.sign(s, '진미국수 PSI점\n오늘의 메뉴: 잔치국수 · 비빔국수 · 짜장면(66층 직송)', 0, 11, 29.6, '-z', 18, 3.4,
           bg=0x1A1410, fg=0xF2E0B0, name='MenuBoard')
    P.sign(s, '8팀 회식 — 9시 (에스키모 씨 기물 파손 주의)', -40, 9, 29.6, '-z', 12, 1.4, bg=0xF6F0E0, fg=0x6A1010,
           name='Notice')
    # dining tables
    for ix in range(6):
        for iz in range(4):
            x, z = -66 + ix * 18, -42 + iz * 15
            if x > 40 and z < 0:
                continue
            P.table(P.at(s, x, z), 12, 3.6, 3.0, color=0xE8E2D6, mat='SmoothPlastic', leg=P.STEEL)
            for k in range(3):
                tipped = R.random() < 0.15
                P.stool(P.at(s, x - 4 + k * 4, z - 2.8), h=2.2) if not tipped else \
                    P.chair(P.at(s, x - 4 + k * 4, z - 3.4, R.uniform(0, 360)), color=0xC8C8C8, tipped=True)
                P.stool(P.at(s, x - 4 + k * 4, z + 2.8), h=2.2)
            if R.random() < 0.6:
                s.cyl('Bowl', 0.8, 1.6, (x + R.uniform(-4, 4), 3.4, z + R.uniform(-1, 1)), 0xF4F0E8, collide=False)
            if R.random() < 0.3:
                P.splat(s, x + R.uniform(-5, 5), z + R.uniform(-5, 5), R.uniform(0.8, 2), color=0xD8C890, name='Spill')
    s.blk('TrayReturn', (16, 4, 3), (-70, 2, 20), P.STEEL, 'Metal')
    for i in range(10):
        s.blk('Tray', (2.2, 0.1, 1.6), (-76 + i * 1.4, 4.1 + i * 0.08, 20), 0x7A8A9A, rot=Ry(R.uniform(-10, 10)), collide=False)
    for x in range(-60, 41, 20):
        for z in (-35, -10, 15):
            P.ceiling_light(s, x, z, c, color=0xE8F4FF, neon=0xF0F8FF, bright=1.0 if R.random() < 0.7 else 0.3, rng=20)
    P.ceiling_light(s, -30, 42, c, color=0xFFF4E0, bright=1.0, rng=20, shadows=True)


# ===================================================================== 50 조수민 하우스
def f50(fb, F):
    c = F['h'] - 1
    s = fb.model('JoSuminHouse')
    g = fb.model('Gameplay')
    # astroturf yard inside an office floor
    s.box('Lawn', -70, 0, -45, 40, 0.15, 48, 0x4E7A3A, 'Grass')
    s.box('Path', -14, 0.15, -45, -8, 0.2, -6, 0xB8B0A0, 'Pavement')
    # picket fence
    fence = s.model('Fence')
    for x in range(-70, 41, 2):
        if -15 < x < -7:
            continue
        fence.blk('Picket', (0.4, 3.4, 0.25), (x, 1.7, -45), 0xF4F0E8, 'Wood')
    fence.box('Rail', -70, 2.4, -45.2, -15, 2.7, -44.9, 0xF4F0E8, 'Wood')
    fence.box('Rail', -7, 2.4, -45.2, 40, 2.7, -44.9, 0xF4F0E8, 'Wood')
    for z in range(-45, 49, 2):
        fence.blk('Picket', (0.25, 3.4, 0.4), (-70, 1.7, z), 0xF4F0E8, 'Wood')
        fence.blk('Picket', (0.25, 3.4, 0.4), (40, 1.7, z), 0xF4F0E8, 'Wood')
    mb = s.model('Mailbox')
    mb.blk('Post', (0.4, 3.4, 0.4), (-18, 1.7, -46.5), P.WOOD, 'Wood')
    mb.blk('Box', (1.4, 1.2, 2.2), (-18, 3.9, -46.5), 0xD04A6A, 'Metal')
    P.sign(mb, '조수민', -18, 3.9, -47.65, '-z', 1.3, 0.6, bg=0xFFFFFF, fg=0x222222, name='MailName')
    # the house (gable roof under the office ceiling)
    hx0, hx1, hz0, hz1 = -40, 20, -6, 38
    hc = 0xE8C8D0
    hw = s.model('House')
    wall_x(hw, hx0, hx1, hz0, 0, 10, hc, mat='Brick', t=0.8, openings=[(-11, 5, 8), (-28, 6, 6.5), (6, 6, 6.5)])
    wall_x(hw, hx0, hx1, hz1, 0, 10, hc, mat='Brick', t=0.8)
    wall_z(hw, hz0, hz1, hx0, 0, 10, hc, mat='Brick', t=0.8, openings=[(16, 6, 6.5)])
    wall_z(hw, hz0, hz1, hx1, 0, 10, hc, mat='Brick', t=0.8)
    hw.box('UnderWinW', hx0 - 0.4, 0, 13, hx0 + 0.4, 2.5, 19, hc, 'Brick')
    hw.box('WinGlassW', hx0 - 0.1, 2.5, 13, hx0 + 0.1, 6.5, 19, 0x8AA8B8, 'Glass', tr=0.5)
    for x in (-28, 6):
        hw.box('UnderWin', x - 3, 0, hz0 - 0.4, x + 3, 2.5, hz0 + 0.4, hc, 'Brick')
        hw.box('Sill', x - 3, 2.4, hz0 - 0.6, x + 3, 2.6, hz0 + 0.6, 0xFFFFFF, 'Wood')
        hw.box('WinGlass', x - 3, 2.5, hz0 - 0.1, x + 3, 6.5, hz0 + 0.1, 0x8AA8B8, 'Glass', tr=0.5)
        hw.box('WinBarV', x - 0.15, 2.5, hz0 - 0.2, x + 0.15, 6.5, hz0 + 0.2, 0xFFFFFF, 'Wood')
    # roof: two slopes meeting at the ridge, clipped by the office ceiling
    ridge = c - 0.5
    span = (hz1 - hz0) / 2 + 1.5
    rise = ridge - 10
    ang = math.degrees(math.atan2(rise, span))
    L = math.hypot(span, rise)
    zc = (hz0 + hz1) / 2
    for sgn in (-1, 1):
        hw.blk('Roof', (hx1 - hx0 + 3, 0.6, L), ((hx0 + hx1) / 2, 10 + rise / 2, zc + sgn * span / 2), 0x7A2A3A, 'Slate',
               rot=Rx(sgn * ang))
    for xg in (hx0, hx1):
        for i in range(6):
            hgt = rise * (1 - i / 6)
            hw.box('Gable', xg - 0.4, 10, zc - span * (1 - i / 6) + 1.5, xg + 0.4, 10 + hgt, zc + span * (1 - i / 6) - 1.5, hc, 'Brick')
    hw.box('HouseFloor', hx0, 0.15, hz0, hx1, 0.3, hz1, 0xC8A882, 'WoodPlanks')
    hw.box('HouseCeiling', hx0, 9.8, hz0, hx1, 10, hz1, 0xF4EEF0, 'SmoothPlastic')
    door_in_wall_x(hw, -11, hz0, 4.4, 7.6, open_deg=-35, color=0xC04A6A, frame=0xFFFFFF, name='FrontDoor')
    P.sign(hw, '수민이네 ♥', -11, 8.6, hz0 - 0.5, '-z', 3.2, 0.8, bg=0xFFF0F4, fg=0xC03050, name='Nameplate',
           font=9)
    # interior walls: living | kid room | kitchen
    wall_x(hw, hx0, hx1, 18, 0.3, 9.8, 0xF2DDE2, t=0.4, openings=[(-26, 4, 7.5), (8, 4, 7.5)])
    wall_z(hw, 18, hz1, -10, 0.3, 9.8, 0xF2DDE2, t=0.4)
    # living room
    P.sofa(P.at(hw, -25, 12, 0), w=8, color=0xE8A0B0)
    P.tv(P.at(hw, -25, 1, 180), text='뽀삐뽀삐 ♪')
    P.table(P.at(hw, -25, 7, 0), 5, 2.5, 1.6, color=0xFFFFFF, mat='SmoothPlastic')
    P.teddy(P.at(hw, 10, 8, 200), s=2.4, color=0x9A7A5A, torn=True)
    P.wall_text(hw, '나가면 혼나', 0, 6, 17.75, '-z', 8, 1.8, fg=0x8A1010, font=9)
    P.handprint(hw, -36, 4.5, 17.75, '-z')
    P.handprint(hw, -34.5, 5.2, 17.75, '-z')
    # kid room (north-west)
    kr = hw.model('KidRoom')
    P.bed(P.at(kr, -35, 31, 0), w=4, l=7, blanket=0xF4A0C0, frame=0xFFFFFF)
    for i in range(12):
        kr.blk('ToyBlock', (1, 1, 1), (-22 + R.uniform(-6, 6), 0.8, 26 + R.uniform(-5, 5)),
               R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30A040]), rot=Ry(R.uniform(0, 90)))
    P.teddy(P.at(kr, -14, 35, 160), s=0.8, color=0xF0D0E0)
    P.teddy(kr.at(T(-18, 0.6, 24) * Rz(90)), s=0.8, color=0xC0E0F0, torn=True)
    P.scribbles(kr, -25, 6, 37.55, '-z', n=40, w=24, h=5)
    P.wall_text(kr, '내가 제일 쎄', -25, 7.5, 37.5, '-z', 10, 2, fg=0x2A2A2A, font=9)
    P.scribbles(kr, -39.55, 5, 28, '+x', n=20, w=14, h=4)
    P.sign(kr, '조수민 방\n노크 안 하면 죽음', -10.25, 7.5, 26, '-x', 3, 1.4, bg=0xFFE0EA, fg=0xC01030, name='DoorSign',
           font=9)
    g.blk('ChaserSpawn', (4, 6, 4), (-25, 3, 28), 0xFF0000, tr=1, collide=False, tags=['ChaserSpawn'])
    # kitchen (north-east)
    kt = hw.model('Kitchen')
    P.counter(P.at(kt, 5, 36.4, 180), w=24, body=0xFFFFFF, top=0xF0D8E0, top_mat='Marble')
    for i in range(5):
        kt.blk('Knife', (0.15, 1.4, 0.05), (0 + i * 0.6, 6.5, 37.5), P.STEEL, 'Metal', collide=False)
    kt.blk('KnifeStrip', (4, 0.3, 0.2), (1.2, 7.3, 37.5), P.BLACK, 'Metal')
    P.table(P.at(kt, 5, 26), 6, 4, 2.6, color=0xFFFFFF, mat='SmoothPlastic')
    for x in (3, 7):
        P.chair(P.at(kt, x, 23.6, 180), color=0xF0A0B0, seat_h=1.6, w=1.4)
    kt.blk('Cake', (2, 1, 2), (5, 3.1, 26), 0xFFF0F4, collide=False)
    P.splat(kt, 5, 26, 0.7, y=3.62, color=P.BLOOD)
    P.wall_text(kt, '오늘도 다 먹어', 5, 8, 37.5, '-z', 6, 1.2, fg=0x6A1010, font=9)
    for x, z in ((-25, 8), (-25, 28), (5, 28), (5, 8)):
        P.bulb(hw, x, 9.2, z, color=0xFFD0E0, bright=0.9, rng=16)
    # yard: swing set, sandbox, dog house with chain
    sw = s.model('Swing')
    sw.beam('A1', (-60, 0, -30), (-60, 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
    sw.beam('A2', (-60, 0, -24), (-60, 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
    sw.beam('B1', (-48, 0, -30), (-48, 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
    sw.beam('B2', (-48, 0, -24), (-48, 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
    sw.box('Top', -60, 8.8, -27.2, -48, 9.2, -26.8, 0xD04040, 'Metal')
    for x in (-56, -52):
        sw.blk('Rope', (0.1, 6, 0.1), (x - 0.8, 5.8, -27), 0x3A3A3A, collide=False)
        sw.blk('Rope', (0.1, 6, 0.1), (x + 0.8, 5.8, -27), 0x3A3A3A, collide=False)
        sw.blk('Seat', (2, 0.2, 0.9), (x, 2.8, -27), 0x2A2A2A)
    sb = s.model('Sandbox')
    sb.box('Sand', -62, 0.15, -15, -48, 0.6, -5, 0xE0C890, 'Sand')
    for x0, z0, x1, z1 in ((-62.4, -15.4, -47.6, -15), (-62.4, -5, -47.6, -4.6), (-62.4, -15, -62, -5), (-48, -15, -47.6, -5)):
        sb.box('Edge', x0, 0.15, z0, x1, 1.0, z1, 0xC0402A, 'Wood')
    sb.blk('Shovel', (0.3, 0.1, 2), (-55, 0.7, -10), 0xE0D020, rot=Ry(30), collide=False)
    dh = s.model('DogHouse')
    dh.box('Body', 25, 0.15, -30, 31, 4.5, -24, 0xA06A3A, 'WoodPlanks')
    dh.blk('RoofL', (6.6, 0.4, 4.4), (28, 5.6, -28.4), 0x5A3A2A, 'WoodPlanks', rot=Rx(40))
    dh.blk('RoofR', (6.6, 0.4, 4.4), (28, 5.6, -25.6), 0x5A3A2A, 'WoodPlanks', rot=Rx(-40))
    dh.box('Opening', 26.6, 0.2, -30.05, 29.4, 3.2, -29.9, 0x111111)
    P.sign(dh, '물어요', 28, 4.0, -30.1, '-z', 2, 0.6, bg=0xFFFFFF, fg=0xB01010, name='Bites', font=9)
    for i in range(8):
        dh.blk('ChainLink', (0.5, 0.2, 0.25), (28 - i * 0.55, 0.3, -31 - i * 0.6), 0x6A6A6A, 'Metal', rot=Ry(35 + (i % 2) * 90),
               collide=False)
    dh.cyl('DogBowl', 0.4, 1.4, (23, 0.4, -32), 0xC03030, collide=False)
    # office remnants outside the fence (it IS still a PSI floor)
    for i in range(4):
        P.desk(P.at(s, 50, -50 + i * 8, -90), chair_=True, screen_text='수민이 보고 있어' if i == 2 else None)
    P.wall_text(s, '수민이 집에 들어가지 마', -78.5, 8, 0, '+x', 16, 2.4, fg=0x8A1010)
    # lighting: warm "sunlight" spots over the yard + cold office lights outside
    for x in (-50, -20, 10):
        for z in (-30, 0, 30):
            if hx0 < x < hx1 and hz0 < z < hz1:
                continue
            P.ceiling_light(s, x, z, c, color=0xFFE8C0, neon=0xFFF0D0, bright=1.1, rng=24)
    P.ceiling_light(s, -10, -25, c, color=0xFFE0B0, bright=1.3, rng=30, shadows=True)
    P.ceiling_light(s, 52, -30, c, color=0xD8E8FF, bright=0.7, rng=18)
    P.ceiling_light(s, 52, 10, c, color=0xD8E8FF, bright=0.7, rng=18)
