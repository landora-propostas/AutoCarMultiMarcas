// Interações do site da AutoCar Multimarcas.
// Os carros vêm de js/carros.js. A integração com o Firebase (login, estoque, pedidos)
// entra em uma próxima etapa.

(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CARROS = window.CARROS || [];

  function brl(n) { return 'R$ ' + n.toLocaleString('pt-BR'); }
  function kmTxt(n) { return n.toLocaleString('pt-BR') + ' km'; }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function icon(id) { return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function norm(t) { return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- Menu mobile ---------- */
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

  /* ---------- Rolagem: progresso e cabeçalho em forma de ilha ---------- */
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

  /* ---------- Pílula deslizante do menu + seção ativa ---------- */
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

  /* ---------- Estoque: cartões gerados a partir de js/carros.js ---------- */
  var list = $('#lista-carros');
  list.innerHTML = CARROS.map(function (c, i) {
    var ano = c.ano.split('/')[1] || c.ano;
    return '' +
      '<article class="car-card" data-cat="' + c.categoria + '" data-name="' + esc(c.nome.toLowerCase()) + '" data-slug="' + c.slug + '">' +
        '<header class="cc-top">' +
          '<span class="cc-mark" aria-hidden="true">' + esc((c.marca || c.nome).charAt(0)) + '</span>' +
          '<div class="cc-title"><h3><a class="stretch" href="#carro/' + c.slug + '">' + esc(c.nome) + '</a></h3>' +
          '<p>' + esc(c.condicao) + ' · ' + esc(ano) + '</p></div>' +
          '<span class="cc-go" aria-hidden="true">' + icon('up-right') + '</span>' +
        '</header>' +
        '<div class="cc-photo">' +
          (c.condicao === 'Novo' ? '<span class="tag-new">Novo</span>' : '') +
          '<img class="car-img" src="' + c.foto.src + '" alt="' + esc(c.foto.alt) + '" loading="lazy" decoding="async" style="object-position:' + c.foto.pos + '">' +
        '</div>' +
        '<ul class="specs">' +
          '<li>' + icon('road') + (c.km === 0 ? '0 km' : kmTxt(c.km)) + '</li>' +
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

  /* ---------- Entrada ao rolar ---------- */
  var revealTargets = $$('.section-head .eyebrow, .section-head h2, .section-side, .steps li, .adv, .car-card, .cc-cta, .toolbar, .mo-card, .mo-values li, .mo-count, .scene-body > *');
  var groups = new Map();
  revealTargets.forEach(function (el) {
    var key = el.parentElement;
    var n = groups.get(key) || 0;
    groups.set(key, n + 1);
    el.setAttribute('data-reveal', el.tagName === 'H2' ? 'wipe' : 'rise');
    // Nos cartões do estoque o atraso vai só até 3 passos (por linha), senão o 40º carro
    // esperaria segundos para aparecer.
    el.style.setProperty('--d', el.classList.contains('car-card') ? n % 3 : Math.min(n, 6));
  });
  // Os títulos começam totalmente recortados (clip-path), então o navegador os trata como
  // invisíveis. Por isso observamos o bloco que os contém e revelamos o título junto.
  var porAlvo = new Map();
  revealTargets.forEach(function (el) {
    var alvo = el.tagName === 'H2' ? el.parentElement : el;
    var lista = porAlvo.get(alvo) || [];
    lista.push(el);
    porAlvo.set(alvo, lista);
  });
  function revelar(el) {
    el.classList.add('in');
    // Remove o estado de entrada ao terminar, para não atrasar o hover depois
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
  [$('.steps'), $('.speedo')].forEach(function (el) { if (el) inView.observe(el); });
  $$('.steps li').forEach(function (li, i) { li.style.setProperty('--d', i); });

  /* ---------- Contadores ---------- */
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

  /* ---------- Holofote dos cards e paralaxe do hero ---------- */
  $$('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
  var stage = $('.hero-stage');
  if (hero && stage && !reduce && window.matchMedia('(hover: hover)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      stage.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
      stage.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', function () {
      stage.style.setProperty('--px', 0);
      stage.style.setProperty('--py', 0);
    });
  }

  /* ---------- Estoque: filtros, busca e contagem ---------- */
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

  /* ---------- FAQ com abertura animada ---------- */
  var items = $$('.faq-list details');
  function animate(d, open) {
    var body = $('p', d);
    if (reduce) { d.open = open; return; }
    if (d._anim) d._anim.cancel();
    if (open) {
      d.open = true;
      var h = body.scrollHeight;
      d._anim = body.animate(
        [{ height: '0px', opacity: 0, paddingBottom: '0px' }, { height: h + 'px', opacity: 1, paddingBottom: '20px' }],
        { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' }
      );
      d._anim.onfinish = function () { d._anim = null; };
    } else {
      var from = body.offsetHeight;
      d._anim = body.animate(
        [{ height: from + 'px', opacity: 1, paddingBottom: '20px' }, { height: '0px', opacity: 0, paddingBottom: '0px' }],
        { duration: 280, easing: 'cubic-bezier(.4,0,.2,1)' }
      );
      d._anim.onfinish = function () { d.open = false; d._anim = null; };
    }
  }
  items.forEach(function (d) {
    $('summary', d).addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = d._state === undefined ? d.open : d._state;
      items.forEach(function (o) {
        var oOpen = o._state === undefined ? o.open : o._state;
        if (o !== d && oOpen) { o._state = false; animate(o, false); }
      });
      d._state = !isOpen;
      animate(d, d._state);
    });
  });

  /* ---------- Diálogo "Receba uma proposta" ---------- */
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
  // Delegação: funciona também para botões criados depois (cartões e tela de detalhes)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open-lead]');
    if (b) { openLead(b.getAttribute('data-car')); return; }
    if (e.target.closest('[data-close-lead]')) closeLead();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeLead(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); closeLead(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = form.elements.nome.value.trim();
    var zap = form.elements.whatsapp.value.replace(/\D/g, '');
    if (!nome || zap.length < 10) { erro.textContent = 'Preencha seu nome e WhatsApp para continuar.'; erro.hidden = false; return; }
    erro.hidden = true;
    var concluir = function () { form.hidden = true; ok.hidden = false; form.reset(); };
    var L = window.LANDORA;
    // Com o Firebase ativo (js/dados.js), o pedido é gravado na coleção "leads" e aparece no painel.
    // No modo de demonstração (carros de exemplo), apenas simula o envio.
    if (L && L.salvarLead) {
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      L.salvarLead({ nome: nome, whatsapp: form.elements.whatsapp.value.trim(), carro: select.value }).then(concluir, function () {
        erro.textContent = 'Não foi possível enviar agora. Tente de novo em instantes.';
        erro.hidden = false;
      }).then(function () { btn.disabled = false; });
    } else {
      concluir();
    }
  });

  /* ---------- Tela de detalhes do carro ---------- */
  var sheet = $('#detalhe');
  var corpo = $('#detalhe-corpo');
  var ROTA = /^#carro\/([\w-]+)$/;
  var atual = null;      // slug aberto
  var viaApp = false;    // abriu por clique dentro do site (então "voltar" pode usar o histórico)

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
        '<figure class="d-photo"><img id="d-img" src="' + g[0].src + '" alt="' + esc(g[0].alt) + '" style="object-position:' + (g[0].pos || c.foto.pos) + '"></figure>' +
        (g.length > 1 ? '<div class="d-thumbs" role="group" aria-label="Fotos do carro">' + g.map(function (f, k) {
          return '<button type="button" class="d-thumb' + (k === 0 ? ' is-on' : '') + '" data-foto="' + k + '" aria-label="Ver foto ' + (k + 1) + '"><img src="' + f.src + '" alt=""></button>';
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
          stat('Quilometragem', c.km === 0 ? '0 km' : '0 km', ' data-km="' + c.km + '"') +
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
          '<button class="btn btn-ghost" type="button" data-copiar>' + icon('link') + '<span>Copiar link</span></button>' +
        '</div>' +
      '</div>';

    var kmEl = $('[data-km]', corpo);
    var kmVal = parseInt(kmEl.getAttribute('data-km'), 10);
    if (kmVal > 0) setTimeout(function () { countUp(kmEl, kmVal, 1200, kmTxt); }, 450);
    else kmEl.textContent = '0 km';
    $('.d-info', corpo).scrollTop = 0;
    sheet.scrollTop = 0;
  }

  // As fotos da galeria vêm do banco só quando o carro é aberto (window.LANDORA.preparar).
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
  // /#proposta (vindo do perfil) abre o pedido de proposta direto
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
      var url = location.href;
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
