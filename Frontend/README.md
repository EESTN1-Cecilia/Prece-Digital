# Prece Digital - Frontend

Aplicación web (React + Vite) y aplicación móvil (React Native + Expo). Forma parte del monorepo: instalación, ramas y PR se manejan desde la raíz (ver `README.md` de la raíz).

## Estructura

```text
web/
  public/        assets estáticos
  src/
    app/         main.js (arranque), rutas.js (tabla de rutas y permisos), navegacion.js (guardia)
    components/  ui/ (biblioteca común), common/, dashboard/
    config/      env.js
    estado/      estado global: sesión, permisos, notificaciones
    layouts/     app-layout (pantallas internas) y site-layout (login)
    modules/     vistas por dominio
    services/    http.js (único cliente HTTP), identity-api.js, notificaciones-api.js
    styles/      global.css
    utils/       permisos.js, formato.js

mobile/
  src/           app/, modules/, services/, storage/, utils/
```

## Comandos

Desde la raíz:

```bash
npm run dev:web                     # http://localhost:5173 (necesita la API: npm run dev:api)
npm test -w @prece-digital/web
npm run build -w @prece-digital/web
```

`web/.env.example` define `VITE_API_BASE_URL` (por defecto `http://localhost:3000`).

## Reglas

- Toda llamada a la API pasa por `services/http.js` (`pedir`). No usar `fetch` directo.
- La sesión sale de `GET /api/v1/auth/me` (estado global). No hay perfiles ni credenciales de demostración.
- Las rutas se declaran en `app/rutas.js` con el permiso que exigen; el guardia de `app/main.js` decide el acceso. Es solo experiencia de uso: el backend valida cada operación.
- Si la API falla, la vista muestra el error. No hay datos locales de respaldo.
- Un endpoint nuevo tiene que existir en `Backend/routes/index.mjs`: el test de contrato del backend falla en el CI si no.
