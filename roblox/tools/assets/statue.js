// 책 읽는 소녀상 (옛 학교 교정의 청동상): 바위에 걸터앉아 무릎 위에 편 책을 두 손으로 들고 고개를 숙여 읽는 단발머리 소녀.
// SDF 로 조각해 매끈한 메시 하나로 뽑는다. 기준점 = 바위 밑 바닥 가운데, 앞(소녀가 보는 쪽) = -Z. 앉은키 약 4.2 stud.
import { ellipsoid, roundCone, box, unionS, union, inter, sub, offset, halfspace, rotX, wrinkle, mesh } from './sdf.js';

export function buildStatue() {
  // ── 바위 (앉는 자리) ──
  const rock = unionS(0.25,
    ellipsoid([0, 0.75, 0.15], [1.1, 0.85, 0.95]),
    ellipsoid([0.55, 0.45, -0.35], [0.6, 0.45, 0.55]),
    ellipsoid([-0.6, 0.5, 0.45], [0.55, 0.5, 0.5]));
  const rockR = wrinkle(rock, 0.06, 2.5);

  // ── 몸 ──
  const PIV = [0, 3.35, 0.05];
  const bow = (f) => rotX(f, PIV, -0.5); // 고개를 숙여 책을 내려다봄
  const head = bow(unionS(0.06,
    ellipsoid([0, 3.78, 0.02], [0.27, 0.34, 0.3]),
    ellipsoid([0, 3.58, -0.1], [0.19, 0.16, 0.2]),      // 턱
    ellipsoid([0, 3.72, -0.27], [0.05, 0.07, 0.05])));  // 코
  const neck = bow(roundCone([0, 3.22, 0.05], [0, 3.5, 0.02], 0.11, 0.1));
  const torso = unionS(0.1,
    ellipsoid([0, 2.9, 0.08], [0.42, 0.38, 0.25]),        // 가슴
    ellipsoid([0, 2.45, 0.1], [0.33, 0.32, 0.22]),        // 허리
    ellipsoid([0, 2.0, 0.12], [0.44, 0.28, 0.3]),         // 엉덩이
    roundCone([-0.34, 3.12, 0.08], [0, 3.2, 0.06], 0.1, 0.12),
    roundCone([0.34, 3.12, 0.08], [0, 3.2, 0.06], 0.1, 0.12));
  // 팔: 어깨 → 팔꿈치(옆구리 앞) → 손(무릎 위 책 양쪽)
  const arm = (s) => unionS(0.05,
    ellipsoid([s * 0.42, 3.05, 0.08], [0.13, 0.13, 0.13]),
    roundCone([s * 0.44, 3.02, 0.08], [s * 0.47, 2.42, -0.2], 0.1, 0.08),
    roundCone([s * 0.47, 2.42, -0.2], [s * 0.36, 2.38, -0.78], 0.08, 0.06),
    ellipsoid([s * 0.34, 2.38, -0.86], [0.07, 0.06, 0.12]));
  // 다리: 엉덩이 → 무릎(앞으로) → 발목(아래) → 발
  const leg = (s) => unionS(0.06,
    roundCone([s * 0.21, 1.95, 0.05], [s * 0.24, 2.0, -0.95], 0.25, 0.16),
    roundCone([s * 0.24, 2.0, -0.95], [s * 0.22, 0.42, -1.1], 0.15, 0.085),
    ellipsoid([s * 0.23, 1.45, -1.02], [0.13, 0.4, 0.13]),
    ellipsoid([s * 0.22, 0.3, -1.3], [0.1, 0.1, 0.24]));
  // ── 옷: 교복 블라우스 + 무릎까지 오는 주름치마 ──
  const blouse = wrinkle(inter(offset(unionS(0.08, torso, arm(-1), arm(1)), 0.025), halfspace([0, 1, 0], 2.25)), 0.008, 7);
  const skirt = (x, y, z) => {
    // 엉덩이에서 무릎 쪽으로 덮어 내려가는 천: 허벅지 둘레를 감싸며 끝단이 무릎 앞에서 살짝 처짐
    const thigh = Math.min(leg(-1)(x, y, z), leg(1)(x, y, z));
    const hips = ellipsoid([0, 2.05, 0.1], [0.5, 0.36, 0.36])(x, y, z);
    const d = Math.min(hips, thigh - 0.07);
    const th = Math.atan2(y - 2.0, x);
    const pleat = 0.012 * Math.abs(((th / (Math.PI * 2)) * 18) % 1 - 0.5);
    return Math.max(d - pleat, z + 1.02, 1.72 - y, y - 2.5);
  };
  // ── 단발머리: 머리를 감싸고 귀 아래에서 잘림, 얼굴 앞은 비움, 앞머리 ──
  const hairOuter = bow(ellipsoid([0, 3.8, 0.06], [0.33, 0.4, 0.36]));
  const hair = bow(inter(
    sub(hairOuter, ellipsoid([0, 3.72, -0.12], [0.24, 0.3, 0.3])),  // 얼굴 자리 비움
    halfspace([0, 1, 0], 3.5),                                       // 단발 길이
    (x, y, z) => (z < -0.18 ? 3.93 - y : -1)));                      // 앞머리는 이마까지만
  // ── 펼친 책: 가운데가 접힌 두 쪽 ──
  const page = (s) => rotX(box([s * 0.33, 2.46, -0.86], [0.32, 0.035, 0.42], 0.01), [0, 2.46, -0.86], -0.55);
  const book = union(page(-1), page(1), roundCone([0, 2.43, -1.2], [0, 2.43, -0.52], 0.035, 0.035));

  const bronze = unionS(0.03, head, neck, torso, arm(-1), arm(1), leg(-1), leg(1), blouse, skirt, hair, book);
  const out = [];
  const add = (name, f, bmin, bmax, cell, look, budget = 9500) => {
    let c = cell, geo;
    for (let t = 0; t < 8; t++) { geo = mesh(f, bmin, bmax, c, { smooth: 2 }); if (geo.index.count / 3 <= budget) break; c *= 1.15; }
    out.push({ name, geo, ...look });
  };
  add('Bronze', bronze, [-0.9, 0.1, -1.7], [0.9, 4.35, 0.6], 0.03, { color: [150, 124, 84], material: 'Metal', reflectance: 0.18 });
  add('Rock', rockR, [-1.4, -0.1, -0.9], [1.4, 1.7, 1.2], 0.06, { color: [120, 116, 108], material: 'Slate' }, 4000);
  return out;
}
