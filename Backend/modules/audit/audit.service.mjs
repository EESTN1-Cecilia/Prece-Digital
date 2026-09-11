/* Servicio de auditoría transversal.

   Tres responsabilidades:
   - Registrar acciones sensibles con usuario, fecha, valores previo/nuevo e IP.
   - Registrar fallos (errores) con el mismo nivel de trazabilidad.
   - Brindar consulta y descarga de reportes, sin exponer contraseñas ni tokens.

   Regla de seguridad: antes de persistir, `sanitizarDatos` elimina los campos
   sensibles (contraseñas, hashes y tokens) tanto del valor anterior como del
   valor nuevo. El log de errores tampoco guarda cuerpo ni cabeceras de la
   petición. */

import auditRepository from "./audit.repository.mjs";
import { noEncontrado, solicitudInvalida } from "../../utils/api-error.mjs";

const CAMPOS_SENSIBLES = [
  "password",
  "passwordHash",
  "password_hash",
  "clave",
  "accessToken",
  "refreshToken",
  "token",
  "secret",
  "refreshTokenId"
];

const ACCIONES_VALIDAS = ["create", "read", "update", "delete", "export", "login", "logout", "access", "aprobacion"];

function esCampoSensible(clave) {
  return CAMPOS_SENSIBLES.some((campo) => clave.toLowerCase() === campo.toLowerCase());
}

const LIMITE_LONGITUD = 1000;

function acotarCadena(valor) {
  return valor.length > LIMITE_LONGITUD ? `${valor.slice(0, LIMITE_LONGITUD)}…` : valor;
}

export function sanitizarDatos(valor) {
  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizarDatos(item));
  }

  if (valor && typeof valor === "object") {
    const limpio = {};

    for (const [clave, dato] of Object.entries(valor)) {
      if (esCampoSensible(clave)) {
        limpio[clave] = "[oculto]";
        continue;
      }

      limpio[clave] = sanitizarDatos(dato);
    }

    return limpio;
  }

  return typeof valor === "string" ? acotarCadena(valor) : valor;
}

export function obtenerIp(request) {
  const encabezado = request?.headers?.["x-forwarded-for"];
  if (encabezado) {
    return String(encabezado).split(",")[0].trim();
  }

  return request?.socket?.remoteAddress ?? request?.connection?.remoteAddress ?? null;
}

function obtenerUsuarioId(peticion) {
  return (
    peticion?.contexto?.usuario?.id ??
    peticion?.request?.usuario?.id ??
    peticion?.usuario?.id ??
    peticion?.user?.id ??
    null
  );
}

function tablaDesdeRuta(ruta) {
  if (!ruta) return null;
  return ruta.split("/").filter(Boolean).find((segmento) => segmento !== "api" && segmento !== "v1") ?? null;
}

