// Cadastro e edição de um anúncio de carro.
import { esc, toast, mascaraNumero, ordenarPor, ico } from "../ui.js";
import { galeria, prepararPrevias, persistir, miniaturaDaCapa, apagarSemUso } from "../fotos.js";
import { apagar, chaveDe } from "/js/midia.js";
import {
  STATUS, CONDICOES, CAMBIOS, COMBUSTIVEIS, FICHA_PADRAO, HISTORICO_SUGESTOES,
  carroNovo, validarCarro, anoPartes, slugify, milhar, potenciaTxt, hoje
} from "/js/modelo.js";

export async function carroForm(root, app, slugEditar) {
  const repo = app.repo, novo = !slugEditar;
  const [cats, ads, doc] = await Promise.all([
    repo.listar("categorias"), repo.listar("adicionais"), novo ? null : repo.obter("carros", slugEditar)
  ]);
  if (!novo && !doc) {
    root.innerHTML = '<div class="vazio">Esse anúncio não existe mais. <a class="link" href="#/carros">Voltar ao estoque</a></div>';
    return;
  }
  const categorias = ordenarPor(cats, "ordem").filter(function (c) { return c.ativa !== false || (doc && doc.categoria === c.id); });
  const catalogo = ordenarPor(ads, "ordem").filter(function (a) { return a.ativo !== false; });

  /* ---------- Estado ---------- */
  let S, originais = [];
  if (novo) {
    S = carroNovo({ categoria: categorias[0] ? categorias[0].id : "", adicionais: catalogo.filter(function (a) { return a.padrao; }).map(function (a) { return a.id; }) });
  } else {
    const p = anoPartes(doc.ano);
    const imgs = (doc.galeria || []).map(function (i) { return Object.assign({}, i); });
    if (doc.foto && !imgs.some(function (i) { return chaveDe(i) === chaveDe(doc.foto); })) imgs.unshift(Object.assign({}, doc.foto));
    if (doc.foto) imgs.forEach(function (i) { if (chaveDe(i) === chaveDe(doc.foto) && doc.foto.thumb) i.thumb = doc.foto.thumb; });
    originais = [doc.foto].concat(doc.galeria || []).filter(Boolean);
    S = {
      slug: doc.id, nome: doc.nome || "", marca: doc.marca || "", categoria: doc.categoria || "", condicao: doc.condicao || "Seminovo",
      status: doc.status || "rascunho", ano1: p[0], ano2: p[1], km: doc.km || 0, preco: doc.preco || 0, cor: doc.cor || "",
      motor: doc.motor || "", potencia: doc.potencia || "", cambio: doc.cambio || "", combustivel: doc.combustivel || "",
      fotos: imgs, destaques: (doc.destaques || []).map(function (d) { return { rotulo: d.rotulo || "", valor: d.valor || "" }; }),
      ficha: (doc.ficha || []).map(function (d) { return { rotulo: d.rotulo || "", valor: d.valor || "" }; }),
      historico: (doc.historico || []).slice(), adicionais: (doc.adicionais || []).slice(),
      extras: (doc.adicionaisExtras || []).map(function (a) { return { titulo: a.titulo || "", descricao: a.descricao || "" }; }),
      descricao: doc.descricao || ""
    };
    await prepararPrevias(app, S.fotos);
  }
  let slugAuto = novo;
  const marcar = function () { app.sujo = true; };

  /* ---------- Modelo da tela ---------- */
  const campo = function (k, rotulo, extra, dica) {
    return '<label data-campo="' + k + '">' + rotulo + '<input data-k="' + k + '" value="' + esc(S[k]) + '" ' + (extra || "") + ">" +
      (dica ? '<small>' + dica + "</small>" : "") + '<span class="msg-erro" hidden></span></label>';
  };
  const opcoes = function (lista, atual) {
    return lista.map(function (o) { return '<option value="' + esc(o) + '"' + (o === atual ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("");
  };
  const datalist = function (id, lista) { return '<datalist id="' + id + '">' + lista.map(function (o) { return '<option value="' + esc(o) + '">'; }).join("") + "</datalist>"; };

  root.innerHTML =
    '<div class="cab"><div><h1>' + (novo ? "Novo carro" : "Editar anúncio") + "</h1><p>" + (novo ? "Preencha os dados. Você pode salvar como rascunho e publicar depois." : esc(S.nome)) + "</p></div>" +
    '<div class="acoes"><a class="btn" href="#/carros">Voltar</a>' + (!novo && S.status === "publicado" ? '<a class="btn" target="_blank" rel="noopener" href="/#carro/' + encodeURIComponent(S.slug) + '">Ver no site ↗</a>' : "") + "</div></div>" +

    '<section class="cartao"><div class="cartao-topo"><h2>Identificação</h2></div><div class="grade g3 f-ident">' +
      campo("nome", "Nome do anúncio", 'maxlength="80" placeholder="Ex.: BMW M4 Competition"') +
      campo("marca", "Marca", 'maxlength="40" placeholder="Ex.: BMW"') +
      '<label data-campo="categoria">Categoria<select data-k="categoria">' +
        (categorias.length ? categorias.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === S.categoria ? " selected" : "") + ">" + esc(c.nome) + "</option>"; }).join("") : '<option value="">Crie uma categoria primeiro</option>') +
        '</select><span class="msg-erro" hidden></span>' + (categorias.length ? "" : '<small><a class="link" href="#/categorias">Ir para Categorias</a></small>') + "</label>" +
      '<label data-campo="condicao">Condição<select data-k="condicao">' + opcoes(CONDICOES, S.condicao) + "</select></label>" +
      '<label data-campo="status">Situação do anúncio<select data-k="status">' +
        Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === S.status ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") +
        "</select><small>Só “Publicado” aparece no site. “Vendido” guarda o histórico sem mostrar ao público.</small></label>" +
      campo("slug", "Endereço do anúncio", (novo ? "" : "readonly ") + 'maxlength="60"', novo ? "Gerado pelo nome. É a parte final do link: /#carro/<b>endereço</b>" : "Não muda depois de criado, para os links continuarem funcionando.") +
    "</div></section>" +

    '<section class="cartao"><div class="cartao-topo"><h2>Dados do carro</h2></div><div class="grade g3">' +
      '<label data-campo="ano">Ano (fabricação / modelo)<span style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input data-k="ano1" inputmode="numeric" maxlength="4" placeholder="2023" value="' + esc(S.ano1) + '"><input data-k="ano2" inputmode="numeric" maxlength="4" placeholder="2024" value="' + esc(S.ano2) + '"></span><span class="msg-erro" hidden></span></label>' +
      '<label data-campo="km">Quilometragem<input data-k="km" data-num inputmode="numeric" placeholder="0" value="' + (S.km ? milhar(S.km) : (novo ? "" : "0")) + '"><small>Use 0 para carro zero quilômetro.</small><span class="msg-erro" hidden></span></label>' +
      '<label data-campo="preco">Preço (R$)<input data-k="preco" data-num inputmode="numeric" placeholder="0" value="' + (S.preco ? milhar(S.preco) : "") + '"><span class="msg-erro" hidden></span></label>' +
      campo("motor", "Motor", 'maxlength="60" placeholder="Ex.: 3.0 biturbo"') +
      campo("potencia", "Potência", 'maxlength="30" placeholder="Ex.: 510 cv"') +
      campo("cor", "Cor", 'maxlength="40" placeholder="Ex.: Cinza metálico"') +
      campo("cambio", "Câmbio", 'list="dl-cambio" maxlength="40" placeholder="Ex.: Automático"') +
      campo("combustivel", "Combustível", 'list="dl-comb" maxlength="40" placeholder="Ex.: Gasolina"') +
    "</div>" + datalist("dl-cambio", CAMBIOS) + datalist("dl-comb", COMBUSTIVEIS) + "</section>" +

    '<section class="cartao" data-campo="fotos"><div class="cartao-topo"><div><h2>Fotos</h2><p>Reduzidas automaticamente para carregar rápido. Use “ajustar” para escolher o ponto de foco.</p></div></div><div id="galeria"></div><span class="msg-erro" hidden></span></section>' +

    '<section class="cartao"><div class="cartao-topo"><div><h2>Destaques do cartão</h2><p>Os dados que aparecem ao passar o mouse sobre o carro no estoque. Use até 4.</p></div><button class="btn peq" type="button" data-add="destaques">+ Destaque</button></div><div class="lista-linhas" id="l-destaques"></div></section>' +

    '<section class="cartao"><div class="cartao-topo"><div><h2>Ficha técnica</h2><p>Lista completa mostrada na página do anúncio.</p></div><div class="acoes" style="display:flex;gap:8px"><button class="btn peq" type="button" data-modelo-ficha>Preencher modelo</button><button class="btn peq" type="button" data-add="ficha">+ Item</button></div></div><div class="lista-linhas" id="l-ficha"></div>' + datalist("dl-ficha", FICHA_PADRAO) + "</section>" +

    '<section class="cartao"><div class="cartao-topo"><div><h2>Histórico</h2><p>Itens com ✓ na página do anúncio. As frases sugeridas alimentam o filtro “Diferenciais” da busca.</p></div></div><div class="chips" id="sug-hist"></div><div class="lista-linhas" id="l-historico"></div><div><button class="btn peq" type="button" data-add="historico">+ Item</button></div></section>' +

    '<section class="cartao"><div class="cartao-topo"><div><h2>Adicionais da entrega</h2><p>Marque o que acompanha a entrega <b>deste</b> carro. O catálogo é gerenciado em <a class="link" href="#/adicionais">Adicionais de entrega</a>.</p></div></div><div class="opcoes" id="l-adicionais"></div>' +
      '<div class="cartao-topo"><div><h3 style="font-size:15px">Extras só deste anúncio</h3><p>Algo que vale apenas para este carro e não está no catálogo.</p></div><button class="btn peq" type="button" data-add="extras">+ Extra</button></div><div class="lista-linhas" id="l-extras"></div></section>' +

    '<section class="cartao"><div class="cartao-topo"><h2>Sobre o carro</h2></div><label data-campo="descricao">Descrição<textarea data-k="descricao" maxlength="2000" rows="6" placeholder="Conte o estado do carro, itens de série e o que o torna especial.">' + esc(S.descricao) + '</textarea></label></section>' +

    '<div class="barra-salvar"><span class="esq" id="estado-salvar"></span><a class="btn" href="#/carros">Cancelar</a>' +
      '<button class="btn" type="button" id="b-salvar">Salvar</button>' +
      '<button class="btn primary" type="button" id="b-publicar">' + (S.status === "publicado" ? "Salvar e manter publicado" : "Salvar e publicar") + "</button></div>";

  /* ---------- Listas dinâmicas ---------- */
  const botX = function (lista, i) { return '<button class="icon-btn mini perigo" type="button" data-del="' + lista + ":" + i + '" aria-label="Remover">' + ico("x") + "</button>"; };
  const desenhar = {
    destaques: function () {
      root.querySelector("#l-destaques").innerHTML = S.destaques.map(function (d, i) {
        return '<div class="linha"><input data-l="destaques" data-i="' + i + '" data-c="rotulo" value="' + esc(d.rotulo) + '" placeholder="Rótulo (ex.: 0 a 100 km/h)" maxlength="40" aria-label="Rótulo do destaque">' +
          '<input data-l="destaques" data-i="' + i + '" data-c="valor" value="' + esc(d.valor) + '" placeholder="Valor (ex.: 3,5 s)" maxlength="40" aria-label="Valor do destaque">' + botX("destaques", i) + "</div>";
      }).join("") || '<p class="dica">Nenhum destaque.</p>';
    },
    ficha: function () {
      root.querySelector("#l-ficha").innerHTML = S.ficha.map(function (d, i) {
        return '<div class="linha"><input list="dl-ficha" data-l="ficha" data-i="' + i + '" data-c="rotulo" value="' + esc(d.rotulo) + '" placeholder="Item (ex.: Motor)" maxlength="50" aria-label="Item da ficha">' +
          '<input data-l="ficha" data-i="' + i + '" data-c="valor" value="' + esc(d.valor) + '" placeholder="Valor (ex.: 3.0 L, 6 cilindros)" maxlength="80" aria-label="Valor">' + botX("ficha", i) + "</div>";
      }).join("") || '<p class="dica">Nenhum item. Use “Preencher modelo” para começar com os campos mais comuns.</p>';
    },
    historico: function () {
      root.querySelector("#l-historico").innerHTML = S.historico.map(function (h, i) {
        return '<div class="linha uma"><input data-l="historico" data-i="' + i + '" value="' + esc(h) + '" placeholder="Ex.: Único dono" maxlength="80" aria-label="Item do histórico">' + botX("historico", i) + "</div>";
      }).join("");
      root.querySelector("#sug-hist").innerHTML = HISTORICO_SUGESTOES.map(function (s) {
        const on = S.historico.indexOf(s) >= 0;
        return '<button type="button" class="chip' + (on ? " on" : "") + '" data-sug="' + esc(s) + '">' + (on ? "✓ " : "+ ") + esc(s) + "</button>";
      }).join("");
    },
    adicionais: function () {
      const el = root.querySelector("#l-adicionais");
      el.innerHTML = catalogo.length ? catalogo.map(function (a) {
        return '<label class="opcao"><input type="checkbox" data-ad="' + esc(a.id) + '"' + (S.adicionais.indexOf(a.id) >= 0 ? " checked" : "") + '><span><b>' + esc(a.titulo) + "</b><small>" + esc(a.descricao || "") + "</small></span></label>";
      }).join("") : '<p class="vazio" style="grid-column:1/-1">O catálogo está vazio. <a class="link" href="#/adicionais">Cadastrar adicionais</a></p>';
    },
    extras: function () {
      root.querySelector("#l-extras").innerHTML = S.extras.map(function (d, i) {
        return '<div class="linha linha-extra"><input data-l="extras" data-i="' + i + '" data-c="titulo" value="' + esc(d.titulo) + '" placeholder="Título (ex.: Película nova)" maxlength="60" aria-label="Título do extra">' +
          '<input data-l="extras" data-i="' + i + '" data-c="descricao" value="' + esc(d.descricao) + '" placeholder="Descrição curta" maxlength="120" aria-label="Descrição do extra">' + botX("extras", i) + "</div>";
      }).join("") || '<p class="dica">Nenhum extra.</p>';
    }
  };
  Object.keys(desenhar).forEach(function (k) { desenhar[k](); });
  galeria(root.querySelector("#galeria"), app, { itens: S.fotos, aoMudar: function () { marcar(); limparErro("fotos"); } });

  /* ---------- Eventos ---------- */
  function limparErro(k) {
    const w = root.querySelector('[data-campo="' + k + '"]');
    if (!w) return;
    w.classList.remove("invalido");
    const m = w.querySelector(".msg-erro"); if (m) m.hidden = true;
  }
  root.oninput = function (e) {
    const t = e.target;
    if (t.dataset.l) {
      const l = S[t.dataset.l], i = +t.dataset.i;
      if (t.dataset.c) l[i][t.dataset.c] = t.value; else l[i] = t.value;
      marcar(); return;
    }
    const k = t.dataset.k;
    if (!k) return;
    S[k] = t.hasAttribute("data-num") ? mascaraNumero(t) : t.value;
    if (k === "nome" && slugAuto) { S.slug = slugify(S.nome); root.querySelector('[data-k="slug"]').value = S.slug; }
    if (k === "slug") { slugAuto = false; }
    if (k === "ano1" || k === "ano2") limparErro("ano"); else limparErro(k);
    marcar();
  };
  root.onchange = function (e) {
    const t = e.target;
    if (t.dataset.ad) {
      const i = S.adicionais.indexOf(t.dataset.ad);
      if (t.checked && i < 0) S.adicionais.push(t.dataset.ad);
      if (!t.checked && i >= 0) S.adicionais.splice(i, 1);
      marcar(); return;
    }
    if (t.dataset.k === "status") {
      S.status = t.value;
      root.querySelector("#b-publicar").textContent = S.status === "publicado" ? "Salvar e manter publicado" : "Salvar e publicar";
      marcar();
    }
    if (t.dataset.k === "ano1" && !S.ano2 && /^\d{4}$/.test(S.ano1)) { S.ano2 = S.ano1; root.querySelector('[data-k="ano2"]').value = S.ano2; }
  };
  root.onclick = function (e) {
    const add = e.target.closest("[data-add]"), del = e.target.closest("[data-del]"), sug = e.target.closest("[data-sug]");
    if (add) {
      const k = add.dataset.add;
      if (k === "destaques" && S.destaques.length >= 4) { toast("Use até 4 destaques para o cartão não ficar apertado.", "info"); return; }
      S[k].push(k === "historico" ? "" : k === "extras" ? { titulo: "", descricao: "" } : { rotulo: "", valor: "" });
      desenhar[k](); marcar();
      const nova = root.querySelector("#l-" + k + " .linha:last-child input"); if (nova) nova.focus();
    } else if (del) {
      const p = del.dataset.del.split(":");
      S[p[0]].splice(+p[1], 1); desenhar[p[0]](); marcar();
    } else if (sug) {
      const i = S.historico.indexOf(sug.dataset.sug);
      if (i >= 0) S.historico.splice(i, 1); else S.historico.push(sug.dataset.sug);
      desenhar.historico(); marcar();
    } else if (e.target.closest("[data-modelo-ficha]")) {
      FICHA_PADRAO.forEach(function (r) { if (!S.ficha.some(function (x) { return x.rotulo === r; })) S.ficha.push({ rotulo: r, valor: "" }); });
      desenhar.ficha(); marcar();
    } else if (e.target.closest("#b-salvar")) salvar(false);
    else if (e.target.closest("#b-publicar")) salvar(true);
  };

  /* ---------- Salvar ---------- */
  function mostrarErros(erros) {
    root.querySelectorAll(".invalido").forEach(function (w) { w.classList.remove("invalido"); });
    root.querySelectorAll(".msg-erro").forEach(function (m) { m.hidden = true; });
    let primeiro = null;
    Object.keys(erros).forEach(function (k) {
      const w = root.querySelector('[data-campo="' + k + '"]');
      if (!w) return;
      w.classList.add("invalido");
      const m = w.querySelector(".msg-erro"); if (m) { m.textContent = erros[k]; m.hidden = false; }
      if (!primeiro) primeiro = w;
    });
    if (primeiro) primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  let salvando = false;
  async function salvar(publicar) {
    if (salvando) return;
    if (publicar) { S.status = "publicado"; root.querySelector('[data-k="status"]').value = "publicado"; }
    S.potencia = potenciaTxt(S.potencia);
    root.querySelector('[data-k="potencia"]').value = S.potencia;
    if (S.fotos.some(function (f) { return f._carregando; })) { toast("Aguarde as fotos terminarem de ser reduzidas.", "info"); return; }
    const erros = validarCarro(S, { novo: novo, slugs: [] });
    if (!erros.slug && novo) {
      try { if (await repo.obter("carros", S.slug)) erros.slug = "Já existe um carro com esse endereço."; } catch (e) { /* o save acusa */ }
    }
    mostrarErros(erros);
    if (Object.keys(erros).length) { toast("Confira os campos destacados.", "erro"); return; }

    salvando = true;
    const botoes = root.querySelectorAll("#b-salvar, #b-publicar");
    botoes.forEach(function (b) { b.disabled = true; });
    const estado = root.querySelector("#estado-salvar");
    estado.textContent = S.fotos.some(function (f) { return f._novo; }) ? "Enviando fotos…" : "Salvando…";
    const criadas = [];
    try {
      const salvas = [];
      for (let k = 0; k < S.fotos.length; k++) {
        const it = S.fotos[k], era = !!it._novo;
        const g = await persistir(app, it, "carros/" + S.slug);
        if (era) criadas.push(g);
        salvas.push(g);
      }
      let capa = null;
      if (salvas.length) {
        capa = Object.assign({}, salvas[0]);
        const th = await miniaturaDaCapa(app, S.fotos[0]);
        if (th) capa.thumb = th; else delete capa.thumb;
      }
      const galeriaFinal = salvas.map(function (g) { const c = Object.assign({}, g); delete c.thumb; return c; });
      const dados = {
        slug: S.slug, nome: S.nome.trim(), marca: S.marca.trim(), categoria: S.categoria, condicao: S.condicao, status: S.status,
        ano: S.ano1 + "/" + S.ano2, km: S.km, preco: S.preco, cor: S.cor.trim(), motor: S.motor.trim(), potencia: S.potencia,
        cambio: S.cambio.trim(), combustivel: S.combustivel.trim(),
        foto: capa, galeria: galeriaFinal,
        destaques: S.destaques.filter(function (d) { return d.rotulo.trim() || d.valor.trim(); }).map(function (d) { return { rotulo: d.rotulo.trim(), valor: d.valor.trim() }; }),
        ficha: S.ficha.filter(function (d) { return d.rotulo.trim() || d.valor.trim(); }).map(function (d) { return { rotulo: d.rotulo.trim(), valor: d.valor.trim() }; }),
        historico: S.historico.map(function (h) { return h.trim(); }).filter(Boolean),
        adicionais: S.adicionais.slice(),
        adicionaisExtras: S.extras.filter(function (a) { return a.titulo.trim(); }).map(function (a) { return { titulo: a.titulo.trim(), descricao: a.descricao.trim() }; }),
        descricao: S.descricao.trim()
      };
      if (novo) { dados.procura = 0; dados.adicionado = hoje(); dados.ordem = -Math.floor(Date.now() / 1000); dados.criadoEm = app.ctx.fs.serverTimestamp(); }
      await repo.salvar("carros", S.slug, dados);
      const removidas = originais.filter(function (o) { return !salvas.some(function (g) { return chaveDe(g) === chaveDe(o); }); });
      await apagarSemUso(app, removidas);
      app.sujo = false;
      toast(S.status === "publicado" ? "Anúncio salvo e publicado no site." : "Anúncio salvo.");
      location.hash = "#/carros";
    } catch (err) {
      console.error(err);
      for (let k = 0; k < criadas.length; k++) await apagar(app.ctx, criadas[k]);
      estado.textContent = "";
      const negado = err && err.code === "permission-denied";
      toast(negado ? "O Firestore recusou o salvamento. Confira as regras e se seu e-mail está em Equipe." : "Não consegui salvar: " + (err.message || err.code), "erro");
      botoes.forEach(function (b) { b.disabled = false; });
      salvando = false;
    }
  }
}
