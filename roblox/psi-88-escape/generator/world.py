"""Lighting, sky dressing, roof, exterior plaza and the parallel-world skyline."""
import math
import random
from rbx import Inst, T, Rx, Ry, Rz, light, gui_text
import props as P
from building import slab, BX0, BX1, BZ0, BZ1, rect_minus

RW = random.Random(1088)


def lighting(root_lighting):
    L = root_lighting
    L.prop('token', 'Technology', 4)  # Future
    L.prop('Color3', 'Ambient', 0x1E1A20)
    L.prop('float', 'Brightness', 1.6)
    L.prop('float', 'ClockTime', 17.9)
    L.prop('float', 'GeographicLatitude', 30)
    L.prop('Color3', 'OutdoorAmbient', 0x5A3438)
    L.prop('bool', 'GlobalShadows', True)
    L.prop('float', 'EnvironmentDiffuseScale', 1)
    L.prop('float', 'EnvironmentSpecularScale', 1)
    L.prop('float', 'ShadowSoftness', 0.2)
    L.prop('float', 'ExposureCompensation', 0.1)
    a = Inst('Atmosphere', 'Atmosphere', L)
    a.prop('float', 'Density', 0.38)
    a.prop('float', 'Offset', 0.12)
    a.prop('Color3', 'Color', 0xC0645A)
    a.prop('Color3', 'Decay', 0x5A1E28)
    a.prop('float', 'Glare', 0.35)
    a.prop('float', 'Haze', 2.2)
    b = Inst('BloomEffect', 'Bloom', L)
    b.prop('float', 'Intensity', 0.6)
    b.prop('float', 'Size', 24)
    b.prop('float', 'Threshold', 1.3)
    cc = Inst('ColorCorrectionEffect', 'ParallelWorldGrade', L)
    cc.prop('float', 'Brightness', 0.0)
    cc.prop('float', 'Contrast', 0.12)
    cc.prop('float', 'Saturation', -0.12)
    cc.prop('Color3', 'TintColor', 0xFFEEE8)
    sr = Inst('SunRaysEffect', 'SunRays', L)
    sr.prop('float', 'Intensity', 0.06)
    sr.prop('float', 'Spread', 0.7)


LETTERS = {
    'P': [(0, 0, 1, 7), (1, 6, 4, 7), (1, 3, 4, 4), (4, 4, 5, 6)],
    'S': [(0, 6, 5, 7), (0, 4, 1, 6), (0, 3, 5, 4), (4, 1, 5, 3), (0, 0, 5, 1)],
    'I': [(2, 1, 3, 6), (0, 6, 5, 7), (0, 0, 5, 1)],
}


def roof(world, y):
    """y = world height of the top of 88F's ceiling slab (roof surface)."""
    m = world.model('Roof')
    slab(m, y - 1, y, [], 0x6A6660, 'Concrete', name='RoofSlab')
    for x0, z0, x1, z1 in ((BX0, BZ0, BX1, BZ0 + 1), (BX0, BZ1 - 1, BX1, BZ1), (BX0, BZ0, BX0 + 1, BZ1), (BX1 - 1, BZ0, BX1, BZ1)):
        m.box('Parapet', x0, y, z0, x1, y + 3.5, z1, 0x3A3D40, 'Concrete')
    for i in range(4):
        m.box('HVAC', -60 + i * 16, y, 20, -50 + i * 16, y + 6, 32, 0x8A8E92, 'Metal')
        m.cyl('Fan', 0.4, 6, (-55 + i * 16, y + 6.2, 26), 0x2A2A2A, 'Metal')
    m.cyl('WaterTank', 14, 12, (45, y + 7, 35), 0x6A7A80, 'CorrodedMetal')
    m.box('StairHouse', 60, y, -18, 80, y + 12, 18, 0x4A4D50, 'Concrete')
    m.cyl('Helipad', 0.2, 34, (-10, y + 0.1, -10), 0x2A2C30, 'Asphalt', collide=False)
    for x0, z0, x1, z1 in ((-17, -18, -15, -2), (-5, -18, -3, -2), (-15, -11, -5, -9)):
        m.box('H', x0, y + 0.2, z0, x1, y + 0.25, z1, 0xF2F2F2, collide=False)
    ant = m.cyl('Antenna', 60, 0.8, (70, y + 42, 0), 0x6A6A6A, 'Metal')
    beacon = m.ball('Beacon', 1.5, (70, y + 72.5, 0), 0xFF2020, 'Neon', collide=False)
    light(beacon, 'PointLight', 0xFF2020, 2, 40)
    # PSI sign (Neon block letters) facing the plaza (south)
    sign = m.model('PSI_Sign')
    u = 4.2
    x_start = 36
    for li, ch in enumerate('PSI'):
        for (a, b, c, d) in LETTERS[ch]:
            lx0, lx1 = x_start - (li * 6 + a) * u, x_start - (li * 6 + c) * u
            sign.box('Letter_' + ch, min(lx0, lx1), y + 6 + b * u, -50.5, max(lx0, lx1), y + 6 + d * u, -48.5, 0xFF1A2A, 'Neon',
                     shadow=False)
    for x in (-30, -10, 10, 30):
        sign.box('Truss', x - 0.5, y, -47, x + 0.5, y + 6 + 7 * u, -46, 0x2A2A2A, 'Metal')
    sign.box('TrussBar', -38, y + 5, -47, 38, y + 6, -46, 0x2A2A2A, 'Metal')
    for x in (-25, 0, 25):
        p = sign.blk('SignGlow', (1, 1, 1), (x, y + 20, -54), 0xFF2030, tr=1, collide=False, shadow=False)
        light(p, 'PointLight', 0xFF2030, 2.5, 40)
    return m


