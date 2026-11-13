// Perfil de quem está logado: foto, nome e troca de senha.
// A foto é recortada em quadrado e reduzida no navegador (256 px) e fica no documento admins/{uid}.
import { $, esc, toast, abrirModal } from "./ui.js";

const LADO = 256;

function recortar(arquivo) {
  return new Promise(function (ok, falha) {
    if (!arquivo || !/^image\//.test(arquivo.type)) { falha(new Error("Escolha um arquivo de imagem.")); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = function () {
      const l = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement("canvas");
      c.width = c.height = LADO;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(img, (img.naturalWidth - l) / 2, (img.naturalHeight - l) / 2, l, l, 0, 0, LADO, LADO);
      URL.revokeObjectURL(url);
      ok(c.toDataURL("image/jpeg", 0.86));
    };
    img.onerror = function () { URL.revokeObjectURL(url); falha(new Error("Não consegui abrir essa imagem.")); };
    img.src = url;
  });
}

function nomePadrao(app) { return (app.email || "").split("@")[0] || "Administrador"; }

// Atualiza o cartão do usuário na barra lateral.
export function aplicarPerfil(app) {
  const p = app.perfil || {};
  const nome = p.nome || nomePadrao(app);
  const av = $("#usuario-ini");
  $("#usuario").textContent = app.email;
  $("#usuario-nome").textContent = nome;
  if (p.foto) { av.innerHTML = '<img src="' + esc(p.foto) + '" alt="">'; av.classList.add("com-foto"); }
  else { av.textContent = nome.charAt(0).toUpperCase(); av.classList.remove("com-foto"); }
}

export function abrirPerfil(app) {
  const p = app.perfil || {};
  let foto = p.foto || "";
  const j = abrirModal(
    '<div class="perfil-topo"><h2>Meu perfil</h2><button class="icon-btn mini" type="button" data-fechar aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
    '<div class="perfil-foto">' +
      '<span class="perfil-avatar" id="pf-av"></span>' +
      '<div class="perfil-foto-acoes">' +
        '<label class="btn peq">Escolher foto<input type="file" accept="image/*" id="pf-arq" hidden></label>' +
        '<button class="btn peq" type="button" id="pf-tirar">Remover foto</button>' +
        '<small>JPG ou PNG. A foto é recortada em quadrado.</small>' +
      "</div></div>" +
    '<form id="pf-form" class="grade" novalidate>' +
      '<label>Nome que aparece no painel<input name="nome" maxlength="60" value="' + esc(p.nome || "") + '" placeholder="' + esc(nomePadrao(app)) + '"></label>' +
      '<label>E-mail<input value="' + esc(app.email) + '" disabled></label>' +
      '<div class="modal-acoes"><button class="btn" type="button" id="pf-senha">Mudar senha</button>' +
      '<button class="btn primary" type="submit">Salvar</button></div>' +
    "</form>"
  );
  const el = j.el;
  function desenharFoto() {
    const nome = el.querySelector("[name=nome]").value.trim() || nomePadrao(app);
    el.querySelector("#pf-av").innerHTML = foto ? '<img src="' + esc(foto) + '" alt="">' : esc(nome.charAt(0).toUpperCase());
    el.querySelector("#pf-tirar").hidden = !foto;
  }
  desenharFoto();
  el.querySelector("[data-fechar]").onclick = j.fechar;
  el.querySelector("[name=nome]").oninput = desenharFoto;
  el.querySelector("#pf-arq").onchange = async function (e) {
    try { foto = await recortar(e.target.files[0]); desenharFoto(); }
    catch (err) { toast(err.message, "erro"); }
    e.target.value = "";
  };
  el.querySelector("#pf-tirar").onclick = function () { foto = ""; desenharFoto(); };
  el.querySelector("#pf-senha").onclick = async function () {
    try { await app.ctx.authSdk.sendPasswordResetEmail(app.ctx.auth, app.email); toast("Enviamos para " + app.email + " um link para criar a nova senha."); }
    catch (err) { toast("Não consegui enviar: " + (err.code || err.message), "erro"); }
  };
  el.querySelector("#pf-form").onsubmit = async function (e) {
    e.preventDefault();
    const botao = e.target.querySelector("button[type=submit]");
    const nome = e.target.elements.nome.value.trim();
    botao.disabled = true; botao.textContent = "Salvando…";
    try {
      await app.repo.salvar("admins", app.uid, { nome: nome, foto: foto || null, email: app.email });
      app.perfil = Object.assign({}, app.perfil, { nome: nome, foto: foto || null });
      aplicarPerfil(app);
      j.fechar(); toast("Perfil atualizado.");
    } catch (err) {
      toast("Não consegui salvar: " + (err.code || err.message), "erro");
      botao.disabled = false; botao.textContent = "Salvar";
    }
  };
}
