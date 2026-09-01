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

## Evolucion sugerida

1. Mantener JavaScript como lenguaje del proyecto; no incorporar TypeScript.
2. Mantener `Frontend/web` en React + Vite.
3. Mantener `Frontend/mobile` en React Native con Expo.
4. Evolucionar `Backend` sobre Node.js modular con `nodemon` para desarrollo.
5. Agregar MySQL para desarrollo y PostgreSQL para produccion.
6. Implementar autenticacion, autorizacion por alcance y auditoria antes de datos reales.
