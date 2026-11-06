# Sistema de Consulta de Recursos Institucionales — ENSMA Girardot

Sitio web de la **Escuela Normal Superior María Auxiliadora de Girardot** para consultar y administrar los recursos **bibliográficos** (libros y repositorios de trabajos de grado del PFC), **tecnológicos** y **didácticos**.

- **Frontend:** sitio estático (HTML/CSS/JS) publicado con **GitHub Pages**.
- **Base de datos y servidor:** **Google Sheets + Google Apps Script** (gratuito, en el Drive institucional).
- **Excel:** plantillas de carga masiva, carga masiva y reportes actualizados (librería SheetJS incluida en `js/vendor`).

---

## 1. Funcionalidades

| Sección | Acceso | Qué permite |
|---|---|---|
| **Inicio** | Público | Cifras actualizadas: libros (ejemplares y títulos), repositorios PFC, equipos tecnológicos y didácticos. |
| **Consulta de inventarios** | Público (con registro obligatorio) | Antes de consultar, cada persona diligencia un registro obligatorio (tipo de usuario, nombre completo y grado o área), que se solicita de nuevo cada vez que ingresa al sitio. Elegir servicio (Bibliográficos → Libros / Repositorios PFC, Tecnológicos, Didácticos), buscar por texto, filtrar (área, tipo, estado, categoría, ubicación, línea, año…), ver detalle. Cada consulta queda registrada con el tipo de usuario (estudiante, docente, etc.). |
| **Biblioteca** | Rol *biblioteca* o *admin* | Dos espacios independientes: **Libros** y **Repositorios de trabajos de grado (PFC)**. Formulario para agregar/editar, quitar registros con justificación, plantilla Excel, carga masiva y reporte Excel. |
| **Tecnológica** | Rol *tecnologia* o *admin* | Formulario de registro, edición, **dar de baja** (fecha, causa y descripción), reactivar, eliminar definitivamente con justificación, plantilla, carga masiva y reporte Excel (incluye hoja de bajas). |
| **Didáctica** | Rol *didactica* o *admin* | Igual que la sección tecnológica, para material didáctico. |
| **Dashboard** | Cualquier usuario con cuenta | Consultas por periodo, por tipo de usuario (**estudiantes / docentes / otros**), por servicio, estudiantes por grado, docentes por área, términos más buscados y tabla de registros. Exportación a Excel. |
| **Cuentas** | Solo *admin* | Crear, editar, desactivar y eliminar cuentas; aprobar o rechazar solicitudes de cuenta. |

**Roles:** `admin`, `biblioteca`, `tecnologia`, `didactica`, `directivo` (rector/coordinación: ve todo en solo lectura y descarga reportes).

Todas las acciones de gestión quedan en la hoja **Historial** (quién, cuándo, qué y por qué). Las contraseñas se guardan cifradas (SHA‑256 con sal).

---

## 2. Estructura del repositorio

```
├── index.html              Página única del sitio
├── .nojekyll               Evita el procesamiento Jekyll de GitHub Pages
├── css/estilos.css         Estilos con los colores institucionales
├── assets/escudo.png       Escudo institucional (y favicon.png)
├── js/
│   ├── config.js           ← AQUÍ se pega la URL del servidor (API_URL)
│   ├── esquema.js          Campos de cada inventario, listas y roles
│   ├── api.js              Conexión al servidor + modo demostración
│   ├── excel.js            Plantillas, carga masiva y reportes
│   ├── graficos.js         Gráficos del dashboard
│   ├── app.js              Lógica de la aplicación
│   └── vendor/xlsx.full.min.js   Librería SheetJS (Apache 2.0)
└── apps-script/Codigo.gs   Servidor (se pega en Google Apps Script, NO se ejecuta en GitHub)
```

---

## 3. Probarlo sin instalar nada (modo demostración)

Con `API_URL` vacío en `js/config.js`, el sitio funciona con datos de ejemplo guardados en el navegador. Usuarios de prueba:

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin2026 | Administrador |
| biblioteca | biblio2026 | Biblioteca |
| tecnologia | tecno2026 | Tecnológica |
| didactica | didac2026 | Didáctica |

