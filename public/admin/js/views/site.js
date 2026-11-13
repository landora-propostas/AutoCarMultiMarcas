// Site e marca: logos, imagens do site (inclui a foto da concessionária), textos, contato e redes.
import { esc, toast } from "../ui.js";
import { campoImagem, persistir, apagarSemUso } from "../fotos.js";
import { SITE_PADRAO, IMAGENS_PADRAO } from "/js/modelo.js";

const ABAS = [["marca", "Marca e logos"], ["imagens", "Imagens do site"], ["textos", "Textos"], ["contato", "Contato e redes"]];
const ROTULOS_TEXTO = {
  heroEyebrow: ["Chamada acima do título", "input"], heroL1: ["Título, linha 1", "input"], heroL2: ["Título, linha 2 (em azul)", "input"],
  heroL3: ["Título, linha 3", "input"], heroL4: ["Título, linha 4 (em azul)", "input"], heroLead: ["Texto de apresentação", "textarea"],
  sobreTitulo: ["“Sobre nós”: título", "input"], sobreP1: ["“Sobre nós”: parágrafo 1", "textarea"], sobreP2: ["“Sobre nós”: parágrafo 2", "textarea"],
  ctaL1: ["Bloco “Seu próximo carro”: linha 1", "input"], ctaL2: ["Bloco “Seu próximo carro”: linha 2 (em azul)", "input"], ctaTexto: ["Bloco “Seu próximo carro”: texto", "textarea"],
  rodape: ["Frase do rodapé", "input"]
};
const GRUPOS_TEXTO = [
  ["Início (topo do site)", ["heroEyebrow", "heroL1", "heroL2", "heroL3", "heroL4", "heroLead"]],
  ["Sobre nós", ["sobreTitulo", "sobreP1", "sobreP2"]],
  ["Chamada final", ["ctaL1", "ctaL2", "ctaTexto"]],
  ["Rodapé", ["rodape"]]
];

