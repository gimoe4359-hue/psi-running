/**
 * 싸이뛰어 게시판 확장 — 사진 올리기 · 글/댓글 수정 · 빠른 응답(캐시)
 *
 * 설치 (한 번만, 5분)
 * 1) 게시판 Apps Script 편집기를 열고, 기존 코드에서 함수 이름 두 개만 바꿔요.
 *      function doGet(   →  function doGetOrig_(
 *      function doPost(  →  function doPostOrig_(
 * 2) 왼쪽 파일 목록의 [+] → 스크립트 → 이름 board-plus → 이 파일 내용을 전부 붙여넣고 저장
 * 3) 배포 → 배포 관리 → 연필(수정) → 버전: 새 버전 → 배포   (사이트 주소는 그대로예요)
 * 4) 권한 허용 창이 뜨면 허용 (사진을 드라이브에 저장하려고 필요해요)
 *
 * - 사진은 드라이브 'psi-board-images' 폴더에 저장되고, 링크가 있는 사람만 볼 수 있게 공유돼요.
 * - 글/댓글 수정은 같은 스프레드시트의 'edits' 탭에 저장돼요. (원래 글 데이터는 건드리지 않아요)
 * - chat.gs(송천동 AI 대화)가 있으면 그것도 여기서 같이 처리해요.
 */
const PLUS = { folder: 'psi-board-images', maxBytes: 5 * 1024 * 1024, cacheSec: 25 };

function plusSS_() {
  if (typeof getSS === 'function') { try { const x = getSS(); if (x) return x; } catch (e) {} }
  try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return null; }
}
function plusText_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function plusJson_(o) { return plusText_(JSON.stringify(o)); }
function plusVer_() { const c = CacheService.getScriptCache(); let v = c.get('plusVer'); if (!v) { v = String(Date.now()); c.put('plusVer', v, 21600); } return v; }
function plusBump_() { CacheService.getScriptCache().put('plusVer', String(Date.now()) + Math.random().toString(36).slice(2, 6), 21600); }

function doGet(e) {
  const p = (e && e.parameter) || {}, a = p.action;
  if (a === 'plus') return plusJson_({ ok: true, plus: 1 });
  if (a === 'posts' || a === 'post') {
    try {
      plusEnsureFandom_();
      const cache = CacheService.getScriptCache(), key = ['g', plusVer_(), a, p.id || '', p.dev || ''].join(':'), hit = a === 'posts' ? cache.get(key) : null;
      if (hit) return plusText_(hit);
      const out = JSON.parse(doGetOrig_(e).getContent());
      if (out && out.ok) { plusApplyEdits_(out); out.plus = 1; }
      const s = JSON.stringify(out); if (a === 'posts' && s.length < 95000) cache.put(key, s, PLUS.cacheSec);
      return plusText_(s);
    } catch (err) { /* 확장에 문제가 생겨도 원래 동작은 그대로 */ }
  }
  return doGetOrig_(e);
}

function doPost(e) {
  let body = {}; try { body = JSON.parse(e.postData.contents); } catch (x) {}
  const a = body.action;
  try {
    if (a === 'upload') return plusJson_(plusUpload_(body));
    if (a === 'post_edit' || a === 'comment_edit') { const r = plusEdit_(body, a === 'post_edit' ? 'post' : 'comment'); if (r.ok) plusBump_(); return plusJson_(r); }
    if (a === 'chat' && typeof handleChat_ === 'function') return plusJson_(handleChat_(body));
  } catch (err) { return plusJson_({ ok: false, error: 'server' }); }
  const res = doPostOrig_(e); plusBump_(); return res;
}

function plusRate_(dev, kind, max, sec) {
  const c = CacheService.getScriptCache(), k = 'r:' + kind + ':' + dev, n = Number(c.get(k) || 0);
  if (n >= max) return false; c.put(k, String(n + 1), sec); return true;
}
function plusDev_(b) { const d = String(b.dev || ''); return /^[A-Za-z0-9_-]{4,40}$/.test(d) ? d : ''; }

