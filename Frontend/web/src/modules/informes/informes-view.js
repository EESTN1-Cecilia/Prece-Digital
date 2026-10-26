/* Modulo de Informes de Direccion.

   Vive dentro del panel de Direccion (es una pestana, no una pagina nueva).
   La pantalla se organiza en un unico panel con dos columnas:

   - columna lateral: historial, plantillas, estado y acciones del documento;
   - columna principal: la fila de metadatos (titulo, asunto, dirigido a,
     autor y cargo) y el editor con la barra de formato de dos filas.

   La hoja A4 no se renderiza de forma continua: se genera solo cuando el
   usuario abre la vista previa desde el boton correspondiente. Ahi se dibuja
   con su medida real (210 mm x 297 mm) y se escala al ancho del modal para
   respetar la proporcion A4 sin deformarla.

   El contenido se guarda en el backend, que lo sanea y deja un historial de
   versiones. La exportacion a PDF la hace el servidor: el boton descarga el
   archivo que genera, no arma el documento en el navegador. */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import {
  Boton,
  Campo,
  Select,
  Modal,
  Confirmacion,
  Acciones,
  MensajeError,
  Cargando
} from "../../components/ui/index.js";
import { InformesService, descargarArchivo } from "./informes-service.js";
import { EditorInforme, saneaHtml } from "./informes-editor.js";
import {
  ESTADOS_INFORME,
  metadatosVacios,
  validarMetadatos,
  textoPlano,
  contarPalabras,
  nombreDeArchivo,
  contenidoDePlantilla,
  fechaCorta,
  etiquetaEstado
} from "./informes-datos.js";

function iniciales(titulo) {
  return String(titulo ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0).toUpperCase())
    .join("");
}

/* Hoja del documento en formato A4. Se usa para editar y para la vista previa:
   lo unico que cambia es si el cuerpo es editable. */
function HojaInforme({ metadatos, contenido, institucion, editable = false, onCambio }) {
  const cuerpo = h("div", {
    className: "informes-hoja__cuerpo",
    contentEditable: editable || undefined,
    suppressContentEditableWarning: true,
    role: editable ? "textbox" : undefined,
    "aria-multiline": editable ? "true" : undefined,
    "aria-label": editable ? "Contenido del informe" : undefined,
    onInput: editable ? (evento) => onCambio?.(evento.currentTarget.innerHTML) : undefined,
    dangerouslySetInnerHTML: { __html: saneaHtml(contenido) }
  });

  return h(
    "article",
    { className: "informes-hoja" },
    h(
      "header",
      { className: "informes-hoja__cabecera" },
      h(
        "div",
        { className: "informes-hoja__marca" },
        h("img", {
          className: "informes-hoja__logo",
          src: institucion?.logo ?? "/logo_vertical.jpg",
          alt: "Logo institucional de la E.E.S.T. N.º 1 Monte Grande"
        }),
        h(
          "div",
          { className: "informes-hoja__identidad" },
          h("p", { className: "informes-hoja__institucion" }, institucion?.nombre ?? "Institución"),
          h("p", { className: "informes-hoja__dependencia" }, institucion?.dependencia ?? "Dirección General")
        )
      ),
      h("p", { className: "informes-hoja__ciclo" }, `Ciclo Lectivo ${institucion?.cicloLectivo ?? "—"}`)
    ),
    h(
      "div",
      { className: "informes-hoja__titulos" },
      h("h2", { className: "informes-hoja__titulo" }, metadatos.titulo || "Informe sin título"),
      metadatos.asunto ? h("p", { className: "informes-hoja__asunto" }, metadatos.asunto) : null
    ),
    cuerpo,
    h(
      "footer",
      { className: "informes-hoja__pie" },
      h("span", null, `${institucion?.nombre ?? "Institución"} · Ciclo Lectivo ${institucion?.cicloLectivo ?? "—"}`),
      h("span", { className: "informes-hoja__pagina" }, "Página 1")
    )
  );
}

