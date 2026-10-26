/* Listado de tomas de asistencia con filtros por fecha, y el detalle de cada
   una con la posibilidad de corregirla (solo quien la tomo; el backend lo
   vuelve a validar). Lo usan el Historial y el detalle de un curso.

   `servicio` provee tomas(filtros), toma(id) y corregir(id, registros): por
   defecto el del Portal Docente (asistencia por clase); el Portal Preceptor
   pasa el suyo (asistencia diaria). `puedeCorregir(toma, usuario)` decide si
   se ofrece la correccion. */

import { useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Acciones, Alerta, Boton, Cargando, MensajeError, Modal, SinDatos } from "../../../components/ui/index.js";
import { useUsuarioActual } from "../../../estado/index.js";
import { fecha as fechaHora } from "../../../utils/formato.js";
import { PortalDocenteService } from "../portal-docente-service.js";
import { ESTADOS, fechaLegible, hoyLocal, resumenRegistros } from "../portal-docente-logica.js";

export function SelectorEstado({ nombre, valor, onChange, deshabilitado = false }) {
  return h(
    "div",
    { className: "portal-estado", role: "radiogroup", "aria-label": `Asistencia de ${nombre}` },
    ESTADOS.map((estado) =>
      h(
        "button",
        {
          key: estado.valor,
          type: "button",
          role: "radio",
          "aria-checked": valor === estado.valor,
          "aria-label": `${estado.nombre}: ${nombre}`,
          title: estado.nombre,
          disabled: deshabilitado,
          className: `portal-estado__opcion portal-estado__opcion--${estado.valor}${valor === estado.valor ? " portal-estado__opcion--activa" : ""}`,
          onClick: () => onChange(estado.valor)
        },
        h("span", { className: "portal-estado__corto", "aria-hidden": "true" }, estado.corto),
        h("span", { className: "portal-estado__largo" }, estado.nombre)
      )
    )
  );
}

export function ResumenChips({ resumen }) {
  return h(
    "div",
    { className: "portal-resumen", "aria-label": "Resumen de asistencia" },
    h("span", { className: "portal-resumen__chip portal-resumen__chip--presente" }, `${resumen.presente} presentes`),
    h("span", { className: "portal-resumen__chip portal-resumen__chip--ausente" }, `${resumen.ausente} ausentes`),
    h("span", { className: "portal-resumen__chip portal-resumen__chip--tarde" }, `${resumen.tarde} tardanzas`),
    resumen.sinMarcar ? h("span", { className: "portal-resumen__chip" }, `${resumen.sinMarcar} sin marcar`) : null
  );
}

const corregirSoloQuienTomo = (toma, usuario) => Boolean(toma && toma.docenteUserId === usuario?.id);

function TomaDetalleModal({ id, alCerrar, alCorregir, servicio, puedeCorregir: reglaCorreccion }) {
  const usuario = useUsuarioActual();
  const [toma, setToma] = useState(null);
  const [error, setError] = useState(null);
  const [editando, setEditando] = useState(false);
  const [registros, setRegistros] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    setToma(null);
    setError(null);
    setEditando(false);
    servicio.toma(id)
      .then((datos) => {
        setToma(datos);
        setRegistros(Object.fromEntries(datos.registros.map((item) => [item.alumnoId, item.estado])));
      })
      .catch(setError);
  }, [id]);

  const alumnos = (toma?.registros ?? []).map((item) => ({ id: item.alumnoId, apellido: item.apellido, nombre: item.nombre }));
  const puedeCorregir = Boolean(toma) && reglaCorreccion(toma, usuario);

  const guardar = async () => {
    setGuardando(true);
    setErrorGuardado(null);

    try {
      const corregida = await servicio.corregir(id, alumnos.map((alumno) => ({ alumnoId: alumno.id, estado: registros[alumno.id] })));
      setToma(corregida);
      setEditando(false);
      alCorregir?.(corregida);
    } catch (fallo) {
      setErrorGuardado(fallo);
    } finally {
      setGuardando(false);
    }
  };

  let cuerpo;

  if (error) {
    cuerpo = h(MensajeError, { error });
  } else if (!toma) {
    cuerpo = h(Cargando, { texto: "Cargando la asistencia..." });
  } else {
    cuerpo = h(
      "div",
      { className: "portal-toma" },
      h("p", { className: "portal-toma__meta" }, `${toma.curso} · ${toma.materia} · ${fechaLegible(toma.fecha)}`),
      h(ResumenChips, { resumen: resumenRegistros(alumnos, registros) }),
      errorGuardado ? h(MensajeError, { error: errorGuardado }) : null,
      h(
        "ol",
        { className: "portal-lista-asistencia" },
        alumnos.map((alumno) =>
          h(
            "li",
            { key: alumno.id },
            h("span", { className: "portal-lista-asistencia__nombre" }, `${alumno.apellido}, ${alumno.nombre}`),
            h(SelectorEstado, {
              nombre: `${alumno.apellido}, ${alumno.nombre}`,
              valor: registros[alumno.id],
              deshabilitado: !editando || guardando,
              onChange: (estado) => setRegistros((actual) => ({ ...actual, [alumno.id]: estado }))
            })
          )
        )
      ),
      toma.historial?.length
        ? h(
            "div",
            { className: "portal-toma__historial" },
            h("strong", null, "Correcciones"),
            h(
              "ul",
              null,
              toma.historial.map((entrada, indice) =>
                h("li", { key: indice }, `${fechaHora(entrada.modificadoEn)} · antes: ${entrada.resumenAnterior.presente} P, ${entrada.resumenAnterior.ausente} A, ${entrada.resumenAnterior.tarde} T`)
              )
            )
          )
        : null,
      !puedeCorregir ? h("p", { className: "portal-panel__texto--suave" }, "Solo quien tomó la asistencia puede corregirla.") : null
    );
  }

  const acciones = h(
    Acciones,
    null,
    editando
      ? [
          h(Boton, { key: "c", variante: "texto", deshabilitado: guardando, onClick: () => setEditando(false) }, "Cancelar"),
          h(Boton, { key: "g", variante: "primario", cargando: guardando, onClick: guardar }, "Guardar corrección")
        ]
      : [
          puedeCorregir ? h(Boton, { key: "e", variante: "contorno", onClick: () => setEditando(true) }, "Corregir") : null,
          h(Boton, { key: "x", variante: "primario", onClick: alCerrar }, "Cerrar")
        ]
  );

  return h(
    Modal,
    { abierto: Boolean(id), titulo: "Asistencia registrada", tamano: "grande", onCerrar: alCerrar, acciones, cargando: guardando },
    cuerpo
  );
}

