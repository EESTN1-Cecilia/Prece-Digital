## Autenticación Mobile

### Sistema utilizado

Mobile reutiliza **exactamente** el sistema de autenticación de la API común (Backend). No existe un sistema de autenticación paralelo.

- **Tipo de autenticación**: JWT Bearer. `Authorization: Bearer <accessToken>`.
- **Tokens**:
  - `accessToken`: JWT HS256 firmado por Backend. Expiración por defecto `JWT_ACCESS_EXPIRES_IN = 15m` (según configuración del Backend). Payload mínimo: `sub`, `typ`, `roles`.
  - `refreshToken`: opaco, almacenado en Base64/colección de sesiones y revocado por hash SHA-256 en Backend. Expiración por defecto `JWT_REFRESH_EXPIRES_IN = 7d`. Rotación al llamar a `POST /api/v1/auth/refresh` (se emite un nuevo refresh token y se revoca el anterior).
- **Almacenamiento**: `expo-secure-store` (Keychain en iOS, Keystore cifrado en Android). Las claves usadas son `prece.token` (access token) y `prece.refreshToken`. No hay fallback a almacenamiento inseguro. En tests se usa un adaptador en memoria.
- **Autoridad**: Backend valida credenciales, firma/revoca tokens, determina roles, permisos, alcances y controla el acceso a recursos protegidos. Mobile **nunca** valida contraseñas localmente ni decide permisos.

### Flujo

```text
Formulario Login (Mobile)
   ↓ POST /api/v1/auth/login { email, password } (sin Authorization)
   ↓ Backend valida credenciales → devuelve { accessToken, refreshToken, tokenType: "Bearer", usuario, roles, permisos, alcances }
   ↓ Mobile guarda tokens en almacenamiento seguro y setea Authorization: Bearer <accessToken>
   ↓ GET /api/v1/auth/me para validar/normalizar sesión (opcional en arranque)
   ↓ Requests autenticadas → Bearer → Middleware auth/authorize (Backend)
   ↓ 401 (token vencido/inválido/revocado) → POST /api/v1/auth/refresh con { refreshToken } (una única renovación, reintento único)
   ↓ Si refresh OK: rota tokens, reintenta request original una vez
   ↓ Si refresh falla o sin refresh token: limpia sesión local, notifica estado (vuelve a Login)
   ↓ Logout: POST /api/v1/auth/logout { refreshToken } (publico) → revoca refresh token → limpia almacenamiento seguro
```

### Sesión

- **Arranque**: carga tokens guardados (`prece.token`, `prece.refreshToken`), si existe access token llama a `GET /api/v1/auth/me` para rehidratar `usuario/roles/permisos/alcances`. Si falla → estado anónimo.
- **Renovación**: automática ante `401` con `refreshToken` disponible. Single-flight: solo una renovación concurrente. Reintento único de la request original. No se repite más allá.
- **Expiración**: detectada por respuesta `401 UNAUTHENTICATED` del Backend (token expirado, inválido, manipulado o revocado).
- **Invalidación**: al cerrar sesión o cuando refresh devuelve `401`. Logout envía `refreshToken` al Backend (`POST /api/v1/auth/logout`) aunque falle la red; en ese caso la limpieza local se realiza en `finally`.
- **Reutilización de refresh**: Backend revoca el refresh token al rotarlo y al hacer logout. Un refresh revocado invalida la cadena de sesiones según la política del Backend.

### Seguridad

- **Credenciales**: no se almacenan, no se registran, no se envían fuera del cuerpo de login. Login no envía `Authorization`.
- **Tokens**: solo en `expo-secure-store`. Nunca en `AsyncStorage`, nunca en logs, nunca en código, nunca en respuestas de error.
- **Solicitudes**: formato estricto `Authorization: Bearer <accessToken>`. Mobile no agrega headers alternativos.
- **Validación**: toda validación de credenciales, token, roles, permisos y alcances la hace Backend. Mobile no crea JWT ni los modifica.
- **Protección de recursos**: si no hay token o es inválido → API devuelve `401` y Mobile vuelve a Login (sin acceder a rutas protegidas).
- **Principio mínimo**: sólo `accessToken` y `refreshToken` se persisten. Los datos de autorización (`roles`, `permisos`, `alcances`) se obtienen del Backend (`/auth/me` o en la respuesta de login/refresh), no se inventan localmente.

### Errores

Mapeo a errores reales del Backend (`{ error: { code, message, details } }`):

