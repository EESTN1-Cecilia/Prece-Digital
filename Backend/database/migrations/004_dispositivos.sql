-- Dispositivos asociados a la cuenta autenticada.
--
-- Preparacion para las futuras notificaciones push de la aplicacion Mobile.
-- Cada registro es una instalacion de la app (un dispositivo fisico) y
-- pertenece a la ultima cuenta que la registro: si la misma instalacion se
-- registra desde otra cuenta, es la nueva cuenta la que la posee.
--
-- La clave unica de id_instalacion vuelve idempotente el registro: re-registrar
-- una instalacion existente actualiza plataforma/token (o la reactiva, si estaba
-- desasociada) en lugar de crear duplicados.
--
-- token_push es informacion sensible: nunca sale en respuestas ni logs y en
-- auditoria se enmascara (pushToken / tokenPush en CAMPOS_SENSIBLES).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS dispositivos (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id            INT UNSIGNED NOT NULL COMMENT 'Cuenta a la que pertenece la instalacion',
  id_instalacion        VARCHAR(128) NOT NULL COMMENT 'Identificador estable de la instalacion (Expo/OS)',
  plataforma            ENUM('android','ios') NOT NULL,
  token_push            VARCHAR(4096) NULL COMMENT 'Token del proveedor de push. SENSIBLE: no exponer',
  activo                TINYINT(1)   NOT NULL DEFAULT 1 COMMENT 'Baja logica de la desasociacion',
  fecha_registro        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dispositivo_instalacion (id_instalacion),
  KEY ix_dispositivos_usuario (usuario_id),
  CONSTRAINT fk_dispositivo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
