/* Modal de alta de perfiles de personal.

   Usa el modal compartido (portal, trampa de foco, Escape y devolucion del
   foco) y el catalogo real de areas que publica el backend: no se escriben los
   sectores a mano.

   El formulario no pide contrasena: el backend usa el DNI (sin puntos) como
   clave provisoria, guarda solo su hash y obliga a cambiarla en el primer
   ingreso. La clave no viaja en la respuesta ni se muestra aca. */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Modal, Confirmacion, Campo, Select, Acciones, Boton, MensajeError } from "../../../components/ui/index.js";
import { ROLES_DISPONIBLES, DirectorService } from "../director-service.js";
import { RoleGrid } from "./role-card.js";
import {
  AREA_DOCENCIA,
  AREA_POR_DEFECTO,
  DIAS_CURSADA,
  MODULOS_DOCENTES,
  SITUACIONES_REVISTA,
  formularioSucio,
  formularioVacio,
  validarPerfil
} from "../perfil-validacion.js";

/* `rolesIniciales`: roles ya marcados al abrir (por ejemplo, Docente cuando el
   alta se inicia desde el sector Docentes). */
export function NuevoPerfilModal({ abierto, alCerrar, alPerfilCreado, rolesIniciales = [] }) {
  const [form, setForm] = useState(formularioVacio);
  const [errores, setErrores] = useState({});
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [creado, setCreado] = useState(null);
  const [areas, setAreas] = useState([]);
  const [cargandoAreas, setCargandoAreas] = useState(false);
  const [avisarDescarte, setAvisarDescarte] = useState(false);
  /* Candado sincronico contra el doble envio: el estado `guardando` recien se
     ve en el proximo render, un doble clic rapido llegaria antes. */
  const enviando = useRef(false);

  /* Cada vez que se abre el modal arranca en blanco: el formulario anterior
     no puede quedar pegado. */
  useEffect(() => {
    if (!abierto) {
      return;
    }

    setForm({ ...formularioVacio(), roles: [...rolesIniciales] });
    setErrores({});
    setErrorGlobal(null);
    setCreado(null);
    setAvisarDescarte(false);

    let vigente = true;

    setCargandoAreas(true);
    DirectorService.listarAreas()
      .then((catalogo) => {
        if (vigente && Array.isArray(catalogo) && catalogo.length) {
          setAreas(catalogo);
        }
      })
      .catch(() => {
        /* Sin catalogo no se puede elegir area: el error se ve al enviar. */
      })
      .finally(() => {
        if (vigente) {
          setCargandoAreas(false);
        }
      });

    return () => {
      vigente = false;
    };
  }, [abierto]);

  const idsAreas = useMemo(() => areas.map((area) => area.id), [areas]);
  const esDocencia = (form.area || AREA_POR_DEFECTO) === AREA_DOCENCIA;

  const cambiar = (campo) => (valor) => {
    setForm((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: null } : previos));
  };

  const alternarRol = (marcado, rolId) => {
    setForm((previo) => ({
      ...previo,
      roles: marcado
        ? [...previo.roles, rolId]
        : previo.roles.filter((rol) => rol !== rolId)
    }));
    setErrores((previos) => (previos.roles ? { ...previos, roles: null } : previos));
  };

  const cerrar = () => {
    setForm(formularioVacio());
    setErrores({});
    setCreado(null);
    setErrorGlobal(null);
    alCerrar();
  };

  /* Si el usuario escribio algo, cerrar sin guardar pide confirmacion. */
  const pedirCierre = () => {
    if (guardando) {
      return;
    }

    if (!creado && formularioSucio(form)) {
      setAvisarDescarte(true);
      return;
    }

    cerrar();
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    if (enviando.current) {
      return;
    }

    const { errores: foundos, datos } = validarPerfil(form, idsAreas);
    setErrores(foundos);
    setErrorGlobal(null);

    if (Object.keys(foundos).length) {
      return;
    }

    enviando.current = true;
    setGuardando(true);

    try {
      const respuesta = await DirectorService.crearPerfil(datos);
      setCreado(respuesta);
      alPerfilCreado?.(respuesta);
    } catch (error) {
      /* El backend manda los errores por campo: se pintan debajo del input
         que corresponde y el resto va al aviso general. */
      if (error?.campos) {
        setErrores((previos) => ({ ...previos, ...error.campos }));
      }
      setErrorGlobal(error);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  };

  const cuerpo = creado
    ? h(
        "div",
        { className: "director-modal-success-pane" },
        h("h3", { className: "director-success-title" }, "Perfil creado exitosamente"),
        h(
          "p",
          { className: "director-success-desc" },
          "Se generó el acceso institucional para ",
          h("strong", null, creado.displayName || `${creado.nombre} ${creado.apellido}`),
          ` (${creado.email}).`
        ),
        creado.docenteId
          ? h(
              "p",
              { className: "director-success-desc" },
              "Ya figura en el sector Docentes y puede ingresar al ",
              h("a", { href: "#/portal-docente" }, "Portal Docente"),
              "."
            )
          : null,
        h(
          "div",
          { className: "director-temp-password-card" },
          h("span", { className: "director-temp-password-label" }, "Clave de acceso provisoria"),
          h(
            "p",
            { className: "director-temp-password-hint" },
            "Ingresa con su correo institucional y, como clave, su ",
            h("strong", null, "DNI sin puntos"),
            ". En el primer inicio de sesión el sistema le pide elegir una clave nueva antes de continuar."
          )
        )
      )
    : h(
        "form",
        { className: "director-modal-form", id: "formulario-nuevo-perfil", onSubmit: enviar, noValidate: true },

        errorGlobal
          ? h(MensajeError, { error: errorGlobal })
          : null,

        h(
          "div",
          { className: "director-form-grid" },
          h(Campo, {
            id: "perfil-nombre",
            etiqueta: "Nombre",
            valor: form.nombre,
            onChange: cambiar("nombre"),
            error: errores.nombre,
            requerido: true,
            autoComplete: "given-name"
          }),
          h(Campo, {
            id: "perfil-apellido",
            etiqueta: "Apellido",
            valor: form.apellido,
            onChange: cambiar("apellido"),
            error: errores.apellido,
            requerido: true,
            autoComplete: "family-name"
          }),
          h(Campo, {
            id: "perfil-email",
            etiqueta: "Correo institucional",
            tipo: "email",
            valor: form.email,
            onChange: cambiar("email"),
            error: errores.email,
            requerido: true,
            autoComplete: "email"
          }),
          h(Campo, {
            id: "perfil-dni",
            etiqueta: "DNI (sin puntos)",
            valor: form.dni,
            onChange: cambiar("dni"),
            error: errores.dni,
            requerido: true,
            ayuda: "Entre 7 y 9 dígitos."
          }),
          h(Campo, {
            id: "perfil-telefono",
            etiqueta: "Teléfono de contacto",
            tipo: "tel",
            valor: form.telefono,
            onChange: cambiar("telefono"),
            error: errores.telefono,
            ayuda: "Opcional."
          }),
          h(Select, {
            id: "perfil-area",
            etiqueta: "Área institucional",
            valor: form.area || AREA_POR_DEFECTO,
            onChange: cambiar("area"),
            error: errores.area,
            requerido: true,
            deshabilitado: cargandoAreas,
            ayuda: cargandoAreas ? "Cargando el catálogo de áreas..." : "Sector donde se asigna la persona.",
            opciones: areas.map((area) => ({ id: area.id, nombre: area.nombre }))
          })
        ),

        esDocencia
          ? h(
              "section",
              { className: "director-academic-section" },
              h(
                "div",
                { className: "director-academic-header" },
                h("span", { className: "director-form-label" }, "Datos Académicos y Carga Horaria"),
                h(
                  "span",
                  { className: "director-roles-sublabel" },
                  "Información específica del área de Docencia."
                )
              ),
              h(
                "div",
                { className: "director-form-grid" },
                h(Campo, {
                  id: "perfil-materia",
                  etiqueta: "Materia",
                  valor: form.materia,
                  onChange: cambiar("materia"),
                  error: errores.materia,
                  requerido: true
                }),
                h(Select, {
                  id: "perfil-situacion-revista",
                  etiqueta: "Situación de revista",
                  valor: form.situacion_revista,
                  onChange: cambiar("situacion_revista"),
                  error: errores.situacion_revista,
                  requerido: true,
                  placeholder: "Seleccioná una situación",
                  opciones: SITUACIONES_REVISTA
                }),
                /* Ocupa la fila completa para que los pares de abajo
                   (Módulos/Día y Hora de inicio/fin) sigan alineados. */
                form.situacion_revista === "Suplente"
                  ? h(
                      "div",
                      { className: "director-form-grid__completo" },
                      h(Campo, {
                        id: "perfil-suplente-de",
                        etiqueta: "Reemplaza a",
                        valor: form.suplente_de,
                        onChange: cambiar("suplente_de"),
                        error: errores.suplente_de,
                        requerido: true,
                        ayuda: "Nombre del docente titular al que reemplaza."
                      })
                    )
                  : null,
                h(Select, {
                  id: "perfil-modulos",
                  etiqueta: "Módulos",
                  valor: form.modulos,
                  onChange: cambiar("modulos"),
                  error: errores.modulos,
                  requerido: true,
                  placeholder: "Seleccioná los módulos",
                  opciones: MODULOS_DOCENTES.map((modulo) => ({ id: String(modulo), nombre: String(modulo) }))
                }),
                h(Select, {
                  id: "perfil-dia",
                  etiqueta: "Día",
                  valor: form.dia,
                  onChange: cambiar("dia"),
                  error: errores.dia,
                  requerido: true,
                  placeholder: "Seleccioná el día",
                  opciones: DIAS_CURSADA
                }),
                h(Campo, {
                  id: "perfil-hora-desde",
                  etiqueta: "Hora de inicio",
                  tipo: "time",
                  valor: form.hora_desde,
                  onChange: cambiar("hora_desde"),
                  error: errores.hora_desde,
                  requerido: true
                }),
                h(Campo, {
                  id: "perfil-hora-hasta",
                  etiqueta: "Hora de fin",
                  tipo: "time",
                  valor: form.hora_hasta,
                  onChange: cambiar("hora_hasta"),
                  error: errores.hora_hasta,
                  requerido: true
                })
              )
            )
          : null,

        h(
          "div",
          { className: "director-roles-section" },
          h(
            "div",
            { className: "director-roles-header" },
            h("span", { className: "director-form-label" }, "Asignación de roles y permisos"),
            h("span", { className: "director-roles-sublabel" }, "Se puede seleccionar más de un rol.")
          ),
          errores.roles ? h("p", { className: "director-form-error", role: "alert" }, errores.roles) : null,
          h(RoleGrid, {
            roles: ROLES_DISPONIBLES,
            seleccionados: form.roles,
            onChange: alternarRol
          })
        )
      );

  const acciones = creado
    ? h(
        Acciones,
        null,
        h(
          Boton,
          {
            variante: "secundario",
            onClick: () => {
              setCreado(null);
              setForm(formularioVacio());
              setErrores({});
            }
          },
          "Crear otro perfil"
        ),
        h(Boton, { variante: "primario", onClick: cerrar }, "Finalizar")
      )
    : h(
        Acciones,
        null,
        h(Boton, { variante: "secundario", onClick: pedirCierre, deshabilitado: guardando }, "Cancelar"),
        h(
          Boton,
          {
            variante: "primario",
            tipo: "submit",
            form: "formulario-nuevo-perfil",
            cargando: guardando
          },
          "Crear Perfil y Asignar Roles"
        )
      );

  return h(
    React.Fragment,
    null,
    h(
      Modal,
      {
        abierto: abierto,
        titulo: "Crear Nuevo Perfil / Usuario",
        descripcion: "Registra personal institucional y define sus permisos de acceso.",
        tamano: "grande",
        className: "director-modal",
        classNameFondo: "director-modal-fondo",
        onCerrar: pedirCierre,
        acciones,
        cargando: guardando
      },
      cuerpo
    ),
    h(Confirmacion, {
      abierto: avisarDescarte,
      titulo: "Descartar los datos escritos",
      mensaje: "Hay cambios sin guardar en el formulario. Si cerrás ahora se pierden.",
      variante: "advertencia",
      textoConfirmar: "Descartar cambios",
      textoCancelar: "Seguir editando",
      onConfirmar: () => {
        setAvisarDescarte(false);
        cerrar();
      },
      onCancelar: () => setAvisarDescarte(false)
    })
  );
}
