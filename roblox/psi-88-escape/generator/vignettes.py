"""Hand-placed story set pieces.

These run after a floor's main layout and before the automatic dresser, so
the dresser sees them and works around them. Every piece is placed in space
that is otherwise empty and away from the routes players need.
"""
import math
from rbx import T, Rx, Ry, Rz, light, gui_text, particles
import props as P
import props2 as Q
from props import R, BLACK, STEEL, GOLD, WOOD, WOOD_D, WOOD_L, BLOOD
from building import wall_x, wall_z

NC = dict(collide=False)
DEC = dict(collide=False, shadow=False, touch=False, query=False)


def at(b, x, z, rot=0, y=0):
    return b.at(T(x, y, z) * Ry(rot))


# ------------------------------------------------------------------ shared small builders
def bowl_stack(b, n=5, col=0xF4F0E8):
    for i in range(n):
        b.cyl('Bowl', 0.35, 1.3 - i * 0.02, (R.uniform(-0.05, 0.05), 0.18 + i * 0.3, 0), col, **NC)


def bottles(b, n=4, cols=(0x2A7A3A, 0x2A7A3A, 0x6A3A1A)):
    for i in range(n):
        b.cyl('Bottle', 1.0, 0.35, (R.uniform(-0.8, 0.8), 0.5, R.uniform(-0.6, 0.6)), R.choice(cols), 'Glass', tr=0.15, **NC)


def tape_line(b, pts, y=3.0):
    for a, c in zip(pts, pts[1:]):
        b.beam('CautionTape', (a[0], y, a[1]), (c[0], y - 0.3, c[1]), 0.5, 0.04, 0xF0C020, **DEC)
    for p in pts:
        b.cyl('TapePost', y + 0.2, 0.3, (p[0], (y + 0.2) / 2, p[1]), 0xE05A10, 'Plastic')


def laundry_line(b, x0, z0, x1, z1, y=7, n=8, small=False):
    b.beam('Line', (x0, y, z0), (x1, y, z1), 0.06, 0.06, 0xE8E8E8, **DEC)
    for i in range(n):
        t = (i + 0.5) / n
        x, z = x0 + (x1 - x0) * t, z0 + (z1 - z0) * t
        s = 0.6 if small else 1.0
        ang = math.degrees(math.atan2(x1 - x0, z1 - z0))
        b.blk('Cloth', (1.4 * s, R.uniform(1.4, 2.6) * s, 0.06), (x, y - 1.0 * s, z), R.choice([0xF0F0F0, 0x6A8AC0, 0xE0A0B0, 0x3A3A3A, 0xC0C060]),
              'Fabric', rot=Ry(ang + 90), **DEC)
        b.blk('Peg', (0.1, 0.25, 0.1), (x, y, z), R.choice([0xE04040, 0x40A0E0]), **DEC)


def drying_rack(b):
    m = b.model('DryingRack')
    for x in (-2, 2):
        m.beam('LegA', (x, 0, -1), (x, 4, 0), 0.12, 0.12, STEEL, 'Metal')
        m.beam('LegB', (x, 0, 1), (x, 4, 0), 0.12, 0.12, STEEL, 'Metal')
    for k in range(5):
        y = 2.2 + k * 0.4
        m.blk('Rail', (4.2, 0.06, 0.06), (0, y, (k - 2) * 0.35), STEEL, 'Metal', **DEC)
        if R.random() < 0.85:
            m.blk('Cloth', (R.uniform(0.8, 1.8), R.uniform(0.8, 1.6), 0.05), (R.uniform(-1.2, 1.2), y - 0.6, (k - 2) * 0.35),
                  R.choice([0xF0F0F0, 0x6A8AC0, 0xE0A0B0, 0x3A3A3A, 0x8AC08A]), 'Fabric', **DEC)


def low_table_meal(b):
    """밥상: low table with bowls, soju bottles and floor cushions."""
    m = b.model('LowTableMeal')
    m.blk('Top', (5, 0.25, 3), (0, 1.2, 0), 0x6A4A2A, 'Wood')
    for sx in (-2.2, 2.2):
        for sz in (-1.2, 1.2):
            m.blk('Leg', (0.25, 1.1, 0.25), (sx, 0.55, sz), 0x4A321E, 'Wood')
    for i in range(4):
        m.cyl('Bowl', 0.35, 0.8, (-1.6 + i * 1.0, 1.5, R.uniform(-0.6, 0.6)), 0xF4F0E8, **NC)
    m.blk('Pot', (1.2, 0.6, 1.2), (0, 1.62, 0), 0x3A3A3A, 'Metal', **NC)
    m.blk('Kimchi', (0.8, 0.2, 0.6), (1.5, 1.42, 0.8), 0xC83A1A, **NC)
    for i in range(3):
        m.cyl('Soju', 0.9, 0.3, (-2 + i * 0.4, 1.8, 1.0), 0x2A7A3A, 'Glass', tr=0.15, **NC)
    for x, z in ((-2.6, 0), (2.6, 0), (0, -2.0), (0, 2.0)):
        m.blk('Cushion', (1.8, 0.35, 1.8), (x, 0.18, z), R.choice([0x8A3A3A, 0x3A5A8A, 0x6A6A3A]), 'Fabric', rot=Ry(R.uniform(0, 40)))
    for i in range(3):
        m.blk('Chopsticks', (0.05, 0.05, 0.9), (-1.6 + i * 1.0, 1.36, -0.5), STEEL, 'Metal', rot=Ry(R.uniform(-20, 20)), **DEC)


def leak_bucket(b, c):
    b.blk('Bucket', (1.2, 1.2, 1.2), (0, 0.6, 0), 0x3A6AC0, 'Plastic')
    b.blk('Water', (1.0, 0.05, 1.0), (0, 1.0, 0), 0x5A8AB0, 'Glass', tr=0.3, **DEC)
    b.cyl('CeilingStain', 0.05, 4, (0, c - 0.36, 0), 0x6A5A40, **DEC)
    b.cyl('CeilingStain2', 0.05, 2.4, (0.6, c - 0.37, 0.4), 0x4A3A28, **DEC)
    Q.d_puddle(b.at(T(1.2, 0, 0.6)))


def game_corner(b):
    m = b.model('GameCorner')
    m.blk('Console', (1.4, 0.4, 1.0), (0, 0.2, 0), 0x1A1A1A, 'Plastic')
    for i in range(2):
        m.blk('Pad', (0.8, 0.2, 0.5), (-1 + i * 2, 0.1, -2 + i * 0.3), 0x2A2A2A, rot=Ry(R.uniform(0, 90)), **DEC)
    for i in range(3):
        m.beam('Cable', (0, 0.05, 0), (R.uniform(-3, 3), 0.05, R.uniform(-3, -1)), 0.06, 0.04, BLACK, **DEC)
    for i in range(4):
        m.blk('SnackBag', (0.8, 0.2, 1.0), (R.uniform(-3, 3), 0.1, R.uniform(-4, -1)), R.choice([0xE04020, 0xF0C020, 0x2A6AC0]),
              rot=Ry(R.uniform(0, 360)), **DEC)


def escape_kit(b):
    m = b.model('EscapeKit')
    Q.backpack(m.at(T(0, 0, 0)))
    for k in range(8):
        a = k / 8 * math.tau
        m.blk('Rope', (0.6, 0.25, 0.25), (1.8 + math.cos(a) * 0.7, 0.13, math.sin(a) * 0.7), 0xC8A870, 'Fabric', rot=Ry(-math.degrees(a)), **DEC)
    m.cyl('Flashlight', 1.0, 0.3, (-1.4, 0.15, -0.4), 0x1A1A1A, 'Metal', axis='x', rot=Ry(30), **NC)
    for i in range(3):
        m.cyl('Water', 1.0, 0.4, (-0.8 + i * 0.45, 0.5, 1.0), 0x8AC0E0, 'Glass', tr=0.3, **NC)
    m.beam('Crowbar', (-2, 0.1, 0.6), (-2.4, 0.1, 2.6), 0.18, 0.18, 0xC02020, 'Metal', **NC)
    m.blk('Map', (1.6, 0.03, 1.2), (0.6, 0.02, -1.2), 0xE8E0C8, rot=Ry(15), **DEC)


def scaffold(b, w=6, d=4, h=12):
    m = b.model('Scaffold')
    for x in (-w / 2, w / 2):
        for z in (-d / 2, d / 2):
            m.cyl('Pole', h, 0.25, (x, h / 2, z), 0xA8A8A8, 'Metal')
    for y in (4, 8, h - 0.5):
        m.blk('Deck', (w, 0.2, d), (0, y, 0), 0x9A7A4A, 'WoodPlanks')
        for x in (-w / 2, w / 2):
            m.blk('Rail', (0.15, 0.15, d), (x, y + 2, 0), 0xA8A8A8, 'Metal', **NC)
    m.beam('Brace', (-w / 2, 0, -d / 2), (w / 2, 8, -d / 2), 0.15, 0.15, 0xA8A8A8, 'Metal', **NC)
    m.beam('Brace', (w / 2, 0, d / 2), (-w / 2, 8, d / 2), 0.15, 0.15, 0xA8A8A8, 'Metal', **NC)
    Q.paint_cans(m.at(T(0, 4.1, 0)))


def apology_shrine(b):
    m = b.model('ApologyCard')
    P.table(m, 3, 2, 3, color=0xD8D4CA, mat='SmoothPlastic')
    card = m.blk('Card', (1.4, 1.0, 0.05), (0, 3.6, 0.2), 0xFFFFFF, rot=Rx(-15))
    gui_text(card, 'Извините\n(죄송합니다)\n— 에스키모', 'Front', bg=0xFFFFFF, fg=0x2A4A9A, font=9, ppu=60)
    for i in range(6):
        m.ball('Flower', 0.4, (-0.9 + R.uniform(-0.3, 0.3), 3.6 + R.uniform(0, 0.6), -0.4 + R.uniform(-0.2, 0.2)),
               R.choice([0xE0E0F0, 0xF0D040, 0xE06080]), **NC)
    m.cyl('Vase', 0.8, 0.5, (-0.9, 3.4, -0.4), 0xA8C0C8, 'Glass', tr=0.3, **NC)
    m.blk('MiniHammer', (0.5, 0.4, 0.8), (0.8, 3.25, -0.3), 0x4A4A4E, 'Metal', **NC)


