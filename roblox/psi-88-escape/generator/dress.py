"""Automatic set dressing.

After a floor is built, the dresser rasterises everything already standing on
it into an occupancy grid, keeps door openings, the stair lobby and walkways
clear, and then fills the edges of rooms with theme-appropriate props:
floor props backed against walls, things mounted on walls, ceiling fixtures
and small decals on the floor. Props only ever go where a clear strip of floor
remains in front of them, so nothing ends up blocking a route.
"""
import math
import rbx
from rbx import T, Ry, FACING_YAW
import props2 as Q
from props import R

CELL = 0.5
X0, X1, Z0, Z1 = -79.0, 79.0, -55.0, 55.0
NX, NZ = int((X1 - X0) / CELL), int((Z1 - Z0) / CELL)

WALL_NAMES = {'Wall', 'WallWest', 'WallEast', 'WallSouth', 'WallNorth', 'WallS', 'WallN', 'WallW', 'WallE', 'Partition',
              'CladN', 'CladS', 'CladW', 'LogoWall', 'SignWall', 'Team7Wall', 'GraffitiWall', 'HammerWall', 'Pilaster'}
WINDOW_NAMES = {'Glass', 'Spandrel'}


class Dresser:
    def __init__(self, fb, F, reg_from):
        self.fb = fb
        self.F = F
        self.base = F['base']
        self.c = F['h'] - 1
        self.occ = bytearray(NX * NZ)    # 1 = something stands here, 2 = reserved walkway
        self.tall = bytearray(NX * NZ)   # something taller than 4.5 studs (covers wall)
        self.walls = []
        self.lights = []
        b0, b1 = self.base + 0.25, self.base + 7.5
        for e in rbx.REGISTRY[reg_from:]:
            x0, y0, z0, x1, y1, z1, name, collide, mat, tr = e
            if y1 < b0 or y0 > b1 + 6:
                continue
            if name in ('TBar', 'Baseboard', 'Sill', 'Threshold'):
                continue
            if name in ('CeilingLight', 'Housing', 'Bulb'):
                self.lights.append(((x0 + x1) / 2, (z0 + z1) / 2))
                continue
            if y0 > self.base + self.c - 2:
                continue
            if y1 - self.base < 0.3 and name not in WALL_NAMES:
                continue  # rugs, decals
            if (y1 - y0) < 0.2 and not collide:
                continue
            wallish = name in WALL_NAMES or name in WINDOW_NAMES
            self._mark(self.occ, x0, z0, x1, z1, 1, pad=0.0 if wallish else 0.25)
            if y1 - self.base > 4.5:
                self._mark(self.tall, x0, z0, x1, z1, 1, pad=0.1)
            h = y1 - max(y0, self.base)
            if h >= 6 and (name in WALL_NAMES or name in WINDOW_NAMES) and y0 <= self.base + 2.0:
                kind = 'window' if name in WINDOW_NAMES or mat == 'Glass' else 'wall'
                self.walls.append((x0, z0, x1, z1, kind))
        # reserved areas: stair lobby, elevator front, door openings
        self.reserve(44, -24, 62, -1)
        self.reserve(55, 16, 64, 36)
        for (ox0, oz0, ox1, oz1, oy) in rbx.OPENINGS:
            if abs(oy - self.base) < 1.5:
                self.reserve(ox0, oz0, ox1, oz1)
        for r in F.get('keep_clear', []):
            self.reserve(*r)

    # ------------------------------------------------------------- grid helpers
    def _rng(self, x0, z0, x1, z1, pad=0.0):
        i0 = max(0, int((min(x0, x1) - pad - X0) / CELL))
        i1 = min(NX, int(math.ceil((max(x0, x1) + pad - X0) / CELL)))
        j0 = max(0, int((min(z0, z1) - pad - Z0) / CELL))
        j1 = min(NZ, int(math.ceil((max(z0, z1) + pad - Z0) / CELL)))
        return i0, i1, j0, j1

    def _mark(self, grid, x0, z0, x1, z1, v, pad=0.0):
        i0, i1, j0, j1 = self._rng(x0, z0, x1, z1, pad)
        for j in range(j0, j1):
            row = j * NX
            for i in range(i0, i1):
                if grid[row + i] < v:
                    grid[row + i] = v

    def reserve(self, x0, z0, x1, z1):
        self._mark(self.occ, x0, z0, x1, z1, 2)

    def free(self, x0, z0, x1, z1, grid=None):
        g = grid if grid is not None else self.occ
        if min(x0, x1) < X0 - 0.6 or max(x0, x1) > X1 + 0.6 or min(z0, z1) < Z0 - 0.6 or max(z0, z1) > Z1 + 0.6:
            return False
        i0, i1, j0, j1 = self._rng(min(x0, x1) + 0.3, min(z0, z1) + 0.3, max(x0, x1) - 0.3, max(z0, z1) - 0.3)
        for j in range(j0, j1):
            row = j * NX
            for i in range(i0, i1):
                if g[row + i]:
                    return False
        return True

    def occupy(self, x0, z0, x1, z1):
        self._mark(self.occ, x0, z0, x1, z1, 1, pad=0.2)

    # ------------------------------------------------------------- wall faces
    def faces(self, kinds=('wall',), min_len=2.5):
        """Yield (x, z, normal, along_len, kind) samples on exposed wall faces."""
        out = []
        for (x0, z0, x1, z1, kind) in self.walls:
            if kind not in kinds:
                continue
            sx, sz = x1 - x0, z1 - z0
            if sx >= sz:
                if sx < min_len:
                    continue
                for zf, n in ((z0, (0, -1)), (z1, (0, 1))):
                    out.append(('x', x0, x1, zf, n, kind))
            else:
                if sz < min_len:
                    continue
                for xf, n in ((x0, (-1, 0)), (x1, (1, 0))):
                    out.append(('z', z0, z1, xf, n, kind))
        return out

    def _place_rect(self, axis, u, plane, n, w, d, gap=0.08):
        """Footprint rect of a prop backed against a face at (u along face)."""
        if axis == 'x':
            z_near = plane + n[1] * gap
            z_far = z_near + n[1] * d
            return (u - w / 2, min(z_near, z_far), u + w / 2, max(z_near, z_far)), (u, (z_near + z_far) / 2)
        x_near = plane + n[0] * gap
        x_far = x_near + n[0] * d
        return (min(x_near, x_far), u - w / 2, max(x_near, x_far), u + w / 2), ((x_near + x_far) / 2, u)

    @staticmethod
    def _facing(n):
        return {(0, -1): '-z', (0, 1): '+z', (-1, 0): '-x', (1, 0): '+x'}[n]

    def _front_clear(self, axis, u, plane, n, w, d, clear):
        r, _ = self._place_rect(axis, u, plane, n, w, clear, gap=0.08 + d)
        return self.free(*r)

    # ------------------------------------------------------------- dressing passes
    def floor_props(self, palette, spacing=(3, 7), prob=0.6, kinds=('wall',), clear=4.0):
        """palette: list of (fn, w, d, weight)."""
        if not palette:
            return 0
        tot = sum(p[3] for p in palette)
        count = 0
        for axis, a0, a1, plane, n, kind in self.faces(kinds):
            u = a0 + R.uniform(0.6, 2.5)
            while u < a1 - 0.8:
                pick = R.uniform(0, tot)
                for fn, w, d, wt in palette:
                    pick -= wt
                    if pick <= 0:
                        break
                if u + w / 2 > a1 - 0.2:
                    break
                if R.random() < prob:
                    gap = 0.5 if kind == 'window' else 0.12
                    rect, (cx, cz) = self._place_rect(axis, u, plane, n, w, d, gap=gap)
                    if self.free(*rect) and self._front_clear(axis, u, plane, n, w, d + gap, clear):
                        fn(self.fb.at(T(cx, 0, cz) * Ry(FACING_YAW[self._facing(n)])))
                        self.occupy(*rect)
                        count += 1
                        u += w + R.uniform(*spacing)
                        continue
                u += R.uniform(1.5, 3.5)
        return count

    def wall_mounts(self, palette, spacing=(4, 9), prob=0.55, height=(4.5, 7.5), kinds=('wall',)):
        """palette: list of (fn, w, h, weight, y or None)."""
        if not palette:
            return 0
        tot = sum(p[3] for p in palette)
        count = 0
        for axis, a0, a1, plane, n, kind in self.faces(kinds, min_len=2):
            u = a0 + R.uniform(1, 4)
            while u < a1 - 1:
                pick = R.uniform(0, tot)
                for fn, w, h, wt, yfix in palette:
                    pick -= wt
                    if pick <= 0:
                        break
                if u + w / 2 > a1 - 0.3:
                    break
                if R.random() < prob:
                    rect, (cx, cz) = self._place_rect(axis, u, plane, n, w, 0.6, gap=0.02)
                    y = yfix if yfix is not None else R.uniform(*height)
                    if y + h / 2 < self.c - 0.4 and self.free(*rect, grid=self.tall) and (y > 3.6 or self.free(*rect)):
                        fx = cx - n[0] * 0.28
                        fz = cz - n[1] * 0.28
                        fn(self.fb.at(T(fx, y, fz) * Ry(FACING_YAW[self._facing(n)])))
                        self._mark(self.tall, *rect, 1)
                        count += 1
                        u += w + R.uniform(*spacing)
                        continue
                u += R.uniform(1.5, 4)
        return count

    def ceiling(self, items, region=(X0 + 2, Z0 + 2, X1 - 2, Z1 - 2), skip_shaft=True):
        """items: list of (fn, grid_spacing, offset). Places on a grid, avoiding lights."""
        c = self.c
        for fn, sp, off in items:
            x = region[0] + off
            while x < region[2]:
                z = region[1] + off
                while z < region[3]:
                    inside_shaft = 61 < x < 79 and -17 < z < 35
                    if not (skip_shaft and inside_shaft) and all((x - lx) ** 2 + (z - lz) ** 2 > 4 for lx, lz in self.lights):
                        fn(self.fb.at(T(x + R.uniform(-0.2, 0.2), c - 0.2, z + R.uniform(-0.2, 0.2))))
                    z += sp
                x += sp

    def decals(self, palette, n=40, region=(X0 + 1, Z0 + 1, X1 - 1, Z1 - 1)):
        tot = sum(p[1] for p in palette)
        placed = 0
        tries = 0
        while placed < n and tries < n * 6:
            tries += 1
            x, z = R.uniform(region[0], region[2]), R.uniform(region[1], region[3])
            i, j = int((x - X0) / CELL), int((z - Z0) / CELL)
            if not (0 <= i < NX and 0 <= j < NZ) or self.occ[j * NX + i] == 1:
                continue
            pick = R.uniform(0, tot)
            for fn, wt in palette:
                pick -= wt
                if pick <= 0:
                    break
            fn(self.fb.at(T(x, 0, z)))
            placed += 1
        return placed

    def cluster(self, fn, w, d, region, n=4, clear=3.0, rots=(0, 90, 180, 270)):
        """Free-standing props (tables, racks) in open floor space, each with a clear ring around it."""
        placed = 0
        for _ in range(n * 25):
            if placed >= n:
                break
            x, z = R.uniform(region[0], region[2]), R.uniform(region[1], region[3])
            rot = R.choice(rots)
            ww, dd = (w, d) if rot % 180 == 0 else (d, w)
            if self.free(x - ww / 2 - clear, z - dd / 2 - clear, x + ww / 2 + clear, z + dd / 2 + clear):
                fn(self.fb.at(T(x, 0, z) * Ry(rot)))
                self.occupy(x - ww / 2, z - dd / 2, x + ww / 2, z + dd / 2)
                placed += 1
        return placed


