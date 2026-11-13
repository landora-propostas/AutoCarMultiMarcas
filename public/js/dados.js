// Carregador do site público: lê categorias, carros, adicionais e configurações do Firestore,
// monta window.CARROS / window.ADICIONAIS (o formato que busca.js e main.js já esperam)
// e só então inicia os scripts do site.
//
// Se o Firebase não estiver disponível, ou o painel ainda não tiver sido configurado,
// o site mostra os carros de exemplo de js/carros.js (modo "demo").
import { iniciar } from "./firebase-boot.js";
import { carroParaSite } from "./modelo.js";
import { carregar } from "./midia.js";

const $ = function (s, r) { return (r || document).querySelector(s); };
const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
const esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
const dig = function (o, caminho) { return caminho.split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); };
const so = function (t) { return String(t || "").replace(/\D/g, ""); };

function carregarScript(src) {
  return new Promise(function (ok, erro) {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("Não carregou " + src)); };
    document.body.appendChild(s);
  });
}

function hrefTel(t) {
  let d = so(t);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return "tel:+" + d;
}
function urlRede(tipo, v) {
  v = String(v || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  v = v.replace(/^@/, "");
  return { instagram: "https://instagram.com/", facebook: "https://facebook.com/", youtube: "https://youtube.com/@", tiktok: "https://tiktok.com/@" }[tipo] + v;
}

/* ---------- Aplica as configurações do painel na página ---------- */
function aplicarSite(cfg, urls) {
  // Textos simples: <span data-s="contato.telefone">…</span>
  $$("[data-s]").forEach(function (el) {
    const v = dig(cfg, el.dataset.s);
    if (typeof v === "string" && v.trim()) el.textContent = v.trim();
  });

  const m = cfg.marca || {}, t = cfg.textos || {}, c = cfg.contato || {}, r = cfg.redes || {}, seo = cfg.seo || {};
  if (m.nome && m.nome.trim()) $$(".brand").forEach(function (a) { a.setAttribute("aria-label", m.nome.trim() + ", início"); });
  if (typeof m.sub === "string") {
    const letras = m.sub.replace(/\s+/g, "").toUpperCase().split("");
    $$(".brand-sub").forEach(function (s) { s.innerHTML = letras.map(function (ch) { return "<i>" + esc(ch) + "</i>"; }).join(""); s.hidden = !letras.length; });
  }

  // Imagens: <img data-img="heroFundo">
  $$("[data-img]").forEach(function (img) { const u = urls[img.dataset.img]; if (!u) return; img.src = u; if (img.parentNode && img.parentNode.tagName === "PICTURE") img.parentNode.querySelectorAll("source").forEach(function (s) { s.remove(); }); });
  if (urls.favicon) { const f = $("#favicon"); if (f) { f.removeAttribute("type"); f.href = urls.favicon; } }

  // Título do topo e bloco final têm estrutura própria
  const h1 = $(".hero h1");
  if (h1 && [t.heroL1, t.heroL2, t.heroL3, t.heroL4].some(Boolean)) {
    const linhas = [t.heroL1, t.heroL2, t.heroL3, t.heroL4], spans = $$(".ln > span", h1);
    spans.forEach(function (sp, i) {
      const v = String(linhas[i] || "").trim();
      if (!v) return;
      const em = sp.querySelector("em");
      if (em) em.textContent = v; else sp.textContent = v;
    });
    h1.setAttribute("aria-label", spans.map(function (s) { return s.textContent; }).join(" "));
  }
  const h2 = $(".cta2 h2");
  if (h2 && (t.ctaL1 || t.ctaL2)) {
    const l1 = (t.ctaL1 || "").trim() || h2.firstChild.textContent, l2 = (t.ctaL2 || "").trim() || (h2.querySelector("em") || {}).textContent || "";
    h2.innerHTML = esc(l1) + "<br><em>" + esc(l2) + "</em>";
  }

  // Links de contato e redes
  const tel = c.telefone && hrefTel(c.telefone);
  if (tel) $$('[data-href="telefone"]').forEach(function (a) { a.href = tel; });
  if (c.email && c.email.trim()) $$('[data-href="email"]').forEach(function (a) { a.href = "mailto:" + c.email.trim(); });
  if (so(c.whatsapp)) $$('[data-href="whatsapp"]').forEach(function (a) { a.href = "https://wa.me/" + (so(c.whatsapp).length <= 11 ? "55" : "") + so(c.whatsapp); });
  const box = $("#redes");
  if (box) {
    const itens = [];
    if (so(c.whatsapp)) itens.push('<a href="https://wa.me/' + (so(c.whatsapp).length <= 11 ? "55" : "") + so(c.whatsapp) + '" target="_blank" rel="noopener">WhatsApp</a>');
    [["instagram", "Instagram"], ["facebook", "Facebook"], ["youtube", "YouTube"], ["tiktok", "TikTok"]].forEach(function (p) {
      const u = urlRede(p[0], r[p[0]]);
      if (u) itens.push('<a href="' + esc(u) + '" target="_blank" rel="noopener">' + p[1] + "</a>");
    });
    box.innerHTML = itens.join("");
    box.hidden = !itens.length;
  }

  if (seo.titulo && seo.titulo.trim()) document.title = seo.titulo.trim();
  if (seo.descricao && seo.descricao.trim()) { const md = $('meta[name="description"]'); if (md) md.content = seo.descricao.trim(); }
}

function pintarCategorias(categorias, carros) {
  const box = $("#pills");
  if (!box) return;
  const usadas = {};
  carros.forEach(function (c) { usadas[c.categoria] = 1; });
  const fixas = { hatch: "Hatches", cupe: "Cupês", sedan: "Sedãs", suv: "SUVs" };
  Object.keys(fixas).forEach(function (id, k) {
    if (!categorias.some(function (c) { return c.id === id; })) categorias.push({ id: id, nome: fixas[id], ordem: k + 1 });
  });
  const lista = categorias.filter(function (c) { return c.ativa !== false && (usadas[c.id] || fixas[c.id]); })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  box.innerHTML = '<button class="pill is-on" type="button" data-filter="todos" aria-pressed="true">Todos</button>' +
    lista.map(function (c) { return '<button class="pill" type="button" data-filter="' + esc(c.id) + '" aria-pressed="false">' + esc(c.nome) + "</button>"; }).join("");
}

async function resolverImagens(ctx, cfg) {
  const urls = {}, jobs = [];
  const pega = function (k, img) {
    if (!img) return;
    jobs.push(carregar(ctx, img).then(function (u) { if (u) urls[k] = u; }).catch(function () {}));
  };
  pega("logo", cfg.marca && cfg.marca.logo);
  pega("favicon", cfg.marca && cfg.marca.favicon);
  Object.keys(cfg.imagens || {}).forEach(function (k) { pega(k, cfg.imagens[k]); });
  await Promise.all(jobs);
  return urls;
}

/* ---------- Cache no aparelho (IndexedDB) ----------
   A primeira visita lê o Firestore e guarda tudo no aparelho. As visitas seguintes abrem
   na hora com o que está guardado, sem ler o banco. Passado o prazo (VALIDADE), o site
   ainda abre com o guardado e atualiza em segundo plano para a próxima visita. */
const CACHE_DB = "autocar-cache", CACHE_CHAVE = "site-v4", VALIDADE = 30 * 60 * 1000;
function abrirCache() {
  return new Promise(function (ok, erro) {
    if (!("indexedDB" in window)) return erro(new Error("sem-indexeddb"));
    const r = indexedDB.open(CACHE_DB, 1);
    r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
    r.onsuccess = function () { ok(r.result); };
    r.onerror = function () { erro(r.error); };
  });
}
async function lerCache() {
  try {
    const db = await abrirCache();
    return await new Promise(function (ok) {
      const q = db.transaction("kv").objectStore("kv").get(CACHE_CHAVE);
      q.onsuccess = function () { ok(q.result || null); };
      q.onerror = function () { ok(null); };
    });
  } catch (e) { return null; }
}
async function gravarCache(dados) {
  try {
    const db = await abrirCache();
    // Guarda no máximo as 120 fotos de galeria mais recentes, para não encher o aparelho.
    if (dados.midia) { const ks = Object.keys(dados.midia); if (ks.length > 120) ks.slice(0, ks.length - 120).forEach(function (k) { delete dados.midia[k]; }); }
    db.transaction("kv", "readwrite").objectStore("kv").put({ t: Date.now(), dados: dados }, CACHE_CHAVE);
  } catch (e) { /* sem espaço ou modo privado: segue sem cache */ }
}

/* ---------- Leitura rápida pela API REST do Firestore ----------
   Evita baixar o SDK do Firebase (centenas de KB) e a conexão em tempo real só para mostrar
   o estoque. Se algo falhar, cai no SDK normal (buscarDoFirebase). */
function valorRest(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return docRest(v.mapValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valorRest);
  return null;
}
function docRest(d) {
  const o = {}, f = (d && d.fields) || {};
  Object.keys(f).forEach(function (k) { o[k] = valorRest(f[k]); });
  if (d && d.name) o.id = d.name.split("/").pop();
  return o;
}
// anterior: o que já está guardado no aparelho ({ raw, midia }). Só baixa carros novos ou alterados.
let REST = null; // { base, chave } — também usado para baixar fotos da galeria sem o SDK
async function restCfg() {
  if (REST) return REST;
  const r0 = await fetch("/__/firebase/init.json");
  if (!r0.ok) throw new Error("config-indisponivel");
  const c = await r0.json();
  REST = { base: "https://firestore.googleapis.com/v1/projects/" + c.projectId + "/databases/(default)/documents", chave: "?key=" + encodeURIComponent(c.apiKey), nome: "projects/" + c.projectId + "/databases/(default)/documents" };
  return REST;
}
async function pegaJson(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error("rest-" + r.status);
  return r.json();
}
async function midiaRest(id, guardadas) {
  if (guardadas && guardadas[id]) return guardadas[id];
  const R = await restCfg();
  const o = docRest(await pegaJson(R.base + "/midia/" + encodeURIComponent(id) + R.chave));
  if (o.data && guardadas) guardadas[id] = o.data;
  return o.data || "";
}
async function buscarRest(anterior) {
  const R = await restCfg();
  const rawAnt = (anterior && anterior.raw) || {}, midia = Object.assign({}, (anterior && anterior.midia) || {});
  const lista = function (caminho) {
    return pegaJson(R.base + "/" + caminho + R.chave + "&pageSize=300").then(function (j) { return (j.documents || []).map(docRest); });
  };
  const consulta = function (campos) {
    const q = { from: [{ collectionId: "carros" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "publicado" } } } };
    if (campos) q.select = { fields: campos.map(function (f) { return { fieldPath: f }; }) };
    return pegaJson(R.base + ":runQuery" + R.chave, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ structuredQuery: q }) });
  };
  // 1) Leve: só o endereço e a data de alteração de cada carro publicado
  const [cfgDoc, categorias, adicionais, indice] = await Promise.all([
    pegaJson(R.base + "/config/site" + R.chave).then(docRest), lista("categorias"), lista("adicionais"), consulta(["__name__"])
  ]);
  if (!cfgDoc.inicializado) throw new Error("nao-iniciado");
  const raw = {}, faltam = [];
  indice.forEach(function (x) {
    if (!x.document) return;
    const id = x.document.name.split("/").pop(), u = x.document.updateTime;
    if (rawAnt[id] && rawAnt[id].u === u) raw[id] = rawAnt[id]; else faltam.push({ id: id, u: u, name: x.document.name });
  });
  // 2) Pesado só para o que é novo ou mudou
  for (let i = 0; i < faltam.length; i += 100) {
    const parte = faltam.slice(i, i + 100);
    const res = await pegaJson(R.base + ":batchGet" + R.chave, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documents: parte.map(function (f) { return f.name; }) }) });
    res.forEach(function (r) { if (r.found) { const d = docRest(r.found); raw[d.id] = { u: r.found.updateTime, d: d }; } });
  }
  const carros = Object.keys(raw).map(function (id) { return carroParaSite(raw[id].d, adicionais); })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  // Imagens do site (logo, fundo do topo...) — reaproveita as já guardadas
  const urls = {}, jobs = [];
  const img = function (k, im) {
    if (!im) return;
    if (im.src) { urls[k] = im.src; return; }
    if (!im.midia) return;
    jobs.push(midiaRest(im.midia, midia).then(function (u) { if (u) urls[k] = u; }).catch(function () {}));
  };
  img("logo", cfgDoc.marca && cfgDoc.marca.logo);
  img("favicon", cfgDoc.marca && cfgDoc.marca.favicon);
  Object.keys(cfgDoc.imagens || {}).forEach(function (k) { img(k, cfgDoc.imagens[k]); });
  await Promise.all(jobs);
  delete cfgDoc.id;
  return { cfg: cfgDoc, categorias: categorias, carros: carros, urls: urls, raw: raw, midia: midia, novos: faltam.length };
}
async function buscarDados(anterior) {
  try { return await buscarRest(anterior); }
  catch (e) { if (e && e.message === "nao-iniciado") throw e; return buscarDoFirebase(await iniciar()); }
}

