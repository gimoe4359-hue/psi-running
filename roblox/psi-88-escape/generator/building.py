"""Building shell: slabs, facades, the continuous stair core and elevator bank."""
import math
from rbx import Inst, T, Ry, light, gui_text
import props as P

# Footprint (outer face of the facade)
BX0, BX1, BZ0, BZ1 = -80, 80, -56, 56
# Stair shaft (outer faces of the shaft walls)
SX0, SX1, SZ0, SZ1 = 62, 78, -16, 16
SHAFT_HOLE = (SX0, SX1, SZ0, SZ1)
LANE_A = (63, 69.5)
LANE_B = (70.5, 77)
DOOR_Z = -11.5
DOOR_W = 5
DOOR_H = 8

SHAFT_WALL = 0xB4B0A8
SHAFT_STEP = 0x9C9890


def tag(b, *tags):
    b.parent.prop('BinaryString', 'Tags', '\0'.join(tags).encode('utf-8'))


# ---------------------------------------------------------------- rect helpers
def rect_minus(outer, holes):
    """outer=(x0,x1,z0,z1); holes list of same. Returns covering rects."""
    x0, x1, z0, z1 = outer
    hs = [(max(h[0], x0), min(h[1], x1), max(h[2], z0), min(h[3], z1)) for h in holes]
    hs = [h for h in hs if h[0] < h[1] and h[2] < h[3]]
    xs = sorted({x0, x1, *[h[0] for h in hs], *[h[1] for h in hs]})
    strips = []
    for a, b in zip(xs, xs[1:]):
        if b - a < 1e-6:
            continue
        cuts = sorted((h[2], h[3]) for h in hs if h[0] < b - 1e-6 and h[1] > a + 1e-6)
        ivs, cur = [], z0
        for c0, c1 in cuts:
            if c0 > cur:
                ivs.append((cur, c0))
            cur = max(cur, c1)
        if cur < z1:
            ivs.append((cur, z1))
        if strips and strips[-1][2] == ivs and abs(strips[-1][1] - a) < 1e-6:
            strips[-1][1] = b
        else:
            strips.append([a, b, ivs])
    out = []
    for a, b, ivs in strips:
        for c0, c1 in ivs:
            out.append((a, b, c0, c1))
    return out


def slab(b, y0, y1, holes, color, mat, outer=(BX0, BX1, BZ0, BZ1), name='Slab', **kw):
    m = b.model(name)
    for (x0, x1, z0, z1) in rect_minus(outer, holes):
        m.box(name, x0, y0, z0, x1, y1, z1, color, mat, **kw)
    return m


def _darker(c, k=0.5):
    return (int(((c >> 16) & 255) * k) << 16) | (int(((c >> 8) & 255) * k) << 8) | int((c & 255) * k)


def _trim(m, a0, a1, axis, plane, t, y0, y1, color):
    """Baseboard + a thin top cap on both faces of a wall segment."""
    if y1 - y0 < 6 or t < 0.3 or a1 - a0 < 0.8 or abs(y0) > 0.6:
        return
    bc = _darker(color, 0.45)
    for sgn in (-1, 1):
        f0, f1 = plane + sgn * t / 2, plane + sgn * (t / 2 + 0.12)
        lo, hi = min(f0, f1), max(f0, f1)
        if axis == 'x':
            m.box('Baseboard', a0, y0, lo, a1, y0 + 0.55, hi, bc, 'Wood', shadow=False, collide=False)
        else:
            m.box('Baseboard', lo, y0, a0, hi, y0 + 0.55, a1, bc, 'Wood', shadow=False, collide=False)


def wall_x(b, x0, x1, z, y0, y1, color, mat='Concrete', t=0.6, openings=(), name='Wall', trim=True, **kw):
    """Wall running along X at depth z. openings: (x_centre, width, height)."""
    m = b.model(name)
    cur = x0
    for xc, w, h in sorted(openings):
        a, c = xc - w / 2, xc + w / 2
        if a > cur:
            m.box('Wall', cur, y0, z - t / 2, a, y1, z + t / 2, color, mat, **kw)
            if trim:
                _trim(m, cur, a, 'x', z, t, y0, y1, color)
        if y0 + h < y1:
            m.box('Lintel', a, y0 + h, z - t / 2, c, y1, z + t / 2, color, mat, **kw)
        cur = c
    if cur < x1:
        m.box('Wall', cur, y0, z - t / 2, x1, y1, z + t / 2, color, mat, **kw)
        if trim:
            _trim(m, cur, x1, 'x', z, t, y0, y1, color)
    return m


