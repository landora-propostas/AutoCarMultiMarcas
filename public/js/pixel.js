const fila = [];
let id = "", carregado = false;

function carregar() {
  if (carregado || !id) return;
  carregado = true;
  const f = window.fbq = function () { f.callMethod ? f.callMethod.apply(f, arguments) : f.queue.push(arguments); };
  if (!window._fbq) window._fbq = f;
  f.push = f; f.loaded = true; f.version = "2.0"; f.queue = [];
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  window.fbq("init", id);
  window.fbq("track", "PageView");
  fila.splice(0).forEach(function (e) { window.fbq("track", e[0], e[1]); });
}

export function rastrear(evento, dados) {
  if (!id) return;
  if (carregado) window.fbq("track", evento, dados || {});
  else fila.push([evento, dados || {}]);
}

export function iniciarPixel(valor) {
  valor = String(valor || "").replace(/\D/g, "");
  if (!/^\d{8,20}$/.test(valor) || id) return;
  id = valor;
  const eventos = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"];
  const primeira = function () {
    eventos.forEach(function (e) { window.removeEventListener(e, primeira, { passive: true }); });
    if ("requestIdleCallback" in window) requestIdleCallback(carregar, { timeout: 2000 }); else setTimeout(carregar, 200);
  };
  eventos.forEach(function (e) { window.addEventListener(e, primeira, { passive: true }); });
  document.addEventListener("click", function (e) {
    const a = e.target.closest('a[href^="https://wa.me"], a[href^="tel:"]');
    if (a) rastrear("Contact", { content_name: a.href.indexOf("tel:") === 0 ? "telefone" : "whatsapp" });
  });
}
