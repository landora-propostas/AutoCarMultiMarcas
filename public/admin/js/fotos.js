// Componentes de foto do painel: galeria do carro e campo de imagem única (logo, hero, etc.).
import { processar, gravar, carregar, miniaturaDe, apagar, chaveDe } from "/js/midia.js";
import { semUndefined } from "/js/modelo.js";
import { esc, ico, toast, abrirModal } from "./ui.js";

function opcoesProc(app, extra) {
  const storage = app.ctx.opcoes.armazenamento === "storage";
  return Object.assign({ max: 1600, limite: storage ? Infinity : undefined }, extra || {});
}

// Preenche _url (endereço para mostrar na tela) de fotos já salvas.
export async function prepararPrevias(app, itens) {
  await Promise.all(itens.map(async function (it) {
    if (it._url || it._novo) return;
    try { it._url = await carregar(app.ctx, it); } catch (e) { it._url = ""; }
  }));
}

// Grava a foto (se for nova) e devolve o objeto limpo que vai para o Firestore.
export async function persistir(app, it, pasta) {
  let base;
  if (it._novo) {
    base = await gravar(app.ctx, it._novo, { pasta: pasta, nome: it.alt || "" });
    if (it._novo.thumbDataUrl) base.thumb = it._novo.thumbDataUrl;
  } else {
    base = { src: it.src, midia: it.midia, path: it.path, thumb: it.thumb };
  }
  return semUndefined(Object.assign(base, { alt: it.alt || "", pos: it.pos || "50% 50%" }));
}

// Miniatura da capa (só no modo "firestore"; no Storage a própria URL já é leve).
export async function miniaturaDaCapa(app, it) {
  if (app.ctx.opcoes.armazenamento === "storage" || it.src) return null;
  if (it._novo && it._novo.thumbDataUrl) return it._novo.thumbDataUrl;
  if (it.thumb) return it.thumb;
  if (!it._url) it._url = await carregar(app.ctx, it);
  return it._url ? miniaturaDe(it._url, 800) : null;
}

// Apaga fotos que não estão mais em uso por nenhum carro nem pelas configurações do site.
// Chame DEPOIS de gravar/excluir o carro: a verificação lê o estado atual do banco.
export async function apagarSemUso(app, imagens) {
  const quer = (imagens || []).filter(Boolean);
  if (!quer.length) return;
  try {
    const [cars, cfg] = await Promise.all([app.repo.listar("carros"), app.repo.obter("config", "site")]);
    const usadas = {};
    const marca = function (i) { if (i) usadas[chaveDe(i)] = 1; };
    cars.forEach(function (c) { marca(c.foto); (c.galeria || []).forEach(marca); });
    if (cfg) {
      marca(cfg.marca && cfg.marca.logo); marca(cfg.marca && cfg.marca.favicon);
      Object.keys(cfg.imagens || {}).forEach(function (k) { marca(cfg.imagens[k]); });
    }
    for (let k = 0; k < quer.length; k++) {
      if (!usadas[chaveDe(quer[k])]) await apagar(app.ctx, quer[k]);
    }
  } catch (e) { console.warn("Não consegui limpar fotos sem uso", e); }
}

/* ---------- Editor de ponto de foco + descrição ---------- */
function editarFoto(it, aoSalvar) {
  let pos = it.pos || "50% 50%";
  const j = abrirModal(
    "<h2>Ajustar foto</h2>" +
    '<p class="dica">Clique na imagem para marcar o ponto que deve ficar sempre visível quando a foto for cortada (no cartão do estoque, por exemplo).</p>' +
    '<div style="text-align:center"><div class="foco-area" data-area><img src="' + esc(it._url) + '" alt=""><i class="mira"></i></div></div>' +
    '<div class="grade g2"><div style="display:grid;gap:6px"><small class="dica">Como aparece no cartão</small><div class="foco-previa"><img src="' + esc(it._url) + '" alt="" style="object-position:' + esc(pos) + '"></div></div>' +
    '<label>Descrição da foto <small>(para acessibilidade e buscadores)</small><input type="text" data-alt maxlength="160" value="' + esc(it.alt) + '" placeholder="Ex.: BMW M4 cinza, vista frontal"></label></div>' +
    '<div class="modal-acoes"><button class="btn" type="button" data-nao>Cancelar</button><button class="btn primary" type="button" data-ok>Aplicar</button></div>',
    { largo: true }
  );
  const area = j.el.querySelector("[data-area]"), mira = j.el.querySelector(".mira"), prev = j.el.querySelector(".foco-previa img");
  const pinta = function () {
    const p = pos.split(" ");
    mira.style.left = p[0]; mira.style.top = p[1];
    prev.style.objectPosition = pos;
  };
  pinta();
  area.onclick = function (e) {
    const r = area.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round((e.clientX - r.left) / r.width * 100)));
    const y = Math.min(100, Math.max(0, Math.round((e.clientY - r.top) / r.height * 100)));
    pos = x + "% " + y + "%"; pinta();
  };
  j.el.querySelector("[data-nao]").onclick = j.fechar;
  j.el.querySelector("[data-ok]").onclick = function () {
    it.pos = pos; it.alt = j.el.querySelector("[data-alt]").value.trim();
    j.fechar(); aoSalvar();
  };
}

