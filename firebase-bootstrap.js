  import { authReady } from './firebase-init.js';
  import * as FirebaseDB from './firebase-db.js';
  window.FirebaseDB = FirebaseDB;
  authReady.then(() => {
    // window.__resolveFirebaseReady lo define el <script> clásico de abajo;
    // para cuando este módulo corre (siempre después de parsear todo el
    // documento), ese <script> ya se ejecutó y la Promise ya existe.
    window.__resolveFirebaseReady();
    console.log('[Firebase] Listo — autenticado y funciones conectadas.');
  });
