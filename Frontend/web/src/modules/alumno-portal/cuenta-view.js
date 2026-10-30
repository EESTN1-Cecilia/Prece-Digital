/* Mi Cuenta: datos de acceso, cambio de contraseña y de usuario. */

import { useState } from "react";
import { h, Cargando, CampoTexto, Encabezado, ErrorCarga, Requisitos, Tarjeta, fechaCorta, useDatos } from "./componentes.js";
import { USUARIO_RE, cambiarPassword, cambiarUsuario, obtenerCuenta, requisitosPassword } from "./portal-api.js";

function useFormulario(inicial) {
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (valor) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: null }));
    setAviso(null);
  };

  return { datos, setDatos, errores, setErrores, aviso, setAviso, enviando, setEnviando, cambiar };
}

function FormularioPassword({ cuenta, onListo }) {
  const form = useFormulario({ passwordActual: "", passwordNueva: "", confirmacion: "" });
  const requisitos = requisitosPassword(form.datos.passwordNueva, { dni: cuenta.dni, usuario: cuenta.usuario });

  async function enviar(evento) {
    evento.preventDefault();
    const errores = {};
    if (!form.datos.passwordActual) errores.passwordActual = "Ingresá tu contraseña actual.";
    if (!requisitos.every((item) => item.cumple)) errores.passwordNueva = "La contraseña nueva no cumple los requisitos.";
    if (form.datos.confirmacion !== form.datos.passwordNueva) errores.confirmacion = "La confirmación no coincide.";
    if (Object.keys(errores).length) return form.setErrores(errores);

    form.setEnviando(true);
    try {
      await cambiarPassword(form.datos);
      form.setDatos({ passwordActual: "", passwordNueva: "", confirmacion: "" });
      form.setAviso({ tipo: "ok", texto: "Contraseña actualizada. Se cerraron las otras sesiones abiertas." });
      onListo();
    } catch (fallo) {
      form.setErrores(fallo?.campos ?? {});
      form.setAviso({ tipo: "error", texto: fallo.mensaje });
    } finally {
      form.setEnviando(false);
    }
  }

  return h(
    Tarjeta,
    { titulo: "Cambiar contraseña" },
    form.aviso ? h("div", { className: `pa-aviso pa-aviso--${form.aviso.tipo}`, role: "status" }, form.aviso.texto) : null,
    h(
      "form",
      { className: "pa-formulario", onSubmit: enviar, noValidate: true },
      h(CampoTexto, { id: "cta-actual", etiqueta: "Contraseña actual", tipo: "password", valor: form.datos.passwordActual, onCambiar: form.cambiar("passwordActual"), error: form.errores.passwordActual, autoComplete: "current-password", requerido: true }),
      h(CampoTexto, { id: "cta-nueva", etiqueta: "Contraseña nueva", tipo: "password", valor: form.datos.passwordNueva, onCambiar: form.cambiar("passwordNueva"), error: form.errores.passwordNueva, autoComplete: "new-password", requerido: true }),
      h(Requisitos, { lista: requisitos }),
      h(CampoTexto, { id: "cta-confirmacion", etiqueta: "Repetí la contraseña nueva", tipo: "password", valor: form.datos.confirmacion, onCambiar: form.cambiar("confirmacion"), error: form.errores.confirmacion, autoComplete: "new-password", requerido: true }),
      h("button", { type: "submit", className: "pa-boton pa-boton--primario", disabled: form.enviando }, form.enviando ? "Guardando..." : "Cambiar contraseña")
    )
  );
}

function FormularioUsuario({ cuenta, onListo }) {
  const form = useFormulario({ usuario: "", passwordActual: "" });

  async function enviar(evento) {
    evento.preventDefault();
    const usuario = form.datos.usuario.trim().toLowerCase();
    const errores = {};
    if (!USUARIO_RE.test(usuario)) errores.usuario = "Entre 4 y 40 caracteres: letras, números, punto, guion o guion bajo (puede terminar en @alumno.prece.local).";
    else if (/^\d+$/.test(usuario) && usuario !== cuenta.dni) errores.usuario = "Un usuario solo numérico tiene que ser tu DNI.";
    if (!form.datos.passwordActual) errores.passwordActual = "Confirmá con tu contraseña.";
    if (Object.keys(errores).length) return form.setErrores(errores);

    form.setEnviando(true);
    try {
      await cambiarUsuario({ usuario, passwordActual: form.datos.passwordActual });
      form.setDatos({ usuario: "", passwordActual: "" });
      form.setAviso({ tipo: "ok", texto: `Tu usuario ahora es ${usuario}.` });
      onListo();
    } catch (fallo) {
      form.setErrores(fallo?.campos ?? {});
      form.setAviso({ tipo: "error", texto: fallo.mensaje });
    } finally {
      form.setEnviando(false);
    }
  }

  return h(
    Tarjeta,
    { titulo: "Cambiar usuario" },
    form.aviso ? h("div", { className: `pa-aviso pa-aviso--${form.aviso.tipo}`, role: "status" }, form.aviso.texto) : null,
    h(
      "form",
      { className: "pa-formulario", onSubmit: enviar, noValidate: true },
      h(CampoTexto, { id: "usr-nuevo", etiqueta: "Usuario nuevo", valor: form.datos.usuario, onCambiar: form.cambiar("usuario"), error: form.errores.usuario, autoComplete: "username", requerido: true }),
      h(CampoTexto, { id: "usr-clave", etiqueta: "Contraseña", tipo: "password", valor: form.datos.passwordActual, onCambiar: form.cambiar("passwordActual"), error: form.errores.passwordActual, autoComplete: "current-password", requerido: true }),
      h("button", { type: "submit", className: "pa-boton pa-boton--secundario", disabled: form.enviando }, form.enviando ? "Guardando..." : "Cambiar usuario")
    )
  );
}

export default function CuentaAlumnoView() {
  const { cargando, error, datos: cuenta, recargar } = useDatos(() => obtenerCuenta(), []);

  if (cargando && !cuenta) return h(Cargando);
  if (error) return h(ErrorCarga, { error, onReintentar: recargar });

  return h(
    "div",
    { className: "pa-pagina" },
    h(Encabezado, { titulo: "Mi Cuenta", descripcion: "Tus datos de acceso al portal." }),
    h(
      Tarjeta,
      { titulo: "Acceso" },
      h(
        "dl",
        { className: "pa-datos" },
        h("div", { className: "pa-dato" }, h("dt", null, "Usuario"), h("dd", null, cuenta.usuario)),
        h("div", { className: "pa-dato" }, h("dt", null, "DNI"), h("dd", null, cuenta.dni)),
        h("div", { className: "pa-dato" }, h("dt", null, "Contraseña actualizada"), h("dd", null, cuenta.passwordActualizadaEn ? fechaCorta(cuenta.passwordActualizadaEn) : "—")),
        h("div", { className: "pa-dato" }, h("dt", null, "Último ingreso"), h("dd", null, cuenta.ultimoIngreso ? fechaCorta(cuenta.ultimoIngreso) : "—"))
      ),
      h("p", { className: "pa-nota" }, "También podés ingresar con tu DNI como usuario, siempre con tu contraseña nueva.")
    ),
    h("div", { className: "pa-columnas" }, h(FormularioPassword, { cuenta, onListo: recargar }), h(FormularioUsuario, { cuenta, onListo: recargar }))
  );
}
