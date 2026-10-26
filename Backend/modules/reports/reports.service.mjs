/* Modulo Informes: redaccion, historial y exportacion a PDF.

   Reglas del modulo:
   - el contenido enriquecido se guarda ya saneado (lista blanca de HTML);
   - cada guardado deja una version en el historial, que se puede restaurar;
   - los informes no se borran: la baja es logica (eliminadoEn);
   - solo el autor del informe o un rol de direccion puede editarlo;
   - el PDF se arma con la identidad institucional del servidor. */

import { reportsRepository } from "../../database/repositories/reports.repository.mjs";
import { transaction } from "../../database/memory-store.mjs";
import { institucionConfig } from "../../config/institucion.config.mjs";
import { ROLES } from "../../config/permissions.config.mjs";
import { sanitizarHtml, textoPlano } from "./sanitizar-html.mjs";
import { contenidoInicial, listarPlantillas, plantillaPorId } from "./plantillas.mjs";
import { generarDocumentoPdf } from "./pdf/documento-pdf.mjs";
import { conflicto, errorDeValidacion, noEncontrado, sinPermisos } from "../../utils/api-error.mjs";

const ESTADOS = ["borrador", "finalizado"];
const PAGINA_DEFECTO = 1;
const POR_PAGINA_DEFECTO = 20;
const POR_PAGINA_MAXIMO = 100;
const CONTENIDO_MAXIMO = 200_000;

function texto(valor, maximo = 120) {
  const limpio = String(valor ?? "").trim();
  return limpio ? limpio.slice(0, maximo) : "";
}

function rolesDelActor(actor) {
  return [...new Set((actor?.assignments ?? []).map((asignacion) => asignacion.role))];
}

function esDireccion(actor) {
  const roles = rolesDelActor(actor);
  return roles.includes(ROLES.ADMIN) || roles.includes(ROLES.DIRECTOR);
}

function existe(id) {
  const informe = reportsRepository.findById(id);

  if (!informe || informe.eliminadoEn) {
    throw noEncontrado("El informe solicitado");
  }

  return informe;
}

function puedeEditar(actor, informe) {
  return esDireccion(actor) || informe.creadoPor === actor?.id;
}

function validarMetadatos(cuerpo, errores, { parcial }) {
  const salida = {};

  if (!parcial || cuerpo.titulo !== undefined) {
    const titulo = texto(cuerpo.titulo, 120);
    if (titulo.length < 3) {
      errores.push({ field: "titulo", message: "El titulo debe tener al menos 3 caracteres." });
    }
    salida.titulo = titulo;
  }

  for (const campo of ["asunto", "dirigidoA", "autor", "autorCargo"]) {
    if (!parcial || cuerpo[campo] !== undefined) {
      salida[campo] = texto(cuerpo[campo], campo === "asunto" ? 160 : 120);
    }
  }

  if (!parcial || cuerpo.estado !== undefined) {
    const estado = cuerpo.estado ?? "borrador";
    if (!ESTADOS.includes(estado)) {
      errores.push({ field: "estado", message: "El estado debe ser borrador o finalizado." });
    }
    salida.estado = estado;
  }

  if (!parcial || cuerpo.plantilla !== undefined) {
    const plantilla = cuerpo.plantilla ?? null;
    if (plantilla && !plantillaPorId(plantilla)) {
      errores.push({ field: "plantilla", message: "La plantilla seleccionada no existe." });
    }
    salida.plantilla = plantilla;
  }

  return salida;
}

function validarContenido(cuerpo, errores, { parcial }) {
  if (parcial && cuerpo.contenido === undefined) {
    return undefined;
  }

  const contenido = String(cuerpo.contenido ?? "");

  if (contenido.length > CONTENIDO_MAXIMO) {
    errores.push({ field: "contenido", message: "El contenido del informe es demasiado largo." });
    return undefined;
  }

  return sanitizarHtml(contenido);
}

function resumenDe(informe) {
  const plano = textoPlano(informe.contenido ?? "");
  return plano.length > 200 ? `${plano.slice(0, 197)}...` : plano;
}

/* Nombre del archivo exportado: sin acentos, sin signos y con guiones simples,
   para que el archivo viaje bien a cualquier sistema. */