def wall_z(b, z0, z1, x, y0, y1, color, mat='Concrete', t=0.6, openings=(), name='Wall', trim=True, **kw):
    m = b.model(name)
    cur = z0
    for zc, w, h in sorted(openings):
        a, c = zc - w / 2, zc + w / 2
        if a > cur:
            m.box('Wall', x - t / 2, y0, cur, x + t / 2, y1, a, color, mat, **kw)
            if trim:
                _trim(m, cur, a, 'z', x, t, y0, y1, color)
        if y0 + h < y1:
            m.box('Lintel', x - t / 2, y0 + h, a, x + t / 2, y1, c, color, mat, **kw)
        cur = c
    if cur < z1:
        m.box('Wall', x - t / 2, y0, cur, x + t / 2, y1, z1, color, mat, **kw)
        if trim:
            _trim(m, cur, z1, 'z', x, t, y0, y1, color)
    return m


def door_in_wall_x(b, xc, z, w=4, h=8, open_deg=75, flip=False, **kw):
    """Door model in a wall along X. flip=True opens toward +Z."""
    return P.door(b.at(T(xc, 0, z) * Ry(180 if flip else 0)), w, h, open_deg=open_deg, **kw)


def door_in_wall_z(b, zc, x, w=4, h=8, open_deg=75, flip=False, **kw):
    """Door in a wall along Z. Default opens toward -X, flip opens toward +X."""
    return P.door(b.at(T(x, 0, zc) * Ry(-90 if flip else 90)), w, h, open_deg=open_deg, **kw)


# ---------------------------------------------------------------- facade
def _segments(a0, a1, missing):
    cur, out = a0, []
    for m0, m1 in sorted(missing):
        if m0 > cur:
            out.append((cur, m0))
        cur = max(cur, m1)
    if cur < a1:
        out.append((cur, a1))
    return out


def facade_glass(b, h, missing=None, tint=0x31424A, frame=0x2B2E31, spandrel=0x3A3D40, sill=1.5,
                 glass_tr=0.45, bay=8, mid_rail=False):
    """Curtain wall: spandrel band, one glass pane per side (split around holes), mullions."""
    missing = missing or {}
    c = h - 1
    m = b.model('Facade')
    sides = {
        'S': ('x', BX0, BX1, BZ0, -1), 'N': ('x', BX0, BX1, BZ1, 1),
        'W': ('z', BZ0 + 1, BZ1 - 1, BX0, -1), 'E': ('z', BZ0 + 1, BZ1 - 1, BX1, 1),
    }
    top0 = c - 1.2
    for key, (axis, a0, a1, plane, sgn) in sides.items():
        p0, p1 = (plane, plane - sgn) if sgn > 0 else (plane, plane - sgn)
        q0, q1 = min(p0, p1), max(p0, p1)
        holes = missing.get(key, [])

        def put(name, u0, u1, y0, y1, col, mat, inset=0.0, thick=None, **kw):
            t0, t1 = q0, q1
            if thick is not None:
                mid = (q0 + q1) / 2 + inset
                t0, t1 = mid - thick / 2, mid + thick / 2
            if axis == 'x':
                m.box(name, u0, y0, t0, u1, y1, t1, col, mat, **kw)
            else:
                m.box(name, t0, y0, u0, t1, y1, u1, col, mat, **kw)

        for u0, u1 in _segments(a0, a1, [(x0, x1) for x0, x1, full in holes if full]):
            put('Spandrel', u0, u1, -1, sill, spandrel, 'Concrete')
            put('TopBand', u0, u1, top0, h - 1, spandrel, 'Concrete')
        for u0, u1 in _segments(a0, a1, [(x0, x1) for x0, x1, _ in holes]):
            put('Glass', u0, u1, sill, top0, tint, 'Glass', thick=0.3, tr=glass_tr, refl=0.12, shadow=False)
            if mid_rail:
                put('Transom', u0, u1, (sill + top0) / 2 - 0.2, (sill + top0) / 2 + 0.2, frame, 'Metal', thick=0.6)
        n = int(round((a1 - a0) / bay))
        for i in range(n + 1):
            u = a0 + i * (a1 - a0) / n
            if any(x0 - 0.5 <= u <= x1 + 0.5 for x0, x1, full in holes if full):
                continue
            outer = plane + sgn * 0.25
            if axis == 'x':
                m.box('Mullion', u - 0.25, -1, outer - 0.45, u + 0.25, h - 1, outer + 0.45, frame, 'Metal', shadow=False)
            else:
                m.box('Mullion', outer - 0.45, -1, u - 0.25, outer + 0.45, h - 1, u + 0.25, frame, 'Metal', shadow=False)
    return m


