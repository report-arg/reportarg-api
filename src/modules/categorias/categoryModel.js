const db = require('../../config/db');

const CategoryModel = {

  async getAll({ busqueda, tipo, estado } = {}) {
    let query = `
      SELECT id_categoria AS id, id_categoria, codigo, nombre, descripcion, tipo, estado, orden
      FROM categorias
      WHERE 1=1
    `;
    const params = [];

    if (estado && ['activo', 'inactivo'].includes(estado)) {
      query += ` AND estado = ?`;
      params.push(estado);
    }

    if (tipo && ['reclamo', 'comunicado', 'ambos'].includes(tipo)) {
      query += ` AND tipo = ?`;
      params.push(tipo);
    }

    if (busqueda && busqueda.trim()) {
      const term = `%${busqueda.trim()}%`;
      query += ` AND (nombre LIKE ? OR codigo LIKE ? OR descripcion LIKE ?)`;
      params.push(term, term, term);
    }

    query += ` ORDER BY orden ASC, nombre ASC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, id_categoria, codigo, nombre, descripcion, tipo, estado, orden
      FROM categorias
      WHERE id_categoria = ?
    `, [id]);
    return rows[0] || null;
  },

  async generarCodigo() {
    const [rows] = await db.query(`
      SELECT id_categoria FROM categorias ORDER BY id_categoria DESC LIMIT 1
    `);
    if (rows.length === 0) return 'CAT-001';
    const ultimoId = rows[0].id_categoria + 1;
    return `CAT-${String(ultimoId).padStart(3, '0')}`;
  },

  async create({ nombre, descripcion, tipo, estado = 'activo', orden = 0 }) {
    const codigo = await this.generarCodigo();
    const [result] = await db.query(`
      INSERT INTO categorias (codigo, nombre, descripcion, tipo, estado, orden)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [codigo, nombre, descripcion, tipo, estado, orden]);
    return { id: result.insertId, codigo };
  },

  async update(id, { nombre, descripcion, tipo, estado, orden }) {
    const [result] = await db.query(`
      UPDATE categorias 
      SET nombre = ?, descripcion = ?, tipo = ?, estado = ?, orden = ?
      WHERE id_categoria = ?
    `, [nombre, descripcion, tipo, estado, orden, id]);
    return result.affectedRows;
  },

  async bajaLogica(id) {
    const [result] = await db.query(`
      UPDATE categorias SET estado = 'inactivo'
      WHERE id_categoria = ?
    `, [id]);
    return result.affectedRows;
  },

  async reactivar(id) {
    const [result] = await db.query(`
      UPDATE categorias SET estado = 'activo'
      WHERE id_categoria = ?
    `, [id]);
    return result.affectedRows;
  },

  async delete(id) {
    // 1. Validar integridad referencial con reclamos
    const [[reclamosRef]] = await db.query(
      'SELECT COUNT(*) AS total FROM reclamos WHERE id_categoria = ?',
      [id]
    );
    if (reclamosRef?.total > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar la categoría porque tiene ${reclamosRef.total} reclamo(s) asociado(s). Utilizá la baja lógica para desactivarla.`),
        { status: 409 }
      );
    }

    // 2. Validar integridad referencial con comunicados
    const [[comunicadosRef]] = await db.query(
      'SELECT COUNT(*) AS total FROM comunicados WHERE id_categoria = ?',
      [id]
    );
    if (comunicadosRef?.total > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar la categoría porque tiene ${comunicadosRef.total} comunicado(s) asociado(s). Utilizá la baja lógica para desactivarla.`),
        { status: 409 }
      );
    }

    // 3. Validar instituciones asignadas
    const [[institucionesRef]] = await db.query(
      'SELECT COUNT(*) AS total FROM institucion_categorias WHERE id_categoria = ?',
      [id]
    );
    if (institucionesRef?.total > 0) {
      throw Object.assign(
        new Error(`No se puede eliminar la categoría porque está asignada a instituciones operativas. Utilizá la baja lógica para desactivarla.`),
        { status: 409 }
      );
    }

    const [result] = await db.query('DELETE FROM categorias WHERE id_categoria = ?', [id]);
    return result.affectedRows;
  },

  async nombreExiste(nombre, excludeId = null) {
    let query = `SELECT id_categoria FROM categorias WHERE nombre = ?`;
    const params = [nombre];
    if (excludeId) {
      query += ` AND id_categoria != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  async codigoExiste(codigo, excludeId = null) {
    let query = `SELECT id_categoria FROM categorias WHERE codigo = ?`;
    const params = [codigo];
    if (excludeId) {
      query += ` AND id_categoria != ?`;
      params.push(excludeId);
    }
    const [rows] = await db.query(query, params);
    return rows.length > 0;
  },

  async getParaReclamo() {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, nombre, descripcion, tipo, orden
      FROM categorias
      WHERE estado = 'activo' AND tipo IN ('reclamo', 'ambos')
      ORDER BY orden ASC
    `);
    return rows;
  },

  async getParaComunicado() {
    const [rows] = await db.query(`
      SELECT id_categoria AS id, nombre, descripcion, tipo, orden
      FROM categorias
      WHERE estado = 'activo' AND tipo IN ('comunicado', 'ambos')
      ORDER BY orden ASC
    `);
    return rows;
  },

};

module.exports = CategoryModel;