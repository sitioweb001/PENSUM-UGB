// calculos.test.js — pruebas automatizadas de calculos.js
//
// Cómo correrlas:  node calculos.test.js
//
// No usa ningún framework (jest, mocha, etc.) a propósito — así se pueden
// correr en cualquier máquina que tenga Node instalado, sin "npm install"
// previo. Cada prueba es un assert.* con un mensaje descriptivo; si algo
// falla, Node corta la ejecución y muestra exactamente cuál era el
// resultado esperado vs. el real.

const assert = require('assert');
const {
  escapeHtml, calcComputo, calcFinal, filterByPeriod, daysUntil, getTodayKey, _fmtNota, _hhmmFromIso
} = require('./calculos.js');

let pasadas = 0;
function t(nombre, fn) {
  try { fn(); pasadas++; console.log('  ✓ ' + nombre); }
  catch (e) { console.error('  ✗ ' + nombre); throw e; }
}

console.log('escapeHtml()');
t('deja pasar texto normal sin tocarlo', () => {
  assert.strictEqual(escapeHtml('Juan Pérez'), 'Juan Pérez');
});
t('escapa &, < y >', () => {
  assert.strictEqual(escapeHtml('<script>a&b</script>'), '&lt;script&gt;a&amp;b&lt;/script&gt;');
});
t('undefined/null se tratan como texto vacío', () => {
  assert.strictEqual(escapeHtml(undefined), '');
  assert.strictEqual(escapeHtml(null), '');
});

console.log('calcComputo()');
t('lab1 30% + lab2 30% + parcial 40%', () => {
  assert.strictEqual(calcComputo({ lab1: 10, lab2: 10, parcial: 10 }), 10);
  assert.strictEqual(calcComputo({ lab1: 5, lab2: 10, parcial: 8 }), +(5*.3 + 10*.3 + 8*.4).toFixed(10));
});
t('null si las 3 casillas están vacías', () => {
  assert.strictEqual(calcComputo({ lab1: '', lab2: '', parcial: '' }), null);
});
t('una casilla vacía cuenta como 0, no como null', () => {
  assert.strictEqual(calcComputo({ lab1: 10, lab2: '', parcial: '' }), 3); // 10*.3
});

console.log('calcFinal()');
t('promedio de los 3 cómputos con datos', () => {
  const r = calcFinal([{ lab1: 10, lab2: 10, parcial: 10 }, { lab1: 10, lab2: 10, parcial: 10 }, { lab1: 10, lab2: 10, parcial: 10 }]);
  assert.strictEqual(r, 10);
});
t('null si ningún parcial tiene datos todavía', () => {
  const r = calcFinal([{ lab1: '', lab2: '', parcial: '' }, { lab1: '', lab2: '', parcial: '' }, { lab1: '', lab2: '', parcial: '' }]);
  assert.strictEqual(r, null);
});
t('cuenta los parciales sin datos como 0 dentro del promedio (una vez que ya hay al menos uno con datos)', () => {
  const r = calcFinal([{ lab1: 10, lab2: 10, parcial: 10 }, { lab1: '', lab2: '', parcial: '' }, { lab1: '', lab2: '', parcial: '' }]);
  assert.strictEqual(r, 10 / 3);
});

console.log('daysUntil()');
t('0 si la fecha es hoy', () => {
  assert.strictEqual(daysUntil('2026-09-08', new Date('2026-09-08T15:00:00')), 0);
});
t('positivo si la fecha es futura', () => {
  assert.strictEqual(daysUntil('2026-09-15', new Date('2026-09-08T00:00:00')), 7);
});
t('negativo si la fecha ya pasó', () => {
  assert.strictEqual(daysUntil('2026-09-01', new Date('2026-09-08T00:00:00')), -7);
});
t('null si la fecha no es válida', () => {
  assert.strictEqual(daysUntil('no-es-una-fecha', new Date('2026-09-08')), null);
});

console.log('getTodayKey()');
t('formato YYYY-MM-DD', () => {
  assert.strictEqual(getTodayKey(new Date('2026-01-05T10:00:00Z')), '2026-01-05');
});

console.log('filterByPeriod()');
const eventosPrueba = [
  { date: '2026-09-08' }, // hoy
  { date: '2026-09-05' }, // hace 3 días (dentro de la semana)
  { date: '2026-08-01' }, // mes pasado
  { date: '2025-01-01' }  // año pasado
];
const hoy = new Date('2026-09-08T12:00:00');
t('"all" no filtra nada', () => {
  assert.strictEqual(filterByPeriod(eventosPrueba, 'date', 'all', hoy).length, 4);
});
t('"today" deja solo la fecha de hoy', () => {
  assert.strictEqual(filterByPeriod(eventosPrueba, 'date', 'today', hoy).length, 1);
});
t('"week" incluye hoy y hace 3 días', () => {
  assert.strictEqual(filterByPeriod(eventosPrueba, 'date', 'week', hoy).length, 2);
});
t('"month" incluye solo las del mes actual', () => {
  assert.strictEqual(filterByPeriod(eventosPrueba, 'date', 'month', hoy).length, 2);
});
t('un dateField sin fecha válida se deja pasar (no se oculta por error)', () => {
  const conFechaRota = [{ date: 'no-es-fecha' }];
  assert.strictEqual(filterByPeriod(conFechaRota, 'date', 'today', hoy).length, 1);
});

console.log('_fmtNota()');
t('undefined/null/"" se muestran como guion largo', () => {
  assert.strictEqual(_fmtNota(undefined), '—');
  assert.strictEqual(_fmtNota(null), '—');
  assert.strictEqual(_fmtNota(''), '—');
});
t('0 es un valor real, no se reemplaza', () => {
  assert.strictEqual(_fmtNota(0), 0);
});

console.log('_hhmmFromIso()');
t('extrae HH:MM en hora local', () => {
  const iso = new Date(2026, 0, 5, 8, 30, 0).toISOString(); // 08:30 hora local
  assert.strictEqual(_hhmmFromIso(iso), '08:30');
});
t('con una fecha inválida no revienta (aunque el resultado no sea una hora real)', () => {
  // new Date('texto cualquiera') da "Invalid Date" pero no revienta —
  // getHours()/getMinutes() devuelven NaN, así que el resultado queda
  // "NaN:NaN" en vez de tirar una excepción. Se deja documentado acá para
  // que quede claro cuál es el comportamiento real (no ideal, pero
  // predecible) en vez de asumirlo.
  assert.strictEqual(_hhmmFromIso('esto-no-es-una-fecha-iso-válida'), 'NaN:NaN');
});

console.log('\n✅ ' + pasadas + ' pruebas pasaron correctamente.');
