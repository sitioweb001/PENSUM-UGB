// Pénsum UGB — Extractor de notas (Dirección de Integración · UGB)
// Corre solo en https://estudiantes.ugb.edu.sv/*. Lee la tabla de notas de la
// página y la manda a la app Pénsum UGB, donde se revisa en la vista previa
// ANTES de guardar nada. No envía datos a ningún servidor.
(function () {
  if (window.__ugbPensumExt) return;
  window.__ugbPensumExt = true;
  const APP_URL = '__APP_URL__';

  function leerFilas() {
    const tb = [].slice.call(document.querySelectorAll('table')).filter(function (t) {
      return /C[ÓO]MPUTO\s*1/i.test(t.innerText) && /MATERIA/i.test(t.innerText);
    })[0];
    if (!tb) return null;
    return [].slice.call(tb.querySelectorAll('tr')).map(function (r) {
      return [].slice.call(r.cells).map(function (c) { return c.innerText.trim(); }).join('\t');
    }).filter(function (l) { return /^\d{2,4}\s*-/.test(l); });
  }

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML =
    '<style>' +
    '.p{font:13px/1.4 Inter,Segoe UI,Arial,sans-serif;width:270px;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.25);overflow:hidden}' +
    '.h{background:#1e3a8a;padding:8px 10px;display:flex;align-items:center;gap:8px}' +
    '.h .l{background:#fff;border-radius:6px;padding:3px 6px;display:flex;align-items:center;gap:8px;flex:1}' +
    '.h img{height:26px;max-width:105px;object-fit:contain}' +
    '.x{background:none;border:0;color:#fff;font-size:18px;cursor:pointer}' +
    '.b{padding:10px 12px}.t{font-weight:700;color:#1e3a8a;margin-bottom:2px}' +
    '.s{font-size:12px;color:#475569;margin-bottom:8px}.s.ok{color:#047857;font-weight:600}' +
    'button.go{width:100%;padding:9px;border:0;border-radius:8px;background:#1e3a8a;color:#fff;font-weight:700;font-size:13px;cursor:pointer}' +
    'button.go:disabled{opacity:.5;cursor:not-allowed}' +
    '.m{display:none;background:#1e3a8a;color:#fff;border:0;border-radius:50%;width:44px;height:44px;font-size:20px;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.3)}' +
    '.min .p{display:none}.min .m{display:block}' +
    '</style>' +
    '<div id="w"><div class="p">' +
    '<div class="h"><div class="l"><img src="' + chrome.runtime.getURL('logos/ugb.png') + '" alt="UGB">' +
    '<img src="' + chrome.runtime.getURL('logos/di.jpg') + '" alt="Dirección de Integración"></div>' +
    '<button class="x" id="x" title="Minimizar">–</button></div>' +
    '<div class="b"><div class="t">Pénsum UGB</div><div class="s" id="s">Buscando tabla de notas…</div>' +
    '<button class="go" id="go" disabled>📥 Enviar notas a Pénsum UGB</button></div></div>' +
    '<button class="m" id="m" title="Pénsum UGB">🎓</button></div>';
  document.documentElement.appendChild(host);

  const $ = function (id) { return root.getElementById(id); };
  const w = $('w');
  $('x').onclick = function () { w.classList.add('min'); };
  $('m').onclick = function () { w.classList.remove('min'); };

  function refrescar() {
    const f = leerFilas();
    const s = $('s'), go = $('go');
    if (f && f.length) {
      s.textContent = '✓ ' + f.length + ' materia(s) detectada(s) en esta página.';
      s.className = 's ok'; go.disabled = false;
    } else {
      s.textContent = 'Abre la pestaña NOTAS para detectar la tabla.';
      s.className = 's'; go.disabled = true;
    }
  }
  setInterval(refrescar, 1500); refrescar();

  $('go').onclick = function () {
    const f = leerFilas();
    if (!f || !f.length) return;
    const txt = f.join('\n');
    try { navigator.clipboard.writeText(txt); } catch (e) {}
    window.open(APP_URL + '#importar=' + btoa(unescape(encodeURIComponent(txt))), '_blank');
  };
})();