> Estos usuarios **solo existen en el modo demostración**. En producción las cuentas viven en la hoja *Usuarios*.

---

## 4. Instalación en producción

### Paso 1 · Crear la base de datos (Google Sheets)
1. Con la cuenta institucional, cree una hoja de cálculo nueva en Google Drive, por ejemplo **"BD Recursos ENSMA"**.
2. Menú **Extensiones → Apps Script**.
3. Borre el contenido de `Código.gs` y pegue todo el archivo `apps-script/Codigo.gs`.
4. En la parte superior del archivo cambie la contraseña inicial del administrador:
   ```js
   ADMIN_USUARIO: 'admin',
   ADMIN_CLAVE: 'Ensma2026*',   // ← cámbiela
   ```
5. Guarde (💾). En la lista de funciones seleccione **`instalar`** y pulse **Ejecutar**. Acepte los permisos que solicita Google (es su propia cuenta).
   Se crean las hojas: *Libros, Repositorios, Tecnologicos, Didacticos, Usuarios, Solicitudes, Consultas, Historial*.

### Paso 2 · Publicar el servidor
1. **Implementar → Nueva implementación → ⚙ Tipo: Aplicación web**.
2. *Ejecutar como:* **Yo**. *Quién tiene acceso:* **Cualquier persona**.
3. Pulse **Implementar** y copie la **URL de la aplicación web** (termina en `/exec`).

> Cada vez que modifique `Codigo.gs` use **Implementar → Gestionar implementaciones → ✏ Editar → Versión: Nueva versión** para conservar la misma URL.

### Paso 3 · Conectar el sitio
Abra `js/config.js` y pegue la URL:
```js
API_URL: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

### Paso 4 · Publicar en GitHub Pages
1. Cree un repositorio en GitHub (p. ej. `recursos-ENSMAG`) y suba **todo el contenido de esta carpeta** (puede arrastrar los archivos en *Add file → Upload files*).
2. **Settings → Pages → Source:** *Deploy from a branch* · Rama `main` · Carpeta `/ (root)` → **Save**.
3. En 1–2 minutos el sitio estará en `https://SU-USUARIO.github.io/recursos-ENSMAG/`.

### Paso 5 · Primer ingreso
1. Entre al sitio, pulse **Ingresar** con `admin` y la contraseña definida en el Paso 1.
2. Cambie la contraseña (icono 🔑 junto a su nombre).
3. En **Cuentas**, cree las cuentas de la bibliotecaria, el encargado de tecnología, la encargada de material didáctico y los directivos.

---

## 5. Carga masiva con Excel
1. En la sección correspondiente pulse **Plantilla Excel** y diligencie la hoja *Plantilla* desde la fila 2 (la hoja *Instrucciones* indica los valores permitidos de cada lista).
2. Pulse **Carga masiva** y seleccione el archivo. El sistema valida cada fila y muestra una vista previa con los errores antes de cargar.
3. Si una fila trae un **código existente**, el registro se **actualiza** (las celdas vacías no borran datos); si el código está vacío, se asigna automáticamente (`LIB-0001`, `REP-0001`, `TEC-0001`, `DID-0001`).
4. **Reporte Excel** descarga el inventario actualizado con hoja de resumen (y hoja de bajas en tecnológicos/didácticos).

## 6. Personalización
- **Listas desplegables** (áreas, categorías, líneas de investigación, ubicaciones, grados): `js/esquema.js`.
- **Colores institucionales:** variables al inicio de `css/estilos.css`.
- **Duración de la sesión:** `HORAS_SESION` en `Codigo.gs` (máximo 6 horas).

## 7. Privacidad
El registro de consultas guarda tipo de usuario, nombre, grado o área y la búsqueda realizada, solo con fines estadísticos institucionales. Se recomienda informarlo en la política de tratamiento de datos de la institución (Ley 1581 de 2012).
