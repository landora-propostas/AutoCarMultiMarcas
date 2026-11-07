// Inicialização do Firebase, compartilhada pelo site e pelo painel.
// Usa o SDK modular direto do CDN do Google (o projeto não tem etapa de build).
import { FIREBASE_CONFIG, OPCOES } from "./firebase-config.js";

export const VERSAO_SDK = "10.14.1";
const CDN = "https://www.gstatic.com/firebasejs/" + VERSAO_SDK + "/";
let ctx = null;

async function configuracao() {
  if (FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey) return FIREBASE_CONFIG;
  // O Firebase Hosting publica a configuração do app Web neste endereço.
  const r = await fetch("/__/firebase/init.json", { cache: "no-store" });
  if (!r.ok) throw new Error("config-indisponivel");
  const j = await r.json();
  if (!j || !j.apiKey) throw new Error("config-indisponivel");
  return j;
}

// quer: { auth: true } para login, { storage: true } para o Firebase Storage.
export async function iniciar(quer) {
  quer = quer || {};
  if (!ctx) {
    const [appSdk, fs, cfg] = await Promise.all([
      import(CDN + "firebase-app.js"),
      import(CDN + "firebase-firestore.js"),
      configuracao()
    ]);
    const app = appSdk.initializeApp(cfg);
    ctx = { app: app, db: fs.getFirestore(app), fs: fs, cfg: cfg, opcoes: OPCOES };
  }
  if (quer.auth && !ctx.auth) {
    const a = await import(CDN + "firebase-auth.js");
    ctx.authSdk = a;
    ctx.auth = a.getAuth(ctx.app);
  }
  if (quer.storage && !ctx.storage) {
    const s = await import(CDN + "firebase-storage.js");
    ctx.storageSdk = s;
    ctx.storage = s.getStorage(ctx.app);
  }
  return ctx;
}
