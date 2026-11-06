"""Art-directed special floors: 66 (짜장 지옥), 50 (조수민 하우스), B1 (파르티르레트), B2 (기니방), B3 (짱큰베리)."""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles, Inst
import props as P
import props2 as Q
from props import R
from v2_common import *
from v2_office import east_edge, office_chair, blinds
from v2_public import indoor_tree, stanchions, chandelier, WALNUT, WALNUT_D, BRASS
from building import tag, wall_x as bwall_x, wall_z as bwall_z
import floors_upper as U
import floors_lower as L

LACQUER = 0x8A1414
GOLD = 0xC9A24A


def lantern(b, x, y, z, s=1.0, col=0xC81818):
    m = b.model('Lantern')
    m.blk('Cord', (0.06, 3, 0.06), (x, y + 1.5 * s + 1.5, z), 0x1A1A1A, **DEC)
    m.cyl('CapTop', 0.25 * s, 1.2 * s, (x, y + 1.3 * s, z), GOLD, 'Metal', **DEC)
    m.ball('Body', 2.4 * s, (x, y, z), col, 'Neon', tr=0.15, **NC)
    m.cyl('CapBot', 0.25 * s, 1.0 * s, (x, y - 1.25 * s, z), GOLD, 'Metal', **DEC)
    for k in range(4):
        m.blk('Tassel', (0.08, 1.2 * s, 0.08), (x + (k - 1.5) * 0.15, y - 2.0 * s, z), GOLD, **DEC)
    light(m.blk('LanternLight', (0.1, 0.1, 0.1), (x, y, z), 0, tr=1, **DEC), 'PointLight', 0xFF5A3A, 1.1, 22)


def red_column(b, x, z, h):
    b.cyl('LacquerColumn', h, 2.6, (x, h / 2, z), LACQUER, 'SmoothPlastic', refl=0.08)
    for y in (1.0, h - 1.4):
        b.cyl('GoldBand', 0.6, 2.9, (x, y, z), GOLD, 'Metal')
    b.cyl('Base', 1.0, 3.4, (x, 0.5, z), 0x2A1A14, 'Granite')


# ===================================================================== 66F 짜장 지옥
def f66(fb, F):
    U.f66(fb, F)                      # the jump route itself is unchanged
    c = F['h'] - 1
    s = fb.model('ArtLayer')
    # lacquered columns standing in the sauce around the edge
    for x in range(-72, 41, 16):
        for z in (-52, 52):
            red_column(s, x, z, c)
    for z in range(-36, 37, 18):
        red_column(s, -76, z, c)
    # gold-trimmed red wall screens behind the columns (north + west)
    s.box('ScreenN', -79, 1.2, 53.6, 44, c - 2, 54.2, 0x5A0A0A, 'SmoothPlastic')
    s.box('ScreenW', -79.0, 1.2, -53, -78.4, c - 2, 53, 0x5A0A0A, 'SmoothPlastic')
    for x in range(-76, 44, 6):
        s.box('Lattice', x - 0.15, 3, 53.4, x + 0.15, c - 4, 53.6, GOLD, 'Metal', **DEC)
    for y in (3, 10, 17, 24):
        s.box('LatticeH', -79, y - 0.15, 53.4, 44, y + 0.15, 53.6, GOLD, 'Metal', **DEC)
    s.box('Frieze', -79, c - 2, 53.3, 44, c - 0.8, 54.2, GOLD, 'Metal')
    s.box('FriezeW', -78.7, c - 2, -53, -78.1, c - 0.8, 53, GOLD, 'Metal')
    # hanging lanterns well above the jump route
    for x in range(-64, 41, 16):
        for z in (-36, -12, 12, 36):
            lantern(s, x + R.uniform(-2, 2), c - R.uniform(4.5, 7), z + R.uniform(-2, 2), s=R.uniform(0.9, 1.3))
    # giant menu boards on the north screen
    for i, (x, txt) in enumerate(((-52, '짜장면\n5,000'), (-20, '짬뽕\n6,000'), (12, '탕수육\n15,000'))):
        mb = s.blk('MenuBoard', (12, 7, 0.3), (x, 20, 53.2), 0x1A0A06, rot=Ry(180))
        gui_text(mb, txt, 'Front', bg=0x1A0A06, fg=0xF2D23A, glow=True, font=20, ppu=14)
    from vignettes import tin_boxes, scooter
    tin_boxes(s.at(T(46, 1.6, -21) * Ry(15)), 4)
    scooter(s.at(T(47, 1.6, -6) * Ry(70)))
    hood = s.model('Hood')
    hood.blk('Canopy', (20, 3, 12), (52, c - 3, -12), 0xB8BCC0, 'Metal', **NC)
    hood.blk('Duct', (4, 4, 4), (52, c - 0.5, -12), 0xA8ACB0, 'Metal', **NC)
    p = hood.blk('HoodLight', (16, 0.1, 8), (52, c - 4.55, -12), 0xFFE0B0, 'Neon', **DEC)
    light(p, 'SurfaceLight', 0xFFD8A8, 1.0, 22, True, 'Bottom', 110)
    st = s.blk('SteamWall', (100, 0.5, 90), (-18, 1.4, 0), 0, tr=1, **DEC)
    particles(st, 'steam', 10)


