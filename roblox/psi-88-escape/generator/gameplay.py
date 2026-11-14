"""Gameplay wiring: objective anchors per floor, Roblox services and the Luau scripts.

Everything the scripts look for is either a CollectionService tag or a part name:
  FloorKey_<n>  card that opens floor n's stair gate      AptKey  88F front-door key
  ChaserSpawn / ChaserPatrol  조수민                        ZzukZzuk  77F monster model
  ExitGate / ExitButton / Checkpoint / KillBrick / MainGate / KeySlot / Key / PlayerSpawn
"""
import os
from rbx import Inst, T

HERE = os.path.dirname(os.path.abspath(__file__))
LUA = os.path.join(HERE, 'lua')

# (floor, x, y, z) in floor-local coordinates; y = height the card hovers above
CARD_SPOTS = {
    87: (16, 4.0, 26),      # 에스키모의 사과 카드 옆
    80: (-30, 3.6, 20),     # 열람실 긴 테이블
    77: (-72, 1.2, -48),    # 백룸 반대편 구석 — 쭉쭉이 홀에서 멀다
    70: (53, 4.9, 38),      # 상황실장 책상
    60: (52, 1.2, 34),      # 주방 워크인 냉장고 앞
    50: (-35, 3.6, 31),     # 조수민 침대 위
    44: (-62, 2.8, 4),      # 무대 MC 자리
    30: (-72, 3.6, 2.5),    # 안전요원 의자 아래
    20: (-64, 3.6, 0),      # 회장 책상
    10: (-60, 1.2, -8),     # 낮잠방 (조수민이 있다)
    8: (-44, 3.0, -6),      # 유모자 팀장 책상
    -1: (28, 4.0, 11.5),    # 부티크 카운터
    -2: (-10, 0.8, -40),    # 은신처 오두막 안
    -3: (24, 4.0, 30),      # 베리 밥그릇 안
    -6: (56, 3.4, 22),      # 접수 데스크
    -7: (-74, 0.4, 0),      # 복도 서쪽 끝
    -8: (-40, 0.4, 3),
    -9: (-20, 0.4, -3.5),
    -10: (10, 0.4, 3),
    -11: (-60, 0.4, -3),
    -12: (52, 3.4, 22),     # 격리병동 간호사실
}
EXTRA_CHASER = {-9: (-70, 3, 0)}       # 조수민 한 명 더: B9 보호실 복도
EXTRA_PATROL = {-9: [(-40, 3, 0), (10, 3, 0), (40, 3, 0)]}
APT_KEY = (10.5, 1.0, -3.5)            # 88F 탈출 계획실의 탈출 가방 옆

OBJECTIVES = {
    88: '현관은 쇠사슬로 잠겨 있다. 집 어딘가에 있는 현관문 열쇠를 찾아라',
    87: '무너진 사무실. 출입 카드를 찾아 계단 창살을 열어라 (천장을 조심)',
    80: '열람실에 출입 카드가 있다. 철창 입구를 지나라',
    77: '여긴 77층이 아니다. 카드는 반대편 끝에 있다. 쭉쭉이는 네가 보고 있을 때만 멈춘다',
    70: '상황실장 책상에 카드가 있다. 모니터에 50층이 비친다',
    66: '짜장에 빠지지 말고 발판을 건너 골인 접시의 빨간 버튼을 눌러라',
    60: '주방 안쪽, 워크인 냉장고 앞에 카드가 있다',
    50: '카드는 수민이 방 침대 위에 있다. 수민이는 집에 있다',
    44: '무대 위 MC 자리에 카드가 있다. 피의 축제다~',
    40: '정전. 서쪽 끝 분전반에서 전원을 복구하라. 형광봉이 길을 알려 준다',
    30: '물 빠진 수영장. 안전요원 의자 아래에 카드가 있다',
    20: '회장 책상 위에 카드가 있다. 초상화가 보고 있다',
    10: '카드는 낮잠방에 있다. 조용히… 수민이가 자고 있다',
    8: '유모자 팀장 책상에 카드가 있다. very very good',
    1: '정문이 잠겨 있다. 지하로 내려가 열쇠를 찾아라',
    -1: '부티크 카운터에 카드가 있다. 마네킹이 많다',
    -2: '기니를 깨우지 말고, 은신처 오두막 안에서 카드를 찾아라',
    -3: '베리 밥그릇 안에 카드가 있다. 눈을 마주치지 마',
    -6: '지하병원 접수 데스크에 카드가 있다',
    -7: '복도 서쪽 끝에 카드가 있다',
    -8: '복도 어딘가에 카드가 떨어져 있다',
    -9: '보호실 복도. 조수민이 여기 있다. 카드를 찾아라',
    -10: '수술실 복도에 카드가 있다',
    -11: '기록보관 복도에 카드가 있다',
    -12: '격리병동 간호사실에 카드가 있다',
    -13: '봉인실 바닥 구멍으로 뛰어내려라. 아래는 지구 내핵이다',
}


