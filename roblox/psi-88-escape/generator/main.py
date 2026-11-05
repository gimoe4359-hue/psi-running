#!/usr/bin/env python3
"""Build PSI 88층 탈출 map → ../PSI_88F_Escape_Map.rbxlx

    python3 main.py            # writes the place file
    python3 main.py --preview  # also writes preview.json for the 3D viewer
"""
import json
import os
import sys

import rbx
from rbx import Inst, B, T, serialize
import building
import floors_upper as U
import floors_mid as M
import floors_lower as L
import world as W

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'PSI_88F_Escape_Map.rbxlx')

# top → bottom. (floor number, title, height, builder, extra)
FLOORS = [
    (88, '공유 하우스', 16, U.f88, dict(door='locked', floor_mat='WoodPlanks', floor_color=0x7A5A3E, ceil_color=0xC8C0B0,
                                    elevator_text='운행 중지')),
    (87, '폐허 (에스키모)', 16, U.f87, dict(floor_color=0x7A766E, ceil_color=0x8A8680, elevator_bent=True,
                                      elevator_text='고장',
                                      facade_missing={'S': [(-40, -8, True), (20, 36, False)],
                                                      'W': [(-30, -6, False), (20, 44, True)],
                                                      'N': [(-60, -44, False)]})),
    (80, '1급 기밀 문서보관소', 16, U.f80, dict(floor_color=0x4A4E52, ceil_color=0x6A6E72, elevator_text='보안 구역')),
    (70, 'CCTV 관제실', 16, U.f70, dict(floor_color=0x2A2E36, floor_mat='DiamondPlate', ceil_color=0x2A2E36)),
    (66, '짜장 지옥', 32, U.f66, dict(floor_color=0x3A2414, ceil_color=0x4A3424, elevator_text='짜장 침수')),
    (60, '사내식당 (진미국수)', 16, U.f60, dict(floor_color=0xC8C4B8, floor_mat='Slate', ceil_color=0xE8E8E4)),
    (50, '조수민 하우스', 16, U.f50, dict(floor_color=0x8A8A88, ceil_color=0xE0E0DC, elevator_text='수민이 집')),
    (44, '피의 축제방', 16, M.f44, dict(floor_color=0x2A1416, ceil_color=0x1A0E10)),
    (40, '정전된 칸막이 미로', 16, M.f40, dict(floor_color=0x3A3C40, ceil_color=0x2A2C30, elevator_text='정전')),
    (30, '피트니스 · 수영장', 16, M.f30, dict(floor_color=0xC8D8DA, floor_mat='Marble', ceil_color=0xE0E8EA)),
    (20, '회장실', 16, M.f20, dict(floor_color=0x2A2624, floor_mat='Marble', ceil_color=0x3A2A20, ceil_mat='WoodPlanks')),
    (10, '사내 어린이집', 16, M.f10, dict(floor_color=0xD8C8B0, ceil_color=0xF4ECE0)),
    (8, '정보구출반 8팀', 16, M.f8, dict(floor_color=0x50565E, ceil_color=0xE8EAEC)),
    (1, '로비 · 정문', 28, M.f1, dict(floor_color=0xE8E4DC, floor_mat='Marble', ceil_color=0xE8E4DC, gate=False,
                                    facade_missing={'S': [(-14, 14, True)]})),
    (-1, '파르티르레트', 16, L.b1, dict(ext='basement', floor_color=0x2A1C14, floor_mat='WoodPlanks', ceil_color=0x1E1410,
                                     outer_color=0x1E1410, outer_mat='WoodPlanks')),
    (-2, '기니방', 16, L.b2, dict(ext='basement', floor_color=0xC8A878, ceil_color=0xE8E0D0, outer_color=0xD8D0C0)),
    (-3, '짱큰베리', 20, L.b3, dict(ext='basement', floor_color=0x2A1A14, floor_mat='Ground', ceil_color=0x1A1410,
                                 outer_color=0x2A2420, outer_mat='Brick', elevator_text='■■■■')),
] + [
    (-n, '짱큰 지하병원 · ' + L.HOSP_THEME[-n][0], 16, L.hospital,
     dict(ext='basement', floor_color=0x9A9E8E, ceil_color=0xC8CCC0, outer_color=0xB8BCB0, elevator_text='B%d' % n))
    for n in range(6, 14)
]


