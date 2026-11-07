// Catálogo de adicionais de entrega (carro lavado, PPF, laço, entrega no local…).
// Cada anúncio escolhe quais adicionais mostra, no formulário do carro.
import { esc, toast, confirmar, abrirModal, ico, ordenarPor } from "../ui.js";

export async function adicionais(root, app) {
  const repo = app.repo;
  let [ads, cars] = await Promise.all([repo.listar("adicionais"), repo.listar("carros")]);

  const uso = function (id) { return cars.filter(function (c) { return (c.adicionais || []).indexOf(id) >= 0; }).length; };

  function desenhar() {
    const lista = ordenarPor(ads, "ordem");
    root.innerHTML =
      '<div class="cab"><div><h1>Adicionais de entrega</h1><p>O que a loja oferece na entrega do carro. Em cada anúncio você escolhe quais valem para aquele carro.</p></div>' +
      '<div class="acoes"><button class="btn primary" type="button" data-novo>+ Novo adicional</button></div></div>' +
      (lista.length ? '<div class="tabela-rolagem"><table><thead><tr><th>Ordem</th><th>Adicional</th><th>Em novos carros</th><th>Ativo</th><th>Anúncios</th><th></th></tr></thead><tbody>' +
        lista.map(function (a, i) {
          return '<tr data-id="' + esc(a.id) + '"><td style="white-space:nowrap">' +
            '<button class="icon-btn mini" type="button" data-sobe aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + ico("cima") + "</button> " +
            '<button class="icon-btn mini" type="button" data-desce aria-label="Descer"' + (i === lista.length - 1 ? " disabled" : "") + ">" + ico("baixo") + "</button></td>" +
            "<td><b>" + esc(a.titulo) + '</b><br><span class="dica">' + esc(a.descricao || "") + "</span></td>" +
            '<td><label class="check"><input type="checkbox" data-padrao' + (a.padrao ? " checked" : "") + ' aria-label="Marcado por padrão"><span class="dica">já vem marcado</span></label></td>' +
            '<td><label class="check"><input type="checkbox" data-ativo' + (a.ativo !== false ? " checked" : "") + ' aria-label="Ativo"></label></td>' +
            "<td>" + uso(a.id) + '</td><td class="acoes-col"><button class="btn peq" type="button" data-edit>Editar</button><button class="btn peq perigo" type="button" data-del>Excluir</button></td></tr>';
        }).join("") + "</tbody></table></div>" : '<div class="vazio">Nenhum adicional cadastrado.</div>') +
      '<p class="dica">“Ativo” desligado esconde o adicional de todos os anúncios, sem apagar. “Já vem marcado” só afeta carros novos que você cadastrar.</p>';
  }
  desenhar();

  function janela(a) {
    const j = abrirModal(
      "<h2>" + (a ? "Editar adicional" : "Novo adicional") + "</h2>" +
      '<form id="f-ad" style="display:grid;gap:14px" novalidate>' +
      '<label>Título<input name="titulo" maxlength="60" value="' + esc(a ? a.titulo : "") + '" placeholder="Ex.: Carro lavado e higienizado" required></label>' +
      '<label>Descrição curta<input name="descricao" maxlength="140" value="' + esc(a ? a.descricao : "") + '" placeholder="Ex.: Lavagem completa por fora e por dentro antes da entrega."></label>' +
      '<label class="check"><input type="checkbox" name="padrao"' + (!a || a.padrao ? " checked" : "") + "> Já vir marcado ao cadastrar um carro novo</label>" +
      '<div class="modal-acoes"><button class="btn" type="button" data-nao>Cancelar</button><button class="btn primary" type="submit">Salvar</button></div></form>'
    );
    j.el.querySelector("[data-nao]").onclick = j.fechar;
    j.el.querySelector("#f-ad").onsubmit = async function (e) {
      e.preventDefault();
      const t = e.target.elements.titulo.value.trim();
      if (!t) { toast("Informe o título.", "erro"); return; }
      const dados = { titulo: t, descricao: e.target.elements.descricao.value.trim(), padrao: e.target.elements.padrao.checked };
      try {
        if (a) { await repo.atualizar("adicionais", a.id, dados); Object.assign(a, dados); }
        else {
          const ordem = ads.reduce(function (m, x) { return Math.max(m, x.ordem || 0); }, 0) + 1;
          Object.assign(dados, { ativo: true, ordem: ordem });
          dados.id = await repo.criar("adicionais", dados); ads.push(dados);
        }
        j.fechar(); desenhar(); toast("Adicional salvo.");
      } catch (err) { toast("Não consegui salvar: " + (err.code || err.message), "erro"); }
    };
    j.el.querySelector("[name=titulo]").focus();
  }

  root.onclick = async function (e) {
    if (e.target.closest("[data-novo]")) { janela(null); return; }
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const lista = ordenarPor(ads, "ordem");
    const i = lista.findIndex(function (x) { return x.id === tr.dataset.id; }), a = lista[i];
    try {
      if (e.target.closest("[data-edit]")) janela(a);
      else if (e.target.closest("[data-sobe],[data-desce]")) {
        const j = e.target.closest("[data-sobe]") ? i - 1 : i + 1;
        if (j < 0 || j >= lista.length) return;
        lista.splice(j, 0, lista.splice(i, 1)[0]);
        const lote = repo.lote();
        lista.forEach(function (x, k) { x.ordem = k + 1; lote.update(repo.ref("adicionais", x.id), { ordem: k + 1 }); });
        await lote.commit(); desenhar();
      } else if (e.target.closest("[data-del]")) {
        const n = uso(a.id);
        if (!(await confirmar({ titulo: "Excluir “" + a.titulo + "”?", texto: n ? "Ele está em " + n + (n === 1 ? " anúncio" : " anúncios") + " e deixará de aparecer neles." : "Esse adicional não está em nenhum anúncio.", ok: "Excluir", perigo: true }))) return;
        await repo.remover("adicionais", a.id);
        ads = ads.filter(function (x) { return x.id !== a.id; });
        desenhar(); toast("Adicional excluído.");
      }
    } catch (err) { toast("Não consegui concluir: " + (err.code || err.message), "erro"); }
  };

  root.onchange = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const a = ads.filter(function (x) { return x.id === tr.dataset.id; })[0];
    const campo = e.target.matches("[data-padrao]") ? "padrao" : e.target.matches("[data-ativo]") ? "ativo" : null;
    if (!campo) return;
    try { await repo.atualizar("adicionais", a.id, { [campo]: e.target.checked }); a[campo] = e.target.checked; toast("Atualizado."); }
    catch (err) { e.target.checked = !e.target.checked; toast("Não consegui salvar: " + (err.code || err.message), "erro"); }
  };
}
