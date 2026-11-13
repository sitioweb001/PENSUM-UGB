// logica.mjs — reglas de los avisos push (funciones puras, sin red ni Firebase).
// Replica lo que ya hace computeNotifications() en app.js para los avisos dentro
// de la app: verde / amarillo / rojo según los días que faltan.

export const TZ = 'America/El_Salvador'; // UTC-6 todo el año (sin horario de verano)
export const HORA_LIMITE_ASISTENCIA = 21; // no recordar asistencia a las 9 p. m. o después
export const RETENER_DIAS = 45;           // cuánto tiempo se recuerda "ya avisé de esto"
export const URL_ASISTENCIA = './index.html?aviso=asistencia';
export const URL_CALENDARIO = './index.html?aviso=calendario';

export const DEFAULTS = {
  enabled: true, attendanceReminder: true,
  greenDays: 7, yellowDays: 4, redDays: 2,
  pushHoraEventos: 7, pushHoraAsistencia: 8,
  mutedSubjects: {}
};

const ICONO = { red: '🔴', yellow: '🟡', green: '🟢' };

// Fecha (YYYY-MM-DD) y hora (0-23) actuales en El Salvador.
export function ahoraLocal(fecha = new Date(), tz = TZ) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23'
  }).formatToParts(fecha);
  const g = (t) => partes.find((p) => p.type === t).value;
  return { hoy: `${g('year')}-${g('month')}-${g('day')}`, hora: parseInt(g('hour'), 10) };
}

// Días de calendario entre dos fechas YYYY-MM-DD (hasta - desde). null si es inválida.
export function diasEntre(desde, hasta) {
  const a = Date.parse(desde + 'T00:00:00Z');
  const b = Date.parse(hasta + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function tierDe(dias, cfg) {
  if (dias <= cfg.redDays) return 'red';
  if (dias <= cfg.yellowDays) return 'yellow';
  if (dias <= cfg.greenDays) return 'green';
  return null;
}

export function etiquetaDias(d) {
  if (d < 0) return `Venció hace ${-d} día${d === -1 ? '' : 's'}`;
  if (d === 0) return 'Es hoy';
  if (d === 1) return 'Falta 1 día';
  return `Faltan ${d} días`;
}

// Nombre de la materia: primero el pénsum personalizado del estudiante, si no el de su carrera.
export function nombreMateria(est, num, materias) {
  if (num === null || num === undefined || num === '') return '';
  const n = String(num);
  if (Array.isArray(est && est.pensumCycles)) {
    for (const c of est.pensumCycles) {
      for (const s of (c.subjects || [])) if (String(s.num) === n) return s.name || '';
    }
  }
  const carrera = (est && est.carrera) || 'sistemas';
  return ((materias || {})[carrera] || {})[n] || '';
}

// Devuelve los avisos pendientes (ordenados por urgencia) que aún no se enviaron.
export function construirAvisos({ est, cfg, eventos, asistioHoy, enviados, hoy, hora, materias }) {
  const avisos = [];

  if (cfg.attendanceReminder && hora >= cfg.pushHoraAsistencia && hora < HORA_LIMITE_ASISTENCIA && !asistioHoy) {
    const key = 'asistencia_' + hoy;
    if (!enviados[key]) {
      avisos.push({ key, orden: -999, title: '🔔 Recuerda marcar tu asistencia', body: 'Toca para abrir Asistencia Diaria', tag: 'asistencia', url: URL_ASISTENCIA });
    }
  }

  if (hora >= cfg.pushHoraEventos) {
    const silenciadas = cfg.mutedSubjects || {};
    for (const ev of eventos) {
      if (ev.done || !ev.date) continue;
      const sub = ev.subject;
      if (sub !== null && sub !== undefined && sub !== '' && silenciadas[sub]) continue;
      const dias = diasEntre(hoy, ev.date);
      if (dias === null || dias < -1) continue; // lo muy vencido ya no se "empuja"
      const tier = tierDe(dias, cfg);
      if (!tier) continue;
      const key = `${ev.id}_${tier}`;
      if (enviados[key]) continue;
      const materia = nombreMateria(est, sub, materias);
      avisos.push({
        key, orden: dias,
        title: `${ICONO[tier]} ${ev.type || 'Actividad'}`,
        body: [materia, etiquetaDias(dias), ev.date].filter(Boolean).join(' · '),
        tag: 'ev_' + ev.id, url: URL_CALENDARIO
      });
    }
  }

  return avisos.sort((a, b) => a.orden - b.orden);
}

// Hasta `max` avisos sueltos; el resto se junta en un solo mensaje para no saturar.
export function agruparAvisos(avisos, max = 3) {
  const sueltos = avisos.slice(0, max);
  const resto = avisos.slice(max);
  const resumen = resto.length
    ? { key: null, title: `📅 ${resto.length} aviso${resto.length === 1 ? '' : 's'} más`, body: 'Abre Pénsum UGB para verlos', tag: 'resumen', url: URL_CALENDARIO }
    : null;
  return { sueltos, resto, resumen };
}

// Olvida los "ya avisé" viejos para que el documento no crezca sin límite.
export function podarEnviados(enviados, hoy, retener = RETENER_DIAS) {
  const out = {};
  for (const [k, fecha] of Object.entries(enviados || {})) {
    const d = diasEntre(fecha, hoy);
    if (d !== null && d <= retener) out[k] = fecha;
  }
  return out;
}
