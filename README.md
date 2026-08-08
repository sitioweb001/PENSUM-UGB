# Pénsum UGB

Sistema de seguimiento académico (pénsum, notas, calendario, asistencia y
bitácora DI) para estudiantes de la Universidad Gerardo Barrios, 100%
conectado a Firebase — sin backend propio, sin Google Apps Script, sin
polling. PWA instalable, con inicio de sesión por huella/Face ID.

![Arquitectura](img/arquitectura.svg)

## Índice

1. [Arquitectura](#arquitectura)
2. [Estructura de archivos](#estructura-de-archivos)
3. [Paleta de colores](#paleta-de-colores)
4. [Mapa de funcionalidades](#mapa-de-funcionalidades)
5. [Menú ☰ — estructura](#menú-☰--estructura)
6. [Catálogo de funciones por módulo](#catálogo-de-funciones-por-módulo)
7. [Instructivo de uso](#instructivo-de-uso)
8. [Instructivo de despliegue](#instructivo-de-despliegue)
9. [Reglas de seguridad de Firestore](#reglas-de-seguridad-de-firestore)
10. [Cosas importantes](#cosas-importantes)

---

## Arquitectura

Cada dispositivo (celular, laptop, kiosko) carga el mismo cascarón PWA
(`index.html` + `styles.css` + `app.js`) y habla **directo** con Firebase:

- **`firebase-bootstrap.js`** (`type="module"`) conecta todo al arrancar.
- **`firebase-init.js`** inicializa Firestore y abre una sesión anónima
  (`authReady`) — un usuario anónimo distinto por dispositivo.
- **`firebase-db.js`** (45 funciones) es la única puerta de entrada a
  Firestore: guardar, leer, escuchar en tiempo real (`onSnapshot`) y
  eliminar.
- **WebAuthn** (huella / Windows Hello / Face ID) vive enteramente en el
  dispositivo — la credencial nunca sale de ahí ni pasa por Firebase.
- No hay polling: en cuanto un dispositivo guarda algo, los demás lo
  reciben solos vía `onSnapshot`, sin recargar.
- Fotos de firmas y sellos se guardan comprimidas en base64 dentro del
  propio documento de Firestore — no se usa Cloud Storage.

Ver el diagrama completo arriba (`img/arquitectura.svg`).

## Estructura de archivos

| Archivo | Rol |
|---|---|
| `index.html` | Markup de la app: vistas, modales, menú. Sin CSS ni JS incrustado. |
| `styles.css` | Todo el CSS (tema claro/oscuro, layout, componentes). |
| `firebase-bootstrap.js` | `<script type="module">` — conecta `firebase-init.js` + `firebase-db.js` a `window.FirebaseDB`. |
| `app.js` | html2canvas + jsPDF (empaquetados localmente) + toda la lógica de la app (318 funciones). |
| `firebase-init.js` | Conexión a Firebase (Firestore + Auth anónima). *(no incluido en esta entrega — ya existe en el proyecto)* |
| `firebase-db.js` | 45 funciones de lectura/escritura/escucha en Firestore. |
| `service-worker.js` | Cachea el cascarón para que la app cargue offline. Nunca cachea datos de Firebase. |
| `manifest.json` | Metadatos de instalación PWA (nombre, ícono, colores). |
| `horarios.html` | Visor de horario standalone, sin dependencias de Firebase. |
| `DI.svg`, `Logotipo-horizontal-azul.png`, `logo2.png` | Logos usados en la UI y en los PDF generados. |

## Paleta de colores

![Paleta de colores](img/paleta-colores.svg)

- **Tipografía:** [Inter](https://fonts.google.com/specimen/Inter) (300–800), cargada desde Google Fonts.
- **Tema:** se guarda en `localStorage['ugb_theme']` (`light` / `dark`), se aplica con `data-theme` en `<html>` y se activa con **☰ → Cambiar tema**.
- Los 4 colores de estado (`--pass` verde, `--fail` rojo, `--pend` ámbar, `--none` gris) son los mismos en ambos temas — solo cambia su fondo/opacidad para verse bien en oscuro.

## Mapa de funcionalidades

![Mapa de funcionalidades](img/mapa-funciones.svg)

## Menú ☰ — estructura

El menú es un panel lateral (drawer) con logo de la universidad arriba,
cuerpo con scroll, y pie de página. Agrupado por tema (el orden real en
la app es una sola lista continua):

| Sección | Ítems |
|---|---|
| **Pénsum y notas** | 📋 Pegar notas del portal · 📤 Copiar notas · 📅 Calendario · 🔔 Notificaciones · 📜 Historial de cambios |
| **Asistencias y bitácora** | 📋 Asistencias *(abre un hub con 🏛 Asistencia diaria, 📝 Asistencia de actividad, 📚 Historial de bitácoras)* · 📄 Bitácora DI · 🧑‍💼 Técnicos · ⚙️ Configuración |
| **Datos** | 🔃 Sincronizar · 🔄 Refrescar desde Firebase · ☁️ Subir a Firebase · 📊 Exportar/📁 Importar CSV · 💾 Exportar/📂 Importar JSON · 🖨️ Imprimir / PDF |
| **App** | ⚙️ Verificar base de datos · 🌙 Cambiar tema · 📲 Instalar app *(solo si el navegador lo permite)* |
| **Cuenta** | 🔑 Cambiar contraseña · 🫆 Huella de cuenta *(incluye auto-inicio y el panel de administrador "Huellas generales")* · 🗑️ Borrar datos · 🧨 Resetear base de datos · 👁️ Mostrar/ocultar lista de cuentas · 🧹 Limpiar caché y recargar · 🚀 ADVANCED |
| **Sesión** | 🎓 Cambiar carrera · 🚪 Cambiar estudiante · 🔒 Cerrar sesión |

## Catálogo de funciones por módulo

Referencia completa de las 318 funciones de `app.js` + 45 de
`firebase-db.js`. Las funciones que empiezan con `_` son auxiliares
internas (no se llaman desde el HTML directamente).

<details>
<summary><b>🔐 Cuentas y acceso</b> — login, huella/WebAuthn, contraseña, administración de cuenta</summary>

| Función | Qué hace |
|---|---|
| `init()` | Arranque de la app: tema, zoom, muestra selección de carrera. |
| `chooseCareer(career)` | Carga estudiantes de esa carrera desde Firestore y muestra el login. Dispara el auto-inicio con huella al final. |
| `backToCareerSelect()` | Vuelve a la pantalla de selección de carrera. |
| `setLoginMode(m)` / `renderStudentList()` | Login por lista de cuentas o por nombre+contraseña directo. |
| `loginFromList(name)` / `doLogin()` / `selectStudent(name)` | Flujos de inicio de sesión. |
| `_checkPassword()` / `_saveHash()` | Verifica/guarda el hash SHA-256 de nombre+contraseña. |
| `openChangePass()` / `doChangePass()` / `togglePassVis()` | Modal de cambio de contraseña. |
| `_huellaSoportada()` | ¿El navegador soporta WebAuthn (HTTPS + API disponible)? |
| `_huellaDisponibleEnEsteDispositivo()` | ¿Este dispositivo tiene lector de huella/Face ID configurado? |
| `_actualizarBotonHuella()` | Muestra/oculta el botón de huella en el login según soporte. |
| `agregarHuellaDispositivo()` | Registra una huella nueva para la cuenta activa, atada a este dispositivo. |
| `loginConHuella(opts)` | Inicia sesión con una huella ya registrada. `opts.silencioso` lo usa el auto-inicio (sin toasts de error). |
| `_huellaAutoInicioActivo()` / `_setHuellaAutoInicio(on)` | Lee/guarda en `localStorage` si el auto-inicio está activado en este dispositivo. |
| `_intentarAutoInicioHuella()` | Se llama al mostrar el login: si el auto-inicio está activo y hay lector disponible, intenta la huella sola. |
| `openHuellaModal()` / `_renderHuellasList()` / `eliminarHuellaUI(credId)` | Modal "Huella de cuenta": ver/quitar huellas de la cuenta activa. |
| `abrirHuellasGenerales()` | Panel de administrador (pide contraseña `747`) que lista las huellas de **todas** las cuentas. |
| `_huellaEtiquetaDispositivo()` | Arma la etiqueta legible ("Windows · Edge · 05 ago 2026") para cada huella. |
| `_sha256()` / `_sha256Bytes()` / `_buf2b64url()` / `_bytes2hex()` | Utilidades criptográficas (hash de contraseña e identificadores WebAuthn). |
| `openDeleteDataModal()` / `ejecutarBorrado()` | Borra los datos de la cuenta activa (pide contraseña admin). |
| `resetearBaseDeDatosUI()` | Reinicia toda la base de datos de Firestore (pide contraseña admin). |
| `toggleAccountListVisibility()` / `applyAccountListVisibility()` | Muestra/oculta la lista de cuentas en el login (config. global protegida). |
| `changeStudent()` / `cerrarSesion()` / `deleteStudent(name)` | Cambiar de cuenta / cerrar sesión / eliminar una cuenta. |
| `openAdvanced()` / `abrirModoAvanzado()` | Panel avanzado: verificar/inicializar la base de datos. |
| `limpiarCache()` / `recargarLista()` | Limpia caché del service worker y recarga. |
| `getStudentData()` / `getSubjectData(num)` | Devuelve los datos en memoria de la cuenta/materia activa. |
| `_guardarUserConfig()` | Persiste preferencias del usuario (técnico/firma por defecto) en `localStorage`. |
| `_jsonpFetch()` / `_apsFetch()` | Restos del sistema anterior (Apps Script) — ya no se usan con Firebase. |

**Firebase (`firebase-db.js`):** `studentId` · `sha256` · `listarEstudiantes` · `crearOCargarEstudiante` · `verificarPassword` · `guardarPasswordHash` · `eliminarEstudiante` · `registrarHuellaIndice` · `resolverHuellaIndice` · `listarHuellas` · `agregarHuella` · `eliminarHuella` · `listarTodasLasHuellas` · `getShowAccountList` · `setShowAccountList` · `initFirestoreDatabase` · `resetearBaseDeDatos`
</details>

<details>
<summary><b>🎓 Pénsum</b> — ciclos, materias, notas, deshacer/rehacer</summary>

| Función | Qué hace |
|---|---|
| `renderPensum()` / `showPensum()` | Dibuja la malla curricular completa. |
| `openCycle(id)` / `renderSubjects(cycle)` | Abre un ciclo y dibuja sus materias. |
| `toggleSubject(num)` / `saveSubject(num)` | Expande una materia / guarda sus cambios. |
| `updateGrade(num,ci,field,val)` / `buildComputos()` | Actualiza una nota de un cómputo y recalcula. |
| `calcComputo(c)` / `calcFinal(computos)` | Calcula el promedio de un cómputo / la nota final. |
| `getStatus()` / `getEffectiveGrade()` / `getEffectiveStatus()` | Determina si una materia está aprobada/reprobada/en curso. |
| `swapSubjects()` / `moveSubjectToCycle()` | Intercambia o mueve una materia entre ciclos (electivas). |
| `toggleSpecialCard(num)` / `fillWithSix()` | Marca una materia como especial / autocompleta notas. |
| `toggleCycleDone()` / `updateCycleDoneBtn()` | Marca un ciclo completo como finalizado. |
| `updateStats()` | Recalcula contadores (aprobadas, pendientes, promedio). |
| `undoPensum()` / `redoPensum()` / `updateUndoRedoBtns()` / `snapshotCycles()` | Deshacer/rehacer cambios en el pénsum. |
| `openHistPensum()` / `setHistFilter()` / `renderHistPensum()` / `restoreSnapshot(idx)` | Historial completo de cambios, con restauración a un punto anterior. |
| `askDelete()` / `confirmDelete()` / `closeDeleteModal()` / `clearComputo()` / `clearCurrentCycle()` | Borrado de notas/cómputos/ciclo. |
| `findSubject(num)` / `filterByPeriod()` | Búsqueda de materia por número / filtro por período. |
| `updateZoom(val)` / `toggleEditMode()` | Zoom de la malla / modo edición. |

**Firebase:** `guardarCiclosDone` · `guardarEspeciales` · `guardarPensumCycles` · `guardarPensumHistorial` · `escucharPensumHistorial`
</details>

<details>
<summary><b>📋 Notas del portal</b> — pegar y copiar notas</summary>

| Función | Qué hace |
|---|---|
| `openPasteModal()` / `closePasteModal()` / `processPaste()` | Pega el texto copiado del portal UGB y lo interpreta en notas. |
| `openCopyGradesModal()` / `closeCopyGradesModal()` | Modal para copiar notas hacia afuera. |
| `buildGradesPasteText(cycle)` / `renderCopyGradesText()` | Arma el texto formateado con las notas de un ciclo. |
| `copyGradesToClipboard()` | Copia ese texto al portapapeles. |

**Firebase:** `guardarNotas` · `escucharNotas`
</details>

<details>
<summary><b>📅 Calendario</b> — eventos y su vínculo con el pénsum</summary>

| Función | Qué hace |
|---|---|
| `openCalendarModal()` / `closeCalendarModal()` / `setCalFilter()` | Modal de calendario y sus filtros. |
| `addEvent(type)` / `saveEvent()` / `deleteEvent(id)` / `askDeleteEvent(id)` | Crear/guardar/eliminar un evento. |
| `eventTypeNeedsComputo()` / `eventTypeToField()` / `updateEventSubjects()` | Relacionan el tipo de evento con una materia/cómputo del pénsum. |
| `toggleEventDone(id, checked)` / `setEventNota(id, val)` | Marcar evento como hecho / asignarle nota. |
| `syncEventNotaToPensum(ev)` | Refleja la nota del evento directo en la materia correspondiente del pénsum. |
| `renderEvents()` | Dibuja la lista de eventos filtrada. |

**Firebase:** `guardarEventos` · `escucharEventos`
</details>

<details>
<summary><b>🔔 Notificaciones</b> — avisos de vencimientos</summary>

| Función | Qué hace |
|---|---|
| `computeNotifications()` / `computeAttendanceNotifItem()` | Calcula qué avisos corresponden mostrar ahora. |
| `daysUntil()` / `notifTier()` / `notifDaysLabel()` / `notifTierColor()` / `notifTierIcon()` | Traducen días restantes a nivel de urgencia (color/ícono/texto). |
| `refreshNotifBadge()` / `openNotifModal()` / `closeNotifModal()` / `renderNotifList()` | Badge del menú y modal con la lista de avisos. |
| `dismissAttendanceNotif()` / `dismissNotifItem()` | Descartar un aviso puntual. |
| `openNotifConfig()` / `closeNotifConfig()` / `saveNotifConfigUI()` / `resetNotifConfig()` / `loadNotifConfig()` / `saveNotifConfig()` | Configuración de anticipación y duración de avisos. |
| `showNotifToast()` / `dismissNotifToast()` / `_attachNotifSwipe()` / `checkAndShowNotifToasts()` | Notificaciones emergentes (toast) con gesto de swipe para cerrar. |
| `startNotifWatcher()` / `stopNotifWatcher()` | Revisión periódica de nuevos avisos mientras la app está abierta. |
| `getNotifSeen()` / `setNotifSeen()` / `getNotifDismissed()` / `setNotifDismissed()` / `notifConfigStorageKey()` / `notifSeenStorageKey()` / `notifDismissedStorageKey()` / `_notifKeyBase()` | Persistencia en `localStorage`, por cuenta y dispositivo. |
</details>

<details>
<summary><b>🏛 Asistencia diaria</b> — marcar con huella, filtrar, exportar</summary>

| Función | Qué hace |
|---|---|
| `openAsistencia()` / `renderAsistencia()` / `setAsistFilter()` | Modal de asistencia diaria y sus filtros. |
| `marcarAsistencia()` / `getTodayKey()` / `getAsistencias()` / `_showAsistConfirm()` | Registra la asistencia del día (con confirmación visual). |
| `borrarAsistencia(fecha)` | Elimina un registro de asistencia. |
| `_asistenciaFilteredEntries()` / `_asistFilterLabel()` | Lógica de filtrado por fecha/rango. |
| `generateAsistenciaPDF()` / `_asistPdfHeader()` / `_asistPdfFooter()` / `_asistPdfSectionBanner()` / `_asistPdfTrunc()` / `_horaCorta()` / `_cuposCorto()` | Genera el PDF de asistencia con logos y encabezado institucional. |
| `exportAsistenciaExcel()` | Exporta a Excel. |

**Firebase:** `guardarAsistencia` · `guardarAsistencias` · `escucharAsistencias`
</details>

<details>
<summary><b>📝 Asistencia de actividad</b> — registro manual de actividades</summary>

| Función | Qué hace |
|---|---|
| `openAsistenciaActividad()` / `renderAsistenciaActividad()` / `setActFilter()` | Modal y filtros de asistencia por actividad. |
| `validarAsistenciaActividad()` / `_toggleActOtro()` | Valida el formulario / campo "otro" libre. |
| `borrarAsistenciaActividad(id)` / `verDetalleActividad(id)` / `borrarAsistenciaActividadDesdeDetalle()` | Ver detalle / eliminar un registro. |
| `_actividadFilteredEntries()` / `_actFilterLabel()` | Filtrado por fecha/rango. |
| `generateActividadPDF()` / `_actividadPdfColumnas()` / `_actividadPdfDrawHead()` / `_actividadPdfDrawRow()` | Genera el PDF de asistencia de actividad. |
| `exportActividadExcel()` | Exporta a Excel. |

**Firebase:** `guardarAsistenciasActividad` · `escucharAsistenciasActividad`
</details>

<details>
<summary><b>🖨️ Exportación</b> — combinada, PDF del pénsum, CSV, JSON</summary>

| Función | Qué hace |
|---|---|
| `abrirExportAsistencia()` / `_toggleExportAsistCombo()` / `confirmarExportAsistencia()` | Exportar asistencia diaria + de actividad juntas. |
| `generateAsistenciaCombinadaPDF()` / `exportAsistenciaCombinadaExcel()` | Genera ese PDF/Excel combinado. |
| `exportJSON()` / `importJSON()` / `exportCSV()` / `importCSV()` | Copia de seguridad completa de una cuenta. |
| `openPdfModal()` / `closePdfModal()` / `updatePdfModalUIState()` / `togglePdfCycleSelect()` / `togglePdfCustomList()` | Modal de exportación del pénsum a PDF, con varias opciones de contenido. |
| `generatePdfFromModal()` / `exportPDF()` / `exportPDFDirect()` | Arman el PDF final (dos motores: HTML→jsPDF y captura directa con html2canvas). |
| `buildPdfHeaderHTML()` · `buildPdfMiniHeaderHTML()` · `buildPdfYearRowHTML()` · `buildPdfSubjectCardHTML()` · `buildPdfElectiveRowHTML()` · `buildPdfElectivesSectionHTML()` · `buildPensumPageHTML()` · `buildPdfCycleDetailBlockHTML()` · `buildCyclePageHTML()` · `buildSummaryTableHTML()` · `buildReportHTML()` | Construyen cada bloque visual del PDF del pénsum. |
| `chunkArray()` / `pdfDirectMmToCssPx()` / `pdfDirectWaitImages()` / `pdfDirectRasterizeSvgLogos()` | Utilidades de maquetado/rasterizado para el PDF. |
</details>

<details>
<summary><b>☁️ Sincronización</b> — tiempo real + manual</summary>

| Función | Qué hace |
|---|---|
| `saveLocal()` / `triggerAutoSync()` / `_enqueueSync()` / `_updateSyncBadge()` | Guardado local inmediato + cola de sincronización automática. |
| `startAutoSyncInterval()` / `stopAutoSyncInterval()` | Sincronización periódica en segundo plano. |
| `syncToFirebase()` / `fetchFromFirebase()` / `sincronizarTodo()` | Subir / bajar / sincronizar todo manualmente (botones del menú). |
| `_applyRemoteUpdate(d)` | Aplica un cambio recibido en tiempo real de otro dispositivo (`onSnapshot`). |

**Firebase:** `cargarEstudianteUnaVez` · `escucharEstudiante` *(listener combinado: perfil, notas, eventos, asistencias, historial)*
</details>

<details>
<summary><b>📍 Horario ("¿Dónde estoy?")</b></summary>

| Función | Qué hace |
|---|---|
| `openDondeEstoy()` / `closeDondeEstoy()` / `refreshDondeEstoyUI()` / `_dondeEstoyUrl()` | Modal que abre `horarios.html` (mismo origen, sin bloqueo de cookies de terceros). |
| `onHorarioSynced()` / `_autoAbrirDondeDebo()` | Reacciona cuando el horario está listo / lo abre automáticamente si aplica. |
| `editarHorario()` / `guardarHorarioEnServidor()` | Edición del horario y guardado en Firestore. |

**Firebase:** `guardarHorario`
</details>

<details>
<summary><b>📄 Bitácora DI</b> — formulario, borradores, PDF, historial</summary>

| Función | Qué hace |
|---|---|
| `openBitacoraDI()` | Abre el formulario de bitácora. |
| `_bitacCargarTecnicos()` / `_bitacTecnicoPorNombre()` / `_bitacRefrescarSelectsTecnico()` / `_bitacTecnicoOptionsHTML()` | Cargan y listan los técnicos disponibles en los `<select>` del formulario. |
| `_bitacCargarActividadesPregrabadas()` / `_bitacPregrabadaOptionsHTML()` / `_bitacRefrescarPregrabadasSelects()` | Autocompletado con actividades guardadas de antemano. |
| `_bitacSellosDisponibles()` / `_bitacSelloPorId()` / `_bitacSelloOptionsHTML()` / `_bitacSelloPrefGet()` / `_bitacSelloPrefSet()` | Selección del sello a usar, con preferencia recordada por técnico. |
| `_bitacTecRespChange()` / `_bitacTecFieldHTML()` / `_bitacTecOtroToggle()` / `_bitacTecActualNombre()` / `_bitacTecChange()` / `_bitacSourceChange()` / `_bitacSetTecSelect()` | Interacciones de cada fila del formulario (técnico responsable/actuante). |
| `_bitacRenderRows(group)` / `_bitacLeerFila()` / `_bitacLeerFilaCruda()` | Dibuja y lee las filas de actividades de la bitácora. |
| `_bitacRecolectarFormulario()` / `_bitacAplicarFormulario(datos)` | Junta todo el formulario en un objeto / lo vuelve a pintar (para borradores). |
| `bitacGuardarBorrador()` / `bitacCargarBorradorSeleccionado()` / `bitacBorrarBorradorSeleccionado()` / `bitacFinalizarBorrador()` / `_bitacGetBorradores()` / `_bitacRenderBorradorSelect()` / `_bitacRenderBorradorEstado()` | Sistema de borradores: guardar avance sin finalizar la bitácora. |
| `_bitacDrawHeader()` · `_bitacDrawWatermark()` · `_bitacDrawPerfilTable()` · `_bitacCellText()` · `_bitacDrawTable()` · `_bitacDrawFirmaBlock()` · `_bitacDrawFooter()` · `_bitacConstruirPDF()` | Dibujan cada sección del PDF final de la bitácora (con marca de agua, tabla, firma y sello). |
| `generarBitacoraDIPDF()` | Genera y descarga el PDF final. |
| `openHistorialBitacoras()` / `_renderHistorialBitacoras()` / `_bitacHistBuscar(id)` | Historial de bitácoras ya generadas/archivadas. |
| `subirArchivoHistorial()` / `eliminarArchivoHistorial(id)` / `verBitacoraHist(id)` / `descargarBitacoraHist(id)` / `editarBitacoraHist(id)` | Subir un archivo escaneado, verlo, descargarlo, editarlo o eliminarlo del historial. |
| `_bitacArchivoLimiteBytes()` / `_bitacFileToDataUrlPlano()` / `_bitacComprimirImagenParaSubir()` / `_bitacDescargarDataUrl()` | Límite de tamaño, conversión y compresión de archivos antes de subirlos. |

**Firebase:** `guardarBitacoraPerfil` · `guardarBitacoraBorradores` · `guardarRegistroBitacora` · `listarBitacoras` · `eliminarRegistroBitacora`
</details>

<details>
<summary><b>🧑‍💼 Técnicos, firmas y sellos</b></summary>

| Función | Qué hace |
|---|---|
| `openTecnicosModal()` / `_renderTecnicosList()` / `_tecNormalizarTexto()` | Modal con la lista de técnicos (búsqueda incluida). |
| `guardarTecnicoNuevo()` / `editarTecnico(id)` / `borrarTecnico(id)` / `_limpiarFormTecnico()` | Alta, edición y baja de técnicos. |
| `_tecEditarImg(input, kind)` / `_abrirImgEditor(dataUrl, kind)` / `_imgEditorAplicarTextos(kind)` | Abren el editor compartido de imagen al subir una firma o sello. |
| `_selloAplicarFiltros()` / `_selloEditorUsar()` | Brillo/contraste/fondo transparente del sello, y confirmación de uso. Incluye el atajo a **remove.bg** para quitar el fondo antes de editar. |
| `_bitacDataUrlToResizedB64()` / `_bitacFileToResizedB64()` | Redimensionan y comprimen la imagen antes de guardarla. |
| `_tecToggleQuitarBtn()` / `_tecQuitarImg(kind)` | Muestran/ejecutan el botón de quitar imagen ya cargada. |
| `abrirFirmaPad(target)` / `_bindFirmaPadEvents()` / `_firmaPadLimpiar()` / `_firmaPadUsar()` | Dibujar una firma a mano (mouse/dedo/lápiz óptico) como alternativa a subir una foto. |

**Firebase:** `listarTecnicos` · `guardarTecnico` · `eliminarTecnico`
</details>

<details>
<summary><b>⚙️ Configuración de usuario y actividades pregrabadas</b></summary>

| Función | Qué hace |
|---|---|
| `openConfigUsuario()` / `guardarConfigUsuario()` | Modal de preferencias del dispositivo (técnico y sello/firma por defecto). |
| `_cfgTecnicoDefaultChange()` / `_cfgFirmaArchivo(input)` / `_cfgGuardarFirma(dataUrl)` | Cambiar el técnico por defecto / subir su firma (pasa por el editor de imagen + remove.bg). |
| `_renderActividadesPregrabadasList()` / `agregarActividadPregrabada()` / `eliminarActividadPregrabadaUI(id)` | Administra el catálogo de actividades pregrabadas (autocompletado en Bitácora). |

**Firebase:** `listarActividadesPregrabadas` · `guardarActividadPregrabada` · `eliminarActividadPregrabada`
</details>

<details>
<summary><b>🧭 Interfaz general y 📲 PWA</b></summary>

| Función | Qué hace |
|---|---|
| `toggleTheme()` | Cambia entre tema claro/oscuro y lo recuerda en este dispositivo. |
| `toggleHam()` / `closeHam()` | Abre/cierra el menú lateral. |
| `showToast(msg, type)` | Mensaje emergente de confirmación/error, reutilizado en toda la app. |
| `_showLoading(msg, sub)` / `_hideLoading()` | Overlay de carga con mensaje. |
| `openAsistenciasHub()` | Modal selector entre Asistencia diaria / de actividad / Historial de bitácoras. |
| `escapeHtml(s)` | Sanitiza texto antes de insertarlo como HTML (evita inyección). |
| `_esIOS()` / `_appYaInstalada()` / `instalarApp()` | Detectan iOS/si ya está instalada, y disparan el prompt nativo de instalación PWA. |
</details>

## Instructivo de uso

**Primer ingreso**
1. Elegir la carrera (Ing. en Sistemas / Ing. Civil).
2. Elegir tu cuenta de la lista, o escribir tu nombre si la lista está
   oculta (**☰ → 👁️ Mostrar/ocultar lista de cuentas**, protegido).
3. Si es tu primera vez, se crea la cuenta con la contraseña que escribas.

**Entrar más rápido con huella**
1. Ya con la sesión abierta: **☰ → 🫆 Huella de cuenta → "+ Agregar huella
   en este dispositivo"**, y tocar el lector cuando lo pida el sistema.
2. Para que la próxima vez entre solo, sin tocar ningún botón: activar
   **"🚀 Auto-inicio con huella"** en ese mismo modal. Aplica solo a este
   dispositivo — cada uno decide por su cuenta.
3. Si cancelás el diálogo del sistema operativo, no pasa nada — cae en
   la pantalla normal de usuario y contraseña.

**Marcar asistencia**
1. **☰ → 📋 Asistencias → 🏛 Asistencia diaria**.
2. Tocar "Marcar asistencia de hoy" — queda con hora exacta.
3. Exportar a PDF/Excel filtrando por fecha, desde el mismo modal.

**Generar una Bitácora DI**
1. **☰ → 📄 Bitácora DI**, elegir técnico responsable y llenar las filas
   de actividad (con autocompletado de actividades pregrabadas).
2. "Guardar borrador" en cualquier momento para seguir después.
3. "Generar PDF" arma el documento final con sello y firma.

**Subir una firma o sello con mejor calidad**
1. Al subir la foto (en Técnicos o en Configuración), se abre un editor
   con brillo/contraste/fondo transparente.
2. Si la foto tiene fondo o sombra, tocar **"✂️ Abrir remove.bg"**, subir
   la foto ahí, descargar el resultado sin fondo, y volver a elegir ese
   archivo en la app.

## Instructivo de despliegue

No se necesita servidor propio. Subir estos archivos juntos a cualquier
hosting estático (Firebase Hosting, GitHub Pages, Netlify, Vercel):

```
index.html
styles.css
app.js
firebase-bootstrap.js
firebase-init.js       ← ya existente en el proyecto
firebase-db.js
service-worker.js
manifest.json
horarios.html
icon-192.png, icon-192-maskable.png, icon-512.png, apple-touch-icon.png
DI.svg, Logotipo-horizontal-azul.png, logo2.png
```

**Opción recomendada — Firebase Hosting:**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # proyecto "ugb-pensum", carpeta pública = la de estos archivos
firebase deploy
```

Después de subir, recargar con **Ctrl+Shift+R** la primera vez para que
el navegador tome los archivos nuevos y no una mezcla con caché vieja.

## Reglas de seguridad de Firestore

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Cualquier usuario autenticado anónimamente puede leer/escribir cualquier
documento — es lo mínimo para que la app funcione sin backend propio. Es
consciente y aceptable para este tamaño de sistema; si más adelante se
quiere restringir por cuenta, haría falta migrar de contraseña propia
(hash SHA-256) a Firebase Auth con usuario/contraseña real y reglas
basadas en `request.auth.uid`.

## Cosas importantes

- **Auto-inicio con huella** es una preferencia por dispositivo
  (`localStorage`), no una cuenta de Firestore — si cambiás de
  dispositivo hay que activarla de nuevo ahí.
- **Huellas generales** (panel de administrador) usa una contraseña fija
  (`747`) verificada solo en el navegador — es una barrera básica, no
  seguridad real; cualquiera que lea el código fuente la puede ver. Sirve
  para uso interno del equipo, no como control de acceso serio.
- El editor de imagen (sello/firma) tiene su propio filtro de "fondo
  transparente" automático — **remove.bg** es una alternativa mejor
  cuando esa foto tiene sombras, no un reemplazo obligatorio.
- Revisando el código actual, los tres pendientes que quedaban abiertos
  en la versión anterior de este README ya están resueltos:
  - ✅ El calendario guarda notas correctamente (`ignoreUndefinedProperties`
    sigue activo en `firebase-init.js`, y `syncEventNotaToPensum` refleja
    la nota en el pénsum).
  - ✅ La asistencia sí se registra en Firebase (`marcarAsistencia` →
    `guardarAsistencia`/`guardarAsistencias`).
  - ✅ El menú hamburguesa ya es el panel lateral (drawer) con logo, cuerpo
    con scroll y pie de página.

  Aun así, no está de más confirmarlo probando la app en vivo — este
  inventario se hizo revisando el código, no ejecutando la aplicación.
- `migrar-exportar.gs`, `migrar-importar.html`, `codigo_gs_UGB.gs` y todo
  lo relacionado a Google Sheets/Apps Script siguen sin usarse — se
  pueden archivar sin afectar nada de este sistema.