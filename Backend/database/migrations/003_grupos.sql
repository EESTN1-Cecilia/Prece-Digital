-- Migracion 003: grupos, burbujas y agrupaciones institucionales
-- Representa grupos completos o parciales de un curso, burbujas, grupos de
-- taller y agrupaciones temporales, con su planificacion de espacio/horario
-- y las asociaciones de alumnos (integrantes), manteniendo trazabilidad.
--
-- Nota: los modulos in-memory (groups, schedules, spaces, workshops) usan
-- identificadores textuales (prefijo grp_/sch_/spc_/wrk_); por eso las
-- columnas de referencia se modelan como VARCHAR(40) y NO como FK estrictas:
-- la coherencia el backend la mantiene el modulo de grupos via validaciones.

USE prece_digital;

-- =====================================================================================
-- GRUPOS / BURBUJAS / AGRUPACIONES
-- =====================================================================================
CREATE TABLE IF NOT EXISTS grupos (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Prefijo grp_ (coincide con el modulo en memoria)',
  escuela_id         INT UNSIGNED NOT NULL,
  nombre             VARCHAR(200) NOT NULL,
  tipo               ENUM('curso','burbuja','taller','temporal','otro') NOT NULL DEFAULT 'curso',
  curso_id           VARCHAR(40)  NULL COMMENT 'Curso de origen (referencia al modulo en memoria)',
  division_id        VARCHAR(40)  NULL COMMENT 'Division de origen (referencia al modulo en memoria)',
  taller_id          VARCHAR(40)  NULL COMMENT 'Taller asociado, cuando corresponda (modulo workshops)',
  espacio_id         VARCHAR(40)  NULL COMMENT 'Espacio asignado a la planificacion (modulo spaces)',
  horario_id         VARCHAR(40)  NULL COMMENT 'Horario asignado a la planificacion (modulo schedules)',
  estado             ENUM('activo','inactivo','finalizado') NOT NULL DEFAULT 'activo',
  descripcion        VARCHAR(2000) NULL,
  observaciones      VARCHAR(2000) NULL,
  registrado_por     INT UNSIGNED NULL COMMENT 'FK a usuarios (responsable de la creacion)',
  modificado_por     INT UNSIGNED NULL COMMENT 'FK a usuarios (ultima modificacion)',
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_grupos_escuela  (escuela_id),
  KEY ix_grupos_tipo     (tipo),
  KEY ix_grupos_curso    (curso_id),
  KEY ix_grupos_division (division_id),
  KEY ix_grupos_taller   (taller_id),
  KEY ix_grupos_espacio  (espacio_id),
  KEY ix_grupos_horario  (horario_id),
  KEY ix_grupos_estado   (estado),
  CONSTRAINT fk_grp_escuela  FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_grp_creador  FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_grp_modifica FOREIGN KEY (modificado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- INTEGRANTES DE GRUPOS (asociacion alumno-grupo)
-- Una fila por alumno y grupo. La asociacion se elimina o desactiva conservando
-- el historial de cambios (eliminacion logica via activo = 0).
-- =====================================================================================
CREATE TABLE IF NOT EXISTS grupo_integrantes (
  id              VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Prefijo gmb_',
  grupo_id        VARCHAR(40)  NOT NULL,
  estudiante_id   INT UNSIGNED NOT NULL COMMENT 'FK a estudiantes (alumno)',
  escuela_id      INT UNSIGNED NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  registrado_por  INT UNSIGNED NULL COMMENT 'Quien agrego al alumno',
  removido_por    INT UNSIGNED NULL COMMENT 'Quien desasocio al alumno',
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removido_en     DATETIME     NULL,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grupo_integrante (grupo_id, estudiante_id),
  KEY ix_gmb_grupo    (grupo_id),
  KEY ix_gmb_estudiante (estudiante_id),
  KEY ix_gmb_activo   (activo),
  CONSTRAINT fk_gmb_escuela    FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_gmb_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes(id),
  CONSTRAINT fk_gmb_grupo      FOREIGN KEY (grupo_id) REFERENCES grupos(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- HISTORIAL DE CAMBIOS DE GRUPOS (trazabilidad completa)
-- Registra creacion, modificaciones, cambios de estado y de integrantes,
-- y las asociaciones de curso, distribucion, espacio y horario.
-- =====================================================================================
CREATE TABLE IF NOT EXISTS historial_grupos (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grupo_id       VARCHAR(40)  NOT NULL,
  escuela_id     INT UNSIGNED NOT NULL,
  accion         VARCHAR(30)  NOT NULL COMMENT 'create, update, activate, deactivate, finalize, member_added, member_removed',
  entidad        VARCHAR(30)  NULL COMMENT 'grupo, integrante, curso, division, taller, espacio, horario',
  valor_anterior JSON         NULL,
  valor_nuevo    JSON         NULL,
  usuario_id     INT UNSIGNED NULL COMMENT 'Quien realizo el cambio',
  cambiado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_hist_grupo (grupo_id),
  KEY ix_hist_escuela (escuela_id),
  CONSTRAINT fk_hg_grupo   FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
  CONSTRAINT fk_hg_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_hg_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;