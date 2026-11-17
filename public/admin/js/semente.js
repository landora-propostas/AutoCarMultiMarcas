import { CATEGORIAS_PADRAO, ADICIONAIS_PADRAO, slugify } from "/js/modelo.js";

export async function inicializarSite(app) {
  const f = app.ctx.fs, repo = app.repo;
  const lote = repo.lote();
  const agora = f.serverTimestamp();

  CATEGORIAS_PADRAO.forEach(function (c) {
    lote.set(repo.ref("categorias", c.id), { nome: c.nome, ordem: c.ordem, ativa: true, criadoEm: agora });
  });
  ADICIONAIS_PADRAO.forEach(function (a, i) {
    const id = slugify(a[0]) || "adicional-" + (i + 1);
    lote.set(repo.ref("adicionais", id), { titulo: a[0], descricao: a[1] || "", padrao: true, ativo: true, ordem: i + 1, criadoEm: agora });
  });
  lote.set(repo.ref("config", "site"), { inicializado: true, criadoEm: agora, atualizadoEm: agora });
  await lote.commit();
}
