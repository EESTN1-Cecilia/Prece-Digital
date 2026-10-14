import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { h, SiteLayout } from "../layouts/site-layout.js";
import { CargandoPantalla, ErrorGlobal } from "../components/ui/index.js";
import { PaginaNoEncontrada } from "./pagina-no-encontrada.js";
import { AccesoDenegado } from "./acceso-denegado.js";
import { ACCESO, decidirAcceso, resolverRuta } from "./navegacion.js";
import { RUTAS, RUTA_LOGIN } from "./rutas.js";
import { ProveedorEstado, useCarga, useErrorGlobal, useSesion } from "../estado/index.js";

/* Ruta actual sin la query (#/alumnos?curso=1 -> #/alumnos). */
function rutaActual() {
  const hash = window.location.hash || "#/inicio";
  return hash.split("?")[0];
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
    case ACCESO.esperar:
    case ACCESO.login:
      return h(CargandoPantalla, { texto: "Verificando tu acceso..." });

    case ACCESO.denegado:
      return h(AccesoDenegado, { titulo: resultado.ruta.titulo, permiso: decision.permiso });

    case ACCESO.noEncontrada:
      return h(PaginaNoEncontrada);

    default: {
      const { ruta: definicion, parametros } = resultado;
      /* `ruta.parametros` se mantiene por compatibilidad con las vistas de alumnos. */
      return h(definicion.vista, { ...definicion.propiedades, ...parametros, ruta: { parametros } });
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

  return h(
    SiteLayout,
    { ruta },
    errorGlobal ? h(ErrorGlobal, { error: errorGlobal, onCerrar: limpiar }) : null,
    inicializando ? h(CargandoPantalla, { texto: "Iniciando Prece Digital..." }) : h(Guardia, { ruta })
  );
}

createRoot(document.querySelector("#root")).render(h(ProveedorEstado, null, h(App)));
