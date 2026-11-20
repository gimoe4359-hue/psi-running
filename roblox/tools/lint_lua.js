#!/usr/bin/env node
// Luau 스크립트 문법 검사 (luaparse, Lua 5.1 문법 기준)
//   node tools/lint_lua.js [파일...]   (인자가 없으면 src/ 아래 .lua 전부)
// Luau 전용 문법(타입 표기, continue, +=)은 Lua 5.1 에 없으므로 이 검사에서 오류로 나온다.
'use strict';
const fs = require('fs');
const path = require('path');
const luaparse = require('luaparse');

const ROOT = path.resolve(__dirname, '..');
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.lua')) out.push(p);
  }
  return out;
}

const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => path.resolve(f)) : walk(path.join(ROOT, 'src'), []);
let bad = 0;
for (const f of files) {
  try {
    luaparse.parse(fs.readFileSync(f, 'utf8'), { luaVersion: '5.1' });
  } catch (e) {
    bad++;
    console.log(`${path.relative(ROOT, f)}: ${e.message}`);
  }
}
console.log(`${files.length}개 파일, 문법 오류 ${bad}개`);
process.exit(bad ? 1 : 0);
