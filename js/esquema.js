/* Definición de colecciones, campos, listas y roles (compartido por toda la interfaz). */
(function () {
  const AREAS = ['Matemáticas', 'Lenguaje y Literatura', 'Ciencias Naturales', 'Ciencias Sociales',
    'Pedagogía y Educación', 'Inglés', 'Tecnología e Informática', 'Artes', 'Educación Física',
    'Ética y Religión', 'Filosofía', 'Literatura infantil', 'Preescolar', 'Referencia general', 'Otra'];
  const FUENTES = ['Recursos propios', 'MEN', 'Gobernación de Cundinamarca', 'Alcaldía de Girardot', 'Donación', 'Otra'];
  const ESTADO_FISICO = ['Bueno', 'Regular', 'Malo', 'En mantenimiento'];

  const COLECCIONES = {
    libros: {
      nombre: 'Libros', singular: 'libro', servicio: 'Bibliográficos', prefijo: 'LIB', rol: 'biblioteca', baja: false,
      icono: 'libro', titulo: 'titulo', subtitulo: 'autor', cantidad: 'ejemplares',
      campos: [
        { k: 'codigo', l: 'Código', t: 'text', ph: 'Automático si se deja vacío (LIB-0001)' },
        { k: 'titulo', l: 'Título', t: 'text', req: true, ancho: 2 },
        { k: 'autor', l: 'Autor(es)', t: 'text', req: true },
        { k: 'editorial', l: 'Editorial', t: 'text' },
        { k: 'anio', l: 'Año de publicación', t: 'number', min: 1500, max: 2100 },
        { k: 'area', l: 'Área', t: 'select', op: AREAS, filtro: true },
        { k: 'tipo', l: 'Tipo de material', t: 'select', op: ['Texto escolar', 'Libro de consulta', 'Literatura', 'Enciclopedia / Diccionario', 'Revista', 'Guía docente', 'Otro'], filtro: true },
        { k: 'ejemplares', l: 'N.º de ejemplares', t: 'number', req: true, min: 0, def: 1 },
        { k: 'ubicacion', l: 'Ubicación (estante)', t: 'text', ph: 'Ej. Estante A-3' },
        { k: 'estado', l: 'Estado', t: 'select', op: ['Óptimo', 'Regular', 'Malo'], req: true, def: 'Óptimo', filtro: true },
        { k: 'disponibilidad', l: 'Disponibilidad', t: 'select', op: ['Disponible', 'Prestado', 'En reparación', 'Extraviado'], def: 'Disponible', filtro: true },
        { k: 'observaciones', l: 'Observaciones', t: 'textarea', ancho: 2 }
      ],
      tabla: ['codigo', 'titulo', 'autor', 'area', 'ejemplares', 'estado', 'disponibilidad']
    },
    repositorios: {
      nombre: 'Repositorios PFC', singular: 'trabajo de grado', servicio: 'Bibliográficos', prefijo: 'REP', rol: 'biblioteca', baja: false,
      icono: 'repo', titulo: 'titulo', subtitulo: 'autores',
      campos: [
        { k: 'codigo', l: 'Código', t: 'text', ph: 'Automático si se deja vacío (REP-0001)' },
        { k: 'titulo', l: 'Título del trabajo de grado', t: 'text', req: true, ancho: 2 },
        { k: 'autores', l: 'Autor(es) – estudiantes PFC', t: 'text', req: true },
        { k: 'asesor', l: 'Asesor(a) / director(a)', t: 'text' },
        { k: 'anio', l: 'Año', t: 'number', req: true, min: 1990, max: 2100, ph: 'Ej. 2025', filtro: true },
        { k: 'linea', l: 'Línea de investigación', t: 'select', op: ['Pedagogía y didáctica', 'Infancia y educación inicial', 'Educación inclusiva', 'TIC y educación', 'Educación matemática', 'Lenguaje y literatura', 'Educación ambiental y territorio', 'Otra'], filtro: true },
        { k: 'modalidad', l: 'Modalidad', t: 'select', op: ['Trabajo de grado', 'Proyecto de investigación', 'Sistematización de práctica', 'Monografía', 'Otra'], filtro: true },
        { k: 'formato', l: 'Formato', t: 'select', op: ['Digital', 'Físico', 'Digital y físico'], def: 'Digital', filtro: true }
      ],
      tabla: ['codigo', 'titulo', 'autores', 'anio', 'linea', 'formato']
    },
    tecnologicos: {
      nombre: 'Recursos tecnológicos', singular: 'elemento tecnológico', servicio: 'Tecnológicos', prefijo: 'TEC', rol: 'tecnologia', baja: true,
      icono: 'tec', titulo: 'nombre', subtitulo: 'categoria', cantidad: 'cantidad',
      campos: [
        { k: 'codigo', l: 'Código / placa', t: 'text', ph: 'Automático si se deja vacío (TEC-0001)' },
        { k: 'nombre', l: 'Nombre del elemento', t: 'text', req: true, ancho: 2 },
        { k: 'categoria', l: 'Categoría', t: 'select', req: true, filtro: true, op: ['Computador de escritorio', 'Computador portátil', 'Tableta', 'Video beam / proyector', 'Televisor / pantalla', 'Tablero digital', 'Impresora / escáner', 'Equipo de red', 'Audio y sonido', 'Cámara / fotografía', 'Robótica / kits STEM', 'Otro'] },
        { k: 'marca', l: 'Marca', t: 'text' },
        { k: 'modelo', l: 'Modelo', t: 'text' },
        { k: 'serial', l: 'Serial', t: 'text' },
        { k: 'cantidad', l: 'Cantidad', t: 'number', req: true, min: 0, def: 1 },
        { k: 'ubicacion', l: 'Ubicación', t: 'text', req: true, ph: 'Ej. Sala de informática 1', filtro: true, lista: true },
        { k: 'responsable', l: 'Responsable', t: 'text' },
        { k: 'fechaAdquisicion', l: 'Fecha de adquisición', t: 'date' },
        { k: 'fuente', l: 'Fuente / procedencia', t: 'select', op: FUENTES },
        { k: 'estado', l: 'Estado físico', t: 'select', op: ESTADO_FISICO, def: 'Bueno', filtro: true },
        { k: 'observaciones', l: 'Observaciones', t: 'textarea', ancho: 2 }
      ],
      tabla: ['codigo', 'nombre', 'categoria', 'cantidad', 'ubicacion', 'estado']
    },
    didacticos: {
      nombre: 'Recursos didácticos', singular: 'elemento didáctico', servicio: 'Didácticos', prefijo: 'DID', rol: 'didactica', baja: true,
      icono: 'did', titulo: 'nombre', subtitulo: 'categoria', cantidad: 'cantidad',
      campos: [
        { k: 'codigo', l: 'Código', t: 'text', ph: 'Automático si se deja vacío (DID-0001)' },
        { k: 'nombre', l: 'Nombre del elemento', t: 'text', req: true, ancho: 2 },
        { k: 'categoria', l: 'Categoría', t: 'select', req: true, filtro: true, op: ['Material manipulativo', 'Juegos didácticos', 'Material de laboratorio', 'Instrumentos musicales', 'Material deportivo', 'Láminas, mapas y carteles', 'Kits de construcción', 'Material de arte', 'Títeres y dramatización', 'Otro'] },
        { k: 'area', l: 'Área', t: 'select', op: AREAS, filtro: true },
        { k: 'nivel', l: 'Nivel educativo', t: 'select', op: ['Preescolar', 'Básica primaria', 'Básica secundaria', 'Media', 'PFC', 'Todos los niveles'], filtro: true },
        { k: 'cantidad', l: 'Cantidad', t: 'number', req: true, min: 0, def: 1 },
        { k: 'material', l: 'Material de fabricación', t: 'text', ph: 'Madera, plástico, metal…' },
        { k: 'ubicacion', l: 'Ubicación', t: 'text', ph: 'Ej. Aula de preescolar', lista: true },
        { k: 'responsable', l: 'Responsable', t: 'text' },
        { k: 'fechaAdquisicion', l: 'Fecha de adquisición', t: 'date' },
        { k: 'fuente', l: 'Fuente / procedencia', t: 'select', op: FUENTES },
        { k: 'estado', l: 'Estado físico', t: 'select', op: ESTADO_FISICO, def: 'Bueno', filtro: true },
        { k: 'observaciones', l: 'Observaciones', t: 'textarea', ancho: 2 }
      ],
      tabla: ['codigo', 'nombre', 'categoria', 'area', 'cantidad', 'estado']
    }
  };

  const CAMPOS_SISTEMA = [
    { k: 'situacion', l: 'Situación' }, { k: 'fechaBaja', l: 'Fecha de baja' }, { k: 'motivoBaja', l: 'Motivo de baja' },
    { k: 'bajaPor', l: 'Baja registrada por' }, { k: 'fechaRegistro', l: 'Fecha de registro' }, { k: 'registradoPor', l: 'Registrado por' },
    { k: 'fechaActualizacion', l: 'Última actualización' }, { k: 'actualizadoPor', l: 'Actualizado por' }
  ];

  const ROLES = {
    admin: 'Administrador (todas las secciones y cuentas)',
    biblioteca: 'Biblioteca (libros y repositorios)',
    tecnologia: 'Recursos tecnológicos',
    didactica: 'Recursos didácticos',
    directivo: 'Directivo (dashboard y reportes, solo lectura)'
  };

  const TIPOS_CONSULTANTE = ['Estudiante', 'Docente', 'Directivo / Administrativo', 'Padre de familia', 'Visitante'];
  const GRADOS = ['Transición', '1°', '2°', '3°', '4°', '5°', '6°', '7°', '8°', '9°', '10°', '11°',
    'PFC – Semestre I', 'PFC – Semestre II', 'PFC – Semestre III', 'PFC – Semestre IV'];

  window.ESQUEMA = { COLECCIONES, CAMPOS_SISTEMA, ROLES, TIPOS_CONSULTANTE, GRADOS, AREAS };
})();
