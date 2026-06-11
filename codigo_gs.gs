// ============================================================
// UGB Pénsum — Google Apps Script  v4
// Multi-usuario: cualquier dispositivo ve todos los usuarios
// ============================================================

function doPost(e) {
  try {
    const payload     = JSON.parse(e.postData.contents);
    const student     = payload.student     || 'Sin nombre';
    const data        = payload.data        || [];
    const events      = payload.events      || [];
    const cyclesDone  = payload.cyclesDone  || {};
    const asistencias = payload.asistencias || {};

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── REGISTRAR ESTUDIANTE EN LA LISTA GLOBAL ──────────
    _registrarEstudiante(ss, student);

    // ── 1. NOTAS ─────────────────────────────────────────
    const shNotas = _getOrCreate(ss, 'Notas_' + student);
    shNotas.clearContents();
    const hNotas = ['#','Código','Materia','Ciclo','Año','UV',
      'L1-C1','L2-C1','P-C1','Cómputo1',
      'L1-C2','L2-C2','P-C2','Cómputo2',
      'L1-C3','L2-C3','P-C3','Cómputo3',
      'Nota Final','Estado'];
    shNotas.appendRow(hNotas);
    _styleHeader(shNotas, hNotas.length, '#1e40af');
    if (data.length > 0) {
      const rows = data.map(r => [
        r.num, r.code, r.name, r.cycle, r.year, r.uv,
        _num(r.lab1_c1),_num(r.lab2_c1),_num(r.parcial_c1),_num(r.computo1),
        _num(r.lab1_c2),_num(r.lab2_c2),_num(r.parcial_c2),_num(r.computo2),
        _num(r.lab1_c3),_num(r.lab2_c3),_num(r.parcial_c3),_num(r.computo3),
        _num(r.finalGrade), r.status
      ]);
      shNotas.getRange(2,1,rows.length,hNotas.length).setValues(rows);
      rows.forEach((row,i) => {
        const bg = {pass:'#d1fae5',fail:'#fee2e2',inprogress:'#fef3c7'}[row[19]] || '#fff';
        shNotas.getRange(i+2,1,1,hNotas.length).setBackground(bg);
      });
    }
    shNotas.autoResizeColumns(1, hNotas.length);

    // ── 2. CALENDARIO ────────────────────────────────────
    const shCal = _getOrCreate(ss, 'Calendario_' + student);
    shCal.clearContents();
    const hCal = ['Fecha','Tipo','Materia','Comentario','Hecho','Nota'];
    shCal.appendRow(hCal);
    _styleHeader(shCal, hCal.length, '#b45309');
    if (events.length > 0) {
      shCal.getRange(2,1,events.length,hCal.length).setValues(
        events.map(ev => [ev.date, ev.type, ev.subject||'', ev.comment||'',
                          ev.done?'SÍ':'NO', ev.nota!==undefined?ev.nota:''])
      );
    }
    shCal.autoResizeColumns(1, hCal.length);

    // ── 3. CICLOS FINALIZADOS ─────────────────────────────
    const shDone = _getOrCreate(ss, 'CiclosDone_' + student);
    shDone.clearContents();
    shDone.appendRow(['CicloId','Finalizado','Actualizado']);
    _styleHeader(shDone, 3, '#047857');
    const doneKeys = Object.keys(cyclesDone);
    if (doneKeys.length > 0) {
      const now = new Date().toISOString();
      shDone.getRange(2,1,doneKeys.length,3).setValues(
        doneKeys.map(k => [k, cyclesDone[k]?'SÍ':'NO', now])
      );
    }

    // ── 4. ASISTENCIAS ────────────────────────────────────
    const shA = _getOrCreate(ss, 'Asistencias_' + student);
    shA.clearContents();
    shA.appendRow(['Fecha','Hora','Timestamp']);
    _styleHeader(shA, 3, '#1d4ed8');
    const aEntries = Object.values(asistencias).sort((a,b) => b.fecha.localeCompare(a.fecha));
    if (aEntries.length > 0) {
      shA.getRange(2,1,aEntries.length,3).setValues(
        aEntries.map(a => [a.fecha, a.hora, a.ts||''])
      );
    }

    // ── 5. RESUMEN GLOBAL ─────────────────────────────────
    _actualizarResumen(ss, student, data, cyclesDone, asistencias);

    return _json({ status:'success', message:'Guardado', ts: new Date().toISOString() });

  } catch(err) {
    return _json({ status:'error', message: err.toString() });
  }
}

