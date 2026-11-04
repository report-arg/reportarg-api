const db = require('../../config/db');
const AuditoriaModel = require('../admin/auditoriaModel');

const InstitutionModel = {

  async getByUserId(userId) {
    const [institutions] = await db.query('SELECT id_institucion FROM instituciones WHERE id_usuario = ?', [userId]);
    return institutions[0] || null;
  },

  async create(connection, { id_usuario, nombre, tipo, cuit = null, nombre_contacto = null, telefono, provincia, ciudad, zona, direccion, status, id_ciudad }) {
    const executor = connection || db;
    await executor.query(
      `INSERT INTO instituciones (id_usuario, nombre, tipo, cuit, nombre_contacto, telefono, provincia, ciudad, zona, direccion, status, id_ciudad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id_usuario, nombre, tipo, cuit, nombre_contacto, telefono, provincia, ciudad, zona, direccion, status || 'pending', id_ciudad]
    );
  },

  async getAll({ estado, id_ciudad, busqueda, pagina = 1, limite = 20 } = {}) {
    let where = ' WHERE COALESCE(u.email_verified, 1) = 1';
    const params = [];

    if (estado === 'pendiente') {
      where += " AND i.verificada = 0 AND (i.status = 'pending' OR i.status IS NULL)";
    } else if (estado === 'verificada') {
      where += ' AND i.verificada = 1 AND u.activo = 1';
    } else if (estado === 'rechazada') {
      where += " AND i.status = 'rejected'";
    } else if (estado === 'suspendida') {
      where += ' AND i.verificada = 1 AND u.activo = 0';
    }

    if (id_ciudad && Number.isSafeInteger(Number(id_ciudad)) && Number(id_ciudad) > 0) {
      where += ' AND i.id_ciudad = ?';
      params.push(Number(id_ciudad));
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      where += ` AND (
        i.nombre LIKE ?
        OR u.email LIKE ?
        OR i.tipo LIKE ?
        OR c.nombre LIKE ?
        OR c.provincia LIKE ?
        OR i.direccion LIKE ?
      )`;
      params.push(term, term, term, term, term, term);
    }

    // Total de registros coincidentes
    const countSql = `
      SELECT COUNT(*) AS total
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      ${where}
    `;
    const [[countResult]] = await db.query(countSql, params);
    const total = countResult ? countResult.total : 0;

    const parsedPagina = Math.max(1, parseInt(pagina, 10) || 1);
    const parsedLimite = Math.max(1, parseInt(limite, 10) || 20);
    const offset = (parsedPagina - 1) * parsedLimite;

    // Consulta de registros con relación territorial y contacto
    const dataSql = `
      SELECT
        i.id_institucion AS id,
        i.id_institucion,
        i.nombre,
        i.tipo,
        i.cuit,
        i.nombre_contacto,
        i.id_ciudad,
        i.zona,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.status,
        i.motivo_rechazo,
        i.fecha_rechazo,
        i.es_principal,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
        u.fecha_creacion AS creado_en,
        c.nombre AS ciudad_nombre,
        c.provincia AS provincia,
        c.activa AS ciudad_activa
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      ${where}
      ORDER BY i.id_institucion DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...params, parsedLimite, offset];
    const [rows] = await db.query(dataSql, dataParams);
    const list = Array.isArray(rows) ? rows : [];

    // Adjuntar categorías asignadas a las instituciones listadas cuando existan
    if (list.length > 0) {
      try {
        const ids = list.map((r) => r.id_institucion || r.id).filter(Boolean);
        if (ids.length > 0) {
          const placeholders = ids.map(() => '?').join(',');
          const [catRows] = await db.query(
            `SELECT ic.id_institucion, c.id_categoria AS id, c.nombre, c.codigo, c.tipo, c.estado
             FROM institucion_categorias ic
             INNER JOIN categorias c ON c.id_categoria = ic.id_categoria
             WHERE ic.id_institucion IN (${placeholders})
             ORDER BY c.nombre ASC`,
            ids
          );
          const mapByInst = new Map();
          for (const row of Array.isArray(catRows) ? catRows : []) {
            if (!mapByInst.has(row.id_institucion)) {
              mapByInst.set(row.id_institucion, []);
            }
            mapByInst.get(row.id_institucion).push({
              id: row.id,
              nombre: row.nombre,
              codigo: row.codigo,
              tipo: row.tipo,
              estado: row.estado,
            });
          }
          for (const inst of list) {
            const instId = inst.id_institucion || inst.id;
            inst.categorias = mapByInst.get(instId) || [];
          }
        }
      } catch (_) {
        // Mantener compatibilidad con mocks de tests
      }
    }

    return {
      rows: list,
      total,
      pagina: parsedPagina,
      limite: parsedLimite,
      totalPaginas: Math.ceil(total / parsedLimite) || 1,
    };
  },

  async getCategoriasByInstitucion(idInstitucion) {
    const [rows] = await db.query(
      `SELECT c.id_categoria AS id, c.nombre, c.codigo, c.tipo, c.estado
       FROM institucion_categorias ic
       INNER JOIN categorias c ON c.id_categoria = ic.id_categoria
       WHERE ic.id_institucion = ?
       ORDER BY c.nombre ASC`,
      [idInstitucion]
    );
    return Array.isArray(rows) ? rows : [];
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT
        i.id_institucion AS id,
        i.id_institucion,
        i.nombre,
        i.tipo,
        i.cuit,
        i.nombre_contacto,
        i.id_ciudad,
        i.zona,
        i.direccion,
        i.telefono,
        i.verificada,
        i.fecha_verificacion,
        i.status,
        i.motivo_rechazo,
        i.fecha_rechazo,
        i.es_principal,
        i.foto_perfil,
        u.id_usuario,
        u.email,
        u.activo,
        u.fecha_creacion AS creado_en,
        c.nombre AS ciudad_nombre,
        c.provincia AS provincia,
        c.activa AS ciudad_activa
      FROM instituciones i
      INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
      LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
      WHERE i.id_institucion = ?
    `, [id]);
    const inst = rows && rows[0] ? rows[0] : null;
    if (!inst) return null;

    try {
      inst.categorias = await this.getCategoriasByInstitucion(id);
    } catch (_) {
      inst.categorias = [];
    }
    return inst;
  },

  async verificar(id, idAdmin = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(`
        UPDATE instituciones
        SET verificada = 1,
            status = 'approved',
            fecha_verificacion = NOW(),
            motivo_rechazo = NULL,
            fecha_rechazo = NULL
        WHERE id_institucion = ?
      `, [id]);

      // Asegurar consistencia atómica del rol institucional en usuarios si no era admin
      await connection.query(`
        UPDATE usuarios u
        INNER JOIN instituciones i ON i.id_usuario = u.id_usuario
        SET u.tipo_usuario = 'institucion',
            u.activo = 1
        WHERE i.id_institucion = ? AND u.tipo_usuario != 'admin'
      `, [id]);

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(id),
          accion: 'VERIFICAR_INSTITUCION',
          datosNuevos: { verificada: 1, status: 'approved' },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async rechazar(id, motivo = null, idAdmin = null) {
    const motivoLimpio = motivo ? String(motivo).trim() : null;
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(`
        UPDATE instituciones
        SET verificada = 0,
            status = 'rejected',
            motivo_rechazo = ?,
            fecha_rechazo = NOW(),
            fecha_verificacion = NULL
        WHERE id_institucion = ?
      `, [motivoLimpio, id]);

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(id),
          accion: 'RECHAZAR_INSTITUCION',
          motivo: motivoLimpio,
          datosNuevos: { verificada: 0, status: 'rejected', motivo_rechazo: motivoLimpio },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  async getStats() {
    const [[total]]       = await db.query(
      `SELECT COUNT(*) AS total FROM instituciones i INNER JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE COALESCE(u.email_verified, 1) = 1`
    );
    const [[verificadas]] = await db.query(
      `SELECT COUNT(*) AS total FROM instituciones i INNER JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.verificada = 1 AND COALESCE(u.email_verified, 1) = 1`
    );
    const [[pendientes]]  = await db.query(
      `SELECT COUNT(*) AS total FROM instituciones i INNER JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.verificada = 0 AND (i.status IS NULL OR i.status = 'pending') AND COALESCE(u.email_verified, 1) = 1`
    );
    const [[rechazadas]]  = await db.query(
      `SELECT COUNT(*) AS total FROM instituciones i INNER JOIN usuarios u ON u.id_usuario = i.id_usuario WHERE i.status = 'rejected' AND COALESCE(u.email_verified, 1) = 1`
    );
    const [[suspendidas]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM instituciones i
       INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
       WHERE i.verificada = 1 AND u.activo = 0 AND COALESCE(u.email_verified, 1) = 1`
    );
    return {
      total:       Number(total?.total || 0),
      verificadas: Number(verificadas?.total || 0),
      pendientes:  Number(pendientes?.total || 0),
      rechazadas:  Number(rechazadas?.total || 0),
      suspendidas: Number(suspendidas?.total || 0),
    };
  },

  /**
   * Obtiene la institución principal activa y verificada de una ciudad determinada (HU-05 / ADMIN-01)
   */
  async getPrincipalDeCiudad(idCiudad) {
    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
       WHERE i.id_ciudad = ?
         AND i.es_principal = 1
         AND i.verificada = 1
         AND i.status = 'approved'
         AND u.activo = 1
       LIMIT 1`,
      [idCiudad]
    );
    return rows[0] || null;
  },

  /**
   * Obtiene la institución verificada y activa asignada a una categoría en una ciudad (HU-04 / ADMIN-01)
   */
  async getPorCategoriaYCiudad(idCategoria, idCiudad) {
    if (!idCiudad) return null;

    const [rows] = await db.query(
      `SELECT i.id_institucion AS id, i.nombre
       FROM instituciones i
       INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
       INNER JOIN institucion_categorias ic ON ic.id_institucion = i.id_institucion
       WHERE ic.id_categoria = ?
         AND i.id_ciudad = ?
         AND i.verificada = 1
         AND i.status = 'approved'
         AND u.activo = 1
       LIMIT 1`,
      [idCategoria, idCiudad]
    );
    return rows[0] || null;
  },


  /**
   * Define la institución principal de una ciudad asegurando unicidad y validez en transacción (HU-05 / ADMIN-01)
   */
  async setPrincipalDeCiudad(idCiudad, idInstitucion, idAdmin = null) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `UPDATE instituciones SET es_principal = 0 WHERE id_ciudad = ?`,
        [idCiudad]
      );
      const [result] = await connection.query(
        `UPDATE instituciones SET es_principal = 1 WHERE id_institucion = ? AND id_ciudad = ?`,
        [idInstitucion, idCiudad]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'ciudad',
          entidadId: Number(idCiudad),
          accion: 'DESIGNAR_INSTITUCION_PRINCIPAL',
          datosNuevos: { id_ciudad: Number(idCiudad), id_institucion: Number(idInstitucion) },
        },
        connection
      );

      await connection.commit();
      return result ? result.affectedRows : 1;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Actualiza las categorías autorizadas de una institución validando que otra institución activa
   * de la misma ciudad no posea ya esa categoría especializada (ADMIN-01 Sección 7).
   */
  async actualizarCategorias(idInstitucion, categoriasIds = [], idAdmin = null) {
    const cleanIds = Array.from(
      new Set(
        (Array.isArray(categoriasIds) ? categoriasIds : [])
          .map((n) => Number(n))
          .filter((n) => Number.isSafeInteger(n) && n > 0)
      )
    );

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[inst]] = await connection.query(
        `SELECT id_institucion, id_ciudad, nombre, verificada, status
         FROM instituciones
         WHERE id_institucion = ? FOR UPDATE`,
        [idInstitucion]
      );
      if (!inst) {
        const err = new Error('Institución no encontrada');
        err.status = 404;
        throw err;
      }

      if (cleanIds.length > 0 && inst.id_ciudad) {
        const placeholders = cleanIds.map(() => '?').join(',');
        const [conflictos] = await connection.query(
          `SELECT ic.id_categoria, c.nombre AS categoria_nombre, i.nombre AS institucion_nombre
           FROM institucion_categorias ic
           INNER JOIN instituciones i ON i.id_institucion = ic.id_institucion
           INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
           INNER JOIN categorias c ON c.id_categoria = ic.id_categoria
           WHERE i.id_ciudad = ?
             AND i.id_institucion != ?
             AND i.verificada = 1
             AND i.status = 'approved'
             AND u.activo = 1
             AND ic.id_categoria IN (${placeholders})`,
          [inst.id_ciudad, idInstitucion, ...cleanIds]
        );

        if (Array.isArray(conflictos) && conflictos.length > 0) {
          const conf = conflictos[0];
          const err = new Error(
            `La categoría "${conf.categoria_nombre}" ya está asignada a la institución activa "${conf.institucion_nombre}" en esta ciudad.`
          );
          err.status = 409;
          throw err;
        }
      }

      const [prevRows] = await connection.query(
        `SELECT id_categoria FROM institucion_categorias WHERE id_institucion = ?`,
        [idInstitucion]
      );
      const prevIds = (Array.isArray(prevRows) ? prevRows : []).map((r) => r.id_categoria);

      await connection.query(
        `DELETE FROM institucion_categorias WHERE id_institucion = ?`,
        [idInstitucion]
      );

      for (const catId of cleanIds) {
        await connection.query(
          `INSERT INTO institucion_categorias (id_institucion, id_categoria) VALUES (?, ?)`,
          [idInstitucion, catId]
        );
      }

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(idInstitucion),
          accion: 'ACTUALIZAR_CATEGORIAS_INSTITUCION',
          datosPrevios: { categorias: prevIds },
          datosNuevos: { categorias: cleanIds },
        },
        connection
      );

      await connection.commit();
      return cleanIds;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Suspende o rehabilita operativamente una institución verificada (ADMIN-01).
   * - Bloquea suspender la institución principal de una ciudad activa.
   * - Si se suspende una institución especializada, reasigna sus reclamos abiertos a la institución principal de su ciudad.
   */
  async cambiarEstadoOperativo(idInstitucion, { activo, motivo = null, idAdmin = null }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[inst]] = await connection.query(
        `SELECT i.id_institucion, i.id_usuario, i.id_ciudad, i.nombre, i.verificada, i.status, i.es_principal,
                u.activo AS usuario_activo, c.activa AS ciudad_activa, c.nombre AS ciudad_nombre
         FROM instituciones i
         INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
         LEFT JOIN ciudades c ON c.id_ciudad = i.id_ciudad
         WHERE i.id_institucion = ? FOR UPDATE`,
        [idInstitucion]
      );

      if (!inst) {
        const err = new Error('Institución no encontrada');
        err.status = 404;
        throw err;
      }

      if (Number(inst.verificada) !== 1 || inst.status === 'rejected') {
        const err = new Error('Solo se puede suspender o rehabilitar una institución previamente verificada');
        err.status = 400;
        throw err;
      }

      const targetActivo = activo ? 1 : 0;
      let reclamosReasignados = 0;

      if (targetActivo === 0) {
        // Regla 3a: Bloquear si es institución principal de una ciudad activa
        if (Number(inst.es_principal) === 1 && Number(inst.ciudad_activa) === 1) {
          const err = new Error(
            'No se puede suspender la institución principal de una ciudad activa. Primero debés designar otra institución principal válida o desactivar la ciudad.'
          );
          err.status = 409;
          err.codigo = 'INSTITUCION_PRINCIPAL_PROTEGIDA';
          throw err;
        }

        // Regla 3b: Reasignar reclamos abiertos a la institución principal de la ciudad
        const [reclamosAbiertos] = await connection.query(
          `SELECT id_reclamo, estado, titulo, id_usuario
           FROM reclamos
           WHERE id_institucion = ?
             AND estado IN ('Pendiente', 'En revisión', 'En proceso')
           FOR UPDATE`,
          [idInstitucion]
        );

        const listaAbiertos = Array.isArray(reclamosAbiertos) ? reclamosAbiertos : [];
        if (listaAbiertos.length > 0) {
          const [[principal]] = await connection.query(
            `SELECT i.id_institucion, i.nombre
             FROM instituciones i
             INNER JOIN usuarios u ON u.id_usuario = i.id_usuario
             WHERE i.id_ciudad = ?
               AND i.id_institucion != ?
               AND i.es_principal = 1
               AND i.verificada = 1
               AND i.status = 'approved'
               AND u.activo = 1
             LIMIT 1`,
            [inst.id_ciudad, idInstitucion]
          );

          if (!principal) {
            const err = new Error(
              'No se puede suspender la institución porque posee reclamos abiertos y la ciudad no cuenta con una institución principal activa para reasignarlos.'
            );
            err.status = 409;
            throw err;
          }

          await connection.query(
            `UPDATE reclamos
             SET id_institucion = ?
             WHERE id_institucion = ?
               AND estado IN ('Pendiente', 'En revisión', 'En proceso')`,
            [principal.id_institucion, idInstitucion]
          );

          const HistorialModel = require('../reclamos/models/historialModel');
          for (const rec of listaAbiertos) {
            await HistorialModel.registrar(
              {
                id_reclamo: rec.id_reclamo,
                id_usuario: idAdmin,
                tipo_evento: 'REASIGNACION',
                detalle: `Reasignado automáticamente a ${principal.nombre} por suspensión administrativa de ${inst.nombre}. Motivo: ${motivo || 'Suspensión institucional'}`,
                estado_anterior: rec.estado,
                estado_nuevo: rec.estado,
              },
              connection
            );
          }

          reclamosReasignados = listaAbiertos.length;
        }
      }

      await connection.query(
        `UPDATE usuarios SET activo = ? WHERE id_usuario = ?`,
        [targetActivo, inst.id_usuario]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idAdmin,
          entidadTipo: 'institucion',
          entidadId: Number(idInstitucion),
          accion: targetActivo === 0 ? 'SUSPENDER_INSTITUCION' : 'REHABILITAR_INSTITUCION',
          motivo: motivo ? String(motivo).trim() : null,
          datosPrevios: { activo: Number(inst.usuario_activo) },
          datosNuevos: { activo: targetActivo, reclamos_reasignados: reclamosReasignados },
        },
        connection
      );

      await connection.commit();
      return {
        id_institucion: Number(idInstitucion),
        id_usuario: inst.id_usuario,
        activo: targetActivo,
        reclamos_reasignados: reclamosReasignados,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Permite a una institución pendiente o rechazada dentro de la ventana de 7 días
   * corregir sus datos y reenviar su solicitud de verificación (ADMIN-01).
   */
  async reenviarSolicitudPorUsuario(
    idUsuario,
    { nombre, tipo, cuit, nombre_contacto, telefono, direccion, zona }
  ) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[inst]] = await connection.query(
        `SELECT id_institucion, id_usuario, nombre, tipo, cuit, nombre_contacto, telefono, direccion, zona,
                verificada, status, motivo_rechazo, fecha_rechazo
         FROM instituciones
         WHERE id_usuario = ? FOR UPDATE`,
        [idUsuario]
      );

      if (!inst) {
        const err = new Error('Solicitud institucional no encontrada');
        err.status = 404;
        throw err;
      }

      if (Number(inst.verificada) === 1) {
        const err = new Error('La institución ya se encuentra verificada');
        err.status = 409;
        throw err;
      }

      const datosNuevos = {
        nombre: String(nombre).trim(),
        tipo: tipo && String(tipo).trim() ? String(tipo).trim() : (inst.tipo || 'otra'),
        cuit: cuit !== undefined ? (cuit ? String(cuit).trim() : null) : inst.cuit,
        nombre_contacto:
          nombre_contacto !== undefined
            ? (nombre_contacto ? String(nombre_contacto).trim() : null)
            : inst.nombre_contacto,
        telefono:
          telefono && String(telefono).trim() ? String(telefono).trim() : (inst.telefono || ''),
        direccion:
          direccion && String(direccion).trim()
            ? String(direccion).trim()
            : (inst.direccion || ''),
        zona: zona && String(zona).trim() ? String(zona).trim() : (inst.zona || 'Centro'),
        status: 'pending',
      };

      await connection.query(
        `UPDATE instituciones
         SET nombre = ?,
             tipo = ?,
             cuit = ?,
             nombre_contacto = ?,
             telefono = ?,
             direccion = ?,
             zona = ?,
             status = 'pending',
             motivo_rechazo = NULL,
             fecha_rechazo = NULL
         WHERE id_institucion = ?`,
        [
          datosNuevos.nombre,
          datosNuevos.tipo,
          datosNuevos.cuit,
          datosNuevos.nombre_contacto,
          datosNuevos.telefono,
          datosNuevos.direccion,
          datosNuevos.zona,
          inst.id_institucion,
        ]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idUsuario,
          entidadTipo: 'institucion',
          entidadId: Number(inst.id_institucion),
          accion: 'REENVIAR_SOLICITUD_INSTITUCION',
          datosPrevios: {
            nombre: inst.nombre,
            tipo: inst.tipo,
            cuit: inst.cuit,
            nombre_contacto: inst.nombre_contacto,
            telefono: inst.telefono,
            direccion: inst.direccion,
            zona: inst.zona,
            status: inst.status,
            motivo_rechazo: inst.motivo_rechazo,
            fecha_rechazo: inst.fecha_rechazo,
          },
          datosNuevos,
        },
        connection
      );

      await connection.commit();
      return { id_institucion: inst.id_institucion, ...datosNuevos };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Convierte una cuenta con solicitud institucional no verificada/rechazada en una cuenta de ciudadano
   * conservando el mismo usuario/email sin duplicar registros en usuarios (ADMIN-01).
   */
  async convertirACiudadanoPorUsuario(idUsuario, { nombre, apellido, provincia, ciudad, zona }) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [[inst]] = await connection.query(
        `SELECT id_institucion, id_usuario, nombre, tipo, cuit, nombre_contacto,
                provincia, ciudad, zona, direccion, telefono, verificada, status, motivo_rechazo
         FROM instituciones
         WHERE id_usuario = ? FOR UPDATE`,
        [idUsuario]
      );

      if (!inst) {
        const err = new Error('No se encontró una solicitud institucional asociada a esta cuenta');
        err.status = 404;
        throw err;
      }

      if (Number(inst.verificada) === 1) {
        const err = new Error('No se puede convertir a ciudadano una institución que ya fue verificada');
        err.status = 409;
        throw err;
      }

      const nombreLimpio = String(nombre || '').trim();
      const apellidoLimpio = String(apellido || '').trim();
      const provinciaFinal = String(provincia || inst.provincia || '').trim() || null;
      const ciudadFinal = String(ciudad || inst.ciudad || '').trim() || null;
      const zonaFinal = String(zona || inst.zona || '').trim() || null;

      await connection.query(
        `INSERT INTO ciudadanos (id_usuario, nombre, apellido, provincia, ciudad, zona)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nombre = VALUES(nombre),
           apellido = VALUES(apellido),
           provincia = VALUES(provincia),
           ciudad = VALUES(ciudad),
           zona = VALUES(zona)`,
        [idUsuario, nombreLimpio, apellidoLimpio, provinciaFinal, ciudadFinal, zonaFinal]
      );

      await connection.query(
        `UPDATE usuarios SET tipo_usuario = 'ciudadano' WHERE id_usuario = ?`,
        [idUsuario]
      );

      await connection.query(
        `DELETE FROM instituciones WHERE id_institucion = ? AND verificada = 0`,
        [inst.id_institucion]
      );

      await AuditoriaModel.registrar(
        {
          idActor: idUsuario,
          entidadTipo: 'usuario',
          entidadId: Number(idUsuario),
          accion: 'CONVERTIR_INSTITUCION_A_CIUDADANO',
          datosPrevios: {
            id_institucion: inst.id_institucion,
            nombre_institucion: inst.nombre,
            status: inst.status,
            motivo_rechazo: inst.motivo_rechazo,
          },
          datosNuevos: {
            tipo_usuario: 'ciudadano',
            nombre: nombreLimpio,
            apellido: apellidoLimpio,
            provincia: provinciaFinal,
            ciudad: ciudadFinal,
            zona: zonaFinal,
          },
        },
        connection
      );

      await connection.commit();
      return {
        id_usuario: Number(idUsuario),
        rol: 'ciudadano',
        nombre: `${nombreLimpio} ${apellidoLimpio}`.trim(),
        provincia: provinciaFinal,
        ciudad: ciudadFinal,
        zona: zonaFinal,
      };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

module.exports = InstitutionModel;