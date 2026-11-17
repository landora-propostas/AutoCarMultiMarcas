import { esc, toast, confirmar, dataHora, milis } from "../ui.js";
import { inicializarSite } from "../semente.js";
import { STATUS_LEAD, reais, SEM_FOTO } from "/js/modelo.js";

export async function painel(root, app) {
  const [carros, leads, cfg] = await Promise.all([app.repo.listar("carros"), app.repo.listar("leads"), app.repo.obter("config", "site")]);
  const cont = function (s) { return carros.filter(function (c) { return (c.status || "rascunho") === s; }).length; };
  const novos = leads.filter(function (l) { return (l.status || "novo") === "novo"; }).length;
  app.definirContador(novos);
  const top = carros.slice().sort(function (a, b) { return (b.procura || 0) - (a.procura || 0); }).filter(function (c) { return (c.procura || 0) > 0; }).slice(0, 5);
  const ultimos = leads.slice().sort(function (a, b) { return milis(b.criadoEm) - milis(a.criadoEm); }).slice(0, 5);

  root.innerHTML =
    '<div class="cab"><div><h1>Como está a loja</h1><p>Resumo do estoque e dos pedidos que chegaram pelo site.</p></div>' +
    '<div class="acoes"><a class="btn primary" href="#/carros/novo">+ Novo carro</a></div></div>' +
    (cfg ? "" :
      '<div class="aviso"><div><b>Falta a configuração inicial.</b>' +
      "<p>Crie as categorias e os adicionais para o site passar a ler tudo daqui.</p></div>" +
      '<div class="acoes"><button class="btn primary" type="button" data-init>Fazer a configuração inicial</button></div></div>') +
    '<div class="grade g4">' +
      '<div class="stat dest"><small>Publicados</small><b>' + cont("publicado") + "</b></div>" +
      "<div class=\"stat\"><small>Rascunhos</small><b>" + cont("rascunho") + "</b></div>" +
      "<div class=\"stat\"><small>Vendidos</small><b>" + cont("vendido") + "</b></div>" +
      '<div class="stat dest"><small>Pedidos novos</small><b>' + novos + "</b></div></div>" +
    '<div class="grade g2">' +
      '<section class="cartao"><div class="cartao-topo"><h2>Mais procurados</h2><a class="link" href="#/carros">Ver estoque</a></div>' +
      (top.length ? '<ul class="lista-simples">' + top.map(function (c) {
        return "<li><span style=\"color:var(--text);font-weight:600\">" + esc(c.nome) + "</span><span>" + (c.procura || 0) + " visitas</span></li>";
      }).join("") + "</ul>" : '<p class="vazio">As visitas aos anúncios aparecem aqui assim que o site começar a receber acessos.</p>') +
      "</section>" +
      '<section class="cartao"><div class="cartao-topo"><h2>Últimos pedidos</h2><a class="link" href="#/pedidos">Ver todos</a></div>' +
      (ultimos.length ? '<ul class="lista-simples">' + ultimos.map(function (l) {
        return "<li><span style=\"color:var(--text);font-weight:600\">" + esc(l.nome) + "<br><span style=\"font-weight:500\">" + esc(l.carro || "Ainda não sei") + "</span></span>" +
          "<span>" + esc(STATUS_LEAD[l.status || "novo"] || "Novo") + " · " + esc(dataHora(l.criadoEm)) + "</span></li>";
      }).join("") + "</ul>" : '<p class="vazio">Nenhum pedido recebido ainda.</p>') +
      "</section></div>";

  root.onclick = async function (e) {
    const b = e.target.closest("[data-init]");
    if (!b) return;
    if (!(await confirmar({
      titulo: "Fazer a configuração inicial?",
      texto: "Vamos criar as categorias e os adicionais iniciais. O site fica sem carros até você cadastrar o primeiro.",
      ok: "Começar"
    }))) return;
    document.querySelectorAll("[data-init]").forEach(function (x) { x.disabled = true; });
    try {
      await inicializarSite(app);
      toast("Pronto! O site agora lê os dados do painel.");
      await painel(root, app);
    } catch (err) {
      console.error(err);
      toast("Não consegui configurar: " + (err.message || err.code), "erro");
      document.querySelectorAll("[data-init]").forEach(function (x) { x.disabled = false; });
    }
  };
}
