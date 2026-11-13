// Modelo de dados e funções puras, compartilhadas pelo site e pelo painel.
//
// Coleções do Firestore:
//   carros/{slug}      anúncios (o ID do documento é o slug do carro)
//   categorias/{slug}  categorias usadas nos filtros do site
//   adicionais/{id}    catálogo de adicionais de entrega
//   config/site        marca, imagens, textos e contatos do site
//   leads/{id}         pedidos de proposta enviados pelo site
//   admins/{e-mail}    quem pode entrar no painel
//   midia/{id}         fotos (quando o armazenamento é "firestore")

export const STATUS = { publicado: "Publicado", rascunho: "Rascunho", vendido: "Vendido" };
export const CONDICOES = ["Novo", "Seminovo", "Usado"];
export const CAMBIOS = ["Automático", "Manual", "Automatizado", "CVT"];
export const COMBUSTIVEIS = ["Flex", "Gasolina", "Etanol", "Diesel", "Elétrico", "Híbrido"];
export const FICHA_PADRAO = ["Motor", "Potência", "Torque", "0 a 100 km/h", "Câmbio", "Tração", "Combustível", "Portas / lugares", "Cor", "Final da placa", "Porta-malas"];
// Estas frases são reconhecidas pelo filtro "Diferenciais" da busca avançada do site.
export const HISTORICO_SUGESTOES = ["Único dono", "Revisões em dia", "IPVA pago", "Sem registro de sinistro", "Laudo cautelar aprovado", "Garantia de fábrica", "Documentação inclusa", "Aceita troca", "Aceita financiamento", "Aceita troca e financiamento"];
export const STATUS_LEAD = { novo: "Novo", contatado: "Em contato", negociando: "Negociando", fechado: "Fechado", perdido: "Perdido" };

export const CATEGORIAS_PADRAO = [
  { id: "hatch", nome: "Hatches", ordem: 1 },
  { id: "cupe", nome: "Cupês", ordem: 2 },
  { id: "sedan", nome: "Sedãs", ordem: 3 },
  { id: "suv", nome: "SUVs", ordem: 4 }
];

// Textos que já existem no site. Campo vazio no painel = usar este padrão.
export const SITE_PADRAO = {
  marca: { nome: "AutoCar Multimarcas", sub: "" },
  textos: {
    heroEyebrow: "Seu próximo carro, sem enrolação",
    heroL1: "Escolha", heroL2: "mais rápido.", heroL3: "Dirija", heroL4: "com prazer.",
    heroLead: "Carros premium para quem valoriza desempenho, tecnologia e estilo. Veja o estoque, fale com um consultor e feche o negócio com segurança.",
    sobreTitulo: "Uma concessionária feita para você escolher com segurança",
    sobreP1: "A AutoCar Multimarcas nasceu para tornar a compra de um carro mais simples e transparente. Selecionamos cada veículo do nosso estoque, revisamos item por item e mostramos tudo com clareza, do quilômetro rodado ao histórico.",
    sobreP2: "Do primeiro contato até a entrega das chaves, um consultor acompanha você, tira as dúvidas e apresenta as melhores condições de financiamento e de troca.",
    ctaL1: "Seu próximo carro", ctaL2: "começa aqui.",
    ctaTexto: "Conte o que você procura e um consultor seleciona as melhores opções, com simulação de financiamento e avaliação da sua troca.",
    rodape: "Carros premium para quem escolhe o melhor."
  },
  contato: { telefone: "(11) 0000-0000", whatsapp: "", email: "landora.proposta@gmail.com", endereco: "Rua Exemplo, 123, Vinhedo, SP", horario: "Todos os dias, das 9h às 19h" },
  redes: { instagram: "", facebook: "", youtube: "", tiktok: "" },
  seo: { titulo: "AutoCar Multimarcas | Carros premium", descricao: "Carros premium para quem valoriza desempenho, tecnologia e estilo. Escolha online e fale com um consultor." }
};

// Imagens do site que já existem nos arquivos (usadas enquanto nada for enviado pelo painel).
export const IMAGENS_PADRAO = {
  logo: "/img/logo-landora.png",
  favicon: "/favicon.svg",
  heroFundo: "/img/carros/bmw-m4-wide.webp",
  heroCarro: "/img/carros/bmw-m4-hero.webp",
  sobre: "/img/carros/bmw-m4-wide.webp",
  cta: "/img/carros/hyundai-creta.webp"
};

export const SEM_FOTO = "data:image/svg+xml;utf8," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750"><rect width="1200" height="750" fill="#191919"/>' +
  '<text x="600" y="385" fill="#979797" font-family="sans-serif" font-size="42" text-anchor="middle">Sem foto</text></svg>');

