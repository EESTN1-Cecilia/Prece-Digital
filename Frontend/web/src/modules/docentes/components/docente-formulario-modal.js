/* Edicion de docentes. El alta no se hace aca: es "Crear Nuevo Perfil" con el
   rol Docente, que crea la cuenta y el registro docente vinculados. Lo que se
   guarda aca se refleja tambien en la cuenta de acceso (ver
   Backend/modules/teachers/docente-cuenta.service.mjs).

   Usa el modal compartido (portal, trampa de foco, Escape y devolucion del
   foco). Las areas y los tipos de documento salen del catalogo que publica el
   backend (GET /api/v1/teachers/catalogos): no se escriben a mano.

   La validacion local solo adelanta errores evidentes; los duplicados de DNI y
   correo los detecta el backend y se muestran debajo del campo. */

import { useEffect, useMemo, useState } from "react";
import { h } from "../../../layouts/site-layout.js";
import { Acciones, Boton, Campo, Confirmacion, MensajeError, Modal, Select } from "../../../components/ui/index.js";
import { DocentesService } from "../docentes-service.js";
import { desdeDocente, formularioSucio, formularioVacio, validarDocente } from "../docentes-validacion.js";

/* El backend responde 409 con un mensaje para los duplicados: se ubica en el
   campo que corresponde para que se vea junto al dato a corregir. */
function erroresDeConflicto(error) {
  const texto = String(error?.mensaje ?? "").toLowerCase();

  if (error?.status !== 409) {
    return null;
  }

  if (texto.includes("documento")) {
    return { documento: error.mensaje };
  }

  if (texto.includes("email")) {
    return { email: error.mensaje };
  }

  return null;
}

