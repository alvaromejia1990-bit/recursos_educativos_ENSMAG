/* Plantillas, carga masiva y reportes en Excel (SheetJS). */
(function () {
  const E = window.ESQUEMA;
  const CFG = window.ENSMA_CONFIG;

  function disponible() {
    if (!window.XLSX) throw new Error('No se pudo cargar la librería de Excel. Verifique su conexión a internet.');
  }
  const hoy = () => new Date().toISOString().slice(0, 10);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[*()º°.]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  const anchos = (filas) => {
    const n = Math.max(...filas.map(f => f.length));
    const w = [];
    for (let c = 0; c < n; c++) w.push({ wch: Math.min(60, Math.max(10, ...filas.map(f => String(f[c] == null ? '' : f[c]).length + 2))) });
    return w;
  };
  function hojaDe(filas) { const ws = XLSX.utils.aoa_to_sheet(filas); ws['!cols'] = anchos(filas); return ws; }

  /* -------- Plantilla -------- */
  function plantilla(col) {
    disponible();
    const c = E.COLECCIONES[col];
    const wb = XLSX.utils.book_new();
    const cab = c.campos.map(f => f.l + (f.req ? ' *' : ''));
    const ws = XLSX.utils.aoa_to_sheet([cab]);
    ws['!cols'] = c.campos.map(f => ({ wch: Math.max(16, f.l.length + 4, f.t === 'textarea' ? 40 : 0) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
    const inst = [
      [CFG.INSTITUCION + ' — Plantilla de carga masiva: ' + c.nombre],
      ['Diligencie la hoja "Plantilla" desde la fila 2. No cambie los encabezados. Los campos con * son obligatorios.'],
      ['Si el CÓDIGO coincide con uno existente, el registro se ACTUALIZA; si se deja vacío, el sistema lo asigna automáticamente.'],
      [],
      ['Columna', 'Obligatorio', 'Tipo', 'Valores permitidos / formato']
    ];
    c.campos.forEach(f => inst.push([f.l, f.req ? 'Sí' : 'No',
      { text: 'Texto', textarea: 'Texto largo', number: 'Número', date: 'Fecha', select: 'Lista', url: 'Enlace web' }[f.t] || 'Texto',
      f.op ? f.op.join(' | ') : f.t === 'date' ? 'AAAA-MM-DD' : f.t === 'number' ? 'Número entero' : (f.ph || '')]));
    const wi = hojaDe(inst); wi['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wi, 'Instrucciones');
    XLSX.writeFile(wb, 'Plantilla_' + c.nombre.replace(/\s+/g, '_') + '_ENSMA.xlsx');
  }

  /* -------- Lectura de carga masiva -------- */
  function fechaTexto(v) {
    if (v instanceof Date) { const d = new Date(v.getTime() - v.getTimezoneOffset() * 60000); return d.toISOString().slice(0, 10); }
    return String(v).trim();
  }
  async function leerCarga(col, archivo) {
    disponible();
    const c = E.COLECCIONES[col];
    const buf = await archivo.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const nombreHoja = wb.SheetNames.find(n => norm(n) === 'plantilla') || wb.SheetNames[0];
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja], { header: 1, defval: '', raw: true });
    if (!filas.length) throw new Error('El archivo está vacío.');
    const cab = filas[0].map(norm);
    const mapa = {};
    c.campos.forEach(f => {
      const i = cab.findIndex(h => h === norm(f.l) || h === norm(f.k));
      if (i >= 0) mapa[f.k] = i;
    });
    const faltantes = c.campos.filter(f => f.req && mapa[f.k] === undefined).map(f => f.l);
    if (faltantes.length) throw new Error('El archivo no tiene las columnas obligatorias: ' + faltantes.join(', ') + '. Use la plantilla oficial.');
    const registros = [], errores = [];
    filas.slice(1).forEach((fila, idx) => {
      if (!fila.some(v => String(v).trim() !== '')) return;
      const nFila = idx + 2;
      const r = { _filaExcel: nFila };
      const errs = [];
      c.campos.forEach(f => {
        if (mapa[f.k] === undefined) return;
        let v = fila[mapa[f.k]];
        if (f.t === 'date') v = v === '' ? '' : fechaTexto(v);
        else v = v instanceof Date ? fechaTexto(v) : String(v).trim();
        if (f.req && !v) errs.push(f.l + ' es obligatorio');
        if (v && f.t === 'number' && !(Number(String(v).replace(',', '.')) >= 0)) errs.push(f.l + ' debe ser numérico');
        if (v && f.op) {
          const ok = f.op.find(o => norm(o) === norm(v));
          if (ok) v = ok; else errs.push(f.l + ': "' + v + '" no es un valor permitido');
        }
        r[f.k] = v;
      });
      if (errs.length) errores.push({ fila: nFila, error: errs.join('; ') });
      else registros.push(r);
    });
    return { registros, errores, hoja: nombreHoja };
  }

  /* -------- Reportes -------- */
  function contarPor(arr, k, peso) {
    const m = {};
    arr.forEach(r => { const key = r[k] || 'Sin especificar'; m[key] = (m[key] || 0) + (peso ? (Number(r[peso]) || 0) : 1); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  function reporte(col, registros) {
    disponible();
    const c = E.COLECCIONES[col];
    const wb = XLSX.utils.book_new();
    const activos = c.baja ? registros.filter(r => r.situacion !== 'De baja') : registros;
    const bajas = c.baja ? registros.filter(r => r.situacion === 'De baja') : [];
    const sis = E.CAMPOS_SISTEMA.filter(s => c.baja || !['situacion', 'fechaBaja', 'motivoBaja', 'bajaPor'].includes(s.k));
    const sisInv = sis.filter(s => !['fechaBaja', 'motivoBaja', 'bajaPor'].includes(s.k));
    const tabla = (lista, extra) => [c.campos.map(f => f.l).concat(extra.map(s => s.l))]
      .concat(lista.map(r => c.campos.map(f => f.t === 'number' && r[f.k] !== '' && r[f.k] != null ? Number(r[f.k]) : (r[f.k] || '')).concat(extra.map(s => r[s.k] || ''))));

    const resumen = [
      [CFG.INSTITUCION.toUpperCase()],
      [CFG.CIUDAD],
      ['Reporte de inventario: ' + c.nombre],
      ['Fecha de generación', new Date().toLocaleString('es-CO')],
      [],
      ['Indicador', 'Valor'],
      ['Registros activos', activos.length]
    ];
    if (c.cantidad) resumen.push([(col === 'libros' || col === 'librosPFC') ? 'Total de ejemplares' : 'Total de unidades', activos.reduce((s, r) => s + (Number(r[c.cantidad]) || 0), 0)]);
    if (c.baja) resumen.push(['Registros dados de baja', bajas.length]);
    const agrupador = (col === 'libros' || col === 'librosPFC') ? 'area' : col === 'repositorios' ? 'linea' : 'categoria';
    const etAg = c.campos.find(f => f.k === agrupador).l;
    resumen.push([], ['Distribución por ' + etAg.toLowerCase(), c.cantidad ? 'Unidades' : 'Registros']);
    contarPor(activos, agrupador, c.cantidad).forEach(p => resumen.push(p));
    if (c.campos.find(f => f.k === 'estado')) {
      resumen.push([], ['Distribución por estado', 'Registros']);
      contarPor(activos, 'estado').forEach(p => resumen.push(p));
    }
    const wr = hojaDe(resumen); wr['!cols'] = [{ wch: 42 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(wb, wr, 'Resumen');
    XLSX.utils.book_append_sheet(wb, hojaDe(tabla(activos, sisInv)), c.baja ? 'Inventario activo' : 'Inventario');
    if (c.baja) XLSX.utils.book_append_sheet(wb, hojaDe(tabla(bajas, sis.filter(s => s.k !== 'situacion'))), 'Dados de baja');
    XLSX.writeFile(wb, 'Reporte_' + c.nombre.replace(/\s+/g, '_') + '_ENSMA_' + hoy() + '.xlsx');
  }

  function reporteConsultas(consultas, etiquetaRango) {
    disponible();
    const wb = XLSX.utils.book_new();
    const porTipo = contarPor(consultas, 'tipo');
    const resumen = [[CFG.INSTITUCION.toUpperCase()], ['Registro de consultas de recursos'], ['Periodo', etiquetaRango], ['Generado', new Date().toLocaleString('es-CO')], [],
      ['Tipo de usuario', 'Consultas']].concat(porTipo, [[], ['Servicio', 'Consultas']], contarPor(consultas, 'servicio'),
      [[], ['Grado (estudiantes)', 'Consultas']], contarPor(consultas.filter(c => c.tipo === 'Estudiante'), 'grado'),
      [[], ['Área (docentes)', 'Consultas']], contarPor(consultas.filter(c => c.tipo === 'Docente'), 'area'));
    const wr = hojaDe(resumen); wr['!cols'] = [{ wch: 34 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, wr, 'Resumen');
    const cab = ['Fecha', 'Tipo de usuario', 'Nombre', 'Grado', 'Área', 'Servicio', 'Término buscado', 'Filtros', 'Resultados'];
    const filas = consultas.map(c => [c.fecha.replace('T', ' '), c.tipo, c.nombre, c.grado, c.area, c.servicio, c.termino, c.filtros, Number(c.resultados) || 0]);
    XLSX.utils.book_append_sheet(wb, hojaDe([cab].concat(filas.filter((f, i) => consultas[i].tipo === 'Estudiante'))), 'Estudiantes');
    XLSX.utils.book_append_sheet(wb, hojaDe([cab].concat(filas.filter((f, i) => consultas[i].tipo === 'Docente'))), 'Docentes');
    XLSX.utils.book_append_sheet(wb, hojaDe([cab].concat(filas)), 'Todas las consultas');
    XLSX.writeFile(wb, 'Consultas_Recursos_ENSMA_' + hoy() + '.xlsx');
  }

  window.Excel = { plantilla, leerCarga, reporte, reporteConsultas };
})();
