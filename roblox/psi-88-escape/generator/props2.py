"""Set-dressing library: the small things that make a space look lived in.

Floor props: origin on the floor, back against a wall at +Z, front facing -Z.
Wall props: origin on the wall surface, the prop sticks out toward -Z.
Ceiling props: origin on the ceiling surface, hanging toward -Y.
"""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text
import props as P
from props import R, BLACK, STEEL, DGREY, WOOD, WOOD_D, WOOD_L, GOLD, BLOOD

NC = dict(collide=False)
DEC = dict(collide=False, shadow=False, touch=False, query=False)


def _txt(b, text, w, h, pos, bg, fg, rot=None, font=19, ppu=40, glow=False):
    p = b.blk('Label', (w, h, 0.05), pos, bg, rot=rot, **DEC)
    gui_text(p, text, 'Front', bg=bg, fg=fg, font=font, ppu=ppu, glow=glow)
    return p


# ===================================================================== floor props (against a wall)
def water_cooler(b):
    m = b.model('WaterCooler')
    m.blk('Body', (1.5, 3.4, 1.5), (0, 1.7, 0), 0xE8E8EC, 'SmoothPlastic')
    m.blk('Tap', (0.5, 0.3, 0.3), (-0.3, 2.6, -0.85), 0x2050C0)
    m.blk('Tap', (0.5, 0.3, 0.3), (0.3, 2.6, -0.85), 0xC02020)
    m.blk('Tray', (1.2, 0.1, 0.5), (0, 2.0, -0.8), 0x3A3A3A)
    m.cyl('Jug', 1.8, 1.3, (0, 4.3, 0), 0x6AA8E0, 'Glass', tr=0.35)
    m.cyl('Cups', 1.2, 0.4, (0.95, 2.6, 0), 0xF0F0F0, **NC)


def vending(b, text='음료'):
    m = b.model('VendingMachine')
    m.blk('Body', (3.6, 7, 2.6), (0, 3.5, 0), R.choice([0xB0161E, 0x1E4AA0, 0xE8E8E8]), 'Metal')
    w = m.blk('Window', (2.4, 4.2, 0.1), (-0.4, 4.4, -1.31), 0x9AB8C8, 'Glass', tr=0.3)
    for r_ in range(4):
        for c_ in range(5):
            m.cyl('Can', 0.6, 0.3, (-1.3 + c_ * 0.45, 2.8 + r_ * 1.0, -1.0), R.choice([0xD02020, 0x20A040, 0xE0C020, 0x2050D0, 0xF0F0F0]),
                  'Metal', **NC)
    m.blk('Keypad', (0.7, 1.4, 0.1), (1.35, 4.4, -1.32), 0x1A1A1A)
    m.blk('Slot', (2.4, 0.6, 0.1), (-0.4, 1.2, -1.32), 0x0A0A0A)
    lp = m.blk('Glow', (2.2, 0.2, 0.05), (-0.4, 6.4, -1.33), 0xF0F0FF, 'Neon', **DEC)
    _txt(m, text, 2.4, 0.6, (-0.4, 6.4, -1.36), 0xFFFFFF, 0x1A1A1A)


def copier(b):
    m = b.model('Copier')
    m.blk('Body', (3.2, 3.2, 2.4), (0, 1.6, 0), 0xD8D8D4, 'SmoothPlastic')
    m.blk('Lid', (3.0, 0.3, 2.2), (0, 3.35, 0.05), 0xB8B8B4)
    m.blk('Panel', (1.2, 0.2, 0.7), (1.0, 3.3, -0.9), 0x2A2A2A, rot=Rx(-20))
    m.blk('Tray', (2.2, 0.15, 1.0), (-1.9, 2.3, 0), 0xC8C8C4)
    m.blk('Paper', (2.0, 0.08, 0.9), (-1.9, 2.42, 0), 0xFAFAF6, **DEC)
    for i in range(3):
        m.blk('Drawer', (2.8, 0.05, 0.05), (0, 0.5 + i * 0.7, -1.22), 0x8A8A86, **DEC)


def trash_bins(b):
    m = b.model('RecycleBins')
    for i, (col, lab) in enumerate(((0x2A6AC0, '종이'), (0xE0A020, '플라스틱'), (0x3A3A3A, '일반'))):
        x = -1.4 + i * 1.4
        m.blk('Bin', (1.25, 2.4, 1.3), (x, 1.2, 0), col, 'SmoothPlastic')
        m.blk('Lid', (1.3, 0.12, 1.35), (x, 2.45, 0), 0x2A2A2A)
        _txt(m, lab, 1.0, 0.4, (x, 1.9, -0.67), col, 0xFFFFFF)


def coat_rack(b):
    m = b.model('CoatRack')
    m.cyl('Pole', 6, 0.18, (0, 3, 0), WOOD_D, 'Wood')
    m.cyl('Base', 0.2, 1.4, (0, 0.1, 0), WOOD_D, 'Wood')
    for k in range(4):
        a = k * 90
        m.blk('Hook', (0.6, 0.1, 0.1), (0, 5.8, 0), WOOD_D, 'Wood', rot=Ry(a) * T(0.3, 0, 0) * Rz(30))
    if R.random() < 0.8:
        m.blk('Coat', (1.4, 2.8, 0.6), (0.35, 4.3, 0), R.choice([0x2A2A30, 0x6A5A4A, 0x3A4A5A, 0x8A2A2A]), 'Fabric',
              rot=Rz(-6), **NC)
    if R.random() < 0.5:
        m.blk('Bag', (0.9, 1.0, 0.4), (-0.4, 4.4, -0.1), R.choice([0x4A3A2A, 0x1A1A1A]), 'Fabric', **NC)


def umbrella_stand(b):
    m = b.model('UmbrellaStand')
    m.cyl('Stand', 1.6, 0.9, (0, 0.8, 0), 0x3A3A3A, 'Metal')
    for k in range(R.randint(1, 3)):
        m.cyl('Umbrella', 3, 0.22, (R.uniform(-0.2, 0.2), 2.0, R.uniform(-0.2, 0.2)), R.choice([0x1A1A1A, 0x2A4AA0, 0xA02A2A, 0x3A6A3A]),
              'Fabric', rot=Rz(R.uniform(-10, 10)), **NC)


def radiator(b):
    m = b.model('Radiator')
    for i in range(10):
        m.blk('Fin', (0.3, 2.2, 0.6), (-2.2 + i * 0.49, 1.3, 0), 0xE6E4DE, 'Metal')
    m.blk('Pipe', (5, 0.2, 0.2), (0, 0.25, 0), 0xC8C6C0, 'Metal')
    m.cyl('Valve', 0.3, 0.35, (2.6, 0.5, 0), 0xC0C0C0, 'Metal', axis='z')


def credenza(b, top=0x3A2A1E):
    m = b.model('Credenza')
    m.blk('Body', (6, 2.8, 1.8), (0, 1.4, 0), top, 'Wood')
    for i in range(3):
        m.blk('Door', (1.85, 2.4, 0.06), (-2 + i * 2, 1.4, -0.92), P.WOOD if top != P.WOOD else WOOD_D, 'Wood', **DEC)
        m.blk('Pull', (0.1, 0.5, 0.1), (-1.3 + i * 2, 1.6, -0.98), STEEL, 'Metal', **DEC)
    for i in range(R.randint(1, 3)):
        k = R.random()
        x = R.uniform(-2.3, 2.3)
        if k < 0.35:
            m.blk('Binder', (0.35, 1.3, 1.1), (x, 3.45, 0.1), R.choice([0x2A4A8A, 0x8A2A2A, 0x2A2A2A, 0xE0E0E0]), **NC)
        elif k < 0.6:
            P.plant(m.at(T(x, 2.8, 0)), h=2.2)
        elif k < 0.8:
            m.blk('Frame', (1.0, 1.3, 0.12), (x, 3.45, 0.4), BLACK, rot=Rx(-12), **NC)
        else:
            m.blk('Box', (1.2, 0.8, 1.0), (x, 3.2, 0), 0xB89A6A, 'Fabric', **NC)


def mini_kitchen(b):
    m = b.model('Kitchenette')
    m.blk('Cart', (2.4, 3, 1.8), (0, 1.5, 0), 0xE8E8E4, 'SmoothPlastic')
    m.blk('Microwave', (1.8, 1.1, 1.3), (0, 3.55, 0), 0x2A2A2A, 'Metal')
    m.blk('MWDoor', (1.2, 0.8, 0.05), (-0.2, 3.55, -0.67), 0x101010, 'Glass', **DEC)
    m.cyl('Kettle', 0.8, 0.6, (0.7, 4.5, 0.2), 0xE0E0E0, 'Metal', **NC)
    m.blk('CoffeeMix', (0.9, 0.5, 0.5), (-0.6, 4.35, 0.2), 0xC89A3A, **NC)
    _txt(m, '맥심', 0.8, 0.3, (-0.6, 4.35, -0.06), 0xC89A3A, 0x6A2A0A)


def stacked_chairs(b, color=0x2A2A2A):
    m = b.model('StackedChairs')
    for i in range(R.randint(3, 6)):
        m.blk('Seat', (1.6, 0.2, 1.6), (0, 1.6 + i * 0.35, 0), color, 'Plastic')
        m.blk('Back', (1.6, 1.6, 0.15), (0, 2.5 + i * 0.35, 0.75), color, 'Plastic')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Leg', (0.1, 1.6, 0.1), (sx * 0.7, 0.8, sz * 0.7), STEEL, 'Metal')