def basement_walls(b, h, color=0x8E8A82, mat='Concrete'):
    m = b.model('OuterWalls')
    c = h - 1
    m.box('WallS', BX0, -1, BZ0, BX1, c, BZ0 + 1, color, mat)
    m.box('WallN', BX0, -1, BZ1 - 1, BX1, c, BZ1, color, mat)
    m.box('WallW', BX0, -1, BZ0 + 1, BX0 + 1, c, BZ1 - 1, color, mat)
    m.box('WallE', BX1 - 1, -1, BZ0 + 1, BX1, c, BZ1 - 1, color, mat)
    return m


# ---------------------------------------------------------------- stair core
def stair_segment(b, F):
    h = F['h']
    c = h - 1
    s = b.model('StairCore')
    st = s.model('Shaft')
    # walls
    wall_z(st, SZ0, SZ1, SX0 + 0.5, -1, c, SHAFT_WALL, t=1, openings=[(DOOR_Z, DOOR_W, DOOR_H + 1)], name='WallWest')
    st.box('WallEast', SX1 - 1, -1, SZ0, SX1, c, SZ1, SHAFT_WALL, 'Concrete')
    st.box('WallSouth', SX0 + 1, -1, SZ0, SX1 - 1, c, SZ0 + 1, SHAFT_WALL, 'Concrete')
    st.box('WallNorth', SX0 + 1, -1, SZ1 - 1, SX1 - 1, c, SZ1, SHAFT_WALL, 'Concrete')
    st.box('Divider', LANE_A[1], -1, -8, LANE_B[0], c, 8, 0xA8A49C, 'Concrete')
    st.box('Landing', 63, -1, -15, 77, 0, -8, SHAFT_STEP, 'Concrete')
    if not F.get('below'):
        st.box('ShaftFloor', 63, -1, -8, 77, 0, 15, SHAFT_STEP, 'Concrete')
    st.box('Threshold', SX0, -1, DOOR_Z - DOOR_W / 2, SX0 + 1, 0.06, DOOR_Z + DOOR_W / 2, 0x6A6A6A, 'Metal')

    # arrival flights from the floor above
    if F.get('above'):
        fl = s.model('Flights')
        f = 2 * math.ceil(h / 18)
        r = h / f
        n = max(1, round(r))
        rise, run = r / n, 16 / n
        for k in range(f):
            yt, yb = h - k * r, h - (k + 1) * r
            lane = LANE_A if k % 2 == 0 else LANE_B
            xc, lw = (lane[0] + lane[1]) / 2, lane[1] - lane[0]
            za, zb = (-8, 8) if k % 2 == 0 else (8, -8)
            dirz = 1 if zb > za else -1
            for i in range(1, n + 1):
                ytop = yt - i * rise
                z0 = za + dirz * (i - 1) * run
                z1 = za + dirz * i * run
                fl.box('Step', lane[0], ytop - rise - 0.3, min(z0, z1), lane[1], ytop, max(z0, z1),
                       SHAFT_STEP, 'Concrete', collide=False)
                fl.box('Nosing', lane[0], ytop - 0.05, (z1 - dirz * 0.3) - 0.15, lane[1], ytop + 0.02,
                       (z1 - dirz * 0.3) + 0.15, 0xC9A04A, 'DiamondPlate', collide=False, shadow=False)
            # invisible walking ramp along the nosing line
            fl.beam('Ramp', (xc, yt - 0.32, za), (xc, yb - 0.32, zb), lw, 0.6, SHAFT_STEP, tr=1, shadow=False)
            # handrail on the divider side
            rx = LANE_A[1] - 0.25 if k % 2 == 0 else LANE_B[0] + 0.25
            fl.beam('Handrail', (rx, yt + 3, za), (rx, yb + 3, zb), 0.2, 0.2, 0x5A5A5A, 'Metal', collide=False)
            if k < f - 1:
                if k % 2 == 0:
                    fl.box('LandingFar', 63, yb - 1, 8, 77, yb, 15, SHAFT_STEP, 'Concrete')
                    P.emergency_light(fl, 70, yb + 7, 14.75, '-z', color=0xFFE6C0, bright=0.8, rng=16)
                else:
                    fl.box('LandingMid', 63, yb - 1, -15, 77, yb, -8, SHAFT_STEP, 'Concrete')
        if F.get('skip_text'):
            P.sign(fl, F['skip_text'], 70, h - r + 5.2, 14.85, '-z', 9, 2.6, bg=0xC9A227, fg=0x111111,
                   name='SkipSign')
            P.wall_text(fl, '…', 66, h - r + 2.5, 14.9, '-z', 4, 2, fg=0x5A0A0A)

    # landing details
    P.sign(st, F['label'], 70, 6, -14.85, '+z', 5, 3, bg=0x1A1A1A, fg=0xF2F2F2, name='FloorNumber')
    P.emergency_light(st, 66, c - 1.5, -14.75, '+z', color=0xFFE6C0, bright=0.9, rng=18)
    P.exit_sign(b, SX0 - 0.15, DOOR_H + 1, DOOR_Z, '-x')
    P.sign(b, '%s  %s' % (F['label'], F['title']), SX0 - 0.12, 5.5, DOOR_Z + 6.5, '-x', 6.5, 1.6,
           bg=0x202326, fg=0xE8E8E8, name='FloorTitle')

    # door between floor and shaft
    dm = s.model('Gameplay')
    mode = F.get('door', 'open')
    if mode != 'none':
        door_m = door_in_wall_z(dm, DOOR_Z, SX0 + 0.5, DOOR_W - 0.4, DOOR_H - 0.3,
                                open_deg=0 if mode == 'locked' else 80, color=0x5E6266, frame=0x3A3D40,
                                locked=(mode == 'locked'), name='StairDoor', window=True)
        tag(door_m, 'StairDoor')
        if mode == 'locked':
            P.chains_x(dm.at(T(SX0 - 0.1, 0, DOOR_Z) * Ry(90)), DOOR_W, DOOR_H)
    if F.get('gate'):
        g = P.bars_along_x(dm, LANE_A[0] + 0.25, LANE_A[1] - 0.25, -8.3, 0, 8.8, step=1.0,
                           color=0x2E2C2A, name='ExitGate')
        tag(g, 'ExitGate')
        g.blk('GateLock', (1.0, 1.2, 0.6), ((LANE_A[0] + LANE_A[1]) / 2, 4.2, -8.7), P.GOLD, 'Metal', collide=False)
        P.sign(g, '잠김 LOCKED', (LANE_A[0] + LANE_A[1]) / 2, 6.2, -8.75, '-z', 3.6, 1, bg=0x8A1010,
               fg=0xFFFFFF, name='GateSign')
    return s


