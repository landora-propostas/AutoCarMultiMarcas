// Painel da AutoCar Multimarcas: login (Firebase Authentication), autorização e navegação.
import { iniciar } from "/js/firebase-boot.js";
import { OPCOES } from "/js/firebase-config.js";
import { $, $$, esc, toast } from "./ui.js";
import { criarRepo } from "./repo.js";

// Sem zoom por pinça (o iPhone ignora user-scalable=no).
["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false }); });
document.addEventListener("touchmove", function (e) { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });
import { painel } from "./views/painel.js";
import { carros } from "./views/carros.js";
import { categorias } from "./views/categorias.js";
import { adicionais } from "./views/adicionais.js";
import { pedidos } from "./views/pedidos.js";
import { site } from "./views/site.js";
import { equipe } from "./views/equipe.js";

const app = { ctx: null, repo: null, user: null, email: "", sujo: false, atualizarContador: atualizarContador, definirContador: definirContador };
const ROTAS = { painel: painel, carros: carros, categorias: categorias, adicionais: adicionais, pedidos: pedidos, site: site, equipe: equipe };

/* ---------- Telas ---------- */
function mostrar(estado) {
  $("#boot").hidden = true;
  const noApp = estado === "app";
  $("#tela-auth").hidden = noApp;
  $("#app").hidden = !noApp;
  if (noApp) return;
  const mapa = { entrar: "#auth-form", verificar: "#auth-verificar", negado: "#auth-negado", config: "#auth-config" };
  Object.keys(mapa).forEach(function (k) { $(mapa[k]).hidden = k !== estado; });
}

const ERROS_AUTH = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "Esse e-mail não parece válido.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Use “Entrar”.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/operation-not-allowed": "O login por e-mail e senha não está ativado. No Console do Firebase: Authentication → Método de login → E-mail/senha.",
  "auth/user-disabled": "Essa conta foi desativada."
};
function msgAuth(e) { return ERROS_AUTH[e && e.code] || "Não deu certo (" + ((e && (e.code || e.message)) || "erro desconhecido") + ")."; }

/* ---------- Login ---------- */
let modo = "entrar";
function definirModo(m) {
  modo = m;
  $$(".auth-tabs .tab").forEach(function (b) { b.classList.toggle("is-on", b.dataset.modo === m); });
  $$(".so-criar").forEach(function (el) { el.hidden = m !== "criar"; });
  $("#auth-enviar").textContent = m === "criar" ? "Criar conta" : "Entrar";
  $("#form-auth").elements.senha.autocomplete = m === "criar" ? "new-password" : "current-password";
  $("#auth-esqueci").hidden = m === "criar";
  erroAuth("");
}
function erroAuth(t) { const e = $("#auth-erro"); e.textContent = t; e.hidden = !t; }

function ligarLogin() {
  $$(".auth-tabs .tab").forEach(function (b) { b.onclick = function () { definirModo(b.dataset.modo); }; });
  $("#form-auth").onsubmit = async function (ev) {
    ev.preventDefault();
    const f = ev.target, a = app.ctx.authSdk, auth = app.ctx.auth;
    const email = f.elements.email.value.trim().toLowerCase(), senha = f.elements.senha.value;
    if (!email || !senha) { erroAuth("Preencha e-mail e senha."); return; }
    if (modo === "criar" && senha !== f.elements.senha2.value) { erroAuth("As senhas não são iguais."); return; }
    const btn = $("#auth-enviar"); btn.disabled = true; erroAuth("");
    try {
      if (modo === "criar") {
        const cred = await a.createUserWithEmailAndPassword(auth, email, senha);
        try { await a.sendEmailVerification(cred.user); } catch (e) { /* dá para reenviar depois */ }
      } else {
        await a.signInWithEmailAndPassword(auth, email, senha);
      }
    } catch (e) { erroAuth(msgAuth(e)); }
    btn.disabled = false;
  };
  $("#auth-esqueci").onclick = async function () {
    const email = $("#form-auth").elements.email.value.trim();
    if (!email) { erroAuth("Digite seu e-mail acima e clique de novo."); return; }
    try { await app.ctx.authSdk.sendPasswordResetEmail(app.ctx.auth, email); erroAuth(""); toast("Enviamos o link para redefinir a senha, se o e-mail existir."); }
    catch (e) { erroAuth(msgAuth(e)); }
  };
  $("#ver-reenviar").onclick = async function () {
    try { await app.ctx.authSdk.sendEmailVerification(app.ctx.auth.currentUser); toast("E-mail reenviado."); }
    catch (e) { toast(msgAuth(e), "erro"); }
  };
  $("#ver-ja").onclick = async function () {
    const u = app.ctx.auth.currentUser;
    try { await u.reload(); await u.getIdToken(true); } catch (e) { /* segue */ }
    if (!u.emailVerified) { toast("Ainda não apareceu como confirmado. Confira o e-mail e tente de novo.", "info"); return; }
    aoMudarUsuario(app.ctx.auth.currentUser);
  };
  $("#neg-ja").onclick = function () { aoMudarUsuario(app.ctx.auth.currentUser); };
  $("#neg-copiar").onclick = function () {
    const t = $("#neg-uid").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("UID copiado."); }, function () { toast("Selecione e copie o código acima.", "info"); });
  };
  $$("[data-sair]").forEach(function (b) { b.onclick = sair; });
}
async function sair() { app.sujo = false; try { await app.ctx.authSdk.signOut(app.ctx.auth); } catch (e) { /* ok */ } }

