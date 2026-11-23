import { esc, toast, confirmar, dataHora, milis } from "../ui.js";
import { VERSAO_SDK } from "/js/firebase-boot.js";
import { checarSenha } from "/js/protecao.js";
import { OPCOES } from "/js/firebase-config.js";

const CDN = "https://www.gstatic.com/firebasejs/" + VERSAO_SDK + "/";
let cadastro = null;
async function authCadastro(cfg) {
  if (cadastro) return cadastro;
  const [appSdk, a] = await Promise.all([import(CDN + "firebase-app.js"), import(CDN + "firebase-auth.js")]);
  const existente = appSdk.getApps().filter(function (x) { return x.name === "cadastro-equipe"; })[0];
  const sec = existente || appSdk.initializeApp(cfg, "cadastro-equipe");
  if (!existente && OPCOES.appCheck) {
    try { const ac = await import(CDN + "firebase-app-check.js"); ac.initializeAppCheck(sec, { provider: new ac.ReCaptchaEnterpriseProvider(OPCOES.appCheck), isTokenAutoRefreshEnabled: true }); } catch (e) { }
  }
  let auth;
  try { auth = a.initializeAuth(sec, { persistence: a.inMemoryPersistence }); } catch (e) { auth = a.getAuth(sec); }
  cadastro = { a: a, auth: auth };
  return cadastro;
}
function msgCadastro(err) {
  const c = (err && err.code) || "";
  if (c === "auth/email-already-in-use") return "Esse e-mail já tem conta. Use a opção “Já tem conta?” logo abaixo, com o UID dela.";
  if (c === "auth/invalid-email") return "E-mail inválido.";
  if (c === "auth/weak-password") return "Senha fraca: use pelo menos 6 caracteres.";
  if (c === "auth/operation-not-allowed") return "O login por e-mail e senha está desativado no Firebase (Authentication → Método de login).";
  if (c === "auth/too-many-requests") return "Muitas tentativas. Espere alguns minutos e tente de novo.";
  if (c === "permission-denied") return "A conta foi criada, mas não consegui liberar o acesso. Confira as regras do Firestore.";
  return "Não consegui criar: " + (c || (err && err.message) || "erro desconhecido");
}

