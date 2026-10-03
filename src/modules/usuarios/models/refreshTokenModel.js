const db = require('../../../config/db');

const RefreshTokenModel = {
  async create({ token, id_usuario, user_type, expires_at }) {
    await db.query(
      'INSERT INTO refresh_tokens (token, id_usuario, user_type, expires_at, created_at) VALUES (?, ?, ?, ?, NOW())',
      [token, id_usuario, user_type, expires_at]
    );
  },
  async findByToken(token) {
    const [tokens] = await db.query('SELECT * FROM refresh_tokens WHERE token = ?', [token]);
    return tokens[0] || null;
  },
  async deleteById(id) {
    await db.query('DELETE FROM refresh_tokens WHERE id = ?', [id]);
  },
  async deleteByToken(token) {
    await db.query('DELETE FROM refresh_tokens WHERE token = ?', [token]);
  },
  async deleteByUserId(id_usuario) {
    await db.query('DELETE FROM refresh_tokens WHERE id_usuario = ?', [id_usuario]);
  }
};

module.exports = RefreshTokenModel;
