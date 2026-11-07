// Acesso ao Firestore para o painel (coleções pequenas: lê tudo e filtra no navegador).
import { semUndefined } from "/js/modelo.js";

export function criarRepo(ctx) {
  const f = ctx.fs, db = ctx.db;
  const ref = function (col, id) { return f.doc(db, col, id); };
  return {
    async listar(col) {
      const s = await f.getDocs(f.collection(db, col));
      return s.docs.map(function (d) { const o = d.data(); o.id = d.id; return o; });
    },
    async obter(col, id) {
      const s = await f.getDoc(ref(col, id));
      if (!s.exists()) return null;
      const o = s.data(); o.id = s.id; return o;
    },
    // Cria ou mescla campos. Sempre registra a data da alteração.
    async salvar(col, id, dados, substituir) {
      const d = semUndefined(dados);
      d.atualizadoEm = f.serverTimestamp();
      await f.setDoc(ref(col, id), d, substituir ? {} : { merge: true });
    },
    async criar(col, dados) {
      const d = semUndefined(dados);
      d.criadoEm = f.serverTimestamp();
      return (await f.addDoc(f.collection(db, col), d)).id;
    },
    async atualizar(col, id, dados) { await f.updateDoc(ref(col, id), semUndefined(dados)); },
    async remover(col, id) { await f.deleteDoc(ref(col, id)); },
    lote() { return f.writeBatch(db); },
    ref: ref
  };
}
