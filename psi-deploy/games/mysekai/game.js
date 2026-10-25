// 마이세카이 — 3인칭으로 돌아다니며 낚시·농사·요리·수집하는 정보구출반의 작은 세계
import * as THREE from 'three';
import { GLTFLoader } from './lib/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from './lib/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/jsm/postprocessing/OutputPass.js';
import { buildWorld } from './world.js';
import { FISH as PFISH, startPond, fishCanvas } from './fishing.js';
import { buildAquarium, buildCellar } from './interiors.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TOUCH = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const LOW = TOUCH || (navigator.hardwareConcurrency || 8) <= 4;
const lbar = p => { $('#lbar').style.width = (p * 100) + '%'; };

// ================= 렌더러 =================
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, .1, 320);
const fitFov = () => { const a = innerWidth / innerHeight; cam.fov = a < 1 ? Math.min(68, 45 / Math.max(.6, a) * .9) : 45; cam.aspect = a; cam.updateProjectionMatrix(); }; fitFov();
let composer = null;
let rpass = null, curScene = scene;
if (!LOW) { composer = new EffectComposer(renderer); composer.addPass(rpass = new RenderPass(scene, cam)); composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .32, .55, .86)); composer.addPass(new OutputPass()); }
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitFov(); composer && composer.setSize(innerWidth, innerHeight); });

// ================= 저장 =================
const KEY = 'psi.mysekai.v1';
const NEW = () => ({ v: 1, coins: 300, inv: { '물': 2, '밀 씨앗': 3, '토마토 씨앗': 2 }, day: 1, h: 17, dex: {}, aqua: {}, gacha: {}, decor: {}, freeGacha: 0, quests: null, letters: [], friend: {}, plots: [null, null, null, null],
  rod: 1, shaken: {}, mined: {}, honeyAt: -99, buskAt: -99, petDay: 0, cellarDay: 0, photos: [], pos: [.2, 12.6], ry: Math.PI, mainDone: false, stats: {} });
let S;
try { S = Object.assign(NEW(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { S = NEW(); }
const save = () => { try { S.pos = [P.pos.x, P.pos.z]; S.ry = P.root.rotation.y; localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
const T = () => S.day * 24 + S.h;   // 누적 게임 시각

// ================= 데이터 =================
const ITEMS = {
  '물': ['💧', 2, '우물에서 길어 온 맑은 물'], '밀': ['🌾', 12, '방앗간에서 밀가루로'], '밀가루': ['🥣', 30, '빵·피자 재료'], '토마토': ['🍅', 25, '새콤한 텃밭 토마토'], '당근': ['🥕', 20, '아삭한 당근'], '양배추': ['🥬', 22, '동글동글 양배추'],
  '사과': ['🍎', 18, '나무를 흔들면 가끔 떨어짐'], '나뭇가지': ['🪵', 4, '나무를 흔들어 얻음 · 제작 재료'], '돌': ['🪨', 5, '바위에서 캠 · 제작 재료'], '꿀': ['🍯', 60, '벌통에서 모은 꿀'],
  '빵': ['🍞', 90, '화덕에서 갓 구운 빵'], '토마토 피자': ['🍕', 160, '토마토가 듬뿍'], '사과파이': ['🥧', 150, '달콤한 사과파이'], '꿀빵': ['🍯', 200, '꿀을 바른 빵'], '생선구이': ['🍢', 70, '모닥불에 구운 생선'], '구운 마시멜로': ['🍡', 40, '겉은 바삭 속은 말랑'],
  '마시멜로': ['☁️', 10, '잡화점에서 팔아요'], '새모이': ['🌰', 8, '새집에 넣어 주기'], '깃털': ['🪶', 45, '새가 두고 간 선물'], '이상현상 조각': ['🔮', 220, '지하실에서 주운 이상한 조각'],
  '밀 씨앗': ['🌱', 6, '심으면 밀'], '토마토 씨앗': ['🌱', 10, '심으면 토마토'], '당근 씨앗': ['🌱', 8, '심으면 당근'], '양배추 씨앗': ['🌱', 9, '심으면 양배추']
};
// 물고기는 송천동 숲 연못 물고기 그대로 (이름, 아이콘, 희귀도, 값, 설명)
const fishEmo = f => f.shape === 'shark' ? '🦈' : f.shape === 'whale' ? '🐋' : f.shape === 'eel' ? '🐍' : f.shape === 'jelly' ? '🪼' : f.shape === 'ray' ? '🍃' : f.r >= 3 ? '🐠' : '🐟';
const FISH = PFISH.map(f => [f.name, fishEmo(f), f.r, [0, 20, 45, 90, 260, 700][f.r], f.desc, 0, f]);
// 예전 버전에서 잡아 둔 물고기 (팔기용)
const OLD_FISH = [['송사리', '🐟', 1, 10, ''], ['붕어', '🐟', 1, 25, ''], ['피라미', '🐟', 1, 20, ''], ['잉어', '🐠', 2, 55, ''], ['메기', '🐟', 2, 70, ''], ['무지개송어', '🐠', 2, 90, ''], ['가재', '🦞', 2, 60, ''], ['민물새우', '🦐', 1, 30, ''], ['금붕어', '🐠', 2, 80, ''], ['뱀장어', '🐍', 3, 150, ''], ['황금잉어', '✨', 4, 500, ''], ['이상현상 물고기', '👁️', 4, 777, ''], ['낡은 장화', '👢', 0, 1, ''], ['빈 캔', '🥫', 0, 1, '']];
const GACHA = [
  ['☕', '컴포즈 커피 컵', '장세진 대리의 최애 · 리필은 셀프', 1], ['🍜', '짜장면 미니어처', '차강면 차장 추천^^', 1], ['💾', 'Ctrl+S 키캡', '안경수 대리: 저장하게나, 허허', 1], ['📋', '오탈자 없는 보고서', '이미리 과장 검수 완료', 2],
  ['📣', '굿잡 확성기', '유모자 팀장: oh my ong!', 1], ['☕', '부서진 머그 조각', '에스키모가 또… Извините (죄송합니다)', 1], ['🪪', '정보구출반 사원증', '목에 거는 시늉도 가능', 1], ['📱', '주운 핸드폰 키링', '대롱대롱', 2],
  ['🎫', '송천동행 막차표', '탑승은 자유, 하차는 신중히', 2], ['🔦', '이상현상 탐지기', '삐빅… 이상 없음(이상 있음)', 2], ['🌉', '8번다리 스노우볼', '흔들면 안개가 낀다', 3], ['🧸', '싸이 인형', '말랑말랑 · 아주 희귀', 4]];
const CRAFT = [['🪑', '나무 의자', { '나뭇가지': 4 }], ['🪴', '돌 화분', { '돌': 3, '나뭇가지': 1 }], ['🏮', '종이 등불', { '나뭇가지': 2, '돌': 1, '꿀': 1 }], ['🌰', '새모이', { '밀': 1 }, true]];
const CROPS = { '밀 씨앗': ['밀', 3, 2.5], '토마토 씨앗': ['토마토', 2, 4], '당근 씨앗': ['당근', 2, 3], '양배추 씨앗': ['양배추', 2, 3.5] };   // 수확물, 개수, 자라는 시간(게임 시간)
const QPOOL = [['water', '우물에서 물 3번 긷기', 3, 80], ['fish', '물고기 2마리 낚기', 2, 150], ['bake', '화덕에서 요리 1번', 1, 140], ['pet', '고양이 쓰다듬기', 1, 60], ['harvest', '작물 3개 수확', 3, 120], ['sell', '잡화점에서 5개 팔기', 5, 100],
  ['shake', '나무 4번 흔들기', 4, 70], ['mine', '돌 3개 캐기', 3, 70], ['talk', '친구 3명과 이야기', 3, 90], ['photo', '사진 1장 찍기', 1, 60], ['honey', '꿀 모으기', 1, 80], ['busk', '버스킹 1번', 1, 100]];
const NPCS = [
  { id: 'imiri', name: '이미리', c: '#d8c8f0', at: [-4.8, 4.8], lines: ['…노을, 지금이 제일 예뻐요.', '보고서는 근거가 있어야 해요. 낚시도요.', '네. …공유 씨도 잠깐 쉬어요.', '그 물고기, 도감에 제대로 기록했어요?'] },
  { id: 'sejin', name: '장세진', c: '#bfe8d0', at: [4.6, 2.6], lines: ['ㅋㅋ 공유야 연못 봐봐 나 완벽조각남 비친다~', '컴포즈 가고 싶다… 여긴 왜 카페가 없어ㅎㅎ', '일은 내일의 내가 할 거야~', '캡슐 뽑기 했어? 나 또 컵 나왔어ㅋㅋ'] },
  { id: 'gyeongsu', name: '안경수', c: '#e8d8b8', at: [7.2, -12], lines: ['허허, 전망대 바람이 좋구먼.', '저장은 자주 하게나. 텐트에서 잘 수 있다네.', '젊을 때 많이 걸어 두게나, 허허.', '별 보러 밤에 다시 오게나.'] },
  { id: 'gangmyeon', name: '차강면', c: '#ffd0a8', at: [13, 3.4], lines: ['화덕에서 짜장면도 되면 좋을 텐데요^^', '오늘 저녁은 짜장면 어때요^^88', '빵 굽는 냄새 좋죠^^', '밀가루는 방앗간에서 만들어요^^'] },
  { id: 'yumoja', name: '유모자', c: '#fff0a0', at: [3, 12.2], lines: ['oh my ong! 공유 씨, good morning이에요!', '게시판에 quest 붙었어요. 오늘도 fighting!', 'team spirit이 제일 important해요!', '회식은 모닥불에서 할까요? very good!'] },
  { id: 'eskimo', name: '에스키모', c: '#c8e0f8', at: [-7.6, -5.2], lines: ['Привет. (안녕)', '…공방 망치, 또 부러뜨렸다. Извините. (미안)', 'Рыба… (물고기) 좋아.', 'Да. (응) 같이 걷자.'] }];
const LETTERS = [['이미리', '공유 씨, 아쿠아리움 물고기 기록 잘 보고 있어요. 오탈자는 없더군요. …수고했어요.'], ['장세진', '공유야ㅋㅋ 캡슐 뽑기에서 싸이 인형 나오면 나 줘~ 대신 커피 살게ㅎㅎ'], ['안경수', '허허, 오늘도 저장은 했는가? 텐트에서 한숨 자고 가게나.'],
  ['차강면', '공유 씨^^ 화덕 옆에서 기다릴게요. 빵 구우면 하나만 주세요^^88'], ['유모자', 'Dear 공유 씨! 오늘 quest 다 하면 very very good입니다! oh my ong!'], ['에스키모', 'Спасибо. (고마워) 어제 같이 낚시. 재밌었다.'], ['엄마', '우리 공유야 밥은 먹었니? 거기 공기 좋다며 푹 쉬다 와라 엄마가'],
  ['???', '지하실 문은… 밤에 열지 마세요. — 정보구출반 아님'], ['이미리', '내일 비 소식은 없어요. 근거: 하늘.'], ['장세진', '해먹 최고야ㅋㅋ 나 거기서 30분 잤어 비밀~']];
const BOOK = ['「정보구출반은 야근 수당을 이상현상으로 분류하지 않습니다.」', '「점심 메뉴 투표 결과: 늘 하던 대로 새콤.」', '「분실물 안내: 어제의 의욕을 찾습니다.」', '「오늘의 능력 사용 지침: 쓸데없이, 하지만 성실하게.」',
  '「퇴근은 결재 사항입니다 — 결재선을 확인해 주세요.」', '「송천동행 막차가 정시에 도착했습니다. 탑승 여부는 개인 판단.」', '「정보구출반 회의실은 늘 예약 중입니다. 유령 예약 의심.」', '「이상현상 접수 건수, 오늘도 정상(이상) 범위.」'];
const TRAVEL = [['🏠', '오두막 앞', [1, 1.6]], ['🌱', '텃밭', [20.2, 9]], ['🎣', '호숫가 선착장', [-20.5, 8.6]], ['🐟', '아쿠아리움', [-1, -12.6]], ['🔭', '전망대', [8.5, -11.9]], ['🌾', '풍차 방앗간', [9.6, -6.4]], ['📖', '정자', [-6.5, -9.6]], ['🎸', '버스킹 무대', [-12.6, -10]], ['🪧', '처음 자리', [.2, 12.6]]];
const REACH = { '아쿠아리움': [-1, -13.4, 1.6], '전망대': [8.5, -11.9, 1.5], '오두막': [.9, 1, 1.6], '풍차 방앗간': [10.1, -7.2, 1.8], '공방': [-8.2, -6.2, 1.8], '전망대': [8.5, -12.4, 1.4], '정자': [-6.5, -10.5, 1.6], '버스킹 무대': [-13.4, -10.6, 1.8], '화덕': [14.5, 2.7, 1.6],
  '텃밭': [20.2, 4.6, 2.6], '작업대': [15.4, 6.4, 1.6], '벌통': [29.6, 10.7, 1.6], '선착장': [-20.5, 4, 1.8], '모닥불': [-15.2, 6.5, 1.6], '텐트': [-14.2, 3.9, 1.6], '지하실': [2.6, -7.2, 1.6], '퀘스트 게시판': [4.6, 11.6, 1.6],
  '잡화점': [-8, 8.4, 1.7], '포토 스팟': [10.6, 3.2, 1.7], '해먹': [10.7, 10.3, 1.8], '피크닉': [-4.2, 5.6, 1.8], '우물': [-7.2, -.2, 1.6] };

// ================= 화면 (HUD) =================
const ui = $('#ui');
ui.innerHTML = `<div class="vig" id="vig"></div>
<div class="top"><div class="place"><span class="ic" id="pic">🌅</span><span><b id="pname">마이세카이</b><small id="ptime"></small></span></div><div class="pill"><i>₩</i><span id="coins">0</span></div></div>
<div class="quest" id="qhud"></div>
<div class="mini p" id="mini"><canvas width="220" height="220"></canvas><span>지도 M</span></div>
<div class="menu p"><button class="mb" id="bBag" title="가방">🎒</button><button class="mb" id="bDex" title="도감">📘</button><button class="mb" id="bQuest" title="퀘스트">📜</button><button class="mb" id="bPose" title="포즈 (G)">🙂</button><button class="mb" id="bMore" title="설정">⚙️</button></div><div class="poses p" id="poses" hidden></div>
<div class="joyhint" id="joyhint">이동</div><div class="joy" id="joy"><span></span></div>
<div class="acts p"><button class="act big off" id="bAct"><span class="e" id="actE">✋</span><span id="actT">상호작용</span></button><button class="act jump" id="bJump"><span class="e">⤴️</span>점프</button><button class="act run" id="bRun"><span class="e">💨</span>달리기</button></div>
<div id="prompt"></div><div class="toasts" id="toasts"></div><div id="layer"></div><div class="fade" id="fade"></div>`;
const toast = (t, ms = 2600) => { const d = document.createElement('div'); d.className = 'toast'; d.innerHTML = t; $('#toasts').append(d); setTimeout(() => d.remove(), ms); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); };
const coinsUI = () => { $('#coins').textContent = S.coins.toLocaleString(); };
const add = (k, n = 1, quiet) => { S.inv[k] = (S.inv[k] || 0) + n; if (S.inv[k] <= 0) delete S.inv[k]; if (!quiet && n > 0) toast(`${(ITEMS[k] || ['🎁'])[0]} ${esc(k)} +${n}`); };
const has = (k, n = 1) => (S.inv[k] || 0) >= n;
const money = n => { S.coins += n; coinsUI(); if (n > 0) toast(`₩ ${n.toLocaleString()} 받았어요`); };

// ---- 소리 (짧은 효과음) ----
let AC = null; const ac = () => AC || (AC = new (window.AudioContext || window.webkitAudioContext)());
function beep(f = 660, d = .12, type = 'sine', v = .08, when = 0) { try { const a = ac(), o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, a.currentTime + when); g.gain.exponentialRampToValueAtTime(.0001, a.currentTime + when + d); o.connect(g).connect(a.destination); o.start(a.currentTime + when); o.stop(a.currentTime + when + d + .02); } catch (e) { } }
const ding = () => { beep(880, .1); beep(1320, .18, 'sine', .06, .08); };
const pop = () => beep(520, .08, 'triangle', .07);

// ---- 시트 (팝업 창) ----
let sheetOpen = false;
function sheet(ic, title, sub, html, onMount) {
  closeSheet(); sheetOpen = true; keys.clear(); joyV.set(0, 0);
  const bg = document.createElement('div'); bg.className = 'sheetbg p'; bg.id = 'sheet';
  bg.innerHTML = `<div class="sheet"><header><span class="ic">${ic}</span><h3>${esc(title)}<small>${sub || ''}</small></h3><button data-x>✕</button></header><div class="body">${html}</div></div>`;
  bg.addEventListener('pointerdown', e => { if (e.target === bg || e.target.closest('[data-x]')) { e.preventDefault(); closeSheet(); } });
  $('#layer').append(bg); onMount && onMount(bg.querySelector('.body')); pop();
}
function closeSheet() { const s = $('#sheet'); if (s) s.remove(); sheetOpen = false; }
const refresh = fn => { const b = $('#sheet .body'); if (b) fn(b); };

// ---- 대사 ----
let sayQ = [], sayDone = null;
function say(who, lines, done) { sayQ = [].concat(lines).map(t => [who, t]); sayDone = done || null; keys.clear(); joyV.set(0, 0); nextSay(); }
function nextSay() {
  const old = $('#say'); if (old) old.remove();
  if (!sayQ.length) { const d = sayDone; sayDone = null; d && d(); return; }
  const [who, t] = sayQ.shift(); const d = document.createElement('div'); d.className = 'say p'; d.id = 'say';
  d.innerHTML = `${who ? `<b>${esc(who)}</b><br>` : ''}${t}<span class="nx">▼ 탭</span>`; d.addEventListener('pointerdown', e => { e.preventDefault(); pop(); nextSay(); }); $('#layer').append(d);
}
const talking = () => !!$('#say');
const fade = (fn, ms = 650, dark) => { const f = $('#fade'); f.classList.toggle('dark', !!dark); f.classList.add('on'); setTimeout(() => { fn && fn(); setTimeout(() => f.classList.remove('on'), 250); }, ms); };
const heart = (txt = '💗') => { const d = document.createElement('div'); d.className = 'heart'; d.textContent = txt; d.style.left = (innerWidth / 2 - 10 + (Math.random() - .5) * 40) + 'px'; d.style.top = (innerHeight * .42) + 'px'; ui.append(d); setTimeout(() => d.remove(), 1300); };

// ================= 시작 =================
let W = null, P = null, npcs = [], mapImg = null, ready = false;
const clock = new THREE.Clock();
lbar(.1);
setTimeout(async () => {
  try {
    W = buildWorld(scene, { low: LOW }); lbar(.55); $('#lmsg').textContent = '캐릭터를 부르는 중…';
    const gltf = await new GLTFLoader().loadAsync('./char.glb', e => e.total && lbar(.55 + .35 * e.loaded / e.total));
    makeChars(gltf.scene); lbar(.95);
    W.setTime(12, new THREE.Vector3()); makeMap(); W.setTime(S.h, P.pos);
    ensureDaily(); coinsUI(); hud();
    lbar(1); $('#lmsg').textContent = '준비 완료!'; const go = $('#lgo'); go.style.display = 'inline-block';
    go.onclick = () => { ac(); $('.back') && $('.back').remove(); $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 600); ready = true; clock.getDelta();
      if (!S.stats.welcomed) { S.stats.welcomed = 1; const y = npcs.find(n => n.id === 'yumoja'); npcHop(y); say('유모자', ['oh my ong! 공유 씨, 마이세카이에 welcome이에요!', '여기선 낚시하고, 밭도 가꾸고, 빵도 구울 수 있어요. 지도(M)에 할 수 있는 곳이 다 표시돼 있어요.', '먼저 게시판에서 오늘의 quest를 확인해 보세요. fighting!']); } };
    loop();
  } catch (e) { console.error(e); $('#lmsg').textContent = '불러오기에 실패했어요: ' + e.message; }
}, 60);

// ================= 캐릭터 =================
const BODY_MAT = '몸_크림화이트';
function charFrom(src, tint) {
  const c = src.clone(true);
  c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (tint && o.material.name === BODY_MAT) { o.material = o.material.clone(); o.material.color.set(tint); } } });
  const root = new THREE.Group(), rig = new THREE.Group(); rig.add(c); root.add(rig); c.scale.setScalar(.8); scene.add(root); return { root, rig };
}
function label(text) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.font = '800 30px sans-serif'; const w = x.measureText(text).width + 36; x.fillStyle = 'rgba(60,40,30,.78)'; x.beginPath(); x.roundRect((256 - w) / 2, 10, w, 44, 22); x.fill();
  x.fillStyle = '#fff8ec'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 128, 33);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true })); sp.scale.set(1.05, .26, 1); sp.renderOrder = 10; return sp;
}
function makeChars(src) {
  P = charFrom(src); P.pos = new THREE.Vector3(S.pos[0], 0, S.pos[1]); P.vel = new THREE.Vector3(); P.vy = 0; P.ground = true; P.air = 0; P.jbuf = 0; P.phase = 0; P.speed = 0; P.idle = 0;
  P.root.rotation.y = S.ry; P.pose = null; P.pos.y = W.groundY(P.pos.x, P.pos.z); P.hand = new THREE.Group(); P.hand.position.set(.36, .62, .32); P.rig.add(P.hand);
  // 낚싯대 (낚시할 때만 보임)
  const rod = new THREE.Group(); const rm = new THREE.MeshStandardMaterial({ color: '#8a5e3c', roughness: .7 });
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(.015, .025, 1.6, 6), rm); stick.position.set(0, .8, 0); rod.add(stick); rod.position.set(.36, .6, .28); rod.rotation.x = .9; rod.visible = false; P.rig.add(rod); P.rod = rod;
  NPCS.forEach(n => { const c = charFrom(src, n.c); c.root.position.set(n.at[0], W.groundY(...n.at), n.at[1]); c.root.rotation.y = Math.random() * 6; const lb = label(n.name); lb.position.y = 1.85; c.root.add(lb);
    npcs.push({ ...n, ...c, lb, home: new THREE.Vector3(n.at[0], 0, n.at[1]), tgt: null, wait: 1 + Math.random() * 3, phase: Math.random() * 6, hop: 0 }); });
}
const npcHop = n => { if (n) n.hop = 1; };

