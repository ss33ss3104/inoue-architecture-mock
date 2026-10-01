const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const hero=document.querySelector('.hero'),cover=document.querySelector('.cover'),stage=document.querySelector('#spatial-stage'),sequence=document.querySelector('#spatial');
const exterior=document.querySelector('.exterior-photo'),interior=document.querySelector('.interior-photo'),copies=[...document.querySelectorAll('.scene-copy')];
const status=document.querySelector('#load-status');
let experience,loading=false,failed=false,free=false,night=false,pending=false,progress=0,ready=false;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)},range=(x,a,b)=>ease((x-a)/(b-a));
document.body.classList.add('has-js');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('seen');revealObserver.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(e=>revealObserver.observe(e));
function updatePage(){
  pending=false;
  const heroRect=hero.getBoundingClientRect(),hp=clamp(-heroRect.top/(hero.offsetHeight-innerHeight));
  if(!reduce){cover.style.setProperty('--cover-y',`${-hp*38}px`);cover.style.setProperty('--cover-r',`${hp*-.7}deg`);document.querySelector('.hero-backdrop img').style.transform=`scale(${innerWidth<760?1.25:1.09}) translateY(${hp*22}px)`;document.querySelector('.cover-photo img').style.transform=`scale(${1.03+hp*.08})`}
  const r=sequence.getBoundingClientRect();progress=clamp(-r.top/(sequence.offsetHeight-innerHeight));
  const active=r.top<innerHeight&&r.bottom>0;
  const photoOut=1-range(progress,.14,.31),photoIn=range(progress,.865,.95);
  exterior.style.opacity=free?0:(!ready&&!failed?1:photoOut);interior.style.opacity=free?0:photoIn;
  const chapter=progress<.43?0:progress<.67?1:progress<.87?2:3;
  stage.dataset.scene=chapter;stage.dataset.progress=progress.toFixed(3);stage.classList.toggle('can-explore',ready&&(free||(progress>.24&&progress<.91)));
  copies.forEach((c,i)=>{c.classList.toggle('active',i===chapter);c.inert=free||i!==chapter});
  document.querySelector('.spatial-controls').inert=!ready||(!free&&(progress<=.24||progress>=.91));
  document.querySelector('#scene-name').textContent=free?'HAKOBUNE — YOUR POINT OF VIEW':[progress>.31?'HAKOBUNE — EXTERIOR':'HAKOBUNE — PHOTOGRAPH','HAKOBUNE — OPEN THE ROOF','HAKOBUNE — INSIDE','HAKOBUNE — PHOTOGRAPH'][chapter];
  document.querySelector('.stage-progress i').style.width=`${progress*100}%`;
  document.querySelectorAll('.view-buttons button').forEach((b,i)=>{const selected=i===(chapter===0?0:chapter===1?1:2);b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected))});
  const canvas=document.querySelector('#scene');canvas.style.filter=`saturate(.94) contrast(1.02)`;
  document.querySelector('.image-shade').style.opacity=free?0:chapter===1?.12:chapter===2?.12:.7;
  const entry=document.querySelector('.enter-space');
  const nextJump=progress>.31?'.55':'.34';
  if(entry.dataset.jump!==nextJump){entry.dataset.jump=nextJump;entry.innerHTML=progress>.31?'屋根を開く <span>↗</span>':'空間に入る <span>↗</span>'}
  experience?.update(progress,active&&(free||(progress>.08&&progress<.98)));
}
function tick(){if(!pending){pending=true;requestAnimationFrame(updatePage)}}
function jump(p){if(free)exitFree();scrollTo({top:sequence.offsetTop+p*(sequence.offsetHeight-innerHeight),behavior:reduce?'instant':'smooth'});}
document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>jump(Number(b.dataset.jump))));
async function loadExperience(){
  if(loading)return;loading=true;status.textContent='空間を準備しています…';
  try{const {createSpatialExperience}=await import('./spatial.js?v=20261001b');experience=await createSpatialExperience(stage);ready=true;stage.classList.add('spatial-ready');status.textContent='雲海に浮かぶ箱舟 / SPATIAL EXPERIENCE';tick()}
  catch(e){failed=true;stage.classList.add('no-3d');status.textContent='写真で建築をご覧いただけます';console.error('Spatial experience unavailable:',e);tick()}
}
new IntersectionObserver((entries,observer)=>{if(entries.some(e=>e.isIntersecting)){loadExperience();observer.disconnect()}},{rootMargin:'900px'}).observe(sequence);
function exitFree(){free=false;experience?.setFree(false);stage.classList.remove('free-mode');document.querySelector('#orbit').setAttribute('aria-pressed','false');document.querySelector('#leave-orbit').hidden=true;document.querySelector('#orbit-hint').hidden=true;tick()}
document.querySelector('#orbit').addEventListener('click',()=>{if(!ready)return;if(free){exitFree();return}free=true;experience.setFree(true);stage.classList.add('free-mode','can-explore');document.querySelector('#orbit').setAttribute('aria-pressed','true');document.querySelector('#leave-orbit').hidden=false;document.querySelector('#orbit-hint').hidden=false;tick()});
document.querySelector('#leave-orbit').addEventListener('click',exitFree);
document.querySelector('#light').addEventListener('click',()=>{night=!night;experience?.setNight(night);stage.classList.toggle('stage-dusk',night);const b=document.querySelector('#light');b.setAttribute('aria-pressed',String(night));b.setAttribute('aria-label',night?'昼景に切り替える':'夕景に切り替える');b.innerHTML=night?'DUSK <span>☾</span>':'DAY <span>☀</span>';});
const about=document.querySelector('#about-dialog'),gallery=document.querySelector('#image-dialog');
document.querySelectorAll('[data-about]').forEach(b=>b.addEventListener('click',()=>about.showModal()));
document.querySelectorAll('[data-image]').forEach(b=>b.addEventListener('click',()=>{gallery.querySelector('img').src=b.dataset.image;gallery.querySelector('img').alt=b.dataset.title;gallery.querySelector('.image-title').textContent=b.dataset.title;gallery.querySelector('.image-credit').textContent=`PHOTO: ${b.dataset.credit}`;gallery.showModal()}));
for(const d of [about,gallery]){d.querySelector('.dialog-close').addEventListener('click',()=>d.close());d.addEventListener('click',e=>{const r=d.getBoundingClientRect();if(e.target===d&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))d.close()})}
addEventListener('scroll',tick,{passive:true});addEventListener('resize',()=>{experience?.resize();tick()});addEventListener('pagehide',()=>experience?.dispose());
document.fonts.ready.then(tick);updatePage();
