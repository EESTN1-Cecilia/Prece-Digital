# Arquitectura inicial

## Objetivo

La base inicial separa responsabilidades desde el primer commit util:

- `Frontend/web`: interfaz administrativa/PWA con React.
- `Frontend/mobile`: aplicacion movil con React Native.
- `Backend`: API versionada para reglas, permisos, auditoria y sincronizacion.
- `Shared`: definiciones de dominio compartidas entre apps.

## Organizacion modular

### Backend

- `config`: variables y configuracion por ambiente.
- `controllers`: adaptadores HTTP por recurso.
- `database`: conexion, migraciones, seeds y repositorios.
- `middlewares`: validaciones y comportamiento transversal de HTTP.
- `modules`: carpetas por dominio funcional.
- `routes`: registro centralizado de endpoints.
- `services`: casos de uso y logica de aplicacion.
- `utils`: utilidades internas.

### Frontend

- `app`: bootstrap y composicion inicial.
- `components`: piezas reutilizables sin logica de negocio pesada.
- `config`: configuracion de cliente.
- `layouts`: estructuras de pantalla.
- `modules`: vistas por dominio funcional.
- `services`: clientes HTTP y adaptadores de datos.
- `styles`: estilos globales y, luego, tokens.
- `utils`: utilidades puras.

### Shared

- `src/domain.mjs`: unica definicion de modulos, roles y acciones de permisos. La usan el Backend (permisos, `/api/v1/modules`, `/api/v1/roles`), el Frontend web y el mobile.
- `scripts/`: `dev.mjs` (API + web) y `check.mjs` (sintaxis).
- `constants`: catalogos y valores compartidos.
- `types`: contratos entre backend y frontend.
- `validators`: reglas reutilizables.
- `utils`: utilidades compartidas.

## Principios

- Multiinstitucion desde el modelo: todo dato persistente debera asociarse a una escuela o tenant.
- Reglas academicas versionadas: no codificar constantes normativas sin validacion institucional.
- Auditoria por defecto: cambios sensibles deben guardar usuario, fecha, valor anterior, valor nuevo, motivo, sesion y dispositivo.
- Datos sensibles minimizados: legajos completos, salud y documentos no deben estar disponibles offline.
- Identidad propia: el MVP no debe pedir ni almacenar credenciales ABC.

## Integracion

- Un solo repositorio con npm workspaces y un solo `package-lock.json`.
- Contrato Frontend <-> Backend verificado en el CI (`Backend/test/contrato-frontend.test.mjs`).
- Un solo mecanismo de autorizacion (`verifyToken` + `authorize`), un solo formato de permisos (`modulo.accion`), una sola clase de error (`ApiError`) y un solo cliente HTTP en el frontend (`services/http.js`).
- Persistencia: store en memoria en todos los modulos, con una unica fuente de alumnos. `Backend/database/schema.sql` es el modelo objetivo.

## Evolucion sugerida

1. Mantener JavaScript como lenguaje del proyecto; no incorporar TypeScript.
2. Mantener `Frontend/web` en React + Vite.
3. Mantener `Frontend/mobile` en React Native con Expo.
4. Migrar los repositorios de cada modulo a MySQL (desarrollo) y PostgreSQL (produccion), modulo por modulo, sin cambiar controladores ni servicios.
5. Implementar el modulo de asistencia en el backend: el perfil y el tablero hoy informan inasistencias con `disponible: false`.
