/**
 * ============================================================================
 *  ENSMA · Sistema de Consulta de Recursos Institucionales
 *  Escuela Normal Superior María Auxiliadora · Girardot
 *  Backend: Google Apps Script + Google Sheets (base de datos)
 * ----------------------------------------------------------------------------
 *  INSTALACIÓN (resumen; ver README.md):
 *   1. Cree una Hoja de cálculo de Google vacía (ej. "BD Recursos ENSMA").
 *   2. Extensiones > Apps Script. Pegue este archivo como Codigo.gs.
 *   3. Cambie ADMIN_CLAVE abajo. Ejecute la función  instalar  una vez.
 *   4. Implementar > Nueva implementación > Aplicación web
 *        Ejecutar como: Yo   ·   Quién tiene acceso: Cualquier persona
 *   5. Copie la URL /exec en js/config.js (API_URL) del repositorio.
 * ============================================================================
 */

const CONFIG = {
  ADMIN_USUARIO: 'admin',
  ADMIN_CLAVE: 'Ensma2026*',        // ← CÁMBIELA antes de ejecutar instalar()
  ADMIN_NOMBRE: 'Administrador del sistema',
  ADMIN_CORREO: '',
  HORAS_SESION: 6                     // máximo 6 (límite de CacheService)
};

/** Colecciones de inventario: hoja, prefijo de código, rol que las administra. */
const COLECCIONES = {
  libros: {
    hoja: 'Libros', prefijo: 'LIB', rol: 'biblioteca', baja: false,
    campos: ['codigo', 'titulo', 'autor', 'editorial', 'anio', 'isbn', 'area', 'tipo',
             'ejemplares', 'ubicacion', 'estado', 'observaciones'],
    requeridos: ['titulo', 'autor', 'ejemplares']
  },
  repositorios: {
    hoja: 'Repositorios', prefijo: 'REP', rol: 'biblioteca', baja: false,
    campos: ['codigo', 'titulo', 'autores', 'asesor', 'anio', 'cohorte', 'linea', 'modalidad',
             'palabrasClave', 'resumen', 'enlace', 'formato', 'ubicacion'],
    requeridos: ['titulo', 'autores', 'anio']
  },
  tecnologicos: {
    hoja: 'Tecnologicos', prefijo: 'TEC', rol: 'tecnologia', baja: true,
    campos: ['codigo', 'nombre', 'categoria', 'marca', 'modelo', 'serial', 'cantidad', 'ubicacion',
             'responsable', 'fechaAdquisicion', 'fuente', 'estado', 'observaciones'],
    requeridos: ['nombre', 'categoria', 'cantidad', 'ubicacion']
  },
  didacticos: {
    hoja: 'Didacticos', prefijo: 'DID', rol: 'didactica', baja: true,
    campos: ['codigo', 'nombre', 'categoria', 'area', 'nivel', 'cantidad', 'material', 'ubicacion',
             'responsable', 'fechaAdquisicion', 'fuente', 'estado', 'observaciones'],
    requeridos: ['nombre', 'categoria', 'cantidad']
  }
};

const CAMPOS_SISTEMA = ['id', 'fechaRegistro', 'registradoPor', 'fechaActualizacion', 'actualizadoPor'];
const CAMPOS_BAJA = ['situacion', 'fechaBaja', 'motivoBaja', 'bajaPor'];
const OCULTOS_PUBLICO = ['registradoPor', 'actualizadoPor', 'bajaPor', 'motivoBaja', 'serial', 'responsable'];

const HOJAS = {
  usuarios:    { hoja: 'Usuarios',    cols: ['usuario', 'nombre', 'correo', 'rol', 'sal', 'hash', 'activo', 'fechaCreacion', 'ultimoIngreso'] },
  solicitudes: { hoja: 'Solicitudes', cols: ['id', 'fecha', 'nombre', 'correo', 'usuario', 'rolSolicitado', 'cargo', 'estado', 'atendidaPor'] },
  consultas:   { hoja: 'Consultas',   cols: ['fecha', 'tipo', 'nombre', 'grado', 'area', 'servicio', 'termino', 'filtros', 'resultados'] },
  historial:   { hoja: 'Historial',   cols: ['fecha', 'usuario', 'accion', 'coleccion', 'codigo', 'descripcion', 'detalle'] }
};

