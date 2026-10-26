// 송천동 숲 연못 낚시를 마이세카이로 옮긴 것 (넓은 연못 둘러보기 · 멀리 던질수록 깊은 물 · 상어 주의)
let CTX = {}, ov = null, AC = null;
const soundOn = true;
const ac = () => { try { return AC || (AC = new (window.AudioContext || window.webkitAudioContext)()); } catch (e) { return null; } };
function tone(f, d, type = 'sine', v = .08, delay = 0, f2 = 0) { if (!soundOn) return; const a = ac(); if (!a) return; const t = a.currentTime + delay, o = a.createOscillator(), gn = a.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); gn.gain.setValueAtTime(.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + .012); gn.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(gn).connect(a.destination); o.start(t); o.stop(t + d + .05); }
function noise(d, v, f = 1200, type = 'lowpass', delay = 0) { if (!soundOn) return; const a = ac(); if (!a) return; const n = Math.floor(a.sampleRate * d), b = a.createBuffer(1, n, a.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = a.createBufferSource(), fl = a.createBiquadFilter(), gn = a.createGain(); s.buffer = b; fl.type = type; fl.frequency.value = f; gn.gain.value = v; s.connect(fl).connect(gn).connect(a.destination); s.start(a.currentTime + delay); }
const E = { ac, tone, noise, toast: s => CTX.toast && CTX.toast(s), get preset() { return CTX.preset ? CTX.preset() : 'day'; } };
const SFX = { ding() { [880, 1320].forEach((f, i) => tone(f, .2, 'sine', .06, i * .08)); }, sparkle() { [1568, 2093, 2637].forEach((f, i) => tone(f, .25, 'sine', .035, i * .06)); }, pop() { tone(520, .08, 'triangle', .07); } };
const snd = { splash() { noise(.25, .35, 1400, 'bandpass'); tone(300, .12, 'sine', .04, 0, 120); }, plop() { tone(520, .12, 'sine', .06, 0, 180); noise(.08, .15, 2200, 'bandpass'); }, reel() { noise(.03, .12, 3200, 'highpass'); } };
const LSF = { get(k, d) { try { const v = localStorage.getItem('psi.mysekai.fish.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('psi.mysekai.fish.' + k, JSON.stringify(v)); } catch (e) { } } };
const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const gl = (g, x, y, r, col, a) => { if (a <= 0 || r <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, css(hx(col), a)); gr.addColorStop(1, css(hx(col), 0)); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill(); };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), rnd = (a, b) => a + (b - a) * Math.random(), pick = a => a[Math.floor(Math.random() * a.length)];
const $q = (r, s) => r.querySelector(s);
function rr2(g, a, b, w, h, r) { g.beginPath(); g.moveTo(a + r, b); g.arcTo(a + w, b, a + w, b + h, r); g.arcTo(a + w, b + h, a, b + h, r); g.arcTo(a, b + h, a, b, r); g.arcTo(a, b, a + w, b, r); g.closePath(); }
function overlay(cls) {
  const d = document.createElement('div'); d.className = 'fz-ov ' + (cls || '');
  d.innerHTML = '<canvas></canvas><button type="button" class="fz-x" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button><p class="fz-hint"></p>';
  document.body.append(d); return d;
}
function fitCanvas(c) { const D = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight; c.width = w * D; c.height = h * D; c.style.width = w + 'px'; c.style.height = h + 'px'; return [w, h, D]; }
const FISH = [
  { name: '반딧불송사리', r: 1, w: 30, cm: [4, 9], c1: '#cfe878', c2: '#6aa848', glow: '#eaff9a', h: .36, tail: 'fan', pat: 'dots', night: 2, desc: '배에서 작은 불빛이 깜빡여요. 밤 연못에 많아요.' },
  { name: '이끼붕어', r: 1, w: 30, cm: [12, 24], c1: '#9ab86a', c2: '#4a6a3a', h: .5, tail: 'fork', pat: 'scales', extra: 'moss', desc: '등에 이끼가 자라는 느긋한 붕어. 숲 연못의 터줏대감이에요.' },
  { name: '꽃잎베타', r: 1, w: 24, cm: [5, 10], c1: '#ffb0c8', c2: '#e05a8a', h: .4, tail: 'long', pat: 'none', desc: '지느러미가 꽃잎처럼 하늘거려요.' },
  { name: '유리비늘피라미', r: 2, w: 14, cm: [8, 14], c1: '#d8f6ff', c2: '#8ad0e8', h: .32, tail: 'fork', pat: 'bones', glass: 1, desc: '몸이 투명해서 뼈가 비쳐 보여요. 햇빛을 받으면 무지갯빛.' },
  { name: '버섯메기', r: 2, w: 14, cm: [20, 40], c1: '#a07a5a', c2: '#5a3e2a', h: .38, tail: 'round', pat: 'spots', extra: 'shroom', desc: '머리에 버섯이 자라는 메기. 비 온 다음 날 잘 잡혀요.' },
  { name: '별꼬리금붕어', r: 2, w: 14, cm: [6, 12], c1: '#ffc06a', c2: '#ff7a3a', glow: '#fff0b0', h: .55, tail: 'star', pat: 'none', desc: '꼬리 끝이 별 모양으로 반짝여요.' },
  { name: '잎사귀가오리', r: 2, w: 12, cm: [18, 30], c1: '#a8d870', c2: '#4a8a3a', h: 1, shape: 'ray', desc: '물에 뜬 나뭇잎인 줄 알았는데 헤엄쳐 갔어요.' },
  { name: '노을잉어', r: 3, w: 5, cm: [30, 55], c1: '#ffb070', c2: '#9a5ab8', glow: '#ffc890', h: .45, tail: 'fork', pat: 'scales', dusk: 6, desc: '노을 질 때만 물 위로 올라와요. 비늘이 하늘색을 닮아요.' },
  { name: '달빛잉어', r: 3, w: 4, cm: [35, 60], c1: '#e8f0ff', c2: '#8aa0d8', glow: '#cfe0ff', h: .45, tail: 'fork', pat: 'moon', night: 5, desc: '밤에만 나타나는 은빛 잉어. 이마에 초승달 무늬가 있어요.' },
  { name: '등불아귀', r: 3, w: 4, cm: [15, 28], c1: '#3a3a5a', c2: '#1a1a2a', glow: '#ffd27a', h: .6, tail: 'round', pat: 'none', extra: 'lantern', night: 3, dusk: 2, desc: '머리 위 등불로 길 잃은 반딧불을 불러 모아요.' },
  { name: '수정해파리', r: 3, w: 4, cm: [10, 20], c1: '#e8d8ff', c2: '#a88ae8', glow: '#e0d0ff', shape: 'jelly', glass: 1, desc: '물고기는 아니지만 낚싯대에 걸렸어요. 말랑말랑.' },
  { name: '결재서류붕어', r: 3, w: 4, cm: [21, 30], c1: '#faf6ec', c2: '#d8d0c0', h: .55, tail: 'fork', pat: 'doc', extra: 'stamp', desc: '송천동에서 떠내려온 듯해요. 옆구리에 ‘반려’ 도장이 찍혀 있어요.' },
  { name: '무지개뱀장어', r: 4, w: 1.6, cm: [60, 120], c1: '#ff7a7a', c2: '#7a7aff', shape: 'eel', glow: '#ffffff', desc: '움직일 때마다 색이 바뀌어요. 아주 드물어요.' },
  { name: '구름고래 새끼', r: 4, w: 1.4, cm: [80, 140], c1: '#ffffff', c2: '#c8dcf0', shape: 'whale', desc: '하늘 연못에서 떨어진 걸까요? 숨 쉴 때마다 작은 구름이 나와요.' },
  { name: '이끼상어', r: 5, w: .9, cm: [90, 180], c1: '#6a8a6a', c2: '#3a5a3a', shape: 'shark', deep: 1, desc: '연못 가장 깊은 곳의 주인. 등에 이끼가 자라 있어요. 보통은 사람이 아니라 물고기를 노려요… 보통은.' },
  { name: '하늘물고기', r: 5, w: .5, cm: [40, 70], c1: '#d8fff8', c2: '#7ae0d0', glow: '#9ff0e6', h: .42, tail: 'long', pat: 'none', sky: 1, desc: '송천동 하늘을 헤엄치던 바로 그 물고기! 여기 와 있었네요.' }
].map((f, i) => Object.assign(f, { i }));
const RAR = ['', '흔함', '조금 드묾', '드묾', '아주 드묾', '전설'];
function rollFish(any) {
  const pr = E.preset; let tot = 0; const ws = FISH.map(f => { let w = f.w; if (f.night && pr === 'night') w *= f.night; if (f.dusk && pr === 'dusk') w *= f.dusk; if (f.night && pr === 'day' && !f.dusk && f.r >= 3) w *= .25; if (any && f.r >= 4) w *= .2; if (f.deep) w = 0; tot += w; return w; });
  let r = Math.random() * tot; for (let i = 0; i < FISH.length; i++) { r -= ws[i]; if (r <= 0) return FISH[i]; } return FISH[0];
}
function drawFish(g, f, x, y, L, t) {
  g.save(); g.translate(x, y);
  const c1 = f.c1, c2 = f.c2, A = f.glass ? .55 : 1;
  if (f.glow) gl(g, 0, 0, L * 1.1, f.glow, .35);
  if (f.shape === 'shark') { g.restore(); g.save(); g.translate(x, y); drawShark(g, 0, 0, L * 1.1, 0, t, c1); g.fillStyle = '#7aae5a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-L * .2 + i * L * .08, -L * .19 + Math.abs(i - 2.5) * L * .012, L * .05, L * .02, 0, 0, 6.3); g.fill(); } g.restore(); return; }
  if (f.shape === 'ray') {
    g.fillStyle = c1; g.beginPath(); g.moveTo(L * .55, 0); g.quadraticCurveTo(0, -L * .55, -L * .4, 0); g.quadraticCurveTo(0, L * .55, L * .55, 0); g.fill();
    g.strokeStyle = c2; g.lineWidth = Math.max(1, L * .03); g.beginPath(); g.moveTo(L * .5, 0); g.lineTo(-L * .7, Math.sin(t * 3) * L * .06); g.stroke(); for (let k = -3; k <= 3; k++) { if (!k) continue; g.beginPath(); g.moveTo(L * (.3 - Math.abs(k) * .05), 0); g.lineTo(L * (.05 - Math.abs(k) * .04), k * L * .1); g.stroke(); }
    g.fillStyle = '#1a2a14'; g.beginPath(); g.arc(L * .32, -L * .08, L * .03, 0, 6.3); g.arc(L * .32, L * .08, L * .03, 0, 6.3); g.fill(); g.restore(); return;
  }
  if (f.shape === 'jelly') {
    g.globalAlpha = .8; const gr = g.createRadialGradient(0, -L * .1, 0, 0, -L * .1, L * .45); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, c2); g.fillStyle = gr; g.beginPath(); g.ellipse(0, -L * .1, L * .42, L * .32, 0, Math.PI, 0); g.quadraticCurveTo(0, L * .02, -L * .42, -L * .1); g.fill();
    g.strokeStyle = c1; g.lineWidth = Math.max(1, L * .025); for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(k * L * .1, -L * .06); g.bezierCurveTo(k * L * .1 + Math.sin(t * 3 + k) * L * .08, L * .15, k * L * .12 - Math.sin(t * 3 + k) * L * .08, L * .3, k * L * .1, L * .45); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = '#4a3a6a'; g.beginPath(); g.arc(-L * .1, -L * .15, L * .025, 0, 6.3); g.arc(L * .1, -L * .15, L * .025, 0, 6.3); g.fill(); g.restore(); return;
  }
  if (f.shape === 'eel') {
    g.lineCap = 'round'; const N = 18; for (let i = N; i >= 0; i--) { const k = i / N, px = L * (.5 - k), py = Math.sin(k * 6 - t * 4) * L * .08; g.fillStyle = `hsl(${(k * 300 + t * 60) % 360},85%,70%)`; g.beginPath(); g.arc(px, py, L * .07 * (1 - k * .6), 0, 6.3); g.fill(); }
    g.fillStyle = '#1a1420'; g.beginPath(); g.arc(L * .52, -L * .02, L * .018, 0, 6.3); g.fill(); g.restore(); return;
  }
  if (f.shape === 'whale') {
    g.fillStyle = c1; g.beginPath(); g.ellipse(0, 0, L * .45, L * .26, 0, 0, 6.3); g.fill(); g.fillStyle = c2; g.beginPath(); g.ellipse(-L * .05, L * .1, L * .36, L * .13, 0, 0, Math.PI); g.fill();
    g.fillStyle = c1; g.beginPath(); g.moveTo(-L * .4, 0); g.quadraticCurveTo(-L * .62, -L * .2 + Math.sin(t * 2) * L * .04, -L * .66, -L * .06); g.quadraticCurveTo(-L * .62, L * .2, -L * .4, L * .04); g.fill();
    g.fillStyle = '#2a3a5a'; g.beginPath(); g.arc(L * .24, -L * .04, L * .03, 0, 6.3); g.fill(); g.fillStyle = 'rgba(255,160,180,.5)'; g.beginPath(); g.arc(L * .28, L * .05, L * .04, 0, 6.3); g.fill();
    for (let i = 0; i < 3; i++) { const k = (t * .6 + i / 3) % 1; g.fillStyle = `rgba(255,255,255,${.8 * (1 - k)})`; g.beginPath(); g.arc(L * .1 + Math.sin(k * 6) * L * .05, -L * .3 - k * L * .4, L * (.04 + k * .08), 0, 6.3); g.fill(); }
    g.restore(); return;
  }
  const h = (f.h || .45) * L;
  // 꼬리
  g.globalAlpha = A; g.fillStyle = c2; const tw = Math.sin(t * 6) * L * .04; g.beginPath();
  if (f.tail === 'long') { g.moveTo(-L * .35, 0); g.bezierCurveTo(-L * .7, -h * 1.1 + tw, -L * .95, -h * .2, -L * .9, tw); g.bezierCurveTo(-L * .95, h * .2, -L * .7, h * 1.1 + tw, -L * .35, 0); }
  else if (f.tail === 'fan' || f.tail === 'round') { g.moveTo(-L * .35, 0); g.quadraticCurveTo(-L * .7, -h * .7 + tw, -L * .66, tw); g.quadraticCurveTo(-L * .7, h * .7 + tw, -L * .35, 0); }
  else { g.moveTo(-L * .35, 0); g.lineTo(-L * .62, -h * .55 + tw); g.lineTo(-L * .5, tw); g.lineTo(-L * .62, h * .55 + tw); g.closePath(); }
  g.fill();
  if (f.tail === 'star') { g.fillStyle = '#fff0b0'; for (const sy of [-1, 1]) { g.save(); g.translate(-L * .62, sy * h * .5 + tw); g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? L * .025 : L * .06, a = k / 10 * 6.283; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); } gl(g, -L * .62, tw, L * .25, '#fff0b0', .5); }
  // 지느러미
  g.fillStyle = c2; g.beginPath(); g.moveTo(-L * .05, -h * .45); g.quadraticCurveTo(-L * .12, -h * .95, -L * .28, -h * .35); g.fill(); g.beginPath(); g.moveTo(L * .05, h * .4); g.quadraticCurveTo(-L * .02, h * .8, -L * .15, h * .35); g.fill();
  // 몸
  const gr = g.createLinearGradient(0, -h / 2, 0, h / 2); gr.addColorStop(0, c2); gr.addColorStop(.45, c1); gr.addColorStop(1, mixHex(c1, '#ffffff', .4)); g.fillStyle = gr;
  g.beginPath(); g.moveTo(L * .5, 0); g.bezierCurveTo(L * .38, -h * .62, -L * .2, -h * .62, -L * .38, 0); g.bezierCurveTo(-L * .2, h * .62, L * .38, h * .62, L * .5, 0); g.fill();
  g.save(); g.clip();
  if (f.pat === 'scales') { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(.6, L * .012); for (let i = -4; i < 6; i++) for (let j = -2; j <= 2; j++) { g.beginPath(); g.arc(i * L * .08 + (j % 2) * L * .04, j * h * .22, L * .05, -1.2, 1.2); g.stroke(); } }
  if (f.pat === 'dots') { for (let i = 0; i < 6; i++) { const a = .5 + .5 * Math.sin(t * 4 + i * 2); g.fillStyle = `rgba(240,255,160,${.5 + a * .5})`; g.beginPath(); g.arc(-L * .2 + i * L * .09, h * .18, L * .025, 0, 6.3); g.fill(); } }
  if (f.pat === 'spots') { g.fillStyle = 'rgba(60,40,24,.5)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(-L * .25 + (i * 37 % 60) / 60 * L * .6, ((i * 53 % 40) / 40 - .5) * h * .6, L * .03, 0, 6.3); g.fill(); } }
  if (f.pat === 'bones') { g.strokeStyle = 'rgba(80,120,150,.6)'; g.lineWidth = Math.max(.6, L * .012); g.beginPath(); g.moveTo(L * .35, 0); g.lineTo(-L * .35, 0); for (let i = -5; i <= 6; i++) { g.moveTo(i * L * .05, 0); g.lineTo(i * L * .05 - L * .03, -h * .3); g.moveTo(i * L * .05, 0); g.lineTo(i * L * .05 - L * .03, h * .3); } g.stroke(); }
  if (f.pat === 'doc') { g.strokeStyle = 'rgba(90,90,110,.5)'; g.lineWidth = Math.max(.6, L * .012); for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(-L * .25, i * h * .14); g.lineTo(L * .25, i * h * .14); g.stroke(); } }
  if (f.pat === 'moon') { g.fillStyle = '#fff8d8'; g.beginPath(); g.arc(L * .28, -h * .18, L * .06, 0, 6.3); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(L * .31, -h * .21, L * .055, 0, 6.3); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(L * .1, -h * .25, L * .22, h * .1, -.1, 0, 6.3); g.fill();
  g.restore(); g.globalAlpha = 1;
  if (f.extra === 'stamp') { g.strokeStyle = '#d23a3a'; g.lineWidth = Math.max(1, L * .02); g.beginPath(); g.arc(-L * .02, h * .05, L * .1, 0, 6.3); g.stroke(); if (L > 50) { g.fillStyle = '#d23a3a'; g.font = `800 ${L * .07}px "Noto Sans KR",sans-serif`; g.textAlign = 'center'; g.fillText('반려', -L * .02, h * .05 + L * .025); g.textAlign = 'left'; } }
  if (f.extra === 'moss') { g.fillStyle = '#6aa84a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(-L * .15 + i * L * .07, -h * .48 + Math.sin(i) * 2, L * .05, L * .025, 0, 0, 6.3); g.fill(); } }
  if (f.extra === 'shroom') { g.fillStyle = '#efe3c4'; g.fillRect(L * .24, -h * .7, L * .04, h * .3); g.fillStyle = '#e88a5a'; g.beginPath(); g.ellipse(L * .26, -h * .7, L * .11, L * .06, 0, Math.PI, 0); g.fill(); g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(L * .23, -h * .74, L * .015, 0, 6.3); g.fill(); g.strokeStyle = c2; g.lineWidth = Math.max(.8, L * .012); g.beginPath(); g.moveTo(L * .48, h * .05); g.quadraticCurveTo(L * .62, h * .25, L * .58, h * .4); g.moveTo(L * .48, h * .08); g.quadraticCurveTo(L * .56, h * .35, L * .5, h * .5); g.stroke(); }
  if (f.extra === 'lantern') { g.strokeStyle = c2; g.lineWidth = Math.max(1, L * .02); g.beginPath(); g.moveTo(L * .3, -h * .4); g.quadraticCurveTo(L * .55, -h * 1.1, L * .7, -h * .7); g.stroke(); const k = .7 + .3 * Math.sin(t * 5); gl(g, L * .7, -h * .7, L * .3, '#ffd27a', .7 * k); g.fillStyle = '#fff2b8'; g.beginPath(); g.arc(L * .7, -h * .7, L * .045, 0, 6.3); g.fill(); g.fillStyle = '#fff'; for (let k2 = 0; k2 < 4; k2++) { g.beginPath(); g.moveTo(L * (.36 + k2 * .03), h * .1); g.lineTo(L * (.37 + k2 * .03), h * .2); g.lineTo(L * (.38 + k2 * .03), h * .1); g.fill(); } }
  if (f.sky) for (let i = 1; i < 8; i++) gl(g, -L * (.5 + i * .1), Math.sin(t * 3 + i) * L * .05, L * .04, '#c8fff4', .6 - i * .06);
  // 눈
  g.fillStyle = '#ffffff'; g.beginPath(); g.arc(L * .32, -h * .08, Math.max(1.4, L * .045), 0, 6.3); g.fill(); g.fillStyle = '#1a1420'; g.beginPath(); g.arc(L * .335, -h * .08, Math.max(.9, L * .028), 0, 6.3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(L * .345, -h * .1, Math.max(.4, L * .01), 0, 6.3); g.fill();
  g.restore();
}
function mixHex(a, b, k) { return css(mix(hx(a), hx(b), k)); }

/* ---------- 가방 (잡은 물고기 · 수확한 작물 · 요리) ---------- */
function silhouette(f, w, h, L) {
  const o = document.createElement('canvas'); o.width = w; o.height = h; const x = o.getContext('2d'); x.translate(w / 2, h / 2); drawFish(x, Object.assign({}, f, { glow: null }), 0, 0, L, 1);
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgba(52,58,70,.55)'; x.fillRect(0, 0, w, h); return o;
}
function fishBook(host, onClose) {
  const book = LSF.get('book', {}), v = document.createElement('div'); v.className = 'fz-bookv'; host.append(v);
  const n = FISH.filter(f => book[f.i]).length;
  v.innerHTML = `<div class="hd"><b>숲 연못 도감</b><span>${n} / ${FISH.length}</span><button type="button" data-x aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="gr">${FISH.map(f => { const b = book[f.i]; return `<button type="button" class="it${b ? '' : ' no'}" data-i="${f.i}"><canvas width="160" height="90"></canvas><b>${b ? f.name : '???'}</b><small>${b ? `${RAR[f.r]} · ${b.n}마리` : RAR[f.r] + (f.night ? ' · 밤에 자주' : f.dusk ? ' · 노을에 자주' : f.deep ? ' · 깊은 물' : '')}</small><em class="pc">지금 ${pctS(nowPct(f.i))}</em></button>`; }).join('')}</div>`;
  v.querySelectorAll('.it').forEach(it => { const f = FISH[+it.dataset.i], cv = $q(it, 'canvas'), x = cv.getContext('2d'); const L = f.shape === 'eel' ? 120 : 92;
    if (book[f.i]) { x.translate(80, 45); drawFish(x, f, 0, 0, L, 1); }
    else if (f.r <= 2) x.drawImage(silhouette(f, 160, 90, L), 0, 0);
    else { x.fillStyle = 'rgba(52,58,70,.35)'; x.font = '800 44px "Noto Sans KR",sans-serif'; x.textAlign = 'center'; x.fillText('?', 80, 62); }
    it.onclick = () => { if (!book[f.i]) { E.toast((f.r >= 3 ? '아직 만나지 못한 물고기예요. 힌트: ' + (f.night ? '밤' : f.dusk ? '노을' : f.deep ? '아주 깊은 물' : '숲 연못 어딘가') : '아직 잡지 못했어요.') + ' · 지금 잡힐 확률 ' + pctS(nowPct(f.i))); return; } fishDetail(v, f, book[f.i]); }; });
  $q(v, '[data-x]').onclick = () => { v.remove(); onClose && onClose(); };
  return v;
}
function fishDetail(host, f, b) {
  const m = document.createElement('div'); m.className = 'fz-detail'; host.append(m);
  m.innerHTML = `<div class="in"><canvas width="420" height="230"></canvas><b>${f.name}</b><span class="rar r${f.r}">${RAR[f.r]}</span><p>${f.desc}</p><dl><div><dt>잡은 수</dt><dd>${b.n}마리</dd></div><div><dt>가장 큰 기록</dt><dd>${b.best}cm</dd></div><div><dt>처음 잡은 날</dt><dd>${b.first ? new Date(b.first).toLocaleDateString('ko-KR') : '-'}</dd></div><div><dt>잘 나오는 때</dt><dd>${f.night ? '밤' : f.dusk ? '노을' : '언제나'}${f.deep ? ' · 깊은 물' : ''}</dd></div></dl><h4>잡힐 확률 <small>(물고기가 물었을 때)</small></h4><table class="pct"><tr><th></th>${PCT_D.map(([n]) => `<th>${n}</th>`).join('')}</tr>${PCT_T.map(([k, n]) => `<tr class="${k === E.preset ? 'on' : ''}"><th>${n}${k === E.preset ? ' · 지금' : ''}</th>${PCT_D.map(([, d]) => `<td>${pctS(fishPct(f.i, k, d))}</td>`).join('')}</tr>`).join('')}</table><button type="button">닫기</button></div>`;
  const cv = $q(m, 'canvas'), x = cv.getContext('2d'); let t0 = 0;
  const anim = () => { if (!m.isConnected) return; t0 += 1 / 60; x.clearRect(0, 0, 420, 230); const gr = x.createRadialGradient(210, 115, 10, 210, 115, 200); gr.addColorStop(0, f.r >= 3 ? 'rgba(255,238,190,.95)' : 'rgba(226,244,220,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 420, 230); x.save(); x.translate(f.shape ? 210 : 230, 115 + Math.sin(t0 * 2) * 5); x.rotate(Math.sin(t0 * 1.2) * .07); drawFish(x, f, 0, 0, f.shape === 'eel' ? 280 : 190, t0); x.restore(); requestAnimationFrame(anim); };
  anim(); $q(m, 'button').onclick = () => m.remove(); m.addEventListener('click', e => { if (e.target === m) m.remove(); });
}

/* ---------- 상어 그리기 ---------- */
function drawShark(g, x, y, L, open, t, col = '#5a6a7a') {
  g.save(); g.translate(x, y);
  g.fillStyle = col; g.beginPath(); g.moveTo(L * .55, 0); g.bezierCurveTo(L * .4, -L * .2, -L * .2, -L * .2, -L * .45, -L * .02); g.lineTo(-L * .7, -L * .22 + Math.sin(t * 8) * L * .03); g.lineTo(-L * .6, 0); g.lineTo(-L * .7, L * .18 + Math.sin(t * 8) * L * .03); g.lineTo(-L * .45, L * .04); g.bezierCurveTo(-L * .2, L * .16, L * .4, L * .16, L * .55, 0); g.fill();
  g.beginPath(); g.moveTo(L * .02, -L * .14); g.lineTo(-L * .12, -L * .38); g.lineTo(-L * .16, -L * .13); g.fill();
  g.beginPath(); g.moveTo(L * .1, L * .1); g.lineTo(-L * .04, L * .28); g.lineTo(-L * .08, L * .1); g.fill();
  g.fillStyle = 'rgba(235,240,245,.9)'; g.beginPath(); g.moveTo(L * .5, L * .02); g.bezierCurveTo(L * .3, L * .14, -L * .2, L * .12, -L * .4, L * .03); g.bezierCurveTo(-L * .1, L * .06, L * .3, L * .05, L * .5, L * .02); g.fill();
  if (open > 0) { g.fillStyle = '#3a1a24'; g.beginPath(); g.moveTo(L * .54, 0); g.lineTo(L * .3, -L * .03); g.lineTo(L * .32, L * .03 + open * L * .14); g.closePath(); g.fill(); g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(L * (.34 + k * .05), -L * .02); g.lineTo(L * (.36 + k * .05), L * .02); g.lineTo(L * (.38 + k * .05), -L * .02); g.fill(); g.beginPath(); g.moveTo(L * (.34 + k * .05), L * .03 + open * L * .12); g.lineTo(L * (.36 + k * .05), open * L * .07); g.lineTo(L * (.38 + k * .05), L * .03 + open * L * .12); g.fill(); } }
  g.fillStyle = '#10141a'; g.beginPath(); g.arc(L * .36, -L * .06, Math.max(1.2, L * .022), 0, 6.3); g.fill(); g.strokeStyle = 'rgba(30,40,50,.5)'; g.lineWidth = Math.max(.8, L * .008); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(L * (.22 - k * .03), -L * .07); g.lineTo(L * (.2 - k * .03), L * .03); g.stroke(); }
  g.restore();
}

/* =========================================================
   낚시 2: 넓은 연못을 끌어서 둘러보고, 멀리 던질수록 깊은 물 · 상어 주의
   ========================================================= */
function openFishing() {
  if (ov) return; E.ac(); const d = ov = overlay('pond'), c = $q(d, 'canvas'), hint = $q(d, '.fz-hint');
  d.insertAdjacentHTML('beforeend', '<button type="button" class="fz-book">도감</button><div class="fz-card" hidden></div><div class="fz-warn" hidden>상어가 다가와요! 빨리 감아요!</div>');
  let [W, H, D] = fitCanvas(c); const g = c.getContext('2d');
  const pr = E.preset, night = pr === 'night', dusk = pr === 'dusk';
  const PW = Math.round(W * 2.6), HZ = Math.round(H * .36);
  const PAL = night ? { sky: ['#06101e', '#13284a', '#24426a'], far: '#1a2e44', mid: '#0c1a22', w0: '#1c3a52', w1: '#06121c', glint: 'rgba(170,210,255,', lamp: 1 }
    : dusk ? { sky: ['#3a2a5a', '#b05a6a', '#ffb07a'], far: '#7a5a7a', mid: '#3a2638', w0: '#c07a7a', w1: '#2a1e34', glint: 'rgba(255,220,180,', lamp: .7 }
    : { sky: ['#a8d8c0', '#dff0c0', '#fdf6d2'], far: '#9cc0a0', mid: '#3e6a4a', w0: '#a8d0b8', w1: '#1e4a48', glint: 'rgba(255,255,240,', lamp: 0 };
  let sd = 4242; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const mk = w => { const o = document.createElement('canvas'); o.width = w; o.height = H; return [o, o.getContext('2d')]; };
  // 먼 하늘 + 숲
  const [farC, f1] = mk(Math.round(W + (PW - W) * .35));
  { let gr = f1.createLinearGradient(0, 0, 0, HZ); gr.addColorStop(0, PAL.sky[0]); gr.addColorStop(.6, PAL.sky[1]); gr.addColorStop(1, PAL.sky[2]); f1.fillStyle = gr; f1.fillRect(0, 0, farC.width, HZ + 2);
    if (night) { for (let i = 0; i < 160; i++) { f1.fillStyle = `rgba(255,255,255,${.3 + R() * .6})`; f1.fillRect(R() * farC.width, R() * HZ * .8, 1.2, 1.2); } gl(f1, farC.width * .3, HZ * .25, 46, '#eef4ff', .9); gl(f1, farC.width * .3, HZ * .25, 200, '#9ec4ff', .25); }
    else gl(f1, farC.width * .62, HZ * .7, 340, dusk ? '#ffb070' : '#fffbe0', dusk ? .7 : .8);
    f1.fillStyle = PAL.far; f1.beginPath(); f1.moveTo(0, HZ); for (let x = 0; x <= farC.width; x += 14) f1.lineTo(x, HZ - 26 - Math.abs(Math.sin(x * .011)) * 40 - R() * 14); f1.lineTo(farC.width, HZ); f1.fill();
    for (let i = 0; i < farC.width / 3; i++) { const x = R() * farC.width, y = HZ - R() * (40 + Math.abs(Math.sin(x * .011)) * 40); f1.fillStyle = css(mix(hx(PAL.far), R() < .5 ? hx(PAL.sky[2]) : [0, 0, 0], R() * .25), .7); f1.save(); f1.translate(x, y); f1.rotate(R() * 3); f1.beginPath(); f1.ellipse(0, 0, 6 + R() * 8, 3 + R() * 3, 0, 0, 6.3); f1.fill(); f1.restore(); }
    gr = f1.createLinearGradient(0, HZ - 80, 0, HZ); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, night ? 'rgba(120,160,220,.25)' : 'rgba(255,250,230,.45)'); f1.fillStyle = gr; f1.fillRect(0, HZ - 80, farC.width, 80); }
  // 건너편 큰 나무들 + 집 불빛
  const [midC, m1] = mk(Math.round(W + (PW - W) * .7));
  const LAMPS2 = [];
  { const TP = night ? ['#060e12', '#0c1c22', '#16303a', '#3a6a7a'] : dusk ? ['#2a1828', '#4e2a3a', '#a85a50', '#ffb07a'] : ['#24483c', '#3e7050', '#86b45e', '#e4ec9e'];
    const leafD = (x, y, l, w, a, col, al) => { m1.save(); m1.translate(x, y); m1.rotate(a); m1.fillStyle = col; m1.globalAlpha = al; m1.beginPath(); m1.moveTo(-l / 2, 0); m1.quadraticCurveTo(0, -w, l / 2, 0); m1.quadraticCurveTo(0, w * .8, -l / 2, 0); m1.fill(); m1.restore(); };
    const pc = k => { const P2 = TP.map(hx); return k < .33 ? mix(P2[0], P2[1], k / .33) : k < .7 ? mix(P2[1], P2[2], (k - .33) / .37) : mix(P2[2], P2[3], (k - .7) / .3); };
    for (let x = -40; x < midC.width + 40; x += 70 + R() * 130) { const w = 16 + R() * 36, top = HZ - 140 - R() * HZ * .55;
      for (let i = 0; i < (HZ - top) * w / 40; i++) { const u = R() - .5, y = top + R() * (HZ - top), k = clamp(.2 + u * .9, 0, 1); m1.fillStyle = css(pc(k * .7)); m1.globalAlpha = .8; m1.fillRect(x + u * w - 2, y, 4 + R() * 3, 10 + R() * 22); }
      m1.globalAlpha = 1;
      for (let i = 0; i < 420; i++) { const a2 = R() * 6.283, r2 = Math.sqrt(R()), cx2 = x + Math.cos(a2) * 110 * r2, cy2 = top + 10 + Math.sin(a2) * 52 * r2, k = clamp(.55 - Math.sin(a2) * r2 * .45 + (R() - .5) * .35, 0, 1); leafD(cx2, cy2, 10 + R() * 14, 4 + R() * 5, R() * 3 - 1.5, css(pc(k)), .85 + R() * .15); }
      for (let i = 0; i < 6; i++) { const vx2 = x + (R() - .5) * 180, vy = top + 30 + R() * 30; m1.strokeStyle = css(pc(.35)); m1.globalAlpha = .7; m1.lineWidth = 1.2; m1.beginPath(); m1.moveTo(vx2, vy); m1.quadraticCurveTo(vx2 + (R() - .5) * 10, vy + 40, vx2 + (R() - .5) * 8, vy + 60 + R() * 60); m1.stroke(); m1.globalAlpha = 1; }
      if (R() < .45) LAMPS2.push([x + (R() - .5) * 40, top + 70 + R() * 50]); }
    for (let x = -10; x < midC.width; x += 6) { const k = R(); m1.fillStyle = css(pc(.15 + k * .3)); m1.fillRect(x, HZ - 8 - R() * 16, 6 + R() * 6, 26); }
    for (const [x, y] of LAMPS2) { gl(m1, x, y, 30, '#ffc66b', night ? .65 : dusk ? .45 : .15); m1.fillStyle = night || dusk ? '#ffe2a0' : 'rgba(255,230,170,.6)'; m1.fillRect(x - 2, y - 3, 4, 6); } }
  // 물 (반사 포함)
  const [watC, w1] = mk(PW);
  { let gr = w1.createLinearGradient(0, HZ, 0, H); gr.addColorStop(0, PAL.w0); gr.addColorStop(1, PAL.w1); w1.fillStyle = gr; w1.fillRect(0, HZ, PW, H - HZ);
    w1.save(); w1.globalAlpha = night ? .5 : .32; w1.translate(0, HZ * 2); w1.scale(1, -.62); w1.drawImage(midC, 0, 0, midC.width, H, 0, 0, PW, H); w1.restore();
    w1.save(); w1.globalCompositeOperation = 'screen'; if (!night) gl(w1, PW * .62, HZ + 30, 300, dusk ? '#ffb070' : '#fffbe0', .35); else gl(w1, PW * .3 * .9, HZ + 40, 220, '#9ec4ff', .25); w1.restore();
    gr = w1.createLinearGradient(0, HZ, 0, HZ + 60); gr.addColorStop(0, night ? 'rgba(140,180,230,.35)' : 'rgba(255,255,240,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); w1.fillStyle = gr; w1.fillRect(0, HZ, PW, 60); }
  const book = LSF.get('book', {});
  let vx = (PW - W) / 2, vv = 0, state = 'ready', power = 0, T = 0, bob = null, fish = null, biteT = 0, waitT = 0, nib = 0, prog = 0, ten = 0, pull = 0, pullDir = 1, msg = '', msgT = 0, rodBend = 0, splash = [], lastReel = 0, shake = 0, shark = null, leap = null, depth = 0, pd = null, sharkSeen = 0;
  const pads = Array.from({ length: 22 }, () => ({ x: R() * PW, y: HZ + 30 + R() * (H - HZ - 140), r: 14 + R() * 26, a: R() * 6.3, fl: R() < .3, dr: (R() - .5) * 4 }));
  const shadows = Array.from({ length: 7 }, () => ({ x: R() * PW, y: HZ + 40 + R() * (H - HZ - 120), vx: (R() - .5) * 30, L: 30 + R() * 50, ph: R() * 9 }));
  const bugs = Array.from({ length: night ? 34 : 5 }, () => ({ x: R() * PW, y: HZ - 40 + R() * (H - HZ), ph: R() * 9 }));
  const setHint = s => { hint.textContent = s; };
  const READY = '화면을 끌어 둘러보고, 꾹 누르다 놓으면 던져요 · 멀리 던질수록 깊은 물';
  setHint(READY);
  const say2 = (s, ms = 2200) => { msg = s; msgT = ms / 1000; };
  const tip = () => [W * .8 - rodBend * 30, H * .6 + rodBend * 40];
  const persp = y => clamp((y - HZ) / (H - HZ), .05, 1);
  const depthAt = y => 1 - clamp((y - HZ) / (H - HZ - 60), 0, 1);
  function cast() { const p = clamp(power, .12, 1), sy = H - (H - HZ) * (.2 + p * .72), sx = W * .5 + rnd(-40, 40); bob = { x0: vx + tip()[0], y0: tip()[1], x1: vx + sx, y1: sy, t: 0, x: vx + tip()[0], y: tip()[1] }; state = 'cast'; setHint(''); snd.reel(); E.noise(.25, .15, 2400, 'highpass'); }
  function startWait() { sharkSeen = 0; state = 'wait'; depth = depthAt(bob.y); fish = rollFishD(depth); waitT = rnd(2, 6) - depth; const s = shadows[Math.floor(R() * shadows.length)]; s.hunt = 1; s.L = fish.r >= 4 ? 90 : fish.r >= 3 ? 64 : 42; setHint('찌를 지켜보세요… 그림자가 다가와요'); }
  function lost(s) { state = 'ready'; bob = null; shark = null; $q(d, '.fz-warn').hidden = true; shadows.forEach(x => x.hunt = 0); say2(s || pick(['놓쳤다… 괜찮아요, 다음에!', '물고기가 인사만 하고 갔어요.', '줄이 풀렸어요. 다시 던져 봐요.'])); setHint(READY); }
  function caught() {
    state = 'caught'; $q(d, '.fz-warn').hidden = true; const cm = Math.round(rnd(fish.cm[0], fish.cm[1]) * (1 + depth * .25) * 10) / 10, b = book[fish.i] || { n: 0, best: 0, first: Date.now() }, first = !b.n; b.n++; b.best = Math.max(b.best, cm); book[fish.i] = b; LSF.set('book', book);
    CTX.onCatch && CTX.onCatch(fish, cm, first);
    SFX.ding(); if (fish.r >= 3) setTimeout(() => SFX.sparkle(), 200);
    const near = shark && !shark.gone; if (near) { leap = { t: 0, x: bob.x + 60, y: bob.y, miss: 1 }; shark = null; shake = 1; snd.splash(); }
    const show = () => { const card = $q(d, '.fz-card'); card.hidden = false;
      card.innerHTML = `<canvas width="360" height="200"></canvas><b>${fish.name}</b><span class="rar r${fish.r}">${RAR[fish.r]}${first ? ' · 처음 잡았어요!' : ''}</span><em>${cm}cm${b.best === cm && b.n > 1 ? ' · 최고 기록!' : ''}${near ? ' · 상어를 따돌렸어요!' : ''}</em><p>${fish.desc}</p><div class="r"><button type="button" data-b>도감</button><button type="button" data-again>다시 던지기</button></div>`;
      const cc = $q(card, 'canvas'), cg = cc.getContext('2d'); let t0 = 0; const f = fish;
      const anim = () => { if (card.hidden || !cc.isConnected) return; t0 += 1 / 60; cg.clearRect(0, 0, 360, 200); const gr = cg.createRadialGradient(180, 100, 10, 180, 100, 180); gr.addColorStop(0, f.r >= 3 ? 'rgba(255,240,190,.9)' : 'rgba(230,245,220,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cg.fillStyle = gr; cg.fillRect(0, 0, 360, 200); cg.save(); cg.translate(f.shape ? 180 : 200, 100 + Math.sin(t0 * 2) * 5); cg.rotate(Math.sin(t0 * 1.3) * .08); drawFish(cg, f, 0, 0, f.shape === 'eel' ? 240 : f.shape === 'shark' ? 200 : 170, t0); cg.restore(); requestAnimationFrame(anim); };
      anim();
      $q(card, '[data-again]').onclick = () => { card.hidden = true; state = 'ready'; bob = null; setHint(READY); };
      $q(card, '[data-b]').onclick = () => { card.hidden = true; state = 'ready'; bob = null; setHint(READY); fishBook(d); }; };
    if (near) { say2('휴…! 하마터면 잡아먹힐 뻔했다!', 1600); setTimeout(show, 1300); } else show();
    setHint('');
  }
  function sharkBite() { leap = { t: 0, x: bob.x, y: bob.y }; shake = 1.4; snd.splash(); E.tone(90, .5, 'sawtooth', .06, 0, 50); if (navigator.vibrate) navigator.vibrate([60, 40, 120]); state = 'leap'; $q(d, '.fz-warn').hidden = true; setTimeout(() => lost('으악! 상어가 물고기를 낚아채 갔어요… 나까지 먹힐 뻔!'), 1400); }
  $q(d, '.fz-book').onclick = e => { e.stopPropagation(); fishBook(d); };
  const down = e => { if (e.target !== c) return; E.ac(); pd = { x: e.clientX, y: e.clientY, x0: e.clientX, t: performance.now(), moved: false, held: true }; vv = 0;
    if (state === 'wait') { say2(nib > 0 ? '아직이에요… 기다려요.' : '쉿…', 1200); }
    else if (state === 'bite') { state = 'reel'; prog = .12; ten = .18; pull = 0; setHint('누르고 있으면 감아요 · 줄이 빨개지면 손을 떼요'); SFX.pop(); pd.reel = 1; }
  };
  const move = e => { if (!pd) return; const dx = e.clientX - pd.x; if (Math.abs(e.clientX - pd.x0) > 12) pd.moved = true; pd.x = e.clientX;
    if (pd.moved && (state === 'ready' || state === 'wait' || state === 'charge' || state === 'cast')) { if (state === 'charge') { state = 'ready'; power = 0; } vx = clamp(vx - dx, 0, PW - W); vv = -dx; } };
  const up = () => { if (!pd) return; if (state === 'charge') cast(); pd = null; };
  c.addEventListener('pointerdown', down); addEventListener('pointermove', move); addEventListener('pointerup', up); addEventListener('pointercancel', up);
  let raf = 0, tPrev = performance.now();
  const close = () => { cancelAnimationFrame(raf); removeEventListener('pointermove', move); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); d.remove(); ov = null; CTX.onClose && CTX.onClose(); };
  $q(d, '.fz-x').onclick = close;
  const holding = () => !!pd;
  const loop = () => {
    const tn = performance.now(), dt = Math.min(.05, (tn - tPrev) / 1000); tPrev = tn; T += dt; msgT -= dt; shake = Math.max(0, shake - dt * 1.4);
    if (!pd && Math.abs(vv) > .2) { vx = clamp(vx - vv, 0, PW - W); vv *= .92; }
    if (pd && state === 'ready' && !pd.moved && tn - pd.t > 160) { state = 'charge'; power = 0; }
    if (state === 'charge') power = Math.min(1, power + dt * .85);
    if (state === 'cast') { bob.t += dt * 1.5; const k = Math.min(1, bob.t); bob.x = bob.x0 + (bob.x1 - bob.x0) * k; bob.y = bob.y0 + (bob.y1 - bob.y0) * k - Math.sin(k * Math.PI) * H * .28; if (k >= 1) { snd.plop(); splash.push({ x: bob.x, y: bob.y, t: 0 }); startWait(); } }
    for (const s of shadows) { if (s.hunt && bob && (state === 'wait' || state === 'bite')) { s.x += (bob.x - 20 - s.x) * dt * .6; s.y += (bob.y + 18 - s.y) * dt * .6; } else { s.x += s.vx * dt; s.y += Math.sin(T * .5 + s.ph) * 6 * dt; if (s.x < 0 || s.x > PW) s.vx *= -1; } }
    if (state === 'wait') { waitT -= dt; if (waitT < 1.6 && Math.random() < dt * 2.5) { nib = .4; E.tone(900, .04, 'sine', .02); splash.push({ x: bob.x, y: bob.y, t: .5 }); }
      if (waitT <= 0) { state = 'bite'; biteT = fish.r >= 4 ? .8 : 1; snd.splash(); splash.push({ x: bob.x, y: bob.y, t: 0 }); setHint('지금! 눌러요!'); if (navigator.vibrate) navigator.vibrate(80); } }
    nib = Math.max(0, nib - dt);
    if (state === 'bite') { biteT -= dt; if (biteT <= 0) lost('앗, 너무 늦었어요. 미끼만 먹고 갔어요.'); }
    if (state === 'reel') {
      const str = fish.shape === 'shark' ? 1.25 : [0, .25, .4, .6, .85, 1.05][fish.r];
      if (Math.random() < dt * (0.6 + str)) { pull = rnd(.3, 1) * (0.5 + str); pullDir = Math.random() < .5 ? -1 : 1; }
      pull = Math.max(0, pull - dt * .7);
      if (holding()) { prog += dt * (.19 - pull * .07); ten += dt * (.27 + pull * .9); if (tn - lastReel > 90) { lastReel = tn; snd.reel(); } } else { ten -= dt * .8; prog -= dt * (.03 + pull * .04); }
      ten = clamp(ten, 0, 1); prog = clamp(prog, 0, 1);
      if (pull > .45 && Math.random() < dt * 5) splash.push({ x: bob.x + rnd(-20, 20), y: bob.y, t: 0 });
      bob.x += pullDir * pull * 70 * dt + (vx + W * .55 - bob.x) * dt * prog * .5; bob.y = clamp(bob.y + (H * .78 - bob.y) * dt * prog * .45 - pull * 8 * dt, HZ + 20, H - 40);
      // 상어
      if (!shark && !sharkSeen && depth > .4 && fish.shape !== 'shark' && !leap && Math.random() < dt * (.006 + depth * .035 + (fish.r >= 3 ? .02 : 0))) { sharkSeen = 1; const side = Math.random() < .5 ? -1 : 1; shark = { x: bob.x + side * W * .95, y: bob.y + rnd(-10, 20), dir: -side, sp: 32 + depth * 38 }; $q(d, '.fz-warn').hidden = false; E.tone(110, 1.2, 'sawtooth', .025); E.tone(116, 1.2, 'sawtooth', .02, .6); }
      if (shark) { const dx = bob.x - shark.x; shark.dir = Math.sign(dx) || 1; shark.x += shark.dir * shark.sp * dt; shark.y += (bob.y + 6 - shark.y) * dt; if (Math.abs(dx) < 28) sharkBite(); }
      if (state === 'reel') { if (ten >= 1) { E.tone(200, .3, 'sawtooth', .04, 0, 80); lost('줄이 너무 팽팽해서 끊어졌어요… 괜찮아요, 다음에!'); } else if (prog >= 1) caught(); }
    }
    if (bob && (state === 'reel' || state === 'bite' || state === 'wait') && !pd) vx += (clamp(bob.x - W * .5, 0, PW - W) - vx) * dt * (state === 'reel' ? 2.5 : .8);
    rodBend += ((state === 'reel' ? (holding() ? .6 + pull * .4 : pull * .5) : state === 'charge' ? -power * .3 : 0) - rodBend) * dt * 6;
    // ---- 그리기
    const sx = shake ? (Math.random() - .5) * 16 * shake : 0, sy = shake ? (Math.random() - .5) * 12 * shake : 0;
    g.setTransform(D, 0, 0, D, sx * D, sy * D);
    g.fillStyle = PAL.w1; g.fillRect(-20, -20, W + 40, H + 40); g.drawImage(farC, -vx * .35, 0); g.drawImage(midC, 0, 0, midC.width, HZ + 4, -vx * .7, 0, midC.width, HZ + 4);
    g.drawImage(watC, 0, HZ, PW, H - HZ, -vx, HZ, PW, H - HZ);
    g.save(); g.translate(-vx, 0);
    // 물 반짝임
    for (let i = 0; i < 90; i++) { const y = HZ + 6 + ((i * 37) % 100) / 100 * (H - HZ - 10), p = persp(y), x = ((i * 173 + T * 14 * (1 + i % 3)) % PW), a = (.1 + .12 * Math.sin(T * 2 + i)) * (1.2 - p * .5); g.fillStyle = PAL.glint + a + ')'; g.fillRect(x, y, (14 + (i % 5) * 9) * p + 4, 1 + p); }
    // 반딧불 / 잠자리
    for (const b of bugs) { const x = b.x + Math.sin(T * .7 + b.ph) * 30, y = b.y + Math.cos(T * .9 + b.ph) * 16; if (night) { const a = .5 + .5 * Math.sin(T * 2.6 + b.ph); gl(g, x, y, 12, '#e8ff9a', .55 * a); g.fillStyle = `rgba(250,255,200,${a})`; g.fillRect(x - 1, y - 1, 2, 2); } else { g.strokeStyle = 'rgba(40,60,80,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 6, y); g.stroke(); g.fillStyle = 'rgba(200,230,255,.6)'; g.beginPath(); g.ellipse(x - 1, y - 2 - Math.abs(Math.sin(T * 40)) * 2, 4, 1.4, -.3, 0, 6.3); g.ellipse(x + 1, y - 2 - Math.abs(Math.sin(T * 40 + 1)) * 2, 4, 1.4, .3, 0, 6.3); g.fill(); } }
    // 수련
    for (const p of pads) { p.x += p.dr * dt; const k = persp(p.y), x = p.x, y = p.y + Math.sin(T + p.a) * 1.5, r = p.r * (.4 + k); g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(x + 2, y + 2, r, r * .36, 0, 0, 6.3); g.fill(); g.fillStyle = night ? '#1e4a36' : dusk ? '#4a6a3a' : '#5a9a5a'; g.beginPath(); g.ellipse(x, y, r, r * .36, 0, p.a, p.a + 5.6); g.lineTo(x, y); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r * .6, r * .2, 0, 0, 3); g.stroke(); if (p.fl) { g.fillStyle = '#ffd0e0'; for (let k2 = 0; k2 < 6; k2++) { g.beginPath(); g.ellipse(x + Math.cos(k2) * 5 * k, y - 4 * k + Math.sin(k2) * 2, 5 * k + 1, 2.4 * k + .6, k2, 0, 6.3); g.fill(); } gl(g, x, y - 4, 16 * k, '#ffe8f0', night ? .45 : .2); } }
    // 물고기 그림자
    for (const s of shadows) { const k = persp(s.y); g.save(); g.globalAlpha = .22; g.translate(s.x, s.y); g.scale(s.vx < 0 && !s.hunt ? -1 : 1, 1); g.fillStyle = '#04100e'; g.beginPath(); g.ellipse(0, 0, s.L * k, s.L * .28 * k, 0, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(-s.L * k, 0); g.lineTo(-s.L * 1.35 * k, -s.L * .2 * k + Math.sin(T * 6 + s.ph) * 3); g.lineTo(-s.L * 1.35 * k, s.L * .2 * k); g.fill(); g.restore(); }
    // 상어 지느러미
    if (shark) { const k = persp(shark.y); g.save(); g.translate(shark.x, shark.y); g.globalAlpha = .3; g.fillStyle = '#081418'; g.beginPath(); g.ellipse(-shark.dir * 30 * k, 8, 70 * k, 14 * k, 0, 0, 6.3); g.fill(); g.globalAlpha = 1; g.fillStyle = '#4a5a6a'; g.beginPath(); g.moveTo(-14 * k * shark.dir, 0); g.quadraticCurveTo(-4 * k * shark.dir, -30 * k, 12 * k * shark.dir, -34 * k); g.quadraticCurveTo(4 * k * shark.dir, -12 * k, 16 * k * shark.dir, 0); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-26 * k * shark.dir, 2); g.quadraticCurveTo(0, -4, 26 * k * shark.dir, 2); g.stroke(); g.restore(); }
    // 물보라
    for (const s of splash) { s.t += dt; const k = s.t / .9, p = persp(s.y); g.strokeStyle = `rgba(255,255,255,${.7 * (1 - k)})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(s.x, s.y + 4, (6 + k * 50) * p + 3, (2 + k * 12) * p + 1, 0, 0, 6.3); g.stroke(); if (k < .4) for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${.8 * (1 - k / .4)})`; g.beginPath(); g.arc(s.x + Math.cos(i) * k * 50 * p, s.y - Math.sin(i * 1.3) * 30 * k * p - k * 10, 1.6, 0, 6.3); g.fill(); } }
    splash = splash.filter(s => s.t < .9);
    g.restore();
    // 안개
    { const gr = g.createLinearGradient(0, HZ - 30, 0, HZ + 90); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, night ? 'rgba(140,170,220,.18)' : 'rgba(255,255,240,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, HZ - 30, W, 120); }
    // 낚싯대 + 줄 + 찌
    const [tx2, ty2] = tip(), bend = rodBend * 40;
    if (bob) { const bx = bob.x - vx, by = bob.y + (state === 'wait' ? Math.sin(T * 2.5) * 2 + nib * 8 : 0) + (state === 'bite' ? 12 + Math.sin(T * 30) * 3 : 0), k = persp(bob.y);
      g.strokeStyle = state === 'reel' ? (ten > .75 ? `rgba(255,${120 - ten * 100},${120 - ten * 100},.95)` : 'rgba(255,255,255,.85)') : 'rgba(255,255,255,.55)'; g.lineWidth = state === 'reel' ? 1.2 + ten * 1.4 : 1;
      g.beginPath(); g.moveTo(tx2 - bend * .4, ty2 + bend); if (state === 'reel') g.quadraticCurveTo((tx2 + bx) / 2, (ty2 + by) / 2 + (1 - ten) * 40, bx, by); else g.quadraticCurveTo((tx2 + bx) / 2, Math.max(ty2, by) + 50, bx, by); g.stroke();
      if (state === 'bite') { const kk = .5 + .5 * Math.sin(T * 20); gl(g, bx, bob.y, 70, '#fff6c8', .5 * kk); g.fillStyle = '#ffd23f'; g.font = '900 48px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText('!', bx, bob.y - 34); g.textAlign = 'left'; }
      else if (state !== 'leap') { const r = 3 + 6 * k; g.fillStyle = '#e8463a'; g.beginPath(); g.arc(bx, by, r, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, r, 0, Math.PI); g.fill(); g.fillStyle = '#e8463a'; g.fillRect(bx - 1.2, by - r * 2.3, 2.4, r * 1.4); if (night) gl(g, bx, by - r * 2, 10, '#ff8a6a', .5); } }
    g.strokeStyle = '#2e2014'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(W * 1.02, H * 1.03); g.quadraticCurveTo(W * .9, H * .82 + bend * .3, tx2 - bend * .4, ty2 + bend); g.stroke();
    g.strokeStyle = '#8a6a44'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(W * .97, H * .95); g.quadraticCurveTo(W * .89, H * .79 + bend * .3, tx2 - bend * .4, ty2 + bend); g.stroke();
    g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(W * .95, H * .9, 16, 0, 6.3); g.fill(); g.strokeStyle = '#c8c8d0'; g.lineWidth = 2; g.beginPath(); g.moveTo(W * .95, H * .9); g.lineTo(W * .95 + Math.cos(T * (state === 'reel' && holding() ? 14 : 0)) * 12, H * .9 + Math.sin(T * (state === 'reel' && holding() ? 14 : 0)) * 12); g.stroke();
    // 상어 점프
    if (leap) { leap.t += dt; const k = leap.t / 1.2; if (k < 1) { const L = 160 + k * (leap.miss ? 160 : 520), x = leap.x - vx + (leap.miss ? 60 : 0) * k, y = leap.y - Math.sin(k * Math.PI) * H * (leap.miss ? .35 : .55) + (leap.miss ? 0 : k * H * .3); g.save(); g.translate(x, y); g.rotate(-.6 + k * 1.2); drawShark(g, 0, 0, L, Math.min(1, k * 3), T, night ? '#3a4a5a' : '#5a6a7a'); g.restore(); for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(leap.x - vx + Math.cos(i * 2) * 60 * k, leap.y - Math.sin(i * 1.7) * 80 * k + k * k * 160, 3 * (1 - k) + 1, 0, 6.3); g.fill(); } } else leap = null; }
    // 가까운 갈대 (시차)
    g.fillStyle = night ? '#050c0a' : dusk ? '#20141e' : '#1a3424'; for (let i = 0; i < 34; i++) { const x = ((i * 97 - vx * 1.3) % (W + 120) + W + 120) % (W + 120) - 60, h2 = H * (.14 + (i * 7 % 10) / 50); g.save(); g.translate(x, H + 6); g.rotate(Math.sin(T * 1.2 + i) * .05 - .04); g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(0, -h2 * .6, 2, -h2); g.quadraticCurveTo(3, -h2 * .5, 5, 0); g.fill(); if (i % 5 === 0) { g.fillStyle = night ? '#1a120a' : '#5a3a20'; g.beginPath(); g.ellipse(2, -h2 * .9, 3, 10, 0, 0, 6.3); g.fill(); g.fillStyle = night ? '#050c0a' : dusk ? '#20141e' : '#1a3424'; } g.restore(); }
    // 보정: 비네트 · 빛
    { const gr = g.createRadialGradient(W * .5, H * .45, H * .2, W * .5, H * .5, Math.max(W, H) * .8); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, night ? 'rgba(0,4,16,.6)' : 'rgba(10,30,20,.38)'); g.fillStyle = gr; g.fillRect(-20, -20, W + 40, H + 40); }
    if (shark && state === 'reel') { const a = .15 + .1 * Math.sin(T * 8); g.fillStyle = `rgba(200,30,40,${a})`; g.fillRect(-20, -20, W + 40, 18); g.fillRect(-20, H + 2, W + 40, -18); }
    // UI
    if (state === 'reel') { const cx = W / 2, cy = H * .14, w = Math.min(W * .7, 420);
      g.fillStyle = 'rgba(20,30,30,.55)'; rr2(g, cx - w / 2 - 12, cy - 30, w + 24, 64, 14); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; rr2(g, cx - w / 2, cy - 18, w, 12, 6); g.fill(); g.fillStyle = '#8ee08a'; rr2(g, cx - w / 2, cy - 18, Math.max(12, w * prog), 12, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,.18)'; rr2(g, cx - w / 2, cy + 6, w, 10, 5); g.fill(); g.fillStyle = ten > .75 ? '#ff5a5a' : ten > .5 ? '#ffc04a' : '#ffffff'; rr2(g, cx - w / 2, cy + 6, Math.max(10, w * ten), 10, 5); g.fill();
      g.fillStyle = '#fff'; g.font = '700 12px "Noto Sans KR",sans-serif'; g.fillText('끌어올리기', cx - w / 2, cy - 22); g.textAlign = 'right'; g.fillText('줄 팽팽함', cx + w / 2, cy + 30); g.textAlign = 'left'; }
    if (state === 'charge') { const cx = W * .5, cy = H * .5; g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 8; g.beginPath(); g.arc(cx, cy, 34, 0, 6.3); g.stroke(); g.strokeStyle = '#ffd23f'; g.beginPath(); g.arc(cx, cy, 34, -1.57, -1.57 + power * 6.283); g.stroke(); g.fillStyle = '#fff'; g.font = '700 13px "Noto Sans KR",sans-serif'; g.textAlign = 'center'; g.fillText(power > .7 ? '깊은 물' : power > .35 ? '중간' : '가까이', cx, cy + 5); g.textAlign = 'left'; }
    if (msgT > 0) { g.globalAlpha = Math.min(1, msgT * 2); g.fillStyle = 'rgba(255,253,245,.95)'; g.font = '700 16px "Noto Sans KR",sans-serif'; const tw = g.measureText(msg).width; rr2(g, W / 2 - tw / 2 - 16, H * .28 - 22, tw + 32, 38, 19); g.fill(); g.fillStyle = '#2a2238'; g.textAlign = 'center'; g.fillText(msg, W / 2, H * .28 + 3); g.textAlign = 'left'; g.globalAlpha = 1; }
    // 둘러보기 위치 표시
    { const w = 90, x0 = W / 2 - w / 2, y0 = 16; g.fillStyle = 'rgba(20,20,30,.35)'; rr2(g, x0, y0, w, 6, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; rr2(g, x0 + (vx / (PW - W)) * (w - 22), y0, 22, 6, 3); g.fill(); }
    raf = requestAnimationFrame(loop);
  };
  loop();
  addEventListener('resize', () => { if (ov === d) [W, H, D] = fitCanvas(c); });
}
/* 물었을 때 어떤 물고기일지 (시간대 · 깊이) — 도감의 확률도 이걸로 계산해요 */
function fishW(pr, depth) { return FISH.map(f => { let w = f.w; if (f.night && pr === 'night') w *= f.night; if (f.dusk && pr === 'dusk') w *= f.dusk; if (f.night && pr === 'day' && !f.dusk && f.r >= 3) w *= .25; if (f.r >= 3) w *= 1 + depth * 1.5; if (f.r >= 4) w *= 1 + depth * 2.5; if (f.r <= 1) w *= 1.3 - depth * .6; if (f.deep && depth < .6) w = 0; return w; }); }
function fishPct(i, pr, depth) { const ws = fishW(pr, depth), tot = ws.reduce((a, b) => a + b, 0); return tot ? ws[i] / tot * 100 : 0; }
const pctS = v => v <= 0 ? '안 나와요' : v < 1 ? '1% 미만' : (v < 10 ? v.toFixed(1) : Math.round(v)) + '%';
const PCT_D = [['얕은 곳', .2], ['깊은 곳', .9]], PCT_T = [['day', '낮'], ['dusk', '노을'], ['night', '밤']];
const nowPct = i => Math.max(...PCT_D.map(([, d]) => fishPct(i, E.preset, d)));
function rollFishD(depth) {
  const ws = fishW(E.preset, depth), tot = ws.reduce((x, y) => x + y, 0);
  let r = Math.random() * tot; for (let i = 0; i < FISH.length; i++) { r -= ws[i]; if (r <= 0) return FISH[i]; } return FISH[0];
}

const st = document.createElement('style'); st.textContent = `
.fz-ov{position:fixed;inset:0;z-index:80;background:#0b0a18;touch-action:none;user-select:none;-webkit-user-select:none}
.fz-ov>canvas{position:absolute;inset:0;display:block}
.fz-card[hidden],.fz-bookv[hidden]{display:none!important}
.fz-x{position:absolute;top:max(14px,env(safe-area-inset-top));right:14px;width:46px;height:46px;border-radius:50%;border:0;background:rgba(20,18,30,.55);display:grid;place-items:center;z-index:3;cursor:pointer}
.fz-x svg{width:20px;height:20px;stroke:#fff;stroke-width:2.4;fill:none;stroke-linecap:round}
.fz-hint{position:absolute;left:50%;bottom:max(26px,env(safe-area-inset-bottom));transform:translateX(-50%);margin:0;padding:10px 18px;border-radius:999px;background:rgba(20,18,30,.55);color:#fff8e8;font:600 15px "Noto Sans KR",sans-serif;white-space:nowrap;pointer-events:none;z-index:3}
.fz-hint:empty{display:none}
.fz-book{position:absolute;top:max(14px,env(safe-area-inset-top));left:14px;height:46px;padding:0 18px;border-radius:23px;border:0;background:rgba(255,253,245,.92);color:#2a2238;font:700 15px "Noto Sans KR",sans-serif;z-index:3;cursor:pointer}
.fz-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(380px,calc(100vw - 32px));background:#fffdf5;border-radius:18px;padding:12px 16px 16px;box-shadow:0 20px 60px rgba(0,0,0,.4);z-index:4;text-align:center;font-family:"Noto Sans KR",sans-serif;color:#2a2238;animation:fzPop .45s cubic-bezier(.2,1.4,.4,1)}
.fz-card canvas{width:100%;height:auto;display:block}
.fz-card b{display:block;font-size:22px;margin-top:4px}
.fz-card .rar{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;background:#eef3e4;color:#4a6a3a}
.fz-card .rar.r3{background:#fff2d0;color:#b07a10}.fz-card .rar.r4{background:#f3e4ff;color:#7a3ab0}.fz-card .rar.r5{background:#2a2238;color:#ffd23f}
.fz-card em{display:block;font-style:normal;font-size:14px;color:#6a6080;margin-top:6px}
.fz-card p{font-size:14px;line-height:1.6;margin:8px 0 12px;color:#4a4060}
.fz-card .r{display:flex;gap:8px;justify-content:center}
.fz-card button,.fz-bookv button{min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#2a2238;color:#fff;font:700 15px "Noto Sans KR",sans-serif;cursor:pointer}
.fz-card button[data-b]{background:#eee8f6;color:#2a2238}
.fz-bookv{position:absolute;inset:max(12px,env(safe-area-inset-top)) 12px 12px;background:#fffdf5;border-radius:18px;z-index:5;display:flex;flex-direction:column;font-family:"Noto Sans KR",sans-serif;color:#2a2238;overflow:hidden}
.fz-bookv .hd{display:flex;align-items:center;gap:10px;padding:12px 12px 10px 18px;border-bottom:1px solid #eee6d8}
.fz-bookv .hd b{font-size:18px}.fz-bookv .hd span{color:#8a8098;font-size:14px;margin-right:auto}
.fz-bookv .hd button{width:44px;padding:0;display:grid;place-items:center;background:#f2ede4}
.fz-bookv .hd svg{width:18px;height:18px;stroke:#2a2238;stroke-width:2.4;fill:none;stroke-linecap:round}
.fz-bookv .gr{overflow:auto;padding:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.fz-bookv .it{background:#f4f0e6;border-radius:12px;padding:6px 8px 10px;text-align:center}
.fz-bookv .it canvas{width:100%;height:auto}
.fz-bookv .it b{display:block;font-size:14px}.fz-bookv .it small{display:block;font-size:11px;color:#8a8098;margin-top:2px}
.fz-bookv .it.no b{color:#a8a0b0}
.fz-warn{position:absolute;left:50%;top:max(170px,calc(env(safe-area-inset-top) + 160px));transform:translateX(-50%);padding:10px 18px;border-radius:999px;background:#c8323c;color:#fff;font:800 15px "Noto Sans KR",sans-serif;z-index:3;animation:fzBlink .5s ease-in-out infinite alternate;pointer-events:none}
.fz-warn[hidden]{display:none}
@keyframes fzBlink{to{transform:translateX(-50%) scale(1.06);background:#ff4a4a}}
.fz-bookv button.it{border:0;font:inherit;color:inherit;cursor:pointer}
.fz-detail{position:absolute;inset:0;z-index:7;background:rgba(10,10,20,.5);display:grid;place-items:center;padding:16px;font-family:"Noto Sans KR",sans-serif}
.fz-detail .in{width:min(440px,100%);max-height:100%;overflow:auto;background:#fffdf5;border-radius:18px;padding:14px 18px 18px;text-align:center;color:#2a2238;animation:fzPop2 .35s cubic-bezier(.2,1.4,.4,1)}
.fz-detail .in.wide{width:min(620px,100%);text-align:left}
.fz-detail canvas{width:100%;height:auto;display:block}
.fz-detail .in>b{display:block;font-size:22px;margin-top:4px}
.fz-detail .rar{display:inline-block;margin-top:6px;font-size:12px;font-weight:700;padding:2px 10px;border-radius:999px;background:#eef3e4;color:#4a6a3a}
.fz-detail .rar.r3{background:#fff2d0;color:#b07a10}.fz-detail .rar.r4{background:#f3e4ff;color:#7a3ab0}.fz-detail .rar.r5{background:#2a2238;color:#ffd23f}
.fz-detail p{font-size:15px;line-height:1.65;margin:10px 0}
.fz-detail dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0 0 14px}
.fz-detail dl div{background:#f4f0e6;border-radius:10px;padding:8px}
.fz-detail dt{font-size:11px;color:#8a8098}.fz-detail dd{margin:2px 0 0;font-weight:700;font-size:14px}
.fz-detail .in>button{min-height:44px;padding:0 26px;border-radius:12px;border:0;background:#2a2238;color:#fff;font:700 15px "Noto Sans KR",sans-serif;margin-top:10px}
.fz-detail h4{margin:14px 0 6px;font-size:14px;color:#6a6080}
.fz-detail ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}
.fz-detail li{display:flex;align-items:center;gap:6px;background:#f4f0e6;border-radius:10px;padding:4px 10px 4px 4px;font-size:13px}
.fz-detail li canvas{width:48px;height:39px;flex:none}.fz-detail li span{flex:1}.fz-detail li.no{grid-column:1/-1;color:#a098a8;padding:10px}
@keyframes fzPop2{from{transform:scale(.85);opacity:0}to{transform:none;opacity:1}}
.fz-ov{font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif}
`; document.head.append(st);
export { FISH, RAR, drawFish };
export function startPond(ctx) { CTX = ctx || {}; openFishing(); }
// 도감만 열기 (마이세카이 도감 버튼에서)
export function openBook(ctx) { CTX = ctx || {}; const host = document.createElement('div'); host.className = 'fz-ov'; host.style.background = 'rgba(10,10,20,.55)'; document.body.append(host); fishBook(host, () => { host.remove(); CTX.onClose && CTX.onClose(); }); }
// 물고기 그림을 캔버스로 (아쿠아리움 전시용)
export function fishCanvas(f, w = 256, h = 160) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.translate(w / 2, h / 2); drawFish(x, f, 0, 0, f.shape === 'eel' ? w * .8 : w * .55, 1); return c; }
