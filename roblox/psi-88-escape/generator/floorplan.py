#!/usr/bin/env python3
"""Top-down walkability map of one floor + reachability test for gameplay anchors.

    python3 floorplan.py dump <cache.pkl>          # build the map once and cache part boxes
    python3 floorplan.py draw <cache.pkl> <n> <out.png> [x0 z0 x1 z1]
    python3 floorplan.py check <cache.pkl>         # every reachable-anchor must be reachable from the stair landing
"""
import pickle
import sys


def dump(path):
    import main
    import rbx
    base = main.build(False)
    floors = [(f[0], base[f[0]], f[2]) for f in main.FLOORS]
    out = []
    for kind, size, cf, color, tr, mat, refl, inst, collide in rbx.PREVIEW:
        R = cf.R
        hx = sum(abs(R[0][j]) * size[j] for j in range(3)) / 2
        hy = sum(abs(R[1][j]) * size[j] for j in range(3)) / 2
        hz = sum(abs(R[2][j]) * size[j] for j in range(3)) / 2
        p = cf.p
        tags = ''
        for t, n_, v in inst.props:
            if n_ == 'Tags':
                tags = v.decode('utf-8').replace('\0', ',')
        out.append((p[0] - hx, p[1] - hy, p[2] - hz, p[0] + hx, p[1] + hy, p[2] + hz, 1 if collide else 0, tr, inst.props[0][2], color, tags, kind))
    with open(path, 'wb') as fh:
        pickle.dump(dict(floors=floors, parts=out, texts=[(cf.p, text) for cf, size, face, text, bg, fg, bg_tr in rbx.PREVIEW_TEXT]), fh)
    print('cached', len(out), 'parts')


STEP = 1.4      # a humanoid walks up a ledge this high without jumping
HEAD = 4.8       # clearance needed above the feet
PAD = 0.75       # body radius


def grid(data, n):
    """Height-field of floor n on a 0.5-stud grid.

    Returns (levels, base): levels[(ix, iz)] = sorted list of heights (relative to the floor base) a player can stand on.
    """
    base, h = [(b, h) for f, b, h in data['floors'] if f == n][0]
    lo, hi = base - 1.2, base + h - 0.6
    tops, spans = {}, {}
    for x0, ya, z0, x1, yb, z1, col, tr, name, color, tags, kind in data['parts']:
        if not col or yb <= lo or ya >= hi or 'ExitGate' in tags:
            continue
        wedge = kind == 'Wedge'
        if yb <= base + 9:
            if wedge:
                hs = [ya + k for k in range(0, int(yb - ya) + 1)] + [yb]
            else:
                hs = [yb]
            for ix in range(int(x0 * 2 + 0.999), int(x1 * 2) + 1):
                for iz in range(int(z0 * 2 + 0.999), int(z1 * 2) + 1):
                    tops.setdefault((ix, iz), []).extend(hs)
        if wedge:
            continue
        for ix in range(int((x0 - PAD) * 2 + 0.999), int((x1 + PAD) * 2) + 1):
            for iz in range(int((z0 - PAD) * 2 + 0.999), int((z1 + PAD) * 2) + 1):
                spans.setdefault((ix, iz), []).append((ya, yb))
    levels = {}
    for c, ts in tops.items():
        sp = spans.get(c, ())
        ok = []
        for t in sorted(set(round(v, 2) for v in ts)):
            if t < lo or t > base + 9:
                continue
            if any(b < t + HEAD and e > t + STEP for b, e in sp):
                continue
            if ok and t - ok[-1] < 0.3:
                ok[-1] = t
            else:
                ok.append(t)
        if ok:
            levels[c] = [round(t - base, 2) for t in ok]
    return levels, base


def flood(levels, start=(60.0, -11.5), bounds=(-82, -58, 80, 58)):
    """Reachable (cell, level) pairs walking from the stair door. Dropping down is always allowed."""
    sx, sz = int(start[0] * 2), int(start[1] * 2)
    if (sx, sz) not in levels:
        return {}
    seen = {(sx, sz): {levels[(sx, sz)][0]}}
    stack = [(sx, sz, levels[(sx, sz)][0])]
    bx0, bz0, bx1, bz1 = [int(v * 2) for v in bounds]
    while stack:
        x, z, y = stack.pop()
        for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            c = (x + dx, z + dz)
            if not (bx0 <= c[0] <= bx1 and bz0 <= c[1] <= bz1):
                continue
            best = None
            for t in levels.get(c, ()):
                if t <= y + STEP and (best is None or t > best):
                    best = t
            if best is None:
                continue
            s_ = seen.setdefault(c, set())
            if best in s_:
                continue
            s_.add(best)
            stack.append((c[0], c[1], best))
    return seen


def near(seen, x, z, r=4.5, y=None):
    k = int(r * 2)
    ix, iz = int(round(x * 2)), int(round(z * 2))
    for dx in range(-k, k + 1):
        for dz in range(-k, k + 1):
            if dx * dx + dz * dz <= k * k and (ix + dx, iz + dz) in seen:
                if y is None or any(abs(t - y) < 6.5 for t in seen[(ix + dx, iz + dz)]):
                    return True
    return False