/* ---------- Modo real (Firestore) ---------- */
async function buscarDoFirebase(ctx) {
  const f = ctx.fs, db = ctx.db;
  const [cfgSnap, cs, cars, ads] = await Promise.all([
    f.getDoc(f.doc(db, "config", "site")),
    f.getDocs(f.collection(db, "categorias")),
    f.getDocs(f.query(f.collection(db, "carros"), f.where("status", "==", "publicado"))),
    f.getDocs(f.collection(db, "adicionais"))
  ]);
  if (!cfgSnap.exists() || !cfgSnap.data().inicializado) throw new Error("nao-iniciado");
  const lista = function (s) { return s.docs.map(function (d) { const o = d.data(); o.id = d.id; return o; }); };
  const plano = function (o) { return JSON.parse(JSON.stringify(o)); }; // tira Timestamps do Firestore
  const cfg = plano(cfgSnap.data()), categorias = plano(lista(cs)), adicionais = lista(ads);
  const carros = plano(lista(cars).map(function (c) { return carroParaSite(c, adicionais); })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }));
  const urls = await resolverImagens(ctx, cfg);
  return { cfg: cfg, categorias: categorias, carros: carros, urls: urls };
}

function montarSite(d) {
  const carros = d.carros;
  window.ADICIONAIS = [];
  window.CARROS = carros;
  pintarCategorias(d.categorias, carros);
  aplicarSite(d.cfg, d.urls);
  if (!carros.length) {
    const v = $("#vazio");
    if (v) { v.hidden = false; const p = $("p", v), b = $("button", v); if (p) p.textContent = "Estamos atualizando o estoque. Volte em breve!"; if (b) b.hidden = true; }
  }

  // O Firebase só é carregado quando precisa (pedido, visita ou galeria de fotos)
  let ctxP = null;
  const ctx = function () { return ctxP || (ctxP = iniciar()); };
  const jaContou = {};
  window.LANDORA = {
    modo: "firebase",
    salvarLead: async function (dd) {
      const c = await ctx(), f = c.fs;
      const lead = {
        nome: String(dd.nome).slice(0, 100), whatsapp: String(dd.whatsapp).slice(0, 20), carro: String(dd.carro || "").slice(0, 120),
        status: "novo", origem: "site", criadoEm: f.serverTimestamp()
      };
      // Logado no site: o pedido fica salvo no perfil da pessoa (página /conta/).
      const s = window.SESSAO;
      if (s && s.user) { lead.uid = s.user.uid; if (s.user.email) lead.email = String(s.user.email).slice(0, 120); }
      return f.addDoc(f.collection(c.db, "leads"), lead);
    },
    contarVisita: function (slug) {
      if (jaContou[slug]) return;
      jaContou[slug] = 1;
      try { if (sessionStorage.getItem("visto:" + slug)) return; sessionStorage.setItem("visto:" + slug, "1"); } catch (e) { /* sem sessionStorage */ }
      ctx().then(function (c) { return c.fs.updateDoc(c.fs.doc(c.db, "carros", slug), { procura: c.fs.increment(1) }); }).catch(function () {});
      const car = carros.filter(function (x) { return x.slug === slug; })[0];
      if (car) car.procura = (car.procura || 0) + 1;
    },
    // Fotos da galeria vêm do Firestore só quando o carro é aberto.
    // Fotos guardadas no aparelho: abrem na hora nas próximas visitas.
    _midia: Object.assign({}, d.midia || {}),
    preparar: function (c) {
      if (c._pronto) return Promise.resolve();
      const guard = window.LANDORA._midia;
      return Promise.all(c.galeria.map(function (g) {
        if (!g.midia || g._full) return null;
        const viaSdk = function () { return ctx().then(function (cx) { return carregar(cx, g); }); };
        return midiaRest(g.midia, guard).catch(viaSdk)
          .then(function (u) { g.src = u || c.foto.src; }, function () { g.src = c.foto.src; })
          .then(function () { g._full = true; });
      }).filter(Boolean)).then(function () {
        c._pronto = true;
        lerCache().then(function (cc) { if (cc && cc.dados) { cc.dados.midia = Object.assign({}, cc.dados.midia || {}, guard); gravarCache(cc.dados); } });
      }, function () { c._pronto = true; });
    }
  };
}

