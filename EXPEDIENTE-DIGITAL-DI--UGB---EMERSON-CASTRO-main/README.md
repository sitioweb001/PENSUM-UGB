# Expediente Digital del Becario — Dirección de Integración

## Qué cambió en esta entrega

1. **Carnet completo, sin recortes.** El contenedor del carnet usaba una
   proporción de tarjeta de crédito (1.586:1) con `object-fit: cover`,
   lo que recortaba la parte inferior de la imagen. Ahora usa la
   proporción real del carnet (**648 × 1021 px**) y `object-fit: contain`,
   así que siempre se ve completo, tanto el frente como el reverso.

2. **Panel lateral redimensionable.** Entre el panel de "Resumen del
   expediente / Documentos" y el contenido principal hay un divisor
   vertical. Se arrastra con el mouse (o el dedo, en pantallas táctiles
   de escritorio) para achicar o agrandar el panel. También funciona
   con teclado: enfoca el divisor con Tab y usa las flechas ← / →.
   Doble clic sobre el divisor restablece el ancho por defecto. El
   ancho elegido se recuerda entre visitas (usando el almacenamiento
   del navegador).

3. **Pie de página centrado.** Los logos ahora aparecen arriba,
   centrados, y el texto de copyright/fecha de consulta debajo,
   también centrado — en todos los tamaños de pantalla, no solo en
   móvil.

4. **Todo integrado en un solo `index.html`.** El HTML, el CSS y el
   JavaScript que antes estaban en tres archivos separados
   (`index.html`, `style.css`, `script.js`) ahora viven en un único
   archivo `index.html` (los estilos dentro de `<style>` y la lógica
   dentro de `<script>`, dentro del mismo documento).

5. **Archivos organizados en carpetas.** Los documentos, el carnet, las
   imágenes y los logos ya no están sueltos junto al HTML — cada tipo
   de archivo tiene su propia carpeta (ver estructura abajo).

6. **Vista previa al compartir (logo + descripción).** Se agregaron
   etiquetas Open Graph / Twitter Card en `index.html` y una imagen
   `logos/social-preview.png` (1280×640, con el logo de la Dirección
   de Integración) para que, al compartir el enlace del sitio, se
   muestre el logo y una descripción en vez de un enlace pelado.
   Ver la sección "Publicar en GitHub" más abajo para la vista previa
   específica de GitHub.

## Estructura de carpetas

```
expediente-di/
├── index.html               ← único archivo con HTML + CSS + JS
├── documentosPDF/            ← todos los PDF del expediente
│   ├── Carta_COMPROMISO.pdf
│   ├── INSCRIPCION_CII-2026.pdf
│   ├── CARTA_4957891.pdf
│   ├── CONSENTIMIENTO_INFORMADO_2026_DI.pdf
│   └── SOLICITUD_DE_BECA_2026.pdf
├── carnet/                   ← frente y reverso del carnet del becario
│   ├── carnet-frente.png
│   └── carnet-reverso.png
├── imagenes/                 ← para futuros documentos tipo imagen (ver LEEME.txt)
└── logos/                    ← logos institucionales + imagen de vista previa
    ├── DI.svg
    ├── UGB-logo.png
    └── social-preview.png    ← imagen para compartir (GitHub, WhatsApp, etc.)
```

## Cómo verlo / desplegarlo

- **Localmente:** descarga la carpeta completa `expediente-di/` y
  haz doble clic en `index.html`. No necesita servidor ni instalación:
  al abrir localmente, el navegador resuelve las rutas relativas
  (`documentosPDF/...`, `carnet/...`, etc.) siempre que las carpetas
  estén junto al archivo.
- **En un hosting estático** (GitHub Pages, Netlify, un servidor propio,
  etc.): sube la carpeta `expediente-di/` completa, respetando la
  estructura de subcarpetas. No requiere backend ni build step.

## Publicar en GitHub — que se vea el logo y una descripción

Al subir esto a GitHub hay **dos vistas previas distintas** que puedes
configurar:

### 1. Descripción del repositorio (campo "Description")

En la página del repositorio, botón ⚙️ junto a "About" → pega esta
descripción (315/350 caracteres):

> Expediente digital del becario para la Dirección de Integración (UGB) — Programa de Continuidad Académica y Técnica. Sitio de una sola página en HTML, CSS y JS puro (sin frameworks) que muestra los datos del becario, su carnet y los documentos oficiales en PDF de forma ordenada y con panel lateral redimensionable.

### 2. Imagen social del repositorio ("Social preview")

En **Settings → General → Social preview** del repositorio, sube la
imagen `logos/social-preview.png` (ya viene en el tamaño que
recomienda GitHub: 1280×640 px, con el logo de la Dirección de
Integración). Esa es la imagen que se muestra cuando alguien comparte
el enlace del repositorio en Slack, WhatsApp, Twitter/X, Discord, etc.

### 3. Si además publicas el sitio con GitHub Pages

El `index.html` ya trae las etiquetas Open Graph/Twitter Card
necesarias para que el **sitio publicado** (no el repositorio) también
muestre el logo y la descripción al compartirse. Solo falta un paso:
una vez tengas la URL de GitHub Pages, reemplaza en el `<head>` del
`index.html` la ruta relativa `logos/social-preview.png` por la URL
completa, por ejemplo:

```
https://tu-usuario.github.io/tu-repositorio/logos/social-preview.png
```

(Busca `og:image` y `twitter:image` dentro del `<head>` — están juntas
y comentadas.)

## Cómo agregar o cambiar documentos

Todo el contenido editable está comentado dentro de `index.html`, en
el bloque `<script>`, en las secciones marcadas como:

- **A. DATOS DEL BECARIO** — nombre, carrera, código, etc.
- **B. RESPONSABLES DEL BECARIO** — contacto familiar, técnico UBE, DI.
- **C. DOCUMENTOS DEL EXPEDIENTE** — el arreglo `documentos`.

Para agregar un PDF nuevo: colócalo dentro de `documentosPDF/` y
agrega una entrada en el arreglo `documentos` (hay un ejemplo comentado
en el propio archivo, justo debajo de la lista actual).

Para reemplazar el carnet: sustituye `carnet/carnet-frente.png` y
`carnet/carnet-reverso.png` por los archivos nuevos, manteniendo esos
mismos nombres (o, si cambian de nombre, actualiza el atributo `src`
de las etiquetas `<img id="carnet-frente-img">` y
`<img id="carnet-reverso-img">` en el HTML).
