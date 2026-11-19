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

/* Produccion nunca recibe los usuarios de desarrollo, cuyas contrasenias estan en
   este archivo: solo un administrador inicial definido por variables de entorno. */
export async function seedProductionAdmin({ email = process.env.BOOTSTRAP_ADMIN_EMAIL, password = process.env.BOOTSTRAP_ADMIN_PASSWORD } = {}) {
  if (userRepository.list({ includeInactive: true }).length > 0) {
    return;
  }

  if (!email || !password || password.length < 12) {
    throw new Error("En produccion BOOTSTRAP_ADMIN_EMAIL y BOOTSTRAP_ADMIN_PASSWORD (12 caracteres o mas) son obligatorios");
  }

  userRepository.create({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    displayName: "Administrador",
    assignments: [{ role: ROLES.ADMIN }]
  });
}

/* Perfil SuperAdmin: se crea (o se actualiza) al iniciar la API a partir de las
   variables SUPERADMIN_USER y SUPERADMIN_PASSWORD. La clave nunca esta en el
   codigo. Sin SUPERADMIN_PASSWORD no se crea nada. Tiene los permisos de Direccion
   (rol director) mas la gestion de credenciales (rol superadmin). */
export async function seedSuperAdmin({ usuario = process.env.SUPERADMIN_USER || "SuperAdmin", password = process.env.SUPERADMIN_PASSWORD } = {}) {
  if (!password) {
    return false;
  }

  if (password.length < 12) {
    throw new Error("SUPERADMIN_PASSWORD debe tener 12 caracteres o mas");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existente = userRepository.findByEmail(usuario, { includeInactive: true });

  if (existente) {
    userRepository.update(existente.id, {
      passwordHash,
      isActive: true,
      deactivatedAt: null,
      mustChangePassword: false,
      passwordChangedAt: new Date().toISOString(),
      assignments: [{ role: ROLES.SUPERADMIN }, { role: ROLES.DIRECTOR, schoolId: "esc-1" }]
    });
    return true;
  }

  userRepository.create({
    email: usuario,
    passwordHash,
    displayName: "Super Administrador",
    assignments: [{ role: ROLES.SUPERADMIN }, { role: ROLES.DIRECTOR, schoolId: "esc-1" }]
  });
  return true;
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