function nombreDeArchivo(titulo) {
  const limpio = String(titulo ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return limpio || "informe";
}

export function vistaPublica(informe) {
  return {
    id: informe.id,
    titulo: informe.titulo,
    asunto: informe.asunto,
    dirigidoA: informe.dirigidoA,
    autor: informe.autor,
    autorCargo: informe.autorCargo,
    estado: informe.estado,
    plantilla: informe.plantilla,
    contenido: informe.contenido,
    schoolId: informe.schoolId,
    creadoPor: informe.creadoPor,
    creadoEn: informe.creadoEn,
    actualizadoEn: informe.actualizadoEn,
    eliminadoEn: informe.eliminadoEn,
    resumen: resumenDe(informe),
    versiones: (informe.versiones ?? []).map((version, indice) => ({
      version: version.version ?? indice + 1,
      titulo: version.titulo,
      asunto: version.asunto,
      dirigidoA: version.dirigidoA,
      autor: version.autor,
      autorCargo: version.autorCargo,
      estado: version.estado,
      contenido: version.contenido,
      guardadoEn: version.guardadoEn,
      guardadoPor: version.guardadoPor,
      nombreGuardadoPor: version.nombreGuardadoPor ?? null
    }))
  };
}

export const reportsService = {
  plantillas() {
    return listarPlantillas();
  },

  list(query = {}) {
    const q = String(query.q ?? "").trim().toLowerCase();
    const estado = query.estado || null;
    const plantilla = query.plantilla || null;
    const pagina = Math.max(1, Number.parseInt(query.pagina ?? PAGINA_DEFECTO, 10) || PAGINA_DEFECTO);
    const porPagina = Math.min(
      POR_PAGINA_MAXIMO,
      Math.max(1, Number.parseInt(query.porPagina ?? POR_PAGINA_DEFECTO, 10) || POR_PAGINA_DEFECTO)
    );

    const filtrados = reportsRepository
      .list()
      .filter((informe) => !estado || informe.estado === estado)
      .filter((informe) => !plantilla || informe.plantilla === plantilla)
      .filter(
        (informe) =>
          !q ||
          [informe.titulo, informe.asunto, informe.dirigidoA, informe.autor]
            .filter(Boolean)
            .some((campo) => campo.toLowerCase().includes(q))
      );

    const total = filtrados.length;
    const desde = (pagina - 1) * porPagina;
    const items = filtrados.slice(desde, desde + porPagina).map(vistaPublica);

    return {
      items,
      paginacion: {
        pagina,
        porPagina,
        total,
        totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
        desde: total === 0 ? 0 : desde + 1,
        hasta: Math.min(desde + porPagina, total)
      }
    };
  },

  get(id) {
    return vistaPublica(existe(id));
  },

  create(actor, cuerpo = {}) {
    const errores = [];
    const datos = validarMetadatos(cuerpo, errores, { parcial: false });
    const contenido = validarContenido(cuerpo, errores, { parcial: false });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const contenidoFinal = contenido || contenidoInicial(datos.plantilla);

    const informe = transaction(() =>
      reportsRepository.create({
        ...datos,
        contenido: contenidoFinal,
        schoolId: cuerpo.schoolId ?? actor?.assignments?.find((asignacion) => asignacion.schoolId)?.schoolId ?? null,
        creadoPor: actor?.id ?? null,
        creadoEn: new Date().toISOString(),
        actualizadoEn: new Date().toISOString()
      })
    );

    return vistaPublica(informe);
  },

  update(actor, id, cuerpo = {}) {
    const informe = existe(id);

    if (!puedeEditar(actor, informe)) {
      throw sinPermisos("Solo el autor del informe o la direccion pueden modificarlo.");
    }

    const errores = [];
    const datos = validarMetadatos(cuerpo, errores, { parcial: true });
    const contenido = validarContenido(cuerpo, errores, { parcial: true });

    if (errores.length) {
      throw errorDeValidacion(errores);
    }

    const cambios = { ...datos };

    if (contenido !== undefined) {
      cambios.contenido = contenido;
    }

    const actualizado = transaction(() => {
      reportsRepository.update(id, cambios);

      reportsRepository.agregarVersion(id, {
        version: (informe.versiones?.length ?? 0) + 1,
        titulo: informe.titulo,
        asunto: informe.asunto,
        dirigidoA: informe.dirigidoA,
        autor: informe.autor,
        autorCargo: informe.autorCargo,
        estado: informe.estado,
        contenido: informe.contenido,
        guardadoEn: informe.actualizadoEn,
        guardadoPor: informe.creadoPor,
        nombreGuardadoPor: informe.autor || null
      });

      return reportsRepository.findById(id);
    });

    return vistaPublica(actualizado);
  },

  remove(actor, id) {
    const informe = existe(id);

    if (!puedeEditar(actor, informe)) {
      throw sinPermisos("Solo el autor del informe o la direccion pueden dar de baja un informe.");
    }

    if (informe.estado === "finalizado") {
      throw conflicto("Un informe finalizado no se puede dar de baja.");
    }

    const actualizado = transaction(() => reportsRepository.softDelete(id));
    return vistaPublica(actualizado);
  },

  versiones(id) {
    const informe = existe(id);
    return vistaPublica(informe).versiones;
  },

  restaurar(actor, id, indice) {
    const informe = existe(id);

    if (!puedeEditar(actor, informe)) {
      throw sinPermisos("Solo el autor del informe o la direccion pueden restaurar una version.");
    }

    const numero = Number.parseInt(indice, 10);
    const posicion = (informe.versiones ?? []).findIndex((version) => version.version === numero);

    if (posicion === -1) {
      throw noEncontrado("La version solicitada");
    }

    const restaurado = transaction(() => {
      reportsRepository.agregarVersion(id, {
        version: (informe.versiones?.length ?? 0) + 1,
        titulo: informe.titulo,
        asunto: informe.asunto,
        dirigidoA: informe.dirigidoA,
        autor: informe.autor,
        autorCargo: informe.autorCargo,
        estado: informe.estado,
        contenido: informe.contenido,
        guardadoEn: informe.actualizadoEn,
        guardadoPor: informe.creadoPor,
        nombreGuardadoPor: informe.autor || null
      });

      return reportsRepository.restaurarVersion(id, posicion);
    });

    return vistaPublica(restaurado);
  },

  /* Exporta el informe a PDF con el encabezado institucional del servidor. */
  pdf(id) {
    const informe = existe(id);
    const buffer = generarDocumentoPdf({ informe, institucion: institucionConfig() });

    return { buffer, nombre: `${nombreDeArchivo(informe.titulo)}.pdf` };
  }
};
