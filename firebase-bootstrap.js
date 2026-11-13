  import { authReady } from './firebase-init.js';
  import * as FirebaseDB from './firebase-db.js';
  window.FirebaseDB = FirebaseDB;
  // Push (FCM) se carga aparte, con import(): si firebase-push.js falla (error de
  // sintaxis, clave mal pegada, red), Firebase/Firestore sigue funcionando igual
  // y solo quedan desactivados los avisos push.
  window.__firebasePushReady = import('./firebase-push.js')
    .then((m) => { window.FirebasePush = m; })
    .catch((e) => { console.warn('[Push] No se pudo cargar firebase-push.js; avisos push desactivados:', e); });
  authReady.then(() => {
    // window.__resolveFirebaseReady lo define el <script> clásico de abajo;
    // para cuando este módulo corre (siempre después de parsear todo el
    // documento), ese <script> ya se ejecutó y la Promise ya existe.
    window.__resolveFirebaseReady();
    console.log('[Firebase] Listo — autenticado y funciones conectadas.');
  });
