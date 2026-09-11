-- =====================================================================================
-- PRECE DIGITAL - Script de creación de base de datos
-- Motor: MySQL (XAMPP) | Engine: InnoDB | Charset: utf8mb4
--
-- Convenciones aplicadas:
--  - Todo dato persistente se asocia a una escuela (escuela_id) -> proyecto multiinstitución
--    (ver Shared/docs/architecture.md del repo).
--  - Se corrigieron nombres de tabla pedidos con errores de tipeo / caracteres no válidos
--    para identificadores MySQL:
--      años_divisiones            -> anios_divisiones
--      vlasificacione_parciales   -> calificaciones_parciales
--      calificaciones_cuatrimestrales (se mantiene, tenía error de tipeo "calificacione")
--  - Nombres de tabla y campo en snake_case, en español, según venías usando.
--  - Los roles se precargan con el catálogo real que ya está definido en
--    Shared/src/domain.mjs del repo (super-admin, system-admin, director, etc.)
--
-- IMPORTANTE: varios campos son una propuesta razonable a partir de lo que describen
-- los README de cada módulo del repo. Si tu docente/superior ya definió una estructura
-- de legajo, escalas de calificación, o matriz de permisos específica, esos campos
-- puntuales conviene validarlos antes de cargar datos reales.
-- =====================================================================================

CREATE DATABASE IF NOT EXISTS prece_digital
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE prece_digital;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================================
-- MÓDULO: IDENTIDAD Y ACCESO
-- Tablas: escuela, usuario/docente, roles, usuario_roles
-- =====================================================================================