def place_anchor(fb, name, x, y, z, tags=None):
    return fb.blk(name, (1, 1, 1), (x, y, z), 0xFF00FF, tr=1, collide=False, shadow=False, tags=tags)


def add_floor_gameplay(fb, n):
    """Called once per floor after the floor is built."""
    g = fb.model('Objectives')
    spot = CARD_SPOTS.get(n)
    if spot:
        place_anchor(g, 'FloorKey_%d' % n, *spot)
    if n == 88:
        place_anchor(g, 'AptKey', *APT_KEY)
    if n in EXTRA_CHASER:
        place_anchor(g, 'ChaserSpawn', *EXTRA_CHASER[n], tags=['ChaserSpawn'])
        for p in EXTRA_PATROL.get(n, []):
            place_anchor(g, 'ChaserPatrol', *p)


def lua(name):
    with open(os.path.join(LUA, name), encoding='utf-8') as fh:
        return fh.read()


def config_source(floors, base, core_top, chaser_user='', chaser_id=0):
    lines = ['-- 자동 생성: 층 정보와 게임 설정. 맵을 다시 생성하면 함께 갱신된다.', 'local M = {}', '',
             '-- 조수민 아바타: 로블록스 아이디(UserName)나 UserId를 넣으면 그 아바타를 그대로 불러온다. 비어 있으면 기본 모습.',
             'M.Chaser = { UserName = %s, UserId = %d, DisplayName = "조수민", PatrolSpeed = 11, ChaseSpeed = 17, SprintSpeed = 21 }' % (
                 '"%s"' % chaser_user, chaser_id),
             'M.Zzuk = { Speed = 22 }', '', 'M.floors = {']
    for n, title, h, _, _ in floors:
        lab = '%dF' % n if n > 0 else 'B%d' % -n
        obj = OBJECTIVES.get(n, '출입 카드를 찾아 계단 창살을 열어라').replace('"', '\\"')
        lines.append('\t{ n = %d, label = "%s", title = "%s", base = %s, h = %s, objective = "%s" },' % (
            n, lab, title.replace('"', '\\"'), repr(float(base[n])), repr(float(h)), obj))
    lines += ['}', 'M.coreTop = %s' % repr(float(core_top)), 'M.byN = {}',
              'for _, f in ipairs(M.floors) do M.byN[f.n] = f end', '',
              'function M.floorOfY(y: number): number?',
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
    for ev in ('Message', 'Caught', 'State', 'Win', 'Restart'):
        Inst('RemoteEvent', ev, rem)
    roots.append(rs)

    sss = Inst('ServerScriptService', 'ServerScriptService')
    gs = Inst('Script', 'GameServer', sss)
    gs.prop('ProtectedString', 'Source', lua('GameServer.server.lua'))
    for mod in ('Chaser', 'ZzukZzuk'):
        m = Inst('ModuleScript', mod, sss)
        m.prop('ProtectedString', 'Source', lua(mod + '.module.lua'))
    roots.append(sss)

    sp = Inst('StarterPlayer', 'StarterPlayer')
    sp.prop('bool', 'EnableMouseLockOption', True)
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