def generator(b):
    m = b.model('Generator')
    m.blk('Body', (4, 3, 2.4), (0, 1.5, 0), 0xE0A020, 'Metal')
    m.blk('Panel', (1.2, 1, 0.1), (1, 2, -1.25), 0x2A2A2A)
    m.cyl('Exhaust', 1.2, 0.4, (-1.5, 3.4, 0.6), 0x3A3A3A, 'Metal')
    for i in range(3):
        m.beam('Cable', (1.5, 0.2, -1.2), (1.5 + R.uniform(2, 8), 0.05, -1.2 - R.uniform(2, 8)), 0.1, 0.06, BLACK, **DEC)


def rolling_ladder(b, h=12):
    m = b.model('LibraryLadder')
    for s in (-0.7, 0.7):
        m.beam('Rail', (s, 0.3, -1.6), (s, h, 0), 0.15, 0.25, 0x6A4A2A, 'Wood', **NC)
    for i in range(1, 10):
        t = i / 10
        m.blk('Rung', (1.4, 0.12, 0.25), (0, h * t, -1.6 + 1.6 * t), 0x6A4A2A, 'Wood', **NC)
    m.cyl('Wheel', 0.15, 0.4, (-0.7, 0.2, -1.6), BLACK, axis='x', **NC)
    m.cyl('Wheel', 0.15, 0.4, (0.7, 0.2, -1.6), BLACK, axis='x', **NC)


def file_cart(b):
    m = b.model('FileCart')
    for y in (1.0, 2.6):
        m.blk('Shelf', (3, 0.12, 1.6), (0, y, 0), 0x8A8E92, 'Metal')
        for i in range(6):
            m.blk('Folder', (0.35, 1.2, 1.2), (-1.2 + i * 0.45, y + 0.66, 0), R.choice([0xC8A86A, 0xB0905A, 0xD8C090]), rot=Rz(R.uniform(-10, 10)), **NC)
    for sx in (-1.4, 1.4):
        m.blk('Post', (0.12, 3.6, 0.12), (sx, 1.8, 0.7), 0x8A8E92, 'Metal')
        m.blk('Post', (0.12, 3.6, 0.12), (sx, 1.8, -0.7), 0x8A8E92, 'Metal')
        m.cyl('Wheel', 0.15, 0.4, (sx, 0.2, 0), BLACK, axis='x')


def shredder(b):
    m = b.model('Shredder')
    m.blk('Bin', (1.6, 2.4, 1.2), (0, 1.2, 0), 0x2A2A2A, 'Plastic')
    m.blk('Head', (1.7, 0.5, 1.3), (0, 2.65, 0), 0x3A3A3A)
    for _ in range(14):
        m.blk('Strip', (0.08, 0.02, R.uniform(0.6, 1.4)), (R.uniform(-1.5, 1.5), 0.02, R.uniform(-1.6, 1.6)), 0xF2F0E8,
              rot=Ry(R.uniform(0, 180)), **DEC)


def coffee_station(b):
    m = b.model('CoffeeStation')
    P.table(m, 4, 2, 3, color=0xD8D4CA, mat='SmoothPlastic')
    m.blk('Machine', (1.4, 2, 1.4), (-1, 4, 0.1), 0x1A1A1A, 'Metal')
    m.blk('Cups', (0.5, 1.2, 0.5), (0.6, 3.6, 0.3), 0xF0F0F0, **NC)
    m.blk('Sugar', (0.8, 0.4, 0.5), (1.4, 3.2, -0.3), 0xC89A3A, **NC)
    for i in range(3):
        m.cyl('Mug', 0.5, 0.4, (0 + i * 0.5, 3.25, -0.6), R.choice([0xFFFFFF, 0xC04040, 0x305080]), **NC)


def cot(b):
    m = b.model('Cot')
    m.blk('Bed', (2.6, 0.3, 6.5), (0, 1.4, 0), 0x3A5A3A, 'Fabric')
    for z in (-3, 3):
        m.beam('LegA', (-1.2, 0, z), (1.2, 1.3, z), 0.12, 0.12, STEEL, 'Metal')
        m.beam('LegB', (1.2, 0, z), (-1.2, 1.3, z), 0.12, 0.12, STEEL, 'Metal')
    m.blk('Blanket', (2.4, 0.2, 3.6), (0, 1.65, -0.8), 0x6A5A7A, 'Fabric', rot=Ry(6), **NC)
    m.blk('Pillow', (1.8, 0.4, 1.0), (0, 1.75, 2.6), 0xE8E4DA, 'Fabric', **NC)


def chicken_box(b):
    m = b.model('ChickenBox')
    m.blk('Box', (2.0, 0.6, 2.0), (0, 0.3, 0), 0xF0F0EC, 'Fabric')
    m.blk('Lid', (2.0, 0.05, 2.0), (0, 0.9, 1.0), 0xF0F0EC, rot=Rx(-70) * T(0, 0, 0), **NC)
    _ = m.blk('Logo', (1.2, 0.5, 0.02), (0, 0.35, -1.01), 0xC02020, **DEC)
    gui_text(_, '치킨', 'Front', bg=0xC02020, fg=0xFFFFFF, font=20, ppu=50)
    for i in range(5):
        m.blk('Bone', (0.15, 0.12, 0.7), (R.uniform(-0.7, 0.7), 0.62, R.uniform(-0.7, 0.7)), 0xE8D8B8, rot=Ry(R.uniform(0, 180)), **DEC)
    m.cyl('Cola', 1.0, 0.5, (1.5, 0.5, 0.4), 0x2A1A10, 'Plastic', **NC)


def scooter(b):
    m = b.model('DeliveryScooter')
    m.cyl('Front', 0.4, 1.6, (0, 0.8, -2.2), BLACK, axis='x')
    m.cyl('Rear', 0.4, 1.6, (0, 0.8, 1.8), BLACK, axis='x')
    m.blk('Body', (1.4, 1.4, 3.2), (0, 1.6, 0.2), 0xC02020, 'Plastic')
    m.blk('Seat', (1.2, 0.4, 1.8), (0, 2.5, 0.6), BLACK, 'Fabric')
    m.beam('Fork', (0, 0.8, -2.2), (0, 3.6, -1.6), 0.3, 0.3, STEEL, 'Metal')
    m.blk('Bars', (2.2, 0.2, 0.2), (0, 3.7, -1.6), BLACK, 'Metal')
    box = m.blk('DeliveryBox', (1.8, 1.6, 1.6), (0, 3.4, 1.6), 0xB8BCC0, 'Metal')
    t = m.blk('BoxLabel', (1.4, 0.6, 0.02), (0, 3.4, 0.79), 0xB8BCC0, **DEC)
    gui_text(t, '짜장 배달', 'Front', bg=0xB8BCC0, fg=0xC02020, font=20, ppu=50)


def tin_boxes(b, n=4):
    """철가방 — stacked metal delivery boxes."""
    for i in range(n):
        b.blk('철가방', (2.2, 1.6, 1.4), (R.uniform(-0.1, 0.1), 0.8 + i * 1.6, 0), 0xB8BCC0, 'Metal', rot=Ry(R.uniform(-6, 6)))
        b.blk('Handle', (1.2, 0.2, 0.2), (0, 1.7 + i * 1.6, 0), 0x8A8E92, 'Metal', **DEC)


def ticket_machine(b):
    m = b.model('TicketMachine')
    m.blk('Body', (2.4, 5.4, 1.6), (0, 2.7, 0), 0xE8E8E8, 'Metal')
    s = m.blk('Screen', (1.8, 1.4, 0.1), (0, 3.8, -0.82), 0x0A1A2A)
    gui_text(s, '식권\n4,500원', 'Front', bg=0x0A1A2A, fg=0xFFFFFF, glow=True, font=19, ppu=40)
    for r_ in range(2):
        for c_ in range(3):
            m.blk('Btn', (0.45, 0.3, 0.08), (-0.6 + c_ * 0.6, 2.4 - r_ * 0.45, -0.84), R.choice([0xE04040, 0x40A0E0, 0xF0C020]), **DEC)


def flowerbed(b, w=10):
    m = b.model('FlowerBed')
    m.blk('Soil', (w, 0.4, 1.6), (0, 0.35, 0), 0x3A2A1A, 'Ground')
    m.blk('Edge', (w + 0.2, 0.6, 0.2), (0, 0.3, -0.85), 0xD8D0C0, 'Brick')
    for i in range(int(w * 1.5)):
        x = -w / 2 + 0.4 + i * (w - 0.8) / (w * 1.5)
        m.blk('Stem', (0.08, 0.8, 0.08), (x, 0.9, R.uniform(-0.5, 0.5)), 0x3A6A2A, **DEC)
        m.ball('Bloom', 0.45, (x, 1.35, R.uniform(-0.5, 0.5)), R.choice([0xE04060, 0xF0D040, 0xF0F0F0, 0xA060E0, 0xF08030]), **DEC)


def gnome(b):
    m = b.model('GardenGnome')
    m.blk('Body', (0.9, 1.2, 0.8), (0, 0.6, 0), 0x3A6AC0)
    m.ball('Head', 0.8, (0, 1.5, 0), 0xF0C8A8)
    m.ball('Beard', 0.7, (0, 1.25, -0.25), 0xF0F0F0)
    m.wedge('Hat', (0.8, 1.0, 0.8), T(0, 2.2, 0), 0xD02020)


def kid_bike(b):
    m = b.model('KidBike')
    m.cyl('Front', 0.2, 1.4, (0, 0.7, -1.2), 0x1A1A1A, axis='x')
    m.cyl('Rear', 0.2, 1.4, (0, 0.7, 1.0), 0x1A1A1A, axis='x')
    m.cyl('TrainL', 0.12, 0.6, (-0.7, 0.3, 1.2), 0xF0F0F0, axis='x')
    m.cyl('TrainR', 0.12, 0.6, (0.7, 0.3, 1.2), 0xF0F0F0, axis='x')
    m.beam('Frame', (0, 0.7, 1.0), (0, 1.5, -0.9), 0.2, 0.2, 0xF06AA0, 'Metal')
    m.blk('Seat', (0.5, 0.2, 0.9), (0, 1.8, 0.6), 0xF0F0F0)
    m.blk('Bars', (1.4, 0.15, 0.15), (0, 2.1, -1.0), 0xF06AA0, 'Metal')
    m.blk('Basket', (0.8, 0.6, 0.6), (0, 1.9, -1.4), 0xF0D0E0)


