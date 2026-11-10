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


## Instalación

Desde la raíz (instala todos los workspaces con un solo `package-lock.json`):

```bash
npm install
cp Backend/.env.example Backend/.env
cp Frontend/web/.env.example Frontend/web/.env
```

## Cómo correr todo

Requisitos: Node 20+ y npm. Para la app móvil, además, **Expo Go** en el celular (misma red WiFi que la PC).

**1. Instalar (una sola vez, desde la raíz)**

```bash
npm install
cp Backend/.env.example Backend/.env
cp Frontend/web/.env.example Frontend/web/.env
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

Web y mobile usan **el mismo backend y los mismos datos** (en memoria en desarrollo: se reinician con la API). Para probar como alumno: usuario `ana.perez@alumno.prece.local`, contraseña inicial `40123456` (ver la sección siguiente).

## Comandos

```bash
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
