// Pedidos de proposta enviados pelo formulário do site.
import { esc, toast, confirmar, dataHora, milis, linkWhats } from "../ui.js";
import { STATUS_LEAD } from "/js/modelo.js";

export async function pedidos(root, app) {
  const repo = app.repo;
  let leads = await repo.listar("leads");
  let filtro = "";

  function desenhar() {
    const lista = leads.slice().sort(function (a, b) { return milis(b.criadoEm) - milis(a.criadoEm); })
      .filter(function (l) { return !filtro || (l.status || "novo") === filtro; });
    const novos = leads.filter(function (l) { return (l.status || "novo") === "novo"; }).length;
    app.definirContador(novos);
    root.innerHTML =
      '<div class="cab"><div><h1>Pedidos</h1><p>' + leads.length + (leads.length === 1 ? " pedido" : " pedidos") + " · " + novos + (novos === 1 ? " novo" : " novos") + "</p></div>" +
      '<div class="acoes"><button class="btn" type="button" data-atualizar>Atualizar</button></div></div>' +
      '<div class="barra-filtros"><select id="f-status" aria-label="Filtrar por situação"><option value="">Todas as situações</option>' +
        Object.keys(STATUS_LEAD).map(function (k) { return '<option value="' + k + '"' + (k === filtro ? " selected" : "") + ">" + STATUS_LEAD[k] + "</option>"; }).join("") + "</select></div>" +
      (lista.length ? '<div class="tabela-rolagem"><table><thead><tr><th>Recebido</th><th>Cliente</th><th>Carro de interesse</th><th>Situação</th><th></th></tr></thead><tbody>' +
        lista.map(function (l) {
          const st = l.status || "novo";
          return '<tr data-id="' + esc(l.id) + '"><td style="white-space:nowrap">' + esc(dataHora(l.criadoEm)) + "</td>" +
            "<td><b>" + esc(l.nome) + "</b><br><span class=\"dica\">" + esc(l.whatsapp) + "</span></td>" +
            "<td>" + esc(l.carro || "Ainda não sei") + "</td>" +
            '<td><select data-status aria-label="Situação do pedido" style="width:auto;padding:6px 10px">' +
              Object.keys(STATUS_LEAD).map(function (k) { return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + STATUS_LEAD[k] + "</option>"; }).join("") + "</select></td>" +
            '<td class="acoes-col"><a class="btn peq primary" target="_blank" rel="noopener" href="' + esc(linkWhats(l.whatsapp, "Olá, " + l.nome + "! Aqui é da Landora Motors" + (l.carro && l.carro !== "Ainda não sei" ? " sobre o " + l.carro : "") + ".")) + '">WhatsApp ↗</a>' +
            '<button class="btn peq perigo" type="button" data-del>Excluir</button></td></tr>';
        }).join("") + "</tbody></table></div>" : '<div class="vazio">' + (leads.length ? "Nenhum pedido com essa situação." : "Nenhum pedido recebido ainda. Eles aparecem aqui quando alguém usa “Quero uma proposta” no site.") + "</div>");
  }
  desenhar();

  root.onchange = async function (e) {
    if (e.target.id === "f-status") { filtro = e.target.value; desenhar(); return; }
    if (!e.target.matches("[data-status]")) return;
    const l = leads.filter(function (x) { return x.id === e.target.closest("tr").dataset.id; })[0];
    try {
      await repo.atualizar("leads", l.id, { status: e.target.value }); l.status = e.target.value;
      toast("Situação atualizada."); app.atualizarContador();
    } catch (err) { toast("Não consegui atualizar: " + (err.code || err.message), "erro"); desenhar(); }
  };
  root.onclick = async function (e) {
    if (e.target.closest("[data-atualizar]")) { leads = await repo.listar("leads"); desenhar(); app.atualizarContador(); return; }
    const tr = e.target.closest("tr[data-id]");
    if (!tr || !e.target.closest("[data-del]")) return;
    const l = leads.filter(function (x) { return x.id === tr.dataset.id; })[0];
    if (!(await confirmar({ titulo: "Excluir o pedido de " + l.nome + "?", texto: "Isso não pode ser desfeito.", ok: "Excluir", perigo: true }))) return;
    try { await repo.remover("leads", l.id); leads = leads.filter(function (x) { return x.id !== l.id; }); desenhar(); app.atualizarContador(); toast("Pedido excluído."); }
    catch (err) { toast("Não consegui excluir: " + (err.code || err.message), "erro"); }
  };
}