export function HistorialTomas({ cursoId = null, clases = [], servicio = PortalDocenteService, puedeCorregir = corregirSoloQuienTomo }) {
  const [filtros, setFiltros] = useState({ cursoId: cursoId ?? "", desde: "", hasta: "" });
  const [tomas, setTomas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [abierta, setAbierta] = useState(null);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    servicio.tomas({ cursoId: filtros.cursoId || undefined, desde: filtros.desde, hasta: filtros.hasta })
      .then((lista) => {
        if (vigente) {
          setTomas(Array.isArray(lista) ? lista : []);
          setError(null);
        }
      })
      .catch((fallo) => vigente && setError(fallo))
      .finally(() => vigente && setCargando(false));

    return () => {
      vigente = false;
    };
  }, [filtros, recarga, servicio]);

  const cambiar = (campo) => (evento) => setFiltros((actual) => ({ ...actual, [campo]: evento.target.value }));
  const divisiones = [...new Map(clases.map((clase) => [clase.cursoId, clase])).values()];

  let lista;

  if (error) {
    lista = h(MensajeError, { error, onReintentar: () => setRecarga((valor) => valor + 1) });
  } else if (cargando) {
    lista = h(Cargando, { texto: "Cargando asistencias..." });
  } else if (!tomas.length) {
    lista = h(SinDatos, {
      titulo: "No hay asistencias registradas",
      descripcion: filtros.desde || filtros.hasta ? "Probá con otro rango de fechas." : "Las asistencias que tomes van a aparecer acá."
    });
  } else {
    lista = h(
      "ul",
      { className: "portal-tomas" },
      tomas.map((toma) =>
        h(
          "li",
          { key: toma.id, className: "portal-tomas__item" },
          h(
            "div",
            { className: "portal-tomas__info" },
            h("strong", null, fechaLegible(toma.fecha)),
            h("span", null, `${toma.curso} · ${toma.materia}`),
            toma.correcciones ? h("span", { className: "portal-tomas__corregida" }, toma.correcciones === 1 ? "Corregida 1 vez" : `Corregida ${toma.correcciones} veces`) : null
          ),
          h(ResumenChips, { resumen: { ...toma.resumen, sinMarcar: 0 } }),
          h(Boton, { variante: "contorno", tamano: "chico", onClick: () => setAbierta(toma.id), "aria-label": `Ver asistencia del ${fechaLegible(toma.fecha)}` }, "Ver")
        )
      )
    );
  }

  return h(
    "div",
    { className: "portal-historial" },
    h(
      "div",
      { className: "portal-filtros", role: "search" },
      cursoId
        ? null
        : h(
            "label",
            { className: "portal-filtros__campo" },
            "División",
            h(
              "select",
              { value: filtros.cursoId, onChange: cambiar("cursoId") },
              h("option", { value: "" }, "Todas"),
              divisiones.map((clase) => h("option", { key: clase.cursoId, value: clase.cursoId }, `${clase.anio}° año · División ${clase.division}`))
            )
          ),
      h("label", { className: "portal-filtros__campo" }, "Desde", h("input", { type: "date", value: filtros.desde, max: hoyLocal(), onChange: cambiar("desde") })),
      h("label", { className: "portal-filtros__campo" }, "Hasta", h("input", { type: "date", value: filtros.hasta, max: hoyLocal(), onChange: cambiar("hasta") }))
    ),
    aviso ? h(Alerta, { tono: "exito", onCerrar: () => setAviso(null) }, aviso) : null,
    lista,
    h(TomaDetalleModal, {
      id: abierta,
      servicio,
      puedeCorregir,
      alCerrar: () => setAbierta(null),
      alCorregir: () => {
        setAviso("La corrección quedó guardada con tu usuario y la fecha y hora.");
        setRecarga((valor) => valor + 1);
      }
    })
  );
}