// ================= 효과 (이모지 파티클) · 소품 · 모션 =================
const texCache = {};
function emojiTex(e) {
  if (texCache[e]) return texCache[e];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return texCache[e] = t;
}
const FX = [];
function fx(e, pos, o = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true, depthWrite: false })); s.position.copy(pos); const sz = o.size || .35; s.scale.setScalar(sz); s.renderOrder = 12; curScene.add(s);
  const p = { s, v: o.v ? o.v.clone() : new THREE.Vector3(), g: o.g ?? 0, life: 0, max: o.life || 1, sz, grow: o.grow ?? 0, fade: o.fade ?? .35, drag: o.drag ?? 0, spin: o.spin || 0, follow: o.follow || null, upd: o.upd || null };
  FX.push(p); return p;
}
function burst(e, pos, n = 6, o = {}) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = (o.speed || 1.6) * (.6 + Math.random() * .6); fx(e, pos, { ...o, v: new THREE.Vector3(Math.cos(a) * sp * (o.flat ?? 1), (o.up ?? 2) * (.7 + Math.random() * .6), Math.sin(a) * sp * (o.flat ?? 1)), g: o.g ?? -5, life: (o.life || .9) * (.8 + Math.random() * .4), size: (o.size || .26) * (.8 + Math.random() * .4) }); } }
function fxTick(dt) {
  for (let i = FX.length - 1; i >= 0; i--) { const p = FX[i]; p.life += dt; const u = p.life / p.max;
    if (p.upd) p.upd(p, u, dt); else { p.v.y += p.g * dt; if (p.drag) p.v.multiplyScalar(1 - p.drag * dt); p.s.position.addScaledVector(p.v, dt); }
    p.s.scale.setScalar(p.sz * (1 + p.grow * u)); p.s.material.opacity = u > 1 - p.fade ? Math.max(0, (1 - u) / p.fade) : 1; p.s.material.rotation += p.spin * dt;
    if (u >= 1) { p.s.parent && p.s.parent.remove(p.s); p.s.material.dispose(); FX.splice(i, 1); } }
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const head = (dy = 1.9) => V3(P.pos.x, P.pos.y + dy, P.pos.z);
const front = (d = .7, y = .6) => V3(P.pos.x + Math.sin(P.root.rotation.y) * d, P.pos.y + y, P.pos.z + Math.cos(P.root.rotation.y) * d);
// 날아가는 아이템: from → to (포물선)
function fly(e, from, to, dur = .6, o = {}) { return new Promise(res => { const a = from.clone(), b = to.clone(), h = o.h ?? 1.2; fx(e, a, { life: dur, fade: o.fade ?? .05, size: o.size || .4, upd: (p, u) => { p.s.position.lerpVectors(a, b, u); p.s.position.y += Math.sin(u * Math.PI) * h; } }); setTimeout(res, dur * 1000); }); }

// 소품 (손에 드는 것들)
const PM = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o });
const PROPS = {
  bucket: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.13, .1, .2, 14), PM('#a87a52')); g.add(b); const h = new THREE.Mesh(new THREE.TorusGeometry(.12, .012, 6, 16, Math.PI), PM('#6a6a6a', { metalness: .6 })); h.position.y = .1; g.add(h); return g; },
  hammer: () => { const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .5, 8), PM('#8a5e3c')); h.position.y = .25; g.add(h); const k = new THREE.Mesh(new THREE.BoxGeometry(.24, .1, .1), PM('#6a6a72', { metalness: .6, roughness: .35 })); k.position.y = .5; g.add(k); return g; },
  can: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .13, .2, 14), PM('#7ab0c8', { metalness: .3 })); g.add(b); const s = new THREE.Mesh(new THREE.CylinderGeometry(.02, .03, .3, 8), PM('#7ab0c8', { metalness: .3 })); s.position.set(0, .05, .2); s.rotation.x = 1.1; g.add(s); return g; },
  guitar: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), PM('#d8884a')); b.scale.set(1, 1.15, .4); g.add(b); const n = new THREE.Mesh(new THREE.BoxGeometry(.06, .5, .04), PM('#6a4a32')); n.position.y = .4; g.add(n); const h = new THREE.Mesh(new THREE.CircleGeometry(.06, 14), PM('#3a2a20')); h.position.set(0, .02, .085); g.add(h); g.rotation.z = -1.1; return g; },
  camera: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(.3, .2, .12), PM('#4a4a52'))); const l = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .1, 16), PM('#2a2a30', { metalness: .5, roughness: .2 })); l.rotation.x = Math.PI / 2; l.position.z = .1; g.add(l); return g; },
  book: () => { const g = new THREE.Group(); [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.BoxGeometry(.18, .02, .24), PM(s > 0 ? '#fffaf0' : '#f3ecdc')); p.position.x = s * .09; p.rotation.z = -s * .2; g.add(p); }); const c = new THREE.Mesh(new THREE.BoxGeometry(.4, .015, .26), PM('#c86a4a')); c.position.y = -.02; g.add(c); return g; },
  tray: () => { const g = new THREE.Group(); const t = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .03, 18), PM('#c8a06a')); g.add(t); const s = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .5, 6), PM('#8a5e3c')); s.rotation.x = Math.PI / 2; s.position.z = -.32; g.add(s); return g; },
  bag: () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 10), PM('#e8d6b0')); b.scale.set(1, 1.1, .9); g.add(b); const t = new THREE.Mesh(new THREE.TorusGeometry(.05, .015, 6, 12), PM('#a87a52')); t.position.y = .14; t.rotation.x = Math.PI / 2; g.add(t); return g; },
  letter: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(.28, .18, .01), PM('#fffaf0'))); const h = new THREE.Mesh(new THREE.CircleGeometry(.035, 12), PM('#ff6a7a')); h.position.z = .008; g.add(h); return g; },
  marsh: () => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, .7, 6), PM('#a87a52')); s.rotation.x = Math.PI / 2 - .3; s.position.z = .3; g.add(s); const m = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .08, 12), PM('#fff8ec')); m.position.set(0, .2, .65); m.rotation.x = Math.PI / 2; g.add(m); g.userData.m = m; return g; }
};
function hold(kind) { const g = PROPS[kind](); P.hand.add(g); return g; }
function drop(g) { if (g && g.parent) g.parent.remove(g); }

