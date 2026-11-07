// Utilidades de interface do painel.
export const $ = function (s, r) { return (r || document).querySelector(s); };
export const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

export function esc(t) {
  return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

const ICONES = {
  editar: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  lixo: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6"/>',
  copiar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  olho: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  cima: '<path d="m6 15 6-6 6 6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  esq: '<path d="m15 6-6 6 6 6"/>',
  dir: '<path d="m9 6 6 6-6 6"/>',
  estrela: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  foto: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  enviar: '<path d="M12 16V4m-5 5 5-5 5 5M5 20h14"/>',
  zap: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>'
};
export function ico(nome) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONES[nome] || "") + "</svg>"; }

export function toast(msg, tipo) {
  const box = $("#toasts");
  const el = document.createElement("div");
  el.className = "toast" + (tipo === "erro" ? " erro" : tipo === "info" ? " info" : "");
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(function () { el.remove(); }, tipo === "erro" ? 7000 : 3800);
}

// Abre uma janela. Devolve { el, fechar }.
export function abrirModal(html, opcoes) {
  opcoes = opcoes || {};
  const m = $("#modal");
  m.className = "modal" + (opcoes.largo ? " largo" : "");
  m.innerHTML = '<div class="modal-corpo">' + html + "</div>";
  if (!m.open) m.showModal();
  const fechar = function () { if (m.open) m.close(); };
  m.onclick = function (e) { if (e.target === m && !opcoes.fixo) fechar(); };
  m.oncancel = function () { if (opcoes.fixo) return; };
  return { el: m, fechar: fechar };
}

export function confirmar(opcoes) {
  return new Promise(function (resolve) {
    const j = abrirModal(
      "<h2>" + esc(opcoes.titulo || "Confirmar") + "</h2>" +
      "<p>" + esc(opcoes.texto || "") + "</p>" +
      '<div class="modal-acoes"><button class="btn" type="button" data-nao>Cancelar</button>' +
      '<button class="btn ' + (opcoes.perigo ? "perigo" : "primary") + '" type="button" data-sim>' + esc(opcoes.ok || "Confirmar") + "</button></div>",
      { fixo: true }
    );
    let feito = false;
    const fim = function (v) { if (feito) return; feito = true; j.el.removeEventListener("close", aoFechar); j.fechar(); resolve(v); };
    const aoFechar = function () { fim(false); };
    j.el.addEventListener("close", aoFechar);
    j.el.querySelector("[data-sim]").onclick = function () { fim(true); };
    j.el.querySelector("[data-nao]").onclick = function () { fim(false); };
  });
}

export function debounce(fn, ms) {
  let t;
  return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); };
}

export function milis(ts) {
  if (ts && typeof ts.toMillis === "function") return ts.toMillis();
  if (ts instanceof Date) return ts.getTime();
  if (ts && ts.seconds) return ts.seconds * 1000;
  return 0;
}

export function dataHora(ts) {
  let d = null;
  if (ts && typeof ts.toDate === "function") d = ts.toDate();
  else if (ts instanceof Date) d = ts;
  else if (ts && ts.seconds) d = new Date(ts.seconds * 1000);
  return d ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

// Mostra "1.234" enquanto se digita; devolve só o número.
export function mascaraNumero(input) {
  const n = parseInt(String(input.value).replace(/\D/g, ""), 10);
  input.value = isNaN(n) ? "" : n.toLocaleString("pt-BR");
  return isNaN(n) ? 0 : n;
}

export function copiarTexto(t) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
  return Promise.reject(new Error("sem área de transferência"));
}

export function ordenarPor(lista, campo) {
  return lista.slice().sort(function (a, b) { return (a[campo] || 0) - (b[campo] || 0); });
}

// Link do WhatsApp a partir de um telefone brasileiro.
export function linkWhats(tel, texto) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return "https://wa.me/" + d + (texto ? "?text=" + encodeURIComponent(texto) : "");
}
