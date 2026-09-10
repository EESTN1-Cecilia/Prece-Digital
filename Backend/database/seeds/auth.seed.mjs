import bcrypt from "bcryptjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { userRepository } from "../repositories/user.repository.mjs";

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

  const [adminHash, directorHash, docenteHash, preceptorHash, inactiveHash, jefeAreaHash, serverHash] = await Promise.all([
    hashPassword("Admin123!"),
    hashPassword("Director123!"),
    hashPassword("Docente123!"),
    hashPassword("Preceptor123!"),
    hashPassword("Inactivo123!"),
    hashPassword("JefeArea123!"),
    hashPassword("Server123!")
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
    displayName: "Docente Matemática",
    assignments: [
      {
        role: ROLES.DOCENTE,
        schoolId: "esc-1",
        courseId: "cur-1",
        divisionId: "div-a",
        subjectId: "mat",
        shiftId: "manana",
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
        periodId: "2026"
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
}
