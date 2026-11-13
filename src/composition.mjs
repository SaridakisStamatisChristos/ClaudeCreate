import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { renderDirected } from './directed.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const jsjson = value => JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
const f = n => Number(n).toFixed(3);
const safeClass = x => /^[a-z0-9_]+$/.test(x) ? x : 'unknown';
const table = (rows, chosen) => rows.map((r,i) => `<div class="app-row ${i===chosen?'selected':''}"><span>${escape(r.label)}</span><strong>${escape(r.value)}</strong></div>`).join('');
function visual(scene,i) {
  const p=scene.props;
  switch(scene.template) {
    case 'caption_screen': return `<div class="headline">${escape(p.big_text || scene.highlight || scene.say)}</div><div class="small-rule"></div>`;
    case 'counter': return `<div class="number" id="count-${i}">${escape((p.prefix||'')+p.from+(p.suffix||''))}</div><div class="number-label">${escape(p.label||'')}</div><div class="scale-bars"><span></span><span></span><span></span><span></span><span></span></div>`;
    case 'app_screen': return `<div class="app"><header><div class="app-logo">◧</div><div><strong>${escape(p.app_name)}</strong><small>Overview</small></div><span class="app-dot">● Live</span></header>${table(p.rows,p.highlight_row??0)}<footer><span>HOME</span><span>ACTIVITY</span><span>PROFILE</span></footer></div>`;
    case 'callout': return `<div class="callout ${safeClass(p.style)}"><div class="mark">${p.style==='arrow'?'➜':p.style==='circle'?'◎':'✓'}</div><div>${escape(p.text)}</div></div>`;
    case 'object_3d': return `<div class="object-shell"><canvas class="three-canvas" id="three-${i}" width="700" height="700"></canvas><div class="three-fallback" id="fallback-${i}">◆</div></div><div class="object-label">${escape(p.label||p.shape)}</div>`;
    case 'directed_scene': return renderDirected(scene, i);
    case 'compare': return `<div class="compare"><div class="compare-box"><small>${escape(p.left.label)}</small><strong>${escape(p.left.value)}</strong></div><div class="versus">VS</div><div class="compare-box right"><small>${escape(p.right.label)}</small><strong>${escape(p.right.value)}</strong></div></div>`;
  }
}
function caption(scene, timing) {
  const words = scene.say.trim().split(/\s+/);
  const h = scene.highlight.trim().toLocaleLowerCase();
  const say = scene.say.toLocaleLowerCase();
  const hit = h ? say.indexOf(h) : -1;
  let cursor = 0;
  const spans = words.map((word, j) => {
    const first = say.indexOf(word.toLocaleLowerCase(),cursor);
    const start=first>=0?first:cursor;
    const end=start+word.length;
    cursor=end;
    const active = hit>=0 && start < hit + h.length && end > hit;
    return `<span class="word ${active?'emph':''}" id="word-${timing.index}-${j}">${escape(word)}</span>`;
  }).join(' ');
  return `<div class="captions" aria-label="${escape(scene.say)}">${spans}</div>`;
}
export function buildHTML(script, timeline, { draft=false }={}) {
  const width=draft?540:1080,height=draft?960:1920,scale=draft?.5:1;
  const total=timeline.reduce((n,s)=>Math.max(n,s.start+s.duration),0);
  const blocks=timeline.map((t,i)=> {
    const s=script.scenes[i];
    return `<section id="scene-${i}" class="clip scene" data-start="${f(t.start)}" data-duration="${f(t.duration)}" data-track-index="0" data-type="${s.template}"><div class="moving-grain"></div><div class="handle">${escape(script.handle)}</div>${caption(s,{index:i})}<div class="visual ${s.template}">${visual(s,i)}</div>${s.illustrative?'<div class="example-tag">EXAMPLE</div>':''}<div class="footer">${escape(script.title)}</div></section>`;
  }).join('\n');
  const data=jsjson({ scenes:script.scenes.map((s,i)=>({ ...s, start:timeline[i].start, duration:timeline[i].duration, audioDuration:timeline[i].audioDuration, words:timeline[i].words })) });
  const css=`*{box-sizing:border-box}html,body{padding:0;margin:0;background:#08090b}#root{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:#111318;color:#F6F6F3}#canvas{position:absolute;inset:0;width:1080px;height:1920px;transform:scale(${scale});transform-origin:top left}.scene{position:absolute;inset:0;width:1080px;height:1920px;background:radial-gradient(ellipse at 75% 75%,#272a31,#111318 68%);overflow:hidden;font:500 38px/1.2 Inter,Arial,sans-serif;isolation:isolate}.moving-grain{position:absolute;inset:-100px;background:repeating-linear-gradient(110deg,transparent 0,transparent 88px,#ffffff08 90px,transparent 92px);opacity:.4}.handle{position:absolute;top:102px;left:96px;letter-spacing:2px;font-size:28px;font-weight:750;color:var(--accent)}.captions{position:absolute;top:250px;left:90px;right:90px;min-height:260px;display:flex;justify-content:center;align-content:flex-start;align-items:center;flex-wrap:wrap;gap:15px 16px;text-align:center;font-size:61px;line-height:1.15;font-weight:900;letter-spacing:-1.3px;text-shadow:0 4px 8px #0008}.word{opacity:0;display:inline-block}.word.emph{color:var(--accent)}.visual{position:absolute;inset:560px 90px 290px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:40px}.headline{font-size:110px;font-weight:950;line-height:1.01;letter-spacing:-4px;text-wrap:balance;max-width:920px}.small-rule{width:200px;height:12px;background:var(--accent);border-radius:15px}.number{font-size:154px;font-weight:900;letter-spacing:-6px;word-break:break-word;color:var(--accent)}.number-label{font-size:48px;font-weight:700;letter-spacing:2px}.scale-bars{display:flex;align-items:end;height:160px;gap:24px}.scale-bars span{background:#777f8d;width:50px;border-radius:8px;height:90px}.scale-bars span:nth-child(2){height:130px}.scale-bars span:nth-child(3){height:155px;background:var(--accent)}.scale-bars span:nth-child(4){height:110px}.scale-bars span:nth-child(5){height:75px}.app{width:860px;background:#20242c;border:2px solid #4c535f;border-radius:38px;box-shadow:0 35px 80px #0008;overflow:hidden;text-align:left}.app header{display:flex;align-items:center;gap:22px;padding:48px 48px;background:#2b303a}.app header strong{display:block;font-size:45px}.app header small{display:block;color:#abb2be;font-size:25px}.app-logo{background:var(--accent);border-radius:19px;width:90px;height:90px;display:grid;place-items:center;color:#161616;font-size:55px}.app-dot{margin-left:auto;color:#8ee39c;font-size:25px}.app-row{display:flex;justify-content:space-between;padding:30px 45px;border-bottom:1px solid #38404a;font-size:34px;gap:20px}.app-row strong{white-space:nowrap}.app-row.selected{background:#393c3d;border-left:10px solid var(--accent)}.app footer{display:flex;justify-content:space-around;padding:32px;font-size:19px;color:#8d95a1;letter-spacing:3px}.callout{position:relative;border:12px solid var(--accent);border-radius:40px;padding:65px 54px;font-weight:900;font-size:88px;letter-spacing:-2px;text-transform:uppercase;transform:rotate(-5deg)}.callout.circle{border-radius:50%;min-width:640px;min-height:610px;display:grid;align-content:center}.callout.arrow{border:none}.callout .mark{color:var(--accent);font-size:130px}.object-shell{position:relative;width:720px;height:720px}.three-canvas,.three-fallback{position:absolute;inset:0;width:100%;height:100%}.three-fallback{display:grid;place-items:center;font-size:410px;color:var(--accent)}.three-canvas{z-index:1}.object-label{font-size:64px;font-weight:850;text-transform:uppercase}.compare{display:flex;position:relative;gap:28px;align-items:stretch;width:900px}.compare-box{flex:1;min-width:0;min-height:470px;background:#30353f;border-radius:30px;border:4px solid #535c69;display:flex;flex-direction:column;justify-content:center;gap:50px;padding:35px}.compare-box.right{border-color:var(--accent)}.compare-box small{font-size:34px;color:#c7ccd5}.compare-box strong{font-size:76px;overflow-wrap:anywhere}.versus{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;background:var(--accent);color:#1c2026;font-weight:900;font-size:34px;padding:15px;border-radius:20px}.example-tag{position:absolute;right:90px;bottom:180px;padding:11px 21px;border:2px solid #bbbbbb;border-radius:8px;color:#ddd;letter-spacing:3px;font-size:22px;font-weight:800}.directed-svg{display:block;width:900px;height:900px;max-width:100%;flex-shrink:0}.footer{position:absolute;bottom:96px;left:90px;right:90px;font-size:27px;letter-spacing:2px;color:#9da5b0;text-align:center}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(script.title)}</title><style>${css}</style></head><body><div id="root" data-composition-id="main" data-start="0" data-width="${width}" data-height="${height}" data-fps="30" data-duration="${f(total)}" style="--accent:${escape(script.accent)}"><div id="canvas">${blocks}</div></div><script src="./vendor/gsap.min.js"></script><script type="module">
import * as THREE from './vendor/three.module.js';
import { setupDirected } from './directed-runtime.mjs';
const data = ${data};
const tl=gsap.timeline({paused:true});
const shapes=[];
for(let i=0;i<data.scenes.length;i++){
 const s=data.scenes[i], start=s.start, dur=s.duration, base='#scene-'+i;
 tl.fromTo(base+' .visual',{opacity:0,y:65},{opacity:1,y:0,duration:Math.min(.42,dur*.24),ease:'power2.out'},start+.08);
 tl.fromTo(base+' .moving-grain',{x:-55},{x:55,duration:dur,ease:'none'},start);
 if(s.template==='directed_scene')setupDirected(tl,s,i,start,dur,gsap);
 const speechWords=s.say.trim().split(/\\s+/);
 for(let w=0;w<speechWords.length;w++){
   const tw=s.words?.[w]; const begin=Math.max(0,Math.min(s.audioDuration-.02,tw?.start??(w*s.audioDuration/speechWords.length)));
   tl.set('#word-'+i+'-'+w,{opacity:1},start+begin);
 }
 if(s.template==='counter'){
   const node=document.getElementById('count-'+i);
   const meter={value:s.props.from};
   const update=()=>{node.textContent=(s.props.prefix||'')+new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(meter.value)+(s.props.suffix||'');};
   tl.to(meter,{value:s.props.to,duration:Math.max(.1,dur-.35),ease:'power2.out',onUpdate:update,onStart:update},start+.15);
 }
 if(s.template==='object_3d'){
  const canvas=document.getElementById('three-'+i);
  try {
   const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true}); renderer.setSize(700,700,false);
   const camera=new THREE.PerspectiveCamera(43,1,.1,100); camera.position.set(0,1,7);
   const scene=new THREE.Scene();scene.add(new THREE.AmbientLight(0xffffff,1.3));
   const directional=new THREE.DirectionalLight(0xffffff,2.2);directional.position.set(3,6,7);scene.add(directional);
   const color=parseInt(document.getElementById('root').style.getPropertyValue('--accent').slice(1),16);
   const mat=new THREE.MeshStandardMaterial({color,metalness:.38,roughness:.24});
   const geo={cube:()=>new THREE.BoxGeometry(3,3,3),sphere:()=>new THREE.SphereGeometry(2,48,36),torus:()=>new THREE.TorusGeometry(1.7,.65,24,96),stack:()=>new THREE.CylinderGeometry(1.5,1.5,.55,48)}[s.props.shape]();
   const group=new THREE.Group();const n=s.props.shape==='stack'?4:1;
   for(let j=0;j<n;j++){const mesh=new THREE.Mesh(geo,mat);mesh.position.y=s.props.shape==='stack'?j*.78-1.2:0;group.add(mesh);}scene.add(group);
   document.getElementById('fallback-'+i).style.visibility='hidden';
   const frame={t:0};const draw=()=>{group.rotation.y=frame.t*.9;group.rotation.x=.28+Math.sin(frame.t*.65)*.14;renderer.render(scene,camera);};draw();
   tl.to(frame,{t:dur,duration:dur,ease:'none',onUpdate:draw,onStart:draw},start);
   shapes.push(renderer);
  }catch(error){canvas.style.display='none';}
 }
}
tl.to('#root',{opacity:1,duration:.01},${f(Math.max(0,total-.01))});
window.__timelines=window.__timelines||{};window.__timelines.main=tl;
</script></body></html>`;
}
export async function writeComposition(workDir,script,timeline,opts={}) {
  const vendors=join(workDir,'vendor');await mkdir(vendors,{recursive:true});
  const base=join(opts.baseDir || process.cwd(), 'node_modules');
  for(const [from,to] of [['gsap/dist/gsap.min.js','gsap.min.js'],['three/build/three.module.js','three.module.js'],['three/build/three.core.js','three.core.js']]) {
    try { await copyFile(join(base,from),join(vendors,to)); }
    catch { throw new Error(`Missing local dependency ${from}. Run npm install first.`); }
  }
  await copyFile(new URL('./directed-runtime.mjs', import.meta.url),join(workDir,'directed-runtime.mjs'));
  const file=join(workDir,'index.html');await writeFile(file,buildHTML(script,timeline,opts));
  await writeFile(join(workDir,'meta.json'),JSON.stringify({id:'main',name:script.title},null,2));
  return file;
}
