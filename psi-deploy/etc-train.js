/* 기타 칸 — 광각 지하철 객차 (실시간 캔버스 + 물리 + 소리) */
(() => {
  const CSS = `
.etc{position:relative;height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));min-height:420px;overflow:hidden;background:#030a20;color:#fff;user-select:none;-webkit-user-select:none;--acc:#7fe3ff;--sel:#6fe4ff;--glow:rgba(90,210,255,.85);--led:#7fe3ff;--ex:#04153d}
.etc-cam{position:absolute;left:50%;top:50%;width:max(100%,calc((100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)) * 16 / 9));aspect-ratio:16/9;translate:-50% -50%;will-change:transform}
.etc-cam canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.etc-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse 75% 75% at 50% 50%,transparent 55%,rgba(1,4,14,.92))}
.etc-grain{position:absolute;inset:-50px;pointer-events:none;opacity:.1;mix-blend-mode:overlay;animation:etcgr .5s steps(5) infinite}
@keyframes etcgr{0%{transform:translate(0,0)}20%{transform:translate(-23px,11px)}40%{transform:translate(17px,-29px)}60%{transform:translate(-31px,-7px)}80%{transform:translate(9px,27px)}}
.etc-ui{position:absolute;inset:0;perspective:1100px;font-family:'Nanum Myeongjo',serif}
.etc-sub{position:absolute;left:7vw;top:58vh;transform-origin:left;transform:rotateY(18deg) rotateZ(-5deg) skewX(-10deg);font:400 clamp(14px,1.45vw,23px) 'Nanum Myeongjo',serif;letter-spacing:.3em;color:rgba(255,255,255,.82);margin:0}
.etc-menu{position:absolute;left:7vw;top:69vh;display:flex;gap:3vw;align-items:flex-end;transform-origin:left bottom;transform:rotateY(18deg) rotateZ(-5deg) skewX(-10deg)}
.etc-menu button{position:relative;background:none;border:0;padding:0;cursor:pointer;font:700 clamp(26px,3.7vw,62px)/1 'Nanum Myeongjo',serif;letter-spacing:-.01em;color:rgba(255,255,255,.88);text-shadow:0 2px 0 rgba(0,0,0,.35),0 0 18px rgba(0,0,0,.35);white-space:nowrap}
.etc-menu button i{display:inline-block;font-style:normal;will-change:transform}
.etc-menu button::before{content:attr(data-en);position:absolute;left:.08em;bottom:100%;margin-bottom:.55em;font:500 clamp(9px,.8vw,12px) 'IBM Plex Mono',monospace;letter-spacing:.42em;color:rgba(255,255,255,.6);white-space:nowrap;text-shadow:none}
.etc-menu button.dim{opacity:.45}
.etc-menu button[aria-current="true"]{color:#fff;font-weight:800;font-size:clamp(34px,4.8vw,82px);text-shadow:0 0 24px var(--glow),0 2px 0 rgba(0,0,0,.3)}
.etc-menu button[aria-current="true"]::before{color:var(--sel)}
.etc-menu button[aria-current="true"]::after{content:'';position:absolute;left:0;right:-.6em;bottom:-.3em;height:1.5px;background:linear-gradient(90deg,var(--sel),transparent);box-shadow:0 0 8px var(--glow)}
.etc-menu button:focus-visible{outline:0}
.etc-desc{position:absolute;left:8vw;top:calc(69vh + clamp(34px,4.8vw,82px) + 3vh);margin:0;transform-origin:left;transform:rotateY(18deg) rotateZ(-5deg) skewX(-10deg);font:400 clamp(12px,1.1vw,17px) 'Nanum Myeongjo',serif;letter-spacing:.02em;color:rgba(240,246,255,.92);padding:6px 0 6px 14px;border-left:1.5px solid var(--sel)}
.etc-keys{position:absolute;right:5vw;bottom:5vh;margin:0;text-align:right;font:500 clamp(9px,.8vw,12px)/2 'IBM Plex Mono',monospace;letter-spacing:.3em;color:var(--acc);opacity:.9;transform:rotateZ(-4deg) skewX(-10deg)}
.etc-led{position:absolute;left:50%;top:3vh;transform:translateX(-50%) perspective(600px) rotateX(18deg);padding:7px 18px;background:rgba(2,6,20,.88);border:2px solid rgba(160,210,255,.35);border-radius:4px;font:700 clamp(12px,1.15vw,17px) 'Nanum Myeongjo',serif;letter-spacing:.08em;color:var(--led);text-shadow:0 0 8px var(--led);white-space:nowrap;max-width:60vw;overflow:hidden;text-overflow:ellipsis}
.etc-back{position:absolute;left:3vw;top:3vh;padding:6px 14px;border:1px solid rgba(255,255,255,.55);color:#fff;font:400 14px 'Nanum Myeongjo',serif;letter-spacing:.1em;background:rgba(3,12,40,.3);text-decoration:none}
.etc-back:hover,.etc-back:focus-visible{background:rgba(255,255,255,.15);outline:0}
.etc-chip{position:absolute;right:3vw;top:3vh;display:flex;gap:6px;font:600 clamp(10px,.9vw,13px) 'IBM Plex Mono',monospace;letter-spacing:.1em}
.etc-chip span,.etc-chip button{padding:5px 10px;background:rgba(2,6,20,.7);border:1px solid rgba(255,255,255,.25);color:#fff;font:inherit;letter-spacing:inherit;cursor:default}
.etc-chip button{cursor:pointer}.etc-chip button:hover,.etc-chip button:focus-visible{border-color:var(--sel);outline:0}
.etc-chip button[aria-pressed="true"]{color:var(--sel);border-color:var(--sel)}
.etc-fx .etc-sub,.etc-fx .etc-desc,.etc-fx .etc-keys{text-shadow:1px 0 0 rgba(255,40,90,.25),-1px 0 0 rgba(40,220,255,.25),0 0 8px rgba(0,0,0,.25)}
.etc-fx .etc-menu button{text-shadow:1px 0 0 rgba(255,40,90,.28),-1px 0 0 rgba(40,220,255,.28),0 2px 0 rgba(0,0,0,.35),0 0 18px rgba(0,0,0,.35)}
.etc-fx .etc-menu button[aria-current="true"]{text-shadow:1px 0 0 rgba(255,40,90,.3),-1px 0 0 rgba(40,220,255,.3),0 0 24px var(--glow),0 2px 0 rgba(0,0,0,.3)}
.etc-hud{position:absolute;inset:0;pointer-events:none;z-index:2}.etc-hud>*{pointer-events:auto}
.etc.go .etc-hud{opacity:0;transition:opacity .5s}
.etc-flash{z-index:3;position:absolute;inset:0;pointer-events:none;background:#fff8e6;opacity:0;transition:opacity .8s ease-in}
.etc.go .etc-flash{opacity:1}.etc.go .etc-ui{opacity:0;transition:opacity .5s .15s}
@media (max-aspect-ratio:1/1){
  .etc-cam{translate:-64% -50%}
  .etc-sub{left:6vw;top:auto;bottom:53vh;font-size:3.6vw}
  .etc-menu{left:6vw;top:auto;bottom:22vh;flex-direction:column;align-items:flex-start;gap:5.4vh;transform:rotateY(12deg) rotateZ(-4deg) skewX(-8deg)}
  .etc-menu button{font-size:9vw}.etc-menu button[aria-current="true"]{font-size:11.5vw}.etc-menu button::before{font-size:2.4vw}
  .etc-desc{left:6vw;right:6vw;top:auto;bottom:8vh;font-size:13px}
  .etc-keys{display:none}
  .etc-led{left:auto;right:4vw;top:7.5vh;transform:none;font-size:11px;max-width:72vw;padding:5px 10px}
  .etc-chip{right:4vw;top:2.4vh;gap:4px;font-size:10px}.etc-chip span,.etc-chip button{padding:4px 7px}
}
@media (prefers-reduced-motion:reduce){.etc-grain{animation:none}}`;

  const ITEMS = [
    { id: 'songcheon', name: '송천동', en: 'SONGCHEON', station: '송천동', desc: '막차가 닿는 동네를 천천히 구경해요. 가게에 들어가 보고, 사내 PC도 켜 보세요.', go: 'games/songcheon/index.html' },
    { id: 'music', name: '플레이리스트', en: 'PLAYLIST', station: '사내방송실', desc: '정보구출반 사내 방송. 뮤직비디오를 틀어 두고 일해요.', go: '#/music' },
    { id: 'next', name: '???', en: 'NEXT STOP', station: '미정', desc: '아직 공사 중인 역이에요. 곧 문이 열립니다.', go: null }
  ];
  const PAL = {
    dawn: { sky: ['#26386f', '#56649f', '#c597b4', '#ffcc9c'], cloud: '#efdcef', cloudSh: '#9c8fc4', city: '#3d4a86', city2: '#56619c', sea: '#3f4d8f', seaHi: '#ffd9b8', acc: '#ffc9a8', sel: '#ffd9b8', glow: 'rgba(255,200,160,.75)', led: '#ffc9a8', ex: '#0b1035', patch: '#8f8fd8', lights: .45, sunY: 400, sun: 'rgba(255,214,180,.75)' },
    morning: { sky: ['#4aa6ec', '#86cbf6', '#d3eeff', '#fff1d0'], cloud: '#ffffff', cloudSh: '#c3e1f5', city: '#6f9fcf', city2: '#8db6dc', sea: '#3d95d6', seaHi: '#ffffff', acc: '#bdf0ff', sel: '#fff1a8', glow: 'rgba(255,240,160,.8)', led: '#bdf0ff', ex: '#0a2152', patch: '#66b6f7', lights: 0, sunY: 230, sun: 'rgba(255,248,220,.8)' },
    day: { sky: ['#0d7fd8', '#1aa2ec', '#4cc0f4', '#a8e6ff'], cloud: '#ffffff', cloudSh: '#9fd6f5', city: '#1f6fbf', city2: '#3c90d8', sea: '#1477cc', seaHi: '#e9fbff', acc: '#7fe3ff', sel: '#6fe4ff', glow: 'rgba(90,210,255,.85)', led: '#7fe3ff', ex: '#04153d', patch: '#2f8fe8', lights: 0, sunY: 120, sun: 'rgba(220,245,255,.55)' },
    dusk: { sky: ['#5a4fb0', '#c98fcf', '#ffb0a8', '#ffcf8a'], cloud: '#ffe6ee', cloudSh: '#c58fc9', city: '#5a4aa0', city2: '#7a63b8', sea: '#6a5fb8', seaHi: '#ffd2a8', acc: '#ffb3d1', sel: '#ffd1a0', glow: 'rgba(255,170,150,.85)', led: '#ffb3a0', ex: '#0d0a30', patch: '#e08fb8', lights: .5, sunY: 390, sun: 'rgba(255,200,150,.8)' },
    night: { sky: ['#03061a', '#08113a', '#142460', '#22336f'], cloud: '#1a2556', cloudSh: '#121a44', city: '#0a1232', city2: '#0f1840', sea: '#081030', seaHi: '#ffd27a', acc: '#8fb0ff', sel: '#ffd27a', glow: 'rgba(255,200,100,.8)', led: '#ffb347', ex: '#02040f', patch: '#ffcf7a', lights: 1, sunY: 150, sun: 'rgba(240,240,255,.35)' }
  };
  const GRADE = {
    day: { soft: '#ffe0b0', sa: .2, lift: '#06204a', la: .1, bloom: .34, leak: ['rgba(255,190,120,.26)', 'rgba(90,220,255,.22)'], flare: '#fff3d6' },
    morning: { soft: '#fff0c0', sa: .22, lift: '#0a2a5a', la: .08, bloom: .38, leak: ['rgba(255,220,150,.3)', 'rgba(120,220,255,.2)'], flare: '#fff8e0' },
    dawn: { soft: '#ffc0a0', sa: .24, lift: '#1a1050', la: .12, bloom: .36, leak: ['rgba(255,170,140,.3)', 'rgba(150,140,255,.22)'], flare: '#ffd9c0' },
    dusk: { soft: '#ff9a80', sa: .24, lift: '#2a1060', la: .14, bloom: .38, leak: ['rgba(255,140,120,.4)', 'rgba(170,120,255,.3)'], flare: '#ffd2a0' },
    night: { soft: '#4060c0', sa: .18, lift: '#0a1238', la: .08, bloom: .55, leak: ['rgba(255,190,110,.12)', 'rgba(90,130,255,.16)'], flare: '#ffd28a' },
    forest: { soft: '#d8ff80', sa: .22, lift: '#06302a', la: .1, bloom: .4, leak: ['rgba(230,255,140,.4)', 'rgba(60,200,150,.26)'], flare: '#f4ffc0' },
    tunnel: { soft: '#ffb060', sa: .16, lift: '#100800', la: .05, bloom: .6, leak: ['rgba(255,160,70,.14)', 'rgba(120,150,255,.08)'], flare: '#ffb050' }
  };
  const TN = { dawn: '새벽', morning: '아침', day: '한낮', dusk: '노을', night: '밤' }, WN = { clear: '맑음', rain: '비', snow: '눈' }, SN = { city: '도시', bridge: '강 위 다리', suburb: '도시 외곽', forest: '숲', tunnel: '터널' };
  const TIMES = ['dawn', 'morning', 'day', 'dusk', 'night'], WEATHERS = ['clear', 'rain', 'snow'];
  const LOOP = 65300, SEG = [['city', 0, 9500], ['bridge', 9500, 18800], ['suburb', 18800, 28000], ['forest', 28000, 37500], ['suburb', 37500, 46500], ['tunnel', 46500, 55800], ['city', 55800, LOOP]];
  const wrap = x => ((x % LOOP) + LOOP) % LOOP;
  const segAt = x => { const w = wrap(x); return (SEG.find(s => w >= s[1] && w < s[2]) || SEG[0])[0]; };
  const ss = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const wAt = (type, x, Z = 1800) => { const w = wrap(x); let a = 0; for (const [t, s0, e] of SEG) { if (t !== type) continue; for (const o of [-LOOP, 0, LOOP]) a += ss(Math.min((w - s0 - o + Z) / (2 * Z), (e + o + Z - w) / (2 * Z))); } return Math.min(1, a); };
  const TB = [46500, 55800], BB = [9500, 18800];
  const nearB = (wx, list, d) => { const w = wrap(wx); return list.some(b => Math.abs(w - b) < d || Math.abs(w - b - LOOP) < d || Math.abs(w - b + LOOP) < d); };
  const distB = (wx, b) => { const w = wrap(wx); let best = 1e9; for (const o of [-LOOP, 0, LOOP]) { const d = w - (b + o); if (Math.abs(d) < Math.abs(best)) best = d; } return best; };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  const H = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* 광각 왜곡 */
  const CX = 800, CY = 600, K = .12;
  const D = (x, y) => { const dx = (x - CX) / 900, dy = (y - CY) / 900, f = 1 - K * (dx * dx + dy * dy); return [CX + dx * 900 * f, CY + dy * 900 * f]; };
  const pp = (pts, close) => { const p = new Path2D(); for (let i = 0; i < pts.length; i++) { const d = D(pts[i][0], pts[i][1]); if (i) p.lineTo(d[0], d[1]); else p.moveTo(d[0], d[1]); } if (close) p.closePath(); return p; };
  function rr(x, y, w, h, r = 0, n = 24) {
    const pts = [], arc = (cx, cy, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
    const edge = (x0, y0, x1, y1) => { for (let i = 1; i < n; i++) pts.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]); };
    if (r) arc(x + r, y + r, Math.PI); else pts.push([x, y]); edge(x + r, y, x + w - r, y);
    if (r) arc(x + w - r, y + r, -Math.PI / 2); else pts.push([x + w, y]); edge(x + w, y + r, x + w, y + h - r);
    if (r) arc(x + w - r, y + h - r, 0); else pts.push([x + w, y + h]); edge(x + w - r, y + h, x + r, y + h);
    if (r) arc(x + r, y + h - r, Math.PI / 2); else pts.push([x, y + h]); edge(x, y + h - r, x, y + r);
    return pp(pts, 1);
  }
  const quad = (a, b, c, d) => { const pts = []; [[a, b], [b, c], [c, d], [d, a]].forEach(([p, q]) => { for (let i = 0; i < 12; i++) pts.push([p[0] + (q[0] - p[0]) * i / 12, p[1] + (q[1] - p[1]) * i / 12]); }); return pp(pts, 1); };
  const WIN = [[-330, 140, 300, 400], [110, 110, 660, 450], [830, 110, 660, 450], [1550, 140, 300, 400]];
  const STRAPS = [-180, 60, 300, 540, 700, 900, 1060, 1300, 1540, 1780];
  const P2 = s => s instanceof Path2D ? s : new Path2D(s);
  const G = {
    winClip: (() => { const p = new Path2D(); WIN.forEach(w => p.addPath(P2(rr(w[0], w[1], w[2], w[3], 26)))); return p; })(),
    sills: (() => { const p = new Path2D(); WIN.forEach(w => p.addPath(P2(rr(w[0] + 10, w[1] + w[3] - 50, w[2] - 20, 14, 4)))); return p; })(),
    ceil: P2(rr(-500, -200, 2600, 300)), rim: P2(rr(-500, 96, 2600, 6)), lamp: P2(rr(-200, 18, 2000, 14, 7)), rail: P2(rr(-500, 62, 2600, 8, 4)),
    pillar: P2(quad([770, 100], [830, 100], [830, 590], [770, 590])), band: P2(rr(-600, 560, 2800, 40)), bandRim: P2(rr(-600, 558, 2800, 4)),
    seat: P2(rr(-600, 600, 2800, 120, 18)), seatTop: P2(rr(-600, 600, 2800, 6, 3)),
    divs: (() => { const p = new Path2D(); for (let x = -400; x < 2000; x += 250) p.addPath(P2(quad([x, 610], [x + 3, 610], [x + 3, 716], [x, 716]))); return p; })(),
    cush: P2(rr(-600, 718, 2800, 92, 14)), cushEdge: P2(rr(-600, 806, 2800, 16, 6)), under: P2(rr(-600, 822, 2800, 60)), floor: P2(rr(-600, 880, 2800, 220)),
    puddles: (() => { const p = new Path2D(); [180, 620, 1000, 1350].forEach((x, i) => p.addPath(P2(rr(x - 60, 900 + i % 2 * 20, 140 + i * 20, 10, 5)))); return p; })(),
    cloud: P2('M-120 30 Q-110 -10 -70 0 Q-60 -50 -10 -40 Q20 -80 70 -45 Q120 -55 125 -5 Q170 5 150 30 Z'), cloudSh: P2('M-120 30 Q-60 14 0 24 Q70 10 150 30 Z'),
    bird: P2('M-34 0 Q-16 -14 0 2 Q16 -14 34 0 Q16 -6 0 8 Q-16 -6 -34 0Z'),
    truss: P2('M0 -100L22 -100L324 600L302 600ZM300 -100L322 -100L22 600L0 600Z')
  };
  WIN.forEach(w => { (G.frames = G.frames || new Path2D()).addPath(P2(rr(w[0], w[1], w[2], w[3], 26))); });

  /* 소리 (WebAudio로 합성) */
  const SND = {
    ac: null, on: false, g: {},
    init() {
      if (this.ac) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ac = this.ac = new AC(), out = ac.createGain(); out.gain.value = .9; out.connect(ac.destination); this.out = out;
      const noise = (color, sec = 4) => { const b = ac.createBuffer(1, ac.sampleRate * sec, ac.sampleRate), d = b.getChannelData(0); let l = 0, b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (color === 'brown') { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else { b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * .1848) * .18; } } return b; };
      const loop = (buf) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
      const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
      const filt = (type, f, q) => { const n = ac.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; return n; };
      const ir = ac.createBuffer(2, ac.sampleRate * 2.2, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
      const verb = ac.createConvolver(); verb.buffer = ir; const wet = gain(0); verb.connect(wet); wet.connect(out); this.g.wet = wet; this.verb = verb;
      const bus = gain(1); bus.connect(out); bus.connect(verb); this.bus = bus;
      const rum = gain(.0); loop(noise('brown')).connect(filt('lowpass', 170)).connect(rum); rum.connect(bus); this.g.rum = rum;
      const rain = gain(0); loop(noise('pink')).connect(filt('highpass', 1400)).connect(filt('lowpass', 7000)).connect(rain); rain.connect(out); this.g.rain = rain;
      const leaf = gain(0), lfo = ac.createOscillator(), lg = gain(.5); lfo.frequency.value = .5; lfo.connect(lg); lg.connect(leaf.gain); lfo.start();
      loop(noise('pink')).connect(filt('bandpass', 3800, .7)).connect(leaf); this.g.leaf = gain(0); leaf.connect(this.g.leaf); this.g.leaf.connect(out);
      const wind = gain(0); loop(noise('pink')).connect(filt('bandpass', 500, .4)).connect(wind); wind.connect(out); this.g.wind = wind;
    },
    set(name, v, tc = .8) { if (this.ac && this.g[name]) this.g[name].gain.setTargetAtTime(v, this.ac.currentTime, tc); },
    tone(f, t0, dur, vol, type = 'sine', dest) { const ac = this.ac, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .005); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); o.connect(g); g.connect(dest || this.bus); o.start(t0); o.stop(t0 + dur + .05); },
    clack(m = 1) { if (!this.on) return; const t = this.ac.currentTime; this.tone(85, t, .22, .5 * m); this.tone(120, t + .13, .2, .4 * m); this.tone(1900, t, .03, .05 * m, 'square'); this.tone(1700, t + .13, .03, .04 * m, 'square'); },
    clank() { if (!this.on) return; const t = this.ac.currentTime; this.tone(140, t, .35, .18, 'triangle'); this.tone(420, t, .25, .04, 'triangle'); },
    bird() { if (!this.on) return; const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(2400 + Math.random() * 900, t); o.frequency.exponentialRampToValueAtTime(3600 + Math.random() * 800, t + .08); o.frequency.exponentialRampToValueAtTime(2200, t + .16); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + .25); },
    tick() { if (!this.on) return; const t = this.ac.currentTime; this.tone(1320, t, .06, .06, 'triangle', this.out); },
    chime() { if (!this.on) return; const t = this.ac.currentTime; [[784, 0], [659, .45], [523, .9]].forEach(([f, d]) => { this.tone(f, t + d, 1.4, .14, 'sine', this.out); this.tone(f * 2, t + d, .8, .03, 'sine', this.out); }); },
    async enable(v) { this.on = v; try { localStorage.setItem('psi.etc.snd', v ? '1' : '0'); } catch (e) {} if (v) { this.init(); if (this.ac && this.ac.state !== 'running') await this.ac.resume(); this.set('rum', .9, .4); } else if (this.ac) { Object.keys(this.g).forEach(k => this.set(k, 0, .15)); } },
    stop() { if (this.ac) { try { this.ac.close(); } catch (e) {} } this.ac = null; this.g = {}; this.on = false; }
  };

  window.etcTrain = function (root) {
    if (!document.getElementById('etcTrainCss')) { const st = document.createElement('style'); st.id = 'etcTrainCss'; st.textContent = CSS; document.head.append(st); }
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hr = new Date().getHours(), mo = new Date().getMonth() + 1;
    let TM = hr >= 4 && hr < 6 ? 'dawn' : hr < 9 && hr >= 6 ? 'morning' : hr >= 9 && hr < 16 ? 'day' : hr >= 16 && hr < 19 ? 'dusk' : 'night';
    const rw = Math.random(), winter = mo >= 11 || mo <= 3;
    let WX = rw < .6 ? 'clear' : rw < .82 ? 'rain' : winter ? 'snow' : 'rain';
    let sel = 0, OFF = Math.floor(Math.random() * LOOP), T = 0, leaving = false;
    const SPEED = calm ? 160 : 420;

    root.innerHTML = `<div class="etc-cam"><canvas aria-hidden="true"></canvas></div><div class="etc-vig"></div><div class="etc-grain"></div>
      <div class="etc-ui etc-fx">
        <div class="etc-led" aria-hidden="true"></div>
        <p class="etc-sub">잡동사니 칸 · 8호선</p>
        <nav class="etc-menu" aria-label="기타 칸 메뉴">${ITEMS.map((it, i) => `<button type="button" data-i="${i}" data-en="${it.en}"${it.go ? '' : ' class="dim"'} aria-label="${it.name}">${[...it.name].map(c => `<i>${c === ' ' ? '&nbsp;' : c}</i>`).join('')}</button>`).join('')}</nav>
        <p class="etc-desc" aria-live="polite"></p>
        <p class="etc-keys" aria-hidden="true">NAVIGATION ← →<br>CONFIRM ENTER<br>BACK ESC</p>
      </div>
      <div class="etc-hud"><a class="etc-back" href="#/">← 나가기</a>
        <div class="etc-chip"><span class="c-seg"></span><button type="button" class="c-tm" title="시간대 바꾸기"></button><button type="button" class="c-wx" title="날씨 바꾸기"></button><button type="button" class="c-snd" aria-pressed="false" title="소리 켜고 끄기">♪ OFF</button></div></div>
      <div class="etc-flash"></div>`;
    const $ = s => root.querySelector(s), cam = $('.etc-cam'), cv = $('canvas'), ui = $('.etc-ui'), btns = [...root.querySelectorAll('.etc-menu button')];

    // 필름 그레인 텍스처
    { const n = document.createElement('canvas'); n.width = n.height = 160; const x = n.getContext('2d'), im = x.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); $('.etc-grain').style.backgroundImage = `url(${n.toDataURL()})`; }

    /* 캔버스 크기 */
    const ctx = cv.getContext('2d', { alpha: false });
    let fc = 0, S = 1, W = 1600, Hh = 900, small1, small2, sx1, sx2, glassCv = null, trees = [], bushes = [], dropSp, glowSp;
    function resize() {
      const r = cam.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = Math.max(320, Math.min(1280, Math.round(r.width * dpr))); Hh = Math.round(W * 9 / 16); cv.width = W; cv.height = Hh; S = W / 1600;
      small1 = document.createElement('canvas'); small1.width = Math.ceil(W / 8); small1.height = Math.ceil(Hh / 8); sx1 = small1.getContext('2d');
      small2 = document.createElement('canvas'); small2.width = Math.ceil(W / 24); small2.height = Math.ceil(Hh / 24); sx2 = small2.getContext('2d');
      buildSprites();
    }
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * S)); c.height = Math.max(1, Math.ceil(h * S)); const x = c.getContext('2d'); x.scale(S, S); return [c, x]; };
    function leafCluster(x, cx0, cy0, n, seed, lit, sq) {
      for (let m = 0; m < n; m++) { const a = H(seed * 97 + m) * 6.28, d = H(seed * 53 + m) * 70, lx = cx0 + Math.cos(a) * d * 1.4, ly = cy0 + Math.sin(a) * d * .7 * (sq || 1), rot = (H(seed * 3 + m * 11) - .5) * 2.1, L = 9 + H(m * 5 + seed) * 13, up = (cy0 - ly) / 70 + lit * 1.4 + H(seed * 17 + m) * .6 - (TM === 'night' ? .8 : 0);
        x.fillStyle = up > 1.2 ? '#eef78a' : up > .8 ? '#c2e64a' : up > .3 ? '#6fb94a' : up > -.2 ? '#3a8a4a' : '#1f5a3c';
        x.beginPath(); x.ellipse(lx, ly, L, L * .38, rot, 0, 6.3); x.fill(); }
    }
    function buildSprites() {
      const dim = TM === 'night' || WX !== 'clear' ? .3 : 1;
      trees = []; for (let v = 0; v < 14; v++) { const [c, x] = mk(300, 700); const tx = 150; if (H(v + 7) > .35) { x.fillStyle = H(v) > .5 ? '#0d2a20' : '#123426'; x.fillRect(tx - 10, 0, 10 + H(v + 77) * 18, 700); }
        for (let k = 0; k < 2; k++) leafCluster(x, tx + (H(v + k * 3) - .5) * 140, 180 + H(v * 5 + k) * 380, 22, v * 10 + k, H(v * 9 + k) * dim, 1); trees.push(c); }
      bushes = []; for (let v = 0; v < 8; v++) { const [c, x] = mk(300, 160); leafCluster(x, 150, 90, 12, 500 + v, H(v + 3) * dim, .4); bushes.push(c); }
      { const [c, x] = mk(40, 46); const g = x.createLinearGradient(0, 0, 0, 46); const nt = TM === 'night', tn = segAt(OFF + 800) === 'tunnel';
        g.addColorStop(0, nt ? 'rgba(10,16,48,.75)' : tn ? 'rgba(26,20,16,.75)' : 'rgba(42,74,106,.75)'); g.addColorStop(.55, nt ? 'rgba(42,58,112,.45)' : 'rgba(127,168,204,.45)'); g.addColorStop(1, nt ? 'rgba(159,176,224,.7)' : 'rgba(228,244,255,.7)');
        const drop = new Path2D('M20 3 C38 3 40 30 20 45 C0 30 2 3 20 3Z'); x.fillStyle = g; x.fill(drop);
        const rg = x.createRadialGradient(18, 18, 6, 20, 24, 24); rg.addColorStop(.6, 'rgba(2,8,26,0)'); rg.addColorStop(.85, 'rgba(2,8,26,.38)'); rg.addColorStop(1, 'rgba(2,8,26,.6)'); x.fillStyle = rg; x.fill(drop);
        x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.ellipse(13, 13, 5, 3, -.5, 0, 6.3); x.fill();
        x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 2; x.lineCap = 'round'; x.beginPath(); x.moveTo(9, 33); x.quadraticCurveTo(20, 42, 31, 33); x.stroke(); dropSp = c; }
      { const [c, x] = mk(200, 200); const g = x.createRadialGradient(100, 100, 0, 100, 100, 100); g.addColorStop(0, 'rgba(255,190,90,.55)'); g.addColorStop(1, 'rgba(255,170,60,0)'); x.fillStyle = g; x.fillRect(0, 0, 200, 200); glowSp = c; }
      glassCv = null;
      if (WX === 'rain') { const [c, x] = mk(1600, 900);
        const ng = document.createElement('canvas'); ng.width = ng.height = 128; const nx = ng.getContext('2d'), im = nx.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.random() < .5 ? Math.random() * 40 : 0; } nx.putImageData(im, 0, 0);
        x.fillStyle = x.createPattern(ng, 'repeat'); x.globalAlpha = TM === 'night' ? .25 : .35; x.fillRect(0, 0, 1600, 900); x.globalAlpha = 1;
        for (let i = 0; i < 900; i++) { const r = .6 + H(i * 2 + 1) ** 3 * 1.6; x.globalAlpha = .55 + H(i) * .4; x.drawImage(dropSp, -300 + H(i * 5) * 2200 - r, 115 + H(i * 7) * 440 - r, r * 2, r * 2.3); }
        for (let i = 0; i < 300; i++) { const r = 1.3 + H(i * 41) ** 2 * 3.8, dx = -300 + H(i * 43) * 2200, dy = 120 + H(i * 47) * 430; x.globalAlpha = .95; x.drawImage(dropSp, dx - r, dy - r, r * 2, r * 2.3);
          if (TM === 'night' && r > 2.4 && H(i * 59) > .5) { x.fillStyle = 'rgba(255,198,106,.75)'; x.beginPath(); x.arc(dx, dy + r * .4, r * .32, 0, 6.3); x.fill(); } }
        x.globalAlpha = 1; glassCv = c; }
    }

    /* 물리 상태 */
    const ph = { cx: 0, cy: 0, cr: 0, cz: 0, vx: 0, vy: 0, vr: 0, vz: 0, ux: 0, uy: 0, uvx: 0, uvy: 0, px: 0, py: 0, tpx: 0, tpy: 0, nextBump: 1.2, nextJoint: .5 };
    const straps = STRAPS.map((x, i) => ({ x, a: 0, v: 0, k: 7 + (i % 4) * 1.6, c: .9 + (i % 3) * .2 }));
    const letters = btns.map(b => [...b.querySelectorAll('i')].map(el => ({ el, y: 0, vy: 0, r: 0, vr: 0, s: 0, vs: 0 })));
    const pending = [];
    function kickLetters(item, mag, spread = .035) { (item == null ? letters.flat() : letters[item]).forEach((L, j) => pending.push({ at: T + j * spread + Math.random() * .02, L, vy: -mag * (.7 + Math.random() * .6), vr: (Math.random() - .5) * mag * .12, vs: item != null ? mag * .006 : 0 })); }
    function bump(m) { ph.vy += 62 * m; const s = (Math.random() - .5) * 20; ph.vr += s * .04; ph.vz += .02 * m; straps.forEach(sp => sp.v += s * (.6 + Math.random() * .3)); kickLetters(null, 70 * m, .045); SND.clack(.6 + m * .5); }
    function step(dt) {
      T += dt; OFF += SPEED * dt;
      const ax = calm ? 0 : Math.sin(T * 1.1) * 26 + Math.sin(T * 2.7 + 1) * 10, ay = calm ? 0 : Math.sin(T * 9) * 7;
      if (T >= ph.nextBump) { ph.nextBump = T + 1.5 + Math.random() * 2.2; if (!calm) bump(.5 + Math.random() * .5); }
      if (T >= ph.nextJoint) { ph.nextJoint = T + 1.15; if (!calm && Math.random() < .55) SND.clack(.45); }
      ph.vx += (ax - 18 * ph.cx - 5 * ph.vx) * dt; ph.cx += ph.vx * dt; ph.vy += (ay - 70 * ph.cy - 10 * ph.vy) * dt; ph.cy += ph.vy * dt;
      ph.vr += (ax * .004 - 30 * ph.cr - 6 * ph.vr) * dt; ph.cr += ph.vr * dt; ph.vz += (-25 * ph.cz - 7 * ph.vz) * dt; ph.cz += ph.vz * dt;
      ph.uvx += (60 * (ph.cx - ph.ux) - 9 * ph.uvx) * dt; ph.ux += ph.uvx * dt; ph.uvy += (60 * (ph.cy - ph.uy) - 9 * ph.uvy) * dt; ph.uy += ph.uvy * dt;
      ph.px += (ph.tpx - ph.px) * (1 - Math.exp(-dt * 4)); ph.py += (ph.tpy - ph.py) * (1 - Math.exp(-dt * 4));
      straps.forEach(sp => { sp.v += (-sp.k * sp.a - sp.c * sp.v + ax * .12) * dt; sp.a += sp.v * dt; });
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= T) { const p = pending[i]; p.L.vy += p.vy; p.L.vr += p.vr; p.L.vs += p.vs; pending.splice(i, 1); }
      const sway = -ph.vy * .06;
      letters.forEach((arr, k) => arr.forEach((L, j) => { L.vy += (-160 * L.y - 11 * L.vy + sway * (1 + j * .08)) * dt; L.y += L.vy * dt; L.vr += (-140 * L.r - 10 * L.vr + ph.vx * .02) * dt; L.r += L.vr * dt; L.vs += (-170 * L.s - 12 * L.vs) * dt; L.s += L.vs * dt; }));
    }

    /* 그리기 */
    function outside(x) {
      const night = TM === 'night', wet = WX === 'rain', snow = WX === 'snow', over = wet || snow, P = PAL[TM];
      x.fillStyle = grad('sky' + TM, () => { const sky = x.createLinearGradient(0, 0, 0, 900); sky.addColorStop(0, P.sky[0]); sky.addColorStop(.25, P.sky[1]); sky.addColorStop(.42, P.sky[2]); sky.addColorStop(.48, P.sky[3]); return sky; }); x.fillRect(-400, -100, 2400, 1100);
      if (night) { for (let i = 0; i < 120; i++) { if (over) break; x.globalAlpha = .3 + H(i + 40) * .7; x.fillStyle = '#fff'; x.fillRect(-300 + H(i) * 2200, H(i + 500) * 330, 1.6, 1.6); } x.globalAlpha = 1; if (!over) { x.fillStyle = 'rgba(240,240,255,.12)'; x.beginPath(); x.arc(1180, 170, 90, 0, 6.3); x.fill(); x.fillStyle = '#f4f1dc'; x.beginPath(); x.arc(1180, 170, 34, 0, 6.3); x.fill(); } }
      else if (!over) { const g = x.createRadialGradient(360, P.sunY, 0, 360, P.sunY, 220); g.addColorStop(0, P.sun); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(100, P.sunY - 240, 520, 480); }
      const cc = over ? 14 : 9;
      for (let i = 0; i < cc; i++) { const cx = ((-300 + i * (2400 / cc) + H(i) * 90 - OFF * .05) % 2400 + 2400) % 2400 - 400, cy = (over ? 60 : 150) + H(i + 3) * (over ? 140 : 170), sc = (over ? 1.3 : .7) + H(i + 7) * .9;
        x.save(); x.translate(cx, cy); x.scale(sc, sc); x.globalAlpha = night ? .8 : 1; x.fillStyle = over && !night ? '#c3cddd' : P.cloud; x.fill(G.cloud); x.globalAlpha *= .9; x.fillStyle = over && !night ? '#98a6bd' : P.cloudSh; x.fill(G.cloudSh); x.restore(); }
      x.globalAlpha = 1;
      const hz = 420, oS = OFF * .45;
      for (let i = Math.floor((oS - 400) / 36); i < (oS + 2000) / 36; i++) { const sx = i * 36 - oS, wf = wAt('forest', sx + OFF); if (wf > 0 && H(i + 1) < wf * 1.05) { x.fillStyle = H(i) > .5 ? '#0e3027' : '#11372c'; x.fillRect(sx, -100 + (1 - Math.min(1, wf * 1.4)) * 360, 37, 700); if (H(i) > .6) { x.globalAlpha = .6; x.fillStyle = '#2f6655'; x.fillRect(sx + 12, -100, 8, 700); x.globalAlpha = 1; } } }
      for (let i = Math.floor((oS - 400) / 28); i < (oS + 2000) / 28; i++) { const sx = i * 28 - oS, X = sx + OFF, h = H(i), h2 = H(i + 300), w = 12 + h2 * 22;
        const bh = wAt('city', X) * (8 + h * (H(Math.floor(i / 9)) > .4 ? 115 : 40) + 14) + wAt('bridge', X) * (6 + h * 26) + wAt('suburb', X) * (h > .62 ? 5 + h2 * 22 : 0);
        if (bh < 3) continue; x.fillStyle = h2 > .5 ? P.city : P.city2; x.fillRect(sx, hz - bh, w, bh);
        if (P.lights) { x.fillStyle = '#ffe2a0'; x.globalAlpha = P.lights; for (let k = 0; k < bh / 12; k++) if (H(i * 13 + k) > (night ? .3 : .45)) x.fillRect(sx + 3 + H(i * 7 + k) * (w - 7), hz - bh + 4 + H(i * 5 + k) * (bh - 8), 4, 4); x.globalAlpha = 1; } }
      for (let cx = -440; cx < 2040; cx += 40) { if (segAt(cx + OFF) === 'tunnel') continue; const wf = wAt('forest', cx + OFF); x.fillStyle = P.sea; x.fillRect(cx, hz, 41, 300); if (wf > 0) { x.globalAlpha = Math.min(1, wf * 1.3); x.fillStyle = '#173f2e'; x.fillRect(cx, 440 - wf * 10, 41, 300); x.globalAlpha = 1; } }
      x.fillStyle = P.seaHi; { const w0 = Math.floor((OFF - 440) / 40); for (let i = 0; i < 56; i++) { const wi = w0 + i, wx = wi * 40, k = 1 - wAt('forest', wx); if (k > .05 && segAt(wx) !== 'tunnel') { x.globalAlpha = ((over ? .15 : .35) + H(wi * 9) * .4) * k; x.fillRect(wx - OFF + H(wi * 5) * 30, hz + 8 + H(wi * 3) * 130, 10 + H(wi * 7) * 34, 2); } } } x.globalAlpha = 1;
      const bA = Math.max(0, 1 - wAt('forest', OFF + 800, 2600) * 2); if (!night && !over && bA > .02) { x.globalAlpha = bA; x.fillStyle = '#fff'; [[420, 120, 1.4], [1130, 170, 1], [1260, 230, .6]].forEach(([bx, by, k], i) => { x.save(); x.translate(bx + Math.sin(T + i) * 20, by + Math.sin(T * 1.3 + i) * 8); x.scale(k, k * (.7 + .3 * Math.sin(T * 6 + i))); x.fill(G.bird); x.restore(); }); x.globalAlpha = 1; }
      const steel = night ? '#1c2438' : '#4d5f74', rail = night ? '#1c2438' : '#3d4a5c';
      for (let i = Math.floor((OFF - 600) / 60); i < (OFF + 2200) / 60; i++) { const wx = i * 60, sx = wx - OFF, t = segAt(wx), wf = wAt('forest', wx);
        if (wf > .02 && H(i + 9) < wf * 1.6) x.drawImage(bushes[i & 7], sx + H(i + 4) * 40 - 150, 340, 300, 160);
        if (wf > .05 && H(i + 5) < wf * 1.15 - .08) x.drawImage(trees[((i % 14) + 14) % 14], sx + H(i) * 30 - 150, -100, 300, 700);
        if (t === 'tunnel') { x.fillStyle = (i & 1) ? '#221d1a' : '#262019'; x.fillRect(sx, -100, 61, 1100); x.fillStyle = '#3a302a'; x.fillRect(sx, 330, 61, 3); x.fillRect(sx, 350, 61, 2); if (i % 3 === 0) { x.fillStyle = '#171310'; x.fillRect(sx, -100, 4, 1100); } if (i % 6 === 0) { x.drawImage(glowSp, sx - 80, 135, 200, 200); x.fillStyle = '#ffb347'; x.fillRect(sx, 230, 40, 10); } }
        for (const [j, b] of TB.entries()) { const dd = distB(wx, b), d = j === 0 ? -dd : dd; if (d > 0 && d < 2600) { const hh = Math.pow(1 - d / 2600, 1.4) * 470; x.fillStyle = (i & 1) ? '#5e5b55' : '#646059'; x.fillRect(sx, 620 - hh, 61, hh + 100); x.fillStyle = '#3f6b45'; x.fillRect(sx, 600 - hh, 61, 26); x.fillStyle = '#4f8a50'; x.beginPath(); x.ellipse(sx + 30, 600 - hh, 40, 14, 0, 0, 6.3); x.fill(); if (i % 4 === 0) { x.fillStyle = '#4a4741'; x.fillRect(sx, 620 - hh, 3, hh); } }
          if (Math.abs(dd) < 90) { x.fillStyle = '#7d7a73'; x.fillRect(sx, -100, 61, 1100); x.fillStyle = '#3e3b36'; x.fillRect(sx + (j ? 0 : 52), -100, 9, 1100); } }
        if (t === 'bridge') { x.fillStyle = rail; x.fillRect(sx, 498, 61, 7); x.fillRect(sx, 470, 61, 3); if (!(i & 1)) x.fillRect(sx, 470, 4, 30); if (i % 5 === 0 && !nearB(wx, BB, 330)) { x.save(); x.translate(sx, 0); x.fillStyle = steel; x.fill(G.truss); x.fillRect(-10, 120, 340, 16); x.restore(); } }
        if (nearB(wx, BB, 30)) { x.fillStyle = night ? '#22283a' : '#8a8f96'; x.fillRect(sx - 30, 380, 120, 400); x.fillStyle = night ? '#2c3348' : '#a2a7ad'; x.fillRect(sx - 30, 380, 120, 10); x.fillStyle = steel; x.fillRect(sx + 10, -100, 28, 480); }
        if (t !== 'tunnel' && wf < .3 && i % 13 === 0 && !nearB(wx, TB, 2600)) { x.fillStyle = '#2e3a44'; x.fillRect(sx, -100, 10, 800); x.fillRect(sx - 20, 70, 50, 6); } }
      const fw = wAt('forest', OFF + 800, 2600);
      if (fw > 0 && !over && !night) { x.globalAlpha = fw; const g = x.createLinearGradient(0, -100, 400, 700); g.addColorStop(0, 'rgba(246,255,158,.75)'); g.addColorStop(1, 'rgba(246,255,158,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(-200, -100); x.lineTo(300, -100); x.lineTo(700, 700); x.lineTo(100, 700); x.fill(); x.beginPath(); x.moveTo(500, -100); x.lineTo(800, -100); x.lineTo(1200, 700); x.lineTo(850, 700); x.globalAlpha = fw * .7; x.fill();
        x.fillStyle = '#fffbe0'; for (let i = 0; i < 40; i++) { x.globalAlpha = fw * (.5 + .5 * Math.sin(T * 2 + i)); x.fillRect(H(i * 3) * 1600, 100 + H(i * 5) * 420, 2.4, 2.4); } x.globalAlpha = 1; }
      if (night && fw > 0) { x.globalAlpha = fw * .62; x.fillStyle = '#050c22'; x.fillRect(-400, -100, 2400, 1100); x.fillStyle = '#f6ff8a'; for (let i = 0; i < 34; i++) { x.globalAlpha = fw * (.35 + .65 * (Math.sin(T * 3 + i * 1.7) * .5 + .5)); const fx = ((H(i * 7) * 2000 - OFF * .3 + Math.sin(T * 1.7 + i) * 20) % 2000 + 2000) % 2000 - 200, fy = 200 + H(i * 11) * 330 + Math.sin(T * 2.3 + i * 3) * 12; x.beginPath(); x.arc(fx, fy, 1.6 + H(i) * 1.6, 0, 6.3); x.fill(); } x.globalAlpha = 1; }
      if (over) { x.fillStyle = night ? 'rgba(20,26,60,.18)' : 'rgba(140,155,180,.34)'; x.fillRect(-400, -100, 2400, 1100); }
      if (wet) { x.lineCap = 'round'; for (let b = 0; b < 3; b++) { x.strokeStyle = (night ? 'rgba(190,205,255,' : 'rgba(240,248,255,') + (.2 + b * .12) + ')'; x.lineWidth = .5 + b * .25; x.beginPath();
          for (let i = b; i < 520; i += 3) { const L = 18 + H(i * 3) * 46, rx = ((H(i) * 2400 - T * 1300) % 2400 + 2400) % 2400 - 400, ry = ((H(i + 11) * 760 + T * (1500 + H(i * 7) * 600)) % 760) - 80; x.moveTo(rx, ry); x.lineTo(rx - L * .42, ry + L); } x.stroke(); } }
      if (snow) { x.fillStyle = '#fff'; for (let i = 0; i < 220; i++) { const r = 1 + H(i) * 3.4, fx = ((H(i + 3) * 2400 - T * (90 + r * 60)) % 2400 + 2400) % 2400 - 400, fy = ((H(i + 8) * 760 + T * (40 + r * 25)) % 760) - 80; x.globalAlpha = .6 + H(i * 4) * .4; x.beginPath(); x.arc(fx + Math.sin(T * 2 + i) * 6, fy, r, 0, 6.3); x.fill(); } x.globalAlpha = 1; }
      const tw = wAt('tunnel', OFF + 800, 1100);
      if (tw > 0) { x.globalAlpha = tw * .22; x.strokeStyle = '#cfd8ff'; x.lineWidth = 5; [-180, 60, 300, 540, 700, 900, 1060, 1300, 1540].forEach(sx => { x.strokeRect(sx - 20, 300, 40, 40); }); x.fillStyle = '#2a3a7a'; x.fillRect(-400, 420, 2400, 80); x.globalAlpha = 1; }
      // 유리
      if (wet && glassCv) { x.drawImage(glassCv, 0, 0, 1600, 900);
        for (let i = 0; i < 46; i++) { const x0 = -300 + H(i * 13) * 2200, y0 = 120 + H(i * 17) * 200, r = 3.2 + H(i * 19) * 4.2, sp = 18 + H(i * 23) * 70, p = ((T * sp + H(i) * 300) % 340);
          x.strokeStyle = 'rgba(225,240,255,.06)'; x.lineWidth = r * 1.1; x.beginPath(); x.moveTo(x0, y0); for (let k = 1; k <= 10; k++) { const f = k / 10; x.lineTo(x0 - p * .45 * f + Math.sin(f * 9 + i) * 2.4, y0 + p * f); } x.stroke();
          x.drawImage(dropSp, x0 - p * .45 - r, y0 + p - r, r * 2, r * 2.3); if (night && H(i * 3) > .4) { x.fillStyle = 'rgba(255,198,106,.8)'; x.beginPath(); x.arc(x0 - p * .45, y0 + p + r * .35, r * .35, 0, 6.3); x.fill(); } } }
      if (snow) { x.fillStyle = 'rgba(244,248,255,.85)'; WIN.forEach(w => x.fillRect(w[0] + 8, w[1] + w[3] - 30, w[2] - 16, 18)); }
    }
    const GC = {};
    const grad = (key, make) => GC[key] || (GC[key] = make());
    function draw() {
      const P = PAL[TM], night = TM === 'night', wet = WX === 'rain', over = wet || WX === 'snow';
      const c = OFF + 800, fw = wAt('forest', c, 2600), tw = wAt('tunnel', c, 1100), bw = wAt('bridge', c, 2600), sw = wAt('suburb', c, 2600), lampA = night || over ? 1 : ss(tw / .5), glowA = night ? 1 : ss(tw / .5);
      const eg = (() => { const d = distB(c, 55800); return d > -900 && d < 1600 ? (d < 0 ? ss((d + 900) / 900) : 1 - ss(d / 1600)) : 0; })();
      const x = ctx; x.setTransform(S, 0, 0, S, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      x.fillStyle = grad('wall', () => { const wg = x.createLinearGradient(0, 0, 0, 900); wg.addColorStop(0, '#061638'); wg.addColorStop(.35, '#0b2a63'); wg.addColorStop(1, '#123a80'); return wg; }); x.fillRect(0, 0, 1600, 900);
      x.save(); x.clip(G.winClip); outside(x); x.restore();
      x.strokeStyle = 'rgba(207,234,255,.9)'; x.lineWidth = 9; x.stroke(G.frames); x.fillStyle = 'rgba(207,234,255,.5)'; x.fill(G.sills);
      x.fillStyle = '#061638'; x.fill(G.ceil); x.fillStyle = 'rgba(127,211,255,.5)'; x.fill(G.rim); if (lampA > .01) { x.globalAlpha = lampA; x.fillStyle = '#fff8e6'; x.fill(G.lamp); x.globalAlpha = 1; } x.fillStyle = 'rgba(207,234,255,.85)'; x.fill(G.rail);
      straps.forEach(st => { const s2 = Math.sin(st.a * .06) * 46; x.fillStyle = 'rgba(207,234,255,.8)'; x.fill(P2(quad([st.x - 3, 66], [st.x + 3, 66], [st.x + 3 + s2, 108], [st.x - 3 + s2, 108]))); x.strokeStyle = '#cfeaff'; x.lineWidth = 6; x.stroke(P2(rr(st.x - 22 + s2 * 1.05, 106 - Math.abs(s2) * .08, 44, 46, 12, 6))); });
      x.fillStyle = '#0b2a63'; x.fill(G.pillar); x.fillStyle = '#123a80'; x.fill(G.band); x.fillStyle = 'rgba(127,211,255,.6)'; x.fill(G.bandRim);
      x.fillStyle = '#0a1d48'; x.fill(G.seat); x.fillStyle = 'rgba(6,22,56,.6)'; x.fill(G.divs);
      x.fillStyle = '#0f2a62'; x.fill(G.cush); x.fillStyle = 'rgba(127,211,255,.25)'; x.fill(G.cushEdge); x.fillStyle = '#061638'; x.fill(G.under);
      x.fillStyle = grad('floor', () => { const fg = x.createLinearGradient(0, 880, 0, 1000); fg.addColorStop(0, '#1d5fb8'); fg.addColorStop(1, '#061638'); return fg; }); x.fill(G.floor);
      if (wet) { x.fillStyle = 'rgba(127,211,255,.3)'; x.fill(G.puddles); }
      const pc = (() => { let c = hex(P.patch); if (!night) c = mixc(c, [255, 211, 138], sw * .9); return mixc(c, [214, 240, 112], fw); })(), pOp = Math.max(0, 1 - tw) * (over ? .18 : night ? .45 : 1);
      if (pOp > .01) { x.fillStyle = `rgb(${pc[0] | 0},${pc[1] | 0},${pc[2] | 0})`; const shp = (OFF * .35) % 1000;
        for (let k = -1; k < 3; k++) [[190, 470, 1], [690, 470, .9]].forEach(([px, w, o]) => { px += shp - 500 + k * 1000; if (px > 1800 || px + w < -300) return;
          x.globalAlpha = .42 * o * pOp; x.fill(quad([px, 640], [px + w, 640], [px + w - 40, 714], [px - 40, 714])); x.globalAlpha = .65 * o * pOp; x.fill(quad([px - 50, 728], [px + w - 50, 728], [px + w - 110, 804], [px - 110, 804])); x.globalAlpha = .32 * o * pOp; x.fill(quad([px - 160, 905], [px + w - 160, 905], [px + w - 260, 1010], [px - 260, 1010])); }); x.globalAlpha = 1; }
      if (fw > 0 && !over && !night) { x.fillStyle = '#e8ff8a'; for (let i = 0; i < 46; i++) { const ex = ((H(i) * 1900 - OFF * .9) % 1900 + 1900) % 1900 - 150, ey = 620 + H(i * 3) * 300, r = 10 + H(i * 7) * 28; x.globalAlpha = fw * (.25 + H(i * 5) * .45); x.beginPath(); x.ellipse(ex, ey, r, r * .5, 0, 0, 6.3); x.fill(); } x.globalAlpha = 1; }
      if (bw > 0) { x.fillStyle = '#020a1e'; for (let k = Math.floor((OFF - 300) / 300); k < (OFF + 1900) / 300; k++) { const wx = k * 300; if (segAt(wx) !== 'bridge' || nearB(wx, BB, 330)) continue; const bx = wx - OFF + 30, e = ss((bx + 60) / 160) * ss((1820 - bx) / 170); if (e <= .01) continue;
          x.globalAlpha = bw * (over ? .15 : .35) * e; x.fill(quad([bx, 100], [bx + 60, 100], [bx - 160, 900], [bx - 220, 900])); x.fill(quad([bx + 190, 100], [bx + 250, 100], [bx + 30, 900], [bx - 30, 900])); } x.globalAlpha = 1; }
      if (tw > 0) { for (let k = Math.floor((OFF - 500) / 360); k < (OFF + 2000) / 360; k++) { const wl = k * 360; if (segAt(wl) !== 'tunnel') continue; const lx = wl - OFF + 20, e = ss((lx + 320) / 320) * ss((1920 - lx) / 320);
          x.globalAlpha = tw * .35 * e; x.drawImage(glowSp, lx - 300, 620, 600, 120); x.globalAlpha = tw * .25 * e; x.drawImage(glowSp, lx - 420, 730, 600, 90); } x.globalAlpha = 1; }
      if (!night && !over && tw < 1) { const bg = x.createLinearGradient(0, 100, 900, 900); bg.addColorStop(0, 'rgba(255,255,255,.22)'); bg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = bg; x.globalAlpha = .5 * (1 - tw); x.beginPath(); x.moveTo(200, 100); x.lineTo(760, 100); x.lineTo(560, 900); x.lineTo(-200, 900); x.fill(); x.globalAlpha = .4 * (1 - tw); x.beginPath(); x.moveTo(900, 100); x.lineTo(1460, 100); x.lineTo(1300, 900); x.lineTo(520, 900); x.fill(); x.globalAlpha = 1; }
      if (glowA > .01) { x.globalCompositeOperation = 'screen'; x.globalAlpha = glowA; [130, 470, 1010, 1300].forEach(lx => { const g = x.createRadialGradient(lx, 760, 0, lx, 760, 260); g.addColorStop(0, 'rgba(207,224,255,.16)'); g.addColorStop(1, 'rgba(207,224,255,0)'); x.fillStyle = g; x.fillRect(lx - 260, 640, 520, 240); });
        const lg = x.createLinearGradient(0, 0, 0, 160); lg.addColorStop(0, 'rgba(255,246,224,.35)'); lg.addColorStop(1, 'rgba(255,246,224,0)'); x.fillStyle = lg; x.fillRect(0, 0, 1600, 160); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      if (tw > 0) { x.fillStyle = '#0a0602'; x.globalAlpha = tw * .3; x.fillRect(0, 0, 1600, 900); x.globalAlpha = 1; }
      if (fw > 0) { x.globalCompositeOperation = 'soft-light'; x.fillStyle = 'rgb(120,210,70)'; x.globalAlpha = fw * (night ? .06 : .18); x.fillRect(0, 0, 1600, 900); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      if (sw > 0 && !night && !over) { x.globalCompositeOperation = 'soft-light'; x.fillStyle = '#ffbe6e'; x.globalAlpha = sw * .1; x.fillRect(0, 0, 1600, 900); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; }
      if (night) { x.fillStyle = 'rgba(2,4,15,.12)'; x.fillRect(0, 0, 1600, 900); }
      x.fillStyle = fw > .4 ? '#f4ffb0' : '#bff0ff'; for (let i = 0; i < 60; i++) { x.globalAlpha = (.3 + H(i * 6) * .6) * (1 - tw * .8) * (over ? .4 : 1); x.fillRect((H(i * 2) * 1600 + T * 20) % 1600, 120 + H(i * 4) * 760 + Math.sin(T + i) * 6, 2 + H(i) * 2, 2 + H(i) * 2); } x.globalAlpha = 1;
      // 앞쪽 기둥(초점 흐림)
      x.fillStyle = grad('pole', () => { const pg = x.createLinearGradient(1405, 0, 1495, 0); pg.addColorStop(0, 'rgba(207,234,255,0)'); pg.addColorStop(.35, 'rgba(207,234,255,.8)'); pg.addColorStop(.5, 'rgba(255,255,255,.95)'); pg.addColorStop(.65, 'rgba(207,234,255,.8)'); pg.addColorStop(1, 'rgba(207,234,255,0)'); return pg; }); x.fillRect(1405, -50, 90, 1000);
      // 색보정 · 블룸 · 플레어 · 빛샘
      const wT = tw, wF = night ? 0 : fw * (1 - tw), wB = Math.max(0, 1 - wT - wF), baseG = GRADE[night ? 'night' : TM];
      const mixG = [[baseG, wB], [GRADE.forest, wF], [GRADE.tunnel, wT]].filter(m => m[1] > .003), bloomK = mixG.reduce((a, m) => a + m[0].bloom * m[1], 0);
      mixG.forEach(([g, w]) => { x.globalCompositeOperation = 'soft-light'; x.globalAlpha = g.sa * w; x.fillStyle = g.soft; x.fillRect(0, 0, 1600, 900); x.globalCompositeOperation = 'screen'; x.globalAlpha = g.la * w; x.fillStyle = g.lift; x.fillRect(0, 0, 1600, 900); });
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
      if ((fc++ & 1) === 0) { sx1.globalCompositeOperation = 'source-over'; sx1.drawImage(cv, 0, 0, small1.width, small1.height); sx1.globalCompositeOperation = 'multiply'; sx1.drawImage(small1, 0, 0); sx1.drawImage(small1, 0, 0);
      sx2.globalCompositeOperation = 'source-over'; sx2.drawImage(small1, 0, 0, small2.width, small2.height); }
      x.globalCompositeOperation = 'screen'; x.globalAlpha = bloomK; x.drawImage(small2, 0, 0, W, Hh); x.globalAlpha = bloomK * .7; x.drawImage(small1, 0, 0, W, Hh);
      x.setTransform(S, 0, 0, S, 0, 0); x.globalAlpha = 1;
      const flare = (fx, fy, col, A, ghosts) => { const dx = 800 - fx, dy = 450 - fy; const sg = x.createLinearGradient(fx - 700, 0, fx + 700, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, col); sg.addColorStop(1, 'rgba(255,255,255,0)'); x.globalAlpha = .55 * A; x.fillStyle = sg; x.fillRect(fx - 700, fy - 2, 1400, 4);
        if (ghosts) [[.45, 26, .3], [.8, 60, .18], [1.15, 18, .35], [1.5, 110, .12], [1.8, 40, .22]].forEach(([k, r, o]) => { const gx = fx + dx * k, gy = fy + dy * k, g = x.createRadialGradient(gx, gy, r * .6, gx, gy, r); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.85, col); g.addColorStop(1, 'rgba(255,255,255,0)'); x.globalAlpha = o * A; x.fillStyle = g; x.fillRect(gx - r, gy - r, r * 2, r * 2); }); x.globalAlpha = 1; };
      const sf = !over && !night ? Math.max(0, Math.min(1, 1 - tw * 3.3)) : 0;
      if (sf > .01) flare(360, TM === 'dusk' || TM === 'dawn' ? P.sunY : 160, baseG.flare, sf, true);
      if (tw > .05) for (let k = Math.floor((OFF - 500) / 360); k < (OFF + 2000) / 360; k++) { const wl = k * 360; if (segAt(wl) !== 'tunnel') continue; const lx = wl - OFF + 20, e = ss((lx + 100) / 200) * ss((1700 - lx) / 200), near = Math.max(0, 1 - Math.abs(lx - 700) / 420); if (e > .01) flare(lx, 235, GRADE.tunnel.flare, tw * e * (.35 + .65 * near), near > .05); }
      mixG.forEach(([g, w]) => { [[-40 + Math.sin(T * .7) * 40, 170, 420, g.leak[0]], [1660, 780 + Math.sin(T * .5) * 30, 460, g.leak[1]]].forEach(([lx, ly, r, col]) => { const gr = x.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = w; x.fillStyle = gr; x.fillRect(lx - r, ly - r, r * 2, r * 2); }); }); x.globalAlpha = 1;
      if (eg > 0) { x.globalAlpha = eg * eg * .55; x.fillStyle = '#fffaf0'; x.fillRect(0, 0, 1600, 900); x.globalAlpha = 1; }
      x.globalCompositeOperation = 'source-over';
      // 카메라·글씨
      cam.style.transform = `translate(${(ph.cx * 1.2).toFixed(2)}px,${(ph.cy * .9).toFixed(2)}px) rotate(${(ph.cr * 1.4).toFixed(3)}deg) scale(${(1.04 + ph.cz * 2).toFixed(4)})`;
      ui.style.transform = `translate(${(-ph.ux * .5 + ph.px * 10).toFixed(2)}px,${(-ph.uy * .4 + ph.py * 6).toFixed(2)}px)`;
      letters.forEach(arr => arr.forEach(L => { L.el.style.transform = `translateY(${L.y.toFixed(2)}px) rotate(${L.r.toFixed(2)}deg) scale(${(1 + L.s).toFixed(3)})`; }));
      // 소리
      if (SND.on && SND.ac) { SND.set('rum', .7 + tw * 1.1, .6); SND.set('wet', tw * .55, .5); SND.set('rain', wet ? .32 - tw * .26 : 0, 1); SND.set('wind', WX === 'snow' ? .12 : 0, 1); SND.set('leaf', fw * .5, 1); }
      return { seg: segAt(c), fw, bw, tw };
    }

    /* 메뉴 */
    const led = $('.etc-led'), desc = $('.etc-desc');
    function pick(i, quiet) {
      sel = (i + ITEMS.length) % ITEMS.length; const it = ITEMS[sel];
      btns.forEach((b, k) => b.setAttribute('aria-current', String(k === sel)));
      desc.textContent = it.desc; led.textContent = `이번 역은 ${it.station} 역입니다 · NEXT STOP ${it.en}`;
      if (!quiet) { kickLetters(sel, 260, .03); SND.tick(); }
    }
    function board(i) {
      const it = ITEMS[i]; if (leaving) return;
      if (!it.go) { if (window.toast) window.toast('아직 공사 중인 역이에요. 곧 열려요.'); kickLetters(i, 420, .02); bump(1.3); return; }
      leaving = true; led.textContent = `${it.station} 역에 도착합니다 · 문이 열립니다`; SND.chime(); bump(1.6); root.classList.add('go');
      setTimeout(() => { if (it.go.startsWith('#')) location.hash = it.go; else location.href = it.go; }, 900);
    }
    btns.forEach(b => { const i = +b.dataset.i;
      b.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && sel !== i) pick(i); });
      b.addEventListener('click', e => { if (sel !== i && e.pointerType === 'touch') { pick(i); return; } if (sel !== i) pick(i, true); board(i); }); });
    window.onkeydown = e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return; const k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'd' || k === 'D') { e.preventDefault(); pick(sel + 1); }
      else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'a' || k === 'A') { e.preventDefault(); pick(sel - 1); }
      else if (k === 'Enter' || k === ' ' || k === 'f' || k === 'F') { e.preventDefault(); board(sel); }
      else if (k === 'Escape') location.hash = '#/';
    };
    root.addEventListener('pointermove', e => { const r = root.getBoundingClientRect(); ph.tpx = (e.clientX - r.left) / r.width - .5; ph.tpy = (e.clientY - r.top) / r.height - .5; });

    /* 칩: 시간대·날씨·소리 */
    const cTm = $('.c-tm'), cWx = $('.c-wx'), cSnd = $('.c-snd'), cSeg = $('.c-seg');
    function applyLook() {
      const P = PAL[TM]; root.style.setProperty('--acc', P.acc); root.style.setProperty('--sel', P.sel); root.style.setProperty('--glow', P.glow); root.style.setProperty('--led', P.led); root.style.setProperty('--ex', P.ex);
      cTm.textContent = TN[TM]; cWx.textContent = WN[WX]; buildSprites();
    }
    cTm.onclick = () => { TM = TIMES[(TIMES.indexOf(TM) + 1) % TIMES.length]; applyLook(); SND.tick(); };
    cWx.onclick = () => { WX = WEATHERS[(WEATHERS.indexOf(WX) + 1) % WEATHERS.length]; applyLook(); SND.tick(); };
    const setSndUi = () => { cSnd.textContent = SND.on ? '♪ ON' : '♪ OFF'; cSnd.setAttribute('aria-pressed', String(SND.on)); };
    cSnd.onclick = async () => { await SND.enable(!SND.on); setSndUi(); };
    let wantSnd = false; try { wantSnd = localStorage.getItem('psi.etc.snd') === '1'; } catch (e) {}
    if (wantSnd) { const go = async () => { root.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go, true); if (!SND.on && document.body.contains(root)) { await SND.enable(true); setSndUi(); } }; root.addEventListener('pointerdown', go); window.addEventListener('keydown', go, true); }

    resize(); applyLook(); pick(0, true); setSndUi();
    let ro = null; if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(cam); }
    let last = 0, segShown = '', lastBird = 0, lastClank = 0;
    (function frame(now) {
      if (!document.body.contains(root)) { SND.stop(); if (ro) ro.disconnect(); return; }
      const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
      if (dt > 0) { const n = Math.ceil(dt / (1 / 120)); for (let k = 0; k < n; k++) step(dt / n); }
      const st = draw();
      if (st.seg !== segShown) { segShown = st.seg; cSeg.textContent = SN[st.seg]; }
      if (SND.on && st.fw > .5 && T - lastBird > 2 + Math.random() * 6) { lastBird = T; SND.bird(); }
      if (SND.on && st.bw > .5 && T - lastClank > .42) { lastClank = T; SND.clank(); }
      requestAnimationFrame(frame);
    })(0);
  };
})();
