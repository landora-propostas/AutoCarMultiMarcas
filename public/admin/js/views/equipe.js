// Equipe: e-mails autorizados a entrar no painel (coleção "admins", ID = e-mail em minúsculas).
import { esc, toast, confirmar, dataHora, milis } from "../ui.js";

export async function equipe(root, app) {
  const repo = app.repo;
  let membros = await repo.listar("admins");

  function desenhar() {
    const lista = membros.slice().sort(function (a, b) { return milis(a.criadoEm) - milis(b.criadoEm) || a.id.localeCompare(b.id); });
    root.innerHTML =
      '<div class="cab"><div><h1>Equipe</h1><p>Quem pode entrar neste painel.</p></div></div>' +
      '<section class="cartao"><div class="cartao-topo"><div><h2>Autorizar uma pessoa</h2><p>Digite o e-mail. Depois, ela abre <code>/admin</code>, escolhe <b>Criar conta</b> com esse mesmo e-mail e confirma o e-mail pelo link recebido.</p></div></div>' +
      '<form id="f-eq" class="linha uma" novalidate style="grid-template-columns:1fr auto"><input type="email" name="email" placeholder="pessoa@exemplo.com" aria-label="E-mail da pessoa" required><button class="btn primary" type="submit">Autorizar</button></form></section>' +
      '<div class="tabela-rolagem"><table><thead><tr><th>E-mail</th><th>Autorizado por</th><th>Em</th><th></th></tr></thead><tbody>' +
      lista.map(function (m) {
        const eu = m.id === app.email;
        return "<tr data-id=\"" + esc(m.id) + "\"><td><b>" + esc(m.id) + "</b>" + (eu ? ' <span class="selo publicado">você</span>' : "") + "</td><td>" + esc(m.adicionadoPor || "—") + "</td><td>" + esc(dataHora(m.criadoEm)) + "</td>" +
          '<td class="acoes-col">' + (eu ? "" : '<button class="btn peq perigo" type="button" data-del>Remover acesso</button>') + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  desenhar();

  root.onsubmit = async function (e) {
    e.preventDefault();
    const email = e.target.elements.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast("Digite um e-mail válido.", "erro"); return; }
    if (membros.some(function (m) { return m.id === email; })) { toast("Essa pessoa já tem acesso.", "info"); return; }
    try {
      await repo.salvar("admins", email, { email: email, adicionadoPor: app.email, criadoEm: app.ctx.fs.serverTimestamp() }, true);
      membros.push({ id: email, email: email, adicionadoPor: app.email, criadoEm: new Date() });
      desenhar(); toast("Acesso autorizado.");
    } catch (err) { toast("Não consegui autorizar: " + (err.code || err.message), "erro"); }
  };
  root.onclick = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr || !e.target.closest("[data-del]")) return;
    const id = tr.dataset.id;
    if (!(await confirmar({ titulo: "Remover o acesso de " + id + "?", texto: "Essa pessoa não conseguirá mais abrir o painel.", ok: "Remover", perigo: true }))) return;
    try { await repo.remover("admins", id); membros = membros.filter(function (m) { return m.id !== id; }); desenhar(); toast("Acesso removido."); }
    catch (err) { toast("Não consegui remover: " + (err.code || err.message), "erro"); }
  };
}