# ===================================================================== theme palettes
def _p(text, bg, fg):
    return lambda b: Q.poster(b, text, bg, fg)


OFFICE_POSTERS = [('안전 제일', 0xF0C020, 0x1A1A1A), ('정보는 생명이다\n— 정보구출반', 0x1A2A4A, 0xE8E8E8),
                  ('엘리베이터 고장 문의\n☎ 내선 8888', 0xF8F8F4, 0x1A1A1A), ('보안 의식\n당신의 책상을 정리하세요', 0x2A2A2A, 0xF0C020),
                  ('8월 우수사원\n공유', 0xF0EDE4, 0x8A1010), ('사내 금연', 0xC01818, 0xFFFFFF), ('개인정보 보호\n화면 잠금 필수', 0x2A6A4A, 0xFFFFFF)]
HOSP_POSTERS = [('손 씻기\n30초 이상', 0x2A8AC0, 0xFFFFFF), ('정숙', 0x2A9A4A, 0xFFFFFF), ('면회 시간\n없음', 0xF8F8F4, 0x8A1010),
                ('짱큰 지하병원\n당신의 마음을 지켜드립니다', 0x1E3A2E, 0xE8F4EC), ('환자 이탈 시\n즉시 보고', 0xC01818, 0xFFFFFF)]
