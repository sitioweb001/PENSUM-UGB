// firebase-push.js — Notificaciones push (Firebase Cloud Messaging) para Pénsum UGB
//
// Qué hace este módulo (solo el lado del celular):
//   1. Pide permiso de notificaciones y obtiene el "token" FCM de este dispositivo.
//   2. Guarda ese token en  estudiantes/{id}/dispositivos/{token}.
//   3. Copia la configuración de avisos (días, horas, materias silenciadas) a
//      estudiantes/{id}/ajustes/notificaciones, para que el servidor (GitHub
//      Actions, ver scripts/enviar-avisos.mjs) sepa qué y cuándo avisar.
//
// Quien realmente ENVÍA los avisos es el script de GitHub Actions; la app solo
// se registra. Los avisos se muestran en service-worker.js (evento "push").

import { app, db, authReady } from './firebase-init.js';
import { studentId } from './firebase-db.js';
import {
  doc, setDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ═══════════════════════════════════════════════════════════
// ⚠️ PEGA AQUÍ TU CLAVE VAPID PÚBLICA (es pública, se puede embeber).
// Firebase Console → ⚙️ Configuración del proyecto → Cloud Messaging →
// "Certificados push web" → Generar par de claves → copiar "Par de claves".
// ═══════════════════════════════════════════════════════════
const VAPID_PUBLIC_KEY = 'BAcX8q75pTuYXFhpa0Ydvrum895IPXf1g2vRnH9_dVdtMk0gWbpgwEheSJbFRBYjqezKpKe_Pl7leCwWoGCkKR8';

const FCM_MODULE = 'https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging.js';

// Se importa solo cuando hace falta: así, si no hay internet o el navegador no
// soporta push, el resto de Firebase (Firestore) sigue funcionando igual.
async function _fcm() { return import(FCM_MODULE); }

function _tokenKey(nombre, carrera) { return 'ugb_push_token_' + studentId(nombre, carrera); }
function _leerToken(nombre, carrera) {
  try { return localStorage.getItem(_tokenKey(nombre, carrera)) || ''; } catch { return ''; }
}
function _guardarToken(nombre, carrera, token) {
  try { localStorage.setItem(_tokenKey(nombre, carrera), token); } catch { /* sin storage */ }
}
function _borrarToken(nombre, carrera) {
  try { localStorage.removeItem(_tokenKey(nombre, carrera)); } catch { /* sin storage */ }
}
function _vapidConfigurada() {
  return VAPID_PUBLIC_KEY && !VAPID_PUBLIC_KEY.startsWith('PEGA_AQUI');
}

// ¿Este dispositivo ya está registrado para este estudiante? (síncrono)
export function activoAqui(nombre, carrera) {
  return !!_leerToken(nombre, carrera) &&
    typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

export async function estado(nombre, carrera) {
  let soportado = typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (soportado) {
    try { const m = await _fcm(); soportado = await m.isSupported(); }
    catch { soportado = false; }
  }
  return {
    soportado,
    permiso: soportado ? Notification.permission : 'unsupported',
    activoAqui: soportado && activoAqui(nombre, carrera)
  };
}

async function _obtenerToken() {
  const reg = await navigator.serviceWorker.ready; // service-worker.js ya registrado por la app
  const m = await _fcm();
  return m.getToken(m.getMessaging(app), { vapidKey: VAPID_PUBLIC_KEY, serviceWorkerRegistration: reg });
}

async function _registrarDispositivo(nombre, carrera, token) {
  await authReady;
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera), 'dispositivos', token);
  await setDoc(ref, {
    token,
    plataforma: (navigator.userAgent || '').slice(0, 180),
    actualizadoEn: serverTimestamp()
  }, { merge: true });
}

// Botón "Activar en este dispositivo" (debe llamarse desde un toque del usuario).
export async function activar(nombre, carrera) {
  if (!_vapidConfigurada()) throw new Error('VAPID_NO_CONFIGURADA');
  const permiso = await Notification.requestPermission(); // primero, para conservar el gesto del usuario
  if (permiso !== 'granted') throw new Error('PERMISO_DENEGADO');
  const token = await _obtenerToken();
  if (!token) throw new Error('SIN_TOKEN');
  await _registrarDispositivo(nombre, carrera, token);
  _guardarToken(nombre, carrera, token);
  return token;
}

// Al iniciar sesión: los tokens pueden rotar; se renueva en silencio.
export async function refrescar(nombre, carrera) {
  const previo = _leerToken(nombre, carrera);
  if (!previo || !_vapidConfigurada()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const token = await _obtenerToken();
  if (!token) return;
  await _registrarDispositivo(nombre, carrera, token);
  if (token !== previo) {
    try { await deleteDoc(doc(db, 'estudiantes', studentId(nombre, carrera), 'dispositivos', previo)); }
    catch { /* ya no existía */ }
    _guardarToken(nombre, carrera, token);
  }
}

export async function desactivar(nombre, carrera) {
  const token = _leerToken(nombre, carrera);
  await authReady;
  if (token) {
    try { await deleteDoc(doc(db, 'estudiantes', studentId(nombre, carrera), 'dispositivos', token)); }
    catch (e) { console.warn('[Push] No se pudo borrar el dispositivo en Firestore:', e); }
  }
  try { const m = await _fcm(); await m.deleteToken(m.getMessaging(app)); }
  catch { /* el token ya no era válido */ }
  _borrarToken(nombre, carrera);
}

// Config que lee el servidor: días de aviso, horas y materias silenciadas.
export async function guardarNotifConfig(nombre, carrera, cfg) {
  await authReady;
  const limpio = {
    enabled: cfg.enabled !== false,
    attendanceReminder: cfg.attendanceReminder !== false,
    greenDays: cfg.greenDays, yellowDays: cfg.yellowDays, redDays: cfg.redDays,
    pushHoraEventos: cfg.pushHoraEventos, pushHoraAsistencia: cfg.pushHoraAsistencia,
    mutedSubjects: cfg.mutedSubjects || {},
    actualizadoEn: serverTimestamp()
  };
  await setDoc(doc(db, 'estudiantes', studentId(nombre, carrera), 'ajustes', 'notificaciones'), limpio);
}
