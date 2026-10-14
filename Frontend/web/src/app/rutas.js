/* Tabla de rutas de la aplicacion.

   Un solo lugar declara, por ruta, si es publica, que roles la abren y que
   permisos exige. Agregar una pantalla o cambiar quien entra es tocar esta
   tabla y nada mas: ninguna vista repite la comprobacion por su cuenta.

   El orden importa: la primera coincidencia gana, asi que las rutas fijas van
   antes que las que tienen parametro ("#/usuarios/nuevo" antes que
   "#/usuarios/:id").

   Campos:
     patron           "#/usuarios/:id"; `:algo` toma cualquier segmento
     vista            componente a renderizar
     roles            codigos de rol que pueden entrar (vacio: cualquiera)
     permisos         permisos necesarios; alcanza con uno
     todosLosPermisos exige la lista completa en lugar de uno
     enMenu           aparece en menus y enlaces de navegacion
     titulo           nombre legible, para menus, migas y acceso denegado
     seccion          agrupa la entrada en el menu lateral
     icono            icono del menu (archivo de public/assets/icons)
     padre            ruta de la que cuelga, para armar las migas
     publica          se ve sin iniciar sesion y se dibuja con el layout del sitio
                      (encabezado y pie) en lugar del layout de la aplicacion */

import DashboardView from "../modules/dashboard/dashboard-view.js";
import DirectorDashboardView from "../modules/director/director-dashboard-view.js";
import SecretariaDashboardView from "../modules/secretaria/secretaria-dashboard-view.js";
import JefaturaDashboardView from "../modules/jefatura/jefatura-dashboard-view.js";
import ServerDashboardView from "../modules/server/server-dashboard-view.js";
import CursosListView from "../modules/schools/cursos-list-view.js";
import CargarAlumnoView from "../modules/students/cargar-alumno-view.js";
import AlumnosListView from "../modules/students/alumnos-list-view.js";
import AlumnoResumenView from "../modules/students/alumno-resumen-view.js";
import AlumnoPerfilView from "../modules/students/alumno-perfil-view.js";
import ObservacionesView from "../modules/preceptoria/observaciones-view.js";
import AsistenciasView from "../modules/attendance/asistencias-view.js";
import NotificacionesView from "../modules/notifications/notificaciones-view.js";
import LoginView from "../modules/auth/login-view.js";
import InviteView from "../modules/auth/invite-view.js";
import UsuariosView from "../modules/identity/usuarios-view.js";
import UsuarioDetalleView from "../modules/identity/usuario-detalle-view.js";
import UsuarioFormularioView from "../modules/identity/usuario-formulario-view.js";
import RolesView from "../modules/identity/roles-view.js";
import PerfilView from "../modules/identity/perfil-view.js";
import InventarioListView from "../modules/server/inventario/inventario-list-view.js";
import MaterialFormView from "../modules/server/inventario/material-form-view.js";
import MaterialDetalleView from "../modules/server/inventario/material-detalle-view.js";
import PlanificacionesListView from "../modules/planificaciones/planificaciones-list-view.js";
import PlanificacionesRevisionListView from "../modules/planificaciones/planificaciones-revision-list-view.js";
import PlanificacionDetalleView from "../modules/planificaciones/planificacion-detalle-view.js";
import PlanificacionFormView from "../modules/planificaciones/planificacion-form-view.js";
import PlanificacionRevisionView from "../modules/planificaciones/planificacion-revision-view.js";
import PlanificacionesDocenteView from "../modules/planificaciones/planificaciones-docente-view.js";
import PlanificacionesMateriaView from "../modules/planificaciones/planificaciones-materia-view.js";
import PlanificacionesCursoView from "../modules/planificaciones/planificaciones-curso-view.js";
import { PERMISOS } from "../utils/permisos.js";
import InicioView from "./inicio.js";

