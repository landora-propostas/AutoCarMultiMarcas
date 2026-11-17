(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CARROS = window.CARROS || [];

  function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }
  function kmTxt(n) { return n.toLocaleString('pt-BR') + ' km'; }
  function kmZero(c) { return c.condicao === 'Novo' ? '0 km' : 'Km a consultar'; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function urlSegura(u) { u = String(u || ''); return /^(data:image\/(png|jpe?g|webp|gif|avif|svg\+xml)[;,]|https:\/\/|\/|img\/)/i.test(u) ? esc(u) : ''; }
  function posSegura(p) { p = String(p || ''); return /^[\d.]+% [\d.]+%$/.test(p) ? p : '50% 50%'; }
  function icon(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function norm(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  var toggle = $('.menu-toggle');
  var menu = $('#menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menu');
      }
    });
  }

  var header = $('.site-header');
  var ticking = false;
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  var pill = $('.nav-pill');
  var links = $$('.main-nav a');
  var activeLink = null;
  function movePill(a) {
    if (!pill || !a) { if (pill) pill.style.opacity = 0; return; }
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    pill.style.opacity = 1;
  }
  function setActive(a) {
    activeLink = a;
    links.forEach(function (l) { l.classList.toggle('is-active', l === a); });
    movePill(a);
  }
  links.forEach(function (a) {
    a.addEventListener('mouseenter', function () { movePill(a); });
    a.addEventListener('focus', function () { movePill(a); });
  });
  if (menu) {
    menu.addEventListener('mouseleave', function () { movePill(activeLink); });
    menu.addEventListener('focusout', function () { movePill(activeLink); });
  }
  window.addEventListener('resize', function () { movePill(activeLink); });

  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var a = links.filter(function (l) { return l.getAttribute('href') === '#' + en.target.id; })[0];
      if (a) setActive(a);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['como-funciona', 'vantagens', 'carros', 'sobre', 'contato'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) spy.observe(el);
  });
  var hero = $('.hero');
  if (hero) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) setActive(null);
    }, { threshold: 0.5 }).observe(hero);
  }

  var list = $('#lista-carros');
  list.innerHTML = CARROS.map(function (c, i) {
    var ano = c.ano.split('/')[1] || c.ano;
    return '' +
      '<article class="car-card" data-cat="' + esc(c.categoria) + '" data-name="' + esc(c.nome.toLowerCase()) + '" data-slug="' + esc(c.slug) + '">' +
        '<header class="cc-top">' +
          '<span class="cc-mark" aria-hidden="true">' + esc((c.marca || c.nome).charAt(0)) + '</span>' +
          '<div class="cc-title"><h3 title="' + esc(c.nome) + '"><a class="stretch" href="#carro/' + encodeURIComponent(c.slug) + '">' + esc(c.nome) + '</a></h3>' +
          '<p>' + esc(c.condicao) + ' · ' + esc(ano) + '</p></div>' +
          '<span class="cc-go" aria-hidden="true">' + icon('up-right') + '</span>' +
        '</header>' +
        '<div class="cc-photo">' +
          (c.condicao === 'Novo' ? '<span class="tag-new">Novo</span>' : '') +
          '<img class="car-img" src="' + urlSegura(c.foto.src) + '" alt="' + esc(c.foto.alt) + '" loading="lazy" decoding="async" style="object-position:' + posSegura(c.foto.pos) + '">' +
        '</div>' +
        '<ul class="specs">' +
          '<li>' + icon('road') + (c.km === 0 ? kmZero(c) : kmTxt(c.km)) + '</li>' +
          '<li>' + icon('engine') + esc(c.motor) + '</li>' +
          '<li>' + icon('gear') + esc(c.cambio) + '</li>' +
        '</ul>' +
        '<footer class="cc-foot">' +
          '<div><small>Preço</small><p class="price">' + brl(c.preco) + '</p></div>' +
          '<button class="btn btn-primary btn-sm cc-btn" type="button" data-open-lead data-car="' + esc(c.nome) + '">Falar com consultor</button>' +
        '</footer>' +
      '</article>';
  }).join('');

  var cards = $$('.car-card');
  $('#contagem').textContent = cards.length;
  $$('[data-live="estoque"]').forEach(function (el) { el.setAttribute('data-count', cards.length); });

  var revealTargets = $$('.section-head .eyebrow, .section-head h2, .section-side, .steps li, .adv, .cc-cta, .toolbar, .mo-card, .mo-values li, .mo-count, .scene-body > *');
  var groups = new Map();
  revealTargets.forEach(function (el) {
    var key = el.parentElement;
    var n = groups.get(key) || 0;
    groups.set(key, n + 1);
    el.setAttribute('data-reveal', el.tagName === 'H2' ? 'wipe' : 'rise');
    el.style.setProperty('--d', el.classList.contains('car-card') ? n % 3 : Math.min(n, 6));
  });
  var porAlvo = new Map();
  revealTargets.forEach(function (el) {
    var alvo = el.tagName === 'H2' ? el.parentElement : el;
    var lista = porAlvo.get(alvo) || [];
    lista.push(el);
    porAlvo.set(alvo, lista);
  });
  function revelar(el) {
    el.classList.add('in');
    var done = function (e) {
      if (e.target !== el || (e.propertyName !== 'opacity' && e.propertyName !== 'clip-path')) return;
      el.removeEventListener('transitionend', done);
      el.removeAttribute('data-reveal');
      el.classList.remove('in');
      el.style.removeProperty('--d');
    };
    el.addEventListener('transitionend', done);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      (porAlvo.get(en.target) || []).forEach(revelar);
    });
  }, { threshold: 0.15 });
  porAlvo.forEach(function (_, alvo) { io.observe(alvo); });

  var inView = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); inView.unobserve(en.target); }
    });
  }, { threshold: 0.4 });
  [$('.steps')].forEach(function (el) { if (el) inView.observe(el); });
  $$('.steps li').forEach(function (li, i) { li.style.setProperty('--d', i); });

  function countUp(el, end, dur, fmt) {
    if (reduce) { el.textContent = fmt ? fmt(end) : end; return; }
    var start = performance.now();
    (function tick(now) {
      var t = Math.min((now - start) / dur, 1);
      var v = Math.round(end * (1 - Math.pow(1 - t, 3)));
      el.textContent = fmt ? fmt(v) : v;
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  $$('[data-count]').forEach(function (el) {
    var end = parseInt(el.getAttribute('data-count'), 10);
    el.textContent = 0;
    setTimeout(function () { countUp(el, end, 1400); }, 1100);
  });

  var pills = $$('.pill');
  var input = $('#busca');
  var count = $('#contagem');
  var empty = $('#vazio');
  var filter = 'todos';

  cards.forEach(function (c, i) { c.style.viewTransitionName = 'car-' + i; });

  function applyFilter() {
    var q = norm(input.value.trim());
    var shown = 0;
    cards.forEach(function (c) {
      var car = window.BUSCA ? window.BUSCA.porSlug(c.dataset.slug) : null;
      var ok = (filter === 'todos' || c.dataset.cat === filter) && norm(c.dataset.name).indexOf(q) !== -1 &&
        (!window.BUSCA || window.BUSCA.passa(car, q));
      var wasHidden = c.hidden;
      c.hidden = !ok;
      if (ok) {
        shown++;
        if (wasHidden && !reduce) {
          c.classList.add('pop');
          c.addEventListener('animationend', function () { c.classList.remove('pop'); }, { once: true });
        }
      }
    });
    count.textContent = shown;
    empty.hidden = shown !== 0;
    if (window.BUSCA) {
      window.BUSCA.ordenar(cards.map(function (c) { return c.dataset.slug; })).forEach(function (slug) {
        list.appendChild(cards.filter(function (c) { return c.dataset.slug === slug; })[0]);
      });
    }
  }
  document.addEventListener('busca', update);
  function update() {
    if (document.startViewTransition && !reduce) document.startViewTransition(applyFilter);
    else applyFilter();
  }
  pills.forEach(function (p) {
    p.addEventListener('click', function () {
      filter = p.dataset.filter;
      pills.forEach(function (o) {
        var on = o === p;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', String(on));
      });
      update();
    });
  });
  input.addEventListener('input', update);
  var reset = $('[data-reset]');
  if (reset) reset.addEventListener('click', function () {
    input.value = '';
    if (window.BUSCA) window.BUSCA.limpar(true);
    filter = 'todos';
    pills.forEach(function (o) {
      var on = o.dataset.filter === 'todos';
      o.classList.toggle('is-on', on);
      o.setAttribute('aria-pressed', String(on));
    });
    update();
  });

  var dlg = $('#lead');
  var form = $('#lead-form');
  var ok = $('#lead-ok');
  var erro = $('#lead-erro');
  var select = $('#lead-carro');

  var opts = ['Ainda não sei'].concat(CARROS.map(function (c) { return c.nome; }));
  select.innerHTML = opts.map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('');

  function openLead(car) {
    form.hidden = false;
    ok.hidden = true;
    erro.hidden = true;
    if (car) select.value = car;
    if (!dlg.open) dlg.showModal();
    var first = $('input', form);
    if (first) first.focus();
  }
  function closeLead() {
    if (!dlg.open) return;
    if (reduce) { dlg.close(); return; }
    dlg.classList.add('closing');
    dlg.addEventListener('animationend', function () {
      dlg.classList.remove('closing');
      dlg.close();
    }, { once: true });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-lead]');
    if (b) { openLead(b.getAttribute('data-car')); return; }
    if (e.target.closest('[data-close-lead]')) closeLead();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeLead(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeLead(); });

  function zapLoja() {
    var a = $('[data-href="whatsapp"]');
    var h = (a && a.href && a.href.indexOf('wa.me/') > 0) ? a.href : 'https://wa.me/5514996547171';
    return h.split('?')[0];
  }
  function abrirZap(txt) {
    var url = zapLoja() + '?text=' + encodeURIComponent(txt);
    var bt = $('#lead-zap'); if (bt) bt.href = url;
    var w = window.open(url, '_blank', 'noopener');
    if (!w) location.href = url;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = form.elements.nome.value.trim();
    var fone = form.elements.whatsapp.value.trim();
    var zap = fone.replace(/\D/g, '');
    if (!nome || zap.length < 10) { erro.textContent = 'Preencha seu nome e WhatsApp para continuar.'; erro.hidden = false; return; }
    erro.hidden = true;
    var carro = select.value;
    var achado = CARROS.filter(function (c) { return c.nome === carro; })[0];
    var txt = 'Olá! Meu nome é ' + nome + '.\n' +
      (achado ? 'Tenho interesse no ' + achado.nome + (achado.preco ? ' (' + brl(achado.preco) + ')' : '') + '.\n' + linkCarro(achado.slug) + '\n'
              : 'Quero ajuda para escolher um carro.\n') +
      'Meu WhatsApp: ' + fone;
    abrirZap(txt);
    var L = window.LANDORA;
    if (L && L.salvarLead) L.salvarLead({ nome: nome, whatsapp: fone, carro: carro }).catch(function () { });
    form.hidden = true; ok.hidden = false; form.reset();
  });

  var sheet = $('#detalhe');
  var corpo = $('#detalhe-corpo');
  var ROTA = /^#carro\/([\w-]+)$/;
  var atual = null;
  var viaApp = false;

  function linkCarro(slug) { return (/^(localhost|127\.)/.test(location.hostname) ? location.origin : 'https://autocarpiraju.com.br') + '/carro/' + encodeURIComponent(slug); }
  function find(slug) { for (var i = 0; i < CARROS.length; i++) if (CARROS[i].slug === slug) return i; return -1; }

  function renderDetalhe(i, troca) {
    var c = CARROS[i];
    atual = c.slug;
    var n = CARROS.length;
    var g = c.galeria && c.galeria.length ? c.galeria : [c.foto];
    var extras = c.adicionais || window.ADICIONAIS || [];
    var stat = function (rot, val, extra) { return '<div class="d-stat"><small>' + rot + '</small><b' + (extra || '') + '>' + val + '</b></div>'; };

    corpo.className = 'sheet-body' + (troca ? ' swap' : '');
    corpo.innerHTML = '' +
      '<div class="d-media">' +
        '<figure class="d-photo"><img id="d-img" decoding="async" src="' + urlSegura(g[0].src) + '" alt="' + esc(g[0].alt) + '" style="object-position:' + posSegura(g[0].pos || c.foto.pos) + '"></figure>' +
        (g.length > 1 ? '<div class="d-thumbs" role="group" aria-label="Fotos do carro">' + g.map(function (f, k) {
          return '<button type="button" class="d-thumb' + (k === 0 ? ' is-on' : '') + '" data-foto="' + k + '" aria-label="Ver foto ' + (k + 1) + '"><img src="' + urlSegura(f.src) + '" alt="" loading="lazy" decoding="async"></button>';
        }).join('') + '</div>' : '') +
        '<span class="d-tag">' + esc(c.condicao) + '</span>' +
      '</div>' +
      '<div class="d-info">' +
        '<div class="d-bar">' +
          '<button class="d-back" type="button" data-fechar-detalhe>' + icon('chev-l') + 'Voltar ao estoque</button>' +
          '<div class="d-nav"><button type="button" data-prev aria-label="Carro anterior">' + icon('chev-l') + '</button><span>' + (i + 1) + ' de ' + n + '</span><button type="button" data-next aria-label="Próximo carro">' + icon('chev-r') + '</button></div>' +
        '</div>' +
        '<p class="eyebrow d-i" style="--i:0">' + esc(c.condicao) + ' · ' + esc(c.ano) + '</p>' +
        '<h2 class="d-i" style="--i:1">' + esc(c.nome) + '</h2>' +
        '<p class="d-sub d-i" style="--i:2">' + [c.motor, c.potencia, c.cambio].filter(Boolean).map(esc).join(' · ') + '</p>' +
        '<p class="d-price d-i" style="--i:3">' + brl(c.preco) + '</p>' +
        '<div class="d-stats d-i" style="--i:4">' +
          stat('Quilometragem', '', ' data-km="' + c.km + '"') +
          stat('Ano', esc(c.ano)) + stat('Câmbio', esc(c.cambio)) + stat('Combustível', esc(c.combustivel)) +
        '</div>' +
        (c.ficha.length ? '<section class="d-sec d-i" style="--i:5"><h3>Ficha técnica</h3><dl class="d-specs">' +
          c.ficha.map(function (f) { return '<div><dt>' + esc(f[0]) + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('') +
        '</dl></section>' : '') +
        (c.historico.length ? '<section class="d-sec d-i" style="--i:7"><h3>Histórico</h3><ul class="d-checks">' +
          c.historico.map(function (o) { return '<li>' + icon('check') + esc(o) + '</li>'; }).join('') +
        '</ul></section>' : '') +
        (extras.length ? '<section class="d-sec d-i" style="--i:8"><h3>Adicionais da entrega</h3><ul class="d-extras">' +
          extras.map(function (a) { return '<li>' + icon('check') + '<div><b>' + esc(a[0]) + '</b><span>' + esc(a[1]) + '</span></div></li>'; }).join('') +
        '</ul></section>' : '') +
        (c.descricao ? '<section class="d-sec d-i" style="--i:9"><h3>Sobre o carro</h3><p class="d-desc">' + esc(c.descricao) + '</p></section>' : '') +
        '<div class="d-actions">' +
          '<button class="btn btn-primary" type="button" data-open-lead data-car="' + esc(c.nome) + '">Falar com consultor ' + icon('arrow') + '</button>' +
          '<a class="btn btn-ghost" href="' + esc(zapLoja() + '?text=' + encodeURIComponent('Olá! Tenho interesse no ' + c.nome + ' · ' + brl(c.preco) + '\n' + linkCarro(c.slug))) + '" target="_blank" rel="noopener">' + icon('whatsapp') + '<span>WhatsApp</span></a>' +
          '<button class="btn btn-ghost" type="button" data-copiar>' + icon('link') + '<span>Copiar link</span></button>' +
        '</div>' +
      '</div>';

    var kmEl = $('[data-km]', corpo);
    var kmVal = parseInt(kmEl.getAttribute('data-km'), 10);
    if (kmVal > 0) setTimeout(function () { countUp(kmEl, kmVal, 1200, kmTxt); }, 450);
    else kmEl.textContent = kmZero(c);
    $('.d-info', corpo).scrollTop = 0;
    sheet.scrollTop = 0;
  }

  function preparar(c) {
    var L = window.LANDORA;
    return L && L.preparar ? L.preparar(c) : Promise.resolve();
  }
  function abrirDetalhe(slug) {
    var i = find(slug);
    if (i < 0) return;
    var mostrar = function () {
      if (!sheet.open) {
        renderDetalhe(i, false);
        sheet.showModal();
        document.documentElement.classList.add('lock');
      } else if (atual !== slug) {
        renderDetalhe(i, true);
      }
    };
    preparar(CARROS[i]).then(mostrar, mostrar);
    if (window.LANDORA && window.LANDORA.contarVisita) window.LANDORA.contarVisita(slug);
  }
  function fecharDetalheAnimado() {
    if (!sheet.open) return;
    var fim = function () {
      sheet.classList.remove('closing');
      sheet.close();
      document.documentElement.classList.remove('lock');
      atual = null;
    };
    if (reduce) { fim(); return; }
    sheet.classList.add('closing');
    sheet.addEventListener('animationend', fim, { once: true });
  }
  function pedirFechar() {
    if (ROTA.test(location.hash)) {
      if (viaApp && history.length > 1) history.back();
      else { history.replaceState(null, '', location.pathname + location.search + '#carros'); fecharDetalheAnimado(); }
    } else {
      fecharDetalheAnimado();
    }
  }
  function rota() {
    var m = ROTA.exec(location.hash);
    if (m && find(m[1]) >= 0) abrirDetalhe(m[1]);
    else if (sheet.open) fecharDetalheAnimado();
  }
  window.addEventListener('hashchange', rota);
  if (location.hash === '#proposta') { history.replaceState(null, '', location.pathname); setTimeout(function () { openLead(); }, 900); }

  document.addEventListener('click', function (e) {
    var l = e.target.closest('a[href^="#carro/"]');
    if (l) { viaApp = true; return; }
    var h = e.target.closest('[data-detalhe]');
    if (h) { viaApp = true; location.hash = '#carro/' + h.getAttribute('data-detalhe'); }
  });

  sheet.addEventListener('click', function (e) {
    if (e.target.closest('[data-fechar-detalhe]')) { pedirFechar(); return; }
    var prox = e.target.closest('[data-prev],[data-next]');
    if (prox) {
      var i = find(atual);
      var j = (i + (prox.hasAttribute('data-next') ? 1 : -1) + CARROS.length) % CARROS.length;
      var ir = function () {
        history.replaceState(null, '', '#carro/' + CARROS[j].slug);
        renderDetalhe(j, true);
      };
      preparar(CARROS[j]).then(ir, ir);
      if (window.LANDORA && window.LANDORA.contarVisita) window.LANDORA.contarVisita(CARROS[j].slug);
      return;
    }
    var t = e.target.closest('[data-foto]');
    if (t) {
      var car = CARROS[find(atual)];
      var gl = car.galeria[parseInt(t.getAttribute('data-foto'), 10)];
      var img = $('#d-img', sheet);
      img.classList.add('trocando');
      setTimeout(function () {
        img.src = gl.src; img.alt = gl.alt;
        img.style.objectPosition = gl.pos || car.foto.pos;
        img.classList.remove('trocando');
      }, 160);
      $$('.d-thumb', sheet).forEach(function (b) { b.classList.toggle('is-on', b === t); });
      return;
    }
    var cp = e.target.closest('[data-copiar]');
    if (cp) {
      var rot = $('span', cp);
      var url = linkCarro(atual);
      var feito = function () { rot.textContent = 'Link copiado'; setTimeout(function () { rot.textContent = 'Copiar link'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(feito, function () { rot.textContent = 'Copie pela barra do navegador'; });
      else rot.textContent = 'Copie pela barra do navegador';
    }
  });
  sheet.addEventListener('cancel', function (e) { e.preventDefault(); pedirFechar(); });
  document.addEventListener('keydown', function (e) {
    if (!sheet.open || dlg.open) return;
    if (e.key === 'ArrowRight') { var b = $('[data-next]', sheet); if (b) b.click(); }
    if (e.key === 'ArrowLeft') { var a = $('[data-prev]', sheet); if (a) a.click(); }
  });

  rota();
})();
