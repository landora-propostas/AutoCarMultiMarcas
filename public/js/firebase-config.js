// Configuração do Firebase usada pelo site e pelo painel (/admin).
//
// Na maioria dos casos NÃO precisa mexer aqui: quando o site está publicado no Firebase Hosting,
// a configuração é lida sozinha de /__/firebase/init.json (basta existir um app Web registrado
// no projeto: Configurações do projeto → Seus apps → Web).
//
// Só preencha FIREBASE_CONFIG se for rodar o site fora do Firebase Hosting (por exemplo, em
// `npx serve public` ou em outro domínio). O objeto firebaseConfig NÃO é segredo; quem protege
// os dados são as regras do Firestore (arquivo firestore.rules).
export const FIREBASE_CONFIG = null;
// Exemplo:
// export const FIREBASE_CONFIG = {
//   apiKey: "...", authDomain: "concessionaria-landora.firebaseapp.com",
//   projectId: "concessionaria-landora", storageBucket: "concessionaria-landora.firebasestorage.app",
//   messagingSenderId: "...", appId: "..."
// };

// Onde as fotos ficam guardadas:
//  "firestore" (padrão): as fotos são reduzidas no navegador e salvas no próprio Firestore.
//                         Funciona no plano gratuito (Spark), sem configurar mais nada.
//  "storage":            usa o Firebase Storage (melhor desempenho, mas exige o plano Blaze).
//                         Veja o README, seção "Fotos no Firebase Storage".
export const OPCOES = { armazenamento: "firestore" };