| Código | Estado | Significado | Comportamiento Mobile |
|---|---|---|---|
| `UNAUTHENTICATED` | 401 | Token inválido/expirado/revocado o sin sesión | Intenta refresh (si hay `refreshToken`) con reintento único; si falla → limpia sesión y redirige a Login. |
| `FORBIDDEN` | 403 | Falta de permisos/alcance para el recurso | Se muestra mensaje de error sin cambiar de sesión. No se modifica autorización local. |
| `VALIDATION_ERROR` | 422 | Datos inválidos en el body | Muestra errores de campos cuando existan (`details.campos` o mensaje). |
| `TOO_MANY_ATTEMPTS` | 429 | Bloqueo por demasiados intentos de login | Muestra mensaje genérico del Backend. |
| `INVALID_CREDENTIALS` | 401 | Credenciales incorrectas o cuenta desactivada | Mensaje genérico (no revela si el email existe). |
| `INVALID_CREDENTIALS_PAYLOAD` | 400 | Email/contraseña faltantes | Validación local mínima + respuesta Backend. |
| `INTERNAL_ERROR` | 500 | Error interno | Mensaje genérico para usuario. |

Errores de red/timeout: `NETWORK_ERROR` (0) y `TIMEOUT` (0) con mensajes descriptivos; nunca usan códigos inventados del dominio API.

### Compatibilidad con Web

Mobile reutiliza:

- **API común**: mismos endpoints `/api/v1/auth/login/*` y middleware `verifyToken`/`authorize`.
- **Sistema de autenticación**: mismo flujo de login/refresh/logout y misma semántica de tokens.
- **Tokens**: mismo formato y rotación. Web usa `localStorage` (`prece.token`, `prece.refreshToken`); Mobile usa `expo-secure-store` con esas mismas claves conceptuales.
- **Validaciones, roles, permisos, alcances y reglas de negocio**: responsabilidad exclusiva del Backend.
- **Manejo de errores**: estructura `ApiError` idéntica.

La diferencia es exclusivamente **entorno (móvil)** y **almacenamiento seguro**; no hay lógica de seguridad duplicada.

### Estado

- **Implementado**:
  - Servicios: `api.js` (Bearer, timeout 15s, errores, renovación single-flight + reintento único), `auth-api.js` (login/refresh/logout/me), `session-tokens.js` (cache en memoria + persistencia segura), `secure-store.js`/`adaptador-secure-store.js` (adaptador Expo con `WHEN_UNLOCKED`), `config/env.js` (`EXPO_PUBLIC_API_BASE_URL`).
  - Estado de sesión: `SesionContext.js` (restauración al arranque, reacción a `AppState` y a invalidación 401, método `puede` solo para UX).
  - UI: `LoginScreen.js` con identidad visual alineada a Web (colores/tipografías/espaciados de `global.css`), sin emojis.
  - Composición: `App.js` gatea entre Login y sesión autenticada.
  - Tema: `src/theme/tokens.js` con paleta/espaciados/tipografías extraídos de Web.
  - Tests Mobile: 19 casos con `node:test` (login, sesión, requests, refresh, logout, registro sin fugas de secretos).
- **Reutilizado**: endpoints y contrato reales de Backend (`/api/v1/auth/login`, `/refresh`, `/logout`, `/me`). Roles/permisos/alcances provistos por Backend.
- **Pendiente**:
  - Verificación de bundle en emulador/dispositivo Expo con `expo-secure-store` instalado (la dependencia está declarada en `Frontend/mobile/package.json`: `"expo-secure-store": "~14.2.4"`). En el entorno actual el monorepo no tiene `node_modules` completos para Mobile, pero la implementación usa `requireOptionalNativeModule` para fallar con mensaje claro si falta.
  - Ejecutar `npm test` a nivel monorepo para incluir Mobile cuando esté habilitado en CI (actualmente `npm test` ejecuta solo API y Web). Tests Mobile ya pasan localmente dentro de `Frontend/mobile/`.
- **Requiere modificación de API común**: ninguna. Todo el comportamiento se adapta al contrato existente.

### Pendientes (detalle)

- **Almacenamiento seguro**: `expo-secure-store` declarado. La app no tiene fallback inseguro; si el módulo nativo no está presente, `crearAdaptadorSecureStore()` lanza un error explícito (evita guardar tokens en claro). Esto cumple con "no introducir almacenamiento inseguro".
- **Sincronización/otros módulos**: para módulos con endpoints aún no implementados en Mobile (asistencia/calificaciones/notificaciones) se recomienda reutilizar `api.pedir` con Bearer y respetar permisos del Backend.
- **Sin commit/push**: no se realizaron commits ni push. Todos los cambios están únicamente dentro de `Frontend/mobile/`.
- **Dependencias fuera de alcance**: no se modificó `package-lock.json` raíz. La dependencia `expo-secure-store` se añadió solo en `Frontend/mobile/package.json`.