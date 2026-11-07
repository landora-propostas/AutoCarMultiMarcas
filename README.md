# Landora Motors — concessionaria-landora

Site de concessionária de carros premium. Versão atual: **somente visual** (HTML, CSS e JS puros, sem build).

- **Código:** GitHub
- **Desenvolvimento:** GitHub Codespaces
- **Hospedagem, autenticação e banco de dados:** Firebase (Hosting, Authentication, Firestore)

## Estrutura

```
concessionaria-landora/
├── public/              # tudo que vai para o ar (Firebase Hosting)
│   ├── index.html
│   ├── css/styles.css
│   └── js/main.js
├── .devcontainer/       # configuração do Codespaces (já instala o firebase-tools)
├── firebase.json        # configuração do Hosting
└── README.md
```

## 1. Rodar no Codespaces

1. No GitHub, abra o repositório e clique em **Code → Codespaces → Create codespace on main**.
2. Aguarde o ambiente abrir (o `firebase-tools` é instalado automaticamente).
3. Para ver o site, use um destes caminhos:
   - Botão **Go Live** (extensão Live Server) com `public/index.html` aberto; ou
   - No terminal: `npx serve public` e abra a porta que o Codespaces avisar.

## 2. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e clique em **Adicionar projeto**. Nome sugerido: `landora-motors`.
2. Dentro do projeto, ative os serviços:
   - **Build → Authentication → Começar** e habilite **E-mail/senha** (e Google, se quiser).
   - **Build → Firestore Database → Criar banco de dados** (modo produção; região `southamerica-east1`).
   - **Build → Hosting → Começar**.
3. Em **Configurações do projeto → Seus apps → Web (`</>`)**, registre um app web e guarde o objeto `firebaseConfig`.

## 3. Conectar o repositório ao Firebase (no terminal do Codespaces)

```bash
firebase login --no-localhost
firebase use --add          # escolha o projeto e dê o apelido "default"
```

Esse último comando cria o arquivo `.firebaserc`. Faça commit dele.

## 4. Publicar o site

```bash
firebase deploy --only hosting
```

O terminal mostra o link `https://SEU-PROJETO.web.app`.

Para ver uma prévia antes de publicar: `firebase hosting:channel:deploy preview`.

## 5. Publicação automática pelo GitHub (opcional)

Dentro do Codespaces, rode:

```bash
firebase init hosting:github
```

O assistente cria os workflows em `.github/workflows` e o segredo no GitHub. Depois disso, cada push na `main` publica o site sozinho.

## 6. Painel administrativo (`/admin`)

Painel em `https://SEU-PROJETO.web.app/admin` para gerenciar tudo sem mexer em código:

- **Carros**: cadastro completo (nome, categoria, preço, ano, km, cor, câmbio, combustível, destaques, ficha técnica, histórico, descrição), fotos (capa, galeria, ponto de foco), status (rascunho / publicado / vendido), duplicar e excluir.
- **Adicionais de entrega**: cadastro de extras e escolha de quais valem para cada anúncio (com valor próprio, se quiser).
- **Categorias**: criar, ordenar e apagar; viram os filtros do site.
- **Site e marca**: logo, texto sob a logo, imagens do topo, foto da concessionária, textos, telefone, e-mail, endereço e redes sociais.
- **Pedidos**: propostas enviadas pelo formulário do site, com situação e link direto para o WhatsApp.
- **Equipe**: quem pode entrar no painel.

### Configuração (uma vez)

1. **Authentication → Método de login**: ative **E-mail/senha**.
2. **Firestore Database**: crie o banco (se ainda não existe).
3. **Configurações do projeto → Seus apps**: registre um app **Web** (isso faz `/__/firebase/init.json` funcionar no Hosting; sem Hosting, preencha `FIREBASE_CONFIG` em `public/js/firebase-config.js`).
4. Publique as regras e índices (no terminal do Codespaces):
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
5. **Crie o primeiro administrador à mão**: no Console, Firestore → coleção `admins` → documento com **ID = seu e-mail em minúsculas** (ex.: `voce@email.com`) e um campo qualquer (ex.: `nome`: texto). Sem isso ninguém entra, de propósito.
6. Publique o site (`git push` na `main` ou `firebase deploy --only hosting`).
7. Abra `/admin`, clique em **Criar conta** com esse mesmo e-mail, confirme o e-mail recebido e entre.
8. Na primeira visita, escolha **Importar os carros de exemplo** ou **Começar do zero**. Depois disso o site passa a ler tudo do painel (até lá mostra os carros de exemplo).

Novos administradores: crie o documento em `admins` pela tela **Equipe**, depois a pessoa cria a conta em `/admin` e confirma o e-mail.

### Fotos

Por padrão as fotos são reduzidas no navegador e guardadas no próprio Firestore (coleção `midia`), o que funciona no plano gratuito (Spark). Limite de 1 MiB por documento, por isso cada foto é comprimida automaticamente.

Para usar o **Firebase Storage** (plano Blaze): ative o Storage, adicione `"storage": { "rules": "storage.rules" }` ao `firebase.json`, troque `armazenamento` para `"storage"` em `public/js/firebase-config.js` e rode `firebase deploy --only storage`.

### Dados (Firestore)

`carros`, `categorias`, `adicionais`, `config/site`, `leads`, `admins`, `midia`. Leitura pública apenas do que está publicado; escrita só para administradores (e-mail verificado + documento em `admins`). Visitantes só podem criar um pedido validado e somar +1 nas visitas de um carro publicado.

### Observações

- A publicação automática do GitHub só publica o Hosting; regras do Firestore são publicadas com o comando do passo 4.
- Cada leitura do site consome cota do Firestore; para muito tráfego, considere o App Check contra spam de pedidos.
- O painel tem `noindex` e não aparece em buscadores.

## Próximas etapas

- Login e cadastro de clientes
- Telefone, e-mail e endereço reais (editáveis em **Site e marca**)

## Segurança

- O `firebaseConfig` do app web **não é segredo**, mas as regras do Firestore e do Authentication são. Nunca deixe o Firestore em modo de teste em produção.
- Nunca faça commit de chaves de contas de serviço (`serviceAccount*.json`) nem de arquivos `.env`.
