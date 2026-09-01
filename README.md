# Prece Digital

Prece Digital es una plataforma web y movil para centralizar gestion escolar interna: asistencia, calificaciones, legajo digital, documentos, Excel, reportes y auditoria.

Esta primera estructura deja un monorepo modular en JavaScript para comenzar el MVP con Node.js, React y React Native.

## Estructura

```text
Backend/
  config/       Configuracion del backend.
  controllers/  Entrada HTTP por recurso.
  database/     Conexion, migraciones, seeds y repositorios.
  middlewares/  Middlewares HTTP.
  modules/      Modulos funcionales del MVP.
  routes/       Registro de rutas versionadas.
  scripts/      Tareas operativas del backend.
  services/     Casos de uso y logica de aplicacion.
  src/          Arranque de la API.
  test/         Pruebas del backend.
  utils/        Utilidades HTTP y soporte interno.
Frontend/
  web/          Aplicacion web React.
    public/     Assets estaticos y manifest PWA.
    src/
      app/        Bootstrap de la app.
      components/ Componentes reutilizables.
      config/     Configuracion del frontend.
      layouts/    Layouts de pantallas.
      modules/    Modulos funcionales del MVP.
      services/   Clientes HTTP y acceso a datos.
      styles/     Estilos globales.
      utils/      Utilidades puras.
  mobile/       Aplicacion React Native.
    src/
      app/        Bootstrap mobile.
      modules/    Modulos moviles.
      services/   Clientes HTTP y adaptadores.
      storage/    Persistencia offline controlada.
      utils/      Utilidades puras.
Shared/
  docs/         Decisiones de arquitectura y alcance del MVP.
  scripts/      Utilidades locales generales.
  src/
    constants/  Constantes compartidas.
    types/      Tipos y contratos comunes.
    validators/ Validaciones compartidas.
    utils/      Utilidades puras.
```

## Comandos

```bash
npm run check
npm run start:api
npm run start:web
npm run dev
```

La web queda disponible en `http://localhost:5173` con Vite y la API en `http://localhost:3000`.

Cada sector tiene su propio archivo de ejemplo de entorno:

- `Backend/.env.example`
- `Frontend/web/.env.example`
- `Frontend/mobile/.env.example`
