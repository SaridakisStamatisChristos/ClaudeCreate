// Full-canvas v2 layouts: the reference screenshot indicates STYLE, not a nested player.
export const EDITORIAL_CSS = "\n/* v2 illustrative scenes ARE the video canvas. No embedded card or fake player UI. */\n.scene.ed-scene{background:#EEE6D9;color:#27211C;font-family:Arial,Helvetica,sans-serif;isolation:isolate}\n.ed-scene .moving-grain{inset:0;z-index:2;pointer-events:none;background:repeating-linear-gradient(0deg,#f8e6c808 0,transparent 3px,transparent 8px);opacity:.37}\n.ed-scene .visual.editorial_split,.ed-scene .visual.illustration_motion,.ed-scene .visual.video_card,.ed-scene .visual.editorial_text_card{position:absolute;inset:0;display:block;width:1080px;height:1920px;margin:0;padding:0;overflow:hidden;transform:none}\n.ed-scene .ed-artwork{position:absolute;inset:0;overflow:hidden;background:#b6a391}\n.ed-scene .ed-artwork img.ed-anim-asset{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:center center;transform:scale(1.14);will-change:transform}\n.ed-scene .ed-artwork img.ed-fit-contain{object-fit:contain}\n.ed-scene .ed-artwork:after{content:'';position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,transparent 0%,#1610090a 39%,#1f170a69 57%,#17110cda 81%,#17110cf2 100%)}\n.ed-scene .ed-copy{position:absolute;z-index:3;bottom:375px;left:90px;right:90px;text-align:left;max-width:900px}\n.ed-scene .ed-kicker{font:700 23px/1.18 Arial,Helvetica,sans-serif;letter-spacing:4.5px;text-transform:uppercase;color:#f5e7cf;margin-bottom:25px}\n.ed-scene .ed-kicker:after{content:'';display:block;width:66px;height:4px;background:var(--accent);margin-top:16px}\n.ed-scene .ed-headline{margin:0;font:600 85px/1.04 Georgia,'Times New Roman',serif;letter-spacing:-2.4px;overflow-wrap:break-word;text-wrap:balance;color:#fff9ef;text-shadow:0 4px 20px #100a0650}\n.ed-scene .ed-headline.ed-long{font-size:69px;line-height:1.07;letter-spacing:-1.5px}\n.ed-scene .ed-headline em{font-style:normal;color:#e1bd77}\n.ed-scene .ed-label{font:600 69px/1.05 Georgia,'Times New Roman',serif;letter-spacing:-1.4px;color:#fff9ef;text-shadow:0 4px 20px #100a0680;max-width:900px;text-wrap:balance}\n.ed-scene .captions{z-index:5;top:1600px;left:90px;right:90px;height:195px;min-height:0;overflow:hidden;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;align-content:center;gap:11px 13px;font-size:42px;line-height:1.22;font-weight:750;color:#fff9ef;text-align:center;text-shadow:0 2px 10px #0e0908de}\n.ed-scene .word.emph{color:#e1bd77}\n.ed-scene .example-tag{z-index:6;top:120px;bottom:auto;right:90px;letter-spacing:2px;border-color:#fff6;color:#fff;border-radius:4px;font-size:17px;background:#0005}\n.ed-scene[data-type=\"editorial_text_card\"]{background:#EEE6D9}\n.ed-scene .visual.editorial_text_card{padding:440px 90px 350px;display:flex;flex-direction:column;align-items:stretch;justify-content:center;gap:26px;background:radial-gradient(circle at 25% 15%,#fff7e9,#EEE6D9 72%);text-align:left}\n.ed-scene .editorial_text_card .ed-kicker{color:#6E6258}\n.ed-scene .editorial_text_card .ed-headline{color:#27211C;font-size:112px;text-shadow:none}\n.ed-scene .editorial_text_card .ed-headline.ed-long{font-size:89px}\n.ed-scene .editorial_text_card .ed-headline em{color:var(--accent)}\n.ed-scene[data-type=\"editorial_text_card\"] .captions{color:#27211C;text-shadow:none}\n.ed-scene[data-type=\"editorial_text_card\"] .word.emph{color:var(--accent)}\n.ed-scene[data-type=\"editorial_text_card\"] .example-tag{color:#6E6258;border-color:#6E625866;background:none}\n";
export const ILLUSTRATION_CSS = '';
export const VIDEO_CSS = '';
export const FIT_CSS = '';
// Safe editorial markup: the illustration is the whole video frame, not a framed player.
function highlighted(text, emphasis, escape) {
  const hit=emphasis ? text.indexOf(emphasis) : -1;
  if(hit<0)return escape(text);
  return escape(text.slice(0,hit))+'<em>'+escape(emphasis)+'</em>'+escape(text.slice(hit+emphasis.length));
}
function artwork(media,escape){
  const fit=media.fit==='contain'?' ed-fit-contain':'';
  const images=media.kind==='layers'
    ? media.layers.map(l=>'<img class="ed-anim-asset'+fit+'" data-depth="'+l.depth+'" src="'+escape(l.src)+'" alt="" draggable="false">').join('')
    : '<img class="ed-anim-asset'+fit+'" src="'+escape(media.src)+'" alt="Illustrated scene" draggable="false">';
  return '<div class="ed-artwork" role="img" aria-label="Original illustrative artwork">'+images+'</div>';
}
export function editorialVisual(scene,escape){
  const p=scene.props;
  if(scene.template==='editorial_text_card'){
    return '<div class="ed-kicker">'+escape(p.kicker||'')+'</div>'+
      '<h1 class="ed-headline'+(p.text.trim().split(/\s+/).length>9?' ed-long':'')+'">'+highlighted(p.text,p.emphasis,escape)+'</h1>';
  }
  const image=artwork(p.media,escape);
  if(scene.template==='editorial_split'){
    return image+'<div class="ed-copy"><div class="ed-kicker">'+escape(p.kicker||'')+'</div>'+
      '<h1 class="ed-headline'+(p.text.trim().split(/\s+/).length>9?' ed-long':'')+'">'+highlighted(p.text,p.emphasis,escape)+'</h1></div>';
  }
  if(scene.template==='illustration_motion'||scene.template==='video_card'){
    return image+(p.label?'<div class="ed-copy"><div class="ed-label">'+escape(p.label)+'</div></div>':'');
  }
  return '';
}
