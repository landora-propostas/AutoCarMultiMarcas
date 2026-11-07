// Estoque da Landora Motors.
//
// ATENÇÃO: os valores abaixo (quilometragem, preço, ano, cor, opcionais e histórico) são
// EXEMPLOS para montar o visual. Troque pelos dados reais de cada carro antes de divulgar.
// Para adicionar um carro, copie um bloco, mude o "slug" (precisa ser único, sem espaços)
// e coloque a foto em public/img/carros/.
// Na etapa do Firebase, esta lista vai sair daqui e passar a vir do Firestore.

window.CARROS = [
  {
    slug: "bmw-m4-competition",
    marca: "BMW",
    adicionado: "2026-10-28",   // EXEMPLO: data em que o carro entrou no estoque
    procura: 182,        // EXEMPLO: visitas ao anúncio (na etapa do Firebase vira contador real)
    nome: "BMW M4 Competition",
    categoria: "cupe",
    condicao: "Seminovo",
    ano: "2023/2024",
    km: 12400,
    preco: 649900,
    motor: "3.0 biturbo",
    potencia: "510 cv",
    cambio: "Automático",
    combustivel: "Gasolina",
    cor: "Cinza metálico",
    foto: { src: "img/carros/bmw-m4-wide.webp", alt: "BMW M4 cinza em pista molhada ao entardecer", pos: "50% 60%" },
    galeria: [
      { src: "img/carros/bmw-m4-wide.webp", alt: "BMW M4 vista frontal" },
      { src: "img/carros/bmw-m4-full.webp", alt: "BMW M4 com o céu ao fundo (versão vertical)", pos: "50% 62%" }
    ],
    destaques: [["0 a 100 km/h", "3,5 s"], ["Tração", "Traseira"], ["Cor", "Cinza metálico"]],
    ficha: [
      ["Motor", "3.0 L, 6 cilindros, biturbo"],
      ["Potência", "510 cv"],
      ["Torque", "66,3 kgfm"],
      ["0 a 100 km/h", "3,5 s"],
      ["Câmbio", "Automático de 8 marchas"],
      ["Tração", "Traseira"],
      ["Combustível", "Gasolina"],
      ["Portas / lugares", "2 portas, 4 lugares"],
      ["Cor", "Cinza metálico"],
      ["Final da placa", "4"]
    ],
    opcionais: ["Bancos esportivos em couro", "Pacote M Carbon", "Rodas aro 19/20", "Pinças de freio amarelas", "Teto solar", "Head-up display", "Câmera 360°", "Som premium"],
    historico: ["Único dono", "Revisões em dia na concessionária", "IPVA pago", "Sem registro de sinistro", "Aceita troca e financiamento"],
    descricao: "Cupê esportivo com visual agressivo e entrega de potência imediata. Exemplo de texto: descreva aqui o estado do carro, itens de série e o que o torna especial."
  },
  {
    slug: "chevrolet-onix-plus-black",
    marca: "Chevrolet",
    adicionado: "2026-10-02",   // EXEMPLO: data em que o carro entrou no estoque
    procura: 96,        // EXEMPLO: visitas ao anúncio (na etapa do Firebase vira contador real)
    nome: "Chevrolet Onix Plus Black",
    categoria: "sedan",
    condicao: "Seminovo",
    ano: "2022/2023",
    km: 31800,
    preco: 109900,
    motor: "1.0 turbo",
    potencia: "116 cv",
    cambio: "Automático",
    combustivel: "Flex",
    cor: "Preto",
    foto: { src: "img/carros/chevrolet-onix-preto.webp", alt: "Sedã Chevrolet preto com aerofólio e rodas pretas", pos: "50% 55%" },
    galeria: [{ src: "img/carros/chevrolet-onix-preto.webp", alt: "Sedã Chevrolet preto, vista frontal e lateral" }],
    destaques: [["Tração", "Dianteira"], ["Cor", "Preto"], ["Preparação", "Visual esportivo"]],
    ficha: [
      ["Motor", "1.0 L turbo, 3 cilindros"],
      ["Potência", "116 cv (etanol)"],
      ["Câmbio", "Automático de 6 marchas"],
      ["Tração", "Dianteira"],
      ["Combustível", "Flex"],
      ["Portas / lugares", "4 portas, 5 lugares"],
      ["Cor", "Preto"],
      ["Final da placa", "7"]
    ],
    opcionais: ["Aerofólio traseiro", "Rodas esportivas pretas", "Teto solar", "Kit de carroceria esportivo", "Central multimídia", "Ar-condicionado digital", "Sensor de estacionamento"],
    historico: ["Segundo dono", "Revisões em dia", "IPVA pago", "Laudo cautelar aprovado", "Aceita troca e financiamento"],
    descricao: "Sedã com visual esportivo e acabamento todo preto. Exemplo de texto: informe aqui as modificações feitas e o que acompanha o carro."
  },
  {
    slug: "hyundai-creta-platinum",
    marca: "Hyundai",
    adicionado: "2026-11-04",   // EXEMPLO: data em que o carro entrou no estoque
    procura: 143,        // EXEMPLO: visitas ao anúncio (na etapa do Firebase vira contador real)
    nome: "Hyundai Creta Platinum",
    categoria: "suv",
    condicao: "Novo",
    ano: "2025/2025",
    km: 0,
    preco: 169900,
    motor: "1.0 turbo",
    potencia: "120 cv",
    cambio: "Automático",
    combustivel: "Flex",
    cor: "Bege",
    foto: { src: "img/carros/hyundai-creta.webp", alt: "Hyundai Creta bege em estrada, vista frontal", pos: "50% 50%" },
    galeria: [{ src: "img/carros/hyundai-creta.webp", alt: "Hyundai Creta bege, vista frontal e lateral" }],
    destaques: [["Tração", "Dianteira"], ["Cor", "Bege"], ["Garantia", "Fábrica"]],
    ficha: [
      ["Motor", "1.0 L turbo, 3 cilindros"],
      ["Potência", "120 cv"],
      ["Câmbio", "Automático de 6 marchas"],
      ["Tração", "Dianteira"],
      ["Combustível", "Flex"],
      ["Portas / lugares", "4 portas, 5 lugares"],
      ["Cor", "Bege"],
      ["Porta-malas", "422 L"]
    ],
    opcionais: ["Teto solar panorâmico", "Central multimídia", "Câmera de ré", "Piloto automático", "Rodas aro 17", "Faróis em LED", "Chave presencial"],
    historico: ["Zero quilômetro", "Garantia de fábrica", "Documentação inclusa", "Aceita troca e financiamento"],
    descricao: "SUV espaçoso e econômico para o dia a dia. Exemplo de texto: informe aqui a versão, o prazo de garantia e as condições de entrega."
  },
  {
    slug: "honda-civic-sedan",
    marca: "Honda",
    adicionado: "2026-09-15",   // EXEMPLO: data em que o carro entrou no estoque
    procura: 58,        // EXEMPLO: visitas ao anúncio (na etapa do Firebase vira contador real)
    nome: "Honda Civic Sedan",
    categoria: "sedan",
    condicao: "Seminovo",
    ano: "2008/2009",
    km: 96500,
    preco: 79900,
    motor: "1.8 16V",
    potencia: "140 cv",
    cambio: "Manual",
    combustivel: "Flex",
    cor: "Prata",
    foto: { src: "img/carros/honda-civic-wide.webp", alt: "Honda Civic prata rebaixado ao pôr do sol", pos: "50% 50%" },
    galeria: [
      { src: "img/carros/honda-civic-full.webp", alt: "Honda Civic prata rebaixado ao pôr do sol", pos: "50% 64%" }
    ],
    destaques: [["Tração", "Dianteira"], ["Cor", "Prata"], ["Preparação", "Rebaixado"]],
    ficha: [
      ["Motor", "1.8 L, 4 cilindros"],
      ["Potência", "140 cv"],
      ["Câmbio", "Manual de 6 marchas"],
      ["Tração", "Dianteira"],
      ["Combustível", "Flex"],
      ["Portas / lugares", "4 portas, 5 lugares"],
      ["Cor", "Prata"],
      ["Final da placa", "9"]
    ],
    opcionais: ["Suspensão rebaixada", "Rodas esportivas aro 17", "Para-choque esportivo", "Ar-condicionado", "Direção elétrica", "Som com Bluetooth"],
    historico: ["Terceiro dono", "Manutenção recente", "IPVA pago", "Laudo cautelar aprovado", "Aceita troca"],
    descricao: "Clássico da categoria, com preparação visual. Exemplo de texto: conte o histórico de manutenção e o que foi modificado."
  }
];