def mop_bucket(b):
    m = b.model('MopBucket')
    m.blk('Bucket', (1.4, 1.2, 1.0), (0, 0.6, 0), 0xE0C020, 'SmoothPlastic')
    m.blk('Wringer', (1.0, 0.6, 0.9), (0, 1.5, 0), 0x3A3A3A)
    m.beam('Mop', (0, 0.3, 0), (0.2, 5.2, 0.6), 0.15, 0.15, 0xC8C8C8, 'Metal', **NC)
    m.blk('MopHead', (0.6, 0.7, 0.6), (0, 0.9, 0), 0xD8D0C0, 'Fabric', **NC)
    if R.random() < 0.6:
        wet_floor(m.at(T(-1.6, 0, -0.6) * Ry(20)))


def wet_floor(b):
    m = b.model('WetFloorSign')
    for s in (-1, 1):
        m.blk('Board', (1.2, 2.2, 0.06), (0, 1.05, s * 0.35), 0xF0C020, 'SmoothPlastic', rot=Rx(s * 15))
    _txt(m, '미끄럼\n주의', 1.0, 1.0, (0, 1.2, -0.62), 0xF0C020, 0x1A1A1A, rot=Rx(15))


def tall_cabinet(b, color=0x8A8E92):
    m = b.model('StorageCabinet')
    m.blk('Body', (3, 7, 1.8), (0, 3.5, 0), color, 'Metal')
    m.blk('Seam', (0.05, 6.6, 0.05), (0, 3.5, -0.92), 0x5A5A5A, **DEC)
    m.blk('Handle', (0.1, 0.7, 0.1), (-0.2, 3.6, -0.96), STEEL, 'Metal', **DEC)
    m.blk('Handle', (0.1, 0.7, 0.1), (0.2, 3.6, -0.96), STEEL, 'Metal', **DEC)
    if R.random() < 0.6:
        m.blk('TopBox', (2, 1.2, 1.4), (R.uniform(-0.3, 0.3), 7.6, 0), 0xB89A6A, 'Fabric', rot=Ry(R.uniform(-8, 8)), **NC)


def bookcase(b, kind='books', color=WOOD_D, h=8):
    P.shelf(b, w=5, d=1.6, h=h, levels=4, kind=kind, color=color)


def files_cab(b):
    P.filing_cabinet(b, h=R.choice([4.5, 5.2]), color=R.choice([0x7E8288, 0x9A9EA4, 0x6A6E5A]), open_=R.random() < 0.15)


def printer_stand(b):
    m = b.model('PrinterStand')
    P.table(m, 2.6, 2.0, 2.8, color=0xD8D8D4, mat='SmoothPlastic')
    m.blk('Printer', (2.0, 1.2, 1.6), (0, 3.4, 0), 0xE8E8E4)
    m.blk('Out', (1.4, 0.05, 0.8), (0, 3.5, -0.6), 0xFAFAF6, **DEC)
    m.blk('Reams', (1.6, 1.0, 1.2), (0, 0.5, 0), 0xF0F0EC, **NC)


def paper_reams(b):
    m = b.model('PaperReams')
    for i in range(R.randint(3, 7)):
        m.blk('Ream', (1.6, 0.4, 1.1), (R.uniform(-0.1, 0.1), 0.2 + i * 0.4, 0), 0xF2F0E8, 'Fabric', rot=Ry(R.uniform(-6, 6)))
    _txt(m, 'A4', 0.6, 0.3, (0, 0.6, -0.57), 0xF2F0E8, 0x2A4A9A)


def boxes(b):
    P.boxes_pile(b, n=R.randint(2, 5), r=0.8)


def planter_long(b):
    m = b.model('Planter')
    m.blk('Box', (6, 1.8, 1.6), (0, 0.9, 0), 0x3A3A3A, 'Concrete')
    m.blk('Soil', (5.6, 0.1, 1.3), (0, 1.8, 0), 0x2E2016, 'Ground', **DEC)
    for i in range(6):
        m.ball('Shrub', R.uniform(1.4, 2.0), (-2.4 + i * 0.95, 2.4, R.uniform(-0.2, 0.2)), R.choice([0x3E6B35, 0x4A7A3A, 0x2E5A2A]), 'Grass')


def bench(b, color=WOOD_L):
    m = b.model('Bench')
    for i in range(3):
        m.blk('Slat', (6, 0.2, 0.45), (0, 1.8, -0.5 + i * 0.5), color, 'Wood')
    m.blk('BackSlat', (6, 0.45, 0.2), (0, 2.8, 0.75), color, 'Wood')
    m.blk('BackSlat', (6, 0.45, 0.2), (0, 3.5, 0.75), color, 'Wood')
    for x in (-2.7, 2.7):
        m.blk('Leg', (0.25, 1.8, 1.6), (x, 0.9, 0), 0x2A2A2A, 'Metal')


def whiteboard_stand(b, text=None):
    m = b.model('WhiteboardStand')
    p = m.blk('Board', (5, 3.2, 0.15), (0, 4.4, 0), 0xF8F8F6)
    gui_text(p, text or R.choice(['TODO\n- 보고서\n- 회의 3시', '탈출 경로?\n88 → 1', '■ ■ □ ■', '오늘의 목표: 생존']), 'Front',
             bg=0xF8F8F6, fg=R.choice([0x1A3A8A, 0x8A1A1A, 0x1A1A1A]), font=9, ppu=30)
    for x in (-2.3, 2.3):
        m.blk('Leg', (0.15, 5.8, 0.15), (x, 2.9, 0), STEEL, 'Metal')
        m.blk('Foot', (0.2, 0.15, 1.6), (x, 0.08, 0), STEEL, 'Metal')
    m.blk('Tray', (4, 0.12, 0.3), (0, 2.75, -0.15), STEEL, 'Metal')


def ladder_lean(b):
    m = b.model('Ladder')
    for s in (-1, 1):
        m.beam('Rail', (s * 0.7, 0, -1.4), (s * 0.7, 9, 0), 0.2, 0.3, 0xD0A020, 'Metal')
    for i in range(1, 8):
        t = i / 8
        m.blk('Rung', (1.4, 0.12, 0.12), (0, 9 * t, -1.4 + 1.4 * t), 0xB8B8B8, 'Metal')


def crate(b):
    m = b.model('Crate')
    s = R.uniform(2.4, 3.4)
    m.blk('Box', (s, s * 0.8, s), (0, s * 0.4, 0), 0x9A7A4A, 'WoodPlanks', rot=Ry(R.uniform(-8, 8)))
    if R.random() < 0.5:
        m.blk('Box2', (s * 0.7, s * 0.6, s * 0.7), (R.uniform(-0.3, 0.3), s * 0.8 + s * 0.3, 0), 0x8A6A3A, 'WoodPlanks',
              rot=Ry(R.uniform(0, 40)))


def barrel(b):
    m = b.model('Barrel')
    m.cyl('Drum', 3, 1.9, (0, 1.5, 0), R.choice([0x2A4A8A, 0x8A2A1A, 0x3A5A3A]), 'Metal')
    m.cyl('Rim', 0.15, 2.0, (0, 0.8, 0), 0x3A3A3A, 'Metal', **DEC)
    m.cyl('Rim', 0.15, 2.0, (0, 2.2, 0), 0x3A3A3A, 'Metal', **DEC)


def linen_cart(b):
    m = b.model('LinenCart')
    m.blk('Frame', (3, 3, 1.8), (0, 1.8, 0), 0xC8CCD0, 'Metal', tr=0)
    m.blk('Bag', (2.8, 2.4, 1.6), (0, 2.0, 0), 0x8AA0B8, 'Fabric')
    m.blk('Sheets', (2.6, 0.6, 1.4), (0, 3.4, 0), 0xF0F0F0, 'Fabric', rot=Rz(4))
    for sx in (-1.3, 1.3):
        for sz in (-0.7, 0.7):
            m.cyl('Wheel', 0.2, 0.5, (sx, 0.25, sz), BLACK, axis='x')


def med_cart(b, crash=False):
    m = b.model('CrashCart' if crash else 'MedCart')
    col = 0xC02020 if crash else 0x7AA0C8
    m.blk('Body', (2.4, 3.4, 1.7), (0, 2.0, 0), col, 'SmoothPlastic')
    for i in range(4):
        m.blk('Drawer', (2.2, 0.06, 0.06), (0, 0.9 + i * 0.75, -0.88), 0x2A2A2A, **DEC)
    m.blk('Top', (2.6, 0.15, 1.9), (0, 3.75, 0), 0xD8D8D8)
    if crash:
        m.blk('Defib', (1.2, 0.6, 0.9), (0.4, 4.15, 0), 0xE0C020)
    for i in range(R.randint(1, 3)):
        m.cyl('Bottle', 0.5, 0.25, (R.uniform(-1, 1), 4.1, R.uniform(-0.5, 0.5)), R.choice([0xF0F0F0, 0x7A4A1A]), 'Glass', **NC)
    for sx in (-1.0, 1.0):
        for sz in (-0.6, 0.6):
            m.cyl('Wheel', 0.2, 0.5, (sx, 0.25, sz), BLACK, axis='x')


def walker(b):
    m = b.model('Walker')
    for sx in (-0.8, 0.8):
        for sz in (-0.6, 0.6):
            m.blk('Leg', (0.12, 3, 0.12), (sx, 1.5, sz), STEEL, 'Metal')
        m.blk('Grip', (0.15, 0.15, 1.4), (sx, 3, 0), 0x3A3A3A, 'Metal')
    m.blk('Bar', (1.7, 0.12, 0.12), (0, 2.7, 0.6), STEEL, 'Metal')


