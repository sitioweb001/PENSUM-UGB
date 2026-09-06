// ============================================================
// firebase-db.js
// Reemplazo de codigo_gs_UGB.gs (doGet/doPost) + del bloque de sync de
// INDEX_FINAL.html. Misma forma de datos que ya usa appData[currentStudent],
// para que el reemplazo en el frontend sea "cambiar la llamada", no rediseñar.
// ============================================================

import { db } from './firebase-init.js';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

// ── Identificador de estudiante (mismo criterio que ya usas: nombre__carrera) ──
export function studentId(nombre, carrera) {
  return carrera ? `${nombre}__${carrera}` : nombre;
}

// ── Hash SHA-256 (mismo método que ya tenías en INDEX_FINAL.html / _sha256) ──
export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// ESTUDIANTES (antes: hojas "Estudiantes" + "Passwords")
// ============================================================

export async function listarEstudiantes(carrera) {
  const col = collection(db, 'estudiantes');
  const q = carrera ? query(col, where('carrera', '==', carrera)) : col;
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().nombre);
}

export async function crearOCargarEstudiante(nombre, carrera) {
  const id  = studentId(nombre, carrera);
  const ref = doc(db, 'estudiantes', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      nombre, carrera,
      passwordHash: null,
      horario: null,
      cyclesDone: {},
      specialCards: {},
      pensumCycles: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { id, isNew: true, data: null };
  }
  return { id, isNew: false, data: snap.data() };
}

export async function verificarPassword(nombre, carrera, claveTexto) {
  const ref  = doc(db, 'estudiantes', studentId(nombre, carrera));
  const snap = await getDoc(ref);
  if (!snap.exists() || !snap.data().passwordHash) return { existe: false };
  // El hash guardado incluye el nombre (ver _checkPassword en INDEX_FINAL.html:
  // _sha256(nombre + ':' + contraseña)) — antes esta función solo hasheaba la
  // contraseña sola, por eso NUNCA coincidía y el login siempre decía "incorrecta".
  const hash = await sha256(nombre.toLowerCase().trim() + ':' + claveTexto);
  return { existe: true, correcta: hash === snap.data().passwordHash };
}

export async function guardarPasswordHash(nombre, carrera, hash) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await setDoc(ref, { passwordHash: hash, updatedAt: serverTimestamp() }, { merge: true });
}

export async function eliminarEstudiante(nombre, carrera) {
  const id = studentId(nombre, carrera);
  // Borra subcolecciones primero (Firestore no borra en cascada solo).
  for (const sub of ['notas', 'eventos', 'asistencias', 'asistenciasActividad', 'pensumHistorial']) {
    const snap = await getDocs(collection(db, 'estudiantes', id, sub));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length) await batch.commit();
  }
  await deleteDoc(doc(db, 'estudiantes', id));
}

export async function guardarHorario(nombre, carrera, horario) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { horario, updatedAt: serverTimestamp() });
}

export async function guardarCiclosDone(nombre, carrera, cyclesDone) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { cyclesDone, updatedAt: serverTimestamp() });
}

// "En Proceso" — igual patrón que cyclesDone, pero para el estado
// intermedio "cursando actualmente" (distinto de "Finalizado").
export async function guardarCiclosEnProceso(nombre, carrera, cyclesInProgress) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { cyclesInProgress: cyclesInProgress || {}, updatedAt: serverTimestamp() });
}

// Rangos de fecha (inicio/fin) configurados por el estudiante para cada
// ciclo — permiten detectar automáticamente a qué ciclo corresponde una
// actividad del calendario según su fecha (ver getCycleForDate en app.js).
export async function guardarCycleDateRanges(nombre, carrera, cycleDateRanges) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { cycleDateRanges: cycleDateRanges || {}, updatedAt: serverTimestamp() });
}

export async function guardarEspeciales(nombre, carrera, specialCards) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { specialCards, updatedAt: serverTimestamp() });
}

// ============================================================
// PÉNSUM EDITADO ("✏️ Editar Pénsum" — arrastrar materias entre ciclos)
// + HISTORIAL DE CAMBIOS. Antes NADA de esto llegaba a Firestore: el botón
// modificaba solo la variable CYCLES en memoria y escribía a una llave de
// localStorage que ningún código volvía a leer — por eso los cambios se
// perdían al recargar y el historial siempre decía "No hay cambios
// registrados aún". Ahora:
//   - pensumCycles: la disposición actual (snapshot único) va en el doc
//     principal del estudiante, igual que horario/cyclesDone.
//   - pensumHistorial: un doc por cada cambio (mismo patrón atómico de
//     notas/eventos), para no arriesgar el límite de 1MB de un documento
//     metiendo hasta 60 snapshots completos dentro de un solo campo.
// ============================================================