export async function equipe(root, app) {
  const repo = app.repo;
  let membros = await repo.listar("admins");

  const visiveis = function () { return membros.filter(function (m) { return app.supremo || m.id !== app.supremoUid; }); };
  function desenhar() {
    if (!app.master && !app.supremo) { desenharLeitura(); return; }
    const lista = visiveis().sort(function (a, b) { return milis(a.criadoEm) - milis(b.criadoEm) || a.id.localeCompare(b.id); });
    const criar = (app.supremo || app.master)
      ? '<section class="cartao"><div class="cartao-topo"><div><h2>Criar acesso para uma pessoa</h2><p>Preencha os dados e clique em <b>Criar acesso</b>. A conta já fica liberada no painel. A pessoa recebe um e-mail para confirmar o endereço e depois entra em <code>/admin</code> com o e-mail e a senha que você definiu.</p></div></div>' +
        '<form id="f-novo" class="grade g2" novalidate autocomplete="off">' +
          '<label>Nome<input name="nome" placeholder="Ex.: Maria Souza" maxlength="80"></label>' +
          '<label>E-mail<input name="email" type="email" placeholder="maria@exemplo.com" maxlength="120" required autocomplete="off"></label>' +
          '<label>Senha inicial<input name="senha" type="text" placeholder="8+ caracteres, letras e números" minlength="8" maxlength="64" required autocomplete="new-password"></label>' +
          '<div style="align-self:end"><button class="btn primary" type="submit">Criar acesso</button></div>' +
        '</form>' +
        '<details class="ja-tem" style="margin-top:18px"><summary style="cursor:pointer;color:var(--muted,#aaa);font-size:14px">Já tem conta? Autorizar pelo UID</summary>' +
          '<p style="margin:10px 0 12px;font-size:14px;opacity:.8">Se a pessoa já criou a conta na área do cliente (<code>/conta</code>), o UID aparece na tela “Sem acesso” dela.</p>' +
          '<form id="f-eq" class="grade g2" novalidate>' +
            '<label>UID da conta<input name="uid" placeholder="Ex.: fCbLrbw3O0SrlFkiJcMspdTghxj2" maxlength="128" autocomplete="off" required></label>' +
            '<label>Nome ou e-mail (para identificar)<input name="nome" placeholder="Ex.: Maria · maria@exemplo.com" maxlength="120"></label>' +
            '<div><button class="btn" type="submit">Autorizar</button></div>' +
          '</form></details></section>'
      : "";
    root.innerHTML =
      '<div class="cab"><div><h1>Equipe</h1><p>Quem pode entrar neste painel.</p></div>' +
      "</div>" +
      criar +
      '<div class="tabela-rolagem t-lista"><table><thead><tr><th>Pessoa</th><th>UID</th><th>Autorizado por</th><th>Em</th><th></th></tr></thead><tbody>' +
      lista.map(function (m) {
        const eu = m.id === app.uid;
        const principal = m.id === app.masterUid;
        const quem = m.nome || m.email || (eu ? app.email : "—");
        const sub = m.nome && m.email ? '<div style="font-size:12px;opacity:.65;margin-top:2px">' + esc(m.email) + "</div>" : "";
        let bts = "";
        if (app.supremo) {
          if (!principal) bts += '<button class="btn peq" type="button" data-principal>Tornar principal</button>';
          if (!eu) bts += '<button class="btn peq perigo" type="button" data-del>Remover acesso</button>';
        } else if (!eu) {
          bts = '<button class="btn peq" type="button" data-principal>Transferir principal</button><button class="btn peq perigo" type="button" data-del>Remover acesso</button>';
        }
        return "<tr data-id=\"" + esc(m.id) + "\"><td><b>" + esc(quem) + "</b>" + (eu ? ' <span class="selo publicado">você</span>' : "") + (principal ? ' <span class="selo">principal</span>' : "") + (m.id === app.supremoUid ? ' <span class="selo">desenvolvedor</span>' : "") + sub + "</td>" +
          '<td data-l="UID"><code class="uid">' + esc(m.id) + '</code></td><td data-l="Autorizado por">' + esc(m.adicionadoPor || "—") + '</td><td data-l="Em">' + esc(dataHora(m.criadoEm)) + "</td>" +
          '<td class="acoes-col">' + bts + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function desenharLeitura() {
    root.innerHTML =
      '<div class="cab"><div><h1>Equipe</h1><p>Quem pode entrar neste painel.</p></div></div>' +
      '<section class="cartao"><p style="margin:0">Somente o <b>administrador principal</b> gerencia a equipe. Para liberar o painel para outra pessoa, peça a ele.</p></section>' +
      '<div class="tabela-rolagem t-lista"><table><thead><tr><th>Pessoa</th><th>Função</th></tr></thead><tbody>' +
      visiveis().map(function (m) {
        const eu = m.id === app.uid;
        return "<tr><td><b>" + esc(m.nome || m.email || (eu ? app.email : "—")) + "</b>" + (eu ? ' <span class="selo publicado">você</span>' : "") + '</td><td data-l="Função">' + (m.id === app.masterUid ? "Administrador principal" : "Administrador") + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  desenhar();

  async function criarAcesso(form) {
    const nome = form.elements.nome.value.trim();
    const email = form.elements.email.value.trim().toLowerCase();
    const senha = form.elements.senha.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Digite um e-mail válido.", "erro"); return; }
    const fraca = checarSenha(senha);
    if (fraca) { toast(fraca, "erro"); return; }
    const botao = form.querySelector("button[type=submit]");
    botao.disabled = true; botao.textContent = "Criando…";
    let c = null;
    try {
      c = await authCadastro(app.ctx.cfg);
      const cred = await c.a.createUserWithEmailAndPassword(c.auth, email, senha);
      const uid = cred.user.uid;
      try { await c.a.updateProfile(cred.user, { displayName: nome || null }); } catch (x) { }
      try { await c.a.sendEmailVerification(cred.user); } catch (x) { }
      const dados = { ativo: true, nome: nome, email: email, adicionadoPor: app.email, criadoEm: app.ctx.fs.serverTimestamp() };
      await repo.salvar("admins", uid, dados, true);
      membros.push(Object.assign({ id: uid }, dados, { criadoEm: new Date() }));
      desenhar();
      toast("Acesso criado para " + email + ". Ela precisa confirmar o e-mail antes do primeiro login.");
    } catch (err) {
      toast(msgCadastro(err), "erro");
      botao.disabled = false; botao.textContent = "Criar acesso";
    } finally {
      if (c) { try { await c.a.signOut(c.auth); } catch (x) { } }
    }
  }

  root.onsubmit = async function (e) {
    e.preventDefault();
    if (!app.supremo && !app.master) return;
    if (e.target.id === "f-novo") { criarAcesso(e.target); return; }
    const uid = e.target.elements.uid.value.trim();
    const nome = e.target.elements.nome.value.trim();
    if (!/^[A-Za-z0-9]{20,128}$/.test(uid)) { toast("Cole um UID válido (letras e números, sem espaços).", "erro"); return; }
    if (membros.some(function (m) { return m.id === uid; })) { toast("Essa conta já tem acesso.", "info"); return; }
    try {
      const dados = { ativo: true, nome: nome, adicionadoPor: app.email, criadoEm: app.ctx.fs.serverTimestamp() };
      await repo.salvar("admins", uid, dados, true);
      membros.push(Object.assign({ id: uid }, dados, { criadoEm: new Date() }));
      desenhar(); toast("Acesso autorizado.");
    } catch (err) { toast("Não consegui autorizar: " + (err.code || err.message), "erro"); }
  };
  root.onclick = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr || !(app.master || app.supremo)) return;
    const id = tr.dataset.id;
    const m = membros.filter(function (x) { return x.id === id; })[0] || {};
    if (e.target.closest("[data-principal]")) {
      const quem = m.nome || m.email || id;
      const texto = app.supremo
        ? quem + " passa a gerenciar a equipe deste painel."
        : "Você continua com acesso ao painel, mas deixa de gerenciar a equipe. Para voltar, só " + quem + " pode devolver.";
      if (!(await confirmar({ titulo: "Tornar " + quem + " o administrador principal?", texto: texto, ok: "Confirmar" }))) return;
      try {
        await repo.salvar("config", "equipe", { master: id, transferidoPor: app.email, transferidoEm: app.ctx.fs.serverTimestamp() });
        app.masterUid = id; app.master = id === app.uid; desenhar();
        toast(quem + " agora é o administrador principal.");
      } catch (err) { toast("Não consegui transferir: " + (err.code || err.message), "erro"); }
      return;
    }
    if (!e.target.closest("[data-del]")) return;
    if (!(await confirmar({ titulo: "Remover o acesso de " + (m.nome || id) + "?", texto: "Essa pessoa não conseguirá mais abrir o painel.", ok: "Remover", perigo: true }))) return;
    try { await repo.remover("admins", id); membros = membros.filter(function (x) { return x.id !== id; }); desenhar(); toast("Acesso removido."); }
    catch (err) { toast("Não consegui remover: " + (err.code || err.message), "erro"); }
  };
}
