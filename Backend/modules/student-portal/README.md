# Portal del alumno

Perfil del alumno con acceso propio: el alumno ingresa con su DNI, cambia la clave inicial y consulta su boletín, sus asistencias, su situación académica y sus previas. Además incluye la verificación integral del padrón para secretaría.

No tiene datos propios: lee de los módulos que ya son la fuente oficial (students, academic, teachers, grades, inasistencias, attendance-alerts, academic-records, course-changes, workshops). Ver `student-portal.repository.mjs`.

## Acceso

- La cuenta es un usuario más del sistema con el rol `alumno` (mismo bcrypt, JWT, refresh token y límite de intentos que el personal). No hay un sistema de autenticación paralelo.
- **Primer ingreso:** usuario = `nombre.apellido@alumno.prece.local` (primer nombre y primer apellido, sin tildes; si hay homónimos se agregan los últimos 3 dígitos del DNI), contraseña = DNI. También se acepta el DNI como usuario. La verificación informa el usuario de cada alumno. La cuenta se crea en ese momento solo si el DNI existe en el padrón, pertenece a un único legajo activo y no es provisorio.
- Mientras no cambie la clave inicial, todas las rutas académicas responden `403 PASSWORD_CHANGE_REQUIRED`.
- Configuración: contraseña nueva (8+ caracteres, letras y números, sin el DNI, distinta del usuario), confirmación y, si quiere, un usuario nuevo (`a-z 0-9 . _ -`, 4 a 30; uno solo numérico tiene que ser su propio DNI).
- Después puede ingresar con su usuario o con su DNI, siempre con la contraseña nueva. El DNI deja de servir como contraseña.
- Ninguna ruta recibe un id de alumno: el legajo sale siempre de la cuenta del token (`alumnoAutenticado`). Si el legajo se da de baja, la cuenta deja de ver información.
- Los DNI generados por la carga masiva cuando la planilla no los trae quedan marcados como provisorios (`dniProvisorio`) y no sirven como credencial hasta que secretaría cargue el documento real.

## Endpoints

| Operación | Método y ruta | Permiso |
| --- | --- | --- |
| Ingreso | login general `POST /api/v1/auth/login` `{ email: usuario, password }` | pública |
| Mi cuenta | `GET /api/v1/alumno/cuenta` | `student-portal.read` |
| Configurar credenciales (primer ingreso) | `POST /api/v1/alumno/cuenta/configuracion` `{ usuario?, passwordActual, passwordNueva, confirmacion }` | `student-portal.update` |
| Cambiar contraseña | `PATCH /api/v1/alumno/cuenta/password` `{ passwordActual, passwordNueva, confirmacion }` | `student-portal.update` |
| Cambiar usuario | `PATCH /api/v1/alumno/cuenta/usuario` `{ usuario, passwordActual }` | `student-portal.update` |
| Panel (datos + resumen) | `GET /api/v1/alumno/perfil` | `student-portal.read` |
| Mi Boletín | `GET /api/v1/alumno/boletin?anio=` | `student-portal.read` |
| Mis Asistencias | `GET /api/v1/alumno/asistencias?anio=` | `student-portal.read` |
| Mi Situación Académica | `GET /api/v1/alumno/situacion-academica` | `student-portal.read` |
| Mis Previas | `GET /api/v1/alumno/previas` | `student-portal.read` |
| Boletín de un alumno (personal) | `GET /api/v1/alumnos/:alumnoId/boletin?anio=` — mismo cálculo que ve el alumno | `students.read` (preceptor: solo sus cursos) |
| Verificación integral del padrón | `GET /api/v1/portal-alumnos/verificacion?detalle=todos` | `students.write` |

Las rutas académicas exigen además haber cambiado la clave inicial.

## Reglas de cálculo (`catalogo.mjs`)

- **Ciclo lectivo:** el año en curso, igual que el resto del backend.
- **Calificaciones:** se muestran tal como las cargó el docente. El resultado de cada período (1° y 2° cuatrimestre) es la **última** calificación registrada en ese período, así un recuperatorio posterior reemplaza a la nota que recupera; no se promedia ni se redondea. La calificación final es el registro anual (cuatrimestre vacío); si no existe, figura sin registro.
- **TEP / nota inferior a 6:** con la escala del módulo de calificaciones (aprobación desde 6, conceptos TEA/TEP/TED). TED se informa como TED.
- **Previas:** situaciones académicas de tipo `pendiente` de ciclos anteriores. Dejan de figurar como pendientes cuando el registro pasa a `aprobada`. Una nota baja del ciclo actual **no** es una previa.
- **Asistencia:** se unen los dos registros del backend (`inasistencias` con justificación y el registro por tipo de `attendance-alerts`) sin contar dos veces el mismo día. El total de ausentes cuenta solo jornadas completas; las llegadas tarde y los retiros anticipados se informan aparte y no se convierten en faltas, porque no hay una equivalencia institucional configurada. Los presentes no se informan: el backend no los registra (la planilla diaria guarda en el navegador).

## Verificación integral

`npm run verificar:alumnos -w @prece-digital/api` (o el endpoint) recorre **todos** los alumnos y revisa: DNI faltante, inválido, provisorio o duplicado; perfiles posiblemente duplicados; curso y división existentes; matrícula en la estructura académica; materias asignadas a la división; calificaciones e inasistencias cargadas en otro curso o en otro ciclo; días con datos distintos en los dos registros de asistencia; previas sin registrar; cuentas duplicadas; registros que apuntan a alumnos inexistentes. No corrige nada: informa el origen de cada problema.

## SQL Server

`repositorio.mjs` elige la implementación según `DB_CLIENT`. Con `DB_CLIENT=sqlserver` se usan `student-portal.repository.sqlserver.mjs` y `cuentas.repository.sqlserver.mjs`. Ver `Backend/database/sqlserver/README.md`.

## Login único y boletín único

- No hay pantalla de ingreso propia: el alumno usa `#/login`. El backend detecta que el usuario no es una cuenta del personal (sin `@` o con `@alumno.prece.local`) y lo autentica como alumno; el frontend lo lleva a `#/mi-perfil`.
- El boletín del personal (`BoletinDigitalModal`) y el del alumno usan el mismo componente (`Frontend/web/src/modules/boletin/boletin-documento.js`) sobre el mismo endpoint de cálculo. Las notas se cargan en Calificaciones y las ausencias en Asistencias; el boletín no se edita.

## Alcance del preceptor

Ver `Backend/modules/preceptor-assignments`: la Dirección asigna cursos (`PUT /api/v1/preceptores/asignaciones`) y `middlewares/alcance-preceptor.middleware.mjs` bloquea, en todas las rutas, cualquier alumno o curso fuera de esos cursos (403 `OUT_OF_SCOPE`); los listados se recortan en cada servicio.