/* 사진 올리기: 브라우저에서 줄인 사진(base64)을 드라이브에 저장 */
function plusUpload_(b) {
  const dev = plusDev_(b); if (!dev) return { ok: false, error: 'dev' };
  const mime = String(b.mime || ''); if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) return { ok: false, error: 'type' };
  const data = String(b.data || ''); if (!/^[A-Za-z0-9+/=]+$/.test(data)) return { ok: false, error: 'data' };
  if (!plusRate_(dev, 'up', 60, 600)) return { ok: false, error: 'rate' };
  const bytes = Utilities.base64Decode(data); if (bytes.length > PLUS.maxBytes) return { ok: false, error: 'size' };
  const ext = mime.split('/')[1].replace('jpeg', 'jpg');
  const file = plusFolder_().createFile(Utilities.newBlob(bytes, mime, 'p' + Date.now() + '_' + dev.slice(0, 6) + '.' + ext));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, id: file.getId() };
}
function plusFolder_() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('PLUS_FOLDER');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const it = DriveApp.getFoldersByName(PLUS.folder), f = it.hasNext() ? it.next() : DriveApp.createFolder(PLUS.folder);
  pr.setProperty('PLUS_FOLDER', f.getId()); return f;
}

/* 수정: 원래 서버에 '내 글/내 댓글'인지 물어본 뒤 edits 탭에 저장 */
function plusEdit_(b, kind) {
  const dev = plusDev_(b); if (!dev) return { ok: false, error: 'dev' };
  if (!plusRate_(dev, 'ed', 30, 600)) return { ok: false, error: 'rate' };
  const pid = String(b.id || b.post || ''); if (!/^[A-Za-z0-9_-]{1,60}$/.test(pid)) return { ok: false, error: 'id' };
  const orig = JSON.parse(doGetOrig_({ parameter: { action: 'post', id: pid, dev: dev } }).getContent());
  if (!orig || !orig.ok || !orig.post) return { ok: false, error: 'notfound' };
  let key, title = '', text = String(b.body || '').trim();
  if (kind === 'post') {
    if (!orig.post.mine) return { ok: false, error: 'owner' };
    title = String(b.title || '').trim().slice(0, 60); text = text.slice(0, 2000);
    if (title.length < 1 || text.length < 1) return { ok: false, error: 'empty' };
    key = 'p:' + pid;
  } else {
    const cid = String(b.cid || ''); const c = (orig.post.comments || []).find(x => String(x.id) === cid);
    if (!c || !c.mine) return { ok: false, error: 'owner' };
    text = text.slice(0, 300); if (!text) return { ok: false, error: 'empty' };
    key = 'c:' + pid + ':' + cid;
  }
  const sh = plusSheet_(), v = sh.getDataRange().getValues(), now = Date.now();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === key) { sh.getRange(i + 1, 2, 1, 3).setValues([[title, text, now]]); return { ok: true, t: now }; }
  sh.appendRow([key, title, text, now]); return { ok: true, t: now };
}
function plusSheet_() {
  let ss = plusSS_();
  if (!ss) { const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('PLUS_SS'); if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} } if (!ss) { ss = SpreadsheetApp.create('psi-board-plus'); pr.setProperty('PLUS_SS', ss.getId()); } }
  let sh = ss.getSheetByName('edits'); if (!sh) { sh = ss.insertSheet('edits'); sh.appendRow(['key', 'title', 'body', 't']); }
  return sh;
}
function plusApplyEdits_(out) {
  const c = CacheService.getScriptCache(), ck = 'edits:' + plusVer_(); let map = null, hit = c.get(ck);
  if (hit) map = JSON.parse(hit); else { map = {}; const v = plusSheet_().getDataRange().getValues(); for (let i = 1; i < v.length; i++) map[v[i][0]] = [v[i][1], v[i][2], v[i][3]]; const s = JSON.stringify(map); if (s.length < 95000) c.put(ck, s, 600); }
  const fix = p => { const e = map['p:' + p.id]; if (e) { if (e[0]) p.title = e[0]; p.body = e[1]; p.edited = e[2]; } };
  if (Array.isArray(out.posts)) out.posts.forEach(fix);
  if (out.post) { fix(out.post); (out.post.comments || []).forEach(cm => { const e = map['c:' + out.post.id + ':' + cm.id]; if (e) { cm.body = e[1]; cm.edited = e[2]; } }); }
}

/* 게시판 목록(덕질 · 정보)은 cats 탭에서 직접 관리해요 */
function plusEnsureFandom_() {}
