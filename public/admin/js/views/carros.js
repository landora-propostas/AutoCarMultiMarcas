// Lista de carros (estoque) e roteamento para o formulário de cadastro/edição.
import { esc, toast, confirmar, debounce, ordenarPor } from "../ui.js";
import { carroForm } from "./carro-form.js";
import { apagarSemUso, persistir } from "../fotos.js";
import { processar } from "/js/midia.js";
import { STATUS, reais, milhar, hoje, SEM_FOTO } from "/js/modelo.js";

export async function carros(root, app, args) {
  if (args[0] === "novo") return carroForm(root, app, null);
  if (args[0] === "editar" && args[1]) return carroForm(root, app, decodeURIComponent(args[1]));
  return lista(root, app);
}

async function lista(root, app) {
  const [todos, cats] = await Promise.all([app.repo.listar("carros"), app.repo.listar("categorias")]);
  const nomeCat = {};
  cats.forEach(function (c) { nomeCat[c.id] = c.nome; });
  const f = { q: "", cat: "", status: "" };
  const norm = function (t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };

  root.innerHTML =
    '<div class="cab"><div><h1>Carros</h1><p id="resumo"></p></div><div class="acoes"><button class="btn" type="button" id="b-importar">Importar catálogo</button><input type="file" id="f-importar" webkitdirectory multiple hidden><a class="btn primary" href="#/carros/novo">+ Novo carro</a></div></div>' +
    '<div class="barra-filtros"><input type="search" id="f-q" placeholder="Buscar por nome ou marca" aria-label="Buscar">' +
    '<select id="f-cat" aria-label="Categoria"><option value="">Todas as categorias</option>' +
      ordenarPor(cats, "ordem").map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.nome) + "</option>"; }).join("") + "</select>" +
    '<select id="f-status" aria-label="Situação"><option value="">Todas as situações</option>' +
      Object.keys(STATUS).map(function (k) { return '<option value="' + k + '">' + STATUS[k] + "</option>"; }).join("") + "</select></div>" +
    '<div id="tabela"></div>';

  function ordemLista() {
    return todos.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }
  function desenhar() {
    const q = norm(f.q);
    const vis = ordemLista().filter(function (c) {
      return (!f.cat || c.categoria === f.cat) && (!f.status || (c.status || "rascunho") === f.status) &&
        (!q || norm(c.nome + " " + c.marca).indexOf(q) >= 0);
    });
    root.querySelector("#resumo").textContent = todos.length + (todos.length === 1 ? " anúncio" : " anúncios") +
      (vis.length !== todos.length ? " · " + vis.length + " no filtro" : "");
    const box = root.querySelector("#tabela");
    if (!todos.length) { box.innerHTML = '<div class="vazio">Nenhum carro cadastrado ainda. <a class="link" href="#/carros/novo">Cadastrar o primeiro</a></div>'; return; }
    if (!vis.length) { box.innerHTML = '<div class="vazio">Nenhum carro encontrado com esse filtro.</div>'; return; }
    box.innerHTML = '<div class="tabela-rolagem"><table><thead><tr><th>Carro</th><th>Categoria</th><th>Preço</th><th>Km</th><th>Situação</th><th>Visitas</th><th></th></tr></thead><tbody>' +
      vis.map(function (c) {
        const foto = c.foto && (c.foto.src || c.foto.thumb) || SEM_FOTO;
        const st = c.status || "rascunho";
        return '<tr data-id="' + esc(c.id) + '"><td><div class="car-cel"><img src="' + esc(foto) + '" alt="" loading="lazy"><div><b>' + esc(c.nome) + "</b><small>" + esc(c.marca) + " · " + esc(c.ano) + "</small></div></div></td>" +
          "<td>" + esc(nomeCat[c.categoria] || c.categoria || "—") + "</td>" +
          "<td>" + (c.preco ? esc(reais(c.preco)) : "—") + "</td>" +
          "<td>" + (c.km === 0 ? "0 km" : esc(milhar(c.km)) + " km") + "</td>" +
          '<td><select data-status aria-label="Situação de ' + esc(c.nome) + '" style="width:auto;padding:6px 10px">' +
            Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === st ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select></td>" +
          "<td>" + (c.procura || 0) + "</td>" +
          '<td class="acoes-col"><a class="btn peq" href="#/carros/editar/' + encodeURIComponent(c.id) + '">Editar</a>' +
            '<button class="btn peq" type="button" data-dup>Duplicar</button>' +
            (st === "publicado" ? '<a class="btn peq" href="/#carro/' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">Ver ↗</a>' : "") +
            '<button class="btn peq perigo" type="button" data-del>Excluir</button></td></tr>';
      }).join("") + "</tbody></table></div>";
  }
  desenhar();

  // Importa a pasta "autocar-importacao": importar.json + fotos/<endereço>/01.jpg...
  // Carros com endereço já existente são pulados. Tudo entra como rascunho.
  const inp = root.querySelector("#f-importar");
  root.querySelector("#b-importar").onclick = function () { inp.click(); };
  inp.onchange = async function () {
    const arqs = Array.from(inp.files || []); inp.value = "";
    const js = arqs.find(function (a) { return /(^|\/)importar\.json$/.test(a.webkitRelativePath || a.name); });
    if (!js) { toast("Escolha a pasta autocar-importacao (ela tem o arquivo importar.json)."); return; }
    try {
      const dados = JSON.parse(await js.text());
      const porCaminho = {};
      arqs.forEach(function (a) { const m = (a.webkitRelativePath || "").match(/fotos\/([^/]+)\/([^/]+)$/); if (m) porCaminho[m[1] + "/" + m[2]] = a; });
      const existentes = new Set(todos.map(function (c) { return c.id; }));
      const catIds = new Set(cats.map(function (c) { return c.id; }));
      const NOMES = { picape: "Picapes", moto: "Motos", hatch: "Hatches", sedan: "Sedãs", suv: "SUVs" };
      const novos = dados.filter(function (c) { return c.slug && !existentes.has(c.slug); });
      if (!novos.length) { toast("Nenhum carro novo para importar."); return; }
      if (!(await confirmar({ titulo: "Importar catálogo", texto: "Importar " + novos.length + " carros com fotos, como rascunho? Pode levar alguns minutos; não feche a página.", ok: "Importar" }))) return;
      const fs = app.ctx.fs, agora = fs.serverTimestamp(), storage = app.ctx.opcoes.armazenamento === "storage";
      const resumo = root.querySelector("#resumo");
      let ordem = cats.length, feitos = 0, falhas = 0;
      for (const c of novos) {
        resumo.textContent = "Importando " + (feitos + 1) + " de " + novos.length + ": " + c.nome + "…";
        if (!catIds.has(c.categoria)) {
          catIds.add(c.categoria);
          await app.repo.salvar("categorias", c.categoria, { nome: NOMES[c.categoria] || c.categoria, ordem: ++ordem, ativa: true, criadoEm: agora });
        }
        const galeria = [];
        let capa = null;
        for (let i = 0; i < (c.fotos || []).length; i++) {
          const arq = porCaminho[c.slug + "/" + c.fotos[i]];
          if (!arq) continue;
          try {
            const proc = await processar(arq, { max: 1600, limite: storage ? Infinity : undefined, miniatura: i === 0 ? 800 : 0 });
            const g = await persistir(app, { _novo: proc, alt: c.nome }, "carros/" + c.slug);
            if (i === 0 || !capa) capa = Object.assign({}, g);
            const sem = Object.assign({}, g); delete sem.thumb; galeria.push(sem);
          } catch (e) { console.error(e); falhas++; }
        }
        if (capa && storage) delete capa.thumb;
        const d = Object.assign({}, c, { foto: capa, galeria: galeria, adicionado: hoje(), criadoEm: agora, atualizadoEm: agora });
        delete d.slug; delete d.fotos;
        await app.repo.salvar("carros", c.slug, d, true);
        feitos++;
      }
      toast(feitos + " carros importados como rascunho" + (falhas ? " (" + falhas + " fotos falharam)" : "") + ".");
      lista_recarregar();
    } catch (e) { console.error(e); toast("Não consegui importar: " + e.message); }
  };
  function lista_recarregar() { lista(root, app); }

  root.querySelector("#f-q").oninput = debounce(function (e) { f.q = e.target.value; desenhar(); }, 150);
  root.querySelector("#f-cat").onchange = function (e) { f.cat = e.target.value; desenhar(); };
  root.querySelector("#f-status").onchange = function (e) { f.status = e.target.value; desenhar(); };

  root.onchange = async function (e) {
    if (!e.target.matches("[data-status]")) return;
    const id = e.target.closest("tr").dataset.id, c = todos.filter(function (x) { return x.id === id; })[0];
    const novo = e.target.value;
    if (novo === "publicado" && (!c.foto || !c.preco)) {
      toast("Para publicar, o carro precisa de preço e de ao menos uma foto. Abra a edição para completar.", "erro");
      e.target.value = c.status || "rascunho"; return;
    }
    try {
      await app.repo.atualizar("carros", id, { status: novo });
      c.status = novo; toast("Situação atualizada: " + STATUS[novo] + "."); desenhar();
    } catch (err) { toast("Não consegui atualizar: " + (err.code || err.message), "erro"); e.target.value = c.status || "rascunho"; }
  };

  root.onclick = async function (e) {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    const c = todos.filter(function (x) { return x.id === tr.dataset.id; })[0];
    if (e.target.closest("[data-dup]")) {
      let slug = c.id + "-copia", n = 2;
      while (todos.some(function (x) { return x.id === slug; })) slug = c.id + "-copia-" + n++;
      const copia = Object.assign({}, c);
      delete copia.id; delete copia.criadoEm; delete copia.atualizadoEm;
      Object.assign(copia, { slug: slug, nome: c.nome + " (cópia)", status: "rascunho", procura: 0, adicionado: hoje(), ordem: -Math.floor(Date.now() / 1000) });
      try {
        await app.repo.salvar("carros", slug, Object.assign({ criadoEm: app.ctx.fs.serverTimestamp() }, copia), true);
        toast("Cópia criada como rascunho."); location.hash = "#/carros/editar/" + encodeURIComponent(slug);
      } catch (err) { toast("Não consegui duplicar: " + (err.code || err.message), "erro"); }
    } else if (e.target.closest("[data-del]")) {
      if (!(await confirmar({ titulo: "Excluir " + c.nome + "?", texto: "O anúncio e as fotos dele serão apagados. Isso não pode ser desfeito.", ok: "Excluir", perigo: true }))) return;
      try {
        await app.repo.remover("carros", c.id);
        todos.splice(todos.indexOf(c), 1); desenhar();
        toast("Anúncio excluído.");
        await apagarSemUso(app, [c.foto].concat(c.galeria || []));
      } catch (err) { toast("Não consegui excluir: " + (err.code || err.message), "erro"); }
    }
  };
}