// 모션: 진행되는 동안 조작이 잠기고, 리그(몸)를 직접 움직임
let pm = null;
function mo(dur, fn) { return new Promise(res => { if (pm) pm.res(); pm = { t: 0, dur, fn, res }; }); }
const ease = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
const wave = (u, n = 1) => Math.sin(u * Math.PI * 2 * n);
function rigSet(px = 0, py = 0, pz = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { P.rig.position.set(px, py, pz); P.rig.rotation.set(rx, ry, rz); P.rig.scale.set(sx, sy, sz); }
const lean = (a, u) => rigSet(0, 0, 0, a, 0, 0, 1, 1 - Math.abs(a) * .08, 1);
// 자주 쓰는 동작
const M_ = {
  crouch: (dur = .7) => mo(dur, u => { const k = Math.sin(u * Math.PI); rigSet(0, -.04 * k, .05 * k, .35 * k, 0, 0, 1 + .08 * k, 1 - .16 * k, 1 + .08 * k); }),
  hop: (dur = .45) => mo(dur, u => { const k = Math.sin(u * Math.PI); rigSet(0, .35 * k, 0, 0, 0, 0, 1 - .06 * k, 1 + .1 * k, 1 - .06 * k); }),
  nod: (dur = .6) => mo(dur, u => rigSet(0, 0, 0, .18 * Math.abs(wave(u, 2)), 0, 0)),
  shake: (dur = .8) => mo(dur, u => rigSet(0, 0, 0, 0, 0, .16 * wave(u, 4) * (1 - u))),
  spin: (dur = .6) => mo(dur, u => rigSet(0, .3 * Math.sin(u * Math.PI), 0, 0, ease(u) * Math.PI * 2, 0)),
  raise: (dur = .9) => mo(dur, u => { const k = Math.min(1, u * 4), s = 1 + .1 * Math.sin(Math.min(1, u * 3) * Math.PI); rigSet(0, .08 * k, 0, -.12 * k, 0, 0, 1 / Math.sqrt(s), s, 1 / Math.sqrt(s)); }),
  wait: (dur = .3) => mo(dur, () => {})
};
// 얻은 아이템을 머리 위로 번쩍 (동물의 숲처럼)
async function gain(k, n = 1, from) {
  const ic = (ITEMS[k] || FISHI(k) || ['🎁'])[0];
  if (from) await fly(ic, from, head(1.95), .55, { h: .8 });
  const it = fx(ic, head(2.0), { life: 1.05, fade: .2, size: .55, upd: (p, u) => { p.s.position.copy(head(2.0 + Math.min(1, u * 5) * .12)); } });
  burst('✨', head(2.0), 5, { up: 1.2, speed: 1, g: 0, life: .7, size: .2, drag: 2 }); ding();
  await M_.raise(1.0); add(k, n);
}
// ================= 지도 이미지 (위에서 찍기) =================
const MAP = { x0: -33, z0: -29, size: 66 };
function makeMap() {
  const N = 900, H2 = MAP.size / 2, cx = MAP.x0 + H2, cz = MAP.z0 + H2, oc = new THREE.OrthographicCamera(-H2, H2, H2, -H2, 1, 300); oc.position.set(cx, 150, cz); oc.up.set(0, 0, -1); oc.lookAt(cx, 0, cz);
  const fog = scene.fog; scene.fog = null; const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); renderer.setSize(N, N, false);
  renderer.render(scene, oc);
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); x.drawImage(renderer.domElement, 0, 0, N, N);
  // 테두리 바깥은 부드럽게 흐리게
  const g = x.createRadialGradient(N / 2, N / 2, N * .36, N / 2, N / 2, N * .52); g.addColorStop(0, 'rgba(236,224,196,0)'); g.addColorStop(1, 'rgba(236,224,196,.85)'); x.fillStyle = g; x.fillRect(0, 0, N, N);
  mapImg = cv; scene.fog = fog; renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight);
}
const toMap = (x, z) => [(x - MAP.x0) / MAP.size, (z - MAP.z0) / MAP.size];
let waypoint = null;
function drawMini() {
  const cv = $('#mini canvas'), x = cv.getContext('2d'), N = cv.width, span = 30, k = mapImg.width / MAP.size;
  const [u, v] = toMap(P.pos.x, P.pos.z); x.clearRect(0, 0, N, N); x.save(); x.beginPath(); x.arc(N / 2, N / 2, N / 2, 0, 7); x.clip();
  x.fillStyle = '#c8cf94'; x.fillRect(0, 0, N, N);
  x.drawImage(mapImg, u * mapImg.width - span / 2 * k, v * mapImg.height - span / 2 * k, span * k, span * k, 0, 0, N, N);
  if (waypoint) { const [wu, wv] = toMap(...waypoint.p); let dx = (wu - u) * MAP.size / span * N, dy = (wv - v) * MAP.size / span * N; const d = Math.hypot(dx, dy), m = N / 2 - 14; if (d > m) { dx *= m / d; dy *= m / d; } x.font = '22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('📍', N / 2 + dx, N / 2 + dy); }
  x.translate(N / 2, N / 2); x.rotate(-P.root.rotation.y + Math.PI); x.fillStyle = '#ff6a5a'; x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -13); x.lineTo(10, 10); x.lineTo(0, 5); x.lineTo(-10, 10); x.closePath(); x.stroke(); x.fill();
  x.restore();
}
function openMap() {
  if (!mapImg) return; closeSheet(); sheetOpen = true; keys.clear(); joyV.set(0, 0);
  const bg = document.createElement('div'); bg.className = 'fmap p'; bg.id = 'sheet';
  const pts = W.INTER.map(([ic, nm, ac, x, y, z]) => ({ ic, nm, ac, x, z }));
  const marks = pts.map((p, i) => { const [u, v] = toMap(p.x, p.z); return `<div class="mk${waypoint && waypoint.nm === p.nm ? ' wp' : ''}" data-i="${i}" style="left:${u * 100}%;top:${v * 100}%"><span class="i">${p.ic}</span><span class="n">${esc(p.nm)}</span></div>`; }).join('')
    + npcs.map(n => { const [u, v] = toMap(n.root.position.x, n.root.position.z); return `<div class="mk npc" style="left:${u * 100}%;top:${v * 100}%"><span class="i" style="width:24px;height:24px;font-size:13px">🙂</span><span class="n" style="font-size:9.5px;opacity:.85">${esc(n.name)}</span></div>`; }).join('');
  const [mu, mv] = toMap(P.pos.x, P.pos.z);
  bg.innerHTML = `<div class="wrap"><img src="${mapImg.toDataURL('image/jpeg', .85)}" alt="지도">${marks}<div class="me" style="left:${mu * 100}%;top:${mv * 100}%"><i style="transform:rotate(${(-P.root.rotation.y + Math.PI) * 57.3}deg)"></i></div>
    <div class="tt">🗺 마이세카이 · 할 수 있는 곳 ${pts.length}곳</div><button class="cl" data-x>✕</button><div class="info" id="minfo">아이콘을 누르면 길을 알려 줘요</div></div>`;
  bg.addEventListener('pointerdown', e => {
    if (e.target === bg || e.target.closest('[data-x]')) { e.preventDefault(); closeSheet(); return; }
    const mk = e.target.closest('.mk[data-i]'); if (mk) { const p = pts[+mk.dataset.i]; pop();
      $('#minfo').innerHTML = `<span>${p.ic} <b>${esc(p.nm)}</b> · ${esc(p.ac)}</span><button class="btn" id="wpgo">길 안내</button>`;
      $('#wpgo').onpointerdown = ev => { ev.preventDefault(); const r = REACH[p.nm]; waypoint = { nm: p.nm, p: r ? [r[0], r[1]] : [p.x, p.z] }; toast(`📍 ${esc(p.nm)}(으)로 안내할게요`); closeSheet(); }; }
  });
  $('#layer').append(bg); pop();
}

// ================= 하루 · 퀘스트 =================
function ensureDaily() {
  if (!S.quests || S.quests.day !== S.day) {
    const pool = QPOOL.slice().sort(() => Math.random() - .5).slice(0, 3);
    S.quests = { day: S.day, list: pool.map(([id, t, n, rw]) => ({ id, t, n, rw, have: 0, done: false, got: false })) };
    S.shaken = {}; S.mined = {}; S.talked = {};
    const L = LETTERS[(S.day * 7 + 3) % LETTERS.length]; S.letters.unshift({ from: L[0], text: L[1], day: S.day, read: false }); S.letters = S.letters.slice(0, 20);
    if (S.day > 1) toast('☀️ 새로운 하루! 게시판에 의뢰가 붙고 우체통에 편지가 왔어요', 3600);
  }
}
function ev(id, n = 1) {
  if (!S.quests) return; S.stats[id] = (S.stats[id] || 0) + n;
  S.quests.list.forEach(q => { if (q.id === id && !q.done) { q.have = Math.min(q.n, q.have + n); if (q.have >= q.n) { q.done = true; ding(); toast(`📜 퀘스트 완료! 「${esc(q.t)}」 · 게시판에서 보상 받기`, 3400); } } });
  hud();
}
function hud() {
  const aq = Object.keys(S.aqua).length;
  $('#qhud').innerHTML = `<h4>진행 중인 퀘스트</h4><p${S.mainDone ? ' class="done"' : ''}><b style="background:#f6a07a">메인</b><span>아쿠아리움에 물고기 5종 기증 ${Math.min(5, aq)}/5<div class="bar"><i style="width:${Math.min(100, aq / 5 * 100)}%"></i></div></span></p>`
    + (S.quests ? S.quests.list.map(q => `<p${q.got ? ' class="done"' : ''}><b style="background:${q.done ? '#8ab86a' : '#a898d8'}">일일</b><span>${esc(q.t)} ${q.have}/${q.n}${q.done && !q.got ? ' ✅' : ''}</span></p>`).join('') : '');
  const unread = S.letters.some(l => !l.read), qready = S.quests && S.quests.list.some(q => q.done && !q.got);
  $('#bQuest').innerHTML = '📜' + (qready ? '<i class="dot"></i>' : ''); $('#bBag').innerHTML = '🎒' + (unread ? '' : '');
}


// ================= 입력 =================
const keys = new Set(); let runToggle = false; const joyV = new THREE.Vector2();
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
addEventListener('keydown', e => {
  if (e.repeat && !MOVE_KEYS.includes(e.code)) return;
  if (e.code === 'Escape') { closeSheet(); if (talking()) nextSay(); return; }
  if (talking() && (e.code === 'Space' || e.code === 'KeyF' || e.code === 'Enter' || e.code === 'KeyE')) { e.preventDefault(); nextSay(); return; }
  if (sheetOpen) { if (e.code === 'KeyM') closeSheet(); return; }
  if (fishing) { if (e.code === 'Space' || e.code === 'KeyF' || e.code === 'KeyE') { e.preventDefault(); fishTap(); } return; }
  if (e.code === 'KeyF' || e.code === 'KeyE') { e.preventDefault(); act(); return; }
  if (e.code === 'KeyM') { openMap(); return; }
  if (e.code === 'KeyI' || e.code === 'KeyB') { openBag(); return; }
  if (e.code === 'KeyG') { togglePoses(); return; }
  if (e.code === 'KeyQ') { camS.tYaw = P.root.rotation.y + Math.PI; return; }     // 카메라를 등 뒤로
  if (e.code === 'Space') { e.preventDefault(); jump(); return; }
  keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
// 카메라 상태: 목표값(t*)을 부드럽게 따라감 · 드래그 관성 · 자동으로 등 뒤 따라가기
const CAM_D = TOUCH ? 8.4 : 8;
const camS = { yaw: 0, pitch: .5, dist: CAM_D, tYaw: 0, tPitch: .5, tDist: CAM_D, vYaw: 0, vPitch: 0, lastDrag: -9, real: CAM_D };
camS.yaw = camS.tYaw = S.ry + Math.PI;
const ptrs = new Map(); let joyId = null, joyO = null, pinch0 = 0, lastT = 0;
const now = () => performance.now() / 1000;
canvas.addEventListener('pointerdown', e => {
  if (!ready) return; canvas.setPointerCapture(e.pointerId);
  if (fishing) { fishTap(); return; }
  if (talking()) { nextSay(); return; }
  const isTouch = e.pointerType !== 'mouse';
  if (isTouch && e.clientX < innerWidth * .45 && e.clientY > innerHeight * .3 && joyId === null) { joyId = e.pointerId; joyO = [e.clientX, e.clientY]; const j = $('#joy'); j.style.display = 'block'; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; $('#joyhint').style.display = 'none'; return; }
  ptrs.set(e.pointerId, [e.clientX, e.clientY]); camS.vYaw = camS.vPitch = 0; lastT = now();
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); }
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerId === joyId) { let dx = e.clientX - joyO[0], dy = e.clientY - joyO[1]; const d = Math.hypot(dx, dy), m = 52;
    if (d > m) { // 손가락이 멀리 가면 조이스틱 중심이 따라옴 (계속 밀어도 편하게)
      joyO[0] += dx / d * (d - m); joyO[1] += dy / d * (d - m); const j = $('#joy'); j.style.left = joyO[0] + 'px'; j.style.top = joyO[1] + 'px'; dx *= m / d; dy *= m / d; }
    const mag = Math.min(1, Math.hypot(dx, dy) / m), dz = .14, k = mag < dz ? 0 : (mag - dz) / (1 - dz);
    joyV.set(mag ? dx / (mag * m) * k : 0, mag ? dy / (mag * m) * k : 0); $('#joy span').style.transform = `translate(${dx}px,${dy}px)`; return; }
  if (!ptrs.has(e.pointerId)) return; const [px, py] = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch0) camS.tDist = THREE.MathUtils.clamp(camS.tDist * pinch0 / d, 3.2, 14); pinch0 = d; return; }
  const sens = e.pointerType === 'mouse' ? .0055 : .0075, t = now(), dtp = Math.max(.008, t - lastT); lastT = t;
  const dYaw = -(e.clientX - px) * sens, dPitch = (e.clientY - py) * sens * .75;
  camS.tYaw += dYaw; camS.tPitch = THREE.MathUtils.clamp(camS.tPitch + dPitch, .05, 1.2); camS.vYaw = dYaw / dtp; camS.vPitch = dPitch / dtp; camS.lastDrag = t;
});
const endPtr = e => { if (e.pointerId === joyId) { joyId = null; joyV.set(0, 0); $('#joy').style.display = 'none'; $('#joy span').style.transform = ''; }
  if (ptrs.has(e.pointerId) && now() - lastT > .06) camS.vYaw = camS.vPitch = 0;   // 멈췄다 뗀 경우 관성 없음
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', e => { e.preventDefault(); camS.tDist = THREE.MathUtils.clamp(camS.tDist * (1 + Math.sign(e.deltaY) * .1), 3.2, 14); }, { passive: false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
const tap = (id, fn) => $(id).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (ready) fn(); });
tap('#bAct', () => fishing ? fishTap() : talking() ? nextSay() : act()); tap('#bJump', () => jump()); tap('#bRun', () => { runToggle = !runToggle; $('#bRun').classList.toggle('on', runToggle); });
tap('#mini', () => openMap()); tap('#bBag', () => openBag()); tap('#bDex', () => openDex()); tap('#bQuest', () => openQuests()); tap('#bMore', () => openMore()); tap('#bPose', () => togglePoses());
function jump() { if (pm || sheetOpen || talking() || fishing) return; if (P.pose) { P.pose = null; return; } P.jbuf = .16; }