const ROLES = ['admin', 'biblioteca', 'tecnologia', 'didactica', 'directivo'];
const TIPOS_CONSULTANTE = ['Estudiante', 'Docente', 'Directivo / Administrativo', 'Padre de familia', 'Visitante'];

/* ============================================================================
 *  ENTRADA HTTP
 * ==========================================================================*/
function doGet() {
  return salida({ ok: true, app: 'ENSMA Recursos', mensaje: 'API activa. Use POST.' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return salida({ ok: false, error: 'Solicitud inválida.' });
  }
  try {
    asegurarInstalacion();
    const r = despachar(req) || {};
    r.ok = true;
    return salida(r);
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    return salida({ ok: false, error: msg, codigo: msg.indexOf('Sesión') === 0 ? 'SESION' : undefined });
  }
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function despachar(req) {
  const a = req.accion;
  // --- Públicas ---
  if (a === 'resumen') return { resumen: resumen() };
  if (a === 'listar') return { registros: listar(req.coleccion, false) };
  if (a === 'registrarConsulta') return registrarConsulta(req);
  if (a === 'login') return login(req.usuario, req.clave);
  if (a === 'solicitarCuenta') return solicitarCuenta(req);

  // --- Requieren sesión ---
  const ses = sesion(req.token);
  switch (a) {
    case 'logout': CacheService.getScriptCache().remove('t_' + req.token); return {};
    case 'yo': return { usuario: ses };
    case 'listarCompleto': exigir(ses, req.coleccion, true); return { registros: listar(req.coleccion, true) };
    case 'guardar': exigir(ses, req.coleccion); return guardar(ses, req.coleccion, req.registro);
    case 'importar': exigir(ses, req.coleccion); return importar(ses, req.coleccion, req.registros || []);
    case 'eliminar': exigir(ses, req.coleccion); return eliminar(ses, req.coleccion, req.id, req.motivo);
    case 'darDeBaja': exigir(ses, req.coleccion); return darDeBaja(ses, req.coleccion, req.id, req.motivo, req.fecha);
    case 'reactivar': exigir(ses, req.coleccion); return reactivar(ses, req.coleccion, req.id, req.motivo);
    case 'historial': return { registros: historial(ses, req.coleccion) };
    case 'dashboard': return { consultas: leer(HOJAS.consultas.hoja) };
    case 'cambiarClave': return cambiarClave(ses, req.actual, req.nueva);
    case 'usuarios': soloAdmin(ses); return { usuarios: listarUsuarios(), solicitudes: leer(HOJAS.solicitudes.hoja) };
    case 'guardarUsuario': soloAdmin(ses); return guardarUsuario(ses, req.datos || {});
    case 'eliminarUsuario': soloAdmin(ses); return eliminarUsuario(ses, req.usuarioId);
    case 'atenderSolicitud': soloAdmin(ses); return atenderSolicitud(ses, req.id, req.decision, req.rol, req.clave);
  }
  throw new Error('Acción no reconocida: ' + a);
}

/* ============================================================================
 *  INSTALACIÓN Y UTILIDADES DE HOJA
 * ==========================================================================*/
function instalar() {
  Object.keys(COLECCIONES).forEach(function (k) { hoja(COLECCIONES[k].hoja, columnasDe(k)); });
  Object.keys(HOJAS).forEach(function (k) { hoja(HOJAS[k].hoja, HOJAS[k].cols); });
  const usuarios = leer(HOJAS.usuarios.hoja);
  if (!usuarios.length) {
    const sal = Utilities.getUuid();
    agregarFilas(HOJAS.usuarios.hoja, HOJAS.usuarios.cols, [{
      usuario: CONFIG.ADMIN_USUARIO, nombre: CONFIG.ADMIN_NOMBRE, correo: CONFIG.ADMIN_CORREO,
      rol: 'admin', sal: sal, hash: hashClave(sal, CONFIG.ADMIN_CLAVE), activo: 'SI',
      fechaCreacion: ahora(), ultimoIngreso: ''
    }]);
  }
  const hojaVacia = ss().getSheetByName('Hoja 1') || ss().getSheetByName('Sheet1');
  if (hojaVacia && ss().getSheets().length > 1 && hojaVacia.getLastRow() === 0) ss().deleteSheet(hojaVacia);
  PropertiesService.getScriptProperties().setProperty('INSTALADO', 'v1');
  return 'Instalación completa. Usuario: ' + CONFIG.ADMIN_USUARIO;
}

function asegurarInstalacion() {
  if (PropertiesService.getScriptProperties().getProperty('INSTALADO') !== 'v1') instalar();
}

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function columnasDe(coleccion) {
  const c = COLECCIONES[coleccion];
  return CAMPOS_SISTEMA.slice(0, 1).concat(c.campos, c.baja ? CAMPOS_BAJA : [], CAMPOS_SISTEMA.slice(1));
}

/** Obtiene (o crea) una hoja y garantiza que tenga todas las columnas. */
function hoja(nombre, columnas) {
  let sh = ss().getSheetByName(nombre);
  if (!sh) sh = ss().insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, columnas.length).setValues([columnas])
      .setFontWeight('bold').setBackground('#1F6FB8').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  } else if (columnas) {
    const actuales = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const faltan = columnas.filter(function (c) { return actuales.indexOf(c) < 0; });
    if (faltan.length) sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  return sh;
}

function encabezados(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function texto(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'America/Bogota', "yyyy-MM-dd'T'HH:mm:ss");
  return v === null || v === undefined ? '' : String(v);
}

/** Lee una hoja completa como arreglo de objetos (todo como texto). */
function leer(nombre) {
  const sh = ss().getSheetByName(nombre);
  if (!sh || sh.getLastRow() < 2) return [];
  const datos = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  const cab = datos.shift().map(String);
  return datos.map(function (fila, i) {
    const o = {};
    cab.forEach(function (c, j) { o[c] = texto(fila[j]); });
    Object.defineProperty(o, '_fila', { value: i + 2, enumerable: false });
    return o;
  });
}

function filaDe(obj, cab) {
  return cab.map(function (c) { return obj[c] === undefined || obj[c] === null ? '' : String(obj[c]); });
}

function agregarFilas(nombre, columnas, objetos) {
  if (!objetos.length) return;
  const sh = hoja(nombre, columnas);
  const cab = encabezados(sh);
  const filas = objetos.map(function (o) { return filaDe(o, cab); });
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, cab.length).setNumberFormat('@').setValues(filas);
}

