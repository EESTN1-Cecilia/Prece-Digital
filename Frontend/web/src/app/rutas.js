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
import SecretariaView from "../modules/dashboard/secretaria-view.js";
import AlumnoFormularioView from "../modules/students/alumno-formulario-view.js";
import LoginView from "../modules/auth/login-view.js";
import InviteView from "../modules/auth/invite-view.js";
import UsuariosView from "../modules/identity/usuarios-view.js";
import UsuarioDetalleView from "../modules/identity/usuario-detalle-view.js";
import UsuarioFormularioView from "../modules/identity/usuario-formulario-view.js";
import RolesView from "../modules/identity/roles-view.js";
import { PERMISOS } from "../utils/permisos.js";

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
    vista: DashboardView,
    seccion: "General",
    icono: "clipboard",
    enMenu: true
  },
  {
    patron: "#/inicio-secretaria",
    titulo: "Inicio secretaria",
    vista: SecretariaView,
    seccion: "General",
    icono: "students",
    padre: "#/inicio",
    permisos: [PERMISOS.alumnosLeer],
    enMenu: true
  },
  {
    patron: "#/alumnos/nuevo",
    titulo: "Cargar alumno",
    vista: AlumnoFormularioView,
    seccion: "General",
    icono: "clipboard",
    padre: "#/inicio-secretaria",
    permisos: [PERMISOS.alumnosCrear],
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
  }
];

/* Adonde vuelve alguien que llego a una pantalla que no puede ver. */
export const RUTA_INICIO = "#/inicio";
export const RUTA_LOGIN = "#/login";
