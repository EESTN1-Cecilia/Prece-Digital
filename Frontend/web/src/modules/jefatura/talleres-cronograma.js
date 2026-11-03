/* Cronograma de talleres de noviembre 2026 (Ciclo Basico y Ciclo Superior).

   Fuente: planilla "TALLERES NOVIEMBRE CB y CS 2026" (turno manana y tarde,
   franjas 1 y 2). Es informacion de la planilla institucional: la API todavia
   no expone el cronograma de talleres, por eso vive aca como dato de referencia
   (igual que las fechas iniciales del calendario). Cuando exista el endpoint,
   alcanza con reemplazar `FILAS` por el resultado de la API.

   Cada fila: [grupo, turno, franja, dia, horario, alumnos, taller, aula, docente]
     grupo     "anio.numero" de grupo de taller (1.1, 1.3, 4.2, ...)
     franja    1 = primera franja del turno, 2 = segunda
     alumnos   cupo que figura en la planilla (null en practicas profesionalizantes) */

const FILAS = [
  ["1.1", "mañana", 2, "lunes", "10:20 a 12:20", 16, "Sistemas Tecnológicos", "Taller", "Meza"],
  ["1.1", "mañana", 1, "miercoles", "7:10 a 9:10", 16, "Procedimientos Técnicos", "Taller", "Flores"],
  ["1.1", "mañana", 2, "miercoles", "9:20 a 11:20", 16, "Lenguajes Tecnológicos", "Aula 5", "Monje"],
  ["1.2", "tarde", 1, "martes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Peña"],
  ["1.2", "tarde", 2, "martes", "15:10 a 17:10", 16, "Lenguajes Tecnológicos", "Aula 4", "Peña"],
  ["1.2", "tarde", 1, "viernes", "13 a 15", 16, "Procedimientos Técnicos", "Taller", "Olmeda"],
  ["1.3", "mañana", 1, "miercoles", "7:10 a 9:10", 17, "Lenguajes Tecnológicos", "Aula 4", "Valdez"],
  ["1.3", "mañana", 2, "miercoles", "9:20 a 11:20", 17, "Procedimientos Técnicos", "Taller", "Aguinaga"],
  ["1.3", "mañana", 1, "viernes", "7:10 a 9:10", 17, "Sistemas Tecnológicos", "Taller", "Meza"],
  ["1.4", "tarde", 1, "miercoles", "13 a 15", 16, "Lenguajes Tecnológicos", "Taller", "Luna"],
  ["1.4", "tarde", 1, "viernes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Luna"],
  ["1.4", "tarde", 2, "viernes", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "De La Torre"],
  ["1.5", "mañana", 1, "jueves", "7:10 a 9:10", 16, "Sistemas Tecnológicos", "Taller", "Ibarra"],
  ["1.5", "mañana", 2, "jueves", "9:20 a 11:20", 16, "Procedimientos Técnicos", "Taller", "Grasso"],
  ["1.5", "mañana", 1, "viernes", "7:10 a 9:10", 16, "Lenguajes Tecnológicos", "SUM", "Aguinaga"],
  ["1.6", "tarde", 1, "lunes", "13 a 15", 16, "Procedimientos Técnicos", "Taller", "Grasso"],
  ["1.6", "tarde", 2, "lunes", "15:10 a 17:10", 16, "Sistemas Tecnológicos", "Taller", "Flores"],
  ["1.6", "tarde", 1, "jueves", "13 a 15", 16, "Lenguajes Tecnológicos", "SUM", "Valdez"],
  ["1.7", "mañana", 1, "martes", "7:20 a 9:20", 16, "Sistemas Tecnológicos", "Taller", "Araneda"],
  ["1.7", "mañana", 2, "martes", "9:30 a 11:30", 16, "Lenguajes Tecnológicos", "Aula 4", "Valdez"],
  ["1.7", "mañana", 1, "miercoles", "7:10 a 9:10", 16, "Procedimientos Técnicos", "Taller", "Aguinaga"],
  ["1.8", "tarde", 1, "martes", "13 a 15", 15, "Sistemas Tecnológicos", "Taller", "De La Torre"],
  ["1.8", "tarde", 2, "martes", "15:10 a 17:10", 15, "Procedimientos Técnicos", "Taller", "Guirland"],
  ["1.8", "tarde", 1, "jueves", "13 a 15", 15, "Lenguajes Tecnológicos", "SUM", "Zalazar"],
  ["1.9", "mañana", 1, "lunes", "7:10 a 9:10", 17, "Sistemas Tecnológicos", "SUM", "Guirland"],
  ["1.9", "mañana", 2, "lunes", "9:20 a 11:20", 17, "Procedimientos Técnicos", "Taller", "De La Torre"],
  ["1.9", "mañana", 2, "viernes", "9:40 a 11:40", 17, "Lenguajes Tecnológicos", "SUM", "Olmeda"],
  ["1.11", "mañana", 1, "lunes", "7:10 a 9:10", 15, "Procedimientos Técnicos", "Taller", "De La Torre"],
  ["1.11", "mañana", 2, "lunes", "9:20 a 11:20", 17, "Sistemas Tecnológicos", "Taller", "Flores"],
  ["1.11", "mañana", 2, "martes", "9:40 a 11:40", 17, "Lenguajes Tecnológicos", "Aula 5", "Monje"],
  ["2.1", "mañana", 1, "lunes", "7:30 a 9:30", 17, "Procedimientos Técnicos", "Taller", "Ibarra"],
  ["2.1", "mañana", 1, "martes", "7:30 a 9:30", 17, "Procedimientos Técnicos", "Taller", "Ibarra"],
  ["2.1", "mañana", 1, "jueves", "7:30 a 9:30", 17, "Sistemas Tecnológicos", "Aula 8", ""],
  ["2.1", "mañana", 2, "jueves", "9:40 a 11:40", 17, "Lenguajes Tecnológicos", "Aula 8", "Aguinaga"],
  ["2.2", "tarde", 1, "miercoles", "13 a 15", 16, "Sistemas Tecnológicos", "Aula 5", ""],
  ["2.2", "tarde", 2, "miercoles", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "Luna"],
  ["2.2", "tarde", 1, "jueves", "13 a 15", 16, "Procedimientos Técnicos", "Taller", "Luna"],
  ["2.2", "tarde", 2, "jueves", "15:10 a 17:10", 16, "Lenguajes Tecnológicos", "Taller", "Flores"],
  ["2.3", "mañana", 1, "lunes", "7:30 a 9:30", 16, "Sistemas Tecnológicos", "SUM", "Araneda"],
  ["2.3", "mañana", 2, "martes", "9:40 a 11:40", 16, "Procedimientos Técnicos", "Taller", "Araneda"],
  ["2.3", "mañana", 1, "jueves", "7:10 a 9:10", 16, "Lenguajes Tecnológicos", "Aula 5", "Giannicola"],
  ["2.3", "mañana", 2, "jueves", "9:20 a 11:20", 15, "Procedimientos Técnicos", "SUM", "Farco"],
  ["2.4", "tarde", 1, "lunes", "13 a 15", 16, "Lenguajes Tecnológicos", "Aula 5", "Monje"],
  ["2.4", "tarde", 2, "martes", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "Matamala"],
  ["2.4", "tarde", 1, "viernes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "De La Torre"],
  ["2.4", "tarde", 2, "viernes", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "Matamala"],
  ["2.5", "mañana", 1, "lunes", "7:10 a 9:10", 15, "Procedimientos Técnicos", "Aula 8", "Rodriguez"],
  ["2.5", "mañana", 2, "lunes", "9:20 a 11:20", 15, "Procedimientos Técnicos", "Taller", "Grasso"],
  ["2.5", "mañana", 2, "miercoles", "9:40 a 11:40", 15, "Sistemas Tecnológicos", "Taller", "Luna"],
  ["2.5", "mañana", 2, "jueves", "10:20 a 12:20", 16, "Lenguajes Tecnológicos", "Aula 5", "Meza"],
  ["2.6", "tarde", 1, "martes", "13 a 15", 16, "Lenguajes Tecnológicos", "SUM", "Meza"],
  ["2.6", "tarde", 2, "martes", "16:10 a 18:10", 16, "Lenguajes Tecnológicos", "Aula 5", "Meza"],
  ["2.6", "tarde", 2, "jueves", "15:10 a 17:10", 16, "Sistemas Tecnológicos", "Taller", "Grasso"],
  ["2.7", "mañana", 1, "lunes", "7:10 a 9:10", 16, "Procedimientos Técnicos", "Taller", "Aguinaga"],
  ["2.7", "mañana", 2, "lunes", "9:20 a 11:20", 16, "Lenguajes Tecnológicos", "SUM", "Aguinaga"],
  ["2.7", "mañana", 1, "jueves", "7:30 a 9:20", 16, "Procedimientos Técnicos", "Taller", "Aguinaga"],
  ["2.8", "tarde", 1, "miercoles", "13 a 15", 16, "Procedimientos Técnicos", "Taller", "Grasso"],
  ["2.8", "tarde", 1, "jueves", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "De La Torre"],
  ["2.9", "mañana", 1, "martes", "7:10 a 9:10", 16, "Procedimientos Técnicos", "Taller", "Bordon"],
  ["2.9", "mañana", 2, "martes", "9:20 a 11:20", 16, "Sistemas Tecnológicos", "Taller", "Nobile"],
  ["2.9", "mañana", 1, "viernes", "7:10 a 9:10", 16, "Lenguajes Tecnológicos", "SUM", "Cuellar"],
  ["2.9", "mañana", 2, "viernes", "9:20 a 11:20", 16, "Procedimientos Técnicos", "Taller", "Bordon"],
  ["2.11", "mañana", 1, "lunes", "7:10 a 9:10", 15, "Procedimientos Técnicos", "Taller", "Flores"],
  ["2.11", "mañana", 2, "lunes", "9:20 a 11:20", 15, "Lenguajes Tecnológicos", "SUM", "Baldovino"],
  ["2.11", "mañana", 2, "miercoles", "9:20 a 11:20", 15, "Procedimientos Técnicos", "Taller", "Bordon"],
  ["2.11", "mañana", 2, "jueves", "9:40 a 11:40", 15, "Sistemas Tecnológicos", "Aula 4", ""],
  ["3.1", "mañana", 1, "martes", "8:20 a 10:20", 13, "Sistemas Tecnológicos", "Aula 8", "Goldy"],
  ["3.1", "mañana", 1, "jueves", "7:20 a 9:20", 13, "Lenguajes Tecnológicos", "SUM", "Cuellar"],
  ["3.1", "mañana", 1, "viernes", "7:10 a 9:10", 13, "Procedimientos Técnicos", "Taller", "Olmeda"],
  ["3.1", "mañana", 2, "viernes", "9:20 a 11:20", 13, "Sistemas Tecnológicos", "Taller", "Aguinaga"],
  ["3.2", "tarde", 1, "martes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Furiato"],
  ["3.2", "tarde", 2, "martes", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "Luna"],
  ["3.2", "tarde", 2, "miercoles", "15:10 a 17:10", 16, "Lenguajes Tecnológicos", "Aula 4", "Macedo"],
  ["3.3", "mañana", 1, "lunes", "7:30 a 9:30", 12, "Sistemas Tecnológicos", "Aula 8", "Farco"],
  ["3.3", "mañana", 2, "lunes", "9:40 a 11:40", 12, "Sistemas Tecnológicos", "Aula 8", "Goldy"],
  ["3.3", "mañana", 1, "miercoles", "7:10 a 9:10", 12, "Lenguajes Tecnológicos", "Aula 5", "Monje"],
  ["3.3", "mañana", 2, "miercoles", "9:20 a 11:20", 12, "Procedimientos Técnicos", "Taller", "Torres"],
  ["3.4", "tarde", 2, "miercoles", "15:10 a 17:10", 14, "Procedimientos Técnicos", "Taller", "De La Torre"],
  ["3.4", "tarde", 1, "jueves", "13 a 15", 14, "Sistemas Tecnológicos", "Taller", "Matamala"],
  ["3.5", "mañana", 1, "martes", "8:10 a 10:10", 15, "Lenguajes Tecnológicos", "Aula 8", "Guaymas"],
  ["3.5", "mañana", 2, "martes", "10:20 a 12:20", 15, "Sistemas Tecnológicos", "Taller", "Lopez"],
  ["3.5", "mañana", 1, "jueves", "7:10 a 9:10", 15, "Procedimientos Técnicos", "Taller", "De La Torre"],
  ["3.5", "mañana", 2, "jueves", "9:40 a 11:40", 15, "Sistemas Tecnológicos", "Taller", "Bordon"],
  ["3.6", "tarde", 1, "viernes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Matamala"],
  ["3.6", "tarde", 2, "viernes", "15:10 a 17:10", 16, "Lenguajes Tecnológicos", "Aula 5", "Luna"],
  ["3.7", "mañana", 1, "lunes", "7:30 a 9:30", 16, "Sistemas Tecnológicos", "Taller", "Luna"],
  ["3.7", "mañana", 2, "lunes", "9:40 a 11:40", 16, "Sistemas Tecnológicos", "Taller", "Luna"],
  ["3.7", "mañana", 1, "miercoles", "7:30 a 9:30", 16, "Procedimientos Técnicos", "Taller", "Goldy"],
  ["3.7", "mañana", 2, "miercoles", "9:40 a 11:40", 16, "Lenguajes Tecnológicos", "Aula 4", "Cuellar"],
  ["3.8", "tarde", 1, "lunes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Lopez"],
  ["3.8", "tarde", 2, "lunes", "15:10 a 17:10", 16, "Procedimientos Técnicos", "Taller", "Matamala"],
  ["3.8", "tarde", 1, "martes", "13 a 15", 16, "Sistemas Tecnológicos", "Taller", "Lopez"],
  ["3.8", "tarde", 1, "miercoles", "13:10 a 15:10", 16, "Lenguajes Tecnológicos", "SUM", "Gonzalez"],
  ["3.9", "mañana", 1, "martes", "7:30 a 9:30", 15, "Lenguajes Tecnológicos", "Aula 5", "Monje"],
  ["3.9", "mañana", 2, "martes", "9:40 a 11:40", 15, "Sistemas Tecnológicos", "Taller", "De La Torre"],
  ["3.9", "mañana", 1, "jueves", "7:30 a 9:30", 15, "Procedimientos Técnicos", "Taller", "Flores"],
  ["3.9", "mañana", 2, "jueves", "9:40 a 11:40", 15, "Sistemas Tecnológicos", "Taller", "Gonzalez"],
  ["3.11", "mañana", 1, "martes", "7:30 a 9:30", 16, "Procedimientos Técnicos", "Taller", "Flores"],
  ["3.11", "mañana", 2, "martes", "9:40 a 11:40", 16, "Sistemas Tecnológicos", "Taller", "Flores"],
  ["3.11", "mañana", 1, "jueves", "7:30 a 9:30", 16, "Lenguajes Tecnológicos", "Aula 4", "Zacarias"],
  ["3.11", "mañana", 2, "jueves", "9:40 a 11:40", 16, "Sistemas Tecnológicos", "Taller", "Araneda"],
  ["4.1", "mañana", 1, "lunes", "7:10 a 9:10", 16, "Laboratorio de Aplicaciones", "Aula 14", "Zacarias"],
  ["4.1", "mañana", 2, "lunes", "9:20 a 11:20", 16, "Laboratorio de Hardware", "Aula 14", "Callamullo"],
  ["4.1", "mañana", 1, "jueves", "7:10 a 9:10", 16, "Laboratorio de Sistemas Operativos", "Aula 11", "Berini"],
  ["4.1", "mañana", 2, "jueves", "9:20 a 11:20", 16, "Laboratorio de Hardware", "Aula 11", "Callamullo"],
  ["4.1", "mañana", 1, "viernes", "7:10 a 9:10", 16, "Laboratorio de Programación", "Aula 11", "Gonzalez"],
  ["4.1", "mañana", 2, "viernes", "9:20 a 11:20", 16, "Laboratorio de Sistemas Operativos", "Laboratorio", "Pavon"],
  ["4.2", "tarde", 1, "lunes", "13 a 15", 21, "Laboratorio de Hardware", "Taller", "Barja"],
  ["4.2", "tarde", 1, "miercoles", "13 a 15", 21, "Laboratorio de Aplicaciones", "Aula 4", "Zalazar"],
  ["4.2", "tarde", 2, "miercoles", "15:10 a 17:10", 21, "Laboratorio de Hardware", "SUM", "Barja"],
  ["4.2", "tarde", 1, "jueves", "13:30 a 15:30", 21, "Laboratorio de Programación", "Aula 4", "Avalos"],
  ["4.2", "tarde", 2, "jueves", "15:40 a 17:40", 21, "Laboratorio de Sistemas Operativos", "Aula 5", "Zalazar"],
  ["4.2", "tarde", 1, "viernes", "13 a 15", 21, "Laboratorio de Sistemas Operativos", "Aula 10", "Zalazar"],
  ["4.3", "mañana", 1, "lunes", "7:10 a 9:10", 16, "Laboratorio de Hardware", "Aula 4", "Grasso C."],
  ["4.3", "mañana", 2, "lunes", "9:20 a 11:20", 16, "Laboratorio de Sistemas Operativos", "Aula 4", "Vizcaino"],
  ["4.3", "mañana", 1, "martes", "8:10 a 10:10", 16, "Laboratorio de Hardware", "Aula 14", "Tanaglia"],
  ["4.3", "mañana", 2, "martes", "10:20 a 12:20", 16, "Laboratorio de Programación", "Aula 14", "Zacarias"],
  ["4.3", "mañana", 1, "jueves", "7:10 a 9:10", 16, "Laboratorio de Sistemas Operativos", "Aula 10", "Vizcaino"],
  ["4.3", "mañana", 2, "jueves", "9:20 a 11:20", 16, "Laboratorio de Aplicaciones", "Aula 10", "Rojas"],
  ["4.4", "tarde", 1, "lunes", "13 a 15", 17, "Laboratorio de Hardware", "Aula 17", "Bogado"],
  ["4.4", "tarde", 2, "lunes", "15:10 a 17:10", 17, "Laboratorio de Hardware", "Taller", "Berini"],
  ["4.4", "tarde", 1, "martes", "13 a 15", 17, "Laboratorio de Programación", "Aula 10", "Cruz"],
  ["4.4", "tarde", 2, "martes", "15:10 a 17:10", 17, "Laboratorio de Sistemas Operativos", "Aula 10", "Rojas"],
  ["4.4", "tarde", 1, "miercoles", "13:30 a 15:30", 17, "Laboratorio de Sistemas Operativos", "Aula 11", "Correia"],
  ["4.4", "tarde", 2, "miercoles", "15:40 a 17:40", 17, "Laboratorio de Aplicaciones", "Aula 11", "Zalazar"],
  ["4.5", "mañana", 1, "martes", "7:10 a 9:10", 18, "Laboratorio de Aplicaciones", "Aula 11", "Lazarte"],
  ["4.5", "mañana", 2, "martes", "9:20 a 11:20", 19, "Laboratorio de Programación", "Aula 11", "Cruz"],
  ["4.5", "mañana", 1, "miercoles", "7:10 a 9:10", 18, "Laboratorio de Sistemas Operativos", "Aula 14", "Callamullo"],
  ["4.5", "mañana", 2, "miercoles", "9:20 a 11:20", 18, "Laboratorio de Sistemas Operativos", "Aula 14", "Berini"],
  ["4.5", "mañana", 1, "jueves", "7:10 a 9:10", 18, "Laboratorio de Hardware", "Aula 14", "Grasso C."],
  ["4.5", "mañana", 2, "jueves", "9:20 a 11:20", 18, "Laboratorio de Hardware", "Laboratorio", "Grasso E."],
  ["4.6", "tarde", 1, "lunes", "13 a 15", 17, "Laboratorio de Sistemas Operativos", "SUM", "Ferraro"],
  ["4.6", "tarde", 2, "lunes", "15:10 a 17:10", 17, "Laboratorio de Hardware", "Aula 17", "Bogado"],
  ["4.6", "tarde", 1, "martes", "13:30 a 15:30", 17, "Laboratorio de Aplicaciones", "Aula 17", "Correia"],
  ["4.6", "tarde", 2, "martes", "15:40 a 17:40", 17, "Laboratorio de Hardware", "Aula 17", "Correia"],
  ["4.6", "tarde", 1, "miercoles", "13:30 a 15:30", 17, "Laboratorio de Sistemas Operativos", "Aula 17", "Sanchez"],
  ["4.6", "tarde", 2, "miercoles", "15:40 a 17:40", 17, "Laboratorio de Programación", "Aula 17", "Gareis"],
  ["4.7", "mañana", 2, "lunes", "9:40 a 11:40", 17, "Laboratorio de Hardware", "Aula 5", "Zacarias"],
  ["4.7", "mañana", 1, "martes", "7:10 a 9:10", 17, "Laboratorio de Hardware", "SUM", "Gonzalez"],
  ["4.7", "mañana", 2, "martes", "9:40 a 11:40", 17, "Laboratorio de Sistemas Operativos", "SUM", "Ferraro"],
  ["4.7", "mañana", 1, "miercoles", "7:10 a 9:10", 17, "Laboratorio de Aplicaciones", "SUM", "Ferraro"],
  ["4.7", "mañana", 2, "miercoles", "9:20 a 11:20", 17, "Laboratorio de Sistemas Operativos", "SUM", "Gonzalez"],
  ["4.8", "tarde", 1, "martes", "13 a 15", 24, "Laboratorio de Sistemas Operativos", "SUM", "Castillo"],
  ["4.8", "tarde", 2, "martes", "15:10 a 17:10", 24, "Laboratorio de Hardware", "SUM", "Vizcaino"],
  ["4.8", "tarde", 1, "miercoles", "13:30 a 15:30", 24, "Laboratorio de Hardware", "SUM", "Fresta"],
  ["4.8", "tarde", 2, "miercoles", "15:40 a 17:40", 24, "Laboratorio de Programación", "SUM", "Vizcaino"],
  ["4.8", "tarde", 1, "jueves", "13 a 15", 24, "Laboratorio de Sistemas Operativos", "Aula 5", "Castillo"],
  ["4.8", "tarde", 2, "jueves", "15:10 a 17:10", 24, "Laboratorio de Aplicaciones", "Aula 17", "Berini"],
  ["5.1", "mañana", 1, "martes", "7:10 a 9:10", 7, "Laboratorio de Aplicaciones", "Aula 10", "Zacarias"],
  ["5.1", "mañana", 2, "martes", "9:20 a 11:20", 16, "Laboratorio de Hardware", "Aula 10", "Gonzalez"],
  ["5.1", "mañana", 1, "miercoles", "7:10 a 9:10", 7, "Laboratorio de Sistemas Operativos", "Aula 11", "Gonzalez"],
  ["5.1", "mañana", 2, "miercoles", "9:20 a 11:20", 16, "Laboratorio de Programación", "Laboratorio", "Bogado"],
  ["5.1", "mañana", 1, "viernes", "7:10 a 9:10", 7, "Laboratorio de Hardware", "Aula 4", "Domato"],
  ["5.2", "tarde", 1, "lunes", "13 a 15", 14, "Laboratorio de Redes Informáticas", "Aula 4", "Zalazar"],
  ["5.2", "tarde", 1, "martes", "13 a 15", 14, "Laboratorio de Diseño Web", "Aula 4", "Zalazar"],
  ["5.2", "tarde", 2, "martes", "15:10 a 17:10", 16, "Laboratorio de Diseño de Base de Datos", "Aula 11", "Gonzalez"],
  ["5.2", "tarde", 1, "jueves", "13:30 a 15:30", 14, "Laboratorio de Programación", "Aula 11", "Aragon"],
  ["5.2", "tarde", 1, "viernes", "13:30 a 15:30", 14, "Laboratorio de Programación", "Aula 5", "Aragon"],
  ["5.2", "tarde", 2, "viernes", "15:10 a 17:10", 14, "Laboratorio de Redes Informáticas", "Aula 4", "Zalazar"],
  ["5.3", "mañana", 1, "miercoles", "7:10 a 9:10", 16, "Laboratorio de Programación", "Aula 10", "Vizcaino"],
  ["5.3", "mañana", 2, "miercoles", "9:20 a 11:20", 16, "Laboratorio de Hardware", "SUM", "Vizcaino"],
  ["5.3", "mañana", 1, "jueves", "7:10 a 9:10", 16, "Laboratorio de Sistemas Operativos", "Aula 10", "Zanetti"],
  ["5.3", "mañana", 2, "jueves", "9:20 a 11:20", 16, "Laboratorio de Hardware", "Aula 14", "Vizcaino"],
  ["5.3", "mañana", 1, "viernes", "7:10 a 9:10", 16, "Laboratorio de Aplicaciones", "Aula 5", "Rojas"],
  ["5.3", "mañana", 2, "viernes", "9:20 a 11:20", 16, "Laboratorio de Sistemas Operativos", "Aula 5", "Domato"],
  ["5.4", "tarde", 1, "martes", "13 a 15", 17, "Laboratorio de Hardware", "Aula 5", "Gonzalez"],
  ["5.4", "tarde", 2, "martes", "15:10 a 17:10", 17, "Laboratorio de Aplicaciones", "Aula 11", "Cruz"],
  ["5.4", "tarde", 1, "jueves", "13:30 a 15:30", 17, "Laboratorio de Sistemas Operativos", "Aula 11", "Cruz"],
  ["5.4", "tarde", 2, "jueves", "15:40 a 17:40", 17, "Laboratorio de Sistemas Operativos", "Aula 11", "Aragon"],
  ["5.4", "tarde", 1, "viernes", "13:30 a 15:30", 17, "Laboratorio de Programación", "Aula 11", "Gareis"],
  ["5.4", "tarde", 2, "viernes", "15:40 a 17:40", 17, "Laboratorio de Hardware", "Aula 11", "Vizcaino"],
  ["5.5", "mañana", 1, "lunes", "7:10 a 9:10", 18, "Laboratorio de Programación", "Aula 11", "Callamullo"],
  ["5.5", "mañana", 2, "lunes", "9:20 a 11:20", 13, "Laboratorio de Redes Informáticas", "Aula 11", "Cruz"],
  ["5.5", "mañana", 1, "miercoles", "7:10 a 9:10", 13, "Laboratorio de Redes Informáticas", "Aula 11", "Cruz"],
  ["5.5", "mañana", 2, "miercoles", "9:20 a 11:20", 13, "Laboratorio de Programación", "Aula 11", "Callamullo"],
  ["5.5", "mañana", 1, "viernes", "7:10 a 9:10", 13, "Laboratorio de Diseño Web", "Aula 14", "Correia"],
  ["5.5", "mañana", 2, "viernes", "9:20 a 11:20", 13, "Laboratorio de Diseño de Base de Datos", "Aula 14", "Avalos"],
  ["5.6", "tarde", 1, "lunes", "11:50 a 12:50", 17, "Laboratorio de Redes Informáticas", "Aula 10", "Gonzalez"],
  ["5.6", "tarde", 1, "lunes", "13:30 a 15:30", 19, "Laboratorio de Programación", "Aula 11", "Avalos"],
  ["5.6", "tarde", 2, "lunes", "15:40 a 17:40", 17, "Laboratorio de Diseño Web", "Aula 11", "Palma"],
  ["5.6", "tarde", 1, "martes", "13 a 15", 17, "Laboratorio de Redes Informáticas", "Laboratorio", "Vizcaino"],
  ["5.6", "tarde", 1, "miercoles", "11:50 a 12:50", 17, "Laboratorio de Redes Informáticas", "Aula 11", "Gonzalez"],
  ["5.6", "tarde", 1, "jueves", "13 a 15", 17, "Laboratorio de Programación", "Aula 10", "Gareis"],
  ["5.6", "tarde", 2, "jueves", "15:10 a 17:10", 17, "Laboratorio de Diseño de Base de Datos", "Aula 10", "Castillo"],
  ["5.7", "mañana", 1, "lunes", "7:10 a 9:10", 17, "Laboratorio de Redes Informáticas", "Aula 10", "Bogado"],
  ["5.7", "mañana", 2, "lunes", "9:20 a 11:20", 17, "Laboratorio de Diseño Web", "Aula 10", "Gonzalez"],
  ["5.7", "mañana", 1, "miercoles", "7:10 a 9:10", 17, "Laboratorio de Redes Informáticas", "Laboratorio", "Bogado"],
  ["5.7", "mañana", 2, "miercoles", "9:20 a 11:20", 12, "Laboratorio de Programación", "Aula 10", "Palma"],
  ["5.7", "mañana", 1, "viernes", "7:10 a 9:10", 17, "Laboratorio de Diseño de Base de Datos", "Aula 11", "Avalos"],
  ["5.8", "tarde", 1, "lunes", "11:50 a 12:50", 17, "Laboratorio de Sistemas Operativos", "Aula 11", "Sanchez"],
  ["5.8", "tarde", 1, "lunes", "13:30 a 15:30", 17, "Laboratorio de Aplicaciones", "SUM", "Palma"],
  ["5.8", "tarde", 2, "lunes", "15:40 a 17:40", 17, "Laboratorio de Hardware", "Aula 11", "Cruz"],
  ["5.8", "tarde", 1, "miercoles", "13 a 15", 17, "Laboratorio de Hardware", "Aula 10", "Avalos"],
  ["5.8", "tarde", 1, "jueves", "13:30 a 15:30", 17, "Laboratorio de Sistemas Operativos", "Aula 10", "Juarez"],
  ["5.8", "tarde", 2, "jueves", "15:40 a 17:40", 17, "Laboratorio de Programación", "Aula 10", "Vizcaino"],
  ["5.8", "tarde", 1, "viernes", "11:50 a 12:50", 17, "Laboratorio de Sistemas Operativos", "Aula 17", "Sanchez"],
  ["6.1", "mañana", 1, "lunes", "7:10 a 9:10", 10, "Laboratorio de Aplicaciones Web Estáticas", "Aula 5", "Vizcaino"],
  ["6.1", "mañana", 2, "lunes", "9:20 a 11:20", 10, "Desarrollo de Aplicaciones Web Dinámicas", "Aula 11", "Correia"],
  ["6.1", "mañana", 1, "martes", "7:10 a 9:10", 10, "Laboratorio de Programación", "Aula 10", "Bogado"],
  ["6.1", "mañana", 2, "martes", "9:20 a 11:20", 10, "Laboratorio de Procesos Industriales", "Aula 10", "Avalos"],
  ["6.1", "mañana", 1, "viernes", "7:10 a 9:10", 10, "Laboratorio de Programación", "Aula 10", "Bogado"],
  ["6.1", "mañana", 2, "viernes", "9:20 a 11:20", 10, "Desarrollo de Aplicaciones Web Dinámicas", "Aula 10", "Correia"],
  ["6.2", "tarde", 1, "lunes", "13:30 a 15:30", 15, "Laboratorio de Hardware", "Aula 10", "Juarez"],
  ["6.2", "tarde", 2, "lunes", "15:40 a 17:40", 15, "Laboratorio de Programación", "Aula 10", "Avalos"],
  ["6.2", "tarde", 1, "miercoles", "13 a 15", 15, "Laboratorio de Sistemas Operativos", "Aula 11", "Vizcaino"],
  ["6.2", "tarde", 2, "miercoles", "15:10 a 17:10", 15, "Laboratorio de Sistemas Operativos", "Aula 11", "Gonzalez"],
  ["6.2", "tarde", 2, "jueves", "15:40 a 17:40", 15, "Laboratorio de Hardware", "SUM", "Juarez"],
  ["6.2", "tarde", 2, "viernes", "15:10 a 17:10", 15, "Laboratorio de Aplicaciones", "Aula 10", "Berini"],
  ["6.3", "mañana", 1, "lunes", "7:10 a 9:10", 9, "Diseño Web Estáticas", "Biblioteca", "Palma"],
  ["6.3", "mañana", 2, "lunes", "9:20 a 11:20", 9, "Desarrollo de Aplicaciones Web Dinámicas", "Biblioteca", "Bogado"],
  ["6.3", "mañana", 1, "martes", "7:10 a 9:10", 9, "Laboratorio de Programación", "SUM", "Ferraro"],
  ["6.3", "mañana", 2, "martes", "9:20 a 11:20", 9, "Laboratorio de Procesos Industriales", "Biblioteca", "Pavon"],
  ["6.3", "mañana", 1, "viernes", "7:10 a 9:10", 9, "Laboratorio de Programación", "Aula 8", "Ferraro"],
  ["6.3", "mañana", 2, "viernes", "9:20 a 11:20", 9, "Desarrollo de Aplicaciones Web Dinámicas", "Aula 8", "Bogado"],
  ["6.4", "tarde", 1, "lunes", "11:50 a 12:50", 17, "Laboratorio de Aplicaciones Web Estáticas", "Aula 10", "Ferraro"],
  ["6.4", "tarde", 1, "martes", "13 a 15", 17, "Desarrollo de Aplicaciones Web Dinámicas", "Aula 10", "Juarez"],
  ["6.4", "tarde", 2, "martes", "15:10 a 17:10", 17, "Laboratorio de Programación", "Aula 10", "Bogado"],
  ["6.4", "tarde", 1, "miercoles", "11:50 a 12:50", 17, "Laboratorio de Aplicaciones Web Estáticas", "Aula 10", "Ferraro"],
  ["6.4", "tarde", 1, "miercoles", "13 a 15", 17, "Desarrollo de Aplicaciones Web Dinámicas", "Aula 10", "Juarez"],
  ["6.4", "tarde", 2, "miercoles", "15:10 a 17:10", 17, "Laboratorio de Programación", "Aula 10", "Bogado"],
  ["6.4", "tarde", 1, "jueves", "13:30 a 15:30", 17, "Laboratorio de Procesos Industriales", "Aula 17", "Danzi"],
  ["6.6", "tarde", 2, "lunes", "15:40 a 17:40", 15, "Laboratorio de Sistemas Operativos", "Aula 5", "Ferraro"],
  ["6.6", "tarde", 1, "martes", "13:30 a 15:30", 15, "Laboratorio de Programación", "Biblioteca", "Aragon"],
  ["6.6", "tarde", 2, "martes", "15:40 a 17:40", 15, "Laboratorio de Sistemas Operativos", "Biblioteca", "Ferraro"],
  ["6.6", "tarde", 2, "jueves", "15:40 a 17:40", 15, "Laboratorio de Hardware", "SUM", "Cruz"],
  ["6.6", "tarde", 1, "viernes", "13:30 a 15:30", 15, "Laboratorio de Aplicaciones", "Aula 17", "Sanchez"],
  ["6.6", "tarde", 2, "viernes", "15:40 a 17:40", 15, "Laboratorio de Hardware", "Aula 17", "Ferraro"],
  ["6.8", "tarde", 1, "lunes", "13 a 15", 12, "Laboratorio de Programación", "Laboratorio", "Gareis"],
  ["6.8", "tarde", 2, "lunes", "15:10 a 17:10", 12, "Desarrollo de Aplicaciones Web Dinámicas", "Laboratorio", "Gareis"],
  ["6.8", "tarde", 1, "martes", "13 a 15", 12, "Laboratorio de Programación", "Aula 11", "Gareis"],
  ["6.8", "tarde", 2, "martes", "15:10 a 17:10", 12, "Desarrollo de Aplicaciones Web Dinámicas", "SUM", "Gareis"],
  ["6.8", "tarde", 2, "miercoles", "15:40 a 17:40", 12, "Laboratorio de Procesos Industriales", "Laboratorio", ""],
  ["7.1", "mañana", 1, "lunes", "7:30 a 9:30", 24, "IMRSC", "Aula 9", "Gareis"],
  ["7.1", "mañana", 1, "martes", "7:30 a 9:30", 24, "P.D.I.S.C.", "Aula 9", "Gareis"],
  ["7.1", "mañana", 2, "martes", "9:40 a 11:40", 16, "P.D.I.S.C.", "Aula 9", "Gareis"],
  ["7.1", "mañana", 2, "miercoles", "11:10 a 13:10", 24, "IMRRI", "Aula 9", "Correia"],
  ["7.1", "mañana", 1, "jueves", "7:30 a 9:30", 24, "IMRRI", "Laboratorio", "Correia"],
  ["7.1", "mañana", 2, "jueves", "11:50 a 12:50", 16, "IMRRI", "Aula 9", "Correia"],
  ["7.1", "mañana", 1, "viernes", "7:30 a 9:30", 24, "P.D.I.S.C.", "Aula 9", "Gareis"],
  ["7.2", "tarde", 1, "lunes", "13 a 16", null, "Prácticas Profesionalizantes", "", "Danzi Cecilia"],
  ["7.2", "tarde", 2, "martes", "16:10 a 18:20", 21, "PISWD", "Laboratorio", "Callamullo"],
  ["7.2", "tarde", 2, "miercoles", "15:10 a 17:10", 21, "PISWD", "Aula 9", "Callamullo"],
  ["7.2", "tarde", 1, "jueves", "13 a 16", null, "Prácticas Profesionalizantes", "", "Danzi Cecilia"],
  ["7.2", "tarde", 2, "jueves", "15:10 a 17:10", 21, "PDSPM", "Laboratorio", "Gonzalez"],
  ["7.2", "tarde", 1, "viernes", "13 a 15", 21, "P.D.I.S.C.", "Laboratorio", "Gonzalez"],
  ["7.3", "mañana", 1, "lunes", "7:30 a 9:30", 17, "IMRSC", "Laboratorio", ""],
  ["7.3", "mañana", 2, "lunes", "10 a 12", null, "Prácticas Profesionalizantes", "", "Danzi Cecilia"],
  ["7.3", "mañana", 1, "martes", "8:30 a 11:40", 17, "IMRRI", "Laboratorio", "Correia"],
  ["7.3", "mañana", 2, "martes", "11:40 a 12:40", 17, "P.D.I.S.C.", "Laboratorio", "Gonzalez"],
  ["7.3", "mañana", 1, "jueves", "7:30 a 9:30", 18, "P.D.I.S.C.", "Aula 9", "Gonzalez"],
  ["7.3", "mañana", 1, "jueves", "8 a 12", null, "Prácticas Profesionalizantes", "", "Danzi Cecilia"],
  ["7.3", "mañana", 1, "viernes", "7:30 a 9:30", 12, "IMRSC", "Laboratorio", ""],
  ["7.3", "mañana", 2, "viernes", "11:40 a 12:40", 17, "P.D.I.S.C.", "Aula 9", "Gonzalez"],
  ["7.4", "tarde", 2, "martes", "16:10 a 18:20", 26, "PDSPM", "Aula 9", "Avalos"],
  ["7.4", "tarde", 1, "jueves", "12:20 a 13:30", 30, "PDSPM", "Aula 9", "Avalos"],
  ["7.4", "tarde", 1, "viernes", "12:20 a 13:30", 30, "PDSPM", "Aula 9", "Avalos"],
  ["7.4", "tarde", 1, "viernes", "13:30 a 15:30", 30, "PISWD", "Aula 9", "Callamullo"],
  ["7.4", "tarde", 2, "viernes", "15:40 a 17:40", 30, "P.D.I.S.C.", "Aula 9", "Gareis"],
  ["7.6", "mañana", 1, "martes", "7:30 a 9:30", 11, "PISWD", "Aula 17", "Callamullo"],
  ["7.6", "tarde", 1, "martes", "13 a 16", null, "Prácticas Profesionalizantes", "", "Selva Goldy"],
  ["7.6", "mañana", 1, "miercoles", "7:30 a 9:30", 11, "P.D.I.S.C.", "Aula 17", "Aragon"],
  ["7.6", "mañana", 2, "miercoles", "9:40 a 11:40", 11, "PDSPM", "Aula 17", "Gareis"],
  ["7.6", "mañana", 1, "jueves", "7:30 a 9:30", 11, "P.D.I.S.C.", "Aula 17", "Aragon"],
  ["7.6", "tarde", 2, "jueves", "13 a 16", null, "Prácticas Profesionalizantes", "", "Selva Goldy"],
  ["7.6", "mañana", 1, "viernes", "7:30 a 9:30", 11, "PISWD", "Aula 17", "Callamullo"],
  ["7.8", "tarde", 1, "lunes", "12:30 a 16:30", null, "Prácticas Profesionalizantes", "", "Aragon Lautaro"],
  ["7.8", "mañana", 1, "martes", "7:30 a 9:30", 11, "DISWD", "Biblioteca", "Aragon"],
  ["7.8", "mañana", 1, "miercoles", "7:30 a 9:30", 11, "P.D.I.S.C.", "Biblioteca", "Gareis"],
  ["7.8", "mañana", 2, "miercoles", "9:40 a 11:40", 11, "PDSPM", "Biblioteca", "Aragon"],
  ["7.8", "tarde", 2, "miercoles", "15:10 a 17:10", null, "Prácticas Profesionalizantes", "", "Aragon Lautaro"],
  ["7.8", "mañana", 1, "jueves", "7:30 a 9:30", 11, "P.D.I.S.C.", "Biblioteca", "Gareis"],
  ["7.8", "mañana", 1, "viernes", "7:30 a 9:30", 11, "PISWD", "Biblioteca", "Aragon"],
];

export const DIAS_TALLER = ["lunes", "martes", "miercoles", "jueves", "viernes"];

export const ETIQUETA_DIA = {
  lunes: "Lunes",
  martes: "Martes",
  miercoles: "Miércoles",
  jueves: "Jueves",
  viernes: "Viernes"
};

export const CRONOGRAMA = FILAS.map(([grupo, turno, franja, dia, horario, alumnos, taller, aula, docente]) => {
  const [anio, numero] = grupo.split(".").map(Number);
  return { grupo, anio, numero, turno, franja, dia, horario, alumnos, taller, aula, docente };
});

/* Ciclo Basico: 1° a 3°. Ciclo Superior: 4° a 7°. */
export function cicloDeAnio(anio) {
  return Number(anio) <= 3 ? "basico" : "superior";
}

export const ETIQUETA_CICLO = { basico: "Ciclo Básico", superior: "Ciclo Superior" };

export function gruposDeAnio(anio) {
  return [...new Set(CRONOGRAMA.filter((fila) => fila.anio === Number(anio)).map((fila) => fila.numero))].sort((a, b) => a - b);
}

export function sesionesDeGrupo(grupo) {
  return CRONOGRAMA.filter((fila) => fila.grupo === grupo);
}

/* Divisiones del catalogo que la escuela no usa: no se listan ni se cuentan. */
export const DIVISIONES_OCULTAS = new Set(["7-4"]);

export function divisionesVisibles(divisiones = []) {
  return divisiones.filter((division) => !DIVISIONES_OCULTAS.has(`${division.anio}-${division.division}`));
}

/* Excepciones a la regla de abajo, indicadas por la jefatura: 7°3 tiene los
   grupos 7.6 y 7.8 (la planilla no tiene 7.5 ni 7.7). */
const GRUPOS_FIJOS = {
  "7-3": ["7.6", "7.8"]
};

/* Grupos de taller de cada division de un anio.

   Las divisiones del anio se ordenan y se agrupan de a dos: la primera de cada
   par toma los grupos impares del bloque (1°1 -> 1.1 y 1.3) y la segunda los
   pares (1°2 -> 1.2 y 1.4); el siguiente par sigue en 1.5/1.7 y 1.6/1.8. Los
   numeros de grupo que no existen en la planilla (ej. 1.10) quedan sin cronograma. */
export function gruposDeDivision(anio, division, divisionesDelAnio) {
  const fijos = GRUPOS_FIJOS[`${anio}-${division}`];
  if (fijos) return [...fijos];
  const orden = [...new Set((divisionesDelAnio ?? []).map(String))].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  const posicion = orden.indexOf(String(division));
  if (posicion < 0) return [];
  const base = Math.floor(posicion / 2) * 4;
  const desplazamiento = posicion % 2 === 0 ? 1 : 2;
  return [base + desplazamiento, base + desplazamiento + 2].map((numero) => `${anio}.${numero}`);
}