/* `bloquearEstado`: nadie cambia el estado de su propio registro. */
export function DocenteFormularioModal({ abierto, docente = null, catalogos, alCerrar, alGuardar, bloquearEstado = false }) {
  const original = useMemo(() => (docente ? desdeDocente(docente) : formularioVacio()), [docente]);

  const [form, setForm] = useState(original);
  const [errores, setErrores] = useState({});
  const [errorGlobal, setErrorGlobal] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [avisarDescarte, setAvisarDescarte] = useState(false);

  /* Cada apertura arranca del docente elegido (o vacio en el alta). */
  useEffect(() => {
    if (abierto) {
      setForm(original);
      setErrores({});
      setErrorGlobal(null);
    }
  }, [abierto, original]);

  const areas = catalogos?.areas ?? [];
  const idsAreas = useMemo(() => areas.map((area) => area.id), [areas]);

  const cambiar = (campo) => (valor) => {
    setForm((previo) => ({ ...previo, [campo]: valor }));
    setErrores((previos) => (previos[campo] ? { ...previos, [campo]: null } : previos));
  };

  const cerrar = () => {
    setAvisarDescarte(false);
    alCerrar();
  };

  const pedirCierre = () => {
    if (guardando) {
      return;
    }

    if (formularioSucio(form, original)) {
      setAvisarDescarte(true);
      return;
    }

    cerrar();
  };

  const enviar = async (evento) => {
    evento.preventDefault();

    if (guardando) {
      return;
    }

    const { errores: encontrados, datos } = validarDocente(form, {
      original,
      areasValidas: idsAreas
    });

    setErrores(encontrados);
    setErrorGlobal(null);

    if (Object.keys(encontrados).length) {
      return;
    }

    if (Object.keys(datos).length === 0) {
      cerrar();
      return;
    }

    setGuardando(true);

    try {
      const guardado = await DocentesService.actualizar(docente.id, datos);
      alGuardar?.(guardado);
      cerrar();
    } catch (error) {
      const porCampo = error?.campos ?? erroresDeConflicto(error);

      if (porCampo) {
        setErrores((previos) => ({ ...previos, ...porCampo }));
      } else {
        setErrorGlobal(error);
      }
    } finally {
      setGuardando(false);
    }
  };

  const cuerpo = h(
    "form",
    { className: "docentes-form", id: "formulario-docente", onSubmit: enviar, noValidate: true },
    errorGlobal ? h(MensajeError, { error: errorGlobal }) : null,
    h("h3", { className: "docentes-form__seccion" }, "Datos personales"),
    h(
      "div",
      { className: "director-form-grid" },
      h(Campo, {
        id: "docente-nombre",
        etiqueta: "Nombre",
        valor: form.nombre,
        onChange: cambiar("nombre"),
        error: errores.nombre,
        requerido: true,
        autoComplete: "off"
      }),
      h(Campo, {
        id: "docente-apellido",
        etiqueta: "Apellido",
        valor: form.apellido,
        onChange: cambiar("apellido"),
        error: errores.apellido,
        requerido: true,
        autoComplete: "off"
      }),
      h(Select, {
        id: "docente-tipo-documento",
        etiqueta: "Tipo de documento",
        valor: form.tipoDocumento,
        onChange: cambiar("tipoDocumento"),
        error: errores.tipoDocumento,
        requerido: true,
        opciones: (catalogos?.tiposDocumento ?? [{ valor: "dni", descripcion: "DNI" }]).map((tipo) => ({
          id: tipo.valor,
          nombre: tipo.valor === "dni" ? "DNI" : tipo.descripcion
        }))
      }),
      h(Campo, {
        id: "docente-documento",
        etiqueta: "Número de documento",
        valor: form.documento,
        onChange: cambiar("documento"),
        error: errores.documento,
        requerido: true,
        inputMode: "numeric",
        ayuda: "Sin puntos, entre 6 y 12 dígitos."
      }),
      h(Campo, {
        id: "docente-email",
        etiqueta: "Correo electrónico",
        tipo: "email",
        valor: form.email,
        onChange: cambiar("email"),
        error: errores.email,
        requerido: true,
        autoComplete: "off"
      }),
      h(Campo, {
        id: "docente-telefono",
        etiqueta: "Teléfono",
        tipo: "tel",
        valor: form.telefono,
        onChange: cambiar("telefono"),
        error: errores.telefono,
        ayuda: "Opcional."
      })
    ),
    h("h3", { className: "docentes-form__seccion" }, "Datos institucionales"),
    h(
      "div",
      { className: "director-form-grid" },
      h(Select, {
        id: "docente-area",
        etiqueta: "Área / departamento",
        valor: form.area,
        onChange: cambiar("area"),
        error: errores.area,
        placeholder: "Sin área asignada",
        opciones: areas
      }),
      h(Campo, {
        id: "docente-titulo",
        etiqueta: "Título",
        valor: form.titulo,
        onChange: cambiar("titulo"),
        error: errores.titulo,
        ayuda: "Opcional. Ej.: Profesora de Matemática."
      }),
      h(Campo, {
        id: "docente-especialidades",
        etiqueta: "Especialidades",
        valor: form.especialidades,
        onChange: cambiar("especialidades"),
        error: errores.especialidades,
        ayuda: "Separadas por coma. Ej.: Programación, Bases de Datos."
      }),
      h(Select, {
        id: "docente-estado",
        etiqueta: "Estado",
        valor: form.estado,
        onChange: cambiar("estado"),
        error: errores.estado,
        requerido: true,
        deshabilitado: bloquearEstado,
        ayuda: bloquearEstado ? "No podés cambiar el estado de tu propio registro." : "Inactivo equivale a la baja: la cuenta deja de poder ingresar.",
        opciones: [
          { id: "activo", nombre: "Activo" },
          { id: "inactivo", nombre: "Inactivo" }
        ]
      })
    )
  );

  const acciones = h(
    Acciones,
    null,
    h(Boton, { variante: "texto", deshabilitado: guardando, onClick: pedirCierre }, "Cancelar"),
    h(
      Boton,
      { variante: "primario", tipo: "submit", form: "formulario-docente", cargando: guardando },
      "Guardar cambios"
    )
  );

  return h(
    "div",
    null,
    h(
      Modal,
      {
        abierto,
        titulo: docente ? `Editar docente: ${docente.nombreCompleto}` : "Editar docente",
        descripcion: "Modificá los datos del docente. Los cambios se aplican también a su cuenta de acceso y quedan en la auditoría.",
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
      titulo: "Descartar cambios",
      mensaje: "Hay datos sin guardar. ¿Cerrar el formulario igual?",
      textoConfirmar: "Descartar",
      textoCancelar: "Seguir editando",
      onConfirmar: cerrar,
      onCancelar: () => setAvisarDescarte(false)
    })
  );
}
