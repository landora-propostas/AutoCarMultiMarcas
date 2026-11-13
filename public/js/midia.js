// Fotos: redução no navegador, gravação (Firestore ou Storage) e leitura.
//
// Uma foto é um objeto { src?, midia?, path?, thumb?, alt, pos }:
//   src    endereço da imagem (arquivo do site ou URL do Storage)
//   midia  ID do documento em "midia" (quando o armazenamento é "firestore")
//   path   caminho no Storage (para apagar depois)
//   thumb  miniatura embutida (só na capa do carro, para a vitrine carregar rápido)
//   alt    descrição para acessibilidade       pos  ponto de foco ("50% 60%")

const LIMITE_DOC = 900000; // caracteres do data URL; o Firestore aceita ~1 MiB por documento
const cache = new Map();   // ID da mídia -> data URL

function lerDataUrl(blob) {
  return new Promise(function (ok, erro) {
    const r = new FileReader();
    r.onload = function () { ok(r.result); };
    r.onerror = function () { erro(new Error("Não consegui ler o arquivo.")); };
    r.readAsDataURL(blob);
  });
}

async function abrirImagem(arquivo) {
  if (window.createImageBitmap) {
    try { return await createImageBitmap(arquivo); } catch (e) { /* tenta pelo <img> */ }
  }
  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise(function (ok, erro) {
      const i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { erro(new Error("Esse arquivo não parece ser uma imagem válida.")); };
      i.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

function desenhar(img, maiorLado) {
  const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
  const k = Math.min(1, maiorLado / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w0 * k));
  c.height = Math.max(1, Math.round(h0 * k));
  const x = c.getContext("2d");
  x.imageSmoothingQuality = "high";
  x.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function paraBlob(canvas, tipo, q) {
  return new Promise(function (ok) { canvas.toBlob(ok, tipo, q); });
}

// WebP quando o navegador sabe gerar; senão JPEG (ou PNG se precisar de transparência).
async function codificar(canvas, transparente, q) {
  let b = await paraBlob(canvas, "image/webp", q);
  if (!b || b.type !== "image/webp") b = await paraBlob(canvas, transparente ? "image/png" : "image/jpeg", q);
  return b;
}

// Reduz a imagem. opts: max (maior lado em px), qualidade, miniatura (px, 0 = sem), transparente,
// limite (tamanho máximo do data URL; Infinity para o Storage).
export async function processar(arquivo, opts) {
  opts = opts || {};
  const limite = opts.limite == null ? LIMITE_DOC : opts.limite;
  if (!/^image\//.test(arquivo.type)) throw new Error("Escolha um arquivo de imagem (JPG, PNG, WebP ou SVG).");
  if (arquivo.type === "image/svg+xml") {
    if (arquivo.size > 200000) throw new Error("O SVG está grande demais (máximo 200 KB).");
    return { blob: arquivo, dataUrl: await lerDataUrl(arquivo), tipo: arquivo.type, w: 0, h: 0, thumbDataUrl: null };
  }
  const bmp = await abrirImagem(arquivo);
  let lado = opts.max || 1600, q = opts.qualidade || 0.82, canvas, blob, dataUrl;
  for (let t = 0; t < 6; t++) {
    canvas = desenhar(bmp, lado);
    blob = await codificar(canvas, !!opts.transparente, q);
    dataUrl = await lerDataUrl(blob);
    if (dataUrl.length <= limite) break;
    q = Math.max(0.5, q - 0.1);
    lado = Math.round(lado * 0.88);
  }
  if (dataUrl.length > limite) throw new Error("A imagem continua pesada demais depois de reduzida. Tente uma menor.");
  let thumbDataUrl = null;
  if (opts.miniatura) thumbDataUrl = await lerDataUrl(await codificar(desenhar(bmp, opts.miniatura), false, 0.62));
  return { blob: blob, dataUrl: dataUrl, tipo: blob.type, w: canvas.width, h: canvas.height, thumbDataUrl: thumbDataUrl };
}

// Gera uma miniatura a partir de um data URL (usado quando uma foto antiga vira capa).
export const CAPA_LADO = 480;
export async function miniaturaDe(dataUrl, maiorLado, q) {
  const blob = await (await fetch(dataUrl)).blob();
  const bmp = await abrirImagem(blob);
  return lerDataUrl(await codificar(desenhar(bmp, maiorLado || CAPA_LADO), false, q || 0.62));
}

function extensao(tipo) {
  return tipo === "image/webp" ? "webp" : tipo === "image/png" ? "png" : tipo === "image/svg+xml" ? "svg" : "jpg";
}

// Grava uma imagem já processada. Devolve { midia } ou { src, path }.
export async function gravar(ctx, proc, opts) {
  opts = opts || {};
  if (ctx.opcoes.armazenamento === "storage") {
    const s = ctx.storageSdk;
    const path = (opts.pasta || "imagens") + "/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "." + extensao(proc.tipo);
    const r = s.ref(ctx.storage, path);
    await s.uploadBytes(r, proc.blob, { contentType: proc.tipo, cacheControl: "public,max-age=31536000" });
    return { src: await s.getDownloadURL(r), path: path };
  }
  const f = ctx.fs;
  const ref = await f.addDoc(f.collection(ctx.db, "midia"), {
    data: proc.dataUrl, tipo: proc.tipo, w: proc.w, h: proc.h,
    nome: String(opts.nome || "").slice(0, 120), criadoEm: f.serverTimestamp()
  });
  cache.set(ref.id, proc.dataUrl);
  return { midia: ref.id };
}

// Endereço utilizável de uma foto (lê do Firestore se for preciso).
export async function carregar(ctx, img) {
  if (!img) return "";
  if (img.src) return img.src;
  if (!img.midia) return img.thumb || "";
  if (cache.has(img.midia)) return cache.get(img.midia);
  const s = await ctx.fs.getDoc(ctx.fs.doc(ctx.db, "midia", img.midia));
  const url = s.exists() ? s.data().data : (img.thumb || "");
  cache.set(img.midia, url);
  return url;
}

export async function apagar(ctx, img) {
  try {
    if (img.path && ctx.storage) await ctx.storageSdk.deleteObject(ctx.storageSdk.ref(ctx.storage, img.path));
    else if (img.midia) await ctx.fs.deleteDoc(ctx.fs.doc(ctx.db, "midia", img.midia));
  } catch (e) { /* já não existe: tudo bem */ }
  if (img.midia) cache.delete(img.midia);
}

export function chaveDe(img) { return img ? (img.midia || img.path || img.src || "") : ""; }
