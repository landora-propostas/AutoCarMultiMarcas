// Categorias: só visualização. Elas fazem parte da estrutura do site (filtros do estoque e carro do topo),
// então criar ou alterar categorias é feito pelos desenvolvedores.
import { esc, abrirModal, ordenarPor } from "../ui.js";

export async function categorias(root, app) {
  const [cats, cars] = await Promise.all([app.repo.listar("categorias"), app.repo.listar("carros")]);
  const uso = function (id) { return cars.filter(function (c) { return c.categoria === id; }).length; };
  const pub = function (id) { return cars.filter(function (c) { return c.categoria === id && c.status === "publicado"; }).length; };
  const lista = ordenarPor(cats, "ordem");

  root.innerHTML =
    '<div class="cab"><div><h1>Categorias</h1><p>Os tipos de carro usados nos filtros do estoque e na busca do topo do site.</p></div>' +
    '<div class="acoes"><button class="btn primary" type="button" id="cat-add">+ Adicionar categoria</button></div></div>' +
    (lista.length
      ? '<div class="cat-grade">' + lista.map(function (c) {
          return '<article class="cat-cartao">' +
            '<div><b>' + esc(c.nome) + "</b><code>" + esc(c.id) + "</code></div>" +
            '<dl><div><dt>Carros</dt><dd>' + uso(c.id) + "</dd></div><div><dt>Publicados</dt><dd>" + pub(c.id) + "</dd></div></dl>" +
            '<span class="selo ' + (c.ativa !== false ? "publicado" : "rascunho") + '">' + (c.ativa !== false ? "Visível no site" : "Oculta") + "</span>" +
          "</article>";
        }).join("") + "</div>"
      : '<div class="vazio">Nenhuma categoria cadastrada ainda. Faça a primeira configuração na Visão geral.</div>') +
    '<p class="dica">Para escolher a categoria de um carro, use o campo <b>Categoria</b> no cadastro do carro.</p>';

  root.querySelector("#cat-add").onclick = function () {
    const j = abrirModal(
      "<h2>Adicionar categoria</h2>" +
      "<p>As categorias fazem parte da estrutura do site: cada uma tem filtro próprio no estoque e um carro no topo da página. " +
      "Para criar ou alterar uma categoria, entre em contato com os desenvolvedores.</p>" +
      '<p class="dica">Landora · <a class="link" href="mailto:landora.proposta@gmail.com">landora.proposta@gmail.com</a></p>' +
      '<div class="modal-acoes"><button class="btn primary" type="button" data-ok>Entendi</button></div>'
    );
    j.el.querySelector("[data-ok]").onclick = j.fechar;
  };
}
