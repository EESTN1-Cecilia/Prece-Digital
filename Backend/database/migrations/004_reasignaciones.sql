-- Migracion 004: reasignaciones de espacios
-- Registra movimientos temporales de actividades/assignments a espacios
-- alternativos, con trazabilidad completa del espacio original y destino,
-- validación de conflictos y relación con liberaciones de ausencias.
--
-- Nota: los modulos in-memory usan identificadores textuales (prefijo rsa_/
-- rsh_/sca_/spc_); las columnas de referencia se modelan como VARCHAR(40)
-- y NO como FK estrictas para mantener coherencia con los datos en memoria.

USE prece_digital;

-- =====================================================================================
-- REASIGNACIONES DE ESPACIOS
-- =====================================================================================
CREATE TABLE IF NOT EXISTS reasignaciones_espacios (
  id                         VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Prefijo rsa_',
  asignacion_horaria_id      VARCHAR(40)  NOT NULL COMMENT 'Asignacion horaria afectada (schedules)',
  curso_id                   VARCHAR(40)  NULL COMMENT 'Curso derivado de la asignacion',
  division_id                VARCHAR(40)  NULL COMMENT 'Division derivada de la asignacion',
  materia_id                 VARCHAR(40)  NULL COMMENT 'Materia derivada de la asignacion',
  docente_id                 VARCHAR(40)  NULL COMMENT 'Docente derivado de la asignacion',
  espacio_original_id        VARCHAR(40)  NOT NULL COMMENT 'Espacio original (antes de la reasignacion)',
  espacio_destino_id         VARCHAR(40)  NOT NULL COMMENT 'Espacio destino (nuevo espacio)',
  fecha                      DATE         NOT NULL COMMENT 'Fecha especifica de la reasignacion',
  dia_semana                 VARCHAR(15)  NOT NULL COMMENT 'lunes, martes, miercoles, jueves, viernes, sabado, domingo',
  hora_inicio                VARCHAR(5)   NOT NULL COMMENT 'HH:MM',
  hora_fin                   VARCHAR(5)   NOT NULL COMMENT 'HH:MM',
  motivo                     VARCHAR(500) NULL COMMENT 'Motivo de la reasignacion',
  liberacion_id              VARCHAR(40)  NULL COMMENT 'Si proviene de una ausencia: id de la liberacion (absences)',
  estado                     ENUM('activa','revertida') NOT NULL DEFAULT 'activa',
  escuela_id                 INT UNSIGNED NOT NULL,
  registrado_por             INT UNSIGNED NULL COMMENT 'FK a usuarios (responsable)',
  modificado_por             INT UNSIGNED NULL COMMENT 'FK a usuarios (ultima modificacion)',
  snapshot_asignacion        JSON         NULL COMMENT 'Snapshot de la asignacion original al momento de la reasignacion',
  creado_en                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_rsa_asignacion      (asignacion_horaria_id),
  KEY ix_rsa_curso           (curso_id),
  KEY ix_rsa_division        (division_id),
  KEY ix_rsa_docente         (docente_id),
  KEY ix_rsa_espacio_original (espacio_original_id),
  KEY ix_rsa_espacio_destino  (espacio_destino_id),
  KEY ix_rsa_fecha           (fecha),
  KEY ix_rsa_dia             (dia_semana),
  KEY ix_rsa_estado          (estado),
  KEY ix_rsa_liberacion      (liberacion_id),
  KEY ix_rsa_escuela         (escuela_id),
  CONSTRAINT fk_rsa_asignacion  FOREIGN KEY (asignacion_horaria_id) REFERENCES asignaciones_horarias(id) ON DELETE CASCADE,
  CONSTRAINT fk_rsa_escuela     FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_rsa_creador     FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_rsa_modifica    FOREIGN KEY (modificado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_rsa_liberacion  FOREIGN KEY (liberacion_id) REFERENCES espacio_disponibilidad(id)
) ENGINE=InnoDB;

-- =====================================================================================
-- HISTORIAL DE REASIGNACIONES (trazabilidad completa de cambios)
-- Registra creacion, actualizaciones, correcciones, reversiones.
-- =====================================================================================
CREATE TABLE IF NOT EXISTS historial_reasignaciones (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reasignacion_id       VARCHAR(40)  NOT NULL COMMENT 'Referencia a la reasignacion',
  accion                VARCHAR(20)  NOT NULL COMMENT 'create, update, revert',
  datos_anteriores      JSON         NULL,
  datos_nuevos          JSON         NULL,
  usuario_id            INT UNSIGNED NULL COMMENT 'Quien realizo el cambio',
  cambiado_en           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_hr_reasignacion (reasignacion_id),
  CONSTRAINT fk_hr_reasignacion FOREIGN KEY (reasignacion_id) REFERENCES reasignaciones_espacios(id) ON DELETE CASCADE,
  CONSTRAINT fk_hr_usuario      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;