export function InformesView({ institucion = null, onAviso = null }) {
  const [plantillas, setPlantillas] = useState([]);
  const [informes, setInformes] = useState([]);
  const [borrador, setBorrador] = useState(metadatosVacios());
  const [contenido, setContenido] = useState("");
  const [errores, setErrores] = useState({});
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const avisar = useCallback(
    (texto) => {
      onAviso?.(texto);
      setMensaje(texto);
    },
    [onAviso]
  );

  const cargarHistorial = useCallback(async () => {
    setCargandoHistorial(true);

    try {
      const { items } = await InformesService.listarInformes({ porPagina: 50 });
      setInformes(Array.isArray(items) ? items : []);
    } catch (error) {
      setErrorGlobal(error);
    } finally {
      setCargandoHistorial(false);
    }
  }, []);

  useEffect(() => {
    let vigente = true;

    const cargar = async () => {
      try {
        const catalogo = await InformesService.listarPlantillas();

        if (vigente) {
          setPlantillas(Array.isArray(catalogo) ? catalogo : []);
        }
      } catch (error) {
        if (vigente) {
          setErrorGlobal(error);
        }
      }

      await cargarHistorial();

      if (vigente) {
        setCargando(false);
      }
    };

    cargar();

    return () => {
      vigente = false;
    };
  }, [cargarHistorial]);

  /* Atajos de teclado del editor: Ctrl+S guarda, Ctrl+B negrita. */
  useEffect(() => {
    const alTeclear = (evento) => {
      if (!(evento.ctrlKey || evento.metaKey)) {
        return;
      }

      if (evento.key.toLowerCase() === "s") {
        evento.preventDefault();
        guardar();
      }
    };

    document.addEventListener("keydown", alTeclear);

    return () => {
      document.removeEventListener("keydown", alTeclear);
    };
  });

  const cambiarMeta = (campo) => (valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: null } : previos));
  };

  /* Empezar un informe en blanco: se descarta lo que habia en pantalla. */
  const crearNuevo = () => {
    setBorrador(metadatosVacios());
    setContenido("");
    setErrores({});
    setErrorGlobal(null);
    avisar("Nuevo informe en blanco. Completá el título y el contenido antes de guardarlo.");
  };

  /* Empezar un informe desde una plantilla institucional. El esqueleto de los
     apartados sale del catalogo que publica el backend. */
  const usarPlantilla = (plantilla) => {
    setBorrador({ ...metadatosVacios(), plantilla: plantilla.id, titulo: plantilla.nombre });
    setContenido(contenidoDePlantilla(plantilla));
    setErrores({});
    setErrorGlobal(null);
    avisar(`Se abrió el esqueleto de la plantilla "${plantilla.nombre}".`);
  };

  /* Cargar un informe guardado: el listado ya trae el contenido. */
  const abrirInforme = (informe) => {
    setBorrador({
      id: informe.id,
      titulo: informe.titulo ?? "",
      asunto: informe.asunto ?? "",
      dirigidoA: informe.dirigidoA ?? "",
      autor: informe.autor ?? "",
      autorCargo: informe.autorCargo ?? "",
      estado: informe.estado ?? "borrador",
      plantilla: informe.plantilla ?? null,
      versiones: informe.versiones ?? []
    });
    setContenido(informe.contenido ?? "");
    setErrores({});
    setErrorGlobal(null);
  };

  const guardar = async () => {
    const { errores: foundos, datos } = validarMetadatos({ ...borrador, contenido });
    setErrores(foundos);

    if (Object.keys(foundos).length) {
      setMensaje("Revisá los campos marcados antes de guardar el informe.");
      return null;
    }

    setGuardando(true);
    setErrorGlobal(null);

    try {
      const payload = { ...datos, plantilla: borrador.plantilla ?? null };

      const guardado = borrador.id
        ? await InformesService.actualizarInforme(borrador.id, payload)
        : await InformesService.crearInforme(payload);

      setBorrador((previo) => ({ ...previo, ...guardado, id: guardado.id }));
      await cargarHistorial();
      avisar("Informe guardado correctamente.");

      return guardado;
    } catch (error) {
      if (error?.campos) {
        setErrores((previos) => ({ ...previos, ...error.campos }));
      }

      setErrorGlobal(error);
      return null;
    } finally {
      setGuardando(false);
    }
  };

  /* El PDF lo arma el servidor con el informe guardado: si el documento todavia
     no existe, primero se guarda y recien despues se exporta. */
  const exportar = async () => {
    setExportando(true);
    setErrorGlobal(null);

    try {
      let id = borrador.id;

      if (!id) {
        const guardado = await guardar();
        id = guardado?.id ?? null;

        if (!id) {
          return;
        }
      }

      const { blob, nombre } = await InformesService.exportarPdf(id);

      descargarArchivo({
        blob,
        nombre: nombre || `${nombreDeArchivo(borrador.titulo)}.pdf`
      });

      avisar("El PDF del informe se descargó correctamente.");
    } catch (error) {
      setErrorGlobal(error);
    } finally {
      setExportando(false);
    }
  };

  const darDeBaja = async () => {
    setConfirmarBaja(false);

    if (!borrador.id) {
      return;
    }

    try {
      await InformesService.eliminarInforme(borrador.id);
      setBorrador(metadatosVacios());
      setContenido("");
      await cargarHistorial();
      avisar("El informe se dio de baja.");
    } catch (error) {
      setErrorGlobal(error);
    }
  };

  const restaurarVersion = async (version) => {
    if (!borrador.id) {
      return;
    }

    try {
      const restaurado = await InformesService.restaurarVersion(borrador.id, version.version);
      setBorrador((previo) => ({ ...previo, ...restaurado, id: restaurado.id }));
      setContenido(restaurado.contenido ?? "");
      await cargarHistorial();
      avisar(`Se restauró la versión ${version.version} del informe.`);
    } catch (error) {
      setErrorGlobal(error);
    }
  };

  const palabras = useMemo(() => contarPalabras(contenido), [contenido]);
  const versiones = borrador.versiones ?? [];

  /* Columna lateral: historial, plantillas, estado y acciones. */
  const lateral = h(
    "aside",
    { className: "informes-lateral", "aria-label": "Panel de informes" },
    h(
      "div",
      { className: "informes-lateral__cabecera" },
      h("h2", { className: "informes-lateral__titulo" }, "Informes de Dirección"),
      h(
        "p",
        { className: "informes-lateral__subtitulo" },
        "Redacción, historial y exportación de documentos institucionales."
      )
    ),
    h(
      "div",
      { className: "informes-lateral__acciones" },
      h(
        Boton,
        { variante: "primario", ancho: true, icono: "clipboard", onClick: crearNuevo },
        "Crear Nuevo Informe"
      )
    ),

    /* Historial de informes guardados. */
    h(
      "section",
      { className: "informes-lateral__bloque" },
      h("h3", { className: "informes-lateral__titulo-bloque" }, "Historial"),
      cargandoHistorial
        ? h(Cargando, { texto: "Cargando informes..." })
        : informes.length === 0
          ? h("p", { className: "informes-lateral__vacio" }, "Todavía no hay informes guardados.")
          : h(
              "ul",
              { className: "informes-historial" },
              informes.map((informe) =>
                h(
                  "li",
                  { key: informe.id },
                  h(
                    "button",
                    {
                      type: "button",
                      className:
                        informe.id === borrador.id
                          ? "informes-historial__item informes-historial__item--activo"
                          : "informes-historial__item",
                      onClick: () => abrirInforme(informe)
                    },
                    h(
                      "span",
                      { className: "informes-historial__marca" },
                      iniciales(informe.titulo) || "IN"
                    ),
                    h(
                      "span",
                      { className: "informes-historial__texto" },
                      h("strong", { className: "informes-historial__titulo" }, informe.titulo),
                      h(
                        "span",
                        { className: "informes-historial__meta" },
                        `${etiquetaEstado(informe.estado)} · ${fechaCorta(informe.actualizadoEn ?? informe.creadoEn)}`
                      )
                    )
                  )
                )
              )
            )
    ),

    /* Plantillas institucionales: las define el backend. */
    h(
      "section",
      { className: "informes-lateral__bloque" },
      h("h3", { className: "informes-lateral__titulo-bloque" }, "Plantillas"),
      plantillas.length === 0
        ? h("p", { className: "informes-lateral__vacio" }, "No hay plantillas disponibles.")
        : h(
            "ul",
            { className: "informes-plantillas" },
            plantillas.map((plantilla) =>
              h(
                "li",
                { key: plantilla.id },
                h(
                  "button",
                  {
                    type: "button",
                    className:
                      borrador.plantilla === plantilla.id
                        ? "informes-plantilla informes-plantilla--activa"
                        : "informes-plantilla",
                    onClick: () => usarPlantilla(plantilla)
                  },
                  h("strong", null, plantilla.nombre),
                  h("span", { className: "informes-plantilla__descripcion" }, plantilla.descripcion)
                )
              )
            )
          )
    ),

    /* Estado del documento. */
    h(
      "section",
      { className: "informes-lateral__bloque" },
      h("h3", { className: "informes-lateral__titulo-bloque" }, "Estado"),
      h(Select, {
        id: "informe-estado",
        etiqueta: "Estado del informe",
        valor: borrador.estado,
        onChange: cambiarMeta("estado"),
        error: errores.estado,
        opciones: ESTADOS_INFORME
      }),
      borrador.id && borrador.estado === "borrador"
        ? h(
            "button",
            {
              type: "button",
              className: "informes-lateral__baja",
              onClick: () => setConfirmarBaja(true)
            },
            "Dar de baja el informe"
          )
        : null
    ),

    /* Versiones guardadas del informe abierto. */
    versiones.length
      ? h(
          "section",
          { className: "informes-lateral__bloque" },
          h("h3", { className: "informes-lateral__titulo-bloque" }, "Versiones"),
          h(
            "ul",
            { className: "informes-versiones" },
            versiones
              .slice()
              .reverse()
              .map((version) =>
                h(
                  "li",
                  { key: version.version },
                  h(
                    "button",
                    {
                      type: "button",
                      className: "informes-version",
                      onClick: () => restaurarVersion(version)
                    },
                    h("strong", null, `Versión ${version.version}`),
                    h("span", { className: "informes-version__meta" }, fechaCorta(version.guardadoEn))
                  )
                )
              )
          )
        )
      : null,

    /* Acciones del documento (movidas al formulario principal). */
  );

  /* Row de metadatos del documento. */
  const metadatos = h(
    "div",
    { className: "informes-metadatos" },
    h(
      "div",
      { className: "informes-metadatos__campo" },
      h(Campo, {
        id: "informe-titulo",
        etiqueta: "Título",
        valor: borrador.titulo,
        onChange: cambiarMeta("titulo"),
        error: errores.titulo,
        requerido: true,
        placeholder: "Título del informe"
      })
    ),
    h(
      "div",
      { className: "informes-metadatos__campo" },
      h(Campo, {
        id: "informe-asunto",
        etiqueta: "Asunto",
        valor: borrador.asunto,
        onChange: cambiarMeta("asunto"),
        placeholder: "Asunto de la comunicación"
      })
    ),
    h(
      "div",
      { className: "informes-metadatos__campo" },
      h(Campo, {
        id: "informe-dirigido-a",
        etiqueta: "Dirigido a",
        valor: borrador.dirigidoA,
        onChange: cambiarMeta("dirigidoA"),
        placeholder: "Destinatario del informe"
      })
    ),
    h(
      "div",
      { className: "informes-metadatos__campo informes-metadatos__campo--autor" },
      h(Campo, {
        id: "informe-autor",
        etiqueta: "Autor",
        valor: borrador.autor,
        onChange: cambiarMeta("autor"),
        placeholder: "Nombre de quien firma"
      }),
      h(Campo, {
        id: "informe-autor-cargo",
        etiqueta: "Cargo",
        valor: borrador.autorCargo,
        onChange: cambiarMeta("autorCargo"),
        placeholder: "Cargo del autor"
      })
    )
  );

  /* Editor: la hoja A4 con la barra de formato encima. */
  const area = h(
    "div",
    { className: "informes-area" },
    errorGlobal
      ? h(MensajeError, { error: errorGlobal, onReintentar: cargarHistorial })
      : null,
    mensaje ? h("p", { className: "informes-area__aviso", role: "status" }, mensaje) : null,
    h(
      "form",
      {
        className: "informes-form",
        onSubmit: (evento) => {
          evento.preventDefault();
          guardar();
        }
      },
      h(
        "section",
        { className: "informes-form__campos" },
        metadatos,
        h(
          "div",
          { className: "informes-area__editor" },
          h(EditorInforme, {
            valor: contenido,
            onChange: setContenido,
            error: errores.contenido
          }),
          h(
            "p",
            { className: "informes-area__contador" },
            `${palabras} palabras · ${textoPlano(contenido).length} caracteres`
          )
        )
      ),
      h(
        "div",
        { className: "informes-form__acciones" },
        h(
          Boton,
          { variante: "primario", tipo: "submit", cargando: guardando },
          "Guardar"
        ),
        h(
          Boton,
          { variante: "secundario", tipo: "button", cargando: exportando, onClick: exportar },
          "Exportar PDF"
        ),
        h(
          Boton,
          { variante: "contorno", tipo: "button", onClick: () => setVistaPrevia(true) },
          "Vista previa"
        )
      )
    )
  );

  return h(
    "div",
    { className: "informes-panel" },
    cargando
      ? h(Cargando, { texto: "Cargando los informes de dirección..." })
      : h(
          "main",
          { className: "informes-panel__principal" },
          lateral,
          area
        ),

    /* La hoja A4 se genera solo cuando el usuario abre la vista previa. */
    vistaPrevia
      ? h(
          Modal,
          {
            abierto: vistaPrevia,
            titulo: "Vista previa del informe",
            descripcion: "Así se va a ver el documento antes de exportarlo a PDF.",
            tamano: "grande",
            className: "informes-modal",
            onCerrar: () => setVistaPrevia(false),
            acciones: h(
              Acciones,
              null,
              h(Boton, { variante: "secundario", onClick: () => setVistaPrevia(false) }, "Cerrar"),
              h(Boton, { variante: "primario", cargando: exportando, onClick: exportar }, "Exportar PDF")
            )
          },
          h(HojaInforme, {
            metadatos: borrador,
            contenido,
            institucion
          })
        )
      : null,

    /* Baja logica del informe. */
    h(Confirmacion, {
      abierto: confirmarBaja,
      titulo: "Dar de baja el informe",
      mensaje: "El informe deja de estar disponible, pero queda registrado en el historial del sistema.",
      variante: "peligro",
      textoConfirmar: "Dar de baja",
      onConfirmar: darDeBaja,
      onCancelar: () => setConfirmarBaja(false)
    })
  );
}
