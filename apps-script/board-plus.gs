// 싸이뛰어 게시판 확장 — 사진 올리기 · 글/댓글 수정 · 빠른 응답 (v3: 긴 글 수정 2만 자 + 수정 전 내용 보관 + 잘린 글 자동 복구)
const PLUS = { folder: 'psi-board-images', maxBytes: 5 * 1024 * 1024, cacheSec: 60, bundle: 80 };

function plusSS_() {
  if (typeof getSS === 'function') { try { const x = getSS(); if (x) return x; } catch (e) {} }
  try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (e) { return null; }
}
function plusText_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function plusJson_(o) { return plusText_(JSON.stringify(o)); }
function plusVer_() { const c = CacheService.getScriptCache(); let v = c.get('plusVer'); if (!v) { v = String(Date.now()); c.put('plusVer', v, 21600); } return v; }
function plusBump_() { CacheService.getScriptCache().put('plusVer', String(Date.now()) + Math.random().toString(36).slice(2, 6), 21600); }
function plusZip_(s) { return Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(s, 'application/json')).getBytes()); }
function plusUnzip_(z) { return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(z), 'application/x-gzip')).getDataAsString('UTF-8'); }

function doGet(e) {
  const p = (e && e.parameter) || {}, a = p.action;
  if (a === 'plus') return plusJson_({ ok: true, plus: 3 });
  if (typeof novelCache_ === 'function') { const r = novelCache_(e); if (r) return r; }
  if (a === 'posts' || a === 'post') {
    try {
      const cache = CacheService.getScriptCache(), key = ['g', plusVer_(), a, p.id || '', p.dev || ''].join(':');
      if (a === 'posts') { const hit = cache.get(key); if (hit) return plusText_(plusUnzip_(hit)); }
      const out = JSON.parse(doGetOrig_(e).getContent());
      if (out && out.ok) { const map = plusEditsMap_(); plusApplyEdits_(out, map); if (a === 'posts') plusBundle_(out, String(p.dev || ''), map); out.plus = 3; }
      const s = JSON.stringify(out);
      if (a === 'posts') { try { const z = plusZip_(s); if (z.length < 95000) cache.put(key, z, PLUS.cacheSec); } catch (x) {} }
      return plusText_(s);
    } catch (err) {}
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

/* 목록을 줄 때 위쪽 글들의 댓글도 같이 담아서, 글을 열면 바로 보이게 해요 (조회수는 그대로 따로 올라가요) */
function plusBundle_(out, dev, map) {
  if (!Array.isArray(out.posts) || typeof rows !== 'function') return;
  const n = typeof num === 'function' ? num : (x => Number(x) || 0);
  const pdev = {}; rows('posts').forEach(r => { pdev[String(r.id)] = r.dev; });
  const by = {}; rows('comments').forEach(c => { const k = String(c.post); (by[k] = by[k] || []).push(c); });
  const top = out.posts.slice().sort((x, y) => n(y.t) - n(x.t)).slice(0, PLUS.bundle);
  top.forEach(p => {
    const od = pdev[String(p.id)], order = [];
    p.cm = (by[String(p.id)] || []).sort((x, y) => n(x.t) - n(y.t)).map(c => {
      let who; if (c.dev === od) who = 'op'; else { if (order.indexOf(c.dev) < 0) order.push(c.dev); who = String(order.indexOf(c.dev) + 1); }
      const o = { id: String(c.id), body: String(c.body), t: n(c.t), who: who, mine: !!dev && c.dev === dev };
      const ed = map['c:' + p.id + ':' + o.id]; if (ed) { o.body = ed[1]; o.edited = ed[2]; }
      return o;
    });
  });
}

function plusRate_(dev, kind, max, sec) {
  const c = CacheService.getScriptCache(), k = 'r:' + kind + ':' + dev, n = Number(c.get(k) || 0);
  if (n >= max) return false; c.put(k, String(n + 1), sec); return true;
}
function plusDev_(b) { const d = String(b.dev || ''); return /^[A-Za-z0-9_-]{4,40}$/.test(d) ? d : ''; }

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

function plusEdit_(b, kind) {
  const dev = plusDev_(b); if (!dev) return { ok: false, error: 'dev' };
  if (!plusRate_(dev, 'ed', 30, 600)) return { ok: false, error: 'rate' };
  const pid = String(b.id || b.post || ''); if (!/^[A-Za-z0-9_-]{1,60}$/.test(pid)) return { ok: false, error: 'id' };
  const orig = JSON.parse(doGetOrig_({ parameter: { action: 'post', id: pid, dev: dev } }).getContent());
  if (!orig || !orig.ok || !orig.post) return { ok: false, error: 'notfound' };
  let key, title = '', text = String(b.body || '').trim();
  if (kind === 'post') {
    if (!orig.post.mine) return { ok: false, error: 'owner' };
    title = String(b.title || '').trim().slice(0, 60); text = text.slice(0, 20000);
    if (title.length < 1 || text.length < 1) return { ok: false, error: 'empty' };
    key = 'p:' + pid;
  } else {
    const cid = String(b.cid || ''); const c = (orig.post.comments || []).find(x => String(x.id) === cid);
    if (!c || !c.mine) return { ok: false, error: 'owner' };
    text = text.slice(0, 300); if (!text) return { ok: false, error: 'empty' };
    key = 'c:' + pid + ':' + cid;
  }
  const sh = plusSheet_(), v = sh.getDataRange().getValues(), now = Date.now();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === key) { plusHist_(key, v[i][1], v[i][2], v[i][3]); sh.getRange(i + 1, 2, 1, 3).setValues([[title, text, now]]); return { ok: true, t: now, n: text.length }; }
  if (kind === 'post') plusHist_(key, orig.post.title, orig.post.body, orig.post.t || 0);
  sh.appendRow([key, title, text, now]); return { ok: true, t: now, n: text.length };
}
function plusSheet_() {
  let ss = plusSS_();
  if (!ss) { const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('PLUS_SS'); if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) {} } if (!ss) { ss = SpreadsheetApp.create('psi-board-plus'); pr.setProperty('PLUS_SS', ss.getId()); } }
  let sh = ss.getSheetByName('edits'); if (!sh) { sh = ss.insertSheet('edits'); sh.appendRow(['key', 'title', 'body', 't']); }
  return sh;
}
function plusEditsMap_() {
  const c = CacheService.getScriptCache(), ck = 'edits:' + plusVer_(), hit = c.get(ck);
  if (hit) return JSON.parse(hit);
  plusFixOnce_();
  const map = {}, v = plusSheet_().getDataRange().getValues(); for (let i = 1; i < v.length; i++) map[v[i][0]] = [v[i][1], v[i][2], v[i][3]];
  const s = JSON.stringify(map); if (s.length < 95000) c.put(ck, s, 600);
  return map;
}
function plusApplyEdits_(out, map) {
  const fix = p => { const e = map['p:' + p.id]; if (e) { if (e[0]) p.title = e[0]; p.body = e[1]; p.edited = e[2]; } };
  if (Array.isArray(out.posts)) out.posts.forEach(fix);
  if (out.post) { fix(out.post); (out.post.comments || []).forEach(cm => { const e = map['c:' + out.post.id + ':' + cm.id]; if (e) { cm.body = e[1]; cm.edited = e[2]; } }); }
}

