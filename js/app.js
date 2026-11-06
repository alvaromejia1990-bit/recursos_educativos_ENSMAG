/* =====================================================================
   ENSMA · Recursos Institucionales — Aplicación principal
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ESQUEMA, C = E.COLECCIONES, CFG = window.ENSMA_CONFIG;
  const { llamar, Sesion, DEMO, Demo } = window.API;

  /* ------------------------------ Utilidades ------------------------------ */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Number(n || 0).toLocaleString('es-CO');
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const hoyISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const fechaBonita = s => {
    if (!s) return '';
    const d = new Date(String(s).length <= 10 ? s + 'T00:00:00' : s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) + (String(s).length > 10 ? ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '');
  };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const I = {
    libro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7M9 11h5"/></svg>',
    repo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>',
    tec: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20M9 16v4M15 16v4"/></svg>',
    did: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><circle cx="17" cy="7" r="4"/><path d="M7 14l4 7H3z"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
    buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    candado: '<svg class="candado" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    candadoG: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    usuario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    basura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>',
    baja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 14l2 2 2-2M12 12v4"/></svg>',
    reactivar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    ojo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    excel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13l4 5M12 13l-4 5"/></svg>',
    subir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    bajar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    salir: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
    llave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/></svg>',
    vacio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8.5 11h5"/></svg>',
    enlace: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>'
  };
  const COLORES = {
    bibliograficos: { c: 'var(--magenta)', cf: 'var(--magenta-claro)' },
    tecnologicos: { c: 'var(--azul)', cf: 'var(--azul-claro)' },
    didacticos: { c: 'var(--verde)', cf: 'var(--verde-claro)' }
  };
  const estiloServ = s => `--c:${COLORES[s].c};--cf:${COLORES[s].cf}`;
  const servDeCol = col => (col === 'libros' || col === 'repositorios') ? 'bibliograficos' : col;

  /* ------------------------------ Avisos y modal ------------------------------ */
  function aviso(msg, tipo) {
    const d = document.createElement('div');
    d.className = 'aviso' + (tipo === 'error' ? ' error' : '');
    d.textContent = msg;
    $('#avisos').appendChild(d);
    setTimeout(() => d.remove(), tipo === 'error' ? 6500 : 3800);
  }
  let alCerrarModal = null, modalBloqueante = false;
  function abrirModal(titulo, html, opts) {
    opts = opts || {};
    modalBloqueante = !!opts.bloqueante;
    $('#modalCerrar').hidden = modalBloqueante;
    $('#modalTitulo').textContent = titulo;
    $('#modalCuerpo').innerHTML = html;
    $('.modal').classList.toggle('ancho', !!opts.ancho);
    $('#modal').hidden = false;
    alCerrarModal = opts.alCerrar || null;
    const primero = $('#modalCuerpo input, #modalCuerpo select, #modalCuerpo textarea, #modalCuerpo button');
    if (primero && !opts.sinFoco) setTimeout(() => primero.focus(), 30);
    return $('#modalCuerpo');
  }
  function cerrarModal() {
    $('#modal').hidden = true; $('#modalCuerpo').innerHTML = ''; modalBloqueante = false; $('#modalCerrar').hidden = false;
    if (alCerrarModal) { const f = alCerrarModal; alCerrarModal = null; f(); }
  }
  $('#modalCerrar').addEventListener('click', () => { if (!modalBloqueante) cerrarModal(); });
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal' && !modalBloqueante) cerrarModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden && !modalBloqueante) cerrarModal(); });

  function confirmar(titulo, mensaje, textoBtn, clase) {
    return new Promise(res => {
      let ok = false;
      const m = abrirModal(titulo, `<p>${mensaje}</p><div class="acciones-form"><button class="btn btn-borde" data-x>Cancelar</button><button class="btn ${clase || 'btn-primario'}" data-ok>${esc(textoBtn || 'Aceptar')}</button></div>`, { alCerrar: () => res(ok) });
      $('[data-x]', m).onclick = cerrarModal;
      $('[data-ok]', m).onclick = () => { ok = true; cerrarModal(); };
    });
  }
  async function conBoton(btn, fn) {
    const txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="cargando"></span> Procesando…';
    try { return await fn(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = txt; } }
  }

  /* ------------------------------ Estado ------------------------------ */
  const estado = {
    resumen: null,
    publico: {},     // listas públicas por colección
    completo: {},    // listas completas (gestión)
    consulta: { servicio: 'bibliograficos', col: 'libros', q: '', filtros: {}, orden: 'relevancia', limite: 24, ultimoRegistro: '' },
    gestion: {},     // estado por colección
    biblioTab: 'libros',
    dash: { periodo: '30', tipo: 'todos', servicio: 'todos', desde: '', hasta: '', tabla: 'Estudiante', pagina: 0, datos: null }
  };

  /* ------------------------------ Cabecera / navegación ------------------------------ */
  function pintarUsuario() {
    const u = Sesion.usuario();
    const z = $('#zonaUsuario');
    if (!u) {
      z.innerHTML = `<button class="btn btn-azul" id="btnIngresar">${I.candadoG} Ingresar</button>`;
      $('#btnIngresar').onclick = () => abrirLogin();
    } else {
      const ini = (u.nombre || u.usuario).replace(/\(.*?\)/g, '').trim().split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
      z.innerHTML = `<div class="chip-usuario"><span class="chip-usuario__avatar">${esc(ini)}</span>
        <span class="chip-usuario__texto"><span class="chip-usuario__nombre">${esc(u.nombre || u.usuario)}</span><br><span class="chip-usuario__rol">${esc((E.ROLES[u.rol] || u.rol).split(' (')[0])}</span></span>
        <button class="btn-icono" id="btnClave" title="Cambiar contraseña" aria-label="Cambiar contraseña">${I.llave}</button>
        <button class="btn-icono" id="btnSalir" title="Cerrar sesión" aria-label="Cerrar sesión">${I.salir}</button></div>`;
      $('#btnSalir').onclick = salir;
      $('#btnClave').onclick = abrirCambioClave;
    }
    $$('.navegacion a').forEach(a => {
      const prot = a.dataset.protegida;
      a.querySelectorAll('.candado').forEach(n => n.remove());
      if (prot && !u) a.insertAdjacentHTML('beforeend', I.candado);
      if (a.dataset.soloAdmin) a.hidden = !(u && u.rol === 'admin');
    });
  }
  $('#btnMenu').onclick = () => {
    const n = $('#navegacion'); n.classList.toggle('abierta');
    $('#btnMenu').setAttribute('aria-expanded', n.classList.contains('abierta'));
  };

  async function salir() {
    try { await llamar('logout'); } catch (e) {}
    Sesion.cerrarLocal(); estado.completo = {};
    pintarUsuario(); aviso('Sesión cerrada.'); enrutar();
  }

  function abrirLogin(despues) {
    const demo = DEMO ? `<div class="credenciales-demo"><strong>Usuarios de prueba (modo demostración)</strong>
      <table><tr><td>admin</td><td>admin2026</td><td>Administrador</td></tr><tr><td>biblioteca</td><td>biblio2026</td><td>Biblioteca</td></tr>
      <tr><td>tecnologia</td><td>tecno2026</td><td>Tecnológica</td></tr><tr><td>didactica</td><td>didac2026</td><td>Didáctica</td></tr></table></div>` : '';
    const m = abrirModal('Ingreso de usuarios autorizados', `
      <form id="fLogin" autocomplete="on">
        <div class="campo"><label for="lUsr">Usuario</label><input id="lUsr" name="usuario" autocomplete="username" required></div>
        <div class="campo" style="margin-top:12px"><label for="lClave">Contraseña</label><input id="lClave" type="password" name="clave" autocomplete="current-password" required></div>
        <div class="acciones-form" style="justify-content:space-between;align-items:center">
          <button type="button" class="enlace" id="lSolicitar">Solicitar una cuenta</button>
          <button class="btn btn-primario" type="submit">Ingresar</button>
        </div>
      </form>${demo}`);
    $('#lSolicitar', m).onclick = abrirSolicitud;
    $('#fLogin', m).onsubmit = async ev => {
      ev.preventDefault();
      const btn = ev.submitter || $('button[type=submit]', m);
      try {
        await conBoton(btn, async () => {
          const r = await llamar('login', { usuario: $('#lUsr').value, clave: $('#lClave').value });
          Sesion.guardar(r.token, r.usuario);
        });
        cerrarModal(); pintarUsuario(); aviso('Bienvenido(a), ' + Sesion.usuario().nombre);
        if (despues && location.hash !== despues) location.hash = despues; else enrutar();
      } catch (e) { aviso(e.message, 'error'); }
    };
  }

  function abrirSolicitud() {
    const m = abrirModal('Solicitud de cuenta', `
      <div class="alerta info">Las cuentas permiten administrar los inventarios. Para consultar recursos <strong>no</strong> necesita cuenta.</div>
      <form id="fSol" class="rejilla-form">
        <div class="campo ancho-2"><label>Nombre completo <span class="req">*</span></label><input name="nombre" required></div>
        <div class="campo"><label>Correo institucional <span class="req">*</span></label><input name="correo" type="email" required></div>
        <div class="campo"><label>Usuario deseado <span class="req">*</span></label><input name="usuario" required pattern="[A-Za-z0-9._\\-]{3,60}" title="Letras, números, punto o guion"></div>
        <div class="campo"><label>Cargo</label><input name="cargo" placeholder="Ej. Bibliotecaria, docente de tecnología"></div>
        <div class="campo"><label>Sección que administrará</label><select name="rol">${Object.entries(E.ROLES).filter(([k]) => k !== 'admin').map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>
        <div class="acciones-form ancho-2" style="grid-column:1/-1"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button class="btn btn-primario">Enviar solicitud</button></div>
      </form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fSol', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      try { const r = await conBoton(ev.submitter, () => llamar('solicitarCuenta', d)); cerrarModal(); aviso(r.mensaje || 'Solicitud enviada.'); }
      catch (e) { aviso(e.message, 'error'); }
    };
  }

  function abrirCambioClave() {
    const m = abrirModal('Cambiar contraseña', `<form id="fClave">
      <div class="campo"><label>Contraseña actual</label><input type="password" name="actual" required autocomplete="current-password"></div>
      <div class="campo" style="margin-top:12px"><label>Nueva contraseña (mínimo 8 caracteres)</label><input type="password" name="nueva" minlength="8" required autocomplete="new-password"></div>
      <div class="campo" style="margin-top:12px"><label>Confirmar nueva contraseña</label><input type="password" name="conf" minlength="8" required autocomplete="new-password"></div>
      <div class="acciones-form"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button class="btn btn-primario">Guardar</button></div></form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fClave', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      if (d.nueva !== d.conf) return aviso('Las contraseñas no coinciden.', 'error');
      try { await conBoton(ev.submitter, () => llamar('cambiarClave', { actual: d.actual, nueva: d.nueva })); cerrarModal(); aviso('Contraseña actualizada.'); }
      catch (e) { aviso(e.message, 'error'); }
    };
  }

  /* ------------------------------ Enrutador ------------------------------ */
  function enrutar() {
    const [ruta, param] = (location.hash.replace('#', '') || 'inicio').split('/');
    const vistas = ['inicio', 'consulta', 'biblioteca', 'tecnologica', 'didactica', 'dashboard', 'usuarios'];
    const r = vistas.includes(ruta) ? ruta : 'inicio';
    $$('.vista').forEach(v => v.hidden = v.id !== 'v-' + r);
    $$('.navegacion a').forEach(a => a.classList.toggle('activo', a.dataset.ruta === r));
    $('#navegacion').classList.remove('abierta');
    Graficos.ocultarTooltip();
    if (modalBloqueante && r !== 'consulta') { alCerrarModal = null; cerrarModal(); }
    const vista = $('#v-' + r);
    ({
      inicio: vInicio, consulta: () => vConsulta(param), biblioteca: () => vGestionBiblioteca(),
      tecnologica: () => vGestionSimple('tecnologicos', 'tecnologica'), didactica: () => vGestionSimple('didacticos', 'didactica'),
      dashboard: vDashboard, usuarios: vUsuarios
    })[r](vista);
    if (window.scrollY > 120) window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', enrutar);

  /* Bloqueo de secciones protegidas */
  function bloqueo(vista, titulo, ruta) {
    const u = Sesion.usuario();
    vista.innerHTML = `<div class="contenedor"><div class="tarjeta panel-bloqueado">
      <div class="icono-grande">${I.candadoG}</div>
      <h2>${esc(titulo)}</h2>
      ${u ? `<p>Su cuenta (<strong>${esc(E.ROLES[u.rol] || u.rol)}</strong>) no tiene permisos para esta sección. Solicite acceso al administrador.</p>`
          : `<p>Esta sección es exclusiva para usuarios autorizados de la institución. La <a href="#consulta">consulta de inventarios</a> es libre para todos.</p>
             <button class="btn btn-primario" id="btnBloqIngresar">Ingresar</button>`}
    </div></div>`;
    const b = $('#btnBloqIngresar', vista); if (b) b.onclick = () => abrirLogin('#' + ruta);
  }

  /* ------------------------------ Resumen ------------------------------ */
  async function cargarResumen(forzar) {
    if (estado.resumen && !forzar) return estado.resumen;
    const r = await llamar('resumen'); estado.resumen = r.resumen; return estado.resumen;
  }

  /* ============================== INICIO ============================== */
  async function vInicio(v) {
    v.innerHTML = `<div class="contenedor">
      <div class="hero">
        <div>
          <span class="eyebrow">${esc(CFG.SISTEMA)}</span>
          <h1>Recursos <span>bibliográficos</span>, tecnológicos y didácticos al alcance de toda la comunidad</h1>
          <p>Consulte en línea los libros, los trabajos de grado del Programa de Formación Complementaria y los equipos tecnológicos y didácticos disponibles en la Escuela Normal Superior María Auxiliadora de Girardot.</p>
          <div class="hero__acciones">
            <a class="btn btn-primario" href="#consulta">${I.buscar} Consultar inventarios</a>
            <a class="btn btn-borde" href="#dashboard">Ver estadísticas</a>
          </div>
        </div>
        <img class="hero__escudo" src="assets/escudo.png" alt="">
      </div>
      <div class="cifras" id="cifras">${[0, 1, 2, 3].map(() => '<div class="cifra"><div class="cargando"></div></div>').join('')}</div>
      <div class="bloque">
        <span class="eyebrow">Servicios de consulta</span>
        <h2>¿Qué recurso necesita?</h2>
        <div class="servicios">
          ${tarjetaServicio('bibliograficos', I.libro, 'Recursos bibliográficos', 'Libros de texto, literatura, obras de consulta y el repositorio de trabajos de grado de los estudiantes del PFC.')}
          ${tarjetaServicio('tecnologicos', I.tec, 'Recursos tecnológicos', 'Computadores, tabletas, video beam, pantallas, kits de robótica y demás equipos tecnológicos institucionales.')}
          ${tarjetaServicio('didacticos', I.did, 'Recursos didácticos', 'Material manipulativo, de laboratorio, deportivo, musical y de arte para el trabajo pedagógico en el aula.')}
        </div>
      </div>
      <div class="bloque">
        <span class="eyebrow">Paso a paso</span>
        <h2>¿Cómo consultar?</h2>
        <div class="pasos">
          <div class="paso"><h3>Identifíquese</h3><p>Indique si es estudiante, docente o visitante. Solo se usa con fines estadísticos institucionales.</p></div>
          <div class="paso"><h3>Elija el servicio</h3><p>Seleccione recursos bibliográficos, tecnológicos o didácticos.</p></div>
          <div class="paso"><h3>Busque y filtre</h3><p>Escriba un título, autor, equipo o palabra clave y afine con los filtros por área, estado o ubicación.</p></div>
        </div>
      </div>
    </div>`;
    try {
      const r = await cargarResumen(true);
      $('#cifras', v).innerHTML = [
        cifra('bibliograficos', I.libro, r.librosEjemplares, 'Libros (ejemplares)', fmt(r.librosTitulos) + ' títulos registrados'),
        cifra('bibliograficos', I.repo, r.repositorios, 'Repositorios PFC', 'Trabajos de grado'),
        cifra('tecnologicos', I.tec, r.tecnologicos, 'Equipos tecnológicos', fmt(r.tecnologicosRegistros) + ' referencias activas'),
        cifra('didacticos', I.did, r.didacticos, 'Equipos didácticos', fmt(r.didacticosRegistros) + ' referencias activas')
      ].join('');
      $$('[data-n-serv]', v).forEach(n => {
        const s = n.dataset.nServ;
        n.textContent = s === 'bibliograficos' ? fmt(r.librosTitulos) + ' títulos · ' + fmt(r.repositorios) + ' trabajos de grado'
          : s === 'tecnologicos' ? fmt(r.tecnologicos) + ' equipos disponibles' : fmt(r.didacticos) + ' elementos disponibles';
      });
    } catch (e) { $('#cifras', v).innerHTML = `<div class="alerta error" style="grid-column:1/-1">${esc(e.message)}</div>`; }
  }
  function cifra(serv, icono, valor, et, nota) {
    return `<div class="cifra" style="${estiloServ(serv)}"><div class="cifra__icono">${icono}</div>
      <div class="cifra__valor">${fmt(valor)}</div><div class="cifra__etiqueta">${esc(et)}</div><div class="cifra__nota">${esc(nota)}</div></div>`;
  }
  function tarjetaServicio(serv, icono, tit, txt) {
    return `<div class="servicio" style="${estiloServ(serv)}"><div class="servicio__icono">${icono}</div>
      <h3>${tit}</h3><p>${txt}</p><span class="etiqueta" data-n-serv="${serv}">…</span>
      <a class="btn btn-borde" href="#consulta/${serv}" style="margin-top:6px">Consultar ${I.buscar}</a></div>`;
  }

  /* ============================== CONSULTA ============================== */
  /* El registro del consultante vive solo en memoria: se solicita cada vez que se ingresa (o recarga) el sitio. */
  let registroConsultante = null;
  function consultante() { return registroConsultante; }

  function pedirIdentificacion(alListo) {
    const actual = consultante() || {};
    const m = abrirModal('Registro para la consulta', `
      <p style="color:var(--tinta-2)">Para acceder a la consulta de inventarios diligencie este registro. Es obligatorio y se solicita cada vez que ingresa al sitio. Los datos se usan únicamente para las estadísticas de uso de los recursos institucionales.</p>
      <form id="fIdent">
        <div class="campo"><label>Tipo de usuario <span class="req">*</span></label>
          <select name="tipo" id="iTipo" required>${E.TIPOS_CONSULTANTE.map(t => `<option ${t === actual.tipo ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <div class="campo" style="margin-top:12px"><label>Nombre completo <span class="req">*</span></label><input name="nombre" id="iNombre" value="${esc(actual.nombre || '')}" maxlength="120" required></div>
        <div class="campo" style="margin-top:12px" id="iGradoC"><label>Grado / semestre <span class="req">*</span></label>
          <select name="grado" id="iGrado"><option value="">Seleccione…</option>${E.GRADOS.map(g => `<option ${g === actual.grado ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="campo" style="margin-top:12px" id="iAreaC"><label>Área que orienta <span class="req">*</span></label>
          <select name="area" id="iArea"><option value="">Seleccione…</option>${E.AREAS.map(g => `<option ${g === actual.area ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
        <div class="acciones-form">${consultante() ? '<button type="button" class="btn btn-borde" id="iCancelar">Cancelar</button>' : '<a class="btn btn-borde" href="#inicio" id="iVolver">Volver al inicio</a>'}<button class="btn btn-primario">Continuar a la consulta</button></div>
      </form>`, { bloqueante: !consultante(), alCerrar: () => { alListo && alListo(); } });
    const volver = $('#iVolver', m); if (volver) volver.onclick = ev => { ev.preventDefault(); alCerrarModal = null; cerrarModal(); location.hash = '#inicio'; };
    const cancelar = $('#iCancelar', m); if (cancelar) cancelar.onclick = () => cerrarModal();
    const ajustar = () => {
      const t = $('#iTipo').value;
      $('#iGradoC').hidden = t !== 'Estudiante'; $('#iAreaC').hidden = t !== 'Docente';
    };
    $('#iTipo', m).onchange = ajustar; ajustar();
    $('#fIdent', m).onsubmit = ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      d.nombre = d.nombre.trim();
      if (d.nombre.length < 3) return aviso('Escriba su nombre completo.', 'error');
      if (d.tipo === 'Estudiante' && !d.grado) return aviso('Seleccione su grado o semestre.', 'error');
      if (d.tipo === 'Docente' && !d.area) return aviso('Seleccione el área.', 'error');
      if (d.tipo !== 'Estudiante') d.grado = '';
      if (d.tipo !== 'Docente') d.area = '';
      guardarConsultante(d); cerrarModal();
    };
  }
  function guardarConsultante(d) { registroConsultante = d; }

  async function obtenerPublico(col, forzar) {
    if (!estado.publico[col] || forzar) estado.publico[col] = (await llamar('listar', { coleccion: col })).registros;
    return estado.publico[col];
  }

  function vConsulta(param) {
    const v = $('#v-consulta');
    const st = estado.consulta;
    if (param && COLORES[param]) {
      if (st.servicio !== param) { st.servicio = param; st.col = param === 'bibliograficos' ? 'libros' : param; st.filtros = {}; st.q = ''; }
    }
    if (!consultante()) {
      v.innerHTML = `<div class="contenedor"><div class="tarjeta panel-bloqueado">
        <div class="icono-grande">${I.usuario}</div>
        <h2>Registro obligatorio para consultar</h2>
        <p>Antes de acceder a la consulta de inventarios diligencie el registro del consultante (tipo de usuario, nombre y grado o área).</p>
        <button class="btn btn-primario" id="btnRegistro">Diligenciar registro</button></div></div>`;
      const abrir = () => pedirIdentificacion(() => { if (consultante() && location.hash.startsWith('#consulta')) vConsulta(); });
      $('#btnRegistro', v).onclick = abrir;
      abrir();
      return;
    }
    v.innerHTML = `<div class="contenedor">
      <div class="cabecera-vista">
        <div><span class="eyebrow">Servicio de consulta pública</span><h2>Consulta de inventarios</h2>
        <p>Seleccione un servicio y busque por texto o mediante filtros. Cualquier persona puede consultar.</p></div>
        <div class="identidad" id="identidad"></div>
      </div>
      <div class="selector-servicio">
        ${botonServicio('bibliograficos', I.libro, 'Bibliográficos', 'Libros y repositorios PFC')}
        ${botonServicio('tecnologicos', I.tec, 'Tecnológicos', 'Equipos y dispositivos')}
        ${botonServicio('didacticos', I.did, 'Didácticos', 'Material pedagógico')}
      </div>
      <div class="tarjeta">
        <div id="subPestanas"></div>
        <form class="buscador" id="fBuscar" role="search">
          <div class="buscador__caja">${I.buscar}<input id="q" type="search" placeholder="Buscar…" autocomplete="off" aria-label="Texto de búsqueda"></div>
          <button class="btn btn-primario">Buscar</button>
        </form>
        <div class="filtros" id="filtros"></div>
      </div>
      <div class="resultados__info" id="resInfo"></div>
      <div id="resultados"><div class="cargando-bloque"><span class="cargando"></span></div></div>
    </div>`;
    pintarIdentidad();
    cargarResumen().then(r => {
      const n = { bibliograficos: fmt(r.librosTitulos + r.repositorios) + ' registros', tecnologicos: fmt(r.tecnologicos) + ' equipos', didacticos: fmt(r.didacticos) + ' elementos' };
      $$('.opcion-servicio', v).forEach(b => { const s = b.querySelector('.n'); if (s) s.textContent = n[b.dataset.serv]; });
    }).catch(() => {});
    $$('.opcion-servicio', v).forEach(b => b.onclick = () => { location.hash = '#consulta/' + b.dataset.serv; });
    $('#q', v).value = st.q;
    $('#fBuscar', v).onsubmit = ev => { ev.preventDefault(); st.q = $('#q').value.trim(); st.limite = 24; pintarResultados(); registrarConsulta(true); };
    $('#q', v).addEventListener('input', debounce(() => { st.q = $('#q').value.trim(); st.limite = 24; pintarResultados(); registrarConsulta(); }, 250));
    prepararColeccion();
  }
  function botonServicio(s, icono, tit, sub) {
    const st = estado.consulta;
    return `<button class="opcion-servicio" data-serv="${s}" style="${estiloServ(s)}" aria-pressed="${st.servicio === s}">
      <span class="servicio__icono">${icono}</span><span><strong>${tit}</strong><span class="n">${sub}</span></span></button>`;
  }
  function pintarIdentidad() {
    const c = consultante(); const z = $('#identidad'); if (!z) return;
    z.innerHTML = c ? `${I.usuario}<span>Consultando como <strong>${esc(c.tipo)}</strong>${c.grado ? ' · ' + esc(c.grado) : ''}${c.area ? ' · ' + esc(c.area) : ''}</span> <button class="enlace" id="cambiarIdent">Cambiar</button>` : '';
    const b = $('#cambiarIdent'); if (b) b.onclick = () => pedirIdentificacion(pintarIdentidad);
  }

  async function prepararColeccion() {
    const st = estado.consulta;
    const sp = $('#subPestanas');
    sp.innerHTML = st.servicio === 'bibliograficos' ? `<div class="pestanas" role="tablist">
      <button role="tab" data-col="libros" aria-selected="${st.col === 'libros'}">${'Libros'}</button>
      <button role="tab" data-col="repositorios" aria-selected="${st.col === 'repositorios'}">Repositorios de trabajos de grado (PFC)</button></div>` : '';
    $$('[data-col]', sp).forEach(b => b.onclick = () => { st.col = b.dataset.col; st.filtros = {}; st.q = ''; $('#q').value = ''; st.limite = 24; prepararColeccion(); });
    $('#q').placeholder = { libros: 'Título, autor, editorial, ISBN…', repositorios: 'Título del trabajo, autores, asesor, línea…', tecnologicos: 'Nombre del equipo, marca, modelo, ubicación…', didacticos: 'Nombre del material, categoría, área…' }[st.col];
    $('#resultados').innerHTML = '<div class="cargando-bloque"><span class="cargando"></span> Cargando inventario…</div>';
    try { await obtenerPublico(st.col); }
    catch (e) { $('#resultados').innerHTML = `<div class="alerta error">${esc(e.message)}</div>`; return; }
    pintarFiltros(); pintarResultados();
  }

  function pintarFiltros() {
    const st = estado.consulta, c = C[st.col], datos = estado.publico[st.col] || [];
    const campos = c.campos.filter(f => f.filtro);
    const html = campos.map(f => {
      const cuenta = {};
      datos.forEach(r => { if (r[f.k]) cuenta[r[f.k]] = (cuenta[r[f.k]] || 0) + 1; });
      const ops = Object.keys(cuenta).sort((a, b) => f.t === 'number' ? b - a : a.localeCompare(b, 'es'));
      return `<div class="campo"><label for="f_${f.k}">${esc(f.l)}</label><select id="f_${f.k}" data-filtro="${f.k}"><option value="">Todos</option>
        ${ops.map(o => `<option value="${esc(o)}" ${st.filtros[f.k] === o ? 'selected' : ''}>${esc(o)} (${cuenta[o]})</option>`).join('')}</select></div>`;
    }).join('') + `<div class="campo"><label for="fOrden">Ordenar por</label><select id="fOrden">
        <option value="relevancia">Relevancia</option><option value="az">${c.titulo === 'titulo' ? 'Título' : 'Nombre'} (A–Z)</option>
        ${c.cantidad ? '<option value="cantidad">Mayor cantidad</option>' : ''}${st.col === 'repositorios' ? '<option value="anio">Más recientes</option>' : ''}
        <option value="codigo">Código</option></select></div>
      <button class="btn btn-borde btn-s" id="limpiar" style="height:36px">Limpiar</button>`;
    $('#filtros').innerHTML = html;
    $('#fOrden').value = st.orden;
    $$('[data-filtro]').forEach(s => s.onchange = () => { st.filtros[s.dataset.filtro] = s.value; st.limite = 24; pintarResultados(); registrarConsulta(); });
    $('#fOrden').onchange = () => { st.orden = $('#fOrden').value; pintarResultados(); };
    $('#limpiar').onclick = () => { st.filtros = {}; st.q = ''; $('#q').value = ''; pintarFiltros(); pintarResultados(); };
  }

  function filtrar(col, datos, q, filtros) {
    const c = C[col];
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    let res = datos.filter(r => Object.entries(filtros).every(([k, v]) => !v || r[k] === v));
    if (tokens.length) {
      res = res.map(r => {
        const todo = norm(c.campos.map(f => r[f.k]).join(' '));
        if (!tokens.every(t => todo.includes(t))) return null;
        const tit = norm(r[c.titulo]);
        const puntos = tokens.reduce((s, t) => s + (tit.includes(t) ? 3 : 0) + (norm(r[c.subtitulo]).includes(t) ? 2 : 0) + (norm(r.codigo) === t ? 5 : 0), 0);
        return { r, puntos };
      }).filter(Boolean).sort((a, b) => b.puntos - a.puntos).map(o => o.r);
    }
    return res;
  }

  function pintarResultados() {
    const st = estado.consulta, c = C[st.col];
    let res = filtrar(st.col, estado.publico[st.col] || [], st.q, st.filtros);
    const az = (a, b) => String(a[c.titulo]).localeCompare(String(b[c.titulo]), 'es');
    if (st.orden === 'az' || (st.orden === 'relevancia' && !st.q)) res = res.slice().sort(az);
    if (st.orden === 'cantidad') res = res.slice().sort((a, b) => (+b[c.cantidad] || 0) - (+a[c.cantidad] || 0));
    if (st.orden === 'anio') res = res.slice().sort((a, b) => (+b.anio || 0) - (+a.anio || 0));
    if (st.orden === 'codigo') res = res.slice().sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), 'es', { numeric: true }));
    st.ultimos = res;
    const unidades = c.cantidad ? res.reduce((s, r) => s + (+r[c.cantidad] || 0), 0) : null;
    $('#resInfo').innerHTML = `<span><strong>${fmt(res.length)}</strong> ${res.length === 1 ? 'resultado' : 'resultados'} en ${esc(c.nombre)}${unidades !== null ? ` · <strong>${fmt(unidades)}</strong> ${st.col === 'libros' ? 'ejemplares' : 'unidades'}` : ''}</span>`;
    const serv = servDeCol(st.col);
    if (!res.length) {
      $('#resultados').innerHTML = `<div class="vacio">${I.vacio}<p><strong>No se encontraron resultados.</strong><br>Intente con otras palabras o quite algunos filtros.</p></div>`;
      return;
    }
    $('#resultados').innerHTML = `<div class="grid-resultados">${res.slice(0, st.limite).map((r, i) => ficha(st.col, r, i, serv)).join('')}</div>
      ${res.length > st.limite ? `<div class="mas-resultados"><button class="btn btn-borde" id="verMas">Ver más resultados (${fmt(res.length - st.limite)} restantes)</button></div>` : ''}`;
    $$('.ficha').forEach(f => f.onclick = () => verDetalle(st.col, res[+f.dataset.i], false));
    const vm = $('#verMas'); if (vm) vm.onclick = () => { st.limite += 24; pintarResultados(); };
  }

  function etiquetaEstado(v) {
    if (!v) return '';
    const cls = /^(Disponible|Bueno|Óptimo|Activo)$/.test(v) ? 'ok' : /^(Regular|Prestado|En mantenimiento|En reparación)$/.test(v) ? 'warn' : /^(Malo|Extraviado|De baja)$/.test(v) ? 'mal' : '';
    return `<span class="etiqueta ${cls}">${esc(v)}</span>`;
  }
  function ficha(col, r, i, serv) {
    const c = C[col];
    const extra = col === 'libros' ? [r.area, r.ejemplares + ' ejempl.'] : col === 'repositorios' ? [r.anio, r.linea] : col === 'tecnologicos' ? [r.ubicacion, r.cantidad + ' und.'] : [r.area, r.cantidad + ' und.'];
    return `<button class="ficha" data-i="${i}" style="${estiloServ(serv)}">
      <span class="ficha__cod">${esc(r.codigo)}</span>
      <span class="ficha__tit">${esc(r[c.titulo])}</span>
      <span class="ficha__sub">${esc(r[c.subtitulo])}</span>
      <span class="ficha__pie">${extra.filter(x => x && !/^undefined/.test(x)).map(x => `<span class="etiqueta">${esc(x)}</span>`).join('')}${etiquetaEstado(r.estado)}${col === 'libros' ? etiquetaEstado(r.disponibilidad) : ''}</span>
    </button>`;
  }

  function verDetalle(col, r, completo) {
    const c = C[col];
    const filas = c.campos.filter(f => r[f.k] !== undefined && r[f.k] !== '').map(f => {
      let val = esc(r[f.k]);
      if (f.t === 'url' && /^https?:\/\//i.test(r[f.k])) val = `<a href="${esc(r[f.k])}" target="_blank" rel="noopener">Abrir documento ${I.enlace.replace('<svg', '<svg width="14" height="14"')}</a>`;
      if (f.k === 'estado' || f.k === 'disponibilidad') val = etiquetaEstado(r[f.k]);
      if (f.t === 'date') val = esc(fechaBonita(r[f.k]));
      return `<dt>${esc(f.l)}</dt><dd>${val}</dd>`;
    });
    if (completo) E.CAMPOS_SISTEMA.forEach(s => { if (r[s.k]) filas.push(`<dt>${esc(s.l)}</dt><dd>${s.k === 'situacion' ? etiquetaEstado(r[s.k]) : esc(/fecha/i.test(s.k) ? fechaBonita(r[s.k]) : r[s.k])}</dd>`); });
    abrirModal(r[c.titulo] || 'Detalle', `<dl class="detalle">${filas.join('')}</dl>`, { sinFoco: true });
  }

  /* Registro de la consulta (para el dashboard) */
  const registroDiferido = debounce(() => registrarConsulta(true), 2500);
  function registrarConsulta(inmediato) {
    if (!inmediato) return registroDiferido();
    const st = estado.consulta, c = C[st.col];
    const filtrosTxt = Object.entries(st.filtros).filter(([, v]) => v).map(([k, v]) => c.campos.find(f => f.k === k).l + ': ' + v);
    if (st.col === 'repositorios') filtrosTxt.unshift('Colección: Repositorios PFC');
    if (st.col === 'libros') filtrosTxt.unshift('Colección: Libros');
    const hayCriterio = st.q || Object.values(st.filtros).some(Boolean);
    if (!hayCriterio) return;
    const clave = st.col + '|' + st.q + '|' + filtrosTxt.join(';');
    if (clave === st.ultimoRegistro) return;
    st.ultimoRegistro = clave;
    const p = consultante() || { tipo: 'Visitante' };
    llamar('registrarConsulta', { tipo: p.tipo, nombre: p.nombre, grado: p.grado, area: p.area, servicio: c.servicio, termino: st.q, filtros: filtrosTxt.join('; '), resultados: (st.ultimos || []).length })
      .catch(() => {});
  }

  /* ============================== GESTIÓN ============================== */
  function rolPuedeVer(col) { const u = Sesion.usuario(); return !!u && (Sesion.puede(col) || u.rol === 'directivo'); }

  function vGestionBiblioteca() {
    const v = $('#v-biblioteca');
    if (!rolPuedeVer('libros')) return bloqueo(v, 'Sección de biblioteca', 'biblioteca');
    v.innerHTML = `<div class="contenedor">
      <div class="cabecera-vista"><div><span class="eyebrow">Gestión · usuarios autorizados</span><h2>Biblioteca</h2>
        <p>Administre de forma independiente el inventario de libros y el repositorio de trabajos de grado de los estudiantes del Programa de Formación Complementaria (PFC).</p></div></div>
      <div class="pestanas" role="tablist">
        <button role="tab" data-tab="libros" aria-selected="${estado.biblioTab === 'libros'}">${I.libro.replace('<svg', '<svg width="16" height="16" style="vertical-align:-3px"')} Libros</button>
        <button role="tab" data-tab="repositorios" aria-selected="${estado.biblioTab === 'repositorios'}">${I.repo.replace('<svg', '<svg width="16" height="16" style="vertical-align:-3px"')} Repositorios de trabajos de grado (PFC)</button>
      </div>
      <div id="gestionBiblio"></div></div>`;
    $$('[data-tab]', v).forEach(b => b.onclick = () => { estado.biblioTab = b.dataset.tab; vGestionBiblioteca(); });
    gestion($('#gestionBiblio', v), estado.biblioTab);
  }

  function vGestionSimple(col, ruta) {
    const v = $('#v-' + ruta);
    const c = C[col];
    if (!rolPuedeVer(col)) return bloqueo(v, 'Sección de ' + c.nombre.toLowerCase(), ruta);
    v.innerHTML = `<div class="contenedor">
      <div class="cabecera-vista"><div><span class="eyebrow">Gestión · usuarios autorizados</span><h2>${col === 'tecnologicos' ? 'Sección tecnológica' : 'Sección didáctica'}</h2>
        <p>Registre los ${col === 'tecnologicos' ? 'elementos tecnológicos' : 'elementos didácticos'} de la institución mediante el formulario. Los elementos que salen de servicio se <strong>dan de baja</strong> describiendo el motivo; la eliminación definitiva también exige justificación y queda en el historial.</p></div></div>
      <div id="gestion_${col}"></div></div>`;
    gestion($('#gestion_' + col, v), col);
  }

  async function gestion(cont, col) {
    const c = C[col];
    const g = estado.gestion[col] = estado.gestion[col] || { q: '', situacion: c.baja ? 'Activo' : 'Todos', pagina: 0, editando: null };
    const soloLectura = !Sesion.puede(col);
    cont.innerHTML = `<div class="resumen-gestion" id="rg_${col}"></div>
      ${soloLectura ? '<div class="alerta info">Acceso de solo lectura (perfil directivo). Puede consultar y descargar reportes.</div>' : `
      <details class="form-registro" id="det_${col}" open>
        <summary><span class="mas">+</span> <span id="tituloForm_${col}">Registrar ${esc(c.singular)}</span><span class="edit-flag" id="flag_${col}"></span></summary>
        <form id="form_${col}" novalidate><div class="rejilla-form">${c.campos.map(campoHTML).join('')}</div>
          <div class="acciones-form"><button type="button" class="btn btn-borde" id="cancelar_${col}">Limpiar formulario</button>
          <button class="btn btn-primario" id="guardar_${col}">Guardar registro</button></div></form>
      </details>`}
      <div class="tarjeta">
        <div class="tarjeta__cab"><h3>Inventario de ${esc(c.nombre.toLowerCase())}</h3>
          <div class="barra-herr">
            ${soloLectura ? '' : `<button class="btn btn-borde btn-s" data-acc="plantilla">${I.excel} Plantilla Excel</button>
            <button class="btn btn-borde btn-s" data-acc="carga">${I.subir} Carga masiva</button>
            <input type="file" accept=".xlsx,.xls,.csv" id="archivo_${col}" hidden>`}
            <button class="btn btn-verde btn-s" data-acc="reporte">${I.bajar} Reporte Excel</button>
            <button class="btn btn-borde btn-s" data-acc="historial">${I.reloj} Historial</button>
          </div></div>
        <div class="filtros" style="margin:0 0 14px">
          <div class="campo" style="max-width:none;flex:3"><label>Buscar en el inventario</label><input type="search" id="gq_${col}" value="${esc(g.q)}" placeholder="Código, ${c.titulo === 'titulo' ? 'título' : 'nombre'}, ${esc(c.campos[2].l.toLowerCase())}…"></div>
          ${c.baja ? `<div class="campo"><label>Situación</label><select id="gs_${col}"><option value="Activo">Activos</option><option value="De baja">Dados de baja</option><option value="Todos">Todos</option></select></div>` : ''}
        </div>
        <div id="tabla_${col}"><div class="cargando-bloque"><span class="cargando"></span></div></div>
      </div>`;

    if (!soloLectura) {
      const f = $('#form_' + col);
      f.onsubmit = ev => { ev.preventDefault(); guardarRegistro(col, ev.submitter || $('#guardar_' + col)); };
      $('#cancelar_' + col).onclick = () => limpiarForm(col);
      $('[data-acc=plantilla]', cont).onclick = () => { try { Excel.plantilla(col); } catch (e) { aviso(e.message, 'error'); } };
      $('[data-acc=carga]', cont).onclick = () => $('#archivo_' + col).click();
      $('#archivo_' + col).onchange = ev => { const a = ev.target.files[0]; ev.target.value = ''; if (a) cargaMasiva(col, a); };
      if (g.editando) cargarEnForm(col, g.editando); else limpiarForm(col);
    }
    $('[data-acc=reporte]', cont).onclick = async ev => {
      try { await conBoton(ev.currentTarget, async () => Excel.reporte(col, await obtenerCompleto(col, true))); aviso('Reporte descargado.'); } catch (e) { aviso(e.message, 'error'); }
    };
    $('[data-acc=historial]', cont).onclick = () => verHistorial(col);
    $('#gq_' + col).addEventListener('input', debounce(e => { g.q = e.target.value; g.pagina = 0; pintarTabla(col); }, 200));
    if (c.baja) { $('#gs_' + col).value = g.situacion; $('#gs_' + col).onchange = e => { g.situacion = e.target.value; g.pagina = 0; pintarTabla(col); }; }

    try { await obtenerCompleto(col, true); pintarTabla(col); }
    catch (e) { $('#tabla_' + col).innerHTML = `<div class="alerta error">${esc(e.message)}</div>`; }
  }

  function campoHTML(f) {
    const id = 'c_' + f.k;
    const req = f.req ? ' <span class="req">*</span>' : '';
    let input;
    if (f.t === 'select') input = `<select name="${f.k}" id="${id}" ${f.req ? 'required' : ''}><option value="">Seleccione…</option>${f.op.map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    else if (f.t === 'textarea') input = `<textarea name="${f.k}" id="${id}" maxlength="4000"></textarea>`;
    else input = `<input name="${f.k}" id="${id}" type="${f.t}" ${f.req ? 'required' : ''} ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max ? `max="${f.max}"` : ''} placeholder="${esc(f.ph || '')}" ${f.lista ? `list="dl_${f.k}"` : ''}>${f.lista ? `<datalist id="dl_${f.k}"></datalist>` : ''}`;
    return `<div class="campo ${f.ancho === 2 ? 'ancho-2' : ''}"><label for="${id}">${esc(f.l)}${req}</label>${input}</div>`;
  }

  async function obtenerCompleto(col, forzar) {
    if (!estado.completo[col] || forzar) estado.completo[col] = (await llamar('listarCompleto', { coleccion: col })).registros;
    return estado.completo[col];
  }

  function limpiarForm(col) {
    const c = C[col], g = estado.gestion[col], f = $('#form_' + col);
    if (!f) return;
    f.reset(); g.editando = null;
    c.campos.forEach(x => { if (x.def !== undefined) f.elements[x.k].value = x.def; });
    $('#tituloForm_' + col).textContent = 'Registrar ' + c.singular;
    $('#flag_' + col).innerHTML = '';
    $('#guardar_' + col).textContent = 'Guardar registro';
    $('#cancelar_' + col).textContent = 'Limpiar formulario';
  }

  function cargarEnForm(col, r) {
    const c = C[col], g = estado.gestion[col], f = $('#form_' + col);
    g.editando = r;
    c.campos.forEach(x => {
      const el = f.elements[x.k]; let v = r[x.k] || '';
      if (x.t === 'select' && v && !x.op.includes(v)) el.insertAdjacentHTML('beforeend', `<option>${esc(v)}</option>`);
      if (x.t === 'date') v = String(v).slice(0, 10);
      el.value = v;
    });
    $('#det_' + col).open = true;
    $('#tituloForm_' + col).textContent = 'Editar ' + c.singular;
    $('#flag_' + col).innerHTML = `<span class="etiqueta azul">Editando ${esc(r.codigo)}</span>`;
    $('#guardar_' + col).textContent = 'Guardar cambios';
    $('#cancelar_' + col).textContent = 'Cancelar edición';
    $('#det_' + col).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function guardarRegistro(col, btn) {
    const c = C[col], g = estado.gestion[col], f = $('#form_' + col);
    const d = Object.fromEntries(new FormData(f));
    const falt = c.campos.filter(x => x.req && !String(d[x.k] || '').trim());
    if (falt.length) { aviso('Complete: ' + falt.map(x => x.l).join(', '), 'error'); f.elements[falt[0].k].focus(); return; }
    if (d.enlace && !/^https?:\/\//i.test(d.enlace)) return aviso('El enlace debe iniciar con http:// o https://', 'error');
    if (g.editando) d.id = g.editando.id;
    try {
      const r = await conBoton(btn, () => llamar('guardar', { coleccion: col, registro: d }));
      aviso((g.editando ? 'Cambios guardados: ' : 'Registro creado: ') + r.registro.codigo);
      limpiarForm(col); $('#cancelar_' + col).textContent = 'Limpiar formulario';
      await refrescarColeccion(col);
    } catch (e) { aviso(e.message, 'error'); }
  }

  async function refrescarColeccion(col) {
    estado.resumen = null; delete estado.publico[col];
    await obtenerCompleto(col, true); pintarTabla(col);
  }

  function pintarTabla(col) {
    const c = C[col], g = estado.gestion[col], cont = $('#tabla_' + col);
    if (!cont) return;
    const todos = estado.completo[col] || [];
    const soloLectura = !Sesion.puede(col);
    // Resumen
    const act = c.baja ? todos.filter(r => r.situacion !== 'De baja') : todos;
    const mini = [[fmt(act.length), c.baja ? 'Referencias activas' : 'Registros']];
    if (c.cantidad) mini.push([fmt(act.reduce((s, r) => s + (+r[c.cantidad] || 0), 0)), col === 'libros' ? 'Ejemplares' : 'Unidades activas']);
    if (c.baja) mini.push([fmt(todos.length - act.length), 'Dados de baja']);
    if (col === 'repositorios') mini.push([fmt(new Set(todos.map(r => r.anio)).size), 'Años con trabajos']);
    if (col === 'libros') mini.push([fmt(todos.filter(r => r.disponibilidad === 'Prestado').length), 'Títulos prestados']);
    $('#rg_' + col).innerHTML = mini.map(m => `<div class="mini-cifra"><b>${m[0]}</b><span>${m[1]}</span></div>`).join('');
    // datalists
    c.campos.filter(x => x.lista).forEach(x => { const dl = $('#dl_' + x.k); if (dl) dl.innerHTML = [...new Set(todos.map(r => r[x.k]).filter(Boolean))].sort().map(o => `<option value="${esc(o)}">`).join(''); });

    let res = todos.filter(r => !c.baja || g.situacion === 'Todos' || (r.situacion || 'Activo') === g.situacion);
    if (g.q) { const t = norm(g.q).split(/\s+/); res = res.filter(r => { const s = norm(Object.values(r).join(' ')); return t.every(x => s.includes(x)); }); }
    res = res.slice().sort((a, b) => String(b.fechaRegistro).localeCompare(String(a.fechaRegistro)));
    const POR = 15, paginas = Math.max(1, Math.ceil(res.length / POR));
    g.pagina = Math.min(g.pagina, paginas - 1);
    const vista = res.slice(g.pagina * POR, g.pagina * POR + POR);
    if (!res.length) { cont.innerHTML = `<div class="vacio">${I.vacio}<p>No hay registros${g.q ? ' que coincidan con la búsqueda' : ''}.</p></div>`; return; }
    const cols = c.tabla.map(k => c.campos.find(f => f.k === k));
    cont.innerHTML = `<div class="tabla-envoltura"><table class="tabla"><thead><tr>${cols.map(f => `<th>${esc(f.l)}</th>`).join('')}${c.baja ? '<th>Situación</th>' : ''}<th class="acc">Acciones</th></tr></thead>
      <tbody>${vista.map(r => `<tr class="${r.situacion === 'De baja' ? 'de-baja' : ''}">${cols.map(f => {
        if (f.k === 'estado' || f.k === 'disponibilidad') return `<td>${etiquetaEstado(r[f.k])}</td>`;
        if (f.t === 'number') return `<td class="num">${esc(r[f.k])}</td>`;
        return `<td class="${f.k === c.titulo ? 'titulo-celda' : ''}">${esc(r[f.k])}</td>`;
      }).join('')}${c.baja ? `<td>${etiquetaEstado(r.situacion || 'Activo')}${r.fechaBaja ? `<br><small>${esc(fechaBonita(r.fechaBaja))}</small>` : ''}</td>` : ''}
        <td class="acc">
          <button class="btn-icono" data-ver="${esc(r.id)}" title="Ver detalle" aria-label="Ver detalle">${I.ojo}</button>
          ${soloLectura ? '' : `<button class="btn-icono" data-editar="${esc(r.id)}" title="Editar" aria-label="Editar">${I.editar}</button>
          ${c.baja ? (r.situacion === 'De baja' ? `<button class="btn-icono" data-reactivar="${esc(r.id)}" title="Reactivar" aria-label="Reactivar">${I.reactivar}</button>`
            : `<button class="btn-icono ambar" data-baja="${esc(r.id)}" title="Dar de baja" aria-label="Dar de baja">${I.baja}</button>`) : ''}
          <button class="btn-icono peligro" data-eliminar="${esc(r.id)}" title="${c.baja ? 'Eliminar definitivamente' : 'Quitar del inventario'}" aria-label="Eliminar">${I.basura}</button>`}
        </td></tr>`).join('')}</tbody></table></div>
      <div class="paginacion"><span>Mostrando ${fmt(g.pagina * POR + 1)}–${fmt(g.pagina * POR + vista.length)} de ${fmt(res.length)}</span>
        <span><button class="btn btn-borde btn-s" id="pAnt_${col}" ${g.pagina === 0 ? 'disabled' : ''}>Anterior</button>
        <span style="margin:0 8px">Página ${g.pagina + 1} de ${paginas}</span>
        <button class="btn btn-borde btn-s" id="pSig_${col}" ${g.pagina >= paginas - 1 ? 'disabled' : ''}>Siguiente</button></span></div>`;
    const buscar = id => todos.find(r => r.id === id);
    $$('[data-ver]', cont).forEach(b => b.onclick = () => verDetalle(col, buscar(b.dataset.ver), true));
    $$('[data-editar]', cont).forEach(b => b.onclick = () => cargarEnForm(col, buscar(b.dataset.editar)));
    $$('[data-baja]', cont).forEach(b => b.onclick = () => modalBaja(col, buscar(b.dataset.baja)));
    $$('[data-reactivar]', cont).forEach(b => b.onclick = () => modalMotivo(col, buscar(b.dataset.reactivar), 'reactivar'));
    $$('[data-eliminar]', cont).forEach(b => b.onclick = () => modalMotivo(col, buscar(b.dataset.eliminar), 'eliminar'));
    $('#pAnt_' + col).onclick = () => { g.pagina--; pintarTabla(col); };
    $('#pSig_' + col).onclick = () => { g.pagina++; pintarTabla(col); };
  }

  function modalBaja(col, r) {
    const c = C[col];
    const m = abrirModal('Dar de baja: ' + r[c.titulo], `
      <div class="alerta warn">El elemento <strong>${esc(r.codigo)}</strong> saldrá del inventario disponible para consulta, pero se conservará en el registro histórico y en el reporte de bajas.</div>
      <form id="fBaja" class="rejilla-form">
        <div class="campo"><label>Fecha de baja <span class="req">*</span></label><input type="date" name="fecha" value="${hoyISO()}" required></div>
        <div class="campo"><label>Causa <span class="req">*</span></label><select name="causa" required>
          ${['Deterioro / daño irreparable', 'Obsolescencia tecnológica', 'Pérdida o hurto', 'Traslado a otra sede / entidad', 'Donación', 'Fin de vida útil', 'Otra'].map(o => `<option>${o}</option>`).join('')}</select></div>
        <div class="campo ancho-2" style="grid-column:1/-1"><label>Descripción del motivo <span class="req">*</span></label>
          <textarea name="desc" required minlength="10" placeholder="Describa el estado del elemento, el concepto técnico o el soporte (acta, denuncia, etc.)"></textarea>
          <span class="ayuda">Mínimo 10 caracteres.</span></div>
        <div class="acciones-form" style="grid-column:1/-1"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button class="btn btn-primario">${I.baja} Confirmar baja</button></div>
      </form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fBaja', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      if (d.desc.trim().length < 10) return aviso('Describa el motivo (mínimo 10 caracteres).', 'error');
      try {
        await conBoton(ev.submitter, () => llamar('darDeBaja', { coleccion: col, id: r.id, fecha: d.fecha, motivo: d.causa + ': ' + d.desc.trim() }));
        cerrarModal(); aviso(r.codigo + ' dado de baja.'); await refrescarColeccion(col);
      } catch (e) { aviso(e.message, 'error'); }
    };
  }

  function modalMotivo(col, r, accion) {
    const c = C[col];
    const elim = accion === 'eliminar';
    const titulo = elim ? (c.baja ? 'Eliminar definitivamente' : 'Quitar del inventario') : 'Reactivar elemento';
    const m = abrirModal(titulo + ': ' + r.codigo, `
      ${elim ? `<div class="alerta error">Se eliminará <strong>${esc(r[c.titulo])}</strong> de la base de datos. Una copia queda en el historial de cambios.
        ${c.baja ? '<br>Si el elemento salió de servicio por daño, pérdida u obsolescencia, utilice mejor <strong>Dar de baja</strong>.' : ''}</div>`
        : `<div class="alerta info">El elemento volverá a estar activo y disponible para consulta.</div>`}
      <form id="fMot"><div class="campo"><label>Descripción / justificación <span class="req">*</span></label>
        <textarea name="motivo" required minlength="10" placeholder="${elim ? 'Ej. Registro duplicado, error de digitación, ejemplar retirado…' : 'Ej. Equipo reparado y en funcionamiento'}"></textarea></div>
        <div class="acciones-form"><button type="button" class="btn btn-borde" data-x>Cancelar</button>
        <button class="btn ${elim ? 'btn-peligro' : 'btn-verde'}">${elim ? I.basura + ' Eliminar' : I.reactivar + ' Reactivar'}</button></div></form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fMot', m).onsubmit = async ev => {
      ev.preventDefault();
      const motivo = new FormData(ev.target).get('motivo').trim();
      if (motivo.length < 10) return aviso('Describa la justificación (mínimo 10 caracteres).', 'error');
      try {
        await conBoton(ev.submitter, () => llamar(elim ? 'eliminar' : 'reactivar', { coleccion: col, id: r.id, motivo }));
        cerrarModal(); aviso(elim ? 'Registro eliminado.' : 'Elemento reactivado.');
        if (estado.gestion[col].editando && estado.gestion[col].editando.id === r.id) limpiarForm(col);
        await refrescarColeccion(col);
      } catch (e) { aviso(e.message, 'error'); }
    };
  }

  async function verHistorial(col) {
    const m = abrirModal('Historial de cambios · ' + C[col].nombre, '<div class="cargando-bloque"><span class="cargando"></span></div>', { ancho: true, sinFoco: true });
    try {
      const h = (await llamar('historial', { coleccion: col })).registros;
      m.innerHTML = h.length ? `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Código</th><th>Descripción</th></tr></thead>
        <tbody>${h.map(x => `<tr><td style="white-space:nowrap">${esc(fechaBonita(x.fecha))}</td><td>${esc(x.usuario)}</td><td>${etiquetaAccion(x.accion)}</td><td>${esc(x.codigo)}</td><td>${esc(x.descripcion)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vacio">Aún no hay movimientos registrados.</div>';
    } catch (e) { m.innerHTML = `<div class="alerta error">${esc(e.message)}</div>`; }
  }
  function etiquetaAccion(a) {
    const cls = { Agregar: 'ok', 'Carga masiva': 'azul', Editar: 'azul', 'Dar de baja': 'warn', Eliminar: 'mal', Reactivar: 'ok' }[a] || '';
    return `<span class="etiqueta ${cls}">${esc(a)}</span>`;
  }

  /* -------- Carga masiva -------- */
  async function cargaMasiva(col, archivo) {
    const c = C[col];
    let lectura;
    try { lectura = await Excel.leerCarga(col, archivo); }
    catch (e) { return aviso(e.message, 'error'); }
    const { registros, errores } = lectura;
    const cols = c.tabla.map(k => c.campos.find(f => f.k === k));
    const m = abrirModal('Carga masiva · ' + c.nombre, `
      <div class="alerta ${errores.length ? 'warn' : 'info'}">Archivo <strong>${esc(archivo.name)}</strong> (hoja “${esc(lectura.hoja)}”):
        <strong>${fmt(registros.length)}</strong> filas válidas${errores.length ? ` y <strong>${fmt(errores.length)}</strong> con errores (no se cargarán)` : ''}.
        Los registros cuyo código ya exista se <strong>actualizarán</strong>.</div>
      ${errores.length ? `<details open><summary><strong>Filas con errores</strong></summary><ul class="lista-errores">${errores.slice(0, 200).map(e => `<li>Fila ${e.fila}: ${esc(e.error)}</li>`).join('')}</ul></details>` : ''}
      ${registros.length ? `<h3 style="margin-top:16px">Vista previa</h3><div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fila</th>${cols.map(f => `<th>${esc(f.l)}</th>`).join('')}</tr></thead>
        <tbody>${registros.slice(0, 8).map(r => `<tr><td>${r._filaExcel}</td>${cols.map(f => `<td>${esc(r[f.k] || (f.k === 'codigo' ? '(automático)' : ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        ${registros.length > 8 ? `<p style="color:var(--tinta-3);font-size:.88rem;margin-top:6px">… y ${fmt(registros.length - 8)} filas más.</p>` : ''}` : ''}
      <div class="acciones-form"><span id="progreso" style="margin-right:auto;color:var(--tinta-2)"></span><button class="btn btn-borde" data-x>Cancelar</button>
        <button class="btn btn-primario" id="btnImportar" ${registros.length ? '' : 'disabled'}>${I.subir} Cargar ${fmt(registros.length)} registros</button></div>`, { ancho: true, sinFoco: true });
    $('[data-x]', m).onclick = cerrarModal;
    $('#btnImportar', m).onclick = async ev => {
      const btn = ev.currentTarget;
      let ins = 0, act = 0; const errs = [];
      try {
        await conBoton(btn, async () => {
          const LOTE = 250;
          for (let i = 0; i < registros.length; i += LOTE) {
            $('#progreso').textContent = `Enviando ${fmt(Math.min(i + LOTE, registros.length))} de ${fmt(registros.length)}…`;
            const r = await llamar('importar', { coleccion: col, registros: registros.slice(i, i + LOTE) });
            ins += r.insertados; act += r.actualizados; errs.push(...r.errores);
          }
        });
        cerrarModal();
        await refrescarColeccion(col);
        abrirModal('Resultado de la carga', `<div class="alerta ${errs.length ? 'warn' : 'info'}"><strong>${fmt(ins)}</strong> registros nuevos y <strong>${fmt(act)}</strong> actualizados.${errs.length ? ` ${fmt(errs.length)} filas rechazadas por el servidor.` : ''}</div>
          ${errs.length ? `<ul class="lista-errores">${errs.map(e => `<li>Fila ${e.fila}: ${esc(e.error)}</li>`).join('')}</ul>` : ''}<div class="acciones-form"><button class="btn btn-primario" data-x>Aceptar</button></div>`);
        $('#modalCuerpo [data-x]').onclick = cerrarModal;
      } catch (e) { aviso(e.message, 'error'); }
    };
  }

  /* ============================== DASHBOARD ============================== */
  const SERIES = [
    { clave: 'Estudiante', nombre: 'Estudiantes', color: getComputedStyle(document.documentElement).getPropertyValue('--serie-estudiante').trim() || '#1F6FB8' },
    { clave: 'Docente', nombre: 'Docentes', color: getComputedStyle(document.documentElement).getPropertyValue('--serie-docente').trim() || '#C2185B' },
    { clave: 'Otros', nombre: 'Otros usuarios', color: getComputedStyle(document.documentElement).getPropertyValue('--serie-otros').trim() || '#8A909B' }
  ];
  const grupo = t => t === 'Estudiante' || t === 'Docente' ? t : 'Otros';

  async function vDashboard() {
    const v = $('#v-dashboard');
    if (!Sesion.usuario()) return bloqueo(v, 'Dashboard de consultas', 'dashboard');
    const d = estado.dash;
    v.innerHTML = `<div class="contenedor">
      <div class="cabecera-vista"><div><span class="eyebrow">Seguimiento</span><h2>Dashboard de registros de consulta</h2>
        <p>Uso de los servicios de consulta por estudiantes, docentes y demás usuarios.</p></div></div>
      <div class="filtros-dash">
        <div class="campo"><label>Periodo</label><select id="dPeriodo">
          <option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="90">Últimos 90 días</option>
          <option value="365">Último año</option><option value="todo">Todo el registro</option><option value="rango">Rango personalizado</option></select></div>
        <div class="campo" id="dDesdeC"><label>Desde</label><input type="date" id="dDesde"></div>
        <div class="campo" id="dHastaC"><label>Hasta</label><input type="date" id="dHasta"></div>
        <div class="campo"><label>Tipo de usuario</label><select id="dTipo"><option value="todos">Todos</option><option value="Estudiante">Estudiantes</option><option value="Docente">Docentes</option><option value="Otros">Otros usuarios</option></select></div>
        <div class="campo"><label>Servicio</label><select id="dServ"><option value="todos">Todos</option><option>Bibliográficos</option><option>Tecnológicos</option><option>Didácticos</option></select></div>
        <button class="btn btn-verde btn-s" id="dExportar">${I.bajar} Exportar a Excel</button>
      </div>
      <div id="dashCuerpo"><div class="cargando-bloque"><span class="cargando"></span> Cargando registros…</div></div></div>`;
    $('#dPeriodo').value = d.periodo; $('#dTipo').value = d.tipo; $('#dServ').value = d.servicio;
    $('#dDesde').value = d.desde; $('#dHasta').value = d.hasta;
    const sync = () => {
      d.periodo = $('#dPeriodo').value; d.tipo = $('#dTipo').value; d.servicio = $('#dServ').value; d.desde = $('#dDesde').value; d.hasta = $('#dHasta').value; d.pagina = 0;
      $('#dDesdeC').hidden = $('#dHastaC').hidden = d.periodo !== 'rango';
      pintarDashboard();
    };
    ['dPeriodo', 'dTipo', 'dServ', 'dDesde', 'dHasta'].forEach(id => $('#' + id).onchange = sync);
    $('#dDesdeC').hidden = $('#dHastaC').hidden = d.periodo !== 'rango';
    $('#dExportar').onclick = () => { try { const f = filtrarDash(); Excel.reporteConsultas(f.lista, f.etiqueta); } catch (e) { aviso(e.message, 'error'); } };
    try { d.datos = (await llamar('dashboard')).consultas; pintarDashboard(); }
    catch (e) { $('#dashCuerpo').innerHTML = `<div class="alerta error">${esc(e.message)}</div>`; }
  }

  function filtrarDash() {
    const d = estado.dash;
    const hoy = hoyISO();
    let desde = '', hasta = hoy, etiqueta;
    if (d.periodo === 'rango') { desde = d.desde || '0000'; hasta = d.hasta || hoy; etiqueta = (d.desde || 'inicio') + ' a ' + (d.hasta || hoy); }
    else if (d.periodo === 'todo') { desde = '0000'; etiqueta = 'Todo el registro'; }
    else { const x = new Date(); x.setDate(x.getDate() - (+d.periodo - 1)); desde = new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 10); etiqueta = 'Últimos ' + d.periodo + ' días'; }
    const lista = (d.datos || []).filter(c => {
      const f = String(c.fecha).slice(0, 10);
      return f >= desde && f <= hasta && (d.tipo === 'todos' || grupo(c.tipo) === d.tipo) && (d.servicio === 'todos' || c.servicio === d.servicio);
    });
    return { lista, desde, hasta, etiqueta };
  }

  function contar(lista, clave) { const m = {}; lista.forEach(x => { const k = x[clave] || 'Sin especificar'; m[k] = (m[k] || 0) + 1; }); return m; }

  function pintarDashboard() {
    const cont = $('#dashCuerpo'); if (!cont || !estado.dash.datos) return;
    const { lista, desde, hasta } = filtrarDash();
    const porG = { Estudiante: 0, Docente: 0, Otros: 0 };
    lista.forEach(c => porG[grupo(c.tipo)]++);
    const primera = lista.length ? lista.reduce((m, c) => c.fecha < m ? c.fecha : m, lista[0].fecha).slice(0, 10) : hasta;
    const ini = desde === '0000' ? primera : desde;
    const dias = Math.max(1, Math.round((new Date(hasta) - new Date(ini)) / 864e5) + 1);
    cont.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="kpi__et">Total de consultas</div><div class="kpi__val">${fmt(lista.length)}</div><div class="kpi__nota">${fmt(dias)} días en el periodo</div></div>
        ${SERIES.map(s => `<div class="kpi"><div class="kpi__et"><i style="background:${s.color}"></i>${s.nombre}</div><div class="kpi__val">${fmt(porG[s.clave])}</div>
          <div class="kpi__nota">${lista.length ? Math.round(porG[s.clave] / lista.length * 100) : 0}% del total</div></div>`).join('')}
        <div class="kpi"><div class="kpi__et">Promedio diario</div><div class="kpi__val">${(lista.length / dias).toLocaleString('es-CO', { maximumFractionDigits: 1 })}</div><div class="kpi__nota">consultas por día</div></div>
      </div>
      <div class="dash-grid">
        <div class="tarjeta ancho-total"><div class="tarjeta__cab"><h3>Consultas en el tiempo</h3><span class="etiqueta" id="gTiempoEt"></span></div><div class="grafico" id="gTiempo"></div></div>
        <div class="tarjeta"><div class="tarjeta__cab"><h3>Consultas por servicio</h3></div><div class="grafico" id="gServicio"></div></div>
        <div class="tarjeta"><div class="tarjeta__cab"><h3>Términos más buscados</h3></div><div class="grafico" id="gTerminos"></div></div>
        <div class="tarjeta"><div class="tarjeta__cab"><h3>Estudiantes por grado</h3></div><div class="grafico" id="gGrado"></div></div>
        <div class="tarjeta"><div class="tarjeta__cab"><h3>Docentes por área</h3></div><div class="grafico" id="gArea"></div></div>
        <div class="tarjeta ancho-total"><div class="tarjeta__cab"><h3>Registro de consultas</h3>
          <div class="pestanas" role="tablist" style="margin:0" id="dTabs">
            ${['Estudiante', 'Docente', 'Otros', 'Todos'].map(t => `<button role="tab" data-t="${t}" aria-selected="${estado.dash.tabla === t}">${{ Estudiante: 'Estudiantes', Docente: 'Docentes', Otros: 'Otros', Todos: 'Todos' }[t]}</button>`).join('')}
          </div></div><div id="dTabla"></div></div>
      </div>`;

    // Serie temporal: diaria hasta 62 días; si no, mensual.
    const mensual = dias > 62;
    const claves = [], etiquetas = [];
    if (mensual) {
      const a = new Date(ini + 'T00:00:00'); a.setDate(1); const b = new Date(hasta + 'T00:00:00');
      while (a <= b) { claves.push(a.toISOString().slice(0, 7)); etiquetas.push(a.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })); a.setMonth(a.getMonth() + 1); }
    } else {
      const a = new Date(ini + 'T12:00:00'), b = new Date(hasta + 'T12:00:00');
      while (a <= b) { claves.push(a.toISOString().slice(0, 10)); etiquetas.push(a.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })); a.setDate(a.getDate() + 1); }
    }
    $('#gTiempoEt').textContent = mensual ? 'Por mes' : 'Por día';
    const idx = {}; claves.forEach((k, i) => idx[k] = i);
    const vals = SERIES.map(() => claves.map(() => 0));
    lista.forEach(c => { const k = String(c.fecha).slice(0, mensual ? 7 : 10); if (idx[k] !== undefined) vals[SERIES.findIndex(s => s.clave === grupo(c.tipo))][idx[k]]++; });
    Graficos.columnasApiladas($('#gTiempo'), { categorias: claves, etiquetas, series: SERIES.map((s, i) => ({ nombre: s.nombre, color: s.color, valores: vals[i] })) });

    const servicios = ['Bibliográficos', 'Tecnológicos', 'Didácticos'];
    Graficos.barrasHorizontales($('#gServicio'), {
      series: SERIES, etiquetaAncho: 120,
      items: servicios.map(s => ({ etiqueta: s, valores: SERIES.map(se => lista.filter(c => c.servicio === s && grupo(c.tipo) === se.clave).length) }))
    });
    const term = {}; lista.forEach(c => { const t = norm(c.termino).trim(); if (t) term[t] = (term[t] || 0) + 1; });
    Graficos.barrasHorizontales($('#gTerminos'), { series: [{ nombre: 'Búsquedas', color: '#14518A' }], etiquetaAncho: 160,
      items: Object.entries(term).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ etiqueta: k, valores: [v] })) });
    const est = lista.filter(c => c.tipo === 'Estudiante'), gr = contar(est, 'grado');
    Graficos.barrasHorizontales($('#gGrado'), { series: [SERIES[0]], etiquetaAncho: 140,
      items: E.GRADOS.concat(Object.keys(gr).filter(k => !E.GRADOS.includes(k))).filter(g => gr[g]).map(g => ({ etiqueta: g, valores: [gr[g]] })) });
    const ar = contar(lista.filter(c => c.tipo === 'Docente'), 'area');
    Graficos.barrasHorizontales($('#gArea'), { series: [SERIES[1]], etiquetaAncho: 170,
      items: Object.entries(ar).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ etiqueta: k, valores: [v] })) });

    $$('#dTabs [data-t]').forEach(b => b.onclick = () => { estado.dash.tabla = b.dataset.t; estado.dash.pagina = 0; pintarDashboard(); });
    pintarTablaDash(lista);
  }

  function pintarTablaDash(lista) {
    const d = estado.dash, cont = $('#dTabla');
    const filas = lista.filter(c => d.tabla === 'Todos' || grupo(c.tipo) === d.tabla).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    if (!filas.length) { cont.innerHTML = '<div class="sin-datos">Sin registros para este grupo en el periodo.</div>'; return; }
    const POR = 15, pags = Math.ceil(filas.length / POR); d.pagina = Math.min(d.pagina, pags - 1);
    const v = filas.slice(d.pagina * POR, d.pagina * POR + POR);
    const colExtra = d.tabla === 'Estudiante' ? ['grado', 'Grado'] : d.tabla === 'Docente' ? ['area', 'Área'] : ['tipo', 'Tipo'];
    cont.innerHTML = `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Nombre</th><th>${colExtra[1]}</th><th>Servicio</th><th>Búsqueda</th><th>Filtros</th><th style="text-align:right">Resultados</th></tr></thead>
      <tbody>${v.map(c => `<tr><td style="white-space:nowrap">${esc(fechaBonita(c.fecha))}</td><td>${esc(c.nombre || '—')}</td><td>${esc(c[colExtra[0]] || '—')}</td><td>${esc(c.servicio)}</td>
        <td>${esc(c.termino || '—')}</td><td style="font-size:.86rem;color:var(--tinta-2)">${esc(c.filtros)}</td><td class="num">${esc(c.resultados)}</td></tr>`).join('')}</tbody></table></div>
      <div class="paginacion"><span>${fmt(filas.length)} registros</span><span>
        <button class="btn btn-borde btn-s" id="dAnt" ${d.pagina === 0 ? 'disabled' : ''}>Anterior</button><span style="margin:0 8px">Página ${d.pagina + 1} de ${pags}</span>
        <button class="btn btn-borde btn-s" id="dSig" ${d.pagina >= pags - 1 ? 'disabled' : ''}>Siguiente</button></span></div>`;
    $('#dAnt').onclick = () => { d.pagina--; pintarTablaDash(lista); };
    $('#dSig').onclick = () => { d.pagina++; pintarTablaDash(lista); };
  }

  /* ============================== CUENTAS ============================== */
  async function vUsuarios() {
    const v = $('#v-usuarios');
    const u = Sesion.usuario();
    if (!u || u.rol !== 'admin') return bloqueo(v, 'Administración de cuentas', 'usuarios');
    v.innerHTML = `<div class="contenedor">
      <div class="cabecera-vista"><div><span class="eyebrow">Administración</span><h2>Cuentas de usuario</h2>
        <p>Cree cuentas para el personal autorizado y asigne la sección que administrará cada persona.</p></div></div>
      <details class="form-registro" open><summary><span class="mas">+</span> Crear cuenta</summary>
        <form id="fUsr"><div class="rejilla-form">
          <div class="campo"><label>Usuario <span class="req">*</span></label><input name="usuario" required pattern="[A-Za-z0-9._\\-]{3,60}" placeholder="ej. biblioteca.ensma"></div>
          <div class="campo"><label>Nombre completo <span class="req">*</span></label><input name="nombre" required></div>
          <div class="campo"><label>Correo</label><input name="correo" type="email"></div>
          <div class="campo"><label>Rol / sección <span class="req">*</span></label><select name="rol">${Object.entries(E.ROLES).map(([k, x]) => `<option value="${k}">${esc(x)}</option>`).join('')}</select></div>
          <div class="campo"><label>Contraseña (mín. 8) <span class="req">*</span></label><input name="clave" type="password" minlength="8" required autocomplete="new-password"></div>
          <div class="campo"><label>Confirmar contraseña <span class="req">*</span></label><input name="conf" type="password" minlength="8" required autocomplete="new-password"></div>
        </div><div class="acciones-form"><button class="btn btn-primario">Crear cuenta</button></div></form>
      </details>
      <div class="tarjeta" id="tSolicitudes" hidden><div class="tarjeta__cab"><h3>Solicitudes de cuenta pendientes</h3></div><div id="lSolicitudes"></div></div>
      <div class="tarjeta"><div class="tarjeta__cab"><h3>Cuentas registradas</h3></div><div id="lUsuarios"><div class="cargando-bloque"><span class="cargando"></span></div></div></div>
    </div>`;
    $('#fUsr').onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      if (d.clave !== d.conf) return aviso('Las contraseñas no coinciden.', 'error');
      delete d.conf; d.nuevo = true;
      try { await conBoton(ev.submitter, () => llamar('guardarUsuario', { datos: d })); ev.target.reset(); aviso('Cuenta creada: ' + d.usuario.toLowerCase()); cargarUsuarios(); }
      catch (e) { aviso(e.message, 'error'); }
    };
    cargarUsuarios();
  }

  async function cargarUsuarios() {
    let r;
    try { r = await llamar('usuarios'); } catch (e) { $('#lUsuarios').innerHTML = `<div class="alerta error">${esc(e.message)}</div>`; return; }
    const yo = Sesion.usuario().usuario;
    $('#lUsuarios').innerHTML = `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Último ingreso</th><th class="acc">Acciones</th></tr></thead>
      <tbody>${r.usuarios.map(u => `<tr><td><strong>${esc(u.usuario)}</strong></td><td>${esc(u.nombre)}<br><small style="color:var(--tinta-3)">${esc(u.correo)}</small></td>
        <td>${esc((E.ROLES[u.rol] || u.rol).split(' (')[0])}</td><td>${u.activo === 'SI' ? '<span class="etiqueta ok">Activa</span>' : '<span class="etiqueta mal">Inactiva</span>'}</td>
        <td>${esc(fechaBonita(u.ultimoIngreso) || '—')}</td>
        <td class="acc"><button class="btn-icono" data-ed="${esc(u.usuario)}" title="Editar" aria-label="Editar">${I.editar}</button>
        ${u.usuario !== yo ? `<button class="btn-icono peligro" data-del="${esc(u.usuario)}" title="Eliminar" aria-label="Eliminar">${I.basura}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-ed]').forEach(b => b.onclick = () => editarUsuario(r.usuarios.find(u => u.usuario === b.dataset.ed)));
    $$('[data-del]').forEach(b => b.onclick = async () => {
      if (!await confirmar('Eliminar cuenta', `¿Eliminar la cuenta <strong>${esc(b.dataset.del)}</strong>? La persona ya no podrá ingresar.`, 'Eliminar', 'btn-peligro')) return;
      try { await llamar('eliminarUsuario', { usuarioId: b.dataset.del }); aviso('Cuenta eliminada.'); cargarUsuarios(); } catch (e) { aviso(e.message, 'error'); }
    });
    const pend = r.solicitudes.filter(s => s.estado === 'Pendiente');
    $('#tSolicitudes').hidden = !pend.length;
    $('#lSolicitudes').innerHTML = `<div class="tabla-envoltura"><table class="tabla"><thead><tr><th>Fecha</th><th>Nombre</th><th>Usuario</th><th>Cargo</th><th>Sección solicitada</th><th class="acc">Acciones</th></tr></thead>
      <tbody>${pend.map(s => `<tr><td>${esc(fechaBonita(s.fecha))}</td><td>${esc(s.nombre)}<br><small>${esc(s.correo)}</small></td><td>${esc(s.usuario)}</td><td>${esc(s.cargo)}</td>
        <td>${esc((E.ROLES[s.rolSolicitado] || s.rolSolicitado).split(' (')[0])}</td>
        <td class="acc"><button class="btn btn-verde btn-s" data-apr="${esc(s.id)}">Aprobar</button> <button class="btn btn-borde btn-s" data-rec="${esc(s.id)}">Rechazar</button></td></tr>`).join('')}</tbody></table></div>`;
    $$('[data-apr]').forEach(b => b.onclick = () => aprobarSolicitud(pend.find(s => s.id === b.dataset.apr)));
    $$('[data-rec]').forEach(b => b.onclick = async () => {
      if (!await confirmar('Rechazar solicitud', '¿Rechazar esta solicitud de cuenta?', 'Rechazar', 'btn-peligro')) return;
      try { await llamar('atenderSolicitud', { id: b.dataset.rec, decision: 'rechazar' }); aviso('Solicitud rechazada.'); cargarUsuarios(); } catch (e) { aviso(e.message, 'error'); }
    });
  }

  function editarUsuario(u) {
    const m = abrirModal('Editar cuenta: ' + u.usuario, `<form id="fEdU" class="rejilla-form">
      <div class="campo"><label>Nombre</label><input name="nombre" value="${esc(u.nombre)}" required></div>
      <div class="campo"><label>Correo</label><input name="correo" type="email" value="${esc(u.correo)}"></div>
      <div class="campo"><label>Rol</label><select name="rol">${Object.entries(E.ROLES).map(([k, x]) => `<option value="${k}" ${k === u.rol ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="campo"><label>Estado</label><select name="activo"><option value="SI" ${u.activo === 'SI' ? 'selected' : ''}>Activa</option><option value="NO" ${u.activo !== 'SI' ? 'selected' : ''}>Inactiva</option></select></div>
      <div class="campo ancho-2" style="grid-column:1/-1"><label>Nueva contraseña (dejar vacío para no cambiarla)</label><input name="clave" type="password" minlength="8" autocomplete="new-password"></div>
      <div class="acciones-form" style="grid-column:1/-1"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button class="btn btn-primario">Guardar</button></div></form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fEdU', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.assign(Object.fromEntries(new FormData(ev.target)), { usuario: u.usuario });
      try { await conBoton(ev.submitter, () => llamar('guardarUsuario', { datos: d })); cerrarModal(); aviso('Cuenta actualizada.'); cargarUsuarios(); }
      catch (e) { aviso(e.message, 'error'); }
    };
  }

  function aprobarSolicitud(s) {
    const m = abrirModal('Aprobar solicitud: ' + s.nombre, `<form id="fApr">
      <p>Se creará la cuenta <strong>${esc(s.usuario)}</strong>. Comunique la contraseña inicial a la persona y pídale cambiarla al ingresar.</p>
      <div class="campo"><label>Rol / sección</label><select name="rol">${Object.entries(E.ROLES).map(([k, x]) => `<option value="${k}" ${k === s.rolSolicitado ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="campo" style="margin-top:12px"><label>Contraseña inicial (mín. 8)</label><input name="clave" type="text" minlength="8" required value="Ensma-${Math.random().toString(36).slice(2, 8)}"></div>
      <div class="acciones-form"><button type="button" class="btn btn-borde" data-x>Cancelar</button><button class="btn btn-verde">Aprobar y crear cuenta</button></div></form>`);
    $('[data-x]', m).onclick = cerrarModal;
    $('#fApr', m).onsubmit = async ev => {
      ev.preventDefault();
      const d = Object.fromEntries(new FormData(ev.target));
      try { await conBoton(ev.submitter, () => llamar('atenderSolicitud', { id: s.id, decision: 'aprobar', rol: d.rol, clave: d.clave })); cerrarModal(); aviso('Cuenta creada para ' + s.usuario); cargarUsuarios(); }
      catch (e) { aviso(e.message, 'error'); }
    };
  }

  /* ------------------------------ Arranque ------------------------------ */
  $('#pieAnio').textContent = '© ' + new Date().getFullYear();
  if (DEMO) {
    $('#avisoDemo').hidden = false;
    $('#btnReiniciarDemo').onclick = async () => {
      if (!await confirmar('Restablecer demostración', 'Se borrarán los cambios hechos en este navegador y se cargarán de nuevo los datos de ejemplo.', 'Restablecer')) return;
      Demo.reiniciar(); estado.publico = {}; estado.completo = {}; estado.resumen = null; aviso('Datos de ejemplo restablecidos.'); enrutar();
    };
  }
  pintarUsuario();
  enrutar();
})();
