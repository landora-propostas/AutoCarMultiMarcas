// Primeira configuração: cria categorias, adicionais e o documento config/site.
// Opcionalmente importa os carros de exemplo que vêm no repositório (public/js/carros.js).
import { CATEGORIAS_PADRAO, carroDoSeed, slugify, semUndefined } from "/js/modelo.js";

function carregarScript(src) {
  return new Promise(function (ok, erro) {
    const s = document.createElement("script");
    s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("Não consegui ler " + src)); };
    document.head.appendChild(s);
  });
}

export async function inicializarSite(app, opcoes) {
  const f = app.ctx.fs, repo = app.repo;
  await carregarScript("/js/carros.js");
  const adicionais = window.ADICIONAIS || [], carros = window.CARROS || [];
  const lote = repo.lote();
  const agora = f.serverTimestamp();

  CATEGORIAS_PADRAO.forEach(function (c) {
    lote.set(repo.ref("categorias", c.id), { nome: c.nome, ordem: c.ordem, ativa: true, criadoEm: agora });
  });
  const idsAdicionais = [];
  adicionais.forEach(function (a, i) {
    const id = slugify(a[0]) || "adicional-" + (i + 1);
    idsAdicionais.push(id);
    lote.set(repo.ref("adicionais", id), { titulo: a[0], descricao: a[1] || "", padrao: true, ativo: true, ordem: i + 1, criadoEm: agora });
  });
  if (opcoes.importar) {
    carros.forEach(function (c, i) {
      const d = carroDoSeed(c, i);
      d.adicionais = idsAdicionais.slice();
      d.criadoEm = agora; d.atualizadoEm = agora;
      lote.set(repo.ref("carros", c.slug), semUndefined(d));
    });
  }
  lote.set(repo.ref("config", "site"), { inicializado: true, criadoEm: agora, atualizadoEm: agora });
  await lote.commit();
  return { carros: opcoes.importar ? carros.length : 0, adicionais: adicionais.length };
}
