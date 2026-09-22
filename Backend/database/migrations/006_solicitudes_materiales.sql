USE prece_digital;

CREATE TABLE IF NOT EXISTS solicitudes_materiales (
  id                 VARCHAR(40)  NOT NULL PRIMARY KEY COMMENT 'Prefijo mreq_ (coincide con el modulo en memoria)',
  solicitante_id     INT UNSIGNED NOT NULL COMMENT 'FK a usuarios: quien solicita (siempre de la sesion)',
  escuela_id         INT UNSIGNED NOT NULL COMMENT 'Escuela a la que pertenece la solicitud',
  motivo             VARCHAR(500) NOT NULL COMMENT 'Motivo o finalidad de la solicitud',
  observaciones      VARCHAR(1000) NULL,
  estado             ENUM('pendiente','en_revision','aprobada','rechazada','cancelada','entregada','cerrada') NOT NULL DEFAULT 'pendiente',
  estado_anterior    VARCHAR(30)  NULL COMMENT 'Estado previo antes de la transicion actual',
  decidido_por       INT UNSIGNED NULL COMMENT 'Quien resolvio aprobacion, rechazo o cancelacion',
  aprobado_por       INT UNSIGNED NULL COMMENT 'Quien autorizo la solicitud',
  aprobado_en        DATETIME     NULL,
  rechazado_por      INT UNSIGNED NULL COMMENT 'Quien rechazo la solicitud',
  rechazado_en       DATETIME     NULL,
  motivo_rechazo     VARCHAR(500) NULL COMMENT 'Motivo del rechazo, obligatorio al rechazar',
  cancelado_por      INT UNSIGNED NULL COMMENT 'Quien cancelo la solicitud',
  cancelado_en       DATETIME     NULL,
  motivo_cancelacion VARCHAR(500) NULL,
  entregado_por      INT UNSIGNED NULL COMMENT 'Quien confirmo la entrega de materiales',
  entregado_en       DATETIME     NULL,
  cerrado_por        INT UNSIGNED NULL COMMENT 'Quien cerro la solicitud',
  cerrado_en         DATETIME     NULL,
  creado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_sm_escuela    (escuela_id),
  KEY ix_sm_solicitante (solicitante_id),
  KEY ix_sm_estado     (estado),
  KEY ix_sm_creado     (creado_en),
  CONSTRAINT fk_sm_solicitante FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_escuela    FOREIGN KEY (escuela_id) REFERENCES escuelas(id),
  CONSTRAINT fk_sm_decidido   FOREIGN KEY (decidido_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_aprobado   FOREIGN KEY (aprobado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_rechazado  FOREIGN KEY (rechazado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_cancelado  FOREIGN KEY (cancelado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_entregado  FOREIGN KEY (entregado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_sm_cerrado    FOREIGN KEY (cerrado_por) REFERENCES usuarios(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes_materiales_items (
  id                VARCHAR(40) NOT NULL PRIMARY KEY COMMENT 'Prefijo mre_',
  solicitud_id      VARCHAR(40) NOT NULL COMMENT 'FK a solicitudes_materiales',
  material_id       VARCHAR(40) NOT NULL COMMENT 'FK a inventario_materiales',
  cantidad          INT         NOT NULL COMMENT 'Cantidad solicitada, mayor a cero',
  cantidad_aprobada INT         NULL COMMENT 'Cantidad autorizada; se define en la aprobacion',
  observaciones     VARCHAR(1000) NULL,
  KEY ix_smi_solicitud (solicitud_id),
  KEY ix_smi_material  (material_id),
  CONSTRAINT fk_smi_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes_materiales(id) ON DELETE CASCADE,
  CONSTRAINT fk_smi_material  FOREIGN KEY (material_id) REFERENCES inventario_materiales(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_solicitudes_materiales (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id   VARCHAR(40) NOT NULL COMMENT 'FK a solicitudes_materiales',
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo   VARCHAR(30) NOT NULL,
  usuario_id     INT UNSIGNED NULL COMMENT 'Quien realizo la transicion',
  detalle        JSON        NULL COMMENT 'Datos de la transicion (cantidades aprobadas, movimientos generados, motivo)',
  cambiado_en    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_hsm_solicitud (solicitud_id),
  KEY ix_hsm_estado    (estado_nuevo),
  KEY ix_hsm_usuario   (usuario_id),
  CONSTRAINT fk_hsm_solicitud FOREIGN KEY (solicitud_id) REFERENCES solicitudes_materiales(id) ON DELETE CASCADE,
  CONSTRAINT fk_hsm_usuario   FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;