def draw(data, n, out, box=None, start=(60.0, -11.5)):
    from PIL import Image, ImageDraw
    levels, base = grid(data, n)
    seen = flood(levels, start)
    hh = [h for f, b, h in data['floors'] if f == n][0]
    x0, z0, x1, z1 = box or (-82, -58, 80, 58)
    S = max(4, int(1400 / (x1 - x0)))
    img = Image.new('RGB', (int((x1 - x0) * S), int((z1 - z0) * S)), (20, 20, 24))
    d = ImageDraw.Draw(img)

    def px(x, z):
        return (x - x0) * S, (z - z0) * S
    for ix in range(int(x0 * 2), int(x1 * 2)):
        for iz in range(int(z0 * 2), int(z1 * 2)):
            c = (ix, iz)
            if c in seen:
                t = max(seen[c])
                col = (235, 235, 230) if t < 0.7 else ((255, 240, 150) if t < 2.2 else ((150, 220, 255) if t < 4.5 else (255, 170, 220)))
            else:
                col = (70, 70, 80) if c in levels else (20, 20, 24)
            if col != (20, 20, 24):
                a = px(ix / 2 - 0.25, iz / 2 - 0.25)
                d.rectangle([a[0], a[1], a[0] + S / 2, a[1] + S / 2], fill=col)
    # low furniture outlines (things below walking height) so I can see tables, beds, etc.
    for ax, ya, az, bx, yb, bz, col, tr, name, color, tags, kind in data['parts']:
        if yb <= base + 0.9 or ya >= base + 9 or tr >= 0.99:
            continue
        if bx < x0 or ax > x1 or bz < z0 or az > z1 or (bx - ax) > 60 or (bz - az) > 60:
            continue
        if yb - ya < 0.3 and yb < base + 1.2:
            continue
        a, b = px(ax, az), px(bx, bz)
        d.rectangle([a[0], a[1], b[0], b[1]], outline=((color >> 16) & 255, (color >> 8) & 255, color & 255))
    for g in range(int(x0 // 10) * 10, int(x1) + 1, 10):
        a = px(g, z0)
        d.line([a[0], 0, a[0], img.size[1]], fill=(255, 80, 80) if g == 0 else (120, 60, 60))
        d.text((a[0] + 2, 2), str(g), fill=(255, 120, 120))
    for g in range(int(z0 // 10) * 10, int(z1) + 1, 10):
        a = px(x0, g)
        d.line([0, a[1], img.size[0], a[1]], fill=(80, 80, 255) if g == 0 else (60, 60, 120))
        d.text((2, a[1] + 2), str(g), fill=(140, 140, 255))
    for ax, ya, az, bx, yb, bz, col, tr, name, color, tags, kind in data['parts']:
        if not (base - 0.5 <= (ya + yb) / 2 < base + hh - 0.5) or bx < x0 or ax > x1 or bz < z0 or az > z1:
            continue
        if name.startswith(('FloorKey', 'GP_', 'AptKey', 'Chaser', 'Zzuk', 'Spawn')) or tags:
            if 'ExitGate' in tags or 'StairDoor' in tags or 'CellBars' in tags or 'KillBrick' in tags:
                continue
            a = px((ax + bx) / 2, (az + bz) / 2)
            ok = near(seen, (ax + bx) / 2, (az + bz) / 2, y=(ya + yb) / 2 - base)
            d.ellipse([a[0] - 5, a[1] - 5, a[0] + 5, a[1] + 5], fill=(0, 200, 90) if ok else (255, 0, 200))
            d.text((a[0] + 7, a[1] - 5), (name + ' ' + tags)[:26], fill=(0, 140, 60) if ok else (255, 0, 200))
    for p, text in data['texts']:
        if base <= p[1] < base + hh - 1 and x0 <= p[0] <= x1 and z0 <= p[2] <= z1:
            a = px(p[0], p[2])
            d.text((a[0], a[1]), text.replace('\n', ' ')[:14], fill=(255, 170, 0))
    img.save(out)
    print('wrote', out, img.size)


def check(data):
    bad = 0
    total = 0
    for n, base, h in data['floors']:
        levels, _ = grid(data, n)
        seen = flood(levels)
        for ax, ya, az, bx, yb, bz, col, tr, name, color, tags, kind in data['parts']:
            if not name.startswith(('FloorKey', 'GP_', 'AptKey', 'HideZone', 'ChaserSpawn', 'ChaserPatrol')):
                continue
            if not (base - 0.5 <= (ya + yb) / 2 < base + h - 0.5):
                continue
            if name.startswith(('GP_Digit', 'GP_Board')):      # wall / ceiling displays: only looked at
                continue
            total += 1
            r = 9.0 if (bx - ax) > 1.5 and name.startswith('FloorKey') else 4.5
            if not near(seen, (ax + bx) / 2, (az + bz) / 2, r=r, y=(ya + yb) / 2 - base):
                bad += 1
                print('UNREACHABLE  floor', n, name, round((ax + bx) / 2, 1), round((ya + yb) / 2 - base, 1), round((az + bz) / 2, 1))
    print('reachability check done: %d anchors, problems: %d' % (total, bad))


if __name__ == '__main__':
    cmd, path = sys.argv[1], sys.argv[2]
    if cmd == 'dump':
        dump(path)
    else:
        with open(path, 'rb') as fh:
            data = pickle.load(fh)
        if cmd == 'draw':
            box = [float(v) for v in sys.argv[5:9]] if len(sys.argv) >= 9 else None
            draw(data, int(sys.argv[3]), sys.argv[4], box)
        else:
            check(data)