export async function site(root, app, args) {
  const repo = app.repo;
  const cfg = await repo.obter("config", "site");
  if (!cfg || !cfg.inicializado) {
    root.innerHTML = '<div class="cab"><div><h1>Site e marca</h1></div></div><div class="aviso"><div><b>Falta a configuração inicial.</b><p>Antes de personalizar o site, faça a primeira configuração na Visão geral (importar os carros de exemplo ou começar do zero).</p></div><div class="acoes"><a class="btn primary" href="#/painel">Ir para a Visão geral</a></div></div>';
    return;
  }
  const aba = ABAS.some(function (a) { return a[0] === args[0]; }) ? args[0] : "marca";
  const marca = Object.assign({}, SITE_PADRAO.marca, cfg.marca || {});
  const textos = Object.assign({}, SITE_PADRAO.textos, cfg.textos || {});
  const contato = Object.assign({}, SITE_PADRAO.contato, cfg.contato || {});
  const redes = Object.assign({}, SITE_PADRAO.redes, cfg.redes || {});
  const seo = Object.assign({}, SITE_PADRAO.seo, cfg.seo || {});
  const imagens = cfg.imagens || {};
  const campos = {};   // campoImagem por chave

  const input = function (grupo, k, rotulo, dado, extra) {
    return '<label>' + rotulo + '<input data-g="' + grupo + '" data-k="' + k + '" value="' + esc(dado[k]) + '" ' + (extra || "") + "></label>";
  };
  const area = function (grupo, k, rotulo, dado) {
    return '<label>' + rotulo + '<textarea data-g="' + grupo + '" data-k="' + k + '" rows="3" maxlength="600">' + esc(dado[k]) + "</textarea></label>";
  };
  const slot = function (k, rotulo, dica) {
    return '<section class="cartao"><div class="cartao-topo"><div><h2>' + rotulo + "</h2><p>" + dica + '</p></div></div><div data-slot="' + k + '"></div></section>';
  };

  let corpo = "";
  if (aba === "marca") {
    corpo =
      '<section class="cartao"><div class="cartao-topo"><h2>Nome da loja</h2></div><div class="grade g2">' +
      input("marca", "nome", "Nome da concessionária", marca, 'maxlength="60"') +
      input("marca", "sub", "Palavra abaixo da logo", marca, 'maxlength="14" placeholder="MOTORS"') +
      "</div><p class=\"dica\">O nome aparece na aba do navegador e no rodapé. A palavra abaixo da logo aparece em letras espaçadas (deixe vazio para ocultar).</p></section>" +
      slot("logo", "Logo", "Aparece no topo, no rodapé e na tela de carregamento. Prefira PNG ou SVG com fundo transparente e letras claras (o site é escuro).") +
      slot("favicon", "Ícone da aba do navegador (favicon)", "Quadrado, de preferência 256 × 256 px ou SVG.");
  } else if (aba === "imagens") {
    corpo =
      slot("heroFundo", "Fundo do topo do site", "Imagem larga, em paisagem (1920 × 1080 px é ideal). Fica escurecida atrás do título.") +
      slot("heroCarro", "Carro em destaque no topo", "PNG ou WebP com fundo transparente, de lado, bem recortado.") +
      slot("sobre", "Foto da concessionária", "Aparece em “Sobre nós”. Use uma foto da fachada, do pátio ou da equipe (formato paisagem).") +
      slot("cta", "Fundo do bloco “Seu próximo carro”", "Foto de carro ou de entrega. Ela é escurecida automaticamente.");
  } else if (aba === "textos") {
    corpo = GRUPOS_TEXTO.map(function (g) {
      return '<section class="cartao"><div class="cartao-topo"><h2>' + g[0] + '</h2></div><div class="grade g2">' +
        g[1].map(function (k) { return ROTULOS_TEXTO[k][1] === "textarea" ? '<div class="span-2">' + area("textos", k, ROTULOS_TEXTO[k][0], textos) + "</div>" : input("textos", k, ROTULOS_TEXTO[k][0], textos, 'maxlength="120"'); }).join("") +
        "</div></section>";
    }).join("") +
      '<section class="cartao"><div class="cartao-topo"><div><h2>Google e redes sociais</h2><p>Título e descrição que aparecem nos resultados de busca e ao compartilhar o link.</p></div></div><div class="grade">' +
      '<div class="span-2">' + input("seo", "titulo", "Título da página", seo, 'maxlength="70"') + "</div>" +
      '<div class="span-2">' + area("seo", "descricao", "Descrição", seo) + "</div></div></section>";
  } else {
    corpo =
      '<section class="cartao"><div class="cartao-topo"><h2>Contato</h2></div><div class="grade g2">' +
      input("contato", "telefone", "Telefone (como aparece no site)", contato, 'maxlength="30" inputmode="tel"') +
      input("contato", "whatsapp", "WhatsApp (com DDD)", contato, 'maxlength="20" inputmode="tel" placeholder="(11) 90000-0000"') +
      input("contato", "email", "E-mail", contato, 'type="email" maxlength="80"') +
      input("contato", "horario", "Horário de funcionamento", contato, 'maxlength="60"') +
      '<div class="span-2">' + input("contato", "endereco", "Endereço", contato, 'maxlength="140"') + "</div></div></section>" +
      '<section class="cartao"><div class="cartao-topo"><div><h2>Redes sociais</h2><p>Opcional. Pode ser o link completo ou só o nome de usuário. Só aparecem no rodapé as que estiverem preenchidas.</p></div></div><div class="grade g2">' +
      input("redes", "instagram", "Instagram", redes, 'maxlength="120" placeholder="autocarmultimarcas"') +
      input("redes", "facebook", "Facebook", redes, 'maxlength="120"') +
      input("redes", "youtube", "YouTube", redes, 'maxlength="120"') +
      input("redes", "tiktok", "TikTok", redes, 'maxlength="120"') + "</div></section>";
  }

  root.innerHTML =
    '<div class="cab"><div><h1>Site e marca</h1><p>Tudo o que aparece no site além dos carros.</p></div><div class="acoes"><a class="btn" href="/" target="_blank" rel="noopener">Ver o site ↗</a></div></div>' +
    '<div class="tabs" role="tablist">' + ABAS.map(function (a) { return '<a class="tab' + (a[0] === aba ? " is-on" : "") + '" href="#/site/' + a[0] + '" role="tab">' + a[1] + "</a>"; }).join("") + "</div>" +
    corpo +
    '<div class="barra-salvar"><span class="esq" id="estado-salvar"></span><button class="btn primary" type="button" id="b-salvar">Salvar alterações</button></div>';

  /* Campos de imagem desta aba */
  const CAMPOS_IMG = {
    logo: { onde: "marca", padrao: IMAGENS_PADRAO.logo, escura: true, proc: { max: 700, transparente: true }, aceita: "image/png,image/webp,image/svg+xml,image/jpeg", texto: "PNG, WebP, SVG ou JPG." },
    favicon: { onde: "marca", padrao: IMAGENS_PADRAO.favicon, escura: true, proc: { max: 256, transparente: true }, aceita: "image/png,image/webp,image/svg+xml,image/x-icon,image/jpeg", texto: "PNG, SVG ou WebP." },
    heroFundo: { onde: "imagens", padrao: IMAGENS_PADRAO.heroFundo, cobre: true, proc: { max: 1920, qualidade: 0.78 }, texto: "JPG, PNG ou WebP." },
    heroCarro: { onde: "imagens", padrao: IMAGENS_PADRAO.heroCarro, escura: true, proc: { max: 1600, transparente: true }, texto: "PNG ou WebP com fundo transparente." },
    sobre: { onde: "imagens", padrao: IMAGENS_PADRAO.sobre, cobre: true, proc: { max: 1400 }, texto: "JPG, PNG ou WebP." },
    cta: { onde: "imagens", padrao: IMAGENS_PADRAO.cta, cobre: true, proc: { max: 1400, qualidade: 0.78 }, texto: "JPG, PNG ou WebP." }
  };
  root.querySelectorAll("[data-slot]").forEach(function (el) {
    const k = el.dataset.slot, c = CAMPOS_IMG[k];
    const atual = c.onde === "marca" ? (cfg.marca || {})[k] : imagens[k];
    campos[k] = campoImagem(el, app, Object.assign({ valor: atual || null, aoMudar: function () { app.sujo = true; } }, c));
  });
  root.oninput = function () { app.sujo = true; };

  /* Salvar só o que é desta aba */
  let salvando = false;
  root.onclick = async function (e) {
    if (!e.target.closest("#b-salvar") || salvando) return;
    salvando = true;
    const btn = root.querySelector("#b-salvar"); btn.disabled = true;
    root.querySelector("#estado-salvar").textContent = "Salvando…";
    try {
      const dados = {}, velhas = [];
      root.querySelectorAll("[data-g]").forEach(function (el) {
        const g = el.dataset.g;
        dados[g] = dados[g] || {};
        dados[g][el.dataset.k] = el.value.trim();
      });
      const chaves = Object.keys(campos);
      for (let i = 0; i < chaves.length; i++) {
        const k = chaves[i], h = campos[k], onde = CAMPOS_IMG[k].onde;
        if (!h.mudou()) continue;
        const antiga = onde === "marca" ? (cfg.marca || {})[k] : imagens[k];
        if (antiga) velhas.push(antiga);
        dados[onde] = dados[onde] || {};
        dados[onde][k] = h.item() ? await persistir(app, h.item(), "site") : null;
      }
      await repo.salvar("config", "site", dados);
      await apagarSemUso(app, velhas);
      app.sujo = false;
      toast("Alterações salvas. O site já mostra a novidade.");
      await site(root, app, args);
    } catch (err) {
      console.error(err);
      toast("Não consegui salvar: " + (err.message || err.code), "erro");
      btn.disabled = false; salvando = false;
      root.querySelector("#estado-salvar").textContent = "";
    }
  };
}