def bio_bin(b):
    m = b.model('BiohazardBin')
    m.blk('Bin', (1.4, 2.2, 1.2), (0, 1.1, 0), 0xC02020, 'SmoothPlastic')
    m.blk('Lid', (1.5, 0.15, 1.3), (0, 2.25, 0), 0xA01818)
    _txt(m, '의료폐기물', 1.2, 0.4, (0, 1.4, -0.62), 0xC02020, 0xFFFFFF)


def privacy_screen(b):
    m = b.model('PrivacyScreen')
    for i in range(3):
        a = (i - 1) * 25
        m.blk('Panel', (2, 5, 0.1), (-2 + i * 2, 3.0, abs(i - 1) * -0.4), 0xA8C8C0, 'Fabric', rot=Ry(a))
        m.blk('Frame', (0.12, 6, 0.12), (-3 + i * 2, 3, 0), STEEL, 'Metal')


def bedside(b):
    m = b.model('BedsideCabinet')
    m.blk('Body', (1.6, 2.6, 1.6), (0, 1.3, 0), 0xD8DCD8, 'SmoothPlastic')
    m.blk('Drawer', (1.4, 0.05, 0.05), (0, 2.0, -0.82), 0x6A6A6A, **DEC)
    if R.random() < 0.6:
        m.cyl('Cup', 0.4, 0.3, (0.3, 2.8, 0), 0xF0F0F0, **NC)
    if R.random() < 0.4:
        m.blk('Pills', (0.3, 0.4, 0.3), (-0.3, 2.8, 0.2), 0xE8A030, **NC)


def clothing_rack(b, suits=True):
    m = b.model('ClothingRack')
    m.blk('Rail', (6, 0.15, 0.15), (0, 6.3, 0), GOLD, 'Metal')
    for x in (-2.9, 2.9):
        m.blk('Post', (0.15, 6.3, 0.15), (x, 3.15, 0), GOLD, 'Metal')
        m.blk('Foot', (0.2, 0.12, 1.6), (x, 0.06, 0), GOLD, 'Metal')
    n = R.randint(6, 10)
    for i in range(n):
        x = -2.5 + i * 5 / max(n - 1, 1)
        col = R.choice([0x1C1E24, 0x2A2A34, 0x3A2A1E, 0x4A4A52, 0x1A2A3A] if suits else [0xF0F0F0, 0xC8D8F0, 0xE8C8C8])
        m.blk('Jacket', (0.25, 3.0, 1.5), (x, 4.6, 0), col, 'Fabric', rot=Ry(R.uniform(-8, 8)), **NC)
        m.blk('Hanger', (0.05, 0.3, 1.2), (x, 6.15, 0), WOOD_D, 'Wood', **DEC)


def leather_chair(b, color=0x3A1A10):
    m = b.model('ArmChair')
    m.blk('Seat', (3, 1.2, 3), (0, 1.2, 0), color, 'Fabric')
    m.blk('Back', (3, 2.6, 0.8), (0, 2.6, 1.1), color, 'Fabric')
    for s in (-1, 1):
        m.blk('Arm', (0.6, 1.6, 3), (s * 1.3, 1.9, 0), color, 'Fabric')
    for sx in (-1, 1):
        for sz in (-1, 1):
            m.blk('Foot', (0.25, 0.6, 0.25), (sx * 1.2, 0.3, sz * 1.2), WOOD_D, 'Wood')


def pedestal_vase(b):
    m = b.model('Pedestal')
    m.blk('Column', (1.6, 4, 1.6), (0, 2, 0), 0xE8E2D6, 'Marble')
    m.blk('Cap', (2, 0.2, 2), (0, 4.1, 0), 0xE8E2D6, 'Marble')
    if R.random() < 0.6:
        m.cyl('Vase', 1.6, 1.0, (0, 5.0, 0), R.choice([0x1A3A6A, 0xC8A050, 0x2A2A2A, 0xE8E0D0]), 'Marble')
        m.cyl('VaseNeck', 0.6, 0.5, (0, 6.1, 0), R.choice([0x1A3A6A, 0xC8A050]), 'Marble')
    else:
        m.ball('Bust', 1.4, (0, 5.3, 0), 0xE8E2D6, 'Marble')
        m.blk('BustBase', (1.4, 0.8, 1.0), (0, 4.6, 0), 0xE8E2D6, 'Marble')


def grandfather_clock(b):
    m = b.model('GrandfatherClock')
    m.blk('Case', (1.8, 7.5, 1.2), (0, 3.75, 0), 0x3A1E10, 'Wood')
    m.cyl('Face', 0.1, 1.4, (0, 6.3, -0.62), 0xF0E8D0, axis='z', **DEC)
    m.blk('Hand', (0.06, 0.6, 0.05), (0, 6.5, -0.68), BLACK, rot=Rz(-40), **DEC)
    m.blk('Window', (1.0, 3, 0.05), (0, 3.4, -0.62), 0x2A1A10, 'Glass', tr=0.3, **DEC)
    m.cyl('Pendulum', 0.1, 0.6, (0, 2.6, -0.5), GOLD, 'Metal', axis='z', **DEC)


def bar_cart(b):
    m = b.model('BarCart')
    for y in (1.2, 2.8):
        m.blk('Shelf', (2.6, 0.12, 1.4), (0, y, 0), 0x2A2A2A, 'Glass', tr=0.2)
    for sx in (-1.2, 1.2):
        m.blk('Post', (0.1, 3, 0.1), (sx, 1.5, 0.6), GOLD, 'Metal')
        m.blk('Post', (0.1, 3, 0.1), (sx, 1.5, -0.6), GOLD, 'Metal')
    for i in range(4):
        m.cyl('Bottle', 1.0, 0.35, (-0.9 + i * 0.6, 3.4, 0), R.choice([0x5A3A10, 0x1A3A1A, 0xE8E8E0, 0x6A1010]), 'Glass', **NC)


def standing_lamp(b, color=0xFFD8A0, bright=0.8):
    m = b.model('FloorLamp')
    m.cyl('Base', 0.2, 1.2, (0, 0.1, 0), 0x2A2A2A, 'Metal')
    m.cyl('Pole', 5.5, 0.15, (0, 2.8, 0), 0x2A2A2A, 'Metal')
    m.cyl('Shade', 1.2, 1.6, (0, 5.8, 0), 0xE8DCC0, 'Fabric', **NC)
    P.bulb(m, 0, 5.6, 0, color=color, bright=bright, rng=14, d=0.4)


def display_case(b):
    m = b.model('DisplayCase')
    m.blk('Base', (3, 3, 1.8), (0, 1.5, 0), 0x2A1A10, 'Wood')
    m.blk('Glass', (2.8, 2.6, 1.6), (0, 4.3, 0), 0xC8D8E0, 'Glass', tr=0.6)
    for i in range(3):
        m.ball('Item', 0.6, (-0.9 + i * 0.9, 3.4, 0), R.choice([GOLD, 0xC0C0C0, 0x8A2A2A]), 'Metal', **NC)


def toy_bin(b):
    m = b.model('ToyBin')
    m.blk('Bin', (3, 1.6, 1.8), (0, 0.8, 0), R.choice([0x3A8AE0, 0xE04A4A, 0x4AB04A, 0xF0C020]), 'SmoothPlastic')
    for _ in range(6):
        m.blk('Toy', (R.uniform(0.4, 0.8),) * 3, (R.uniform(-1.1, 1.1), 1.7, R.uniform(-0.5, 0.5)),
              R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040, 0xF07AC0]), rot=Ry(R.uniform(0, 90)), **NC)


def easel(b):
    m = b.model('Easel')
    m.beam('LegL', (-1, 0, 0.4), (0, 5, 0), 0.15, 0.15, WOOD_L, 'Wood')
    m.beam('LegR', (1, 0, 0.4), (0, 5, 0), 0.15, 0.15, WOOD_L, 'Wood')
    m.beam('LegB', (0, 0, 1.4), (0, 4.6, 0.1), 0.15, 0.15, WOOD_L, 'Wood')
    p = m.blk('Paper', (2.4, 2.8, 0.05), (0, 3.4, -0.1), 0xFAF8F0, rot=Rx(-10))
    gui_text(p, R.choice(['우리 집', '무지개', '수민이 언니 (무서움)', '해님', '♥ 엄마 ♥']), 'Front', bg=0xFAF8F0,
             fg=R.choice([0xD03030, 0x3050D0, 0x30A040]), font=9, ppu=30)


def play_kitchen(b):
    m = b.model('PlayKitchen')
    m.blk('Body', (3.6, 2.4, 1.4), (0, 1.2, 0), 0xF0D0E0, 'SmoothPlastic')
    m.blk('Back', (3.6, 2, 0.2), (0, 3.4, 0.6), 0xF0D0E0)
    for x in (-0.8, 0.8):
        m.cyl('Burner', 0.1, 0.8, (x, 2.45, 0), 0x3A3A3A, **DEC)
    m.cyl('ToyPot', 0.6, 0.8, (-0.8, 2.8, 0), 0xE04040, **NC)


def cushions(b):
    m = b.model('FloorCushions')
    for i in range(R.randint(2, 4)):
        m.blk('Cushion', (2, 0.6, 2), (R.uniform(-1.5, 1.5), 0.3, R.uniform(-1.2, 0.4)),
              R.choice([0xF0A0B0, 0xA0C8F0, 0xF0E0A0, 0xB0E0B0]), 'Fabric', rot=Ry(R.uniform(0, 90)))


