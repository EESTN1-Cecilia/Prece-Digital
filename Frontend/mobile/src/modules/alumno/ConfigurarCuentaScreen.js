/* Primer ingreso: cambio obligatorio de la contrasena inicial (el DNI) y,
   si el alumno quiere, un usuario propio. Hasta completarlo el Backend no
   entrega informacion academica (403 PASSWORD_CHANGE_REQUIRED). */

import React from "react";

import { configurarCuenta } from "../../services/alumno-api.js";
import { validarUsuario } from "../../utils/alumno-reglas.js";
import { Encabezado, Nota, Pantalla, Tarjeta, h } from "./componentes.js";
import FormularioPassword from "./FormularioPassword.js";

export default function ConfigurarCuentaScreen({ cuenta, onConfigurada }) {
  async function enviar(datos) {
    const usuario = datos.usuario.trim().toLowerCase();
    const errorUsuario = usuario ? validarUsuario(usuario, { dni: cuenta?.dni }) : null;

    if (errorUsuario) {
      const fallo = new Error(errorUsuario);
      fallo.campos = { usuario: errorUsuario };
      throw fallo;
    }

    const actualizada = await configurarCuenta({ ...datos, usuario: usuario || undefined });
    onConfigurada(actualizada);
  }

  return h(
    Pantalla,
    null,
    h(Encabezado, { titulo: "Configurá tu cuenta", descripcion: `Hola${cuenta?.nombre ? `, ${cuenta.nombre}` : ""}.` }),
    h(
      Tarjeta,
      { titulo: "Cambiá tu contraseña inicial" },
      h(Nota, null, "Antes de ver tu información tenés que cambiar la contraseña inicial. Tu DNI deja de servir como contraseña."),
      h(FormularioPassword, { cuenta, conUsuario: true, textoBoton: "Guardar y continuar", ayudaActual: "Es tu DNI.", onEnviar: enviar })
    )
  );
}
