/* Modal de modificacion de roles y permisos.

   Comparte la tarjeta de rol con el alta de perfiles, asi que las dos pantallas
   muestran exactamente los mismos roles con el mismo comportamiento de casilla.

   Si el usuario cambia algo y cierra sin guardar, se le avisa antes de perder
   los cambios. */

import React, { useEffect, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Modal, Confirmacion, Acciones, Boton, MensajeError } from "../../../components/ui/index.js";
import { ROLES_DISPONIBLES, DirectorService } from "../director-service.js";
import { RoleGrid } from "./role-card.js";

function rolesDe(usuario) {
  return (usuario?.roles ?? []).map((rol) => (typeof rol === "string" ? rol : rol.id)).filter(Boolean);
}

function mismosRoles(uno, otro) {
  if (uno.length !== otro.length) {
    return false;
  }

  return uno.every((rol) => otro.includes(rol));
}

export function EditarRolesModal({ usuario, abierto, alCerrar, alRolesActualizados }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const [iniciales, setIniciales] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [avisarDescarte, setAvisarDescarte] = useState(false);

  useEffect(() => {
    if (!abierto || !usuario) {
      return;
    }

    const roles = rolesDe(usuario);
    setSeleccionados(roles);
    setIniciales(roles);
    setError(null);
    setAvisarDescarte(false);
  }, [abierto, usuario]);

  const alternar = (marcado, rolId) => {
    setSeleccionados((previos) =>
      marcados ? [...previos, rolId] : previos.filter((rol) => rol !== rolId)
    );
  };

  const hayCambios = !mismosRoles(seleccionados, iniciales);

  const cerrar = () => {
    setError(null);
    setAvisarDescarte(false);
    alCerrar();
  };

  const pedirCierre = () => {
    if (guardando) {
      return;
    }

    if (hayCambios) {
      setAvisarDescarte(true);
      return;
    }

    cerrar();
  };

  const guardar = async (evento) => {
    evento.preventDefault();

    if (guardando) {
      return;
    }

    if (seleccionados.length === 0) {
      setError({ mensaje: "Asigná al menos un rol al usuario." });
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      await DirectorService.actualizarRoles(usuario.id, seleccionados);
      alRolesActualizados?.(usuario.id, seleccionados);
      cerrar();
    } catch (fallo) {
      setError(fallo);
    } finally {
      setGuardando(false);
    }
  };

  if (!usuario) {
    return null;
  }

  return h(
    React.Fragment,
    null,
    h(
      Modal,
      {
        abierto,
        titulo: "Modificar Roles y Permisos",
        descripcion: `Usuario: ${usuario.nombreCompleto} (${usuario.email})`,
        tamano: "medio",
        className: "director-modal",
        classNameFondo: "director-modal-fondo",
        onCerrar: pedirCierre,
        cargando: guardando,
        acciones: h(
          Acciones,
          null,
          h(Boton, { variante: "secundario", onClick: pedirCierre, deshabilitado: guardando }, "Cancelar"),
          h(
            Boton,
            {
              variante: "primario",
              tipo: "submit",
              form: "formulario-editar-roles",
              cargando: guardando
            },
            "Guardar Roles Asignados"
          )
        )
      },
      h(
        "form",
        { id: "formulario-editar-roles", onSubmit: guardar, noValidate: true, className: "director-modal-form" },
        error ? h(MensajeError, { error }) : null,
        h(RoleGrid, {
          roles: ROLES_DISPONIBLES,
          seleccionados,
          onChange: alternar
        }),
        hayCambios
          ? h("p", { className: "director-roles-sublabel" }, "Hay cambios sin guardar en la asignación de roles.")
          : null
      )
    ),
    h(Confirmacion, {
      abierto: avisarDescarte,
      titulo: "Descartar los cambios",
      mensaje: "La asignación de roles fue modificada y no se guardó. Si cerrás ahora se pierde.",
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
