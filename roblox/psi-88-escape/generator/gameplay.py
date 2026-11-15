"""Gameplay wiring: anchors and props for each floor's mechanic, Roblox services and the Luau scripts.

The scripts find things by CollectionService tag or by part name:
  GP_<Kind>_<i>   anchor for a floor mechanic (see lua/Floors.module.lua)       HideSpot  volume that hides a player
  FloorKey_<n>    card that opens floor n's stair gate (only on floors where reaching it is the challenge)
  ChaserSpawn / ChaserPatrol  조수민      ZzukZzuk  77F monster model
  ExitGate / ExitButton / Checkpoint / KillBrick / MainGate / MainChains / KeySlot / Key / PlayerSpawn
All coordinates are floor-local: y is measured from the floor's base.
"""
import os
from rbx import Inst, T, Ry

HERE = os.path.dirname(os.path.abspath(__file__))
LUA = os.path.join(HERE, 'lua')
CHASER_USER = 'WhaHakii'        # 조수민 아바타 (로블록스 아이디)

# cards that are simply picked up — getting to them is the hard part
CARD_SPOTS = {
    77: (-72, 1.2, -48),    # 백룸 반대편 구석 (쭉쭉이 + 정전)
    50: (-35, 3.6, 31),     # 조수민 침대 위 (무궁화 꽃 마당을 건너야 한다)
    44: (-62, 3.6, 4),      # 무대 MC 자리 (타일 파티를 건너야 한다)
    10: (-60, 1.2, -8),     # 낮잠방 (자는 조수민 옆)
    -3: (22.5, 6.2, 29),    # 베리 밥그릇 위 (베리의 시선)
    -9: (-20, 1.2, -3.5),   # 보호실 복도 (조수민 순찰)
    -10: (-72, 1.2, 0),     # 수술실 복도 서쪽 끝 (환자 마네킹)
}
BIG_PROMPT = {-3}            # the card hovers over something wide; the pick-up prompt reaches further

# (kind, [(x, y, z) or (x, y, z, yaw_degrees) or (x, y, z, yaw, size)])
ANCHORS = {
    88: [('Note', [(30, 3.6, -15.5), (6, 3.6, 20), (-10, 3.6, 13), (10.5, 3.6, -3.5)]),
         ('Keypad', [(57.5, 4.6, -6.5, 90)])],
    87: [('Hammer', [(16, 3.2, 26)]), ('Break', [(61.4, 2.4, -6.5, 90)])],
    80: [('Clue', [(-30, 4.2, 20)]), ('Alarm', [(50, 3.5, 20)]),
         ('Box', [(-5.8, 3.2, -31), (7.0, 3.2, -13), (19.8, 3.2, -31), (32.6, 3.2, 9), (13.4, 3.2, 31), (0.6, 3.2, 9)]),
         ('Laser', [(x, 4.4, zc + dz, 0, (3.3, 8, 0.3)) for x, zc in ((-5.8, -31), (7.0, -13), (19.8, -31), (32.6, 9), (13.4, 31), (0.6, 9))
                    for dz in (-5.5, 5.5)])],
    70: [('Digit', [(-8, 8.8, 8), (8, 8.8, 8), (24, 8.8, 8), (36, 8.8, 8)]), ('Note', [(50, 3.6, 0)]),
         ('Keypad', [(48, 4.6, 10)]), ('Alarm', [(-20, 3.5, -13)])],
    60: [('Ticket', [(-48, 3.6, -22), (52, 3.6, 30), (-20, 3.6, 30)]), ('Machine', [(48, 4.6, 2.4)])],
    50: [('Tagger', [(-11, 4.7, -9.6)])],
    40: [('Lever', [(-26, 4.4, 40), (-58, 4.4, -40), (14, 4.4, -32)])],
    30: [('Board', [(-38, 9.6, -54.5)])],
    20: [('Pad', [(-49.5, 0.6, -3.5), (-42.5, 0.6, -3.5), (-49.5, 0.6, 3.5), (-42.5, 0.6, 3.5)])],
    8: [('Report', [(-7.8, 4.4, -35.4)]), ('Review', [(-9.8, 4.4, -44.6)]), ('Submit', [(-44, 4.4, -6)])],
    -1: [('Note', [(28, 4.6, 11.5)]), ('Tie', [(-37.0, 5.0, z, -90) for z in (-16, -8, 0, 8, 16)]),
         ('Mannequin', [(-28, 3, -21), (-28, 3, 21), (-8, 3, 22), (4, 3, -24), (-18, 3, 7), (6, 3, 13)])],
    -2: [('Seed', [(-70, 3.6, -45), (40, 3.6, -45), (-25, 3.6, 5), (50, 3.6, 40), (-10, 3.6, 45), (-10, 2.8, -40)]),
         ('Feed', [(-31, 3, 24)])],
    -6: [('Ticket', [(46, 4.2, 6)]), ('Doc', [(-70, 3.6, 0)])],
    -7: [('Lever', [(-42, 4.0, -30), (4, 4.0, -30), (18, 4.0, 24)])],
    -8: [('Machine', [(-16, 2.4, 0)])],
    -10: [('Mannequin', [(30, 3, 0), (-20, 3, 0), (0, 3, 0), (-56, 3, 2), (-70, 3, -20)])],
    -11: [('Note', [(4, 3.6, -20), (32, 3.6, 12), (-12, 3.6, 42)]), ('Keypad', [(50, 4.2, 10)])],
    -12: [('Lever', [(-70, 4.0, 1), (-48, 4.0, 2), (10, 4.0, 2)])],
}
EXTRA_CHASER = {-9: (-70, 3, 0), 40: (-42, 3.4, 16)}
EXTRA_PATROL = {-9: [(-40, 3, 0), (10, 3, 0), (40, 3, 0)], 40: [(-10, 3.4, 0), (22, 3.4, 24), (-50, 3.4, -24), (30, 3.4, -40)]}
# (x, floor y, z, yaw): the open side faces local −Z. yaw 90 → opening toward −X, yaw −90 → toward +X, 180 → toward +Z
LOCKERS = {
    8: [(-26.3, 0.4, -28, -90), (-26.3, 0.4, 3, -90), (59.9, 0.4, -32, 90), (59.9, 0.4, 6, 90)],
    -12: [(x, 0, -4.6, 180) for x in (-70, -56, -40, -10, 12, 28)],
}
COVER = {-3: [(52, 0.4, 6, 0), (40, 0.4, 22, 90), (9, 0.4, 26, -90), (30, 0.4, -14, 180)]}

