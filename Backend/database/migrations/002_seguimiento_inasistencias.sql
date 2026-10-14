-- Migracion 002: seguimiento de inasistencias
-- Aplica sobre una base creada con la version anterior de schema.sql

USE prece_digital;

-- 1) Catalogo central de tipos de accion (se administran aca, no desde el codigo)
CREATE TABLE IF NOT EXISTS tipos_accion_seguimiento (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(40)  NOT NULL COMMENT 'Identificador del tipo, ej: llamado_familia',
  descripcion   VARCHAR(160) NOT NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tipo_accion_seg (codigo)
) ENGINE=InnoDB;

INSERT IGNORE INTO tipos_accion_seguimiento (codigo, descripcion) VALUES
  ('llamado_familia',        'Llamado telefonico a la familia del alumno'),
  ('comunicacion_familia',   'Comunicacion con padre, madre o tutor'),
  ('notificacion',           'Notificacion enviada a la familia o a la institucion'),
  ('comunicacion_cuaderno',  'Comunicacion registrada mediante el cuaderno del alumno'),
  ('entrevista',             'Entrevista o reunion con la familia, el alumno u otro responsable'),
  ('otra_medida',            'Otra medida tomada por la institucion');

-- 2) Acciones de seguimiento de una inasistencia
--    No modifica ni reemplaza la inasistencia: solo documenta la intervencion.
CREATE TABLE IF NOT EXISTS seguimientos_inasistencia (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id            INT UNSIGNED NOT NULL,
  estudiante_id         INT UNSIGNED NOT NULL,
  fecha                 DATE         NOT NULL COMMENT 'Fecha en que se realizo la accion',
  tipo_accion           VARCHAR(40)  NOT NULL COMMENT 'Codigo de tipos_accion_seguimiento',
  usuario_responsable   INT UNSIGNED NOT NULL COMMENT 'Usuario autenticado que realizo o registro la accion',
  observaciones         VARCHAR(500) NOT NULL,
  historial             JSON         NULL COMMENT 'Estado anterior en cada modificacion, para no perder informacion',
  creado_en             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_por            INT UNSIGNED NULL,
  actualizado_en        DATETIME     NULL,
  actualizado_por       INT UNSIGNED NULL,
  KEY idx_seg_estudiante (estudiante_id, fecha),
  KEY idx_seg_fecha      (fecha),
  KEY idx_seg_tipo       (tipo_accion),
  KEY idx_seg_resp       (usuario_responsable),
  CONSTRAINT fk_seg_escuela    FOREIGN KEY (escuela_id)          REFERENCES escuelas(id),
  CONSTRAINT fk_seg_estudiante FOREIGN KEY (estudiante_id)       REFERENCES estudiantes(id),
  CONSTRAINT fk_seg_tipo       FOREIGN KEY (tipo_accion)         REFERENCES tipos_accion_seguimiento(codigo),
  CONSTRAINT fk_seg_responsable FOREIGN KEY (usuario_responsable) REFERENCES usuarios(id),
  CONSTRAINT fk_seg_creado_por  FOREIGN KEY (creado_por)          REFERENCES usuarios(id),
  CONSTRAINT fk_seg_actualizado_por FOREIGN KEY (actualizado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;