const auditService = {
  registrar({ usuarioId, escuelaId, accion, tabla, registroId, valorAnterior, valorNuevo, motivo, metodo, ruta, ip }) {
    if (!accion || !ACCIONES_VALIDAS.includes(accion)) {
      throw solicitudInvalida(`La accion "${accion}" no es valida para auditoria.`);
    }

    return auditRepository.create({
      usuarioId,
      escuelaId,
      accion,
      tabla,
      registroId,
      valorAnterior: valorAnterior ? sanitizarDatos(valorAnterior) : null,
      valorNuevo: valorNuevo ? sanitizarDatos(valorNuevo) : null,
      motivo,
      metodo,
      ruta,
      ip
    });
  },

  registrarError({ usuarioId, metodo, ruta, tipo, code, message, ip }) {
    return auditRepository.registrarError({
      usuarioId,
      metodo,
      ruta,
      tipo,
      code,
      message: message ? String(message).slice(0, 1000) : null,
      ip
    });
  },

  list(query = {}) {
    return auditRepository.list({
      usuarioId: query.usuarioId ?? undefined,
      accion: query.accion ?? undefined,
      tabla: query.tabla ?? undefined,
      registroId: query.registroId ?? undefined,
      desde: query.desde ?? undefined,
      hasta: query.hasta ?? undefined
    });
  },

  getById(id) {
    const registro = auditRepository.findById(id);

    if (!registro) {
      throw noEncontrado("El registro de auditoria solicitado");
    }

    return { data: registro };
  },

  listErrors(query = {}) {
    return auditRepository.listErrors({
      tipo: query.tipo ?? undefined,
      desde: query.desde ?? undefined,
      hasta: query.hasta ?? undefined
    });
  },

  getErrorById(id) {
    const registro = auditRepository.findErrorById(id);

    if (!registro) {
      throw noEncontrado("El log de error solicitado");
    }

    return { data: registro };
  },

  report() {
    const logs = auditRepository.list();
    const errores = auditRepository.listErrors();

    const contar = (lista, campo) => {
      const conteo = {};

      for (const item of lista) {
        const clave = item[campo] ?? "(sin dato)";
        conteo[clave] = (conteo[clave] ?? 0) + 1;
      }

      return conteo;
    };

    const erroresPorTipo = { esperado: 0, inesperado: 0 };

    for (const error of errores) {
      erroresPorTipo[error.tipo] = (erroresPorTipo[error.tipo] ?? 0) + 1;
    }

    return {
      data: {
        totalAcciones: logs.length,
        totalErrores: errores.length,
        erroresPorTipo,
        porAccion: contar(logs, "accion"),
        porTabla: contar(logs, "tabla"),
        ultimaAccion: logs[0]?.fechaHora ?? null
      }
    };
  },

  /* Construye el CSV de los registros de auditoría para su descarga. */
  aCsv(logs) {
    const encabezado = [
      "id",
      "fecha_hora",
      "usuario_id",
      "escuela_id",
      "accion",
      "tabla_afectada",
      "registro_id",
      "motivo",
      "metodo",
      "ruta",
      "dispositivo_ip",
      "valor_anterior",
      "valor_nuevo"
    ];

    const escapar = (valor) => {
      if (valor === null || valor === undefined) return "";
      const texto = typeof valor === "string" ? valor : JSON.stringify(valor);
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const filas = logs.map((registro) =>
      [
        registro.id,
        registro.fechaHora,
        registro.usuarioId,
        registro.escuelaId,
        registro.accion,
        registro.tabla,
        registro.registroId,
        registro.motivo,
        registro.metodo,
        registro.ruta,
        registro.ip,
        registro.valorAnterior ? JSON.stringify(registro.valorAnterior) : "",
        registro.valorNuevo ? JSON.stringify(registro.valorNuevo) : ""
      ]
        .map(escapar)
        .join(";")
    );

    return [encabezado.join(";"), ...filas].join("\r\n");
  },

  registrarRequest(peticion, resultado) {
    const metodo = peticion?.request?.method;
    const ruta = peticion?.url?.pathname ?? null;

    const accionPorMetodo = {
      POST: "create",
      PATCH: "update",
      PUT: "update",
      DELETE: "delete"
    };

    const accion = accionPorMetodo[metodo];

    if (!accion) {
      return null;
    }

    const cuerpo = peticion?.body ?? {};
    const rutaFinal = ruta;
    const registroIdCandidato = Object.values(peticion?.params ?? {}).find(
      (valor) => typeof valor === "string" && /^[a-zA-Z]+_[0-9]/.test(valor)
    ) ?? peticion?.params?.id ?? null;

    /* La auditoría automática no interrumpe el request: si falla, solo se omite. */
    try {
      return auditService.registrar({
        usuarioId: obtenerUsuarioId(peticion),
        escuelaId: cuerpo.schoolId ?? peticion?.params?.schoolId ?? null,
        accion,
        tabla: peticion.auditTabla ?? tablaDesdeRuta(rutaFinal),
        registroId: registroIdCandidato,
        valorNuevo: cuerpo,
        metodo,
        ruta: rutaFinal,
        ip: obtenerIp(peticion?.request)
      });
    } catch {
      return null;
    }
  }
};

export default auditService;