# Cierre e informes anuales

El módulo permite preparar una vista previa de la matrícula activa de un ciclo, registrar una decisión revisada por alumno y confirmar una sola vez el paso al año lectivo siguiente. Los movimientos de curso se agregan al historial inmutable existente; los egresos, retiros y casos que no continúan se registran como bajas lógicas. No modifica calificaciones, asistencias ni situaciones académicas históricas.

La API muestra los antecedentes académicos disponibles por alumno, pero no deduce promociones: el sistema no contiene una regla institucional ni una cobertura completa de materias que autorice esa inferencia. Las decisiones de promoción, permanencia o egreso son explícitas y las bajas requieren motivo.

## Endpoints

- GET `/api/v1/annual-management/preview?anioActual=2026&anioNuevo=2027` — preparar la matrícula, detectar advertencias y guardar una vista previa ligada al responsable.
- POST `/api/v1/annual-management/confirm` — confirmar la vista previa con una decisión por alumno; valida que la matrícula no haya cambiado, evita duplicados y rechaza cierres repetidos.
- GET `/api/v1/annual-management/report?anio=2026&curso=1&division=1` — informe general, de asistencia y académico, con los filtros disponibles.
- GET `/api/v1/annual-management/history` — historial de cierres con responsable y fecha.
- POST `/api/v1/annual-management/exports` — registrar exportaciones PDF/XLSX en auditoría.

## Permisos

- `annual-management.read`: consultar informes e historial.
- `annual-management.manage`: revisar y confirmar ciclos.

Por defecto, ambos permisos se asignan solo a los roles `admin` y `director`; las rutas vuelven a validar autorización en el backend.

## Disponibilidad de datos

La matrícula histórica se informa solo para ciclos con una fotografía creada durante un cierre. Asistencias, calificaciones y situaciones académicas se agregan únicamente cuando existen registros para el año elegido. No se calcula una tasa de asistencia sin días presentes/lectivos completos ni se infiere aprobación a partir de una nota sin escala institucional.

**Persistencia pendiente:** en la arquitectura actual, los repositorios activos usan `memory-store`; el esquema SQL todavía no está conectado a la API. Por eso los cierres, fotografías y trazas de auditoría de este módulo se pierden al reiniciar el proceso. No se incorpora una migración sin un motor de persistencia activo y una decisión de plataforma.