def kettlebell_rack(b):
    m = b.model('KettlebellRack')
    m.blk('Rack', (5, 1.6, 1.4), (0, 0.8, 0), 0x1A1A1A, 'Metal')
    for i in range(6):
        m.ball('Bell', 0.8 + i * 0.06, (-2 + i * 0.8, 2.0, 0), 0x2A2A2A, 'Metal')
        m.blk('Handle', (0.5, 0.4, 0.1), (-2 + i * 0.8, 2.55, 0), 0x2A2A2A, 'Metal', **NC)


def spin_bike(b):
    m = b.model('SpinBike')
    m.blk('Base', (0.8, 0.3, 4), (0, 0.15, 0), 0x1A1A1A, 'Metal')
    m.cyl('Flywheel', 0.5, 2, (0, 1.4, -1.2), 0x8A8A8A, 'Metal', axis='x')
    m.beam('Frame', (0, 0.3, 1.2), (0, 3.2, 0.4), 0.3, 0.3, 0xC02020, 'Metal')
    m.blk('Seat', (0.7, 0.25, 1.2), (0, 3.3, 0.5), 0x1A1A1A, 'Fabric')
    m.beam('Stem', (0, 1.4, -1.2), (0, 3.6, -1.0), 0.3, 0.3, 0xC02020, 'Metal')
    m.blk('Bars', (1.6, 0.2, 0.2), (0, 3.7, -1.0), 0x1A1A1A, 'Metal')


def rower(b):
    m = b.model('Rower')
    m.blk('Rail', (0.5, 0.3, 6), (0, 0.8, 0), 0x2A2A2A, 'Metal')
    m.blk('Seat', (0.9, 0.3, 1), (0, 1.1, 0.8), 0x1A1A1A, 'Fabric')
    m.cyl('Wheel', 0.8, 1.6, (0, 1.2, -2.8), 0x3A3A3A, 'Metal', axis='x')
    m.blk('Feet', (1.4, 0.2, 0.6), (0, 1.0, -1.6), 0x1A1A1A)


def towel_bin(b):
    m = b.model('TowelBin')
    m.blk('Bin', (2, 2.6, 1.6), (0, 1.3, 0), 0x6A7A8A, 'SmoothPlastic')
    for i in range(3):
        m.blk('Towel', (1.6, 0.35, 1.2), (R.uniform(-0.1, 0.1), 2.8 + i * 0.35, 0), R.choice([0xF0F0F0, 0x6AA8D0]), 'Fabric',
              rot=Ry(R.uniform(-15, 15)), **NC)


def lounge_chair(b):
    m = b.model('LoungeChair')
    m.blk('Bed', (2, 0.3, 5), (0, 1.2, 0.4), 0xF2F2F2, 'SmoothPlastic')
    m.blk('Back', (2, 0.3, 2.2), (0, 2.1, 2.5), 0xF2F2F2, rot=Rx(-50))
    for z in (-1.8, 1.8):
        m.blk('Leg', (2, 1.1, 0.2), (0, 0.55, z), 0xD8D8D8)
    if R.random() < 0.4:
        m.blk('Towel', (1.6, 0.1, 2.6), (0, 1.4, 0), 0x6AA8D0, 'Fabric', **NC)


def fertilizer(b):
    m = b.model('Sacks')
    for i in range(R.randint(2, 5)):
        m.blk('Sack', (2.4, 0.8, 1.5), (R.uniform(-0.2, 0.2), 0.4 + i * 0.75, 0), R.choice([0xD8C8A0, 0xB8A880, 0xE8E0C8]), 'Fabric',
              rot=Ry(R.uniform(-12, 12)))
    _txt(m, '비료 20kg', 1.6, 0.5, (0, 0.5, -0.78), 0xD8C8A0, 0x2A6A2A)


def berry_crates(b):
    m = b.model('BerryCrates')
    for i in range(R.randint(1, 3)):
        y = i * 1.1
        m.blk('Crate', (2.6, 1.0, 1.6), (0, 0.5 + y, 0), 0x6A4A2A, 'WoodPlanks')
        for k in range(6):
            m.ball('Berry', 0.45, (-1 + k * 0.4, 1.05 + y, R.uniform(-0.4, 0.4)), R.choice([0x8A0A1E, 0x5A0A3A]), **NC)


def seedling_shelf(b):
    m = b.model('SeedlingShelf')
    for lv in range(3):
        y = 0.8 + lv * 1.8
        m.blk('Tray', (5, 0.2, 1.6), (0, y, 0), 0x2A2A2A, 'Metal')
        for k in range(8):
            m.ball('Sprout', 0.4, (-2.2 + k * 0.62, y + 0.35, R.uniform(-0.4, 0.4)), 0x3A6A2A, 'Grass', **NC)
    for x in (-2.4, 2.4):
        m.blk('Post', (0.12, 5.6, 0.12), (x, 2.8, 0.7), STEEL, 'Metal')
        m.blk('Post', (0.12, 5.6, 0.12), (x, 2.8, -0.7), STEEL, 'Metal')


def watering_can(b):
    m = b.model('WateringCan')
    m.cyl('Body', 1.0, 0.9, (0, 0.5, 0), 0x3A8A5A, 'Metal')
    m.beam('Spout', (0.3, 0.6, 0), (1.0, 1.1, 0), 0.15, 0.15, 0x3A8A5A, 'Metal', **NC)


def lab_table(b):
    m = b.model('LabTable')
    P.table(m, 5, 2.2, 3, color=0xE8E8E8, mat='SmoothPlastic', leg=STEEL)
    m.blk('Microscope', (0.5, 1.2, 0.6), (-1.5, 3.6, 0), 0x2A2A2A, 'Metal')
    for i in range(4):
        m.cyl('Jar', 0.7, 0.45, (0 + i * 0.6, 3.35, 0.3), 0x9AC8A0, 'Glass', tr=0.4, **NC)
        m.ball('Specimen', 0.25, (0 + i * 0.6, 3.25, 0.3), 0x8A0A1E, **NC)
    m.blk('Notes', (0.9, 0.03, 1.2), (1.6, 3.02, -0.2), 0xF2F0E8, rot=Ry(20), **DEC)


def speaker_tower(b):
    m = b.model('Speaker')
    m.blk('Cab', (2, 4.5, 1.6), (0, 2.25, 0), 0x1A1A1A, 'Fabric')
    m.cyl('Woofer', 0.1, 1.5, (0, 1.4, -0.82), 0x2A2A2A, axis='z', **DEC)
    m.cyl('Tweeter', 0.1, 0.6, (0, 3.4, -0.82), 0x3A3A3A, axis='z', **DEC)


def buffet(b):
    m = b.model('BuffetTable')
    P.table(m, 7, 2.4, 3, color=0x5A3A2A, cloth=0xF2EEE6)
    for i in range(3):
        m.blk('Tray', (1.8, 0.3, 1.2), (-2.3 + i * 2.3, 3.25, 0), STEEL, 'Metal')
        m.blk('Food', (1.6, 0.15, 1.0), (-2.3 + i * 2.3, 3.45, 0), R.choice([0xC83A1A, 0xE8D8A0, 0x5A8A3A, 0x8A0A14]), **NC)


def gift_stack(b):
    m = b.model('Gifts')
    for i in range(R.randint(2, 4)):
        s = R.uniform(1, 1.8)
        x, z = R.uniform(-1, 1), R.uniform(-0.6, 0.4)
        m.blk('Gift', (s, s * 0.8, s), (x, s * 0.4, z), R.choice([0xC01020, 0xF2EEE6, 0xF2C84A, 0x2A2A2A]), 'Fabric', rot=Ry(R.uniform(0, 45)))
        m.blk('Ribbon', (s + 0.02, s * 0.8 + 0.02, 0.15), (x, s * 0.4, z), GOLD, 'Fabric', rot=Ry(R.uniform(0, 45)), **DEC)


def shoe_pile(b):
    m = b.model('Shoes')
    for i in range(R.randint(3, 7)):
        m.blk('Shoe', (0.6, 0.4, 1.2), (R.uniform(-1.5, 1.5), 0.2, R.uniform(-0.6, 0.6)),
              R.choice([0x2A2A2A, 0xF0F0F0, 0x8A3030, 0x30508A, 0xC8A070]), rot=Ry(R.uniform(0, 360)), **NC)


def laundry_basket(b):
    m = b.model('LaundryBasket')
    m.blk('Basket', (2, 1.6, 1.5), (0, 0.8, 0), 0xE8E0D0, 'Fabric')
    for i in range(4):
        m.blk('Clothes', (R.uniform(0.8, 1.6), 0.4, R.uniform(0.6, 1.2)), (R.uniform(-0.4, 0.4), 1.7 + i * 0.15, R.uniform(-0.3, 0.3)),
              R.choice([0x3A4A6A, 0xE8E8E8, 0x8A2A2A, 0x2A2A2A, 0x6A8A5A]), 'Fabric', rot=Ry(R.uniform(0, 90)), **NC)


def trash_bags(b):
    m = b.model('TrashBags')
    for i in range(R.randint(2, 4)):
        m.ball('Bag', R.uniform(1.4, 2.0), (R.uniform(-1, 1), 0.8, R.uniform(-0.5, 0.3)), R.choice([0x1A1A1A, 0x2A2A2A, 0x5A6A8A]), 'Plastic')


