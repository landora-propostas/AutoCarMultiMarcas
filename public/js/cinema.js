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
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ---------- Hero: carro troca conforme a categoria de "Buscar no estoque" ----------
     Sai acelerando para a esquerda (frente sobe) e o novo entra pela direita em velocidade,
     freia (frente mergulha), passa um pouco do ponto e assenta — como na referência. */
  var hero = $('.hero');
  var palco = $('.hero-cars');
  var figs = $$('.hc');
  var atual = 'todos', animando = [];
  var FILTRO = 'brightness(.94) contrast(1.05) drop-shadow(0 26px 26px rgba(0,0,0,.55))';
  var podeAnimar = !reduce && !!Element.prototype.animate;

  function fig(cls) { return figs.filter(function (f) { return f.dataset.cls === cls; })[0] || figs[0]; }
  function pararTudo() { animando.forEach(function (a) { try { a.cancel(); } catch (e) {} }); animando = []; }

  function entrar(f, atraso) {
    var img = $('img', f);
    if (img.loading === 'lazy') img.loading = 'eager';
    f.classList.add('is-on');
    if (!podeAnimar) return null;
    var an = img.animate([
      { offset: 0,    transform: 'translate3d(115%,0,0) rotate(0deg)',    filter: FILTRO + ' blur(9px)', opacity: 0, easing: 'cubic-bezier(.12,.62,.32,1)' },
      { offset: .07,  opacity: 1 },
      { offset: .56,  transform: 'translate3d(-2.8%,0,0) rotate(-1.15deg)', filter: FILTRO + ' blur(0px)', easing: 'cubic-bezier(.4,0,.3,1)' },
      { offset: .76,  transform: 'translate3d(.7%,0,0) rotate(.35deg)', easing: 'cubic-bezier(.4,0,.4,1)' },
      { offset: .9,   transform: 'translate3d(-.2%,0,0) rotate(-.1deg)' },
      { offset: 1,    transform: 'translate3d(0,0,0) rotate(0deg)',       filter: FILTRO, opacity: 1 }
    ], { duration: 1550, delay: atraso || 0, fill: 'backwards' });
    animando.push(an);
    return an;
  }
  function sair(f) {
    if (!podeAnimar) { f.classList.remove('is-on'); return null; }
    var img = $('img', f);
    var an = img.animate([
      { transform: 'translate3d(0,0,0) rotate(0deg)', filter: FILTRO + ' blur(0px)', opacity: 1, easing: 'cubic-bezier(.5,0,.9,.35)' },
      { offset: .3, transform: 'translate3d(1.2%,0,0) rotate(.7deg)' },
      { transform: 'translate3d(-125%,0,0) rotate(.35deg)', filter: FILTRO + ' blur(10px)', opacity: 0 }
    ], { duration: 780, fill: 'forwards' });
    animando.push(an);
    an.onfinish = function () { f.classList.remove('is-on'); an.cancel(); };
    return an;
  }
  function trocarCarro(cls) {
    if (cls === atual) return;
    var sai = fig(atual), entra = fig(cls);
    atual = cls;
    pararTudo();
    figs.forEach(function (f) { if (f !== sai && f !== entra) f.classList.remove('is-on'); });
    if (palco) palco.classList.add('correndo');
    if (sai !== entra) sair(sai);
    var an = entrar(entra, sai !== entra ? 260 : 0);
    var fim = function () { if (palco) palco.classList.remove('correndo'); };
    if (an) an.onfinish = function () { fim(); an.cancel(); }; else fim();
  }
  // entrada inicial, logo depois da tela de carregamento
  if (figs.length) {
    var primeiro = fig('todos');
    figs.forEach(function (f) { f.classList.toggle('is-on', f === primeiro); });
    var an0 = entrar(primeiro, 1050);
    if (an0) an0.onfinish = function () { an0.cancel(); };
    setTimeout(function () { figs.forEach(function (f) { var im = $('img', f); if (im) im.loading = 'eager'; }); }, 2600);
  }

  /* ---------- Busca do hero → filtros reais do estoque ---------- */
  var form = $('#hero-busca');
  var segs = $$('.seg [data-hcat]');
  var hcat = 'todos';
  function sincronizarSeg(cls) {
    hcat = cls;
    segs.forEach(function (b) { var on = b.dataset.hcat === cls; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
    trocarCarro(cls);
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