OBJECTIVES = {
    88: '현관 도어락 암호는 4자리. 집 안에 숨겨진 쪽지 4장을 읽고 현관 옆 단말기에 입력하라',
    87: '천장이 무너진다 — 바닥의 빨간 원을 피해라. 에스키모의 망치를 찾아 비상구 옆 「금 간 벽」을 부숴라',
    80: '열람실의 신청서에서 문서 번호를 확인하고, 서가 통로에서 같은 번호의 상자를 꺼내라. 레이저는 꺼질 때 지나가라',
    77: '카드는 반대편 끝에 있다. 쭉쭉이는 네가 보고 있을 때만 멈춘다 — 정전 때는 그것도 소용없다',
    70: '색깔 모니터 4대에 한 자리씩 뜨는 숫자를, 상황실장 메모의 색 순서대로 단말기에 입력하라',
    66: '짜장에 빠지지 말고 발판을 건너 골인 접시의 빨간 버튼을 눌러라. 군만두가 떨어진다',
    60: '식권 3장을 모아 발매기에 넣어라. 에스키모가 돌진해 오면 부스 좌석 안이나 주방으로 숨어라',
    50: '무궁화 꽃이 피었습니다 — 수민이가 돌아볼 때 움직이면 끝. 마당을 건너 수민이 방 침대 위의 카드를 가져와라',
    44: '피의 축제~! MC 백윤례가 부르는 색 타일 위에 서라. 무대 위 MC 자리에 카드가 있다',
    40: '정전. 미로 속 차단기 3개를 올린 뒤 서쪽 끝 분전반의 주 전원 스위치를 눌러라. 조수민이 돌아다닌다',
    30: '전광판의 순위대로 출발대에 올라서라 (1위 레인부터). 수영장은 유리벽 사이 계단 위에 있다',
    20: '회장실 바닥의 보안 패드가 빛나는 순서를 외워 그대로 밟아라 (3라운드)',
    10: '카드는 낮잠방에 있다. 수민이가 자고 있다 — 살금살금(C) 걷고, 삑삑이 장난감을 밟지 마라',
    8: '결재를 받아라: 공유 자리(보고서) → 차강면 차장(검토) → 유모자 팀장실(결재). 에스키모가 오면 캐비닛 안으로',
    1: '정문이 잠겨 있다. 지하로 내려가 열쇠를 찾아라',
    -1: '계산대의 주문서에 적힌 색의 넥타이를 서쪽 벽에서 골라라. 불이 꺼지면 마네킹이 움직인다',
    -2: '해바라기씨 6알을 모아, 자고 있는 왕기니 앞 밥그릇에 놓아라',
    -3: '베리의 시선(노란 빛)을 피해 밥그릇 위의 카드를 가져와라. 빛이 오면 택배 상자 안으로',
    -6: '로비에서 번호표를 뽑고, 호출되면 복도 서쪽 끝 진료실에서 진료 기록을 받아라. 들것이 오면 병실로',
    -7: '병실 어딘가의 비상 발전기 3대를 켜라. 들것이 오면 병실로 피해라',
    -8: '복도의 제세동기를 3번 충전하라 (초록 칸에서 누르기). 들것이 오면 병실로 피해라',
    -9: '보호실 복도. 조수민이 순찰한다. 복도의 카드를 찾아라',
    -10: '카드는 복도 서쪽 끝에 있다. 불이 꺼지면 환자복 마네킹이 움직인다',
    -11: '환자 차트 3장에 적힌 숫자를 모아 로비의 기록보관실 단말기에 입력하라. 들것이 오면 병실로',
    -12: '격리병동 비상 발전기 3대를 켜라. 병실은 전부 잠겼다 — 들것이 오면 복도의 캐비닛 안으로',
    -13: '봉인실 바닥 구멍으로 뛰어내려라. 아래는 지구 내핵이다',
}