def kiddie_pool(b):
    m = b.model('KiddiePool')
    m.cyl('Ring', 1.0, 7, (0, 0.5, 0), 0x3A8AE0, 'Plastic')
    m.cyl('Water', 0.2, 6.4, (0, 0.85, 0), 0x6AB0E0, 'Glass', tr=0.3, refl=0.2, **NC)
    m.ball('Duck', 0.8, (1, 1.2, 0.5), 0xF0D020, **NC)


def lamp_post(b, color=0xFFE0B0):
    m = b.model('LampPost')
    m.cyl('Pole', 9, 0.35, (0, 4.5, 0), 0x2A2A2A, 'Metal')
    m.blk('Head', (1.2, 1.2, 1.2), (0, 9.4, 0), 0x2A2A2A, 'Metal')
    P.bulb(m, 0, 8.9, 0, color=color, bright=1.0, rng=22, d=0.7)


def dollhouse(b):
    """A miniature of the PSI tower, made by a child."""
    m = b.model('PSIDollhouse')
    for i in range(10):
        m.blk('Floor', (3, 0.5, 2.2), (0, 0.25 + i * 0.55, 0), 0x3A4A52 if i % 2 else 0x2A3238, 'Wood')
    m.blk('Sign', (2, 0.6, 0.1), (0, 6.0, -0.6), 0xFF2030, 'Neon', **DEC)
    for i in range(4):
        m.blk('Doll', (0.25, 0.5, 0.25), (R.uniform(-1, 1), 0.75 + R.randint(0, 9) * 0.55, R.uniform(-0.6, 0.6)), R.choice([0xF0C8A8, 0xC02020]), **NC)


def round_party_table(b):
    m = b.model('GuestTable')
    P.round_table(m, d=5, h=3, cloth=0xF2EEE6)
    m.cyl('Centerpiece', 0.6, 1.0, (0, 3.4, 0), 0xC01020, 'Glass', tr=0.2, **NC)
    for i in range(3):
        P.bulb(m, -0.3 + i * 0.3, 3.9 + (i % 2) * 0.2, 0.2, color=0xFFB060, bright=0.25, rng=6, d=0.15)
    for k in range(5):
        a = k / 5 * math.tau
        P.chair(m.at(T(math.cos(a) * 3.4, 0, math.sin(a) * 3.4) * Ry(-math.degrees(a) - 90)), color=0x2A1A1A)
        m.cyl('Plate', 0.08, 1.2, (math.cos(a) * 1.8, 3.14, math.sin(a) * 1.8), 0xFFFFFF, **NC)
        m.cyl('Glass', 0.8, 0.35, (math.cos(a) * 1.3, 3.5, math.sin(a) * 1.3 + 0.4), 0xF0E8E8, 'Glass', tr=0.4, **NC)
    if R.random() < 0.5:
        P.splat(m, R.uniform(-1, 1), R.uniform(-1, 1), 0.6, y=3.13)


def dj_booth(b):
    m = b.model('DJBooth')
    m.blk('Desk', (7, 3.4, 2.4), (0, 1.7, 0), 0x1A1A1A, 'Metal')
    m.blk('Front', (7.1, 2.8, 0.1), (0, 1.6, -1.25), 0x2A0406, 'Neon', tr=0.4, **NC)
    for x in (-1.8, 1.8):
        m.cyl('Deck', 0.15, 1.6, (x, 3.5, 0), 0x2A2A2A, 'Metal', **NC)
    m.blk('Mixer', (1.6, 0.3, 1.4), (0, 3.55, 0), 0x3A3A3A, **NC)
    Q.speaker_tower(m.at(T(-5, 0, 0.2)))
    Q.speaker_tower(m.at(T(5, 0, 0.2)))
    m.blk('Laptop', (1.2, 0.08, 0.9), (0, 3.75, 0.4), 0xC0C0C0, 'Metal', **NC)


def balloon_arch(b, w=10, h=10):
    for i in range(24):
        t = i / 23
        a = math.pi * t
        b.ball('ArchBalloon', 1.4, (-math.cos(a) * w / 2, math.sin(a) * h, R.uniform(-0.3, 0.3)), [0xC01020, 0xF2EEE6, 0x2A2A2A][i % 3],
               'SmoothPlastic', refl=0.15, **NC)


def photo_wall(b, text='피의 축제 2026'):
    m = b.model('PhotoWall')
    m.blk('Board', (10, 7, 0.4), (0, 3.5 + 0.3, 0), 0x120406, 'Fabric')
    for i in range(12):
        m.blk('Logo', (1.4, 0.5, 0.05), (-4 + (i % 4) * 2.6, 1.4 + (i // 4) * 2.1, -0.22), 0xFF2A3A, 'Neon', **DEC)
    t = m.blk('Title', (8, 1.2, 0.05), (0, 6.6, -0.23), 0x120406, **DEC)
    gui_text(t, text, 'Front', bg=0x120406, fg=0xF2C84A, glow=True, font=20, ppu=30)
    m.blk('Carpet', (10, 0.06, 4), (0, 0.03, -2.3), 0x8A0A14, 'Fabric', **DEC)


def punching_bag(b, c):
    b.blk('Chain', (0.1, c - 7, 0.1), (0, (c + 7) / 2, 0), 0x6A6A6A, 'Metal', **NC)
    b.cyl('Bag', 4.2, 1.6, (0, 4.8, 0), 0x8A1010, 'Fabric')


def grand_piano(b):
    m = b.model('GrandPiano')
    m.blk('Body', (5, 1.4, 3.6), (0, 3.0, 0), 0x0A0A0C, 'SmoothPlastic', refl=0.2)
    m.blk('Tail', (3, 1.4, 2.4), (1.4, 3.0, 2.6), 0x0A0A0C, 'SmoothPlastic', refl=0.2)
    m.blk('Lid', (5, 0.1, 4), (0.4, 4.6, 0.9), 0x0A0A0C, 'SmoothPlastic', refl=0.2, rot=Rx(-25))
    m.blk('Keys', (4, 0.15, 0.8), (0, 3.4, -2.1), 0xF4F4F0, **NC)
    for x in (-2, 2, 1.4):
        m.blk('Leg', (0.4, 2.3, 0.4), (x, 1.15, -1.2 if x != 1.4 else 3.2), 0x0A0A0C)
    m.blk('Bench', (2.6, 1.8, 1.2), (0, 0.9, -3.6), 0x0A0A0C)


def aquarium(b, dead=True):
    m = b.model('Aquarium')
    m.blk('Stand', (8, 3, 2.6), (0, 1.5, 0), 0x1A1A1A, 'Wood')
    m.blk('Tank', (8, 4, 2.6), (0, 5, 0), 0x9AC0C8, 'Glass', tr=0.6)
    m.blk('Water', (7.8, 3, 2.4), (0, 4.6, 0), 0x2A5A4A if dead else 0x3A8AB0, 'Glass', tr=0.45, **NC)
    m.blk('Gravel', (7.8, 0.4, 2.4), (0, 3.2, 0), 0xC8B89A, 'Pebble', **NC)
    for i in range(5):
        y = 6.0 if dead else R.uniform(4, 6)
        m.blk('Fish', (0.8, 0.4, 0.15), (R.uniform(-3, 3), y, R.uniform(-0.8, 0.8)), R.choice([0xF08030, 0xE0E0E0, 0xF0C020]), rot=Rz(180 if dead else 0), **NC)
    lp = m.blk('TankLight', (7.8, 0.2, 2.4), (0, 7.1, 0), 0xC8F0FF, 'Neon', **NC)


def chess_table(b):
    m = b.model('ChessTable')
    P.table(m, 3, 3, 2.8, color=0x2A160C)
    for i in range(8):
        for j in range(8):
            if (i + j) % 2:
                m.blk('Sq', (0.3, 0.02, 0.3), (-1.05 + i * 0.3, 2.81, -1.05 + j * 0.3), 0xE8E0D0, **DEC)
    for i in range(10):
        m.cyl('Piece', 0.4, 0.2, (R.uniform(-1, 1), 3.0, R.uniform(-1, 1)), R.choice([0xF0F0F0, 0x1A1A1A]), **NC)
    for x in (-2.6, 2.6):
        Q.leather_chair(m.at(T(x, 0, 0) * Ry(90 if x < 0 else -90)))


def block_castle(b):
    m = b.model('BlockCastle')
    for i in range(30):
        x, z = R.choice([-1.5, -0.5, 0.5, 1.5]), R.choice([-1.5, -0.5, 0.5, 1.5])
        y = 0.5 + R.randint(0, 3)
        m.blk('Block', (1, 1, 1), (x, y, z), R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040]), **NC)


def mobile_hanging(b, c):
    b.blk('MobileCord', (0.06, 2, 0.06), (0, c - 1, 0), 0xE8E8E8, **DEC)
    b.blk('MobileBar', (2.4, 0.06, 0.06), (0, c - 2, 0), 0xE8E8E8, **DEC)
    for i, x in enumerate((-1.1, 0, 1.1)):
        b.blk('Thread', (0.03, 0.8, 0.03), (x, c - 2.4, 0), 0xE8E8E8, **DEC)
        b.ball('Star', 0.5, (x, c - 2.9, 0), [0xF0D040, 0xF0A0C0, 0xA0D0F0][i], **DEC)


def lounge(b):
    m = b.model('Lounge')
    m.blk('Rug', (12, 0.06, 9), (0, 0.03, 0), 0x6A5A4A, 'Fabric', **DEC)
    P.sofa(m.at(T(0, 0, 3.5)), w=9, color=0x5A6A7A)
    Q.leather_chair(m.at(T(-5, 0, -1) * Ry(-90)), color=0x5A6A7A)
    P.table(m, 5, 2.6, 1.5, color=WOOD_D)
    for i in range(3):
        m.blk('Magazine', (0.9, 0.04, 1.2), (-1.5 + i * 1.3, 1.52, R.uniform(-0.5, 0.5)), R.choice([0xC02020, 0x2A4A8A, 0xF0F0F0]),
              rot=Ry(R.uniform(-20, 20)), **DEC)
    m.cyl('Mug', 0.5, 0.4, (1.8, 1.75, 0.6), 0xFFFFFF, **NC)


def dartboard(b):
    m = b.model('Dartboard')
    for i, (d, col) in enumerate(((2.2, 0x1A1A1A), (1.8, 0xE8D8A8), (1.2, 0x1A6A3A), (0.6, 0xC02020), (0.2, 0x1A1A1A))):
        m.cyl('Ring', 0.1 + i * 0.02, d, (0, 0, -0.1 - i * 0.02), col, axis='z', **DEC)
    for i in range(3):
        m.blk('Dart', (0.06, 0.06, 0.8), (R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.6), -0.5), 0xC02020, 'Metal', **DEC)


