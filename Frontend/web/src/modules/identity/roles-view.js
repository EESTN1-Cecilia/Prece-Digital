import { useEffect, useMemo, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import {
  Alerta,
  Badge,
  BannerOrigen,
  Boton,
  BotonEnlace,
  CargandoPantalla,
  MensajeError
} from "../../components/ui/index.js";
import {
  ACCIONES,
  guardarPermisosDeRol,
  listarModulos,
  listarPermisos,
  listarPermisosDeRol,
  listarRoles
} from "../../services/identity-api.js";
import { PERMISOS, permiso } from "../../utils/permisos.js";
import { usePermisos } from "../../estado/index.js";

export default function RolesView() {
  const { puede } = usePermisos();

  const [roles, setRoles] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [origen, setOrigen] = useState(null);
  const [rolActivo, setRolActivo] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [origenPermisos, setOrigenPermisos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const puedeEditar = puede(PERMISOS.rolesEditar);

  useEffect(() => {
    let vigente = true;
    setCargando(true);

    Promise.all([listarRoles(), listarModulos(), listarPermisos()])
      .then(([respuestaRoles, respuestaModulos, respuestaPermisos]) => {
        if (!vigente) {
          return;
        }

        setRoles(respuestaRoles.data);
        setModulos(respuestaModulos.data);
        setCatalogo(respuestaPermisos.data);
        setOrigen(respuestaRoles.origen);
        setRolActivo((actual) => actual ?? respuestaRoles.data[0]?.id ?? null);
        setError(null);
      })
      .catch((fallo) => {
        if (vigente) {
          setError(fallo);
        }
      })
      .finally(() => {
        if (vigente) {
          setCargando(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!rolActivo) {
      return undefined;
    }

    let vigente = true;
    setAviso(null);

    listarPermisosDeRol(rolActivo)
      .then(({ data, origen: fuente }) => {
        if (vigente) {
          setPermisos(data);
          setOrigenPermisos(fuente);
        }
      })
      .catch((fallo) => {
        if (vigente) {
          setError(fallo);
        }
      });

    return () => {
      vigente = false;
    };
  }, [rolActivo]);

  const alternar = (clave) =>
    setPermisos((actuales) =>
      actuales.includes(clave) ? actuales.filter((valor) => valor !== clave) : [...actuales, clave]
    );

  /* Las columnas son las acciones que el backend declara en su catalogo, ordenadas
     segun ACCIONES. Si el catalogo no esta disponible se muestran todas. */
  const acciones = useMemo(() => {
    if (!catalogo.length) {
      return ACCIONES;
    }

    const declaradas = new Set(catalogo.map((entrada) => entrada.accion));
    return ACCIONES.filter((accion) => declaradas.has(accion.id));
  }, [catalogo]);

  /* Un permiso solo existe si el backend lo declaro para ese modulo y accion. */
  const declarados = useMemo(() => new Set(catalogo.map((entrada) => entrada.id)), [catalogo]);
  const existe = (clave) => !catalogo.length || declarados.has(clave);

  const guardar = async () => {
    setAviso(null);
    setGuardando(true);

    try {
      await guardarPermisosDeRol(rolActivo, permisos);
      setAviso({ tono: "ok", texto: "Permisos actualizados." });
    } catch (fallo) {
      /* Igual que en usuarios: el backend valida aunque el boton este visible. */
      setAviso({ tono: "error", texto: fallo.mensaje });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return h("section", { className: "data-panel" }, h(CargandoPantalla));
  }

  const rol = roles.find((candidato) => candidato.id === rolActivo);


  return h(
    "section",
    { className: "data-panel", "aria-labelledby": "roles-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h("h1", { id: "roles-titulo" }, "Roles y permisos"),
      h(BotonEnlace, { variante: "contorno", href: "#/usuarios" }, "Ver usuarios")
    ),
    error ? h(MensajeError, { error }) : null,
    h(
      "div",
      null,
          h(BannerOrigen, {
            origen,
            detalle: "No se pudo leer GET /api/v1/roles: se muestra el catalogo compartido del proyecto."
          }),
          h(
            "div",
            { className: "data-roles" },
            h(
              "ul",
              { className: "data-roles__lista" },
              roles.map((candidato) =>
                h(
                  "li",
                  { key: candidato.id },
                  h(
                    "button",
                    {
                      className: `data-rol${candidato.id === rolActivo ? " data-rol--activo" : ""}`,
                      type: "button",
                      "aria-pressed": candidato.id === rolActivo,
                      onClick: () => setRolActivo(candidato.id)
                    },
                    candidato.nombre,
                    h("small", null, candidato.alcances?.length ? candidato.alcances.join(" · ") : candidato.id)
                  )
                )
              )
            ),
            rol
              ? h(
                  "section",
                  { className: "data-roles__detalle" },
                  h(
                    "h2",
                    null,
                    rol.nombre,
                    rol.alcances?.map((alcance) => h(Badge, { key: alcance }, alcance))
                  ),
                  h(
                    "p",
                    { className: "data-nota" },
                    `Codigo: ${rol.id}. La matriz se arma con los modulos que informa el backend; cada permiso se envia como "<modulo>:<accion>".`
                  ),
                  h(BannerOrigen, {
                    origen: origenPermisos,
                    detalle: `El backend todavia no expone GET /api/v1/roles/${rol.id}/permissions: la matriz arranca vacia y no refleja permisos vigentes.`
                  }),
                  h(
                    "div",
                    { className: "ui-tabla__scroll" },
                    h(
                      "table",
                      { className: "ui-tabla" },
                      h(
                        "thead",
                        null,
                        h(
                          "tr",
                          null,
                          h("th", { scope: "col" }, "Modulo"),
                          acciones.map((accion) =>
                            h("th", { key: accion.id, scope: "col" }, accion.nombre)
                          )
                        )
                      ),
                      h(
                        "tbody",
                        null,
                        modulos.map((modulo) =>
                          h(
                            "tr",
                            { key: modulo.id },
                            h("th", { scope: "row" }, modulo.nombre),
                            acciones.map((accion) => {
                              const clave = permiso(modulo.id, accion.id);

                              /* El backend no define todas las acciones para todos los
                                 modulos: donde no existe el permiso, no hay casilla. */
                              if (!existe(clave)) {
                                return h("td", { key: accion.id, className: "data-celda-vacia" }, "—");
                              }

                              return h(
                                "td",
                                { key: accion.id },
                                h("input", {
                                  type: "checkbox",
                                  "aria-label": `${modulo.nombre}: ${accion.nombre}`,
                                  checked: permisos.includes(clave),
                                  disabled: !puedeEditar,
                                  onChange: () => alternar(clave)
                                })
                              );
                            })
                          )
                        )
                      )
                    )
                  ),
                  puedeEditar
                    ? h(Boton, { cargando: guardando, onClick: guardar }, "Guardar permisos")
                    : h(
                        "p",
                        { className: "data-nota" },
                        "Solo consulta: tu usuario no tiene permiso para modificar la matriz."
                      ),
                  aviso
                    ? h(Alerta, { tono: aviso.tono === "ok" ? "exito" : aviso.tono }, aviso.texto)
                    : null
                )
              : null
          )
    )
  );
}
