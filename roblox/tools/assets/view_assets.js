const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const HERE=__dirname,ROOT=path.resolve(HERE,'..','..'),NM=process.env.NODE_MODULES;
(async()=>{const [tname,out,mood]=process.argv.slice(2);
const server=http.createServer((q,s)=>{const u=decodeURIComponent(q.url.split('?')[0]);let f=null;
if(u==='/'){s.writeHead(200,{'Content-Type':'text/html'});s.end(`<!doctype html><html><head><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><style>body{margin:0}</style></head><body><script type="module" src="/view.js"></script></body></html>`);return;}
if(u.startsWith('/three/'))f=path.join(NM,'three',u.slice(7));else if(u==='/SongcheonAssets.glb')f=path.join(ROOT,'assets','SongcheonAssets.glb');else if(u==='/assets_meta.json')f=path.join(ROOT,'build','assets_meta.json');else f=path.join(HERE,path.basename(u));
if(!fs.existsSync(f)){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':f.endsWith('.js')?'text/javascript':'application/octet-stream'});fs.createReadStream(f).pipe(s);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await b.newPage({viewport:{width:1600,height:900}});
p.on('pageerror',e=>console.log('[pageerror]',e.message));await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.waitForFunction(()=>window.READY===true,null,{timeout:120000});
await p.evaluate(([t,m])=>window.view(t,[0,Math.PI*0.25,Math.PI*0.5,Math.PI],m),[tname,mood||'light']);await p.locator('canvas').screenshot({path:out});await b.close();server.close();console.log('saved',out);})();
