# 📲 Avisos push y recordatorios para Pénsum UGB

Avisos en el celular Android **aunque la app esté cerrada**, usando Firebase Cloud Messaging (FCM) y GitHub Actions
(costo $0 con el repositorio público):

- 🔔 Recordatorio de **asistencia diaria** y avisos de **laboratorios, parciales y actividades** (verde / amarillo / rojo).
- ⏰ **Recordatorios personalizados**: tú les pones nombre, fecha, hora exacta y repetición, y se ven en el 📅 Calendario.

## Cómo funciona

```
 Celular (PWA instalada)                 Firestore                         GitHub Actions (cada 10 min)
 ───────────────────────                 ─────────                         ────────────────────────────
 "Activar en este dispositivo"  ──►  estudiantes/{id}/dispositivos/{token}
 Config de avisos al guardar    ──►  estudiantes/{id}/ajustes/notificaciones
 ⏰ Recordatorios (Calendario)  ──►  estudiantes/{id}/recordatorios/{recId}
                                                │
                                                ▼
                            scripts/enviar-avisos.mjs lee eventos, recordatorios y asistencia,
                            decide qué toca y envía por FCM; anota lo enviado en
                            estudiantes/{id}/ajustes/pushEstado (no repite avisos)
                                                │
 service-worker.js (evento push) ◄──────────────┘  muestra la notificación; al tocarla abre
                                                    Asistencia, el Calendario o tus recordatorios
```

Si la app está **abierta y visible** no sale la notificación del sistema: los avisos salen dentro de la app, y los
recordatorios suenan ahí a la **hora exacta**.

## ⏰ Recordatorios personalizados

**Crear:** 📅 Calendario → **⏰ + Recordatorio** (o ☰ → ⏰ Nuevo recordatorio).

| Campo | Opciones |
|---|---|
| Nombre | Texto libre (ej. "Tomar agua", "Estudiar Redes") |
| Fecha y hora exacta | Primera vez que suena |
| Repetir | Una sola vez · Todos los días · Días de la semana (L-D a tu elección) · Cada mes (mismo día; el 31 cae el último día en meses cortos) |
| Repetir hasta | Opcional: fecha de fin |
| Nota | Opcional: es el texto que aparece en el aviso |

En el Calendario aparecen listados con su repetición y **próxima fecha**; puedes activarlos/desactivarlos con la casilla,
editarlos ✏️ o borrarlos 🗑. **📤 Exportar .ics** también incluye los recordatorios (con su repetición y una alarma),
para abrirlos en Google Calendar, Outlook, etc.

### ¿Qué tan exacta es la hora?

| Situación | Puntualidad |
|---|---|
| App **abierta** y visible | **A la hora exacta** (aviso emergente dentro de la app). |
| App **cerrada** / en segundo plano (push) | Desde la hora indicada hasta **~10-15 min después** (a veces más): GitHub ejecuta el servidor cada 10 min y puede atrasarse. Si se atrasa, igual avisa hasta 2 h tarde. |
| Hora fuera de 5:00 a. m. – 9:50 p. m. | Con la app cerrada **no** llega (el servidor no corre de noche); solo suena con la app abierta. |

GitHub Actions no garantiza el minuto exacto. Si necesitas push puntual **al minuto** con la app cerrada, hay que
cambiar el "reloj" del servidor por Cloud Functions + Cloud Scheduler (requiere activar el plan Blaze de Firebase con
tarjeta; para este uso el costo real es ~$0). La lógica de este proyecto se reutiliza tal cual.

## Instalación (una sola vez)

### 1. Clave VAPID (pública) → va dentro de la app
Firebase Console → ⚙️ **Configuración del proyecto** → **Cloud Messaging** → **Certificados push web** →
**Generar par de claves**. Pega la clave **entre comillas** en `firebase-push.js`:
```js
const VAPID_PUBLIC_KEY = 'BAcX8q...tu-clave-de-87-caracteres...';
```
Es una clave pública: puede quedar en el repositorio. (No confundir con el *ID del remitente*, que es un número.)

### 2. Cuenta de servicio (privada) → solo como *secret* de GitHub
Firebase Console → **Configuración del proyecto** → **Cuentas de servicio** → **Generar nueva clave privada**.
En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**:
nombre `FIREBASE_SERVICE_ACCOUNT`, valor = **todo el contenido** del `.json`.
**Nunca** subas ese `.json` al repositorio ni lo pegues en la app: con el repositorio público, cualquiera podría
controlar todo tu proyecto de Firebase.

### 3. Subir y publicar
Sube el proyecto a GitHub (incluida la carpeta oculta `.github/workflows/avisos-push.yml`; si la subida por web
la omite: **Add file → Create new file** con el nombre `.github/workflows/avisos-push.yml` y pega el contenido).
La app se publica sola en GitHub Pages (HTTPS). Abre la app con **Ctrl+Shift+R** para cargar la versión nueva.

