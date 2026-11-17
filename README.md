# AutoCar Multimarcas

Site e painel administrativo da AutoCar Multimarcas (Piraju-SP). HTML, CSS e JavaScript puros, sem etapa de build, hospedados no Firebase (Hosting, Authentication e Firestore).

- Site: https://autocarpiraju.com.br (também em https://autocar-multimarcas.web.app)
- Painel: `/admin`
- Conta do cliente: `/conta`

## Estrutura

```
public/
├── index.html          site
├── carro.html          link de carro ainda sem página própria (redireciona para o site)
├── 404.html
├── robots.txt, sitemap.xml
├── admin/              painel administrativo
├── conta/              conta do cliente
├── css/
├── img/
└── js/
scripts/
└── paginas-carros.mjs  gera public/carro/<slug>.html antes de cada deploy
firebase.json           Hosting, cabeçalhos de segurança, cache e predeploy
firestore.rules
storage.rules
```

## Publicar

No terminal do Codespaces:

```bash
firebase deploy --only hosting
```

Antes de publicar, o `predeploy` roda `scripts/paginas-carros.mjs`, que lê os carros publicados e cria uma página por carro em `/carro/<slug>`, com título, descrição, foto (Open Graph) e dados estruturados. É essa página que aparece na prévia quando o link é enviado no WhatsApp. Carros cadastrados depois do último deploy continuam abrindo pelo link, mas com a prévia geral da loja até o próximo deploy.

Regras e índices do Firestore:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Painel

- **Carros**: cadastro, fotos, status (rascunho, publicado, vendido) e importação do catálogo.
- **Adicionais**, **Categorias**, **Pedidos** e **Equipe**.
- **Site e marca**: logos, imagens, textos, contato, redes, título e descrição para o Google e ID do Pixel da Meta.

O primeiro administrador é criado no Console do Firebase: Firestore → coleção `admins` → documento com o UID da conta. Os próximos são autorizados pela tela **Equipe**.

## Pixel da Meta

Cole o ID do pixel em **Site e marca → Textos → Pixel da Meta**. O script da Meta só é baixado depois da primeira interação do visitante (toque, rolagem ou tecla), sem pesar no carregamento. Eventos enviados: `PageView`, `ViewContent` (abrir um carro), `Lead` (pedido de proposta) e `Contact` (clique no WhatsApp ou telefone).

## Fotos

As fotos são reduzidas no navegador, convertidas para WebP e guardadas no Firestore (coleção `midia`), o que funciona no plano gratuito. Para usar o Firebase Storage (plano Blaze), adicione `"storage": { "rules": "storage.rules" }` ao `firebase.json`, troque `armazenamento` para `"storage"` em `public/js/firebase-config.js` e rode `firebase deploy --only storage`.

## Segurança

- O `firebaseConfig` do app web não é segredo; quem protege os dados são as regras do Firestore.
- Nunca faça commit de chaves de conta de serviço nem de arquivos `.env`.
