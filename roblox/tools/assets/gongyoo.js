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
// 경비원 근무복: 플레이어가 입는 경비 옷(GuardOutfit)과 같은 민무늬 남색 상의·바지 + 검은 구두. 모자·이름표·휘장·완장은 게임에서 붙인다
const SUIT = [36, 46, 74], SUIT_D = [30, 36, 52], SKIN = [234, 196, 160], SHIRT = [200, 216, 234], TIE = [150, 100, 200], HAIR = [122, 76, 42], SHOE = [24, 22, 22]; // GuardOutfit 과 같은 남색

function piece(out, part, name, f, half, cell, look, budget = 5000) {
  let c = cell, geo;
  for (let t = 0; t < 8; t++) { geo = mesh(f, [-half[0], -half[1], -half[2]], [half[0], half[1], half[2]], c, { smooth: 2 }); if (geo.index.count / 3 <= budget) break; c *= 1.15; }
  out.push({ name: `GY_${part}${name}`, partName: `${part}__${name}`, geo, ...look }); // 메시 이름은 겹치지 않게, 게임 안 이름은 부위__조각
}

export function buildGongYoo() {
  const out = [];
  const L = (color, material = 'SmoothPlastic') => ({ color, material, shadow: true });

  // ── 머리: 둥근 얼굴 + 턱 + 귀 (얼굴 그림은 게임에서 이 조각 앞면에 붙인다) ──
  // 사람 머리: 둥근 머리뼈 + 갸름한 턱선 + 턱끝 + 광대 + 귀 (얼굴 그림은 게임에서 이 조각 앞면에 붙인다)
  const cranium = ellipsoid([0, 0.1, 0.02], [0.44, 0.52, 0.5]);
  const head = unionS(0.12,
    cranium,
    ellipsoid([0, -0.2, -0.06], [0.33, 0.32, 0.4]),                                           // 볼·턱선 (갸름하게)
    ellipsoid([0, -0.42, -0.2], [0.13, 0.1, 0.12]),                                           // 턱끝
    ellipsoid([-0.44, 0.0, 0.06], [0.06, 0.14, 0.09]), ellipsoid([0.44, 0.0, 0.06], [0.06, 0.14, 0.09]));
  piece(out, 'Head', 'Face', head, [0.62, 0.66, 0.62], 0.03, L(SKIN), 6000);
  // ── 머리카락: 머리를 덮는 껍질 + 뒷머리 + 옆머리, 앞은 가운데 가르마로 갈라진 앞머리 두 갈래 ──
  // 머리 표면에서 살짝 떠 있는 껍질 (머리카락 두께)
  const scalp = cranium;
  const hairVol = sub(unionS(0.08, ellipsoid([0, 0.2, 0.06], [0.5, 0.52, 0.57]), offset(scalp, 0.07)), offset(scalp, -0.005));
  // 앞머리 아래 끝: 가운데 가르마 쪽이 높고(이마가 보임) 양옆으로 갈수록 눈썹 높이까지 내려온다
  const cap = inter(hairVol, (x, y, z) => {
    if (z < -0.12) { const yb = 0.46 - 0.3 * Math.min(1, Math.abs(x) / 0.44); return yb - y; }
    return -(y + 0.3 + 0.3 * Math.max(0, z) / 0.6);                        // 옆은 귀 위, 뒤는 목덜미까지
  });
  const part = box([0, 0.55, -0.42], [0.022, 0.2, 0.2], 0.01);                // 가르마 홈
  const bangs = cap;
  const sideburns = union(...[-1, 1].map((s) => roundCone([s * 0.44, 0.28, -0.1], [s * 0.43, 0.0, -0.12], 0.06, 0.04)));
  piece(out, 'Head', 'Hair', sub(unionS(0.05, cap, bangs, sideburns), part), [0.64, 0.76, 0.68], 0.028, L(HAIR), 7000);

  // ── 윗몸 (사람 해부 비율): 넓은 어깨(삼각근) + 가슴 + 아래로 좁아지는 허리, 승모근이 목으로 이어짐. 근무복이 덮는다 ──
  // 흉곽에서 허리까지 한 덩어리로 매끈하게 좁아지는 몸통 (앞뒤로 납작한 타원 단면)
  const flatZ = (f, k) => (x, y, z) => f(x, y, z / k) * Math.min(1, k);
  const trunk = flatZ(roundCone([0, 0.32, 0], [0, -0.72, 0], 0.66, 0.52), 0.55);
  const torso = unionS(0.16,
    trunk,
    roundCone([-0.6, 0.52, 0.04], [0.6, 0.52, 0.04], 0.24, 0.24),                           // 어깨선
    ellipsoid([-0.8, 0.46, 0.04], [0.22, 0.24, 0.26]), ellipsoid([0.8, 0.46, 0.04], [0.22, 0.24, 0.26]), // 삼각근
    roundCone([-0.12, 0.72, 0.06], [-0.5, 0.56, 0.06], 0.16, 0.12), roundCone([0.12, 0.72, 0.06], [0.5, 0.56, 0.06], 0.16, 0.12)); // 승모근
  const torsoIn = inter(torso, (x, y, z) => y - 0.8, (x, y, z) => -(y + 0.98));
  piece(out, 'UpperTorso', 'Suit', torsoIn, [1.05, 1.02, 0.55], 0.035, L(SUIT, 'Fabric'), 8000);
  piece(out, 'UpperTorso', 'Neck', roundCone([0, 0.5, 0.04], [0, 0.98, 0.0], 0.2, 0.17), [0.26, 1.02, 0.26], 0.025, L(SKIN), 1500);
  // ── 아랫몸: 골반 (허리보다 살짝 넓게) ──
  piece(out, 'LowerTorso', 'Suit', unionS(0.08, ellipsoid([0, 0.0, 0.03], [0.64, 0.26, 0.36]), ellipsoid([0, -0.12, 0.12], [0.5, 0.2, 0.3])), [0.72, 0.34, 0.45], 0.03, L(SUIT_D, 'Fabric'), 3000);

  ['Left', 'Right'].forEach((side) => {
    const sx = side === 'Left' ? 1 : -1; // 몸 바깥쪽 = 왼팔은 -X, 오른팔은 +X (손등·엄지 방향 계산용)
    // ── 팔: 위팔(이두근이 볼록) → 팔꿈치 → 아래팔(팔꿈치 쪽 굵고 손목으로 가늘게) ──
    piece(out, `${side}UpperArm`, 'Suit', unionS(0.1,
      roundCone([0, 0.46, 0], [0, -0.56, 0], 0.27, 0.2),
      ellipsoid([0, 0.0, -0.06], [0.22, 0.3, 0.2])), [0.32, 0.86, 0.32], 0.025, L(SUIT, 'Fabric'), 3000);
    piece(out, `${side}LowerArm`, 'Suit', unionS(0.08,
      roundCone([0, 0.46, 0], [0, -0.42, 0], 0.21, 0.15),
      ellipsoid([0, 0.22, 0.02], [0.2, 0.24, 0.18])), [0.25, 0.75, 0.25], 0.025, L(SUIT, 'Fabric'), 2500);
    // ── 손: 손바닥 + 손가락 네 개 (살짝 굽힘) + 엄지 ──
    const fingers = [];
    for (let k = 0; k < 4; k++) {
      const fx = (k - 1.5) * 0.07;
      fingers.push(roundCone([fx, -0.22, 0.0], [fx, -0.42, -0.04], 0.04, 0.034));
      fingers.push(roundCone([fx, -0.42, -0.04], [fx, -0.52, -0.1], 0.034, 0.03));
    }
    const hand = unionS(0.04,
      box([0, -0.1, 0.0], [0.14, 0.14, 0.06], 0.05),
      ...fingers,
      roundCone([-sx * 0.12, -0.04, -0.04], [-sx * 0.16, -0.24, -0.12], 0.05, 0.035));
    piece(out, `${side}Hand`, 'Skin', hand, [0.24, 0.58, 0.2], 0.018, L(SKIN), 3000);
    // ── 다리: 허벅지(위가 굵고 무릎으로 가늘게) → 무릎 → 종아리(뒤쪽 위가 볼록) → 발목 ──
    piece(out, `${side}UpperLeg`, 'Pants', unionS(0.1,
      roundCone([0, 0.5, 0.02], [0, -0.6, 0], 0.33, 0.22),
      ellipsoid([0, 0.15, -0.04], [0.28, 0.4, 0.27])), [0.38, 0.92, 0.38], 0.028, L(SUIT_D, 'Fabric'), 3000);
    piece(out, `${side}LowerLeg`, 'Pants', unionS(0.1,
      roundCone([0, 0.56, 0], [0, -0.6, 0], 0.22, 0.15),
      ellipsoid([0, 0.22, 0.07], [0.21, 0.32, 0.22])), [0.28, 0.92, 0.32], 0.028, L(SUIT_D, 'Fabric'), 3000);
    // ── 구두: 낮고 긴 정장 구두 (앞코가 둥글게) ──
    const shoe = unionS(0.06,
      ellipsoid([0, -0.04, -0.22], [0.2, 0.14, 0.5]),
      box([0, -0.12, -0.16], [0.19, 0.05, 0.5], 0.05),
      ellipsoid([0, 0.02, 0.12], [0.18, 0.16, 0.2]));
    piece(out, `${side}Foot`, 'Shoe', shoe, [0.24, 0.22, 0.74], 0.022, L(SHOE, 'Leather'), 3000);
  });
  return out;
}
