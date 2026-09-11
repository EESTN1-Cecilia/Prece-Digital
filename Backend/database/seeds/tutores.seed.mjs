import studentsRefRepository from "../../modules/tutors/students-refs.repository.mjs";
import tutorsRepository from "../../modules/tutors/tutors.repository.mjs";

/* Alumnos de referencia (registro minimo del legajo) usado para validar que las
   relaciones tutor/alumno apuntan a alumnos existentes. */
const ALUMNOS_REFERENCIA = [
  { id: "alu-1", escuelaId: "esc-1", apellido: "Pérez López", nombre: "Ana", dni: "40123456" },
  { id: "alu-2", escuelaId: "esc-1", apellido: "Pérez López", nombre: "Bruno", dni: "41234567" },
  { id: "alu-3", escuelaId: "esc-1", apellido: "Gómez Ruiz", nombre: "Carla", dni: "42345678" },
  { id: "alu-4", escuelaId: "esc-1", apellido: "Fernández Díaz", nombre: "Diego", dni: "43456789" },
  { id: "alu-5", escuelaId: "esc-1", apellido: "Álvarez Castro", nombre: "Elena", dni: "44567890" }
];

const TUTORES = [
  {
    id: "tut-1",
    apellido: "Pérez",
    nombre: "Rosana",
    dni: "20111222",
    email: "rosana.perez@mail.com",
    telefono: "11-5555-0101",
    direccion: "Av. Siempre Viva 742",
    escuelaId: "esc-1"
  },
  {
    id: "tut-2",
    apellido: "Pérez",
    nombre: "Héctor",
    dni: "18111222",
    email: "hector.perez@mail.com",
    telefono: "11-5555-0102",
    direccion: "Av. Siempre Viva 742",
    escuelaId: "esc-1"
  },
  {
    id: "tut-3",
    apellido: "Gómez",
    nombre: "Silvia",
    dni: "20123456",
    email: "silvia.gomez@mail.com",
    telefono: "11-5555-0201",
    direccion: "Calle Falsa 123",
    escuelaId: "esc-1"
  },
  {
    id: "tut-4",
    apellido: "Ruiz",
    nombre: "Griselda",
    dni: "19112233",
    email: "griselda.ruiz@mail.com",
    telefono: "11-5555-0202",
    direccion: "Calle Falsa 123",
    escuelaId: "esc-1"
  },
  {
    id: "tut-5",
    apellido: "Álvarez",
    nombre: "Inés",
    dni: "17123456",
    email: "ines.alvarez@mail.com",
    telefono: "11-5555-0301",
    direccion: "Belgrano 900",
    escuelaId: "esc-1"
  },
  {
    id: "tut-6",
    apellido: "Castro",
    nombre: "Jorge",
    dni: "15234567",
    email: "jorge.castro@mail.com",
    telefono: "11-5555-0302",
    direccion: "Belgrano 900",
    escuelaId: "esc-1"
  },
  {
    id: "tut-7",
    apellido: "Noriega",
    nombre: "Roberto",
    dni: "20222333",
    email: "roberto.noriega@mail.com",
    telefono: "11-5555-0401",
    direccion: "Urquiza 1100",
    escuelaId: "esc-1",
    isActive: false,
    fechaBaja: "2025-10-01T00:00:00.000Z"
  }
];

const RELACIONES = [
  { id: "rel-1", studentId: "alu-1", tutorId: "tut-1", parentesco: "madre", responsablePrincipal: true, autorizadoRetiro: true },
  { id: "rel-2", studentId: "alu-1", tutorId: "tut-2", parentesco: "padre", responsablePrincipal: false, autorizadoRetiro: false },
  { id: "rel-3", studentId: "alu-2", tutorId: "tut-1", parentesco: "madre", responsablePrincipal: true, autorizadoRetiro: true },
  { id: "rel-4", studentId: "alu-3", tutorId: "tut-3", parentesco: "madre", responsablePrincipal: true, autorizadoRetiro: false },
  { id: "rel-5", studentId: "alu-3", tutorId: "tut-4", parentesco: "abuela", responsablePrincipal: false, autorizadoRetiro: false },
  { id: "rel-6", studentId: "alu-5", tutorId: "tut-5", parentesco: "madre", responsablePrincipal: true, autorizadoRetiro: true },
  { id: "rel-7", studentId: "alu-5", tutorId: "tut-6", parentesco: "padre", responsablePrincipal: false, autorizadoRetiro: true },
  { id: "rel-8", studentId: "alu-1", tutorId: "tut-7", parentesco: "tutor", responsablePrincipal: false, autorizadoRetiro: false, isActive: false, desvinculadoEn: "2025-10-01T00:00:00.000Z" }
];

export function seedTutores() {
  tutorsRepository.resetData();
  studentsRefRepository.clear();
  studentsRefRepository.setAll(ALUMNOS_REFERENCIA);

  for (const tutor of TUTORES) {
    tutorsRepository.createTutor(tutor);
  }

  for (const relacion of RELACIONES) {
    tutorsRepository.createRelation(relacion);
  }
}