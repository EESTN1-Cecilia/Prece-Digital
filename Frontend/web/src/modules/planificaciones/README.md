# Planificaciones docentes (web)

Interfaces para consultar, cargar, modificar y presentar planificaciones docentes, y
para consultarlas por docente, materia y curso. API: `Backend/modules/planificaciones/README.md`.

## Estructura

```text
planificaciones-service.js         unico punto de llamadas HTTP del modulo (via services/http.js)
planificaciones-helpers.js         logica pura: cascada, filtros, orden, formulario, criterios guardados
planificaciones.test.mjs           pruebas de los helpers (npm test desde web/)
use-planificaciones.js             hooks: catalogos + opciones, consulta generica con reintento
planificaciones-list-view.js       #/planificaciones
planificaciones-revision-list-view.js #/planificaciones/revision, bandeja de Jefatura
planificacion-detalle-view.js      #/planificaciones/:id
planificacion-revision-view.js     #/planificaciones/:id/revision, cambio de estado
planificacion-form-view.js         #/planificaciones/nueva y #/planificaciones/:id/editar
planificaciones-docente-view.js    #/planificaciones/docentes[/:docenteId]
planificaciones-materia-view.js    #/planificaciones/materias[/:materiaId]
planificaciones-curso-view.js      #/planificaciones/cursos[/:cursoId]
components/
  estado-planificacion.js          badge de estado (texto + tono, no depende del color)
  navegacion-planificaciones.js    pestañas: todas / por docente / por materia / por curso
  filtros-planificaciones.js       barra de filtros configurable + chips de filtros activos
  tabla-planificaciones.js         tabla con columnas elegibles y acciones segun la API
  presentar-planificacion.js       confirmacion + pedido de presentacion (anti doble envio)
  resumen-estados.js               total, cantidad por estado y ultima actualizacion
  consulta-planificaciones.js      estructura comun de las consultas por docente/materia/curso
```

Estilos: `styles/planificaciones/planificaciones.css` (prefijo `planif-`).

## Reglas que respeta

- **Sin datos mock**: catálogos, opciones, listados y detalle salen de la API.
- **Catálogos de la API**: estados, secciones de contenido, turnos, períodos y años de curso
  (`/catalogos`); docentes, materias, cursos y divisiones (`/opciones`, armadas a partir de las
  asignaciones del módulo docentes).
- **Relaciones**: el formulario arma la cascada Ciclo lectivo → Curso → División → Materia →
  Docente → Período con `opcionesEnCascada`. Cambiar un nivel limpia los siguientes. El backend
  vuelve a validar la combinación.
- **Acciones**: la tabla, el detalle y la revisión muestran lo que trae `planificacion.acciones`
  (`ver`, `editar`, `presentar`, `revisar`). El frontend no reconstruye reglas de estado.
- **Permisos**: `teaching-plans.read` para ver, `teaching-plans.write` para cargar/modificar.
  Un docente solo ve lo propio porque la API ya filtra; ocultar un botón no autoriza nada.
- **Búsqueda**: debounce de 350 ms contra la API; cambiar búsqueda, filtros, orden o tamaño de
  página vuelve a la página 1; paginar conserva todo. Los criterios del listado se guardan en
  `sessionStorage` (`prece.planificaciones.listado`).
- **Errores**: todo pasa por `MensajeError` / `error.mensaje`; los errores por campo del backend
  (`details[].field`) se muestran al lado de cada campo (`separarErrores`).

## Puntos de extensión pendientes

Quedan preparados para seguir trabajando sin tocar lo existente:

- **Comparación con el diseño curricular**: el contenido hoy es texto por sección
  (`catalogos.secciones`). Una estructura de unidades/contenidos con identificadores
  curriculares requiere ampliar el modelo del backend antes que la interfaz. La revisión
  de Jefatura actual no compara contra diseño curricular.
- **Columnas del listado**: `COLUMNAS_LISTADO` en `tabla-planificaciones.js`; una consulta nueva
  elige columnas por id sin duplicar definiciones.
