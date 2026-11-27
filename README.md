# Prece Digital

Plataforma web y móvil para la gestión escolar interna: alumnos y legajos, observaciones, situación académica, estructura académica, identidad y permisos, auditoría.

Monorepo único con npm workspaces. Backend, Frontend y Shared viven y se versionan juntos: un cambio que toca la API y la pantalla va en el mismo Pull Request.



## Estructura

```text
Backend/            API Node.js (@prece-digital/api)
Frontend/web/       React + Vite (@prece-digital/web)
Frontend/mobile/    React Native + Expo (@prece-digital/mobile)
Shared/             dominio compartido (módulos, roles, permisos) y scripts del monorepo
.github/            CI, CODEOWNERS y plantilla de PR
```


## Inicio rápido

Requisitos: [Node 20+](https://nodejs.org) y npm. Opcional: [XAMPP](https://www.apachefriends.org) para guardar los datos en MySQL.

```bash
git clone https://github.com/EESTN1-Cecilia/Prece-Digital.git
cd Prece-Digital
npm install
npm run dev
```

Abrir http://localhost:5173 y entrar con `secretario@prece.local` / `Secretaria123!`.

`npm install` crea solo los `.env` que falten (`Backend`, `Frontend/web`, `Frontend/mobile`) a partir de los `.env.example`. Si se pierde alguno, `npm run setup` los vuelve a crear sin pisar los existentes.

### Base de datos (XAMPP)

- **Con XAMPP:** iniciar **MySQL** en el panel de XAMPP *antes* de `npm install`. El setup lo detecta y configura `Backend/.env` con `DB_CLIENT=mysql` (usuario `root`, sin clave). La base `prece_digital` y sus tablas (`ps_students`, `ps_grades_calificaciones`, ...) se crean solas en el primer arranque, con los datos de prueba. Se pueden ver en http://localhost/phpmyadmin.
- **Sin XAMPP:** la API usa datos en memoria (se reinician con la API). Para pasar a MySQL después: iniciar MySQL y en `Backend/.env` poner `DB_CLIENT=mysql`, `DB_USER=root` y `DB_PASSWORD=` (vacío).
- **Volver a los datos de prueba:** borrar la base `prece_digital` en phpMyAdmin y reiniciar la API.
- **Error "No se pudo conectar a MySQL":** MySQL no está iniciado en XAMPP (o el puerto no es 3306: ajustar `DB_PORT`).

### Base de datos (SQL Server)

1. Instalar [SQL Server Express](https://www.microsoft.com/sql-server/sql-server-downloads) (con Windows en español y la configuración regional distinta, usar el instalador en inglés). Habilitar TCP en el puerto 1433 (SQL Server Configuration Manager → Protocolos → TCP/IP → IPAll: `TcpPort=1433`, `TcpDynamicPorts` vacío) y reiniciar el servicio.
2. Crear la base y un usuario (autenticación mixta activada):

   ```sql
   CREATE DATABASE prece_digital;
   CREATE LOGIN prece_api WITH PASSWORD = 'una-clave-segura';
   USE prece_digital;
   CREATE USER prece_api FOR LOGIN prece_api;
   ALTER ROLE db_owner ADD MEMBER prece_api;
   ```

3. En `Backend/.env`: `DB_CLIENT=sqlserver`, `DB_SERVER=localhost`, `DB_PORT=1433`, `DB_NAME=prece_digital`, `DB_USER=prece_api`, `DB_PASSWORD=...`.
4. `npm run dev`. Las tablas `ps_*` se crean solas en el primer arranque, con los datos de prueba.

Con `DB_CLIENT=sqlserver` el personal (usuarios, roles, docentes, materias, grupos de taller, asignaciones y horarios) se guarda en tablas relacionales con claves foráneas, no en `ps_*`. Los usuarios de desarrollo de este README (`secretario@prece.local`, etc.) existen solo con datos en memoria; en producción las cuentas se crean desde la plataforma y las credenciales no se guardan en el repositorio. Detalle y orden de migraciones: [`Backend/database/sqlserver/README.md`](Backend/database/sqlserver/README.md).

El portal del alumno sobre las tablas académicas reales del colegio (`DB_PORTAL=sqlserver`) es un paso aparte: ver [`Backend/database/sqlserver/README.md`](Backend/database/sqlserver/README.md).

Más detalle en [`Backend/README.md`](Backend/README.md).

## Cómo correr todo

Para la app móvil, además, **Expo Go** en el celular (misma red WiFi que la PC).

**1. Instalar (una sola vez, desde la raíz)**

```bash
npm install
cd Frontend/mobile && npx expo install expo-print expo-sharing expo-file-system && npx expo install --fix && cd ../..
```

**2. Backend + web** (una terminal)

```bash
npm run dev
```

- API: http://localhost:3000
- Web: http://localhost:5173

**3. App móvil** (otra terminal; la API del paso 2 tiene que estar corriendo)

```bash
cd Frontend/mobile
npx expo start -c
```

Escanear el QR con Expo Go. La app encuentra sola la IP de la PC; si no, definir `EXPO_PUBLIC_API_BASE_URL=http://<IP-de-la-PC>:3000` en `Frontend/mobile/.env`. En Windows, permitir Node.js en el firewall (redes privadas). Más detalle y solución de problemas en [`Frontend/mobile/README.md`](Frontend/mobile/README.md).

**4. Verificar**

```bash
npm test                              # Backend + web
npm test -w @prece-digital/mobile     # app móvil
npm run check                         # sintaxis
```

Web y mobile usan **el mismo backend y los mismos datos** (en MySQL si está configurado; si no, en memoria y se reinician con la API). Para probar como alumno: usuario `ana.perez@alumno.prece.local`, contraseña inicial `40123456` (ver la sección siguiente).

## Comandos

```bash
npm run setup           # crea los .env que falten (ya corre con npm install)
npm run dev             # API (http://localhost:3000) + web (http://localhost:5173)
npm run dev:api         # solo API
npm run dev:web         # solo web
npm run dev:mobile      # solo app móvil (Expo)
npm test                # tests de Backend y Frontend web
npm run check           # sintaxis de todo el JavaScript
npm run build           # build de producción de la web
npm run docs:endpoints  # regenera Backend/docs/ENDPOINTS.md
```

Usuarios de desarrollo: ver `Backend/README.md` (por ejemplo `secretario@prece.local` / `Secretaria123!`).

### Ingresar como alumno (desarrollo)

El portal del alumno usa el mismo login que el personal (`#/login`); el sistema detecta que es un alumno y lo lleva a su portal. La cuenta se crea sola en el primer ingreso, a partir del legajo del seed.

| Dato | Valor |
| --- | --- |
| Alumna de prueba | Ana Pérez López, 1°1° (`alu-1`) |
| Usuario | `ana.perez@alumno.prece.local` (también sirve el DNI `40123456`) |
| Contraseña inicial | `40123456` (el DNI) |

- En el primer ingreso el sistema pide configurar la cuenta: contraseña nueva de 8 o más caracteres, con letras y números y distinta del DNI, y opcionalmente un usuario propio. Después el DNI deja de servir como contraseña.
- Regla general para cualquier alumno: usuario = `nombre.apellido@alumno.prece.local` (primer nombre y primer apellido, sin tildes; si hay homónimos se agregan los últimos 3 dígitos del DNI) y contraseña inicial = DNI.
- Los alumnos de la nómina local (`alumnos.local.json`) tienen DNI provisorio (`99xxxxxx`) y **no pueden ingresar** hasta que Secretaría cargue el DNI real.
- Son datos de desarrollo con la API en memoria: al reiniciarla, la cuenta vuelve a su estado inicial. Más detalle en `Backend/modules/student-portal/README.md`.

## Datos compartidos y seguridad

- **Todo lo que se carga queda en la base del servidor** y lo ven todos los perfiles desde cualquier dispositivo: planillas de asistencia del preceptor y de cada docente (`/api/v1/asistencias/planillas`, por alumno y con control de versión: si dos personas guardan a la vez, la segunda recibe un aviso y no se pisa nada), notas (boletín oficial), inasistencias, pedidos a Dirección (`/api/v1/pedidos-direccion`), comunicados y cátedras. En el navegador solo quedan preferencias de cada usuario (filtros, avisos vistos).
- **Sin datos inventados:** si el servidor no responde, la pantalla avisa; no se muestran alumnos, docentes ni cantidades de ejemplo.
- **Alcance:** preceptores y docentes solo ven y modifican los alumnos de sus cursos asignados (`middlewares/alcance-preceptor.middleware.mjs`), también cuando su cuenta viene de las tablas relacionales sin escuela en las asignaciones. Toda ruta exige sesión salvo `GET /health` y login/refresh/logout; los permisos por rol están en `Backend/config/permissions.config.mjs` y los verifican los tests `permisos-sistema`, `acceso-y-reset` y `alcance-sin-escuela`.
- **Credenciales:** no se guardan contraseñas ni claves en el repositorio. Las de producción viven en el `compose.yaml`/`.env` del servidor (fuera de git). Los usuarios `@prece.local` con contraseñas de ejemplo existen **solo en desarrollo**; en producción el único usuario inicial es el administrador de `BOOTSTRAP_ADMIN_EMAIL`.
- **Migración a tablas relacionales:** personal, docentes, divisiones, alumnos importados y grupos de taller ya están en tablas relacionales de SQL Server; el resto de las colecciones se migra por bloques (alumno completo, calendario, observaciones, resto) y después se eliminan las tablas `ps_*`.

## Forma de trabajo (8 personas, un repo)


1. Rama desde `main` actualizado:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nombre-corto
   ```

   Prefijos: `feature/`, `fix/`, `refactor/`, `docs/`, `chore/`.

2. Commits con formato convencional: `feat(students): ...`, `fix(auth): ...`.
3. Antes del push: `npm test`.
4. Pull Request hacia `main`. El CI corre sintaxis, tests de ambos lados, el contrato Frontend↔Backend y el build.
5. `CODEOWNERS` asigna revisores por carpeta: Backend revisa `Backend/`, Frontend revisa `Frontend/`, y ambos revisan `Shared/`, las rutas y los permisos.

### Configuración de GitHub (una vez, administrador de la organización)

- Crear los equipos `lideres`, `backend` y `frontend` en la organización `EESTN1-Cecilia` y cargar a sus integrantes.
- Settings → Branches → regla para `main`: Pull Request obligatorio, 1 aprobación, "Require review from Code Owners", check `CI / test` obligatorio, sin push directo.
- Archivar los repos `Prece-Digital-Backend` y `Prece-Digital-Frontend`: ya no se usan.

## Reglas del proyecto

- Rutas de la API: una sola lista en `Backend/routes/index.mjs`. Referencia generada: `Backend/docs/ENDPOINTS.md`.
- El frontend llama a la API solo a través de `Frontend/web/src/services/http.js`.
- Permisos con formato `modulo.accion`; módulos y roles en `Shared/src/domain.mjs`.
- Errores de la API: `{ "error": { "code", "message", "details" } }` con `ApiError`.
- Nada de datos de prueba en el frontend: los datos de desarrollo son los seeds del backend.
- No subir archivos `.env`.