async function carregarDoFirebase() {
  const guardado = await lerCache();
  if (guardado && guardado.dados && guardado.dados.carros) {
    // Abre na hora com o que está no aparelho e, em segundo plano, baixa só o que mudou.
    montarSite(guardado.dados);
    buscarDados(guardado.dados).then(function (novo) {
      novo.midia = Object.assign({}, guardado.dados.midia || {}, novo.midia || {}, (window.LANDORA && window.LANDORA._midia) || {});
      gravarCache(novo);
    }).catch(function () {});
    return;
  }
  const dados = await buscarDados();
  montarSite(dados);
  gravarCache(dados);
}

/* ---------- Modo demonstração (arquivos locais) ---------- */
async function carregarDemo() {
  await carregarScript("js/carros.js");
  window.LANDORA = { modo: "demo" };
}

(async function () {
  try {
    await carregarDoFirebase();
  } catch (e) {
    if (e && e.message !== "nao-iniciado") console.warn("AutoCar: usando os carros de exemplo.", e);
    try { await carregarDemo(); } catch (e2) { console.error(e2); window.CARROS = []; window.ADICIONAIS = []; window.LANDORA = { modo: "demo" }; }
  }
  try {
    for (const s of ["js/busca.js", "js/main.js", "js/cinema.js"]) await carregarScript(s);
  } catch (e) { console.error(e); }
})();