# ---------------------------------------------------------------- elevator bank (decorative)
def elevator_bank(b, F, text=None, bent=False):
    h = F['h']
    c = h - 1
    e = b.model('ElevatorBank')
    col = 0xB8B4AC
    e.box('WallW', 64, -1, 18, 65, c, 34, col, 'Concrete')
    e.box('WallE', 77, -1, 18, 78, c, 34, col, 'Concrete')
    e.box('WallS', 65, -1, 18, 77, c, 19, col, 'Concrete')
    e.box('WallN', 65, -1, 33, 77, c, 34, col, 'Concrete')
    for zc in (22.2, 29.8):
        e.box('Frame', 63.7, 0, zc - 3, 64.05, 8.6, zc + 3, 0x8A8E92, 'Metal')
        if bent:
            e.blk('DoorL', (0.2, 8, 2.6), (63.4, 4, zc - 1.35), 0x9AA0A6, 'Metal', rot=Ry(12))
        else:
            e.box('DoorL', 63.5, 0, zc - 2.7, 63.7, 8, zc - 0.03, 0x9AA0A6, 'Metal', refl=0.1)
        e.box('DoorR', 63.5, 0, zc + 0.03, 63.7, 8, zc + 2.7, 0x9AA0A6, 'Metal', refl=0.1)
        P.sign(e, text or F['label'], 63.55, 9.6, zc, '-x', 2.4, 0.9, bg=0x0A0A0A, fg=0xFF5A2A, glow=True,
               name='Indicator', font=10)
    e.box('CallPanel', 63.5, 3.4, 25.6, 63.7, 5.6, 26.4, 0x6A6E72, 'Metal')
    for y in (4.0, 5.0):
        e.cyl('CallButton', 0.15, 0.4, (63.42, y, 26), 0xFFB02A if text is None else 0x3A3A3A, 'Neon', axis='x',
              collide=False)
    if text:
        P.sign(e, text, 63.55, 6.6, 26, '-x', 3.2, 0.8, bg=0x8A1010, fg=0xFFFFFF, name='OutOfOrder')
    return e


