// 소설 빠르게: 작품 목록·회차·그림을 서버 캐시에 담아 두고, 4시간마다 미리 준비해 둬요
const NC = { worksSec: 300, chSec: 21600, chunk: 90000 };
function ncV_() { return PropertiesService.getScriptProperties().getProperty('NC_V') || '0'; }
function ncPut_(key, s, ttl) {
  try { const z = plusZip_(s), n = Math.ceil(z.length / NC.chunk); if (!n || n > 30) return; const o = {}; for (let i = 0; i < n; i++) o[key + '#' + i] = z.slice(i * NC.chunk, (i + 1) * NC.chunk); o[key] = String(n); CacheService.getScriptCache().putAll(o, ttl); } catch (e) {}
}
function ncGet_(key) {
  try { const c = CacheService.getScriptCache(), n = Number(c.get(key) || 0); if (!n) return null; const ks = []; for (let i = 0; i < n; i++) ks.push(key + '#' + i); const m = c.getAll(ks); let z = ''; for (const k of ks) { if (m[k] == null) return null; z += m[k]; } return plusUnzip_(z); } catch (e) { return null; }
}
function ncKey_(s) { return 'nc:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, ncV_() + '|' + s)); }
function ncWorks_() {
  const key = ncKey_('works'); let s = ncGet_(key);
  if (!s) { s = doGetOrig_({ parameter: { action: 'works' } }).getContent(); try { if (JSON.parse(s).ok) ncPut_(key, s, NC.worksSec); } catch (e) {} }
  return s;
}
function ncSig_(novel, i) { try { const w = JSON.parse(ncWorks_()).works.find(x => String(x.id) === String(novel)); const c = w && w.chapters[i - 1]; return c ? JSON.stringify(c) : ''; } catch (e) { return ''; } }
function novelCache_(e) {
  const p = (e && e.parameter) || {}, a = p.action;
  if (a === 'works') return plusText_(ncWorks_());
  if (a === 'chapter') {
    const i = parseInt(p.i, 10) || 1, key = ncKey_('ch|' + p.novel + '|' + i + '|' + ncSig_(p.novel, i)); let s = ncGet_(key);
    if (!s) { s = doGetOrig_({ parameter: { action: 'chapter', novel: String(p.novel || ''), i: String(i) } }).getContent(); try { if (JSON.parse(s).ok) ncPut_(key, s, NC.chSec); } catch (x) {} }
    return plusText_(s);
  }
  if (a === 'img' && p.obj) {
    const key = ncKey_('img|' + p.obj); let s = ncGet_(key);
    if (!s) { s = doGetOrig_({ parameter: { action: 'img', obj: String(p.obj) } }).getContent(); try { if (JSON.parse(s).ok) ncPut_(key, s, NC.chSec); } catch (x) {} }
    return plusText_(s);
  }
  return null;
}
/* 모든 회차와 그림을 미리 캐시에 넣어요 (자동 준비가 4시간마다 실행) */
function 소설미리준비() {
  const t0 = Date.now(), w = JSON.parse(ncWorks_()); if (!w.ok) return; let n = 0;
  w.works.forEach(x => x.chapters.forEach((c, k) => {
    if (Date.now() - t0 > 300000) return;
    try { const r = JSON.parse(novelCache_({ parameter: { action: 'chapter', novel: x.id, i: String(k + 1) } }).getContent()); n++;
      (r.blocks || []).forEach(b => { if (b.img && Date.now() - t0 < 300000) novelCache_({ parameter: { action: 'img', obj: b.img } }); }); } catch (e) {}
  }));
  Logger.log('준비 끝: ' + n + '개 회차');
}
/* 한 번만 실행: 4시간마다 자동으로 미리 준비하게 켜요 */
function 소설자동준비켜기() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === '소설미리준비').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('소설미리준비').timeBased().everyHours(4).create();
  소설미리준비();
}
/* 소설을 고쳤는데 사이트에 바로 안 바뀌면 실행 */
function 소설캐시비우기() { PropertiesService.getScriptProperties().setProperty('NC_V', String(Date.now())); 소설미리준비(); }
