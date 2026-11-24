import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUB = join(RAIZ, "public");
const SAIDA = join(PUB, "carro");
const SITE = (process.env.SITE_URL || "https://autocarpiraju.com.br").replace(/\/$/, "");
const LIMITE_FOTO = 290000;

const projeto = JSON.parse(readFileSync(join(RAIZ, ".firebaserc"), "utf8")).projects.default;
const BASE = process.env.FS_BASE || "https://firestore.googleapis.com/v1/projects/" + projeto + "/databases/(default)/documents";

function valor(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("mapValue" in v) return doc(v.mapValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(valor);
  return null;
}
function doc(d) {
  const o = {};
  Object.entries((d && d.fields) || {}).forEach(([k, v]) => { o[k] = valor(v); });
  if (d && d.name) o.id = d.name.split("/").pop();
  return o;
}
async function json(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error(url.split("?")[0] + " respondeu " + r.status);
  return r.json();
}
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const milhar = (n) => Number(n || 0).toLocaleString("pt-BR");

function dataUrl(u) {
  const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(u || "");
  return m ? { tipo: m[1], bytes: Buffer.from(m[2], "base64") } : null;
}
const EXT = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

async function imagemDe(c) {
  const capa = c.foto && (c.foto.midia || c.foto.thumb || c.foto.src) ? c.foto : (c.galeria || [])[0];
  if (!capa) return null;
  if (/^https:\/\//.test(capa.src || "")) return { url: capa.src };
  let img = null;
  if (capa.midia) {
    try { img = dataUrl(doc(await json(BASE + "/midia/" + encodeURIComponent(capa.midia))).data); } catch (e) { img = null; }
    if (img && img.bytes.length > LIMITE_FOTO) img = null;
  }
  if (!img) img = dataUrl(capa.thumb || capa.src);
  if (!img || !EXT[img.tipo]) return null;
  const nome = c.slug + "." + EXT[img.tipo];
  writeFileSync(join(SAIDA, "img", nome), img.bytes);
  return { url: SITE + "/carro/img/" + nome, tipo: img.tipo };
}

const REDIRECT = '<script>(function(h){if(h==="autocar-multimarcas.web.app"||h==="autocar-multimarcas.firebaseapp.com")location.replace("https://autocarpiraju.com.br"+location.pathname+location.search+location.hash)})(location.hostname)</script>';
const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">\n  <script>document.addEventListener("gesturestart",function(e){e.preventDefault()},{passive:false});document.addEventListener("touchmove",function(e){if(e.touches&&e.touches.length>1)e.preventDefault()},{passive:false})</script>';
const soNum = (t) => String(t || "").replace(/\D/g, "");
function linkZap(loja, txt) {
  const n = soNum(loja.whatsapp) || "14996547171";
  return "https://wa.me/" + (n.length <= 11 ? "55" : "") + n + "?text=" + encodeURIComponent(txt);
}
function anoDe(c) { const a = String(c.ano || "").match(/\d{4}/g) || []; return a[a.length - 1] || ""; }
function precoTxt(c) { return c.preco > 0 ? "R$ " + milhar(c.preco) : "Consulte"; }
const ESTILO = `@font-face{font-family:Archivo;src:url(/fonts/archivo.woff2) format("woff2");font-weight:100 900;font-stretch:62% 125%;font-display:swap}
@font-face{font-family:Manrope;src:url(/fonts/manrope.woff2) format("woff2");font-weight:200 800;font-display:swap}
*{box-sizing:border-box}html,body{overflow-x:clip;max-width:100%;touch-action:pan-x pan-y;-webkit-text-size-adjust:100%}
body{margin:0;background:#121212;color:#f2f2f2;font:16px/1.55 Manrope,system-ui,sans-serif}
a{color:inherit}img{max-width:100%;display:block}
.w{width:min(100% - 32px,1040px);margin:0 auto}
header{border-bottom:1px solid #262626}header .w{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0}
header img{height:40px;width:auto}header a.v{font-size:14px;color:#bdbdbd;text-decoration:none}
h1,h2{font-family:Archivo,system-ui,sans-serif;line-height:1.1;margin:0}h1{font-size:clamp(28px,6vw,44px)}h2{font-size:20px;margin:0 0 12px}
.topo{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:32px;padding:28px 0}
.foto{border-radius:18px;overflow:hidden;background:#1c1c1c;aspect-ratio:4/3}.foto img{width:100%;height:100%;object-fit:cover}
.preco{font:800 32px Archivo,system-ui,sans-serif;color:#fcd308;margin:14px 0 4px}.cat{color:#bdbdbd;font-size:14px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 8px}
dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}dl div{background:#1a1a1a;border:1px solid #262626;border-radius:12px;padding:10px 12px}dt{font-size:12px;color:#9a9a9a}dd{margin:0;font-weight:700}
.bts{display:grid;gap:10px;margin-top:20px}.bt{display:flex;justify-content:center;align-items:center;min-height:52px;border-radius:999px;font-weight:800;text-decoration:none;padding:0 22px}
.bt.p{background:#fcd308;color:#141414}.bt.s{border:1px solid #3a3a3a}
section{padding:22px 0;border-top:1px solid #262626}ul{margin:0;padding-left:20px}li{margin:4px 0}.desc{white-space:pre-line;color:#d5d5d5}
footer{border-top:1px solid #262626;margin-top:20px;padding:24px 0 40px;color:#9a9a9a;font-size:14px}footer p{margin:4px 0}
.lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;padding:24px 0;list-style:none;margin:0}
.lista li{margin:0;background:#1a1a1a;border:1px solid #262626;border-radius:16px;overflow:hidden}.lista a{text-decoration:none;display:block}
.lista .foto{border-radius:0}.lista div.t{padding:12px 14px}.lista b{display:block;font-size:16px}.lista span{color:#bdbdbd;font-size:14px}.lista strong{display:block;color:#fcd308;margin-top:4px}
.vendido-aviso{display:none;margin:18px 0 0;padding:16px;border:1px solid #3a3a3a;border-radius:14px;background:#1a1a1a}.vendido-aviso b{display:block;font-size:18px}.vendido-aviso span{display:block;color:#bdbdbd;margin:4px 0 12px}
html.vendido .vendido-aviso{display:block}html.vendido .topo .bts,html.vendido dl,html.vendido .preco{display:none}html.vendido .foto img{filter:grayscale(1);opacity:.6}
@media (max-width:520px){.lista{grid-template-columns:1fr 1fr;gap:10px}.lista b{font-size:14px}.lista div.t{padding:10px}}
@media (max-width:760px){.topo{grid-template-columns:minmax(0,1fr);gap:18px;padding:18px 0}}`;
function casca({ titulo, desc, url, imagem, tipo, alt, schema, corpo, ogTipo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  ${REDIRECT}
  ${VIEWPORT}
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="${ogTipo || "website"}">
  <meta property="og:site_name" content="AutoCar Multimarcas">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(imagem)}">
${tipo ? `  <meta property="og:image:type" content="${tipo}">\n` : ""}  <meta property="og:image:alt" content="${esc(alt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${esc(imagem)}">
  <meta name="theme-color" content="#121212">
  <meta name="color-scheme" content="dark">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
  <link rel="preload" href="/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
${schema.map((s) => `  <script type="application/ld+json">${JSON.stringify(s).replace(/</g, "\\u003c")}</script>`).join("\n")}
  <style>${ESTILO}</style>
</head>
<body>
<header><div class="w"><a href="/"><img src="/img/logo-autocar.webp" width="400" height="120" alt="AutoCar Multimarcas"></a><a class="v" href="/estoque">Ver estoque</a></div></header>
<main class="w">
${corpo}
</main>
<footer><div class="w"><p><b>AutoCar Multimarcas</b> · DZ Autocar Veículos Ltda · CNPJ 09.128.179/0001-31</p><p>${esc(LOJA.endereco || "")}</p><p>${esc(LOJA.telefone || "")}${LOJA.horario ? " · " + esc(String(LOJA.horario).replace(/\n/g, " · ")) : ""}</p><p><a href="/privacidade">Política de privacidade</a></p></div></footer>
</body>
</html>
`;
}

let LOJA = {};
const local = (u) => String(u).replace(SITE, "");
const migalhas = (itens) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: itens.map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x[0], item: x[1] })) });

function pagina(c, img, nomeCat) {
  const ano = anoDe(c);
  const url = SITE + "/carro/" + c.slug;
  const titulo = c.nome + (ano && c.nome.indexOf(ano) < 0 ? " " + ano : "") + " | AutoCar Multimarcas";
  const partes = [c.preco > 0 ? "R$ " + milhar(c.preco) : "", ano, c.km > 0 ? milhar(c.km) + " km" : "", c.cambio, c.combustivel].filter(Boolean);
  const desc = partes.join(" · ") + ". Fale com um consultor da AutoCar Multimarcas em Piraju-SP.";
  const imagem = img ? img.url : SITE + "/img/og-autocar.jpg";
  const carro = {
    "@context": "https://schema.org", "@type": "Car", name: c.nome, url: url, image: imagem,
    brand: { "@type": "Brand", name: c.marca || c.nome.split(" ")[0] },
    itemCondition: c.condicao === "Novo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    seller: { "@type": "AutoDealer", "@id": SITE + "/#loja", name: "AutoCar Multimarcas" }
  };
  if (ano) carro.vehicleModelDate = ano;
  if (c.km > 0) carro.mileageFromOdometer = { "@type": "QuantitativeValue", value: c.km, unitCode: "KMT" };
  if (c.cor) carro.color = c.cor;
  if (c.combustivel) carro.fuelType = c.combustivel;
  if (c.cambio) carro.vehicleTransmission = c.cambio;
  if (c.motor) carro.vehicleEngine = { "@type": "EngineSpecification", name: c.motor };
  if (c.descricao) carro.description = String(c.descricao).slice(0, 500);
  if (c.preco > 0) carro.offers = { "@type": "Offer", price: c.preco, priceCurrency: "BRL", availability: "https://schema.org/InStock", url: url, seller: { "@id": SITE + "/#loja" } };
  const ficha = [["Ano", c.ano], ["Quilometragem", c.km > 0 ? milhar(c.km) + " km" : c.km === 0 ? "0 km" : ""], ["Câmbio", c.cambio], ["Combustível", c.combustivel], ["Motor", c.motor], ["Potência", c.potencia], ["Cor", c.cor], ["Condição", c.condicao]]
    .concat((c.ficha || []).map((x) => [x && x.rotulo, x && x.valor])).filter((x) => x[0] && x[1] !== "" && x[1] != null);
  const destaques = (c.destaques || []).filter((x) => x && (x.rotulo || x.valor));
  const hist = (c.historico || []).filter(Boolean);
  const ads = (c.adicionaisLista || []);
  const zap = linkZap(LOJA, "Olá! Tenho interesse no " + c.nome + (c.preco > 0 ? " (R$ " + milhar(c.preco) + ")" : "") + ".\n" + url);
  const corpo = `<div class="topo">
  <div class="foto"><img src="${esc(local(imagem))}" alt="${esc(c.nome)}" width="1200" height="900"></div>
  <div>
    ${nomeCat ? `<p class="cat">${esc(nomeCat)}</p>` : ""}<h1>${esc(c.nome)}</h1>
    <p class="preco">${esc(precoTxt(c))}</p>
    <div class="vendido-aviso"><b>Este carro já foi vendido.</b><span>Veja os outros carros disponíveis na AutoCar.</span><a class="bt p" href="/estoque">Ver carros disponíveis</a></div>
    <dl>${ficha.slice(0, 6).map((x) => `<div><dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl>
    <div class="bts"><a class="bt p" href="${esc(zap)}" target="_blank" rel="noopener">Falar com consultor no WhatsApp</a><a class="bt s" href="/#carro/${esc(encodeURIComponent(c.slug))}">Ver todas as fotos</a></div>
  </div>
</div>
${destaques.length ? `<section><h2>Destaques</h2><ul>${destaques.map((x) => `<li>${esc([x.rotulo, x.valor].filter(Boolean).join(": "))}</li>`).join("")}</ul></section>` : ""}
${c.descricao ? `<section><h2>Sobre o carro</h2><p class="desc">${esc(c.descricao)}</p></section>` : ""}
${ficha.length > 6 ? `<section><h2>Ficha técnica</h2><dl>${ficha.slice(6).map((x) => `<div><dt>${esc(x[0])}</dt><dd>${esc(x[1])}</dd></div>`).join("")}</dl></section>` : ""}
${hist.length ? `<section><h2>Histórico</h2><ul>${hist.map((h) => `<li>${esc(h)}</li>`).join("")}</ul></section>` : ""}
${ads.length ? `<section><h2>Adicionais da entrega</h2><ul>${ads.map((a) => `<li><b>${esc(a[0])}</b>${a[1] ? " · " + esc(a[1]) : ""}</li>`).join("")}</ul></section>` : ""}
<script>(function(){fetch('/__/firebase/init.json').then(function(r){return r.json()}).then(function(c){return fetch('https://firestore.googleapis.com/v1/projects/'+c.projectId+'/databases/(default)/documents/carros/${c.slug}?mask.fieldPaths=status&key='+c.apiKey)}).then(function(r){if(r.status===403||r.status===404){document.documentElement.classList.add('vendido');return null}return r.ok?r.json():null}).then(function(j){if(j&&!(j.fields&&j.fields.status&&j.fields.status.stringValue==='publicado'))document.documentElement.classList.add('vendido')}).catch(function(){})})()</script>
<section><h2>Onde ver este carro</h2><p>AutoCar Multimarcas, ${esc(LOJA.endereco || "Piraju-SP")}. Agende uma visita ou peça uma proposta pelo WhatsApp.</p></section>`;
  return casca({ titulo, desc, url, imagem, tipo: img && img.tipo, alt: c.nome, ogTipo: "product", corpo,
    schema: [carro, migalhas([["Início", SITE + "/"], ["Estoque", SITE + "/estoque"], [c.nome, url]])] });
}

function paginaEstoque(itens) {
  const url = SITE + "/estoque";
  const titulo = "Estoque de seminovos em Piraju-SP | AutoCar Multimarcas";
  const desc = itens.length + " carros, picapes e motos seminovos à venda em Piraju-SP, com preço, ano e quilometragem. Fale com um consultor pelo WhatsApp.";
  const lista = { "@context": "https://schema.org", "@type": "ItemList", name: "Estoque AutoCar Multimarcas", numberOfItems: itens.length,
    itemListElement: itens.map(([c], i) => ({ "@type": "ListItem", position: i + 1, url: SITE + "/carro/" + c.slug, name: c.nome })) };
  const corpo = `<div style="padding:28px 0 0"><h1>Estoque de seminovos</h1><p style="color:#bdbdbd">${itens.length} veículos disponíveis na AutoCar Multimarcas, em Piraju-SP.</p></div>
<ul class="lista">${itens.map(([c, img]) => `<li><a href="/carro/${esc(c.slug)}"><div class="foto"><img src="${esc(local(img ? img.url : SITE + "/img/og-autocar.jpg"))}" alt="${esc(c.nome)}" loading="lazy" width="400" height="300"></div><div class="t"><b>${esc(c.nome)}</b><span>${esc([anoDe(c), c.km > 0 ? milhar(c.km) + " km" : "", c.cambio].filter(Boolean).join(" · "))}</span><strong>${esc(precoTxt(c))}</strong></div></a></li>`).join("")}</ul>`;
  return casca({ titulo, desc, url, imagem: SITE + "/img/og-autocar.jpg", alt: "AutoCar Multimarcas", corpo, schema: [lista, migalhas([["Início", SITE + "/"], ["Estoque", url]])] });
}

function llms(itens) {
  const L = LOJA;
  return `# AutoCar Multimarcas

> Loja de carros, picapes e motos seminovos em Piraju-SP (DZ Autocar Veículos Ltda, CNPJ 09.128.179/0001-31). Compra, venda, troca, financiamento, consórcio e seguro.

- Endereço: ${L.endereco || "Piraju-SP"}
- Telefone: ${L.telefone || ""}
- WhatsApp: ${L.whatsapp || ""}
- Horário: ${String(L.horario || "").replace(/\n/g, "; ")}
- Site: ${SITE}/
- Estoque completo: ${SITE}/estoque

## Estoque atual (${itens.length} veículos)

${itens.map(([c]) => `- [${c.nome}](${SITE}/carro/${c.slug}): ${[precoTxt(c), anoDe(c), c.km > 0 ? milhar(c.km) + " km" : "", c.cambio, c.combustivel].filter(Boolean).join(", ")}`).join("\n")}

## Páginas

- [Início](${SITE}/)
- [Estoque](${SITE}/estoque)
- [Política de privacidade](${SITE}/privacidade)
`;
}

function sitemap(itens) {
  const u = (loc, mod, freq, pri) => `  <url><loc>${loc}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}<changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[u(SITE + "/", "", "daily", "1.0"), itens.length ? u(SITE + "/estoque", "", "daily", "0.9") : "", ...itens.map(([c]) => u(SITE + "/carro/" + c.slug, c.atualizado || "", "weekly", "0.8")), u(SITE + "/privacidade", "", "yearly", "0.3")].filter(Boolean).join("\n")}
</urlset>
`;
}

const ESTOQUE = join(PUB, "estoque.html"), LLMS = join(PUB, "llms.txt"), MAPA = join(PUB, "sitemap.xml");
try {
  rmSync(SAIDA, { recursive: true, force: true });
  rmSync(ESTOQUE, { force: true });
  mkdirSync(join(SAIDA, "img"), { recursive: true });
  const q = { from: [{ collectionId: "carros" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "publicado" } } } };
  const lista = async (col) => ((await json(BASE + "/" + col + "?pageSize=300")).documents || []).map(doc);
  const [res, site, cats, adicionais] = await Promise.all([
    json(BASE + ":runQuery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ structuredQuery: q }) }),
    json(BASE + "/config/site").then(doc).catch(() => ({})), lista("categorias").catch(() => []), lista("adicionais").catch(() => [])
  ]);
  let padrao = {};
  try { padrao = (await import(pathToFileURL(join(PUB, "js", "modelo.js")).href)).SITE_PADRAO.contato || {}; } catch (e) { padrao = {}; }
  LOJA = Object.assign({}, padrao, site.contato || {});
  const nomeCat = {}; cats.forEach((x) => { nomeCat[x.id] = x.nome || x.titulo || ""; });
  const carros = res.filter((r) => r.document).map((r) => Object.assign(doc(r.document), { atualizado: String(r.document.updateTime || "").slice(0, 10) }))
    .map((c) => Object.assign(c, { slug: c.slug || c.id }))
    .filter((c) => /^[a-z0-9-]+$/.test(c.slug))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const itens = [];
  for (const c of carros) {
    c.adicionaisLista = (c.adicionais || []).map((id) => adicionais.filter((a) => a.id === id && a.ativo !== false)[0]).filter(Boolean).map((a) => [a.titulo, a.descricao || ""])
      .concat((c.adicionaisExtras || []).filter((a) => a && a.titulo).map((a) => [a.titulo, a.descricao || ""]));
    const img = await imagemDe(c);
    writeFileSync(join(SAIDA, c.slug + ".html"), pagina(c, img, nomeCat[c.categoria]));
    itens.push([c, img]);
  }
  writeFileSync(ESTOQUE, paginaEstoque(itens));
  writeFileSync(LLMS, llms(itens));
  writeFileSync(MAPA, sitemap(itens));
  console.log("Páginas geradas: " + itens.length + " carros, /estoque, sitemap.xml e llms.txt.");
} catch (e) {
  writeFileSync(MAPA, sitemap([]));
  console.warn("Páginas dos carros não foram geradas (" + e.message + "). O sitemap ficou só com as páginas fixas.");
}