export async function guardarPensumCycles(nombre, carrera, cycles) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { pensumCycles: cycles || null, updatedAt: serverTimestamp() });
}

// ============================================================
// BITÁCORA DI — perfil del becario + técnico responsable usados para
// generar la Constancia de Actividades (PDF). Es un objeto pequeño que
// vive directo en el doc principal del estudiante, igual que horario/
// pensumCycles: no necesita subcolección propia.
// ============================================================

export async function guardarBitacoraPerfil(nombre, carrera, bitacoraPerfil) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { bitacoraPerfil: bitacoraPerfil || null, updatedAt: serverTimestamp() });
}

// Borradores con nombre — permiten ir llenando la bitácora antes de
// generar la versión final. Se guardan como un mapa {nombreBorrador: datos}
// directo en el doc del estudiante, igual que bitacoraPerfil.
export async function guardarBitacoraBorradores(nombre, carrera, borradores) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera));
  await updateDoc(ref, { bitacoraBorradores: borradores || {}, updatedAt: serverTimestamp() });
}

// Historial de bitácoras generadas — sí necesita subcolección propia
// (una por PDF generado), para poder listarlas, volver a descargarlas, y
// guardar el motivo cada vez que se edita una ya generada.
export async function guardarRegistroBitacora(nombre, carrera, registroId, data) {
  const id  = studentId(nombre, carrera);
  const col = collection(db, 'estudiantes', id, 'bitacoras');
  const ref = registroId ? doc(col, registroId) : doc(col);
  await setDoc(ref, data, { merge: true });
  return ref.id;
}

export async function listarBitacoras(nombre, carrera) {
  const id = studentId(nombre, carrera);
  const snap = await getDocs(collection(db, 'estudiantes', id, 'bitacoras'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.generadoTs || '').localeCompare(String(a.generadoTs || '')));
}

export async function eliminarRegistroBitacora(nombre, carrera, registroId) {
  const id = studentId(nombre, carrera);
  await deleteDoc(doc(db, 'estudiantes', id, 'bitacoras', registroId));
}

// ============================================================
// TÉCNICOS DI — lista compartida entre todos los estudiantes (no es un
// dato por-estudiante, así que vive en su propia colección al nivel raíz).
// ============================================================

