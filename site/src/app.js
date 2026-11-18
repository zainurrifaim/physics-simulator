import { lessons, byId } from './lessons/index.js';
import { icon } from './components/icons.js';
import { renderHome } from './pages/home.js';
import { renderWorkspace } from './pages/workspace.js';
import { renderConcepts } from './pages/concepts.js';
import { renderNotes } from './pages/notes.js';
import * as store from './state/storage.js';

store.load();

const app = document.querySelector('#app');
let cleanup = null;

function shell() {
  app.innerHTML = `
    <aside class="sidebar" id="sidebar" inert>
      <a class="brand" href="#home" aria-label="Ruang Fisika"><span class="brand-icon"><img class="brand-logo" src="./assets/favicon.svg" width="33" height="36" alt=""></span><span class="brand-text">ruang<span>fisika</span></span></a>
      <div class="side-section">RUANG BELAJAR</div>
      <nav aria-label="Navigasi utama">
        <a href="#home" class="nav-link" data-route="home">${icon('grid')} Jelajahi simulasi</a>
        <a href="#konsep" class="nav-link" data-route="konsep">${icon('book')} Konsep dasar</a>
        <a href="#catatan" class="nav-link" data-route="catatan">${icon('note')} Catatan belajarku</a>
      </nav>
      <div class="side-section">USAHA &amp; ENERGI <span class="count">5</span></div>
      <nav class="module-nav" aria-label="Pilih modul">
        ${lessons.map((l) => `<a href="#sim/${l.id}" class="module-link" data-route="${l.id}"><span class="module-number">${l.number}</span>${l.short}<span class="module-tick" data-tick="${l.id}"></span></a>`).join('')}
      </nav>
      <div class="sidebar-bottom">
        <div class="progress-card"><div class="progress-heading">Latihan selesai<span id="progress-count"></span></div><div class="progress-track"><span id="progress-bar"></span></div></div>
      </div>
    </aside>
    <div class="app-body">
      <header class="topbar">
        <button class="icon-button menu-button" data-action="menu" aria-label="Buka menu" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button>
        <a href="#home" class="mobile-brand" aria-label="Ruang Fisika"><img class="brand-logo" src="./assets/favicon.svg" width="26" height="28" alt=""> ruang<span>fisika</span></a>
        <div class="breadcrumb" id="breadcrumb"></div>
        <div class="top-actions">
          <span class="course-label"><i></i> Fisika · Usaha &amp; Energi</span>
          <button class="guide-button" data-action="guide">${icon('help')}<span>Panduan</span></button>
        </div>
      </header>
      <main id="main" tabindex="-1"></main>
      <footer class="main-footer"><span>Ruang Fisika</span><span>Model ideal · g = 10 m/s²</span></footer>
    </div>
    <div class="scrim" data-action="menu-close"></div>`;
}

function updateProgress() {
  const data = store.all();
  const count = lessons.filter((l) => data[l.id]?.done).length;
  document.querySelector('#progress-count').textContent = `${count}/5`;
  document.querySelector('#progress-bar').style.width = `${count * 20}%`;
  for (const l of lessons) {
    const tick = document.querySelector(`[data-tick="${l.id}"]`);
    if (tick) tick.innerHTML = data[l.id]?.done ? icon('check') : '';
  }
}

function setActive(route, crumb) {
  document.querySelectorAll('[data-route]').forEach((a) => {
    const on = a.dataset.route === route;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.querySelector('#breadcrumb').innerHTML = `<a href="#home">Laboratorium</a><span>/</span><span>${crumb}</span>`;
}

function route() {
  const hash = location.hash.replace(/^#/, '') || 'home';
  const mainEl = document.querySelector('#main');
  const [page, id] = hash.split('/');
  document.body.classList.toggle('in-simulation', page === 'sim' && Boolean(byId(id)));
  const known = page === 'home' || page === 'konsep' || page === 'catatan' || (page === 'sim' && byId(id));
  if (!known) {
    // in-page anchor such as the skip link: scroll, don't navigate
    const target = document.getElementById(hash);
    if (target) {
      target.focus?.();
      return;
    }
  }
  cleanup?.();
  cleanup = null;
  closeMenu();
  // a fresh container per page, so listeners from the previous page are dropped with it
  const main = document.createElement('div');
  main.className = 'page';
  mainEl.replaceChildren(main);
  if (page === 'sim' && byId(id)) {
    const lesson = byId(id);
    setActive(lesson.id, lesson.short);
    document.title = `${lesson.title} — Ruang Fisika`;
    cleanup = renderWorkspace(main, lesson);
  } else if (page === 'konsep') {
    setActive('konsep', 'Konsep dasar');
    document.title = 'Konsep Dasar — Ruang Fisika';
    renderConcepts(main);
  } else if (page === 'catatan') {
    setActive('catatan', 'Catatan belajarku');
    document.title = 'Catatan Belajarku — Ruang Fisika';
    renderNotes(main);
  } else {
    setActive('home', 'Jelajahi');
    document.title = 'Ruang Fisika — Belajar lewat eksperimen';
    cleanup = renderHome(main);
  }
  updateProgress();
  window.scrollTo(0, 0);
  mainEl.focus({ preventScroll: true });
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  document.querySelector('#sidebar').inert = true;
  document.querySelectorAll('[data-action="menu"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
}

document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'guide') document.querySelector('#guide').showModal();
  else if (action === 'menu') {
    const open = document.body.classList.toggle('menu-open');
    document.querySelector('#sidebar').inert = !open;
    e.target.closest('[data-action]').setAttribute('aria-expanded', String(open));
  } else if (action === 'menu-close') closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});
document.addEventListener('progress-changed', updateProgress);

const guide = document.querySelector('#guide');
guide.addEventListener('click', (e) => {
  if (e.target === guide || e.target.closest('[data-close]')) guide.close();
});

shell();
window.addEventListener('hashchange', route);
route();
