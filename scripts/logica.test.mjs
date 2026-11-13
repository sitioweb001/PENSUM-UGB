// Pruebas de las reglas de avisos:  cd scripts && node logica.test.mjs
import assert from 'node:assert/strict';
import {
  DEFAULTS, ahoraLocal, diasEntre, tierDe, etiquetaDias, nombreMateria,
  construirAvisos, agruparAvisos, podarEnviados
} from './logica.mjs';
import { readFileSync } from 'node:fs';
const materias = JSON.parse(readFileSync(new URL('./materias.json', import.meta.url), 'utf8'));

let n = 0;
const t = (nombre, fn) => { fn(); n++; console.log('  ✓', nombre); };

t('ahoraLocal usa UTC-6 (8:30 a. m. local = 14:30 UTC)', () => {
  assert.deepEqual(ahoraLocal(new Date('2026-11-12T14:30:00Z')), { hoy: '2026-11-12', hora: 8 });
});
t('ahoraLocal: a las 21:30 locales el día sigue siendo el mismo (03:30 UTC del día siguiente)', () => {
  assert.deepEqual(ahoraLocal(new Date('2026-11-13T03:30:00Z')), { hoy: '2026-11-12', hora: 21 });
});
t('ahoraLocal: medianoche local es hora 0, no 24', () => {
  assert.deepEqual(ahoraLocal(new Date('2026-11-12T06:10:00Z')), { hoy: '2026-11-12', hora: 0 });
});
t('diasEntre', () => {
  assert.equal(diasEntre('2026-11-12', '2026-11-19'), 7);
  assert.equal(diasEntre('2026-11-12', '2026-11-11'), -1);
  assert.equal(diasEntre('2026-11-12', 'basura'), null);
});
t('tierDe con los valores por defecto (7/4/2)', () => {
  assert.equal(tierDe(8, DEFAULTS), null);
  assert.equal(tierDe(7, DEFAULTS), 'green');
  assert.equal(tierDe(4, DEFAULTS), 'yellow');
  assert.equal(tierDe(3, DEFAULTS), 'yellow');
  assert.equal(tierDe(2, DEFAULTS), 'red');
  assert.equal(tierDe(-1, DEFAULTS), 'red');
});
t('etiquetaDias', () => {
  assert.equal(etiquetaDias(0), 'Es hoy');
  assert.equal(etiquetaDias(1), 'Falta 1 día');
  assert.equal(etiquetaDias(5), 'Faltan 5 días');
  assert.equal(etiquetaDias(-1), 'Venció hace 1 día');
});
t('nombreMateria: pénsum de la carrera y pénsum personalizado', () => {
  assert.equal(nombreMateria({ carrera: 'sistemas' }, '02', materias), 'Sistemas Operativos');
  assert.equal(nombreMateria({ pensumCycles: [{ subjects: [{ num: '02', name: 'Otra' }] }] }, '02', materias), 'Otra');
  assert.equal(nombreMateria({}, null, materias), '');
});

const base = { est: { carrera: 'sistemas' }, cfg: { ...DEFAULTS }, eventos: [], asistioHoy: false, enviados: {}, hoy: '2026-11-12', hora: 9, materias };

t('asistencia: se avisa entre su hora y las 21:00 si no marcó', () => {
  assert.equal(construirAvisos({ ...base, hora: 7 }).length, 0);
  assert.equal(construirAvisos({ ...base, hora: 8 })[0].tag, 'asistencia');
  assert.equal(construirAvisos({ ...base, hora: 21 }).length, 0);
});
t('asistencia: no se avisa si ya marcó, si ya se avisó hoy o si está apagado', () => {
  assert.equal(construirAvisos({ ...base, asistioHoy: true }).length, 0);
  assert.equal(construirAvisos({ ...base, enviados: { 'asistencia_2026-11-12': '2026-11-12' } }).length, 0);
  assert.equal(construirAvisos({ ...base, cfg: { ...DEFAULTS, attendanceReminder: false } }).length, 0);
});
t('eventos: franja, texto y no repetir la misma franja', () => {
  const eventos = [{ id: '1', type: 'Parcial', subject: '02', date: '2026-11-14', done: false }];
  const a = construirAvisos({ ...base, asistioHoy: true, eventos });
  assert.equal(a.length, 1);
  assert.equal(a[0].title, '🔴 Parcial');
  assert.equal(a[0].body, 'Sistemas Operativos · Faltan 2 días · 2026-11-14');
  assert.equal(construirAvisos({ ...base, asistioHoy: true, eventos, enviados: { '1_red': '2026-11-12' } }).length, 0);
});
t('eventos: hecho, muy lejano, muy vencido o materia silenciada no avisan', () => {
  const mk = (o) => construirAvisos({ ...base, asistioHoy: true, cfg: { ...DEFAULTS, ...(o.cfg || {}) }, eventos: [{ id: '1', type: 'Lab', subject: '02', date: '2026-11-14', done: false, ...o.ev }] });
  assert.equal(mk({ ev: { done: true } }).length, 0);
  assert.equal(mk({ ev: { date: '2026-12-30' } }).length, 0);
  assert.equal(mk({ ev: { date: '2026-11-05' } }).length, 0);
  assert.equal(mk({ cfg: { mutedSubjects: { '02': true } } }).length, 0);
  assert.equal(mk({ ev: { date: '2026-11-11' } }).length, 1); // venció ayer: sí, una vez
});
t('eventos: antes de la hora configurada no se envían', () => {
  const eventos = [{ id: '1', type: 'Lab', subject: null, date: '2026-11-13', done: false }];
  assert.equal(construirAvisos({ ...base, asistioHoy: true, eventos, hora: 6 }).length, 0);
  assert.equal(construirAvisos({ ...base, asistioHoy: true, eventos, hora: 7 }).length, 1);
});
t('orden por urgencia y agrupación (máx. 3 sueltos + 1 resumen)', () => {
  const eventos = [5, 1, 3, 2, 4].map((d, i) => ({ id: String(i), type: 'Tarea', subject: null, date: `2026-11-${12 + d}`, done: false }));
  const av = construirAvisos({ ...base, eventos });
  assert.equal(av[0].tag, 'asistencia'); // la asistencia va primero
  const g = agruparAvisos(av);
  assert.equal(g.sueltos.length, 3);
  assert.equal(g.resto.length, 3);
  assert.equal(g.resumen.title, '📅 3 avisos más');
  assert.equal(agruparAvisos(av.slice(0, 2)).resumen, null);
});
t('podarEnviados olvida lo de hace más de 45 días', () => {
  const p = podarEnviados({ a: '2026-11-10', b: '2026-09-01' }, '2026-11-12');
  assert.deepEqual(p, { a: '2026-11-10' });
});

console.log(`\n${n} pruebas OK`);
