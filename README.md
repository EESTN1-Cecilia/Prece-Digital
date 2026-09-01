# Prece Digital

Prece Digital es una plataforma web y móvil para centralizar la gestión escolar interna: asistencia, calificaciones, legajo digital, documentos, Excel, reportes y auditoría.

El proyecto está dividido por sectores de desarrollo, utilizando **Node.js**, **React** y **React Native**.

## Estructura

```text
Backend/
  config/
  controllers/
  database/
  middlewares/
  modules/
  routes/
  scripts/
  services/
  src/
  test/
  utils/

Frontend/
  web/
    public/
    src/
      app/
      components/
      config/
      layouts/
      modules/
      services/
      styles/
      utils/

  mobile/
    src/
      app/
      modules/
      services/
      storage/
      utils/

Shared/
  docs/
  scripts/
  src/
    constants/
    types/
    validators/
    utils/
```

## Organización de repositorios

El desarrollo de Prece Digital está dividido principalmente en:

- `Prece-Digital-Backend`
- `Prece-Digital-Frontend`
- `Prece-Digital-Docs`
- `Prece-Digital` — repositorio principal e integrado.

Cada sector trabaja sobre su propio repositorio.

El repositorio principal contiene las versiones integradas de Backend y Frontend.

## Integración mediante Git Subtree

Las carpetas `Backend/` y `Frontend/` del repositorio principal se sincronizan con sus respectivos repositorios utilizando **Git subtree**.

Esto permite mantener los proyectos separados durante el desarrollo y, al mismo tiempo, integrarlos dentro de `Prece-Digital` sin copiar y pegar archivos manualmente.

### Primera importación

```bash
git subtree add --prefix=Backend backend main --squash
git subtree add --prefix=Frontend frontend main --squash
```

### Actualizaciones posteriores

Backend:

```bash
git fetch backend
git subtree pull --prefix=Backend backend main --squash
```

Frontend:

```bash
git fetch frontend
git subtree pull --prefix=Frontend frontend main --squash
```

Las integraciones deben realizarse desde una rama y enviarse mediante **Pull Request** hacia `main`.

Ejemplo:

```text
Prece-Digital-Backend
        ↓
git subtree pull
        ↓
integrate/backend-...
        ↓
Pull Request
        ↓
Prece-Digital/main
```

`Shared/` permanece dentro del repositorio principal como espacio común para recursos utilizados por distintos sectores.

## Comandos

```bash
npm run check
npm run start:api
npm run start:web
npm run dev
```

La aplicación web queda disponible en:

```text
http://localhost:5173
```

La API queda disponible en:

```text
http://localhost:3000
```

## Variables de entorno

Cada sector dispone de su archivo de ejemplo:

```text
Backend/.env.example
Frontend/web/.env.example
Frontend/mobile/.env.example
```

Los archivos `.env` reales no deben subirse al repositorio.
