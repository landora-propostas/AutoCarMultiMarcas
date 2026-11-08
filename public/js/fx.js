// Efeitos premium: cursor, inclinação 3D dos cards, botões magnéticos, faixa que acelera e velocímetro de rolagem.
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Inclinação 3D com brilho que segue o mouse ---------- */
  if (fino && !reduce) {
    $$('.car-card, .adv, .about-values li').forEach(function (el) {
      el.classList.add('tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--rx', ((0.5 - y) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * 9).toFixed(2) + 'deg');
        el.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Botões magnéticos ---------- */
  if (fino && !reduce) {
    $$('.magnetic, .site-header .btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Rolagem: faixa acelera, nome do hero sobe, velocímetro ---------- */
  var faixa = $('.marquee-track'), anim = faixa && faixa.getAnimations ? faixa.getAnimations()[0] : null;
  var fab = document.createElement('div');
  fab.className = 'speed-fab'; fab.setAttribute('aria-hidden', 'true');
  fab.innerHTML = '<svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="25" class="trk"/><circle cx="30" cy="30" r="25" class="val"/></svg><b>0</b><small>km/h</small>';
  document.body.appendChild(fab);
  var val = $('.val', fab), num = $('b', fab), CIRC = 2 * Math.PI * 25;
  val.style.strokeDasharray = CIRC;
  var ultimo = scrollY, vel = 0, topoAlvo = 0, tAnt = performance.now(), ocioso = 0;
  var rodando = false;
  function tick(t) {
    var dt = Math.max(t - tAnt, 1); tAnt = t;
    var d = Math.abs(scrollY - ultimo); ultimo = scrollY;
    var inst = Math.min(d / dt * 120, 240);                 // px/ms → "km/h"
    vel += (inst - vel) * 0.12;
    var v = Math.round(vel);
    if (anim && !reduce) anim.playbackRate = 1 + Math.min(vel / 25, 7);
    if (v !== ultimoV) { num.textContent = v; val.style.strokeDashoffset = CIRC * (1 - Math.min(v / 200, 1) * 0.75); ultimoV = v; }
    if (scrollY < innerHeight * 1.2) document.documentElement.style.setProperty('--sy', Math.min(scrollY / innerHeight, 1).toFixed(3));
    var on = v > 3 || scrollY > 600;
    if (on !== ligado) { fab.classList.toggle('on', on); ligado = on; }
    if (d > 0 || v > 0) requestAnimationFrame(tick); else { rodando = false; if (anim) anim.playbackRate = 1; }
  }
  var ultimoV = -1, ligado = null;
  function acorda() { if (!rodando) { rodando = true; tAnt = performance.now(); requestAnimationFrame(tick); } }
  addEventListener('scroll', acorda, { passive: true });
  if (!reduce) acorda(); else fab.style.display = 'none';
})();

// Impede o zoom por pinça no iOS (o Safari ignora user-scalable=no) e o zoom por toque duplo.
(function () {
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
    document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false });
  });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var ultimo = 0;
  document.addEventListener('touchend', function (e) {
    var agora = Date.now();
    if (agora - ultimo < 350 && !e.target.closest('input, textarea, select')) e.preventDefault();
    ultimo = agora;
  }, { passive: false });
})();

// Pausa as animações do hero quando ele sai da tela.
(function () {
  var h = document.querySelector('.hero');
  if (!h || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(function (e) { h.classList.toggle('fora', !e[0].isIntersecting); }).observe(h);
})();
