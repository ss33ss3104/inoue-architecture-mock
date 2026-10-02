const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = x => Math.min(1, Math.max(0, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = $('#header');
const hero = $('.hero');
const intro = $('.intro');
const landscape = $('.work-landscape');
const pair = $('.work-pair');
const tactile = $('.tactile');
const spatial = $('#spatial');
const stage = $('#spatial-stage');
const studio = $('.studio');
const contact = $('.contact');
const loadStatus = $('#load-status');
let experience, loading = false, failed = false, queued = false, free = false, night = false;

function range(element, start = .9, end = .3) {
  const bounds = element.getBoundingClientRect();
  return clamp((innerHeight * start - bounds.top) / (bounds.height + innerHeight * (start - end)));
}
function spatialProgress() {
  const bounds = spatial.getBoundingClientRect();
  return clamp(-bounds.top / Math.max(1, bounds.height - stage.clientHeight));
}
function update() {
  queued = false;
  const h = innerHeight;
  const heroBounds = hero.getBoundingClientRect();
  const hp = clamp(-heroBounds.top / Math.max(1, heroBounds.height - h));
  if (!reduced) hero.style.setProperty('--hero-progress', hp);
  const underHeader = document.elementFromPoint(innerWidth * .5, 105);
  const darkSection = underHeader?.closest('.hero,.tactile,.spatial,.possibilities,.contact,.footer');
  header.classList.toggle('is-paper', !darkSection && heroBounds.bottom < h * .7);
  intro.style.setProperty('--intro-progress', smooth(range(intro, 1, 0) * 2));
  landscape.style.setProperty('--work-progress', smooth(range(landscape, .9, 0) * 1.6));
  pair.style.setProperty('--pair-progress', smooth(range(pair, 1, 0) * 1.5));
  tactile.style.setProperty('--tactile-progress', range(tactile, 1, 0));
  studio.style.setProperty('--studio-progress', smooth(range(studio, 1, 0) * 2));
  contact.style.setProperty('--contact-progress', range(contact, 1, 0));
  const p = spatialProgress();
  const rect = spatial.getBoundingClientRect();
  const visible = rect.top < h && rect.bottom > 0;
  const ready = stage.querySelector('canvas').dataset.ready === 'true' && !stage.classList.contains('no-3d');
  const blend = ready ? smooth((p - .2) / .29) : 0;
  spatial.style.setProperty('--spatial-progress', p);
  spatial.style.setProperty('--photo-opacity', 1 - blend);
  spatial.classList.toggle('is-entered', blend > .6);
  $('.spatial-controls').hidden = !ready || blend < .65;
  $('.mode-label').textContent = blend > .65 ? '3D / BLENDER STUDY' : 'PHOTOGRAPH';
  if (ready) loadStatus.textContent = blend > .65 && free ? 'ドラッグ / タッチで視点を動かせます。' : blend > .65 ? 'スクロールで、窓辺を巡る。' : 'スクロールで、空間の奥へ。';
  experience?.update(reduced ? .7 : clamp((p - .25) / .75), visible && blend > .02);
}
function schedule() { if (!queued) { queued = true; requestAnimationFrame(update); } }
addEventListener('scroll', schedule, { passive: true });
addEventListener('resize', () => { experience?.resize(); schedule(); }, { passive: true });
document.addEventListener('visibilitychange', schedule);
update();

async function loadSpatial() {
  if (loading || failed || experience) return;
  loading = true;
  loadStatus.textContent = '空間を準備しています。';
  try {
    const { createSpatialExperience } = await import('./spatial.js?v=20261002');
    experience = await createSpatialExperience(stage);
    // Produce a first frame beneath the photograph before switching to the model.
    experience.update(reduced ? .7 : clamp((spatialProgress() - .25) / .75), true);
    requestAnimationFrame(() => requestAnimationFrame(schedule));
    loadStatus.textContent = 'スクロールで、空間の奥へ。';
  } catch (error) {
    failed = true;
    stage.classList.add('no-3d');
    loadStatus.textContent = '写真で建築をご覧いただけます。';
    $('.enter-button').hidden = true;
    console.warn('Spatial study unavailable:', error.message);
  }
}
const modelObserver = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) { loadSpatial(); modelObserver.disconnect(); }
}, { rootMargin: '600px 0px' });
modelObserver.observe(spatial);
$('.enter-button').addEventListener('click', () => {
  loadSpatial();
  const top = scrollY + spatial.getBoundingClientRect().top + (spatial.offsetHeight - stage.clientHeight) * .57;
  scrollTo({ top, behavior: reduced ? 'instant' : 'smooth' });
});
$('.light-button').addEventListener('click', event => {
  night = !night;
  event.currentTarget.setAttribute('aria-pressed', String(night));
  event.currentTarget.textContent = night ? '昼の光に戻す' : '夕方の光';
  experience?.setNight(night);
});
$('.orbit-button').addEventListener('click', event => {
  free = !free;
  event.currentTarget.setAttribute('aria-pressed', String(free));
  event.currentTarget.innerHTML = free ? '視点を戻す <span aria-hidden="true">↶</span>' : '視点を動かす <span aria-hidden="true">↔</span>';
  spatial.classList.toggle('is-free', free);
  experience?.setFree(free);
  schedule();
});
if (!reduced) tactile.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  const bounds = tactile.getBoundingClientRect();
  tactile.style.setProperty('--focus-x', `${(event.clientX / bounds.width - .5) * 55}px`);
  tactile.style.setProperty('--focus-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 45}px`);
});

