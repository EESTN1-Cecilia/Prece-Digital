/* Personal de la escuela (usuarios, roles, docentes y sus asignaciones) en las tablas
   relacionales de SQL Server, con sus claves foraneas:

     usuarios <- usuario_roles -> roles
     usuarios <- docentes
     usuarios <- asignaciones_docentes -> materias, anios_divisiones, grupos_taller
     asignaciones_docentes <- asignaciones_docentes_horarios   (dia y hora)

   El store en memoria sigue siendo el cache que leen los servicios (sincronico). Este
   modulo hace dos cosas:
     - cargar(): al arrancar, arma en el store los usuarios del personal y su alcance
       a partir de esas tablas;
     - sincronizar(): escribe en las tablas lo que cambio (alta, edicion, baja, roles,
       catedras y horarios). Lo llama el alta de usuarios (y espera el resultado) y el
       ciclo de guardado de la persistencia.

   Las cuentas de alumno NO pasan por aca: tienen su propio circuito (portal del alumno).
   Los ids en memoria son "usr_<usuarios.id>": el mismo numero que tiene la fila en SQL. */

import { appConfig } from "../config/app.config.mjs";
import { consultar, enTransaccion } from "./sqlserver/conexion.mjs";
import { userRepository } from "./repositories/user.repository.mjs";

/* Rol del codigo -> codigo en la tabla `roles`. */
export const ROL_A_CODIGO = {
  admin: "system-admin",
  director: "director",
  secretario: "secretary",
  preceptor: "preceptor",
  docente: "teacher",
  jefe_area: "area-lead",
  server: "server"
};
const CODIGO_A_ROL = Object.fromEntries(Object.entries(ROL_A_CODIGO).map(([rol, codigo]) => [codigo, rol]));
const PREFIJO_DNI_PENDIENTE = "SIN-";

/* Personal = cuentas con algun rol de gestion. Las de alumno quedan afuera. */
export function esPersonal(usuario) {
  return Boolean(usuario)
    && !usuario.studentId
    && !usuario.username
    && !String(usuario.id).startsWith("sql-usr-")
    && usuario.assignments.some((asignacion) => asignacion.role in ROL_A_CODIGO);
}

const ROL_ASIGNACION = { titular: "titular", provisional: "titular", suplente: "suplente" };

function dias(valor) {
  return Array.isArray(valor) ? [...new Set(valor.map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5))] : [];
}

function hora(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(valor ?? "")) ? `${valor}:00` : null;
}