// ============================================================
// doGet — Sirve HTML, datos de estudiante O lista de usuarios
// ============================================================
function doGet(e) {
  const params = e.parameter || {};
  const action  = params.action  || '';
  const student = params.student || '';

  // ── Listar todos los estudiantes (para el selector multi-usuario) ──
  // ?action=list_students
  if (action === 'list_students') {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName('Estudiantes');
    const students = [];
    if (sh && sh.getLastRow() > 1) {
      const rows = sh.getRange(2, 1, sh.getLastRow()-1, 1).getValues();
      rows.forEach(r => { if (r[0]) students.push(r[0]); });
    }
    return _json({ status:'success', students: students });
  }

  // ── Datos de un estudiante específico ──
  // ?student=NOMBRE
  if (student) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = { data:[], events:[], cyclesDone:{}, asistencias:{} };

    const shN = ss.getSheetByName('Notas_' + student);
    if (shN && shN.getLastRow() > 1) {
      result.data = shN.getRange(2,1,shN.getLastRow()-1,20).getValues()
        .filter(r => r[0])
        .map(r => ({
          num:r[0], code:r[1], name:r[2], cycle:r[3], year:r[4], uv:r[5],
          lab1_c1:r[6],  lab2_c1:r[7],  parcial_c1:r[8],
          lab1_c2:r[10], lab2_c2:r[11], parcial_c2:r[12],
          lab1_c3:r[14], lab2_c3:r[15], parcial_c3:r[16],
          finalGrade: r[18]!==''?r[18]:'', status:r[19]
        }));
    }

    const shC = ss.getSheetByName('Calendario_' + student);
    if (shC && shC.getLastRow() > 1) {
      result.events = shC.getRange(2,1,shC.getLastRow()-1,6).getValues()
        .filter(r => r[0])
        .map((r,i) => ({
          id: Date.now()+i, date:r[0], type:r[1], subject:r[2],
          comment:r[3]||'', done:r[4]==='SÍ', nota:r[5]!==''?r[5]:undefined
        }));
    }

    const shD = ss.getSheetByName('CiclosDone_' + student);
    if (shD && shD.getLastRow() > 1) {
      shD.getRange(2,1,shD.getLastRow()-1,2).getValues().forEach(r => {
        if (r[0] !== '') result.cyclesDone[r[0]] = (r[1]==='SÍ'||r[1]===true);
      });
    }

    const shA = ss.getSheetByName('Asistencias_' + student);
    if (shA && shA.getLastRow() > 1) {
      shA.getRange(2,1,shA.getLastRow()-1,3).getValues().forEach(r => {
        if (r[0]) result.asistencias[r[0]] = { fecha:r[0], hora:r[1], ts:r[2]||'' };
      });
    }

    return _json({ status:'success', payload: result });
  }

  // ── Sin parámetros → servir el HTML ──
  try {
    return HtmlService.createHtmlOutputFromFile('INDEX_FINAL')
      .setTitle('UGB — Pénsum Ing. Sistemas y Redes')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(_) {
    return _json({ status:'error', message:'Archivo INDEX_FINAL.html no encontrado.' });
  }
}

// ============================================================
// HELPERS
// ============================================================

// Registra al estudiante en la hoja "Estudiantes" (lista global)
function _registrarEstudiante(ss, name) {
  const sh = _getOrCreate(ss, 'Estudiantes');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Nombre','Fecha de registro']);
    _styleHeader(sh, 2, '#0f172a');
  }
  // Verificar si ya existe
  if (sh.getLastRow() > 1) {
    const existing = sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat();
    if (existing.includes(name)) return; // ya registrado
  }
  // Agregar nuevo estudiante
  sh.appendRow([name, new Date().toISOString()]);
}

function _actualizarResumen(ss, student, data, cyclesDone, asistencias) {
  const sh = _getOrCreate(ss, 'Resumen');
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Estudiante','Última actualización','Total','Aprobadas',
      'Reprobadas','En curso','Pendientes','Progreso','Ciclos Finalizados','Asistencias']);
    _styleHeader(sh, 10, '#1e40af');
  }
  const aprobadas  = data.filter(r=>r.status==='pass').length;
  const reprobadas = data.filter(r=>r.status==='fail').length;
  const enCurso    = data.filter(r=>r.status==='inprogress').length;
  const pendientes = data.filter(r=>r.status==='pending').length;
  const pct        = data.length > 0 ? Math.round((aprobadas/data.length)*100) : 0;
  const ciclosFin  = Object.values(cyclesDone).filter(Boolean).length;
  const totalAsist = Object.keys(asistencias).length;
  const row = [student, new Date().toISOString(), data.length, aprobadas,
               reprobadas, enCurso, pendientes, pct+'%', ciclosFin+'/10', totalAsist];

  const vals = sh.getLastRow() > 1 ? sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat() : [];
  const idx = vals.indexOf(student);
  if (idx >= 0) sh.getRange(idx+2,1,1,row.length).setValues([row]);
  else          sh.appendRow(row);
  sh.autoResizeColumns(1,10);
}

function _getOrCreate(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}
function _styleHeader(sh, cols, color) {
  sh.getRange(1,1,1,cols).setFontWeight('bold').setBackground(color).setFontColor('#fff').setFontSize(10);
}
function _num(v) {
  if (v===null||v===undefined||v==='') return '';
  const n = parseFloat(v);
  return isNaN(n) ? '' : n;
}
function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
