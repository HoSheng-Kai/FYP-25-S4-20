const pool = require('../../config/database');

class User {
  // Get all users
  static async findAll() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows;
  }
}

module.exports = User;