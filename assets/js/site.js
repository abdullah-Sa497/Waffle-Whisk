/* Waffle Whisk: site behaviour. Plain JavaScript, no libraries. */
(() => {
  'use strict';

  /* -------------------------------------------------------
     Business details. Placeholders until the owner's real
     number and hours are in.
     ------------------------------------------------------- */
  const CONFIG = {
    whatsapp: '923000000000',          // country code + number, no plus sign
    // Opening hours in Lahore time (24h). Index = day, 0 Sunday to 6 Saturday.
    hours: [[8, 16], [7, 15], [7, 15], [7, 15], [7, 15], [7, 15], [8, 16]],
    maxGuests: 12,
    bookingDaysAhead: 60
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  /* -------------------------------------------------------
     Lahore time (UTC+5 all year, no daylight saving)
     ------------------------------------------------------- */
  function lahore(offsetDays = 0) {
    const d = new Date(Date.now() + 5 * 3600e3 + offsetDays * 864e5);
    return { day: d.getUTCDay(), mins: d.getUTCHours() * 60 + d.getUTCMinutes(), iso: d.toISOString().slice(0, 10) };
  }
  function fmtTime(mins) {
    const h = Math.floor(mins / 60), m = mins % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = ((h + 11) % 12) + 1;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
  }
  const fmtHour = h => fmtTime(h * 60);
  const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

  function getStatus() {
    const { day, mins } = lahore();
    const [o, c] = CONFIG.hours[day];
    if (mins >= o * 60 && mins < c * 60) {
      return c * 60 - mins > 60
        ? { state: 'open', text: `Open now · until ${fmtHour(c)}` }
        : { state: 'soon', text: `Closing soon · ${fmtHour(c)}` };
    }
    if (mins < o * 60) return { state: 'closed', text: `Closed · opens today at ${fmtHour(o)}` };
    return { state: 'closed', text: `Closed · opens tomorrow at ${fmtHour(CONFIG.hours[(day + 1) % 7][0])}` };
  }

  /* -------------------------------------------------------
     Mobile navigation + Order Online dialog
     ------------------------------------------------------- */
  const navToggle = $('.nav-toggle');
  const mobileNav = $('#mobile-nav');
  function setNav(open) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    mobileNav.hidden = !open;
  }
  navToggle.addEventListener('click', () => setNav(mobileNav.hidden));
  mobileNav.addEventListener('click', e => { if (e.target.closest('a, button')) setNav(false); });
  document.addEventListener('click', e => { if (!mobileNav.hidden && !e.target.closest('#header')) setNav(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mobileNav.hidden) { setNav(false); navToggle.focus(); } });

  const dlg = $('#order-dialog');
  $$('[data-order]').forEach(b => b.addEventListener('click', () => {
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }));
  $('[data-close]', dlg).addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $$('.od-option', dlg).forEach(a => a.addEventListener('click', () => dlg.close()));

  /* -------------------------------------------------------
     HERO: the scroll film
     ------------------------------------------------------- */
  const hero = $('.hero');
  const stage = $('.stage', hero);
  const video = $('.hero-video', hero);
  const poster = $('.poster', hero);
  const ring = $('.ring', hero);
  const cue = $('.hero-cue', hero);
  const VIDEO_URL = 'assets/video/hero-scrub.mp4';
  const VIDEO_BYTES = 4738896;               // real size: fallback when Content-Length is missing
  const POSTER_URL = 'assets/img/hero-poster.jpg';

  // These five strings match the inline gate in <head> and the CSS guard exactly.
  const GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  const MQLS = GATES.map(q => matchMedia(q));

  // Split headlines once: a hidden full sentence for screen readers, a visual copy for motion.
  function splitText(el) {
    const mode = el.dataset.split;
    const r = rng(+el.dataset.seed || 1);
    const offset = +el.dataset.offset || 0;
    const spread = el.dataset.spread ? +el.dataset.spread : 0.4;
    const em = (el.dataset.em || '').split(',');
    const text = el.textContent.trim().replace(/\s+/g, ' ');
    const words = text.split(' ');
    const letters = text.replace(/ /g, '').length;
    el.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const vis = document.createElement('span');
    vis.className = 'vis';
    vis.setAttribute('aria-hidden', 'true');
    let ci = 0;
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'w' + (em.includes(word) ? ' em' : '');
      w.style.setProperty('--th', (offset + (words.length > 1 ? wi / (words.length - 1) : 0) * spread + r() * 0.03).toFixed(3));
      if (mode === 'chars') {
        for (const ch of word) {
          const c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          c.style.setProperty('--th', ((ci / Math.max(1, letters - 1)) * 0.5 + r() * 0.06).toFixed(3));
          ci++;
          w.appendChild(c);
        }
      } else {
        w.textContent = word;
      }
      vis.appendChild(w);
      if (wi < words.length - 1) vis.appendChild(document.createTextNode(' '));
    });
    el.append(sr, vis);
  }
  $$('[data-split]', hero).forEach(splitText);

  const bands = $$('.band', hero).map((el, i, all) => {
    const [a, b] = el.dataset.band.split(',').map(Number);
    return { el, a, b, first: i === 0, last: i === all.length - 1, ramp: el.dataset.ramp ? +el.dataset.ramp : null, op: -1, k: -1, on: null };
  });
  const settle = bands[bands.length - 1];

  let scrubOn = false, heroInited = false, videoReady = false;
  let target = 0, shown = 0, rafId = null, lastTick = 0;
  let heroTop = 0, heroRange = 1, rangeVh = 500, heroOnScreen = true, loadK = 0;
  let lastFk = -1, lastCue = -1;
  let seekBusy = false, pendingTime = null;

  function measure() {
    heroTop = hero.getBoundingClientRect().top + scrollY;
    heroRange = Math.max(1, hero.offsetHeight - innerHeight);
    rangeVh = (heroRange / innerHeight) * 100;
  }
  const heroProgress = () => clamp((scrollY - heroTop) / heroRange, 0, 1);

  // Every band: opacity plateau with ~18vh eased edges, and a --k assembly value. Written only on change.
  function updateCaptions(p) {
    const edge = Math.min(18 / rangeVh, 0.05);
    for (const B of bands) {
      const f = Math.min(edge, (B.b - B.a) / 3);
      const op = (B.first ? 1 : smoothstep(p, B.a, B.a + f)) * (B.last ? 1 : 1 - smoothstep(p, B.b - f, B.b));
      const ramp = B.ramp || Math.min(20 / rangeVh, (B.b - B.a) * 0.35);
      let k = clamp((p - B.a) / ramp, 0, 1);
      if (B.first) k = Math.max(k, loadK);
      if (Math.abs(op - B.op) > 0.004 || (op === 0 && B.op !== 0) || (op === 1 && B.op !== 1)) {
        B.el.style.opacity = op.toFixed(3);
        B.op = op;
      }
      const on = op > 0.5;
      if (on !== B.on) { B.el.classList.toggle('is-on', on); B.on = on; }
      if (Math.abs(k - B.k) > 0.008 || (k === 0 && B.k !== 0) || (k === 1 && B.k !== 1)) {
        B.el.style.setProperty('--k', k.toFixed(3));
        B.k = k;
      }
    }
    const fk = smoothstep(p, 0.72, 0.86);
    if (Math.abs(fk - lastFk) > 0.003 || (fk === 0 && lastFk !== 0) || (fk === 1 && lastFk !== 1)) {
      stage.style.setProperty('--fk', fk.toFixed(4));
      lastFk = fk;
    }
    const cueOp = 1 - smoothstep(p, 0.01, 0.05);
    if (Math.abs(cueOp - lastCue) > 0.01 || (cueOp === 0 && lastCue !== 0) || (cueOp === 1 && lastCue !== 1)) {
      cue.style.setProperty('--cue', cueOp.toFixed(2));
      lastCue = cueOp;
    }
  }

  // Seeks never overlap: keep only the newest target, one follow-up per completed seek.
  function requestSeek(t) {
    if (!videoReady || !isFinite(video.duration) || !video.duration) return;
    t = clamp(t, 0, video.duration - 0.04);
    if (seekBusy) { pendingTime = t; return; }
    if (Math.abs(video.currentTime - t) < 0.001) return;
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', () => {
    seekBusy = false;
    pendingTime = null;
    if (!videoReady) failVideo();
  });

  // Ease the displayed time toward the scroll target; frame-rate independent; rests when converged.
  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    shown += (target - shown) * (1 - Math.pow(1 - 0.16, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) {
      shown = target;
      rafId = null;
      lastTick = 0;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    requestSeek(shown * video.duration);
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }

  // The poster wins the bandwidth race; the video streams in behind an honest ring.
  function initHeroOnce() {
    if (heroInited) return;
    heroInited = true;
    let started = false;
    const start = () => { if (started) return; started = true; loadHeroBlob().catch(failVideo); };
    const img = new Image();
    img.onload = start;
    img.onerror = start;
    img.src = POSTER_URL;
    setTimeout(start, 4000);
  }
  async function loadHeroBlob() {
    const ctrl = new AbortController();
    let watchdog = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error('video ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0, lastRing = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      clearTimeout(watchdog);
      watchdog = setTimeout(() => ctrl.abort(), 20000);
      chunks.push(value);
      got += value.length;
      const frac = Math.min(1, got / total);
      const now = performance.now();
      if (now - lastRing > 100 || frac === 1) {
        lastRing = now;
        ring.style.setProperty('--ld', Math.round(126 * (1 - frac)));
      }
    }
    clearTimeout(watchdog);
    ring.style.setProperty('--ld', 0);
    video.addEventListener('canplay', () => {
      videoReady = true;
      requestSeek(shown * video.duration);
      stage.classList.add('video-ready');
    }, { once: true });
    video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
  }
  function failVideo() {
    stage.classList.add('video-failed');   // the poster carries the whole journey
  }

  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    root.classList.add('scrub');
    measure();
    poster.style.backgroundImage = `url('${POSTER_URL}')`;
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true });
    bands.forEach(B => { B.op = -1; B.k = -1; B.on = null; });
    lastFk = -1;
    lastCue = -1;
    unpinFinalStates();
    shown = target = heroProgress();
    updateCaptions(shown);
    requestSeek(shown * video.duration);
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    root.classList.remove('scrub');
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; lastTick = 0; }
    poster.style.backgroundImage = '';
    stage.style.removeProperty('--fk');
  }
  function applyHeroMode() {
    if (GATES.some(q => matchMedia(q).matches)) disableScrub();
    else enableScrub();
  }
  MQLS.forEach(m => m.addEventListener ? m.addEventListener('change', applyHeroMode) : m.addListener(applyHeroMode));

  // Band one opens already assembled: a short time-based ramp that hands over to scroll.
  function runLoadRamp() {
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / 1200, 0, 1);
      loadK = 1 - Math.pow(1 - t, 3);
      if (scrubOn) updateCaptions(shown);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // Keyboard users tabbing to the settle buttons get taken to where they are visible.
  settle.el.addEventListener('focusin', () => {
    if (scrubOn && shown < settle.a + 0.06) scrollTo({ top: heroTop + heroRange, behavior: RM.matches ? 'auto' : 'smooth' });
  });

  new IntersectionObserver(([e]) => {
    heroOnScreen = e.isIntersecting;
    hero.classList.toggle('live', heroOnScreen);
    if (heroOnScreen && scrubOn) onScroll();
  }).observe(hero);

  /* -------------------------------------------------------
     Entrances, living loops, hidden-tab pause
     ------------------------------------------------------- */
  const revealIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    revealEl(e.target);
    revealIO.unobserve(e.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  function revealEl(el) {
    if (el.classList.contains('in')) return;
    el.classList.add('in');
    const maxD = $$('.rv', el).reduce((m, k) => Math.max(m, +k.style.getPropertyValue('--d') || 0), 0);
    setTimeout(() => el.classList.add('done'), maxD * 90 + 1000);   // retire stagger delays
  }
  $$('[data-reveal]').forEach(el => {
    $$('.rv', el).forEach((k, i) => k.style.setProperty('--d', i));
    revealIO.observe(el);
  });

  const wordmark = $('.wordmark');
  if (wordmark) {
    const t = wordmark.textContent;
    wordmark.textContent = '';
    [...t].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'wm-l';
      s.style.setProperty('--i', i);
      s.textContent = ch === ' ' ? ' ' : ch;
      wordmark.appendChild(s);
    });
    revealIO.observe(wordmark);
  }

  // Phone quick bar steps aside while the hero buttons are visible.
  const ctaSeen = new Set();
  const ctaIO = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) ctaSeen.add(e.target); else ctaSeen.delete(e.target); });
    document.body.classList.toggle('cta-visible', ctaSeen.size > 0);
  });
  $$('.hero-static .cta-row, .band-4 .cta-row').forEach(el => ctaIO.observe(el));

  const liveIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('live', e.isIntersecting)), { rootMargin: '10% 0px' });
  $$('[data-live]').forEach(el => liveIO.observe(el));
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  /* -------------------------------------------------------
     Menu tabs
     ------------------------------------------------------- */
  const tabs = $$('.tab');
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const mvImgs = $$('.mv-img');
  const mvStickers = $$('.mv-sticker span');
  function selectTab(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
    });
    const cat = tabs[i].dataset.cat;
    mvImgs.forEach(im => im.classList.toggle('is-on', im.dataset.for === cat));
    mvStickers.forEach(s => s.classList.toggle('is-on', s.dataset.for === cat));
    const p = panels[i];
    $$('.m-row', p).forEach((r, k) => r.style.setProperty('--d', k));
    p.classList.remove('enter');
    void p.offsetWidth;
    p.classList.add('enter');
    clearTimeout(p._enterT);
    p._enterT = setTimeout(() => p.classList.remove('enter'), 900);
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(i));
    t.addEventListener('keydown', e => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(n, true); }
    });
  });

  /* -------------------------------------------------------
     Hold to pour (the one interactive moment)
     ------------------------------------------------------- */
  const pour = (() => {
    const tile = $('.t-pour');
    if (!tile) return { pin() {}, unpin() {} };
    const svg = $('.pour-svg', tile);
    const btn = $('.pour-btn', tile);
    const label = $('.pour-label', tile);
    const result = $('#pour-result');
    const MSG = 'You found it: a free extra topping on any waffle. Show this screen at the counter.';
    let p = 0, holding = false, raf = null, last = 0, done = false, pinned = false, lastW = -1;

    function write() {
      if (Math.abs(p - lastW) < 0.002 && p !== 0 && p !== 1) return;
      lastW = p;
      svg.style.setProperty('--p', p.toFixed(3));
      btn.style.setProperty('--pf', p.toFixed(3));
    }
    function step(now) {
      const dt = Math.min(64, now - (last || now));
      last = now;
      if (holding) p = Math.min(1, p + dt / 1700);
      else p = Math.max(0, p - (dt / 1000) * (0.25 + p * 0.9));   // eases back, never snaps
      write();
      if (p >= 1 && !done) complete();
      if (done || (!holding && p <= 0)) { raf = null; last = 0; return; }
      raf = requestAnimationFrame(step);
    }
    function complete() {
      done = true;
      holding = false;
      p = 1;
      lastW = -1;
      write();
      tile.classList.remove('holding');
      tile.classList.add('done');
      label.textContent = 'Poured!';
      result.textContent = MSG;
    }
    function start() {
      if (done) return;
      if (RM.matches) { complete(); return; }
      holding = true;
      tile.classList.add('holding');
      if (!raf) raf = requestAnimationFrame(step);
    }
    function end() {
      if (!holding) return;
      holding = false;
      tile.classList.remove('holding');
      if (!raf && !done) raf = requestAnimationFrame(step);
    }
    btn.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
      start();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, end));
    btn.addEventListener('keydown', e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); }
    });
    btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(); } });
    btn.addEventListener('blur', end);
    btn.addEventListener('contextmenu', e => e.preventDefault());
    // Screen reader activation arrives as a click with no press: give the finished state.
    btn.addEventListener('click', e => { e.preventDefault(); if (e.detail === 0 && !holding) complete(); });

    return {
      pin() { if (done) return; pinned = true; complete(); },
      unpin() {
        if (!pinned) return;
        pinned = false;
        done = false;
        p = 0;
        lastW = -1;
        write();
        tile.classList.remove('done');
        label.textContent = 'Hold to pour';
        result.textContent = '';
      }
    };
  })();

  /* -------------------------------------------------------
     Book a table / join the waitlist (sent through WhatsApp)
     ------------------------------------------------------- */
  const book = (() => {
    const form = $('#book-form');
    if (!form) return { refresh() {} };
    const seg = $('.seg');
    const modeInputs = $$('input[name="mode"]');
    const doneBox = $('.book-done');
    const nameI = $('#f-name'), phoneI = $('#f-phone'), dateI = $('#f-date'), timeI = $('#f-time'), noteI = $('#f-note');
    const guestsOut = $('#f-guests');
    const minus = $('[data-step="-1"]'), plus = $('[data-step="1"]');
    const submit = $('.submit', form);
    const submitLabel = $('[data-submit-label]', form);
    const waitNote = $('.wait-closed', form);
    let mode = 'book', guests = 2;

    const MSG = {
      name: 'Please add your name so we know who to expect.',
      phone: 'Please enter a Pakistani mobile number, like 0300 1234567.',
      date: 'Please pick today or a later date.',
      time: 'Please pick a time.'
    };

    function slotsFor(iso) {
      const day = new Date(iso + 'T00:00:00Z').getUTCDay();
      const [o, c] = CONFIG.hours[day];
      const out = [];
      for (let m = o * 60; m <= c * 60 - 30; m += 30) out.push(m);
      const now = lahore();
      return iso === now.iso ? out.filter(m => m >= now.mins + 30) : out;
    }
    function fillTimes() {
      const iso = dateI.value;
      const prev = timeI.value;
      const slots = iso ? slotsFor(iso) : [];
      timeI.textContent = '';
      timeI.add(new Option(iso && !slots.length ? 'No times left today. Pick another day.' : 'Pick a time', ''));
      slots.forEach(m => timeI.add(new Option(fmtTime(m), String(m))));
      if (prev && slots.includes(+prev)) timeI.value = prev;
    }
    function resetDate() {
      const today = lahore();
      dateI.min = today.iso;
      dateI.max = lahore(CONFIG.bookingDaysAhead).iso;
      dateI.value = slotsFor(today.iso).length ? today.iso : lahore(1).iso;
      fillTimes();
    }
    dateI.addEventListener('change', () => { fillTimes(); if (dateI.hasAttribute('aria-invalid')) validate(dateI); });

    function setGuests(n) {
      guests = clamp(n, 1, CONFIG.maxGuests);
      guestsOut.textContent = guests;
      minus.setAttribute('aria-disabled', String(guests <= 1));
      plus.setAttribute('aria-disabled', String(guests >= CONFIG.maxGuests));
    }
    minus.addEventListener('click', () => setGuests(guests - 1));
    plus.addEventListener('click', () => setGuests(guests + 1));

    function normPhone(v) {
      let d = v.replace(/[^\d+]/g, '');
      if (d.startsWith('+')) d = d.slice(1);
      if (d.startsWith('0092')) d = d.slice(2);
      if (/^03\d{9}$/.test(d)) return '92' + d.slice(1);
      if (/^923\d{9}$/.test(d)) return d;
      if (/^3\d{9}$/.test(d)) return '92' + d;
      return null;
    }
    function check(input) {
      if (input === nameI) return nameI.value.trim().length >= 2;
      if (input === phoneI) return !!normPhone(phoneI.value);
      if (input === dateI) return !!dateI.value && dateI.value >= dateI.min && dateI.value <= dateI.max;
      if (input === timeI) return !!timeI.value;
      return true;
    }
    const errFor = input => document.getElementById('e-' + input.id.slice(2));
    function validate(input) {
      const ok = check(input);
      const err = errFor(input);
      if (ok) {
        input.removeAttribute('aria-invalid');
        err.hidden = true;
        err.textContent = '';
      } else {
        input.setAttribute('aria-invalid', 'true');
        err.textContent = MSG[input.name];
        err.hidden = false;
      }
      return ok;
    }
    function clearErrors() {
      [nameI, phoneI, dateI, timeI].forEach(i => {
        i.removeAttribute('aria-invalid');
        const e = errFor(i);
        e.hidden = true;
        e.textContent = '';
      });
    }
    [nameI, phoneI, dateI, timeI].forEach(i => {
      i.addEventListener('blur', () => { if (i.value) validate(i); });
      i.addEventListener('input', () => { if (i.hasAttribute('aria-invalid')) validate(i); });
    });

    function refresh() {
      const closed = getStatus().state === 'closed';
      const show = mode === 'wait' && closed;
      waitNote.hidden = !show;
      if (show) {
        const { day, mins } = lahore();
        const back = mins < CONFIG.hours[day][0] * 60 ? CONFIG.hours[day][0] : CONFIG.hours[(day + 1) % 7][0];
        waitNote.textContent = `The waitlist opens when we do. We are back at ${fmtHour(back)}.`;
      }
      submit.setAttribute('aria-disabled', String(show));
    }
    function setMode(m) {
      mode = m;
      seg.classList.toggle('is-wait', m === 'wait');
      form.classList.toggle('mode-wait', m === 'wait');
      $$('.only-book', form).forEach(el => $$('input, select, textarea', el).forEach(i => { i.disabled = m === 'wait'; }));
      submitLabel.textContent = m === 'wait' ? 'Join the waitlist on WhatsApp' : 'Send booking on WhatsApp';
      clearErrors();
      refresh();
    }
    modeInputs.forEach(i => i.addEventListener('change', () => setMode(i.value)));

    form.addEventListener('submit', e => {
      e.preventDefault();
      if (submit.getAttribute('aria-disabled') === 'true') return;
      const fields = mode === 'wait' ? [nameI, phoneI] : [nameI, phoneI, dateI, timeI];
      const bad = fields.filter(i => !validate(i));
      if (bad.length) { bad[0].focus(); return; }
      const seat = (form.querySelector('input[name="seat"]:checked') || {}).value || 'No preference';
      const lines = mode === 'wait'
        ? ["Hi Waffle Whisk! Please add me to today's waitlist.", `Name: ${nameI.value.trim()}`, `Guests: ${guests}`, `WhatsApp: ${phoneI.value.trim()}`]
        : ['Hi Waffle Whisk! I would like to book a table.', `Name: ${nameI.value.trim()}`, `Date: ${fmtDate(dateI.value)}`, `Time: ${fmtTime(+timeI.value)}`, `Guests: ${guests}`, `Seating: ${seat}`, noteI.value.trim() ? `Note: ${noteI.value.trim()}` : '', `WhatsApp: ${phoneI.value.trim()}`].filter(Boolean);
      window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
      const title = $('.done-title', doneBox), body = $('.done-body', doneBox);
      if (mode === 'wait') {
        title.textContent = 'You are on the list!';
        body.textContent = 'Press send in WhatsApp and we will message you when your table is ready.';
      } else {
        title.textContent = 'Almost done!';
        body.textContent = 'WhatsApp is opening with your booking. Press send and we will confirm within a few minutes.';
      }
      form.hidden = true;
      seg.hidden = true;
      doneBox.hidden = false;
      title.focus();
    });

    $('[data-book-again]').addEventListener('click', () => {
      form.reset();
      modeInputs[0].checked = true;
      setGuests(2);
      resetDate();
      setMode('book');
      form.hidden = false;
      seg.hidden = false;
      doneBox.hidden = true;
      nameI.focus();
    });

    setGuests(2);
    resetDate();
    setMode('book');
    return { refresh };
  })();

  /* -------------------------------------------------------
     Status, today's hours, today's deals (every 30 seconds)
     ------------------------------------------------------- */
  let lastStatusKey = '';
  function updateStatus() {
    const s = getStatus();
    const { day } = lahore();
    const key = s.state + s.text + day;
    if (key === lastStatusKey) return;
    lastStatusKey = key;
    $$('[data-status]').forEach(el => {
      el.dataset.state = s.state;
      const t = $('[data-status-text]', el);
      if (t) t.textContent = s.text;
    });
    const [o, c] = CONFIG.hours[day];
    $$('[data-today-hours]').forEach(el => { el.textContent = `Today ${fmtHour(o)} to ${fmtHour(c)}`; });
    $$('[data-days]').forEach(el => {
      const on = el.dataset.days.split(',').map(Number).includes(day);
      if (el.matches('.hours li')) el.classList.toggle('is-today', on);
      const badge = $('.today', el);
      if (badge) badge.hidden = !on;
    });
    book.refresh();
  }

  /* -------------------------------------------------------
     Signature: the syrup line drips down the page to the booking button
     ------------------------------------------------------- */
  const syrup = (() => {
    const svg = $('.syrup-line');
    const path = $('.sl-path');
    const dropsG = $('.sl-drops');
    const main = $('#main');
    const WIDE = matchMedia('(min-width: 1100px)');
    let on = false, len = 0, lut = [], drops = [], lastL = -1, pinned = false, mainTop = 0, sRaf = null;

    function build() {
      on = !!svg && WIDE.matches;
      if (!on) return;
      const mr = main.getBoundingClientRect();
      mainTop = mr.top + scrollY;
      const W = main.clientWidth, H = main.scrollHeight;
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const wrap = $('.promise .wrap');
      const wr = wrap.getBoundingClientRect();
      const gx = Math.max(20, wr.left - mr.left + parseFloat(getComputedStyle(wrap).paddingLeft) - 34);
      const y0 = hero.getBoundingClientRect().bottom - mr.top + 30;
      const pts = $$('[data-syrup]').map(k => {
        const r = k.getBoundingClientRect();
        return r.top - mr.top + r.height / 2;
      }).filter(y => y > y0 + 20);
      const btn = $('#book .submit');
      const br = btn.getBoundingClientRect();
      if (!br.width) return;   // form hidden (after a booking): keep the last line
      const bx = br.left - mr.left - 18, by = br.top - mr.top + br.height / 2;
      let d = `M${gx},${y0}`;
      let py = y0;
      pts.forEach(y => {
        const dy = y - py;
        d += ` C${gx + 14},${(py + dy * 0.35).toFixed(1)} ${gx - 14},${(py + dy * 0.65).toFixed(1)} ${gx},${y.toFixed(1)}`;
        py = y;
      });
      const turnY = Math.max(py + 60, by - 170);
      d += ` L${gx},${turnY.toFixed(1)} C${gx},${(by - 20).toFixed(1)} ${(bx - 110).toFixed(1)},${by.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
      path.setAttribute('d', d);
      len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      lut = [];
      for (let l = 0; l < len; l += 16) lut.push([l, path.getPointAtLength(l).y]);
      lut.push([len, path.getPointAtLength(len).y]);
      dropsG.textContent = '';
      drops = pts.map(y => ({ x: gx, y, r: 8 })).concat([{ x: bx, y: by, r: 10 }]).map(pt => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', pt.x);
        c.setAttribute('cy', pt.y);
        c.setAttribute('r', pt.r);
        c.setAttribute('class', 'sl-drop');
        dropsG.appendChild(c);
        return { el: c, y: pt.y, hit: false };
      });
      lastL = -1;
      update();
    }
    function update() {
      if (!on || !lut.length) return;
      const tipY = pinned ? Infinity : scrollY + innerHeight * 0.62 - mainTop;
      let L;
      if (tipY >= lut[lut.length - 1][1]) L = len;
      else if (tipY <= lut[0][1]) L = 0;
      else {
        let lo = 0, hi = lut.length - 1;
        while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lut[mid][1] < tipY) lo = mid; else hi = mid; }
        const [l0, ya] = lut[lo], [l1, yb] = lut[hi];
        L = l0 + (l1 - l0) * ((tipY - ya) / Math.max(0.001, yb - ya));
      }
      if (Math.abs(L - lastL) > 1.5 || (L === len && lastL !== len) || (L === 0 && lastL !== 0)) {
        path.style.strokeDashoffset = (len - L).toFixed(1);
        lastL = L;
      }
      drops.forEach(dp => {
        const hit = tipY >= dp.y;
        if (hit !== dp.hit) { dp.el.classList.toggle('hit', hit); dp.hit = hit; }
      });
    }
    addEventListener('scroll', () => {
      if (!on || sRaf) return;
      sRaf = requestAnimationFrame(() => { sRaf = null; update(); });
    }, { passive: true });
    WIDE.addEventListener('change', build);
    if ('ResizeObserver' in window) {
      let rb = null;
      new ResizeObserver(() => { if (rb) return; rb = requestAnimationFrame(() => { rb = null; if (scrubOn) measure(); build(); }); }).observe(main);
    }
    return {
      build,
      pin() { pinned = true; lastL = -1; update(); },
      unpin() { pinned = false; lastL = -1; update(); }
    };
  })();

  /* -------------------------------------------------------
     Reduced motion, honoured live in both directions
     ------------------------------------------------------- */
  let pinnedAll = false;
  function pinToFinalStates() {
    pinnedAll = true;
    $$('[data-reveal], .wordmark').forEach(el => el.classList.add('in', 'done'));
    syrup.pin();
    pour.pin();
  }
  function unpinFinalStates() {
    if (!pinnedAll) return;
    pinnedAll = false;
    syrup.unpin();
    pour.unpin();
  }
  RM.addEventListener('change', e => {
    if (e.matches) pinToFinalStates();
    else { unpinFinalStates(); applyHeroMode(); }
  });

  /* -------------------------------------------------------
     Start
     ------------------------------------------------------- */
  updateStatus();
  setInterval(updateStatus, 30000);
  if (RM.matches) pinToFinalStates();
  applyHeroMode();
  if (scrubOn) runLoadRamp(); else loadK = 1;
  syrup.build();

  let rz = null;
  addEventListener('resize', () => {
    if (rz) return;
    rz = requestAnimationFrame(() => {
      rz = null;
      if (scrubOn) { measure(); onScroll(); }
      syrup.build();
    });
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (scrubOn) measure(); syrup.build(); });
  addEventListener('load', () => { if (scrubOn) { measure(); onScroll(); } syrup.build(); });
})();
