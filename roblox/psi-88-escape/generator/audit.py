#!/usr/bin/env python3
"""Find (and repair) things that look broken in the built map, without opening Studio.

  zfight   two visible faces on the same plane, facing the same way, overlapping → they flicker
  signs    a text face with something opaque sitting on or in front of it → the text reads as cut off
Used by main.build() as a post-pass; run directly for a report:  python3 audit.py
"""
import math
from collections import defaultdict

EPS = 0.008          # faces closer than this fight for the same pixels
LIFT = 0.016         # how far one of them is moved


def name_of(inst):
    return inst.props[0][2]


def aligned(R):
    """True when every local axis lies on a world axis."""
    return all(max(abs(v) for v in row) > 0.9999 for row in R)


def yaw_only(R):
    return abs(R[1][1]) > 0.9999


def half_extents(R, size):
    return [sum(abs(R[i][j]) * size[j] for j in range(3)) / 2 for i in range(3)]


def set_cf(inst, cf):
    for k, (t, n, v) in enumerate(inst.props):
        if n == 'CFrame':
            inst.props[k] = (t, n, cf)
    inst._cf = cf


def set_size(inst, size):
    for k, (t, n, v) in enumerate(inst.props):
        if n == 'size':
            inst.props[k] = (t, n, size)
    inst._size = size


def footprint(cf, size):
    """Corners of a yaw-rotated part's horizontal rectangle."""
    R, p = cf.R, cf.p
    out = []
    for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        lx, lz = sx * size[0] / 2, sz * size[2] / 2
        out.append((p[0] + R[0][0] * lx + R[0][2] * lz, p[2] + R[2][0] * lx + R[2][2] * lz))
    return out


def poly_overlap(a, b):
    """Separating-axis test for two convex quads; returns False when they only touch."""
    for poly in (a, b):
        for i in range(4):
            x0, z0 = poly[i]
            x1, z1 = poly[(i + 1) % 4]
            nx, nz = z1 - z0, x0 - x1
            la = [nx * x + nz * z for x, z in a]
            lb = [nx * x + nz * z for x, z in b]
            ln = math.hypot(nx, nz) or 1
            if min(max(la), max(lb)) - max(min(la), min(lb)) < 0.12 * ln:
                return False
    return True


def faces_of(parts):
    """Yield (axis, direction, plane coord, lo/hi rectangle on the other two axes, index, exact footprint or None)."""
    for idx, (kind, size, cf, color, tr, mat, refl, inst, collide) in enumerate(parts):
        if tr >= 0.99 or kind in ('Ball', 'Wedge'):
            continue
        R, p = cf.R, cf.p
        if aligned(R):
            if kind == 'Cylinder':
                ax = max(range(3), key=lambda i: abs(R[i][0]))       # the two flat caps only
                axes = (ax,)
            else:
                axes = (0, 1, 2)
            h = half_extents(R, size)
            for a in axes:
                u, v = [i for i in range(3) if i != a]
                rect = (p[u] - h[u], p[v] - h[v], p[u] + h[u], p[v] + h[v])
                for d in (-1, 1):
                    yield a, d, p[a] + d * h[a], rect, idx, None
        elif yaw_only(R) and kind == 'Block':
            fp = footprint(cf, size)
            xs, zs = [q[0] for q in fp], [q[1] for q in fp]
            rect = (min(xs), min(zs), max(xs), max(zs))
            for d in (-1, 1):
                yield 1, d, p[1] + d * size[1] / 2, rect, idx, fp