GYM_POSTERS = [('오늘도 버틴다', 0x1A1A1A, 0xF0C020), ('NO PAIN NO GAIN', 0xC01818, 0xFFFFFF), ('사용 후 기구 정리', 0xF8F8F4, 0x1A1A1A),
               ('수영장 이용 규칙\n1. 샤워 후 입장\n2. 다이빙 금지', 0x2A6AA0, 0xFFFFFF)]
KITCHEN_POSTERS = [('오늘의 메뉴\n잔치국수 3,500원', 0x1A1410, 0xF2E0B0), ('잔반 없는 날', 0x3A7A3A, 0xFFFFFF),
                   ('진미국수 ♨', 0xC01818, 0xFFFFFF), ('식판은 여기에 →', 0xF8F8F4, 0x1A1A1A)]
KID_POSTERS = [('ㄱ ㄴ ㄷ ㄹ\nㅁ ㅂ ㅅ ㅇ', 0xFAF0A0, 0x2A4AA0), ('1 2 3 4 5', 0xA0D0F0, 0xC02020), ('이달의 생일\n🎂 수민', 0xF0B0C0, 0x8A1030),
               ('친구를 때리지 않아요', 0xB0E0B0, 0x1A5A1A), ('햇살반 규칙\n1. 손 씻기\n2. 사이좋게', 0xFAF8F0, 0x2A2A2A)]