// ================= 장소: 바깥 세상 · 전망대 꼭대기 · 아쿠아리움 안 · 지하실 =================
let AREA = null; const INS = {};
const WORLD = { world: true, ground: (x, z, y) => W.groundY(x, z, y), collide: (p, r, f) => W.collide(p, r, f), cam: c => { const cg = W.hgt(c.x, c.z) + .45; if (c.y < cg) c.y = cg; } };
const A = () => AREA || WORLD;
function towerArea() {
  const T = W.TOWER;
  return { world: true, tower: true, name: '전망대 꼭대기', icon: '🔭',
    ground: () => T.deck, collide(p, r) { const dx = p.x - T.x, dz = p.z - T.z, d = Math.hypot(dx, dz), m = T.r - r; if (d > m) { p.x = T.x + dx / d * m; p.z = T.z + dz / d * m; } },
    camD: 4.4, camP: .22, cam: c => { if (c.y < T.deck + .6) c.y = T.deck + .6; if (c.y > T.deck + 2.3) c.y = T.deck + 2.3; },
    spots: [['🔭', '망원경', '경치 보기', T.scope[0], T.scope[1], 1.3, 'scope'], ['🪜', '계단', '내려가기', T.x + .2, T.z + 1.9, 1.2, 'down']] };
}
function setArea(key, pos, ry) {
  if (key === 'aqua') { INS.aqua = INS.aqua || buildAquarium(); AREA = INS.aqua; INS.aqua.setDonated(FISH.filter(f => S.aqua[f[0]]).map(f => f[6]), fishCanvas); }
  else if (key === 'cellar') { INS.cellar = INS.cellar || buildCellar(); AREA = INS.cellar; INS.cellar.frag.visible = (S.h >= 20 || S.h < 5) && S.cellarDay !== S.day; }
  else if (key === 'tower') AREA = towerArea();
  else AREA = null;
  const sc = AREA && AREA.scene ? AREA.scene : scene; curScene = sc; sc.add(P.root);
  const sp = pos || (AREA && AREA.spawn) || [0, 0]; P.pos.set(sp[0], 0, sp[1]); P.pos.y = A().ground(P.pos.x, P.pos.z); P.vel.set(0, 0, 0); P.vy = 0; P.seat = null; P.pose = null;
  P.root.rotation.y = ry ?? (AREA && AREA.spawn ? AREA.spawn[2] : 0); camS.tYaw = camS.yaw = P.root.rotation.y + Math.PI; camSave = null;
  camS.tDist = camS.dist = AREA ? (AREA.camD || 4.4) : CAM_D; camS.real = camS.dist; camS.tPitch = camS.pitch = AREA ? (AREA.camP ?? .3) : .5;
  $('#vig').style.background = AREA && AREA.dark ? 'radial-gradient(ellipse 70% 70% at 50% 50%,transparent 35%,rgba(0,0,0,.75))' : AREA && AREA.scene ? 'radial-gradient(ellipse 80% 75% at 50% 45%,transparent 55%,rgba(0,10,30,.45))' : '';
  hudAcc = 9;
  if (AREA && AREA.scene) { const cv = $('#mini canvas'), x = cv.getContext('2d'), N = cv.width; x.clearRect(0, 0, N, N); x.fillStyle = AREA.dark ? '#1a1612' : '#0e2a48'; x.beginPath(); x.arc(N / 2, N / 2, N / 2, 0, 7); x.fill(); x.font = '80px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(AREA.icon, N / 2, N / 2 - 8); x.fillStyle = '#fff8ec'; x.font = '800 22px sans-serif'; x.fillText('실내', N / 2, N / 2 + 58); }
}
const goArea = (key, pos, ry, dark) => new Promise(res => fade(() => { setArea(key, pos, ry); res(); }, 550, dark));
// 실내 · 전망대에서 할 수 있는 것
const SPOT = {
  exit: async () => { const back = { '아쿠아리움 · 바다 터널': [[-1, -12.6], 0], '집 지하 · ???': [[2.6, -7.4], Math.PI] }[A().name]; await goArea(null, back[0], back[1], A().dark); M_.hop(.35); },
  down: async () => { await goArea(null, [W.TOWER.x, W.TOWER.z + 2.75], 0); M_.hop(.35); },
  scope: async () => { const T = W.TOWER, a = Math.atan2(0 - T.x, 2 - T.z); await turnTo(T.x + Math.sin(a) * 5, T.z + Math.cos(a) * 5); camSave = { d: camS.tDist, p: camS.tPitch }; camS.tYaw = P.root.rotation.y + Math.PI; camS.tDist = 3.2; camS.tPitch = .12; camS.lastDrag = now();
    fx('🔭', front(.5, 1.5), { life: 1.4, size: .3 }); await mo(.6, u => lean(.25 * ease(u)));
    await new Promise(r => say('', ['마을이 한눈에 보여요. 오두막 굴뚝, 반짝이는 호수, 돌아가는 풍차…', S.h >= 19.5 || S.h < 5 ? '밤하늘에 별이 쏟아질 것 같아요.' : '바람이 기분 좋게 불어요.'], r));
    await mo(.3, u => lean(.25 * (1 - u))); await photo('전망대 꼭대기에서 본 풍경'); },
  bench: async () => { const b = A().bench; await sitAt(b[0], b[1], b[2], .6); toast('🪑 앉아서 물고기를 구경해요'); },
  donate: async () => openAquarium(),
  watch: async () => { const n = Object.keys(S.aqua).length; await M_.nod(.6); say('', n ? [`터널 밖에서 내가 기증한 물고기 ${n}종이 헤엄치고 있어요.`, '…가오리가 계속 이쪽을 쳐다보는 것 같아요.'] : ['아직 내가 기증한 물고기는 없어요. 선착장에서 낚아서 기증해 보세요!']); },
  desk: async () => { await mo(.4, u => lean(.3 * ease(u))); const notes = ['「의자는 원래 하나였다.」', '「사원증을 두고 내려오지 말 것.」', '「밤 9시 이후 통화 연결음이 들리면 대답하지 마세요.」', '「8번다리에는 무엇도 없었다. 정말로.」'];
    S.stats.desk = (S.stats.desk || 0) + 1; await new Promise(r => say('낡은 쪽지', [notes[(S.day + S.stats.desk) % notes.length]], r)); await mo(.3, u => lean(.3 * (1 - u))); },
  chair: async () => { const c = A().chairs.chair; await sitAt(c[0], c[1], c[2], .59); beep(200, .4, 'sine', .03); toast('🪑 …의자가 삐걱거려요'); },
  frag: async () => { if (!A().frag.visible) return toast('…아무것도 없어요. 밤에 다시 와 볼까요?'); A().frag.visible = false; S.cellarDay = S.day; await M_.crouch(.4); await gain('이상현상 조각', 1, A().frag.position.clone().add(V3(0, .2, 0))); save(); }
};
// 앉기: 자리로 통 뛰어올라 앉음
async function sitAt(x, z, ry, y) {
  const a = P.pos.clone(), b = V3(x, y, z); P.vel.set(0, 0, 0);
  await mo(.45, u => { P.pos.lerpVectors(a, b, ease(u)); P.pos.y += Math.sin(u * Math.PI) * .5; let d = ry - P.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); P.root.rotation.y += d * u; rigSet(); });
  P.root.rotation.y = ry; P.seat = { y }; P.pose = 'sit';
}
// 포즈
const POSES = [['👋', '인사'], ['🪑', '앉기'], ['😴', '자기'], ['🎉', '기뻐하기'], ['💃', '춤추기'], ['🤔', '생각하기'], ['🙇', '꾸벅'], ['😲', '깜짝']];
async function doPose(nm) {
  $('#poses').hidden = true; if (pm || acting || sheetOpen || fishing) return; acting = true; P.vel.set(0, 0, 0);
  try {
    if (nm === '앉기') { P.pose = 'sit'; await M_.crouch(.25); P.pose = 'sit'; }
    else if (nm === '자기') { P.pose = 'lie'; }
    else if (nm === '인사') { P.pose = null; fx('👋', head(1.95), { life: 1.2, size: .38, v: V3(0, .2, 0) }); await mo(1.2, u => rigSet(0, .08 * Math.abs(wave(u, 2)), 0, 0, 0, .22 * wave(u, 3))); }
    else if (nm === '기뻐하기') { P.pose = null; burst('🎉', head(1.8), 4, { up: 1.6, speed: .9, life: 1, size: .3 }); await M_.hop(.4); await M_.spin(.55); await M_.hop(.35); }
    else if (nm === '춤추기') { P.pose = null; for (let i = 0; i < 6; i++) setTimeout(() => fx(i % 2 ? '🎵' : '🎶', head(1.7), { v: V3((Math.random() - .5) * .8, .9, 0), life: 1.2, size: .28 }), i * 400); await mo(2.6, u => rigSet(0, Math.abs(Math.sin(u * 26)) * .14, 0, 0, Math.sin(u * 13) * .5, Math.sin(u * 26) * .14)); }
    else if (nm === '생각하기') { P.pose = null; fx('💭', head(2.05), { life: 1.8, size: .45, v: V3(.1, .15, 0) }); await mo(1.8, u => rigSet(0, 0, 0, 0, Math.sin(u * 4) * .2, .2 * Math.min(1, u * 4) * (1 - Math.max(0, u - .8) * 5))); }
    else if (nm === '꾸벅') { P.pose = null; for (let i = 0; i < 2; i++) await mo(.5, u => lean(.5 * Math.sin(u * Math.PI))); }
    else if (nm === '깜짝') { P.pose = null; fx('❗', head(2.05), { life: 1, size: .45 }); beep(900, .1, 'square', .05); await mo(.6, u => rigSet(0, .45 * Math.sin(u * Math.PI), 0, -.2 * Math.sin(u * Math.PI), 0, 0, 1 - .1 * Math.sin(u * Math.PI), 1 + .15 * Math.sin(u * Math.PI), 1)); }
  } finally { acting = false; }
}
function togglePoses() { const el = $('#poses'); if (!el.hidden) { el.hidden = true; return; } el.innerHTML = POSES.map(([ic, nm]) => `<button data-p="${nm}"><span>${ic}</span>${nm}</button>`).join(''); el.hidden = false;
  el.querySelectorAll('[data-p]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); doPose(b.dataset.p); })); }

// ================= 상호작용 대상 찾기 =================
let target = null;
function findTarget() {
  if (!P) return null; const px = P.pos.x, pz = P.pos.z, fx_ = Math.sin(P.root.rotation.y), fz_ = Math.cos(P.root.rotation.y); let best = null, bd = 1e9;
  if (A().spots) { for (const [ic, nm, ac, x, z, rr, k] of A().spots) { const d = Math.hypot(px - x, pz - z) - rr; if (d < 0 && d < bd) { bd = d; best = { k: 'spot', ic, nm, ac, x, z, fn: k }; } } if (A().scene || A().tower) return best; }
  // 바라보는 방향에 있는 것을 조금 더 우선
  const score = (tx, tz, d) => { const dx = tx - px, dz = tz - pz, l = Math.hypot(dx, dz) || 1; return d - ((dx * fx_ + dz * fz_) / l) * .6; };
  const consider = (o, s) => { if (s < bd) { bd = s; best = o; } };
  for (const [ic, nm, ac, x, y, z] of W.INTER) { const r = REACH[nm]; const tx = r ? r[0] : x, tz = r ? r[1] : z, rr = r ? r[2] : 1.6; const d = Math.hypot(px - tx, pz - tz) - rr; if (d < 0) consider({ k: 'inter', ic, nm, ac, x, z }, score(x, z, d) - 1); }
  for (const n of npcs) { const d = n.root.position.distanceTo(P.pos) - 1.7; if (d < 0) consider({ k: 'npc', ic: '💬', nm: n.name, ac: '이야기하기', n }, score(n.root.position.x, n.root.position.z, d) - 1.5); }
  if (!best) { W.TREES.forEach(([x, z, s], i) => { const d = Math.hypot(px - x, pz - z) - (.45 * s + 1.1); if (d < 0) consider({ k: 'tree', ic: '🌳', nm: '나무', ac: S.shaken[i] ? '오늘은 다 흔들었어요' : '흔들기', i, x, z, s }, score(x, z, d)); });
    W.ROCKS.forEach(([x, z, s], i) => { const d = Math.hypot(px - x, pz - z) - (s * 1.1 + 1.0); if (d < 0) consider({ k: 'rock', ic: '🪨', nm: '바위', ac: S.mined[i] ? '오늘은 다 캤어요' : '돌 캐기', i, x, z, s }, score(x, z, d)); }); }
  return best;
}
function showPrompt() {
  const t = target, el = $('#prompt'), b = $('#bAct');
  if (P && P.pose && !pm) { el.innerHTML = ''; el.dataset.h = ''; b.classList.remove('off'); $('#actE').textContent = '🚶'; $('#actT').textContent = '일어나기'; return; }
  if (!t || sheetOpen || talking() || fishing || pm) { el.innerHTML = ''; el.dataset.h = ''; b.classList.add('off'); $('#actE').textContent = '✋'; $('#actT').textContent = '상호작용'; return; }
  b.classList.remove('off'); $('#actE').textContent = t.ic; $('#actT').textContent = t.ac.length > 6 ? t.nm : t.ac;
  const html = `<div class="prompt p" id="pr"><kbd>${TOUCH ? '👆' : 'F'}</kbd>${esc(t.nm)} <small>· ${esc(t.ac)}</small></div>`;
  if (el.dataset.h !== html) { el.innerHTML = html; el.dataset.h = html; $('#pr').addEventListener('pointerdown', e => { e.preventDefault(); act(); }); }
}
// 대상 쪽으로 부드럽게 돌아서기 (모션)
const turnTo = (x, z, dur = .22) => { const a0 = P.root.rotation.y, want = Math.atan2(x - P.pos.x, z - P.pos.z); let d = want - a0; d = Math.atan2(Math.sin(d), Math.cos(d)); P.vel.set(0, 0, 0); P.speed = 0; return mo(dur, u => { P.root.rotation.y = a0 + d * ease(u); rigSet(); }); };
let acting = false, camSave = null;
// 상호작용할 때 카메라가 비스듬히 옆으로 돌아가 동작이 잘 보이게
function actionCam(on) {
  if (on) { if (!camSave) camSave = { d: camS.tDist, p: camS.tPitch }; const side = P.root.rotation.y + Math.PI; let best = side + 1.05;
    // 좌·우 중 덜 가리는 쪽
    const f = V3(P.pos.x, P.pos.y + 1.1, P.pos.z), test = a => camHit(f, V3(Math.sin(a) * Math.cos(.42), Math.sin(.42), Math.cos(a) * Math.cos(.42)), 6);
    if (test(side - 1.05) > test(side + 1.05)) best = side - 1.05;
    let d = best - camS.tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); camS.tYaw += d; camS.tDist = 5.6; camS.tPitch = .42; camS.lastDrag = now(); }
  else if (camSave) { camS.tDist = camSave.d; camS.tPitch = camSave.p; camSave = null; }
}
async function act() {
  if (sheetOpen || talking() || pm || acting) return;
  if (P.pose) { P.pose = null; if (P.seat) { P.seat = null; P.pos.addScaledVector(V3(Math.sin(P.root.rotation.y), 0, Math.cos(P.root.rotation.y)), .55); } await M_.hop(.35); return; }
  const t = target; if (!t) return; pop(); acting = true;
  try {
    if (t.k === 'spot') { if (t.fn !== 'exit' && t.fn !== 'down' && t.fn !== 'bench' && t.fn !== 'chair') await turnTo(t.x, t.z); await SPOT[t.fn](t); }
    else if (t.k === 'npc') { actionCam(true); await talkNPC(t.n); }
    else if (t.k === 'tree') { await turnTo(t.x, t.z); actionCam(true); await shakeTree(t); }
    else if (t.k === 'rock') { await turnTo(t.x, t.z); actionCam(true); await mineRock(t); }
    else { const fn = ACTS[t.nm]; if (t.x != null && t.nm !== '선착장') await turnTo(t.x, t.z); if (t.nm !== '선착장') actionCam(true); if (fn) await fn(t); else toast(`${t.ic} ${esc(t.nm)} — 준비 중이에요`); }
  } finally { acting = false; }
}

// ================= 각 장소 =================
const row = (ic, t, s, btn) => `<div class="row"><span class="ri">${ic}</span><span class="rt"><b>${t}</b><small>${s || ''}</small></span>${btn || ''}</div>`;
const need = req => Object.entries(req).map(([k, n]) => `${(ITEMS[k] || FISHI(k) || ['•'])[0]}${esc(k)} ${S.inv[k] || 0}/${n}`).join(' · ');
const canMake = req => Object.entries(req).every(([k, n]) => has(k, n));
const take = req => Object.entries(req).forEach(([k, n]) => add(k, -n, true));
function bindBtns(b, map) { b.querySelectorAll('[data-a]').forEach(el => el.addEventListener('pointerdown', e => { e.preventDefault(); if (el.disabled) return; map[el.dataset.a](el.dataset.v, el); })); }
const at = (x, y, z) => V3(x, W.hgt(x, z) + y, z);

// --- 제작 동작들 (만들기 버튼 → 창 닫고 동작 → 결과 → 다시 창) ---
const CRAFT_MO = {
  cook: async (spot) => { const g = hold('tray'); g.rotation.x = -.2; await mo(.5, u => lean(.25 * ease(u))); g.position.z = .25;
    for (let i = 0; i < 3; i++) { burst(i % 2 ? '♨️' : '💨', spot, 2, { up: 1.4, speed: .3, g: .5, life: 1.1, size: .3, grow: 1 }); await mo(.45, u => lean(.25 + .05 * wave(u))); }
    drop(g); await mo(.3, u => lean(.25 * (1 - u))); },
  fire: async (spot) => { const g = hold('marsh'); await mo(.4, u => lean(.18 * u));
    for (let i = 0; i < 4; i++) { burst('🔥', spot, 1, { up: 1.2, speed: .2, g: 0, life: .6, size: .28 }); await mo(.4, u => { lean(.18); g.rotation.z = wave(u) * .4; }); }
    drop(g); await mo(.25, u => lean(.18 * (1 - u))); },
  mill: async (spot) => { const hub = W.DYN.find(o => o.userData.spin); const s0 = hub ? hub.userData.spin : 0; const g = hold('bag');
    if (hub) hub.userData.spin = 3.5; for (let i = 0; i < 4; i++) { burst('💨', spot, 2, { up: .6, speed: .8, g: 0, life: .8, size: .28, grow: 1.2 }); await mo(.4, u => rigSet(0, .04 * Math.abs(wave(u)), 0, .1, 0, .06 * wave(u))); }
    if (hub) hub.userData.spin = s0; drop(g); },
  hammer: async (spot) => { const g = hold('hammer'); g.rotation.x = -.3;
    for (let i = 0; i < 3; i++) { await mo(.32, u => { const k = u < .6 ? -ease(u / .6) * 1.6 : -1.6 + ease((u - .6) / .4) * 2.4; g.rotation.x = k; lean(u < .6 ? -.06 : .18); });
      burst('✨', spot, 4, { up: 1.5, speed: 1.6, life: .5, size: .2 }); beep(240 + i * 40, .08, 'square', .05); shake = .12; }
    drop(g); }
};
function craftSheet(ic, title, sub, recipes, onMake, opt = {}) {
  const fishKinds = ['이끼붕어', '반딧불송사리', '꽃잎베타', '유리비늘피라미', '붕어', '송사리', '피라미', '민물새우'];
  const fishReq = () => { const k = fishKinds.find(f => has(f)); return k ? { [k]: 1 } : { '이끼붕어': 1 }; };
  const render = b => {
    b.innerHTML = recipes.map(([ric, nm, req, note, decor], i) => { const rq = opt.anyFish && nm === '생선구이' ? fishReq() : req;
      return row(ric, esc(nm) + (S.inv[nm] ? ` <small>(${S.inv[nm]}개 있음)</small>` : decor && S.decor[nm] ? ` <small>(${S.decor[nm]}개 장식)</small>` : ''), (note ? esc(note) + ' · ' : '') + need(rq), `<button class="btn" data-a="mk" data-v="${i}" ${canMake(rq) ? '' : 'disabled'}>만들기</button>`); }).join('')
      + `<p style="font-size:12px;color:#9a8a78">재료는 🎒가방에서 확인할 수 있어요.</p>`;
    bindBtns(b, { mk: async v => { const [ric, nm, req, , decor] = recipes[+v]; const rq = opt.anyFish && nm === '생선구이' ? fishReq() : req; if (!canMake(rq)) return; take(rq); closeSheet();
      acting = true; actionCam(true); try { await CRAFT_MO[opt.mo || 'hammer'](opt.spot || front(1.1, .8));
        if (decor) { S.decor[nm] = (S.decor[nm] || 0) + 1; burst('✨', head(2), 6, { up: 1.4, speed: 1, g: 0, life: .8, size: .22 }); fx(ric, head(2), { life: 1, size: .55, g: 0 }); ding(); await M_.raise(); toast(`${ric} ${esc(nm)} 완성! 오두막에 장식했어요`); }
        else await gain(nm, 1, opt.spot);
        onMake && onMake(); save(); } finally { acting = false; }
      sheet(ic, title, sub, '', render); actionCam(true); } });
  };
  sheet(ic, title, sub, '', render);
}

const ACTS = {
  '우물': async () => { if ((S.inv['물'] || 0) >= 20) return toast('💧 물통이 가득 찼어요 (20)');
    const well = at(-7.2, .8, -1.6), g = hold('bucket'); g.position.set(-.1, .1, .3);
    await mo(.5, u => { lean(.3 * ease(u)); g.position.y = .1 - .45 * ease(u); });
    beep(220, .25, 'sine', .05); burst('💧', well, 5, { up: 1.6, speed: .7, life: .7, size: .2 });
    await mo(.7, u => { lean(.3 - .4 * ease(u)); g.position.y = -.35 + .55 * ease(u); rigSet(0, .05 * Math.sin(u * Math.PI), 0, .3 - .4 * ease(u)); });
    await mo(.25, u => lean(-.1 * (1 - u))); drop(g); await gain('물', 1); ev('water'); save(); },
  '퀘스트 게시판': async () => { await M_.nod(.6); openQuests(); },
  '잡화점': async () => { const n = npcs.find(x => x.id === 'sejin'); await M_.hop(.35); openShop(); },
  '캡슐 뽑기': async () => { openGacha(); },
  '풍차 방앗간': () => craftSheet('🌾', '풍차 방앗간', '밀 2개 → 밀가루 1개', [['🥣', '밀가루', { '밀': 2 }]], () => ev('mill'), { mo: 'mill', spot: at(10.4, 1.6, -7.6) }),
  '화덕': () => craftSheet('🍞', '화덕', '따끈하게 굽기 · 요리하면 퀘스트 진행', [['🍞', '빵', { '밀가루': 1, '물': 1 }], ['🍕', '토마토 피자', { '밀가루': 1, '토마토': 2, '물': 1 }], ['🥧', '사과파이', { '밀가루': 1, '사과': 2 }], ['🍯', '꿀빵', { '빵': 1, '꿀': 1 }]], () => ev('bake'), { mo: 'cook', spot: at(14.5, .8, 2.2) }),
  '모닥불': () => craftSheet('🔥', '모닥불', '생선을 굽거나 마시멜로를 구워요', [['🍢', '생선구이', { '이끼붕어': 1 }, '흔한 물고기 아무거나'], ['🍡', '구운 마시멜로', { '마시멜로': 1 }]], () => ev('bake'), { anyFish: true, mo: 'fire', spot: at(-15.2, .7, 5.4) }),
  '작업대': () => craftSheet('🛠', '작업대', '모은 재료로 가구 만들기 → 오두막에 장식돼요', CRAFT.map(([ic, nm, req, item]) => [ic, nm, req, item ? '' : '오두막 장식', !item]), null, { mo: 'hammer', spot: at(15, 1.2, 5) }),
  '공방': async () => openForge(),
  '벌통': async () => { const left = S.honeyAt + 3 - T(); const hive = at(29.6, 1.1, 9.6);
    if (left > 0) { burst('🐝', hive, 3, { up: .5, speed: .8, g: 0, life: 1.2, size: .2 }); return toast(`🐝 벌들이 아직 일하는 중이에요 (약 ${Math.max(1, Math.ceil(left))}분 뒤)`); }
    S.honeyAt = T(); await mo(.4, u => lean(.25 * ease(u)));
    // 벌들이 주위를 빙글빙글
    const bees = [0, 1, 2, 3, 4].map(i => fx('🐝', head(1.2), { life: 1.8, size: .22, upd: (p, u) => { const a = u * 9 + i * 1.26, r = .8 + .2 * Math.sin(u * 7 + i); p.s.position.set(P.pos.x + Math.cos(a) * r, P.pos.y + 1.1 + Math.sin(u * 11 + i) * .3, P.pos.z + Math.sin(a) * r); } }));
    beep(180, .6, 'sawtooth', .015); await mo(1.6, u => rigSet(0, 0, 0, 0, 0, .14 * wave(u, 6) * (1 - u)));
    await gain('꿀', 1 + (Math.random() < .3 ? 1 : 0)); ev('honey'); save(); },
  '선착장': () => startFishing(),
  '텐트': async () => sheet('⛺', '텐트', '자면 다음 날 아침 7시가 돼요 · 자동 저장', `<p>포근한 침낭이 깔려 있어요.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-a="sleep">잠자기 (아침까지)</button><button class="btn sub" data-a="save">저장만 하기</button></div>`, b => bindBtns(b, {
    sleep: async () => { closeSheet(); P.pose = 'lie'; const z = setInterval(() => fx('💤', head(1.2), { v: V3(.2, .5, 0), life: 1.4, size: .3, grow: .6 }), 500);
      await M_.wait(1.6); fade(() => { clearInterval(z); S.h = 7; S.day++; ensureDaily(); W.setTime(S.h, P.pos); P.pose = null; save(); hud(); toast(`🌤 ${S.day}일째 아침이에요. 잘 잤다!`); M_.hop(.4); }, 900, true); },
    save: () => { save(); toast('💾 저장했어요'); closeSheet(); } })),
  '아쿠아리움': async () => { await mo(.5, u => rigSet(0, .1 * Math.abs(wave(u, 2)), .3 * u)); await goArea('aqua'); burst('🫧', head(1.2), 6, { up: 1.2, speed: .6, g: 0, life: 1.2, size: .25 }); },
  '지하실': async () => { await mo(1.0, u => { rigSet(0, -1.4 * ease(u), 0, .15 * u); }); await goArea('cellar', null, null, true); if (S.h >= 20 || S.h < 5) { beep(425, .8, 'sine', .04); beep(425, .8, 'sine', .04, 1.4); toast('…어디선가 통화 연결음이 들려요'); } },
  '오두막': async () => { await mo(.6, u => rigSet(0, .1 * Math.abs(wave(u, 2)), .25 * u)); fade(() => openHouse(), 450); },
  '우체통': async () => { const box = at(3.6, 1.2, 1.6); await mo(.4, u => lean(.2 * ease(u))); await fly('✉️', box, head(1.95), .5, { h: .5 }); fx('✉️', head(2), { life: .9, size: .45 }); await M_.raise(.9); openMail(); },
  '고양이': async () => { const cat = at(-2.9, .4, 2.2); await M_.crouch(.35);
    for (let i = 0; i < 3; i++) { fx(i % 2 ? '💕' : '💗', cat, { v: V3((Math.random() - .5) * .4, .9, 0), life: 1.1, size: .3 }); beep(760 + i * 120, .08, 'sine', .04); await mo(.35, u => rigSet(0, -.04, .05, .3, 0, .12 * wave(u), 1.06, .88, 1.06)); }
    await mo(.3, u => rigSet(0, -.04 * (1 - u), 0, .3 * (1 - u)));
    if (S.petDay !== S.day) { S.petDay = S.day; S.friend.cat = (S.friend.cat || 0) + 1; ev('pet'); fx('😺', cat.clone().add(V3(0, .5, 0)), { life: 1.2, size: .4, v: V3(0, .3, 0) }); toast(`🐈 고양이가 골골송을 불러요 (친밀도 ${S.friend.cat})`); save(); } else toast('🐈 …냐아. (졸려 보여요)'); },
  '피크닉': async () => { await M_.hop(.35); P.pose = 'sit'; const snack = ['빵', '사과', '구운 마시멜로', '꿀빵'].find(k => has(k));
    if (snack) { add(snack, -1, true); const ic = (ITEMS[snack] || ['🍞'])[0]; fx(ic, front(.35, .95), { life: 1.2, size: .32 }); for (let i = 0; i < 3; i++) { beep(400 + i * 60, .05, 'triangle', .04); await mo(.3, u => rigSet(0, -.05, 0, -.1 + .12 * Math.abs(wave(u)), 0, 0, 1.06, .9, 1.06)); } fx('😋', head(1.7), { life: 1, size: .35, v: V3(0, .4, 0) }); toast(`🧺 ${snack}을(를) 먹으며 쉬어요. 냠냠`); }
    else toast('🧺 담요에 앉아 노을을 봐요'); },
  '해먹': async () => { await M_.hop(.4); P.pose = 'lie'; const z = setInterval(() => fx('💤', head(1), { v: V3(.2, .5, 0), life: 1.4, size: .3, grow: .6 }), 600);
    await M_.wait(1.8); fade(() => { clearInterval(z); S.h += 1; toast('🌿 해먹에서 한 시간 쉬었어요'); }, 700); },
  '새집': async () => { if (!has('새모이')) return say('', ['새집이 비어 있어요. <b>새모이</b>(작업대에서 밀로 만들거나 잡화점에서 사요)를 넣어 주면 새가 찾아와요.']);
    add('새모이', -1, true); const nest = at(-6.8, 2.6, .6);
    await mo(.35, u => lean(-.15 * u)); fly('🌰', front(.4, 1.1), nest, .5, { h: .6, size: .25 }); await mo(.3, u => lean(-.15 + .35 * u));
    const from = nest.clone().add(V3(6, 3, -4)); await fly('🐦', from, nest.clone().add(V3(0, .35, 0)), .9, { h: .5, size: .4 });
    const b = fx('🐦', nest.clone().add(V3(0, .35, 0)), { life: 1.6, size: .4, upd: (p, u) => { p.s.position.y = nest.y + .35 + Math.abs(Math.sin(u * 14)) * .05; } }); beep(1800, .05, 'sine', .04); beep(2200, .05, 'sine', .04, .1);
    await M_.wait(1.5); fly('🐦', nest.clone().add(V3(0, .35, 0)), nest.clone().add(V3(-7, 4, 5)), 1, { h: .4, size: .4 }); toast('🐦 짹짹! 새가 모이를 먹고 갔어요');
    if (Math.random() < .5) await gain('깃털', 1, nest); save(); },
  '이정표': async () => sheet('🪧', '이정표', '빠른 이동', TRAVEL.map(([ic, nm], i) => row(ic, esc(nm), '', `<button class="btn" data-a="go" data-v="${i}">이동</button>`)).join(''), b => bindBtns(b, { go: async v => { const [, nm, [x, z]] = TRAVEL[+v]; closeSheet();
    burst('💨', P.pos.clone().add(V3(0, .4, 0)), 8, { up: .5, speed: 1.5, g: 0, life: .7, size: .35, grow: 1 }); await M_.spin(.5);
    fade(() => { P.pos.set(x, W.groundY(x, z), z); P.vel.set(0, 0, 0); camS.tYaw = camS.yaw = P.root.rotation.y + Math.PI; burst('💨', P.pos.clone().add(V3(0, .4, 0)), 8, { up: .5, speed: 1.5, g: 0, life: .7, size: .35, grow: 1 }); M_.hop(.4); toast(`🪧 ${nm}(으)로 왔어요`); }, 450); } })),
  '정자': async () => sheet('📖', '정자', '책 읽기 · 낮잠', `<p>바람이 솔솔 부는 정자. 책장에 「정보구출반 사내 소식지」가 꽂혀 있어요.</p><div style="display:flex;gap:8px;margin-top:10px"><button class="btn" data-a="read">책 읽기</button><button class="btn sub" data-a="nap">낮잠 (3시간)</button></div>`, b => bindBtns(b, {
    read: async () => { closeSheet(); P.pose = 'sit'; const g = hold('book'); g.position.set(-.36, .1, .1); g.rotation.x = -.6; await M_.wait(.6); say('사내 소식지', [BOOK[Math.floor(Math.random() * BOOK.length)], '…피식 웃음이 나요.'], () => { drop(g); fx('😆', head(1.7), { life: 1, size: .35, v: V3(0, .4, 0) }); }); },
    nap: async () => { closeSheet(); P.pose = 'lie'; const z = setInterval(() => fx('💤', head(1), { v: V3(.2, .5, 0), life: 1.4, size: .3, grow: .6 }), 500); await M_.wait(1.6); fade(() => { clearInterval(z); S.h += 3; toast('😴 낮잠을 푹 잤어요 (+3시간)'); P.pose = null; }, 900, true); } })),
  '전망대': async () => { await mo(.5, u => rigSet(0, .1 * Math.abs(wave(u, 2)), .3 * u)); await goArea('tower', [W.TOWER.x + .3, W.TOWER.z + 1.2], 0); toast('🔭 전망대 꼭대기! 망원경으로 경치를 볼 수 있어요'); burst('🍃', head(1.6), 5, { up: .6, speed: 1.4, g: -.5, life: 1.4, size: .25 }); },
  '벤치': async t => { const b = W.BENCHES.slice().sort((a, c) => Math.hypot(a[0] - P.pos.x, a[1] - P.pos.z) - Math.hypot(c[0] - P.pos.x, c[1] - P.pos.z))[0]; await sitAt(b[0], b[1], b[2], W.hgt(b[0], b[1]) + .5); toast('🪑 벤치에 앉았어요. 움직이면 일어나요'); },
  '포토 스팟': async () => { await photo('포토 스팟에서 한 컷'); },
  '버스킹 무대': () => busk(),
  '텃밭': async () => openFarm()
};
async function talkNPC(n) {
  turnTo(n.root.position.x, n.root.position.z); n.root.rotation.y = Math.atan2(P.pos.x - n.root.position.x, P.pos.z - n.root.position.z); n.wait = 8; n.tgt = null; npcHop(n);
  fx('💬', n.root.position.clone().add(V3(0, 2.1, 0)), { life: .9, size: .4, v: V3(0, .3, 0) }); beep(640, .06, 'triangle', .05); beep(820, .08, 'triangle', .04, .08);
  const f = S.friend[n.id] || 0, line = n.lines[(f + S.day) % n.lines.length];
  const h = S.h; const extra = h >= 21 || h < 5 ? '(하품) 벌써 밤이네요.' : h < 9 ? '좋은 아침이에요.' : null;
  await new Promise(res => say(n.name, extra && Math.random() < .4 ? [extra, line] : [line], res));
  S.talked = S.talked || {}; if (!S.talked[n.id]) { S.talked[n.id] = 1; S.friend[n.id] = f + 1; ev('talk'); npcHop(n); burst('💗', n.root.position.clone().add(V3(0, 1.8, 0)), 4, { up: 1.2, speed: .5, g: 0, life: 1, size: .26 }); toast(`💗 ${esc(n.name)}와(과) 조금 더 친해졌어요 (${f + 1})`); save(); }
}
async function shakeTree(t) {
  await turnTo(t.x, t.z);
  if (S.shaken[t.i]) { await M_.shake(.5); return toast('🌳 오늘은 이미 흔들었어요'); }
  S.shaken[t.i] = 1; const crown = at(t.x, 2.9 * t.s, t.z);
  // 나무를 밀었다 당겼다
  beep(200, .25, 'sawtooth', .025);
  for (let i = 0; i < 3; i++) { burst('🍃', crown, 3, { up: .2, speed: 1.2 * t.s, g: -1.2, life: 1.4, size: .25, spin: 3 }); shake = .12; await mo(.28, u => rigSet(0, 0, .12 * Math.sin(u * Math.PI), .22 * Math.sin(u * Math.PI), 0, 0, 1, 1 - .05 * Math.sin(u * Math.PI), 1)); }
  const r = Math.random();
  if (r < .88) { const k = r < .65 ? '나뭇가지' : '사과', ic = ITEMS[k][0], ground = at(t.x + (P.pos.x - t.x) * .45, .2, t.z + (P.pos.z - t.z) * .45);
    await fly(ic, crown, ground, .55, { h: .2 }); fx(ic, ground, { life: .5, size: .4, upd: (p, u) => { p.s.position.y = ground.y + Math.abs(Math.sin(u * Math.PI * 2)) * .2 * (1 - u); } }); await M_.wait(.45);
    await M_.crouch(.4); await gain(k, 1 + (k === '나뭇가지' && Math.random() < .3 ? 1 : 0), ground); }
  else { const bees = [0, 1, 2].map(i => fx('🐝', crown, { life: 1.6, size: .22, upd: (p, u) => { const a = u * 10 + i * 2; p.s.position.set(P.pos.x + Math.cos(a) * .7, P.pos.y + 1.2 + Math.sin(u * 13) * .2, P.pos.z + Math.sin(a) * .7); } }));
    toast('🐝 앗, 벌이다! 도망쳐요~'); await mo(1.2, u => rigSet(0, .15 * Math.abs(wave(u, 4)), 0, 0, 0, .2 * wave(u, 6))); }
  ev('shake'); save();
}
async function mineRock(t) {
  await turnTo(t.x, t.z);
  if (S.mined[t.i]) { await M_.shake(.5); return toast('🪨 오늘은 이미 캤어요'); }
  S.mined[t.i] = 1; const rock = at(t.x, t.s * .6, t.z);
  await CRAFT_MO.hammer(rock); burst('🪨', rock, 3, { up: 1.4, speed: 1.2, life: .6, size: .16 });
  await gain('돌', 1 + (Math.random() < .25 ? 1 : 0), rock); ev('mine'); save();
}
function openShop() {
  let tab = 'sell';
  const SELL_NO = ['물'];
  const BUY = [['밀 씨앗', 15], ['토마토 씨앗', 25], ['당근 씨앗', 20], ['양배추 씨앗', 22], ['마시멜로', 20], ['새모이', 15]];
  const shop = at(-8.6, 1.2, 7.4);
  const coinFx = n => { for (let i = 0; i < Math.min(6, n); i++) setTimeout(() => fly('🪙', shop, head(1.6), .45, { h: .6, size: .25 }), i * 70); };
  const render = b => {
    const list = tab === 'sell' ? Object.entries(S.inv).filter(([k]) => !SELL_NO.includes(k)).map(([k, n]) => { const pr = (ITEMS[k] || FISHI(k) || ['🎁', 5])[1]; const ic = (ITEMS[k] || FISHI(k) || ['🎁'])[0];
      return row(ic, `${esc(k)} <small>×${n}</small>`, `개당 ₩${pr}`, `<button class="btn" data-a="sell" data-v="${esc(k)}">1개 팔기</button>${n > 1 ? ` <button class="btn sub" data-a="sellall" data-v="${esc(k)}">모두</button>` : ''}`); }).join('') || '<p>팔 수 있는 물건이 없어요. 낚시·채집을 해 보세요!</p>'
      : BUY.map(([k, pr]) => row(ITEMS[k][0], esc(k), `₩${pr} · ${esc(ITEMS[k][2])}`, `<button class="btn" data-a="buy" data-v="${esc(k)}" ${S.coins >= pr ? '' : 'disabled'}>사기</button>`)).join('');
    b.innerHTML = `<div class="tabs"><button data-a="tab" data-v="sell" class="${tab === 'sell' ? 'on' : ''}">팔기</button><button data-a="tab" data-v="buy" class="${tab === 'buy' ? 'on' : ''}">사기</button></div>${list}`;
    bindBtns(b, { tab: v => { tab = v; render(b); },
      sell: k => { const pr = (ITEMS[k] || FISHI(k) || [0, 5])[1]; add(k, -1, true); S.coins += pr; coinsUI(); beep(1200, .06, 'square', .03); coinFx(1); ev('sell'); save(); render(b); },
      sellall: k => { const n = S.inv[k] || 0, pr = (ITEMS[k] || FISHI(k) || [0, 5])[1]; add(k, -n, true); S.coins += pr * n; coinsUI(); ding(); coinFx(n); ev('sell', n); toast(`₩ ${(pr * n).toLocaleString()} 받았어요`); save(); render(b); },
      buy: k => { const pr = BUY.find(x => x[0] === k)[1]; if (S.coins < pr) return; S.coins -= pr; coinsUI(); add(k, 1, true); fly(ITEMS[k][0], shop, head(1.6), .45, { h: .6, size: .3 }); beep(900, .06); save(); render(b); } });
  };
  sheet('🛒', '잡화점', `가진 돈 ₩${S.coins.toLocaleString()}`, '', render);
}
const FISHI = k => { const f = FISH.find(x => x[0] === k) || OLD_FISH.find(x => x[0] === k); return f ? [f[1], f[3], f[4]] : null; };
function openGacha() {
  const mach = at(4.8, 1.3, 7.2);
  const render = b => {
    const free = S.freeGacha !== S.day, owned = Object.keys(S.gacha).length;
    b.innerHTML = `<p style="text-align:center;font-size:44px;margin:4px 0">🎁</p><p style="text-align:center">정보구출반 굿즈가 나와요! · 모은 것 ${owned}/${GACHA.length}</p>
      <div style="display:flex;gap:8px;justify-content:center;margin:10px 0"><button class="btn" data-a="spin" data-v="free" ${free ? '' : 'disabled'}>오늘의 무료 1회</button><button class="btn sub" data-a="spin" data-v="pay" ${S.coins >= 100 ? '' : 'disabled'}>₩100 뽑기</button></div>
      <div class="grid">${GACHA.map(([ic, nm, d, r]) => S.gacha[nm] ? `<div class="cell"><span class="ce">${ic}</span>${esc(nm)}<em>×${S.gacha[nm]}</em></div>` : `<div class="cell lock"><span class="ce">${ic}</span>???</div>`).join('')}</div>`;
    bindBtns(b, { spin: async v => {
      if (v === 'free') S.freeGacha = S.day; else { if (S.coins < 100) return; S.coins -= 100; coinsUI(); }
      const pool = []; GACHA.forEach((g, i) => { for (let k = 0; k < [0, 10, 5, 2, 1][g[3]]; k++) pool.push(i); });
      const g = GACHA[pool[Math.floor(Math.random() * pool.length)]], isNew = !S.gacha[g[1]]; S.gacha[g[1]] = (S.gacha[g[1]] || 0) + 1; ev('gacha'); save();
      closeSheet(); acting = true;
      try { // 손잡이 돌리기 → 캡슐 데굴 → 펑!
        for (let i = 0; i < 3; i++) { beep(500 + i * 200, .1, 'triangle', .05); await mo(.3, u => rigSet(0, 0, .06, .2, .35 * wave(u), 0)); }
        const cap = mach.clone().add(V3(0, -.6, .5)); await fly('🔮', cap, head(1.4), .5, { h: .5, size: .32 });
        burst('✨', head(1.6), 8, { up: 1.5, speed: 1.4, g: -1, life: .8, size: .22 }); burst('🎉', head(1.6), 3, { up: 2, speed: 1, life: 1, size: .3 }); ding();
        fx(g[0], head(2), { life: 1.2, size: .6 }); await M_.raise(1.1);
      } finally { acting = false; }
      sheet('🎁', '캡슐 뽑기', '하루 1번 무료', `<p style="text-align:center;font-size:64px;margin:6px 0">${g[0]}</p><p style="text-align:center"><b style="font-size:17px">${esc(g[1])}</b>${isNew ? ' <span style="color:#ff6a5a;font-weight:800">NEW!</span>' : ''}<br><small style="color:#8a7462">${esc(g[2])}</small></p><p style="text-align:center;margin-top:12px"><button class="btn" data-a="back">확인</button></p>`,
        b2 => bindBtns(b2, { back: () => { closeSheet(); openGacha(); } })); } });
  };
  sheet('🎁', '캡슐 뽑기', '하루 1번 무료', '', render);
}
function openForge() {
  const UP = [null, null, [{ '돌': 5, '나뭇가지': 5 }, 300], [{ '돌': 10, '나뭇가지': 10, '이상현상 조각': 1 }, 800]];
  const render = b => { const nx = S.rod + 1, u = UP[nx];
    b.innerHTML = `<p>에스키모가 망치를 들고 있어요. "Да. (응) 고쳐 줄게. 안 부수겠다… 아마."</p>` + row('🎣', `낚싯대 Lv.${S.rod}`, S.rod === 1 ? '기본 낚싯대' : S.rod === 2 ? '물고기가 덜 도망가요' : '희귀한 물고기가 잘 잡혀요', '')
      + (u ? row('🔨', `Lv.${nx}로 강화`, need(u[0]) + ` · ₩${u[1]}`, `<button class="btn" data-a="up" ${canMake(u[0]) && S.coins >= u[1] ? '' : 'disabled'}>강화</button>`) : '<p>최고 레벨이에요!</p>');
    bindBtns(b, { up: async () => { take(u[0]); S.coins -= u[1]; coinsUI(); S.rod = nx; closeSheet(); acting = true;
      try { const e = npcs.find(n => n.id === 'eskimo'); npcHop(e); await CRAFT_MO.hammer(at(-8.9, 1, -6.9)); burst('✨', head(2), 8, { up: 1.5, speed: 1.2, g: 0, life: .9, size: .24 }); fx('🎣', head(2.05), { life: 1.1, size: .55 }); ding(); await M_.raise(1); } finally { acting = false; }
      toast(`🔨 낚싯대가 Lv.${nx}이 됐어요!`); save(); openForge(); } }); };
  sheet('🔨', '공방', '도구 강화', '', render);
}
function openFarm() {
  const plotPos = i => [[17.8, 3], [22.6, 3], [17.8, 6.2], [22.6, 6.2]][i];
  const goPlot = async i => { const [x, z] = plotPos(i), ax = x + (P.pos.x > x ? 1.5 : -1.5), az = Math.max(2, Math.min(7.2, P.pos.z));
    // 밭 옆으로 통통 걸어가기
    const a = P.pos.clone(), b = V3(ax, W.groundY(ax, az), az), d = a.distanceTo(b); P.root.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    if (d > .3) await mo(Math.min(1.4, d / 4), u => { P.pos.lerpVectors(a, b, u); P.pos.y = W.groundY(P.pos.x, P.pos.z); P.phase += .3; rigSet(0, Math.abs(Math.sin(u * d * 3)) * .12, 0, .1); });
    await turnTo(x, z); return at(x, .55, z); };
  const reopen = () => openFarm();
  const render = b => {
    b.innerHTML = S.plots.map((p, i) => {
      if (!p) { const seeds = Object.keys(CROPS).filter(k => has(k)); return row('🟫', `${i + 1}번 밭 · 비어 있음`, seeds.length ? '씨앗을 골라 심어요' : '씨앗이 없어요 (잡화점에서 사요)', seeds.map(k => `<button class="btn sub" data-a="plant" data-v="${i}|${esc(k)}">${esc(k.replace(' 씨앗', ''))}</button>`).join(' ')); }
      const [crop, n, grow] = CROPS[p.seed], needT = grow / (p.wet ? 2 : 1), el = T() - p.at, ripe = el >= needT;
      return row(ripe ? (ITEMS[crop] || ['🌱'])[0] : el > needT / 2 ? '🌿' : '🌱', `${i + 1}번 밭 · ${esc(crop)}`, ripe ? '다 자랐어요!' : `약 ${Math.max(1, Math.ceil(needT - el))}분 뒤 수확${p.wet ? ' · 물 줌 💧' : ''}`,
        ripe ? `<button class="btn" data-a="harv" data-v="${i}">수확</button>` : p.wet ? '' : `<button class="btn sub" data-a="water" data-v="${i}" ${has('물') ? '' : 'disabled'}>💧 물주기</button>`);
    }).join('') + '<p style="font-size:12px;color:#9a8a78">물을 주면 두 배 빨리 자라요. (게임 속 1시간 = 실제 1분)</p>';
    bindBtns(b, {
      plant: async v => { const [i, k] = v.split('|'); if (!has(k)) return; add(k, -1, true); S.plots[+i] = { seed: k, at: T(), wet: false }; save(); closeSheet(); acting = true;
        try { const spot = await goPlot(+i); await mo(.4, u => rigSet(0, -.05 * u, 0, .4 * ease(u), 0, 0, 1.06, 1 - .14 * u, 1.06));
          for (let j = 0; j < 3; j++) { burst('🌱', spot, 1, { up: .6, speed: .5, life: .7, size: .22 }); beep(500 + j * 80, .05, 'triangle', .04); await mo(.3, u => rigSet(0, -.05, 0, .4 + .1 * wave(u), 0, .08 * wave(u), 1.06, .86, 1.06)); }
          await mo(.3, u => rigSet(0, -.05 * (1 - u), 0, .4 * (1 - u))); } finally { acting = false; } reopen(); },
      water: async v => { if (!has('물')) return; add('물', -1, true); S.plots[+v].wet = true; save(); closeSheet(); acting = true;
        try { const spot = await goPlot(+v); const g = hold('can'); g.position.set(0, .05, .1);
          await mo(1.4, u => { g.rotation.x = .9 * Math.min(1, u * 3); lean(.15); if (Math.random() < .5) fx('💧', spot.clone().add(V3((Math.random() - .5) * .8, .5, (Math.random() - .5) * .8)), { v: V3(0, -1.5, 0), life: .45, size: .18 }); });
          beep(300, .3, 'sine', .04); drop(g); await mo(.2, u => lean(.15 * (1 - u))); } finally { acting = false; } reopen(); },
      harv: async v => { const p = S.plots[+v], [crop, n] = CROPS[p.seed]; const got = n + (Math.random() < .3 ? 1 : 0); S.plots[+v] = null; closeSheet(); acting = true;
        try { const spot = await goPlot(+v); await mo(.35, u => rigSet(0, -.05 * u, 0, .35 * ease(u), 0, 0, 1.05, 1 - .12 * u, 1.05));
          await mo(.45, u => rigSet(0, -.05 + .1 * ease(u), 0, .35 - .6 * ease(u))); burst('🍃', spot, 3, { up: 1.2, speed: .8, life: .7, size: .2 });
          await gain(crop, got, spot); ev('harvest', got); save(); } finally { acting = false; } reopen(); } });
  };
  sheet('🌱', '텃밭', '심기 · 물주기 · 수확', '', render);
}
function openAquarium() {
  const door = at(-1, 1, -14.2);
  const render = b => {
    const donatable = FISH.filter(f => f[2] > 0 && has(f[0]) && !S.aqua[f[0]]), n = Object.keys(S.aqua).length;
    b.innerHTML = `<p>돔 안에서 ${n}종의 물고기가 헤엄치고 있어요. 새로운 종을 기증하면 전시돼요!</p>`
      + (donatable.length ? donatable.map(f => row(f[1], esc(f[0]), '아직 전시되지 않은 물고기', `<button class="btn" data-a="give" data-v="${esc(f[0])}">기증</button>`)).join('') : '<p style="color:#9a8a78">기증할 새 물고기가 없어요. 선착장에서 낚아 오세요!</p>')
      + `<div class="grid" style="margin-top:10px">${FISH.filter(f => f[2] > 0).map(f => S.aqua[f[0]] ? `<div class="cell"><span class="ce">${f[1]}</span>${esc(f[0])}</div>` : `<div class="cell lock"><span class="ce">${f[1]}</span>???</div>`).join('')}</div>`;
    bindBtns(b, { give: async k => { add(k, -1, true); S.aqua[k] = S.day; save(); closeSheet(); acting = true;
      try { const ic = FISHI(k)[0]; fx(ic, head(2), { life: .7, size: .5 }); await M_.raise(.6); await mo(.3, u => lean(.25 * u)); await fly(ic, head(1.6), door, .6, { h: 1 }); burst('💧', door, 6, { up: 1.5, speed: 1, life: .7, size: .2 }); ding(); await mo(.3, u => lean(.25 * (1 - u))); } finally { acting = false; }
      toast(`🐟 ${esc(k)}을(를) 기증했어요!`);
      if (!S.mainDone && Object.keys(S.aqua).length >= 5) { S.mainDone = true; money(500); const im = npcs.find(x => x.id === 'imiri'); npcHop(im); say('이미리', ['아쿠아리움에 다섯 종이 모였네요. 기록도 정확하고요.', '…잘했어요, 공유 씨. (보상 ₩500)']); hud(); save(); return; }
      hud(); save(); if (AREA === INS.aqua && INS.aqua) INS.aqua.setDonated(FISH.filter(f => S.aqua[f[0]]).map(f => f[6]), fishCanvas); openAquarium(); } });
  };
  sheet('🐟', '아쿠아리움', '물고기 기증 · 전시', '', render);
}
function openHouse() {
  const deco = [...Object.entries(S.decor).map(([nm, n]) => [CRAFT.find(c => c[1] === nm)?.[0] || '🪑', nm, n]), ...GACHA.filter(g => S.gacha[g[1]]).map(g => [g[0], g[1], S.gacha[g[1]]])];
  sheet('🏠', '오두막', '내 방 꾸미기', `<p>따뜻한 불빛이 새어 나오는 내 오두막. 모은 장식들이 방을 채우고 있어요.</p>`
    + (deco.length ? `<div class="grid">${deco.map(([ic, nm, n]) => `<div class="cell"><span class="ce">${ic}</span>${esc(nm)}<em>×${n}</em></div>`).join('')}</div>` : '<p style="color:#9a8a78">아직 장식이 없어요. 작업대에서 가구를 만들거나 캡슐을 뽑아 보세요.</p>')
    + `<p style="margin-top:12px;font-size:12px;color:#9a8a78">방 안을 직접 걸어 다니며 배치하는 기능은 다음 업데이트에서!</p>`);
}
function openMail() {
  S.letters.forEach(l => l.read = true); save(); hud();
  sheet('💌', '우체통', `편지 ${S.letters.length}통`, S.letters.map(l => row('✉️', esc(l.from) + ` <small>· ${l.day}일째</small>`, esc(l.text))).join('') || '<p>편지가 없어요.</p>');
}
let busking = 0;
async function busk() {
  if (T() - S.buskAt < 1) { await M_.shake(.5); return toast('🎸 손가락이 조금 아파요. 잠시 뒤에 다시 연주해요'); }
  S.buskAt = T(); await turnTo(-14.2, -9.4); const g = hold('guitar'); g.position.set(-.3, .05, .12);
  const notes = [523, 659, 784, 659, 698, 880, 784, 659, 587, 523];
  notes.forEach((f, i) => { beep(f, .28, 'triangle', .07, i * .3); beep(f / 2, .3, 'sine', .04, i * .3); setTimeout(() => fx(i % 2 ? '🎵' : '🎶', head(1.7), { v: V3((Math.random() - .5) * .8, .9, (Math.random() - .5) * .8), life: 1.3, size: .3 }), i * 300); });
  // 근처 친구들이 모여서 통통
  npcs.forEach(n => { if (n.root.position.distanceTo(P.pos) < 14) { n.tgt = V3(P.pos.x + (Math.random() - .5) * 4, 0, P.pos.z + 2 + Math.random() * 2); n.wait = 9; } });
  await mo(3.1, (u, t) => { rigSet(0, Math.abs(Math.sin(u * 30)) * .12, 0, 0, Math.sin(u * 15) * .35, Math.sin(u * 30) * .1); g.rotation.z = -1.1 + Math.sin(u * 60) * .08; });
  npcs.forEach(n => { if (n.root.position.distanceTo(P.pos) < 6) npcHop(n); });
  drop(g); const tip = 30 + Math.floor(Math.random() * 50) + Object.keys(S.friend).length * 5;
  for (let i = 0; i < 6; i++) setTimeout(() => fx('🪙', head(2.4).add(V3((Math.random() - .5) * 1.4, 0, (Math.random() - .5) * 1.4)), { v: V3(0, 0, 0), g: -6, life: .6, size: .25 }), i * 90);
  await M_.spin(.6); say('', [`👏👏 지나가던 친구들이 박수를 쳐요!`], () => money(tip)); ev('busk'); save();
}
async function photo(title) {
  const g = hold('camera'); g.position.set(-.36, .3, .1); await mo(.5, u => { g.position.y = .3 + .55 * ease(u); rigSet(0, 0, 0, -.1 * u); });
  beep(1400, .05, 'square', .05); burst('✨', front(.6, 1.3), 4, { up: .5, speed: 1, g: 0, life: .4, size: .3 });
  const keepUI = $('#ui').style.visibility; $('#ui').style.visibility = 'hidden'; drop(g); rigSet(); const pv = P.root.visible;
  await new Promise(r => requestAnimationFrame(r)); render(); const url = canvas.toDataURL('image/jpeg', .8); $('#ui').style.visibility = keepUI;
  const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), w = 360, h = Math.round(w * im.height / im.width); c.width = w; c.height = h; c.getContext('2d').drawImage(im, 0, 0, w, h);
    S.photos.unshift({ t: title, d: S.day, h: Math.floor(S.h), u: c.toDataURL('image/jpeg', .7) }); S.photos = S.photos.slice(0, 8); save(); }; im.src = url;
  const f = $('#fade'); f.style.background = '#fff'; f.classList.add('on'); setTimeout(() => { f.classList.remove('on'); setTimeout(() => f.style.background = '', 600); }, 90);
  ev('photo'); await M_.hop(.35);
  sheet('📷', title, `${S.day}일째 ${Math.floor(S.h)}시`, `<img src="${url}" style="width:100%;border-radius:14px;display:block"><p style="display:flex;gap:8px;margin-top:10px"><a class="btn" href="${url}" download="마이세카이_${S.day}일째.jpg" style="text-decoration:none">사진 저장</a><button class="btn sub" data-x>닫기</button></p><p style="font-size:12px;color:#9a8a78">⚙️설정 → 앨범에서 다시 볼 수 있어요.</p>`);
}

