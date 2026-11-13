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
  escapeHtml, calcComputo, calcFinal, filterByPeriod, daysUntil, getTodayKey, _fmtNota, _hhmmFromIso,
  recDiaSemana, recSumarDias, recordatorioOcurreEn, proximaOcurrenciaRecordatorio, resumenRepeticionRecordatorio
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
  assert.strictEqual(getTodayKey(new Date(2026, 0, 5, 10, 0)), '2026-01-05');
});
t('usa la fecha LOCAL: a las 6:16 p. m. sigue siendo el mismo día (bug de UTC)', () => {
  assert.strictEqual(getTodayKey(new Date(2026, 9, 12, 18, 16)), '2026-10-12');
  assert.strictEqual(getTodayKey(new Date(2026, 9, 12, 23, 59)), '2026-10-12');
  assert.strictEqual(getTodayKey(new Date(2026, 9, 13, 0, 1)), '2026-10-13');
});

console.log('filterByPeriod() — fechas YYYY-MM-DD como día local');
t('"today" con fecha sin hora no cae en el día anterior', () => {
  const ahora = new Date(2026, 9, 12, 18, 30);
  assert.strictEqual(filterByPeriod([{ date: '2026-10-12' }, { date: '2026-10-11' }], 'date', 'today', ahora).length, 1);
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

console.log('\nRecordatorios personalizados');
const base = { id: 'r1', nombre: 'Tomar agua', fecha: '2026-11-12', hora: '09:30', repetir: 'nunca', activo: true };
t('recDiaSemana: 12-nov-2026 es jueves (4)', () => { assert.strictEqual(recDiaSemana('2026-11-12'), 4); });
t('recSumarDias cruza mes y año', () => {
  assert.strictEqual(recSumarDias('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(recSumarDias('2026-03-01', -1), '2026-02-28');
});
t('una sola vez: solo en su fecha', () => {
  assert.strictEqual(recordatorioOcurreEn(base, '2026-11-12'), true);
  assert.strictEqual(recordatorioOcurreEn(base, '2026-11-13'), false);
  assert.strictEqual(recordatorioOcurreEn(base, '2026-11-11'), false);
});
t('desactivado nunca ocurre', () => {
  assert.strictEqual(recordatorioOcurreEn({ ...base, activo: false }, '2026-11-12'), false);
});
t('diario: desde su fecha, y respeta "hasta"', () => {
  const r = { ...base, repetir: 'diario', hasta: '2026-11-14' };
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-11'), false);
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-13'), true);
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-14'), true);
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-15'), false);
});
t('semanal: solo los días elegidos (lun=1, mié=3)', () => {
  const r = { ...base, repetir: 'semanal', dias: [1, 3] };
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-16'), true);   // lunes
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-18'), true);   // miércoles
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-17'), false);  // martes
});
t('semanal sin días: usa el día de la semana de su fecha', () => {
  const r = { ...base, repetir: 'semanal', dias: [] };
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-19'), true);   // otro jueves
  assert.strictEqual(recordatorioOcurreEn(r, '2026-11-20'), false);
});
t('mensual: mismo día del mes; el 31 cae el último día en meses cortos', () => {
  const r = { ...base, fecha: '2026-01-31', repetir: 'mensual' };
  assert.strictEqual(recordatorioOcurreEn(r, '2026-02-28'), true);
  assert.strictEqual(recordatorioOcurreEn(r, '2026-02-27'), false);
  assert.strictEqual(recordatorioOcurreEn(r, '2026-03-31'), true);
});
t('próxima ocurrencia: hoy solo si la hora no pasó', () => {
  const r = { ...base, repetir: 'diario' };
  assert.strictEqual(proximaOcurrenciaRecordatorio(r, '2026-11-12', 9 * 60), '2026-11-12');
  assert.strictEqual(proximaOcurrenciaRecordatorio(r, '2026-11-12', 10 * 60), '2026-11-13');
  assert.strictEqual(proximaOcurrenciaRecordatorio(base, '2026-11-13', 0), null); // una sola vez, ya pasó
});
t('resumenRepeticionRecordatorio', () => {
  assert.strictEqual(resumenRepeticionRecordatorio(base), 'Una sola vez');
  assert.strictEqual(resumenRepeticionRecordatorio({ ...base, repetir: 'diario' }), 'Todos los días');
  assert.strictEqual(resumenRepeticionRecordatorio({ ...base, repetir: 'semanal', dias: [3, 1] }), 'Cada lun, mié');
  assert.strictEqual(resumenRepeticionRecordatorio({ ...base, repetir: 'diario', hasta: '2026-12-01' }), 'Todos los días hasta 2026-12-01');
});

console.log('\n✅ ' + pasadas + ' pruebas pasaron correctamente.');
