# Seguimiento del avance curricular

Módulo para organizar las materias, los diseños curriculares y los contenidos,
y registrar el avance real de cada contenido con la participación de los
docentes. Las rutas se exponen bajo `/api/v1/curriculum/*`.

## Entidades

- Materias (`mat_`): catálogo por escuela con nombre y código único.
- Diseños curriculares (`dcr_`): plan de una materia para un año y curso
  (`subjectId + year + courseId`). Estados: `borrador`, `vigente`, `archivado`.
- Contenidos (`cnt_`): unidades de un diseño. Estados posibles y avance derivado
  de los seguimientos.
- Seguimientos (`seg_`): registros del docente sobre un contenido
  (`status` + `progress` opcional + `note` + `date`).
- Historial (`sgh_`): trazabilidad de cada alta y modificación de seguimientos.

Estados del contenido: `no_iniciado`, `en_desarrollo`,
`parcialmente_desarrollado`, `desarrollado`, `no_desarrollado`, `reprogramado`.

## Regla central

El `status` y el `progress` de un contenido reflejan el último seguimiento
registrado y nunca se fijan manualmente: un PATCH sobre un contenido con
`progress` o `status` devuelve `422`. El avance se actualiza en el mismo
momento en que se crea o modifica un seguimiento.

## Permisos

- `academics.write` / `academics.read`: alta y edición de materias.
- `curriculum.manage`: alta y edición de diseños.
- `curriculum.write`: alta y edición de contenidos.
- `curriculum.track.write`: registrar y modificar seguimientos (docentes,
  jefes de área y server).
- `curriculum.read`: todas las consultas y los reportes de avance.

## Restricciones

- Un diseño por materia, año y curso (409 si se repite).
- Un mismo nombre de contenido por diseño (409 si se repite).
- El docente de un contenido debe estar activo y asociado a la materia y curso
  del diseño (`422` si no).
- Un usuario con rol docente solo registra seguimientos de los contenidos cuyo
  docente es su docente (`403` en caso contrario).
- No se registran seguimientos sobre contenidos de diseños archivados (`409`).
- Los filtros `subjectId`, `designId` y `teacherId` que no existen devuelven
  `404`; el año debe estar entre 2000 y 2100 (`422`).

## Endpoints

Materias:
- `POST /api/v1/curriculum/materias` · `academics.write`
- `GET /api/v1/curriculum/materias` · `curriculum.read`
- `GET /api/v1/curriculum/materias/:subjectId` · `curriculum.read`
- `PATCH /api/v1/curriculum/materias/:subjectId` · `academics.write`

Diseños:
- `POST /api/v1/curriculum/disenos` · `curriculum.manage`
- `GET /api/v1/curriculum/disenos` · `curriculum.read`
- `GET /api/v1/curriculum/disenos/:designId` · `curriculum.read`
- `PATCH /api/v1/curriculum/disenos/:designId` · `curriculum.manage`

Contenidos:
- `POST /api/v1/curriculum/contenidos` · `curriculum.write`
- `GET /api/v1/curriculum/contenidos` · `curriculum.read` (filtros `designId`, `subjectId`, `teacherId`, `courseId`, `status`, `pendiente`, `year`)
- `GET /api/v1/curriculum/contenidos/pendientes` · `curriculum.read`
- `GET /api/v1/curriculum/contenidos/:contentId` · `curriculum.read`
- `GET /api/v1/curriculum/contenidos/:contentId/seguimientos` · `curriculum.read`
- `GET /api/v1/curriculum/contenidos/:contentId/historial` · `curriculum.read`
- `PATCH /api/v1/curriculum/contenidos/:contentId` · `curriculum.write`

Seguimientos:
- `POST /api/v1/curriculum/seguimientos` · `curriculum.track.write`
- `GET /api/v1/curriculum/seguimientos` · `curriculum.read`
- `GET /api/v1/curriculum/seguimientos/:trackingId` · `curriculum.read`
- `PATCH /api/v1/curriculum/seguimientos/:trackingId` · `curriculum.track.write`

Avance:
- `GET /api/v1/curriculum/avance/materia` · `curriculum.read`
- `GET /api/v1/curriculum/avance/curso` · `curriculum.read`
- `GET /api/v1/curriculum/avance/docente` · `curriculum.read`
- `GET /api/v1/curriculum/avance/periodo` · `curriculum.read`
- `GET /api/v1/curriculum/avance/pendientes` · `curriculum.read`

## Almacenamiento

En memoria (`database/memory-store.mjs`): Maps `curriculumSubjects` (`mat_`),
`curriculumDesigns` (`dcr_`), `curriculumContents` (`cnt_`),
`curriculumTrackings` (`seg_`) y `curriculumTrackingHistory` (`sgh_`). La
migración `database/migrations/007_seguimiento_curricular.sql` define la
persistencia relacional con las mismas reglas.