# ---------------------------------------------------------------- per-floor common pieces
def floor_common(fb, F):
    h = F['h']
    c = h - 1
    holes = [SHAFT_HOLE] + F.get('holes', [])
    st = fb.model('Structure')
    slab(st, -1, 0, holes, F.get('floor_color', 0x8A8580), F.get('floor_mat', 'Concrete'), name='Floor')
    if F.get('ceiling', True):
        slab(st, c - 0.2, c, [SHAFT_HOLE] + F.get('ceil_holes', []), F.get('ceil_color', 0xD8D6D0),
             F.get('ceil_mat', 'SmoothPlastic'), outer=(BX0 + 1, BX1 - 1, BZ0 + 1, BZ1 - 1), name='Ceiling',
             shadow=False)
    ext = F.get('ext', 'glass')
    if ext == 'glass':
        facade_glass(st, h, missing=F.get('facade_missing'), mid_rail=h > 20)
    elif ext == 'basement':
        basement_walls(st, h, F.get('outer_color', 0x8E8A82), F.get('outer_mat', 'Concrete'))
    detail_floor(st, F)
    stair_segment(fb, F)
    elevator_bank(fb, F, F.get('elevator_text'), F.get('elevator_bent', False))


def detail_floor(st, F):
    """Architectural detail shared by every floor: pilasters, sills, baseboards, drop-ceiling grid."""
    h = F['h']
    c = h - 1
    d = st.model('Detail')
    ext = F.get('ext', 'glass')
    trimc = F.get('trim_color', 0x2E2A28)
    skip_s = [(x0 - 2, x1 + 2) for x0, x1, _ in F.get('facade_missing', {}).get('S', [])]
    # perimeter baseboard on the outer walls
    for x0, z0, x1, z1 in ((-79, -55, 79, -54.85), (-79, 54.85, 79, 55), (-79, -55, -78.85, 55), (78.85, -55, 79, 55)):
        d.box('Baseboard', x0, 0, z0, x1, 0.55, z1, trimc, 'Wood', shadow=False, collide=False)
    if ext == 'glass':
        for x0, z0, x1, z1 in ((-79, -55, 79, -54.3), (-79, 54.3, 79, 55), (-79, -55, -78.3, 55), (78.3, -55, 79, 55)):
            d.box('Sill', x0, 1.35, z0, x1, 1.6, z1, 0xD8D4CC, 'Marble', shadow=False)
    # pilasters (structural columns) every 16 studs
    pc = F.get('pilaster_color', 0xB8B2A8 if ext == 'glass' else F.get('outer_color', 0x8E8A82))
    pm = 'Concrete' if ext == 'glass' else F.get('outer_mat', 'Concrete')
    for x in range(-72, 73, 16):
        for zf, sgn in ((-55, 1), (55, -1)):
            if zf < 0 and any(a <= x <= b for a, b in skip_s):
                continue
            d.box('Pilaster', x - 1.1, 0, min(zf, zf + sgn * 0.9), x + 1.1, c, max(zf, zf + sgn * 0.9), pc, pm)
    for z in range(-48, 49, 16):
        d.box('Pilaster', -79, 0, z - 1.1, -78.1, c, z + 1.1, pc, pm)
        if not (-20 <= z <= 36):
            d.box('Pilaster', 78.1, 0, z - 1.1, 79, c, z + 1.1, pc, pm)
    # drop ceiling grid (T-bars)
    if F.get('ceiling', True) and F.get('ceil_grid', False):
        gc = F.get('grid_color', 0xC8C6C0)
        y0, y1 = c - 0.32, c - 0.2
        for z in range(-52, 53, 4):
            if SZ0 <= z <= SZ1:
                d.box('TBar', -79, y0, z - 0.08, SX0, y1, z + 0.08, gc, 'Metal', shadow=False, collide=False)
                d.box('TBar', SX1, y0, z - 0.08, 79, y1, z + 0.08, gc, 'Metal', shadow=False, collide=False)
            else:
                d.box('TBar', -79, y0, z - 0.08, 79, y1, z + 0.08, gc, 'Metal', shadow=False, collide=False)
        for x in range(-76, 77, 4):
            if SX0 <= x <= SX1:
                d.box('TBar', x - 0.08, y0, -55, x + 0.08, y1, SZ0, gc, 'Metal', shadow=False, collide=False)
                d.box('TBar', x - 0.08, y0, SZ1, x + 0.08, y1, 55, gc, 'Metal', shadow=False, collide=False)
            else:
                d.box('TBar', x - 0.08, y0, -55, x + 0.08, y1, 55, gc, 'Metal', shadow=False, collide=False)
