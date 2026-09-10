# Prece Digital - Documentación

Repositorio destinado a centralizar la documentación técnica y funcional de **Prece Digital**.

Aquí se documentan decisiones de arquitectura, alcance del sistema, funcionamiento de módulos, API, base de datos y procedimientos generales del proyecto.

## Contenido

Actualmente puede incluir documentación como:

```text
architecture.md
mvp-scope.md
```

A medida que avance el proyecto se pueden agregar secciones como:

```text
api/
database/
diagrams/
requirements/
manuals/
decisions/
```

## Forma de trabajo

Los cambios de documentación deben realizarse mediante ramas.

Antes de comenzar:

```bash
git checkout main
git pull origin main
```

Crear una rama:

```bash
git checkout -b docs/nombre-cambio
```

Ejemplos:

```text
docs/api-login
docs/arquitectura
docs/modelo-datos
docs/manual-usuarios
```

Después:

```bash
git add .
git commit -m "docs: documentar endpoint de login"
git push -u origin docs/api-login
```

Luego se debe crear un **Pull Request hacia `main`**.

## Relación con Backend y Frontend

El equipo de Documentación puede consultar los repositorios de Backend y Frontend para mantener la documentación actualizada.

Cuando Backend o Frontend incorporen funcionalidades nuevas, la documentación correspondiente debe actualizarse cuando sea necesario.

Este repositorio no reemplaza los README específicos de cada sector.

## Shared

La carpeta `Shared/` del repositorio principal contiene recursos comunes utilizados por distintos sectores.

No pertenece exclusivamente a Backend ni a Frontend.

Los cambios que afecten recursos compartidos deben coordinarse entre los sectores involucrados y revisarse antes de incorporarse al repositorio principal.

## Reglas básicas

- No trabajar directamente sobre `main`.
- Mantener la documentación actualizada.
- Usar nombres claros para archivos y carpetas.
- Evitar duplicar documentación innecesariamente.
- Utilizar Pull Requests.
- Documentar cambios relevantes de arquitectura, API o funcionamiento.