async function aoMudarUsuario(user) {
  app.user = user;
  if (!user) { app.email = ""; mostrar("entrar"); return; }
  if (!user.emailVerified) { $("#ver-email").textContent = user.email; mostrar("verificar"); return; }
  const email = String(user.email || "").toLowerCase();
  let autorizado = false;
  app.repo.esquecer("admins");
  try { autorizado = !!(await app.repo.obter("admins", user.uid)); } catch (e) { autorizado = false; }
  if (!autorizado) { $("#neg-email").textContent = email; $("#neg-uid").textContent = user.uid; mostrar("negado"); return; }
  app.email = email;
  app.uid = user.uid;
  entrarNoApp();
}

/* ---------- Navegação ---------- */
let rotaAtual = "", ignorar = false, jaLigou = false, seq = 0;

function entrarNoApp() {
  $("#usuario").textContent = app.email;
  $("#usuario-ini").textContent = (app.email || "A").charAt(0).toUpperCase();
  $("#usuario-nome").textContent = (app.email || "").split("@")[0] || "Administrador";
  mostrar("app");
  if (!jaLigou) {
    jaLigou = true;
    window.addEventListener("hashchange", aoMudarHash);
    $("#menu-abrir").onclick = function () { menu(true); };
    $("#veu").onclick = function () { menu(false); };
    $("#nav").addEventListener("click", function () { menu(false); });
  }
  atualizarContador();
  rotear();
}
function menu(abrir) { $("#side").classList.toggle("aberto", abrir); $("#veu").classList.toggle("aberto", abrir); }

function aoMudarHash() {
  if (ignorar) { ignorar = false; return; }
  if (app.sujo && !window.confirm("Você tem alterações que ainda não foram salvas. Sair mesmo assim?")) {
    ignorar = true; location.hash = rotaAtual; return;
  }
  app.sujo = false;
  rotear();
}

function rotear() {
  const h = location.hash.replace(/^#\/?/, "") || "painel";
  rotaAtual = location.hash || "#/painel";
  const partes = h.split("/");
  const nome = ROTAS[partes[0]] ? partes[0] : "painel";
  $$("#nav a").forEach(function (a) { a.classList.toggle("is-on", a.dataset.r === nome); });
  // Elemento novo a cada tela: os eventos da tela anterior ficam para trás.
  const velho = $("#view"), view = velho.cloneNode(false), meu = ++seq;
  velho.replaceWith(view);
  // Esqueleto discreto: só aparece se a tela demorar (com o cache, a troca costuma ser instantânea).
  view.innerHTML = '<div class="esqueleto" aria-label="Carregando"><i></i><i></i><i></i><i></i></div>';
  window.scrollTo(0, 0);
  const link = $('#nav a[data-r="' + nome + '"]');
  const rotulo = link ? Array.prototype.filter.call(link.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.textContent; }).join("").trim() : "";
  Promise.resolve().then(function () { return ROTAS[nome](view, app, partes.slice(1)); }).then(function () {
    if (meu !== seq) return;
    const cab = view.querySelector(".cab > div:first-child");
    if (cab && !cab.querySelector(".cab-rotulo")) cab.insertAdjacentHTML("afterbegin", '<p class="cab-rotulo">' + esc(rotulo) + "</p>");
  }).catch(function (e) {
    if (meu !== seq) return;
    console.error(e);
    const negado = e && (e.code === "permission-denied" || /permission/i.test(e.message || ""));
    view.innerHTML = '<div class="aviso erro"><div><b>Não consegui carregar esta tela.</b><p>' +
      (negado ? "O Firestore recusou o acesso. Confirme que as regras do arquivo <code>firestore.rules</code> foram publicadas e que o UID da sua conta está na coleção <code>admins</code>." : esc((e && e.message) || "Erro desconhecido.")) +
      '</p></div><div class="acoes"><button class="btn" type="button" id="tentar">Tentar de novo</button></div></div>';
    const b = $("#tentar"); if (b) b.onclick = rotear;
  });
}

// Bolinha com a quantidade de pedidos novos no menu. As telas Visão geral e Pedidos já leem
// os pedidos e atualizam o número sem uma nova consulta.
function definirContador(n) {
  const el = $("#nav-pedidos");
  el.textContent = n; el.hidden = !n;
}
async function atualizarContador() {
  try {
    const leads = await app.repo.listar("leads");
    definirContador(leads.filter(function (l) { return (l.status || "novo") === "novo"; }).length);
  } catch (e) { /* sem acesso: ignora */ }
}

/* ---------- Início ---------- */
(async function () {
  try {
    app.ctx = await iniciar({ auth: true, storage: OPCOES.armazenamento === "storage" });
  } catch (e) {
    console.error(e);
    $("#cfg-msg").innerHTML = "Não consegui ler a configuração do projeto. Abra o painel pelo endereço do Firebase Hosting (<code>https://SEU-PROJETO.web.app/admin</code>) ou preencha <code>FIREBASE_CONFIG</code> em <code>public/js/firebase-config.js</code>. Confirme também que existe um app Web registrado no projeto.";
    mostrar("config");
    return;
  }
  app.repo = criarRepo(app.ctx);
  ligarLogin();
  definirModo("entrar");
  app.ctx.authSdk.onAuthStateChanged(app.ctx.auth, aoMudarUsuario);
})();
