-- Alertas por inasistencia consecutiva.
--
-- El modulo detecta, a partir de las inasistencias registradas, cuando un alumno
-- alcanza el periodo de inasistencias consecutivas que exige la institucion,
-- registra la situacion y genera el evento que dispara la notificacion.
--
-- La tabla de configuracion es lo que permite que el periodo sea una regla
-- institucional y no un valor fijo en el codigo: cada escuela tiene la suya.
-- La clave unica de la alerta es lo que vuelve idempotente la evaluacion: una
-- misma condicion, alumno y periodo no pueden generar dos alertas.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Configuracion institucional de la deteccion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuraciones_alertas_ausencia (
  escuela_id                      INT UNSIGNED NOT NULL,
  habilitada                      TINYINT(1)   NOT NULL DEFAULT 1,
  dias_consecutivos               SMALLINT UNSIGNED NOT NULL DEFAULT 3
    COMMENT 'Dias lectivos seguidos que generan la alerta',
  tipos_contabilizados            JSON         NOT NULL
    COMMENT 'Tipos de inasistencia que cuentan para la racha, ej: ["ausente"]',
  justificadas_generan_alerta     TINYINT(1)   NOT NULL DEFAULT 0,
  justificadas_reinician_racha    TINYINT(1)   NOT NULL DEFAULT 1,
  prioridad_notificacion          ENUM('baja','normal','alta') NOT NULL DEFAULT 'alta',
  canales                         JSON         NOT NULL
    COMMENT 'Canales de aviso, ej: ["notificacion_interna"]',
  dias_no_habiles                 JSON         NULL
    COMMENT 'Feriados y feriados puente. Sabados y domingos ya se excluyen.',
  umbral_alerta_inasistencias     SMALLINT UNSIGNED NOT NULL DEFAULT 15
    COMMENT 'Referencia institucional para el reporte; no interviene en la racha',
  creado_en                       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (escuela_id),
  CONSTRAINT chk_dias_consecutivos CHECK (dias_consecutivos BETWEEN 1 AND 30)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Inasistencias: el insumo de la deteccion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inasistencias (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id           INT UNSIGNED NOT NULL,
  estudiante_id        INT UNSIGNED NOT NULL,
  fecha                DATE         NOT NULL,
  tipo                 ENUM('ausente','tarde','media_falta') NOT NULL DEFAULT 'ausente',
  justificada          TINYINT(1)   NOT NULL DEFAULT 0,
  motivo               VARCHAR(500) NULL
    COMMENT 'Obligatorio cuando la inasistencia esta justificada',
  observaciones        VARCHAR(500) NULL,
  baja_en              DATETIME     NULL COMMENT 'Baja logica: el registro nunca se borra',
  baja_motivo          VARCHAR(500) NULL,
  baja_por             INT UNSIGNED NULL,
  registrado_por       INT UNSIGNED NOT NULL,
  creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por      INT UNSIGNED NULL,
  -- Una inasistencia por alumno y dia mientras esta vigente. MySQL considera
  -- distintos los NULL de un indice unico, asi que la baja logica se modela con
  -- una columna generada: 1 mientras la inasistencia esta activa y NULL cuando
  -- fue dada de baja. Asi el indice bloquea el duplicado vigente y a la vez
  -- permite varias bajas históricas del mismo dia.
  activa TINYINT(1) GENERATED ALWAYS AS (IF(baja_en IS NULL, 1, NULL)) STORED,
  UNIQUE KEY uq_inasistencia_alumno_fecha (estudiante_id, fecha, activa),
  KEY ix_inasistencias_alumno (estudiante_id, fecha),
  KEY ix_inasistencias_escuela (escuela_id, fecha),
  CONSTRAINT fk_inasistencias_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas (id),
  CONSTRAINT fk_inasistencias_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id),
  CONSTRAINT fk_inasistencias_registrado_por FOREIGN KEY (registrado_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Alertas: las situaciones detectadas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertas_ausencia (
  id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id                   INT UNSIGNED NOT NULL,
  estudiante_id                INT UNSIGNED NOT NULL,
  condicion                    VARCHAR(40)  NOT NULL DEFAULT 'inasistencias_consecutivas',
  clave                        VARCHAR(191) NOT NULL
    COMMENT 'Idempotencia: escuela|alumno|condicion|desde|hasta|umbral',
  cantidad_inasistencias       SMALLINT UNSIGNED NOT NULL,
  dias_consecutivos_exigidos   SMALLINT UNSIGNED NOT NULL,
  periodo_desde                DATE         NOT NULL,
  periodo_hasta                DATE         NOT NULL,
  dias                         JSON         NOT NULL COMMENT 'Dias lectivos del periodo',
  inasistencia_ids             JSON         NULL COMMENT 'Inasistencias que componen el periodo',
  inasistencias                JSON         NULL COMMENT 'Snapshot de cada inasistencia del periodo',
  detectada_en                 DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_deteccion              DATE         NOT NULL,
  generada_en                  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generada_por                 INT UNSIGNED NULL COMMENT 'NULL cuando corre el proceso periodico',
  disparador                   ENUM('registro_inasistencia','modificacion_inasistencia','baja_inasistencia','periodica')
                                NOT NULL DEFAULT 'periodica',
  configuracion_aplicada       JSON         NOT NULL
    COMMENT 'Regla con la que se detecto, aunque despues la escuela la cambie',
  estado                       ENUM('activa','en_revision','resuelta','descartada') NOT NULL DEFAULT 'activa',
  observaciones                 VARCHAR(500) NULL,
  seguimiento_id               INT UNSIGNED NULL
    COMMENT 'Referencia opcional a la intervencion que resolvio la alerta',
  evento_id                    INT UNSIGNED NULL,
  notificaciones_ids           JSON         NULL,
  historial                    JSON         NULL COMMENT 'Estados anteriores de la alerta',
  resuelta_en                  DATETIME     NULL,
  resuelta_por                 INT UNSIGNED NULL,
  actualizado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  actualizado_por              INT UNSIGNED NULL,
  UNIQUE KEY uq_alerta_clave (clave),
  KEY ix_alertas_alumno (estudiante_id, periodo_hasta),
  KEY ix_alertas_escuela_estado (escuela_id, estado),
  CONSTRAINT fk_alertas_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas (id),
  CONSTRAINT fk_alertas_estudiante FOREIGN KEY (estudiante_id) REFERENCES estudiantes (id),
  CONSTRAINT fk_alertas_generada_por FOREIGN KEY (generada_por) REFERENCES usuarios (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Eventos: el contrato de salida hacia el sistema de notificaciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eventos_notificacion (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  alerta_id            INT UNSIGNED NOT NULL,
  escuela_id           INT UNSIGNED NOT NULL,
  estudiante_id        INT UNSIGNED NOT NULL,
  tipo_evento          VARCHAR(60)  NOT NULL DEFAULT 'alerta.inasistencia_consecutiva',
  destinatarios        JSON         NOT NULL COMMENT 'Ids de los usuarios a notificar',
  tipo_notificacion    VARCHAR(40)  NOT NULL DEFAULT 'ausencia',
  mensaje              VARCHAR(500) NOT NULL,
  prioridad            ENUM('baja','normal','alta') NOT NULL DEFAULT 'alta',
  canales              JSON         NOT NULL,
  estado_envio         ENUM('pendiente','enviado') NOT NULL DEFAULT 'pendiente',
  datos                JSON         NULL,
  clave                VARCHAR(191) NOT NULL COMMENT 'Misma clave que la alerta',
  generado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enviado_en           DATETIME     NULL,
  notificacion_ids     JSON         NULL,
  UNIQUE KEY uq_evento_clave (clave),
  KEY ix_eventos_alerta (alerta_id),
  CONSTRAINT fk_eventos_alerta FOREIGN KEY (alerta_id) REFERENCES alertas_ausencia (id),
  CONSTRAINT fk_eventos_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- Evaluaciones: la traza de las corridas, util para el proceso periodico
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones_alertas (
  id                              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  escuela_id                       INT UNSIGNED NOT NULL,
  disparador                       ENUM('registro_inasistencia','modificacion_inasistencia','baja_inasistencia','periodica')
                                    NOT NULL DEFAULT 'periodica',
  ejecutada_por                   INT UNSIGNED NULL,
  iniciada_en                     DATETIME     NOT NULL,
  finalizada_en                   DATETIME     NULL,
  alumnos_evaluados               INT UNSIGNED NOT NULL DEFAULT 0,
  periodos_detectados             INT UNSIGNED NOT NULL DEFAULT 0,
  alertas_creadas                 INT UNSIGNED NOT NULL DEFAULT 0,
  alertas_omitidas_por_duplicado  INT UNSIGNED NOT NULL DEFAULT 0,
  KEY ix_evaluaciones_escuela (escuela_id, iniciada_en),
  CONSTRAINT fk_evaluaciones_escuela FOREIGN KEY (escuela_id) REFERENCES escuelas (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- La FK del evento se agrega al final porque alertas_ausencia lo referencia.
SET FOREIGN_KEY_CHECKS = 1;
