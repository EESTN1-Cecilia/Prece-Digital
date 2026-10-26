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
import PortalInicioView from "../modules/portal-docente/portal-inicio-view.js";
import PortalLoginView from "../modules/portal-docente/portal-login-view.js";
import MisCursosView from "../modules/portal-docente/mis-cursos-view.js";
import CursoDetalleView from "../modules/portal-docente/curso-detalle-view.js";
import PortalPlanillaView from "../modules/portal-docente/portal-planilla-view.js";
import HistorialAsistenciasView from "../modules/portal-docente/historial-asistencias-view.js";
import BoletinesListView from "../modules/students/boletines-list-view.js";
import CursosListView from "../modules/schools/cursos-list-view.js";
import CargarAlumnoView from "../modules/students/cargar-alumno-view.js";
import AlumnosListView from "../modules/students/alumnos-list-view.js";
import AlumnoResumenView from "../modules/students/alumno-resumen-view.js";
import AlumnoPerfilView from "../modules/students/alumno-perfil-view.js";
import PreceptorDashboardView from "../modules/preceptoria/preceptor-dashboard.js";
import PreceptorInicioView from "../modules/portal-preceptor/preceptor-inicio-view.js";
import PreceptorCursosView from "../modules/portal-preceptor/preceptor-cursos-view.js";
import PreceptorCursoDetalleView from "../modules/portal-preceptor/preceptor-curso-detalle-view.js";
import PreceptorPlanillaView from "../modules/portal-preceptor/preceptor-planilla-view.js";
import PreceptorHistorialView from "../modules/portal-preceptor/preceptor-historial-view.js";
import PreceptorBoletinesView from "../modules/portal-preceptor/preceptor-boletines-view.js";
import PreceptorBoletinesCursoView from "../modules/portal-preceptor/preceptor-boletines-curso-view.js";
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
import DocentesView from "../modules/docentes/docentes-view.js";
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
    patron: "#/portal-docente",
    titulo: "Portal Docente",
    vista: PortalLoginView,
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
    /* Un docente no entra a Direccion aunque tenga students.read. */
    roles: ["admin", "director", "secretario", "secretaria", "preceptor", "jefe_area", "server"],
    permisos: [PERMISOS.usuariosLeer, PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/inicio-director",
    titulo: "Tablero de Dirección",
    vista: DirectorDashboardView,
    padre: "#/inicio",
    roles: ["admin", "director", "secretario", "secretaria", "preceptor", "jefe_area", "server"],
    permisos: [PERMISOS.usuariosLeer]
  },
  {
    patron: "#/preceptoria",
    titulo: "Tablero de preceptoria",
    vista: PreceptorDashboardView,
    seccion: "General",
    icono: "attendance",
    padre: "#/inicio",
    roles: ["preceptor", "director", "admin"],
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
    roles: ["secretario", "secretaria", "director", "admin"],
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
    roles: ["jefe_area", "admin"],
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
  /* Portal Docente: lo que ve cada docente de sus propios cursos. El backend
     limita los datos a sus asignaciones con la identidad del token. */
  {
    patron: "#/docente",
    titulo: "Portal Docente",
    vista: PortalInicioView,
    padre: "#/inicio",
    roles: ["docente", "director", "admin"]
  },
  {
    patron: "#/docente/cursos",
    titulo: "Mis Cursos",
    vista: MisCursosView,
    seccion: "Portal Docente",
    icono: "academic",
    padre: "#/docente",
    roles: ["docente", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/docente/cursos/:cursoId",
    titulo: "Curso",
    vista: CursoDetalleView,
    padre: "#/docente/cursos",
    roles: ["docente", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/cursos-a-cargo",
    titulo: "Mis Cursos",
    vista: MisCursosView,
    padre: "#/docente",
    roles: ["docente", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/docente/asistencias",
    titulo: "Tomar Asistencia",
    vista: PortalPlanillaView,
    seccion: "Portal Docente",
    icono: "clipboard",
    padre: "#/docente",
    roles: ["docente", "director", "admin"],
    permisos: [PERMISOS.asistenciaEscribir],
    enMenu: true
  },
  {
    patron: "#/docente/historial",
    titulo: "Historial de asistencias",
    vista: HistorialAsistenciasView,
    seccion: "Portal Docente",
    icono: "activity",
    padre: "#/docente",
    roles: ["docente", "director", "admin"],
    permisos: [PERMISOS.asistenciaLeer],
    enMenu: true
  },
  /* Portal Preceptor: las divisiones que Direccion asigno al preceptor. El
     backend limita cursos, alumnos, asistencia y boletines con la identidad
     del token (403 para cualquier otra division). */
  {
    patron: "#/preceptor",
    titulo: "Portal Preceptor",
    vista: PreceptorInicioView,
    padre: "#/inicio",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/preceptor/cursos",
    titulo: "Mis cursos",
    vista: PreceptorCursosView,
    seccion: "Portal Preceptor",
    icono: "academic",
    padre: "#/preceptor",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/preceptor/cursos/:cursoId/boletines",
    titulo: "Boletines del curso",
    vista: PreceptorBoletinesCursoView,
    padre: "#/preceptor/cursos/:cursoId",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/preceptor/cursos/:cursoId",
    titulo: "Curso",
    vista: PreceptorCursoDetalleView,
    padre: "#/preceptor/cursos",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer]
  },
  {
    patron: "#/preceptor/asistencia",
    titulo: "Planilla de asistencia",
    vista: PreceptorPlanillaView,
    seccion: "Portal Preceptor",
    icono: "clipboard",
    padre: "#/preceptor",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.asistenciaLeer],
    enMenu: true
  },
  {
    patron: "#/preceptor/historial",
    titulo: "Historial de asistencia",
    vista: PreceptorHistorialView,
    seccion: "Portal Preceptor",
    icono: "activity",
    padre: "#/preceptor",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.asistenciaLeer],
    enMenu: true
  },
  {
    patron: "#/preceptor/boletines",
    titulo: "Boletines",
    vista: PreceptorBoletinesView,
    seccion: "Portal Preceptor",
    icono: "academic",
    padre: "#/preceptor",
    roles: ["preceptor", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/asistencias/:cursoId",
    titulo: "Planilla de Asistencia",
    vista: AsistenciasView,
    padre: "#/asistencias",
    roles: ["secretario", "secretaria", "director", "admin"],
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
    /* El docente y el preceptor toman asistencia desde su portal. */
    roles: ["secretario", "secretaria", "director", "admin"],
    enMenu: true
  },
  {
    patron: "#/boletines",
    titulo: "Boletines",
    vista: BoletinesListView,
    seccion: "General",
    icono: "academic",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    /* El preceptor imprime los boletines desde su portal (solo lectura). */
    roles: ["docente", "secretario", "secretaria", "director", "admin"],
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
  {
    patron: "#/preceptoria/observaciones",
    titulo: "Observaciones",
    vista: ObservacionesView,
    seccion: "General",
    icono: "activity",
    padre: "#/inicio",
    roles: ["preceptor", "secretario", "secretaria", "director", "admin"],
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
    roles: ["secretario", "secretaria", "director", "admin"],
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
    roles: ["docente", "preceptor", "secretario", "secretaria", "director", "admin"],
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
    roles: ["preceptor", "secretario", "secretaria", "director", "admin"],
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/docentes",
    titulo: "Docentes",
    vista: DocentesView,
    seccion: "General",
    icono: "people",
    padre: "#/inicio",
    permisos: [PERMISOS.docentesLeer],
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
