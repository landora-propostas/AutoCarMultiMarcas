// Página /conta/: entrar, criar conta e perfil do cliente (foto, nome, WhatsApp e pedidos).
// Se quem entrar for administrador, vai direto para o painel (/admin/).
import { iniciar } from "./firebase-boot.js";
import { STATUS_LEAD } from "./modelo.js";

const MARCA = "autocar:logado";
const $ = function (s) { return document.querySelector(s); };
const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
const esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
function marcar(v) { try { v ? localStorage.setItem(MARCA, "1") : localStorage.removeItem(MARCA); } catch (e) { /* ok */ } }

let tt = 0;
function toast(msg, tipo) {
  const t = $("#ct-toast");
  t.textContent = msg; t.className = "ct-toast" + (tipo ? " " + tipo : ""); t.hidden = false;
  clearTimeout(tt); tt = setTimeout(function () { t.hidden = true; }, 4200);
}
function tela(qual) {
  $("#ct-carregando").hidden = qual !== "carregando";
  $("#ct-auth").hidden = qual !== "auth";
  $("#ct-perfil").hidden = qual !== "perfil";
}
function msgAuth(e) {
  const c = (e && e.code) || "";
  if (c === "auth/invalid-credential" || c === "auth/wrong-password" || c === "auth/user-not-found") return "E-mail ou senha incorretos.";
  if (c === "auth/email-already-in-use") return "Esse e-mail já tem conta. Use a aba Entrar.";
  if (c === "auth/invalid-email") return "E-mail inválido.";
  if (c === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
  if (c === "auth/too-many-requests") return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (c === "auth/network-request-failed") return "Sem conexão. Confira sua internet.";
  return "Não foi possível continuar agora. Tente de novo.";
}
function recortar(arquivo) {
  return new Promise(function (ok, falha) {
    if (!arquivo || !/^image\//.test(arquivo.type)) { falha(new Error("Escolha um arquivo de imagem.")); return; }
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = function () {
      const l = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement("canvas");
      c.width = c.height = 256;
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
      g.drawImage(img, (img.naturalWidth - l) / 2, (img.naturalHeight - l) / 2, l, l, 0, 0, 256, 256);
      URL.revokeObjectURL(url); ok(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = function () { URL.revokeObjectURL(url); falha(new Error("Não consegui abrir essa imagem.")); };
    img.src = url;
  });
}
function quando(v) {
  const d = v && v.toDate ? v.toDate() : (v ? new Date(v) : null);
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora";
}

(async function () {
  tela("carregando");
  let c;
  try { c = await iniciar({ auth: true }); }
  catch (e) { tela("auth"); $("#ct-erro").textContent = "Login indisponível neste endereço."; $("#ct-erro").hidden = false; return; }
  const a = c.authSdk, f = c.fs, db = c.db;
  let aba = "entrar", nomeCadastro = "", foto = null, uid = null;

  /* ---------- Entrar / criar conta ---------- */
  function trocarAba(v) {
    aba = v;
    $$("[data-aba]").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.aba === v)); });
    $$("[data-so]").forEach(function (el) { el.hidden = el.dataset.so !== v; });
    $("#ct-auth-titulo").textContent = v === "criar" ? "Criar conta" : "Entrar";
    $("#ct-enviar").textContent = v === "criar" ? "Criar minha conta" : "Entrar";
    $("#ct-form").elements.senha.autocomplete = v === "criar" ? "new-password" : "current-password";
    $("#ct-erro").hidden = true;
  }
  $$("[data-aba]").forEach(function (b) { b.onclick = function () { trocarAba(b.dataset.aba); }; });
  if (location.hash === "#criar") trocarAba("criar");

  $("#ct-form").onsubmit = async function (e) {
    e.preventDefault();
    const el = e.target.elements, erro = $("#ct-erro"), bt = $("#ct-enviar");
    const email = el.email.value.trim(), senha = el.senha.value, nome = el.nome.value.trim();
    erro.hidden = true;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erro.textContent = "Digite um e-mail válido."; erro.hidden = false; return; }
    if (senha.length < 6) { erro.textContent = "A senha precisa ter pelo menos 6 caracteres."; erro.hidden = false; return; }
    if (aba === "criar" && !nome) { erro.textContent = "Digite seu nome."; erro.hidden = false; return; }
    bt.disabled = true;
    try {
      if (aba === "criar") {
        nomeCadastro = nome;
        const cred = await a.createUserWithEmailAndPassword(c.auth, email, senha);
        try { await a.updateProfile(cred.user, { displayName: nome }); } catch (x) { /* opcional */ }
      } else {
        await a.signInWithEmailAndPassword(c.auth, email, senha);
      }
    } catch (err) { erro.textContent = msgAuth(err); erro.hidden = false; }
    bt.disabled = false;
  };
  $("#ct-esqueci").onclick = async function () {
    const email = $("#ct-form").elements.email.value.trim(), erro = $("#ct-erro");
    if (!email) { erro.textContent = "Digite seu e-mail acima e clique de novo em “Esqueci minha senha”."; erro.hidden = false; return; }
    try { await a.sendPasswordResetEmail(c.auth, email); erro.hidden = true; toast("Se o e-mail tiver conta, enviamos um link para criar uma nova senha."); }
    catch (err) { erro.textContent = msgAuth(err); erro.hidden = false; }
  };

  /* ---------- Perfil ---------- */
  function desenharAvatar(nome) {
    $("#ct-avatar").innerHTML = foto ? '<img src="' + esc(foto) + '" alt="">' : esc((nome || "?").charAt(0).toUpperCase());
    $("#ct-tirar").hidden = !foto;
  }
  $("#ct-arq").onchange = async function (e) {
    try { foto = await recortar(e.target.files[0]); desenharAvatar($("#ct-pf").elements.nome.value); toast("Foto pronta. Clique em “Salvar perfil”."); }
    catch (err) { toast(err.message, "erro"); }
    e.target.value = "";
  };
  $("#ct-tirar").onclick = function () { foto = null; desenharAvatar($("#ct-pf").elements.nome.value); };
  $("#ct-pf").elements.nome.oninput = function (e) { desenharAvatar(e.target.value); };
  $("#ct-pf").onsubmit = async function (e) {
    e.preventDefault();
    const el = e.target.elements, bt = e.target.querySelector("button[type=submit]");
    const nome = el.nome.value.trim(), telefone = el.telefone.value.trim();
    bt.disabled = true;
    try {
      await f.setDoc(f.doc(db, "usuarios", uid), { nome: nome, telefone: telefone, foto: foto || null, email: c.auth.currentUser.email || "", atualizadoEm: f.serverTimestamp() }, { merge: true });
      $("#ct-ola").textContent = nome ? "Olá, " + nome.split(" ")[0] + "!" : "Olá!";
      toast("Perfil salvo.");
    } catch (err) { toast(err && err.code === "permission-denied" ? "Não foi possível salvar (permissão). Tente sair e entrar de novo." : "Não foi possível salvar agora.", "erro"); }
    bt.disabled = false;
  };
  $("#ct-senha").onclick = async function () {
    try { await a.sendPasswordResetEmail(c.auth, c.auth.currentUser.email); toast("Enviamos um link para " + c.auth.currentUser.email + " para criar a nova senha."); }
    catch (err) { toast(msgAuth(err), "erro"); }
  };
  $("#ct-sair").onclick = async function () { marcar(false); await a.signOut(c.auth); };

  async function carregarPedidos() {
    const lista = $("#ct-lista");
    lista.innerHTML = '<p class="ct-vazio">Carregando…</p>';
    try {
      const q = f.query(f.collection(db, "leads"), f.where("uid", "==", uid));
      const snap = await f.getDocs(q);
      const itens = snap.docs.map(function (d) { const x = d.data(); x.id = d.id; return x; })
        .sort(function (x, y) { return (y.criadoEm && y.criadoEm.toMillis ? y.criadoEm.toMillis() : 0) - (x.criadoEm && x.criadoEm.toMillis ? x.criadoEm.toMillis() : 0); });
      if (!itens.length) { lista.innerHTML = '<p class="ct-vazio">Você ainda não fez nenhum pedido. Quando pedir uma proposta com a conta aberta, ela aparece aqui com a situação do atendimento.</p>'; return; }
      lista.innerHTML = '<ul class="ct-itens">' + itens.map(function (l) {
        const st = l.status || "novo";
        return '<li><div><b>' + esc(l.carro && l.carro !== "Ainda não sei" ? l.carro : "Proposta geral") + '</b><small>' + esc(quando(l.criadoEm)) + '</small></div>' +
          '<span class="ct-status s-' + esc(st) + '">' + esc(STATUS_LEAD[st] || st) + "</span></li>";
      }).join("") + "</ul>";
    } catch (err) { lista.innerHTML = '<p class="ct-vazio">Não foi possível carregar seus pedidos agora.</p>'; }
  }

  a.onAuthStateChanged(c.auth, async function (user) {
    if (!user) { uid = null; marcar(false); tela("auth"); return; }
    marcar(true);
    tela("carregando");
    // Administrador: vai direto para o painel.
    if (user.emailVerified) {
      try { const d = await f.getDoc(f.doc(db, "admins", user.uid)); if (d.exists()) { location.replace("/admin/"); return; } } catch (e) { /* cliente */ }
    }
    uid = user.uid;
    let p = {};
    try {
      const ref = f.doc(db, "usuarios", uid), d = await f.getDoc(ref);
      if (d.exists()) p = d.data();
      else {
        p = { nome: nomeCadastro || user.displayName || "", email: user.email || "", telefone: "", foto: null };
        await f.setDoc(ref, Object.assign({}, p, { criadoEm: f.serverTimestamp() }));
      }
    } catch (e) { /* segue com o básico */ }
    foto = p.foto || null;
    const nome = p.nome || user.displayName || "";
    const el = $("#ct-pf").elements;
    el.nome.value = nome; el.telefone.value = p.telefone || ""; el.email.value = user.email || "";
    $("#ct-ola").textContent = nome ? "Olá, " + nome.split(" ")[0] + "!" : "Olá!";
    $("#ct-mail").textContent = user.email || "";
    desenharAvatar(nome || user.email);
    tela("perfil");
    carregarPedidos();
  });
})();
