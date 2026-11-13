// enviar-avisos.mjs — manda los avisos push de Pénsum UGB (se ejecuta en GitHub Actions)
//
// Para cada estudiante con dispositivos registrados (estudiantes/{id}/dispositivos):
//   1. lee su configuración (ajustes/notificaciones), eventos y asistencia de hoy,
//   2. decide qué avisos tocan según la hora de El Salvador (ver logica.mjs),
//   3. los envía por FCM y anota en ajustes/pushEstado lo ya enviado, para no repetir.
// Es idempotente: si GitHub retrasa o repite una ejecución, no se duplican avisos.
//
// Variables de entorno:
//   FIREBASE_SERVICE_ACCOUNT  (obligatoria) JSON completo de la cuenta de servicio
//   PROBAR=1                  manda un aviso de prueba a todos los dispositivos y termina

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import {
  DEFAULTS, ahoraLocal, construirAvisos, agruparAvisos, podarEnviados
} from './logica.mjs';

const materias = JSON.parse(readFileSync(new URL('./materias.json', import.meta.url), 'utf8'));
const PROBAR = ['1', 'true', 'yes'].includes(String(process.env.PROBAR || '').toLowerCase());

const crudo = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!crudo) {
  console.error('❌ Falta el secret FIREBASE_SERVICE_ACCOUNT (ver README).');
  process.exit(1);
}
let cuenta;
try { cuenta = JSON.parse(crudo); }
catch { console.error('❌ FIREBASE_SERVICE_ACCOUNT no es un JSON válido: pega el archivo completo, sin comillas extra.'); process.exit(1); }

admin.initializeApp({ credential: admin.credential.cert(cuenta) });
const db = admin.firestore();
const messaging = admin.messaging();

// Envía un aviso a todos los dispositivos del estudiante; borra los tokens que ya no sirven.
async function enviar(dispositivos, aviso) {
  if (!dispositivos.length) return 0;
  const res = await messaging.sendEachForMulticast({
    tokens: dispositivos.map((d) => d.token),
    data: { title: aviso.title, body: aviso.body, tag: aviso.tag, url: aviso.url }, // solo datos: los muestra service-worker.js
    webpush: { headers: { TTL: '43200', Urgency: 'high' } } // vence a las 12 h si el celular estuvo apagado
  });
  const muertos = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const codigo = r.error && r.error.code;
    if (codigo === 'messaging/registration-token-not-registered' || codigo === 'messaging/invalid-registration-token') {
      muertos.push(i);
    } else {
      console.warn(`   ⚠️ Falló un envío (${codigo || 'error'}): ${r.error && r.error.message}`);
    }
  });
  for (const i of muertos.reverse()) {
    await dispositivos[i].ref.delete();
    dispositivos.splice(i, 1);
    console.log('   🧹 Dispositivo sin registro: eliminado.');
  }
  return res.successCount;
}

const { hoy, hora } = ahoraLocal();
console.log(`🕒 Hora local de El Salvador: ${hoy} ${String(hora).padStart(2, '0')}:xx${PROBAR ? '  (MODO PRUEBA)' : ''}`);

const snapDisp = await db.collectionGroup('dispositivos').get();
const porEstudiante = new Map();
snapDisp.forEach((d) => {
  const padre = d.ref.parent.parent;
  if (!padre) return;
  if (!porEstudiante.has(padre.id)) porEstudiante.set(padre.id, []);
  porEstudiante.get(padre.id).push({ token: d.get('token') || d.id, ref: d.ref });
});
console.log(`📲 ${snapDisp.size} dispositivo(s) en ${porEstudiante.size} estudiante(s).`);

let totalEnviados = 0;
for (const [sid, dispositivos] of porEstudiante) {
  const estRef = db.collection('estudiantes').doc(sid);

  if (PROBAR) {
    const ok = await enviar(dispositivos, {
      title: '✅ Prueba de avisos', body: 'Si ves esto, los avisos push funcionan.', tag: 'prueba', url: './index.html'
    });
    console.log(`• ${sid}: prueba enviada a ${ok} dispositivo(s).`);
    totalEnviados += ok;
    continue;
  }

  const [estSnap, cfgSnap, estadoSnap] = await Promise.all([
    estRef.get(),
    estRef.collection('ajustes').doc('notificaciones').get(),
    estRef.collection('ajustes').doc('pushEstado').get()
  ]);
  if (!estSnap.exists) { console.log(`• ${sid}: el estudiante ya no existe, se omite.`); continue; }

  const cfg = Object.assign({}, DEFAULTS, cfgSnap.exists ? cfgSnap.data() : {});
  if (!cfg.enabled) { console.log(`• ${sid}: avisos desactivados en la app.`); continue; }

  const enviados = Object.assign({}, estadoSnap.exists ? (estadoSnap.data().enviados || {}) : {});
  const asistioHoy = (await estRef.collection('asistencias').doc(hoy).get()).exists;
  const eventos = (await estRef.collection('eventos').get()).docs.map((d) => Object.assign({ id: d.id }, d.data()));

  const pendientes = construirAvisos({
    est: estSnap.data(), cfg, eventos, asistioHoy, enviados, hoy, hora, materias
  });
  if (!pendientes.length) { console.log(`• ${sid}: nada que avisar.`); continue; }

  const { sueltos, resto, resumen } = agruparAvisos(pendientes);
  let enviadosAqui = 0;
  for (const aviso of sueltos) {
    if (await enviar(dispositivos, aviso) > 0) { enviados[aviso.key] = hoy; enviadosAqui++; }
  }
  if (resumen && await enviar(dispositivos, resumen) > 0) {
    resto.forEach((a) => { enviados[a.key] = hoy; });
    enviadosAqui++;
  }

  await estRef.collection('ajustes').doc('pushEstado').set({
    enviados: podarEnviados(enviados, hoy),
    actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`• ${sid}: ${enviadosAqui} mensaje(s) enviado(s) (${pendientes.length} aviso(s) pendientes).`);
  totalEnviados += enviadosAqui;
}

console.log(`✅ Listo. Mensajes enviados: ${totalEnviados}.`);
process.exit(0);
