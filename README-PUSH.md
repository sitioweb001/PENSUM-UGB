# 📲 Notificaciones push para Pénsum UGB (FCM + GitHub Actions)

Avisos en el celular Android **aunque la app esté cerrada**: recordatorio de asistencia diaria y avisos de
laboratorios, parciales y actividades del calendario (verde / amarillo / rojo, igual que dentro de la app).
Costo: **$0** (Firebase Cloud Messaging es gratis y GitHub Actions cubre el uso con holgura).

## Cómo funciona

```
 Celular (PWA instalada)                 Firestore                    GitHub Actions (cada hora)
 ───────────────────────                 ─────────                    ──────────────────────────
 "Activar en este dispositivo"  ──►  estudiantes/{id}/dispositivos/{token}
 Config de avisos al guardar    ──►  estudiantes/{id}/ajustes/notificaciones
                                                │
                                                ▼
                                  scripts/enviar-avisos.mjs lee eventos + asistencia,
                                  decide qué toca y envía por FCM; anota lo enviado en
                                  estudiantes/{id}/ajustes/pushEstado (no repite avisos)
                                                │
 service-worker.js (evento push) ◄──────────────┘   muestra la notificación; al tocarla abre
                                                     Asistencia o el Calendario
```

Si la app está **abierta y visible**, no sale la notificación del sistema (ya salen los avisos dentro de la app).

## Requisitos

- La app publicada en **HTTPS** (Firebase Hosting o GitHub Pages sirven; `file://` y `http://` no permiten push).
- Un repositorio de GitHub con el proyecto (el workflow vive en `.github/workflows/`).

## Instalación (una sola vez)

### 1. Copiar los archivos
Copia el contenido de la carpeta `proyecto/` **encima de la raíz de tu proyecto** (respeta las subcarpetas;
`.github` es una carpeta oculta). Se reemplazan 7 archivos y se agregan 7 nuevos:

| Modificados | Nuevos |
|---|---|
| `app.js` · `index.html` · `service-worker.js` · `firebase-bootstrap.js` · `firebase-db.js` · `eslint.config.js` · `package.json` | `firebase-push.js` |
| | `scripts/` (`enviar-avisos.mjs`, `logica.mjs`, `logica.test.mjs`, `materias.json`, `package.json`) |
| | `.github/workflows/avisos-push.yml` |

> ⚠️ Esto está hecho sobre el `PENSUM-UGB-main.zip` que subiste. Si cambiaste `app.js` o `index.html` después,
> en vez de reemplazarlos aplica los cambios a mano: están en `cambios-app-js.diff` y `cambios-index-html.diff`
> (son bloques pequeños y aislados).

