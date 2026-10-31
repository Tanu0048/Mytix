/**
 * Mytix landing page
 * Navbar state, mobile menu, decorative QR codes, seat map, scroll reveal.
 */

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar border once the page scrolls
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 2. Mobile menu
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');

  const setMenu = (open) => {
    menu.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };

  toggle.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  // 3. Decorative QR codes (seeded so they render the same every load)
  const SIZE = 25;

  const seededRandom = (seed) => () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  const isFinder = (x, y) => {
    const inBox = (bx, by) => x >= bx && x < bx + 7 && y >= by && y < by + 7;
    return inBox(0, 0) || inBox(SIZE - 7, 0) || inBox(0, SIZE - 7);
  };

  const finderCell = (x, y) => {
    const fx = x >= SIZE - 7 ? x - (SIZE - 7) : x;
    const fy = y >= SIZE - 7 ? y - (SIZE - 7) : y;
    const ring = Math.min(fx, fy, 6 - fx, 6 - fy);
    return ring !== 1;
  };

  document.querySelectorAll('svg.qr').forEach((svg) => {
    const rand = seededRandom(Number(svg.dataset.seed) || 1);
    const ns = 'http://www.w3.org/2000/svg';
    svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const nearFinder = isFinder(x, y) ||
          (x === 7 && (y < 8 || y >= SIZE - 8)) || (y === 7 && (x < 8 || x >= SIZE - 8)) ||
          (x === SIZE - 8 && y < 8) || (y === SIZE - 8 && x < 8);
        const on = isFinder(x, y) ? finderCell(x, y) : !nearFinder && rand() > 0.52;
        if (!on) continue;
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', y);
        r.setAttribute('width', 1);
        r.setAttribute('height', 1);
        svg.appendChild(r);
      }
    }
  });

  // 4. Seat map (feature tile)
  const seatGrid = document.getElementById('seat-grid');
  if (seatGrid) {
    const rows = 6;
    const cols = 10;
    const taken = new Set(['0-1', '0-2', '0-7', '1-0', '1-4', '1-5', '1-8', '2-1', '2-9', '3-2', '3-3', '3-6', '4-0', '4-7', '4-8', '5-4', '5-5']);
    const picked = new Set(['2-4', '2-5']);
    const frag = document.createDocumentFragment();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seat = document.createElement('i');
        const key = `${r}-${c}`;
        if (taken.has(key)) seat.className = 'taken';
        if (picked.has(key)) seat.className = 'pick';
        frag.appendChild(seat);
      }
    }
    seatGrid.appendChild(frag);
  }

  // 5. Reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 70}ms`;
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  // 6. Active nav link for the section in view
  const links = document.querySelectorAll('.nav-links a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        links.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    document.querySelectorAll('main section[id]').forEach((sec) => spy.observe(sec));
  }

  // 7. Footer year
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
});