function fecha(valor) {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function crearPersonalRelacional() {
  let contextoCache = null;
  let cola = Promise.resolve();
  let ultimaFirma = null;

  async function contexto() {
    if (contextoCache) return contextoCache;

    const [escuela] = await consultar("SELECT TOP 1 id FROM escuelas ORDER BY id");
    if (!escuela) throw new Error("La tabla escuelas esta vacia: no hay escuela a la que asociar el personal.");

    const [ciclo] = await consultar(
      "SELECT TOP 1 id FROM ciclos_lectivos WHERE escuela_id = @escuela AND activo = 1 ORDER BY anio DESC", { escuela: escuela.id });
    if (!ciclo) throw new Error("No hay un ciclo lectivo activo en ciclos_lectivos.");

    const roles = new Map((await consultar("SELECT id, codigo FROM roles")).map((fila) => [fila.codigo, fila.id]));
    contextoCache = { escuelaId: escuela.id, cicloId: ciclo.id, roles };
    return contextoCache;
  }

  /* ---------------------------------------------------------------- carga inicial */

  async function cargar(store) {
    const { cicloId } = await contexto();

    const filas = await consultar(`SELECT id, nombre, apellido, dni, email, telefono, password_hash, activo, ultimo_acceso,
        creado_en, actualizado_en, debe_cambiar_password, password_actualizada_en
      FROM usuarios WHERE estudiante_id IS NULL AND nombre_usuario IS NULL ORDER BY id`);
    const roles = await consultar(`SELECT ur.usuario_id, r.codigo FROM usuario_roles ur
      JOIN roles r ON r.id = ur.rol_id WHERE ur.activo = 1`);
    const asignaciones = await consultar(`SELECT a.id, a.docente_id, m.nombre AS materia, ad.anio_curso, ad.division,
        g.nombre AS grupo, a.situacion_revista, a.docente_suplido, a.horas_catedra
      FROM asignaciones_docentes a
      LEFT JOIN materias m ON m.id = a.materia_id
      LEFT JOIN anios_divisiones ad ON ad.id = a.anio_division_id
      LEFT JOIN grupos_taller g ON g.id = a.grupo_taller_id
      WHERE a.activo = 1 AND a.ciclo_lectivo_id = @ciclo ORDER BY a.id`, { ciclo: cicloId });
    const horarios = await consultar(`SELECT asignacion_docente_id, dia_semana,
        CONVERT(CHAR(5), hora_desde, 108) AS desde, CONVERT(CHAR(5), hora_hasta, 108) AS hasta
      FROM asignaciones_docentes_horarios ORDER BY dia_semana`);

    const rolesDe = new Map();
    for (const { usuario_id: id, codigo } of roles) {
      if (CODIGO_A_ROL[codigo]) rolesDe.set(id, [...(rolesDe.get(id) ?? []), CODIGO_A_ROL[codigo]]);
    }

    const horariosDe = new Map();
    for (const h of horarios) horariosDe.set(h.asignacion_docente_id, [...(horariosDe.get(h.asignacion_docente_id) ?? []), h]);

    /* Se descartan del store las cuentas de personal que venian del cache viejo. */
    for (const [id, usuario] of [...store.users.entries()]) {
      if (esPersonal(usuario)) store.users.delete(id);
    }

    let cargados = 0;
    for (const fila of filas) {
      const rolesUsuario = rolesDe.get(fila.id) ?? [];
      if (rolesUsuario.length === 0) continue;

      const propias = asignaciones.filter((a) => a.docente_id === fila.id);
      let cargoDocente = null;
      if (rolesUsuario.includes("docente") && propias.length > 0) {
        const primera = propias[0];
        const bloques = horariosDe.get(primera.id) ?? [];
        cargoDocente = {
          materia: primera.materia,
          situacionRevista: primera.situacion_revista ?? "titular",
          docenteSuplido: primera.docente_suplido ?? null,
          modulos: primera.horas_catedra ?? null,
          horaDesde: bloques[0]?.desde ?? null,
          horaHasta: bloques[0]?.hasta ?? null,
          dias: [...new Set(bloques.map((b) => b.dia_semana))],
          grupoTaller: primera.grupo ?? null,
          cursos: [...new Set(propias.filter((a) => a.anio_curso).map((a) => `${a.anio_curso}-${a.division}`))]
        };
      }

      const sinApellido = fila.apellido === "-";
      userRepository.create({
        id: `usr_${fila.id}`,
        email: fila.email,
        passwordHash: fila.password_hash,
        mustChangePassword: Boolean(fila.debe_cambiar_password),
        passwordChangedAt: fila.password_actualizada_en?.toISOString?.() ?? null,
        lastLoginAt: fila.ultimo_acceso?.toISOString?.() ?? null,
        displayName: sinApellido ? fila.nombre : `${fila.nombre} ${fila.apellido}`,
        nombre: sinApellido ? null : fila.nombre,
        apellido: sinApellido ? null : fila.apellido,
        dni: fila.dni.startsWith(PREFIJO_DNI_PENDIENTE) ? null : fila.dni,
        telefono: fila.telefono,
        cargoDocente,
        assignments: rolesUsuario.map((role) => ({ role })),
        isActive: Boolean(fila.activo),
        deactivatedAt: fila.activo ? null : fila.actualizado_en.toISOString(),
        createdAt: fila.creado_en.toISOString(),
        updatedAt: fila.actualizado_en.toISOString()
      });
      cargados += 1;
    }

    /* Limpieza de la grilla de Direccion. Las filas "cat-<numero>" son las del listado de ejemplo que
       antes traia el frontend (docentes inventados) y que se guardaron en ps_catedras: se descartan si
       no tienen un docente real. Cualquier otra fila que apunte a un docente que ya no existe queda sin asignar. */
    const EJEMPLO = /^cat-\d+$/;
    for (let i = store.catedras.length - 1; i >= 0; i -= 1) {
      const catedra = store.catedras[i];
      const docenteReal = catedra.profesor && store.users.has(catedra.profesor.id);

      if (!docenteReal && EJEMPLO.test(String(catedra.id))) {
        store.catedras.splice(i, 1);
      } else if (catedra.profesor && !docenteReal) {
        catedra.profesor = null;
        catedra.estado = "sin_asignar";
      }
    }

    ultimaFirma = null;
    return cargados;
  }

  /* ---------------------------------------------------------------- escritura */

  function firmaDe(store) {
    return JSON.stringify([
      [...store.users.values()].filter(esPersonal).map((u) => [u.id, u.email, u.passwordHash, u.isActive, u.nombre, u.apellido,
        u.displayName, u.dni, u.telefono, u.mustChangePassword, u.lastLoginAt, u.assignments.map((a) => a.role)]),
      store.catedras.filter((c) => c.profesor).map((c) => [c.id, c.profesor.id, c.materia, c.anio, c.numDivision, c.modulos,
        c.situacionRevista, c.docenteSuplido, c.grupoTaller, c.dias, c.horaDesde, c.horaHasta])
    ]);
  }

  function reasignarId(store, usuario, idNuevo) {
    const idViejo = usuario.id;
    if (idViejo === idNuevo) return usuario;
    if (store.users.has(idNuevo)) {
      throw new Error(`No se pudo renumerar ${idViejo}: ${idNuevo} ya existe en memoria.`);
    }
    const registro = store.users.get(idViejo);
    store.users.delete(idViejo);
    registro.id = idNuevo;
    store.users.set(idNuevo, registro);
    for (const catedra of store.catedras) {
      if (catedra.profesor?.id === idViejo) catedra.profesor.id = idNuevo;
      /* El id de la catedra lleva el del docente cuando se creo en el alta: no se toca, es solo un identificador. */
    }
    return registro;
  }

  async function sincronizarUsuario(q, ctx, store, usuario, filaPorEmail, dniEnUso) {
    const nombre = usuario.nombre ?? usuario.displayName ?? "Sin nombre";
    const apellido = usuario.apellido ?? "-";
    let id = filaPorEmail.get(usuario.email)?.id;

    if (!id) {
      let dni = usuario.dni;
      if (!dni || dniEnUso.has(dni)) dni = `${PREFIJO_DNI_PENDIENTE}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const [creada] = await q(`INSERT INTO usuarios (escuela_id, nombre, apellido, dni, email, telefono, password_hash, activo,
          debe_cambiar_password, password_actualizada_en)
        OUTPUT inserted.id AS id
        VALUES (@escuela, @nombre, @apellido, @dni, @email, @telefono, @hash, @activo, @debe, @cambio)`, {
        escuela: ctx.escuelaId, nombre, apellido, dni, email: usuario.email, telefono: usuario.telefono ?? null,
        hash: usuario.passwordHash, activo: usuario.isActive, debe: Boolean(usuario.mustChangePassword),
        cambio: fecha(usuario.passwordChangedAt)
      });
      id = creada.id;
      dniEnUso.add(dni);
      filaPorEmail.set(usuario.email, { id, dni });
    } else {
      const actual = filaPorEmail.get(usuario.email);
      const dniNuevo = usuario.dni && usuario.dni !== actual.dni && !dniEnUso.has(usuario.dni) ? usuario.dni : actual.dni;
      await q(`UPDATE usuarios SET nombre = @nombre, apellido = @apellido, dni = @dni, telefono = @telefono, password_hash = @hash,
          activo = @activo, ultimo_acceso = @acceso, debe_cambiar_password = @debe, password_actualizada_en = @cambio,
          actualizado_en = SYSUTCDATETIME()
        WHERE id = @id`, {
        id, nombre, apellido, dni: dniNuevo, telefono: usuario.telefono ?? null, hash: usuario.passwordHash,
        activo: usuario.isActive, acceso: fecha(usuario.lastLoginAt), debe: Boolean(usuario.mustChangePassword),
        cambio: fecha(usuario.passwordChangedAt)
      });
      dniEnUso.add(dniNuevo);
      actual.dni = dniNuevo;
    }

    /* Roles: los pedidos quedan activos, el resto se desactiva. */
    const deseados = new Set(usuario.assignments.map((a) => ROL_A_CODIGO[a.role]).filter(Boolean));
    const actuales = await q("SELECT rol_id, activo FROM usuario_roles WHERE usuario_id = @id AND escuela_id = @escuela",
      { id, escuela: ctx.escuelaId });
    const porRol = new Map(actuales.map((r) => [r.rol_id, r]));
    for (const [codigo, rolId] of ctx.roles) {
      const quiere = deseados.has(codigo);
      const tiene = porRol.get(rolId);
      if (quiere && !tiene) {
        await q("INSERT INTO usuario_roles (usuario_id, rol_id, escuela_id, activo) VALUES (@id, @rol, @escuela, 1)",
          { id, rol: rolId, escuela: ctx.escuelaId });
      } else if (tiene && Boolean(tiene.activo) !== quiere && (quiere || CODIGO_A_ROL[codigo])) {
        await q("UPDATE usuario_roles SET activo = @activo WHERE usuario_id = @id AND rol_id = @rol AND escuela_id = @escuela",
          { id, rol: rolId, escuela: ctx.escuelaId, activo: quiere });
      }
    }

    return id;
  }

  async function sincronizarDocente(q, ctx, store, usuario, dbId, caches) {
    const [dniFila] = await q("SELECT dni FROM usuarios WHERE id = @id", { id: dbId });
    const esDocente = usuario.assignments.some((a) => a.role === "docente");

    const [perfil] = await q("SELECT id FROM docentes WHERE usuario_id = @id", { id: dbId });
    const datosPerfil = {
      escuela: ctx.escuelaId, usuario: dbId, apellido: usuario.apellido ?? "-", nombre: usuario.nombre ?? usuario.displayName ?? "Sin nombre",
      documento: dniFila.dni, email: usuario.email, telefono: usuario.telefono ?? null, activo: esDocente && usuario.isActive
    };
    if (perfil) {
      await q(`UPDATE docentes SET apellido = @apellido, nombre = @nombre, email = @email, telefono = @telefono,
          estado = CASE WHEN @activo = 1 THEN N'activo' ELSE N'inactivo' END, activo = @activo, actualizado_en = SYSUTCDATETIME(),
          fecha_baja = CASE WHEN @activo = 1 THEN NULL ELSE COALESCE(fecha_baja, SYSUTCDATETIME()) END
        WHERE id = @id`, { ...datosPerfil, id: perfil.id });
    } else if (esDocente) {
      await q(`INSERT INTO docentes (escuela_id, usuario_id, apellido, nombre, tipo_documento, documento, email, telefono, estado, activo)
        VALUES (@escuela, @usuario, @apellido, @nombre, N'dni', @documento, @email, @telefono, N'activo', @activo)`, datosPerfil);
    }

    /* Catedras asignadas a este docente en la grilla. */
    const deseadas = esDocente && usuario.isActive
      ? store.catedras.filter((c) => c.profesor?.id === usuario.id && c.materia)
      : [];

    const existentes = await q(`SELECT id, materia_id, anio_division_id FROM asignaciones_docentes
      WHERE docente_id = @id AND ciclo_lectivo_id = @ciclo AND activo = 1`, { id: dbId, ciclo: ctx.cicloId });
    const usadas = new Set();

    for (const catedra of deseadas) {
      const cursoId = caches.cursos.get(`${catedra.anio}-${catedra.numDivision}`);
      if (!cursoId) {
        console.warn(`[personal] ${usuario.email}: el curso ${catedra.anio}-${catedra.numDivision} no existe en anios_divisiones; se omite la asignacion.`);
        continue;
      }

      const materiaId = await caches.materia(q, catedra.materia);
      const grupoId = catedra.grupoTaller ? await caches.grupo(q, catedra.grupoTaller, materiaId) : null;
      const situacion = ["titular", "provisional", "suplente"].includes(catedra.situacionRevista) ? catedra.situacionRevista : "titular";
      const datos = {
        materia: materiaId, curso: cursoId, grupo: grupoId, rol: ROL_ASIGNACION[situacion], situacion,
        suplido: catedra.docenteSuplido ?? null, horas: Number.isFinite(catedra.modulos) ? catedra.modulos : null
      };

      const previa = existentes.find((e) => e.materia_id === materiaId && e.anio_division_id === cursoId && !usadas.has(e.id));
      let asignacionId;
      if (previa) {
        asignacionId = previa.id;
        await q(`UPDATE asignaciones_docentes SET grupo_taller_id = @grupo, rol_asignacion = @rol, situacion_revista = @situacion,
            docente_suplido = @suplido, horas_catedra = @horas WHERE id = @id`, { ...datos, id: asignacionId });
      } else {
        const [nueva] = await q(`INSERT INTO asignaciones_docentes (escuela_id, docente_id, ciclo_lectivo_id, materia_id, anio_division_id,
            grupo_taller_id, rol_asignacion, situacion_revista, docente_suplido, horas_catedra, activo)
          OUTPUT inserted.id AS id
          VALUES (@escuela, @docente, @ciclo, @materia, @curso, @grupo, @rol, @situacion, @suplido, @horas, 1)`,
          { ...datos, escuela: ctx.escuelaId, docente: dbId, ciclo: ctx.cicloId });
        asignacionId = nueva.id;
      }
      usadas.add(asignacionId);

      /* Horario: se reemplazan los bloques (uno por dia). */
      await q("DELETE FROM asignaciones_docentes_horarios WHERE asignacion_docente_id = @id", { id: asignacionId });
      const desde = hora(catedra.horaDesde);
      const hasta = hora(catedra.horaHasta);
      if (desde && hasta && hasta > desde) {
        for (const dia of dias(catedra.dias)) {
          await q("INSERT INTO asignaciones_docentes_horarios (asignacion_docente_id, dia_semana, hora_desde, hora_hasta) VALUES (@id, @dia, @desde, @hasta)",
            { id: asignacionId, dia, desde, hasta });
        }
      }
    }

    for (const previa of existentes) {
      if (!usadas.has(previa.id)) await q("UPDATE asignaciones_docentes SET activo = 0 WHERE id = @id", { id: previa.id });
    }
  }

  async function ejecutarSincronizacion(store, { forzar = false } = {}) {
    const firma = firmaDe(store);
    if (!forzar && firma === ultimaFirma) return;

    const ctx = await contexto();
    const personal = [...store.users.values()].filter(esPersonal);

    await enTransaccion(async (q) => {
      const filas = await q("SELECT id, email, dni FROM usuarios WHERE estudiante_id IS NULL AND nombre_usuario IS NULL");
      const filaPorEmail = new Map(filas.filter((f) => f.email).map((f) => [f.email.toLowerCase(), { id: f.id, dni: f.dni }]));
      const dniEnUso = new Set(filas.map((f) => f.dni));

      const cursos = new Map((await q("SELECT id, anio_curso, division FROM anios_divisiones WHERE ciclo_lectivo_id = @ciclo",
        { ciclo: ctx.cicloId })).map((f) => [`${f.anio_curso}-${f.division}`, f.id]));
      const materiasPorNombre = new Map((await q("SELECT id, nombre FROM materias WHERE escuela_id = @escuela",
        { escuela: ctx.escuelaId })).map((f) => [f.nombre.trim().toLowerCase(), f.id]));
      const gruposPorNombre = new Map((await q("SELECT id, nombre FROM grupos_taller WHERE escuela_id = @escuela AND ciclo_lectivo_id = @ciclo",
        { escuela: ctx.escuelaId, ciclo: ctx.cicloId })).map((f) => [f.nombre.trim().toLowerCase(), f.id]));

      const caches = {
        cursos,
        async materia(consulta, nombre) {
          const clave = nombre.trim().toLowerCase();
          if (!materiasPorNombre.has(clave)) {
            const [fila] = await consulta("INSERT INTO materias (escuela_id, nombre) OUTPUT inserted.id AS id VALUES (@escuela, @nombre)",
              { escuela: ctx.escuelaId, nombre: nombre.trim() });
            materiasPorNombre.set(clave, fila.id);
          }
          return materiasPorNombre.get(clave);
        },
        async grupo(consulta, nombre, materiaId) {
          const clave = nombre.trim().toLowerCase();
          if (!gruposPorNombre.has(clave)) {
            const [fila] = await consulta(`INSERT INTO grupos_taller (escuela_id, ciclo_lectivo_id, materia_id, nombre)
              OUTPUT inserted.id AS id VALUES (@escuela, @ciclo, @materia, @nombre)`,
              { escuela: ctx.escuelaId, ciclo: ctx.cicloId, materia: materiaId, nombre: nombre.trim() });
            gruposPorNombre.set(clave, fila.id);
          }
          return gruposPorNombre.get(clave);
        }
      };

      const filasUsuario = [];
      for (const usuario of personal) {
        if (!usuario.email) continue;
        const dbId = await sincronizarUsuario(q, ctx, store, usuario, filaPorEmail, dniEnUso);
        filasUsuario.push([usuario, dbId]);
      }

      /* Las catedras todavia apuntan al id en memoria (usuario.id): se escriben antes de renumerar. */
      for (const [usuario, dbId] of filasUsuario) {
        await sincronizarDocente(q, ctx, store, usuario, dbId, caches);
      }
      return filasUsuario;
    }).then((filasUsuario) => {
      /* Con la transaccion confirmada, el id en memoria pasa a ser usr_<id de la fila>. */
      const pendientes = filasUsuario.filter(([usuario, dbId]) => usuario.id !== `usr_${dbId}`);
      /* En dos pasos, para que ids que se cruzan (usr_2 -> usr_3 y usr_3 -> usr_4) no choquen. */
      pendientes.forEach(([usuario], i) => reasignarId(store, usuario, `__renumerando_${i}`));
      pendientes.forEach(([usuario, dbId]) => reasignarId(store, usuario, `usr_${dbId}`));
    });

    ultimaFirma = firmaDe(store);
  }

  /* Una sincronizacion a la vez. Devuelve una promesa que rechaza si falla. */
  function sincronizar(store, opciones) {
    const turno = cola.then(() => ejecutarSincronizacion(store, opciones));
    cola = turno.catch(() => {});
    return turno;
  }

  return { cargar, sincronizar };
}

/* Instancia unica: null cuando el personal vive solo en memoria (DB_CLIENT distinto de sqlserver). */
export const personalRelacional =
  appConfig.database.client === "sqlserver" && appConfig.database.personal === "sqlserver" ? crearPersonalRelacional() : null;

/* Para la persistencia generica (ps_users): deja solo las cuentas que NO son del personal. */
export function soloCuentasNoPersonal(usuarios) {
  return usuarios instanceof Map ? new Map([...usuarios].filter(([, usuario]) => !esPersonal(usuario))) : usuarios;
}
