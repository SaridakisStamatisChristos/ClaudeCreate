// Editorial v2 composition CSS and safe markup helpers.
export const EDITORIAL_CSS = "\n.scene.ed-scene{background:#EEE6D9;color:#27211C;font-family:Arial,Helvetica,sans-serif}\n.ed-scene .moving-grain{inset:0;background:repeating-linear-gradient(0deg,#735b3710 0px,transparent 2px,transparent 7px),radial-gradient(circle at 20% 25%,#fff7e9a8,transparent 60%);opacity:.48}\n.ed-scene .handle{color:#6E6258;font-size:24px;letter-spacing:3px;font-weight:700}\n.ed-scene .footer{color:#6E6258;font-size:22px;bottom:71px}\n.ed-scene .example-tag{right:80px;top:173px;bottom:auto;color:#6E6258;border-color:#6E625866;font-size:18px}\n.ed-scene .captions{top:1553px;left:90px;right:90px;height:216px;min-height:0;overflow:hidden;color:#27211C;font-size:43px;line-height:1.24;font-weight:700;text-shadow:none;gap:11px 12px;align-content:center}\n.ed-scene .word.emph{color:var(--accent)}\n.ed-scene .visual.editorial_split{inset:260px 70px 425px;justify-content:flex-start;align-items:stretch;gap:0;text-align:left}\n.ed-scene .ed-player{width:940px;height:700px;flex:0 0 700px;position:relative;background:#D1C5B4;border-radius:19px;border:8px solid #F9F5ED;box-shadow:0 20px 44px #473b2f32,0 0 0 1px #69584020;overflow:hidden}\n.ed-scene .ed-player img{display:block;width:100%;height:100%;object-fit:cover}\n.ed-scene .ed-player::after{content:'';position:absolute;inset:0;border:1px solid #443a3052;pointer-events:none;border-radius:10px}\n.ed-scene .ed-player-chrome{position:absolute;left:25px;right:25px;bottom:21px;display:flex;align-items:center;gap:18px;z-index:2;color:#fff;text-shadow:0 1px 5px #1118}\n.ed-scene .ed-play-icon{font:600 32px/1 Arial,sans-serif}\n.ed-scene .ed-progress{height:5px;flex:1;background:#fff8;border-radius:3px;overflow:hidden}\n.ed-scene .ed-progress-fill{height:100%;width:18%;background:#fff}\n.ed-scene .ed-meta{padding-top:66px}\n.ed-scene .ed-kicker{font:700 25px/1.1 Arial,sans-serif;letter-spacing:5px;color:#6E6258;text-transform:uppercase;min-height:30px}\n.ed-scene .ed-kicker::after{content:'';display:block;width:69px;height:4px;background:var(--accent);margin:22px 0 26px}\n.ed-scene .ed-headline{margin:0;max-width:940px;font:600 102px/.99 Georgia,'Times New Roman',serif;letter-spacing:-3.4px;overflow-wrap:break-word;text-wrap:balance}\n.ed-scene .ed-headline em{font-style:normal;color:var(--accent)}\n.ed-scene .visual.editorial_text_card{inset:475px 90px 380px;justify-content:center;text-align:left;align-items:stretch;gap:35px}\n.ed-scene .editorial_text_card .ed-headline{font-size:124px;max-width:910px}\n.ed-scene .editorial_text_card .ed-kicker::after{margin-bottom:18px}\n";

export const VIDEO_CSS = "\n.ed-scene .visual.video_card{inset:335px 70px 480px;justify-content:flex-start;align-items:stretch;gap:48px;text-align:left}\n.ed-scene .video_card .ed-player{flex:0 0 770px;height:770px;border-radius:24px}\n.ed-scene .ed-video-label{font:600 85px/1.06 Georgia,'Times New Roman',serif;color:#27211C;max-width:940px;overflow-wrap:break-word;text-wrap:balance}\n.ed-scene .ed-video-kicker{font:700 23px/1 Arial,sans-serif;letter-spacing:4px;color:#6E6258;text-transform:uppercase}\n";
export const ILLUSTRATION_CSS = "\n.ed-scene .ed-player img{position:absolute;inset:0}\n.ed-scene .visual.illustration_motion{inset:270px 70px 420px;justify-content:flex-start;align-items:stretch;gap:26px;text-align:left}\n.ed-scene .ed-motion-frame{position:relative;flex:0 0 1130px;width:940px;height:1130px;border:9px solid #fbf7ef;border-radius:20px;overflow:hidden;box-shadow:0 22px 48px #44372c3b;background:#c4b9a9}\n.ed-scene .ed-motion-frame img{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:center center;will-change:transform}\n.ed-scene .ed-motion-label{font-size:25px;color:#6E6258;letter-spacing:1.3px;text-align:center}\n";
// All user-controlled text is escaped by the caller before HTML interpolation.
function headline(text,emphasis,escape) {
  const hit=emphasis ? text.indexOf(emphasis) : -1;
  if(hit<0)return escape(text);
  return escape(text.slice(0,hit))+'<em>'+escape(emphasis)+'</em>'+escape(text.slice(hit+emphasis.length));
}
function player(media,chrome,escape) {
  const images=media.kind==='layers'
    ?media.layers.map(l=>'<img class="ed-anim-asset" data-depth="'+(Number.isFinite(l.depth)?l.depth:0)+'" src="'+escape(l.src)+'" alt="" draggable="false">').join('')
    :'<img class="ed-anim-asset" src="'+escape(media.src)+'" alt="Original editorial illustration" draggable="false">';
  return '<div class="ed-player">'+images+(chrome===false?'':'<div class="ed-player-chrome"><span class="ed-play-icon">▶</span><div class="ed-progress"><div class="ed-progress-fill"></div></div></div>')+'</div>';
}
export function editorialVisual(scene,escape) {
  const p=scene.props;
  if(scene.template==='video_card')return player(p.media,p.player_chrome,escape)+'<div class="ed-video-kicker">ANIMATED ILLUSTRATION</div><div class="ed-video-label">'+escape(p.label||'')+'</div>';
  if(scene.template==='illustration_motion') {
    const images=p.media.kind==='layers'
      ?p.media.layers.map(l=>'<img class="ed-anim-asset" data-depth="'+(Number.isFinite(l.depth)?l.depth:0)+'" src="'+escape(l.src)+'" alt="" draggable="false">').join('')
      :'<img class="ed-anim-asset" src="'+escape(p.media.src)+'" alt="Original illustrated landscape" draggable="false">';
    return '<div class="ed-motion-frame">'+images+'</div><div class="ed-motion-label">'+escape(p.label||'')+'</div>';
  }
  if(scene.template==='editorial_split')return player(p.media,p.player_chrome,escape)+
    '<div class="ed-meta"><div class="ed-kicker">'+escape(p.kicker||'')+'</div><h1 class="ed-headline">'+headline(p.text,p.emphasis,escape)+'</h1></div>';
  if(scene.template==='editorial_text_card')return '<div class="ed-kicker">'+escape(p.kicker||'')+
    '</div><h1 class="ed-headline">'+headline(p.text,p.emphasis,escape)+'</h1>';
  return '';
}
