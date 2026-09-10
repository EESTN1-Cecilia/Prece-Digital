import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { h, SiteLayout } from "../layouts/site-layout.js";
import { AppLayout } from "../layouts/app-layout.js";
import { CargandoPantalla, ErrorGlobal } from "../components/ui/index.js";
import { PaginaNoEncontrada } from "./pagina-no-encontrada.js";
import { AccesoDenegado } from "./acceso-denegado.js";
import { ACCESO, decidirAcceso, resolverRuta } from "./navegacion.js";
import { RUTAS, RUTA_LOGIN } from "./rutas.js";
import { ProveedorEstado, useCarga, useErrorGlobal, useSesion } from "../estado/index.js";

function rutaActual() {
  return window.location.hash === "" ? "#/inicio" : window.location.hash;
}

/* Guardia de navegacion.

   Toda pantalla pasa por aca antes de dibujarse, venga de un enlace interno o
   de una direccion escrita a mano. Es control de navegacion y experiencia de
   uso: la autorizacion real de cada operacion la sigue haciendo el backend. */
function Guardia({ ruta }) {
  const sesion = useSesion();
  const resultado = resolverRuta(ruta, RUTAS);
  const decision = decidirAcceso(resultado, sesion);

  /* La redireccion se hace en un efecto y no durante el render: cambiar el hash
     mientras React dibuja deja la pantalla y la direccion desincronizadas. */
  useEffect(() => {
    if (decision.tipo === ACCESO.login && window.location.hash !== RUTA_LOGIN) {
      window.location.hash = RUTA_LOGIN;
    }
  }, [decision.tipo, ruta]);

  switch (decision.tipo) {
    /* Todavia no se sabe quien entra: no se dibuja ni se redirige nada, para no
       mostrar por un instante una pantalla protegida ni mandar al login a
       alguien que si tiene sesion. */
    case ACCESO.esperar:
    case ACCESO.login:
      return h(CargandoPantalla, { texto: "Verificando tu acceso..." });

    case ACCESO.denegado:
      return h(AccesoDenegado, {
        titulo: resultado.ruta.titulo,
        permiso: decision.permiso
      });

    case ACCESO.noEncontrada:
      return h(PaginaNoEncontrada);

    default: {
      const { ruta: definicion, parametros } = resultado;
      return h(definicion.vista, { ...definicion.propiedades, ...parametros });
    }
  }
}

function App() {
  const [ruta, setRuta] = useState(rutaActual);
  const { error: errorGlobal, limpiar } = useErrorGlobal();
  const { inicializando } = useCarga();

  useEffect(() => {
    /* Cubre tambien los botones de atras y adelante del navegador. */
    const alCambiar = () => {
      setRuta(rutaActual());
      window.scrollTo(0, 0);
    };

    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  /* Las rutas publicas (login, activar cuenta) usan el layout del sitio, con su
     encabezado y su pie; el resto de la aplicacion usa el layout con menu
     lateral. La eleccion sale de la misma tabla de rutas. */
  const resultado = resolverRuta(ruta, RUTAS);
  const Layout = resultado?.ruta?.publica ? SiteLayout : AppLayout;

  return h(
    Layout,
    { ruta },
    errorGlobal ? h(ErrorGlobal, { error: errorGlobal, onCerrar: limpiar }) : null,
    inicializando
      ? h(CargandoPantalla, { texto: "Iniciando Prece Digital..." })
      : h(Guardia, { ruta })
  );
}

createRoot(document.querySelector("#root")).render(h(ProveedorEstado, null, h(App)));
