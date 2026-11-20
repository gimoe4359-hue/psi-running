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
// 한국 경비원 근무복 (사용자 참고 사진): 하늘색 반팔 셔츠(카라·가슴 주머니 2개·단추줄), 초록 견장, 왼팔 패치, 오른쪽 가슴 은색 배지,
// 검은 벨트 + 은색 버클, 남색 바지, 검은 구두, 남색 야구모자(금색 엠블럼·금색 줄), 허리에 찬 검은 경봉
const SHIRT = [128, 172, 218], SHIRT_D = [104, 148, 198], PANTS = [28, 32, 52], SKIN = [234, 196, 160], HAIR = [122, 76, 42], SHOE = [20, 20, 22],
  GREEN = [36, 132, 86], GOLD = [214, 170, 60], SILVER = [200, 204, 210], CAPC = [24, 28, 48], BLACK = [18, 18, 20];
const SUIT = SHIRT, SUIT_D = PANTS;

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
  const capCut = inter(ellipsoid([0, 0.24, 0.05], [0.56, 0.52, 0.63]), (x, y, z) => 0.3 + 0.08 * Math.max(0, z) - y); // 모자가 덮는 곳은 머리카락을 지운다
  piece(out, 'Head', 'Hair', sub(sub(unionS(0.05, cap, bangs, sideburns), part), capCut), [0.64, 0.76, 0.68], 0.028, L(HAIR), 7000);
  // ── 경비 야구모자: 머리를 덮는 둥근 모자 + 앞챙 + 금색 엠블럼·금색 줄 ──
  const crownVol = ellipsoid([0, 0.24, 0.05], [0.54, 0.5, 0.61]);
  const crown = inter(sub(crownVol, offset(cranium, -0.02)), (x, y, z) => 0.3 + 0.08 * Math.max(0, z) - y);
  const brim = inter(ellipsoid([0, 0.31, -0.52], [0.4, 0.04, 0.3]), (x, y, z) => z + 0.32);
  piece(out, 'Head', 'Cap', unionS(0.04, crown, brim), [0.56, 0.72, 0.86], 0.024, L(CAPC, 'Fabric'), 7000);
  const emblem = inter(offset(crown, 0.02), ellipsoid([0, 0.5, -0.5], [0.11, 0.12, 0.2]));
  const braid = roundCone([-0.3, 0.33, -0.42], [0.3, 0.33, -0.42], 0.025, 0.025);
  piece(out, 'Head', 'CapGold', union(emblem, inter(braid, offset(unionS(0.04, crown, brim), 0.03))), [0.4, 0.66, 0.6], 0.016, L(GOLD, 'Metal'), 2500);

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
  piece(out, 'UpperTorso', 'Suit', torsoIn, [1.05, 1.02, 0.55], 0.035, L(SHIRT, 'Fabric'), 8000);
  // 셔츠 겉 장식은 몸통 표면에서 살짝 떠 있는 얇은 층 (offset) 과 영역을 겹쳐 만든다
  const onShirt = (d, f) => inter(offset(torsoIn, d), f);
  // 카라: 목 뒤에서 앞으로 내려오는 두 날개
  const collar = union(
    roundCone([-0.2, 0.8, 0.12], [0.2, 0.8, 0.12], 0.06, 0.06),
    ...[-1, 1].map((sx) => unionS(0.03, roundCone([sx * 0.2, 0.8, 0.12], [sx * 0.25, 0.74, -0.14], 0.06, 0.05), roundCone([sx * 0.25, 0.74, -0.14], [sx * 0.09, 0.56, -0.3], 0.05, 0.035))));
  piece(out, 'UpperTorso', 'Collar', collar, [0.4, 0.9, 0.4], 0.018, L(SHIRT, 'Fabric'), 2500);
  // 단추줄 + 단추 5개, 가슴 주머니 2개(덮개 + 단추)
  piece(out, 'UpperTorso', 'Placket', onShirt(0.018, (x, y, z) => Math.max(Math.abs(x) - 0.05, z + 0.05, y - 0.6, -(y + 0.97))), [0.12, 0.82, 0.55], 0.018, L(SHIRT_D, 'Fabric'), 2000);
  const buttons = union(...[0.48, 0.18, -0.12, -0.42, -0.72].map((y) => ellipsoid([0, y, -0.6], [0.045, 0.045, 0.4])),
    ...[-1, 1].map((sx) => ellipsoid([sx * 0.38, 0.27, -0.6], [0.04, 0.04, 0.4])));
  piece(out, 'UpperTorso', 'Buttons', onShirt(0.035, buttons), [0.5, 0.6, 0.55], 0.012, L([236, 240, 246]), 1500);
  const pockets = union(...[-1, 1].map((sx) => box([sx * 0.38, 0.08, -0.4], [0.18, 0.17, 0.3], 0.03)));
  const flaps = union(...[-1, 1].map((sx) => box([sx * 0.38, 0.27, -0.4], [0.2, 0.06, 0.3], 0.03)));
  piece(out, 'UpperTorso', 'Pockets', union(onShirt(0.02, pockets), onShirt(0.035, flaps)), [0.65, 0.42, 0.55], 0.016, L(SHIRT_D, 'Fabric'), 3000);
  // 초록 견장 (어깨 위), 왼쪽 가슴 주머니에 은색 배지 (몸 왼쪽 = -X)
  piece(out, 'UpperTorso', 'Epaulette', onShirt(0.04, union(...[-1, 1].map((sx) => box([sx * 0.56, 0.72, 0.04], [0.24, 0.08, 0.13], 0.04)))), [0.85, 0.85, 0.3], 0.018, L(GREEN, 'Fabric'), 2000);
  piece(out, 'UpperTorso', 'Badge', onShirt(0.05, ellipsoid([-0.38, 0.06, -0.6], [0.08, 0.11, 0.4])), [0.5, 0.25, 0.55], 0.012, L(SILVER, 'Metal'), 1200);
  piece(out, 'UpperTorso', 'Neck', roundCone([0, 0.5, 0.04], [0, 0.98, 0.0], 0.2, 0.17), [0.26, 1.02, 0.26], 0.025, L(SKIN), 1500);
  // ── 아랫몸: 골반 (허리보다 살짝 넓게) ──
  const pelvis = unionS(0.08, ellipsoid([0, 0.0, 0.03], [0.64, 0.26, 0.36]), ellipsoid([0, -0.12, 0.12], [0.5, 0.2, 0.3]));
  piece(out, 'LowerTorso', 'Suit', pelvis, [0.72, 0.34, 0.45], 0.03, L(PANTS, 'Fabric'), 3000);
  // 검은 벨트 + 은색 네모 버클 (앞), 왼쪽 허리에 찬 검은 경봉 (몸 왼쪽 = -X)
  piece(out, 'LowerTorso', 'Belt', inter(offset(pelvis, 0.03), (x, y, z) => Math.abs(y - 0.12) - 0.07), [0.72, 0.34, 0.45], 0.02, L(BLACK, 'Leather'), 3000);
  piece(out, 'LowerTorso', 'Buckle', box([0, 0.12, -0.39], [0.1, 0.07, 0.03], 0.02), [0.14, 0.24, 0.45], 0.01, L(SILVER, 'Metal'), 800);
  piece(out, 'LowerTorso', 'Baton', unionS(0.02, roundCone([-0.7, 0.05, 0.1], [-0.74, -1.45, 0.16], 0.055, 0.05), roundCone([-0.7, 0.05, 0.1], [-0.82, 0.05, -0.12], 0.04, 0.04)), [0.9, 1.6, 0.4], 0.016, L(BLACK, 'SmoothPlastic'), 1500);

  ['Left', 'Right'].forEach((side) => {
    const sx = side === 'Left' ? 1 : -1; // 몸 바깥쪽 = 왼팔은 -X, 오른팔은 +X (손등·엄지 방향 계산용)
    // ── 팔: 위팔(이두근이 볼록) → 팔꿈치 → 아래팔(팔꿈치 쪽 굵고 손목으로 가늘게) ──
    const upperArm = unionS(0.1, roundCone([0, 0.46, 0], [0, -0.56, 0], 0.25, 0.19), ellipsoid([0, 0.0, -0.06], [0.2, 0.28, 0.19]));
    piece(out, `${side}UpperArm`, 'Skin', upperArm, [0.3, 0.84, 0.3], 0.025, L(SKIN), 3000);
    // 반팔 소매: 위팔 위쪽 절반을 덮는다
    const sleeve = inter(offset(upperArm, 0.045), (x, y, z) => -(y + 0.14));
    piece(out, `${side}UpperArm`, 'Suit', sleeve, [0.36, 0.86, 0.36], 0.022, L(SHIRT, 'Fabric'), 3000);
    // 오른팔 소매 바깥쪽 패치 (몸 오른쪽 = +X)
    if (side === 'Right') piece(out, 'RightUpperArm', 'Patch', inter(offset(sleeve, 0.02), ellipsoid([0.32, 0.2, 0], [0.4, 0.17, 0.13])), [0.36, 0.42, 0.24], 0.012, L([30, 36, 70], 'Fabric'), 1200);
    piece(out, `${side}LowerArm`, 'Skin', unionS(0.08,
      roundCone([0, 0.46, 0], [0, -0.42, 0], 0.19, 0.14),
      ellipsoid([0, 0.22, 0.02], [0.18, 0.22, 0.16])), [0.23, 0.75, 0.23], 0.022, L(SKIN), 2500);
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
    // 통이 넉넉한 일자 바지 (허벅지에서 밑단까지 거의 같은 굵기)
    piece(out, `${side}UpperLeg`, 'Pants', unionS(0.1,
      roundCone([0, 0.5, 0.02], [0, -0.62, 0], 0.33, 0.26),
      ellipsoid([0, 0.18, -0.02], [0.28, 0.38, 0.27])), [0.38, 0.92, 0.38], 0.028, L(PANTS, 'Fabric'), 3000);
    piece(out, `${side}LowerLeg`, 'Pants', roundCone([0, 0.58, 0], [0, -0.66, -0.02], 0.25, 0.24), [0.3, 0.95, 0.32], 0.028, L(PANTS, 'Fabric'), 2500);
    // ── 구두: 낮고 긴 정장 구두 (앞코가 둥글게) ──
    const shoe = unionS(0.06,
      ellipsoid([0, -0.04, -0.22], [0.2, 0.14, 0.5]),
      box([0, -0.12, -0.16], [0.19, 0.05, 0.5], 0.05),
      ellipsoid([0, 0.02, 0.12], [0.18, 0.16, 0.2]));
    piece(out, `${side}Foot`, 'Shoe', shoe, [0.24, 0.22, 0.74], 0.022, L(SHOE, 'Leather'), 3000);
  });
  return out;
}
