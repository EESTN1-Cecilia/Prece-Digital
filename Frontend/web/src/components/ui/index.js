/* Biblioteca de componentes compartidos del frontend.

   Punto unico de importacion: las pantallas piden todo desde aca y no desde los
   archivos sueltos, para que reacomodar la biblioteca por dentro no obligue a
   tocar cada modulo.

       import { Boton, Campo, Tabla } from "../../components/ui/index.js";

   La guia de uso esta en components/ui/README.md. */

export { Boton, BotonEnlace, Acciones } from "./boton.js";
export { Campo, AreaTexto, Select, Busqueda, Casilla, Filtro } from "./campos.js";
export { Tabla, ordenarFilas, siguienteOrden } from "./tabla.js";
export { Paginacion, paginasVisibles } from "./paginacion.js";
export { Modal, Confirmacion } from "./modal.js";
export { Alerta, MensajeError, ErrorGlobal, ErrorCampo, SinPermiso, BannerOrigen } from "./avisos.js";
export {
  Spinner,
  Cargando,
  CargandoPantalla,
  CapaDeCarga,
  Esqueleto,
  SinDatos,
  SinResultados
} from "./estado.js";
export { Badge, BadgeEstado, Card, Dato, ListaDatos } from "./presentacion.js";