def label(n):
    return '%dF' % n if n > 0 else 'B%d' % -n


def skip_text(upper, lower):
    between = list(range(lower + 1, upper)) if upper > 0 and lower > 0 else []
    if upper < 0 and lower < 0:
        between = list(range(lower + 1, upper))
    if not between:
        return None
    a, b = max(between), min(between)
    if a == b:
        return '%s  통과 · 출입 불가' % label(a)
    return '%s ~ %s\n통과 · 출입 불가' % (label(a), label(b))


def build(preview=False):
    rbx.PREVIEW.clear()
    ws = Inst('Workspace', 'Workspace')
    ws.prop('bool', 'StreamingEnabled', True)
    ws.prop('int', 'StreamingMinRadius', 96)
    ws.prop('int', 'StreamingTargetRadius', 400)
    lighting = Inst('Lighting', 'Lighting')
    W.lighting(lighting)

    root = B(ws).model('PSI_88F_Escape', 'Folder')
    floors_folder = root.folder('Floors')

    # vertical stacking: 1F floor top at y=0
    idx1 = [f[0] for f in FLOORS].index(1)
    base = {}
    y = 0
    for i in range(idx1, -1, -1):
        n, _, h, _, _ = FLOORS[i]
        base[n] = y
        y += h
    roof_y = y
    y = 0
    for i in range(idx1 + 1, len(FLOORS)):
        n, _, h, _, _ = FLOORS[i]
        y -= h
        base[n] = y

    for i, (n, title, h, fn, extra) in enumerate(FLOORS):
        above = FLOORS[i - 1][0] if i > 0 else None
        below = FLOORS[i + 1][0] if i + 1 < len(FLOORS) else None
        F = dict(n=n, title=title, h=h, label=label(n), above=above is not None, below=below is not None,
                 gate=below is not None, door='open')
        if above is not None:
            F['skip_text'] = skip_text(above, n)
        if n == -13:
            F['holes'] = [(-62, -46, -8, 8)]
        F.update(extra)
        name = 'F%s_%s' % (label(n), title.split(' (')[0].replace(' · ', '_').replace(' ', ''))
        fb = floors_folder.model(name, cf=T(0, base[n], 0))
        building.floor_common(fb, F)
        fn(fb, F)

    W.roof(root, roof_y)
    L.core(root, base[-13] - 1)
    W.exterior(root)
    W.skyline(root)

    # legend for scripters
    info = Inst('StringValue', 'MapInfo', root.parent)
    info.prop('string', 'Value', 'PSI 88층 탈출 맵 — 태그: PlayerSpawn, StairDoor, ExitGate, ExitButton, Checkpoint, '
                                 'KillBrick, ChaserSpawn, MainGate, KeySlot, Key, VaultDoor, Safe, CellBars')
    serialize([ws, lighting], OUT)
    print('parts:', Inst.parts, 'instances:', Inst.count)
    print('floor bases:', {label(k): v for k, v in base.items()}, 'roof:', roof_y)
    if preview:
        data = []
        for kind, size, cf, color, tr, mat in rbx.PREVIEW:
            if tr >= 0.99:
                continue
            data.append([{'Ball': 'S', 'Block': 'B', 'Cylinder': 'C', 'Wedge': 'W'}[kind], [round(v, 2) for v in size], [round(v, 2) for v in cf.p],
                         [round(cf.R[i][j], 4) for i in range(3) for j in range(3)], color, round(tr, 2),
                         1 if mat == 'Neon' else 0])
        with open(os.path.join(HERE, 'preview.json'), 'w') as fh:
            json.dump(data, fh, separators=(',', ':'))
        print('preview parts:', len(data))
    return base


if __name__ == '__main__':
    build('--preview' in sys.argv)