// ================= 낚시 =================
let fishing = null;
const pondPreset = () => S.h >= 20 || S.h < 5 ? 'night' : S.h >= 17.5 || S.h < 6.5 ? 'dusk' : 'day';
async function startFishing() {
  if (!W.onDock(P.pos.x, P.pos.z) && P.pos.distanceTo(V3(-20.5, P.pos.y, 3.6)) > 2.2) { waypoint = null; P.pos.set(-20.5, W.groundY(-20.5, 3.6), 3.6); }
  P.vel.set(0, 0, 0); P.speed = 0; await turnTo(-20.5, -2); actionCam(true); P.rod.visible = true;
  // 던지기: 뒤로 젖혔다가 휙
  await mo(.45, u => { P.rod.rotation.x = .9 - 1.7 * ease(u); rigSet(0, 0, 0, -.18 * ease(u)); });
  beep(700, .12, 'sine', .04); await mo(.4, u => { P.rod.rotation.x = -.8 + 2.1 * ease(u); rigSet(0, 0, 0, .2 * Math.sin(u * Math.PI)); });
  burst('💧', front(3, .1), 6, { up: 1.3, speed: .7, life: .6, size: .2 });
  fishing = { caught: [] };
  await new Promise(r => setTimeout(r, 250));
  startPond({ toast: s => toast(esc(s)), preset: pondPreset,
    onCatch: (f, cm, first) => { add(f.name, 1, true); S.dex[f.name] = (S.dex[f.name] || 0) + 1; ev('fish'); fishing && fishing.caught.push([f, cm, first]); save(); },
    onClose: () => endFishing() });
}
async function endFishing() {
  const got = fishing ? fishing.caught : []; fishing = null;
  if (got.length) { const best = got.slice().sort((a, b) => b[0].r - a[0].r)[0]; acting = true; try { await gain(best[0].name, 0, front(3, .2)); } finally { acting = false; }
    toast(`🎣 ${got.length}마리 낚았어요! 가장 귀한 건 ${esc(best[0].name)} (${best[1]}cm)`, 3200); }
  await mo(.3, u => { P.rod.rotation.x = 1.3 - .4 * u; }); P.rod.visible = false; P.rod.rotation.x = .9;
}
function fishTap() {}
function fishTick() {}