def place_anchor(fb, name, x, y, z, tags=None, yaw=0, size=(1, 1, 1)):
    return fb.blk(name, size, (x, y, z), 0xFF00FF, rot=Ry(yaw) if yaw else None, tr=1, collide=False, shadow=False, tags=tags)


def locker(b, col=0x55606C):
    """Steel cabinet a player can step into. Open side faces local −Z."""
    m = b.model('HideLocker')
    m.box('Back', -2.2, 0, 1.3, 2.2, 7.6, 1.6, col, 'Metal')
    m.box('SideL', -2.2, 0, -1.6, -1.9, 7.6, 1.3, col, 'Metal')
    m.box('SideR', 1.9, 0, -1.6, 2.2, 7.6, 1.3, col, 'Metal')
    m.box('Top', -2.2, 7.3, -1.6, 2.2, 7.6, 1.6, col, 'Metal')
    m.box('Inside', -1.9, 0.02, -1.6, 1.9, 0.06, 1.3, 0x0C0C0E, collide=False, shadow=False)
    m.box('Shadow', -1.9, 0.06, 1.25, 1.9, 7.3, 1.3, 0x0C0C0E, collide=False, shadow=False)
    m.box('Mark', -1.3, 7.6, -1.7, 1.3, 7.85, -1.5, 0x3AE07A, 'Neon', collide=False, shadow=False)
    for k in range(3):
        m.box('Vent', -2.24, 5.6 + k * 0.4, -1.0, -2.2, 5.75 + k * 0.4, 0.8, 0x2A3038, 'Metal', collide=False, shadow=False)
    m.blk('HideZone', (3.7, 7.2, 3.1), (0, 3.6, -0.2), 0xFF00FF, tr=1, collide=False, shadow=False, tags=['HideSpot'])
    return m


def cover_box(b, col=0xB48C5C):
    """A big parcel box lying on its side (B3). Standing inside it blocks 베리's gaze. Open side faces local −Z."""
    m = b.model('ParcelCover')
    m.box('Back', -3.6, 0, 2.7, 3.6, 6.6, 3.0, col, 'WoodPlanks')
    m.box('SideL', -3.6, 0, -3.0, -3.3, 6.6, 2.7, col, 'WoodPlanks')
    m.box('SideR', 3.3, 0, -3.0, 3.6, 6.6, 2.7, col, 'WoodPlanks')
    m.box('Top', -3.6, 6.3, -3.0, 3.6, 6.6, 3.0, col, 'WoodPlanks')
    m.box('FlapL', -6.2, 0, -3.2, -3.6, 0.2, -2.9 + 2.4, 0xA47C4C, 'WoodPlanks', collide=False)
    m.box('Tape', -0.5, 6.6, -3.0, 0.5, 6.64, 3.0, 0xD8C8A0, collide=False, shadow=False)
    m.box('Label', 1.2, 6.6, -2.4, 3.0, 6.64, -0.8, 0xF0F0EC, collide=False, shadow=False)
    m.blk('HideZone', (6.6, 6.2, 5.7), (0, 3.2, -0.1), 0xFF00FF, tr=1, collide=False, shadow=False, tags=['HideSpot'])
    return m