def coffee_kiosk(b):
    m = b.model('CoffeeKiosk')
    m.blk('Counter', (10, 3.6, 3), (0, 1.8, 0), 0x3A2A1E, 'WoodPlanks')
    m.blk('Top', (10.4, 0.2, 3.4), (0, 3.7, 0), 0xE8E0D0, 'Marble')
    m.blk('Espresso', (2.4, 1.8, 1.6), (-2.5, 4.7, 0.5), 0xB8BCC0, 'Metal')
    m.blk('Grinder', (0.8, 1.6, 0.8), (-0.6, 4.6, 0.6), 0x1A1A1A, 'Metal')
    m.blk('Register', (1.2, 0.8, 1.0), (2.5, 4.2, 0), 0x1A1A1A)
    for i in range(6):
        m.cyl('CupStack', 1.4, 0.45, (3.6 + (i % 2) * 0.5, 4.5, -0.4 + (i // 2) * 0.4), 0xF0F0F0, **NC)
    mb = m.blk('Menu', (8, 2.6, 0.2), (0, 9, 1.4), 0x1A1A1A)
    gui_text(mb, 'PSI 카페 · 아메리카노 2,500 · 라떼 3,000\n오늘은 영업하지 않습니다', 'Front', bg=0x1A1A1A, fg=0xE8D8B0, font=19, ppu=30)
    for x in (-3.5, -1, 1.5, 4):
        P.stool(m.at(T(x, 0, -2.6)), h=3.0)


def car(b, color=None):
    m = b.model('Car')
    col = color or R.choice([0x1A1A1A, 0xE8E8E8, 0x6A6E72, 0x2A3A5A, 0x6A1A1A])
    m.blk('Body', (6, 2, 13), (0, 1.8, 0), col, 'Metal', refl=0.15)
    m.blk('Cabin', (5.4, 2.2, 6.5), (0, 3.9, 0.6), col, 'Metal', refl=0.15)
    m.blk('Windshield', (5.2, 1.9, 0.1), (0, 3.9, -2.7), 0x1A2228, 'Glass', refl=0.3, rot=Rx(25), **NC)
    m.blk('SideGlass', (5.5, 1.6, 5.6), (0, 4.0, 0.7), 0x1A2228, 'Glass', refl=0.3, **NC)
    for x in (-2.8, 2.8):
        for z in (-4, 4):
            m.cyl('Wheel', 1.0, 2.2, (x, 1.1, z), 0x111111, axis='x')
    for x in (-2.2, 2.2):
        h = m.blk('Headlight', (1.0, 0.4, 0.1), (x, 2.1, -6.52), 0xFFF0D0, 'Neon', **DEC)
        m.blk('Taillight', (1.0, 0.4, 0.1), (x, 2.1, 6.52), 0xC01010, 'Neon', **DEC)


def bus_stop(b):
    m = b.model('BusStop')
    m.blk('Roof', (12, 0.4, 4), (0, 9, 0), 0x2A2A2A, 'Metal')
    for x in (-5.8, 5.8):
        m.blk('Post', (0.3, 9, 0.3), (x, 4.5, 1.8), 0x2A2A2A, 'Metal')
    m.blk('Back', (11.6, 7, 0.1), (0, 4.5, 1.8), 0x9AB0B8, 'Glass', tr=0.5)
    Q.bench(m.at(T(0, 0, 1)))
    s = m.blk('Sign', (3, 1.2, 0.1), (4, 7.5, 1.7), 0x2A6AC0)
    gui_text(s, '88번 · PSI 앞', 'Front', bg=0x2A6AC0, fg=0xFFFFFF, font=19, ppu=40)


def solar_array(b, n=6):
    for i in range(n):
        b.blk('SolarPanel', (6, 0.2, 3.4), (i * 6.4, 2.2, 0), 0x1A2A4A, 'Glass', refl=0.3, rot=Rx(25))
        b.blk('Frame', (0.3, 2, 0.3), (i * 6.4, 1, 1), 0x8A8A8A, 'Metal')


def sat_dish(b):
    b.cyl('Mast', 3, 0.4, (0, 1.5, 0), 0x8A8A8A, 'Metal')
    b.cyl('Dish', 0.4, 4, (0, 3.6, 0), 0xE8E8E8, 'Metal', axis='z', rot=Rx(-35) * Ry(30))


def smoking_spot(b):
    Q.bench(b.at(T(0, 0, 0)))
    b.cyl('Ashtray', 2.8, 0.9, (4, 1.4, -0.5), 0x6A6A6A, 'Metal')
    for i in range(6):
        b.blk('Butt', (0.08, 0.08, 0.35), (R.uniform(-3, 5), 0.04, R.uniform(-2, -0.6)), 0xE8D8B8, rot=Ry(R.uniform(0, 180)), **DEC)
    for i in range(3):
        Q.d_can(b.at(T(R.uniform(-3, 3), 0, R.uniform(-3, -1))))


def camp(b):
    m = b.model('AbandonedCamp')
    m.wedge('TentL', (4, 3, 2.2), T(0, 1.5, -1.1) * Ry(180), 0xC86A2A, 'Fabric')
    m.wedge('TentR', (4, 3, 2.2), T(0, 1.5, 1.1), 0xC86A2A, 'Fabric')
    Q.crate(m.at(T(3.5, 0, -1)))
    lan = m.blk('Lantern', (0.6, 0.9, 0.6), (2.5, 0.45, 1.6), 0x3A3A3A, 'Metal')
    P.bulb(m, 2.5, 0.6, 1.6, color=0xFFB060, bright=1.2, rng=18, d=0.35)
    p = m.blk('Note', (1.2, 0.03, 0.9), (1.6, 0.05, 2.6), 0xE8E0C8, rot=Ry(20), **DEC)
    s = m.blk('WarnSign', (2.6, 1.6, 0.15), (-3, 2.6, 0), 0xC8A870, 'WoodPlanks', rot=Ry(30))
    gui_text(s, '돌아가\n여긴 내핵이다', 'Front', bg=0xC8A870, fg=0x5A0A0A, font=9, ppu=40)
    m.cyl('SignPost', 2.6, 0.3, (-3, 1.3, 0), 0x6A4A2A, 'Wood')


# ================================================================== floor vignettes
def v88(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    # barricade beside the chained front door (door itself stays reachable)
    P.filing_cabinet(s.at(T(59.5, 0, -19) * Ry(-90) * T(0, 1.2, 0) * Rz(12) * T(0, -1.2, 0)), h=5)
    P.boxes_pile(at(s, 58.5, -4), n=6, r=1.6)
    P.chair(s.at(T(57, 0, -20.5) * Ry(40)), tipped=True)
    Q.coat_hooks(s.at(T(61.75, 6.5, -1.5) * Ry(90)))
    Q.umbrella_stand(at(s, 60.5, 1.5))
    # laundry, drying rack, low table meal, game corner, leak
    drying_rack(at(s, -18, 25, 8))
    laundry_line(s, -76, 28.5, -52, 28.5, y=9.5, n=10)
    low_table_meal(at(s, -66, 6, 15))
    game_corner(at(s, -40, 6.5))
    leak_bucket(at(s, 2, 4), c)
    escape_kit(at(s, -36, -47, 25))
    # ramen tower next to the kitchen
    for i in range(6):
        s.blk('RamenBox', (2.6, 1.6, 2.0), (8 + R.uniform(-0.2, 0.2), 0.8 + i * 1.6, 35.5), 0xE8D8B0, 'Fabric', rot=Ry(R.uniform(-8, 8)))
    t = s.blk('RamenLabel', (2.2, 0.8, 0.03), (8, 1.0, 34.48), 0xE8D8B0, **DEC)
    gui_text(t, '라면 40개입', 'Front', bg=0xE8D8B0, fg=0xC02020, font=20, ppu=40)
    # kitchen counter life
    k = s.model('KitchenLife')
    bowl_stack(k.at(T(21, 3.2, 53.4)), 6)
    bowl_stack(k.at(T(22.8, 3.2, 53.6)), 4, col=0xE8E0D0)
    k.blk('DishRack', (2.4, 1.0, 1.4), (25.5, 3.7, 53.6), STEEL, 'Metal', **NC)
    k.cyl('RiceCooker', 1.2, 1.4, (36, 3.8, 53.8), 0xF0F0F0, **NC)
    k.blk('Kettle', (0.9, 1.0, 0.9), (32, 3.85, 53.4), 0xC0C0C0, 'Metal', **NC)
    k.blk('CuttingBoard', (2, 0.15, 1.2), (17, 3.3, 53.4), 0xD8B07A, 'Wood', **NC)
    k.blk('Knife', (0.15, 0.05, 1.2), (17.3, 3.42, 53.4), STEEL, 'Metal', **DEC)
    Q.trash_bags(at(s, 13, 50))
    note = k.blk('FridgeNote', (1.0, 1.0, 0.03), (44, 4.8, 51.85), 0xF8F080, **DEC)
    gui_text(note, '내 꺼\n먹지 마\n— 공유', 'Front', bg=0xF8F080, fg=0x1A1A1A, font=9, ppu=60)
    # bedrooms: lived-in details
    xs = [-79, -64, -49, -34, -19, -4, 11]
    posters = ['아이돌 포스터', '세계 지도', '오늘도 수고했어', '88', '도망쳐', 'PSI 입사 축하']
    for i in range(6):
        x0, x1 = xs[i], xs[i + 1]
        r = s.model('Room%d' % (i + 1))
        r.blk('Rug', (6, 0.05, 5), (x0 + 7, 0.03, 44), R.choice([0x6A5A7A, 0x5A7A6A, 0x8A6A4A, 0x4A5A7A]), 'Fabric', **DEC)
        r.blk('Laptop', (1.4, 0.08, 1.0), (x1 - 2.5, 2.85, 50), 0xC0C0C0, 'Metal', **NC)
        r.blk('Screen', (1.4, 0.9, 0.06), (x1 - 2.0, 3.3, 50), 0x1A1A1A, rot=Ry(90) * Rx(-10), **NC)
        P.bulb(r, x1 - 2.5, 3.6, 51.4, color=0xFFD8A0, bright=0.4, rng=8, d=0.3)
        r.blk('LampStand', (0.2, 0.8, 0.2), (x1 - 2.5, 3.2, 51.4), BLACK, **NC)
        for k_ in range(R.randint(2, 4)):
            r.blk('Clothes', (R.uniform(1, 2), 0.3, R.uniform(0.8, 1.4)), (x0 + R.uniform(2, 6), 0.15, R.uniform(33, 37)),
                  R.choice([0x3A4A6A, 0xE8E8E8, 0x8A2A2A, 0x2A2A2A]), 'Fabric', rot=Ry(R.uniform(0, 180)), **DEC)
        Q.poster(r.at(T(x0 + 0.32, 7, 44) * Ry(-90)), posters[i], R.choice([0x1A1A2A, 0xF0EDE4, 0x2A0A0A]), R.choice([0xF0C020, 0x1A1A1A, 0xE8E8E8]))
        if i % 2:
            Q.backpack(at(r, x1 - 1.5, 33, 200))
        else:
            Q.guitar(at(r, x0 + 1.2, 38, 90)) if i == 2 else Q.laundry_basket(at(r, x0 + 1.6, 33, 90))
    # bathroom & laundry
    for x in (4, 8, 12):
        s.cyl('ToothCup', 0.5, 0.4, (x, 3.45, -26.6), R.choice([0xE0A0B0, 0xA0C0E0, 0xF0F0F0]), **NC)
    for i in range(3):
        s.blk('Towel', (1.2, 2.0, 0.1), (-6 + i * 1.6, 5, -25.45), R.choice([0xF0F0F0, 0x6AA8D0, 0xE0A0B0]), 'Fabric', **DEC)
    for i in range(3):
        s.cyl('Detergent', 1.0, 0.6, (-74 + i * 3.4, 3.9, -52.5), R.choice([0x2A6AC0, 0xF0F0F0, 0xE04040]), 'Plastic', **NC)
    laundry_line(s, -78, -30, -48, -30, y=9, n=9)


def v87(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    scaffold(at(s, -32, -40), 7, 4, 12)
    generator(at(s, 40, -44, 20))
    apology_shrine(at(s, 4, 9))
    tape_line(s, [(-46, -50), (-46, -40), (-4, -40), (-4, -50)])
    tape_line(s, [(14, 30), (14, 44), (40, 44)])
    tape_line(s, [(-64, 18), (-64, 46), (-40, 46)])
    for x, z in ((-20, 30), (30, -20), (-60, -10), (10, 40)):
        Q.cone(at(s, x, z, R.uniform(0, 90)))
    # fallen ductwork from the ceiling
    for x, z, a in ((-10, -20, 20), (25, 10, -35), (-50, 30, 60)):
        s.blk('FallenDuct', (2.4, 2.0, 14), (x, 4.5, z), 0xA8A8A4, 'Metal', rot=Ry(a) * Rx(22))
        s.blk('DuctHanger', (0.1, 3, 0.1), (x, c - 1.5, z), STEEL, 'Metal', **NC)
    for x, z in ((-28, -6), (20, -38), (-55, 8)):
        s.blk('Tarp', (8, 0.1, 6), (x, c - 1.2, z), 0x3A6AA0, 'Fabric', rot=Rx(R.uniform(-15, 15)) * Rz(R.uniform(-12, 12)), **NC)
    for _ in range(26):
        Q.d_tile(at(s, R.uniform(-75, 40), R.uniform(-50, 50)))


def v80(fb, F):
    s = fb.model('Story')
    for z in range(-45, 50, 14):
        rolling_ladder(at(s, R.uniform(-50, 30), z + 1.6, 0), h=11)
    for x, z in ((-20, -27), (10, 20), (-35, 34), (20, -6)):
        file_cart(at(s, x, z, R.choice([0, 90])))
    shredder(at(s, -2, 3))
    s.blk('SortTable', (8, 3, 4), (-7, 1.5, -8), 0x5A4A3A, 'Wood')
    for i in range(8):
        s.blk('OpenFolder', (1.6, 0.05, 1.2), (-10 + i * 0.9, 3.05, -8 + R.uniform(-1, 1)), 0xC8A86A, rot=Ry(R.uniform(-30, 30)), **DEC)
    tape_line(s, [(-56, -8), (-56, 8)], y=3.2)
    P.sign(s, '기록 반출 금지', -56.6, 8, 12, '+x', 5, 1.2, bg=0x8A1010, fg=0xFFFFFF, name='NoRemoval')
    for z in range(-48, 50, 7):
        P.sign(s, '%s-%02d' % ('ABCDEFGHIJKLMN'[min(13, (z + 48) // 7)], R.randint(1, 30)), 42.5, 10, z, '+x', 1.6, 0.6,
               bg=0xE8E8E8, fg=0x1A1A1A, name='ShelfTag')
    for x in (-40, 20):
        s.blk('Dehumidifier', (1.6, 2.6, 1.2), (x, 1.3, 50), 0xF0F0F0, 'SmoothPlastic')


def v70(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    # cable tray over the consoles
    s.blk('CableTray', (62, 0.3, 1.6), (10, c - 2, 32), 0x8A8E92, 'Metal', **NC)
    for x in range(-18, 41, 10):
        s.blk('TrayHanger', (0.1, 1.8, 0.1), (x, c - 1.1, 32), STEEL, 'Metal', **NC)
    for i in range(12):
        s.beam('Cable', (R.uniform(-20, 40), c - 1.8, 32 + R.uniform(-0.6, 0.6)), (R.uniform(-20, 40), c - 1.8, 32 + R.uniform(-0.6, 0.6)),
               0.15, 0.15, R.choice([BLACK, 0x2A4A8A, 0x8A2A2A]), **DEC)
    coffee_station(at(s, -21, 2, 90))
    cot(at(s, 38, -50, 90))
    chicken_box(at(s, 4, 36, 0, y=4.3))
    for x, z in ((-12, 44), (14, 36), (30, 28), (-8, 28)):
        for i in range(R.randint(1, 3)):
            s.cyl('EnergyDrink', 0.6, 0.3, (x + R.uniform(-2, 2), 3.7 + (0.6 if z < 40 else 0) + (0.6 if z < 32 else 0), z + R.uniform(-0.8, 0.4)),
                  R.choice([0x1A6AC0, 0x2A2A2A, 0x6AC02A]), 'Metal', **NC)
    Q.key_box(s.at(T(-24.65, 6, -20) * Ry(-90)))
    Q.whiteboard_stand(at(s, 26, -34), '근무표\n주간: ■■\n야간: 공유 (?)\n※ 50층 모니터 꺼지면 보고')
    Q.coat_hooks(s.at(T(-24.65, 6.5, -40) * Ry(-90)))


def v66(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    tin_boxes(at(s, 46, -21, 15, y=1.6), 4)
    scooter(at(s, 47, -6, 70, y=1.6))
    mb = s.blk('MenuBoard', (20, 6, 0.4), (-20, 22, 54.6), 0x1A1410)
    gui_text(mb, '짜장면 5,000  ·  짬뽕 6,000  ·  탕수육 15,000\n곱빼기 무료 (살아서 나가면)', 'Front', bg=0x1A1410, fg=0xF2E0B0, glow=True, font=19, ppu=20)
    jar = s.model('DanmujiJar')
    jar.cyl('Jar', 10, 7, (-72, 6.2, -48), 0xC8E0C8, 'Glass', tr=0.4)
    jar.cyl('Pickles', 7, 6.4, (-72, 4.6, -48), 0xF2D23A, 'SmoothPlastic', **NC)
    jar.cyl('Lid', 1, 7.4, (-72, 11.6, -48), 0xC02020, 'Metal')
    holder = s.model('ChopstickHolder')
    holder.cyl('Cup', 6, 3, (58, 4.6, -22), 0xB8BCC0, 'Metal')
    for i in range(7):
        holder.beam('Chopstick', (58 + R.uniform(-0.8, 0.8), 3, -22 + R.uniform(-0.8, 0.8)), (58 + R.uniform(-2, 2), 11, -22 + R.uniform(-2, 2)), 0.3, 0.3, 0xC8A050, 'Wood', **NC)
    hood = s.model('Hood')
    hood.blk('Hood', (20, 3, 10), (52, c - 2, -12), 0xB8BCC0, 'Metal', **NC)
    hood.blk('Duct', (4, 6, 4), (52, c + 1, -12), 0xA8ACB0, 'Metal', **NC)


def v60(fb, F):
    s = fb.model('Story')
    ticket_machine(at(s, 44, -22, -90))
    for ix in range(6):
        for iz in range(4):
            x, z = -66 + ix * 18, -42 + iz * 15
            if x > 40 and z < 0:
                continue
            s.blk('NapkinBox', (0.8, 0.6, 0.5), (x - 5, 3.3, z), 0xF0F0F0, **NC)
            s.cyl('ChiliSauce', 0.8, 0.35, (x - 4, 3.4, z + 0.4), 0xC02020, **NC)
            s.blk('SpoonCase', (1.0, 0.4, 0.5), (x + 5, 3.2, z), STEEL, 'Metal', **NC)
    for i in range(6):
        s.blk('Ladle', (0.15, 2.4, 0.15), (-40 + i * 1.2, 7.6, 54.3), STEEL, 'Metal', **NC)
    s.blk('LadleRail', (8, 0.2, 0.2), (-37, 8.8, 54.3), STEEL, 'Metal', **NC)
    for i in range(5):
        s.blk('RiceSack', (2.4, 0.9, 1.6), (-74 + R.uniform(-0.2, 0.2), 0.45 + i * 0.85, 34), 0xE8E0C8, 'Fabric', rot=Ry(R.uniform(-10, 10)))
    for i in range(3):
        s.cyl('GasTank', 4, 1.4, (-76.5, 2, 40 + i * 1.8), 0x8A9AA8, 'Metal')
    for x in (-10, 6):
        bowl_stack(at(s, x, 51, y=3.2), 8)


def v50(fb, F):
    s = fb.model('Story')
    hx0, hx1, hz0, hz1 = -40, 20, -6, 38
    Q.footprints(s, (55, -11.5), (-11, -9), color=0x5A1A14, small=True, step=1.2)
    Q.footprints(s, (-11, 0), (-25, 22), color=0x5A1A14, small=True, step=1.2)
    flowerbed(at(s, -40, -42), 18)
    flowerbed(at(s, 10, -42), 18)
    gnome(at(s, -24, -40, 160))
    gnome(at(s, -2, -41, 200))
    kid_bike(at(s, 30, -14, 40))
    kiddie_pool(at(s, 30, 10))
    laundry_line(s, -66, 30, -45, 30, y=7, n=7, small=True)
    for x in (-60, -45):
        s.cyl('LinePost', 7.5, 0.3, (x - 6 if x == -60 else x, 3.75, 30), 0xE8E8E8, 'Metal')
    lamp_post(at(s, -20, -46))
    lamp_post(at(s, 36, -46))
    for i in range(10):
        s.cyl('SteppingStone', 0.15, 1.6, (-11 + R.uniform(-0.5, 0.5), 0.2, -44 + i * 3.6), 0xB8B0A0, 'Slate', **DEC)
    s.cyl('HoseReel', 1.0, 1.6, (19, 1.2, -8), 0x2A8A3A, 'Plastic', axis='x')
    # inside the house
    h = s.model('HouseLife')
    P.shelf(at(h, -38.5, 6, 90), w=6, h=6, kind='books', color=0xFFFFFF, mat='SmoothPlastic')
    for i in range(4):
        fr = h.blk('FamilyPhoto', (1.4, 1.1, 0.08), (-30 + i * 2.2, 6.8, 17.55), 0x1A1A1A, **DEC)
        h.blk('Photo', (1.2, 0.9, 0.03), (-30 + i * 2.2, 6.8, 17.5), 0xE8D8C0, **DEC)
        if i != 2:
            h.blk('Scratch', (1.0, 0.15, 0.02), (-30 + i * 2.2, 7.0, 17.48), 0x1A1A1A, rot=Rz(R.uniform(-30, 30)), **DEC)
    dollhouse(at(h, -14, 22, 30))
    h.blk('Wardrobe', (5, 8, 2.2), (-36, 4.3, 36), 0xF0E0E8, 'Wood')
    P.bulb(h, -37, 1.0, 24, color=0xFFB0D0, bright=0.4, rng=8, d=0.5)
    for i in range(14):
        t = i / 13
        h.blk('ToyTrail', (0.8, 0.8, 0.8), (-22 + 11 * t + R.uniform(-1, 1), 0.7, 18 - 22 * t + R.uniform(-1, 1)),
              R.choice([0xE03030, 0x3060E0, 0xF0C020, 0x30B040]), rot=Ry(R.uniform(0, 90)), **NC)
    for i in range(5):
        d = h.blk('FridgeDrawing', (0.9, 1.1, 0.03), (12 + (i % 3) * 1.0, 5.5 + (i // 3) * 1.2, 36.6), 0xFAF8F0, rot=Rz(R.uniform(-10, 10)), **DEC)
    P.fridge(at(h, 14, 36.6, 180))
    h.blk('ShoeRack', (4, 1.4, 1.2), (-6, 1.0, -4.8), 0xF0F0F0, 'Wood')
    for i in range(4):
        h.blk('KidShoe', (0.5, 0.3, 0.9), (-7.5 + i * 1.0, 1.85, -4.8), R.choice([0xF06AA0, 0xF0F0F0, 0xE04040]), **NC)


def v44(fb, F):
    s = fb.model('Story')
    for x, z in ((24, 22), (36, 36), (8, 40), (24, -22), (36, -40), (8, -42), (-30, 30), (-16, 42), (-30, -32), (-16, -44)):
        round_party_table(at(s, x, z, R.uniform(0, 360)))
    dj_booth(at(s, -50, 34, 120))
    balloon_arch(s.at(T(47, 0, -11.5) * Ry(90)), w=12, h=11)
    photo_wall(at(s, -40, 53.6, 180))
    P.sign(s, '노래방 ♪ 피의 축제다~', -77.3, 7, -20, '+x', 8, 3, bg=0x0A0A20, fg=0x6AC8FF, glow=True, name='Karaoke')


def v40(fb, F):
    s = fb.model('Story')
    # a trail of green glow sticks someone left to find the way out
    pts = [(44, -10), (30, -14), (22, -26), (6, -30), (-10, -22), (-26, -18), (-40, -6), (-58, -2), (-74, 0)]
    for a, b2 in zip(pts, pts[1:]):
        for t in (0.25, 0.75):
            x, z = a[0] + (b2[0] - a[0]) * t, a[1] + (b2[1] - a[1]) * t
            g = s.cyl('GlowStick', 0.8, 0.15, (x + R.uniform(-1, 1), 0.1, z + R.uniform(-1, 1)), 0x5AFF6A, 'Neon', axis='x',
                      rot=Ry(R.uniform(0, 180)), **DEC)
    for x, z in ((10, -30), (-40, -6)):
        fl = s.cyl('DroppedFlashlight', 1.0, 0.35, (x, 0.18, z), 0x1A1A1A, 'Metal', axis='x', rot=Ry(30), **NC)
        light(fl, 'SpotLight', 0xFFF0D0, 1.5, 22, True, 'Right', 45)


def v30(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    for i in range(8):
        s.cyl('PoolNoodle', 5, 0.5, (-40 + R.uniform(-15, 15), 0.4, -20 + R.uniform(-10, 10)), R.choice([0xF06AA0, 0x6AF0A0, 0xF0D040, 0x6AA8F0]),
              'Plastic', axis='x', rot=Ry(R.uniform(0, 180)), **NC)
    for i in range(6):
        s.blk('Kickboard', (1.6, 0.25, 2.2), (-8 + R.uniform(-1, 1), 4.15 + i * 0.25, 28), R.choice([0x2A6AC0, 0xF0D040]), rot=Ry(R.uniform(-10, 10)))
    s.ball('RubberDuck', 2.2, (-58, 1.5, 10), 0xF0D020, refl=0.1, **NC)
    s.ball('DuckHead', 1.3, (-58.8, 2.9, 10), 0xF0D020, **NC)
    s.blk('Beak', (0.8, 0.3, 0.5), (-59.7, 2.8, 10), 0xF08020, **NC)
    punching_bag(at(s, 40, 0), c)
    punching_bag(at(s, 34, 0), c)
    s.blk('GymMat', (12, 0.2, 8), (30, 0.1, 18), 0x2A3A5A, 'Fabric', **DEC)
    s.blk('ForgottenTowel', (1.6, 0.1, 2.4), (22, 1.85, -30), 0xF0F0F0, 'Fabric', **DEC)
    s.cyl('WaterBottle', 1.0, 0.45, (21.2, 2.3, -29), 0x6AA8F0, 'Glass', tr=0.3, **NC)


def v20(fb, F):
    s = fb.model('Story')
    grand_piano(at(s, -48, 40, 200))
    aquarium(at(s, -76.4, -16, -90))
    chess_table(at(s, -42, -38))
    for x in range(-24, 58, 12):
        Q.pedestal_vase(at(s, x + 6, -6.8, 180))
    s.blk('SecretaryPhone', (1.0, 0.4, 0.8), (-12.5, 3.3, -38.5), 0x1A1A1A, **NC)
    P.sign(s, '비서실', -10, 9, -30.4, '-z', 3, 0.9, bg=0x1A1210, fg=0xE8C870, name='SecretarySign')


def v10(fb, F):
    c = F['h'] - 1
    s = fb.model('Story')
    block_castle(at(s, -70, -48))
    for x, z in ((-72, 28), (-59, 36), (-46, 28), (-33, 36)):
        mobile_hanging(at(s, x, z), c)
    # banner with a name scratched out
    bn = s.blk('Banner', (16, 2, 0.1), (-40, 10.5, 19.55), 0xF0B0C0, **DEC)
    gui_text(bn, '생일 축하해 ▓▓아!', 'Front', bg=0xF0B0C0, fg=0x8A1030, font=9, ppu=30)
    for i in range(5):
        s.blk('JuiceBox', (0.4, 0.6, 0.3), (-60 + i * 0.6, 2.1, -35.4), R.choice([0xF0A020, 0x6AC02A, 0xE04040]), **NC)
    for i in range(6):
        s.blk('MiniSink', (2, 2, 1.4), (20 + i * 2.6, 1.0, -53.8), 0xF0F0F0)
        s.blk('Faucet', (0.2, 0.6, 0.6), (20 + i * 2.6, 2.3, -54.2), STEEL, 'Metal', **NC)
    Q.footprints(s, (55, -11.5), (-50, 38), color=0x5A1A14, small=True, step=1.2)


def v8(fb, F):
    s = fb.model('Story')
    lounge(at(s, -66, -2, 90))
    dartboard(s.at(T(-78.6, 7, -12) * Ry(-90)))
    for row in range(2):
        for col in range(3):
            P.desk(at(s, 20 + col * 7.5, 6 + row * 9, 0 if row == 0 else 180), w=6.5, nameplate='6팀',
                   screen_text=R.choice([None, '6팀 — 퇴근함', None]))
    P.sign(s, '정보구출반 6팀', 27.5, 8.5, 3.2, '-z', 6, 1.0, bg=0x2A3442, fg=0xFFFFFF, name='Team6Sign')
    cake = s.model('LeftoverCake')
    cake.cyl('Cake', 0.9, 2.2, (40, 3.65, -38), 0xF8F0F0, **NC)
    cake.cyl('Missing', 0.92, 0.8, (40.6, 3.65, -37.6), 0xE8D8C8, **DEC)
    for i in range(3):
        P.bulb(cake, 39.6 + i * 0.4, 4.4, -38, color=0xFFB060, bright=0.2, rng=5, d=0.12)
    plq = s.blk('Plaque', (2.6, 1.6, 0.1), (-4, 8, 41.75), 0x5A3A1A, 'Wood', **DEC)
    gui_text(plq, '올해의 팀\n정보구출반 8팀', 'Front', bg=0x5A3A1A, fg=0xF2C84A, font=19, ppu=40)
    team = s.blk('TeamPhoto', (4, 2.6, 0.1), (5, 8, 41.75), 0x1A1A1A, **DEC)
    gui_text(team, '8팀 단체사진\n(공유만 흐릿함)', 'Front', bg=0xC8C0B0, fg=0x2A2A2A, font=19, ppu=30)
    for i in range(8):
        s.blk('MailSlot', (1.2, 1.0, 1.6), (-28 + (i % 4) * 1.3, 4 + (i // 4) * 1.1, 41), 0xC8C8C4, 'Metal')
    Q.copier(at(s, -20, -14, 0))
    Q.paper_reams(at(s, -16, -14, 0))


def v1(fb, F):
    s = fb.model('Story')
    coffee_kiosk(at(s, -60, 34, 180))
    for x, z in ((-34, -44), (34, -44)):
        Q.planter_long(at(s, x, z, 0))
        Q.bench(at(s, x, z + 2.6, 180))
    for i in range(8):
        s.cyl('Stanchion', 3.2, 0.3, (36, 1.6, -8 + i * 3), GOLD, 'Metal')
        if i:
            s.beam('Rope', (36, 2.9, -8 + (i - 1) * 3), (36, 2.6, -8 + i * 3), 0.2, 0.2, 0x8A0A14, 'Fabric', **NC)
    Q.wet_floor(at(s, 10, -30, 30))
    Q.mop_bucket(at(s, 12, -33, 200))
    lost = s.model('LostAndFound')
    lost.blk('Box', (3, 2, 2), (58, 1, 38), 0xB89A6A, 'Fabric')
    lost.blk('Umbrella', (0.2, 3, 0.2), (57.4, 2.4, 38), 0x1A1A1A, rot=Rz(20), **NC)
    lost.blk('Shoe', (0.6, 0.4, 1.2), (58.6, 2.2, 38), 0xF06AA0, **NC)
    lb = lost.blk('Label', (2.4, 0.6, 0.05), (58, 1.4, 36.97), 0xB89A6A, **DEC)
    gui_text(lb, '분실물', 'Front', bg=0xB89A6A, fg=0x1A1A1A, font=19, ppu=40)


def vB1(fb, F):
    s = fb.model('Story')
    c = F['h'] - 1
    for x in range(-60, 41, 14):
        for z in range(-42, 43, 14):
            P.ceiling_light(s, x, z, c, color=0xFFD8A8, neon=0xFFE8C8, bright=0.7, rng=18, size=(1.0, 1.0), name='TrackLight')
    for i, x in enumerate((-48, -36, -24)):
        s.blk('WrappedMannequin', (2.4, 7, 1.6), (x, 3.5, 40), 0xF0F0F0, 'Glass', tr=0.35)
        P.mannequin(at(s, x, 40, 180), headless=(i == 1))
    Q.ladder_lean(at(s, 52, -52, 180))
    Q.paint_cans(at(s, 48, -50))
    for i in range(8):
        s.cyl('Rope', 3, 0.25, (-20 + i * 3, 1.5, 34), GOLD, 'Metal')
        if i:
            s.beam('Velvet', (-20 + (i - 1) * 3, 2.8, 34), (-20 + i * 3, 2.5, 34), 0.25, 0.25, 0x5A0A14, 'Fabric', **NC)
    for i in range(5):
        s.blk('ShoppingBag', (1.2, 1.4, 0.6), (-16 + i * 1.4, 0.7, 47), 0x1E1410, rot=Ry(R.uniform(-10, 10)), **NC)
    s.blk('SewingMachine', (1.8, 1.4, 0.9), (30, 3.7, -20), 0x1A1A1A, 'Metal')
    s.blk('Fabric', (3, 0.1, 2), (32, 3.05, -20), 0x2A2A34, 'Fabric', rot=Ry(15), **DEC)
    P.table(at(s, 31, -20), 6, 3, 3, color=0x3A2A1E)
    s.blk('Tape', (0.1, 0.02, 3), (29, 3.07, -19), 0xF0D040, **DEC)


def vB2(fb, F):
    s = fb.model('Story')
    br = s.model('Bridge')
    br.beam('Ramp', (-30, 0.6, -10), (-20, 5, -10), 4, 0.5, 0xC8A070, 'WoodPlanks')
    br.blk('Deck', (12, 0.5, 4), (-14, 5, -10), 0xC8A070, 'WoodPlanks')
    br.beam('Ramp', (-8, 5, -10), (2, 0.6, -10), 4, 0.5, 0xC8A070, 'WoodPlanks')
    for x in (-20, -8):
        for z in (-12, -8):
            br.blk('Post', (0.5, 4.6, 0.5), (x, 2.8, z), 0xA88050, 'Wood')
    tun = s.model('Tunnel')
    for k in range(6):
        for j in range(14):
            a = j / 14 * math.tau
            tun.blk('TubeSeg', (1.6, 1.6, 0.6), (30 + math.cos(a) * 3.2, 3.8 + math.sin(a) * 3.2, -2 + k * 1.6), 0x6AB0E0, 'Glass', tr=0.4,
                    rot=Rz(math.degrees(a)))
    for x, z in ((-40, 40), (40, -40), (0, 40)):
        s.cyl('Cucumber', 0.8, 5, (x, 1.0, z), 0xE8F0C8, 'SmoothPlastic')
        s.cyl('CucumberSkin', 0.82, 5.2, (x, 1.0, z), 0x3A7A2A, **DEC)
    bag = s.blk('FoodBag', (6, 9, 2.4), (55, 4.8, 50), 0xE8C040, 'Fabric', rot=Rx(-10))
    lb = s.blk('BagLabel', (5, 3, 0.05), (55, 5.6, 48.6), 0xE8C040, rot=Rx(-10), **DEC)
    gui_text(lb, '기니 사료\n20kg', 'Front', bg=0xE8C040, fg=0x6A3A0A, font=20, ppu=30)
    for _ in range(30):
        s.blk('Pellet', (0.4, 0.3, 0.7), (R.uniform(-75, -50), 0.75, R.uniform(-50, -30)), 0x3A2A1A, rot=Ry(R.uniform(0, 180)), **DEC)


def vB3(fb, F):
    s = fb.model('Story')
    for iz in range(3):
        z = -38 + iz * 30
        s.beam('Irrigation', (-74, 2.8, z + 3.2), (40, 2.8, z + 3.2), 0.25, 0.25, 0x2A2A2A, **DEC)
    strip = s.model('StripCurtain')
    for i in range(10):
        strip.blk('Strip', (0.5, 9, 0.05), (48 + i * 0.6, 4.5, -18), 0xC8D8D0, 'Glass', tr=0.5, **NC)
    lab = s.model('LabCorner')
    Q.lab_table(at(lab, 36, 44, 180))
    P.fridge(at(lab, 44, 51, 180), color=0xE8F0E8)
    boots = s.model('MissingWorker')
    boots.blk('BootL', (0.7, 1.2, 1.4), (-4, 0.9, 10), 0x2A3A2A, 'Plastic', rot=Ry(20))
    boots.blk('BootR', (0.7, 1.2, 1.4), (-3, 0.9, 11.4), 0x2A3A2A, 'Plastic', rot=Rz(80))
    boots.blk('Glove', (0.6, 0.2, 0.9), (-2, 0.4, 9), 0xE0C020, 'Fabric', **DEC)
    boots.blk('Cap', (1.2, 0.5, 1.2), (-5, 0.5, 12.5), 0x3A6A3A, 'Fabric', **DEC)
    Q.footprints(s, (-3, 11), (-10, 2), color=0x4A0A1E, step=1.5)
    for _ in range(18):
        a, r = R.uniform(0, math.tau), R.uniform(8, 26)
        x, z = -10 + math.cos(a) * r, math.sin(a) * r
        for k in range(R.randint(2, 4)):
            s.cyl('MushroomStem', 0.6, 0.2, (x + R.uniform(-0.4, 0.4), 0.6, z + R.uniform(-0.4, 0.4)), 0xE8E0D0, **DEC)
            s.cyl('MushroomCap', 0.2, 0.7, (x + R.uniform(-0.4, 0.4), 0.95, z + R.uniform(-0.4, 0.4)), R.choice([0x8A2A1A, 0xC8B8A0]), **DEC)


def vHospital(fb, F):
    n = F['n']
    c = F['h'] - 1
    s = fb.model('Story')
    xs = [-79, -64, -49, -34, -19, -4, 11, 26, 41] if n != -13 else [-34, -19, -4, 11, 26, 41]
    # corridor handrails (split at the doors)
    for zc in (5.45, -5.45):
        cuts = [(xs[i] + xs[i + 1]) / 2 for i in range(len(xs) - 1)]
        cur = xs[0] + 0.5
        for cx in cuts + [xs[-1] + 2.5]:
            a, b2 = cur, cx - 2.7
            if b2 - a > 1:
                s.box('Handrail', a, 3.0, zc - 0.12, b2, 3.25, zc + 0.12, 0xB8A070, 'Wood')
                for x in (a + 0.4, b2 - 0.4):
                    s.box('RailBracket', x - 0.06, 2.9, min(zc, zc * 1.02), x + 0.06, 3.1, max(zc, zc * 1.02) + 0.01, STEEL, 'Metal', **DEC)
            cur = cx + 2.7
    # fire doors held open mid-corridor
    if n != -13:
        for sgn in (-1, 1):
            s.blk('FireDoor', (5.4, 9, 0.3), (-31.2, 4.5, sgn * 5.0), 0xA8B0A8, 'Metal')
            s.blk('FireDoorWindow', (1.2, 2.4, 0.32), (-31.2, 6, sgn * 5.0), 0x9AB0B8, 'Glass', tr=0.4, **NC)
        s.box('FireDoorFrameL', -34.4, 0, -6.2, -33.6, 10, -5.8, 0x6A7A6A, 'Metal')
        s.box('FireDoorFrameR', -34.4, 0, 5.8, -33.6, 10, 6.2, 0x6A7A6A, 'Metal')
        s.box('FireDoorHead', -34.4, 9.4, -6.2, -33.6, 10, 6.2, 0x6A7A6A, 'Metal')
    # headwalls above beds in ward / padded / cell rooms
    for i in range(len(xs) - 1):
        cx = (xs[i] + xs[i + 1]) / 2
        for side, zb in (('N', 54.6), ('S', -54.6)):
            Q.headwall(s.at(T(cx, 4.8, zb) * Ry(0 if side == 'N' else 180)))
    # nurse station details
    ns = s.model('NurseStationLife')
    wb = ns.blk('PatientBoard', (0.2, 4, 8), (61.75, 6, 26), 0xF8F8F6)
    names = ['B%d-01 ■■■', 'B%d-02 ■■■', 'B%d-03 조수민 (탈출)', 'B%d-04 공유?', 'B%d-05 ■■■']
    gui_text(wb, '\n'.join(x % -n for x in names), 'Left', bg=0xF8F8F6, fg=0x1A3A6A, font=9, ppu=30)
    ns.blk('Phone', (1.0, 0.4, 0.8), (51, 3.4, 18), 0x1A1A1A, **NC)
    ns.blk('MedFridge', (2.4, 4, 2), (58, 2, 34), 0xF0F0F0, 'Metal')
    for i in range(5):
        ns.blk('Chart', (0.9, 0.08, 1.2), (51 + R.uniform(-0.5, 0.5), 3.3 + i * 0.08, 25 + R.uniform(-1, 1)), 0xE8E0C8, rot=Ry(R.uniform(-20, 20)), **DEC)
    Q.footprints(s, (50, 0), (-70, 1), color=0x3A2A1E if n != -12 else BLOOD, step=1.7)


VIGNETTES = {88: v88, 87: v87, 80: v80, 70: v70, 66: v66, 60: v60, 50: v50, 44: v44, 40: v40, 30: v30, 20: v20, 10: v10, 8: v8,
             1: v1, -1: vB1, -2: vB2, -3: vB3}
for _n in range(-13, -5):
    VIGNETTES[_n] = vHospital


def extras(root, roof_y, core_top):
    """Roof, street and inner-core dressing (outside the per-floor models)."""
    rf = root.model('RoofLife', cf=T(0, roof_y, 0))
    solar_array(rf.at(T(-62, 0, -36)), 6)
    solar_array(rf.at(T(-62, 0, -26)), 6)
    sat_dish(at(rf, 30, 40))
    sat_dish(at(rf, 40, 28))
    smoking_spot(at(rf, 20, -40, 180))
    for _ in range(6):
        Q.d_puddle(at(rf, R.uniform(-70, 50), R.uniform(-45, 45)))
    for x in (-75, 75):
        rf.beam('RoofPipe', (x, 1, -50), (x, 1, 50), 0.8, 0.8, 0x8A8A86, 'Metal')
    g = rf.model('Gondola')
    g.blk('Basket', (14, 3, 3), (0, -40, -58.5), 0xE8E8E8, 'Metal')
    for x in (-6, 6):
        g.blk('Cable', (0.1, 40, 0.1), (x, -20, -58.5), BLACK, **NC)
    g.blk('Arm', (2, 1, 6), (0, 4, -56), 0x8A8A8A, 'Metal')
    st = root.model('StreetLife')
    for i, x in enumerate((-150, -120, -60, 40, 90, 140)):
        car(at(st, x, -180 + (8 if i % 2 else -8), 90 if i % 2 else -90))
    for x in (-60, -40, 40, 60):
        car(at(st, x, -135, 0))
    bus_stop(at(st, -90, -162, 0))
    for x in range(-100, 101, 10):
        st.cyl('Bollard', 2.6, 0.8, (x, 1.3, -152), 0x2A2A2A, 'Metal')
    for x in range(-12, 13, 3):
        st.box('Crosswalk', x - 0.8, 0.07, -208, x + 0.8, 0.1, -172, 0xE8E0C8, collide=False, shadow=False)
    for x in (-95, 95):
        Q.trash_bins(at(st, x, -150, 0))
        Q.bench(at(st, x + (8 if x < 0 else -8), -150, 0))
    tl = st.model('TrafficLight')
    tl.cyl('Pole', 14, 0.6, (16, 7, -168), 0x2A2A2A, 'Metal')
    tl.blk('Box', (1.4, 4, 1.4), (16, 15, -168), 0x1A1A1A, 'Metal')
    for i, col in enumerate((0x3A0A0A, 0x3A3A0A, 0x2AFF6A)):
        tl.cyl('Lamp', 0.2, 1.0, (16, 16.2 - i * 1.2, -168.75), col, 'Neon' if i == 2 else 'SmoothPlastic', axis='z', **DEC)
    cm = root.model('CoreLife')
    camp(cm.at(T(-48, core_top - 16, 5) * Ry(-60)))
    for _ in range(14):
        a, r = R.uniform(0, math.tau), R.uniform(60, 74)
        y = core_top - R.uniform(20, 90)
        cl = cm.model('CrystalCluster')
        for k in range(R.randint(3, 6)):
            cl.blk('Crystal', (0.8, R.uniform(2, 5), 0.8), (-10 + math.cos(a) * r + R.uniform(-1, 1), y, math.sin(a) * r + R.uniform(-1, 1)),
                   R.choice([0xFF8A3A, 0xFFC060, 0xFF5A2A]), 'Neon', rot=Rz(R.uniform(-35, 35)) * Rx(R.uniform(-35, 35)), **NC)
    for k in range(20):
        a = math.pi + k / 20 * math.pi * 1.2
        x, z = -10 + math.cos(a) * 48.4, math.sin(a) * 48.4
        y = core_top - 16 - 66 * (k / 20) * 0.4
        cm.cyl('RailPost', 3, 0.3, (x, y + 1.5, z), 0x5A3A22, 'Wood')
        if k:
            pa = math.pi + (k - 1) / 20 * math.pi * 1.2
            px, pz = -10 + math.cos(pa) * 48.4, math.sin(pa) * 48.4
            py = core_top - 16 - 66 * ((k - 1) / 20) * 0.4
            cm.beam('RailRope', (px, py + 2.8, pz), (x, y + 2.8, z), 0.15, 0.15, 0xC8A870, 'Fabric', **NC)


# ================================================================== open-floor clusters (run through the dresser)
def desk_pod(b, team=None):
    m = b.model('DeskPod')
    m.blk('Divider', (13, 1.6, 0.25), (0, 3.9, 0), 0x8A9AA8, 'Glass', tr=0.4)
    for i in range(2):
        for side in (-1, 1):
            P.desk(m.at(T(-3.3 + i * 6.6, 0, side * 1.7) * Ry(0 if side > 0 else 180)), w=6.2, d=3,
                   nameplate=team, screen_text=R.choice([None, None, '로그인', '보고서_최종.hwp']))


def seating_island(b):
    m = b.model('SeatingIsland')
    m.blk('Rug', (14, 0.06, 10), (0, 0.06, 0), R.choice([0x3A2A24, 0x2A2C30, 0x4A3A30]), 'Fabric', **DEC)
    P.sofa(m.at(T(0, 0, 3.6)), w=9, color=0x2A2C30)
    P.sofa(m.at(T(0, 0, -3.6) * Ry(180)), w=9, color=0x2A2C30)
    P.table(m, 5, 2.4, 1.5, color=0x1A1A1A, mat='Granite')
    P.plant(m.at(T(6, 0, 0)), h=6)
    m.blk('Magazine', (0.9, 0.04, 1.2), (0.8, 1.52, 0.2), 0xC02020, rot=Ry(20), **DEC)


def display_table(b):
    m = b.model('ShirtTable')
    P.table(m, 5, 3, 3, color=0x2A1C14, leg=GOLD)
    for i in range(3):
        for j in range(2):
            for k in range(R.randint(2, 4)):
                m.blk('FoldedShirt', (1.3, 0.25, 1.1), (-1.6 + i * 1.6, 3.15 + k * 0.25, -0.6 + j * 1.2),
                      R.choice([0xF2F2F2, 0xC8D8F0, 0xF0E0D0, 0x9AB0D0]), 'Fabric', **NC)


def storage_cage(b):
    m = b.model('StorageCage')
    for x in (-3, 3):
        m.blk('Mesh', (0.15, 8, 6), (x, 4, 0), 0x3A3A3A, 'DiamondPlate', tr=0.5)
    m.blk('MeshBack', (6, 8, 0.15), (0, 4, 3), 0x3A3A3A, 'DiamondPlate', tr=0.5)
    P.boxes_pile(m.at(T(0, 0, 1)), n=6, r=1.8)


def cl8(d):
    d.cluster(lambda b: desk_pod(b, '5팀'), 14, 8, (-38, -18, 8, 2), n=2, clear=3.5, rots=(0, 180))
    d.cluster(lambda b: desk_pod(b, '4팀'), 14, 8, (-12, 18, 40, 38), n=1, clear=3.5, rots=(0, 180))


def cl1(d):
    d.cluster(seating_island, 14, 10, (-52, -44, -26, 34), n=3, clear=4)
    d.cluster(seating_island, 14, 10, (12, 12, 34, 40), n=1, clear=4)


def clB1(d):
    import props2 as Q2
    d.cluster(Q2.clothing_rack, 6, 1.8, (-50, -34, 26, 28), n=9, clear=3)
    d.cluster(display_table, 5, 3, (-50, -34, 26, 28), n=4, clear=3)


def cl70(d):
    d.cluster(storage_cage, 6, 6, (-23, -54, 12, -32), n=2, clear=3)


def clB2(d):
    import props2 as Q2
    d.cluster(Q2.hay_bale, 4, 2.4, (-70, -48, 50, 48), n=6, clear=4)
    d.cluster(Q2.chew_blocks, 4, 2.6, (-70, -48, 50, 48), n=5, clear=4)


def cl30(d):
    import props2 as Q2
    d.cluster(Q2.spin_bike, 1.6, 4, (12, -12, 30, 14), n=4, clear=2.5, rots=(0,))


CLUSTERS = {8: cl8, 1: cl1, -1: clB1, 70: cl70, -2: clB2, 30: cl30}
