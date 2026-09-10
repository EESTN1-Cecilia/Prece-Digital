# Prece Digital - Frontend

Repositorio de desarrollo del Frontend de **Prece Digital**.

Contiene la aplicación web en React y la aplicación móvil en React Native.

## Estructura

```text
web/
  public/
  src/
    app/
    components/
    config/
    layouts/
    modules/
    services/
    styles/
    utils/

mobile/
  src/
    app/
    modules/
    services/
    storage/
    utils/
```

## Forma de trabajo

El equipo Frontend debe trabajar únicamente sobre este repositorio.

No se deben realizar cambios directamente sobre la carpeta `Frontend/` del repositorio principal `Prece-Digital`.

Flujo recomendado:

```text
main
 ↓
crear rama de trabajo
 ↓
desarrollar funcionalidad
 ↓
push
 ↓
Pull Request
 ↓
revisión
 ↓
merge a main
```

Antes de comenzar:

```bash
git checkout main
git pull origin main
```

Crear una rama:

```bash
git checkout -b feature/nombre-funcionalidad
```

Ejemplos:

```text
feature/login
feature/dashboard
feature/asistencias
fix/navbar-mobile
refactor/auth-service
```

Subir cambios:

```bash
git add .
git commit -m "feat: agregar pantalla de login"
git push -u origin feature/login
```

Luego se debe crear un **Pull Request hacia `main`**.

## Trabajo con Backend

Frontend puede necesitar ejecutar Backend para desarrollar o probar funcionalidades.

Se recomienda tener ambos repositorios clonados dentro de una carpeta general:

```text
Prece-Digital-Workspace/
├── Prece-Digital-Backend/
└── Prece-Digital-Frontend/
```

Para actualizar Backend:

```bash
cd Prece-Digital-Backend
git pull origin main
```

Frontend no debe copiar código del Backend ni modificarlo si no corresponde a su sector.

## Integración con Prece-Digital

Este repositorio es la fuente oficial del Frontend.

Cuando una versión esté lista para integrarse al repositorio principal, el líder del sector utilizará **Git subtree**:

```bash
git fetch frontend
git subtree pull --prefix=Frontend frontend main --squash
```

La integración debe realizarse desde una rama:

```bash
git checkout -b integrate/frontend-login
```

Luego se abre un Pull Request hacia `main` de `Prece-Digital`.

No se deben copiar ni pegar carpetas manualmente entre repositorios.

## Entorno local

Instalar dependencias según corresponda:

```bash
npm install
```

Para la aplicación web:

```bash
npm run dev
```

Por defecto, la web queda disponible en:

```text
http://localhost:5173
```

Los archivos de entorno deben crearse tomando como referencia:

```text
web/.env.example
mobile/.env.example
```

## Reglas básicas

- No trabajar directamente sobre `main`.
- No subir archivos `.env`.
- Mantener `main` actualizado.
- Utilizar ramas para nuevas funcionalidades y correcciones.
- Utilizar Pull Requests.
- No copiar Backend dentro de Frontend.
- La integración hacia `Prece-Digital` se realiza mediante `git subtree`.