-- Instituciones (soporta multiinstitución desde el modelo)
CREATE TABLE escuelas (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(150)  NOT NULL,
  cue             VARCHAR(20)   NULL COMMENT 'Clave Única de Establecimiento',
  direccion       VARCHAR(200)  NULL,
  localidad       VARCHAR(100)  NULL,
  provincia       VARCHAR(100)  NULL,
  telefono        VARCHAR(30)   NULL,
  email           VARCHAR(150)  NULL,
  activa          TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Usuarios del sistema (incluye docentes, directivos, preceptores, etc.)
CREATE TABLE usuarios (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id      INT UNSIGNED NOT NULL COMMENT 'Escuela "base" del usuario',
  nombre          VARCHAR(100) NOT NULL,
  apellido        VARCHAR(100) NOT NULL,
  dni             VARCHAR(20)  NOT NULL,
  email           VARCHAR(150) NOT NULL,
  telefono        VARCHAR(30)  NULL,
  password_hash   VARCHAR(255) NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acceso   DATETIME     NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_dni (dni),
  CONSTRAINT fk_usuarios_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

-- Catálogo de roles del sistema
CREATE TABLE roles (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(40)   NOT NULL COMMENT 'Identificador estable, ej: teacher, director',
  nombre       VARCHAR(80)   NOT NULL,
  descripcion  VARCHAR(255)  NULL,
  UNIQUE KEY uq_roles_codigo (codigo)
) ENGINE=InnoDB;

-- Módulos funcionales del sistema. Sobre ellos se definen los permisos.
CREATE TABLE modulos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(40)  NOT NULL COMMENT 'Identificador estable, ej: identity',
  nombre       VARCHAR(80)  NOT NULL,
  descripcion  VARCHAR(255) NULL,
  UNIQUE KEY uq_modulos_codigo (codigo)
) ENGINE=InnoDB;

-- Catálogo de permisos del sistema: un permiso es "<modulo>:<accion>"
CREATE TABLE permisos (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(80)  NOT NULL COMMENT 'Identificador estable, ej: identity:read',
  modulo       VARCHAR(40)  NOT NULL COMMENT 'Modulo del sistema, ej: identity, attendance',
  accion       VARCHAR(20)  NOT NULL COMMENT 'read, create, update, delete, approve, upload',
  descripcion  VARCHAR(255) NULL,
  UNIQUE KEY uq_permisos_codigo (codigo),
  KEY ix_permisos_modulo (modulo)
) ENGINE=InnoDB;

-- Relación rol <-> permiso: define qué puede hacer cada rol
CREATE TABLE rol_permisos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  rol_id      INT UNSIGNED NOT NULL,
  permiso_id  INT UNSIGNED NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rol_permiso (rol_id, permiso_id),
  CONSTRAINT fk_rp_rol     FOREIGN KEY (rol_id)     REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Relación usuario <-> rol, con alcance (escuela) para permisos por institución
CREATE TABLE usuario_roles (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  rol_id      INT UNSIGNED NOT NULL,
  escuela_id  INT UNSIGNED NOT NULL COMMENT 'Alcance del rol asignado',
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuario_rol_escuela (usuario_id, rol_id, escuela_id),
  CONSTRAINT fk_ur_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ur_rol     FOREIGN KEY (rol_id)     REFERENCES roles(id),
  CONSTRAINT fk_ur_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- MÓDULO: ESTRUCTURA ACADÉMICA
-- Tablas: ciclos_lectivos, anios_divisiones, materias, grupos_taller, asignaciones_docentes
-- =====================================================================================

CREATE TABLE ciclos_lectivos (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id    INT UNSIGNED NOT NULL,
  anio          YEAR         NOT NULL,
  fecha_inicio  DATE         NULL,
  fecha_fin     DATE         NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ciclo_escuela_anio (escuela_id, anio),
  CONSTRAINT fk_ciclo_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

-- Orientaciones / especialidades del ciclo superior.
-- En el Ciclo Básico (1° a 3°) no aplica orientación: es común a todos los estudiantes.
-- A partir de 4° el estudiante cursa en una de las orientaciones (ej: Técnico en Informática,
-- Técnico en Programación).
CREATE TABLE orientaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id  INT UNSIGNED NOT NULL,
  nombre      VARCHAR(100) NOT NULL COMMENT 'Ej: Técnico en Informática, Técnico en Programación',
  codigo      VARCHAR(30)  NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orientacion_escuela (escuela_id, nombre),
  CONSTRAINT fk_orient_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

-- Años/divisiones (ej: "4° 3"), por ciclo lectivo.
-- Escuela técnica de doble turno: cada división tiene un turno de AULA y, por regla,
-- un turno de TALLER opuesto al de aula (si aula es mañana, taller es tarde, y viceversa).
-- ÚNICA EXCEPCIÓN: en 7° año aula y taller se dictan en el mismo turno (queda un solo turno).
-- Esta regla se modela con una columna calculada (turno_taller) para no depender de cargarla
-- bien a mano; si la política cambia en el futuro, se ajusta acá en un solo lugar.
-- La división es un número, no necesariamente correlativo (ej: 1,2,3,4,6 en el Ciclo Básico),
-- y se repite entre orientaciones en 4°-7° (ej. 4°1 de Informática y 4°3 de Programación
-- son divisiones distintas aunque numéricamente cercanas), por eso NO se usa ENUM A-F.
CREATE TABLE anios_divisiones (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id         INT UNSIGNED NOT NULL,
  ciclo_lectivo_id   INT UNSIGNED NOT NULL,
  anio_curso         TINYINT UNSIGNED NOT NULL COMMENT '1 a 7',
  division           VARCHAR(5)   NOT NULL COMMENT 'Número de división, ej: 1, 2, 3, 4, 6',
  turno_aula         ENUM('mañana','tarde') NOT NULL COMMENT 'Turno en el que cursan las materias de aula',
  turno_taller       ENUM('mañana','tarde') GENERATED ALWAYS AS (
                        CASE
                          WHEN anio_curso = 7 THEN turno_aula
                          WHEN turno_aula = 'mañana' THEN 'tarde'
                          ELSE 'mañana'
                        END
                      ) STORED COMMENT 'Opuesto a turno_aula, salvo en 7° que coincide',
  orientacion_id     INT UNSIGNED NULL COMMENT 'NULL en Ciclo Básico (1°-3°). Obligatorio de 4° a 7°',
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_anio_division (ciclo_lectivo_id, anio_curso, division),
  CONSTRAINT fk_ad_escuela     FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_ad_ciclo       FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_ad_orientacion FOREIGN KEY (orientacion_id) REFERENCES orientaciones(id)
) ENGINE=InnoDB;

CREATE TABLE materias (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id  INT UNSIGNED NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  codigo      VARCHAR(30)  NULL,
  activa      TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materias_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

CREATE TABLE grupos_taller (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id        INT UNSIGNED NOT NULL,
  ciclo_lectivo_id  INT UNSIGNED NOT NULL,
  materia_id        INT UNSIGNED NULL,
  nombre            VARCHAR(120) NOT NULL,
  cupo_maximo       SMALLINT UNSIGNED NULL,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gt_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_gt_ciclo   FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_gt_materia FOREIGN KEY (materia_id) REFERENCES materias(id)
) ENGINE=InnoDB;

-- Asignación de un docente a una materia / división / taller en un ciclo lectivo
CREATE TABLE asignaciones_docentes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id          INT UNSIGNED NOT NULL,
  docente_id          INT UNSIGNED NOT NULL COMMENT 'FK a usuarios',
  ciclo_lectivo_id    INT UNSIGNED NOT NULL,
  materia_id          INT UNSIGNED NULL,
  anio_division_id    INT UNSIGNED NULL,
  grupo_taller_id     INT UNSIGNED NULL,
  rol_asignacion      ENUM('titular','suplente','ayudante') NOT NULL DEFAULT 'titular',
  horas_catedra       SMALLINT UNSIGNED NULL,
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_asig_escuela   FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_asig_docente   FOREIGN KEY (docente_id) REFERENCES usuarios(id),
  CONSTRAINT fk_asig_ciclo     FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_asig_materia   FOREIGN KEY (materia_id) REFERENCES materias(id),
  CONSTRAINT fk_asig_aniodiv   FOREIGN KEY (anio_division_id) REFERENCES anios_divisiones(id),
  CONSTRAINT fk_asig_taller    FOREIGN KEY (grupo_taller_id) REFERENCES grupos_taller(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- MÓDULO: ESTUDIANTES
-- Tablas: estudiantes, contacto_responsable, estudiante_contacto, datos_salud, pases,
--         asistencias_diarias, asistencias_materia, conflictos_asistencia,
--         justificativos_asistencia
-- =====================================================================================

CREATE TABLE estudiantes (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id          INT UNSIGNED NOT NULL,
  anio_division_id    INT UNSIGNED NULL COMMENT 'Curso actual del estudiante',
  legajo              VARCHAR(30)  NULL,
  nombre              VARCHAR(100) NOT NULL,
  apellido            VARCHAR(100) NOT NULL,
  dni                 VARCHAR(20)  NOT NULL,
  fecha_nacimiento    DATE         NULL,
  genero              VARCHAR(30)  NULL,
  direccion           VARCHAR(200) NULL,
  fecha_ingreso       DATE         NULL,
  fecha_egreso        DATE         NULL,
  condicion           ENUM('regular','irregular') NULL COMMENT 'Condicion academica segun trayectoria del ciclo lectivo',
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_estudiante_dni (dni),
  CONSTRAINT fk_est_escuela   FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_est_aniodiv   FOREIGN KEY (anio_division_id) REFERENCES anios_divisiones(id)
) ENGINE=InnoDB;

-- Inscripcion de estudiantes a grupos/talleres: permite obtener listados por grupo y por taller
-- La condicion del alumno queda en estudiantes.condicion (se actualiza segun trayectoria).
CREATE TABLE inscripciones_taller (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id       INT UNSIGNED NOT NULL,
  grupo_taller_id     INT UNSIGNED NOT NULL,
  anio_division_id    INT UNSIGNED NOT NULL COMMENT 'Division desde la que el estudiante cursa el taller',
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inscripcion_taller (estudiante_id, grupo_taller_id),
  CONSTRAINT fk_it_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_it_grupo      FOREIGN KEY (grupo_taller_id) REFERENCES grupos_taller(id),
  CONSTRAINT fk_it_aniodiv    FOREIGN KEY (anio_division_id) REFERENCES anios_divisiones(id)
) ENGINE=InnoDB;

-- Personas responsables/contacto (padre, madre, tutor, etc.), reutilizables entre hermanos
CREATE TABLE contacto_responsable (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  apellido    VARCHAR(100) NOT NULL,
  dni         VARCHAR(20)  NULL,
  telefono    VARCHAR(30)  NULL,
  email       VARCHAR(150) NULL,
  direccion   VARCHAR(200) NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Relación N:M entre estudiantes y sus contactos responsables
CREATE TABLE estudiante_contacto (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id           INT UNSIGNED NOT NULL,
  contacto_id             INT UNSIGNED NOT NULL,
  parentesco              VARCHAR(50)  NULL COMMENT 'Ej: madre, padre, tutor',
  responsable_principal   TINYINT(1)   NOT NULL DEFAULT 0,
  autorizado_retiro       TINYINT(1)   NOT NULL DEFAULT 0,
  UNIQUE KEY uq_est_contacto (estudiante_id, contacto_id),
  CONSTRAINT fk_ec_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_ec_contacto   FOREIGN KEY (contacto_id) REFERENCES contacto_responsable(id)
) ENGINE=InnoDB;

-- Datos de salud del legajo (dato sensible: no debe quedar disponible offline)
CREATE TABLE datos_salud (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id               INT UNSIGNED NOT NULL,
  obra_social                 VARCHAR(100) NULL,
  numero_afiliado             VARCHAR(50)  NULL,
  grupo_sanguineo             VARCHAR(10)  NULL,
  alergias                    TEXT         NULL,
  medicacion_habitual         TEXT         NULL,
  condiciones_medicas         TEXT         NULL,
  contacto_emergencia_nombre  VARCHAR(150) NULL,
  contacto_emergencia_telefono VARCHAR(30) NULL,
  observaciones               TEXT         NULL,
  actualizado_en              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_datos_salud_estudiante (estudiante_id),
  CONSTRAINT fk_ds_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id)
) ENGINE=InnoDB;

-- Pases entre instituciones
CREATE TABLE pases (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id         INT UNSIGNED NOT NULL,
  escuela_origen_id     INT UNSIGNED NULL,
  escuela_destino_id    INT UNSIGNED NULL,
  fecha_pase            DATE         NOT NULL,
  motivo                VARCHAR(255) NULL,
  estado                ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  documentacion_url     VARCHAR(255) NULL,
  registrado_por        INT UNSIGNED NULL COMMENT 'FK a usuarios',
  creado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pase_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_pase_origen     FOREIGN KEY (escuela_origen_id) REFERENCES escuelas(id),
  CONSTRAINT fk_pase_destino    FOREIGN KEY (escuela_destino_id) REFERENCES escuelas(id),
  CONSTRAINT fk_pase_usuario    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Asistencia institucional (diaria)
CREATE TABLE asistencias_diarias (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id     INT UNSIGNED NOT NULL,
  ciclo_lectivo_id  INT UNSIGNED NOT NULL,
  fecha             DATE         NOT NULL,
  estado            ENUM('presente','ausente','tarde','media_falta') NOT NULL,
  justificada       TINYINT(1)   NOT NULL DEFAULT 0,
  registrado_por    INT UNSIGNED NULL COMMENT 'FK a usuarios',
  observaciones     VARCHAR(255) NULL,
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asis_diaria (estudiante_id, fecha),
  CONSTRAINT fk_asisd_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_asisd_ciclo      FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_asisd_usuario    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Asistencia por materia
CREATE TABLE asistencias_materia (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id           INT UNSIGNED NOT NULL,
  asignacion_docente_id   INT UNSIGNED NOT NULL,
  fecha                   DATE         NOT NULL,
  estado                  ENUM('presente','ausente','tarde','media_falta') NOT NULL,
  justificada             TINYINT(1)   NOT NULL DEFAULT 0,
  registrado_por          INT UNSIGNED NULL COMMENT 'FK a usuarios',
  creado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_asis_materia (estudiante_id, asignacion_docente_id, fecha),
  CONSTRAINT fk_asism_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_asism_asignacion FOREIGN KEY (asignacion_docente_id) REFERENCES asignaciones_docentes(id),
  CONSTRAINT fk_asism_usuario    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Conflictos de asistencia (ej: discrepancias entre registro diario y por materia, o de sincronización)
CREATE TABLE conflictos_asistencia (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id           INT UNSIGNED NOT NULL,
  origen                  ENUM('diaria','materia','sincronizacion') NOT NULL,
  asistencia_diaria_id    INT UNSIGNED NULL,
  asistencia_materia_id   INT UNSIGNED NULL,
  descripcion             TEXT         NOT NULL,
  estado                  ENUM('pendiente','en_revision','resuelto') NOT NULL DEFAULT 'pendiente',
  resuelto_por            INT UNSIGNED NULL COMMENT 'FK a usuarios',
  resolucion              TEXT         NULL,
  fecha_deteccion         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion        DATETIME     NULL,
  CONSTRAINT fk_ca_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_ca_asisd      FOREIGN KEY (asistencia_diaria_id) REFERENCES asistencias_diarias(id),
  CONSTRAINT fk_ca_asism      FOREIGN KEY (asistencia_materia_id) REFERENCES asistencias_materia(id),
  CONSTRAINT fk_ca_usuario    FOREIGN KEY (resuelto_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Justificativos de inasistencia
CREATE TABLE justificativos_asistencia (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id       INT UNSIGNED NOT NULL,
  fecha_desde         DATE         NOT NULL,
  fecha_hasta         DATE         NOT NULL,
  motivo              VARCHAR(255) NOT NULL,
  archivo_adjunto_url VARCHAR(255) NULL,
  estado              ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  presentado_por      INT UNSIGNED NULL COMMENT 'FK a usuarios o contacto_responsable, según flujo',
  aprobado_por        INT UNSIGNED NULL COMMENT 'FK a usuarios',
  fecha_presentacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion    DATETIME     NULL,
  CONSTRAINT fk_ja_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_ja_presentado FOREIGN KEY (presentado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_ja_aprobado   FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- MÓDULO: CALIFICACIONES
-- Tablas: calificaciones_parciales, calificaciones_cuatrimestrales,
--         instancias_intensificacion, solicitudes_reapertura
-- =====================================================================================

CREATE TABLE calificaciones_parciales (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id           INT UNSIGNED NOT NULL,
  asignacion_docente_id   INT UNSIGNED NOT NULL,
  tipo_evaluacion         VARCHAR(60)  NULL COMMENT 'Ej: escrito, oral, trabajo práctico',
  periodo                 VARCHAR(30)  NULL COMMENT 'Ej: 1er bimestre',
  fecha                   DATE         NOT NULL,
  valor                   VARCHAR(10)  NOT NULL COMMENT 'Numérico o conceptual, según escala vigente',
  observaciones           VARCHAR(255) NULL,
  registrado_por          INT UNSIGNED NULL COMMENT 'FK a usuarios',
  creado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_cp_asignacion FOREIGN KEY (asignacion_docente_id) REFERENCES asignaciones_docentes(id),
  CONSTRAINT fk_cp_usuario    FOREIGN KEY (registrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE calificaciones_cuatrimestrales (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id           INT UNSIGNED NOT NULL,
  asignacion_docente_id   INT UNSIGNED NOT NULL,
  ciclo_lectivo_id        INT UNSIGNED NOT NULL,
  cuatrimestre            TINYINT UNSIGNED NOT NULL COMMENT '1 o 2',
  valor                   VARCHAR(10)  NOT NULL,
  condicion               ENUM('aprobado','desaprobado','pendiente') NOT NULL DEFAULT 'pendiente',
  fecha_cierre            DATE         NULL,
  cerrado_por             INT UNSIGNED NULL COMMENT 'FK a usuarios',
  creado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cc (estudiante_id, asignacion_docente_id, cuatrimestre),
  CONSTRAINT fk_cc_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_cc_asignacion FOREIGN KEY (asignacion_docente_id) REFERENCES asignaciones_docentes(id),
  CONSTRAINT fk_cc_ciclo      FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_cc_usuario    FOREIGN KEY (cerrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Instancias de intensificación / apoyo (ej: diciembre, febrero, mesas de examen)
CREATE TABLE instancias_intensificacion (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  estudiante_id     INT UNSIGNED NOT NULL,
  materia_id        INT UNSIGNED NOT NULL,
  ciclo_lectivo_id  INT UNSIGNED NOT NULL,
  periodo           VARCHAR(40)  NOT NULL COMMENT 'Ej: diciembre, febrero, mesa de examen',
  docente_id        INT UNSIGNED NULL COMMENT 'FK a usuarios',
  resultado         VARCHAR(10)  NULL,
  fecha             DATE         NULL,
  observaciones     VARCHAR(255) NULL,
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ii_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_ii_materia    FOREIGN KEY (materia_id) REFERENCES materias(id),
  CONSTRAINT fk_ii_ciclo      FOREIGN KEY (ciclo_lectivo_id) REFERENCES ciclos_lectivos(id),
  CONSTRAINT fk_ii_docente    FOREIGN KEY (docente_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Solicitudes de reapertura de una calificación ya cerrada
CREATE TABLE solicitudes_reapertura (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tabla_origen                ENUM('parcial','cuatrimestral') NOT NULL,
  calificacion_parcial_id     INT UNSIGNED NULL,
  calificacion_cuatrimestral_id INT UNSIGNED NULL,
  solicitado_por              INT UNSIGNED NOT NULL COMMENT 'FK a usuarios',
  motivo                      TEXT         NOT NULL,
  estado                      ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  aprobado_por                INT UNSIGNED NULL COMMENT 'FK a usuarios',
  fecha_solicitud              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion            DATETIME     NULL,
  CONSTRAINT fk_sr_parcial      FOREIGN KEY (calificacion_parcial_id) REFERENCES calificaciones_parciales(id),
  CONSTRAINT fk_sr_cuatri       FOREIGN KEY (calificacion_cuatrimestral_id) REFERENCES calificaciones_cuatrimestrales(id),
  CONSTRAINT fk_sr_solicitante  FOREIGN KEY (solicitado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sr_aprobador    FOREIGN KEY (aprobado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- MÓDULO: AUDITORÍA
-- Tablas: auditoria_logs, lotes_importacion, notificaciones, tickets_soporte
-- =====================================================================================

CREATE TABLE auditoria_logs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNSIGNED NULL COMMENT 'Quién realizó la acción',
  escuela_id      INT UNSIGNED NULL,
  accion          VARCHAR(50)  NOT NULL COMMENT 'Ej: create, update, delete, export, login',
  tabla_afectada  VARCHAR(60)  NOT NULL,
  registro_id     BIGINT UNSIGNED NULL,
  valor_anterior  JSON         NULL,
  valor_nuevo     JSON         NULL,
  motivo          VARCHAR(255) NULL,
  sesion_id       VARCHAR(100) NULL,
  dispositivo     VARCHAR(150) NULL,
  ip              VARCHAR(45)  NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_al_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_al_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

-- Log de errores del servidor (fallos esperados e inesperados).
-- No almacena cuerpo de la petición ni cabeceras: solo método, ruta, código y mensaje.
CREATE TABLE logs_errores (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNSIGNED NULL COMMENT 'Usuario autenticado al momento del fallo, si lo hay',
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metodo          VARCHAR(10)  NULL,
  ruta            VARCHAR(255) NULL,
  tipo            ENUM('esperado','inesperado') NOT NULL DEFAULT 'inesperado',
  code            VARCHAR(80)  NULL,
  message         TEXT         NULL,
  ip              VARCHAR(45)  NULL,
  CONSTRAINT fk_le_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Lotes de importación de Excel (con soporte de reversión, según mvp-scope.md)
CREATE TABLE lotes_importacion (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id            INT UNSIGNED NOT NULL,
  usuario_id            INT UNSIGNED NOT NULL COMMENT 'Quién importó',
  tipo                  VARCHAR(60)  NOT NULL COMMENT 'Ej: estudiantes, calificaciones, asistencias',
  nombre_archivo        VARCHAR(255) NOT NULL,
  estado                ENUM('procesando','completado','con_errores','revertido') NOT NULL DEFAULT 'procesando',
  total_registros       INT UNSIGNED NOT NULL DEFAULT 0,
  registros_exitosos    INT UNSIGNED NOT NULL DEFAULT 0,
  registros_error       INT UNSIGNED NOT NULL DEFAULT 0,
  detalle_errores       JSON         NULL,
  fecha_importacion     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_reversion       DATETIME     NULL,
  CONSTRAINT fk_li_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_li_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE notificaciones (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT UNSIGNED NOT NULL COMMENT 'Destinatario',
  escuela_id      INT UNSIGNED NULL,
  tipo            VARCHAR(50)  NOT NULL COMMENT 'Ej: alerta_asistencia, cierre_notas, sistema',
  titulo          VARCHAR(150) NOT NULL,
  mensaje         TEXT         NOT NULL,
  leida           TINYINT(1)   NOT NULL DEFAULT 0,
  fecha_creacion  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura   DATETIME     NULL,
  CONSTRAINT fk_notif_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_notif_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

CREATE TABLE tickets_soporte (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id        INT UNSIGNED NOT NULL,
  usuario_id        INT UNSIGNED NOT NULL COMMENT 'Quién reporta',
  asunto            VARCHAR(150) NOT NULL,
  descripcion       TEXT         NOT NULL,
  categoria         VARCHAR(60)  NULL,
  prioridad         ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
  estado            ENUM('abierto','en_proceso','resuelto','cerrado') NOT NULL DEFAULT 'abierto',
  asignado_a        INT UNSIGNED NULL COMMENT 'FK a usuarios (soporte)',
  fecha_creacion    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_cierre      DATETIME     NULL,
  CONSTRAINT fk_ts_escuela  FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_ts_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_ts_asignado FOREIGN KEY (asignado_a) REFERENCES usuarios(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================================================
-- SEED: catálogo de roles
-- Tomado tal cual de Shared/src/domain.mjs del repo (no inventado)
-- =====================================================================================

INSERT INTO roles (codigo, nombre, descripcion) VALUES
  ('super-admin',          'Superadministrador',                 'Alcance global sobre todas las escuelas'),
  ('system-admin',         'Administrador del sistema',          'Alcance: escuela'),
  ('director',             'Directivo',                          'Alcance: escuela, período'),
  ('secretary',            'Secretaría',                         'Alcance: escuela, curso, período'),
  ('area-lead',            'Jefatura de área',                   'Alcance: escuela, área, materia, período'),
  ('preceptor',            'Preceptoría',                        'Alcance: escuela, curso, turno, período'),
  ('teacher',              'Docencia',                           'Alcance: escuela, curso, materia, período'),
  ('attendance-operator',  'Responsable operativo de asistencia','Alcance: escuela, curso, turno, período');


-- =====================================================================================
-- SEED: catálogo de permisos y asignación por rol
-- Un permiso es "<modulo>:<accion>". Los módulos son los del sistema y las acciones,
-- las definidas para la autorización: consultar, crear, modificar, eliminar, aprobar
-- y cargar información.
--
-- IMPORTANTE: la matriz de abajo es una propuesta de trabajo. La matriz definitiva por
-- rol y alcance figura como pendiente de validación institucional en
-- Shared/docs/mvp-scope.md; conviene revisarla antes de cargar datos reales.
-- =====================================================================================

INSERT INTO modulos (codigo, nombre, descripcion) VALUES
  ('identity',           'Identidad y acceso',    'Usuarios, roles, permisos por alcance y sesiones auditadas'),
  ('academic-structure', 'Estructura académica',  'Escuelas, ciclos, turnos, cursos, materias, talleres y asignaciones'),
  ('attendance',         'Asistencia',            'Registro institucional y por materia, justificaciones, cierres y alertas'),
  ('students',           'Estudiantes y legajos', 'Datos personales, trayectoria, pases y documentación respaldatoria'),
  ('grades',             'Calificaciones',        'Evaluaciones, cierres, intensificaciones, RITE y reaperturas justificadas'),
  ('files',              'Excel y documentos',    'Plantillas versionadas, importaciones reversibles y exportaciones autorizadas'),
  ('audit',              'Auditoría',             'Historial de cambios, accesos, exportaciones, restauraciones y aprobaciones');

INSERT INTO permisos (codigo, modulo, accion, descripcion) VALUES
  ('identity:read',             'identity',           'read',    'Consultar usuarios, roles y permisos'),
  ('identity:create',           'identity',           'create',  'Crear usuarios'),
  ('identity:update',           'identity',           'update',  'Modificar usuarios, roles y permisos'),
  ('identity:delete',           'identity',           'delete',  'Dar de baja usuarios'),
  ('academic-structure:read',   'academic-structure', 'read',    'Consultar cursos, materias y turnos'),
  ('academic-structure:create', 'academic-structure', 'create',  'Crear estructura académica'),
  ('academic-structure:update', 'academic-structure', 'update',  'Modificar estructura académica'),
  ('academic-structure:delete', 'academic-structure', 'delete',  'Eliminar estructura académica'),
  ('attendance:read',           'attendance',         'read',    'Consultar asistencia'),
  ('attendance:create',         'attendance',         'create',  'Registrar asistencia'),
  ('attendance:update',         'attendance',         'update',  'Modificar asistencia'),
  ('attendance:approve',        'attendance',         'approve', 'Justificar y cerrar asistencia'),
  ('students:read',             'students',           'read',    'Consultar estudiantes y legajos'),
  ('students:create',           'students',           'create',  'Registrar estudiantes'),
  ('students:update',           'students',           'update',  'Modificar legajos'),
  ('students:delete',           'students',           'delete',  'Dar de baja estudiantes'),
  ('grades:read',               'grades',             'read',    'Consultar calificaciones'),
  ('grades:create',             'grades',             'create',  'Cargar calificaciones'),
  ('grades:update',             'grades',             'update',  'Modificar calificaciones'),
  ('grades:approve',            'grades',             'approve', 'Cerrar y reabrir calificaciones'),
  ('files:read',                'files',              'read',    'Consultar plantillas y documentos'),
  ('files:upload',              'files',              'upload',  'Importar planillas y documentos'),
  ('files:approve',             'files',              'approve', 'Aprobar importaciones y exportaciones'),
  ('audit:read',                'audit',              'read',    'Consultar el historial de auditoría'),
  ('audit:export',              'audit',              'export',  'Exportar reportes de auditoría');

-- super-admin: todos los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permisos p WHERE r.codigo = 'super-admin';

-- system-admin: identidad completa y lectura del resto
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.modulo = 'identity' OR p.accion = 'read' OR p.codigo = 'audit:export'
WHERE r.codigo = 'system-admin';

-- director: lectura general, aprobaciones y auditoría
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.accion IN ('read', 'approve', 'export')
WHERE r.codigo = 'director';

-- secretaría: estudiantes y estructura académica, más lectura general
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.modulo IN ('students', 'academic-structure') OR p.accion = 'read'
WHERE r.codigo = 'secretary';

-- jefatura de área: calificaciones y documentos, más lectura general
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.modulo IN ('grades', 'files') OR p.accion = 'read'
WHERE r.codigo = 'area-lead';

-- preceptoría: asistencia completa, más lectura de estudiantes y estructura
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.modulo = 'attendance'
  OR (p.accion = 'read' AND p.modulo IN ('students', 'academic-structure', 'grades'))
WHERE r.codigo = 'preceptor';

-- docencia: carga de asistencia y calificaciones de sus materias
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.codigo IN ('attendance:read', 'attendance:create', 'attendance:update',
                  'grades:read', 'grades:create', 'grades:update',
                  'students:read', 'academic-structure:read',
                  'files:read', 'files:upload')
WHERE r.codigo = 'teacher';

-- responsable operativo de asistencia: solo asistencia
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r JOIN permisos p
  ON p.modulo = 'attendance' OR p.codigo IN ('students:read', 'academic-structure:read')
WHERE r.codigo = 'attendance-operator';

-- =====================================================================================
-- SEED OPCIONAL: escuela, ciclo lectivo, orientaciones y estructura real de cursos
-- Basado en lo que confirmaste (EEST N°1 Montegrande, doble turno, 7 años,
-- Ciclo Básico 1°-3° + orientaciones Informática y Programación de 4° a 7°).
-- Editá el nombre de la escuela y el año del ciclo lectivo si hace falta.
-- Comentá/borrá este bloque si preferís cargar la escuela y el ciclo a mano.
-- =====================================================================================

INSERT INTO escuelas (nombre, activa)
VALUES ('EEST N°1 Montegrande', 1);
SET @escuela_id = LAST_INSERT_ID();

INSERT INTO ciclos_lectivos (escuela_id, anio, activo)
VALUES (@escuela_id, 2026, 1);
SET @ciclo_id = LAST_INSERT_ID();

INSERT INTO orientaciones (escuela_id, nombre, codigo) VALUES
  (@escuela_id, 'Técnico en Informática', 'informatica'),
  (@escuela_id, 'Técnico en Programación', 'programacion');
SET @orient_informatica = (SELECT id FROM orientaciones WHERE escuela_id = @escuela_id AND codigo = 'informatica');
SET @orient_programacion = (SELECT id FROM orientaciones WHERE escuela_id = @escuela_id AND codigo = 'programacion');

-- Ciclo Básico: 1° a 3°, divisiones 1, 2, 3, 4 y 6 (sin orientación).
-- turno_aula es el turno "base" de cada división; turno_taller se calcula solo (columna generada).
-- AJUSTAR turno_aula división por división según corresponda en la realidad de la escuela.
INSERT INTO anios_divisiones (escuela_id, ciclo_lectivo_id, anio_curso, division, turno_aula, orientacion_id) VALUES
  (@escuela_id, @ciclo_id, 1, '1', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 1, '2', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 1, '3', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 1, '4', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 1, '6', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 2, '1', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 2, '2', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 2, '3', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 2, '4', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 2, '6', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 3, '1', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 3, '2', 'mañana', NULL),
  (@escuela_id, @ciclo_id, 3, '3', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 3, '4', 'tarde',  NULL),
  (@escuela_id, @ciclo_id, 3, '6', 'mañana', NULL);

-- Técnico en Informática: 4°1, 4°2, 5°1, 5°2, 6°1, 7°1
-- En 7° el turno_aula elegido ES el único turno (aula y taller coinciden, por la columna generada).
INSERT INTO anios_divisiones (escuela_id, ciclo_lectivo_id, anio_curso, division, turno_aula, orientacion_id) VALUES
  (@escuela_id, @ciclo_id, 4, '1', 'mañana', @orient_informatica),
  (@escuela_id, @ciclo_id, 4, '2', 'tarde',  @orient_informatica),
  (@escuela_id, @ciclo_id, 5, '1', 'mañana', @orient_informatica),
  (@escuela_id, @ciclo_id, 5, '2', 'tarde',  @orient_informatica),
  (@escuela_id, @ciclo_id, 6, '1', 'mañana', @orient_informatica),
  (@escuela_id, @ciclo_id, 7, '1', 'mañana', @orient_informatica);

-- Técnico en Programación: 4°3, 4°4, 5°3, 5°4, 6°3, 7°2
INSERT INTO anios_divisiones (escuela_id, ciclo_lectivo_id, anio_curso, division, turno_aula, orientacion_id) VALUES
  (@escuela_id, @ciclo_id, 4, '3', 'mañana', @orient_programacion),
  (@escuela_id, @ciclo_id, 4, '4', 'tarde',  @orient_programacion),
  (@escuela_id, @ciclo_id, 5, '3', 'mañana', @orient_programacion),
  (@escuela_id, @ciclo_id, 5, '4', 'tarde',  @orient_programacion),
  (@escuela_id, @ciclo_id, 6, '3', 'mañana', @orient_programacion),
  (@escuela_id, @ciclo_id, 7, '2', 'tarde',  @orient_programacion);
