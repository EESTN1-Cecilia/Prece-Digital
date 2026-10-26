/* Adaptador de servicios del modulo de Informes.

   Habla con el modulo de informes del backend: catalogo de plantillas, listado
   con filtros, alta, edicion, baja logica, historial de versiones, restauracion
   de una version y exportacion a PDF.

   La exportacion es la unica respuesta que no es JSON (es un archivo binario),
   asi que se pide con `fetch` directo: `pedir()` siempre interpreta el cuerpo
   como JSON y no serviria para descargar el PDF. */

import { pedir, leerToken, ErrorApi } from "../../services/http.js";
import { env } from "../../config/env.js";

const SIN_CONEXION = {
  mensaje: "No se pudo conectar con el servidor. Verifica tu conexión e intenta nuevamente.",
  alcance: "global",
  reintentable: true
};

export const InformesService = {
  /* Catalogo de plantillas: lo define el backend, el frontend no lo inventa. */
  async listarPlantillas() {
    const plantillas = await pedir("/api/v1/reports/plantillas");
    return Array.isArray(plantillas) ? plantillas : [];
  },

  /* Listado de informes con filtros. Devuelve `{ items, paginacion }`. */
  async listarInformes(filtros = {}) {
    const params = new URLSearchParams();

    if (filtros.q) params.set("q", filtros.q);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.plantilla) params.set("plantilla", filtros.plantilla);
    if (filtros.pagina) params.set("pagina", String(filtros.pagina));
    if (filtros.porPagina) params.set("porPagina", String(filtros.porPagina));

    const query = params.toString() ? `?${params.toString()}` : "";
    const envelope = await pedir(`/api/v1/reports${query}`, { crudo: true });
    const items = Array.isArray(envelope) ? envelope : (envelope?.data ?? []);

    return {
      items,
      paginacion: envelope?.paginacion ?? null
    };
  },

  async obtenerInforme(id) {
    return pedir(`/api/v1/reports/${encodeURIComponent(id)}`);
  },

  /* Da de alta un informe. El backend devuelve el informe con su historial. */
  async crearInforme(datos) {
    return pedir("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify(datos)
    });
  },

  /* Guarda los cambios: el backend deja una version nueva en el historial. */
  async actualizarInforme(id, datos) {
    return pedir(`/api/v1/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(datos)
    });
  },

  /* Baja logica: el informe no se borra, queda marcado como eliminado. */
  async eliminarInforme(id) {
    return pedir(`/api/v1/reports/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  async listarVersiones(id) {
    const versiones = await pedir(`/api/v1/reports/${encodeURIComponent(id)}/versiones`);
    return Array.isArray(versiones) ? versiones : [];
  },

  async restaurarVersion(id, version) {
    return pedir(`/api/v1/reports/${encodeURIComponent(id)}/versiones/${encodeURIComponent(version)}/restaurar`, {
      method: "POST"
    });
  },

  /* Descarga el PDF generado por el servidor.

     El archivo se pide con `fetch` porque la respuesta es binaria: `pedir()`
     la interpretaria como JSON y fallaria al leerla. */
  async exportarPdf(id) {
    const token = leerToken();
    const ruta = `/api/v1/reports/${encodeURIComponent(id)}/pdf`;

    let respuesta;

    try {
      respuesta = await fetch(`${env.apiBaseUrl}${ruta}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (fallo) {
      const error = new ErrorApi(0, SIN_CONEXION.mensaje, {
        ...SIN_CONEXION,
        tecnico: fallo?.message ?? "error de red"
      });

      throw error;
    }

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => null);

      throw new ErrorApi(
        respuesta.status,
        cuerpo?.error?.message ?? "No se pudo exportar el informe a PDF.",
        { alcance: "local" }
      );
    }

    const blob = await respuesta.blob();
    const cabecera = respuesta.headers.get("Content-Disposition") ?? "";
    const nombre = /filename="?([^";]+)"?/.exec(cabecera)?.[1] ?? `${id}.pdf`;

    return { blob, nombre };
  }
};

/* Guarda en el disco el archivo que devuelve el backend. */
export function descargarArchivo({ blob, nombre }) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");

  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();

  URL.revokeObjectURL(url);
}
