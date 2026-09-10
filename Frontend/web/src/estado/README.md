# Estado global

Una sola fuente de verdad para lo que se comparte entre pantallas: el usuario autenticado,
la sesión, sus roles y permisos, las notificaciones, el error global y las cargas que
bloquean el arranque.

Antes cada vista llamaba a `useSesion()` por su cuenta y disparaba su propio
`GET /api/v1/me`: cuatro pedidos para el mismo dato y cuatro copias que podían quedar
desincronizadas. Ahora el pedido se hace una vez.

```js
import { useSesion, usePermisos, useNotificaciones } from "../../estado/index.js";
```

## Estructura

```text
proveedor.js   ProveedorEstado, el reducer y los efectos de arranque
hooks.js       useSesion, usePermisos, useNotificaciones, useErrorGlobal, useCarga
```

`ProveedorEstado` envuelve la aplicación una sola vez, en `app/main.js`. Está armado con
Context y `useReducer`, sin sumar dependencias: el tamaño del estado no las justifica.

## Estados de la aplicación

```text
inicializando ─→ cargando sesión ─→ autenticada | anónima ─→ aplicación disponible
                                          │
                                          └─→ expirada ─→ login
```

`FASE` distingue `inicializando`, `lista` y `error`. Mientras la fase es `inicializando`,
`main.js` no renderiza ninguna ruta: evita mostrar por un instante una pantalla que
después hay que sacar, y le da a la protección de rutas un estado firme sobre el que
decidir; su tabla y su guardia están en [`src/app`](../app/README.md).

`SESION` distingue `cargando`, `autenticada`, `anonima` y `expirada`.

## Qué expone cada hook

### `useSesion()`

`usuario`, `roles`, `permisos`, `alcances`, `origen`, `cargando`, `autenticado`,
`expirada`, `revalidando`, más `refrescar()`, `cerrarSesion()` y `cambiarPerfilDemo()`.

`cerrarSesion()` borra el token, limpia el estado y vuelve al login.

### `usePermisos()`

`puede(permiso)`, `tieneRol(rol)`, `puedeAlguno([permisos])`, más `permisos`, `roles` y
`alcances`. Es lo que van a consumir la protección de rutas y los menús del layout.

```js
const { puede } = usePermisos();
const puedeEditar = puede(PERMISOS.usuariosEditar);
```

### `useNotificaciones()`

`items`, `noLeidas`, `total`, `cargando`, `error`, `origen`, `refrescar()`,
`marcarLeida(id)` y `marcarTodasLeidas()`. El indicador del encabezado ya lo usa; el
centro de notificaciones (issue #59) va a leer del mismo estado.

### `useErrorGlobal()`

`error`, `mostrar(error)` y `limpiar()`. Solo para lo que afecta a toda la aplicación.
**Los errores de una pantalla los sigue manejando esa pantalla**, con `MensajeError`.

### `useCarga()`

`inicializando`, `global`, `iniciar(clave)` y `terminar(clave)`.

## Los tres tipos de carga

| Tipo | Cuándo | Con qué |
| --- | --- | --- |
| Global | La aplicación no puede funcionar sin ese dato | `useCarga()`, tapa la pantalla |
| De sección | Una pantalla está trayendo su información | `useState` local + `Cargando` o `Esqueleto` |
| De acción | El usuario ejecutó una operación | la propiedad `cargando` del `Boton` |

Una operación que afecta a un solo componente nunca bloquea la aplicación entera.

## Refresco de permisos

Al volver a la pestaña, la sesión se relee **en silencio**: la aplicación sigue usable y
solo se marca `revalidando`. Si mientras tanto le cambiaron los permisos al usuario, la
interfaz deja de mostrar los viejos sin que haga falta recargar la página.

Solo la primera carga bloquea con la pantalla de arranque.

## Errores HTTP

`services/http.js` traduce cada respuesta y, ante un `401`, emite
`EVENTO_SESION_EXPIRADA`. El proveedor escucha ese evento, marca la sesión como expirada,
**limpia el usuario, los permisos y las notificaciones** —para que ninguna pantalla siga
mostrando datos de una sesión que ya no existe— y redirige al login.

| Respuesta | Qué pasa |
| --- | --- |
| `401` | Sesión expirada, estado limpio, aviso global y vuelta al login |
| `403` | Error local de la pantalla, presentado como falta de permiso |
| `5xx` | Aviso global reintentable |

## Qué va y qué no va en el estado global

**Va:** usuario, sesión, roles y permisos, notificaciones, error global, fase de la
aplicación.

**No va:** filtros de una tabla, texto de un input, modal abierto, pestaña elegida, orden
de una columna. Eso es estado local y se resuelve con `useState` en la pantalla. Meterlo
acá haría el estado global imposible de seguir.

## Autorización

Los permisos de este estado sirven para ocultar o deshabilitar controles y armar menús.
**La validación definitiva la hace siempre el backend**: que un botón esté visible no
implica que la acción esté autorizada, y las respuestas `401` y `403` se muestran igual
cuando llegan.

## Pendiente del backend

- `GET /api/v1/me` está en el PR #78 del backend, todavía sin mergear. Mientras tanto la
  sesión degrada a un perfil de prueba y lo avisa en pantalla.
- Las notificaciones esperan el sistema general del backend (su issue #44, sin empezar).
  `services/notificaciones-api.js` ya consume `GET /api/v1/notifications` y degrada a un
  juego de prueba.
- El inicio de sesión real depende del endpoint de login (issue #61 del frontend).

## Pruebas

`estado.test.mjs` cubre las transiciones principales: arranque, sesión resuelta, anónima,
expirada, refresco silencioso, cambio de permisos, notificaciones, error global y cargas
por clave. Se ejecutan con `npm test` desde `web/`.
