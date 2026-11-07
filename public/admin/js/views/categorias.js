// Categorias: aparecem como filtros ("pílulas") no estoque do site.
import { esc, toast, confirmar, ico, ordenarPor } from "../ui.js";
import { slugify } from "/js/modelo.js";

export async function categorias(root, app) {
  const repo = app.repo;
  let [cats, cars] = await Promise.all([repo.listar("categorias"), repo.listar("carros")]);

  function uso(id) { return cars.filter(function (c) { return c.categoria === id; }).length; }

  function desenhar() {
    const lista = ordenarPor(cats, "ordem");
    root.innerHTML =
      '<div class="cab"><div><h1>Categorias</h1><p>Separam o estoque no site (Todos, Cupês, Sedãs, SUVs…). Só aparecem no site as que têm carro publicado.</p></div></div>' +
      '<section class="cartao"><div class="cartao-topo"><h2>Nova categoria</h2></div>' +
      '<form id="f-nova" class="linha uma" style="grid-template-columns:1fr auto" novalidate><input name="nome" maxlength="30" placeholder="Nome como aparece no filtro (ex.: Picapes)" aria-label="Nome da categoria" required><button class="btn primary" type="submit">Adicionar</button></form></section>' +
      (lista.length ? '<div class="tabela-rolagem"><table><thead><tr><th>Ordem</th><th>Nome</th><th>Endereço</th><th>Carros</th><th>Visível</th><th></th></tr></thead><tbody>' +
        lista.map(function (c, i) {
          return '<tr data-id="' + esc(c.id) + '"><td style="white-space:nowrap">' +
            '<button class="icon-btn mini" type="button" data-sobe aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + ico("cima") + "</button> " +
            '<button class="icon-btn mini" type="button" data-desce aria-label="Descer"' + (i === lista.length - 1 ? " disabled" : "") + ">" + ico("baixo") + "</button></td>" +
            '<td><input data-nome value="' + esc(c.nome) + '" maxlength="30" aria-label="Nome" style="min-width:150px"></td>' +
            "<td><code>" + esc(c.id) + "</code></td><td>" + uso(c.id) + "</td>" +
            '<td><label class="check"><input type="checkbox" data-ativa' + (c.ativa !== false ? " checked" : "") + ' aria-label="Visível no site"></label></td>' +
            '<td class="acoes-col"><button class="btn peq perigo" type="button" data-del>Excluir</button></td></tr>';
        }).join("") + "</tbody></table></div>" : '<div class="vazio">Nenhuma categoria ainda.</div>');
  }
  desenhar();

  root.onsubmit = async function (e) {
    e.preventDefault();
    const nome = e.target.elements.nome.value.trim();
    const id = slugify(nome);
    if (!nome || !id) { toast("Digite o nome da categoria.", "erro"); return; }
    if (cats.some(function (c) { return c.id === id; })) { toast("Já existe uma categoria com esse nome.", "erro"); return; }
    const ordem = cats.reduce(function (m, c) { return Math.max(m, c.ordem || 0); }, 0) + 1;
    try {
      await repo.salvar("categorias", id, { nome: nome, ordem: ordem, ativa: true, criadoEm: app.ctx.fs.serverTimestamp() }, true);
      cats.push({ id: id, nome: nome, ordem: ordem, ativa: true });
      desenhar(); toast("Categoria criada.");
    } catch (err) { toast("Não consegui criar: " + (err.code || err.message), "erro"); }
  };

  root.onchange = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const c = cats.filter(function (x) { return x.id === tr.dataset.id; })[0];
    try {
      if (e.target.matches("[data-nome]")) {
        const nome = e.target.value.trim();
        if (!nome) { e.target.value = c.nome; return; }
        await repo.atualizar("categorias", c.id, { nome: nome }); c.nome = nome; toast("Nome atualizado.");
      } else if (e.target.matches("[data-ativa]")) {
        await repo.atualizar("categorias", c.id, { ativa: e.target.checked }); c.ativa = e.target.checked;
        toast(c.ativa ? "Categoria visível." : "Categoria oculta do site.");
      }
    } catch (err) { toast("Não consegui salvar: " + (err.code || err.message), "erro"); }
  };

  root.onclick = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const lista = ordenarPor(cats, "ordem");
    const i = lista.findIndex(function (x) { return x.id === tr.dataset.id; }), c = lista[i];
    try {
      if (e.target.closest("[data-sobe],[data-desce]")) {
        const j = e.target.closest("[data-sobe]") ? i - 1 : i + 1;
        if (j < 0 || j >= lista.length) return;
        lista.splice(j, 0, lista.splice(i, 1)[0]);
        const lote = repo.lote();
        lista.forEach(function (x, k) { x.ordem = k + 1; lote.update(repo.ref("categorias", x.id), { ordem: k + 1 }); });
        await lote.commit(); desenhar();
      } else if (e.target.closest("[data-del]")) {
        const n = uso(c.id);
        if (n) { toast("Essa categoria tem " + n + (n === 1 ? " carro" : " carros") + ". Mude a categoria deles antes de excluir (ou desmarque “Visível”).", "erro"); return; }
        if (!(await confirmar({ titulo: "Excluir “" + c.nome + "”?", texto: "A categoria some do filtro do site.", ok: "Excluir", perigo: true }))) return;
        await repo.remover("categorias", c.id);
        cats = cats.filter(function (x) { return x.id !== c.id; });
        desenhar(); toast("Categoria excluída.");
      }
    } catch (err) { toast("Não consegui concluir: " + (err.code || err.message), "erro"); }
  };
}