export function slugify(t) {
  return String(t == null ? "" : t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}
export function numeroDe(t) { return parseInt(String(t == null ? "" : t).replace(/\D/g, ""), 10) || 0; }
export function milhar(n) { return Number(n || 0).toLocaleString("pt-BR"); }
export function reais(n) { return "R$ " + milhar(n); }
export function hoje() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function anoPartes(ano) {
  const m = String(ano || "").match(/(\d{4})\D+(\d{4})/);
  if (m) return [m[1], m[2]];
  const u = String(ano || "").match(/(\d{4})/);
  return u ? [u[1], u[1]] : ["", ""];
}
// "510" vira "510 cv"; texto com letras fica como está.
export function potenciaTxt(t) {
  t = String(t || "").trim();
  return /^\d+$/.test(t) ? t + " cv" : t;
}

// Remove campos undefined (o Firestore recusa) sem mexer em valores especiais como serverTimestamp().
export function semUndefined(v) {
  if (Array.isArray(v)) return v.map(semUndefined);
  if (v && Object.getPrototypeOf(v) === Object.prototype) {
    const o = {};
    Object.keys(v).forEach(function (k) { if (v[k] !== undefined) o[k] = semUndefined(v[k]); });
    return o;
  }
  return v;
}

export function carroNovo(opts) {
  opts = opts || {};
  return {
    slug: "", nome: "", marca: "", categoria: opts.categoria || "", condicao: "Seminovo", status: "rascunho",
    ano1: "", ano2: "", km: 0, preco: 0, cor: "", motor: "", potencia: "", cambio: "", combustivel: "",
    fotos: [], destaques: [{ rotulo: "", valor: "" }, { rotulo: "", valor: "" }, { rotulo: "", valor: "" }],
    ficha: [], historico: [], adicionais: opts.adicionais || [], extras: [], descricao: ""
  };
}

// Valida o formulário do carro. Devolve { campo: mensagem }; vazio = tudo certo.
export function validarCarro(s, opts) {
  opts = opts || {};
  const e = {};
  if (!s.nome.trim()) e.nome = "Informe o nome do anúncio.";
  if (!s.marca.trim()) e.marca = "Informe a marca.";
  if (!s.categoria) e.categoria = "Escolha uma categoria.";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) e.slug = "Endereço inválido (use letras minúsculas, números e hífens).";
  else if (opts.novo && (opts.slugs || []).indexOf(s.slug) >= 0) e.slug = "Já existe um carro com esse endereço.";
  if (!/^\d{4}$/.test(String(s.ano1)) || !/^\d{4}$/.test(String(s.ano2))) e.ano = "Informe o ano de fabricação e do modelo (4 dígitos).";
  if (!(s.km >= 0)) e.km = "Quilometragem inválida.";
  if (s.status === "publicado") {
    if (!(s.preco > 0)) e.preco = "Para publicar, informe o preço.";
    if (!s.fotos.length) e.fotos = "Para publicar, adicione ao menos uma foto.";
    ["motor", "cambio", "combustivel", "cor"].forEach(function (k) {
      if (!String(s[k] || "").trim()) e[k] = "Obrigatório para publicar.";
    });
  }
  return e;
}

function pares(lista) {
  return (lista || []).filter(function (x) { return x && (x.rotulo || x.valor); })
    .map(function (x) { return [x.rotulo || "", x.valor || ""]; });
}

// Converte um documento de "carros" no formato que o site (main.js / busca.js) espera.
export function carroParaSite(c, catalogo) {
  catalogo = catalogo || [];
  const imgs = (c.galeria || []).filter(function (i) { return i && (i.src || i.midia); });
  const capa = c.foto && (c.foto.src || c.foto.thumb || c.foto.midia) ? c.foto : imgs[0];
  const foto = capa
    ? { src: capa.src || capa.thumb || "", midia: capa.midia || null, alt: capa.alt || c.nome, pos: capa.pos || "50% 50%" }
    : { src: SEM_FOTO, midia: null, alt: "Sem foto", pos: "50% 50%" };
  const galeria = imgs.length
    ? imgs.map(function (i) { return { src: i.src || "", midia: i.midia || null, alt: i.alt || c.nome, pos: i.pos || undefined }; })
    : [foto];
  const doCatalogo = (c.adicionais || []).map(function (id) {
    return catalogo.filter(function (a) { return a.id === id; })[0];
  }).filter(function (a) { return a && a.ativo !== false; }).map(function (a) { return [a.titulo, a.descricao || ""]; });
  const extras = (c.adicionaisExtras || []).filter(function (a) { return a && a.titulo; })
    .map(function (a) { return [a.titulo, a.descricao || ""]; });
  return {
    slug: c.slug || c.id, marca: c.marca || "", adicionado: c.adicionado || "", procura: c.procura || 0, ordem: c.ordem || 0,
    nome: c.nome || "", categoria: c.categoria || "", condicao: c.condicao || "Seminovo", ano: c.ano || "",
    km: Number(c.km) || 0, preco: Number(c.preco) || 0, motor: c.motor || "", potencia: c.potencia || "",
    cambio: c.cambio || "", combustivel: c.combustivel || "", cor: c.cor || "",
    foto: foto, galeria: galeria,
    destaques: pares(c.destaques), ficha: pares(c.ficha),
    historico: (c.historico || []).filter(Boolean),
    adicionais: doCatalogo.concat(extras),
    descricao: c.descricao || ""
  };
}

// Converte um carro do formato antigo (js/carros.js) para documento do Firestore.
export function carroDoSeed(c, indice) {
  const fotos = [];
  const vistos = {};
  [c.foto].concat(c.galeria || []).forEach(function (f) {
    if (!f || vistos[f.src]) return;
    vistos[f.src] = 1;
    fotos.push({ src: "/" + String(f.src).replace(/^\//, ""), alt: f.alt || c.nome, pos: f.pos || "50% 50%" });
  });
  return {
    slug: c.slug, nome: c.nome, marca: c.marca || String(c.nome).split(" ")[0], categoria: c.categoria,
    condicao: c.condicao, status: "publicado", ano: c.ano, km: c.km, preco: c.preco, motor: c.motor,
    potencia: c.potencia, cambio: c.cambio, combustivel: c.combustivel, cor: c.cor,
    foto: fotos[0] || null, galeria: fotos,
    destaques: (c.destaques || []).map(function (d) { return { rotulo: d[0], valor: d[1] }; }),
    ficha: (c.ficha || []).map(function (d) { return { rotulo: d[0], valor: d[1] }; }),
    historico: c.historico || [], adicionais: [], adicionaisExtras: [], descricao: c.descricao || "",
    ordem: indice + 1, procura: 0, adicionado: c.adicionado || hoje()
  };
}
