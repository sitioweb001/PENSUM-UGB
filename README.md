[README.md](https://github.com/user-attachments/files/30069562/README.md)
<div align="center">

# 🎓 UGB Pénsum
### Seguimiento de notas, calendario y asistencia — 100% en la nube

![Backend](https://img.shields.io/badge/backend-Firebase-FFA000?style=for-the-badge&logo=firebase&logoColor=white)
![Frontend](https://img.shields.io/badge/frontend-HTML%20%2B%20JS-1E40AF?style=for-the-badge&logo=javascript&logoColor=white)
![Tiempo real](https://img.shields.io/badge/sincronización-tiempo%20real-10B981?style=for-the-badge)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo%20activo-F59E0B?style=for-the-badge)
![Uso](https://img.shields.io/badge/uso-Universidad%20Gerardo%20Barrios-EF4444?style=for-the-badge)

*Una sola app web para llevar el pénsum, el calendario de laboratorios/parciales,
las notificaciones y la asistencia — todo guardado en Firestore y sincronizado
al instante entre dispositivos.*

</div>

---

## 📑 Contenido

- [🔎 Resumen rápido](#-resumen-rápido)
- [🗂️ Estructura del proyecto](#️-estructura-del-proyecto)
- [✨ Funcionalidades principales](#-funcionalidades-principales)
- [🧮 Cómo se calculan las notas](#-cómo-se-calculan-las-notas)
- [📖 Manual de uso paso a paso](#-manual-de-uso-paso-a-paso)
- [🧭 Menú principal (☰)](#-menú-principal-)
- [⌨️ Atajos rápidos](#️-atajos-rápidos)
- [☁️ Sincronización con Firebase](#️-sincronización-con-firebase)
- [🚀 Despliegue](#-despliegue)
- [✅ Checklist de verificación](#-checklist-de-verificación)
- [❓ Preguntas frecuentes](#-preguntas-frecuentes)
- [🛠️ Pendiente / a futuro](#️-pendiente--a-futuro)

---

## 🔎 Resumen rápido

| | |
|---|---|
| **Nombre** | UGB Pénsum |
| **Carreras incluidas** | 🖥️ Ingeniería en Sistemas y Redes Informáticas · 🏗️ Ingeniería Civil |
| **Backend** | Firebase (Firestore + Auth anónima) — sin Google Sheets, sin Apps Script |
| **Sincronización** | Tiempo real (`onSnapshot`), con caché local persistente para uso sin conexión |
| **Login** | Nombre + contraseña propia (hash SHA-256, no es la contraseña institucional) |
| **Dispositivos** | Cualquier navegador — responsive para celular y escritorio |
| **Archivos para desplegar** | 5 (ver tabla de abajo) |

---

## 🗂️ Estructura del proyecto

| Archivo | Rol |
|---|---|
| `index.html` | 🖥️ Frontend en **producción**: login, pénsum, calendario, notas, asistencia — todo conectado en tiempo real a Firestore. |
| `index_v_PRUEBA.html` | 🧪 Versión de **pruebas/desarrollo**. Aquí viven las funciones más nuevas (notificaciones a todo color, sincronización automática calendario → pénsum) antes de pasarlas a `index.html`. |
| `horarios.html` | 📍 Visor de horario de clases, standalone (botón "¿Dónde estoy?"). No depende de Firebase. |
| `firebase-init.js` | 🔌 Conexión a Firebase (Firestore + Auth anónima), configuración del proyecto `ugb-pensum`. |
| `firebase-db.js` | 📚 Todas las funciones de guardar/leer/escuchar datos en Firestore (una función por tipo de dato: notas, eventos, asistencias, historial, etc.). |
| `Logotipo-horizontal-azul.png`, `logo2.png`, `DI.svg` | 🖼️ Logos usados en el login, encabezado y el módulo de asistencia. |

> 💡 **¿Cuál uso yo?** Para los estudiantes, siempre `index.html`. `index_v_PRUEBA.html`
> es solo para probar cambios antes de que pasen a producción.

---

## ✨ Funcionalidades principales

### 📊 Pénsum y notas
- Vista en cuadrícula por ciclos, con tarjetas de color por materia.
- Cada materia tiene **3 cómputos** (intentos: ordinario + 2 extraordinarios), y cada cómputo se arma con Laboratorio N°1 (30%), Laboratorio N°2 (30%) y Parcial (40%).
- **📋 Pegar notas del portal**: copia la tabla de notas del portal institucional y pégala — la app reconoce los códigos de materia y llena los cómputos sola.
- Modo edición (✏️) para arrastrar materias entre ciclos si tu pénsum real no calza con el de la app.

### 📅 Calendario y sincronización automática
- Registra actividades tipo **Lab 1 / Lab 2 / Parcial / Otra**, con ciclo, materia, fecha y comentario opcional.
- Para Lab 1 / Lab 2 / Parcial también eliges a **qué Cómputo pertenece** (1, 2 o 3).
- Al anotar la nota obtenida directamente en el evento del calendario, esa nota **se copia automáticamente al pénsum** en el cómputo correspondiente — no hace falta escribirla dos veces.
- Filtros por período: Todos · Esta semana · Este mes · Este año.
- Eliminar un evento siempre pide confirmación ("¿Estás seguro?").

### 🔔 Notificaciones
- Avisos automáticos según qué tan cerca esté la fecha de un laboratorio, parcial o actividad:

  | Color | Significado por defecto |
  |---|---|
  | 🟢 Verde | Faltan ~7 días |
  | 🟡 Amarillo | Faltan ~4 días |
  | 🔴 Rojo | Faltan ~2 días o menos / ya venció |

- Los umbrales (días) y la duración del mensaje emergente son **configurables** (⚙️ dentro del panel de notificaciones).
- Los avisos emergentes (toast) usan **todo el fondo pintado** del color correspondiente con texto de alto contraste — no solo un borde.
- Al hacer clic sobre un aviso emergente se abre el panel completo de notificaciones.
- Desde ese panel, cada notificación tiene dos acciones:
  - 🔕 **Ocultar** la notificación (el evento sigue en el calendario).
  - 🗑 **Eliminar** el evento del calendario (pide confirmación antes de borrar).
- También puedes deslizar un aviso emergente hacia la derecha para ocultarlo antes de tiempo.

### 🏛 Asistencia diaria
- Botón "Marcar asistencia de hoy" (una sola vez por día).
- Historial filtrable por semana, mes o año.

### 📜 Historial de cambios del pénsum
- Cada vez que mueves una materia de ciclo (modo edición), queda un registro.
- Puedes abrir el historial y **restaurar** cualquier estado anterior con un clic.

### 🔐 Cuentas y seguridad
- Selección de carrera → nombre de estudiante → contraseña propia.
- La contraseña se guarda como hash SHA-256 (nunca en texto plano).
- Cambiar contraseña, borrar tus datos o cambiar de carrera, todo desde el menú ☰.

### ☁️ Sincronización en la nube
- Todo se guarda en Firestore y se sincroniza **en tiempo real** entre dispositivos (sin recargar la página).
- Funciona también sin conexión gracias a la caché local persistente; se sincroniza apenas vuelve la señal.

### 📤 Exportar / Importar
- CSV, JSON y PDF/impresión, con un clic desde el menú ☰.

### 🎨 Personalización
- Tema claro/oscuro (🌙).
- Zoom del pénsum ajustable.

---

## 🧮 Cómo se calculan las notas

Cada **cómputo** se calcula así:

```
Cómputo = (Laboratorio N°1 × 30%) + (Laboratorio N°2 × 30%) + (Parcial × 40%)
```

La **nota final** de la materia es el promedio de los 3 cómputos, y de ahí sale el estado:

| Estado | Cuándo aparece |
|---|---|
| ⚪ **Pendiente** | Todavía no se ha anotado ninguna nota en ningún cómputo. |
| 🟡 **En curso** | Hay al menos una nota anotada, pero el cálculo automático aún no ha producido un promedio definitivo (ver nota abajo). |
| 🟢 **Aprobada** | Nota final ≥ 6.0 |
| 🔴 **Reprobada** | Nota final < 6.0 |
| ⭐ **Especial** | Marcada manualmente como caso especial (Ctrl+Shift+clic sobre la tarjeta). |

> ⚠️ **Nota técnica sobre "En curso":** con la lógica actual, apenas escribes
> *una sola* nota en cualquier cómputo, la app ya calcula un promedio (tratando
> los campos vacíos como 0), así que en la práctica pasa casi directo a
> Aprobada/Reprobada sin pasar visiblemente por "En curso". Si prefieres que
> "En curso" se mantenga hasta que los 3 cómputos estén completos, este es un
> ajuste pendiente y puntual en `calcFinal()` / `getStatus()`.

---

## 📖 Manual de uso paso a paso

1. **Abre la app** (o el archivo local) y elige tu carrera.
2. **Crea tu cuenta**: escribe tu nombre y una contraseña — como es la primera vez, el sistema la crea sola.
3. **Carga tus notas** de alguna de estas dos formas:
   - 📋 Copia la tabla de notas del portal institucional y pégala en *Menú ☰ → Pegar notas del portal*.
   - ✍️ O ábrelas manualmente: entra a un ciclo, abre una materia y llena Lab 1 / Lab 2 / Parcial por cómputo.
4. **Anota tus actividades en el calendario** (📅): botón `+ Lab 1 / + Lab 2 / + Parcial / + Otra`, elige ciclo, materia, cómputo (si aplica) y fecha.
5. **Cuando tengas la nota de esa actividad**, escríbela en el campo "Nota" del evento — se copiará sola al pénsum.
6. **Revisa tus notificaciones** (🔔): se generan solas según la fecha de tus actividades. Desde ahí puedes ocultar una notificación puntual (🔕) o borrar el evento (🗑, con confirmación).
7. **Marca tu asistencia diaria** (🏛) si tu carrera la requiere.
8. **Si necesitas reordenar tu pénsum**, activa el modo edición (✏️) y arrastra las materias entre ciclos.
9. **Haz respaldo cuando quieras**: Menú ☰ → Exportar CSV / JSON / PDF.
10. **Cambia el tema, tu contraseña o tu carrera** en cualquier momento desde el menú ☰.

---

## 🧭 Menú principal (☰)

| Ícono | Opción | Qué hace |
|---|---|---|
| 📋 | Pegar notas del portal | Importa notas pegando la tabla del portal institucional. |
| 📅 | Calendario | Abre el calendario de actividades. |
| 🔔 | Notificaciones | Abre el panel de avisos próximos (con contador). |
| 🏛 | Asistencia diaria | Marca o revisa tu asistencia. |
| 📜 | Historial de cambios | Ver y restaurar versiones anteriores del pénsum. |
| 🔃 | Sincronizar | Sincroniza todo (subir + refrescar) con Firebase. |
| 🔄 | Refrescar desde Firebase | Trae la última versión guardada en la nube. |
| ☁️ | Subir a Firebase | Sube tus cambios locales a la nube. |
| 📊 | Exportar CSV | Descarga tus notas en formato CSV. |
| 📁 | Importar CSV | Carga notas desde un CSV exportado antes. |
| 💾 | Exportar JSON | Respaldo completo en JSON. |
| 📂 | Importar JSON | Restaura un respaldo JSON. |
| 🖨️ | Imprimir / PDF | Genera un PDF con tu pénsum. |
| ⚙️ | Verificar base de datos | Revisa/inicializa la conexión a Firestore. |
| 🌙 | Cambiar tema | Alterna claro/oscuro. |
| 🔑 | Cambiar contraseña | Actualiza tu contraseña de acceso. |
| 🗑️ | Borrar datos | Elimina tus datos guardados. |
| 🧨 | Resetear base de datos | Reinicia la base de datos (uso avanzado). |
| 👁️ | Mostrar/ocultar lista de cuentas | Controla si el selector de nombre muestra la lista de estudiantes. |
| 🧹 | Limpiar caché y recargar | Limpia caché local y recarga la app. |
| 🎓 | Cambiar carrera | Vuelve a la pantalla de selección de carrera. |

---

## ⌨️ Atajos rápidos

| Atajo | Dónde | Qué hace |
|---|---|---|
| Doble clic en el logo | Login o encabezado | Verifica/inicializa la base de datos en Firestore (log en consola, F12). |
| Ctrl + doble clic sobre una tarjeta | Modo edición, pénsum | Rellena esa materia con 6.0 en todos los campos (prueba rápida). |
| Ctrl + Shift + clic sobre una tarjeta | Modo edición, pénsum | Marca/desmarca la materia como "Especial ⭐". |
| Arrastrar y soltar | Modo edición, pénsum | Mueve una materia entre ciclos. |
| Deslizar hacia la derecha | Aviso emergente de notificación | Lo oculta antes de que expire solo. |

---

## ☁️ Sincronización con Firebase

`firebase-db.js` expone una función de guardado y una de escucha en tiempo real
por cada tipo de dato:

| Dato | Guardar | Escuchar en tiempo real |
|---|---|---|
| Notas / cómputos | `guardarNotas()` | `escucharNotas()` |
| Eventos del calendario | `guardarEventos()` | `escucharEventos()` |
| Asistencias | `guardarAsistencias()` | `escucharAsistencias()` |
| Historial del pénsum | `guardarPensumHistorial()` | `escucharPensumHistorial()` |
| Ciclos finalizados | `guardarCiclosDone()` | — |
| Materias especiales ⭐ | `guardarEspeciales()` | — |
| Estructura del pénsum (tras editarlo) | `guardarPensumCycles()` | — |
| Horario de clases | `guardarHorario()` | — |
| Cuenta / contraseña | `crearOCargarEstudiante()`, `verificarPassword()`, `guardarPasswordHash()` | `escucharEstudiante()` (agrupa todo) |

`ignoreUndefinedProperties: true` está activado a propósito: el campo `nota`
de un evento nuevo del calendario empieza como `undefined` hasta que el
estudiante lo llena, y sin esa opción Firestore rechaza el guardado completo.

---

## 🚀 Despliegue

No se necesita Apps Script ni Google Sheets. Sube estos archivos juntos a
cualquier hosting estático:

1. `index.html`
2. `horarios.html`
3. `firebase-init.js`
4. `firebase-db.js`
5. `Logotipo-horizontal-azul.png`, `logo2.png`, `DI.svg`

**Opción recomendada — Firebase Hosting:**

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # proyecto "ugb-pensum", carpeta pública = la de estos archivos
firebase deploy
```

Esto entrega una URL tipo `https://ugb-pensum.web.app` para compartir con los estudiantes.

**Alternativas igual de válidas:** GitHub Pages, Netlify, Vercel, o abrir
`index.html` con doble clic desde tu computadora (todo lo de Firebase se
conecta por HTTPS, no depende de rutas locales).

---

## ✅ Checklist de verificación

- [ ] La consola del navegador no muestra errores al cargar.
- [ ] Doble clic en el logo muestra el log de inicialización de la base de datos.
- [ ] Una cuenta nueva se crea y el login funciona.
- [ ] Guardar una nota se refleja en otro dispositivo/pestaña sin recargar.
- [ ] Firebase Console → Firestore → colección `estudiantes` se llena a medida que se usa el sistema.
- [ ] "¿Dónde estoy?" abre el horario sin pantalla en blanco.
- [ ] Anotar una nota de Lab/Parcial en el calendario la refleja en el pénsum automáticamente.
- [ ] Eliminar un evento (desde el calendario o desde notificaciones) siempre pide confirmación.

---

## ❓ Preguntas frecuentes

**¿Por qué casi nunca veo el estado "En curso"?**
Porque el cálculo actual convierte cualquier cómputo a un promedio real desde
la primera nota que anotes (los campos vacíos cuentan como 0), así que salta
casi directo a Aprobada/Reprobada. Ver la nota técnica en
[Cómo se calculan las notas](#-cómo-se-calculan-las-notas).

**Si borro un evento del calendario, ¿se borra también la nota del pénsum?**
No. La sincronización va en un solo sentido (calendario → pénsum). Borrar el
evento no revierte la nota que ya se copió al pénsum, para evitar borrados
accidentales de tu historial de notas.

**¿La contraseña es la misma del portal institucional?**
No — es una contraseña propia de la app, guardada como hash, independiente de
tus credenciales institucionales.

**¿Funciona sin internet?**
Sí, gracias a la caché local persistente de Firestore; en cuanto vuelve la
conexión, se sincroniza solo.

---


---

<div align="center">

Hecho por EMERSON CASTRO para la comunidad y amigos de la **Universidad Gerardo Barrios**.

</div>
