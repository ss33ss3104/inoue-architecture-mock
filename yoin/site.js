const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)'), video = $('#forest');
let paused = reduce.matches, orbitPaused = false, model, frame = 0, lastActive = -1;
video.src = matchMedia('(max-width:760px), (max-width:1024px) and (max-height:520px)').matches ? 'assets/forest-mobile.mp4' : 'assets/forest-loop.mp4';
function loops() {
  const stop = paused || reduce.matches || document.hidden;
  document.body.classList.toggle('loops-paused', stop);
  $('#motion-toggle').setAttribute('aria-pressed', String(stop));
  $('#motion-toggle').setAttribute('aria-label', stop ? '背景動画と3Dの回転を再開' : '背景動画と3Dの回転を停止');
  $('.motion-label').textContent = stop ? 'PLAY' : 'PAUSE';
  if (stop) video.pause(); else video.play().catch(() => {});
  model?.setPaused(stop || orbitPaused);
}
$('#motion-toggle').addEventListener('click', () => { paused = !paused; loops(); });
$('#orbit-toggle').addEventListener('click', () => { orbitPaused = !orbitPaused; $('#orbit-toggle').setAttribute('aria-pressed', String(orbitPaused)); $('#orbit-toggle').textContent = orbitPaused ? '回転を再開する ↻' : '回転を止める Ⅱ'; loops(); });
document.addEventListener('visibilitychange', loops); loops();
const clamp = v => Math.max(0, Math.min(1, v));
const smooth = v => { v = clamp(v); return v*v*(3-2*v); };
const architect = $('.architect'), portrait = $('.architect-portrait');
const chapter = $('.chapter-break'), drawing = $('.model-stage'), contact = $('.contact-transition');
const hero = $('.hero'), works = $('.works'), projects = $$('.project'), film = $('.film');
function draw() {
  frame = 0;
  const hr = hero.getBoundingClientRect(), wr = works.getBoundingClientRect(), fr = film.getBoundingClientRect();
  const p = reduce.matches ? 0 : clamp(-hr.top / Math.max(1, hr.height-innerHeight));
  $$('.glyph').forEach((el,i) => el.style.transform = `translate3d(${p*(i-1.5)*35}px,${-p*(100+i*45)}px,0) rotate(${p*(i-1.5)*3}deg)`);
  $('.hero-house').style.transform = `translate3d(${p*18}%,${p*25}px,0) scale(${1-p*.07})`;
  const travel = Math.max(1, wr.height-innerHeight), position = clamp((innerHeight*.25-wr.top)/(travel+innerHeight*.25))*3;
  const active = Math.min(2, Math.floor(position));
  projects.forEach((el,i) => {
    const t = position-i, hold = clamp((t-.26)/.46), enter = smooth(t/.26), leave = i===2 ? 0 : smooth((t-.72)/.28), dir = i%2 ? 1 : -1;
    const shown = reduce.matches || (t>=0 && t<=1) || (i===2 && position===3);
    el.style.opacity = shown ? String(reduce.matches ? 1 : clamp(t/.09)*(1-leave)) : '0';
    el.inert = !shown; el.setAttribute('aria-hidden', String(!shown)); el.style.pointerEvents = shown ? 'auto' : 'none';
    const obj = el.querySelector('.project-object'), word = el.querySelector('.project-word'), info = el.querySelector('.project-info');
    obj.style.transform = reduce.matches ? '' : `translate3d(${dir*(1-enter)*125-dir*leave*125}vw,0,0) rotate(${dir*(1-enter)*4}deg)`;
    word.style.transform = reduce.matches ? '' : `translate3d(${-dir*(1-enter)*55+dir*leave*55+dir*(hold-.5)*10}vw,0,0)`;
    info.style.transform = reduce.matches ? '' : `translateY(${(1-smooth((t-.12)/.2))*40}px)`;
    info.style.opacity = reduce.matches ? '1' : String(smooth((t-.1)/.2)*(1-leave));
  });
  if (lastActive !== active) { lastActive = active; $('.work-counter b').textContent = `0${active+1}`; $$('[data-select]').forEach((b,i) => b.setAttribute('aria-pressed', String(i===active))); }
  const cr = chapter.getBoundingClientRect(), dr = drawing.getBoundingClientRect(), ctr = contact.getBoundingClientRect();
  const chapterProgress = clamp((innerHeight-cr.top)/(innerHeight+cr.height));
  $('.chapter-track').style.transform = reduce.matches ? '' : `translate3d(${-chapterProgress*32}%,0,0)`;
  chapter.style.setProperty('--rule-progress', reduce.matches ? 1 : smooth(chapterProgress*2));
  const aperture = reduce.matches ? 1 : smooth((innerHeight-fr.top)/(innerHeight*.9));
  film.style.setProperty('--aperture', `${(1-aperture)*35}%`);
  film.style.setProperty('--photo-scale', 1.2-aperture*.2);
  const tracing = reduce.matches ? 1 : smooth((innerHeight*.95-dr.top)/(innerHeight*.5));
  drawing.style.setProperty('--drawing-inset', `${(1-tracing)*100}%`);
  drawing.style.setProperty('--scan-opacity', tracing>.02&&tracing<.98 ? 1 : 0);
  contact.style.setProperty('--arrow-turn', `${reduce.matches ? 0 : (1-smooth((innerHeight-ctr.top)/(innerHeight*.7)))*-90}deg`);
  $$('.section-kicker').forEach(el => el.style.setProperty('--rule-progress', reduce.matches ? 1 : smooth((innerHeight-el.getBoundingClientRect().top)/(innerHeight*.35))));
  const ar = architect.getBoundingClientRect(), pr = portrait.getBoundingClientRect();
  const architectProgress = clamp((innerHeight-ar.top)/(innerHeight+ar.height));
  $$('.architect-title > span').forEach((el,i) => el.style.transform = reduce.matches ? '' : `translate3d(${(architectProgress-.25)*(i ? -1 : 1)*65}px,0,0)`);
  const portraitProgress = reduce.matches ? 1 : smooth((innerHeight*.95-pr.top)/(innerHeight*.55));
  portrait.style.setProperty('--portrait-inset', `${(1-portraitProgress)*38}%`);
  portrait.style.setProperty('--portrait-scale', 1.06+(reduce.matches ? 0 : architectProgress*.06));
  const filmVisible = fr.top < innerHeight*.7 && fr.bottom > innerHeight*.3;
  document.body.classList.toggle('film-active', filmVisible);
  $$('.film h2 span').forEach((el,i) => el.style.transform = reduce.matches ? '' : `translateX(${(fr.top/innerHeight)*60*(i ? -1 : 1)}px)`);
}
function requestDraw() { if (!frame) frame = requestAnimationFrame(draw); }
addEventListener('scroll', requestDraw, {passive:true}); addEventListener('resize', requestDraw); reduce.addEventListener('change', () => { loops(); draw(); });
$$('[data-select]').forEach(b => b.addEventListener('click', () => { const top=works.getBoundingClientRect().top+scrollY; scrollTo({top:top+(Number(b.dataset.select)+.48)/3*(works.offsetHeight-innerHeight),behavior:reduce.matches?'instant':'smooth'}); }));
if (!reduce.matches) {
  $$('.glyph i').forEach((el,i) => el.animate([{transform:'translateY(110%) rotate(8deg)',opacity:0},{transform:'translateY(0) rotate(0deg)',opacity:1}],{duration:1100,delay:i*85,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'}));
  $('.hero-house-enter').animate([{transform:'translateX(-110vw)',opacity:0},{transform:'translateX(0)',opacity:1}],{duration:1450,delay:220,easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
}
const reveal = new IntersectionObserver(entries => entries.forEach(e => { if(!e.isIntersecting)return; if(!reduce.matches) e.target.animate([{transform:'translateY(105%)',opacity:0},{transform:'translateY(0)',opacity:1}],{duration:1000,easing:'cubic-bezier(.16,1,.3,1)'}); reveal.unobserve(e.target); }),{threshold:.2});
$$('.reveal-line > span, .contact h2, .perspective h2').forEach(el=>reveal.observe(el));
const photos = [['hakobune-exterior.jpg','雲海に浮かぶ箱舟 — Photo: Toshihisa Ishii / Blitz Studio'],['big-roof.jpg','大きな屋根の家 — Photo: Takayuki Mori'],['vertical-horizon.jpg','Vertical / Horizon — Photo: Satoshi Ikuma / TechniSaff']];
const approachReveal = new IntersectionObserver(entries => entries.forEach(e => {
  if(!e.isIntersecting)return;
  if(!reduce.matches){const reverse=e.target.closest('details')===document.querySelector('.service-list details:nth-child(2)');e.target.animate([{opacity:.15,clipPath:reverse?'inset(0 0 0 100%)':'inset(0 100% 0 0)'},{opacity:1,clipPath:'inset(0)'}],{duration:1100,easing:'cubic-bezier(.16,1,.3,1)'});}
  approachReveal.unobserve(e.target);
}),{threshold:.18});
$$('.service-visual picture').forEach(el=>approachReveal.observe(el));
$$('.service-list details').forEach(el=>el.addEventListener('toggle',requestDraw));
$$('.photo-open').forEach(b=>b.addEventListener('click',()=>{const [src,title]=photos[Number(b.dataset.photo)];const d=$('#photo-dialog');d.querySelector('img').src='../hybrid/assets/'+src;d.querySelector('img').alt=title;d.querySelector('figcaption').textContent=title;d.showModal();}));
$('#credits-open').addEventListener('click',()=>$('#credits-dialog').showModal());
$$('dialog').forEach(d=>{d.querySelector('.close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d)d.close();});});
let loading=false, visible=false;
const spatialObserver=new IntersectionObserver(async entries=>{
  visible=entries[0].isIntersecting;model?.setVisible(visible);
  if(!visible||loading||model||reduce.matches)return;
  loading=true;
  try { const {createSpatial}=await import('./spatial.js'); model=await createSpatial($('.model-stage'));model.setVisible(visible);loops(); }
  catch(error){console.warn('3D preview unavailable; showing rendered perspective.',error);$('#orbit-toggle').textContent='静止画で表示';$('#orbit-toggle').disabled=true;}
},{rootMargin:'300px'});
spatialObserver.observe($('.model-stage'));
addEventListener('pagehide',event=>{
  video.pause();model?.setVisible(false);cancelAnimationFrame(frame);frame=0;
  if(!event.persisted){model?.dispose();spatialObserver.disconnect();reveal.disconnect();approachReveal.disconnect();}
});
addEventListener('pageshow',event=>{if(event.persisted){model?.setVisible(visible);loops();requestDraw();}});draw();
