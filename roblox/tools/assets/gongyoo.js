// 오프닝의 공유 (사용자 설정화): 둥근 몸 메시 조각들. 로블록스 R15 몸 부위마다 하나씩 만들고,
// 게임에서 그 부위에 붙여 쓴다 (부위는 투명하게) → 로블록스 기본 걷기·뛰기 움직임을 그대로 따라간다.
// 각 조각은 그 부위의 기본 크기 상자(DEF) 안 좌표로 만든다. 앞 = -Z, 위 = +Y.
// 이름: "<부위>__<조각>" (예: UpperTorso__Suit). 색: 남색 경비 근무복, 하늘색 셔츠, 보라 넥타이, 피부, 갈색 머리, 검은 구두
import { box, ellipsoid, roundCone, unionS, union, inter, sub, offset, halfspace, mesh } from './sdf.js';

export const R15_DEF = {
  Head: [1.2, 1.2, 1.2], UpperTorso: [2, 1.6, 1], LowerTorso: [2, 0.4, 1],
  LeftUpperArm: [1, 1.169, 1], RightUpperArm: [1, 1.169, 1], LeftLowerArm: [1, 1.052, 1], RightLowerArm: [1, 1.052, 1],
  LeftHand: [1, 0.3, 1], RightHand: [1, 0.3, 1], LeftUpperLeg: [1, 1.217, 1], RightUpperLeg: [1, 1.217, 1],
  LeftLowerLeg: [1, 1.193, 1], RightLowerLeg: [1, 1.193, 1], LeftFoot: [1, 0.3, 1], RightFoot: [1, 0.3, 1],
};
// 경비원 근무복: 남색 상의·바지, 하늘색 셔츠, 넥타이(설정화의 보라색), 검은 구두
const SUIT = [36, 44, 74], SUIT_D = [30, 36, 60], SKIN = [234, 196, 160], SHIRT = [200, 216, 234], TIE = [150, 100, 200], HAIR = [122, 76, 42], SHOE = [24, 22, 22];

function piece(out, part, name, f, half, cell, look, budget = 5000) {
  let c = cell, geo;
  for (let t = 0; t < 8; t++) { geo = mesh(f, [-half[0], -half[1], -half[2]], [half[0], half[1], half[2]], c, { smooth: 2 }); if (geo.index.count / 3 <= budget) break; c *= 1.15; }
  out.push({ name: `GY_${part}${name}`, partName: `${part}__${name}`, geo, ...look }); // 메시 이름은 겹치지 않게, 게임 안 이름은 부위__조각
}