### 4. Activar en el celular
1. Instala la app (☰ → 📲 Instalar app) y entra con tu estudiante.
2. 🔔 notificaciones → ⚙️ → **Avisos en el celular** → **Activar en este dispositivo** → *Permitir*.
3. Ajusta las horas (5–20, hora de El Salvador) y pulsa **Guardar**.

### 5. Probar
GitHub → **Actions** → **Avisos push (Pénsum UGB)** → **Run workflow** → marca **probar** → *Run*.
Con la app cerrada debe llegar "✅ Prueba de avisos". Para probar un recordatorio: crea uno para dentro de ~15 min,
cierra la app y espera.

## Qué avisa y cuándo

| Aviso | Regla |
|---|---|
| ⏰ Recordatorio personalizado | A su hora (hasta 2 h después si hubo atraso), **una vez por día**. Va primero si coinciden varios. |
| 🔔 Asistencia | Desde la hora elegida (8:00 por defecto) hasta las 21:00, **solo si hoy no marcaste asistencia**. 1 por día. |
| 🟢 / 🟡 / 🔴 Calendario | Desde la hora elegida (7:00 por defecto), **una vez por franja** de cada evento sin completar (7 / 4 / 2 días por defecto). Lo vencido hace más de 1 día no se empuja. |
| Muchos a la vez | Máximo 3 mensajes sueltos por corrida; el resto llega en un solo resumen. |

Materias silenciadas (🔇) y notificaciones desactivadas se respetan: se sincronizan al guardar la configuración.

## Límites y solución de problemas

- **iPhone**: solo iOS 16.4+ y con la app agregada a la pantalla de inicio.
- **Android con ahorro de batería agresivo** (Xiaomi, Huawei…): pueden retrasar o bloquear avisos; quita la
  restricción de batería a Chrome / a la app instalada.
- **No llega nada**: (1) ¿permiso en *Permitir*? (2) en el log de Actions debe decir `N dispositivo(s)`; si dice 0,
  vuelve a activar en el celular; (3) ¿la hora ya pasó hoy y el recordatorio sigue activo (casilla marcada)?
- **Error "VAPID" o "is not defined" en la consola**: la clave quedó sin comillas en `firebase-push.js`.
  Aunque falle el push, Firebase y la app siguen funcionando.
- **Cambiaste de celular / borraste datos del navegador**: pulsa de nuevo *Activar en este dispositivo*.
- **GitHub pausa los workflows programados** en repos públicos tras ~60 días sin actividad: reactívalo en la
  pestaña Actions o haz cualquier commit.
- Si haces el repositorio **privado**: cada 10 min gasta ~3 000 min/mes (el plan gratis da 2 000); cambia el `cron`
  a cada hora (`'5 0-3,11-23 * * *'`).
- Las notificaciones ocultadas con 🔕 dentro de la app (por evento) son locales de cada dispositivo y **no** se
  sincronizan; para apagar una materia completa usa 🔇.

## Seguridad

Las reglas de Firestore (`request.auth != null`, auth anónima) dejan que cualquier cliente de la app lea y escriba
tokens y recordatorios. Un token por sí solo **no permite enviar** mensajes (eso requiere la cuenta de servicio, que
solo vive en el secret de GitHub), pero alguien podría borrar o agregar tokens y recordatorios. Es el mismo nivel de
exposición que ya tienen tus demás datos; si migras a Firebase Auth con cuentas reales, restringe también
`dispositivos`, `ajustes` y `recordatorios` por `request.auth.uid`.

## Pruebas

```bash
node calculos.test.js                                   # 35 pruebas (incluye repeticiones de recordatorios)
cd scripts && npm install && node logica.test.mjs       # 19 pruebas (horas UTC-6, franjas, recordatorios, no repetir…)
```
El workflow corre las del servidor antes de enviar.

## Archivos

| Archivo | Para qué |
|---|---|
| `firebase-push.js` | Cliente: permiso, token FCM, registro del dispositivo, sincronización de config |
| `firebase-db.js` | Incluye `escucharRecordatorios`, `guardarRecordatorio`, `borrarRecordatorio` |
| `calculos.js` | Reglas de repetición (`recordatorioOcurreEn`, `proximaOcurrenciaRecordatorio`…) usadas por la app **y** el servidor |
| `service-worker.js` | Eventos `push` y `notificationclick` |
| `app.js` / `index.html` | Sección "Avisos en el celular", recordatorios en el Calendario, aviso a la hora exacta con la app abierta |
| `scripts/enviar-avisos.mjs` | Servidor: lee Firestore y envía por FCM |
| `scripts/logica.mjs` | Reglas puras de avisos + `logica.test.mjs` |
| `scripts/materias.json` | Nombres de materias por carrera para el texto del aviso |
| `.github/workflows/avisos-push.yml` | Programación cada 10 min y ejecución manual de prueba |