function actualizarFila(nombre, fila, obj) {
  const sh = ss().getSheetByName(nombre);
  const cab = encabezados(sh);
  sh.getRange(fila, 1, 1, cab.length).setNumberFormat('@').setValues([filaDe(obj, cab)]);
}

function ahora() { return Utilities.formatDate(new Date(), 'America/Bogota', "yyyy-MM-dd'T'HH:mm:ss"); }

function conBloqueo(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function limpiar(v, max) { return String(v === undefined || v === null ? '' : v).trim().slice(0, max || 2000); }

/* ============================================================================
 *  SESIONES Y PERMISOS
 * ==========================================================================*/
function hashClave(sal, clave) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + '|' + clave, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function login(usuario, clave) {
  usuario = limpiar(usuario, 60).toLowerCase();
  const u = leer(HOJAS.usuarios.hoja).filter(function (x) { return x.usuario.toLowerCase() === usuario; })[0];
  if (!u || u.activo !== 'SI' || hashClave(u.sal, String(clave || '')) !== u.hash) {
    Utilities.sleep(600);
    throw new Error('Usuario o contraseña incorrectos.');
  }
  const token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  const datos = { usuario: u.usuario, nombre: u.nombre, rol: u.rol, correo: u.correo };
  CacheService.getScriptCache().put('t_' + token, JSON.stringify(datos), CONFIG.HORAS_SESION * 3600);
  u.ultimoIngreso = ahora();
  actualizarFila(HOJAS.usuarios.hoja, u._fila, u);
  return { token: token, usuario: datos };
}

function sesion(token) {
  if (!token) throw new Error('Sesión requerida. Inicie sesión.');
  const cache = CacheService.getScriptCache();
  const raw = cache.get('t_' + token);
  if (!raw) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  cache.put('t_' + token, raw, CONFIG.HORAS_SESION * 3600);
  return JSON.parse(raw);
}

function puede(ses, coleccion) {
  const c = COLECCIONES[coleccion];
  if (!c) throw new Error('Colección no válida.');
  return ses.rol === 'admin' || ses.rol === c.rol;
}

function exigir(ses, coleccion, lectura) {
  if (puede(ses, coleccion)) return;
  if (lectura && ses.rol === 'directivo') return;
  throw new Error('No tiene permisos para gestionar esta sección.');
}

function soloAdmin(ses) { if (ses.rol !== 'admin') throw new Error('Solo el administrador puede realizar esta acción.'); }

/* ============================================================================
 *  INVENTARIOS
 * ==========================================================================*/
function num(v) { const n = Number(String(v).replace(',', '.')); return isFinite(n) ? n : 0; }

function resumen() {
  const libros = leer('Libros'), repos = leer('Repositorios');
  const tec = leer('Tecnologicos'), did = leer('Didacticos');
  const activos = function (arr) { return arr.filter(function (r) { return r.situacion !== 'De baja'; }); };
  const suma = function (arr, k) { return arr.reduce(function (s, r) { return s + num(r[k]); }, 0); };
  return {
    librosTitulos: libros.length,
    librosEjemplares: suma(libros, 'ejemplares'),
    repositorios: repos.length,
    tecnologicos: suma(activos(tec), 'cantidad'),
    tecnologicosRegistros: activos(tec).length,
    tecnologicosBaja: tec.length - activos(tec).length,
    didacticos: suma(activos(did), 'cantidad'),
    didacticosRegistros: activos(did).length,
    didacticosBaja: did.length - activos(did).length,
    actualizado: ahora()
  };
}

function listar(coleccion, completo) {
  const c = COLECCIONES[coleccion];
  if (!c) throw new Error('Colección no válida.');
  const regs = leer(c.hoja);
  if (completo) return regs;
  return regs.filter(function (r) { return r.situacion !== 'De baja'; }).map(function (r) {
    OCULTOS_PUBLICO.forEach(function (k) { delete r[k]; });
    return r;
  });
}

function validar(coleccion, r) {
  const c = COLECCIONES[coleccion];
  const faltan = c.requeridos.filter(function (k) { return !limpiar(r[k]); });
  if (faltan.length) throw new Error('Campos obligatorios vacíos: ' + faltan.join(', '));
  ['ejemplares', 'cantidad', 'anio'].forEach(function (k) {
    if (c.campos.indexOf(k) >= 0 && limpiar(r[k]) && !(num(r[k]) >= 0)) throw new Error('El campo ' + k + ' debe ser numérico.');
  });
}

function siguienteCodigo(coleccion, existentes) {
  const p = COLECCIONES[coleccion].prefijo + '-';
  let max = 0;
  existentes.forEach(function (r) {
    if (String(r.codigo).indexOf(p) === 0) { const n = parseInt(String(r.codigo).slice(p.length), 10); if (n > max) max = n; }
  });
  return function () { max++; return p + ('000' + max).slice(-4); };
}

function normalizar(coleccion, entrada) {
  const c = COLECCIONES[coleccion];
  const r = {};
  c.campos.forEach(function (k) { r[k] = limpiar(entrada[k], k === 'resumen' || k === 'observaciones' ? 4000 : 500); });
  return r;
}

function guardar(ses, coleccion, entrada) {
  if (!entrada) throw new Error('Sin datos.');
  const c = COLECCIONES[coleccion];
  return conBloqueo(function () {
    const regs = leer(c.hoja);
    const r = normalizar(coleccion, entrada);
    validar(coleccion, r);
    const dup = r.codigo && regs.filter(function (x) { return x.codigo.toLowerCase() === r.codigo.toLowerCase() && x.id !== entrada.id; })[0];
    if (dup) throw new Error('Ya existe un registro con el código ' + r.codigo + '.');

    if (entrada.id) {
      const actual = regs.filter(function (x) { return x.id === entrada.id; })[0];
      if (!actual) throw new Error('El registro ya no existe.');
      const nuevo = Object.assign({}, actual, r, { fechaActualizacion: ahora(), actualizadoPor: ses.usuario });
      if (!nuevo.codigo) nuevo.codigo = actual.codigo;
      actualizarFila(c.hoja, actual._fila, nuevo);
      bitacora(ses, 'Editar', coleccion, nuevo.codigo, 'Actualización de registro', '');
      return { registro: nuevo };
    }
    if (!r.codigo) r.codigo = siguienteCodigo(coleccion, regs)();
    const nuevo = Object.assign({ id: Utilities.getUuid().slice(0, 13) }, r,
      { fechaRegistro: ahora(), registradoPor: ses.usuario, fechaActualizacion: '', actualizadoPor: '' },
      c.baja ? { situacion: 'Activo', fechaBaja: '', motivoBaja: '', bajaPor: '' } : {});
    agregarFilas(c.hoja, columnasDe(coleccion), [nuevo]);
    bitacora(ses, 'Agregar', coleccion, nuevo.codigo, 'Nuevo registro', '');
    return { registro: nuevo };
  });
}

/** Carga masiva: inserta nuevos y actualiza los que coincidan por código. */
function importar(ses, coleccion, entradas) {
  const c = COLECCIONES[coleccion];
  if (entradas.length > 3000) throw new Error('Máximo 3000 filas por lote.');
  return conBloqueo(function () {
    const regs = leer(c.hoja);
    const porCodigo = {};
    regs.forEach(function (x) { if (x.codigo) porCodigo[x.codigo.toLowerCase()] = x; });
    const sig = siguienteCodigo(coleccion, regs);
    const nuevos = [], errores = [];
    let actualizados = 0;
    entradas.forEach(function (e, i) {
      try {
        const r = normalizar(coleccion, e);
        validar(coleccion, r);
        const ex = r.codigo && porCodigo[r.codigo.toLowerCase()];
        const conDatos = {};   // las celdas vacías no borran datos existentes
        Object.keys(r).forEach(function (k) { if (r[k] !== '') conDatos[k] = r[k]; });
        if (ex && !ex._fila) { Object.assign(ex, conDatos); return; }   // repetido dentro del mismo archivo
        if (ex) {
          const upd = Object.assign({}, ex, conDatos, { fechaActualizacion: ahora(), actualizadoPor: ses.usuario });
          actualizarFila(c.hoja, ex._fila, upd);
          actualizados++;
          return;
        }
        if (!r.codigo) r.codigo = sig();
        const n = Object.assign({ id: Utilities.getUuid().slice(0, 13) }, r,
          { fechaRegistro: ahora(), registradoPor: ses.usuario },
          c.baja ? { situacion: 'Activo' } : {});
        porCodigo[r.codigo.toLowerCase()] = n;
        nuevos.push(n);
      } catch (err) {
        errores.push({ fila: (e._filaExcel || i + 2), error: err.message });
      }
    });
    agregarFilas(c.hoja, columnasDe(coleccion), nuevos);
    bitacora(ses, 'Carga masiva', coleccion, '', nuevos.length + ' nuevos, ' + actualizados + ' actualizados, ' + errores.length + ' con error', '');
    return { insertados: nuevos.length, actualizados: actualizados, errores: errores };
  });
}

function buscarPorId(coleccion, id) {
  const r = leer(COLECCIONES[coleccion].hoja).filter(function (x) { return x.id === id; })[0];
  if (!r) throw new Error('El registro no existe.');
  return r;
}

function exigirMotivo(motivo) {
  motivo = limpiar(motivo, 1000);
  if (motivo.length < 10) throw new Error('Debe describir el motivo (mínimo 10 caracteres).');
  return motivo;
}

function eliminar(ses, coleccion, id, motivo) {
  motivo = exigirMotivo(motivo);
  return conBloqueo(function () {
    const r = buscarPorId(coleccion, id);
    ss().getSheetByName(COLECCIONES[coleccion].hoja).deleteRow(r._fila);
    bitacora(ses, 'Eliminar', coleccion, r.codigo, motivo, JSON.stringify(r));
    return { eliminado: id };
  });
}

function darDeBaja(ses, coleccion, id, motivo, fecha) {
  if (!COLECCIONES[coleccion].baja) throw new Error('Esta colección no maneja bajas.');
  motivo = exigirMotivo(motivo);
  return conBloqueo(function () {
    const r = buscarPorId(coleccion, id);
    if (r.situacion === 'De baja') throw new Error('El elemento ya está dado de baja.');
    r.situacion = 'De baja';
    r.fechaBaja = limpiar(fecha, 20) || ahora().slice(0, 10);
    r.motivoBaja = motivo;
    r.bajaPor = ses.usuario;
    actualizarFila(COLECCIONES[coleccion].hoja, r._fila, r);
    bitacora(ses, 'Dar de baja', coleccion, r.codigo, motivo, '');
    return { registro: r };
  });
}

function reactivar(ses, coleccion, id, motivo) {
  motivo = exigirMotivo(motivo);
  return conBloqueo(function () {
    const r = buscarPorId(coleccion, id);
    r.situacion = 'Activo'; r.fechaBaja = ''; r.motivoBaja = ''; r.bajaPor = '';
    r.fechaActualizacion = ahora(); r.actualizadoPor = ses.usuario;
    actualizarFila(COLECCIONES[coleccion].hoja, r._fila, r);
    bitacora(ses, 'Reactivar', coleccion, r.codigo, motivo, '');
    return { registro: r };
  });
}

function bitacora(ses, accion, coleccion, codigo, descripcion, detalle) {
  agregarFilas(HOJAS.historial.hoja, HOJAS.historial.cols, [{
    fecha: ahora(), usuario: ses.usuario, accion: accion, coleccion: coleccion,
    codigo: codigo, descripcion: descripcion, detalle: String(detalle || '').slice(0, 5000)
  }]);
}

function historial(ses, coleccion) {
  return leer(HOJAS.historial.hoja).filter(function (h) {
    if (coleccion && h.coleccion !== coleccion) return false;
    return ses.rol === 'admin' || ses.rol === 'directivo' || (COLECCIONES[h.coleccion] && COLECCIONES[h.coleccion].rol === ses.rol);
  }).reverse().slice(0, 500);
}

/* ============================================================================
 *  REGISTRO DE CONSULTAS (público)
 * ==========================================================================*/
function registrarConsulta(req) {
  const tipo = TIPOS_CONSULTANTE.indexOf(req.tipo) >= 0 ? req.tipo : 'Visitante';
  agregarFilas(HOJAS.consultas.hoja, HOJAS.consultas.cols, [{
    fecha: ahora(), tipo: tipo, nombre: limpiar(req.nombre, 120), grado: limpiar(req.grado, 40),
    area: limpiar(req.area, 80), servicio: limpiar(req.servicio, 40), termino: limpiar(req.termino, 200),
    filtros: limpiar(req.filtros, 400), resultados: String(parseInt(req.resultados, 10) || 0)
  }]);
  return {};
}

/* ============================================================================
 *  CUENTAS DE USUARIO
 * ==========================================================================*/
function listarUsuarios() {
  return leer(HOJAS.usuarios.hoja).map(function (u) {
    return { usuario: u.usuario, nombre: u.nombre, correo: u.correo, rol: u.rol, activo: u.activo,
             fechaCreacion: u.fechaCreacion, ultimoIngreso: u.ultimoIngreso };
  });
}

function validarClave(clave) {
  if (String(clave || '').length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
}

function guardarUsuario(ses, d) {
  const usuario = limpiar(d.usuario, 60).toLowerCase();
  if (!/^[a-z0-9._-]{3,60}$/.test(usuario)) throw new Error('Usuario inválido (3+ caracteres: letras, números, punto, guion).');
  if (ROLES.indexOf(d.rol) < 0) throw new Error('Rol inválido.');
  return conBloqueo(function () {
    const u = leer(HOJAS.usuarios.hoja).filter(function (x) { return x.usuario.toLowerCase() === usuario; })[0];
    if (u && d.nuevo) throw new Error('El usuario ya existe.');
    if (u) {
      if (u.usuario === ses.usuario && (d.rol !== 'admin' || d.activo === 'NO')) throw new Error('No puede quitarse su propio rol de administrador.');
      u.nombre = limpiar(d.nombre, 120) || u.nombre; u.correo = limpiar(d.correo, 120);
      u.rol = d.rol; u.activo = d.activo === 'NO' ? 'NO' : 'SI';
      if (d.clave) { validarClave(d.clave); u.sal = Utilities.getUuid(); u.hash = hashClave(u.sal, d.clave); }
      actualizarFila(HOJAS.usuarios.hoja, u._fila, u);
      bitacora(ses, 'Editar usuario', 'usuarios', usuario, 'Rol: ' + d.rol + ' · Activo: ' + u.activo, '');
      return {};
    }
    validarClave(d.clave);
    const sal = Utilities.getUuid();
    agregarFilas(HOJAS.usuarios.hoja, HOJAS.usuarios.cols, [{
      usuario: usuario, nombre: limpiar(d.nombre, 120), correo: limpiar(d.correo, 120), rol: d.rol,
      sal: sal, hash: hashClave(sal, d.clave), activo: 'SI', fechaCreacion: ahora(), ultimoIngreso: ''
    }]);
    bitacora(ses, 'Crear usuario', 'usuarios', usuario, 'Rol: ' + d.rol, '');
    return {};
  });
}

function eliminarUsuario(ses, usuario) {
  if (usuario === ses.usuario) throw new Error('No puede eliminar su propia cuenta.');
  return conBloqueo(function () {
    const u = leer(HOJAS.usuarios.hoja).filter(function (x) { return x.usuario === usuario; })[0];
    if (!u) throw new Error('El usuario no existe.');
    ss().getSheetByName(HOJAS.usuarios.hoja).deleteRow(u._fila);
    bitacora(ses, 'Eliminar usuario', 'usuarios', usuario, '', '');
    return {};
  });
}

function cambiarClave(ses, actual, nueva) {
  validarClave(nueva);
  return conBloqueo(function () {
    const u = leer(HOJAS.usuarios.hoja).filter(function (x) { return x.usuario === ses.usuario; })[0];
    if (!u || hashClave(u.sal, String(actual || '')) !== u.hash) throw new Error('La contraseña actual no es correcta.');
    u.sal = Utilities.getUuid(); u.hash = hashClave(u.sal, nueva);
    actualizarFila(HOJAS.usuarios.hoja, u._fila, u);
    return {};
  });
}

function solicitarCuenta(req) {
  const nombre = limpiar(req.nombre, 120), correo = limpiar(req.correo, 120);
  const usuario = limpiar(req.usuario, 60).toLowerCase();
  if (!nombre || !correo || !usuario) throw new Error('Complete nombre, correo y usuario.');
  if (!/^[a-z0-9._-]{3,60}$/.test(usuario)) throw new Error('Usuario inválido (letras, números, punto o guion).');
  const pend = leer(HOJAS.solicitudes.hoja).filter(function (s) { return s.estado === 'Pendiente'; });
  if (pend.length > 200) throw new Error('Hay demasiadas solicitudes pendientes. Contacte al administrador.');
  agregarFilas(HOJAS.solicitudes.hoja, HOJAS.solicitudes.cols, [{
    id: Utilities.getUuid().slice(0, 13), fecha: ahora(), nombre: nombre, correo: correo, usuario: usuario,
    rolSolicitado: ROLES.indexOf(req.rol) > 0 ? req.rol : 'directivo', cargo: limpiar(req.cargo, 120),
    estado: 'Pendiente', atendidaPor: ''
  }]);
  return { mensaje: 'Solicitud enviada. El administrador la revisará.' };
}

function atenderSolicitud(ses, id, decision, rol, clave) {
  const s = leer(HOJAS.solicitudes.hoja).filter(function (x) { return x.id === id; })[0];
  if (!s) throw new Error('Solicitud no encontrada.');
  if (decision === 'aprobar') {
    guardarUsuario(ses, { usuario: s.usuario, nombre: s.nombre, correo: s.correo, rol: rol || s.rolSolicitado, clave: clave, nuevo: true });
    s.estado = 'Aprobada';
  } else {
    s.estado = 'Rechazada';
  }
  s.atendidaPor = ses.usuario;
  actualizarFila(HOJAS.solicitudes.hoja, s._fila, s);
  return {};
}
