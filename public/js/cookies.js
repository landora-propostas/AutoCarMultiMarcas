const CHAVE = "autocar:cookies";

function escolha() { try { return localStorage.getItem(CHAVE); } catch (e) { return null; } }

function salvar(v) {
  try { localStorage.setItem(CHAVE, v); } catch (e) {}
  window.dispatchEvent(new CustomEvent("cookies", { detail: v }));
}

let aviso = null;
function fechar() {
  if (!aviso) return;
  const el = aviso; aviso = null;
  el.classList.remove("is-on");
  setTimeout(function () { el.remove(); }, 400);
}

function mostrar() {
  if (aviso) return;
  aviso = document.createElement("section");
  aviso.className = "cookies";
  aviso.setAttribute("role", "dialog");
  aviso.setAttribute("aria-label", "Aviso de cookies");
  aviso.innerHTML =
    '<p><b>Cookies</b>Usamos cookies para o site funcionar e, com a sua permissão, para medir nossos anúncios no Facebook e Instagram. ' +
    'Saiba mais na <a href="/privacidade">Política de privacidade</a>.</p>' +
    '<div class="cookies-acoes"><button type="button" class="btn btn-ghost btn-sm" data-c="nao">Recusar</button>' +
    '<button type="button" class="btn btn-primary btn-sm" data-c="sim">Aceitar</button></div>';
  aviso.addEventListener("click", function (e) {
    const b = e.target.closest("[data-c]");
    if (!b) return;
    salvar(b.dataset.c);
    fechar();
  });
  document.body.appendChild(aviso);
  requestAnimationFrame(function () { requestAnimationFrame(function () { if (aviso) aviso.classList.add("is-on"); }); });
}

document.addEventListener("click", function (e) {
  if (e.target.closest("[data-cookies]")) { e.preventDefault(); mostrar(); }
});

if (!escolha()) setTimeout(mostrar, document.querySelector(".loader") ? 2600 : 600);
