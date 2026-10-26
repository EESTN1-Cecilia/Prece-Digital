USE prece_digital;

/* Asistencia por clase del docente (modules/asistencia-clases).

   Se reusa asistencias_materia (una fila por alumno) y se agrega la cabecera de
   la toma: division + materia + fecha, quien la registro y quien la corrigio.
   La unicidad de la cabecera impide registrar dos veces la misma clase. Las
   correcciones guardan como estaban los registros antes del cambio. Nada se
   borra. */

CREATE TABLE tomas_asistencia_materia (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id         INT UNSIGNED NOT NULL,
  anio_division_id   INT UNSIGNED NOT NULL,
  materia_id         INT UNSIGNED NOT NULL,
  fecha              DATE         NOT NULL,
  docente_id         INT UNSIGNED NULL COMMENT 'FK a docentes',
  registrado_por     INT UNSIGNED NOT NULL COMMENT 'FK a usuarios (identidad del token)',
  actualizado_por    INT UNSIGNED NULL,
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_toma_clase (anio_division_id, materia_id, fecha),
  KEY idx_toma_docente (registrado_por, fecha),
  CONSTRAINT fk_toma_escuela   FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_toma_division  FOREIGN KEY (anio_division_id) REFERENCES anios_divisiones(id),
  CONSTRAINT fk_toma_materia   FOREIGN KEY (materia_id) REFERENCES materias(id),
  CONSTRAINT fk_toma_docente   FOREIGN KEY (docente_id) REFERENCES docentes(id),
  CONSTRAINT fk_toma_usuario   FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_toma_actualiza FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

ALTER TABLE asistencias_materia
  ADD COLUMN toma_id INT UNSIGNED NULL COMMENT 'Toma de la que forma parte' AFTER asignacion_docente_id,
  ADD UNIQUE KEY uq_asis_toma_alumno (toma_id, estudiante_id),
  ADD CONSTRAINT fk_asism_toma FOREIGN KEY (toma_id) REFERENCES tomas_asistencia_materia(id);

CREATE TABLE tomas_asistencia_correcciones (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  toma_id               INT UNSIGNED NOT NULL,
  modificado_por        INT UNSIGNED NOT NULL,
  modificado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  registros_anteriores  JSON         NOT NULL COMMENT 'Estados por alumno antes de la correccion',
  KEY idx_correccion_toma (toma_id),
  CONSTRAINT fk_corr_toma    FOREIGN KEY (toma_id) REFERENCES tomas_asistencia_materia(id),
  CONSTRAINT fk_corr_usuario FOREIGN KEY (modificado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
