// Browser-only v0.5 choreography; deterministic GSAP paused-timeline animations.
// Transitions are paired per-clip rather than cross-track so HyperFrames' clip
// visibility logic cannot remove either half of a cut.
const patterns=Object.freeze({
 wave: {
  'arm-right':[0,-65,-18,-65,0],
  'arm-left':[0,8,-4,7,0]
 },
 walk: {
  'arm-left':[-20,26,-20,26,-20],
  'arm-right':[20,-26,20,-26,20],
  'leg-left':[22,-18,22,-18,22],
  'leg-right':[-22,18,-22,18,-22],
  head:[0,3,0,3,0]
 },
 nod:{
  head:[0,14,-9,11,0]
 },
 cheer:{
  'arm-left':[0,98,110,98,0],
  'arm-right':[0,-98,-110,-98,0],
  head:[0,-7,-7,-7,0]
 }
});
export function setupPerformances(tl,scene,index,start,duration,gsap){
 const performances=scene.props?.performances||[];
 for(const p of performances){
  const segments=patterns[p.action];
  if(!segments)continue;
  const base='directed-'+index+'-'+p.actor;
  for(const [part,angles] of Object.entries(segments)){
   const element=document.getElementById(base+'-'+part);
   if(!element)throw new Error('Character rig missing '+base+'-'+part);
   gsap.set(element,{transformOrigin:'0px 0px'});
   const interval=p.duration*duration/(angles.length-1);
   for(let k=0;k<angles.length-1;k++){
    tl.fromTo(element,{rotation:angles[k]},{
      rotation:angles[k+1],duration:interval,
      ease:p.action==='walk'?'sine.inOut':'power1.inOut',
      immediateRender:false,overwrite:false
    },start+duration*p.at+interval*k);
   }
  }
 }
}
const looks={
 fade:{
  from:{opacity:0},full:{opacity:1},
  to:{opacity:0}
 },
 'wipe-left':{
  from:{opacity:1,xPercent:-100},full:{opacity:1,xPercent:0},
  to:{opacity:1,xPercent:100}
 },
 iris:{
  from:{opacity:1,clipPath:'circle(0% at 50% 50%)'},
  full:{opacity:1,clipPath:'circle(110% at 50% 50%)'},
  to:{opacity:1,clipPath:'circle(0% at 50% 50%)'}
 }
};
export function setupSceneTransitions(tl,scenes,gsap){
 for(let i=1;i<scenes.length;i++){
  const t=scenes[i].transition;
  if(!t)continue;
  const before=scenes[i-1],after=scenes[i],type=looks[t.kind];
  if(!type)continue;
  const out=document.getElementById('transition-out-'+(i-1));
  const incoming=document.getElementById('transition-in-'+i);
  if(!out||!incoming)throw new Error('Paired transition overlays not available at cut '+i);
  const half=Math.min(t.duration/2,before.duration*.38,after.duration*.38);
  // A full-colour bridge covers the frame immediately before and after the cut.
  gsap.set(out,type.from);
  gsap.set(incoming,type.full);
  tl.fromTo(out,type.from,{...type.full,duration:half,ease:'power2.inOut',immediateRender:false,overwrite:false},
    before.start+before.duration-half);
  tl.fromTo(incoming,type.full,{...type.to,duration:half,ease:'power2.inOut',immediateRender:false,overwrite:false},
    after.start);
 }
}
