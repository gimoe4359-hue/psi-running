#!/usr/bin/env node
// 맵 데이터 검사: SchoolBuilder가 읽을 때 깨질 만한 것(잘못된 번호, 없는 재질·글꼴 이름)을 미리 찾는다.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT, 'src', 'ServerScriptService', 'SchoolBuilder');
const read = (i) => JSON.parse(fs.readFileSync(path.join(dir, `MapData${i}.lua`), 'utf8').match(/\[==\[([\s\S]*)\]==\]/)[1]);

// Roblox Enum 이름 (실제 Studio에 있는 것만)
const MATERIALS = new Set(['Plastic', 'SmoothPlastic', 'Neon', 'Wood', 'WoodPlanks', 'Marble', 'Slate', 'Concrete', 'Granite', 'Brick',
  'Pebble', 'Cobblestone', 'CorrodedMetal', 'DiamondPlate', 'Foil', 'Metal', 'Grass', 'LeafyGrass', 'Sand', 'Fabric', 'Snow', 'Mud',
  'Ground', 'Asphalt', 'Salt', 'Limestone', 'Pavement', 'Basalt', 'CrackedLava', 'Glacier', 'Ice', 'Rock', 'Sandstone', 'Glass', 'ForceField',
  'Plaster', 'CeramicTiles', 'Carpet', 'Rubber', 'Leather', 'Cardboard', 'RoofShingles', 'ClayRoofTiles']);
const TERRAIN = new Set(['Grass', 'LeafyGrass', 'Ground', 'Pavement', 'Rock', 'Sand', 'Mud', 'Asphalt', 'Concrete', 'Slate', 'Snow', 'Basalt', 'Limestone', 'Sandstone', 'Salt', 'Glacier', 'Ice', 'Brick', 'Cobblestone', 'WoodPlanks', 'CrackedLava']);
const FONTS = new Set(['GothamBold', 'GothamBlack', 'Gotham', 'Merriweather', 'PatrickHand', 'Arial', 'SourceSans', 'Code', 'Atlas']);
const FACES = new Set(['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom']);

const h = read(0);
const errors = [];
const parts = [];
for (let i = 1; i <= h.partChunks; i++) parts.push(...read(i));
if (fs.existsSync(path.join(dir, `MapData${h.partChunks + 1}.lua`))) errors.push('남는 MapData 파일이 있음');
h.mats.forEach((m) => { if (!MATERIALS.has(m)) errors.push(`없는 재질: ${m}`); });
parts.forEach((p, i) => {
  if (p.length !== 17) errors.push(`파트 ${i} 필드 수 ${p.length}`);
  if (p[0] < 0 || p[0] >= h.groups.length) errors.push(`파트 ${i} 그룹 번호`);
  if (p[11] >= h.colors.length) errors.push(`파트 ${i} 색 번호`);
  if (p[12] >= h.mats.length) errors.push(`파트 ${i} 재질 번호`);
  if (p.slice(2, 5).some((v) => !(v > 0) || v > 2048)) errors.push(`파트 ${i} 크기 ${p.slice(2, 5)}`);
  if (p.slice(5, 11).some((v) => !Number.isFinite(v))) errors.push(`파트 ${i} 위치/회전`);
});
h.groups.forEach((g, i) => {
  const segs = g.split('/');
  if (segs.length > 1 && h.groups.indexOf(segs.slice(0, -1).join('/')) >= i) errors.push(`그룹 순서: ${g}`);
});
h.lights.forEach((l) => { if (l[0] >= parts.length || !FACES.has(l[6])) errors.push(`조명 ${l}`); });
h.texts.forEach((t) => {
  if (t[0] >= parts.length || !FACES.has(t[1])) errors.push(`글씨 ${t[0]}`);
  if (!FONTS.has(t[6])) errors.push(`없는 글꼴: ${t[6]}`);
});
h.tags.forEach((t) => { if (t[0] >= parts.length) errors.push(`태그 ${t}`); });
(h.terrain || []).forEach((t) => { if (!TERRAIN.has(t[1])) errors.push(`지형 재질 ${t[1]}`); });
h.gtags.forEach((t) => { if (t[0] >= h.groups.length) errors.push(`그룹 태그 ${t}`); });

// 스크립트가 꼭 찾아야 하는 태그가 있는지
const need = ['BoothSpawn', 'BoothZone', 'BuildingZone', 'RoofStairZone', 'ChairSpot', 'FigureSpot', 'PatrolPoint', 'Phone', 'GateLock',
  'ClockCenter', 'ClockHour', 'ClockMinute', 'Blackboard', 'CorridorLight', 'FlickerLight', 'CCTVScreen', 'OnAirSign', 'StatuePedestal', 'StallDoor3', 'LobbySpawn', 'SUVDoor'];
const have = new Set(h.tags.map((t) => t[1]));
need.forEach((t) => { if (!have.has(t)) errors.push(`필요한 태그 없음: ${t}`); });
const gneed = ['Classroom', 'DeskSet', 'MainGate', 'IntroCar', 'StatueFigure', 'PlasterBust'];
const ghave = new Set(h.gtags.map((t) => t[1]));
gneed.forEach((t) => { if (!ghave.has(t)) errors.push(`필요한 그룹 태그 없음: ${t}`); });
const patrolFloors = h.attrs.filter((a) => a[1] === 'Floor' && h.tags.some((t) => t[0] === a[0] && t[1] === 'PatrolPoint')).map((a) => a[2]).sort();
if (patrolFloors.join() !== '1,2,3') errors.push(`순찰함 층: ${patrolFloors}`);
// 모델(PrimaryPart 필요)
['School/IntroCar', 'School/Gate/MainGate', 'School/GirlStatue/Figure'].forEach((g) => {
  const gi = h.groups.indexOf(g);
  if (!parts.some((p) => p[0] === gi && (p[15] & 4))) errors.push(`PrimaryPart 없음: ${g}`);
});

console.log(`parts ${parts.length}, groups ${h.groups.length}, lights ${h.lights.length}, texts ${h.texts.length}, tags ${h.tags.length}`);
if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 50).join('\n')); process.exit(1); }
console.log('OK: 맵 데이터 이상 없음');
