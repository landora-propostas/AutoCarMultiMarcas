const so = function (t) { return String(t || "").replace(/\D/g, ""); };

function valor(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("mapValue" in v) { const o = {}; Object.entries(v.mapValue.fields || {}).forEach(function (e) { o[e[0]] = valor(e[1]); }); return o; }
  return null;
}

(async function () {
  try {
    const c = await fetch("/__/firebase/init.json").then(function (r) { if (!r.ok) throw 0; return r.json(); });
    const d = await fetch("https://firestore.googleapis.com/v1/projects/" + c.projectId + "/databases/(default)/documents/config/site?key=" + encodeURIComponent(c.apiKey)).then(function (r) { if (!r.ok) throw 0; return r.json(); });
    const cfg = valor({ mapValue: d });
    document.querySelectorAll("[data-s]").forEach(function (el) {
      const v = el.dataset.s.split(".").reduce(function (a, k) { return a == null ? undefined : a[k]; }, cfg);
      if (typeof v === "string" && v.trim()) el.textContent = v.trim();
    });
    const ct = cfg.contato || {};
    if (ct.email && ct.email.trim()) document.querySelectorAll('[data-href="email"]').forEach(function (a) { a.href = "mailto:" + ct.email.trim(); });
    const z = so(ct.whatsapp);
    if (z) document.querySelectorAll('[data-href="whatsapp"]').forEach(function (a) { a.href = "https://wa.me/" + (z.length <= 11 ? "55" : "") + z; });
  } catch (e) {}
})();
