# Layouts

Estructuras visuales comunes a toda la aplicación. Ninguna pantalla vuelve a dibujar el
encabezado, el menú ni el pie.

```text
app-layout.js       layout de la aplicación autenticada: menú, encabezado y contenido
sidebar.js          menú lateral
encabezado-app.js   encabezado: migas, notificaciones y menú de usuario
menu.js             lógica pura: armar el menú, la entrada activa y las migas
site-layout.js      layout del sitio público: encabezado y pie del diseño original
aviso-demo.js       aviso de sesión de demostración
```

## Dos layouts

```text
App
├── Rutas públicas ──→ site-layout    (login, activar cuenta)
└── Rutas internas ──→ app-layout     (menú lateral + encabezado + contenido)
```

La elección sale del campo `publica` de la tabla de rutas, así que no hay una segunda lista
que mantener. Las pantallas de acceso conservan el encabezado y el pie del diseño
original; el resto de la aplicación usa el layout con menú lateral.

## Menú lateral

Las entradas salen de las rutas marcadas con `enMenu`, agrupadas por su `seccion`, y ya
vienen filtradas por lo que la sesión puede abrir.

```text
General
└── Inicio

Identidad y acceso
├── Usuarios
└── Roles y permisos
```

> Ocultar una opción no protege la ruta: el guardia la evalúa igual si alguien escribe la
> dirección a mano. La autorización real de cada operación sigue siendo del backend.

**La entrada activa es la más cercana.** Estando en el detalle de un usuario queda marcado
"Usuarios", no también "Inicio" solo porque el listado cuelgue de él para armar las migas.
La sección actual se distingue por el fondo y por una barra lateral, no solo por el color
del texto.

### Estados

| Ancho | Comportamiento |
| --- | --- |
| Escritorio | Menú completo, con botón para colapsarlo a íconos |
| Tablet (≤1024px) | Colapsado a íconos, para darle ancho al contenido |
| Móvil (≤760px) | Fuera de la vista; se abre desde el encabezado, con velo y cierre al navegar |

Colapsado, cada opción conserva su nombre en el `title` y en el texto para lectores de
pantalla: el ícono nunca queda solo.

## Encabezado

Marca, migas, notificaciones y menú de usuario. En móvil suma el botón que abre el menú.

### Migas

Se arman siguiendo la cadena de `padre` de la tabla de rutas y los nombres salen del
`titulo` declarado ahí: **nunca se muestran rutas técnicas ni nombres internos de
componentes**.

```text
Inicio / Usuarios / Detalle del usuario / Editar usuario
```

La última es la pantalla actual y no enlaza a ningún lado. Un ancestro que la sesión no
puede abrir se muestra sin enlace, para no ofrecer un camino que termina en acceso
denegado. Con un solo nivel se omiten: repetir el título de la pantalla no aporta nada.

### Notificaciones

Indicador con la cantidad de pendientes y un panel con las últimas, que permite marcarlas
como leídas. Lee del estado global, así que el número es el mismo en toda la aplicación y
se hace un solo pedido. El centro completo con historial y filtros es la issue #59.

### Menú de usuario

Nombre, correo, roles y cantidad de permisos, más cerrar sesión. La pantalla de perfil
completa es la issue #60; hasta entonces esto muestra lo que ya tiene el estado global.

Los dos paneles se cierran al hacer clic afuera o con Escape.

## Pruebas

`menu.test.mjs` cubre la lógica pura: agrupación por sección, filtrado por permisos,
entrada activa más cercana, migas con parámetros, ancestros sin enlace y ausencia de rutas
técnicas en los nombres. Se ejecutan con `npm test` desde `web/`.
