// Equipe: contas autorizadas a entrar no painel (coleção "admins", ID = UID da conta no Firebase Authentication).
import { esc, toast, confirmar, dataHora, milis } from "../ui.js";

export async function equipe(root, app) {
  const repo = app.repo;
  let membros = await repo.listar("admins");

  function desenhar() {
    const lista = membros.slice().sort(function (a, b) { return milis(a.criadoEm) - milis(b.criadoEm) || a.id.localeCompare(b.id); });
    root.innerHTML =
      '<div class="cab"><div><h1>Equipe</h1><p>Quem pode entrar neste painel.</p></div></div>' +
      '<section class="cartao"><div class="cartao-topo"><div><h2>Autorizar uma pessoa</h2><p>A pessoa abre <code>/admin</code>, escolhe <b>Criar conta</b> e confirma o e-mail. Na tela “Sem acesso” aparece o <b>UID</b> da conta dela: peça que ela envie esse código e cole aqui.</p></div></div>' +
      '<form id="f-eq" class="grade g2" novalidate>' +
        '<label>UID da conta<input name="uid" placeholder="Ex.: fCbLrbw3O0SrlFkiJcMspdTghxj2" maxlength="128" autocomplete="off" required></label>' +
        '<label>Nome ou e-mail (para identificar)<input name="nome" placeholder="Ex.: Maria · maria@exemplo.com" maxlength="120"></label>' +
        '<div><button class="btn primary" type="submit">Autorizar</button></div>' +
      '</form></section>' +
      '<div class="tabela-rolagem"><table><thead><tr><th>Pessoa</th><th>UID</th><th>Autorizado por</th><th>Em</th><th></th></tr></thead><tbody>' +
      lista.map(function (m) {
        const eu = m.id === app.uid;
        const quem = m.nome || m.email || (eu ? app.email : "—");
        return "<tr data-id=\"" + esc(m.id) + "\"><td><b>" + esc(quem) + "</b>" + (eu ? ' <span class="selo publicado">você</span>' : "") + "</td>" +
          '<td><code style="font-size:12px">' + esc(m.id) + "</code></td><td>" + esc(m.adicionadoPor || "—") + "</td><td>" + esc(dataHora(m.criadoEm)) + "</td>" +
          '<td class="acoes-col">' + (eu ? "" : '<button class="btn peq perigo" type="button" data-del>Remover acesso</button>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  desenhar();

  root.onsubmit = async function (e) {
    e.preventDefault();
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
    if (!tr || !e.target.closest("[data-del]")) return;
    const id = tr.dataset.id;
    const m = membros.filter(function (x) { return x.id === id; })[0] || {};
    if (!(await confirmar({ titulo: "Remover o acesso de " + (m.nome || id) + "?", texto: "Essa pessoa não conseguirá mais abrir o painel.", ok: "Remover", perigo: true }))) return;
    try { await repo.remover("admins", id); membros = membros.filter(function (x) { return x.id !== id; }); desenhar(); toast("Acesso removido."); }
    catch (err) { toast("Não consegui remover: " + (err.code || err.message), "erro"); }
  };
}
