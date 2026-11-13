// Movimento da experiência AutoCar: categorias do hero, câmera ligada ao scroll,
// busca do hero conectada aos filtros reais do estoque, parallax e contadores.
// Tudo em JavaScript puro, com requestAnimationFrame e suavização (lerp).
(function () {
  'use strict';
  // Sem zoom: o iPhone ignora user-scalable=no, então bloqueamos o gesto de pinça e o toque duplo aqui.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
  document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
  var ultimoToque = 0;
  document.addEventListener('touchend', function (e) {
    var agora = Date.now();
    if (agora - ultimoToque < 320 && !e.target.closest('input, textarea, select')) e.preventDefault();
    ultimoToque = agora;
  }, { passive: false });
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

  // Só transform e opacity (sem filtros animados): fica nítido no celular e roda liso a 60 fps.
  function entrar(f, atraso) {
    var img = $('img', f);
    if (img.loading === 'lazy') img.loading = 'eager';
    f.classList.add('is-on');
    if (!podeAnimar) return null;
    var an = img.animate([
      { offset: 0,   transform: 'translate3d(110%,0,0) rotate(0deg)', opacity: 0, easing: 'cubic-bezier(.16,.7,.3,1)' },
      { offset: .1,  opacity: 1 },
      { offset: .58, transform: 'translate3d(-2.4%,0,0) rotate(-1deg)', easing: 'cubic-bezier(.4,0,.3,1)' },
      { offset: .8,  transform: 'translate3d(.5%,0,0) rotate(.28deg)', easing: 'cubic-bezier(.4,0,.4,1)' },
      { offset: 1,   transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1 }
    ], { duration: 1150, delay: atraso || 0, fill: 'backwards' });
    animando.push(an);
    return an;
  }
  function sair(f) {
    if (!podeAnimar) { f.classList.remove('is-on'); return null; }
    var img = $('img', f);
    var an = img.animate([
      { transform: 'translate3d(0,0,0) rotate(0deg)', opacity: 1, easing: 'cubic-bezier(.55,0,.85,.3)' },
      { offset: .25, transform: 'translate3d(.8%,0,0) rotate(.6deg)' },
      { offset: .8, opacity: 1 },
      { transform: 'translate3d(-130%,0,0) rotate(.3deg)', opacity: 0 }
    ], { duration: 520, fill: 'forwards' });
    animando.push(an);
    an.onfinish = function () { f.classList.remove('is-on'); an.cancel(); };
    return an;
  }
  function pronta(img) {
    var ok = img.complete && img.naturalWidth ? Promise.resolve() : new Promise(function (r) { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); });
    return ok.then(function () { return img.decode ? img.decode().catch(function () {}) : null; });
  }
  function trocarCarro(cls) {
    if (cls === atual) return;
    var sai = fig(atual), entra = fig(cls);
    atual = cls;
    pararTudo();
    figs.forEach(function (f) { if (f !== sai && f !== entra) f.classList.remove('is-on'); });
    if (palco) palco.classList.add('correndo');
    if (sai !== entra) sair(sai);
    var imgNova = $('img', entra); if (imgNova.loading === 'lazy') imgNova.loading = 'eager';
    var t0 = performance.now(), an = null, minha = cls;
    Promise.race([pronta(imgNova), new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
      if (atual !== minha) return;
      an = entrar(entra, Math.max(0, (sai !== entra ? 400 : 0) - (performance.now() - t0)));
      var fim2 = function () { if (palco) palco.classList.remove('correndo'); };
      if (an) an.onfinish = function () { fim2(); an.cancel(); }; else fim2();
    });
  }
  // Entrada inicial: espera a imagem estar pronta (decodificada) e a tela de carregamento sair;
  // assim o carro nunca "pula" na tela atrasado em aparelhos/conexões mais lentos.
  if (figs.length) {
    var primeiro = fig('todos');
    figs.forEach(function (f) { f.classList.remove('is-on'); });
    var limite = new Promise(function (r) { setTimeout(r, 4000); });
    Promise.race([pronta($('img', primeiro)), limite]).then(function () {
      if (atual !== 'todos') return;
      var an0 = entrar(primeiro, Math.max(0, 1300 - performance.now()));
      if (an0) an0.onfinish = function () { an0.cancel(); };
      // depois, as outras categorias são baixadas e decodificadas em segundo plano
      setTimeout(function () { figs.forEach(function (f) { var im = $('img', f); if (im) { im.loading = 'eager'; pronta(im); } }); }, 1400);
    });
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
  var mo = $('.mo-photo'), scene = $('.scene');
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
    if (secPassos) {
      // começa quando a seção entra pela base e termina quando o centro dela chega ao meio da tela
      var rp = secPassos.getBoundingClientRect(), vh = innerHeight;
      alvo.tp = clamp((vh - rp.top) / (vh / 2 + rp.height / 2), 0, 1);
    }
  }
  function aplicar() {
    if (hero) hero.style.setProperty('--hp', suave.hp.toFixed(4));
    if (track) track.style.setProperty('--tp', suave.tp.toFixed(4));
    stepItems.forEach(function (li, i) { li.classList.toggle('on', suave.tp >= (i + .5) / stepItems.length * .96 || (i === 0 && suave.tp > .05)); });
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
  }
  function quadro() {
    medir();
    var mexe = false;
    ['hp', 'tp'].forEach(function (k) {
      var d = alvo[k] - suave[k];
      if (Math.abs(d) > .0004) { suave[k] += d * (reduce ? 1 : .2); mexe = true; } else suave[k] = alvo[k];
    });
    aplicar();
    if (mexe) requestAnimationFrame(quadro); else rodando = false;
  }
  function pedir() { if (!rodando) { rodando = true; requestAnimationFrame(quadro); } }
  // Calibra o zoom: no fim do scroll do hero, o carro ocupa a largura da barra de busca.
  var dock = $('.hero-search');
  function calibrar() {
    if (!palco || !dock || !desktop.matches || reduce) return;
    var ant = palco.style.transform; palco.style.transform = 'none';
    var s0 = parseFloat(getComputedStyle(palco).getPropertyValue('--s0')) || 1;
    var c = palco.getBoundingClientRect(), d = dock.getBoundingClientRect();
    var im = $('.hc.is-on img', palco) || $('.hc img', palco);
    var sobra = im ? Math.max(0, im.getBoundingClientRect().bottom - c.bottom) : 0;
    palco.style.transform = ant;
    var w0 = c.width * s0, h0 = c.height * s0;
    var k = Math.max(1, d.width / w0) - 1;
    var hf = h0 * (1 + k);
    var cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    palco.style.setProperty('--zk', k.toFixed(4));
    palco.style.setProperty('--zx', (d.left + d.width / 2 - cx).toFixed(1) + 'px');
    palco.style.setProperty('--zy', (d.top - 14 - hf / 2 - sobra * s0 * (1 + k) - cy).toFixed(1) + 'px');
  }
  calibrar();
  window.addEventListener('resize', calibrar);
  window.addEventListener('load', calibrar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(calibrar);
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
