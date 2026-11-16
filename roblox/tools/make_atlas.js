#!/usr/bin/env node
// 손글씨 글자 아틀라스 만들기
//   Roblox는 글꼴 파일을 직접 쓸 수 없어서, 분필·피·수첩 글씨를 글꼴로 그려 1024×1024 그림(아틀라스) 몇 장에 모은다.
//   게임은 SurfaceGui/ImageLabel 의 ImageRectOffset·ImageRectSize 로 그림의 한 칸씩 잘라 보여 준다.
//
//   글꼴 (roblox/fonts/ 에 직접 넣는다. 저장소에는 올리지 않음)
//     F1 그리운 경찰감성체   (무서운 분위기)        Griun_PolSensibility-Rg.ttf
//     F2 RF대충쓴준우체 v3   (제정신 아닌데 귀여움)  RF_Junwoo_v3.ttf
//     F3 히조이체 ExtraLight (평범한 손글씨)         HEEJOY-ExtraLight.ttf
//
//   결과: roblox/text_atlas/atlas_N.png, src/ReplicatedStorage/TextAtlas.lua, build/text_atlas.json
//   실행: node tools/make_atlas.js   (Playwright 필요)
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const FONT_DIR = path.join(ROOT, 'fonts');
const FONTS = { F1: 'Griun_PolSensibility-Rg.ttf', F2: 'RF_Junwoo_v3.ttf', F3: 'HEEJOY-ExtraLight.ttf' };

// 근무 수칙 수첩 (Config.RULES 와 같은 내용, 수첩 폭에 맞춰 줄바꿈). [글, 종류]
const NOTEBOOK = [
  [['야간 경비 근무 수칙', 'title'], ['', ''],
    ['1. 근무는 22:00 ~ 06:00.'], ['   06시 전엔 절대 정문을'], ['   열지 마세요.'],
    ['2. 매시 정각 전, 1·2·3층'], ['   순찰함에 체크하세요.'],
    ['3. 전화가 오면 받으세요.'], ['   단, 당신 이름을 부르면'], ['   끊으세요.'],
    ['4. 4층은 없습니다.']],
  [['5. 운동장에 의자가 있으면'], ['   쳐다보지 마세요.'],
    ['6. 시계탑이 거꾸로 가면'], ['   건물에 들어가지 마세요.'],
    ['7. 복도의 학생에게'], ['   말을 걸지 마세요.'], ['   학생들은 모두 하교했습니다.'],
    ['8. 동상이 자리에 없다면,'], ['   찾지 마세요.'], ['', ''],
    ['9. 경비원은 한 명입니다.', 'nine'], ['   경비실에 누가 앉아 있다면,', 'nine'], ['   당신은 누구입니까?', 'nine']],
];

// [키, 글, 글꼴, 모양, 글자 크기(px)]
const PHRASES = [
  // 칠판 분필 (평범한 손글씨)
  ['date', '11월 13일 (금)', 'F3', 'chalk', 92],
  ['duty1', '주번  김민지 · 이서준', 'F3', 'chalk', 80],
  ['duty2', '주번  박하은 · 최도윤', 'F3', 'chalk', 80],
  ['duty3', '주번  정수아 · 강지호', 'F3', 'chalk', 80],
  ['note1', '기말고사 D-18', 'F3', 'chalk', 92],
  ['note2', '수행평가 제출 (월)', 'F3', 'chalk', 84],
  ['note3', '청소 당번 1분단', 'F3', 'chalk', 88],
  ['note4', '떠들면 이름 적음', 'F3', 'chalk', 88],
  ['note5', '숙제 수학익힘 84쪽', 'F3', 'chalk', 84],
  ['self', '자습', 'F3', 'chalk', 110],
  // 이상현상: 무서운 글씨 (F1), 제정신 아닌 귀여운 글씨 (F2)
  ['dontlook', '뒤를 돌아보지 마', 'F1', 'chalk', 120],
  ['openme', '열어줘', 'F1', 'blood', 170],
  ['fourth', '4층은 없습니다', 'F1', 'blood', 130],
  ['godown', '내려가', 'F1', 'blood', 170],
  ['stay', '너도 남아', 'F2', 'blood', 150],
  ['whoareyou', '누구세요?', 'F2', 'blood', 150],
  ['playwithme', '같이 놀자♡', 'F2', 'blood', 120],
  // 급훈 액자 (먹 글씨)
  ['motto', '늦게까지 남지 말자', 'F3', 'brush', 120],
  ['mottoTitle', '급훈', 'F3', 'brush', 90],
];
NOTEBOOK.forEach((pg, pi) => pg.forEach(([t, kind], li) => {
  if (!t.trim()) return;
  const font = kind === 'nine' ? 'F2' : 'F3';
  const style = kind === 'nine' ? 'redink' : 'ink';
  PHRASES.push([`rule_${pi + 1}_${li + 1}`, t.trim(), font, style, kind === 'title' ? 76 : 62]);
}));

