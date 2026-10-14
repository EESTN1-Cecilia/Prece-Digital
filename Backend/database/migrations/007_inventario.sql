USE prece_digital;

CREATE TABLE IF NOT EXISTS inventario_materiales (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Prefijo inv_ (coincide con el modulo en memoria)',
  escuela_id         INT UNSIGNED NOT NULL,
  nombre             VARCHAR(200) NOT NULL,
  descripcion        VARCHAR(2000) NULL,
  categoria          ENUM('mobiliario','equipamiento','material','herramienta','tecnologia','otro') NOT NULL,
  stock_actual       INT          NOT NULL DEFAULT 0 COMMENT 'Stock vigente, sincronizado con los movimientos',
  stock_minimo       INT          NOT NULL DEFAULT 0 COMMENT 'Stock minimo de alerta',
  unidad_medida      VARCHAR(30)  NOT NULL DEFAULT 'unidad',
  estado             ENUM('disponible','agotado','danado','en_reparacion','inactivo') NOT NULL DEFAULT 'disponible',
  ubicacion          VARCHAR(200) NULL,
  observaciones      VARCHAR(2000) NULL,
  activo             TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Baja: se desactiva sin eliminar el historial',
  registrado_por     INT UNSIGNED NULL COMMENT 'FK a usuarios (responsable de la creacion)',
  modificado_por     INT UNSIGNED NULL COMMENT 'FK a usuarios (ultima modificacion)',
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_inv_escuela  (escuela_id),
  KEY ix_inv_categoria (categoria),
  KEY ix_inv_estado   (estado),
  KEY ix_inv_ubicacion (ubicacion),
  KEY ix_inv_activo   (activo),
  CONSTRAINT fk_inv_escuela  FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_inv_creador  FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_inv_modifica FOREIGN KEY (modificado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id               VARCHAR(40)   NOT NULL PRIMARY KEY COMMENT 'Prefijo inm_',
  material_id      VARCHAR(40)   NOT NULL COMMENT 'Material afectado (inventario)',
  escuela_id       INT UNSIGNED  NOT NULL,
  tipo             ENUM('alta','baja','donacion','prestamo','devolucion','ajuste') NOT NULL,
  cantidad         INT           NOT NULL COMMENT 'Cantidad siempre mayor a cero, la direccion la dan los tipos',
  stock_anterior   INT           NULL COMMENT 'Stock del material antes del movimiento',
  stock_resultante INT           NULL COMMENT 'Stock del material despues del movimiento',
  movimiento_referencia VARCHAR(40) NULL COMMENT 'ID del prestamo que una devolucion cancela',
  motivo           VARCHAR(500)  NOT NULL COMMENT 'Motivo obligatorio del movimiento',
  observaciones    VARCHAR(1000) NULL,
  usuario_id       INT UNSIGNED  NULL COMMENT 'Responsable autenticado (de la sesion, nunca del frontend)',
  creado_en        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_inm_material (material_id),
  KEY ix_inm_tipo    (tipo),
  KEY ix_inm_usuario (usuario_id),
  KEY ix_inm_creado  (creado_en),
  KEY ix_inm_escuela (escuela_id),
  KEY ix_inm_referencia (movimiento_referencia),
  CONSTRAINT fk_inm_material FOREIGN KEY (material_id) REFERENCES inventario_materiales(id),
  CONSTRAINT fk_inm_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_inm_escuela  FOREIGN KEY (escuela_id) REFERENCES escuelas(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_inventario (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  material_id    VARCHAR(40) NOT NULL,
  campo          VARCHAR(30) NOT NULL COMMENT 'Campo modificado',
  valor_anterior JSON        NULL,
  valor_nuevo    JSON        NULL,
  usuario_id     INT UNSIGNED NULL COMMENT 'Quien realizo el cambio',
  cambiado_en    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_hist_inv_material (material_id),
  KEY ix_hist_inv_campo    (campo),
  KEY ix_hist_inv_usuario  (usuario_id),
  CONSTRAINT fk_hi_material FOREIGN KEY (material_id) REFERENCES inventario_materiales(id) ON DELETE CASCADE,
  CONSTRAINT fk_hi_usuario  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;