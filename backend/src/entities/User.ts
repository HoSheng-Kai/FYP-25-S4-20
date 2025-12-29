// Adjust the path if your database file is elsewhere
import pool from '../schema/database';

// import User from '../db/table'

class UserEntity {
    //  Create new account
    static async createAccount(username: string, password: string, email: string, role_id: string, privateKey: string, publicKey: string)
    : Promise<void>{
        const result = await pool.query(`
            INSERT INTO users (username, password_hash, email, role_id, private_key, public_key, verified)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [username, password, email, role_id, privateKey, publicKey, false]);
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

}

export default UserEntity;
