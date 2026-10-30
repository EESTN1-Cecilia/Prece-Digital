# PROJECT_CONTEXT

Resumen breve para retomar el trabajo sin releer el proyecto. Detalle en los README de cada carpeta.

## Arquitectura
- Monorepo npm workspaces: `Backend/` (API Node sin framework), `Frontend/web/` (React 19 + Vite, sin JSX: `h = React.createElement`), `Frontend/mobile/` (Expo), `Shared/` (módulos y roles: `Shared/src/domain.mjs`).
- Backend: `routes/index.mjs` (lista única de rutas) → `modules/<x>/<x>.controller → service → repository`. Errores con `ApiError` (`utils/api-error.mjs`).
- Persistencia: store en memoria (`database/memory-store.mjs`) con seeds de desarrollo. `schema.sql` es el modelo objetivo (no conectado).
- Auth: JWT 15 min + refresh rotativo, bcrypt, límite de intentos. Permisos `modulo.accion` por rol en `config/permissions.config.mjs`.
- Frontend: rutas y permisos en `src/app/rutas.js`; HTTP solo por `src/services/http.js`; sesión en `src/estado/`.

## Comandos
- `npm run dev` (API :3000 + web :5173), `npm test`, `npm run docs:endpoints` (obligatorio al agregar rutas).
- `npm run verificar:alumnos -w @prece-digital/api`: verificación integral del padrón.

## Decisiones
- Login único: el alumno entra por `#/login` (`/api/v1/auth/login`); no hay pantalla ni endpoint de ingreso separados.
- Portal del alumno (`Backend/modules/student-portal`, `Frontend/web/src/modules/alumno-portal`): rol `alumno`; usuario inicial `nombre.apellido@alumno.prece.local` (homónimos: + últimos 3 del DNI), contraseña inicial = DNI, cambio obligatorio. El legajo sale siempre del token.
- Reglas: nota del período = última registrada; final = registro anual; previa = situación `pendiente` de ciclo anterior; tardes/retiros no suman ausentes; presentes no se registran en el backend.
- DNI generados por la carga masiva quedan `dniProvisorio` y no habilitan el ingreso.
- Boletín único: `Frontend/web/src/modules/boletin/boletin-documento.js` + cálculo `student-portal.service boletin`; alumno vía `/api/v1/alumno/boletin`, personal vía `/api/v1/alumnos/:id/boletin` (`BoletinDigitalModal`). Sin notas en localStorage.
- Alcance del preceptor: cursos en `assignments[role=preceptor].cursos` (los asigna la Dirección: `/api/v1/preceptores/asignaciones`). `middlewares/alcance-preceptor` en todas las rutas + listados recortados en students/inasistencias/observations. Seed: `preceptor@` (todos menos 2°2 y 5°3), `cramos@prece.local` / `Preceptor123!` (2°2 y 5°3).
- SQL Server: preparado y no conectado (`DB_CLIENT=sqlserver`, ver `Backend/database/sqlserver/README.md`).
- Carpeta local de trabajo del usuario: `C:\Users\Ryzen\Desktop\Prece-Digital`.
- Rediseño del portal (cabecera/bienvenida en degradé bordó, tarjetas con icono, icono por materia): `alumno-portal/componentes.js` (`Icono`, `Materia`, `Indicador icono`) + final de `styles/alumno-portal/portal.css`. Sin "Mis Reportes", sin promedio general y sin % de asistencia: el backend no tiene esos datos.
- Estilo del portal (según imagen de referencia del usuario): cabecera en una fila con navegación centrada, Inicio con saludo + 4 tarjetas + "Mis datos". "Mis Reportes" (`reportes-view.js`) es un acceso a boletín/asistencias/situación/previas (Previas queda `oculta` en la navegación). Se mantiene "nota menor a 6" (no 4).
- Menú del portal: Inicio, Mi Boletín, Mis Asistencias, Novedades, Mis Reportes, Mi Cuenta. "Mi Situación Académica" y "Mis Previas" quedan ocultas del menú (accesibles desde Mis Reportes e Inicio). Novedades (`novedades-view.js`) arma el feed con boletín + asistencias; sin backend nuevo.
