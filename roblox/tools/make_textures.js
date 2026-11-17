#!/usr/bin/env node
// 벽·바닥·천장에 붙일 실사풍 텍스처 만들기 (이음매 없이 반복되는 1024px PNG)
//   node make_textures.js  → roblox/textures/*.png + build/textures_sheet.png (한눈에 보기)
// Roblox 기본 재질(회반죽·벽돌)은 장난감처럼 보여서, 실제 표면처럼 보이는 그림을 직접 만들어 Texture 로 붙인다.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'textures');

// 브라우저 안에서 그리는 코드 (캔버스 픽셀을 직접 계산)
const PAGE = String.raw`
<canvas id="c" width="1024" height="1024"></canvas>
<script>
const N = 1024;
// ── 반복되는(타일링) 값 노이즈 ──
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lattice(period, seed) { const r = rng(seed), g = new Float32Array(period * period); for (let i = 0; i < g.length; i++) g[i] = r(); return g; }
function vnoise(x, y, period, g) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf);
  const at = (a, b) => g[(((b % period) + period) % period) * period + (((a % period) + period) % period)];
  const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// 여러 겹 노이즈 (0~1), base 주기 = 1024 픽셀에 들어가는 칸 수
function makeFbm(base, oct, seed) {
  const L = []; for (let o = 0; o < oct; o++) L.push(lattice(base << o, seed + o * 101));
  return (px, py) => { let v = 0, amp = 0.5, tot = 0; for (let o = 0; o < oct; o++) { const p = base << o; v += amp * vnoise(px / N * p, py / N * p, p, L[o]); tot += amp; amp *= 0.5; } return v / tot; };
}
function put(fn) {
  const c = document.getElementById('c'), x = c.getContext('2d'), im = x.createImageData(N, N), d = im.data;
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const [r, g, b] = fn(px, py), i = (py * N + px) * 4;
    d[i] = Math.max(0, Math.min(255, r)); d[i + 1] = Math.max(0, Math.min(255, g)); d[i + 2] = Math.max(0, Math.min(255, b)); d[i + 3] = 255;
  }
  x.putImageData(im, 0, 0);
  return c.toDataURL('image/png');
}
const T = {};
// 1) 페인트 칠한 콘크리트 벽: 아주 옅은 얼룩 + 롤러 자국 + 미세한 알갱이 (거의 평평한 미색)
T.paint = () => { const lo = makeFbm(4, 4, 11), mid = makeFbm(24, 3, 21), grain = makeFbm(256, 2, 31), roll = makeFbm(6, 3, 41);
  return put((x, y) => { const base = [228, 225, 216];
    const v = (lo(x, y) - 0.5) * 9 + (mid(x, y) - 0.5) * 5 + (grain(x, y) - 0.5) * 7 + (roll(x * 0.25, y * 4 % N) - 0.5) * 3;
    return [base[0] + v, base[1] + v, base[2] + v * 1.1]; }); };
// 2) 아랫벽: 회색 유광 페인트, 아주 고르고 붓 자국만 살짝
T.lower = () => { const lo = makeFbm(4, 3, 12), grain = makeFbm(192, 2, 32), brush = makeFbm(8, 3, 52);
  return put((x, y) => { const v = (lo(x, y) - 0.5) * 7 + (grain(x, y) - 0.5) * 4 + (brush(x * 8 % N, y * 0.3) - 0.5) * 3;
    return [176 + v, 178 + v, 180 + v]; }); };
// 3) 붉은 벽돌 (길이쌓기): 한 장마다 색이 조금씩 다르고 모서리가 살짝 어두움, 줄눈은 회색 모르타르
T.brick = () => { const cols = 4, rows = 16, bw = N / cols, bh = N / rows, mortar = 7;
  const r = rng(7), tint = []; for (let i = 0; i < cols * rows * 2; i++) tint.push([r() * 26 - 13, r() * 14 - 7, r() * 10 - 5, r()]);
  const speck = makeFbm(160, 2, 61), mm = makeFbm(64, 2, 71), soot = makeFbm(6, 3, 81);
  return put((x, y) => { const row = Math.floor(y / bh), off = row % 2 ? bw / 2 : 0, xx = (x + off) % N, col = Math.floor(xx / bw);
    const lx = xx - col * bw, ly = y - row * bh;
    if (lx < mortar || ly < mortar) { const m = 168 + (mm(x, y) - 0.5) * 30; return [m, m - 4, m - 10]; }
    const t = tint[row * cols + col], edge = Math.min(lx - mortar, bw - lx, ly - mortar, bh - ly), e = edge < 6 ? (6 - edge) * 3 : 0;
    const s = (speck(x, y) - 0.5) * 34, so = (soot(x, y) - 0.5) * 18, burnt = t[3] < 0.12 ? -28 : 0;
    return [150 + t[0] + s + so + burnt - e, 72 + t[1] + s * 0.5 + so * 0.6 + burnt * 0.6 - e, 54 + t[2] + s * 0.4 + so * 0.5 + burnt * 0.5 - e]; }); };
// 4) 복도 바닥: 연마한 회색 인조석(테라조) 타일 4장, 작은 돌 알갱이 + 타일 줄눈 + 반짝임 얼룩
T.floor = () => { const n = 2, tw = N / n, chip = makeFbm(128, 2, 91), chip2 = makeFbm(300, 1, 92), lo = makeFbm(4, 3, 93), tile = rng(94), tv = [tile() * 8 - 4, tile() * 8 - 4, tile() * 8 - 4, tile() * 8 - 4];
  return put((x, y) => { const tx = Math.floor(x / tw), ty = Math.floor(y / tw), lx = x % tw, ly = y % tw;
    if (lx < 3 || ly < 3) return [112, 112, 110];
    let v = 150 + tv[ty * n + tx] + (lo(x, y) - 0.5) * 14;
    const c1 = chip(x, y), c2 = chip2(x, y);
    if (c1 > 0.66) v -= 38; else if (c1 < 0.3) v += 22;
    if (c2 > 0.7) v += 30;
    return [v, v + 1, v + 3]; }); };
// 5) 교실 마루: 좁은 참나무 판 (판마다 결·색이 다름), 판 끝 이음
T.wood = () => { const planks = 8, pw = N / planks, r = rng(101), pv = []; for (let i = 0; i < planks * 4; i++) pv.push([r() * 24 - 12, r() * N]);
  const grain = makeFbm(8, 4, 102), fine = makeFbm(64, 2, 103);
  return put((x, y) => { const p = Math.floor(x / pw), lx = x - p * pw, seg = Math.floor(((y + pv[p][1]) % N) / (N / 2)), ly = (y + pv[p][1]) % (N / 2);
    if (lx < 2 || ly < 2) return [70, 46, 28];
    const t = pv[p * 2 + seg] || pv[p], g = grain(x * 0.15 + p * 97, y * 2.2 % N), ring = Math.sin((g * 30 + lx * 0.05) * Math.PI) * 6;
    const v = t[0] + ring + (fine(x, y) - 0.5) * 10;
    return [176 + v, 128 + v * 0.8, 82 + v * 0.6]; }); };
// 6) 천장 텍스: 흰 흡음 텍스 2×2장 + 가는 회색 T바 + 작은 구멍 무늬
T.ceiling = () => { const n = 2, tw = N / n, hole = rng(111), holes = new Uint8Array(N * N);
  for (let i = 0; i < 9000; i++) { const hx = Math.floor(hole() * N), hy = Math.floor(hole() * N), rr = hole() < 0.7 ? 1 : 2; for (let a = -rr; a <= rr; a++) for (let b = -rr; b <= rr; b++) holes[((hy + b + N) % N) * N + ((hx + a + N) % N)] = 1; }
  const lo = makeFbm(4, 3, 112);
  return put((x, y) => { const lx = x % tw, ly = y % tw;
    if (lx < 6 || ly < 6) return [206, 206, 204];
    let v = 238 + (lo(x, y) - 0.5) * 6;
    if (holes[y * N + x]) v -= 70;
    return [v, v, v - 2]; }); };
// 7) 바깥 콘크리트 (흰 띠·차양): 거푸집 자국 + 빗물 얼룩
T.concrete = () => { const lo = makeFbm(4, 4, 121), mid = makeFbm(32, 3, 122), pores = makeFbm(320, 1, 123), streak = makeFbm(32, 3, 124);
  return put((x, y) => { let v = 214 + (lo(x, y) - 0.5) * 22 + (mid(x, y) - 0.5) * 10 + (pores(x, y) > 0.72 ? -24 : 0) - Math.max(0, streak(x, y * 0.08) - 0.55) * 60;
    return [v, v - 1, v - 4]; }); };
window.T = T; window.READY = true;
</script>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(PAGE);
  await page.waitForFunction(() => window.READY === true);
  const names = ['paint', 'lower', 'brick', 'floor', 'wood', 'ceiling', 'concrete'];
  for (const n of names) {
    const url = await page.evaluate((k) => window.T[k](), n);
    fs.writeFileSync(path.join(OUT, `${n}.png`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('wrote', n);
  }
  // 한눈에 보기: 각 텍스처를 2×2로 이어 붙여 이음매가 없는지 확인
  const sheet = await page.evaluate(async (list) => {
    const c = document.createElement('canvas'); c.width = 512 * list.length; c.height = 512; const x = c.getContext('2d');
    for (let i = 0; i < list.length; i++) {
      const img = new Image(); img.src = list[i]; await img.decode();
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) x.drawImage(img, i * 512 + a * 256, b * 256, 256, 256);
    }
    return c.toDataURL('image/png');
  }, names.map((n) => 'data:image/png;base64,' + fs.readFileSync(path.join(OUT, `${n}.png`)).toString('base64')));
  fs.writeFileSync(path.join(ROOT, 'build', 'textures_sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
