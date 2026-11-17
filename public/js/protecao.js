const PROVEDORES = [
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.com.br", "outlook.com", "outlook.com.br", "live.com", "live.com.br", "msn.com",
  "yahoo.com", "yahoo.com.br", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br", "globo.com", "globomail.com", "r7.com", "zipmail.com.br",
  "proton.me", "protonmail.com", "aol.com", "gmx.com", "zoho.com"
];
const FORMATO = /^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function checarEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!FORMATO.test(e) || e.length > 120) return "Digite um e-mail válido.";
  const dominio = e.split("@")[1];
  if (PROVEDORES.indexOf(dominio) < 0) return "Use um e-mail de um provedor conhecido (Gmail, Outlook, Hotmail, Yahoo, iCloud, UOL, BOL, Terra…).";
  return "";
}

const CHAVE = "autocar:tentativas";
const PASSOS = [0, 0, 0, 30, 60, 300, 900, 1800, 3600];

function ler() { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } }
function gravar(o) { try { localStorage.setItem(CHAVE, JSON.stringify(o)); } catch (e) { } }
function espera(falhas) { return PASSOS[Math.min(falhas, PASSOS.length - 1)] * 1000; }

export function tempoTxt(ms) {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s + " s";
  const m = Math.floor(s / 60), r = s % 60;
  return m + " min" + (r ? " " + r + " s" : "");
}

export function bloqueio(email) {
  const o = ler(), agora = Date.now();
  const k = String(email || "").trim().toLowerCase();
  const a = Math.max((o[k] && o[k].ate) || 0, (o._ && o._.ate) || 0);
  return a > agora ? a - agora : 0;
}

export function falhou(email) {
  const o = ler(), agora = Date.now();
  const k = String(email || "").trim().toLowerCase();
  [k, "_"].forEach(function (id) {
    const x = o[id] && agora - (o[id].em || 0) < 86400000 ? o[id] : { falhas: 0 };
    x.falhas += 1; x.em = agora;
    const t = id === "_" ? espera(Math.max(0, x.falhas - 3)) : espera(x.falhas);
    x.ate = t ? agora + t : 0;
    o[id] = x;
  });
  gravar(o);
  return bloqueio(email);
}

export function acertou(email) {
  const o = ler();
  delete o[String(email || "").trim().toLowerCase()];
  if (o._) { o._.falhas = Math.max(0, o._.falhas - 1); o._.ate = 0; }
  gravar(o);
}

export function errouSenha(err) {
  const c = (err && err.code) || "";
  return c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found" || c === "auth/invalid-login-credentials";
}

const LIMITES = "autocar:pedidos";
export function podePedir(acao) {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(LIMITES)) || {}; } catch (e) { o = {}; }
  const agora = Date.now();
  const lista = (o[acao] || []).filter(function (t) { return agora - t < 3600000; });
  if (lista.length && agora - lista[lista.length - 1] < 60000) return 60000 - (agora - lista[lista.length - 1]);
  if (lista.length >= 5) return 3600000 - (agora - lista[0]);
  lista.push(agora); o[acao] = lista;
  try { localStorage.setItem(LIMITES, JSON.stringify(o)); } catch (e) { }
  return 0;
}