export async function listarTecnicos() {
  const snap = await getDocs(collection(db, 'tecnicos'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function guardarTecnico(id, data) {
  const col = collection(db, 'tecnicos');
  const ref = id ? doc(col, id) : doc(col);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  return ref.id;
}

export async function eliminarTecnico(id) {
  await deleteDoc(doc(db, 'tecnicos', id));
}

// ============================================================
// HUELLA DE CUENTA (WebAuthn) — login biométrico con el lector de huella,
// Windows Hello, Face ID, etc. del dispositivo. Nunca se guarda ninguna
// huella real ni imagen biométrica: el navegador/sistema operativo hacen
// la verificación en el propio dispositivo y solo nos entregan un id de
// credencial — eso es lo único que guardamos acá.
//
// 'huellasIndex/{userHandleHex}' → { studentId }  (índice global: de qué
//   estudiante es esa huella, sin necesitar buscar entre todos)
// 'estudiantes/{studentId}/huellas/{credentialId}' → { label, ... } (para
//   que cada estudiante vea y borre sus propias huellas desde la app)
// ============================================================

export async function registrarHuellaIndice(userHandleHex, studentIdVal) {
  await setDoc(doc(db, 'huellasIndex', userHandleHex), { studentId: studentIdVal, updatedAt: serverTimestamp() }, { merge: true });
}

export async function resolverHuellaIndice(userHandleHex) {
  const snap = await getDoc(doc(db, 'huellasIndex', userHandleHex));
  return snap.exists() ? snap.data().studentId : null;
}

export async function listarHuellas(studentIdVal) {
  const snap = await getDocs(collection(db, 'estudiantes', studentIdVal, 'huellas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function agregarHuella(studentIdVal, credentialId, data) {
  await setDoc(doc(db, 'estudiantes', studentIdVal, 'huellas', credentialId), { ...data, createdAt: serverTimestamp() });
}

export async function eliminarHuella(studentIdVal, credentialId) {
  await deleteDoc(doc(db, 'estudiantes', studentIdVal, 'huellas', credentialId));
}

// ── Listado GLOBAL de huellas (TODAS las cuentas) — solo para el panel de
// administrador "🔓 Huellas generales" del modal "Huella de cuenta".
// 'huellasIndex' tiene un doc por cada cuenta que registró al menos una
// huella (ver registrarHuellaIndice), así que lo recorremos para saber de
// qué cuentas hay que traer el detalle (label, fecha) desde su subcolección.
export async function listarTodasLasHuellas() {
  const indiceSnap = await getDocs(collection(db, 'huellasIndex'));
  const resultados = [];
  for (const d of indiceSnap.docs) {
    const studentIdVal = d.data() && d.data().studentId;
    if (!studentIdVal) continue;
    const huellas = await listarHuellas(studentIdVal);
    huellas.forEach(h => resultados.push({ ...h, studentId: studentIdVal }));
  }
  return resultados;
}

// ============================================================
// ACTIVIDADES PREGRABADAS — frases de "actividad realizada" reusables
// para llenar más rápido las filas de la Bitácora. Compartidas entre
// todos, igual que los técnicos.
// ============================================================

export async function listarActividadesPregrabadas() {
  const snap = await getDocs(collection(db, 'actividadesPregrabadas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function guardarActividadPregrabada(id, texto, tecnico) {
  const col = collection(db, 'actividadesPregrabadas');
  const ref = id ? doc(col, id) : doc(col);
  await setDoc(ref, { texto, tecnico: tecnico || '', updatedAt: serverTimestamp() }, { merge: true });
  return ref.id;
}

export async function eliminarActividadPregrabada(id) {
  await deleteDoc(doc(db, 'actividadesPregrabadas', id));
}

export async function guardarPensumHistorial(nombre, carrera, undoStackArray) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'pensumHistorial');
  const prev = await getDocs(col);
  const tsNuevos = new Set((undoStackArray || []).map(h => String(h.ts)));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!tsNuevos.has(d.id)) batch.delete(d.ref); });
  (undoStackArray || []).forEach(h => batch.set(doc(col, String(h.ts)), h));
  await batch.commit();
}

export function escucharPensumHistorial(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'pensumHistorial');
  return onSnapshot(col, (snap) => {
    callback(snap.docs.map(d => d.data()).sort((a, b) => (a.ts||'').localeCompare(b.ts||'')));
  });
}

// ============================================================
// NOTAS (antes: hoja "Notas_<estudiante>") — escritura atómica con
// writeBatch: TODAS las materias se escriben/borran en una sola operación,
// nunca hay un estado intermedio a medio guardar (esto es lo que elimina
// la condición de carrera del sync viejo).
// ============================================================

export async function guardarNotas(nombre, carrera, notasArray) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'notas');
  const prev = await getDocs(col);
  const nuevosNums = new Set(notasArray.map(n => String(n.num)));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!nuevosNums.has(d.id)) batch.delete(d.ref); });
  notasArray.forEach(n => batch.set(doc(col, String(n.num)), n));
  await batch.commit();

  await updateDoc(doc(db, 'estudiantes', id), { updatedAt: serverTimestamp() });
}

export function escucharNotas(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'notas');
  return onSnapshot(col, (snap) => {
    callback(snap.docs.map(d => d.data()).sort((a, b) => Number(a.num) - Number(b.num)));
  });
}

// ============================================================
// EVENTOS / CALENDARIO (antes: hoja "Calendario_<estudiante>")
// ============================================================

export async function guardarEventos(nombre, carrera, eventosArray) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'eventos');
  const prev = await getDocs(col);
  const nuevosIds = new Set(eventosArray.map(ev => String(ev.id)));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!nuevosIds.has(d.id)) batch.delete(d.ref); });
  eventosArray.forEach(ev => batch.set(doc(col, String(ev.id)), ev));
  await batch.commit();
}

export function escucharEventos(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'eventos');
  return onSnapshot(col, (snap) => callback(snap.docs.map(d => d.data())));
}

// ============================================================
// ASISTENCIAS (antes: hoja "Asistencias_<estudiante>")
// ============================================================

