USE prece_digital;

/* Area institucional del docente (modulo de gestion de docentes).
   Guarda el identificador estable del catalogo de areas
   (Backend/config/areas.config.mjs), no el texto visible, igual que usuarios.area.
   Es opcional: los docentes ya cargados quedan sin area hasta que se edite. */
ALTER TABLE docentes
  ADD COLUMN area VARCHAR(40) NULL COMMENT 'Id del catalogo de areas institucionales' AFTER especialidades,
  ADD INDEX idx_docente_area (escuela_id, area);
