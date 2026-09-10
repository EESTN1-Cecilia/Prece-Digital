# Componentes compartidos

Biblioteca de componentes reutilizables del frontend. La idea es que ninguna pantalla
vuelva a escribir su propio botón, su propia tabla o su propio mensaje de error: si algo
se ve distinto en dos módulos, se corrige acá y cambia en todos.

Todo se importa desde un único punto:

```js
import { Boton, Campo, Tabla, Confirmacion } from "../../components/ui/index.js";
```

Los componentes se configuran por propiedades y no reciben clases de CSS. Las clases
`ui-*` son internas de la biblioteca; una pantalla que necesite escribirlas
probablemente necesite una variante nueva acá.

## Qué hay

| Archivo | Componentes |
| --- | --- |
| `boton.js` | `Boton`, `BotonEnlace`, `Acciones` |
| `campos.js` | `Campo`, `AreaTexto`, `Select`, `Busqueda`, `Casilla`, `Filtro` |
| `tabla.js` | `Tabla` + `ordenarFilas`, `siguienteOrden` |
| `paginacion.js` | `Paginacion` + `paginasVisibles` |
| `modal.js` | `Modal`, `Confirmacion` |
| `avisos.js` | `Alerta`, `MensajeError`, `ErrorGlobal`, `ErrorCampo`, `SinPermiso`, `BannerOrigen` |
| `estado.js` | `Spinner`, `Cargando`, `CargandoPantalla`, `CapaDeCarga`, `Esqueleto`, `SinDatos`, `SinResultados` |
| `presentacion.js` | `Badge`, `BadgeEstado`, `Card`, `Dato`, `ListaDatos` |

## Botones

```js
h(Boton, { variante: "primario", tamano: "medio", icono: "clipboard", onClick }, "Guardar")
h(BotonEnlace, { variante: "contorno", href: "#/usuarios" }, "Volver")
```

Variantes: `primario`, `secundario`, `contorno`, `peligro`, `exito`, `texto`.
Tamaños: `chico`, `medio`, `grande`.

Con `cargando: true` el botón muestra un spinner y queda inactivo, así que no hace falta
que cada formulario lleve su propia bandera para evitar el doble envío.

## Campos

```js
h(Campo, {
  id: "email",
  etiqueta: "Correo institucional",
  tipo: "email",
  valor: datos.email,
  error: errores.email,
  ayuda: "Se usa para iniciar sesión.",
  requerido: true,
  onChange: cambiar("email")
})
```

Cada campo arma la etiqueta, el control, el texto de ayuda y el mensaje de error, y
conecta el error con el input por `aria-describedby`. Si no se pasan `valor` ni
`onChange` el campo queda no controlado, que es lo que necesitan las pantallas que
todavía no envían datos.

`Select` acepta las opciones como `{ id, nombre }` o como texto suelto. `Filtro` es la
versión compacta para las barras de listado, con "Todos" como opción vacía.

## Tabla

```js
const COLUMNAS = [
  { id: "nombre", titulo: "Nombre", ordenable: true },
  { id: "estado", titulo: "Estado", celda: (fila) => h(BadgeEstado, { estado: fila.estado }) }
];

h(Tabla, {
  columnas: COLUMNAS,
  filas: resultado.items,
  cargando,
  error,
  onReintentar,
  acciones: (fila) => [h(BotonEnlace, { href: `#/usuarios/${fila.id}` }, "Ver detalle")],
  vacio: h(SinResultados, { texto: "Todavía no hay usuarios." }),
  paginacion: { pagina, paginas, total, etiquetaTotal: "usuarios", onPagina: setPagina }
});
```

La tabla resuelve por su cuenta los tres estados: mientras `cargando` muestra un
esqueleto, con `error` muestra el mensaje y el botón de reintento, y sin filas muestra
`vacio`. En pantallas chicas el contenido scrollea dentro de la tabla y no empuja la
página.

Para ordenar en memoria se pasan `orden`, `onOrden` y `ordenarEnMemoria: true`. Los
listados que ordena el backend usan `orden` y `onOrden` y resuelven el pedido por su
cuenta. Una columna puede declarar `valor(fila)` cuando la clave de ordenamiento no es
el texto que se muestra.

## Modales y confirmaciones

```js
h(Confirmacion, {
  abierto: Boolean(pendiente),
  titulo: "Desactivar cuenta",
  mensaje: "¿Desactivar la cuenta de Lucía Giménez?",
  detalle: "La cuenta no se elimina: deja de poder ingresar.",
  variante: "peligro",
  cargando: confirmando,
  onConfirmar,
  onCancelar
})
```

`Confirmacion` reemplaza a `window.confirm`, que no se puede redactar ni acompañar con
el detalle de lo que va a pasar. Usarla en toda acción difícil de revertir.

El modal se dibuja sobre `<body>` con `createPortal`, atrapa el foco mientras está
abierto, se cierra con Escape y devuelve el foco al elemento que lo abrió. Mientras
`cargando` es `true` no se cierra, para no dejar a medias algo ya enviado al servidor.

## Avisos y errores

`Alerta` tiene cuatro tonos: `info`, `exito`, `advertencia` y `error`.

`MensajeError` recibe el error tal como lo devuelve `services/http.js` y muestra
`error.mensaje`, que ya viene escrito para una persona. Un `403` se presenta como falta
de permiso. **Nunca** se arma un mensaje leyendo el código HTTP en la pantalla.

`ErrorGlobal` es para lo que afecta a toda la aplicación: sesión vencida, servidor
inaccesible. `ErrorCampo` es el mensaje al pie de un campo, y ya lo usan los campos por
dentro.

## Estados y ausencia de datos

`Cargando` para una sección, `CargandoPantalla` para la primera lectura de una vista,
`Esqueleto` para tablas y listados, `CapaDeCarga` para recargar algo que ya se está
viendo, y el `cargando` de `Boton` para una acción puntual.

`SinDatos` admite una acción cuando existe una forma de resolver la situación:

```js
h(SinDatos, {
  titulo: "No hay usuarios registrados.",
  descripcion: "Agregá el primero para comenzar.",
  accion: h(BotonEnlace, { variante: "primario", href: "#/usuarios/nuevo" }, "Nuevo usuario")
})
```

## Accesibilidad

Lo que la biblioteca ya resuelve y no hay que rehacer en cada pantalla:

- Cada campo tiene su `label`, y el error se anuncia por `aria-describedby` y `role="alert"`.
- El foco visible tiene contorno propio en botones, campos, paginación y modales.
- El modal se anuncia como diálogo, atrapa el foco, cierra con Escape y lo devuelve al salir.
- Los badges no dependen solo del color: el texto siempre dice de qué estado se trata.
- Las columnas ordenables anuncian su dirección con `aria-sort`.
- Las animaciones se desactivan con `prefers-reduced-motion`.

## Autorización

Los componentes no deciden permisos. Una pantalla oculta o deshabilita un control con
`puede()` de `utils/permisos.js`, pero **la validación definitiva la hace siempre el
backend**: que un botón esté visible no implica que la acción esté autorizada, y la
respuesta `401` o `403` se muestra igual cuando llega.

## Pruebas

La lógica pura tiene pruebas en `ui.test.mjs`: `paginasVisibles`, `ordenarFilas` y
`siguienteOrden`. Se ejecutan con `npm test` desde `web/`.