def guitar(b):
    m = b.model('Guitar')
    g = m.at(T(0, 0, 0.3) * Rx(-12))
    g.blk('Body', (1.6, 1.8, 0.4), (0, 1.0, 0), 0xA0602A, 'Wood')
    g.blk('Neck', (0.25, 2.4, 0.15), (0, 3.0, 0), 0x3A2A1A, 'Wood')
    g.cyl('Hole', 0.05, 0.5, (0, 1.2, -0.22), BLACK, axis='z', **DEC)


def backpack(b):
    m = b.model('Backpack')
    m.blk('Pack', (1.4, 1.8, 0.8), (0, 0.9, 0), R.choice([0x2A3A5A, 0x1A1A1A, 0x8A2A2A, 0x3A5A3A]), 'Fabric', rot=Rx(-8))
    m.blk('Pocket', (1.0, 0.8, 0.3), (0, 0.6, -0.5), 0x2A2A2A, 'Fabric', **NC)


def chew_blocks(b):
    m = b.model('ChewToys')
    for _ in range(R.randint(2, 4)):
        s = R.uniform(1.4, 2.6)
        m.blk('WoodBlock', (s, s, s), (R.uniform(-1.5, 1.5), s / 2 + 0.6, R.uniform(-1, 0.5)), 0xD8B07A, 'Wood', rot=Ry(R.uniform(0, 90)))


def hay_bale(b):
    m = b.model('HayBale')
    m.blk('Bale', (4, 2.4, 2.4), (0, 1.8, 0), 0xD8C870, 'Grass')
    for z in (-0.6, 0.6):
        m.blk('Twine', (4.02, 2.42, 0.1), (0, 1.8, z), 0x8A6A3A, 'Fabric', **DEC)


def cone(b):
    m = b.model('TrafficCone')
    m.blk('Base', (1.2, 0.15, 1.2), (0, 0.08, 0), 0xE05A10)
    m.wedge('ConeA', (0.8, 2, 0.4), T(0, 1.1, -0.2), 0xF06A1A)
    m.wedge('ConeB', (0.8, 2, 0.4), T(0, 1.1, 0.2) * Ry(180), 0xF06A1A)
    m.blk('Stripe', (0.62, 0.3, 0.62), (0, 1.3, 0), 0xF0F0F0, **DEC)


def work_light(b):
    m = b.model('WorkLight')
    for a in (0, 120, 240):
        m.beam('Leg', (math.cos(math.radians(a)) * 1.0, 0, math.sin(math.radians(a)) * 1.0), (0, 5, 0), 0.12, 0.12, 0xE0C020, 'Metal')
    m.blk('Lamp', (1.4, 1.0, 0.5), (0, 5.6, -0.2), 0xE0C020, 'Metal', rot=Rx(25))
    p = m.blk('Lens', (1.2, 0.8, 0.05), (0, 5.5, -0.48), 0xFFF4D8, 'Neon', rot=Rx(25), **DEC)
    light(p, 'SpotLight', 0xFFF0D0, 2.2, 32, True, 'Front', 70)
    m.beam('Cable', (0, 5, 0), (1.5, 0.05, -1.5), 0.08, 0.08, BLACK, **DEC)


def tarp_furniture(b):
    m = b.model('TarpCovered')
    w, h = R.uniform(3, 6), R.uniform(2.5, 4)
    m.blk('Lump', (w, h, 2.2), (0, h / 2, 0), 0xD8D4C8, 'Fabric')
    m.blk('Drape', (w + 0.6, 0.3, 2.8), (0, h, 0), 0xD8D4C8, 'Fabric', rot=Rz(R.uniform(-4, 4)), **NC)


def sandbags(b):
    m = b.model('Sandbags')
    for row in range(2):
        for i in range(3 - row):
            m.blk('Bag', (1.8, 0.7, 1.1), (-1.8 + i * 1.8 + row * 0.9, 0.35 + row * 0.7, 0), 0xB8A880, 'Fabric', rot=Ry(R.uniform(-5, 5)))


def server_cab(b):
    m = b.model('ServerCabinet')
    m.blk('Body', (2.4, 7, 2.4), (0, 3.5, 0), 0x15161A, 'Metal')
    for j in range(6):
        m.blk('LED', (0.1, 0.1, 0.1), (R.uniform(-0.9, 0.9), 1.5 + j * 0.9, -1.22), R.choice([0x2AFF6A, 0xFFB02A, 0x2AFF6A]), 'Neon', **DEC)
    m.blk('Mesh', (2.0, 6.4, 0.05), (0, 3.5, -1.22), 0x2A2A2E, 'DiamondPlate', **DEC)


def condiment_station(b):
    m = b.model('CondimentStation')
    P.table(m, 4, 1.8, 3, color=0xE8E2D6, mat='SmoothPlastic', leg=STEEL)
    for i in range(5):
        m.cyl('Bottle', 0.9, 0.35, (-1.5 + i * 0.7, 3.45, 0), R.choice([0xC02020, 0xE0C020, 0x2A2A2A, 0xF0F0F0]), **NC)
    m.blk('Napkins', (0.8, 0.6, 0.5), (1.6, 3.3, 0.3), 0xF0F0F0, **NC)
    m.blk('Spoons', (0.6, 0.8, 0.4), (-1.6, 3.4, 0.4), STEEL, 'Metal', **NC)


def tray_stack(b):
    m = b.model('TrayStack')
    P.table(m, 3, 2, 2.6, color=STEEL, mat='Metal', leg=STEEL)
    for i in range(R.randint(6, 14)):
        m.blk('Tray', (2.2, 0.08, 1.6), (R.uniform(-0.05, 0.05), 2.65 + i * 0.09, 0), 0x7A8A9A, rot=Ry(R.uniform(-3, 3)), **NC)


def veg_crates(b):
    m = b.model('VegCrates')
    for i in range(R.randint(1, 3)):
        m.blk('Crate', (2.2, 1.0, 1.5), (R.uniform(-0.1, 0.1), 0.5 + i * 1.0, 0), 0x3A6A3A, 'Plastic')
        for k in range(5):
            m.ball('Veg', 0.5, (-0.8 + k * 0.4, 1.05 + i * 1.0, R.uniform(-0.3, 0.3)), R.choice([0xE05A20, 0x3A8A2A, 0xF0F0E0, 0xC02020]), **NC)


def stroller(b):
    m = b.model('Stroller')
    m.blk('Seat', (1.6, 1.6, 2), (0, 2.2, 0), 0x3A5A8A, 'Fabric')
    m.blk('Hood', (1.7, 1.0, 1.2), (0, 3.2, 0.6), 0x2A4A7A, 'Fabric', rot=Rx(20))
    m.beam('Handle', (0, 2.2, 1), (0, 4.2, 2.0), 0.15, 0.15, 0x2A2A2A, 'Metal')
    for sx in (-0.7, 0.7):
        for sz in (-0.8, 0.8):
            m.cyl('Wheel', 0.15, 0.8, (sx, 0.4, sz), BLACK, axis='x')


def shoe_display(b):
    m = b.model('ShoeDisplay')
    for lv in range(4):
        m.blk('Shelf', (5, 0.12, 1.4), (0, 0.6 + lv * 1.5, 0), 0x1E1410, 'Wood')
        for k in range(3):
            m.blk('Shoe', (0.6, 0.45, 1.2), (-1.6 + k * 1.6, 0.9 + lv * 1.5, 0), R.choice([0x1A0E08, 0x3A1E10, 0x0A0A0A]), 'Fabric',
                  rot=Ry(15), **NC)
    m.blk('Back', (5, 6.4, 0.15), (0, 3.2, 0.7), 0x1E1410, 'Wood')


def tri_mirror(b):
    m = b.model('TriMirror')
    for i, a in enumerate((-30, 0, 30)):
        m.blk('Mirror', (2, 7, 0.15), (-2 + i * 2, 3.6, -abs(i - 1) * 0.5), 0xC8D4D8, 'Glass', refl=0.75, rot=Ry(a))
    m.blk('Platform', (4, 0.4, 2.4), (0, 0.2, -1.5), 0x1E1410, 'Wood')


def paint_cans(b):
    m = b.model('PaintCans')
    for i in range(R.randint(2, 5)):
        m.cyl('Can', 1.0, 0.9, (R.uniform(-1.2, 1.2), 0.5, R.uniform(-0.5, 0.3)), R.choice([0xE8E8E8, 0xD8D0C0, 0x8A2A2A]), 'Metal')
    m.blk('DropCloth', (3, 0.05, 2), (0, 0.03, -0.3), 0xE8E0D0, 'Fabric', rot=Ry(10), **DEC)


def atm(b):
    m = b.model('ATM')
    m.blk('Body', (2.6, 6, 2), (0, 3, 0), 0x2A3A5A, 'Metal')
    scr = m.blk('Screen', (1.4, 1.0, 0.1), (0, 4.4, -1.02), 0x0A1A2A, rot=Rx(-10))
    gui_text(scr, '거래 불가\n(평행세계 계좌)', 'Front', bg=0x0A1A2A, fg=0x6AC8FF, glow=True, font=10, ppu=40)
    m.blk('Keypad', (1.0, 0.1, 0.7), (0, 3.4, -1.1), 0xC0C0C0, 'Metal')
    _txt(m, 'ATM', 1.6, 0.5, (0, 5.6, -1.03), 0x2A3A5A, 0xFFFFFF)


