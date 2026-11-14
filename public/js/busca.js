// Busca avançada do estoque: marca, ano (exato ou faixa), quilometragem, preço, câmbio, combustível,
// condição, cor, potência, diferenciais e ordenação. Os dados vêm de window.CARROS (js/carros.js).
(function () {
  'use strict';
  var CARROS = window.CARROS || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var brl = function (n) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }); };
  var num = function (n) { return n.toLocaleString('pt-BR'); };

  // ---------- Dados derivados de cada carro ----------
  CARROS.forEach(function (c, i) {
    c._ordem = i;
    c._anoModelo = parseInt(String(c.ano).split('/').pop(), 10);
    c._cv = parseInt(String(c.potencia).replace(/\D/g, ''), 10) || 0;
    c._marca = c.marca || String(c.nome).split(' ')[0];
    var texto = (c.historico || []).join(' | ').toLowerCase();
    c._dif = {
      'Único dono': /único dono/.test(texto),
      'Aceita troca': /aceita troca/.test(texto),
      'Aceita financiamento': /financiamento/.test(texto),
      'Laudo cautelar': /laudo cautelar/.test(texto),
      'IPVA pago': /ipva pago/.test(texto),
      'Garantia': /garantia/.test(texto)
    };
  });
  function porSlug(s) { return CARROS.filter(function (c) { return c.slug === s; })[0]; }

  function unicos(f) { return CARROS.map(f).filter(function (v, i, a) { return v !== '' && v != null && a.indexOf(v) === i; }).sort(); }
  var marcas = unicos(function (c) { return c._marca; });
  var cambios = unicos(function (c) { return c.cambio; });
  var combs = unicos(function (c) { return c.combustivel; });
  var conds = unicos(function (c) { return c.condicao; });
  var cores = unicos(function (c) { return c.cor; });
  var anos = unicos(function (c) { return c._anoModelo; }).sort(function (a, b) { return b - a; });
  var difs = Object.keys(CARROS[0] ? CARROS[0]._dif : {}).filter(function (d) { return CARROS.some(function (c) { return c._dif[d]; }); });
  var arred = function (v, p, f) { return Math[f](v / p) * p; };
  var B = {
    km: [0, Math.max(arred(Math.max.apply(null, CARROS.map(function (c) { return c.km; })), 10000, 'ceil'), 10000)],
    preco: [arred(Math.min.apply(null, CARROS.map(function (c) { return c.preco; })), 10000, 'floor'), arred(Math.max.apply(null, CARROS.map(function (c) { return c.preco; })), 10000, 'ceil')],
    cv: [0, Math.max.apply(null, CARROS.map(function (c) { return c._cv; }))]
  };

  var ORDENS = [
    ['relevancia', 'Relevância'],
    ['procurados', 'Mais procurados'],
    ['recentes', 'Mais recentes no estoque'],
    ['preco-asc', 'Menor preço'],
    ['preco-desc', 'Maior preço'],
    ['km-asc', 'Menor quilometragem'],
    ['km-desc', 'Maior quilometragem'],
    ['ano-desc', 'Ano: mais novo'],
    ['ano-asc', 'Ano: mais antigo'],
    ['cv-desc', 'Maior potência'],
    ['nome', 'Nome (A–Z)']
  ];

  // ---------- Estado ----------
  var S;
  function vazio() {
    return { marcas: {}, cambio: {}, comb: {}, cond: {}, cor: {}, dif: {}, kmMin: B.km[0], kmMax: B.km[1], pMin: B.preco[0], pMax: B.preco[1],
             anoDe: '', anoAte: '', anoExato: false, cv: 0, ordem: S ? S.ordem : 'relevancia' };
  }
  S = vazio();
  var ativo = function (o) { return Object.keys(o).filter(function (k) { return o[k]; }); };

  function passa(c) {
    if (!c) return true;
    var m = ativo(S.marcas); if (m.length && m.indexOf(c._marca) < 0) return false;
    m = ativo(S.cambio); if (m.length && m.indexOf(c.cambio) < 0) return false;
    m = ativo(S.comb); if (m.length && m.indexOf(c.combustivel) < 0) return false;
    m = ativo(S.cond); if (m.length && m.indexOf(c.condicao) < 0) return false;
    m = ativo(S.cor); if (m.length && m.indexOf(c.cor) < 0) return false;
    m = ativo(S.dif); if (m.some(function (d) { return !c._dif[d]; })) return false;   // todos os diferenciais marcados
    if (c.km < S.kmMin || c.km > S.kmMax) return false;
    if (c.preco < S.pMin || c.preco > S.pMax) return false;
    if (S.anoDe !== '' && c._anoModelo < +S.anoDe) return false;
    var ate = S.anoExato && S.anoDe !== '' ? +S.anoDe : (S.anoAte === '' ? Infinity : +S.anoAte);
    if (c._anoModelo > ate) return false;
    if (S.cv && c._cv < S.cv) return false;
    return true;
  }

  function ordenar(slugs) {
    var cmp = {
      'relevancia': function (a, b) { return a._ordem - b._ordem; },
      'procurados': function (a, b) { return (b.procura || 0) - (a.procura || 0); },
      'recentes': function (a, b) { return String(b.adicionado || '').localeCompare(String(a.adicionado || '')); },
      'preco-asc': function (a, b) { return a.preco - b.preco; },
      'preco-desc': function (a, b) { return b.preco - a.preco; },
      'km-asc': function (a, b) { return a.km - b.km; },
      'km-desc': function (a, b) { return b.km - a.km; },
      'ano-desc': function (a, b) { return b._anoModelo - a._anoModelo; },
      'ano-asc': function (a, b) { return a._anoModelo - b._anoModelo; },
      'cv-desc': function (a, b) { return b._cv - a._cv; },
      'nome': function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }
    }[S.ordem] || function (a, b) { return a._ordem - b._ordem; };
    return slugs.map(porSlug).sort(function (a, b) { return cmp(a, b) || a._ordem - b._ordem; }).map(function (c) { return c.slug; });
  }

  // ---------- Interface ----------
  var inner = $('#adv-inner'), toggle = $('#adv-toggle'), painel = $('#busca-avancada'), badge = $('#adv-badge'), tagsEl = $('#adv-tags'), selOrdem = $('#ordem');
  if (!inner || !CARROS.length) { window.BUSCA = { passa: function () { return true; }, ordenar: function (s) { return s; }, porSlug: porSlug, limpar: function () {} }; return; }

  selOrdem.innerHTML = ORDENS.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');

  function chips(grupo, lista, rotulo, extra) {
    return '<div class="fgroup"><h4>' + rotulo + '</h4><div class="fchips">' + lista.map(function (v) {
      return '<button type="button" class="fchip' + (S[grupo][v] ? ' on' : '') + '" data-g="' + grupo + '" data-v="' + esc(v) + '" aria-pressed="' + !!S[grupo][v] + '">' + (extra ? extra(v) : '') + esc(v) + '</button>';
    }).join('') + '</div></div>';
  }
  function faixa(id, rotulo, min, max, passo, fmt, unid) {
    return '<div class="fgroup frange" data-range="' + id + '"><h4>' + rotulo + '</h4>' +
      '<div class="dual"><div class="dual-fill"></div>' +
        '<input type="range" data-r="' + id + 'Min" min="' + min + '" max="' + max + '" step="' + passo + '" aria-label="' + rotulo + ' mínimo">' +
        '<input type="range" data-r="' + id + 'Max" min="' + min + '" max="' + max + '" step="' + passo + '" aria-label="' + rotulo + ' máximo"></div>' +
      '<div class="rnums"><label><span>De</span><input type="text" inputmode="numeric" data-n="' + id + 'Min" aria-label="' + rotulo + ' de"></label>' +
      '<label><span>Até</span><input type="text" inputmode="numeric" data-n="' + id + 'Max" aria-label="' + rotulo + ' até"></label></div></div>';
  }
  function selAno(id, rotulo) {
    return '<label class="fsel"><span>' + rotulo + '</span><select data-a="' + id + '"><option value="">Qualquer</option>' +
      anos.map(function (a) { return '<option value="' + a + '">' + a + '</option>'; }).join('') + '</select></label>';
  }

  inner.innerHTML =
    chips('marcas', marcas, 'Marca') +
    '<div class="fgroup"><h4>Ano do modelo</h4><div class="anos">' + selAno('anoDe', 'De') + selAno('anoAte', 'Até') + '</div>' +
      '<label class="check"><input type="checkbox" id="ano-exato"><span>Só este ano</span></label></div>' +
    faixa('km', 'Quilometragem', B.km[0], B.km[1], 1000, num, 'km') +
    faixa('p', 'Preço', B.preco[0], B.preco[1], 5000, brl, 'R$') +
    chips('cambio', cambios, 'Câmbio') +
    chips('comb', combs, 'Combustível') +
    chips('cond', conds, 'Condição') +
    chips('cor', cores, 'Cor') +
    '<div class="fgroup"><h4>Potência mínima</h4><div class="fchips" data-cv>' +
      [0, 100, 120, 150, 300, 500].filter(function (v) { return v <= B.cv[1]; }).map(function (v) {
        return '<button type="button" class="fchip' + (v === 0 ? ' on' : '') + '" data-cvv="' + v + '">' + (v ? v + ' cv +' : 'Qualquer') + '</button>';
      }).join('') + '</div></div>' +
    (difs.length ? chips('dif', difs, 'Diferenciais') : '') +
    '<div class="adv-actions"><button type="button" class="btn btn-ghost btn-sm" data-limpar>Limpar filtros</button>' +
    '<button type="button" class="btn btn-primary btn-sm" data-fechar>Ver resultados</button></div>';

  // ---------- Sincronização da tela com o estado ----------
  function pintarFaixa(id) {
    var wrap = $('[data-range="' + id + '"]', inner), mn = S[id + 'Min'], mx = S[id + 'Max'], lim = id === 'km' ? B.km : B.preco;
    var a = $('[data-r="' + id + 'Min"]', wrap), b = $('[data-r="' + id + 'Max"]', wrap);
    a.value = mn; b.value = mx;
    var span = lim[1] - lim[0] || 1;
    $('.dual-fill', wrap).style.left = ((mn - lim[0]) / span * 100) + '%';
    $('.dual-fill', wrap).style.right = (100 - (mx - lim[0]) / span * 100) + '%';
    var fmt = id === 'km' ? num : num;
    var na = $('[data-n="' + id + 'Min"]', wrap), nb = $('[data-n="' + id + 'Max"]', wrap);
    if (document.activeElement !== na) na.value = fmt(mn);
    if (document.activeElement !== nb) nb.value = fmt(mx);
  }
  function sincronizar() {
    pintarFaixa('km'); pintarFaixa('p');
    $$('.fchip[data-g]', inner).forEach(function (b) { var on = !!S[b.dataset.g][b.dataset.v]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    $$('.fchip[data-cvv]', inner).forEach(function (b) { b.classList.toggle('on', +b.dataset.cvv === S.cv); });
    $('[data-a="anoDe"]', inner).value = S.anoDe; $('[data-a="anoAte"]', inner).value = S.anoAte;
    $('[data-a="anoAte"]', inner).disabled = S.anoExato;
    $('#ano-exato', inner).checked = S.anoExato;
    selOrdem.value = S.ordem;
    etiquetas();
  }

  // ---------- Etiquetas dos filtros ativos ----------
  function etiquetas() {
    var t = [];
    function add(rot, limpar) { t.push([rot, limpar]); }
    ['marcas', 'cambio', 'comb', 'cond', 'cor', 'dif'].forEach(function (g) {
      ativo(S[g]).forEach(function (v) { add(v, function () { S[g][v] = false; }); });
    });
    if (S.kmMin > B.km[0] || S.kmMax < B.km[1]) add('Km: ' + num(S.kmMin) + ' a ' + num(S.kmMax), function () { S.kmMin = B.km[0]; S.kmMax = B.km[1]; });
    if (S.pMin > B.preco[0] || S.pMax < B.preco[1]) add(brl(S.pMin) + ' a ' + brl(S.pMax), function () { S.pMin = B.preco[0]; S.pMax = B.preco[1]; });
    if (S.anoExato && S.anoDe !== '') add('Ano ' + S.anoDe, function () { S.anoExato = false; S.anoDe = ''; });
    else if (S.anoDe !== '' || S.anoAte !== '') add('Ano: ' + (S.anoDe || '…') + ' a ' + (S.anoAte || '…'), function () { S.anoDe = ''; S.anoAte = ''; });
    if (S.cv) add(S.cv + ' cv ou mais', function () { S.cv = 0; });
    tagsEl.hidden = !t.length;
    tagsEl.innerHTML = t.map(function (x, i) { return '<button type="button" class="tag" data-i="' + i + '">' + esc(x[0]) + '<span aria-hidden="true">×</span><span class="sr">remover filtro</span></button>'; }).join('') +
      (t.length ? '<button type="button" class="tag clear" data-limpar>Limpar tudo</button>' : '');
    tagsEl._t = t;
    badge.hidden = !t.length; badge.textContent = t.length;
  }
  tagsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-limpar')) return limpar(false);
    var t = tagsEl._t[+b.dataset.i]; if (t) { t[1](); mudou(); }
  });

  function mudou() { sincronizar(); document.dispatchEvent(new Event('busca')); }
  function limpar(semEvento) { S = vazio(); sincronizar(); if (!semEvento) document.dispatchEvent(new Event('busca')); }

  // ---------- Eventos ----------
  inner.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.g) { S[b.dataset.g][b.dataset.v] = !S[b.dataset.g][b.dataset.v]; mudou(); }
    else if (b.hasAttribute('data-cvv')) { S.cv = +b.dataset.cvv; mudou(); }
    else if (b.hasAttribute('data-limpar')) limpar(false);
    else if (b.hasAttribute('data-fechar')) abrir(false, true);
  });
  inner.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.r) {                      // controles deslizantes
      var id = t.dataset.r.replace(/(Min|Max)$/, ''), isMin = /Min$/.test(t.dataset.r), v = +t.value;
      if (isMin) S[id + 'Min'] = Math.min(v, S[id + 'Max']); else S[id + 'Max'] = Math.max(v, S[id + 'Min']);
      pintarFaixa(id); document.dispatchEvent(new Event('busca')); etiquetas();
    } else if (t.dataset.n) {               // campos digitados
      var dig = t.value.replace(/\D/g, ''); var id2 = t.dataset.n.replace(/(Min|Max)$/, ''), min = /Min$/.test(t.dataset.n);
      var lim = id2 === 'km' ? B.km : B.preco;
      if (dig === '') return;
      var val = Math.min(Math.max(+dig, lim[0]), lim[1]);
      if (min) S[id2 + 'Min'] = Math.min(val, S[id2 + 'Max']); else S[id2 + 'Max'] = Math.max(val, S[id2 + 'Min']);
      pintarFaixa(id2); document.dispatchEvent(new Event('busca')); etiquetas();
    }
  });
  inner.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.a) { S[t.dataset.a] = t.value; if (S.anoDe !== '' && S.anoAte !== '' && +S.anoAte < +S.anoDe) { var x = S.anoDe; S.anoDe = S.anoAte; S.anoAte = x; } mudou(); }
    else if (t.id === 'ano-exato') { S.anoExato = t.checked; mudou(); }
    else if (t.dataset.n) mudou();
  });
  selOrdem.addEventListener('change', function () { S.ordem = selOrdem.value; document.dispatchEvent(new Event('busca')); });

  function abrir(abrirPainel, rolar) {
    var vai = abrirPainel === undefined ? !painel.classList.contains('open') : abrirPainel;
    painel.classList.toggle('open', vai);
    toggle.setAttribute('aria-expanded', vai);
    if (rolar && !vai) { var t = $('.result-count'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
  }
  var fixo = document.getElementById('filtro-fixo');
  toggle.addEventListener('click', function () {
    // Barra presa com o painel recolhido automaticamente: o clique só mostra o painel de novo
    if (fixo && fixo.classList.contains('preso') && fixo.classList.contains('auto-recolhe')) { fixo.classList.remove('auto-recolhe'); toggle.setAttribute('aria-expanded', 'true'); return; }
    if (fixo) fixo.classList.remove('auto-recolhe');
    abrir();
  });
  // No computador a busca avançada já vem aberta; no celular começa fechada.
  // Ao rolar pelos anúncios, a barra fica presa no topo com o painel aberto.
  if (matchMedia('(min-width: 901px)').matches) abrir(true);
  // Fundo na barra só enquanto ela está presa no topo
  if (fixo && window.IntersectionObserver) {
    var marca = document.createElement('div'); marca.style.height = '1px'; fixo.parentNode.insertBefore(marca, fixo);
    new IntersectionObserver(function (en) {
      var preso = !en[0].isIntersecting && en[0].boundingClientRect.top < 100;
      fixo.classList.toggle('preso', preso);
      if (fixo.classList.contains('auto-recolhe')) toggle.setAttribute('aria-expanded', String(!preso && painel.classList.contains('open')));
    }, { rootMargin: '-90px 0px 0px 0px' }).observe(marca);
  }

  window.BUSCA = { passa: passa, ordenar: ordenar, porSlug: porSlug, limpar: limpar };
  sincronizar();
})();
