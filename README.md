# 📘 Archivo 1: Sistema Integrado UGB (Pénsum y Horarios)

<div style="background-color: #1e40af; color: white; padding: 15px; border-radius: 8px; text-align: center;">
  <h2>Manual de Usuario y Estructura Técnica</h2>
  <p>Ingeniería en Sistemas y Redes / Ingeniería Civil (Sede San Miguel)</p>
</div>

---

## 📑 Índice
1. [Estructura del Sistema](#1-estructura-del-sistema)
2. [Manual de Instrucciones](#2-manual-de-instrucciones)
3. [Atajos y Herramientas](#3-atajos-y-herramientas)
4. [Tabla de Estados y Colores](#4-tabla-de-estados-y-colores)

---

## 1. Estructura del Sistema

La arquitectura y flujo de ejecución del sistema web y Google Apps Script se divide lógicamente en la siguiente secuencia:

### 🔹 VARIABLES (Assignments)
Se declaran e inicializan en memoria los estados globales antes de cualquier renderizado:
* **`appData` / `S`**: Objetos centrales que almacenan el estado del estudiante actual, materias inscritas (`enrolled`), eventos y asistencias.
* **Constantes de Entorno**: Definición de `BLOQUES` de tiempo, `DIAS` de la semana y los planes de estudio (`CYCLES_SISTEMAS`, `CYCLES_CIVIL`).
* **Configuración**: Inicialización de la URL del Web App de Google Sheets y preferencias locales (zoom, tema oscuro/claro).

### 🔹 ENTRADA (Inputs/Selection)
El sistema captura las acciones y condiciones proporcionadas por el usuario:
* **Login Seguro**: Captura del nombre y la contraseña secreta, la cual es procesada inmediatamente en un hash SHA-256 localmente.
* **Selección de Contexto**: El usuario selecciona la carrera, ciclo y grupo mediante los selectores (`selCarrera`, `selCiclo`, `selGrupo`).
* **Interacción Directa**: Captura de eventos de teclado (atajos) y eventos de *drag-and-drop* para reordenar las materias del pénsum.

### 🔹 SALIDA (Outputs)
Se muestran los resultados procesados al final del flujo:
* **Renderizado Dinámico**: Generación del grid interactivo del pénsum y la tabla visual del horario según la entrada del usuario.
* **Exportación y Reportes**: Generación de archivos PDF (comprobantes de inscripción), archivos CSV/JSON y renderizado de tickets de encuentro.
* **Sincronización en la Nube**: Envío del payload final a Google Sheets y despliegue del estado de guardado (✅ / ⚠️) en la interfaz.

---

## 2. Manual de Instrucciones

### 🔸 A. Acceso y Sincronización
1. **Seleccionar Carrera:** Al iniciar, elige entre *Ing. Sistemas y Redes* o *Ing. Civil*.
2. **Ingreso:** Escribe tu nombre y una contraseña. El sistema creará tu perfil automáticamente si es tu primera vez. 
3. **Nube:** Todas tus acciones (ingresar notas, marcar eventos) se sincronizan automáticamente con Google Sheets cada 3 segundos.

### 🔸 B. Gestión del Pénsum
1. **Modo Edición:** Haz clic en <span style="color: #3b82f6; font-weight: bold;">✏️ Editar Pénsum</span> para habilitar la función de arrastrar y soltar materias entre ciclos.
2. **Registro de Notas:** Haz clic sobre cualquier tarjeta de materia para abrir el panel de cómputos. Ingresa las notas de Laboratorios (30%) y Parciales (40%). El sistema calcula automáticamente el promedio final.
3. **Historial:** Usa los botones de **Deshacer (↩)** y **Rehacer (↪)** o accede al menú ☰ para ver el historial completo de cambios y restaurar versiones anteriores.

### 🔸 C. Gestión de Horarios y Quedar
1. **Inscripción:** Dirígete a *Inscribir materias*, selecciona tu grupo y marca las materias que cursarás.
2. **Vista de Horario:** En *Ver mi horario*, visualizarás tus clases organizadas por bloques de tiempo.
3. **Módulo "¿Dónde debo estar?":** Haz clic en el botón flotante 🕒 para que el sistema calcule tu ubicación actual según la hora real.
4. **Quedar / Tickets:** Genera un ticket de encuentro comparando tu horario con el de otro grupo para encontrar bloques libres y descárgalo como imagen.

---

## 3. Atajos y Herramientas

> 💡 **Tip de Productividad:** Usa estos comandos rápidos al hacer clic sobre una materia en el Pénsum:

* **`Ctrl + Doble Clic`**: Rellena automáticamente la materia con 6.0 en todos los cómputos.
* **`Ctrl + Shift + Clic`**: Marca una asignatura como "Especial" (fondo amarillo).
* **`Ctrl + Z` / `Ctrl + Y`**: Deshacer y Rehacer.

---

## 4. Tabla de Estados y Colores

| Estado de Materia | Indicador Visual | Acción Recomendada |
| :--- | :--- | :--- |
| **Aprobada** | <span style="color: #10b981; font-weight: bold;">🟩 Verde (#10b981)</span> | Ninguna, materia superada. |
| **Reprobada** | <span style="color: #ef4444; font-weight: bold;">🟥 Rojo (#ef4444)</span> | Programar en ciclo extraordinario. |
| **En Curso** | <span style="color: #f59e0b; font-weight: bold;">🟧 Naranja (#f59e0b)</span> | Mantener notas actualizadas. |
| **Pendiente** | <span style="color: #9ca3af; font-weight: bold;">⬜ Gris (#9ca3af)</span> | Inscribir en próximos ciclos. |
| **Especial** | <span style="background-color: rgba(245,158,11,0.18); color: #92400e; padding: 2px 5px; border-radius: 4px;">⭐ Fondo Ámbar</span> | Prestar atención a prerrequisitos. |