def newspaper_rack(b):
    m = b.model('NewspaperRack')
    m.blk('Frame', (2.4, 4, 1.2), (0, 2, 0), 0x2A2A2A, 'Metal')
    for lv in range(3):
        p = m.blk('Paper', (2.0, 1.0, 0.1), (0, 1.0 + lv * 1.2, -0.6), 0xF0EDE4, rot=Rx(-15))
        gui_text(p, R.choice(['PSI 일보\n88층 실종', '평행세계 신문', '오늘의 날씨: 붉음']), 'Front', bg=0xF0EDE4, fg=0x1A1A1A, font=19, ppu=40)


# ===================================================================== wall-mounted props
def poster(b, text=None, bg=None, fg=None, w=2.4, h=3.2):
    m = b.model('Poster')
    m.blk('Frame', (w + 0.2, h + 0.2, 0.08), (0, 0, -0.04), 0x1A1A1A, 'Metal', **DEC)
    p = m.blk('Print', (w, h, 0.05), (0, 0, -0.1), bg or 0xF0EDE4, **DEC)
    gui_text(p, text or '안전 제일', 'Front', bg=bg or 0xF0EDE4, fg=fg or 0x1A1A1A, font=19, ppu=40)


def frame_art(b, w=None, h=None, gold=False):
    w, h = w or R.uniform(2, 4.5), h or R.uniform(1.8, 3.2)
    m = b.model('FramedArt')
    m.blk('Frame', (w + 0.3, h + 0.3, 0.15), (0, 0, -0.08), GOLD if gold else R.choice([0x1A1A1A, WOOD_D, 0xE8E8E8]),
          'Metal' if gold else 'Wood', **DEC)
    m.blk('Canvas', (w, h, 0.05), (0, 0, -0.18), R.choice([0x2A3A5A, 0x8A6A4A, 0x3A5A4A, 0xC8B89A, 0x5A2A2A]), **DEC)
    for _ in range(3):
        m.blk('Stroke', (R.uniform(0.3, w * 0.7), R.uniform(0.15, h * 0.4), 0.03), (R.uniform(-w / 3, w / 3), R.uniform(-h / 3, h / 3), -0.22),
              R.choice([0xE0C080, 0x1A1A1A, 0xA03030, 0xE8E8E8, 0x4A7A9A]), rot=Rz(R.uniform(-30, 30)), **DEC)


def notice_board(b):
    m = b.model('NoticeBoard')
    m.blk('Cork', (5, 3.2, 0.12), (0, 0, -0.06), 0xA8845A, 'Fabric', **DEC)
    m.blk('Frame', (5.3, 3.5, 0.08), (0, 0, -0.02), WOOD_D, 'Wood', **DEC)
    for _ in range(R.randint(5, 9)):
        c = R.choice([0xFAFAF6, 0xF8F0A0, 0xA0D0F0, 0xF0B0C0])
        x, y = R.uniform(-2, 2), R.uniform(-1.2, 1.2)
        m.blk('Note', (R.uniform(0.7, 1.4), R.uniform(0.8, 1.2), 0.03), (x, y, -0.14), c, rot=Rz(R.uniform(-8, 8)), **DEC)
        m.ball('Pin', 0.12, (x, y + 0.45, -0.18), R.choice([0xE02020, 0x2060E0, 0x20A040]), **DEC)
    p = m.blk('Title', (2.2, 0.5, 0.03), (0, 1.45, -0.15), 0xFFFFFF, **DEC)
    gui_text(p, R.choice(['공지사항', '알림', '회식 안내', '분실물']), 'Front', bg=0xFFFFFF, fg=0x1A1A1A, font=19, ppu=40)


def clock(b, label=None):
    m = b.model('WallClock')
    m.cyl('Rim', 0.2, 1.6, (0, 0, -0.1), 0x1A1A1A, 'Metal', axis='z', **DEC)
    m.cyl('Face', 0.05, 1.4, (0, 0, -0.22), 0xF8F8F4, axis='z', **DEC)
    a1, a2 = R.uniform(0, 360), R.uniform(0, 360)
    m.blk('Hour', (0.08, 0.4, 0.03), (0, 0, -0.26), BLACK, rot=Rz(a1) * T(0, 0.2, 0), **DEC)
    m.blk('Minute', (0.06, 0.6, 0.03), (0, 0, -0.28), BLACK, rot=Rz(a2) * T(0, 0.3, 0), **DEC)
    if label:
        _txt(m, label, 1.6, 0.35, (0, -1.1, -0.06), 0x1A1A1A, 0xE8E8E8)


def extinguisher(b):
    m = b.model('FireExtinguisher')
    m.blk('Bracket', (0.6, 0.3, 0.3), (0, 0.6, -0.15), 0x3A3A3A, 'Metal', **DEC)
    m.cyl('Tank', 2.0, 0.7, (0, -0.4, -0.45), 0xC01818, 'SmoothPlastic', **NC)
    m.blk('Valve', (0.3, 0.4, 0.3), (0, 0.8, -0.45), 0x1A1A1A, **DEC)
    m.beam('Hose', (0.2, 0.7, -0.45), (0.35, -0.8, -0.7), 0.1, 0.1, BLACK, **DEC)
    p = m.blk('Sign', (1.0, 0.7, 0.03), (0, 2.0, -0.02), 0xC01818, **DEC)
    gui_text(p, '소화기', 'Front', bg=0xC01818, fg=0xFFFFFF, font=19, ppu=40)


def fire_alarm(b):
    m = b.model('FireAlarm')
    m.blk('Box', (1.0, 1.4, 0.3), (0, 0, -0.15), 0xC01818, **DEC)
    m.cyl('Bell', 0.2, 0.7, (0, 0.3, -0.35), 0xD02020, 'Metal', axis='z', **DEC)
    m.blk('Button', (0.4, 0.4, 0.1), (0, -0.35, -0.33), 0xF0F0F0, **DEC)


def switch_outlet(b):
    m = b.model('Switch')
    m.blk('Plate', (0.45, 0.7, 0.06), (0, 0, -0.03), 0xF0F0EC, **DEC)
    m.blk('Rocker', (0.2, 0.3, 0.05), (0, 0, -0.07), 0xE8E8E4, **DEC)


def outlet(b):
    m = b.model('Outlet')
    m.blk('Plate', (0.5, 0.5, 0.06), (0, 0, -0.03), 0xF0F0EC, **DEC)
    for x in (-0.1, 0.1):
        m.cyl('Hole', 0.02, 0.06, (x, 0, -0.07), BLACK, axis='z', **DEC)


def thermostat(b):
    m = b.model('Thermostat')
    m.blk('Body', (0.7, 0.9, 0.12), (0, 0, -0.06), 0xF0F0EC, **DEC)
    p = m.blk('LCD', (0.5, 0.3, 0.02), (0, 0.15, -0.13), 0x1A2A1A, **DEC)
    gui_text(p, R.choice(['24°C', '18°C', '88°C']), 'Front', bg=0x1A2A1A, fg=0x8AFF8A, glow=True, font=10, ppu=60)


def ac_unit(b):
    m = b.model('WallAC')
    m.blk('Body', (5, 1.6, 1.0), (0, 0, -0.5), 0xF4F4F0, 'SmoothPlastic', **NC)
    m.blk('Vent', (4.6, 0.3, 0.05), (0, -0.6, -1.02), 0x6A6A6A, **DEC)
    m.blk('LED', (0.15, 0.08, 0.03), (2.0, -0.3, -1.02), 0x2AFF6A, 'Neon', **DEC)


def vent_grille(b):
    m = b.model('VentGrille')
    m.blk('Frame', (2.4, 1.4, 0.08), (0, 0, -0.04), 0xC8C8C4, 'Metal', **DEC)
    for i in range(5):
        m.blk('Slat', (2.2, 0.08, 0.1), (0, -0.5 + i * 0.25, -0.1), 0x6A6A66, 'Metal', **DEC)


def evac_map(b):
    m = b.model('EvacMap')
    m.blk('Frame', (2.6, 1.9, 0.06), (0, 0, -0.03), 0x1A6A3A, **DEC)
    p = m.blk('Map', (2.4, 1.7, 0.03), (0, 0, -0.08), 0xF8F8F4, **DEC)
    gui_text(p, '피난 안내도\n▣ 현재 위치\n→ 비상계단', 'Front', bg=0xF8F8F4, fg=0x1A6A3A, font=19, ppu=40)


def sconce(b, color=0xFFD0A0, bright=0.5):
    m = b.model('Sconce')
    m.blk('Plate', (0.5, 0.8, 0.1), (0, 0, -0.05), GOLD, 'Metal', **DEC)
    m.cyl('Shade', 0.8, 0.7, (0, 0.2, -0.5), 0xF0E0C0, 'Fabric', **DEC)
    P.bulb(m, 0, 0.1, -0.5, color=color, bright=bright, rng=10, d=0.3)


def coat_hooks(b, small=False):
    m = b.model('CoatHooks')
    w = 4 if not small else 3
    m.blk('Board', (w, 0.5, 0.15), (0, 0, -0.08), WOOD_L, 'Wood', **DEC)
    for i in range(4):
        x = -w / 2 + 0.5 + i * (w - 1) / 3
        m.blk('Hook', (0.1, 0.1, 0.4), (x, 0, -0.35), STEEL, 'Metal', **DEC)
        if R.random() < 0.6:
            s = 0.6 if small else 1.0
            m.blk('Coat', (1.0 * s, 2.4 * s, 0.4), (x, -1.2 * s, -0.4), R.choice([0x2A2A30, 0x6A5A4A, 0xC03040, 0x3A6AA0, 0xE0C020]),
                  'Fabric', **NC)


