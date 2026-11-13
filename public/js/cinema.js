// Movimento da experiência AutoCar: categorias do hero, câmera ligada ao scroll,
// busca do hero conectada aos filtros reais do estoque, parallax e contadores.
// Tudo em JavaScript puro, com requestAnimationFrame e suavização (lerp).
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var desktop = matchMedia('(min-width: 901px)');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CARROS = window.CARROS || [];
  var brl = function (n) { return 'R$ ' + Number(n).toLocaleString('pt-BR'); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Hero: troca de carro por categoria ---------- */
  var hero = $('.hero');
  var tabs = $$('.hero-tabs [role="tab"]');
  var pillTab = $('.tab-pill');
  var figs = $$('.hc');
  var statQtd = $('[data-hs="qtd"]'), statPreco = $('[data-hs="preco"]');
  var atual = 'cupe', timer = null, tocou = false;

  function moverPill(btn) {
    if (!pillTab || !btn) return;
    pillTab.style.width = btn.offsetWidth + 'px';
    pillTab.style.transform = 'translateX(' + btn.offsetLeft + 'px)';
  }
  function stats(cls) {
    var lista = CARROS.filter(function (c) { return c.categoria === cls; });
    var qtd = lista.length;
    var menor = lista.reduce(function (m, c) { return Math.min(m, c.preco || Infinity); }, Infinity);
    [statQtd, statPreco].forEach(function (el) { if (el) el.classList.add('troca'); });
    setTimeout(function () {
      if (statQtd) statQtd.textContent = qtd ? String(qtd).padStart(2, '0') : '—';
      if (statPreco) statPreco.textContent = isFinite(menor) ? brl(menor) : 'Sob consulta';
      [statQtd, statPreco].forEach(function (el) { if (el) el.classList.remove('troca'); });
    }, reduce ? 0 : 220);
  }
  function escolher(cls, manual) {
    if (manual) tocou = true;
    if (cls === atual && !manual) return;
    var sai = figs.filter(function (f) { return f.classList.contains('is-on'); })[0];
    var entra = figs.filter(function (f) { return f.dataset.cls === cls; })[0];
    if (!entra) return;
    if (sai && sai !== entra) {
      sai.style.animation = 'none';
      sai.classList.remove('is-on'); sai.classList.add('is-out');
      setTimeout(function () { sai.classList.remove('is-out'); }, 900);
    }
    entra.style.animation = 'none';
    var img = $('img', entra); if (img && img.loading === 'lazy') img.loading = 'eager';
    requestAnimationFrame(function () { entra.classList.add('is-on'); });
    atual = cls;
    tabs.forEach(function (t) { var on = t.dataset.cls === cls; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on) moverPill(t); });
    stats(cls);
    if (manual) sincronizarSeg(cls);
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { escolher(t.dataset.cls, true); });
    t.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var j = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[j].focus(); escolher(tabs[j].dataset.cls, true);
    });
  });
  // pré-carrega as outras fotos depois da entrada
  setTimeout(function () { figs.forEach(function (f) { var im = $('img', f); if (im) im.loading = 'eager'; }); }, 2500);
  // troca automática suave enquanto ninguém interagiu e o hero está visível
  function auto() {
    clearInterval(timer);
    if (reduce) return;
    timer = setInterval(function () {
      if (tocou || window.scrollY > innerHeight * .5 || document.hidden) return;
      var ordem = tabs.map(function (t) { return t.dataset.cls; });
      escolher(ordem[(ordem.indexOf(atual) + 1) % ordem.length]);
    }, 6500);
  }
  if (tabs.length) {
    requestAnimationFrame(function () { moverPill(tabs[0]); });
    window.addEventListener('resize', function () { moverPill(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { moverPill(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); });
    stats(atual); auto();
  }

  /* ---------- Busca do hero → filtros reais do estoque ---------- */
  var form = $('#hero-busca');
  var segs = $$('.seg [data-hcat]');
  var hcat = 'todos';
  function sincronizarSeg(cls) {
    hcat = cls;
    segs.forEach(function (b) { var on = b.dataset.hcat === cls; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
  }
  segs.forEach(function (b) { b.addEventListener('click', function () { sincronizarSeg(b.dataset.hcat); }); });
  var ordemEstoque = $('#ordem'), ordemHero = $('#hero-ordem');
  if (ordemEstoque && ordemHero) {
    ordemHero.innerHTML = ordemEstoque.innerHTML;
    ordemHero.value = ordemEstoque.value;
    ordemEstoque.addEventListener('change', function () { ordemHero.value = ordemEstoque.value; });
  }
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var pill = $('#pills [data-filter="' + hcat + '"]');
    if (pill && !pill.classList.contains('is-on')) pill.click();
    var busca = $('#busca');
    if (busca) { busca.value = form.elements.q.value.trim(); busca.dispatchEvent(new Event('input', { bubbles: true })); }
    if (ordemEstoque && ordemHero && ordemEstoque.value !== ordemHero.value) {
      ordemEstoque.value = ordemHero.value; ordemEstoque.dispatchEvent(new Event('change', { bubbles: true }));
    }
    var alvo = $('#carros');
    if (alvo) alvo.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Revelação da foto do mosaico ---------- */
  var imgs = $$('.reveal-img');
  if ('IntersectionObserver' in window) {
    var ioImg = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); ioImg.unobserve(x.target); } });
    }, { threshold: .2 });
    imgs.forEach(function (i) { ioImg.observe(i); });
  } else imgs.forEach(function (i) { i.classList.add('in'); });

  /* ---------- Contador do estoque quando aparece ---------- */
  var cont = $('.mo-count b');
  if (cont && 'IntersectionObserver' in window) {
    var fim = CARROS.length;
    var ioC = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      ioC.disconnect();
      if (reduce) { cont.textContent = String(fim).padStart(2, '0'); return; }
      var t0 = performance.now();
      (function tick(t) {
        var k = Math.min((t - t0) / 1300, 1), v = Math.round(fim * (1 - Math.pow(1 - k, 3)));
        cont.textContent = String(v).padStart(2, '0');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    }, { threshold: .5 });
    ioC.observe(cont);
  }

  /* ---------- Motor de scroll: câmera do hero, passos, parallax ---------- */
  var steps = $('.steps'), stepItems = $$('.steps li'), track = $('.track'), secPassos = $('#como-funciona');
  var mo = $('.mo-photo'), scene = $('.scene'), mark = $('.foot-mark');
  if (steps && stepItems.length) steps.classList.add('ligado');

  var alvo = { hp: 0, tp: 0 }, suave = { hp: 0, tp: 0 }, rodando = false;
  function progresso(el, ini, fim) {
    var r = el.getBoundingClientRect(), vh = innerHeight;
    return clamp((vh * ini - r.top) / (r.height + vh * (ini - fim)), 0, 1);
  }
  function medir() {
    if (hero && desktop.matches && !reduce) {
      var r = hero.getBoundingClientRect();
      alvo.hp = clamp(-r.top / Math.max(r.height - innerHeight, 1), 0, 1);
    } else alvo.hp = 0;
    if (secPassos) alvo.tp = progresso(secPassos, .85, .35);
  }
  function aplicar() {
    if (hero) hero.style.setProperty('--hp', suave.hp.toFixed(4));
    if (track) track.style.setProperty('--tp', suave.tp.toFixed(4));
    stepItems.forEach(function (li, i) { li.classList.toggle('on', suave.tp >= (i + .35) / stepItems.length || (i === 0 && suave.tp > .02)); });
    if (reduce) return;
    if (mo) { var pm = mo.getBoundingClientRect(); if (pm.bottom > 0 && pm.top < innerHeight) mo.style.setProperty('--py', ((pm.top + pm.height / 2 - innerHeight / 2) * -.08).toFixed(1) + 'px'); }
    if (scene) {
      var rs = scene.getBoundingClientRect();
      if (rs.bottom > 0 && rs.top < innerHeight) {
        var k = clamp(1 - (rs.top + rs.height * .5) / (innerHeight + rs.height * .5), 0, 1);
        scene.style.setProperty('--ss', (1.18 - k * .18).toFixed(4));
        scene.style.setProperty('--sy', ((k - .5) * -60).toFixed(1) + 'px');
      }
    }
    if (mark) { var rm = mark.getBoundingClientRect(); if (rm.top < innerHeight) mark.style.setProperty('--fy', ((rm.top - innerHeight) * .12).toFixed(1) + 'px'); }
  }
  function quadro() {
    medir();
    var mexe = false;
    ['hp', 'tp'].forEach(function (k) {
      var d = alvo[k] - suave[k];
      if (Math.abs(d) > .0005) { suave[k] += d * (reduce ? 1 : .14); mexe = true; } else suave[k] = alvo[k];
    });
    aplicar();
    if (mexe) requestAnimationFrame(quadro); else rodando = false;
  }
  function pedir() { if (!rodando) { rodando = true; requestAnimationFrame(quadro); } }
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  if (desktop.addEventListener) desktop.addEventListener('change', pedir);
  pedir();

  /* ---------- Botões magnéticos sutis ---------- */
  if (fino && !reduce) {
    $$('.magnetic, .header-cta, .hs-fields .btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .16).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * .22).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }
})();