/* ---------- Galeria do carro ---------- */
// itens é alterado no lugar. A primeira foto é a capa.
export function galeria(box, app, cfg) {
  const itens = cfg.itens, max = cfg.max || 15;
  const miniatura = app.ctx.opcoes.armazenamento === "storage" ? 0 : 800;

  function tile(it, i) {
    if (it._carregando) return '<div class="foto processando"><div class="spin"></div>Reduzindo…</div>';
    return '<figure class="foto' + (i === 0 ? " capa" : "") + '" data-i="' + i + '">' +
      (i === 0 ? '<span class="selo-capa">Capa</span>' : "") +
      '<img src="' + esc(it._url) + '" alt="' + esc(it.alt) + '" style="object-position:' + esc(it.pos || "50% 50%") + '">' +
      '<div class="foto-acoes"><span>' +
        '<button class="icon-btn mini" type="button" data-a="esq" aria-label="Mover para a esquerda"' + (i === 0 ? " disabled" : "") + ">" + ico("esq") + "</button> " +
        '<button class="icon-btn mini" type="button" data-a="dir" aria-label="Mover para a direita"' + (i === itens.length - 1 ? " disabled" : "") + ">" + ico("dir") + "</button></span><span>" +
        (i > 0 ? '<button class="icon-btn mini" type="button" data-a="capa" title="Definir como capa" aria-label="Definir como capa">' + ico("estrela") + "</button> " : "") +
        '<button class="icon-btn mini" type="button" data-a="editar" title="Ajustar foto" aria-label="Ajustar foto">' + ico("editar") + "</button> " +
        '<button class="icon-btn mini perigo" type="button" data-a="x" title="Remover" aria-label="Remover foto">' + ico("x") + "</button></span></div></figure>";
  }
  function render() {
    box.innerHTML =
      '<div class="zona" data-zona tabindex="0" role="button">' + ico("foto") + "<b>Adicionar fotos</b><span>Clique ou arraste os arquivos para cá. A primeira foto é a capa do anúncio.</span></div>" +
      '<input type="file" accept="image/*" multiple data-arquivo>' +
      (itens.length ? '<div class="fotos">' + itens.map(tile).join("") + "</div>" : "");
  }
  async function adicionar(arquivos) {
    const lista = Array.prototype.slice.call(arquivos).filter(function (f) { return /^image\//.test(f.type); });
    if (!lista.length) { toast("Escolha arquivos de imagem (JPG, PNG ou WebP).", "erro"); return; }
    for (let k = 0; k < lista.length; k++) {
      if (itens.length >= max) { toast("Limite de " + max + " fotos por anúncio.", "info"); break; }
      const ph = { _carregando: true };
      itens.push(ph); render();
      try {
        const p = await processar(lista[k], opcoesProc(app, { miniatura: miniatura }));
        delete ph._carregando;
        Object.assign(ph, { _novo: p, _url: p.dataUrl, alt: "", pos: "50% 50%" });
      } catch (e) {
        itens.splice(itens.indexOf(ph), 1);
        toast(e.message || "Não consegui processar essa foto.", "erro");
      }
      render(); cfg.aoMudar();
    }
  }
  box.addEventListener("click", function (e) {
    if (e.target.closest("[data-zona]")) { box.querySelector("[data-arquivo]").click(); return; }
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const i = parseInt(b.closest("[data-i]").dataset.i, 10), a = b.dataset.a;
    if (a === "esq" && i > 0) itens.splice(i - 1, 0, itens.splice(i, 1)[0]);
    else if (a === "dir" && i < itens.length - 1) itens.splice(i + 1, 0, itens.splice(i, 1)[0]);
    else if (a === "capa") itens.unshift(itens.splice(i, 1)[0]);
    else if (a === "x") itens.splice(i, 1);
    else if (a === "editar") { editarFoto(itens[i], function () { render(); cfg.aoMudar(); }); return; }
    render(); cfg.aoMudar();
  });
  box.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-zona]")) { e.preventDefault(); box.querySelector("[data-arquivo]").click(); }
  });
  box.addEventListener("change", function (e) {
    if (e.target.matches("[data-arquivo]")) { adicionar(e.target.files); e.target.value = ""; }
  });
  box.addEventListener("dragover", function (e) { if (e.target.closest("[data-zona]")) { e.preventDefault(); e.target.closest("[data-zona]").classList.add("sobre"); } });
  box.addEventListener("dragleave", function (e) { const z = e.target.closest("[data-zona]"); if (z) z.classList.remove("sobre"); });
  box.addEventListener("drop", function (e) {
    const z = e.target.closest("[data-zona]");
    if (!z) return;
    e.preventDefault(); z.classList.remove("sobre");
    adicionar(e.dataTransfer.files);
  });
  render();
  return { render: render };
}