const purposes = [
  { image: 'assets/akadama-3801.webp', alt: '緑を望むオーベルジュあかだまの木のテラス', caption: 'AUBERGE AKADAMA / 建築のイメージ' },
  { image: '../hybrid/assets/big-roof-interior.jpg', alt: '大きな屋根の家の柔らかな光を含む室内', caption: '大きな屋根の家 / 建築のイメージ' },
  { image: 'assets/akadama-3748.webp', alt: 'オーベルジュあかだまの木に包まれる室内', caption: 'AUBERGE AKADAMA / 建築のイメージ' }
];
let purposeRevision = 0;
$$('.purpose-toggle').forEach(button => button.addEventListener('click', async () => {
  const index = Number(button.dataset.purpose);
  const revision = ++purposeRevision;
  $$('.purpose-toggle').forEach(other => {
    const active = other === button;
    other.setAttribute('aria-expanded', String(active));
    other.closest('.purpose-item').classList.toggle('active', active);
    $('.purpose-symbol', other).textContent = active ? '−' : '+';
    $(`#${other.getAttribute('aria-controls')}`).hidden = !active;
  });
  const visual = $('.possibilities-visual');
  const chosen = purposes[index];
  visual.classList.add('is-changing');
  const image = new Image(); image.src = chosen.image;
  try { await image.decode(); } catch { /* Existing photograph remains available. */ }
  if (revision !== purposeRevision) return;
  $('#purpose-image').src = chosen.image;
  $('#purpose-image').alt = chosen.alt;
  $('#purpose-caption').textContent = chosen.caption;
  $('.purpose-counter').textContent = `0${index + 1}`;
  requestAnimationFrame(() => requestAnimationFrame(() => visual.classList.remove('is-changing')));
}));

const menu = $('#menu-dialog');
function openDialog(dialog) { dialog.showModal(); document.body.classList.add('modal-open'); }
$$('dialog').forEach(dialog => {
  $('.dialog-close', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    if (dialog === menu) { $('.menu-button').setAttribute('aria-expanded', 'false'); schedule(); }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
});
$('.menu-button').addEventListener('click', () => {
  openDialog(menu); $('.menu-button').setAttribute('aria-expanded', 'true');
});
$$('a', menu).forEach(link => link.addEventListener('click', () => menu.close()));
$('.credits-button').addEventListener('click', () => openDialog($('#credits-dialog')));
$$('[data-photo]').forEach(button => button.addEventListener('click', () => {
  const dialog = $('#photo-dialog');
  const image = $('img', dialog);
  image.src = button.dataset.photo;
  image.alt = $('img', button).alt;
  $('figcaption', dialog).textContent = button.dataset.caption;
  openDialog(dialog);
}));
addEventListener('pagehide', () => experience?.dispose(), { once: true });
