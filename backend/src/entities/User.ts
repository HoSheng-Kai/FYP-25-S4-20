// Adjust the path if your database file is elsewhere
import pool from '../schema/database';

export interface UserRow {
  // Put your real columns here
  id: number;
  name: string;
  email: string;
  // etc...
}

export class User {
  // Get all users
  static async findAll(): Promise<UserRow[]> {
    const result = await pool.query<UserRow>('SELECT * FROM users');
    return result.rows;
  }
}