export async function guardarAsistencia(nombre, carrera, fecha, registro) {
  const ref = doc(db, 'estudiantes', studentId(nombre, carrera), 'asistencias', fecha);
  await setDoc(ref, registro);
}

// guardarAsistencias (PLURAL) — sube TODO el mapa de asistencias de una vez,
// mismo patrón atómico que guardarNotas/guardarEventos (writeBatch: borra lo
// que ya no está, escribe lo que sí). Esta es la que debe llamar syncToSheets;
// sin ella, marcarAsistencia() solo guardaba en memoria local y nunca subía
// nada a Firestore — por eso la asistencia "no se registraba".
export async function guardarAsistencias(nombre, carrera, asistenciasObj) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'asistencias');
  const prev = await getDocs(col);
  const fechasNuevas = new Set(Object.keys(asistenciasObj || {}));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!fechasNuevas.has(d.id)) batch.delete(d.ref); });
  Object.entries(asistenciasObj || {}).forEach(([fecha, registro]) => {
    batch.set(doc(col, fecha), registro);
  });
  await batch.commit();
}

export function escucharAsistencias(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'asistencias');
  return onSnapshot(col, (snap) => {
    const obj = {};
    snap.docs.forEach(d => { obj[d.id] = d.data(); });
    callback(obj);
  });
}

// ============================================================
// ASISTENCIAS POR ACTIVIDAD (Participante/Comisión/Apoyo logístico/
// Hidratación/Otro) — subcolección separada de "asistencias" (la diaria)
// porque acá puede haber varios registros el mismo día, uno por actividad,
// cada uno con su propio NIE/nombre/tipo. Mismo patrón atómico de
// writeBatch que el resto de subcolecciones.
// ============================================================

export async function guardarAsistenciasActividad(nombre, carrera, asistenciasActividadObj) {
  const id   = studentId(nombre, carrera);
  const col  = collection(db, 'estudiantes', id, 'asistenciasActividad');
  const prev = await getDocs(col);
  const idsNuevos = new Set(Object.keys(asistenciasActividadObj || {}));

  const batch = writeBatch(db);
  prev.docs.forEach(d => { if (!idsNuevos.has(d.id)) batch.delete(d.ref); });
  Object.entries(asistenciasActividadObj || {}).forEach(([regId, registro]) => {
    batch.set(doc(col, regId), registro);
  });
  await batch.commit();
}

export function escucharAsistenciasActividad(nombre, carrera, callback) {
  const col = collection(db, 'estudiantes', studentId(nombre, carrera), 'asistenciasActividad');
  return onSnapshot(col, (snap) => {
    const obj = {};
    snap.docs.forEach(d => { obj[d.id] = d.data(); });
    callback(obj);
  });
}

// ============================================================
// CARGA ÚNICA (para el botón manual "Refrescar" — no reemplaza al listener
// en tiempo real, es un getDoc/getDocs de una sola vez).
// ============================================================

export async function cargarEstudianteUnaVez(nombre, carrera) {
  const id = studentId(nombre, carrera);
  const [perfilSnap, notasSnap, eventosSnap, asistSnap, asistActSnap, histSnap] = await Promise.all([
    getDoc(doc(db, 'estudiantes', id)),
    getDocs(collection(db, 'estudiantes', id, 'notas')),
    getDocs(collection(db, 'estudiantes', id, 'eventos')),
    getDocs(collection(db, 'estudiantes', id, 'asistencias')),
    getDocs(collection(db, 'estudiantes', id, 'asistenciasActividad')),
    getDocs(collection(db, 'estudiantes', id, 'pensumHistorial'))
  ]);

  const asistencias = {};
  asistSnap.docs.forEach(d => { asistencias[d.id] = d.data(); });

  const asistenciasActividad = {};
  asistActSnap.docs.forEach(d => { asistenciasActividad[d.id] = d.data(); });

  return {
    perfil: perfilSnap.exists() ? perfilSnap.data() : null,
    notas: notasSnap.docs.map(d => d.data()),
    eventos: eventosSnap.docs.map(d => d.data()),
    asistencias,
    asistenciasActividad,
    pensumHistorial: histSnap.docs.map(d => d.data()).sort((a, b) => (a.ts||'').localeCompare(b.ts||''))
  };
}

// ============================================================
// LISTENER MAESTRO — reemplaza fetchFromSheets()/_silentFetch() por completo.
// Un solo llamado deja abiertos los listeners de doc principal + subcolecciones.
// Devuelve una función para cerrarlos todos (llámala al cambiar de estudiante
// o cerrar sesión).
// ============================================================

