/* Modales y confirmaciones.

   El modal se dibuja con createPortal directamente sobre <body> para que ningun
   contenedor con overflow o transform lo recorte.

   Accesibilidad: se anuncia como dialogo, atrapa el foco mientras esta abierto,
   se cierra con Escape y devuelve el foco al elemento que lo abrio. */

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { h } from "../../layouts/site-layout.js";
import { Boton, Acciones } from "./boton.js";

const FOCALIZABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const TAMANOS = ["chico", "medio", "grande"];

export function Modal({
  abierto,
  titulo,
  descripcion,
  tamano = "medio",
  onCerrar,
  acciones,
  cargando = false,
  cerrarConFondo = true,
  children
}) {
  const caja = useRef(null);
  const previo = useRef(null);

  const cerrar = useCallback(() => {
    /* Mientras hay una operacion en curso el modal no se cierra: evita dejar a
       medias algo que ya se envio al servidor. */
    if (!cargando) {
      onCerrar?.();
    }
  }, [cargando, onCerrar]);

  useEffect(() => {
    if (!abierto) {
      return undefined;
    }

    previo.current = document.activeElement;

    const primero = caja.current?.querySelector(FOCALIZABLES);
    (primero ?? caja.current)?.focus();

    const alTeclear = (evento) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar();
        return;
      }

      if (evento.key !== "Tab") {
        return;
      }

      const focalizables = [...(caja.current?.querySelectorAll(FOCALIZABLES) ?? [])];

      if (!focalizables.length) {
        return;
      }

      const inicio = focalizables[0];
      const fin = focalizables[focalizables.length - 1];

      /* El foco da la vuelta dentro del dialogo en lugar de escaparse a la pagina. */
      if (evento.shiftKey && document.activeElement === inicio) {
        evento.preventDefault();
        fin.focus();
      } else if (!evento.shiftKey && document.activeElement === fin) {
        evento.preventDefault();
        inicio.focus();
      }
    };

    document.addEventListener("keydown", alTeclear);
    const desbordePrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = desbordePrevio;
      previo.current?.focus?.();
    };
  }, [abierto, cerrar]);

  if (!abierto || typeof document === "undefined") {
    return null;
  }

  const medida = TAMANOS.includes(tamano) ? tamano : "medio";
  const idTitulo = "ui-modal-titulo";
  const idDescripcion = descripcion ? "ui-modal-descripcion" : undefined;

  return createPortal(
    h(
      "div",
      {
        className: "ui-modal__fondo",
        onMouseDown: (evento) => {
          if (cerrarConFondo && evento.target === evento.currentTarget) {
            cerrar();
          }
        }
      },
      h(
        "div",
        {
          className: `ui-modal ui-modal--${medida}`,
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": titulo ? idTitulo : undefined,
          "aria-describedby": idDescripcion,
          "aria-busy": cargando ? "true" : undefined,
          tabIndex: -1,
          ref: caja
        },
        h(
          "div",
          { className: "ui-modal__cabecera" },
          titulo ? h("h2", { className: "ui-modal__titulo", id: idTitulo }, titulo) : null,
          onCerrar
            ? h(
                "button",
                {
                  className: "ui-modal__cerrar",
                  type: "button",
                  "aria-label": "Cerrar",
                  disabled: cargando || undefined,
                  onClick: cerrar
                },
                "×"
              )
            : null
        ),
        h(
          "div",
          { className: "ui-modal__cuerpo" },
          descripcion ? h("p", { className: "ui-modal__descripcion", id: idDescripcion }, descripcion) : null,
          children
        ),
        acciones ? h("div", { className: "ui-modal__pie" }, acciones) : null
      )
    ),
    document.body
  );
}

/* Confirmacion para acciones importantes, sobre todo las que no se pueden
   deshacer. Reemplaza al window.confirm del navegador, que no se puede
   redactar ni acompanar con el detalle de lo que va a pasar. */
export function Confirmacion({
  abierto,
  titulo = "Confirmar accion",
  mensaje,
  detalle,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "peligro",
  cargando = false,
  onConfirmar,
  onCancelar
}) {
  return h(
    Modal,
    {
      abierto,
      titulo,
      tamano: "chico",
      cargando,
      onCerrar: onCancelar,
      acciones: h(
        Acciones,
        null,
        h(Boton, { variante: "texto", deshabilitado: cargando, onClick: onCancelar }, textoCancelar),
        h(Boton, { variante, cargando, onClick: onConfirmar }, textoConfirmar)
      )
    },
    mensaje ? h("p", { className: "ui-modal__mensaje" }, mensaje) : null,
    detalle ? h("p", { className: "ui-modal__detalle" }, detalle) : null
  );
}