class Solids:
    """Spatial hash of opaque part boxes, to ask "is this point inside something solid?"."""

    def __init__(self, parts, cell=8.0):
        self.cell = cell
        self.grid = defaultdict(list)
        self.boxes = []
        for idx, (kind, size, cf, color, tr, mat, refl, inst, collide) in enumerate(parts):
            if tr > 0.3 or kind in ('Ball', 'Wedge') or not aligned(cf.R):
                continue
            h = half_extents(cf.R, size)
            if kind == 'Cylinder':
                ax = max(range(3), key=lambda i: abs(cf.R[i][0]))
                h = [h[i] if i == ax else h[i] * 0.7 for i in range(3)]       # the box inscribed in the round section
            lo = [cf.p[i] - h[i] for i in range(3)]
            hi = [cf.p[i] + h[i] for i in range(3)]
            n = len(self.boxes)
            self.boxes.append((lo, hi, idx))
            for gx in range(int(lo[0] // cell), int(hi[0] // cell) + 1):
                for gy in range(int(lo[1] // cell), int(hi[1] // cell) + 1):
                    for gz in range(int(lo[2] // cell), int(hi[2] // cell) + 1):
                        self.grid[(gx, gy, gz)].append(n)

    def inside(self, pt, skip=()):
        c = self.cell
        for n in self.grid.get((int(pt[0] // c), int(pt[1] // c), int(pt[2] // c)), ()):
            lo, hi, idx = self.boxes[n]
            if idx in skip:
                continue
            if lo[0] < pt[0] < hi[0] and lo[1] < pt[1] < hi[1] and lo[2] < pt[2] < hi[2]:
                return True
        return False


def find_zfight(parts):
    """Pairs (i, j, axis, dir) of parts whose same-facing faces share a plane, overlap and can be seen."""
    solids = Solids(parts)
    buckets = defaultdict(list)
    for a, d, c, rect, idx, fp in faces_of(parts):
        if (rect[2] - rect[0]) * (rect[3] - rect[1]) < 0.02:
            continue
        buckets[(a, d, int(math.floor(c / 0.02)))].append((c, rect, idx, fp))
    pairs = []
    seen = set()
    for (a, d, k), items in buckets.items():
        cand = items + buckets.get((a, d, k + 1), [])
        if len(cand) < 2:
            continue
        grid = defaultdict(list)
        for n, (c, rect, idx, fp) in enumerate(cand):
            for gx in range(int(rect[0] // 8), int(rect[2] // 8) + 1):
                for gz in range(int(rect[1] // 8), int(rect[3] // 8) + 1):
                    grid[(gx, gz)].append(n)
        for cell in grid.values():
            if len(cell) < 2:
                continue
            for x in range(len(cell)):
                c0, r0, i0, f0 = cand[cell[x]]
                for y in range(x + 1, len(cell)):
                    c1, r1, i1, f1 = cand[cell[y]]
                    if i0 == i1 or abs(c0 - c1) >= EPS:
                        continue
                    key = (min(i0, i1), max(i0, i1), a, d)
                    if key in seen:
                        continue
                    ox = min(r0[2], r1[2]) - max(r0[0], r1[0])
                    oz = min(r0[3], r1[3]) - max(r0[1], r1[1])
                    if ox < 0.12 or oz < 0.12:
                        continue
                    if (f0 or f1) and not poly_overlap(f0 or rect_poly(r0), f1 or rect_poly(r1)):
                        continue
                    p0, p1 = parts[i0], parts[i1]
                    if p0[3] == p1[3] and p0[5] == p1[5] and p0[4] == p1[4] == 0:
                        continue            # same paint: the seam cannot be seen
                    # only faces with open air in front of them can be seen flickering
                    u, v = [i for i in range(3) if i != a]
                    x0, x1 = max(r0[0], r1[0]), min(r0[2], r1[2])
                    z0, z1 = max(r0[1], r1[1]), min(r0[3], r1[3])
                    exposed = False
                    for fu, fv in ((0.5, 0.5), (0.2, 0.2), (0.8, 0.2), (0.2, 0.8), (0.8, 0.8)):
                        pt = [0, 0, 0]
                        pt[a] = max(c0, c1) * d * d + d * 0.03 if d > 0 else min(c0, c1) - 0.03
                        pt[u] = x0 + (x1 - x0) * fu
                        pt[v] = z0 + (z1 - z0) * fv
                        if not solids.inside(pt, (i0, i1)):
                            exposed = True
                            break
                    if not exposed:
                        continue
                    seen.add(key)
                    pairs.append((i0, i1, a, d))
    return pairs


def rect_poly(r):
    return [(r[0], r[1]), (r[2], r[1]), (r[2], r[3]), (r[0], r[3])]


def fix_zfight(parts, rounds=4):
    """Move the smaller part of each fighting pair a hair along the face normal. Returns pairs left."""
    for _ in range(rounds):
        pairs = find_zfight(parts)
        if not pairs:
            return 0
        by_plane = defaultdict(list)
        for i, j, a, d in pairs:
            by_plane[(a, d)].append((i, j))
        moved = {}
        for (a, d), prs in by_plane.items():
            level = defaultdict(int)
            vol = lambda i: parts[i][1][0] * parts[i][1][1] * parts[i][1][2]
            # the smaller part of each pair sits on top; repeat so chains of overlaps stack up
            for _pass in range(6):
                changed = False
                for i, j in prs:
                    small, big = (i, j) if vol(i) <= vol(j) else (j, i)
                    if level[small] <= level[big]:
                        level[small] = level[big] + 1
                        changed = True
                if not changed:
                    break
            for i, lv in level.items():
                if lv and i not in moved:
                    moved[i] = (a, d * lv * LIFT)
        for i, (a, off) in moved.items():
            kind, size, cf, color, tr, mat, refl, inst, collide = parts[i]
            p = list(cf.p)
            p[a] += off
            ncf = type(cf)(p=tuple(p), R=cf.R)
            set_cf(inst, ncf)
            parts[i] = (kind, size, ncf, color, tr, mat, refl, inst, collide)
    return len(find_zfight(parts))


FACE_N = {'Front': (0, 0, -1), 'Back': (0, 0, 1), 'Top': (0, 1, 0), 'Bottom': (0, -1, 0), 'Right': (1, 0, 0), 'Left': (-1, 0, 0)}


def sign_cover(solids, cf, size, face, skip, push=0.0, cols=48, rows=8):
    """Which sample cells of a text face are hidden by something solid. Returns rows of booleans (True = hidden)."""
    ln = FACE_N[face]
    R, p = cf.R, cf.p
    n = [sum(R[i][j] * ln[j] for j in range(3)) for i in range(3)]
    half_t = size[2] / 2
    grid = []
    for r in range(rows):
        v = -size[1] / 2 + size[1] * (r + 0.5) / rows
        row = []
        for c in range(cols):
            u = -size[0] / 2 + size[0] * (c + 0.5) / cols
            hidden = False
            for depth in (0.02, 0.2):
                pt = [p[i] + n[i] * (half_t + push + depth) + R[i][0] * u + R[i][1] * v for i in range(3)]
                if solids.inside(pt, skip):
                    hidden = True
                    break
            row.append(hidden)
        grid.append(row)
    return grid


def hidden_fraction(grid):
    return sum(sum(r) for r in grid) / (len(grid) * len(grid[0]))


def largest_clear(grid):
    """Largest rectangle of visible cells: (area in cells, c0, r0, c1, r1), c1/r1 exclusive."""
    rows, cols = len(grid), len(grid[0])
    height = [0] * cols
    best = (0, 0, 0, 0, 0)
    for r in range(rows):
        for c in range(cols):
            height[c] = 0 if grid[r][c] else height[c] + 1
        stack = []
        for c in range(cols + 1):
            h = height[c] if c < cols else 0
            start = c
            while stack and stack[-1][1] >= h:
                s0, sh = stack.pop()
                area = sh * (c - s0)
                if area > best[0]:
                    best = (area, s0, r - sh + 1, c, r + 1)
                start = s0
            stack.append((start, h))
    return best


def fix_signs(parts, texts, report=None):
    """Move or shrink text faces that are partly behind something. Returns (repaired, still hidden)."""
    solids = Solids(parts)
    index = {id(t[7]): i for i, t in enumerate(parts)}
    fixed = left = 0
    for cf, size, face, text, bg, fg, bg_tr, inst in texts:
        if face not in ('Front', 'Back') or not aligned(cf.R) or not text.strip():
            continue
        cf, size = inst._cf, inst._size
        me = (index.get(id(inst), -1),)
        grid = sign_cover(solids, cf, size, face, me)
        cover = hidden_fraction(grid)
        if cover < 0.015:
            continue
        ln = FACE_N[face]
        n = [sum(cf.R[i][j] * ln[j] for j in range(3)) for i in range(3)]
        how = None
        for push in (0.06, 0.12, 0.2, 0.3, 0.45, 0.7):
            if hidden_fraction(sign_cover(solids, cf, size, face, me, push)) == 0:
                ncf = type(cf)(p=tuple(cf.p[i] + n[i] * push for i in range(3)), R=cf.R)
                nsize = size
                how = 'moved out %.2f' % push
                break
        if how is None:
            rows, cols = len(grid), len(grid[0])
            area, c0, r0, c1, r1 = largest_clear(grid)
            w, h = size[0] * (c1 - c0) / cols - 0.1, size[1] * (r1 - r0) / rows - 0.04
            if area >= 0.3 * rows * cols and w >= 1.2 and h >= 0.35:
                mu = -size[0] / 2 + size[0] * (c0 + c1) / 2 / cols
                mv = -size[1] / 2 + size[1] * (r0 + r1) / 2 / rows
                ncf = type(cf)(p=tuple(cf.p[i] + cf.R[i][0] * mu + cf.R[i][1] * mv for i in range(3)), R=cf.R)
                nsize = (w, h, size[2])
                how = 'fitted %.1f×%.1f → %.1f×%.1f' % (size[0], size[1], w, h)
        label = '%s  at (%.0f, %.0f, %.0f)' % (text.replace(chr(10), ' / ')[:28], cf.p[0], cf.p[1], cf.p[2])
        if how is None:
            left += 1
            if report is not None:
                report.append('STILL HIDDEN %3d%%  %s' % (cover * 100, label))
            continue
        fixed += 1
        set_cf(inst, ncf)
        set_size(inst, nsize)
        i = index.get(id(inst))
        if i is not None:
            t = parts[i]
            parts[i] = (t[0], nsize, ncf, t[3], t[4], t[5], t[6], t[7], t[8])
        if report is not None:
            report.append('%-26s %3d%%  %s' % (how, cover * 100, label))
    return fixed, left


if __name__ == '__main__':
    import main
    import rbx
    main.AUDIT = False
    main.build(False)
    pairs = find_zfight(rbx.PREVIEW)
    print('z-fighting pairs before repair:', len(pairs))
    from collections import Counter
    c = Counter()
    for i, j, a, d in pairs:
        c[tuple(sorted((name_of(rbx.PREVIEW[i][7]), name_of(rbx.PREVIEW[j][7]))))] += 1
    for k, v in c.most_common(12):
        print('  %5d  %s' % (v, k))
    print('left after repair:', fix_zfight(rbx.PREVIEW))
    rep = []
    print('signs repaired / still hidden:', fix_signs(rbx.PREVIEW, rbx.PREVIEW_TEXT, rep))
    for line in rep:
        print('  ', line)