// ================= 가방 · 도감 · 퀘스트 · 설정 =================
function openBag() {
  const inv = Object.entries(S.inv);
  sheet('🎒', '가방', `₩${S.coins.toLocaleString()} · ${inv.length}종`, inv.length ? `<div class="grid">${inv.map(([k, n]) => { const it = ITEMS[k] || FISHI(k) || ['🎁', 0, '']; return `<div class="cell" title="${esc(it[2] || '')}"><span class="ce">${it[0]}</span>${esc(k)}<em>×${n}</em></div>`; }).join('')}</div>` : '<p>비어 있어요.</p>');
}
const picCache = {}; const fishPic = i => picCache[i] || (picCache[i] = fishCanvas(FISH[i][6], 200, 120).toDataURL());
function openDex() {
  let tab = 'fish';
  const render = b => {
    const tabs = `<div class="tabs"><button data-a="t" data-v="fish" class="${tab === 'fish' ? 'on' : ''}">물고기 ${Object.keys(S.dex).length}/${FISH.length}</button><button data-a="t" data-v="gacha" class="${tab === 'gacha' ? 'on' : ''}">굿즈 ${Object.keys(S.gacha).length}/${GACHA.length}</button><button data-a="t" data-v="friend" class="${tab === 'friend' ? 'on' : ''}">친구</button></div>`;
    let body = '';
    if (tab === 'fish') body = `<div class="grid">${FISH.map((f, i) => S.dex[f[0]] ? `<div class="cell" data-a="f" data-v="${i}"><img src="${fishPic(i)}" style="width:100%;display:block">${esc(f[0])}<em>×${S.dex[f[0]]}</em></div>` : `<div class="cell lock"><span class="ce">❓</span>???</div>`).join('')}</div><div id="fdesc" style="margin-top:10px"></div>`;
    if (tab === 'gacha') body = `<div class="grid">${GACHA.map(g => S.gacha[g[1]] ? `<div class="cell"><span class="ce">${g[0]}</span>${esc(g[1])}</div>` : `<div class="cell lock"><span class="ce">❓</span>???</div>`).join('')}</div>`;
    if (tab === 'friend') body = NPCS.map(n => row('🙂', esc(n.name), '💗'.repeat(Math.min(10, S.friend[n.id] || 0)) || '아직 서먹해요')).join('') + row('🐈', '고양이', '💗'.repeat(Math.min(10, S.friend.cat || 0)) || '쓰다듬어 주세요');
    b.innerHTML = tabs + body;
    bindBtns(b, { t: v => { tab = v; render(b); }, f: v => { const f = FISH[+v]; $('#fdesc').innerHTML = `<div class="row" style="flex-direction:column;align-items:stretch"><img src="${fishPic(+v)}" style="width:60%;margin:0 auto;display:block"><b>${esc(f[0])} ${'★'.repeat(Math.max(1, f[2]))}</b><small>${esc(f[4])} · ₩${f[3]} · 잡은 수 ${S.dex[f[0]]}</small></div>`; pop(); } });
  };
  sheet('📘', '도감', '잡은 물고기만 보여요', '', render);
}
function openQuests() {
  const render = b => {
    b.innerHTML = row('⭐', '메인 · 아쿠아리움에 물고기 5종 기증', S.mainDone ? '완료!' : `${Object.keys(S.aqua).length}/5 · 보상 ₩500`)
      + S.quests.list.map((q, i) => row(q.got ? '✅' : q.done ? '🎉' : '📌', esc(q.t), `${q.have}/${q.n} · 보상 ₩${q.rw}`, q.done && !q.got ? `<button class="btn" data-a="claim" data-v="${i}">보상 받기</button>` : '')).join('')
      + '<p style="font-size:12px;color:#9a8a78">일일 의뢰는 매일 아침 바뀌어요. 텐트에서 자면 다음 날이 돼요.</p>';
    bindBtns(b, { claim: v => { const q = S.quests.list[+v]; if (q.got) return; q.got = true; money(q.rw); ding(); hud(); save(); render(b); } });
  };
  sheet('📜', '퀘스트 게시판', `${S.day}일째 의뢰`, '', render);
}
function openMore() {
  const render = b => {
    b.innerHTML = `<div class="tabs"><button data-a="album">📷 앨범 (${S.photos.length})</button><button data-a="mail">💌 편지</button><button data-a="help">❔ 조작법</button></div>`
      + row('💾', '저장', '자동으로도 저장돼요', `<button class="btn" data-a="save">지금 저장</button>`)
      + row('🕐', '시간', `${S.day}일째 ${String(Math.floor(S.h)).padStart(2, '0')}:${String(Math.floor(S.h % 1 * 60)).padStart(2, '0')}`, '')
      + row('🏠', '싸이 사이트로 돌아가기', '진행 상황은 저장돼요', `<a class="btn sub" href="../../index.html#/games" style="text-decoration:none" onclick="window.__save&&window.__save()">나가기</a>`)
      + row('🔄', '처음부터 다시', '모든 기록이 지워져요', `<button class="btn sub" data-a="reset">초기화</button>`);
    bindBtns(b, {
      save: () => { save(); toast('💾 저장했어요'); },
      album: () => { b.innerHTML = S.photos.length ? S.photos.map(p => `<p><img src="${p.u}" style="width:100%;border-radius:12px;display:block"><small>${esc(p.t)} · ${p.d}일째 ${p.h}시</small></p>`).join('') : '<p>아직 사진이 없어요. 전망대나 포토 스팟에서 찍어 보세요.</p>'; },
      mail: () => openMail(),
      help: () => { b.innerHTML = '<p><b>PC</b><br>WASD/방향키 이동 · Shift 달리기 · Space 점프 · F 상호작용 · M 지도 · I 가방 · 마우스 드래그로 시야 · 휠로 확대/축소</p><p><b>폰·아이패드</b><br>화면 왼쪽을 엄지로 끌어 이동 · 오른쪽을 끌어 시야 · 두 손가락으로 확대/축소 · 오른쪽 아래 버튼으로 상호작용</p><p><b>팁</b><br>나무를 흔들면 나뭇가지·사과, 바위에선 돌이 나와요. 밤에는 특별한 물고기가 나와요…</p>'; },
      reset: el => { if (el.dataset.ok) { localStorage.removeItem(KEY); location.reload(); } else { el.dataset.ok = 1; el.textContent = '정말 지울까요?'; } } });
  };
  sheet('⚙️', '설정', '마이세카이', '', render);
}