def mirror(b, w=3, h=4):
    m = b.model('Mirror')
    m.blk('Frame', (w + 0.2, h + 0.2, 0.08), (0, 0, -0.04), 0xD8D8D8, 'Metal', **DEC)
    m.blk('Glass', (w, h, 0.05), (0, 0, -0.1), 0xC8D4D8, 'Glass', refl=0.8, **DEC)


def calendar(b, text=None):
    m = b.model('Calendar')
    p = m.blk('Page', (1.6, 2.2, 0.03), (0, 0, -0.03), 0xFAFAF6, **DEC)
    gui_text(p, text or R.choice(['11월\n▢▢▢▢▢\n▢▢▢▢▢\n▢▢▢▢▢', 'NOV\n88', '11\n✕✕✕✕✕✕✕']), 'Front', bg=0xFAFAF6, fg=0x8A1010,
             font=19, ppu=40)


def pipe_vertical(b, h=10):
    m = b.model('PipeRun')
    m.cyl('Pipe', h, 0.5, (0, 0, -0.45), R.choice([0x8A8A86, 0xB8B4AC, 0x6A6A66]), 'Metal', **DEC)
    for y in (-h / 3, h / 3):
        m.blk('Clamp', (0.7, 0.2, 0.6), (0, y, -0.3), 0x5A5A5A, 'Metal', **DEC)


def grime(b, w=None, h=None):
    """Water-damage streaks running down from the ceiling line."""
    w = w or R.uniform(1.5, 4)
    h = h or R.uniform(3, 7)
    for i in range(R.randint(3, 6)):
        L = R.uniform(h * 0.4, h)
        b.blk('Grime', (R.uniform(0.15, 0.5), L, 0.03), (R.uniform(-w / 2, w / 2), -L / 2, -0.03),
              R.choice([0x5A4A3A, 0x6A5A48, 0x4A3E32]), tr=0, **DEC)


def crack(b):
    x, y = 0, 0
    for i in range(R.randint(4, 8)):
        L = R.uniform(0.6, 1.6)
        a = R.uniform(-60, 60) + (180 if R.random() < 0.3 else 0)
        nx, ny = x + math.sin(math.radians(a)) * L, y - math.cos(math.radians(a)) * L
        b.beam('Crack', (x, y, -0.03), (nx, ny, -0.03), 0.06, 0.06, 0x1A1A1A, **DEC)
        x, y = nx, ny


def sanitizer(b):
    m = b.model('Sanitizer')
    m.blk('Body', (0.7, 1.1, 0.5), (0, 0, -0.25), 0xF0F0F0, **DEC)
    m.blk('Window', (0.4, 0.4, 0.03), (0, 0.15, -0.52), 0x8AC0E0, 'Glass', **DEC)
    m.blk('Push', (0.5, 0.2, 0.1), (0, -0.4, -0.5), 0x2A6AC0, **DEC)


def headwall(b):
    """Hospital bed-head panel: rail, oxygen outlets, lamp, call button."""
    m = b.model('Headwall')
    m.blk('Panel', (6, 1.4, 0.3), (0, 0, -0.15), 0xD8E0DC, **DEC)
    for x in (-2, -1.4):
        m.cyl('Outlet', 0.1, 0.35, (x, 0, -0.35), 0x2A8A3A if x < -1.7 else 0x2A2A2A, axis='z', **DEC)
    m.blk('Call', (0.4, 0.4, 0.1), (2.2, 0, -0.35), 0xC02020, **DEC)
    p = m.blk('Lamp', (1.6, 0.2, 0.2), (0.5, 0.5, -0.35), 0xF0F8F0, 'Neon', **DEC)


def wall_tv(b, text=None):
    m = b.model('WallTV')
    m.blk('Bracket', (1, 1, 0.6), (0, 0, -0.3), 0x2A2A2A, 'Metal', **DEC)
    s = m.blk('Screen', (5, 2.9, 0.2), (0, 0, -0.7), BLACK, **DEC)
    gui_text(s, text or R.choice(['', '■ 뉴스 속보 ■\nPSI 건물 88층', '정규 방송 종료']), 'Front', bg=0x0A0A0C, fg=0xC8C8C8, glow=True, font=19, ppu=30)


def lifebuoy(b):
    m = b.model('Lifebuoy')
    for k in range(10):
        a = k / 10 * math.tau
        m.blk('Ring', (0.8, 0.45, 0.45), (math.cos(a) * 0.9, math.sin(a) * 0.9, -0.3), 0xE04020 if k % 2 else 0xF0F0F0,
              rot=Rz(math.degrees(a) + 90), **DEC)


def height_chart(b):
    m = b.model('HeightChart')
    m.blk('Strip', (1.0, 5, 0.03), (0, 0, -0.02), 0xFAF0A0, **DEC)
    for i in range(10):
        m.blk('Tick', (0.5, 0.06, 0.02), (-0.2, -2.3 + i * 0.5, -0.05), 0x2A2A2A, **DEC)
    for i, n in enumerate(['지우', '민준', '수민']):
        p = m.blk('Mark', (0.8, 0.3, 0.02), (0.15, -1.6 + i * 0.6 + (1.6 if n == '수민' else 0), -0.06), 0xFFFFFF, **DEC)
        gui_text(p, n, 'Front', bg=0xFFFFFF, fg=0xC02020 if n == '수민' else 0x2A2A2A, font=9, ppu=60)


def kid_drawing(b):
    p = b.blk('Drawing', (R.uniform(1.6, 2.4), R.uniform(1.2, 1.8), 0.03), (0, 0, -0.02), 0xFAF8F0, rot=Rz(R.uniform(-8, 8)), **DEC)
    gui_text(p, R.choice(['우리 반', '♥', '수민이 언니\n무서워', '해님 ☀', '고양이', '도와줘', '집에 가고 싶어', '무지개 🌈']), 'Front',
             bg=0xFAF8F0, fg=R.choice([0xD03030, 0x3050D0, 0x30A040, 0xE08020]), font=9, ppu=30)
    b.ball('Tape', 0.15, (0, 0.7, -0.05), 0xF0E0A0, **DEC)


def sticky_notes(b):
    for _ in range(R.randint(2, 6)):
        b.blk('PostIt', (0.5, 0.5, 0.02), (R.uniform(-1.2, 1.2), R.uniform(-0.6, 0.6), -0.02),
              R.choice([0xF8F080, 0xF0A0C0, 0xA0E0F0, 0xB0F0A0]), rot=Rz(R.uniform(-15, 15)), **DEC)


def key_box(b):
    m = b.model('KeyBox')
    m.blk('Box', (2, 2.4, 0.4), (0, 0, -0.2), 0x6A6E72, 'Metal', **DEC)
    for r_ in range(3):
        for c_ in range(4):
            if R.random() < 0.7:
                m.blk('Key', (0.12, 0.4, 0.05), (-0.6 + c_ * 0.4, 0.7 - r_ * 0.7, -0.45), GOLD, 'Metal', **DEC)


def wall_shelf(b):
    m = b.model('WallShelf')
    m.blk('Board', (4, 0.15, 0.9), (0, 0, -0.45), WOOD_L, 'Wood', **DEC)
    for i in range(R.randint(2, 4)):
        k = R.random()
        x = R.uniform(-1.6, 1.6)
        if k < 0.4:
            m.blk('Books', (0.8, 0.9, 0.6), (x, 0.52, -0.45), R.choice([0x7A2B2B, 0x2B4A7A, 0x3D5E3A]), 'Fabric', **DEC)
        elif k < 0.7:
            P.plant(m.at(T(x, 0.08, -0.45)), h=1.4)
        else:
            m.cyl('Jar', 0.6, 0.4, (x, 0.38, -0.45), R.choice([0xE8E0D0, 0x8AA0B0]), 'Glass', **DEC)


def speaker_wall(b):
    m = b.model('PASpeaker')
    m.blk('Box', (1.0, 1.4, 0.8), (0, 0, -0.4), 0xE8E8E4, rot=Rx(15), **DEC)
    m.cyl('Cone', 0.05, 0.7, (0, 0, -0.82), 0x3A3A3A, axis='z', **DEC)


def cross_sign(b):
    m = b.model('MedicalCross')
    m.blk('Plate', (1.4, 1.4, 0.06), (0, 0, -0.03), 0xFFFFFF, **DEC)
    m.blk('V', (0.4, 1.1, 0.03), (0, 0, -0.07), 0x2A9A4A, **DEC)
    m.blk('H', (1.1, 0.4, 0.03), (0, 0, -0.07), 0x2A9A4A, **DEC)


def clipboard(b):
    m = b.model('Clipboard')
    m.blk('Board', (0.9, 1.3, 0.05), (0, 0, -0.03), 0x8A6A3A, 'Wood', **DEC)
    m.blk('Paper', (0.8, 1.0, 0.02), (0, -0.05, -0.07), 0xFAFAF6, **DEC)
    m.blk('Clip', (0.4, 0.15, 0.08), (0, 0.55, -0.08), STEEL, 'Metal', **DEC)


# ===================================================================== ceiling props
def sprinkler(b):
    b.cyl('Sprinkler', 0.25, 0.25, (0, -0.15, 0), 0xD8D8D0, 'Metal', **DEC)
    b.cyl('Deflector', 0.04, 0.45, (0, -0.32, 0), 0xC8C8C0, 'Metal', **DEC)


def smoke_detector(b):
    b.cyl('SmokeDetector', 0.25, 0.9, (0, -0.13, 0), 0xF4F4F0, **DEC)
    b.blk('LED', (0.06, 0.04, 0.06), (0.25, -0.27, 0), 0xFF2020, 'Neon', **DEC)


