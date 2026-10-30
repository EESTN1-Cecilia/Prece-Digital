import bcrypt from "bcryptjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { userRepository } from "../repositories/user.repository.mjs";
import { DIVISIONES_CATALOGO } from "../../modules/students/catalogo.mjs";

/* Cursos que la Direccion asigno a cada preceptor de desarrollo. Un curso tiene
   un solo preceptor y el resto queda "sin asignar" hasta que la Direccion lo
   asigne desde su panel: el preceptor solo ve lo asignado. */
const CURSOS_PRECEPTOR_1 = ["1-1"];
const CURSOS_PRECEPTOR_2 = ["2-2", "5-3"];
const cursosDe = (filtro) =>
  DIVISIONES_CATALOGO.filter(({ anio, division }) => filtro(`${anio}-${division}`)).map(({ anio, division }) => ({ curso: anio, division, actualizadoEn: "2026-03-02" }));

const passwordHashCache = new Map();

async function hashPassword(plain) {
  if (passwordHashCache.has(plain)) {
    return passwordHashCache.get(plain);
  }

  const hash = await bcrypt.hash(plain, 10);
  passwordHashCache.set(plain, hash);
  return hash;
}

export async function seedAuthData() {
  if (userRepository.list({ includeInactive: true }).length > 0) {
    return;
  }

  const [adminHash, directorHash, docenteHash, preceptorHash, inactiveHash, jefeAreaHash, serverHash, secretarioHash] = await Promise.all([
    hashPassword("Admin123!"),
    hashPassword("Director123!"),
    hashPassword("Docente123!"),
    hashPassword("Preceptor123!"),
    hashPassword("Inactivo123!"),
    hashPassword("JefeArea123!"),
    hashPassword("Server123!"),
    hashPassword("Secretaria123!")
  ]);

  userRepository.create({
    email: "admin@prece.local",
    passwordHash: adminHash,
    displayName: "Administrador",
    assignments: [{ role: ROLES.ADMIN }]
  });

  userRepository.create({
    email: "director@prece.local",
    passwordHash: directorHash,
    displayName: "Director Escuela 1",
    assignments: [{ role: ROLES.DIRECTOR, schoolId: "esc-1" }]
  });

  userRepository.create({
    email: "docente@prece.local",
    passwordHash: docenteHash,
    displayName: "Prof. María Villatoro",
    nombre: "María",
    apellido: "Villatoro",
    assignments: [
      {
        role: ROLES.DOCENTE,
        schoolId: "esc-1",
        courseId: "cur-1",
        divisionId: "div-1",
        anio: 1,
        curso: "1°",
        division: "1",
        materia: "Matemática I",
        shiftId: "manana",
        periodId: "2026"
      },
      {
        role: ROLES.DOCENTE,
        schoolId: "esc-1",
        courseId: "cur-3",
        divisionId: "div-6",
        anio: 2,
        curso: "2°",
        division: "1",
        materia: "Matemática II",
        shiftId: "manana",
        periodId: "2026"
      },
      {
        role: ROLES.DOCENTE,
        schoolId: "esc-1",
        courseId: "3-3",
        divisionId: "div-7",
        anio: 3,
        curso: "3°",
        division: "3",
        materia: "Matemática III",
        shiftId: "tarde",
        periodId: "2026"
      }
    ]
  });

  userRepository.create({
    email: "preceptor@prece.local",
    passwordHash: preceptorHash,
    displayName: "Preceptor 1° A",
    assignments: [
      {
        role: ROLES.PRECEPTOR,
        schoolId: "esc-1",
        courseId: "cur-1",
        divisionId: "div-a",
        shiftId: "manana",
        periodId: "2026",
        /* Cursos que le asigno la Direccion (alcance real del preceptor). */
        cursos: cursosDe((clave) => CURSOS_PRECEPTOR_1.includes(clave))
      }
    ]
  });

  userRepository.create({
    email: "inactivo@prece.local",
    passwordHash: inactiveHash,
    displayName: "Cuenta desactivada",
    assignments: [{ role: ROLES.DOCENTE, schoolId: "esc-1" }],
    isActive: false,
    deactivatedAt: new Date().toISOString()
  });

  userRepository.create({
    email: "jefearea@prece.local",
    passwordHash: jefeAreaHash,
    displayName: "Jefe de Área",
    assignments: [{ role: ROLES.JEFE_AREA, schoolId: "esc-1" }]
  });

  userRepository.create({
    email: "server@prece.local",
    passwordHash: serverHash,
    displayName: "Server",
    assignments: [{ role: ROLES.SERVER, schoolId: "esc-1" }]
  });

  userRepository.create({
    email: "secretaria@prece.local",
    passwordHash: secretarioHash,
    displayName: "Secretaría",
    assignments: [{ role: ROLES.SECRETARIO, schoolId: "esc-1" }]
  });

  userRepository.create({
    email: "secretario@prece.local",
    passwordHash: secretarioHash,
    displayName: "Secretaría General",
    assignments: [{ role: ROLES.SECRETARIO, schoolId: "esc-1" }]
  });

  userRepository.create({
    email: "cramos@prece.local",
    passwordHash: preceptorHash,
    displayName: "Carlos Ramos",
    nombre: "Carlos",
    apellido: "Ramos",
    assignments: [{ role: ROLES.PRECEPTOR, schoolId: "esc-1", cursos: cursosDe((clave) => CURSOS_PRECEPTOR_2.includes(clave)) }]
  });
}