// ================= 움직임 · 카메라 · 루프 =================
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), want = new THREE.Vector3(), tmp = new THREE.Vector3(), camGoal = new THREE.Vector3();
let shake = 0, tAcc = 0, saveAcc = 0, hudAcc = 0, dustAcc = 0;
// 카메라를 가리는 것들 (나무 윗부분 = 구, 건물 = 원기둥)
let BLOCK = null;
function blockers() {
  if (BLOCK) return BLOCK; BLOCK = { sph: [], cyl: [] };
  W.COLS.filter(c => c.h >= 50).forEach(c => { if (c.t === 'b' && (c.hw > 1 || c.hd > 1)) BLOCK.cyl.push([c.x, c.z, Math.max(c.hw, c.hd) * .9, 4.2]); else if (c.t === 'c' && c.r >= 1) BLOCK.cyl.push([c.x, c.z, c.r * .9, c.r > 5 ? 7.5 : 4.5]); });
  return BLOCK;
}
// focus → camera 방향으로 가는 선이 처음 막히는 비율 (0~1)
function camHit(f, dir, len) {
  let best = 1; const B = blockers();
  for (const [x, y, z, r] of B.sph) { const ox = f.x - x, oy = f.y - y, oz = f.z - z, b = ox * dir.x + oy * dir.y + oz * dir.z, c = ox * ox + oy * oy + oz * oz - r * r; if (c < 0) continue; const h = b * b - c; if (h < 0) continue; const t = -b - Math.sqrt(h); if (t > .3 && t / len < best) best = t / len; }
  for (const [x, z, r, ht] of B.cyl) { const ox = f.x - x, oz = f.z - z, a = dir.x * dir.x + dir.z * dir.z; if (a < 1e-6) continue; const b = ox * dir.x + oz * dir.z, c = ox * ox + oz * oz - r * r; if (c < 0) continue; const h = b * b - a * c; if (h < 0) continue; const t = (-b - Math.sqrt(h)) / a; if (t > .3 && t / len < best && f.y + dir.y * t < ht) best = t / len; }
  return best;
}
function update(dt, t) {
  // 시간 흐름: 실제 1분 = 게임 1시간
  S.h += dt / 60; if (S.h >= 24) { S.h -= 24; S.day++; ensureDaily(); hud(); }
  const busy = sheetOpen || talking() || fishing || pm || acting;
  // ---- 이동 입력 (카메라 기준) ----
  want.set(0, 0, 0); let mag = 0;
  if (!busy && !P.pose) {
    const k = c => keys.has(c); const ix = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0), iz = (k('KeyS') || k('ArrowDown') ? 1 : 0) - (k('KeyW') || k('ArrowUp') ? 1 : 0);
    let ax = ix + joyV.x, az = iz + joyV.y; const l = Math.hypot(ax, az); mag = Math.min(1, l); if (l > 0) { ax /= l; az /= l; }
    fwd.set(-Math.sin(camS.yaw), 0, -Math.cos(camS.yaw)); right.set(-fwd.z, 0, fwd.x);
    want.addScaledVector(right, ax).addScaledVector(fwd, -az); if (want.lengthSq() > 0) want.normalize();
  } else if (P.pose && !pm && !acting && (joyV.length() > .5 || MOVE_KEYS.some(c => keys.has(c)))) { P.pose = null; if (P.seat) { P.seat = null; P.pos.addScaledVector(V3(Math.sin(P.root.rotation.y), 0, Math.cos(P.root.rotation.y)), .55); } }
  if (camSave && !busy && mag > .1) actionCam(false);   // 다시 걷기 시작하면 카메라 원래대로
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || runToggle || (joyId !== null && mag > .94);
  const top = (run ? 6.8 : 3.8) * (joyId !== null && !run ? Math.min(1, mag / .8) : mag > 0 ? 1 : 0);
  // 가속·감속 (미끄럽지 않게 빠르게 붙되, 방향 전환은 부드럽게)
  const accel = top > P.vel.length() ? 18 : 24, tv = tmp.copy(want).multiplyScalar(top);
  P.vel.x += (tv.x - P.vel.x) * Math.min(1, dt * accel * .5); P.vel.z += (tv.z - P.vel.z) * Math.min(1, dt * accel * .5);
  P.speed = Math.hypot(P.vel.x, P.vel.z);
  if (P.speed > .05) { P.pos.x += P.vel.x * dt; P.pos.z += P.vel.z * dt;
    if (mag > .05) { const wa = Math.atan2(want.x, want.z); let d = wa - P.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); P.root.rotation.y += d * Math.min(1, dt * 14); } }
  const bx = P.pos.x, bz = P.pos.z; if (!P.seat) A().collide(P.pos, .36, P.pos.y);
  if (!AREA) for (const n of npcs) { const dx = P.pos.x - n.root.position.x, dz = P.pos.z - n.root.position.z, d = Math.hypot(dx, dz); if (d < .75 && d > 1e-4) { P.pos.x = n.root.position.x + dx / d * .75; P.pos.z = n.root.position.z + dz / d * .75; } }
  if (dt > 0) { const cx = (P.pos.x - bx) / dt, cz = (P.pos.z - bz) / dt; P.vel.x += cx * .5; P.vel.z += cz * .5; }   // 벽에 닿으면 그 방향 속도 줄이기 (미끄러지듯)
  // ---- 점프 (코요테 타임 · 입력 버퍼) ----
  const gy = P.seat ? P.seat.y : A().ground(P.pos.x, P.pos.z, P.pos.y);
  P.jbuf -= dt; P.air += dt;
  if (P.jbuf > 0 && P.air < .12 && !P.pose && !busy) { P.vy = 7.0; P.ground = false; P.air = 1; P.jbuf = 0; beep(420, .08, 'triangle', .05); burst('💨', P.pos.clone().add(V3(0, .1, 0)), 3, { up: .3, speed: .8, g: 0, life: .4, size: .2, grow: 1 }); }
  if (P.seat) { P.vy = 0; P.pos.y = P.seat.y; } else { P.vy -= (P.vy > 0 ? 20 : 30) * dt; P.pos.y += P.vy * dt; }
  if (P.pos.y <= gy) { if (!P.ground && P.vy < -3) { P.land = .18; burst('💨', P.pos.clone().add(V3(0, .1, 0)), 3, { up: .2, speed: 1, g: 0, life: .35, size: .2, grow: 1 }); } P.pos.y = gy; P.vy = 0; P.ground = true; P.air = 0; }
  else if (P.pos.y > gy + .08) P.ground = false; else { P.pos.y += (gy - P.pos.y) * Math.min(1, dt * 20); P.air = 0; }
  P.root.position.copy(P.pos);
  // ---- 캐릭터 몸짓 ----
  if (pm) { pm.t += dt; const u = Math.min(1, pm.t / pm.dur); pm.fn(u, pm.t, dt); if (u >= 1) { const r = pm.res; pm = null; r(); } }
  else if (!fishing) {
    const s01 = Math.min(1, P.speed / 3.8); P.phase += dt * (5 + P.speed * 2.4); P.land = Math.max(0, (P.land || 0) - dt);
    const br = Math.sin(t * 2.4) * .012;
    if (P.pose === 'sit') rigSet(0, P.seat ? -.05 : -.06, 0, -.08, 0, 0, 1.07, .88 + br, 1.07);
    else if (P.pose === 'lie') { rigSet(0, .3, 0, -1.45, 0, 0); P.zz = (P.zz || 0) + dt; if (P.zz > 1.3) { P.zz = 0; fx('💤', head(.9), { v: V3(.2, .5, 0), life: 1.4, size: .28, grow: .6 }); } }
    else if (P.pose === 'under') rigSet(0, -1.6);
    else if (!P.ground) { const k = THREE.MathUtils.clamp(P.vy / 7, -1, 1); rigSet(0, 0, 0, .1 * s01, 0, 0, 1 - .06 * k, 1 + .1 * k, 1 - .06 * k); }
    else if (P.land > 0) { const k = P.land / .18; rigSet(0, 0, 0, 0, 0, 0, 1 + .12 * k, 1 - .2 * k, 1 + .12 * k); }
    else if (s01 > .05) { const hop = Math.abs(Math.sin(P.phase)) * (run ? .18 : .12) * s01, sq = 1 - Math.cos(P.phase * 2) * .04 * s01;
      rigSet(0, hop, 0, s01 * (run ? .2 : .12), 0, Math.sin(P.phase) * .07 * s01, 1 + (1 - sq) * .5, sq, 1 + (1 - sq) * .5); P.idle = 0;
      dustAcc += dt; if (run && dustAcc > .18) { dustAcc = 0; fx('💨', P.pos.clone().add(V3(-P.vel.x * .05, .08, -P.vel.z * .05)), { v: V3(0, .3, 0), life: .45, size: .16, grow: 1.2 }); } }
    else { P.idle += dt; const look = P.idle > 6 ? Math.sin((P.idle - 6) * .9) * .35 * Math.min(1, (P.idle - 6)) : 0; rigSet(0, 0, 0, 0, look, 0, 1 - br * .5, 1 + br, 1 - br * .5);
      if (P.idle > 14 && Math.floor(P.idle) % 9 === 0 && P.idle % 1 < dt) fx('🎵', head(1.8), { v: V3(.2, .5, 0), life: 1.2, size: .25 }); }
  }
  // ---- NPC: 집 근처를 산책 · 말 걸면 통통 ----
  for (const n of npcs) {
    const p = n.root.position; n.wait -= dt;
    if (!n.tgt && n.wait <= 0 && !talking()) { const a = Math.random() * 6.28, r = Math.random() * 2.4; n.tgt = new THREE.Vector3(n.home.x + Math.cos(a) * r, 0, n.home.z + Math.sin(a) * r); }
    let spd = 0;
    if (n.tgt) { const dx = n.tgt.x - p.x, dz = n.tgt.z - p.z, d = Math.hypot(dx, dz); if (d < .15) { n.tgt = null; n.wait = 2 + Math.random() * 5; } else { spd = d > 3 ? 2.6 : 1.3; const wa = Math.atan2(dx, dz); let da = wa - n.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); n.root.rotation.y += da * Math.min(1, dt * 6); p.x += dx / d * spd * dt; p.z += dz / d * spd * dt; const q = new THREE.Vector3(p.x, 0, p.z); W.collide(q, .35); p.x = q.x; p.z = q.z; } }
    else if (p.distanceTo(P.pos) < 3.2 && !busy) { const wa = Math.atan2(P.pos.x - p.x, P.pos.z - p.z); let da = wa - n.root.rotation.y; da = Math.atan2(Math.sin(da), Math.cos(da)); n.root.rotation.y += da * Math.min(1, dt * 3); }   // 가까이 가면 쳐다봄
    p.y = W.groundY(p.x, p.z); n.phase += dt * (spd ? 9 : 0);
    if (n.hop > 0) { n.hop -= dt * 1.6; const k = Math.max(0, n.hop), h = Math.abs(Math.sin((1 - k) * Math.PI * 2)) * .3; n.rig.position.y = h; n.rig.scale.set(1, 1 + h * .3, 1); }
    else { n.rig.position.y = spd ? Math.abs(Math.sin(n.phase)) * .1 : 0; n.rig.rotation.z = spd ? Math.sin(n.phase) * .06 : 0; const sq = 1 + Math.sin(t * 2.4 + n.home.x) * .012; n.rig.scale.set(1, sq, 1); }
    n.lb.visible = p.distanceTo(P.pos) < 10;
  }
  // ---- 카메라 ----
  const dragging = ptrs.size > 0, sinceDrag = now() - camS.lastDrag;
  if (!dragging && (Math.abs(camS.vYaw) > .01 || Math.abs(camS.vPitch) > .01)) { camS.tYaw += camS.vYaw * dt; camS.tPitch = THREE.MathUtils.clamp(camS.tPitch + camS.vPitch * dt, .05, 1.2); const dec = Math.exp(-dt * 6); camS.vYaw *= dec; camS.vPitch *= dec; }
  // 걸을 때 카메라가 천천히 등 뒤로 돌아감 (직접 돌린 직후에는 안 함)
  if (!busy && P.speed > .5 && sinceDrag > 1.2 && !dragging) { const behind = P.root.rotation.y + Math.PI; let d = behind - camS.tYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < 2.4) camS.tYaw += d * Math.min(1, dt * 1.1 * Math.min(1, P.speed / 3.8)); }
  const k = 1 - Math.exp(-dt * 10); camS.yaw += (camS.tYaw - camS.yaw) * k; camS.pitch += (camS.tPitch - camS.pitch) * k; camS.dist += (camS.tDist - camS.dist) * (1 - Math.exp(-dt * 6));
  const focus = V3(P.pos.x, P.pos.y + 1.1, P.pos.z);
  // 가려지면: 먼저 위·아래로 각도를 바꿔 피해 보고, 그래도 막히면 조금만 다가감 (너무 붙지 않게)
  const tryDir = p => V3(Math.sin(camS.yaw) * Math.cos(p), Math.sin(p), Math.cos(camS.yaw) * Math.cos(p));
  let bestP = camS.pitch, bestK = 0;
  for (const dp of (A().scene ? [0] : [0, .2, -.15, .4])) { const pp = THREE.MathUtils.clamp(camS.pitch + dp, .02, 1.35), kk = camHit(focus, tryDir(pp), camS.dist); if (kk > bestK + .05) { bestK = kk; bestP = pp; } if (kk >= .999) break; }
  camS.avoid = (camS.avoid ?? camS.pitch) + (bestP - (camS.avoid ?? camS.pitch)) * (1 - Math.exp(-dt * 4));
  const dir = tryDir(camS.avoid), goalD = A().scene ? camS.dist : Math.max(4.2, camS.dist * camHit(focus, dir, camS.dist) - .3);   // 너무 붙지 않고, 남은 가림은 망점으로 뚫어 보여줌
  camS.real += (goalD - camS.real) * (1 - Math.exp(-dt * (goalD < camS.real ? 10 : 2.5)));
  camGoal.copy(focus).addScaledVector(dir, camS.real);
  A().cam(camGoal);
  cam.position.copy(camGoal);
  if (shake > 0) { shake -= dt; cam.position.x += (Math.random() - .5) * shake * .5; cam.position.y += (Math.random() - .5) * shake * .5; }
  cam.lookAt(focus); W.SEE.uCam.value.copy(cam.position); W.SEE.uFocus.value.copy(focus);
  // ---- 하늘 · 빛 · 효과 ----
  if (A().scene) A().tick(t, dt); else { W.setTime(S.h, P.pos); W.tick(t, dt); } fxTick(dt);
  if (waypoint && Math.hypot(P.pos.x - waypoint.p[0], P.pos.z - waypoint.p[1]) < 2.2) { toast(`📍 ${esc(waypoint.nm)}에 도착했어요`); waypoint = null; }
  tAcc += dt; if (tAcc > .12) { tAcc = 0; target = busy ? null : findTarget(); showPrompt(); if (!A().scene) drawMini(); }
  hudAcc += dt; if (hudAcc > 1) { hudAcc = 0; const h = Math.floor(S.h), mi = Math.floor(S.h % 1 * 60 / 10) * 10;
    const ic = h < 5 || h >= 21 ? '🌙' : h < 7 ? '🌄' : h < 17 ? '☀️' : h < 19.5 ? '🌅' : '🌆';
    $('#pic').textContent = AREA && AREA.icon || ic; $('#pname').textContent = AREA ? AREA.name : nearArea(); $('#ptime').textContent = `${S.day}일째 · ${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')}${waypoint ? ` · 📍${waypoint.nm} ${Math.round(Math.hypot(P.pos.x - waypoint.p[0], P.pos.z - waypoint.p[1]))}m` : ''}`;
    if (!AREA || AREA.tower) $('#vig').style.background = h < 5 || h >= 21 ? 'radial-gradient(ellipse 80% 75% at 50% 55%,transparent 55%,rgba(5,8,25,.38))' : ''; }
  saveAcc += dt; if (saveAcc > 8) { saveAcc = 0; save(); }
}
function nearArea() {
  const x = P.pos.x, z = P.pos.z, A = [['오두막 마당', 1, 2, 9], ['텃밭', 22, 4, 10], ['호숫가', -22, 1, 11], ['아쿠아리움', -1, -20, 10], ['풍차 언덕', 11, -10, 6], ['정자 숲', -8, -11, 6]];
  let best = '마이세카이 숲길', bd = 1e9; A.forEach(([n, ax, az, r]) => { const d = Math.hypot(x - ax, z - az) - r; if (d < 0 && d < bd) { bd = d; best = n; } }); return best;
}
function render() { if (composer) { rpass.scene = curScene; composer.render(); } else renderer.render(curScene, cam); }
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, clock.getDelta()), t = clock.elapsedTime;
  if (ready) update(dt, t); else { cam.position.set(0, 10, 26); cam.lookAt(0, 1, 2); W && W.tick(t, dt); }
  render();
}
window.__save = save;
if (location.hash.includes('debug')) window.__ms = { setArea, doPose, get AREA() { return AREA; }, get S() { return S; }, get P() { return P; }, act, get target() { return target; }, ACTS, fishTap, openMap, W: () => W, get pm() { return pm; } };
document.addEventListener('visibilitychange', () => { if (document.hidden && ready) save(); });