const SIZE = 1024, PAD = 6;

(async () => {
  for (const f of Object.values(FONTS)) if (!fs.existsSync(path.join(FONT_DIR, f))) { console.error('글꼴이 없습니다:', path.join(FONT_DIR, f)); process.exit(1); }
  const css = Object.entries(FONTS).map(([k, f]) => `@font-face{font-family:${k};src:url(data:font/ttf;base64,${fs.readFileSync(path.join(FONT_DIR, f)).toString('base64')})}`).join('');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<html><head><style>${css}</style></head><body>${Object.keys(FONTS).map((k) => `<span style="font-family:${k}">가나다 abc 123</span>`).join('')}</body></html>`);
  await page.evaluate(async () => { await document.fonts.ready; });
  const res = await page.evaluate(({ PHRASES, SIZE, PAD }) => {
    let seed = 1234567;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    // 1) 글마다 그림 그리기
    const items = PHRASES.map(([key, text, font, style, px]) => {
      const c = document.createElement('canvas');
      const g = c.getContext('2d');
      g.font = `${px}px ${font}`;
      const m = g.measureText(text);
      const asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
      const extraBelow = style === 'blood' ? Math.round(px * 0.75) : 0;
      const w = Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + px * 0.16 | 0;
      const h = asc + desc + Math.round(px * 0.16) + extraBelow;
      c.width = Math.min(SIZE - PAD * 2, w); c.height = h;
      const ox = Math.round(m.actualBoundingBoxLeft + px * 0.08), oy = asc + Math.round(px * 0.08);
      g.font = `${px}px ${font}`;
      g.textBaseline = 'alphabetic';
      const sx = Math.min(1, c.width / w);
      g.setTransform(sx, 0, 0, 1, 0, 0);
      if (style === 'chalk') {
        // 분필: 흰 글씨 + 가루처럼 흩어진 가장자리 + 군데군데 빈 곳
        g.fillStyle = 'rgba(240,240,232,0.92)'; g.fillText(text, ox, oy);
        if (font === 'F3') { g.strokeStyle = 'rgba(240,240,232,0.92)'; g.lineWidth = px * 0.045; g.lineJoin = 'round'; g.strokeText(text, ox, oy); }
        g.fillStyle = 'rgba(240,240,232,0.25)'; g.fillText(text, ox + 1.5, oy + 1);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.globalCompositeOperation = 'destination-out';
        for (let i = 0; i < c.width * c.height / 30; i++) { g.fillStyle = `rgba(0,0,0,${0.3 + rnd() * 0.7})`; g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 1.5); }
        for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(rnd() * c.width, rnd() * c.height, 2 + rnd() * 30, 1 + rnd() * 2); }
        g.globalCompositeOperation = 'source-over';
      } else if (style === 'blood') {
        // 피: 짙은 빨강 그라데이션 + 아래로 흘러내린 핏물 + 튄 방울
        const gr = g.createLinearGradient(0, 0, 0, oy + desc);
        gr.addColorStop(0, 'rgb(128,10,10)'); gr.addColorStop(1, 'rgb(84,4,4)');
        g.fillStyle = gr; g.fillText(text, ox, oy);
        g.setTransform(1, 0, 0, 1, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        const bottom = [];
        for (let x = 0; x < c.width; x++) { let b = -1; for (let y = oy + desc; y >= 0; y--) if (d[(y * c.width + x) * 4 + 3] > 160) { b = y; break; } bottom.push(b); }
        g.lineCap = 'round';
        for (let x = 4; x < c.width - 4; x += 5 + rnd() * 18) {
          const xi = x | 0, b = bottom[xi];
          if (b < 0 || rnd() < 0.35) continue;
          const len = (0.1 + rnd() * rnd() * 0.9) * extraBelow, wd = 2 + rnd() * px * 0.035;
          g.strokeStyle = 'rgb(92,6,6)'; g.lineWidth = wd;
          g.beginPath(); g.moveTo(xi, b - 2); g.lineTo(xi + (rnd() - 0.5) * 3, b + len); g.stroke();
          g.fillStyle = 'rgb(80,4,4)'; g.beginPath(); g.ellipse(xi, b + len, wd * 0.9, wd * 1.3, 0, 0, 7); g.fill();
        }
        for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${96 + rnd() * 30},6,6,${0.6 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * c.width, rnd() * (oy + desc), 1 + rnd() * rnd() * px * 0.05, 0, 7); g.fill(); }
      } else {
        g.fillStyle = style === 'ink' ? 'rgb(28,34,74)' : style === 'redink' ? 'rgb(170,14,14)' : 'rgb(20,18,16)';
        g.fillText(text, ox, oy);
        if (font === 'F3') { g.strokeStyle = g.fillStyle; g.lineWidth = px * (style === 'brush' ? 0.07 : 0.035); g.lineJoin = 'round'; g.strokeText(text, ox, oy); }
        if (style === 'brush') { g.fillText(text, ox + 1.2, oy); g.fillText(text, ox, oy + 1.2); }
      }
      return { key, text, font, style, c };
    });
    // 2) 아틀라스에 차곡차곡 (높은 것부터)
    const order = items.map((it, i) => i).sort((a, b) => items[b].c.height - items[a].c.height);
    const atlases = [];
    let A = null, x = 0, y = 0, rowH = 0;
    const newAtlas = () => { const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE; A = { c, g: c.getContext('2d') }; atlases.push(A); x = PAD; y = PAD; rowH = 0; };
    newAtlas();
    const out = {};
    order.forEach((i) => {
      const it = items[i], w = it.c.width, h = it.c.height;
      if (x + w + PAD > SIZE) { x = PAD; y += rowH + PAD; rowH = 0; }
      if (y + h + PAD > SIZE) newAtlas();
      A.g.drawImage(it.c, x, y);
      out[it.key] = { atlas: atlases.length, x, y, w, h, text: it.text, font: it.font, style: it.style };
      x += w + PAD; rowH = Math.max(rowH, h);
    });
    return { entries: out, pngs: atlases.map((a) => a.c.toDataURL('image/png')) };
  }, { PHRASES, SIZE, PAD });
  await browser.close();

  const outDir = path.join(ROOT, 'text_atlas');
  fs.mkdirSync(outDir, { recursive: true });
  fs.readdirSync(outDir).filter((f) => /^atlas_\d+\.png$/.test(f)).forEach((f) => fs.unlinkSync(path.join(outDir, f)));
  res.pngs.forEach((u, i) => fs.writeFileSync(path.join(outDir, `atlas_${i + 1}.png`), Buffer.from(u.split(',')[1], 'base64')));
  const notebook = NOTEBOOK.map((pg, pi) => pg.map(([t, kind], li) => ({ key: t.trim() ? `rule_${pi + 1}_${li + 1}` : '', kind: kind || 'ink', indent: (t.length - t.trimStart().length) * 0.24 })));
  fs.writeFileSync(path.join(ROOT, 'build', 'text_atlas.json'), JSON.stringify({ size: SIZE, count: res.pngs.length, entries: res.entries, notebook }));
  const q = (s) => JSON.stringify(s);
  const lua = `-- 자동 생성 (tools/make_atlas.js). 손글씨 글자 아틀라스의 칸 정보.\n`
    + `-- 그림 파일: roblox/text_atlas/atlas_N.png → Studio에서 올린 뒤 Config.TEXT_ATLAS_IDS[N] 에 이미지 ID를 넣는다.\n`
    + `local A = {}\nA.Size = ${SIZE}\nA.Count = ${res.pngs.length}\nA.Entries = {\n`
    + Object.entries(res.entries).map(([k, e]) => `\t[${q(k)}] = { atlas = ${e.atlas}, x = ${e.x}, y = ${e.y}, w = ${e.w}, h = ${e.h}, text = ${q(e.text)}, style = ${q(e.style)} },`).join('\n')
    + `\n}\nA.Notebook = {\n`
    + notebook.map((pg) => '\t{\n' + pg.map((l) => `\t\t{ key = ${q(l.key)}, kind = ${q(l.kind)}, indent = ${l.indent} },`).join('\n') + '\n\t},').join('\n')
    + `\n}\nreturn A\n`;
  fs.writeFileSync(path.join(ROOT, 'src', 'ReplicatedStorage', 'TextAtlas.lua'), lua);
  console.log('atlases', res.pngs.length, 'entries', Object.keys(res.entries).length);
})().catch((e) => { console.error(e); process.exit(1); });