export function escucharEstudiante(nombre, carrera, { onPerfil, onNotas, onEventos, onAsistencias, onAsistenciasActividad, onPensumHistorial }) {
  const id = studentId(nombre, carrera);
  const unsubs = [];

  unsubs.push(onSnapshot(doc(db, 'estudiantes', id), (snap) => {
    if (snap.exists() && onPerfil) onPerfil(snap.data());
  }));
  if (onNotas)               unsubs.push(escucharNotas(nombre, carrera, onNotas));
  if (onEventos)             unsubs.push(escucharEventos(nombre, carrera, onEventos));
  if (onAsistencias)         unsubs.push(escucharAsistencias(nombre, carrera, onAsistencias));
  if (onAsistenciasActividad) unsubs.push(escucharAsistenciasActividad(nombre, carrera, onAsistenciasActividad));
  if (onPensumHistorial)     unsubs.push(escucharPensumHistorial(nombre, carrera, onPensumHistorial));

  return () => unsubs.forEach(u => u());
}

// ============================================================
// CONFIG GLOBAL (antes: hoja "ConfigApp")
// ============================================================

export async function getShowAccountList() {
  const snap = await getDoc(doc(db, 'config', 'settings'));
  return snap.exists() ? (snap.data().showAccountList !== false) : true;
}

export async function setShowAccountList(visible) {
  await setDoc(doc(db, 'config', 'settings'), { showAccountList: visible }, { merge: true });
}

// ============================================================
// MODO AVANZADO — doble clic en el logo (Fase 3 del plan).
// Verifica/crea lo mínimo que la base de datos necesita para arrancar.
// Reporta cada paso vía onProgress (conéctalo a console.log desde el HTML).
// ============================================================

export async function initFirestoreDatabase(onProgress = () => {}) {
  onProgress('Verificando conexión a Firestore...');
  const configRef = doc(db, 'config', 'settings');
  const configSnap = await getDoc(configRef);

  if (!configSnap.exists()) {
    onProgress('Creando documento config/settings...');
    await setDoc(configRef, { showAccountList: true, version: '1.0', createdAt: serverTimestamp() });
  } else {
    onProgress('config/settings ya existe, no se toca.');
  }

  onProgress('Verificando colección estudiantes...');
  const someStudents = await getDocs(query(collection(db, 'estudiantes')));
  onProgress(`estudiantes: ${someStudents.size} documento(s) encontrados.`);

  onProgress('Todo listo. Las colecciones notas/eventos/asistencias se crean solas en cuanto el primer estudiante guarde datos.');
  return { ok: true, estudiantesExistentes: someStudents.size };
}

// ============================================================
// RESET TOTAL DE LA BASE DE DATOS — borra TODOS los estudiantes (de
// TODAS las carreras) con sus subcolecciones (notas/eventos/asistencias/
// pensumHistorial) y deja config/settings en su estado por defecto.
// No hay vuelta atrás — la protección con contraseña vive en el HTML
// (ver resetearBaseDeDatosUI en index.html), aquí solo se ejecuta el borrado.
// ============================================================
export async function resetearBaseDeDatos(onProgress = () => {}) {
  onProgress('Buscando cuentas existentes...');
  const estudiantesSnap = await getDocs(collection(db, 'estudiantes'));
  const ids = estudiantesSnap.docs.map(d => d.id);
  onProgress(`${ids.length} cuenta(s) encontrada(s).`);

  let borrados = 0;
  for (const id of ids) {
    for (const sub of ['notas', 'eventos', 'asistencias', 'asistenciasActividad', 'pensumHistorial']) {
      const subSnap = await getDocs(collection(db, 'estudiantes', id, sub));
      if (subSnap.docs.length) {
        const batch = writeBatch(db);
        subSnap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(doc(db, 'estudiantes', id));
    borrados++;
    onProgress(`Borrando cuentas... (${borrados}/${ids.length})`);
  }

  onProgress('Reiniciando configuración global...');
  await setDoc(doc(db, 'config', 'settings'), {
    showAccountList: true,
    version: '1.0',
    createdAt: serverTimestamp()
  });

  onProgress('Base de datos reiniciada — lista para datos nuevos.');
  return { ok: true, cuentasBorradas: borrados };
}