def diffuser(b):
    m = b.model('AirDiffuser')
    m.blk('Frame', (2.4, 0.08, 2.4), (0, -0.05, 0), 0xE8E8E4, 'Metal', **DEC)
    m.blk('Inner', (1.6, 0.06, 1.6), (0, -0.12, 0), 0xD0D0CC, 'Metal', **DEC)
    m.blk('Core', (0.8, 0.05, 0.8), (0, -0.17, 0), 0x6A6A66, 'Metal', **DEC)


def ceiling_speaker(b):
    b.cyl('CeilingSpeaker', 0.1, 1.0, (0, -0.06, 0), 0xF0F0EC, **DEC)
    b.cyl('Grille', 0.05, 0.8, (0, -0.12, 0), 0xC8C8C4, 'Metal', **DEC)


def hanging_cable(b):
    L = R.uniform(1.5, 5)
    b.beam('Cable', (0, 0, 0), (R.uniform(-1, 1), -L, R.uniform(-1, 1)), 0.08, 0.08, BLACK, **DEC)


# ===================================================================== floor decals
def d_paper(b):
    b.blk('Paper', (0.85, 0.02, 1.1), (0, 0.02, 0), R.choice([0xF2F0EA, 0xEDE8DC, 0xF8F4E8]), rot=Ry(R.uniform(0, 360)), **DEC)


def d_stain(b, color=None):
    b.cyl('Stain', 0.03, R.uniform(1, 3), (0, 0.025, 0), color or R.choice([0x4A3E32, 0x3A3430, 0x5A4A38]), **DEC)


def d_dust(b):
    b.blk('Dust', (R.uniform(2, 5), 0.02, R.uniform(2, 5)), (0, 0.02, 0), R.choice([0x9A9488, 0x8A847A]), rot=Ry(R.uniform(0, 90)), **DEC)


def d_crack(b):
    x, z = 0, 0
    for i in range(R.randint(3, 7)):
        L = R.uniform(0.8, 2)
        a = R.uniform(0, 360)
        nx, nz = x + math.cos(math.radians(a)) * L, z + math.sin(math.radians(a)) * L
        b.beam('FloorCrack', (x, 0.03, z), (nx, 0.03, nz), 0.08, 0.03, 0x1A1A1A, **DEC)
        x, z = nx, nz


def d_cup(b):
    b.cyl('Cup', 0.6, 0.4, (0, 0.2, 0), R.choice([0xF0F0F0, 0xC89A5A]), axis='x', rot=Ry(R.uniform(0, 360)), **DEC)


def d_can(b):
    b.cyl('Can', 0.6, 0.35, (0, 0.18, 0), R.choice([0xD02020, 0x2050D0, 0x20A040]), 'Metal', axis='x', rot=Ry(R.uniform(0, 360)), **DEC)


def d_tile(b):
    b.blk('CeilingTile', (2, 0.12, 2), (0, 0.08, 0), 0xD8D6D0, rot=Ry(R.uniform(0, 90)) * Rx(R.uniform(-8, 8)), **DEC)


def d_glass(b):
    for _ in range(R.randint(3, 7)):
        b.wedge('Shard', (R.uniform(0.2, 0.6), 0.04, R.uniform(0.3, 0.9)), T(R.uniform(-1, 1), 0.03, R.uniform(-1, 1)) * Ry(R.uniform(0, 360)),
                0xA8C0C8, 'Glass', tr=0.3, **DEC)


def d_confetti(b):
    for _ in range(6):
        b.blk('Confetti', (0.35, 0.03, 0.35), (R.uniform(-1.5, 1.5), 0.04, R.uniform(-1.5, 1.5)),
              R.choice([0xFF3A4A, 0xFFD03A, 0x3AC0FF, 0xFFFFFF]), rot=Ry(R.uniform(0, 90)), **DEC)


def d_crayon(b):
    b.cyl('Crayon', 0.8, 0.15, (0, 0.08, 0), R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040]), axis='x', rot=Ry(R.uniform(0, 360)), **DEC)


def d_leaves(b):
    for _ in range(4):
        b.blk('Leaf', (0.4, 0.02, 0.6), (R.uniform(-1, 1), 0.03, R.uniform(-1, 1)), R.choice([0x6A5A2A, 0x4A6A2A, 0x8A6A3A]),
              rot=Ry(R.uniform(0, 360)), **DEC)


def d_puddle(b):
    b.cyl('Puddle', 0.03, R.uniform(1.5, 4), (0, 0.03, 0), 0x2A3438, 'Glass', refl=0.3, **DEC)


def d_pills(b):
    for _ in range(5):
        b.blk('Pill', (0.25, 0.12, 0.12), (R.uniform(-0.8, 0.8), 0.06, R.uniform(-0.8, 0.8)), R.choice([0xF0F0F0, 0xE04040, 0x40A0E0]), **DEC)


def footprints(b, a, bpt, color=0x3A2A1E, small=False, step=1.6):
    """A trail of footprints from point a to point b (local floor coords)."""
    ax, az = a
    bx, bz = bpt
    L = math.hypot(bx - ax, bz - az)
    n = int(L / step)
    yaw = math.degrees(math.atan2(-(bx - ax), -(bz - az)))
    s = 0.6 if small else 1.0
    for i in range(n):
        t = i / max(n, 1)
        side = 0.35 * s * (1 if i % 2 else -1)
        x = ax + (bx - ax) * t + math.cos(math.radians(yaw)) * side + R.uniform(-0.1, 0.1)
        z = az + (bz - az) * t - math.sin(math.radians(yaw)) * side + R.uniform(-0.1, 0.1)
        b.blk('Footprint', (0.45 * s, 0.02, 0.95 * s), (x, 0.03, z), color, rot=Ry(yaw + R.uniform(-8, 8)), **DEC)


# ===================================================================== desk clutter (Korean office specifics)
def desk_clutter(b, w=6, d=3, h=3.1):
    """Personal touches on/around a desk whose user sits on the -Z side."""
    k = R.random
    if k() < 0.5:
        b.blk('Slippers', (0.6, 0.25, 1.2), (-0.5, 0.13, -d / 2 - 0.4), R.choice([0x2A2A2A, 0x5A8AC0, 0xE0A0B0]), rot=Ry(R.uniform(-20, 20)), **DEC)
        b.blk('Slippers', (0.6, 0.25, 1.2), (0.2, 0.13, -d / 2 - 0.3), R.choice([0x2A2A2A, 0x5A8AC0, 0xE0A0B0]), rot=Ry(R.uniform(-20, 20)), **DEC)
    if k() < 0.45:
        b.cyl('MiniFan', 0.3, 0.9, (w / 2 - 0.7, h + 0.7, d / 2 - 0.6), 0xF0F0F0, axis='z', **DEC)
        b.blk('FanStand', (0.2, 0.6, 0.2), (w / 2 - 0.7, h + 0.3, d / 2 - 0.6), 0xF0F0F0, **DEC)
    if k() < 0.6:
        b.blk('PenCup', (0.35, 0.5, 0.35), (-w / 2 + 0.6, h + 0.25, d / 2 - 0.7), R.choice([0x2A2A2A, 0xC8C8C8]), **DEC)
    if k() < 0.5:
        for i in range(R.randint(2, 5)):
            b.blk('Folder', (1.1, 0.12, 1.4), (-w / 2 + 1.2, h + 0.06 + i * 0.12, -0.2), R.choice([0x2A4A8A, 0xE8D8A0, 0xC03030, 0x3A7A3A]),
                  rot=Ry(R.uniform(-8, 8)), **DEC)
    if k() < 0.45:
        b.blk('PhotoFrame', (0.6, 0.8, 0.08), (w / 2 - 1.4, h + 0.4, d / 2 - 0.4), BLACK, rot=Rx(-12) * Ry(-15), **DEC)
    if k() < 0.4:
        P.plant(b.at(T(w / 2 - 0.5, h, d / 2 - 0.5)), h=1.3)
    if k() < 0.35:
        b.blk('Blanket', (1.9, 0.12, 1.6), (0, 2.25, -d / 2 - 1.1), R.choice([0xC8A0D0, 0xA0C0E0, 0xE0C8A0]), 'Fabric', rot=Ry(R.uniform(-10, 10)), **DEC)
    if k() < 0.5:
        for i in range(R.randint(1, 4)):
            b.blk('PostIt', (0.35, 0.35, 0.02), (-1.3 + i * 0.4, h + 0.6 + (i % 2) * 0.4, d / 2 - 0.86),
                  R.choice([0xF8F080, 0xF0A0C0, 0xA0E0F0]), rot=Rz(R.uniform(-10, 10)), **DEC)
    if k() < 0.3:
        b.blk('Snack', (0.8, 0.5, 0.3), (w / 2 - 1.6, h + 0.25, -0.6), R.choice([0xE04020, 0xF0C020, 0x2A6AC0]), rot=Ry(R.uniform(0, 90)), **DEC)
    if k() < 0.35:
        b.blk('Headset', (0.9, 0.7, 0.3), (-w / 2 + 1.8, h + 0.35, 0.2), BLACK, rot=Ry(R.uniform(0, 90)), **DEC)
    if k() < 0.25:
        b.blk('Bag', (1.4, 1.2, 0.6), (w / 2 - 0.8, 0.6, -d / 2 + 0.2), R.choice([0x3A2A1E, 0x1A1A1A]), 'Fabric', rot=Ry(R.uniform(-30, 30)), **DEC)
