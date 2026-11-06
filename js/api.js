/* Cliente de la API (Google Apps Script) + servidor de demostración local. */
(function () {
  const CFG = window.ENSMA_CONFIG;
  const E = window.ESQUEMA;
  const DEMO = !CFG.API_URL;
  const LS = 'ensma_demo_v2';

  /* ------------------------------ API real ------------------------------ */
  async function llamar(accion, datos) {
    const cuerpo = Object.assign({ accion: accion, token: Sesion.token() }, datos || {});
    if (DEMO) {
      await new Promise(r => setTimeout(r, 120));
      return Demo.atender(JSON.parse(JSON.stringify(cuerpo)));
    }
    let res;
    try {
      res = await fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo) });
    } catch (e) {
      throw new Error('No hay conexión con el servidor. Verifique su internet.');
    }
    const j = await res.json();
    if (!j.ok) {
      if (j.codigo === 'SESION') Sesion.cerrarLocal();
      throw new Error(j.error || 'Error desconocido');
    }
    return j;
  }

  /* ------------------------------ Sesión ------------------------------ */
  const Sesion = {
    token() { try { return sessionStorage.getItem('ensma_token') || ''; } catch (e) { return ''; } },
    usuario() { try { return JSON.parse(sessionStorage.getItem('ensma_usuario') || 'null'); } catch (e) { return null; } },
    guardar(token, usuario) { try { sessionStorage.setItem('ensma_token', token); sessionStorage.setItem('ensma_usuario', JSON.stringify(usuario)); } catch (e) {} },
    cerrarLocal() { try { sessionStorage.removeItem('ensma_token'); sessionStorage.removeItem('ensma_usuario'); } catch (e) {} },
    puede(coleccion) {
      const u = this.usuario(); if (!u) return false;
      return u.rol === 'admin' || u.rol === E.COLECCIONES[coleccion].rol;
    }
  };

  /* ---------------------- Servidor de DEMOSTRACIÓN ---------------------- */
  const Demo = {
    db: null,
    cargar() {
      if (this.db) return this.db;
      try { this.db = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) { this.db = null; }
      if (!this.db) { this.db = semilla(); this.persistir(); }
      return this.db;
    },
    persistir() { try { localStorage.setItem(LS, JSON.stringify(this.db)); } catch (e) {} },
    reiniciar() { this.db = semilla(); this.persistir(); },
    tokens: {},
    atender(req) {
      const db = this.cargar();
      const r = (obj) => Object.assign({ ok: true }, obj || {});
      const a = req.accion;
      const col = req.coleccion;
      const cdef = col && E.COLECCIONES[col];
      const ahora = () => fechaLocal(new Date());
      const bit = (ses, accion, codigo, desc, det) => db.historial.push({ fecha: ahora(), usuario: ses.usuario, accion, coleccion: col || 'usuarios', codigo: codigo || '', descripcion: desc || '', detalle: det || '' });
      const motivo = (m) => { m = String(m || '').trim(); if (m.length < 10) throw new Error('Debe describir el motivo (mínimo 10 caracteres).'); return m; };

      if (a === 'resumen') return r({ resumen: resumenDe(db) });
      if (a === 'listar') {
        const ocultos = ['registradoPor', 'actualizadoPor', 'bajaPor', 'motivoBaja', 'serial', 'responsable'];
        return r({ registros: db[col].filter(x => x.situacion !== 'De baja').map(x => { const c = Object.assign({}, x); ocultos.forEach(k => delete c[k]); return c; }) });
      }
      if (a === 'registrarConsulta') {
        db.consultas.push({ fecha: ahora(), tipo: req.tipo, nombre: req.nombre || '', grado: req.grado || '', area: req.area || '', servicio: req.servicio, termino: req.termino || '', filtros: req.filtros || '', resultados: String(req.resultados || 0) });
        this.persistir(); return r();
      }
      if (a === 'login') {
        const u = db.usuarios.find(x => x.usuario === String(req.usuario || '').toLowerCase().trim());
        if (!u || u.activo !== 'SI' || u.clave !== req.clave) throw new Error('Usuario o contraseña incorrectos.');
        const token = 'demo-' + Math.random().toString(36).slice(2);
        const datos = { usuario: u.usuario, nombre: u.nombre, rol: u.rol, correo: u.correo };
        u.ultimoIngreso = ahora(); this.persistir();
        try { sessionStorage.setItem('ensma_demo_tok_' + token, JSON.stringify(datos)); } catch (e) {}
        return r({ token, usuario: datos });
      }
      if (a === 'solicitarCuenta') {
        if (!req.nombre || !req.correo || !req.usuario) throw new Error('Complete nombre, correo y usuario.');
        db.solicitudes.push({ id: uid(), fecha: ahora(), nombre: req.nombre, correo: req.correo, usuario: String(req.usuario).toLowerCase(), rolSolicitado: req.rol || 'directivo', cargo: req.cargo || '', estado: 'Pendiente', atendidaPor: '' });
        this.persistir(); return r({ mensaje: 'Solicitud enviada. El administrador la revisará.' });
      }

      let ses = null;
      try { ses = JSON.parse(sessionStorage.getItem('ensma_demo_tok_' + req.token) || 'null'); } catch (e) {}
      if (!ses) { Sesion.cerrarLocal(); throw new Error('Sesión expirada. Inicie sesión nuevamente.'); }
      const puede = () => ses.rol === 'admin' || (cdef && ses.rol === cdef.rol);
      const exigir = (lectura) => { if (!cdef) throw new Error('Colección no válida.'); if (!puede() && !(lectura && ses.rol === 'directivo')) throw new Error('No tiene permisos para gestionar esta sección.'); };
      const admin = () => { if (ses.rol !== 'admin') throw new Error('Solo el administrador puede realizar esta acción.'); };
      const buscar = (id) => { const x = db[col].find(z => z.id === id); if (!x) throw new Error('El registro no existe.'); return x; };
      const validar = (x) => {
        const req2 = cdef.campos.filter(f => f.req && !String(x[f.k] || '').trim()).map(f => f.l);
        if (req2.length) throw new Error('Campos obligatorios vacíos: ' + req2.join(', '));
      };
      const siguiente = () => { let max = 0; db[col].forEach(z => { const m = String(z.codigo).match(new RegExp('^' + cdef.prefijo + '-(\\d+)$')); if (m) max = Math.max(max, +m[1]); }); return cdef.prefijo + '-' + String(max + 1).padStart(4, '0'); };
      const limpio = (e) => { const x = {}; cdef.campos.forEach(f => x[f.k] = String(e[f.k] == null ? '' : e[f.k]).trim()); return x; };

      switch (a) {
        case 'logout': return r();
        case 'listarCompleto': exigir(true); return r({ registros: db[col] });
        case 'guardar': {
          exigir(); const x = limpio(req.registro); validar(x);
          if (x.codigo && db[col].some(z => z.codigo.toLowerCase() === x.codigo.toLowerCase() && z.id !== req.registro.id)) throw new Error('Ya existe un registro con el código ' + x.codigo + '.');
          if (req.registro.id) {
            const act = buscar(req.registro.id); Object.assign(act, x, { codigo: x.codigo || act.codigo, fechaActualizacion: ahora(), actualizadoPor: ses.usuario });
            bit(ses, 'Editar', act.codigo, 'Actualización de registro'); this.persistir(); return r({ registro: act });
          }
          if (!x.codigo) x.codigo = siguiente();
          const n = Object.assign({ id: uid() }, x, { fechaRegistro: ahora(), registradoPor: ses.usuario }, cdef.baja ? { situacion: 'Activo' } : {});
          db[col].push(n); bit(ses, 'Agregar', n.codigo, 'Nuevo registro'); this.persistir(); return r({ registro: n });
        }
        case 'importar': {
          exigir(); let ins = 0, act = 0; const errores = [];
          (req.registros || []).forEach((e, i) => {
            try {
              const x = limpio(e); validar(x);
              const ex = x.codigo && db[col].find(z => z.codigo.toLowerCase() === x.codigo.toLowerCase());
              if (ex) { Object.keys(x).forEach(k => { if (x[k] === '') delete x[k]; }); Object.assign(ex, x, { fechaActualizacion: ahora(), actualizadoPor: ses.usuario }); act++; return; }
              if (!x.codigo) x.codigo = siguiente();
              db[col].push(Object.assign({ id: uid() }, x, { fechaRegistro: ahora(), registradoPor: ses.usuario }, cdef.baja ? { situacion: 'Activo' } : {})); ins++;
            } catch (err) { errores.push({ fila: e._filaExcel || i + 2, error: err.message }); }
          });
          bit(ses, 'Carga masiva', '', ins + ' nuevos, ' + act + ' actualizados, ' + errores.length + ' con error');
          this.persistir(); return r({ insertados: ins, actualizados: act, errores });
        }
        case 'eliminar': {
          exigir(); const m = motivo(req.motivo); const x = buscar(req.id);
          db[col] = db[col].filter(z => z.id !== req.id); bit(ses, 'Eliminar', x.codigo, m, JSON.stringify(x)); this.persistir(); return r();
        }
        case 'darDeBaja': {
          exigir(); const m = motivo(req.motivo); const x = buscar(req.id);
          if (x.situacion === 'De baja') throw new Error('El elemento ya está dado de baja.');
          Object.assign(x, { situacion: 'De baja', fechaBaja: req.fecha || ahora().slice(0, 10), motivoBaja: m, bajaPor: ses.usuario });
          bit(ses, 'Dar de baja', x.codigo, m); this.persistir(); return r({ registro: x });
        }
        case 'reactivar': {
          exigir(); const m = motivo(req.motivo); const x = buscar(req.id);
          Object.assign(x, { situacion: 'Activo', fechaBaja: '', motivoBaja: '', bajaPor: '', fechaActualizacion: ahora(), actualizadoPor: ses.usuario });
          bit(ses, 'Reactivar', x.codigo, m); this.persistir(); return r({ registro: x });
        }
        case 'historial': {
          const reg = db.historial.filter(h => (!col || h.coleccion === col) && (ses.rol === 'admin' || ses.rol === 'directivo' || (E.COLECCIONES[h.coleccion] && E.COLECCIONES[h.coleccion].rol === ses.rol)));
          return r({ registros: reg.slice().reverse().slice(0, 500) });
        }
        case 'dashboard': return r({ consultas: db.consultas });
        case 'cambiarClave': {
          const u = db.usuarios.find(x => x.usuario === ses.usuario);
          if (u.clave !== req.actual) throw new Error('La contraseña actual no es correcta.');
          if (String(req.nueva || '').length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
          u.clave = req.nueva; this.persistir(); return r();
        }
        case 'usuarios': admin(); return r({ usuarios: db.usuarios.map(u => { const c = Object.assign({}, u); delete c.clave; return c; }), solicitudes: db.solicitudes });
        case 'guardarUsuario': {
          admin(); const d = req.datos || {}; const usr = String(d.usuario || '').toLowerCase().trim();
          if (!/^[a-z0-9._-]{3,60}$/.test(usr)) throw new Error('Usuario inválido (3+ caracteres: letras, números, punto, guion).');
          const u = db.usuarios.find(x => x.usuario === usr);
          if (u && d.nuevo) throw new Error('El usuario ya existe.');
          if (d.clave && d.clave.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
          if (u) {
            if (u.usuario === ses.usuario && (d.rol !== 'admin' || d.activo === 'NO')) throw new Error('No puede quitarse su propio rol de administrador.');
            Object.assign(u, { nombre: d.nombre || u.nombre, correo: d.correo || '', rol: d.rol, activo: d.activo === 'NO' ? 'NO' : 'SI' }); if (d.clave) u.clave = d.clave;
          } else {
            if (!d.clave) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
            db.usuarios.push({ usuario: usr, nombre: d.nombre, correo: d.correo || '', rol: d.rol, clave: d.clave, activo: 'SI', fechaCreacion: ahora(), ultimoIngreso: '' });
          }
          bit(ses, u ? 'Editar usuario' : 'Crear usuario', usr, 'Rol: ' + d.rol); this.persistir(); return r();
        }
        case 'eliminarUsuario': {
          admin(); if (req.usuarioId === ses.usuario) throw new Error('No puede eliminar su propia cuenta.');
          db.usuarios = db.usuarios.filter(u => u.usuario !== req.usuarioId); bit(ses, 'Eliminar usuario', req.usuarioId, ''); this.persistir(); return r();
        }
        case 'atenderSolicitud': {
          admin(); const s = db.solicitudes.find(x => x.id === req.id); if (!s) throw new Error('Solicitud no encontrada.');
          if (req.decision === 'aprobar') {
            if (!req.clave || req.clave.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
            if (db.usuarios.some(u => u.usuario === s.usuario)) throw new Error('El usuario ya existe.');
            db.usuarios.push({ usuario: s.usuario, nombre: s.nombre, correo: s.correo, rol: req.rol || s.rolSolicitado, clave: req.clave, activo: 'SI', fechaCreacion: ahora(), ultimoIngreso: '' });
            s.estado = 'Aprobada';
          } else s.estado = 'Rechazada';
          s.atendidaPor = ses.usuario; this.persistir(); return r();
        }
      }
      throw new Error('Acción no reconocida: ' + a);
    }
  };

  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function fechaLocal(d) {
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function resumenDe(db) {
    const act = a => a.filter(x => x.situacion !== 'De baja');
    const suma = (a, k) => a.reduce((s, x) => s + (Number(x[k]) || 0), 0);
    return {
      librosTitulos: db.libros.length, librosEjemplares: suma(db.libros, 'ejemplares'), repositorios: db.repositorios.length,
      tecnologicos: suma(act(db.tecnologicos), 'cantidad'), tecnologicosRegistros: act(db.tecnologicos).length, tecnologicosBaja: db.tecnologicos.length - act(db.tecnologicos).length,
      didacticos: suma(act(db.didacticos), 'cantidad'), didacticosRegistros: act(db.didacticos).length, didacticosBaja: db.didacticos.length - act(db.didacticos).length,
      actualizado: fechaLocal(new Date())
    };
  }

  /* Datos de ejemplo para el modo demostración (ficticios). */
  function semilla() {
    const hoy = new Date();
    const f = (dias) => fechaLocal(new Date(hoy.getTime() - dias * 864e5));
    const base = (col, arr, campos) => arr.map((v, i) => {
      const o = { id: uid() + i, codigo: E.COLECCIONES[col].prefijo + '-' + String(i + 1).padStart(4, '0') };
      campos.forEach((k, j) => o[k] = v[j] === undefined ? '' : String(v[j]));
      o.fechaRegistro = f(60 - i); o.registradoPor = 'admin';
      if (E.COLECCIONES[col].baja) o.situacion = 'Activo';
      return o;
    });
    const libros = base('libros', [
      ['Cien años de soledad', 'Gabriel García Márquez', 'Sudamericana', 1967, 'Óptimo', 'Lenguaje y Literatura', 'Literatura', 6, 'Estante L-1', 'Disponible'],
      ['María', 'Jorge Isaacs', 'Panamericana', 2015, 'Regular', 'Lenguaje y Literatura', 'Literatura', 10, 'Estante L-1', 'Disponible'],
      ['Matemáticas 9 – Los Caminos del Saber', 'Equipo editorial Santillana', 'Santillana', 2019, 'Óptimo', 'Matemáticas', 'Texto escolar', 25, 'Estante M-2', 'Disponible'],
      ['Trigonometría y geometría analítica', 'Earl W. Swokowski', 'Cengage', 2011, 'Regular', 'Matemáticas', 'Libro de consulta', 4, 'Estante M-3', 'Prestado'],
      ['Pedagogía de la autonomía', 'Paulo Freire', 'Siglo XXI', 2004, 'Óptimo', 'Pedagogía y Educación', 'Libro de consulta', 3, 'Estante P-1', 'Disponible'],
      ['Didáctica magna', 'Juan Amós Comenio', 'Porrúa', 2000, 'Malo', 'Pedagogía y Educación', 'Libro de consulta', 2, 'Estante P-1', 'Disponible'],
      ['El principito', 'Antoine de Saint-Exupéry', 'Salamandra', 2008, 'Óptimo', 'Literatura infantil', 'Literatura', 12, 'Estante I-1', 'Disponible'],
      ['Ciencias Naturales 7', 'Equipo editorial Norma', 'Norma', 2018, 'Óptimo', 'Ciencias Naturales', 'Texto escolar', 20, 'Estante C-1', 'Disponible'],
      ['Historia de Colombia y sus oligarquías', 'Antonio Caballero', 'Planeta', 2018, 'Regular', 'Ciencias Sociales', 'Libro de consulta', 2, 'Estante S-2', 'Disponible'],
      ['Diccionario de la lengua española', 'Real Academia Española', 'Espasa', 2014, 'Óptimo', 'Referencia general', 'Enciclopedia / Diccionario', 5, 'Referencia', 'Disponible'],
      ['English Please! 10', 'Ministerio de Educación Nacional', 'MEN', 2016, 'Óptimo', 'Inglés', 'Texto escolar', 30, 'Estante IN-1', 'Disponible'],
      ['Psicología del niño', 'Jean Piaget, Bärbel Inhelder', 'Morata', 2015, 'Malo', 'Pedagogía y Educación', 'Libro de consulta', 3, 'Estante P-2', 'En reparación']
    ], ['titulo', 'autor', 'editorial', 'anio', 'estado', 'area', 'tipo', 'ejemplares', 'ubicacion', 'disponibilidad']);
    const repositorios = base('repositorios', [
      ['El juego como estrategia para el desarrollo del pensamiento numérico en transición', 'Estudiantes PFC (ejemplo)', 'Docente asesor(a)', 2024, 'Educación matemática', 'Trabajo de grado', 'Digital'],
      ['El río Magdalena como escenario pedagógico para la educación ambiental', 'Estudiantes PFC (ejemplo)', 'Docente asesor(a)', 2024, 'Educación ambiental y territorio', 'Proyecto de investigación', 'Digital y físico'],
      ['Uso de recursos digitales para la comprensión lectora en grado tercero', 'Estudiantes PFC (ejemplo)', 'Docente asesor(a)', 2025, 'TIC y educación', 'Trabajo de grado', 'Digital'],
      ['Sistematización de la práctica pedagógica en aulas multigrado rurales', 'Estudiantes PFC (ejemplo)', 'Docente asesor(a)', 2023, 'Pedagogía y didáctica', 'Sistematización de práctica', 'Físico'],
      ['Estrategias de inclusión para estudiantes con barreras de aprendizaje', 'Estudiantes PFC (ejemplo)', 'Docente asesor(a)', 2025, 'Educación inclusiva', 'Trabajo de grado', 'Digital']
    ], ['titulo', 'autores', 'asesor', 'anio', 'linea', 'modalidad', 'formato']);
    const tecnologicos = base('tecnologicos', [
      ['Computador portátil estudiantil', 'Computador portátil', 'Lenovo', 'ThinkPad', '', 30, 'Sala de informática 1', 'Coordinación', 'MEN', 'Bueno'],
      ['Computador de escritorio', 'Computador de escritorio', 'HP', 'ProDesk 400', '', 20, 'Sala de informática 2', 'Coordinación', 'Recursos propios', 'Regular'],
      ['Tableta educativa', 'Tableta', 'Samsung', 'Galaxy Tab A', '', 40, 'Aula móvil', 'Coordinación', 'Gobernación de Cundinamarca', 'Bueno'],
      ['Video beam', 'Video beam / proyector', 'Epson', 'PowerLite', '', 6, 'Biblioteca', 'Bibliotecaria', 'Recursos propios', 'Bueno'],
      ['Televisor inteligente 55"', 'Televisor / pantalla', 'LG', '55UQ', '', 8, 'Aulas de primaria', 'Coordinación', 'Alcaldía de Girardot', 'Bueno'],
      ['Kit de robótica educativa', 'Robótica / kits STEM', 'LEGO Education', 'SPIKE Prime', '', 5, 'Sala de informática 1', 'Docente de tecnología', 'Donación', 'Bueno'],
      ['Impresora multifuncional', 'Impresora / escáner', 'Epson', 'L3250', '', 2, 'Secretaría', 'Secretaría', 'Recursos propios', 'En mantenimiento']
    ], ['nombre', 'categoria', 'marca', 'modelo', 'serial', 'cantidad', 'ubicacion', 'responsable', 'fuente', 'estado']);
    const didacticos = base('didacticos', [
      ['Bloques lógicos de Dienes', 'Material manipulativo', 'Matemáticas', 'Preescolar', 15, 'Madera', 'Aula de preescolar', 'Bueno'],
      ['Regletas de Cuisenaire', 'Material manipulativo', 'Matemáticas', 'Básica primaria', 20, 'Madera', 'Laboratorio de matemáticas', 'Bueno'],
      ['Geoplano', 'Material manipulativo', 'Matemáticas', 'Básica primaria', 25, 'Plástico', 'Laboratorio de matemáticas', 'Regular'],
      ['Ábaco abierto', 'Material manipulativo', 'Matemáticas', 'Básica primaria', 18, 'Madera', 'Laboratorio de matemáticas', 'Bueno'],
      ['Microscopio óptico', 'Material de laboratorio', 'Ciencias Naturales', 'Básica secundaria', 6, 'Metal', 'Laboratorio de ciencias', 'Bueno'],
      ['Mapa físico de Colombia', 'Láminas, mapas y carteles', 'Ciencias Sociales', 'Todos los niveles', 4, 'Papel plastificado', 'Biblioteca', 'Bueno'],
      ['Flautas dulces', 'Instrumentos musicales', 'Artes', 'Básica primaria', 30, 'Plástico', 'Aula de música', 'Bueno'],
      ['Balones de baloncesto', 'Material deportivo', 'Educación Física', 'Todos los niveles', 12, 'Caucho', 'Bodega deportiva', 'Regular'],
      ['Teatrino y títeres', 'Títeres y dramatización', 'Lenguaje y Literatura', 'Preescolar', 1, 'Madera y tela', 'Aula de preescolar', 'Bueno']
    ], ['nombre', 'categoria', 'area', 'nivel', 'cantidad', 'material', 'ubicacion', 'estado']);
    // Un ejemplo dado de baja
    didacticos.push({ id: uid() + 'b', codigo: 'DID-0010', nombre: 'Tangram de cartón', categoria: 'Material manipulativo', area: 'Matemáticas', nivel: 'Básica primaria', cantidad: '10', estado: 'Malo', situacion: 'De baja', fechaBaja: f(5).slice(0, 10), motivoBaja: 'Piezas deterioradas por humedad; no son recuperables.', bajaPor: 'admin', fechaRegistro: f(200), registradoPor: 'admin' });

    // Consultas de ejemplo (últimos 45 días)
    const consultas = [];
    const terminos = { 'Bibliográficos': ['matemáticas', 'García Márquez', 'pedagogía', 'trabajo de grado', 'inclusión', 'principito', 'trigonometría', 'diccionario'], 'Tecnológicos': ['portátil', 'video beam', 'tableta', 'robótica', 'televisor'], 'Didácticos': ['regletas', 'geoplano', 'microscopio', 'títeres', 'balones', 'ábaco'] };
    const nombresE = ['Valentina R.', 'Santiago M.', 'Mariana G.', 'Juan José P.', 'Sara L.', 'Samuel C.', 'Isabella T.', 'Daniel A.'];
    const nombresD = ['Docente de Matemáticas', 'Docente de Lenguaje', 'Docente de Ciencias', 'Docente de Preescolar', 'Docente PFC'];
    let semillaN = 7;
    const rnd = () => { semillaN = (semillaN * 9301 + 49297) % 233280; return semillaN / 233280; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    for (let i = 0; i < 160; i++) {
      const p = rnd();
      const tipo = p < 0.58 ? 'Estudiante' : p < 0.88 ? 'Docente' : pick(['Directivo / Administrativo', 'Padre de familia', 'Visitante']);
      const servicio = pick(['Bibliográficos', 'Bibliográficos', 'Tecnológicos', 'Didácticos']);
      const d = new Date(hoy.getTime() - Math.floor(rnd() * 45) * 864e5); d.setHours(7 + Math.floor(rnd() * 10), Math.floor(rnd() * 60));
      consultas.push({ fecha: fechaLocal(d), tipo, nombre: tipo === 'Estudiante' ? pick(nombresE) : tipo === 'Docente' ? pick(nombresD) : '', grado: tipo === 'Estudiante' ? pick(E.GRADOS) : '', area: tipo === 'Docente' ? pick(['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Preescolar', 'Pedagogía y Educación']) : '', servicio, termino: pick(terminos[servicio]), filtros: '', resultados: String(1 + Math.floor(rnd() * 8)) });
    }
    consultas.sort((a, b) => a.fecha.localeCompare(b.fecha));

    return {
      libros, repositorios, tecnologicos, didacticos, consultas,
      historial: [{ fecha: f(5), usuario: 'admin', accion: 'Dar de baja', coleccion: 'didacticos', codigo: 'DID-0010', descripcion: 'Piezas deterioradas por humedad; no son recuperables.', detalle: '' }],
      usuarios: [
        { usuario: 'admin', nombre: 'Administrador (demo)', correo: '', rol: 'admin', clave: 'admin2026', activo: 'SI', fechaCreacion: f(90), ultimoIngreso: '' },
        { usuario: 'biblioteca', nombre: 'Bibliotecaria (demo)', correo: '', rol: 'biblioteca', clave: 'biblio2026', activo: 'SI', fechaCreacion: f(90), ultimoIngreso: '' },
        { usuario: 'tecnologia', nombre: 'Encargado tecnológico (demo)', correo: '', rol: 'tecnologia', clave: 'tecno2026', activo: 'SI', fechaCreacion: f(90), ultimoIngreso: '' },
        { usuario: 'didactica', nombre: 'Encargada didáctica (demo)', correo: '', rol: 'didactica', clave: 'didac2026', activo: 'SI', fechaCreacion: f(90), ultimoIngreso: '' }
      ],
      solicitudes: []
    };
  }

  window.API = { llamar, Sesion, DEMO, Demo };
})();
