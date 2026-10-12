// Pénsum UGB — Extractor de notas (Dirección de Integración · UGB)
// Al pulsar el icono de la extensión: lee la tabla de notas de la pestaña
// activa y la manda a la app Pénsum UGB para revisarla en la vista previa.
const APP_URL = '__APP_URL__';
const $ = id => document.getElementById(id);
let filas = [];

function leerTabla() { // se ejecuta DENTRO de la página del portal
  const tb = [].slice.call(document.querySelectorAll('table')).filter(t =>
    /C[ÓO]MPUTO\s*1/i.test(t.innerText) && /MATERIA/i.test(t.innerText))[0];
  if (!tb) return [];
  return [].slice.call(tb.querySelectorAll('tr')).map(r =>
    [].slice.call(r.cells).map(c => c.innerText.trim()).join('\t')
  ).filter(l => /^\d{2,4}\s*-/.test(l));
}

(async function () {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !/^https:\/\/estudiantes\.ugb\.edu\.sv\//.test(tab.url || '')) {
      $('s').textContent = 'Abre estudiantes.ugb.edu.sv → Notas y vuelve a pulsar la extensión.';
      return;
    }
    const r = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: leerTabla });
    filas = (r && r[0] && r[0].result) || [];
    if (!filas.length) { $('s').textContent = 'No se encontró la tabla. Abre la pestaña NOTAS.'; return; }
    $('s').textContent = '✓ ' + filas.length + ' materia(s) detectada(s)';
    $('s').className = 'ok';
    $('l').innerHTML = filas.map(l => '<li>' + l.split('\t')[0].replace(/</g, '&lt;') + '</li>').join('');
    $('go').disabled = false;
  } catch (e) {
    $('s').textContent = 'No se pudo leer la página: ' + e.message;
  }
})();

$('go').onclick = () => {
  const txt = filas.join('\n');
  chrome.tabs.create({ url: APP_URL + '#importar=' + btoa(unescape(encodeURIComponent(txt))) });
  window.close();
};