/* ---------- Imagem única (logo, hero, foto da concessionária...) ---------- */
// cfg: { valor, padrao, proc, cobre, escura, texto }. valor() devolve o item atual (null = voltar ao padrão).
export function campoImagem(box, app, cfg) {
  const estado = { item: cfg.valor ? Object.assign({}, cfg.valor) : null, mudou: false, carregando: false };
  const id = "img-" + Math.random().toString(36).slice(2, 8);

  function render() {
    const url = estado.item ? (estado.item._url || "") : cfg.padrao;
    box.innerHTML =
      '<div class="campo-img"><div class="previa' + (cfg.cobre ? " cobre" : "") + (cfg.escura ? " escura" : "") + '">' +
      (estado.carregando ? '<div class="spin"></div>' : (url ? '<img src="' + esc(url) + '" alt="">' : "")) + "</div>" +
      '<div class="corpo"><div class="botoes"><label class="btn peq" for="' + id + '" style="cursor:pointer">' + ico("enviar") + (estado.item ? "Trocar imagem" : "Enviar imagem") + "</label>" +
      (estado.item ? '<button class="btn peq" type="button" data-padrao>Voltar à imagem padrão</button>' : "") + "</div>" +
      '<input type="file" id="' + id + '" accept="' + (cfg.aceita || "image/*") + '">' +
      '<p class="dica">' + esc(cfg.texto || "") + (estado.item ? "" : " Hoje o site usa a imagem padrão.") + "</p></div></div>";
  }
  box.addEventListener("change", async function (e) {
    if (!e.target.matches('input[type="file"]') || !e.target.files[0]) return;
    const arq = e.target.files[0]; e.target.value = "";
    estado.carregando = true; render();
    try {
      const p = await processar(arq, opcoesProc(app, cfg.proc));
      estado.item = { _novo: p, _url: p.dataUrl, alt: "", pos: "50% 50%" };
      estado.mudou = true;
    } catch (err) { toast(err.message || "Não consegui processar essa imagem.", "erro"); }
    estado.carregando = false; render();
    if (cfg.aoMudar) cfg.aoMudar();
  });
  box.addEventListener("click", function (e) {
    if (e.target.closest("[data-padrao]")) {
      estado.item = null; estado.mudou = true; render();
      if (cfg.aoMudar) cfg.aoMudar();
    }
  });
  render();
  if (estado.item) {
    carregar(app.ctx, estado.item).then(function (u) { if (estado.item && !estado.item._url) { estado.item._url = u; render(); } }).catch(function () {});
  }
  return { item: function () { return estado.item; }, mudou: function () { return estado.mudou; } };
}