PALETTES = {
    'office': dict(
        floor=[(Q.water_cooler, 1.6, 1.6, 1), (Q.copier, 3.4, 2.6, 0.7), (Q.trash_bins, 4.2, 1.4, 0.8), (Q.coat_rack, 1.4, 1.4, 0.7),
               (Q.credenza, 6, 1.8, 1.2), (Q.files_cab, 1.8, 2.4, 1.4), (Q.bookcase, 5, 1.6, 1), (Q.tall_cabinet, 3, 1.8, 0.8),
               (lambda b: __import__('props').plant(b, h=5), 1.8, 1.8, 1.2), (Q.printer_stand, 2.6, 2.0, 0.6), (Q.paper_reams, 1.8, 1.2, 0.6),
               (Q.mini_kitchen, 2.4, 1.8, 0.5), (Q.boxes, 2.4, 2.4, 0.8), (Q.umbrella_stand, 1, 1, 0.4), (Q.whiteboard_stand, 5, 1.6, 0.4)],
        window=[(Q.radiator, 5, 0.8, 2), (Q.planter_long, 6, 1.6, 1)],
        mount=[(lambda b, t=t: Q.poster(b, *t), 2.4, 3.2, 1.2, None) for t in OFFICE_POSTERS] +
              [(Q.frame_art, 3.5, 2.6, 1.5, None), (Q.notice_board, 5.3, 3.5, 0.8, 5.6), (lambda b: Q.clock(b), 1.6, 1.6, 0.8, 8.2),
               (Q.extinguisher, 1, 3, 0.8, 3.0), (Q.switch_outlet, 0.5, 0.7, 0.8, 3.6), (Q.outlet, 0.5, 0.5, 1, 1.0),
               (Q.thermostat, 0.7, 0.9, 0.4, 4.6), (Q.ac_unit, 5, 1.6, 0.5, 11.5), (Q.vent_grille, 2.4, 1.4, 0.6, 12.0),
               (Q.evac_map, 2.6, 1.9, 0.6, 5.2), (Q.calendar, 1.6, 2.2, 0.6, None), (Q.grime, 3, 6, 0.25, 14.0),
               (Q.sticky_notes, 2.4, 1.2, 0.3, None), (Q.wall_shelf, 4, 1, 0.4, 6.5)],
        ceiling=[(Q.sprinkler, 8, 2), (Q.smoke_detector, 16, 6), (Q.diffuser, 16, 10)],
        decals=[(Q.d_paper, 3), (Q.d_stain, 1), (Q.d_cup, 0.5), (Q.d_dust, 0.5)],
    ),
    'house': dict(
        floor=[(Q.shoe_pile, 3.4, 1.4, 1), (Q.boxes, 2.4, 2.4, 1), (Q.laundry_basket, 2, 1.5, 1), (Q.trash_bags, 2.6, 1.6, 0.8),
               (Q.guitar, 1.6, 1.0, 0.4), (Q.backpack, 1.4, 1.0, 0.8), (lambda b: Q.bookcase(b, h=6), 5, 1.6, 0.8),
               (lambda b: __import__('props').plant(b, h=3.6, dead=R.random() < 0.5), 1.8, 1.8, 0.8), (Q.stacked_chairs, 2, 2, 0.4)],
        window=[(Q.radiator, 5, 0.8, 1), (Q.boxes, 2.4, 2.4, 1)],
        mount=[(_p('공유 하우스 청소 당번\n월: 공유  화: ???\n수: ???  목: ???', 0xFAF8F0, 0x2A2A2A), 2.4, 3.2, 0.6, None),
               (Q.frame_art, 3, 2.4, 1.4, None), (lambda b: Q.clock(b), 1.6, 1.6, 0.5, 8), (Q.calendar, 1.6, 2.2, 0.8, None),
               (Q.mirror, 3, 4, 0.4, 6), (Q.coat_hooks, 4, 3, 0.7, 6.5), (Q.switch_outlet, 0.5, 0.7, 1, 3.6), (Q.outlet, 0.5, 0.5, 1, 1.0),
               (Q.wall_shelf, 4, 1, 0.8, 6.5), (Q.grime, 3, 6, 0.6, 14.0), (Q.crack, 2, 3, 0.4, None)],
        ceiling=[(Q.smoke_detector, 20, 8)],
        decals=[(Q.d_paper, 1), (Q.d_stain, 2), (Q.d_can, 1), (Q.d_cup, 1), (Q.d_dust, 1)],
    ),
    'ruin': dict(
        floor=[(Q.cone, 1.2, 1.2, 1.2), (Q.tarp_furniture, 5, 2.4, 1), (Q.boxes, 2.4, 2.4, 0.8), (Q.ladder_lean, 1.6, 1.6, 0.6),
               (Q.work_light, 2, 2, 0.45), (Q.sandbags, 5.4, 1.2, 0.6), (Q.barrel, 2, 2, 0.6), (Q.files_cab, 1.8, 2.4, 0.6)],
        window=[(Q.cone, 1.2, 1.2, 1), (Q.sandbags, 5.4, 1.2, 1)],
        mount=[(Q.grime, 3, 6, 2, 14.0), (Q.crack, 2, 3, 2, None), (_p('붕괴 위험\n출입 금지', 0xF0C020, 0x1A1A1A), 2.4, 3.2, 1, 5),
               (Q.evac_map, 2.6, 1.9, 0.4, 5.2), (Q.extinguisher, 1, 3, 0.5, 3.0), (Q.vent_grille, 2.4, 1.4, 0.4, 12.0)],
        ceiling=[(Q.hanging_cable, 9, 3), (Q.sprinkler, 12, 4)],
        decals=[(Q.d_tile, 3), (Q.d_glass, 1), (Q.d_dust, 2), (Q.d_crack, 1.5), (Q.d_paper, 1.5), (Q.d_puddle, 0.4)],
    ),
    'kitchen': dict(
        floor=[(Q.trash_bins, 4.2, 1.4, 1), (Q.tray_stack, 3, 2, 1), (Q.water_cooler, 1.6, 1.6, 1), (Q.condiment_station, 4, 1.8, 1),
               (Q.veg_crates, 2.2, 1.5, 0.8), (Q.fertilizer, 2.6, 1.6, 0.3), (Q.mop_bucket, 1.6, 1.2, 0.6), (Q.vending, 3.6, 2.6, 0.6),
               (Q.stacked_chairs, 2, 2, 0.6)],
        window=[(Q.radiator, 5, 0.8, 1), (Q.planter_long, 6, 1.6, 1)],
        mount=[(lambda b, t=t: Q.poster(b, *t), 2.4, 3.2, 1.2, None) for t in KITCHEN_POSTERS] +
              [(lambda b: Q.clock(b), 1.6, 1.6, 0.6, 8.2), (Q.extinguisher, 1, 3, 0.7, 3.0), (Q.wall_tv, 5, 3, 0.4, 9),
               (Q.ac_unit, 5, 1.6, 0.4, 11.5), (Q.switch_outlet, 0.5, 0.7, 0.6, 3.6), (Q.grime, 3, 6, 0.4, 14.0)],
        ceiling=[(Q.sprinkler, 8, 2), (Q.diffuser, 16, 10), (Q.smoke_detector, 16, 6)],
        decals=[(Q.d_stain, 2), (Q.d_paper, 1), (Q.d_cup, 1), (Q.d_can, 0.5)],
    ),
    'party': dict(
        floor=[(Q.speaker_tower, 2, 1.6, 1), (Q.gift_stack, 3, 2, 1), (Q.stacked_chairs, 2, 2, 0.8), (Q.buffet, 7, 2.4, 0.9),
               (Q.bar_cart, 2.6, 1.4, 0.6)],
        window=[(Q.gift_stack, 3, 2, 1)],
        mount=[(lambda b: Q.frame_art(b, gold=True), 3.5, 2.6, 1, None), (Q.sconce, 0.7, 1, 1, 6.5),
               (_p('피의 축제 2026', 0x120406, 0xFF2A3A), 2.4, 3.2, 1, None), (Q.mirror, 3, 4, 0.4, 6), (Q.grime, 3, 6, 0.3, 14.0)],
        ceiling=[(Q.sprinkler, 10, 3)],
        decals=[(Q.d_confetti, 3), (Q.d_cup, 1), (lambda b: Q.d_stain(b, 0x5E0A0C), 1)],
    ),
    'maze': dict(
        floor=[(Q.boxes, 2.4, 2.4, 1), (Q.trash_bins, 4.2, 1.4, 0.3), (Q.files_cab, 1.8, 2.4, 1), (Q.paper_reams, 1.8, 1.2, 0.6),
               (lambda b: __import__('props').plant(b, h=4, dead=True), 1.8, 1.8, 0.6)],
        window=[(Q.radiator, 5, 0.8, 1)],
        mount=[(Q.sticky_notes, 2.4, 1.2, 2, None), (Q.calendar, 1.6, 2.2, 0.6, None), (Q.frame_art, 2.4, 1.8, 0.5, None),
               (lambda b: Q.poster(b, *OFFICE_POSTERS[3]), 2.4, 3.2, 0.5, None), (Q.outlet, 0.5, 0.5, 0.6, 1.0)],
        ceiling=[(Q.sprinkler, 8, 2), (Q.smoke_detector, 16, 6)],
        decals=[(Q.d_paper, 4), (Q.d_cup, 1), (Q.d_dust, 1)],
    ),
    'gym': dict(
        floor=[(Q.kettlebell_rack, 5, 1.4, 1), (Q.spin_bike, 1.6, 4, 0.8), (Q.rower, 1.6, 6, 0.5), (Q.towel_bin, 2, 1.6, 0.8),
               (Q.bench, 6, 1.6, 0.6), (Q.water_cooler, 1.6, 1.6, 0.6), (Q.lounge_chair, 2, 5.2, 0.6)],
        window=[(Q.lounge_chair, 2, 5.2, 1), (Q.planter_long, 6, 1.6, 0.6)],
        mount=[(lambda b, t=t: Q.poster(b, *t), 2.4, 3.2, 1, None) for t in GYM_POSTERS] +
              [(Q.lifebuoy, 2, 2, 0.6, 5), (lambda b: Q.clock(b), 1.6, 1.6, 0.5, 8.2), (Q.speaker_wall, 1, 1.4, 0.6, 11),
               (Q.extinguisher, 1, 3, 0.5, 3.0), (Q.mirror, 3, 4, 0.5, 6), (Q.grime, 3, 6, 0.3, 14.0)],
        ceiling=[(Q.sprinkler, 8, 2), (Q.ceiling_speaker, 20, 6)],
        decals=[(Q.d_puddle, 1), (Q.d_stain, 0.5), (Q.d_paper, 0.4)],
    ),
    'luxury': dict(
        floor=[(Q.pedestal_vase, 2, 2, 1.2), (Q.leather_chair, 3.2, 3.2, 0.8), (Q.grandfather_clock, 1.8, 1.2, 0.3),
               (Q.bar_cart, 2.6, 1.4, 0.5), (Q.display_case, 3, 1.8, 0.7), (Q.standing_lamp, 1.4, 1.4, 0.6),
               (lambda b: Q.bookcase(b, color=0x2A160C, h=9), 5, 1.6, 0.8)],
        window=[(Q.planter_long, 6, 1.6, 1), (Q.leather_chair, 3.2, 3.2, 0.5)],
        mount=[(lambda b: Q.frame_art(b, gold=True), 4, 3, 2, None), (Q.sconce, 0.7, 1, 1.2, 6.5), (Q.mirror, 3, 4, 0.3, 6),
               (lambda b: Q.clock(b), 1.6, 1.6, 0.3, 8.2)],
        ceiling=[(Q.sprinkler, 12, 3), (Q.smoke_detector, 20, 8)],
        decals=[],
    ),
    'daycare': dict(
        floor=[(Q.toy_bin, 3, 1.8, 1.2), (Q.easel, 2.4, 1.6, 0.8), (Q.play_kitchen, 3.6, 1.4, 0.5), (Q.cushions, 4, 2.6, 0.8),
               (lambda b: Q.bookcase(b, kind='boxes', color=0xF0F0F0, h=4), 5, 1.6, 0.8), (Q.stroller, 1.8, 2.4, 0.3)],
        window=[(Q.toy_bin, 3, 1.8, 1), (Q.cushions, 4, 2.6, 1)],
        mount=[(lambda b, t=t: Q.poster(b, *t), 2.4, 3.2, 1, None) for t in KID_POSTERS] +
              [(Q.kid_drawing, 2.4, 1.8, 3, None), (Q.height_chart, 1, 5, 0.4, 3.2), (lambda b: Q.coat_hooks(b, small=True), 3, 2, 0.6, 4.5),
               (lambda b: Q.clock(b), 1.6, 1.6, 0.4, 8.2), (Q.extinguisher, 1, 3, 0.3, 3.0)],
        ceiling=[(Q.smoke_detector, 16, 6), (Q.sprinkler, 10, 3)],
        decals=[(Q.d_crayon, 2), (Q.d_paper, 1)],
    ),
    'lobby': dict(
        floor=[(Q.planter_long, 6, 1.6, 1.2), (Q.bench, 6, 1.6, 1), (Q.newspaper_rack, 2.4, 1.2, 0.5), (Q.atm, 2.6, 2, 0.4),
               (Q.umbrella_stand, 1, 1, 0.6), (Q.trash_bins, 4.2, 1.4, 0.4), (Q.water_cooler, 1.6, 1.6, 0.3)],
        window=[(Q.planter_long, 6, 1.6, 1), (Q.bench, 6, 1.6, 0.6)],
        mount=[(lambda b: Q.frame_art(b, 6, 4), 6, 4, 1, 9), (Q.wall_tv, 5, 3, 0.6, 10), (lambda b: Q.clock(b, '서울'), 1.6, 2.4, 0.4, 12),
               (Q.evac_map, 2.6, 1.9, 0.4, 5.2), (Q.extinguisher, 1, 3, 0.4, 3.0), (Q.sconce, 0.7, 1, 0.6, 8)],
        ceiling=[(Q.sprinkler, 10, 3), (Q.smoke_detector, 20, 8)],
        decals=[(Q.d_leaves, 1), (Q.d_paper, 0.5)],
    ),
    'boutique': dict(
        floor=[(Q.clothing_rack, 6, 1.8, 1.4), (Q.shoe_display, 5, 1.6, 0.8), (Q.leather_chair, 3.2, 3.2, 0.5),
               (Q.tri_mirror, 6, 3, 0.3), (Q.gift_stack, 3, 2, 0.6), (Q.paint_cans, 3, 2, 0.4), (Q.ladder_lean, 1.6, 1.6, 0.3)],
        window=[],
        mount=[(lambda b: Q.frame_art(b, gold=True), 3, 4, 1.2, None), (Q.sconce, 0.7, 1, 1.4, 6.5), (Q.mirror, 2.4, 5, 0.5, 5)],
        ceiling=[(Q.sprinkler, 12, 3)],
        decals=[(Q.d_paper, 0.5), (Q.d_dust, 0.5)],
    ),
    'guinea': dict(
        floor=[(Q.chew_blocks, 4, 2.6, 1), (Q.hay_bale, 4, 2.4, 1)],
        window=[], mount=[], ceiling=[], decals=[],
    ),
    'greenhouse': dict(
        floor=[(Q.fertilizer, 2.6, 1.6, 1), (Q.berry_crates, 2.6, 1.6, 1), (Q.seedling_shelf, 5, 1.6, 0.8), (Q.watering_can, 1.4, 1, 0.6),
               (Q.lab_table, 5, 2.2, 0.5), (Q.barrel, 2, 2, 0.5)],
        window=[],
        mount=[(_p('관계자 외 출입 금지', 0xF0C020, 0x1A1A1A), 2.4, 3.2, 0.6, None), (Q.pipe_vertical, 1, 10, 1, 9), (Q.clipboard, 1, 1.4, 0.6, 5),
               (Q.grime, 3, 6, 1, 14.0), (_p('짱큰베리는\n절대 먹지 마시오', 0x2A0406, 0xFF4A4A), 2.4, 3.2, 0.5, None)],
        ceiling=[(Q.hanging_cable, 10, 4)],
        decals=[(lambda b: Q.d_stain(b, 0x4A0A1E), 2), (Q.d_leaves, 2), (Q.d_puddle, 0.5)],
    ),
    'hospital': dict(
        floor=[(Q.linen_cart, 3, 2, 0.8), (Q.med_cart, 2.4, 1.8, 0.8), (lambda b: Q.med_cart(b, crash=True), 2.4, 1.8, 0.3),
               (Q.walker, 1.8, 1.4, 0.4), (Q.bio_bin, 1.4, 1.2, 0.8), (Q.privacy_screen, 6, 1.4, 0.4), (Q.bedside, 1.6, 1.6, 0.8),
               (lambda b: __import__('props').wheelchair(b), 2.6, 2.6, 0.5), (Q.bench, 6, 1.6, 0.4), (Q.files_cab, 1.8, 2.4, 0.4)],
        window=[],
        mount=[(lambda b, t=t: Q.poster(b, *t), 2.4, 3.2, 0.8, None) for t in HOSP_POSTERS] +
              [(Q.sanitizer, 0.7, 1.1, 1.2, 4.5), (lambda b: Q.clock(b), 1.6, 1.6, 0.6, 8.2), (Q.extinguisher, 1, 3, 0.6, 3.0),
               (Q.cross_sign, 1.4, 1.4, 0.5, 8), (Q.clipboard, 1, 1.4, 0.8, 5), (Q.grime, 3, 6, 1.0, 14.0), (Q.crack, 2, 3, 0.6, None),
               (Q.switch_outlet, 0.5, 0.7, 0.6, 3.6), (Q.fire_alarm, 1, 1.4, 0.4, 5)],
        ceiling=[(Q.sprinkler, 8, 2), (Q.smoke_detector, 16, 6), (Q.diffuser, 16, 10)],
        decals=[(Q.d_paper, 2), (Q.d_stain, 1.5), (Q.d_pills, 0.6), (lambda b: Q.d_stain(b, 0x5E0A0C), 0.6), (Q.d_puddle, 0.4)],
    ),
}


def dress_floor(fb, F, reg_from, theme, density=1.0, decal_n=60, clear=4.0):
    P_ = PALETTES[theme]
    d = Dresser(fb, F, reg_from)
    n = 0
    n += d.floor_props(P_['floor'], prob=0.55 * density, clear=clear)
    n += d.floor_props(P_['window'], prob=0.4 * density, kinds=('window',), clear=clear, spacing=(4, 10))
    n += d.wall_mounts(P_['mount'], prob=0.6 * density)
    if F.get('ceiling', True) and P_['ceiling']:
        d.ceiling(P_['ceiling'])
    if P_['decals']:
        d.decals(P_['decals'], n=int(decal_n * density))
    return d
