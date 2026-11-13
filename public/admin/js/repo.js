// Acesso ao Firestore para o painel (coleções pequenas: lê tudo e filtra no navegador).
import { semUndefined } from "/js/modelo.js";

// Cada alteração no painel apaga o cache do site neste aparelho, para ver o resultado na hora.
// (Nos aparelhos dos visitantes o site se atualiza sozinho em até 30 minutos.)
function limparCacheDoSite() { try { indexedDB.deleteDatabase("autocar-cache"); } catch (e) { /* sem IndexedDB */ } }
limparCacheDoSite();

// Cache de leitura em memória: trocar de tela reaproveita o que já foi lido (sem novo "Carregando…").
// Qualquer gravação limpa o cache da coleção alterada; um lote limpa tudo.
const VALIDADE = 3 * 60 * 1000;
const cache = new Map();
function copia(o) { return o ? Object.assign({}, o) : o; }
function lembrar(chave, busca) {
  const c = cache.get(chave);
  if (c && Date.now() - c.t < VALIDADE) return c.p;
  const p = busca().catch(function (e) { cache.delete(chave); throw e; });
  cache.set(chave, { t: Date.now(), p: p });
  return p;
}
function esquecer(col) {
  if (!col) { cache.clear(); return; }
  Array.from(cache.keys()).forEach(function (k) { if (k === "l:" + col || k.indexOf("o:" + col + "/") === 0) cache.delete(k); });
}

export function criarRepo(ctx) {
  const f = ctx.fs, db = ctx.db;
  const ref = function (col, id) { return f.doc(db, col, id); };
  const mudou = function (col) { esquecer(col); limparCacheDoSite(); };
  return {
    async listar(col) {
      const lista = await lembrar("l:" + col, async function () {
        const s = await f.getDocs(f.collection(db, col));
        return s.docs.map(function (d) { const o = d.data(); o.id = d.id; return o; });
      });
      return lista.map(copia);
    },
    async obter(col, id) {
      const o = await lembrar("o:" + col + "/" + id, async function () {
        const s = await f.getDoc(ref(col, id));
        if (!s.exists()) return null;
        const d = s.data(); d.id = s.id; return d;
      });
      return copia(o);
    },
    // Cria ou mescla campos. Sempre registra a data da alteração.
    async salvar(col, id, dados, substituir) {
      const d = semUndefined(dados);
      d.atualizadoEm = f.serverTimestamp();
      await f.setDoc(ref(col, id), d, substituir ? {} : { merge: true });
      mudou(col);
    },
    async criar(col, dados) {
      const d = semUndefined(dados);
      d.criadoEm = f.serverTimestamp();
      const id = (await f.addDoc(f.collection(db, col), d)).id;
      mudou(col);
      return id;
    },
    async atualizar(col, id, dados) { await f.updateDoc(ref(col, id), semUndefined(dados)); mudou(col); },
    async remover(col, id) { await f.deleteDoc(ref(col, id)); mudou(col); },
    lote() { const b = f.writeBatch(db), c = b.commit.bind(b); b.commit = function () { return c().then(function (r) { mudou(null); return r; }); }; return b; },
    esquecer: esquecer,
    ref: ref
  };
}
