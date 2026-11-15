#!/usr/bin/env node
// src/ 폴더의 스크립트들을 Roblox Studio에서 바로 열 수 있는 .rbxlx 파일로 묶는다.
// (Rojo 규칙과 같음: *.server.lua = Script, *.client.lua = LocalScript, *.lua = ModuleScript,
//  폴더 안 init.lua = 그 폴더 이름의 ModuleScript)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'build', 'SongcheonNightShift.rbxlx');

let ref = 0;
const nextRef = () => `RBX${(ref++).toString(16).toUpperCase().padStart(8, '0')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cdata = (s) => `<![CDATA[${s.split(']]>').join(']]]]><![CDATA[>')}]]>`;

function scriptItem(file, name) {
  let cls = 'ModuleScript';
  if (file.endsWith('.server.lua')) cls = 'Script';
  else if (file.endsWith('.client.lua')) cls = 'LocalScript';
  return { cls, name, source: fs.readFileSync(file, 'utf8'), children: [] };
}
function dirItems(dir) {
  const items = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const init = ['init.lua', 'init.server.lua', 'init.client.lua'].map((f) => path.join(full, f)).find((f) => fs.existsSync(f));
      const item = init ? scriptItem(init, e.name) : { cls: 'Folder', name: e.name, children: [] };
      item.children = dirItems(full).filter((c) => !(init && c.file === init));
      items.push(item);
    } else if (e.name.endsWith('.lua') && !/^init(\.server|\.client)?\.lua$/.test(e.name)) {
      const name = e.name.replace(/\.(server|client)\.lua$/, '').replace(/\.lua$/, '');
      items.push(scriptItem(full, name));
    }
  }
  return items;
}

function render(item, indent, props = '') {
  const pad = '\t'.repeat(indent);
  let s = `${pad}<Item class="${item.cls}" referent="${nextRef()}">\n${pad}\t<Properties>\n`;
  s += `${pad}\t\t<string name="Name">${esc(item.name)}</string>\n`;
  if (item.source !== undefined) s += `${pad}\t\t<ProtectedString name="Source">${cdata(item.source)}</ProtectedString>\n`;
  s += props;
  s += `${pad}\t</Properties>\n`;
  for (const c of item.children || []) s += render(c, indent + 1);
  s += `${pad}</Item>\n`;
  return s;
}

const tree = [
  { cls: 'Workspace', name: 'Workspace', children: [], props: '\t\t\t<bool name="StreamingEnabled">false</bool>\n\t\t\t<float name="FallenPartsDestroyHeight">-500</float>\n' },
  { cls: 'Lighting', name: 'Lighting', children: [], props: '\t\t\t<float name="ClockTime">22</float>\n\t\t\t<bool name="GlobalShadows">true</bool>\n' },
  { cls: 'ReplicatedStorage', name: 'ReplicatedStorage', children: dirItems(path.join(SRC, 'ReplicatedStorage')) },
  { cls: 'ServerScriptService', name: 'ServerScriptService', children: dirItems(path.join(SRC, 'ServerScriptService')) },
  { cls: 'StarterPlayer', name: 'StarterPlayer', children: [
    { cls: 'StarterPlayerScripts', name: 'StarterPlayerScripts', children: dirItems(path.join(SRC, 'StarterPlayerScripts')) },
  ] },
];

let xml = '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">\n';
xml += '\t<External>null</External>\n\t<External>nil</External>\n';
for (const t of tree) xml += render(t, 1, t.props || '');
xml += '</roblox>\n';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, xml);

const count = (items) => items.reduce((n, i) => n + 1 + count(i.children || []), 0);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(xml.length / 1024).toFixed(0)} KB, ${count(tree)} instances)`);