export function buildGongYoo() {
  const out = [];
  const L = (color, material = 'SmoothPlastic') => ({ color, material, shadow: true });

  // ── 머리: 둥근 얼굴 + 턱 + 귀 (얼굴 그림은 게임에서 이 조각 앞면에 붙인다) ──
  const head = unionS(0.12,
    ellipsoid([0, 0.04, 0], [0.5, 0.58, 0.52]),
    ellipsoid([0, -0.28, -0.06], [0.36, 0.26, 0.38]),
    ellipsoid([-0.5, 0.0, 0.04], [0.07, 0.15, 0.1]), ellipsoid([0.5, 0.0, 0.04], [0.07, 0.15, 0.1]));
  piece(out, 'Head', 'Face', head, [0.62, 0.66, 0.62], 0.03, L(SKIN), 6000);
  // ── 머리카락: 머리를 덮는 껍질 + 뒷머리 + 옆머리, 앞은 가운데 가르마로 갈라진 앞머리 두 갈래 ──
  // 머리 표면에서 살짝 떠 있는 껍질 (머리카락 두께)
  const scalp = ellipsoid([0, 0.04, 0], [0.5, 0.58, 0.52]);
  const hairVol = sub(unionS(0.08, ellipsoid([0, 0.14, 0.04], [0.56, 0.58, 0.6]), offset(scalp, 0.07)), offset(scalp, -0.005));
  // 앞머리 아래 끝: 가운데 가르마 쪽이 높고(이마가 보임) 양옆으로 갈수록 눈썹 높이까지 내려온다
  const cap = inter(hairVol, (x, y, z) => {
    if (z < -0.12) { const yb = 0.44 - 0.3 * Math.min(1, Math.abs(x) / 0.48); return yb - y; }
    return -(y + 0.3 + 0.3 * Math.max(0, z) / 0.6);                        // 옆은 귀 위, 뒤는 목덜미까지
  });
  const part = box([0, 0.55, -0.42], [0.022, 0.2, 0.2], 0.01);                // 가르마 홈
  const bangs = cap;
  const sideburns = union(...[-1, 1].map((s) => roundCone([s * 0.5, 0.26, -0.12], [s * 0.49, -0.04, -0.14], 0.07, 0.045)));
  piece(out, 'Head', 'Hair', sub(unionS(0.05, cap, bangs, sideburns), part), [0.64, 0.76, 0.68], 0.028, L(HAIR), 7000);

  // ── 윗몸: 정장 상의 (어깨 둥글게) + 목 + 셔츠 V + 넥타이 + 라펠 ──
  // 어깨가 넓고 허리로 갈수록 좁아지는 정장 상의 (배가 볼록하지 않게 앞뒤 두께를 얇게)
  const torso = unionS(0.16,
    roundCone([-0.72, 0.5, 0.02], [0.72, 0.5, 0.02], 0.3, 0.3),
    box([0, 0.15, 0.02], [0.84, 0.45, 0.36], 0.3),
    box([0, -0.5, 0.02], [0.74, 0.42, 0.34], 0.28));
  const torsoIn = inter(torso, (x, y, z) => y - 0.8, (x, y, z) => -(y + 0.98)); // 목 위·허리 아래는 자른다
  piece(out, 'UpperTorso', 'Suit', torsoIn, [1.05, 1.02, 0.55], 0.04, L(SUIT, 'Fabric'), 7000);
  piece(out, 'UpperTorso', 'Neck', roundCone([0, 0.55, 0.0], [0, 0.95, 0.0], 0.25, 0.22), [0.3, 1.0, 0.3], 0.03, L(SKIN), 1500);
  // 앞면 V 영역: 위 넓고 아래 좁음 (명치까지)
  const vZone = (w) => (x, y, z) => Math.max(Math.abs(x) - (w * (y + 0.2) / 0.95), -(y + 0.2), y - 0.78, z + 0.05);
  piece(out, 'UpperTorso', 'Shirt', inter(offset(torsoIn, 0.012), vZone(0.32)), [0.4, 0.82, 0.55], 0.025, L(SHIRT), 2500);
  const tie = inter(offset(torsoIn, 0.03), (x, y, z) => Math.max(Math.abs(x) - (y > 0.55 ? 0.09 : 0.06 + 0.04 * (0.55 - y)), -(y + 0.12), y - 0.68, z + 0.05));
  piece(out, 'UpperTorso', 'Tie', tie, [0.2, 0.82, 0.55], 0.02, L(TIE, 'Fabric'), 2000);
  const lapel = inter(offset(torsoIn, 0.02), (x, y, z) => {
    const edge = 0.32 * (y + 0.2) / 0.95; const ax = Math.abs(x);
    return Math.max(edge - ax, ax - edge - 0.14, -(y + 0.25), y - 0.7, z + 0.05);
  });
  piece(out, 'UpperTorso', 'Lapel', lapel, [0.6, 0.82, 0.55], 0.025, L(SUIT_D, 'Fabric'), 2500);
  // 근무복 견장(어깨 위 띠) + 가슴 주머니 덮개 2개
  const straps = union(...[-1, 1].map((sx) => box([sx * 0.62, 0.74, 0.02], [0.2, 0.05, 0.12], 0.04)));
  piece(out, 'UpperTorso', 'Strap', inter(offset(torsoIn, 0.03), straps), [0.9, 0.85, 0.3], 0.02, L([24, 30, 52], 'Fabric'), 1500);
  const flaps = union(...[-1, 1].map((sx) => box([sx * 0.42, 0.12, -0.3], [0.2, 0.06, 0.2], 0.03)));
  piece(out, 'UpperTorso', 'Pocket', inter(offset(torsoIn, 0.02), flaps), [0.7, 0.3, 0.55], 0.02, L([26, 32, 56], 'Fabric'), 1500);
  // ── 아랫몸: 상의 밑단 + 바지 엉덩이 ──
  piece(out, 'LowerTorso', 'Suit', box([0, -0.05, 0.02], [0.72, 0.22, 0.33], 0.2), [0.8, 0.3, 0.4], 0.03, L(SUIT_D, 'Fabric'), 3000); // 바지 허리 (상의 밑단 안쪽)

  // ── 팔: 소매(정장) + 셔츠 소맷부리 + 손 ──
  ['Left', 'Right'].forEach((side) => {
    piece(out, `${side}UpperArm`, 'Suit', roundCone([0, 0.48, 0], [0, -0.55, 0], 0.37, 0.31), [0.4, 0.88, 0.4], 0.03, L(SUIT, 'Fabric'), 2500);
    piece(out, `${side}LowerArm`, 'Suit', roundCone([0, 0.48, 0], [0, -0.42, 0], 0.31, 0.27), [0.34, 0.8, 0.34], 0.03, L(SUIT, 'Fabric'), 2500);
    piece(out, `${side}LowerArm`, 'Cuff', inter(roundCone([0, -0.3, 0], [0, -0.58, 0], 0.255, 0.24), halfspace([0, -1, 0], 0.3)), [0.28, 0.62, 0.28], 0.02, L(SHIRT), 1200);
    const hand = unionS(0.08,
      ellipsoid([0, -0.12, 0], [0.22, 0.32, 0.27]),
      roundCone([side === 'Left' ? 0.18 : -0.18, 0.0, -0.12], [side === 'Left' ? 0.24 : -0.24, -0.22, -0.22], 0.08, 0.06));
    piece(out, `${side}Hand`, 'Skin', hand, [0.34, 0.5, 0.34], 0.025, L(SKIN), 2000);
    // ── 다리: 바지 + 구두 ──
    piece(out, `${side}UpperLeg`, 'Pants', roundCone([0, 0.5, 0], [0, -0.58, 0], 0.43, 0.36), [0.46, 0.95, 0.46], 0.03, L(SUIT_D, 'Fabric'), 2500);
    piece(out, `${side}LowerLeg`, 'Pants', roundCone([0, 0.56, 0], [0, -0.58, 0], 0.36, 0.32), [0.4, 0.95, 0.4], 0.03, L(SUIT_D, 'Fabric'), 2500);
    const shoe = unionS(0.08, ellipsoid([0, -0.02, -0.16], [0.32, 0.18, 0.56]), box([0, -0.12, -0.12], [0.3, 0.06, 0.52], 0.05));
    piece(out, `${side}Foot`, 'Shoe', shoe, [0.36, 0.24, 0.72], 0.025, L(SHOE, 'Leather'), 2500);
  });
  return out;
}
