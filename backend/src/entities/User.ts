// Adjust the path if your database file is elsewhere
import pool from '../schema/database';

// import User from '../db/table'

class UserEntity {
    // ============================================================
    // ✅ UNCOMMENT BELOW WHEN DEPLOYING (no private key)
    // ============================================================
    static async createAccount(username: string, password: string, email: string, role_id: string, publicKey: string)
    : Promise<void>{
        await pool.query(`
            INSERT INTO users (username, password_hash, email, role_id, public_key, verified)
            VALUES ($1, $2, $3, $4, $5, $6)
            `, [username, password, email, role_id, publicKey, false]);
    }

    // Login
    // Check username, password
    static async loginAccount(username: string)
    : Promise<{password: string, email: string; userId: number; role: string, verified: boolean, banned: boolean}>{
        const result = await pool.query(`
            SELECT *
            FROM users
            WHERE username = $1
            `, [username]);

        if (result.rows.length === 0){
            throw new Error("User does not exist.");
        } 

        return {password: result.rows[0].password_hash, email: result.rows[0].email, userId: result.rows[0].user_id, role: result.rows[0].role_id, verified: result.rows[0].verified, banned: result.rows[0].banned};
    }

    // Logout
    // Just return true, assuming nothing needs to be done
    static async logoutAccount()
    : Promise<Boolean>{
        return true;
    }

    static async listUsers()
    : Promise<{ user_id: number; username: string; role_id: string; public_key: string | null }[]> {
    const result = await pool.query(`
        SELECT user_id, username, role_id, public_key
        FROM users
        ORDER BY username ASC
    `);

    return result.rows;
    }

    static async updatePassword(userId: number, newPassword: string): Promise<void> {
        const result = await pool.query(`
            UPDATE users
            SET password_hash = $1
            WHERE user_id = $2
        `, [newPassword, userId]);

        if (result.rowCount === 0) {
            throw new Error("User not found.");
        }
    }

    static async updateEmail(userId: number, newEmail: string): Promise<void> {
        const result = await pool.query(`
            UPDATE users
            SET email = $1
            WHERE user_id = $2
        `, [newEmail, userId]);

        if (result.rowCount === 0) {
            throw new Error("User not found.");
        }
    }

    static async deleteUser(userId: number): Promise<void> {
        const result = await pool.query(`
            DELETE FROM users
            WHERE user_id = $1
        `, [userId]);

        if (result.rowCount === 0) {
            throw new Error("User not found.");
        }
    }

    static async updatePublicKey(userId: number, newPublicKey: string): Promise<void> {
        const result = await pool.query(`
            UPDATE users
            SET public_key = $1
            WHERE user_id = $2
        `, [newPublicKey, userId]);

        if (result.rowCount === 0) {
            throw new Error("User not found.");
        }
    }
}

export default UserEntity;
