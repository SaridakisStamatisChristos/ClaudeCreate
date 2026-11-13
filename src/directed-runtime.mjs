// Browser runtime for validated declarative SVG scenes.
// HyperFrames seeks the paused GSAP timeline; there is no clock, network, or eval.
export function setupDirected(timeline,scene,index,start,duration,gsap){
 const props=scene.props;
 const camera=document.getElementById('directed-camera-'+index);
 const elements=new Map(props.objects.map(o=>[o.id,document.getElementById('directed-'+index+'-'+o.id)]));
 const defs=new Map(props.objects.map(o=>[o.id,o]));
 const target=id=>id==='camera'?camera:elements.get(id);
 const cssOrigin=id=>id==='camera'?'450px 450px':'50% 50%';
 const values=(id,key,value)=>{
  if(key==='draw'){
   const line=target(id).querySelector('line');
   return {attr:{'stroke-dashoffset':Number(line.getAttribute('stroke-dasharray'))*(1-value)}};
  }
  return {[key]:value};
 };
 for(const o of props.objects){
  const element=elements.get(o.id);
  gsap.set(element,{transformOrigin:cssOrigin(o.id)});
  for(const [key,value] of Object.entries(o.initial||{}))
   gsap.set(key==='draw'?element.querySelector('line'):element,values(o.id,key,value));
 }
 gsap.set(camera,{transformOrigin:cssOrigin('camera')});
 for(const [key,value] of Object.entries(props.camera||{}))gsap.set(camera,values('camera',key,value));
 const initialized=new Set();
 for(const a of [...props.animations].sort((a,b)=>a.at-b.at)){
  const id=a.target,key=a.property,token=id+':'+key,explicit=id==='camera'?props.camera:defs.get(id)?.initial;
  const el=key==='draw'?target(id).querySelector('line'):target(id);
  if(!initialized.has(token)&&!(explicit&&Object.hasOwn(explicit,key)))gsap.set(el,values(id,key,a.from));
  initialized.add(token);
  timeline.fromTo(el,values(id,key,a.from),{
   ...values(id,key,a.to),duration:duration*a.duration,ease:a.ease,
   immediateRender:false,overwrite:false
  },start+duration*a.at);
 }
}
