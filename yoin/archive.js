import {projects} from './catalog.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const dialog=$('#project-dialog'), photoPanel=$('#detail-photo'), modelPanel=$('#detail-model');
let selected, view='photo', photoIndex=0;
const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el;};
function pending(kind){
  const box=make('div','detail-pending');box.append(make('span','pending-mark',kind==='model'?'3D':'PHOTO'));
  box.append(make('h3','',kind==='model'?'立体モデル準備中':'写真準備中'));
  box.append(make('p','',kind==='model'?'この作品の立体モデルを、ここに表示します。':'この作品の建築写真を、ここに収録します。'));
  return box;
}
function showPhoto(){
  photoPanel.replaceChildren();
  if(!selected.photos.length){photoPanel.append(pending('photo'));return;}
  const image=selected.photos[photoIndex],figure=make('figure','detail-figure'),img=make('img');
  img.src=image.src;img.alt=selected.title+'の建築写真';figure.append(img);photoPanel.append(figure);
  if(selected.photos.length>1){
    const nav=make('div','detail-photo-nav');
    const prev=make('button','','←'),next=make('button','','→');
    prev.setAttribute('aria-label','前の写真');next.setAttribute('aria-label','次の写真');
    const change=step=>{photoIndex=(photoIndex+step+selected.photos.length)%selected.photos.length;showPhoto();caption();};
    prev.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));
    nav.append(prev,make('span','tiny',`${photoIndex+1} / ${selected.photos.length}`),next);photoPanel.append(nav);
  }
}
function showModel(){
  modelPanel.replaceChildren();
  if(selected.model.status!=='study'){modelPanel.append(pending('model'));return;}
  const img=make('img','detail-line');img.src=selected.model.poster;img.alt=selected.title+'の写真をもとにした線画3Dスタディ';
  const link=make('a','detail-orbit-link','01で回転する3Dを見る ↗');modelPanel.append(img);
  if(selected.model.viewer){link.href=selected.model.viewer;link.addEventListener('click',()=>dialog.close());modelPanel.append(link);}
}
function caption(){
  $('#detail-caption').textContent=view==='photo'?(selected.photos.length?`Photo: ${selected.photos[photoIndex].credit}`:'原写真は順次収録します。'):(selected.model.status==='study'?'写真から制作した推定モデル / 線画スタディ':'作品ごとに専用の3Dモデルを追加予定。');
}
function switchView(mode){
  view=mode;photoPanel.hidden=view!=='photo';modelPanel.hidden=view!=='model';
  $$('[data-detail-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.detailView===view)));caption();
}
$$('[data-open-project]').forEach(button=>button.addEventListener('click',event=>{
  const project=projects.find(p=>p.id===button.dataset.openProject);if(!project)return;
  event.preventDefault();selected=project;photoIndex=0;
  $('#detail-title').textContent=selected.title;$('#detail-index').textContent=`WORKS ARCHIVE / ${String(projects.indexOf(selected)+1).padStart(2,'0')}`;
  $('#detail-source').href=selected.source;showPhoto();showModel();switchView(button.dataset.openView||'photo');dialog.showModal();
}));
$$('[data-detail-view]').forEach(button=>button.addEventListener('click',()=>switchView(button.dataset.detailView)));
const items=$$('.archive-item');
$$('[data-archive-filter]').forEach(button=>button.addEventListener('click',()=>{
  const filter=button.dataset.archiveFilter;
  $$('[data-archive-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  items.forEach((item,i)=>{
    item.hidden=filter==='photo'?item.dataset.hasPhoto!=='true':filter==='model'?item.dataset.hasModel!=='true':false;
    if(!item.hidden&&!reduce.matches){item.animate([{opacity:0,transform:'translateY(22px)'},{opacity:1,transform:'translateY(0)'}],{duration:500,delay:(i%4)*55,easing:'cubic-bezier(.16,1,.3,1)'});}
  });
  const count=items.filter(item=>!item.hidden).length;
  $('#archive-count').textContent=`${count} ${count===1?'WORK':'WORKS'}`;
}));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const i=items.indexOf(entry.target);
  if(!reduce.matches){entry.target.animate([{opacity:.2,clipPath:`inset(0 ${i%2?0:25}% 0 ${i%2?25:0}%)`,transform:'translateY(30px)'},{opacity:1,clipPath:'inset(0)',transform:'translateY(0)'}],{duration:850,delay:(i%4)*70,easing:'cubic-bezier(.16,1,.3,1)'});}
  observer.unobserve(entry.target);
}),{threshold:.12});items.forEach(item=>observer.observe(item));
addEventListener('pagehide',event=>{if(!event.persisted)observer.disconnect();});