def add_floor_gameplay(fb, n):
    """Called once per floor after the floor is built."""
    g = fb.model('Objectives')
    spot = CARD_SPOTS.get(n)
    if spot:
        place_anchor(g, 'FloorKey_%d' % n, *spot, size=(2, 2, 2) if n in BIG_PROMPT else (1, 1, 1))
    for kind, spots in ANCHORS.get(n, []):
        for i, sp in enumerate(spots):
            yaw = sp[3] if len(sp) > 3 else 0
            size = sp[4] if len(sp) > 4 else (1, 1, 1)
            place_anchor(g, 'GP_%s_%d' % (kind, i + 1), sp[0], sp[1], sp[2], yaw=yaw, size=size)
    if n in EXTRA_CHASER:
        x, y, z = EXTRA_CHASER[n]
        g.blk('ChaserSpawn', (4, 6, 4), (x, y, z), 0xFF0000, tr=1, collide=False, shadow=False, tags=['ChaserSpawn'])
        for p in EXTRA_PATROL.get(n, []):
            place_anchor(g, 'ChaserPatrol', *p)
    for x, y, z, yaw in LOCKERS.get(n, []):
        locker(fb.at(T(x, y, z) * Ry(yaw)))
    for x, y, z, yaw in COVER.get(n, []):
        cover_box(fb.at(T(x, y, z) * Ry(yaw)))


def lua(name):
    with open(os.path.join(LUA, name), encoding='utf-8') as fh:
        return fh.read()


def config_source(floors, base, core_top, chaser_user=CHASER_USER, chaser_id=0):
    lines = ['-- 자동 생성: 층 정보와 게임 설정. 맵을 다시 생성하면 함께 갱신된다.', 'local M = {}', '',
             '-- 조수민 아바타: 로블록스 아이디(UserName)나 UserId를 넣으면 그 아바타를 그대로 불러온다. 비어 있으면 기본 모습.',
             '-- SleepFloors: 그 층의 조수민은 자고 있다가 시끄러우면 깬다.',
             'M.Chaser = { UserName = %s, UserId = %d, DisplayName = "조수민", PatrolSpeed = 11, ChaseSpeed = 17, SprintSpeed = 21,'
             ' SleepFloors = { [10] = true } }' % ('"%s"' % chaser_user, chaser_id),
             'M.Zzuk = { Speed = 22 }', '', 'M.floors = {']
    for n, title, h, _, _ in floors:
        lab = '%dF' % n if n > 0 else 'B%d' % -n
        obj = OBJECTIVES.get(n, '계단 창살을 열 방법을 찾아라').replace('"', '\\"')
        lines.append('\t{ n = %d, label = "%s", title = "%s", base = %s, h = %s, objective = "%s" },' % (
            n, lab, title.replace('"', '\\"'), repr(float(base[n])), repr(float(h)), obj))
    lines += ['}', 'M.coreTop = %s' % repr(float(core_top)), 'M.byN = {}',
              'for _, f in ipairs(M.floors) do M.byN[f.n] = f end', '',
              'function M.floorOfY(y)',
              '\tfor _, f in ipairs(M.floors) do',
              '\t\tif y >= f.base - 0.5 and y < f.base + f.h - 0.5 then return f.n end',
              '\tend',
              '\treturn nil',
              'end', '', 'return M', '']
    return '\n'.join(lines)


def services(floors, base, core_top):
    """Build the non-Workspace roots of the place file."""
    roots = []
    rs = Inst('ReplicatedStorage', 'ReplicatedStorage')
    cfg = Inst('ModuleScript', 'Config', rs)
    cfg.prop('ProtectedString', 'Source', config_source(floors, base, core_top))
    rem = Inst('Folder', 'Remotes', rs)
    for ev in ('Message', 'Caught', 'State', 'Win', 'Restart', 'Fx', 'Input'):
        Inst('RemoteEvent', ev, rem)
    roots.append(rs)

    sss = Inst('ServerScriptService', 'ServerScriptService')
    gs = Inst('Script', 'GameServer', sss)
    gs.prop('ProtectedString', 'Source', lua('GameServer.server.lua'))
    for mod in ('Chaser', 'ZzukZzuk', 'Floors'):
        m = Inst('ModuleScript', mod, sss)
        m.prop('ProtectedString', 'Source', lua(mod + '.module.lua'))
    roots.append(sss)

    sp = Inst('StarterPlayer', 'StarterPlayer')
    sp.prop('bool', 'EnableMouseLockOption', False)      # Shift is the sprint key
    sp.prop('float', 'CameraMaxZoomDistance', 24)
    sps = Inst('StarterPlayerScripts', 'StarterPlayerScripts', sp)
    ui = Inst('LocalScript', 'ClientUI', sps)
    ui.prop('ProtectedString', 'Source', lua('ClientUI.client.lua'))
    Inst('StarterCharacterScripts', 'StarterCharacterScripts', sp)
    roots.append(sp)

    players = Inst('Players', 'Players')
    players.prop('bool', 'CharacterAutoLoads', False)
    players.prop('int', 'RespawnTime', 3)
    roots.append(players)

    roots.append(Inst('StarterGui', 'StarterGui'))
    roots.append(Inst('SoundService', 'SoundService'))
    return roots