### 2. Clave VAPID (pública) → va dentro de la app
1. [Firebase Console](https://console.firebase.google.com) → proyecto **ugb-pensum** → ⚙️ **Configuración del proyecto** → pestaña **Cloud Messaging**.
2. En **Certificados push web** (Web Push certificates) pulsa **Generar par de claves**.
3. Copia la clave y pégala en `firebase-push.js`:
   ```js
   const VAPID_PUBLIC_KEY = 'PEGA_AQUI_TU_CLAVE_VAPID_PUBLICA';
   ```
   Es una clave **pública**: puede ir embebida en el archivo sin problema.

### 3. Cuenta de servicio (privada) → va como *secret* de GitHub
1. Firebase Console → ⚙️ **Configuración del proyecto** → **Cuentas de servicio** → **Generar nueva clave privada** (descarga un `.json`).
2. GitHub → tu repositorio → **Settings → Secrets and variables → Actions → New repository secret**.
   - Nombre: `FIREBASE_SERVICE_ACCOUNT`
   - Valor: el **contenido completo** del `.json`.
3. **No** subas ese `.json` al repositorio ni lo pegues en la app: es una llave privada con acceso total a tu proyecto.
   (Es la única credencial que no se puede embeber; las públicas —`firebaseConfig` y la VAPID— sí.)

Si el envío falla con un error de "API no habilitada", en Google Cloud Console → *APIs y servicios* habilita
**Firebase Cloud Messaging API** para el proyecto (normalmente ya viene activa).

### 4. Publicar
```bash
git add . && git commit -m "Avisos push (FCM)" && git push
firebase deploy          # o el despliegue que uses (GitHub Pages, etc.)
```
Después abre la app y recarga con **Ctrl+Shift+R** (o ☰ → 🧹 Limpiar caché y recargar) para que tome el nuevo
service worker (`pensum-ugb-v9`). En el celular, si la tenías instalada, ciérrala del todo y ábrela de nuevo.

### 5. Activar en el celular
1. Instala la app (☰ → 📲 Instalar app) y entra con tu estudiante.
2. 🔔 notificaciones → ⚙️ → sección **📲 Avisos en el celular** → **Activar en este dispositivo** → *Permitir*.
3. Ajusta las horas (5–20, hora de El Salvador) y pulsa **Guardar**. Los días (verde/amarillo/rojo) y las materias
   silenciadas se copian al servidor al guardar.

### 6. Probar
GitHub → pestaña **Actions** → **Avisos push (Pénsum UGB)** → **Run workflow** → marca **probar** → *Run*.
Con la app cerrada debe llegar "✅ Prueba de avisos". Si llega, ya está todo conectado.

## Qué avisa y cuándo

| Aviso | Regla |
|---|---|
| 🔔 Asistencia | Desde la hora elegida (por defecto 8:00) hasta las 21:00, **solo si hoy no has marcado asistencia**. Máximo 1 por día. |
| 🟢 / 🟡 / 🔴 Calendario | Desde la hora elegida (por defecto 7:00), **una vez por franja** de cada evento no completado (7 / 4 / 2 días por defecto). Eventos vencidos hace más de 1 día no se empujan. |
| Materias silenciadas, notificaciones desactivadas | Se respetan (se sincronizan al guardar la configuración). |
| Muchos a la vez | Máximo 3 mensajes sueltos por corrida; el resto llega en un solo resumen. |

El workflow corre **cada hora de 5:05 a. m. a 9:05 p. m.** (hora El Salvador), así que el aviso llega a la hora
elegida o hasta ~1 h después (GitHub a veces atrasa unos minutos). Para más precisión cambia el `cron` en
`.github/workflows/avisos-push.yml` (p. ej. `'5,35 0-3,11-23 * * *'` para cada 30 min). Repos privados: GitHub
da 2 000 min/mes gratis; el horario por defecto usa unos 510.

## Límites y solución de problemas

- **iPhone**: solo iOS 16.4+ y con la app agregada a la pantalla de inicio.
- **Android con ahorro de batería agresivo** (Xiaomi, Huawei, etc.): pueden retrasar o bloquear avisos. Quita la
  restricción de batería a Chrome / a la app instalada.
- **No llega nada**: (1) ¿el permiso está en *Permitir*? (2) mira el log de la ejecución en Actions: debe decir
  `N dispositivo(s)`; si dice 0, activa de nuevo en el celular; (3) ¿la hora configurada ya pasó hoy?
  (4) ¿hay eventos con fecha y sin completar, o falta marcar asistencia?
- **Cambié de celular / borré datos del navegador**: vuelve a pulsar *Activar en este dispositivo*. Los tokens
  vencidos se limpian solos.
- **GitHub pausa los workflows programados** en repos públicos tras ~60 días sin actividad: si pasa, reactívalo en
  la pestaña Actions o haz cualquier commit.
- Las notificaciones ocultadas con 🔕 dentro de la app (por evento) son locales de cada dispositivo y **no** se
  sincronizan; para apagar una materia completa usa 🔇 (esa sí se sincroniza).

## Seguridad

Las reglas de Firestore actuales (`request.auth != null`, auth anónima) dejan que cualquier cliente de la app lea
y escriba los tokens de dispositivos. Un token por sí solo **no permite enviar** mensajes (eso requiere la cuenta de
servicio, que solo vive en el secret de GitHub), pero alguien podría borrar o agregar tokens. Es el mismo nivel de
exposición que ya tiene el resto de tus datos; si migras a Firebase Auth con cuentas reales, restringe también
`dispositivos` y `ajustes` por `request.auth.uid`.

## Pruebas locales de las reglas

```bash
cd scripts && npm install && node logica.test.mjs     # 14 pruebas (horas UTC-6, franjas, silenciadas, no repetir…)
```
El workflow también las corre antes de enviar.

## Archivos

| Archivo | Para qué |
|---|---|
| `firebase-push.js` | Cliente: permiso, token FCM, registro del dispositivo, sincronización de config |
| `service-worker.js` | Eventos `push` y `notificationclick` (abre Asistencia/Calendario) |
| `app.js` / `index.html` | Sección "Avisos en el celular" en ⚙️ y enganches de sesión |
| `scripts/enviar-avisos.mjs` | Servidor: lee Firestore y envía por FCM |
| `scripts/logica.mjs` | Reglas puras (horas, franjas, agrupación) + `logica.test.mjs` |
| `scripts/materias.json` | Nombres de materias por carrera para el texto del aviso |
| `.github/workflows/avisos-push.yml` | Programación cada hora y ejecución manual de prueba |
