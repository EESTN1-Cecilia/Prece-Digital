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

## Comandos

```bash
npm run dev             # API (http://localhost:3000) + web (http://localhost:5173)
npm run dev:api         # solo API
npm run dev:web         # solo web
npm test                # tests de Backend y Frontend web
npm run check           # sintaxis de todo el JavaScript
npm run build           # build de producción de la web
npm run docs:endpoints  # regenera Backend/docs/ENDPOINTS.md
```

Usuarios de desarrollo: ver `Backend/README.md` (por ejemplo `secretario@prece.local` / `Secretaria123!`).

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