def exterior(world):
    m = world.model('Exterior')
    m.parent.prop('token', 'ModelStreamingMode', 2)  # Persistent: keep the skyline visible
    # ground (around the building footprint, which has its own 1F slab)
    for (x0, x1, z0, z1) in rect_minus((-700, 700, -700, 700), [(BX0, BX1, BZ0, BZ1)]):
        m.box('Ground', x0, -1, z0, x1, 0, z1, 0x2A2826, 'Asphalt')
    # plaza
    m.box('Plaza', -110, 0, -150, 110, 0.12, -56, 0x8A847A, 'Pavement')
    m.box('PlazaSide', -110, 0, -56, -80, 0.12, 80, 0x8A847A, 'Pavement')
    m.box('PlazaSide', 80, 0, -56, 110, 0.12, 80, 0x8A847A, 'Pavement')
    m.box('Canopy', -24, 20, -72, 24, 21.5, -56, 0x1E2024, 'Metal')
    for x in (-22, 22):
        m.cyl('CanopyPost', 20, 1.2, (x, 10, -71), 0x1E2024, 'Metal')
    cl = m.blk('CanopyLight', (40, 0.2, 10), (0, 19.85, -64), 0xFFE8C8, 'Neon', collide=False, shadow=False)
    light(cl, 'SurfaceLight', 0xFFD8B0, 1.2, 24, True, 'Bottom', 120)
    stone = m.box('NameStone', -30, 0, -112, 30, 8, -104, 0x1E1E20, 'Granite')
    P.sign(m, 'PSI', 0, 4.5, -112.1, '-z', 30, 6, bg=0x1E1E20, fg=0xD8D0C0, name='StoneText', font=20)
    for x in (-50, -40, 40, 50):
        m.cyl('FlagPole', 40, 0.6, (x, 20, -100), 0xB8BCC0, 'Metal')
        m.blk('Flag', (0.1, 6, 10), (x, 36, -95), 0x8A1010, 'Fabric', collide=False)
    # dead trees
    for x, z in ((-90, -80), (-95, -120), (90, -80), (95, -125), (-60, -135), (60, -135)):
        tr = m.model('DeadTree')
        tr.cyl('Trunk', 14, 1.6, (x, 7, z), 0x2A2018, 'Wood')
        for k in range(5):
            a = RW.uniform(0, math.tau)
            y = RW.uniform(8, 13)
            tr.beam('Branch', (x, y, z), (x + math.cos(a) * 6, y + RW.uniform(2, 5), z + math.sin(a) * 6), 0.6, 0.6,
                    0x2A2018, 'Wood', collide=False)
    # road + street lights
    m.box('Road', -700, 0.02, -210, 700, 0.06, -170, 0x1E1E20, 'Asphalt')
    for x in range(-690, 700, 24):
        m.box('LaneMark', x, 0.06, -190.4, x + 10, 0.08, -189.6, 0xE8E0C8, collide=False, shadow=False)
    for x in range(-160, 161, 40):
        m.cyl('StreetPole', 18, 0.6, (x, 9, -165), 0x2A2A2A, 'Metal')
        p = m.blk('StreetLamp', (3, 0.6, 1.2), (x, 18, -167), 0xFFC8A0, 'Neon', collide=False, shadow=False)
        light(p, 'SpotLight', 0xFFB890, 2, 40, False, 'Bottom', 90)
    # invisible boundary so players can't wander off (only matters if they get outside)
    for x0, z0, x1, z1 in ((-240, -240, 240, -238), (-240, 238, 240, 240), (-240, -240, -238, 240), (238, -240, 240, 240)):
        m.box('Boundary', x0, 0, z0, x1, 300, z1, 0, tr=1, shadow=False)
    return m


def skyline(world):
    m = world.model('ParallelSkyline')
    m.parent.prop('token', 'ModelStreamingMode', 2)
    # surrounding towers
    for k in range(30):
        a = k / 30 * math.tau + RW.uniform(-0.08, 0.08)
        r = RW.uniform(560, 900)
        x, z = math.cos(a) * r, math.sin(a) * r
        w, d, h = RW.uniform(60, 120), RW.uniform(60, 120), RW.uniform(180, 600)
        rot = Ry(-math.degrees(a))
        m.blk('Tower', (w, h, d), (x, h / 2, z), RW.choice([0x16181E, 0x1E2026, 0x22242A]), 'Glass', rot=rot, refl=0.1)
        for j in range(RW.randint(2, 6)):
            y = RW.uniform(20, h - 10)
            m.blk('WindowBand', (w + 0.4, 1.4, d + 0.4), (x, y, z), RW.choice([0xFFB070, 0xFFE0B0, 0xA0C0FF, 0xFF3030]),
                  'Neon', rot=rot, collide=False, shadow=False, tr=0.3)
    # the mirrored city hanging upside-down from the sky
    for k in range(16):
        a = k / 16 * math.tau + RW.uniform(-0.1, 0.1)
        r = RW.uniform(620, 1000)
        x, z = math.cos(a) * r, math.sin(a) * r
        w, d, h = RW.uniform(40, 70), RW.uniform(40, 70), RW.uniform(150, 380)
        top = 1300
        m.blk('MirrorTower', (w, h, d), (x, top - h / 2, z), 0x1A1418, 'Glass', rot=Ry(RW.uniform(0, 90)), collide=False)
        m.blk('MirrorBand', (w + 0.4, 1.4, d + 0.4), (x, top - h + 30, z), 0xFF5A40, 'Neon', collide=False, shadow=False)
    # red moon
    moon = m.ball('RedMoon', 320, (-1400, 1100, 1700), 0x9A1A14, 'Neon', collide=False, shadow=False)
    return m
