// eslint.config.js — configuración mínima para revisar errores reales
// (variables no declaradas, comparaciones raras, etc.) sin generar ruido
// por cosas que en este proyecto son normales:
//   - Casi todas las funciones se llaman desde onclick="..." en el HTML,
//     no desde otro lugar del propio .js — por eso "no-unused-vars" queda
//     apagado para funciones (si no, marcaría cientos de falsos positivos).
//   - app.js/calculos.js/firebase-bootstrap.js corren como <script> normal
//     en el navegador (variables globales compartidas entre archivos), no
//     como módulos ES — por eso sourceType es "script" para esos.
//   - firebase-init.js / firebase-db.js SÍ son módulos ES (usan
//     import/export), así que a esos se les da sourceType "module".
//
// Cómo correrlo:  npm install && npm run lint
// (No se corrió un "--fix" automático sobre el código ya existente a
// propósito — podía introducir cambios masivos sin forma de probarlos uno
// por uno. Mejor ir corrigiendo lo que marque de a poco.)

// eslint.config.js — configuración mínima para revisar errores reales
// (variables no declaradas, comparaciones raras, etc.) sin generar ruido
// por cosas que en este proyecto son normales:
//   - Casi todas las funciones se llaman desde onclick="..." en el HTML,
//     no desde otro lugar del propio .js — por eso "no-unused-vars" queda
//     apagado para funciones (si no, marcaría cientos de falsos positivos).
//   - app.js/calculos.js/firebase-bootstrap.js corren como <script> normal
//     en el navegador (variables globales compartidas entre archivos), no
//     como módulos ES — por eso sourceType es "script" para esos.
//   - firebase-init.js / firebase-db.js SÍ son módulos ES (usan
//     import/export), así que a esos se les da sourceType "module".
//
// ⚠️ IMPORTANTE — app.js trae jsPDF, html2canvas y pako EMBEBIDOS como
// líneas minificadas gigantes (una sola línea puede tener 60,000+
// caracteres — buscá "pako 2.1.0" o "@license" cerca del principio del
// archivo). Cualquier warning/error que apunte a esas líneas (columnas con
// números de 4-5 dígitos) es código de terceros, no un bug del proyecto —
// no tiene sentido "corregirlo" ahí. Los problemas que sí importan son los
// que apuntan a líneas y columnas normales, con nuestras propias funciones.
//
// Cómo correrlo:  npm install && npm run lint
// (No se corrió un "--fix" automático sobre el código ya existente a
// propósito — podía introducir cambios masivos sin forma de probarlos uno
// por uno. Mejor ir corrigiendo lo que marque de a poco.)

module.exports = [
  {
    files: ['app.js', 'service-worker.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        console: 'readonly', localStorage: 'readonly', fetch: 'readonly',
        alert: 'readonly', confirm: 'readonly', prompt: 'readonly', location: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        URL: 'readonly', Blob: 'readonly', FileReader: 'readonly',
        crypto: 'readonly', self: 'readonly', caches: 'readonly',
        DOMParser: 'readonly', Image: 'readonly', requestAnimationFrame: 'readonly',
        MutationObserver: 'readonly', PublicKeyCredential: 'readonly',
        TextEncoder: 'readonly', TextDecoder: 'readonly', btoa: 'readonly', atob: 'readonly',
        define: 'readonly', // usado adentro de jsPDF embebido (AMD), no por nuestro código
        module: 'writable', require: 'readonly',
        jspdf: 'readonly', html2canvas: 'readonly',
        // Vienen de calculos.js, cargado en index.html ANTES que app.js —
        // desde el punto de vista de este archivo son globales, aunque
        // ESLint analice cada archivo por separado y no lo sepa solo.
        escapeHtml: 'readonly', calcComputo: 'readonly', calcFinal: 'readonly',
        filterByPeriod: 'readonly', daysUntil: 'readonly', getTodayKey: 'readonly',
        _fmtNota: 'readonly', _hhmmFromIso: 'readonly'
      }
    },
    rules: {
      'no-undef': 'warn',
      'no-unused-vars': 'off', // ver nota arriba: casi todo se llama desde onclick="" en el HTML
      'no-redeclare': 'warn',
      'no-dupe-keys': 'error',
      'no-cond-assign': 'warn', // 'warn' y no 'error': jsPDF embebido usa este patrón a propósito
      'no-fallthrough': 'warn'
    }
  },
  {
    // calculos.js es un caso especial: corre como <script> normal en el
    // navegador PERO también se carga con require() desde Node (ver
    // calculos.test.js) — por eso necesita el global "module" para el
    // puente de exports del final del archivo.
    files: ['calculos.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: { module: 'writable', require: 'readonly' }
    },
    rules: { 'no-undef': 'warn', 'no-unused-vars': 'off' }
  },
  {
    files: ['firebase-init.js', 'firebase-db.js', 'firebase-bootstrap.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { console: 'readonly', window: 'readonly', crypto: 'readonly', TextEncoder: 'readonly' }
    },
    rules: {
      'no-undef': 'warn',
      'no-unused-vars': 'warn',
      'no-redeclare': 'warn',
      'no-dupe-keys': 'error'
    }
  }
];
