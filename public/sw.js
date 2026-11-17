const VERSAO = "v2";
const SITE = "autocar-site-" + VERSAO;
const IMAGENS = "autocar-img-" + VERSAO;
const FOTOS = "autocar-fotos-" + VERSAO;
const SDK = "autocar-sdk-" + VERSAO;
const LIMITE = { [IMAGENS]: 120, [FOTOS]: 150 };
const BASICO = ["/", "/css/site.css", "/js/dados.js", "/js/main.js", "/js/busca.js", "/js/cinema.js", "/js/modelo.js", "/js/midia.js", "/js/pixel.js", "/js/cookies.js", "/js/sessao.js", "/js/firebase-boot.js", "/js/firebase-config.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(SITE).then(function (c) { return c.addAll(BASICO); }).catch(function () {}).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  const atuais = [SITE, IMAGENS, FOTOS, SDK];
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("autocar-") === 0 && atuais.indexOf(k) < 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

async function aparar(nome) {
  const c = await caches.open(nome), ks = await c.keys(), max = LIMITE[nome];
  if (max && ks.length > max) await Promise.all(ks.slice(0, ks.length - max).map(function (k) { return c.delete(k); }));
}

async function primeiroCache(req, nome, chave) {
  const c = await caches.open(nome);
  const achou = await c.match(chave || req);
  if (achou) return achou;
  const r = await fetch(req);
  if (r.ok) { c.put(chave || req, r.clone()).then(function () { return aparar(nome); }); }
  return r;
}

async function cacheAtualiza(req, nome) {
  const c = await caches.open(nome);
  const achou = await c.match(req);
  const rede = fetch(req).then(function (r) {
    if (r.ok) c.put(req, r.clone()).then(function () { return aparar(nome); });
    return r;
  });
  if (achou) { rede.catch(function () {}); return achou; }
  return rede;
}

async function primeiroRede(req) {
  const c = await caches.open(SITE);
  try {
    const r = await fetch(req);
    if (r.ok && r.type === "basic") c.put(req, r.clone());
    return r;
  } catch (e) {
    const achou = await c.match(req, { ignoreSearch: req.mode === "navigate" });
    if (achou) return achou;
    if (req.mode === "navigate") { const home = await c.match("/"); if (home) return home; }
    throw e;
  }
}

self.addEventListener("fetch", function (e) {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);

  if (u.hostname === "firestore.googleapis.com") {
    if (/\/documents\/midia\/[^/]+$/.test(u.pathname)) e.respondWith(primeiroCache(req, FOTOS, u.origin + u.pathname));
    return;
  }
  if (u.hostname === "www.gstatic.com" && u.pathname.indexOf("/firebasejs/") === 0) { e.respondWith(primeiroCache(req, SDK)); return; }
  if (u.origin !== self.location.origin) return;
  if (u.pathname.indexOf("/admin") === 0 || u.pathname.indexOf("/__/") === 0 || u.pathname === "/sw.js") return;

  if (/\.(webp|png|jpe?g|avif|svg|ico|woff2)$/.test(u.pathname)) { e.respondWith(cacheAtualiza(req, IMAGENS)); return; }
  e.respondWith(primeiroRede(req));
});
