// Adjust the path if your database file is elsewhere
import pool from '../schema/database';

interface User{
    user_id: number;
    username: string;
    password_hash: string;
    email: string;
    role_id: string;
    created_on: Date;
}

class UserEntity {
    //  Create new account
    static async createAccount(username: string, password: string, email: string, role_id: string, privateKey: string, publicKey: string)
    : Promise<void>{
        const result = await pool.query(`
            INSERT INTO users (username, password_hash, email, role_id, private_key, public_key)
            VALUES ($1, $2, $3, $4, $5, $6)
            `, [username, password, email, role_id, privateKey, publicKey]);
    }

    // Login
    // Check username, password
    static async loginAccount(username: string, password: string)
    : Promise<{email: string}>{
        const result = await pool.query(`
            SELECT *
            FROM users
            WHERE username = $1 AND password_hash = $2
            `, [username, password]);

        if (result.rows.length === 0){
            throw new Error("User does not exist.");
        } 

        return {email: result.rows[0].email};
    }

    // Logout
    // Just return true, assuming nothing needs to be done
    static async logoutAccount()
    : Promise<Boolean>{
        return true;
    }

}

export default UserEntity;