/* 수정하기 전 내용을 'edits_hist' 시트에 남겨 둬요 (실수로 지워도 되살릴 수 있게) */
function plusHist_(key, title, body, t) {
  try {
    const ss = plusSheet_().getParent(); let h = ss.getSheetByName('edits_hist');
    if (!h) { h = ss.insertSheet('edits_hist'); h.appendRow(['key', 'title', 'body', 't', 'saved']); }
    h.appendRow([key, String(title || ''), String(body || ''), t || '', Date.now()]);
  } catch (e) {}
}

/* 예전 2000자 제한 때문에 수정하다 뒷부분이 잘린 글을 되살려요.
   고친 앞부분은 그대로 두고, 잘려 나간 뒷부분을 원래 글에서 찾아 이어 붙여요. 한 번만 자동으로 돌아요. */
function plusFixOnce_() {
  const pr = PropertiesService.getScriptProperties(); if (pr.getProperty('FIX_TRUNC_1')) return;
  pr.setProperty('FIX_TRUNC_1', String(Date.now()));
  try { plusFixTrunc_(); } catch (e) {}
}
function plusFixTrunc_() {
  if (typeof rows !== 'function') return 0;
  const ob = {}; rows('posts').forEach(r => { ob[String(r.id)] = String(r.body || ''); });
  const sh = plusSheet_(), v = sh.getDataRange().getValues(); let n = 0;
  for (let i = 1; i < v.length; i++) {
    const key = String(v[i][0]); if (key.indexOf('p:') !== 0) continue;
    const o = ob[key.slice(2)], e = String(v[i][2] || ''); if (o == null) continue;
    if (o.length <= e.length + 20) continue;
    const cut = e.length >= 1500 && e.length <= 2000;
    let nb = '';
    for (const L of [60, 40, 24, 12]) { const tail = e.slice(-L), at = plusNear_(o, tail, e.length - L); if (tail.trim().length >= 6 && at >= 0) { const rest = o.slice(at + tail.length); if (cut || rest.trim().length > 200) nb = e + rest; break; } }
    if (!nb && cut) nb = o;
    if (!nb) continue;
    if (nb.length <= e.length) continue;
    plusHist_(key, v[i][1], e, v[i][3]);
    sh.getRange(i + 1, 3).setValue(nb); n++;
  }
  if (n) plusBump_();
  return n;
}
function plusNear_(o, tail, want) { let best = -1, i = o.indexOf(tail); while (i >= 0) { if (best < 0 || Math.abs(i - want) < Math.abs(best - want)) best = i; i = o.indexOf(tail, i + 1); } return best; }
/* 직접 돌려도 돼요: 편집기 위쪽에서 이 함수를 고르고 실행 → 되살린 글 개수가 로그에 나와요 */
function 잘린글복구() { const n = plusFixTrunc_(); Logger.log('되살린 글: ' + n + '개'); return n; }
