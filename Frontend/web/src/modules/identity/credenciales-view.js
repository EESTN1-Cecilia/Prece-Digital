/* Usuarios y contraseñas (solo SuperAdmin).

   Permite, para el personal y para los alumnos: elegir o cambiar el usuario de
   acceso y restablecer la contraseña (la elige el SuperAdmin o la genera el
   sistema). Una contraseña generada se muestra una sola vez en pantalla. */

import { useEffect, useState } from "react";
import { h } from "../../layouts/site-layout.js";
import { Alerta, Badge, Boton, Campo, CargandoPantalla } from "../../components/ui/index.js";
import { asignarCredenciales, listarCredenciales } from "../../services/identity-api.js";

const TIPOS = [
  { id: "personal", nombre: "Personal" },
  { id: "alumno", nombre: "Alumnos" }
];

function mensajeDe(error) {
  const detalle = error?.details?.map?.((item) => item.message).filter(Boolean).join(" ");
  return detalle || error?.message || "No se pudo completar la operación.";
}

export default function CredencialesView() {
  const [tipo, setTipo] = useState("personal");
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState({ cuentas: [], total: 0 });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [obligarCambio, setObligarCambio] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [temporal, setTemporal] = useState(null);

  async function buscar(tipoActual = tipo, q = texto) {
    setCargando(true);
    setError(null);
    try {
      setResultado(await listarCredenciales({ tipo: tipoActual, q }));
    } catch (falla) {
      setError(mensajeDe(falla));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    setSeleccion(null);
    setResultado({ cuentas: [], total: 0 });
    buscar(tipo, "");
  }, [tipo]);

  function elegir(cuenta) {
    setSeleccion(cuenta);
    setUsuario("");
    setPassword("");
    setObligarCambio(true);
    setAviso(null);
    setTemporal(null);
  }

  async function guardar({ generar }) {
    setGuardando(true);
    setAviso(null);
    setTemporal(null);
    try {
      const respuesta = await asignarCredenciales(seleccion.tipo, seleccion.id, {
        ...(usuario.trim() ? { usuario: usuario.trim() } : {}),
        ...(password ? { password } : {}),
        generar: generar && !password,
        obligarCambio
      });
      setTemporal(respuesta.passwordTemporal ?? null);
      setAviso({
        tono: respuesta.advertencia ? "advertencia" : "exito",
        texto: respuesta.advertencia ?? "Credenciales actualizadas. Las sesiones abiertas de esa cuenta se cerraron."
      });
      setPassword("");
      setUsuario("");
      await buscar();
      setSeleccion((actual) => (actual ? { ...actual, usuario: respuesta.usuario ?? actual.usuario } : actual));
    } catch (falla) {
      setAviso({ tono: "error", texto: mensajeDe(falla) });
    } finally {
      setGuardando(false);
    }
  }

  const filas = resultado.cuentas ?? [];

  return h(
    "section",
    { className: "data-panel", "aria-labelledby": "credenciales-titulo" },
    h(
      "div",
      { className: "data-panel__top" },
      h("h1", { id: "credenciales-titulo" }, "Usuarios y contraseñas"),
      h("p", null, "Asigná usuarios y restablecé contraseñas de cualquier perfil.")
    ),
    h(
      "div",
      { role: "tablist", "aria-label": "Tipo de cuenta", style: { display: "flex", gap: "8px", margin: "12px 0" } },
      TIPOS.map((opcion) =>
        h(
          Boton,
          {
            key: opcion.id,
            variante: opcion.id === tipo ? "primario" : "contorno",
            onClick: () => setTipo(opcion.id)
          },
          opcion.nombre
        )
      )
    ),
    h(
      "form",
      {
        onSubmit: (evento) => {
          evento.preventDefault();
          buscar();
        },
        style: { display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }
      },
      h(Campo, {
        id: "cred-buscar",
        etiqueta: tipo === "alumno" ? "Buscar alumno (apellido, nombre o DNI)" : "Buscar (nombre, usuario o rol)",
        valor: texto,
        onChange: setTexto
      }),
      h(Boton, { tipo: "submit", cargando }, "Buscar")
    ),
    error ? h(Alerta, { tono: "error" }, error) : null,
    resultado.mensaje ? h(Alerta, { tono: "info" }, resultado.mensaje) : null,
    cargando && !filas.length
      ? h(CargandoPantalla)
      : h(
          "div",
          { style: { overflowX: "auto", marginTop: "12px" } },
          h(
            "table",
            { className: "data-table" },
            h(
              "thead",
              null,
              h(
                "tr",
                null,
                ["Nombre", "Usuario", tipo === "personal" ? "Roles" : "DNI", "Estado", ""].map((titulo, indice) =>
                  h("th", { key: indice, scope: "col" }, titulo)
                )
              )
            ),
            h(
              "tbody",
              null,
              filas.length
                ? filas.map((cuenta) =>
                    h(
                      "tr",
                      { key: `${cuenta.tipo}-${cuenta.id}` },
                      h("td", null, cuenta.nombre),
                      h("td", null, cuenta.usuario ?? "Sin cuenta"),
                      h("td", null, cuenta.tipo === "personal" ? cuenta.roles.join(", ") : cuenta.dni ?? "—"),
                      h("td", null, h(Badge, null, cuenta.estado)),
                      h(
                        "td",
                        null,
                        h(Boton, { variante: "contorno", onClick: () => elegir(cuenta) }, "Gestionar")
                      )
                    )
                  )
                : h("tr", null, h("td", { colSpan: 5 }, "Sin resultados."))
            )
          ),
          resultado.limitado
            ? h("p", { className: "data-nota" }, `Se muestran los primeros ${filas.length} de ${resultado.total}. Afiná la búsqueda.`)
            : null
        ),
    seleccion
      ? h(
          "div",
          { className: "data-panel", style: { marginTop: "16px" }, "aria-live": "polite" },
          h("h2", null, `Gestionar: ${seleccion.nombre}`),
          h("p", null, `Usuario actual: ${seleccion.usuario ?? "todavía no tiene cuenta"}`),
          h(Campo, {
            id: "cred-usuario",
            etiqueta: "Usuario nuevo (opcional)",
            valor: usuario,
            onChange: setUsuario
          }),
          h(Campo, {
            id: "cred-password",
            etiqueta: "Contraseña nueva (opcional)",
            tipo: "text",
            valor: password,
            ayuda: "Si la dejás vacía podés generar una temporal.",
            onChange: setPassword
          }),
          h(
            "label",
            { style: { display: "flex", gap: "8px", margin: "8px 0" } },
            h("input", {
              type: "checkbox",
              checked: obligarCambio,
              onChange: (evento) => setObligarCambio(evento.target.checked)
            }),
            "Pedir que la cambie al ingresar"
          ),
          h(
            "div",
            { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            h(
              Boton,
              { cargando: guardando, deshabilitado: !usuario.trim() && !password, onClick: () => guardar({ generar: false }) },
              "Guardar"
            ),
            h(
              Boton,
              { variante: "contorno", cargando: guardando, deshabilitado: Boolean(password), onClick: () => guardar({ generar: true }) },
              "Generar contraseña temporal"
            )
          ),
          aviso ? h(Alerta, { tono: aviso.tono }, aviso.texto) : null,
          temporal
            ? h(
                Alerta,
                { tono: "info" },
                "Contraseña temporal (se muestra una sola vez, entregala a la persona): ",
                h("strong", { style: { userSelect: "all" } }, temporal)
              )
            : null
        )
      : null
  );
}
