USE prece_digital;

CREATE TABLE IF NOT EXISTS curriculum_materias (
  id             VARCHAR(40)      NOT NULL PRIMARY KEY,
  nombre         VARCHAR(150)     NOT NULL,
  codigo         VARCHAR(60)      NOT NULL,
  descripcion    TEXT             NULL,
  escuela_id     INT UNSIGNED     NOT NULL,
  activo         TINYINT(1)       NOT NULL DEFAULT 1,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cmt_escuela_codigo (escuela_id, codigo),
  KEY ix_cmt_escuela (escuela_id),
  CONSTRAINT fk_cmt_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS disenos_curriculares (
  id             VARCHAR(40)      NOT NULL PRIMARY KEY,
  materia_id     VARCHAR(40)      NOT NULL,
  anio           SMALLINT         NOT NULL,
  curso_id       VARCHAR(40)      NOT NULL,
  division_id    VARCHAR(40)      NULL,
  nombre         VARCHAR(150)     NOT NULL,
  descripcion    TEXT             NULL,
  objetivos      JSON             NULL,
  estado         ENUM('borrador','vigente','archivado') NOT NULL DEFAULT 'borrador',
  escuela_id     INT UNSIGNED     NOT NULL,
  creado_por     INT UNSIGNED     NULL,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dcr_materia_anio_curso (materia_id, anio, curso_id),
  KEY ix_dcr_escuela (escuela_id),
  KEY ix_dcr_materia (materia_id),
  CONSTRAINT fk_dcr_materia FOREIGN KEY (materia_id) REFERENCES curriculum_materias(id) ON DELETE CASCADE,
  CONSTRAINT fk_dcr_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_dcr_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contenidos_curriculares (
  id             VARCHAR(40)      NOT NULL PRIMARY KEY,
  diseno_id      VARCHAR(40)      NOT NULL,
  nombre         VARCHAR(200)     NOT NULL,
  descripcion    TEXT             NULL,
  docente_id     VARCHAR(40)      NULL,
  orden          INT              NULL,
  estado         ENUM('no_iniciado','en_desarrollo','desarrollado','parcialmente_desarrollado','no_desarrollado','reprogramado') NOT NULL DEFAULT 'no_iniciado',
  avance         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  escuela_id     INT UNSIGNED     NOT NULL,
  creado_por     INT UNSIGNED     NULL,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_cnt_diseno (diseno_id),
  KEY ix_cnt_docente (docente_id),
  KEY ix_cnt_estado (estado),
  KEY ix_cnt_escuela (escuela_id),
  CONSTRAINT fk_cnt_diseno FOREIGN KEY (diseno_id) REFERENCES disenos_curriculares(id) ON DELETE CASCADE,
  CONSTRAINT fk_cnt_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_cnt_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS seguimientos_curriculares (
  id             VARCHAR(40)      NOT NULL PRIMARY KEY,
  contenido_id   VARCHAR(40)      NOT NULL,
  estado         ENUM('no_iniciado','en_desarrollo','desarrollado','parcialmente_desarrollado','no_desarrollado','reprogramado') NOT NULL,
  avance         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  nota           TEXT             NULL,
  fecha          DATE             NOT NULL,
  escuela_id     INT UNSIGNED     NOT NULL,
  creado_por     INT UNSIGNED     NULL,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_seg_contenido (contenido_id),
  KEY ix_seg_fecha (fecha),
  KEY ix_seg_estado (estado),
  KEY ix_seg_escuela (escuela_id),
  CONSTRAINT fk_seg_contenido FOREIGN KEY (contenido_id) REFERENCES contenidos_curriculares(id) ON DELETE CASCADE,
  CONSTRAINT fk_seg_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_seg_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_seguimientos (
  id             VARCHAR(40)      NOT NULL PRIMARY KEY,
  contenido_id   VARCHAR(40)      NOT NULL,
  seguimiento_id VARCHAR(40)      NULL,
  tipo           ENUM('creado','actualizado') NOT NULL,
  estado         ENUM('no_iniciado','en_desarrollo','desarrollado','parcialmente_desarrollado','no_desarrollado','reprogramado') NOT NULL,
  avance         TINYINT UNSIGNED NOT NULL DEFAULT 0,
  nota           TEXT             NULL,
  fecha          DATE             NOT NULL,
  realizado_por  INT UNSIGNED     NULL,
  creado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_sgh_contenido (contenido_id),
  KEY ix_sgh_seguimiento (seguimiento_id),
  KEY ix_sgh_fecha (fecha),
  CONSTRAINT fk_sgh_contenido    FOREIGN KEY (contenido_id) REFERENCES contenidos_curriculares(id) ON DELETE CASCADE,
  CONSTRAINT fk_sgh_seguimiento  FOREIGN KEY (seguimiento_id) REFERENCES seguimientos_curriculares(id) ON DELETE CASCADE,
  CONSTRAINT fk_sgh_realizado    FOREIGN KEY (realizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;