USE prece_digital;

/* Dia de cursada de la carga horaria docente y marca de clave provisoria.

   Ambas columnas admiten los registros existentes sin tocarlos: los perfiles
   cargados antes quedan sin dia (NULL) hasta su proxima edicion academica, y
   las cuentas existentes no quedan obligadas a cambiar la clave (DEFAULT 0).
   Las cuentas nuevas se crean con la clave provisoria = DNI y la marca en 1. */
ALTER TABLE usuarios
  ADD COLUMN dia ENUM('Lunes','Martes','Miercoles','Jueves','Viernes') NULL
    COMMENT 'Dia de cursada de la carga horaria' AFTER hora_hasta,
  ADD COLUMN debe_cambiar_clave TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'Clave provisoria pendiente de cambio' AFTER password_hash;
