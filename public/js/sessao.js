// Conta do visitante no cabeçalho do site.
// Para não pesar em quem nunca entrou, o login do Firebase só é carregado se a pessoa já entrou
// alguma vez neste aparelho (marca "autocar:logado", gravada pela página /conta/).
import { iniciar } from "./firebase-boot.js";

const MARCA = "autocar:logado";
const $ = function (s) { return document.querySelector(s); };
const esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

function temMarca() { try { return localStorage.getItem(MARCA) === "1"; } catch (e) { return false; } }
function tirarMarca() { try { localStorage.removeItem(MARCA); } catch (e) { /* ok */ } }

const btn = $("#hu-btn"), menu = $("#hu-menu");

function fecharMenu() { if (menu) menu.hidden = true; if (btn) btn.setAttribute("aria-expanded", "false"); }

function mostrarLogado(s) {
  const nome = s.perfil.nome || (s.user.email || "").split("@")[0];
  btn.classList.add("logado");
  btn.setAttribute("aria-label", "Minha conta");
  btn.innerHTML = s.perfil.foto ? '<img src="' + esc(s.perfil.foto) + '" alt="">' : esc((nome || "?").charAt(0).toUpperCase());
  $("#hu-nome").textContent = nome;
  $("#hu-email").textContent = s.user.email || "";
  $("#hu-adm").hidden = !s.admin;
  btn.setAttribute("aria-haspopup", "menu");
  btn.onclick = function (e) {
    e.preventDefault();
    const abrir = menu.hidden;
    menu.hidden = !abrir;
    btn.setAttribute("aria-expanded", String(abrir));
  };
  // Preenche o pedido de proposta com os dados do perfil
  const f = document.querySelector("#lead form");
  if (f) {
    if (f.elements.nome && !f.elements.nome.value) f.elements.nome.value = s.perfil.nome || "";
    if (f.elements.whatsapp && !f.elements.whatsapp.value) f.elements.whatsapp.value = s.perfil.telefone || "";
  }
}

document.addEventListener("click", function (e) { if (menu && !menu.hidden && !e.target.closest("#hu")) fecharMenu(); });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharMenu(); });

async function ligar() {
  const c = await iniciar({ auth: true });
  const a = c.authSdk, f = c.fs;
  $("#hu-sair").onclick = async function () { tirarMarca(); try { await a.signOut(c.auth); } catch (e) { /* ok */ } location.reload(); };
  a.onAuthStateChanged(c.auth, async function (user) {
    if (!user) { tirarMarca(); window.SESSAO = null; return; }
    let admin = null, cliente = null;
    if (user.emailVerified) { try { const d = await f.getDoc(f.doc(c.db, "admins", user.uid)); if (d.exists()) admin = d.data(); } catch (e) { /* não é admin */ } }
    if (!admin) { try { const d = await f.getDoc(f.doc(c.db, "usuarios", user.uid)); if (d.exists()) cliente = d.data(); } catch (e) { /* sem perfil */ } }
    const p = admin || cliente || {};
    const s = { user: user, admin: !!admin, perfil: { nome: p.nome || user.displayName || "", foto: p.foto || null, telefone: p.telefone || "" } };
    window.SESSAO = s;
    mostrarLogado(s);
  });
}

if (btn && temMarca()) {
  const vai = function () { ligar().catch(function (e) { console.warn("AutoCar: conta indisponível.", e); }); };
  if ("requestIdleCallback" in window) requestIdleCallback(vai, { timeout: 2500 }); else setTimeout(vai, 1200);
}
