"""Floors 44 → 1."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles
import props as P
from props import R
from building import wall_x, wall_z, door_in_wall_x, door_in_wall_z, tag, rect_minus


# ===================================================================== 44 피의 축제방
def f44(fb, F):
    c = F['h'] - 1
    s = fb.model('BloodFestival')
    g = fb.model('Gameplay')
    s.box('Carpet', -79, 0, -55, 46, 0.06, 55, 0x4A0E14, 'Fabric', collide=False)
    # stage (west)
    st = s.model('Stage')
    st.box('StageDeck', -79, 0, -26, -58, 2.6, 26, 0x1E1414, 'WoodPlanks')
    st.box('StageEdge', -58.2, 2.4, -26, -57.8, 2.7, 26, P.GOLD, 'Metal')
    for i, y in enumerate((0.65, 1.3, 1.95)):
        st.box('StageStep', -58 + (2 - i) * 0, 0, -6, -54 + i * -1.3, y + 0.65, 6, 0x2A1A1A, 'WoodPlanks')
    for i in range(18):
        z = -25 + i * 2.9
        st.box('Curtain', -78.6 + (i % 2) * 0.5, 2.6, z, -77.8 + (i % 2) * 0.5, c, z + 3.1, 0x8A0A14, 'Fabric')
    for z0 in (-26, 22):
        st.box('SideDrape', -60, 2.6, z0, -57, c, z0 + 4, 0x7A0810, 'Fabric')
    st.cyl('MicStand', 4.2, 0.15, (-62, 4.7, 0), P.BLACK, 'Metal')
    st.cyl('MicBase', 0.15, 1.2, (-62, 2.7, 0), P.BLACK, 'Metal')
    st.ball('Mic', 0.5, (-62, 6.9, 0), 0x3A3A3A, 'Metal')
    banner = P.sign(st, '피의 축제!!', -77.3, 11, 0, '+x', 30, 4.5, bg=0x120406, fg=0xFF2A3A, glow=True,
                    name='FestivalBanner', font=20)
    light(banner, 'SurfaceLight', 0xFF2030, 1.2, 18, False, 'Front', 120)
    P.sign(st, 'MC 백윤례', -57.7, 1.4, -14, '+x', 6, 1.2, bg=0x111111, fg=0xF2C84A, name='MCPlate')
    P.sign(st, '"피의 축제다~!!"', -57.7, 1.4, 14, '+x', 7, 1.2, bg=0x111111, fg=0xFF4A4A, name='Catchphrase')
    for z in (-15, 0, 15):
        sp = st.blk('StageSpot', (1.2, 1.2, 1.2), (-50, c - 0.8, z), P.BLACK, 'Metal')
        light(sp, 'SpotLight', R.choice([0xFF2040, 0xFF60A0, 0xA040FF]), 3, 40, z == 0, 'Left', 45)
    # banquet table
    bq = s.model('Banquet')
    bq.box('TableTop', -46, 2.8, -3, 16, 3.05, 3, 0x5A3A2A, 'Wood')
    for x in range(-44, 17, 6):
        bq.box('TableLeg', x - 0.2, 0, -2.6, x + 0.2, 2.8, -2.2, P.DGREY, 'Metal')
        bq.box('TableLeg', x - 0.2, 0, 2.2, x + 0.2, 2.8, 2.6, P.DGREY, 'Metal')
    bq.box('Cloth', -46.3, 3.05, -3.3, 16.3, 3.1, 3.3, 0xF2EEE6, 'Fabric', collide=False)
    bq.box('ClothDrapeS', -46.3, 1.8, -3.35, 16.3, 3.1, -3.3, 0xF2EEE6, 'Fabric', collide=False)
    bq.box('ClothDrapeN', -46.3, 1.8, 3.3, 16.3, 3.1, 3.35, 0xF2EEE6, 'Fabric', collide=False)
    for x in range(-43, 15, 4):
        P.chair(P.at(bq, x, -5, 180), color=0x2A1A1A)
        if R.random() < 0.85:
            P.chair(P.at(bq, x, 5, 0), color=0x2A1A1A)
        else:
            P.chair(P.at(bq, x, 6.5, R.uniform(0, 360)), color=0x2A1A1A, tipped=True)
        bq.cyl('Plate', 0.08, 1.6, (x, 3.14, -1.6), 0xFFFFFF, collide=False)
        bq.cyl('Plate', 0.08, 1.6, (x, 3.14, 1.6), 0xFFFFFF, collide=False)
        bq.cyl('Glass', 0.9, 0.4, (x + 1, 3.55, -1.2), 0xF0E8E8, 'Glass', tr=0.4, collide=False)
        bq.cyl('Wine', 0.5, 0.36, (x + 1, 3.4, -1.2), 0x6A0810, 'Glass', tr=0.1, collide=False)
        if R.random() < 0.5:
            hat = bq.wedge('PartyHat', (0.8, 1.1, 0.8), T(x - 1, 3.7, 1.8), R.choice([0xFF3A6A, 0xFFD03A, 0x3AC0FF]))
    for x in (-38, -14, 8):
        ck = bq.model('Cake')
        ck.cyl('Tier1', 1.2, 3.2, (x, 3.7, 0), 0xFFF4F0, collide=False)
        ck.cyl('Tier2', 1.0, 2.2, (x, 4.8, 0), 0xFFF4F0, collide=False)
        ck.cyl('Topping', 0.25, 2.3, (x, 5.4, 0), P.BLOOD, refl=0.1, collide=False)
        for i in range(6):
            a = i / 6 * math.tau
            ck.blk('Drip', (0.25, R.uniform(0.4, 1.0), 0.15), (x + math.cos(a) * 1.15, 5.0, math.sin(a) * 1.15), P.BLOOD,
                   collide=False, rot=Ry(-math.degrees(a)))
        for i in range(3):
            P.bulb(ck, x - 0.6 + i * 0.6, 5.9, 0, color=0xFFB060, bright=0.5, rng=8, d=0.2)
    for _ in range(9):
        P.splat(bq, R.uniform(-45, 15), R.uniform(-2.5, 2.5), R.uniform(0.4, 1.2), y=3.12)
    # disco ball
    s.blk('DiscoCord', (0.1, 3, 0.1), (-15, c - 1.5, 18), P.BLACK, collide=False)
    db = s.ball('DiscoBall', 3, (-15, c - 4.5, 18), 0xD8D8D8, 'Foil', refl=0.8, collide=False)
    light(db, 'PointLight', 0xFF80C0, 0.8, 20)
    # string lights
    for row in range(6):
        z = -45 + row * 18
        for i in range(14):
            x = -55 + i * 7.5
            sag = math.sin(i / 13 * math.pi) * 2
            s.ball('StringBulb', 0.45, (x, c - 1 - sag, z), R.choice([0xFF3A4A, 0xFFD06A, 0xFF7AC0, 0x7AFFB0]), 'Neon',
                   collide=False, shadow=False)
        s.beam('Wire', (-55, c - 1, z), (42.5, c - 1, z), 0.06, 0.06, P.BLACK, collide=False, shadow=False)
    # balloons, confetti, streamers, gifts
    for _ in range(26):
        P.balloon(s, R.uniform(-70, 40), R.uniform(-50, 50), R.uniform(c - 4, c - 1.2),
                  R.choice([0xC01020, 0xE02040, 0xF0F0F0, 0x8A0A14, 0x2A2A2A]))
    for _ in range(140):
        s.blk('Confetti', (0.35, 0.03, 0.35), (R.uniform(-56, 44), 0.08, R.uniform(-52, 52)),
              R.choice([0xFF3A4A, 0xFFD03A, 0x3AC0FF, 0xFFFFFF, 0x7AFF7A]), rot=Ry(R.uniform(0, 90)),
              collide=False, shadow=False, touch=False, query=False)
    for i in range(10):
        a = (R.uniform(-70, 40), c - 0.3, R.uniform(-50, 50))
        b2 = (a[0] + R.uniform(-12, 12), c - R.uniform(3, 6), a[2] + R.uniform(-12, 12))
        s.beam('Streamer', a, b2, 0.5, 0.04, R.choice([0xFF3A4A, 0xFFD03A, 0xFF7AC0]), collide=False, shadow=False)
    P.boxes_pile(P.at(s, 30, 40), n=8, r=4, colors=(0xC01020, 0xF2EEE6, 0xF2C84A))
    # mild horror: stains & handprints
    for _ in range(10):
        P.splat(s, R.uniform(-55, 40), R.uniform(-50, 50), R.uniform(0.8, 2.6), y=0.08)
    P.drips(s, -57.7, 2.5, -8, '+x', n=5)
    for i in range(4):
        P.handprint(s, 45.65, 3.5 + i * 0.6, -40 + i * 2.2, '+x')
    wall_x(s, 30, 46, -30, 0, c, 0x3A1A1E, openings=[(38, 5, 8)])
    wall_z(s, -55, -30, 30, 0, c, 0x3A1A1E)
    P.sign(s, '참가자 명단\n공유 · 에스키모 · 엘리자베스 · ???', 38, 9, -29.6, '-z', 10, 3, bg=0xF2EEE6, fg=0x5A0A0A,
           name='GuestList')
    for x in (-40, -10, 20):
        for z in (-30, 30):
            P.ceiling_light(s, x, z, c, color=0xFF5A5A, neon=0xFF8080, bright=0.7, rng=24, size=(2, 2))
    P.ceiling_light(s, 38, -42, c, color=0xFFE0D0, bright=0.6, rng=16)


# ===================================================================== 40 정전된 칸막이 미로
def f40(fb, F):
    c = F['h'] - 1
    s = fb.model('CubicleMaze')
    g = fb.model('Gameplay')
    cell = 8
    nx, nz = 15, 13
    x0, z0 = -78, -52
    walls_v = [[True] * nz for _ in range(nx + 1)]   # wall at x index i (between cell i-1 and i), row j
    walls_h = [[True] * (nz + 1) for _ in range(nx)]  # wall at z index j, column i
    seen = [[False] * nz for _ in range(nx)]
    stack = [(nx - 1, 5)]
    seen[nx - 1][5] = True
    while stack:
        i, j = stack[-1]
        nb = [(i + di, j + dj, di, dj) for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1))
              if 0 <= i + di < nx and 0 <= j + dj < nz and not seen[i + di][j + dj]]
        if not nb:
            stack.pop()
            continue
        ni, nj, di, dj = R.choice(nb)
        if di:
            walls_v[max(i, ni)][j] = False
        else:
            walls_h[i][max(j, nj)] = False
        seen[ni][nj] = True
        stack.append((ni, nj))
    for _ in range(28):  # loops
        i, j = R.randrange(1, nx), R.randrange(nz)
        walls_v[i][j] = False
    walls_v[nx][5] = False  # entrance (east, near stair lobby)
    walls_v[nx][4] = False
    H = 8.5
    col = 0x5E636B
    # merge runs to save parts
    for i in range(nx + 1):
        j = 0
        while j < nz:
            if walls_v[i][j]:
                k = j
                while k < nz and walls_v[i][k]:
                    k += 1
                x = x0 + i * cell
                s.box('Partition', x - 0.2, 0, z0 + j * cell, x + 0.2, H, z0 + k * cell, col, 'Fabric')
                j = k
            else:
                j += 1
    for j in range(nz + 1):
        i = 0
        while i < nx:
            if walls_h[i][j]:
                k = i
                while k < nx and walls_h[k][j]:
                    k += 1
                z = z0 + j * cell
                s.box('Partition', x0 + i * cell, 0, z - 0.2, x0 + k * cell, H, z + 0.2, col, 'Fabric')
                i = k
            else:
                i += 1
    # desks, dead monitors, papers in random cells
    for _ in range(38):
        i, j = R.randrange(nx), R.randrange(nz)
        cx, cz = x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell
        rot = R.choice([0, 90, 180, 270])
        on = R.random() < 0.25
        P.desk(P.at(s, cx + R.uniform(-0.5, 0.5), cz + R.uniform(-0.5, 0.5), rot), w=5, d=2.6,
               screen_text=('…' if on else None), chair_=R.random() < 0.6)
        if on:
            glow = s.blk('MonitorGlow', (0.3, 0.3, 0.3), (cx, 4.5, cz), 0x6AC0FF, 'Neon', tr=0.6, collide=False, shadow=False)
            light(glow, 'PointLight', 0x6AA8FF, 0.5, 10)
    for _ in range(90):
        s.blk('Paper', (0.85, 0.02, 1.1), (R.uniform(-77, 42), 0.02, R.uniform(-51, 51)), 0xF2F0EA,
              rot=Ry(R.uniform(0, 360)), collide=False, shadow=False, touch=False, query=False)
    # emergency lighting only (power is out)
    for i in range(0, nx, 4):
        for j in range(1, nz, 4):
            x, z = x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell
            p = s.blk('EmergencyLamp', (1, 0.4, 0.6), (x, c - 0.4, z), 0xFF2A1A, 'Neon', collide=False, shadow=False)
            light(p, 'PointLight', 0xFF2A1A, 0.9, 16)
    P.exit_sign(s, 45, 10, -14.6, '-z', '출구 → 계단')
    # goal: the breaker panel on the far west wall
    bp = g.model('BreakerPanel')
    bp.box('Panel', -78.9, 3, -2, -78.3, 9, 2, 0x8A8E92, 'Metal')
    for k in range(6):
        bp.blk('Switch', (0.3, 0.5, 0.3), (-78.15, 7.5 - k * 0.8, -1 + (k % 2) * 2), 0x2A2A2A, 'Metal')
    btn = bp.blk('ExitButton', (0.4, 1.2, 1.2), (-78.1, 5, 0), 0xE02020, 'Neon', tags=['ExitButton'])
    light(btn, 'PointLight', 0xFF3030, 0.8, 12)
    P.sign(bp, '분전반 — 전원 복구', -78.2, 10, 0, '+x', 5, 1.1, bg=0xF2D23A, fg=0x111111, name='PanelSign')
    P.sign(s, '40F 정전 중 · 손전등을 켜세요', 61.8, 10, 4, '-x', 7, 1.4, bg=0x111111, fg=0xC8C8C8, name='Notice')


# ===================================================================== 30 피트니스 + 물 빠진 수영장
def f30(fb, F):
    c = F['h'] - 1
    s = fb.model('FitnessPool')
    g = fb.model('Gameplay')
    tile, basin_c = 0xD6E8EA, 0x7FB4C2
    deck = (-79, 6, -55, 34)
    basin = (-66, -10, -42, 22)
    dk = s.model('PoolDeck')
    for (a, b2, c0, c1) in rect_minus(deck, [basin]):
        dk.box('Deck', a, 0, c0, b2, 4, c1, tile, 'Marble')
    dk.box('BasinFloor', basin[0], 0, basin[2], basin[1], 0.1, basin[3], basin_c, 'Marble')
    for i in range(1, 7):
        z = basin[2] + i * (basin[3] - basin[2]) / 7
        dk.box('LaneLine', basin[0] + 3, 0.1, z - 0.3, basin[1] - 3, 0.13, z + 0.3, 0x1A3A5A, collide=False)
    dk.box('MurkyWater', basin[0], 0.1, basin[2], basin[0] + 18, 0.8, basin[3], 0x2E4A30, 'Glass', tr=0.35, refl=0.2,
           collide=False)
    for x0b, z0b in ((basin[1] - 1, basin[2] + 6), (basin[1] - 1, basin[3] - 6)):
        dk.blk('LadderRailA', (0.25, 5.5, 0.25), (x0b + 0.6, 2.75, z0b - 1), P.STEEL, 'Metal')
        dk.blk('LadderRailB', (0.25, 5.5, 0.25), (x0b + 0.6, 2.75, z0b + 1), P.STEEL, 'Metal')
        for k in range(4):
            dk.blk('Rung', (0.4, 0.15, 2), (x0b + 0.3, 0.8 + k * 0.95, z0b), P.STEEL, 'Metal')
    # stairs from gym floor up to deck
    for k in range(5):
        dk.box('DeckStep', 6 + k * 1.4, 0, -14, 6 + (k + 1) * 1.4, 4 - k * 0.8, 2, tile, 'Marble')
    # diving board, lifeguard chair, signs
    dk.box('BoardBase', -75, 4, -12, -71, 6, -8, 0x3A6A9A, 'Metal')
    dk.box('DivingBoard', -71, 5.6, -11.2, -60, 6, -8.8, 0xF2F2F2, 'SmoothPlastic')
    lc = dk.model('LifeguardChair')
    for dx in (-1, 1):
        for dz in (-1, 1):
            lc.blk('Leg', (0.3, 8, 0.3), (0 + dx * 1.2, 8, 26 + dz * 1.2), 0xF2F2F2, 'Metal')
    lc.blk('Seat', (3, 0.3, 3), (0, 12, 26), 0xD02020)
    lc.blk('Back', (3, 2.4, 0.3), (0, 13.3, 27.4), 0xD02020)
    P.wall_text(dk, '수심 1.2m', -38, 2.4, -41.98, '+z', 8, 1.6, fg=0x1A3A5A, font=19)
    P.wall_text(dk, '수심 2.5m', -63, 2.4, 21.98, '-z', 8, 1.6, fg=0x1A3A5A, font=19)
    P.sign(dk, '수영 금지 — 물이 빠졌습니다', -38, 9, 33.6, '-z', 12, 1.6, bg=0xF2F2F2, fg=0xB01818, name='NoSwim')
    for i in range(14):
        dk.cyl('LaneFloat', 0.8, 0.8, (-60 + i * 3.4, 0.5, -5 + math.sin(i) * 2), R.choice([0xD02020, 0xF2F2F2, 0x2050D0]),
               axis='x', rot=Ry(R.uniform(-30, 30)), collide=False)
    wall_x(s, -79, 6, 34, 4, c, 0xDDE4E6)
    # gym
    gy = s.model('Gym')
    gy.box('RubberFloor', 8, 0, -55, 46, 0.08, 34, 0x2A2C30, 'Fabric', collide=False)
    for i in range(6):
        tm = gy.model('Treadmill')
        x = 14 + i * 5
        tm.blk('Belt', (2.6, 0.6, 6), (x, 0.4, 28), 0x1A1A1A, 'Fabric')
        tm.blk('PostL', (0.3, 4, 0.3), (x - 1.2, 2.5, 30.6), P.DGREY, 'Metal')
        tm.blk('PostR', (0.3, 4, 0.3), (x + 1.2, 2.5, 30.6), P.DGREY, 'Metal')
        con = tm.blk('Console', (2.6, 1, 0.6), (x, 4.6, 30.6), 0x2A2A2A, rot=Rx(-25))
        gui_text(con, '00:00', 'Front', bg=0x061018, fg=0xFF5A2A, glow=True, font=10, ppu=30)
    wr = gy.model('WeightRack')
    wr.box('Rack', 40, 0, -40, 44, 3.5, -10, P.DGREY, 'Metal')
    for k in range(10):
        z = -38 + k * 3
        wr.cyl('Dumbbell', 2, 0.4, (42, 3.9, z), P.STEEL, 'Metal', axis='x')
        wr.cyl('Weight', 0.5, 1.2 + k * 0.05, (41.2, 3.9, z), 0x1A1A1A, 'Metal', axis='x')
        wr.cyl('Weight', 0.5, 1.2 + k * 0.05, (42.8, 3.9, z), 0x1A1A1A, 'Metal', axis='x')
    for i, z in enumerate((-45, -30, -15)):
        bp = gy.model('BenchPress')
        bp.blk('Bench', (1.6, 1.8, 6), (22, 0.9, z), 0x1A1A1A, 'Fabric')
        bp.blk('UprightL', (0.3, 5, 0.3), (19.5, 2.5, z + 2.6), P.DGREY, 'Metal')
        bp.blk('UprightR', (0.3, 5, 0.3), (24.5, 2.5, z + 2.6), P.DGREY, 'Metal')
        bent = (i == 1)
        if bent:
            bp.beam('BarbellL', (16, 4.8, z + 2.6), (22, 3.6, z + 2.6), 0.3, 0.3, P.STEEL, 'Metal')
            bp.beam('BarbellR', (22, 3.6, z + 2.6), (28, 4.8, z + 2.6), 0.3, 0.3, P.STEEL, 'Metal')
            P.sign(bp, '에스키모 전용 (또 휘었음)', 22, 2.2, z - 3.1, '-z', 5, 0.9, bg=0xF2F2F2, fg=0x2A4A9A, name='EskimoSign')
        else:
            bp.cyl('Barbell', 12, 0.3, (22, 4.8, z + 2.6), P.STEEL, 'Metal', axis='x')
        for sx in (-1, 1):
            bp.cyl('Plate', 0.5, 3.2, (22 + sx * 5, 4.8 if not bent else 4.6, z + 2.6), 0x1A1A1A, 'Metal', axis='x')
    gy.box('Mirror', 8, 1, 33.4, 46, 10, 33.6, 0xC8D4D8, 'Glass', refl=0.55)
    for i in range(4):
        gy.blk('YogaMat', (2.4, 0.1, 6), (32 + i * 3, 0.1, 10), R.choice([0x7A3A8A, 0x3A7A8A, 0x8A7A3A]), collide=False)
    # locker room (north)
    lr = s.model('LockerRoom')
    wall_x(lr, 8, 46, 36, 0, c, 0xDDE4E6, openings=[(20, 5, 8)])
    wall_z(lr, 34, 55, 8, 0, c, 0xDDE4E6)
    P.locker_row(P.at(lr, 26, 53.8, 180), n=14, color=0x4A6A7A)
    lr.blk('Bench', (16, 1.6, 1.6), (26, 0.8, 47), P.WOOD_L, 'Wood')
    for i in range(3):
        z = 40 + i * 5
        wall_x(lr, 40, 46, z, 0, 8, 0xBFD0D4, t=0.3)
        lr.cyl('ShowerHead', 0.4, 0.8, (44, 7.2, z + 2.5), P.STEEL, 'Metal')
    for x, z in ((20, 46), (35, 46)):
        P.ceiling_light(lr, x, z, c, color=0xE8F4FF, bright=0.7, rng=16)
    # lighting
    for x in (-60, -38, -16):
        for z in (-30, 0):
            P.ceiling_light(s, x, z, c, color=0x9AE0F0, neon=0xC0F0FF, bright=0.9, rng=26)
    P.ceiling_light(s, -38, 12, c, color=0xB0F0FF, bright=1.0, rng=30, shadows=True)
    for x in (18, 34):
        for z in (-40, -15, 15):
            P.ceiling_light(s, x, z, c, color=0xF0F4FF, bright=0.9 if R.random() < 0.7 else 0.2, rng=20)


# ===================================================================== 20 회장실
def f20(fb, F):
    c = F['h'] - 1
    s = fb.model('Chairman')
    g = fb.model('Gameplay')
    panel = 0x4A2E1E
    s.box('MarbleFloor', -79, 0, -55, 61, 0.05, 55, 0x2A2624, 'Marble', collide=False)
    # red carpet corridor from the stair door to the chairman's office
    s.box('RedCarpet', -30, 0.05, -14.5, 61, 0.1, -8.5, 0x8A0A14, 'Fabric', collide=False)
    for x in range(-24, 58, 12):
        P.plant(P.at(s, x, -17))
        s.cyl('Stanchion', 3, 0.3, (x + 6, 1.5, -15.5), P.GOLD, 'Metal')
    # chairman office (west)
    wall_z(s, -55, 55, -30, 0, c, panel, mat='WoodPlanks', t=1, openings=[(-11.5, 8, 10)])
    for sgn in (-1, 1):
        door = s.model('DoubleDoor')
        door.blk('Leaf', (0.4, 9.6, 3.8), (-30 - 1.5, 4.8, -11.5 + sgn * 3.2), 0x3A2214, 'Wood', rot=Ry(sgn * 50))
    P.sign(s, '회장실 CHAIRMAN', -29.4, 11.5, -11.5, '+x', 7, 1.2, bg=0x1A1210, fg=0xE8C870, name='OfficeSign')
    of = s.model('Office')
    of.box('Rug', -72, 0.05, -25, -40, 0.12, 5, 0x5A1418, 'Fabric', collide=False)
    dk = of.model('GrandDesk')
    dk.box('Top', -66, 3.2, -14, -58, 3.6, -4, 0x2A160C, 'Wood')
    dk.box('Body', -65.6, 0, -13.6, -64, 3.2, -4.4, 0x3A2214, 'Wood')
    dk.box('Body', -60, 0, -13.6, -58.4, 3.2, -4.4, 0x3A2214, 'Wood')
    dk.box('Front', -58.6, 0.4, -13.6, -58.3, 3.2, -4.4, 0x3A2214, 'Wood')
    dk.blk('Lamp', (0.4, 1.6, 0.4), (-63, 4.4, -12.5), P.GOLD, 'Metal')
    P.bulb(dk, -63, 5.4, -12.5, color=0xFFD890, bright=0.9, rng=14, shadows=True)
    P.sign(dk, '회장', -58.2, 2.4, -9, '+x', 2.4, 0.7, bg=0x1A1210, fg=0xE8C870, name='DeskPlate')
    ch = of.model('ChairmanChair')  # facing the window, back turned to the visitor
    ch.blk('Seat', (3, 0.6, 3), (-68, 2.3, -9), 0x1A0A08, 'Fabric')
    ch.blk('Back', (3, 5, 0.6), (-66.6, 5, -9), 0x1A0A08, 'Fabric', rot=Ry(90))
    ch.cyl('Post', 2, 0.4, (-68, 1, -9), P.DGREY, 'Metal')
    for z in range(-50, 51, 12):
        if -20 < z < 10:
            continue
        P.shelf(P.at(of, -76.5, z, -90), w=10, h=11, kind='books', color=0x2A160C)
    for i, z in enumerate((-40, -24, 16, 32)):
        fr = of.model('Portrait')
        fr.box('Frame', -30.9, 4, z - 3, -30.5, 11, z + 3, P.GOLD, 'Metal')
        canvas = fr.blk('Canvas', (0.1, 6, 5), (-31.0, 7.5, z), 0x1A1418)
        gui_text(canvas, '', 'Left', bg=0x1A1418, fg=0x000000)
        fr.ball('Face', 2.2, (-31.05, 8.4, z), 0xC8B8A8, 'SmoothPlastic', collide=False)
        fr.blk('Body', (0.1, 2.2, 3.8), (-31.05, 5.6, z), 0x111114, collide=False)
        P.sign(fr, '???', -30.45, 3.6, z, '-x', 2, 0.5, bg=0x1A1210, fg=0xE8C870, name='PortraitPlate')
    of.blk('GlobeStand', (0.4, 3, 0.4), (-48, 1.5, -22), P.WOOD_D, 'Wood')
    of.ball('Globe', 2.6, (-48, 4.2, -22), 0x3A6A8A, 'SmoothPlastic')
    safe = of.model('Safe')
    safe.box('Body', -78.6, 0, 8, -75, 4, 12, 0x2A2A2E, 'Metal')
    safe.cyl('Dial', 0.3, 1.2, (-74.85, 2.4, 10), P.STEEL, 'Metal', axis='x')
    tag(safe, 'Safe')
    fp = of.model('Fireplace')
    fp.box('Mantel', -78.8, 0, -36, -75.5, 8, -26, 0x6A6A66, 'Marble')
    fp.box('Opening', -75.6, 0.2, -33, -75.4, 4.5, -29, 0x111111)
    fire = fp.blk('Fire', (1.5, 0.5, 3), (-76.3, 0.6, -31), 0x3A1A0A, 'Wood')
    fi = __import__('rbx').Inst('Fire', 'Fire', fire)
    fi.prop('float', 'size_xml', 4)
    fi.prop('float', 'heat_xml', 6)
    fi.prop('Color3', 'Color', 0xFF8A2A)
    fi.prop('Color3', 'SecondaryColor', 0xFF3A0A)
    light(fire, 'PointLight', 0xFF8A3A, 1.6, 22, True)
    P.sofa(P.at(of, -55, 20, 180), w=9, color=0x2A0A0A)
    P.sofa(P.at(of, -44, 28, 90), w=6, color=0x2A0A0A)
    P.table(P.at(of, -50, 28), 6, 4, 1.8, color=0x2A160C)
    tc = of.model('TrophyCase')
    tc.box('Case', -45, 0, 50, -33, 9, 54, 0x8AA0A8, 'Glass', tr=0.6)
    for i in range(5):
        tc.cyl('Trophy', 1.6, 0.8, (-43 + i * 2.4, 4.6, 52), P.GOLD, 'Metal')
    for x in (-60, -45):
        for z in (-25, 15):
            ch_ = of.model('Chandelier')
            ch_.blk('Chain', (0.12, 2, 0.12), (x, c - 1, z), P.GOLD, 'Metal', collide=False)
            ch_.cyl('Ring', 0.3, 4, (x, c - 2.2, z), P.GOLD, 'Metal', collide=False)
            for k in range(6):
                a = k / 6 * math.tau
                ch_.ball('Crystal', 0.5, (x + math.cos(a) * 1.8, c - 2.8, z + math.sin(a) * 1.8), 0xF0F0FF, 'Glass',
                         tr=0.3, collide=False)
            P.bulb(ch_, x, c - 2.6, z, color=0xFFD8A0, bright=1.0, rng=20)
    # secretary / waiting area
    wall_x(s, -30, 30, -30, 0, c, panel, mat='WoodPlanks', openings=[(10, 5, 8)])
    P.desk(P.at(s, -10, -38, 180), w=8, top=0x2A160C, screen_text='오늘 일정\n— 없음 —\n— 없음 —')
    P.sofa(P.at(s, 10, -50, 0), w=10, color=0x3A1A1A)
    for x in (-24, 24):
        P.plant(P.at(s, x, -50), h=6)
    # board room (north)
    wall_x(s, -30, 40, 6, 0, c, panel, mat='WoodPlanks', openings=[(30, 5, 8)])
    br = s.model('BoardRoom')
    br.box('LongTable', -20, 2.8, 24, 26, 3.2, 32, 0x2A160C, 'Wood')
    br.box('TableBase', -16, 0, 26.5, 22, 2.8, 29.5, 0x1A0E08, 'Wood')
    for x in range(-17, 25, 4):
        P.office_chair(P.at(br, x, 22, 180), color=0x2A0A0A)
        P.office_chair(P.at(br, x, 34, 0), color=0x2A0A0A)
    scr = br.blk('Screen', (14, 7, 0.3), (3, 8, 54.6), P.BLACK)
    gui_text(scr, '분기 실적\n인원: 88 → 6', 'Front', bg=0x0A0A0A, fg=0xC8C8C8, glow=True, font=10, ppu=20)
    for x in (-10, 15):
        P.pendant(br, x, 28, c, drop=4, color=0xFFD8A0, bright=1.0, rng=18)
    for x in (-15, 15, 45):
        P.pendant(s, x, -12, c, drop=3, color=0xFFD8A0, bright=0.8, rng=16)
    P.ceiling_light(s, 0, -42, c, color=0xFFE8C8, bright=0.8, rng=18)
    # parallel world: the whole board room set duplicated upside-down on the ceiling
    P.table(s.at(T(10, c, 45) * Rz(180)), 10, 4, 3, color=0x2A160C)
    for x in (6, 10, 14):
        P.office_chair(s.at(T(x, c, 42) * Rz(180)), color=0x2A0A0A)


# ===================================================================== 10 사내 어린이집
def f10(fb, F):
    c = F['h'] - 1
    s = fb.model('Daycare')
    g = fb.model('Gameplay')
    cols = [0xD8B0B0, 0xB0C8D8, 0xD8D0A0, 0xB0D0B0, 0xC8B8D8]
    for i in range(10):
        for j in range(8):
            x0, z0 = -79 + i * 12, -55 + j * 13.75
            if x0 > 40:
                continue
            s.box('FloorMat', x0, 0, z0, x0 + 12, 0.12, z0 + 13.75, cols[(i + j) % len(cols)], 'Fabric', collide=False)
    # room walls
    wall_x(s, -79, 45, 20, 0, c, 0xF0E0C8, openings=[(-50, 5, 8), (0, 5, 8), (30, 5, 8)])
    wall_z(s, 20, 55, -20, 0, c, 0xF0E0C8, openings=[(30, 4, 8)])
    # play room (south big area)
    for i in range(6):
        x, z = -60 + (i % 3) * 16, -35 + (i // 3) * 18
        P.table(P.at(s, x, z), 6, 3, 1.8, color=R.choice([0xE0A040, 0x40A0E0, 0xE06060]), mat='SmoothPlastic', leg=0xF0F0F0)
        for k in range(4):
            a = k * 90
            P.chair(P.at(s, x + math.sin(math.radians(a)) * 3, z + math.cos(math.radians(a)) * 2.4, a + 180),
                    color=R.choice([0xE04040, 0x4060E0, 0xF0C020, 0x40B040]), seat_h=1.1, w=1.2)
    lone = P.chair(P.at(s, -20, 10, 0), color=0xE04040, seat_h=1.1, w=1.2, name='LoneChair')
    P.wall_text(s, '같이 놀자', -20, 7, 19.6, '-z', 6, 1.6, fg=0xB01818, font=9)
    # ball pit
    bp = s.model('BallPit')
    for x0, z0, x1, z1 in ((0, -50, 20, -49), (0, -35, 20, -34), (0, -50, 1, -34), (19, -50, 20, -34)):
        bp.box('Wall', x0, 0, z0, x1, 2.6, z1, 0x3A8AE0, 'SmoothPlastic')
    for _ in range(90):
        bp.ball('Ball', 0.9, (R.uniform(1.6, 18.4), R.uniform(0.5, 2.0), R.uniform(-48.4, -35.6)),
                R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040, 0xF07AC0]), collide=False, shadow=False)
    bp.box('BallFill', 1, 0, -49, 19, 1.4, -35, 0x3060E0, tr=1)
    # slide
    sl = s.model('Slide')
    for dx in (-1.5, 1.5):
        sl.blk('LadderRail', (0.3, 7, 0.3), (30 + dx, 3.5, -48), 0xF0C020, 'SmoothPlastic')
    for k in range(6):
        sl.blk('Rung', (3, 0.25, 0.25), (30, 1 + k * 1.1, -48), 0xF0C020)
    sl.box('Platform', 28, 6.6, -48, 32, 7, -44, 0xF0C020)
    sl.beam('SlideBed', (30, 7, -44), (30, 0.6, -32), 3, 0.3, 0xE04040)
    # toy shelf and toys
    P.shelf(P.at(s, -76.5, -10, -90), w=10, h=5, levels=2, kind='boxes', color=0xF0F0F0, mat='SmoothPlastic')
    for _ in range(30):
        s.blk('ToyBlock', (1, 1, 1), (R.uniform(-75, 40), 0.62, R.uniform(-52, 15)),
              R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040]), rot=Ry(R.uniform(0, 90)))
    rh = s.model('RockingHorse')
    rh.ball('Body', 2.4, (36, 2.4, 5), 0xC0804A, 'Wood')
    rh.ball('Head', 1.4, (36, 3.8, 3.8), 0xC0804A, 'Wood')
    rh.beam('Rocker', (36, 0.3, 2.5), (36, 0.3, 7.5), 0.3, 0.3, 0x6A4A2A, 'Wood')
    tri = s.model('Tricycle')
    tri.cyl('FrontWheel', 0.3, 2, (-40, 1, 5), 0xE03030, axis='x', rot=Rz(20))
    tri.cyl('RearWheel', 0.3, 1.2, (-41.5, 0.6, 7), 0x1A1A1A, axis='x')
    tri.cyl('RearWheel', 0.3, 1.2, (-38.5, 0.6, 7), 0x1A1A1A, axis='x')
    tri.beam('Frame', (-40, 1.2, 5), (-40, 1.4, 7), 0.4, 0.4, 0xE03030)
    P.teddy(P.at(s, 10, 10, 30), s=1.2, color=0xF0C0D0, torn=True)
    # drawings on the wall
    drawings = ['수민이 언니\n무서워', '도망쳐', '우리 가족\n(수민이 빼고)', '88층에서\n나가고 싶어요', '내 짝꿍\n조수민 ㅠㅠ',
                '♥ 선생님 ♥', '언니가 또\n때렸어요', '여기 있어']
    for i, t in enumerate(drawings):
        x = -74 + i * 7.5
        p = s.blk('Drawing', (5.5, 4, 0.05), (x, 7, 19.55), 0xFAF8F0, collide=False, rot=Rz(R.uniform(-6, 6)))
        gui_text(p, t, 'Front', bg=0xFAF8F0, fg=R.choice([0xD03030, 0x3050D0, 0x202020]), font=9, ppu=30)
    P.scribbles(s, -40, 3, 19.6, '-z', n=30, w=60, h=2)
    for i in range(5):
        P.handprint(s, -10 + i * 1.6, 2.5 + (i % 2) * 0.8, 19.62, '-z', color=R.choice([0xD03030, 0x3060E0, P.BLOOD]))
    # cubbies with names
    cb = s.model('Cubbies')
    names = ['지우', '민준', '서연', '하준', '조수민', '도윤', '서아', '하윤']
    for i, n in enumerate(names):
        x = 0 + i * 4.2
        cb.box('Cubby', x, 0, 18.2, x + 4, 5, 19.6, 0xF0F0F0, 'Wood')
        lab = P.sign(cb, n if n != '조수민' else '조수민 (만지지 마)', x + 2, 4.3, 18.15, '-z', 3.6, 0.6, bg=0xFFFFFF,
                     fg=0x2A2A2A if n != '조수민' else 0xC01010, font=9, name='NameTag')
    # nap room (north-west)
    for i in range(4):
        for j in range(3):
            x, z = -72 + i * 13, 28 + j * 8
            P.floor_mattress(P.at(s, x, z, 90), w=3, l=5.5, color=R.choice([0xF0D0E0, 0xD0E0F0]), blanket=0xE8E0A0)
    mb = s.model('MusicBox')
    mb.box('Box', -30, 0, 50, -27, 1.6, 52, 0xC07A9A, 'Wood')
    mb.blk('Lid', (3, 0.15, 2), (-28.5, 2.4, 52.6), 0xC07A9A, 'Wood', rot=Rx(-70))
    mb.cyl('Ballerina', 1, 0.3, (-28.5, 2.1, 51), 0xF0D0E0, collide=False)
    g.blk('ChaserSpawn', (4, 6, 4), (-50, 3, 40), 0xFF0000, tr=1, collide=False, tags=['ChaserSpawn'])
    # teacher room (north-east)
    P.desk(P.at(s, 10, 45, 180), screen_text='출석부\n조수민 — 결석 (?)')
    P.filing_cabinet(P.at(s, 40, 53.5, 180))
    P.sign(s, '햇살반 · PSI 사내 어린이집', 61.8, 10.5, 6, '-x', 9, 1.6, bg=0xFFF0C8, fg=0xC06020, name='DaycareSign',
           font=9)
    for x in (-60, -30, 0, 30):
        for z in (-35, -5):
            P.ceiling_light(s, x, z, c, color=0xFFE8C8, neon=0xFFF0D8, bright=0.8 if R.random() < 0.75 else 0.15, rng=22)
    P.ceiling_light(s, -50, 38, c, color=0xC8A0FF, bright=0.4, rng=20)
    P.ceiling_light(s, 15, 38, c, color=0xFFE8C8, bright=0.7, rng=18)


# ===================================================================== 8 정보구출반 8팀
TEAM = [('유모자 팀장', None), ('차강면 차장', '보고서 v7_최종_진짜최종'), ('안경수', '안경 어디 뒀지'),
        ('이미리', '마니또 리스트'), ('장세진', '오늘 할 일: 탈출'), ('공유', '공유 씨 어디 있어요?'),
        ('신입', '환영합니다!'), ('(빈자리)', None)]


def f8(fb, F):
    c = F['h'] - 1
    s = fb.model('Team8Office')
    g = fb.model('Gameplay')
    s.box('Carpet', -60, 0, -40, 46, 0.05, 40, 0x50565E, 'Fabric', collide=False)
    P.sign(s, '정보구출반 8팀', 0, 10, 41.5, '-z', 16, 2.6, bg=0x0E1A2A, fg=0x8FD3FF, glow=True, name='TeamSign')
    s.box('SignWall', -12, 0, 41.8, 12, c, 42.6, 0x2A3442, 'WoodPlanks')
    # team desks (two facing rows)
    for i, (nm, scr) in enumerate(TEAM[1:]):
        row, col = divmod(i, 4)
        x = -18 + col * 8
        z = 14 if row == 0 else 6
        P.desk(P.at(s, x, z, 0 if row == 0 else 180), w=7, screen_text=scr, nameplate=nm,
               chair_=nm != '(빈자리)')
    s.box('DeskDivider', -22, 3.1, 9.9, 14, 4.6, 10.1, 0x8A9AA8, 'Glass', tr=0.4)
    # leader office (glass box)
    lo = s.model('LeaderOffice')
    lo.box('GlassS', -60, 0, 18, -36, c, 18.3, 0x9AB0C0, 'Glass', tr=0.6)
    lo.box('GlassE', -36.3, 0, 18, -36, c, 30, 0x9AB0C0, 'Glass', tr=0.6)
    lo.box('GlassE2', -36.3, 0, 35, -36, c, 40, 0x9AB0C0, 'Glass', tr=0.6)
    lo.box('Wall', -60, 0, 40, -36, c, 40.6, 0x2A3442, 'WoodPlanks')
    P.desk(P.at(lo, -48, 32, 180), w=8, top=0x5A3A2A, nameplate='유모자 팀장', screen_text='oh my ong!')
    P.sign(lo, '"very very good입니다!"', -48, 7, 39.6, '-z', 8, 1.2, bg=0xF6F0E0, fg=0x2A2A6A, name='Motto')
    P.plant(P.at(lo, -58, 38), h=6)
    P.shelf(P.at(lo, -58, 26, -90), w=8, h=8, kind='books')
    # whiteboard
    wb = s.model('Whiteboard')
    p = wb.blk('Board', (14, 6, 0.2), (20, 6, 41.6), 0xF8F8F6, 'SmoothPlastic')
    gui_text(p, '8팀 회식: 진미국수 9시\n※ 에스키모 씨 기물 파손 주의\n마니또 진행 중 (신입 포함!)\n보고서 마감: 오늘 (오늘?)',
             'Front', bg=0xF8F8F6, fg=0x1A3A8A, font=9, ppu=30)
    wb.box('Tray', 13, 2.9, 41.1, 27, 3.1, 41.5, P.STEEL, 'Metal')
    # pantry
    pn = s.model('Pantry')
    P.counter(P.at(pn, 36, -38, 0), w=16)
    pn.blk('CoffeeMachine', (2, 2.6, 2), (32, 4.5, -38), 0x1A1A1A, 'Metal')
    pn.blk('WaterDispenser', (1.8, 5, 1.8), (42.5, 2.5, -38), 0xE8E8F0)
    pn.cyl('WaterJug', 2, 1.6, (42.5, 6, -38), 0x7AB0E0, 'Glass', tr=0.4)
    for i in range(3):
        pn.blk('MugShard', (0.4, 0.3, 0.3), (36 + R.uniform(-1, 1), 3.35, -37.6 + R.uniform(-0.4, 0.4)), 0xFFFFFF,
               rot=Ry(R.uniform(0, 90)) * Rx(R.uniform(0, 60)), collide=False)
    P.sign(pn, '에스키모가 또… Извините', 36, 5.6, -36.6, '-z', 5, 0.8, bg=0xFFF6C8, fg=0x2A2A2A, name='Note',
           font=9)
    # meeting room
    wall_x(s, -79, -40, -20, 0, c, 0xC8CDD2, openings=[(-50, 5, 8)])
    wall_z(s, -55, -20, -40, 0, c, 0xC8CDD2)
    P.table(P.at(s, -60, -38), 16, 6, 3, color=0xE8E4DA, mat='SmoothPlastic')
    for x in (-66, -60, -54):
        P.office_chair(P.at(s, x, -42, 180))
        P.office_chair(P.at(s, x, -34, 0))
    scr = s.blk('MeetingScreen', (12, 6, 0.2), (-60, 7, -20.5), P.BLACK, rot=Ry(180))
    gui_text(scr, '주간 보고\n탈출 진행률: 8 / 88', 'Front', bg=0x0A1420, fg=0xC8E0FF, glow=True, font=10, ppu=20)
    # neighbour team corner (Eskimo's desk)
    for i in range(3):
        P.desk(P.at(s, -20 + i * 8, -30, 0), w=7, nameplate=['에스키모', '엘리자베스', '옆팀'][i],
               screen_text=['Привет', None, None][i])
    s.blk('BentChair', (2, 0.4, 2), (-20, 0.3, -34), P.BLACK, 'Fabric', rot=Rz(70))
    P.sign(s, '옆팀', -12, 9, -24.6, '-z', 4, 1, bg=0x2A3442, fg=0xFFFFFF, name='NeighbourSign')
    # team 7 (empty desks, monitors still on)
    for row in range(2):
        for col in range(4):
            P.desk(P.at(s, 18 + col * 7.5, -24 + row * 9, 0 if row == 0 else 180), w=6.5,
                   screen_text=R.choice([None, None, '로그아웃 됨', '7팀 — 전원 실종']), nameplate='7팀')
    P.sign(s, '정보구출반 7팀', 30, 9, -30.6, '-z', 8, 1.4, bg=0x2A3442, fg=0xFFFFFF, name='Team7Sign')
    s.box('Team7Wall', 14, 0, -30.9, 46, c, -30.3, 0xC8CDD2, 'Concrete')
    for row in range(2):
        for col in range(3):
            P.desk(P.at(s, -30 + col * 7.5, 26 + row * 9, 0 if row == 0 else 180), w=6.5, nameplate='9팀',
                   screen_text=R.choice([None, '9팀 주간회의 (취소)']))
    P.filing_cabinet(P.at(s, 30, 30, 180))
    P.filing_cabinet(P.at(s, 32, 30, 180))
    s.blk('Printer', (3, 2.4, 2.4), (38, 1.2, 30), 0xD8D8D8, 'SmoothPlastic')
    for x, z in ((-30, -10), (25, 20), (40, 0)):
        P.plant(P.at(s, x, z))
    # parallel world: Gong-yu's desk on the ceiling
    P.desk(s.at(T(-2, c, 14) * Rz(180)), w=7, nameplate='공유', chair_=False)
    P.office_chair(s.at(T(-2, c, 11) * Rz(180)))
    for x in range(-50, 41, 18):
        for z in (-40, -10, 20):
            P.ceiling_light(s, x, z, c, color=0xF4F8FF, neon=0xFFFFFF, bright=1.0, rng=20)
    P.ceiling_light(s, -2, 10, c, color=0xFFFFFF, bright=1.1, rng=22, shadows=True)


# ===================================================================== 1 로비 · 정문
def f1(fb, F):
    c = F['h'] - 1
    s = fb.model('Lobby')
    g = fb.model('Gameplay')
    # marble inlay
    s.box('Inlay', -40, 0, -40, 40, 0.04, 30, 0x2A2826, 'Marble', collide=False)
    s.box('InlayInner', -38, 0.04, -38, 38, 0.06, 28, 0xEDE8DE, 'Marble', collide=False)
    s.cyl('Medallion', 0.08, 14, (0, 0.08, -5), 0x8A1010, 'Marble', collide=False)
    s.cyl('MedallionIn', 0.1, 10, (0, 0.1, -5), 0xEDE8DE, 'Marble', collide=False)
    # columns
    for x in (-48, -24, 24, 48):
        for z in (-36, 10):
            s.cyl('Column', c, 3.2, (x, c / 2, z), 0xE8E2D6, 'Marble')
            s.box('ColumnBase', x - 2, 0, z - 2, x + 2, 1, z + 2, 0x2A2826, 'Marble')
    # reception
    rc = s.model('Reception')
    for i in range(9):
        a = math.radians(-60 + i * 15)
        rc.blk('Desk', (3.4, 4, 2.2), (math.sin(a) * 16, 2, 34 - math.cos(a) * 8), 0xF2EEE6, 'Marble',
               rot=Ry(math.degrees(-a) * 0.5))
        rc.blk('DeskTop', (3.6, 0.2, 2.6), (math.sin(a) * 16, 4.1, 34 - math.cos(a) * 8), 0x1A1A1A, 'Granite',
               rot=Ry(math.degrees(-a) * 0.5))
    rc.box('LogoWall', -22, 0, 46, 22, c, 47.5, 0x1E2024, 'Slate')
    logo = P.sign(rc, 'PSI', 0, 16, 45.9, '-z', 26, 10, bg=0x1E2024, fg=0xE8E8E8, glow=True, name='Logo', font=20)
    light(logo, 'SurfaceLight', 0xFFFFFF, 0.8, 16, False, 'Front', 120)
    P.sign(rc, '어서 오세요 · 당신은 88층에서 오셨군요', 0, 8.5, 45.9, '-z', 22, 1.6, bg=0x1E2024, fg=0xA8A8A8,
           name='Welcome', glow=True)
    P.office_chair(P.at(rc, -4, 40, 180))
    P.office_chair(P.at(rc, 5, 40, 180))
    rc.blk('Bell', (0.6, 0.4, 0.6), (0, 4.4, 26.5), P.GOLD, 'Metal')
    # security turnstiles toward the elevator / stair
    ts = s.model('Turnstiles')
    for i in range(6):
        z = -6 + i * 4
        ts.box('Gate', 40, 0, z - 0.4, 44, 3.4, z + 0.4, 0xC8C8CC, 'Metal')
        ts.blk('Flap', (0.1, 1.6, 2.8), (42, 2.6, z + 2), 0x9AC0D0, 'Glass', tr=0.4, collide=False)
        ts.blk('Reader', (0.6, 0.15, 0.6), (40.6, 3.48, z), 0x1A1A1A, 'Neon', collide=False)
    P.desk(P.at(s, 50, 30, 90), w=6, screen_text='CCTV\nB13 — 신호 없음')
    xr = s.model('XRay')
    xr.box('Body', 30, 0, -28, 34, 4.4, -18, 0xD8DCE0, 'Metal')
    xr.box('Belt', 30.4, 2.4, -32, 33.6, 2.6, -14, 0x1A1A1A, 'Fabric')
    # waiting lounge
    s.box('LoungeRug', -70, 0.06, -30, -46, 0.12, -6, 0x3A2A24, 'Fabric', collide=False)
    P.sofa(P.at(s, -58, -6, 180), w=12, color=0x2A2C30)
    P.sofa(P.at(s, -58, -30, 0), w=12, color=0x2A2C30)
    P.table(P.at(s, -58, -18), 8, 4, 1.6, color=0x1A1A1A, mat='Granite')
    for x, z in ((-76, -50), (-76, 40), (36, -50), (-30, 44), (30, 44)):
        P.plant(P.at(s, x, z), h=7)
    # sculpture
    sc = s.model('Sculpture')
    for i in range(6):
        sc.blk('Cube', (4 - i * 0.4, 4 - i * 0.4, 4 - i * 0.4), (0, 3 + i * 3.6, -5), 0x8A1010 if i % 2 else 0x1A1A1A,
               'Metal', rot=Ry(i * 23) * Rx(i * 11))
    # floor directory
    dr = s.model('Directory')
    lines = ('층별 안내\n88F 공유 하우스\n87F (출입 통제)\n80F 문서보관소\n70F 보안관제센터\n66F ■■ 지옥\n60F 사내식당\n'
             '50F 조수민 하우스\n44F 연회장\n40F 오피스\n30F 피트니스\n20F 회장실\n10F 어린이집\n8F 정보구출반 8팀\n'
             '1F 로비\nB1 파르티르레트\nB2 기니방\nB3 ■■■■\nB6~B13 짱큰 지하병원\n▼ 지구 내핵')
    dp = dr.blk('Board', (0.4, 13, 6), (60.6, 7.5, 20), 0x14161A, 'Metal')
    gui_text(dp, lines, 'Left', bg=0x14161A, fg=0xE8E0C8, glow=True, font=19, ppu=30, pad=0.05)
    # chandelier ring
    for r_, y in ((10, c - 6), (6, c - 8)):
        for k in range(16):
            a = k / 16 * math.tau
            s.blk('Ring', (r_ * 0.42, 0.3, 0.3), (math.cos(a) * r_, y, -5 + math.sin(a) * r_), 0xC9A24A, 'Metal',
                  rot=Ry(-math.degrees(a) + 90), collide=False)
        for k in range(8):
            a = k / 8 * math.tau
            P.bulb(s, math.cos(a) * r_, y - 0.5, -5 + math.sin(a) * r_, color=0xFFE0B0, bright=0.6, rng=20, d=0.5)
    for k in range(4):
        a = k / 4 * math.tau
        s.beam('Cable', (math.cos(a) * 10, c, -5 + math.sin(a) * 10), (math.cos(a) * 10, c - 6, -5 + math.sin(a) * 10),
               0.08, 0.08, P.BLACK, collide=False, shadow=False)
    for x in (-60, -30, 30, 60):
        for z in (-40, 0, 35):
            P.ceiling_light(s, x, z, c, color=0xFFE8CC, neon=0xFFF2E0, bright=1.0, rng=34, size=(2, 2))
    P.ceiling_light(s, 0, -40, c, color=0xFFE0C0, bright=1.4, rng=40, shadows=True, size=(3, 3))

    # ---------------- the main gate (south facade, centre) : LOCKED
    mg = g.model('MainEntrance')
    mg.box('PortalFrameL', -14, 0, -56.5, -12, 16, -54.5, 0x1A1A1A, 'Metal')
    mg.box('PortalFrameR', 12, 0, -56.5, 14, 16, -54.5, 0x1A1A1A, 'Metal')
    mg.box('PortalHeader', -14, 16, -56.5, 14, 19, -54.5, 0x1A1A1A, 'Metal')
    mg.box('UpperGlass', -12, 19, -56, 12, c, -55.6, 0x31424A, 'Glass', tr=0.45)
    # revolving door (centre)
    mg.cyl('RevolvingDrum', 10, 9, (0, 5, -55.5), 0x9AB0B8, 'Glass', tr=0.6, collide=True)
    mg.cyl('RevolvingCap', 1, 9.6, (0, 10.5, -55.5), 0x1A1A1A, 'Metal')
    for a in (0, 90):
        mg.blk('Wing', (8.6, 9.4, 0.15), (0, 5, -55.5), 0xB8C8D0, 'Glass', tr=0.5, rot=Ry(a + 20))
    # two swing doors either side, chained
    for xc in (-8, 8):
        mg.box('DoorGlass', xc - 3.6, 0, -55.8, xc + 3.6, 12, -55.4, 0x9AB0B8, 'Glass', tr=0.5)
        mg.box('DoorBar', xc - 0.15, 0, -55.9, xc + 0.15, 12, -55.3, 0x1A1A1A, 'Metal')
        mg.box('Handle', xc - 1.2, 5, -55.2, xc - 0.9, 7.5, -55.0, P.STEEL, 'Metal')
        mg.box('Handle', xc + 0.9, 5, -55.2, xc + 1.2, 7.5, -55.0, P.STEEL, 'Metal')
        P.chains_x(mg.at(T(xc, 0, -54.6)), 6.5, 12, z=-0.0)
    blocker = mg.box('MainGate', -12, 0, -56.6, 12, 16, -54.2, 0xFF00FF, tr=1, tags=['MainGate'])
    P.sign(mg, '정문 — 열쇠가 필요합니다', 0, 13.5, -54.0, '+z', 10, 1.4, bg=0x111111, fg=0xFFD23A, name='GateSign')
    ks = mg.model('KeySlot')
    ks.box('Panel', 15, 3.5, -54.6, 17.5, 7, -54.2, 0x2A2A2E, 'Metal')
    hole = ks.blk('KeyHole', (0.5, 1.0, 0.1), (16.25, 5.4, -54.15), P.GOLD, 'Neon', tags=['KeySlot'])
    light(hole, 'PointLight', 0xFFD060, 0.6, 8)
    P.sign(ks, '열쇠 구멍\n(지하 어딘가)', 16.25, 6.6, -54.1, '+z', 2.3, 0.7, bg=0x2A2A2E, fg=0xFFD23A, name='KeyHint')
    P.sign(s, '지하로 → B1 파르티르레트', 61.8, 6, -18, '-x', 7, 1.2, bg=0x111111, fg=0xC8C8C8, name='Down')
