import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAIDA = join(RAIZ, "public", "carro");
const SITE = (process.env.SITE_URL || "https://autocarpiraju.com.br").replace(/\/$/, "");
const LIMITE_FOTO = 290000;

const projeto = JSON.parse(readFileSync(join(RAIZ, ".firebaserc"), "utf8")).projects.default;
const BASE = "https://firestore.googleapis.com/v1/projects/" + projeto + "/databases/(default)/documents";

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

function pagina(c, img) {
  const anos = String(c.ano || "").match(/\d{4}/g) || [];
  const ano = anos[anos.length - 1] || "";
  const url = SITE + "/carro/" + c.slug;
  const titulo = c.nome + (ano && c.nome.indexOf(ano) < 0 ? " " + ano : "") + " | AutoCar Multimarcas";
  const partes = [c.preco > 0 ? "R$ " + milhar(c.preco) : "", ano, c.km > 0 ? milhar(c.km) + " km" : "", c.cambio, c.combustivel].filter(Boolean);
  const desc = partes.join(" · ") + ". Fale com um consultor da AutoCar Multimarcas em Piraju-SP.";
  const imagem = img ? img.url : SITE + "/img/og-autocar.jpg";
  const carro = {
    "@context": "https://schema.org", "@type": "Car", name: c.nome, url: url, image: imagem,
    brand: { "@type": "Brand", name: c.marca || c.nome.split(" ")[0] },
    itemCondition: c.condicao === "Novo" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    seller: { "@id": SITE + "/#loja" }
  };
  if (ano) carro.vehicleModelDate = ano;
  if (c.km > 0) carro.mileageFromOdometer = { "@type": "QuantitativeValue", value: c.km, unitCode: "KMT" };
  if (c.cor) carro.color = c.cor;
  if (c.combustivel) carro.fuelType = c.combustivel;
  if (c.cambio) carro.vehicleTransmission = c.cambio;
  if (c.descricao) carro.description = String(c.descricao).slice(0, 500);
  if (c.preco > 0) carro.offers = { "@type": "Offer", price: c.preco, priceCurrency: "BRL", availability: "https://schema.org/InStock", url: url };
  const destino = "/#carro/" + encodeURIComponent(c.slug);
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="AutoCar Multimarcas">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(imagem)}">
${img && img.tipo ? `  <meta property="og:image:type" content="${img.tipo}">\n` : ""}  <meta property="og:image:alt" content="${esc(c.nome)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(titulo)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${esc(imagem)}">
  <meta name="theme-color" content="#121212">
  <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
  <script type="application/ld+json">${JSON.stringify(carro).replace(/</g, "\\u003c")}</script>
  <script>location.replace(${JSON.stringify(destino)});</script>
  <style>body{margin:0;background:#121212;color:#f2f2f2;font:16px system-ui,sans-serif;display:grid;place-content:center;min-height:100vh;text-align:center}a{color:#fcd308}</style>
</head>
<body>
  <p><a href="${esc(destino)}">Ver ${esc(c.nome)} no site da AutoCar Multimarcas</a></p>
</body>
</html>
`;
}

try {
  rmSync(SAIDA, { recursive: true, force: true });
  mkdirSync(join(SAIDA, "img"), { recursive: true });
  const q = { from: [{ collectionId: "carros" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "publicado" } } } };
  const res = await json(BASE + ":runQuery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ structuredQuery: q }) });
  const carros = res.filter((r) => r.document).map((r) => doc(r.document)).map((c) => Object.assign(c, { slug: c.slug || c.id }));
  for (const c of carros) {
    if (!/^[a-z0-9-]+$/.test(c.slug)) continue;
    writeFileSync(join(SAIDA, c.slug + ".html"), pagina(c, await imagemDe(c)));
  }
  console.log("Páginas de compartilhamento: " + carros.length + " carros.");
} catch (e) {
  console.warn("Páginas de compartilhamento não foram geradas (" + e.message + "). Os links /carro/ continuam abrindo o carro no site.");
}