# ===================================================================== 50F 조수민 하우스
def house_window(b, axis, c, plane, out, w=5, bot=3.0, top=7.5, col=0xFFFFFF, glow=True):
    """Window with frame, muntins and a curtain behind; `out` = +1/-1 outward normal sign."""
    m = b.model('HouseWindow')
    y0, y1 = FL + bot, FL + top
    def bx(u0, u1, v0, v1, d0, d1, colr, mat='SmoothPlastic', **kw):
        if axis == 'x':
            m.box('W', u0, v0, plane + d0, u1, v1, plane + d1, colr, mat, **kw)
        else:
            m.box('W', plane + d0, v0, u0, plane + d1, v1, u1, colr, mat, **kw)
    bx(c - w / 2, c + w / 2, y0, y1, -0.05, 0.05, 0x9AB8C8, 'Glass', tr=0.45)
    for (u0, u1, v0, v1) in ((c - w / 2 - 0.3, c - w / 2, y0, y1), (c + w / 2, c + w / 2 + 0.3, y0, y1),
                             (c - w / 2 - 0.3, c + w / 2 + 0.3, y1, y1 + 0.3), (c - w / 2 - 0.5, c + w / 2 + 0.5, y0 - 0.3, y0)):
        bx(u0, u1, v0, v1, out * 0.1 - 0.12, out * 0.1 + 0.12, col)
    bx(c - 0.06, c + 0.06, y0, y1, out * 0.06 - 0.04, out * 0.06 + 0.04, col, **DEC)
    bx(c - w / 2, c + w / 2, (y0 + y1) / 2 - 0.06, (y0 + y1) / 2 + 0.06, out * 0.06 - 0.04, out * 0.06 + 0.04, col, **DEC)
    for sgn in (-1, 1):
        bx(c + sgn * (w / 2 - 0.7) - 0.7, c + sgn * (w / 2 - 0.7) + 0.7, y0, y1 + 0.2, -out * 0.35 - 0.05, -out * 0.35 + 0.05, 0xF4C8D8, 'Fabric', **DEC)
    for sgn in (-1, 1):
        bx(c + sgn * (w / 2 + 0.9) - 0.5, c + sgn * (w / 2 + 0.9) + 0.5, y0 - 0.1, y1 + 0.1, out * 0.12 - 0.06, out * 0.12 + 0.06, 0x6A8AA0, **DEC)


