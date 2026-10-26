USE prece_digital;

/* Datos academicos y carga horaria del area de Docencia.
   Se agregan al perfil porque el alta crea un unico cargo por persona. */
ALTER TABLE usuarios
  ADD COLUMN materia           VARCHAR(120)     NULL COMMENT 'Solo area docencia' AFTER telefono,
  ADD COLUMN situacion_revista VARCHAR(20)      NULL COMMENT 'Titular, Provisional o Suplente' AFTER materia,
  ADD COLUMN suplente_de       VARCHAR(120)     NULL COMMENT 'Docente titular reemplazado' AFTER situacion_revista,
  ADD COLUMN modulos           TINYINT UNSIGNED NULL COMMENT 'Carga horaria: 2, 3, 4 o 6' AFTER suplente_de,
  ADD COLUMN hora_desde        TIME             NULL AFTER modulos,
  ADD COLUMN hora_hasta        TIME             NULL AFTER hora_desde;
