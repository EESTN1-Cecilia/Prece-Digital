USE prece_digital;

ALTER TABLE estudiantes
  ADD COLUMN condicion ENUM('regular','irregular') NULL
  COMMENT 'Condicion academica segun trayectoria del ciclo lectivo'
  AFTER fecha_egreso;

CREATE TABLE IF NOT EXISTS inscripciones_taller (
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