export const RUTAS = [
  {
    patron: "#/login",
    titulo: "Iniciar sesion",
    vista: LoginView,
    publica: true
  },
  {
    patron: "#/activar",
    titulo: "Activar cuenta",
    vista: LoginView,
    propiedades: { titulo: "Activar Cuenta" },
    publica: true
  },
  {
    patron: "#/inicio",
    titulo: "Inicio",
    vista: InicioView,
    seccion: "General",
    icono: "clipboard",
    enMenu: true
  },
  {
    patron: "#/director",
    titulo: "Tablero de Dirección",
    vista: DirectorDashboardView,
    seccion: "General",
    icono: "academic",
    padre: "#/inicio",
    permisos: [PERMISOS.usuariosLeer, PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/inicio-director",
    titulo: "Tablero de Dirección",
    vista: DirectorDashboardView,
    padre: "#/inicio",
    permisos: [PERMISOS.usuariosLeer]
  },
  {
    patron: "#/preceptoria",
    titulo: "Tablero de preceptoria",
    vista: DashboardView,
    seccion: "General",
    icono: "attendance",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/secretaria",
    titulo: "Tablero de secretaria",
    vista: SecretariaDashboardView,
    seccion: "General",
    icono: "students",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosEditar],
    enMenu: true
  },
  {
    patron: "#/jefatura",
    titulo: "Grilla de jefatura",
    vista: JefaturaDashboardView,
    seccion: "General",
    icono: "academic",
    padre: "#/inicio",
    permisos: [PERMISOS.academicosLeer, PERMISOS.horariosLeer],
    todosLosPermisos: true,
    enMenu: true
  },
  {
    patron: "#/inicio-secretaria",
    titulo: "Tablero de secretaria",
    vista: SecretariaDashboardView,
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosEditar]
  },
  {
    patron: "#/asistencias/:cursoId",
    titulo: "Planilla de Asistencia",
    vista: AsistenciasView,
    padre: "#/asistencias",
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/asistencias",
    titulo: "Planilla de Asistencias",
    vista: AsistenciasView,
    seccion: "General",
    icono: "clipboard",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/server",
    titulo: "Tablero de Server",
    vista: ServerDashboardView,
    seccion: "Server",
    icono: "filter",
    padre: "#/inicio",
    permisos: [PERMISOS.inventoryLeer],
    enMenu: true
  },
  {
    patron: "#/inicio-server",
    titulo: "Tablero de Server",
    vista: ServerDashboardView,
    padre: "#/inicio",
    permisos: [PERMISOS.inventoryLeer]
  },
  {
    patron: "#/inventario/nuevo",
    titulo: "Registrar material",
    vista: MaterialFormView,
    padre: "#/inventario",
    permisos: [PERMISOS.inventoryCrear]
  },
  {
    patron: "#/inventario/:id/editar",
    titulo: "Modificar material",
    vista: MaterialFormView,
    padre: "#/inventario/:id",
    permisos: [PERMISOS.inventoryEditar]
  },
  {
    patron: "#/inventario/:id",
    titulo: "Detalle del material",
    vista: MaterialDetalleView,
    padre: "#/inventario",
    permisos: [PERMISOS.inventoryLeer]
  },
  {
    patron: "#/inventario",
    titulo: "Inventario",
    vista: InventarioListView,
    seccion: "Server",
    icono: "clipboard",
    padre: "#/server",
    permisos: [PERMISOS.inventoryLeer],
    enMenu: true
  },
  /* Planificaciones docentes: las rutas fijas (nueva, revision, docentes,
     materias, cursos) van antes que "#/planificaciones/:id". Escribir se habilita con
     teaching-plans.write; el backend acota al docente a lo propio.
     El listado va primero solo para que encabece la seccion del menu: tiene
     un segmento y no compite con las demas. */
  {
    patron: "#/planificaciones",
    titulo: "Planificaciones docentes",
    vista: PlanificacionesListView,
    seccion: "Planificaciones",
    icono: "academic",
    padre: "#/inicio",
    permisos: [PERMISOS.planificacionesLeer],
    enMenu: true
  },
  {
    patron: "#/planificaciones/nueva",
    titulo: "Cargar planificación",
    vista: PlanificacionFormView,
    seccion: "Planificaciones",
    icono: "clipboard",
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesEscribir],
    enMenu: true
  },
  {
    patron: "#/planificaciones/revision",
    titulo: "Revisión de planificaciones",
    vista: PlanificacionesRevisionListView,
    seccion: "Planificaciones",
    icono: "clipboard",
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesGestionar],
    enMenu: true
  },
  {
    patron: "#/planificaciones/docentes/:docenteId",
    titulo: "Planificaciones del docente",
    vista: PlanificacionesDocenteView,
    padre: "#/planificaciones/docentes",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/docentes",
    titulo: "Planificaciones por docente",
    vista: PlanificacionesDocenteView,
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/materias/:materiaId",
    titulo: "Planificaciones de la materia",
    vista: PlanificacionesMateriaView,
    padre: "#/planificaciones/materias",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/materias",
    titulo: "Planificaciones por materia",
    vista: PlanificacionesMateriaView,
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/cursos/:cursoId",
    titulo: "Planificaciones del curso",
    vista: PlanificacionesCursoView,
    padre: "#/planificaciones/cursos",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/cursos",
    titulo: "Planificaciones por curso",
    vista: PlanificacionesCursoView,
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/planificaciones/:id/editar",
    titulo: "Modificar planificación",
    vista: PlanificacionFormView,
    padre: "#/planificaciones/:id",
    permisos: [PERMISOS.planificacionesEscribir]
  },
  {
    patron: "#/planificaciones/:id/revision",
    titulo: "Revisar planificación",
    vista: PlanificacionRevisionView,
    padre: "#/planificaciones/revision",
    permisos: [PERMISOS.planificacionesGestionar]
  },
  {
    patron: "#/planificaciones/:id",
    titulo: "Detalle de la planificación",
    vista: PlanificacionDetalleView,
    padre: "#/planificaciones",
    permisos: [PERMISOS.planificacionesLeer]
  },
  {
    patron: "#/preceptoria/observaciones",
    titulo: "Observaciones",
    vista: ObservacionesView,
    seccion: "General",
    icono: "activity",
    padre: "#/inicio",
    permisos: [PERMISOS.observacionesLeer],
    enMenu: true
  },
  {
    patron: "#/notificaciones",
    titulo: "Notificaciones y Alertas",
    vista: NotificacionesView,
    seccion: "General",
    icono: "alert",
    padre: "#/inicio"
  },
  {
    patron: "#/alumnos/cargar",
    titulo: "Cargar alumno",
    vista: CargarAlumnoView,
    padre: "#/alumnos",
    permisos: [PERMISOS.alumnosCrear]
  },
  {
    patron: "#/alumnos/nuevo",
    titulo: "Cargar alumno",
    vista: CargarAlumnoView,
    seccion: "General",
    icono: "clipboard",
    padre: "#/alumnos",
    permisos: [PERMISOS.alumnosCrear],
    enMenu: true
  },
  {
    patron: "#/alumnos/buscar",
    titulo: "Listado de Alumnos",
    vista: AlumnosListView,
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/alumnos/:id/perfil",
    titulo: "Perfil completo del alumno",
    vista: AlumnoPerfilView,
    padre: "#/alumnos/:id",
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/alumnos/:id/ficha",
    titulo: "Ficha del alumno",
    vista: AlumnoResumenView,
    padre: "#/alumnos",
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/alumnos/:id",
    titulo: "Ficha del alumno",
    vista: AlumnoResumenView,
    padre: "#/alumnos",
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/alumnos",
    titulo: "Alumnos",
    vista: AlumnosListView,
    seccion: "General",
    icono: "people",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/cursos",
    titulo: "Cursos",
    vista: CursosListView,
    seccion: "General",
    icono: "academic",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/invitar",
    titulo: "Invitar usuario",
    vista: InviteView,
    padre: "#/usuarios",
    permisos: [PERMISOS.usuariosCrear]
  },
  {
    patron: "#/usuarios/nuevo",
    titulo: "Nuevo usuario",
    vista: UsuarioFormularioView,
    padre: "#/usuarios",
    permisos: [PERMISOS.usuariosCrear]
  },
  {
    patron: "#/usuarios/:id/editar",
    titulo: "Editar usuario",
    vista: UsuarioFormularioView,
    padre: "#/usuarios/:id",
    permisos: [PERMISOS.usuariosEditar]
  },
  {
    patron: "#/usuarios/:id",
    titulo: "Detalle del usuario",
    vista: UsuarioDetalleView,
    padre: "#/usuarios",
    permisos: [PERMISOS.usuariosLeer]
  },
  {
    patron: "#/usuarios",
    titulo: "Usuarios",
    vista: UsuariosView,
    seccion: "Identidad y acceso",
    icono: "people",
    padre: "#/inicio",
    permisos: [PERMISOS.usuariosLeer],
    enMenu: true
  },
  {
    patron: "#/roles",
    titulo: "Roles y permisos",
    vista: RolesView,
    seccion: "Identidad y acceso",
    icono: "filter",
    padre: "#/inicio",
    permisos: [PERMISOS.rolesLeer],
    enMenu: true
  },
  {
    patron: "#/perfil",
    titulo: "Mi Perfil",
    vista: PerfilView,
    padre: "#/inicio"
  },
  {
    patron: "#/configuracion",
    titulo: "Configuración de perfil",
    vista: PerfilView,
    padre: "#/inicio"
  }
];

/* Adonde vuelve alguien que llego a una pantalla que no puede ver. */
export const RUTA_INICIO = "#/inicio";
export const RUTA_LOGIN = "#/login";
