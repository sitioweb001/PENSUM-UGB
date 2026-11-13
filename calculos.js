// calculos.js — Pénsum UGB
// ═══════════════════════════════════════════════════════════
// Funciones de CÁLCULO PURO (sin DOM, sin Firebase, sin "appData") que
// antes vivían mezcladas dentro de app.js. Se separaron acá por dos
// razones:
//   1) Se pueden probar automáticamente con Node (ver calculos.test.js),
//      sin necesitar un navegador ni datos de un estudiante real.
//   2) Quedan más fáciles de encontrar y de auditar — son las cuentas que
//      definen notas finales, estados de materia y "cuántos días faltan".
//
// IMPORTANTE: este archivo se carga con un <script> normal (no
// type="module") ANTES que app.js, así que estas funciones quedan
// disponibles globalmente exactamente igual que si siguieran adentro de
// app.js — ningún otro archivo (index.html, app.js) tuvo que cambiar su
// forma de llamarlas.
// ═══════════════════════════════════════════════════════════

// Escapa &, < y > para meter texto de forma segura dentro de HTML armado
// con template strings (evita que un nombre con esos caracteres rompa el
// layout o inyecte HTML).
function escapeHtml(s) {
  return (s || '').replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// Nota de un cómputo (laboratorio 1: 30%, laboratorio 2: 30%, parcial:
// 40%). Devuelve null si las 3 casillas están vacías (todavía no hay nada
// que calcular), tratando cualquier casilla vacía dentro de un cómputo con
// datos como 0 (ej: si falta el parcial, cuenta como 0 hasta que se cargue).
function calcComputo(c) {
  const l1 = parseFloat(c.lab1), l2 = parseFloat(c.lab2), p = parseFloat(c.parcial);
  if (isNaN(l1) && isNaN(l2) && isNaN(p)) return null;
  return (isNaN(l1) ? 0 : l1 * .3) + (isNaN(l2) ? 0 : l2 * .3) + (isNaN(p) ? 0 : p * .4);
}

// Promedio de los 3 cómputos parciales (1°, 2°, 3°). null si ninguno de
// los 3 tiene datos todavía.
function calcFinal(computos) {
  const s = computos.map(calcComputo);
  if (!s.some(x => x !== null)) return null;
  return s.reduce((a, b) => a + (b === null ? 0 : b), 0) / 3;
}

// Filtra un arreglo de objetos por un campo de fecha y un período con
// nombre ('all' | 'today' | 'week' | 'month' | 'year'). Si el campo de
// fecha no es una fecha válida, el ítem se deja pasar (mejor mostrar de
// más que ocultar algo por error de formato).
// `now` es opcional — se usa el momento actual si no se pasa nada, así
// que las llamadas existentes (`filterByPeriod(arr,'date',calFilter)`)
// siguen funcionando idénticas; el parámetro solo existe para que las
// pruebas puedan fijar una fecha exacta.
function filterByPeriod(arr, dateField, period, now) {
  if (period === 'all') return arr;
  now = now || new Date();
  return arr.filter(item => {
    const raw = item[dateField] || '';
    // "YYYY-MM-DD" solo (sin hora) se interpreta como día LOCAL; new Date()
    // lo tomaría como medianoche UTC y en UTC-6 caería en el día anterior.
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(raw);
    if (isNaN(d)) return true;
    if (period === 'today') { const t = new Date(now); t.setHours(0, 0, 0, 0); const dd = new Date(d); dd.setHours(0, 0, 0, 0); return dd.getTime() === t.getTime(); }
    if (period === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (period === 'month') { return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); }
    if (period === 'year') { return d.getFullYear() === now.getFullYear(); }
    return true;
  });
}

// Días de diferencia entre hoy y una fecha "YYYY-MM-DD" (negativo si ya
// pasó). `today` es opcional, mismo criterio que en filterByPeriod.
function daysUntil(dateStr, today) {
  today = today ? new Date(today) : new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return null;
  return Math.round((d - today) / 86400000);
}

// Fecha de hoy en formato "YYYY-MM-DD" (huso horario local). `d` opcional
// para pruebas.
function getTodayKey(d) {
  // OJO: NO usar toISOString() acá — da la fecha en UTC, y en El Salvador
  // (UTC-6) desde las 6 p. m. ya sería "mañana". Se arma con la fecha local.
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Muestra un guion largo en vez de vacío/undefined/null — usado en vistas
// previas para dejar claro "acá no había nada cargado" en vez de una
// casilla en blanco que se puede confundir con un espacio en blanco real.
function _fmtNota(v) {
  return (v === undefined || v === null || v === '') ? '—' : v;
}

// Extrae "HH:MM" en hora LOCAL a partir de un ISO — se usa para precargar
// la hora de entrada al editar una asistencia, sin importar si el registro
// original se guardó como automático o manual.
function _hhmmFromIso(iso) {
  try { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  catch (e) { return ''; }
}

// ═══════════════════════════════════════════════════════════
// RECORDATORIOS PERSONALIZADOS (nombre + fecha + hora + repetición)
// Funciones puras que usan TANTO la app (app.js) como el servidor de avisos
// push (scripts/logica.mjs lo carga con require). Trabajan solo con textos
// "YYYY-MM-DD", sin depender del huso horario de quien las ejecute.
//   rec = { id, nombre, fecha, hora:'HH:MM', repetir:'nunca'|'diario'|'semanal'|'mensual',
//           dias:[0-6] (solo semanal; 0 = domingo), hasta:'YYYY-MM-DD'|'', activo, nota }
// ═══════════════════════════════════════════════════════════
function _recPartes(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}
function recDiaSemana(ymd) {
  const p = _recPartes(ymd);
  return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : null;
}
function recSumarDias(ymd, n) {
  const p = _recPartes(ymd);
  if (!p) return null;
  return new Date(Date.UTC(p.y, p.m - 1, p.d + n)).toISOString().slice(0, 10);
}
function _recDiasDelMes(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

// ¿Este recordatorio "toca" ese día? (sin mirar la hora)
function recordatorioOcurreEn(rec, ymd) {
  if (!rec || rec.activo === false) return false;
  const p = _recPartes(ymd), s = _recPartes(rec.fecha);
  if (!p || !s) return false;
  if (ymd < rec.fecha) return false;              // ISO: comparar como texto es correcto
  if (rec.hasta && ymd > rec.hasta) return false;
  if (rec.repetir === 'diario') return true;
  if (rec.repetir === 'semanal') {
    const dias = Array.isArray(rec.dias) && rec.dias.length ? rec.dias.map(Number) : [recDiaSemana(rec.fecha)];
    return dias.indexOf(recDiaSemana(ymd)) !== -1;
  }
  if (rec.repetir === 'mensual') return p.d === Math.min(s.d, _recDiasDelMes(p.y, p.m)); // día 31 → último día en meses cortos
  return ymd === rec.fecha;                        // 'nunca' (una sola vez)
}

// Próxima fecha en que sonará (hoy cuenta solo si la hora aún no pasó).
// `minutosAhora` = minutos desde medianoche; si no se pasa, hoy cuenta siempre.
function proximaOcurrenciaRecordatorio(rec, hoyYmd, minutosAhora) {
  const hm = /^(\d{1,2}):(\d{2})$/.exec((rec && rec.hora) || '');
  const minRec = hm ? (+hm[1]) * 60 + (+hm[2]) : 0;
  for (let i = 0; i <= 400; i++) {
    const ymd = recSumarDias(hoyYmd, i);
    if (!ymd) return null;
    if (i === 0 && minutosAhora !== undefined && minutosAhora > minRec) continue;
    if (recordatorioOcurreEn(rec, ymd)) return ymd;
  }
  return null;
}

function resumenRepeticionRecordatorio(rec) {
  const NOMBRES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  let t = 'Una sola vez';
  if (rec.repetir === 'diario') t = 'Todos los días';
  else if (rec.repetir === 'semanal') {
    const dias = (Array.isArray(rec.dias) && rec.dias.length ? rec.dias.map(Number) : [recDiaSemana(rec.fecha)]).slice().sort();
    t = dias.length === 7 ? 'Todos los días' : 'Cada ' + dias.map((d) => NOMBRES[d]).join(', ');
  } else if (rec.repetir === 'mensual') t = 'Cada mes (día ' + ((_recPartes(rec.fecha) || {}).d || '?') + ')';
  if (rec.repetir && rec.repetir !== 'nunca' && rec.hasta) t += ' hasta ' + rec.hasta;
  return t;
}

// ── Puente para Node/pruebas — no afecta al navegador ──
// En un <script> normal del navegador, `module` no existe, así que este
// bloque directamente no se ejecuta y el comportamiento es idéntico a
// cuando estas funciones vivían dentro de app.js. Solo cuando este mismo
// archivo se carga con `require()` desde Node (ver calculos.test.js) se
// exponen como exports para poder probarlas.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { escapeHtml, calcComputo, calcFinal, filterByPeriod, daysUntil, getTodayKey, _fmtNota, _hhmmFromIso,
    recDiaSemana, recSumarDias, recordatorioOcurreEn, proximaOcurrenciaRecordatorio, resumenRepeticionRecordatorio };
}
