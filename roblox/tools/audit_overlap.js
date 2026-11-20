#!/usr/bin/env node
// 배치 검사: 본관 안 물건이 창문 유리나 문 자리를 가로막고 있는지 찾는다.
'use strict';
const d = require('../build/map.json');
const parts = d.parts.map((a, i) => ({ i, g: d.groups[a[0]], name: a[1], s: [a[2], a[3], a[4]], p: [a[5], a[6], a[7]], r: [a[8], a[9], a[10]], flags: a[15] }));
const aabb = (p) => {
  // 회전은 대각선 길이로 대충 감싼다
  const rot = Math.abs(p.r[0]) + Math.abs(p.r[1]) + Math.abs(p.r[2]) > 0.1;
  const h = rot ? [Math.hypot(...p.s) / 2, Math.hypot(...p.s) / 2, Math.hypot(...p.s) / 2] : p.s.map((v) => v / 2);
  return [p.p[0] - h[0], p.p[1] - h[1], p.p[2] - h[2], p.p[0] + h[0], p.p[1] + h[1], p.p[2] + h[2]];
};
const hit = (a, b, m = 0) => a[0] < b[3] - m && a[3] > b[0] + m && a[1] < b[4] - m && a[4] > b[1] + m && a[2] < b[5] - m && a[5] > b[2] + m;
const inBuilding = (p) => p.g.includes('MainBuilding/F');
const glass = parts.filter((p) => inBuilding(p) && p.name === 'Glass' && !p.g.includes('Corridor/'));
const ignore = /^(Leaf|LeafEdge|LeafTip|Stem|CurtainFold|CurtainRing|CurtainTie|TieHook|RailBracket|Glass|WinFrame|Sash|Sill|InnerSill|ExteriorWall|EndWall|PartitionWall|Curtain|CurtainRail|Wainscot|Baseboard|ChairRail|FloorBand|Pilaster|Sunshade|SunshadeLip|Mullion|HighWindow|Frame|Casing|SlidingDoor|DoorWindow|DoorHandle|RoomWall|Threshold|CorridorFloor|WingFloor|HallFloor|CeilingTile|BrassStrip|LightFrame|LightPanel|BaseBand|RoomSign|SignBracket|SmokeDetector|Downpipe|ACOutdoor|Fan|Shoe|TowerFace|ExitDoor|ExitSign|Pict|PictHead|FigureSpot|BuildingZone|CamBody|CamVisor|CamLens|CamLed|CamArm|CCTVCam|Tile[NSWEF]?|TileFloor|Mirror|HallMirror|Lockers|LockerDoor|NameTag|Knob)$/;
const objs = parts.filter((p) => inBuilding(p) && !(p.flags & 8) && !ignore.test(p.name));
const problems = [];
for (const o of objs) {
  const A = aabb(o);
  for (const g of glass) {
    if (hit(A, aabb(g), 0.05)) { problems.push(`${o.g.split('/').slice(-2).join('/')}/${o.name} @ (${o.p.map((v) => v.toFixed(1)).join(', ')}) 가 창문 유리와 겹침`); break; }
  }
}
const uniq = [...new Set(problems)];
console.log(uniq.length ? uniq.slice(0, 60).join('\n') : '창문과 겹치는 물건 없음');
console.log('검사한 물건', objs.length, '창문', glass.length, '문제', uniq.length);
