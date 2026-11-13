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
  const lista = categorias.filter(function (c) { return c.ativa !== false && usadas[c.id]; })
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

/* ---------- Modo real (Firestore) ---------- */
async function carregarDoFirebase() {
  const ctx = await iniciar();
  const f = ctx.fs, db = ctx.db;
  const [cfgSnap, cs, cars, ads] = await Promise.all([
    f.getDoc(f.doc(db, "config", "site")),
    f.getDocs(f.collection(db, "categorias")),
    f.getDocs(f.query(f.collection(db, "carros"), f.where("status", "==", "publicado"))),
    f.getDocs(f.collection(db, "adicionais"))
  ]);
  if (!cfgSnap.exists() || !cfgSnap.data().inicializado) throw new Error("nao-iniciado");
  const lista = function (s) { return s.docs.map(function (d) { const o = d.data(); o.id = d.id; return o; }); };
  const cfg = cfgSnap.data(), categorias = lista(cs), adicionais = lista(ads);
  const carros = lista(cars).map(function (c) { return carroParaSite(c, adicionais); })
    .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  const urls = await resolverImagens(ctx, cfg);

  window.ADICIONAIS = [];
  window.CARROS = carros;
  pintarCategorias(categorias, carros);
  aplicarSite(cfg, urls);
  if (!carros.length) {
    const v = $("#vazio");
    if (v) { v.hidden = false; const p = $("p", v), b = $("button", v); if (p) p.textContent = "Estamos atualizando o estoque. Volte em breve!"; if (b) b.hidden = true; }
  }

  const jaContou = {};
  window.LANDORA = {
    modo: "firebase",
    salvarLead: function (d) {
      return f.addDoc(f.collection(db, "leads"), {
        nome: String(d.nome).slice(0, 100), whatsapp: String(d.whatsapp).slice(0, 20), carro: String(d.carro || "").slice(0, 120),
        status: "novo", origem: "site", criadoEm: f.serverTimestamp()
      });
    },
    contarVisita: function (slug) {
      if (jaContou[slug]) return;
      jaContou[slug] = 1;
      try { if (sessionStorage.getItem("visto:" + slug)) return; sessionStorage.setItem("visto:" + slug, "1"); } catch (e) { /* sem sessionStorage */ }
      f.updateDoc(f.doc(db, "carros", slug), { procura: f.increment(1) }).catch(function () {});
      const c = carros.filter(function (x) { return x.slug === slug; })[0];
      if (c) c.procura = (c.procura || 0) + 1;
    },
    // Fotos da galeria vêm do Firestore só quando o carro é aberto.
    preparar: function (c) {
      if (c._pronto) return Promise.resolve();
      return Promise.all(c.galeria.map(function (g) {
        if (!g.midia || g._full) return null;
        return carregar(ctx, g).then(function (u) { g.src = u || c.foto.src; }, function () { g.src = c.foto.src; }).then(function () { g._full = true; });
      }).filter(Boolean)).then(function () { c._pronto = true; });
    }
  };
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
    for (const s of ["js/busca.js", "js/main.js", "js/fx.js"]) await carregarScript(s);
  } catch (e) { console.error(e); }
})();
