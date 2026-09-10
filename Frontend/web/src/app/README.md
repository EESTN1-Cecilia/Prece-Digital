# App: rutas y protección

Arranque de la aplicación, tabla de rutas y control de acceso a la navegación.

```text
main.js         monta la aplicación, escucha el cambio de hash y aplica el guardia
rutas.js        tabla de rutas con sus requisitos de acceso
navegacion.js   lógica pura: resolver una ruta y decidir el acceso
```

> **Esto es control de navegación y experiencia de uso, no seguridad.** La autorización
> real de cada operación la sigue haciendo el backend, que vuelve a validar los permisos
> antes de ejecutar cualquier acción sensible. Ocultar una opción del menú o tapar una
> pantalla no protege nada por sí solo.

## Tabla de rutas

Un solo lugar declara, por ruta, quién entra. Agregar una pantalla o cambiar quién accede
es tocar `rutas.js` y nada más: ninguna vista repite la comprobación por su cuenta.

```js
{
  patron: "#/usuarios/:id/editar",
  titulo: "Editar usuario",
  vista: UsuarioFormularioView,
  permisos: [PERMISOS.usuariosEditar]
}
```

| Campo | Para qué |
| --- | --- |
| `patron` | `#/usuarios/:id`; `:algo` toma cualquier segmento y llega como propiedad a la vista |
| `vista` | componente a renderizar |
| `publica` | se ve sin iniciar sesión (login, activar cuenta) |
| `roles` | códigos de rol que pueden entrar; vacío significa cualquiera |
| `permisos` | permisos necesarios; alcanza con uno |
| `todosLosPermisos` | exige la lista completa en lugar de uno |
| `enMenu` | aparece en menús y enlaces de navegación |
| `titulo` | nombre legible, para menús y para la pantalla de acceso denegado |

**El orden importa:** la primera coincidencia gana, así que las rutas fijas van antes que
las que tienen parámetro (`#/usuarios/nuevo` antes que `#/usuarios/:id`).

## Cómo se decide el acceso

```text
¿La ruta existe?           no → Página no encontrada
        ↓ sí
¿Es pública?               sí → entra
        ↓ no
¿Ya se sabe quién entra?   no → esperar (no se dibuja ni se redirige nada)
        ↓ sí
¿Hay sesión?               no → login
        ↓ sí
¿Tiene el rol?             no → acceso denegado
        ↓ sí
¿Tiene el permiso?         no → acceso denegado
        ↓ sí
                                entra
```

El orden de las comprobaciones es lo que evita el parpadeo. Si se decidiera antes de
conocer la sesión, durante la carga se mandaría al login a alguien que sí tenía sesión, y
se vería un salto entre pantallas.

La redirección al login se hace en un efecto y no durante el render: cambiar el hash
mientras React dibuja deja la pantalla y la dirección desincronizadas.

## Acceso por URL directa

La protección no depende de por dónde se llegó. Escribir la dirección a mano, usar un
enlace interno o los botones de atrás y adelante del navegador pasan todos por el mismo
guardia, porque se evalúa en cada cambio de hash.

## Navegación adaptada

`rutasVisibles(rutas, sesion)` devuelve las rutas que la sesión puede abrir hoy. Los
enlaces del pie ya se filtran así, y los menús del layout (issue #63) van a usar lo mismo.

Ocultar una opción es una cortesía, no una defensa: la ruta se sigue evaluando igual.

## Qué pasa cuando no se puede entrar

| Situación | Resultado |
| --- | --- |
| Sin sesión | Redirección a `#/login` |
| Sesión expirada | El estado global limpia todo y redirige a `#/login` |
| Con sesión, sin permiso | Pantalla de acceso denegado |
| Ruta inexistente | Pantalla de página no encontrada |

La pantalla de acceso denegado no muestra nada de la sección restringida: dice qué permiso
falta —le sirve a quien administra los roles— y ofrece volver al inicio.

## Permisos en la pantalla

El guardia resuelve el acceso **a la pantalla**. Dentro de ella, los permisos siguen
usándose para habilitar acciones: se puede tener `identity:read` y ver el listado sin
tener `identity:update` para editar.

```js
const { puede } = usePermisos();
const puedeEditar = puede(PERMISOS.usuariosEditar);
```

Las vistas ya no repiten la comprobación de acceso a la pantalla: eso se declara una vez
en `rutas.js`.

## Pruebas

`navegacion.test.mjs` cubre la matriz que pide la issue: resolución de patrones y
parámetros, prioridad de las rutas fijas, ruta pública, sesión en carga, sin sesión, sesión
expirada, con permiso, sin permiso, permisos parciales, comodín, acceso por rol, menú
filtrado y armado de rutas con parámetros. Se ejecutan con `npm test` desde `web/`.