def f50(fb, F):
    s = fb.model('JoSuminHouse')
    g = fb.model('Gameplay')
    Z = (-79, 62, -55, 55)
    floor_finish(s, Z, 0x8A8A86, 'Fabric')
    trof = troffer_grid(Z, 12, 12, (6, 6))
    ceiling_grid(s, Z, troffers=trof, dead=[t for t in trof if R.random() < 0.15], col=0xE0DED8, bright=0.75, color=0xF0F4FF)
    # office remnants pushed against the outer walls
    for k in range(6):
        office_chair(s.at(T(-76 + k * 2.2, 0, 52) * Ry(R.uniform(150, 210))))
    for x in (46, 52):
        for z in (-44, -36, -28, 24, 32, 40):
            workstation(s.at(T(x, 0, z) * Ry(-90)), w=5, panel=False, dark=True, chair=False, mess=0.2, screen=None)
    workstation(s.at(T(52, 0, -20) * Ry(-90)), w=5, panel=False, screen='수민이 보고 있어', chair=False)
    # lawn, path, fence
    LX0, LX1, LZ0, LZ1 = -70, 40, -45, 48
    s.box('Lawn', LX0, FL, LZ0, LX1, FL + 0.25, LZ1, 0x4E7A3A, 'Grass')
    for _ in range(80):
        s.blk('GrassTuft', (0.2, R.uniform(0.3, 0.7), 0.2), (R.uniform(LX0 + 1, LX1 - 1), FL + 0.4, R.uniform(LZ0 + 1, LZ1 - 1)), 0x5A8A42, 'Grass',
              rot=Rz(R.uniform(-20, 20)), **DEC)
    for i in range(10):
        s.cyl('Stone', 0.15, 1.8, (-11 + R.uniform(-0.4, 0.4), FL + 0.3, -43 + i * 3.6), 0xB8B0A0, 'Slate', **DEC)
    fence = s.model('PicketFence')
    def picket_run(axis, a0, a1, plane, gap=None):
        u = a0
        while u <= a1:
            if gap and gap[0] < u < gap[1]:
                u += 1.2
                continue
            if axis == 'x':
                fence.blk('Picket', (0.5, 3.2, 0.2), (u, FL + 1.85, plane), 0xF6F2EA, 'Wood')
                fence.wedge('PicketTip', (0.5, 0.5, 0.2), T(u, FL + 3.7, plane) * Ry(90), 0xF6F2EA, 'Wood')
            else:
                fence.blk('Picket', (0.2, 3.2, 0.5), (plane, FL + 1.85, u), 0xF6F2EA, 'Wood')
                fence.wedge('PicketTip', (0.5, 0.5, 0.2), T(plane, FL + 3.7, u), 0xF6F2EA, 'Wood')
            u += 1.2
        for y in (1.2, 2.8):
            if axis == 'x':
                for (p0, p1) in ([(a0, gap[0]), (gap[1], a1)] if gap else [(a0, a1)]):
                    fence.box('Rail', p0, FL + y - 0.15, plane + 0.12, p1, FL + y + 0.15, plane + 0.32, 0xF6F2EA, 'Wood')
            else:
                fence.box('Rail', plane + 0.12, FL + y - 0.15, a0, plane + 0.32, FL + y + 0.15, a1, 0xF6F2EA, 'Wood')
    picket_run('x', LX0, LX1, LZ0, gap=(-14, -8))
    picket_run('z', LZ0, LZ1, LX0)
    picket_run('z', LZ0, LZ1, LX1)
    for x in (-14.4, -7.6):
        fence.blk('GatePost', (0.6, 4.4, 0.6), (x, FL + 2.2, LZ0), 0xF6F2EA, 'Wood')
        fence.ball('PostCap', 0.8, (x, FL + 4.6, LZ0), 0xF6F2EA, 'Wood')
    gate = fence.at(T(-14.1, 0, LZ0) * Ry(-75))
    for k in range(5):
        gate.blk('GatePicket', (0.5, 3.0, 0.2), (0.7 + k * 1.2, FL + 1.8, 0), 0xF6F2EA, 'Wood')
    mb = s.model('Mailbox')
    mb.blk('Post', (0.4, 3.4, 0.4), (-17, FL + 1.7, LZ0 - 1.5), 0x6B4A2F, 'Wood')
    mb.blk('Box', (1.4, 1.2, 2.2), (-17, FL + 3.9, LZ0 - 1.5), 0xD04A6A, 'Metal')
    mb.blk('Flag', (0.1, 0.8, 0.3), (-16.25, FL + 4.2, LZ0 - 1.2), 0xFF2020, **NC)
    P.sign(mb, '조수민', -17, FL + 3.9, LZ0 - 2.65, '-z', 1.3, 0.6, bg=0xFFFFFF, fg=0x222222, name='MailName')
    # the house
    hx0, hx1, hz0, hz1 = -40, 20, -6, 38
    WH = 10.0
    hc = 0xF2DDE2
    h = s.model('House')
    h.box('Foundation', hx0 - 0.4, FL, hz0 - 0.4, hx1 + 0.4, FL + 1.2, hz1 + 0.4, 0xB8B0A4, 'Concrete')
    HF = FL + 1.2
    h.box('HouseFloor', hx0, FL + 1.0, hz0, hx1, HF, hz1, 0xC8A882, 'WoodPlanks')
    wins_front = [(-30, 5, 3.0, 7.5), (8, 5, 3.0, 7.5)]
    door_open = [(-11, 4.2, 0, 7.8)]
    def hwall(axis, a0, a1, plane, openings):
        m = h.model('ExtWall')
        cur = a0
        for c_, w_, bot, top in sorted(openings):
            o0, o1 = c_ - w_ / 2, c_ + w_ / 2
            for (u0, u1, v0, v1) in ((cur, o0, HF, HF + WH), (o0, o1, HF, HF + bot), (o0, o1, HF + top, HF + WH)):
                if u1 - u0 > 0.02 and v1 - v0 > 0.02:
                    if axis == 'x':
                        m.box('Wall', u0, v0, plane - 0.4, u1, v1, plane + 0.4, hc, 'SmoothPlastic')
                    else:
                        m.box('Wall', plane - 0.4, v0, u0, plane + 0.4, v1, u1, hc, 'SmoothPlastic')
            cur = o1
        if axis == 'x':
            m.box('Wall', cur, HF, plane - 0.4, a1, HF + WH, plane + 0.4, hc, 'SmoothPlastic')
        else:
            m.box('Wall', plane - 0.4, HF, cur, plane + 0.4, HF + WH, a1, hc, 'SmoothPlastic')
    hwall('x', hx0, hx1, hz0, [(c_, w_, b_ - FL + FL, t_) for c_, w_, b_, t_ in wins_front] + door_open)
    hwall('x', hx0, hx1, hz1, [(-25, 5, 3.0, 7.5), (5, 5, 3.0, 7.5)])
    hwall('z', hz0, hz1, hx0, [(16, 5, 3.0, 7.5)])
    hwall('z', hz0, hz1, hx1, [(10, 5, 3.0, 7.5), (28, 5, 3.0, 7.5)])
    # lap siding lines on the street-facing walls
    for k in range(1, 12):
        y = HF + k * 0.85
        h.box('Siding', hx0, y - 0.05, hz0 - 0.46, hx1, y + 0.05, hz0 - 0.4, 0xE0C8D0, **DEC)
        h.box('SidingW', hx0 - 0.46, y - 0.05, hz0, hx0 - 0.4, y + 0.05, hz1, 0xE0C8D0, **DEC)
        h.box('SidingE', hx1 + 0.4, y - 0.05, hz0, hx1 + 0.46, y + 0.05, hz1, 0xE0C8D0, **DEC)
    for (x, z) in ((hx0, hz0), (hx1, hz0), (hx0, hz1), (hx1, hz1)):
        h.box('CornerBoard', x - 0.5, HF, z - 0.5, x + 0.5, HF + WH, z + 0.5, 0xFFFFFF, 'Wood')
    for c_, w_, b_, t_ in wins_front:
        house_window(h, 'x', c_, hz0, -1, w=w_)
    house_window(h, 'x', -25, hz1, 1)
    house_window(h, 'x', 5, hz1, 1)
    house_window(h, 'z', 16, hx0, -1)
    house_window(h, 'z', 10, hx1, 1)
    house_window(h, 'z', 28, hx1, 1)
    # gable roof (clipped under the office ceiling) with fascia and shingle lines
    ridge = CH - 0.3
    span = (hz1 - hz0) / 2 + 1.6
    rise = ridge - (HF + WH)
    ang = math.degrees(math.atan2(rise, span))
    Lr = math.hypot(span, rise)
    zc = (hz0 + hz1) / 2
    for sg in (-1, 1):
        rf = h.at(T((hx0 + hx1) / 2, HF + WH + rise / 2, zc + sg * span / 2) * Rx(sg * ang))
        rf.blk('Roof', (hx1 - hx0 + 3, 0.5, Lr), (0, 0, 0), 0x6A2A34, 'Slate')
        for k in range(1, int(Lr / 0.9)):
            rf.blk('Shingle', (hx1 - hx0 + 3, 0.08, 0.12), (0, 0.29, -Lr / 2 + k * 0.9), 0x4A1A24, **DEC)
    h.box('FasciaS', hx0 - 1.6, HF + WH - 0.5, hz0 - 1.8, hx1 + 1.6, HF + WH + 0.2, hz0 - 1.5, 0xFFFFFF, 'Wood')
    h.box('FasciaN', hx0 - 1.6, HF + WH - 0.5, hz1 + 1.5, hx1 + 1.6, HF + WH + 0.2, hz1 + 1.8, 0xFFFFFF, 'Wood')
    for xg in (hx0, hx1):
        n = 8
        for i in range(n):
            hh = rise * (1 - i / n)
            w2 = span * (1 - i / n) - 1.6 * (1 - i / n)
            h.box('Gable', xg - 0.4, HF + WH + rise * i / n, zc - w2, xg + 0.4, HF + WH + rise * (i + 1) / n, zc + w2, hc, 'SmoothPlastic')
    # porch
    pr = h.model('Porch')
    pr.box('PorchDeck', -18, FL, -12, -4, HF, -6, 0xB89A78, 'WoodPlanks')
    pr.box('Step1', -15, FL, -13.4, -7, FL + 0.6, -12, 0xB89A78, 'WoodPlanks')
    for x in (-17.4, -4.6):
        pr.cyl('PorchPost', WH - 0.4, 0.6, (x, HF + (WH - 0.4) / 2, -11.4), 0xFFFFFF, 'Wood')
    pr.box('PorchRoof', -19, HF + WH - 0.6, -12.6, -3, HF + WH - 0.2, -6, 0x6A2A34, 'Slate')
    pl = pr.blk('PorchLight', (0.5, 0.7, 0.5), (-14, HF + 7.8, -6.6), 0xFFE0B0, 'Neon', **DEC)
    light(pl, 'PointLight', 0xFFD0A0, 0.7, 14, True)
    P.door(h.at(T(-11, HF, hz0) * Ry(0)), 4.0, 7.6, color=0xC04A6A, frame=0xFFFFFF, open_deg=-30, window=True, name='FrontDoor')
    P.sign(h, '수민이네 ♥', -11, HF + 8.4, hz0 - 0.5, '-z', 3.2, 0.8, bg=0xFFF0F4, fg=0xC03050, name='Nameplate', font=9)
    # interior (reuse the earlier story, at the raised house floor)
    hi = h.model('Interior')
    bwall_x(hi.at(T(0, HF, 0)), hx0 + 0.4, hx1 - 0.4, 18, 0, WH, 0xF4E6EA, t=0.4, openings=[(-26, 4, 7.5), (8, 4, 7.5)])
    bwall_z(hi.at(T(0, HF, 0)), 18, hz1 - 0.4, -10, 0, WH, 0xF4E6EA, t=0.4)
    hi.box('Ceiling', hx0, HF + WH - 0.2, hz0, hx1, HF + WH, hz1, 0xFAF4F4, shadow=False)
    ib = hi.at(T(0, HF - FL, 0))
    sofa(ib.at(T(-25, 0, 12)), w=8, col=0xE8A0B0)
    coffee_table(ib.at(T(-25, 0, 6)))
    P.tv(hi.at(T(-25, HF, -4.8) * Ry(180)), text='뽀삐뽀삐 ♪')
    P.teddy(hi.at(T(10, HF, 8) * Ry(200)), s=2.4, color=0x9A7A5A, torn=True)
    rug(ib.at(T(-25, 0, 7)), 12, 10, 0xF0C8D0, 0xF8E0E6)
    P.wall_text(hi, '나가면 혼나', 0, HF + 6, 17.75, '-z', 8, 1.8, fg=0x8A1010, font=9)
    P.handprint(hi, -36, HF + 4.5, 17.75, '-z')
    P.handprint(hi, -34.5, HF + 5.2, 17.75, '-z')
    kr = hi.model('KidRoom')
    P.bed(kr.at(T(-35, HF, 31)), w=4, l=7, blanket=0xF4A0C0, frame=0xFFFFFF)
    for i in range(14):
        kr.blk('ToyBlock', (1, 1, 1), (-22 + R.uniform(-6, 6), HF + 0.5, 26 + R.uniform(-5, 5)), R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30A040]), rot=Ry(R.uniform(0, 90)))
    P.scribbles(kr, -25, HF + 5, 37.15, '-z', n=40, w=24, h=5)
    P.wall_text(kr, '내가 제일 쎄', -25, HF + 7.5, 37.1, '-z', 10, 2, fg=0x2A2A2A, font=9)
    P.sign(kr, '조수민 방\n노크 안 하면 죽음', -10.25, HF + 7.5, 26, '-x', 3, 1.4, bg=0xFFE0EA, fg=0xC01030, name='DoorSign', font=9)
    from vignettes import dollhouse, kid_bike, kiddie_pool, flowerbed, gnome, laundry_line, lamp_post
    dollhouse(kr.at(T(-14, HF, 22) * Ry(30)))
    g.blk('ChaserSpawn', (4, 6, 4), (-25, HF + 3, 28), 0xFF0000, tr=1, collide=False, tags=['ChaserSpawn'])
    kt = hi.model('Kitchen')
    P.counter(kt.at(T(5, HF, 36.4) * Ry(180)), w=24, body=0xFFFFFF, top=0xF0D8E0, top_mat='Marble')
    P.fridge(kt.at(T(17, HF, 36) * Ry(180)))
    P.table(kt.at(T(5, HF, 26)), 6, 4, 2.6, color=0xFFFFFF, mat='SmoothPlastic')
    kt.blk('Cake', (2, 1, 2), (5, HF + 3.1, 26), 0xFFF0F4, **NC)
    P.splat(kt, 5, 26, 0.7, y=HF + 3.62)
    for x, z in ((-25, 6), (-25, 28), (5, 28), (5, 8)):
        downlight(hi.at(T(0, HF + WH - 0.2 - CH, 0)), x, z, color=0xFFD0E0, bright=0.5, rng=14)
    # yard
    flowerbed(s.at(T(-40, FL + 0.25, -41)), 18)
    flowerbed(s.at(T(12, FL + 0.25, -41)), 18)
    gnome(s.at(T(-24, FL + 0.25, -40) * Ry(160)))
    kid_bike(s.at(T(30, FL + 0.25, -14) * Ry(40)))
    kiddie_pool(s.at(T(30, FL + 0.25, 10)))
    sw = s.model('Swing')
    for x in (-60, -48):
        sw.beam('A1', (x, FL, -30), (x, FL + 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
        sw.beam('A2', (x, FL, -24), (x, FL + 9, -27), 0.4, 0.4, 0xD04040, 'Metal')
    sw.box('Top', -60, FL + 8.8, -27.2, -48, FL + 9.2, -26.8, 0xD04040, 'Metal')
    for x in (-56, -52):
        for dx in (-0.8, 0.8):
            sw.blk('Rope', (0.08, 6, 0.08), (x + dx, FL + 5.8, -27), 0x3A3A3A, **NC)
        sw.blk('Seat', (2, 0.2, 0.9), (x, FL + 2.8, -27), 0x2A2A2A)
    dh = s.model('DogHouse')
    dh.box('Body', 25, FL + 0.25, -30, 31, FL + 4.5, -24, 0xA06A3A, 'WoodPlanks')
    dh.blk('RoofL', (6.6, 0.4, 4.4), (28, FL + 5.6, -28.4), 0x5A3A2A, 'WoodPlanks', rot=Rx(40))
    dh.blk('RoofR', (6.6, 0.4, 4.4), (28, FL + 5.6, -25.6), 0x5A3A2A, 'WoodPlanks', rot=Rx(-40))
    dh.box('Opening', 26.6, FL + 0.3, -30.05, 29.4, FL + 3.2, -29.9, 0x111111)
    P.sign(dh, '물어요', 28, FL + 4.0, -30.1, '-z', 2, 0.6, bg=0xFFFFFF, fg=0xB01010, name='Bites', font=9)
    lamp_post(s.at(T(-20, FL, -47)))
    lamp_post(s.at(T(36, FL, -47)))
    Q.footprints(s.at(T(0, FL + 0.25, 0)), (55, -11.5), (-11, -14), color=0x5A1A14, small=True, step=1.2)
    P.wall_text(s, '수민이 집에 들어가지 마', -78.5, FL + 8, 0, '+x', 16, 2.4, fg=0x8A1010)


# ===================================================================== B1 파르티르레트
def tie_wall(b, x0, x1, z, facing_sign, h0=FL + 1.5, rows=3):
    cols = [0x7A1020, 0x1A2A5A, 0x2A4A2A, 0xC8A24A, 0x5A1A5A, 0x1A1A1A, 0x8A6A3A, 0xA03030, 0x2A3A6A]
    for r in range(rows):
        y = h0 + r * 2.6
        b.box('TieRail', x0, y + 2.3, z - 0.08, x1, y + 2.4, z + 0.08, BRASS, 'Metal', **NC)
        x = x0 + 0.35
        while x < x1 - 0.3:
            b.blk('Tie', (0.32, 2.1, 0.05), (x, y + 1.2, z + facing_sign * 0.12), R.choice(cols), 'Fabric', **DEC)
            x += 0.45


def vitrine(b, special=False):
    m = b.model('Vitrine')
    m.box('Plinth', -2.5, FL, -1.5, 2.5, FL + 3, 1.5, WALNUT_D, 'Wood')
    m.box('BrassBand', -2.55, FL + 2.85, -1.55, 2.55, FL + 3.0, 1.55, BRASS, 'Metal', **DEC)
    m.box('Glass', -2.4, FL + 3.0, -1.4, 2.4, FL + 5.6, 1.4, 0xC8D8E0, 'Glass', tr=0.7)
    m.box('VelvetBed', -2.2, FL + 3.0, -1.2, 2.2, FL + 3.1, 1.2, 0x2A0A10, 'Fabric', **DEC)
    for k in range(3 if not special else 1):
        m.blk('Tie', (0.45, 0.05, 2.0), (-1.2 + k * 1.2 if not special else 0, FL + 3.15, 0), R.choice([0x7A1020, 0x1A2A5A, 0xC8A24A]), 'Fabric', rot=Ry(R.uniform(-10, 10)), **DEC)
    p = m.blk('VitrineLight', (4.4, 0.05, 0.2), (0, FL + 5.55, -1.2), 0xFFF0D8, 'Neon', **DEC)
    if special:
        P.sign(m, '비매품', 0, FL + 3.6, -1.42, '-z', 1.8, 0.5, bg=0xFFFFFF, fg=0x8A1010, name='NotForSale')
        tag(m, 'SpecialTie')
        light(p, 'SpotLight', 0xFFE0B0, 0.9, 6, True, 'Bottom', 70)


def fB1(fb, F):
    s = fb.model('Partirlette')
    g = fb.model('Gameplay')
    # basement corridor from the stairs to the shopfront
    floor_finish(s, (30, 62, -26, 2), 0x6A6660, 'Slate')
    s.box('CorridorCeiling', 30, CH, -26, 62, CH + 0.3, 2, 0xD8D6D0, shadow=False)
    wall(s, 'x', 30, 62, -26, 0x8A8680, name='CorridorS')
    wall(s, 'x', 44, 62, 2, 0x8A8680, name='CorridorN')
    east_edge(s, -26, 2, 0x8A8680)
    for x in (36, 48, 56):
        downlight(s, x, -12, color=0xF4F8FF, bright=0.5, rng=14)
    # the shop
    SX0, SX1, SZ0, SZ1 = -40, 44, -30, 30
    floor_finish(s, (SX0, SX1, SZ0, SZ1), 0x3A2418, 'WoodPlanks')
    s.box('ShopCeiling', SX0, CH, SZ0, SX1, CH + 0.3, SZ1, 0x1A1210, shadow=False)
    for (axis, a0, a1, pl, side) in (('x', SX0, SX1, SZ0, 1), ('x', SX0, SX1, SZ1, -1), ('z', SZ0, SZ1, SX0, 1)):
        if axis == 'x':
            s.box('ShopWall', a0, 0, pl - 0.25, a1, CH, pl + 0.25, 0x2A1C14, 'SmoothPlastic')
        else:
            s.box('ShopWall', pl - 0.25, 0, a0, pl + 0.25, CH, a1, 0x2A1C14, 'SmoothPlastic')
        from v2_public import fluted_panel
        fluted_panel(s, axis, a0, a1, pl, side, col=WALNUT, step=1.6)
    # shopfront: glass with brass mullions, door, renovation decals
    glass_wall(s, 'z', SZ0, SZ1, SX1, doors=[-12], frame_col=0x8A6A2A, tint=0xB8C8C8, tr=0.55)
    glass_door(s, 'z', -12, SX1, open_deg=0, hinge=1, swing=1, frame_col=0x8A6A2A)
    fasc = s.box('Fascia', SX1 - 0.4, CH - 2.2, SZ0, SX1 + 0.4, CH, SZ1, 0x1A1008, 'Wood')
    sg = P.sign(s, 'PARTIRLETTE  ·  파르티르레트', SX1 + 0.45, CH - 1.1, 0, '+x', 22, 1.6, bg=0x1A1008, fg=0xE8C87A, glow=True, name='ShopSign', font=8)
    light(sg, 'SurfaceLight', 0xFFD890, 0.7, 10, False, 'Front', 110)
    for z, t in ((4, '재오픈 준비 중 (또)'), (16, '재오픈 날짜: 미정'), (-22, '에스키모 출입 금지')):
        p = s.blk('Decal', (0.04, 1.4, 6), (SX1 + 0.12, FL + 5, z), 0xF2EEE4 if '에스키모' not in t else 0x8A1010, **DEC)
        gui_text(p, t, 'Right', bg=0xF2EEE4 if '에스키모' not in t else 0x8A1010, fg=0x2A1A10 if '에스키모' not in t else 0xFFFFFF, font=19, ppu=40)
    # track lighting
    for z in (-18, -6, 6, 18):
        s.box('Track', SX0 + 2, CH - 0.2, z - 0.1, SX1 - 2, CH - 0.05, z + 0.1, 0x1A1A1A, 'Metal', **DEC)
        for x in range(SX0 + 6, SX1 - 2, 10):
            sp = s.cyl('TrackSpot', 0.9, 0.5, (x, CH - 0.7, z), 0x1A1A1A, 'Metal', axis='y', **DEC)
            light(sp, 'SpotLight', 0xFFDCA8, 0.9, 16, (x + z) % 20 == 0, 'Left', 55)
    # tie wall at the back, mirrors, vitrines, display tables, mannequins, racks
    tie_wall(s, SX0 + 2, SX0 + 30, SZ1 - 0.62, -1)
    tie_wall(s, SX0 + 34, SX1 - 6, SZ1 - 0.62, -1)
    for z in (-20, -8, 4, 16):
        s.blk('Mirror', (0.15, 8, 3.6), (SX0 + 0.62, FL + 4.6, z), 0xC8D4D8, 'Glass', refl=0.7, **NC)
        s.blk('MirrorFrame', (0.2, 8.4, 4.0), (SX0 + 0.52, FL + 4.6, z), BRASS, 'Metal', **NC)
    for i, (x, z) in enumerate(((-24, -14), (-12, -14), (0, -14), (-24, 4), (0, 4))):
        vitrine(s.at(T(x, 0, z)), special=(i == 2))
    for x, z in ((14, -18), (14, 2)):
        tb = s.model('DisplayTable')
        tb.box('Top', x - 4, FL + 2.8, z - 2, x + 4, FL + 3.0, z + 2, WALNUT, 'Wood')
        for sx in (-1, 1):
            tb.box('Leg', x + sx * 3.5 - 0.15, FL, z - 1.7, x + sx * 3.5 + 0.15, FL + 2.8, z + 1.7, BRASS, 'Metal')
        for k in range(9):
            tb.blk('FannedTie', (0.5, 0.04, 2.8), (x - 3 + k * 0.75, FL + 3.04, z), R.choice([0x7A1020, 0x1A2A5A, 0x2A4A2A, 0xC8A24A, 0x5A1A5A]), 'Fabric',
                   rot=Ry(R.uniform(-22, 22)), **DEC)
    for i, (x, z, rot) in enumerate(((-34, -24, 40), (-32, 22, 140), (26, 22, 200), (30, -24, 300), (6, 18, 180))):
        P.mannequin(s.at(T(x, FL, z) * Ry(rot)), suit=R.choice([0x1C1E24, 0x2A2A34, 0x3A2A1E]), headless=(i == 3))
    for z in (-26, 26):
        Q.clothing_rack(s.at(T(-12, FL, z) * Ry(0 if z < 0 else 180)))
    # counter and fitting rooms
    ct = s.model('Counter')
    ct.box('Counter', 22, FL, 10, 34, FL + 3.4, 13, WALNUT_D, 'Wood')
    ct.box('CounterTop', 21.8, FL + 3.4, 9.8, 34.2, FL + 3.6, 13.2, 0xE8E0D0, 'Marble')
    ct.blk('Register', (1.6, 1.0, 1.4), (24, FL + 4.1, 11.5), INK, 'Metal')
    Q.gift_stack(ct.at(T(30, FL + 3.6, 11.5)))
    for x in (34, 38, 42):
        s.box('FittingWall', x - 0.15, FL, SZ0 + 0.25, x + 0.15, FL + 8.5, SZ0 + 7, WALNUT_D, 'Wood')
    for x in (36, 40):
        s.box('Curtain', x - 1.85, FL + 0.4, SZ0 + 7, x + 1.85, FL + 8.4, SZ0 + 7.2, 0x5A0A14, 'Fabric', **NC)
        s.box('CurtainRod', x - 2, FL + 8.4, SZ0 + 7.0, x + 2, FL + 8.6, SZ0 + 7.2, BRASS, 'Metal', **DEC)
    armchair(s.at(T(16, 0, 22) * Ry(200)), col=0x3A1A10)
    armchair(s.at(T(22, 0, 22) * Ry(160)), col=0x3A1A10)
    rug(s.at(T(19, 0, 20)), 10, 6, 0x5A1018, 0x3A0A10)
    for x in (-30, -6):
        chandelier(s, x, -5, CH - 2.2, r=1.6, n=6)
    # renovation corner
    Q.ladder_lean(s.at(T(-36, FL, -27) * Ry(180)))
    Q.paint_cans(s.at(T(-32, FL, -26)))
    for x in (-20, -16):
        s.blk('WrappedMannequin', (2.4, 7, 1.6), (x, FL + 3.5, 26.4), 0xF0F0F0, 'Glass', tr=0.35)
        P.mannequin(s.at(T(x, FL, 26.4) * Ry(180)))
    stanchions(s, [(SX1 - 4, -16 + k * 3) for k in range(4)], rope=0x5A0A14)


# ===================================================================== B2 / B3: keep the concept, add an art layer
def fB2(fb, F):
    L.b2(fb, F)
    c = F['h'] - 1
    s = fb.model('ArtLayer')
    for x in range(-74, 60, 12):
        s.box('CageBeam', x - 0.4, c - 1.2, -54, x + 0.4, c - 0.4, 54, 0xC8CCD0, 'Metal')
    for z in range(-50, 54, 12):
        s.box('CageBeamZ', -78, c - 1.2, z - 0.4, 60, c - 0.4, z + 0.4, 0xC8CCD0, 'Metal')
    for x, z in ((-40, -20), (10, 20), (30, -30)):
        p = s.blk('HeatLampHood', (3, 1.6, 3), (x, c - 2, z), 0x2A2A2A, 'Metal', **NC)
        P.bulb(s, x, c - 3, z, color=0xFF8A40, bright=1.4, rng=26, d=1.2, shadows=True)
    for _ in range(40):
        s.blk('Wisp', (R.uniform(1, 3), 0.15, 0.2), (R.uniform(-75, 58), 0.7, R.uniform(-52, 52)), 0xD8C870, 'Grass', rot=Ry(R.uniform(0, 180)), **DEC)


def fB3(fb, F):
    L.b3(fb, F)
    c = F['h'] - 1
    s = fb.model('ArtLayer')
    # greenhouse frame: steel arches with milky plastic panels under the slab
    for x in range(-74, 58, 8):
        for k in range(10):
            a0 = math.pi * k / 10
            a1 = math.pi * (k + 1) / 10
            p0 = (x, 6 + math.sin(a0) * 12, -54 + (1 - math.cos(a0)) * 54)
            p1 = (x, 6 + math.sin(a1) * 12, -54 + (1 - math.cos(a1)) * 54)
            s.beam('Arch', p0, p1, 0.35, 0.35, 0x6A6E72, 'Metal', **NC)
    for k in range(10):
        a = math.pi * (k + 0.5) / 10
        y = 6 + math.sin(a) * 12
        z = -54 + (1 - math.cos(a)) * 54
        s.blk('Panel', (132, 0.1, 11.5), (-8, min(y, c - 0.4), z), 0xC8D8C8, 'Glass', tr=0.65, rot=Rx(-math.degrees(math.atan2(math.cos(a) * 12, math.sin(a) * 54)) * 0), **NC)
    for x in range(-70, 50, 22):
        p = s.blk('SodiumLamp', (1.2, 0.8, 1.2), (x, c - 1, 0), 0xFF9A3A, 'Neon', **DEC)
        light(p, 'SpotLight', 0xFF8A3A, 0.8, 28, False, 'Bottom', 80)
    st = s.model('StripCurtain')
    for i in range(12):
        st.blk('Strip', (0.5, 10, 0.05), (48 + i * 0.6, 5, -20), 0xC8D8D0, 'Glass', tr=0.5, **NC)
    from vignettes import vB3
    vB3(fb, F)
