import pool from '../schema/database';

// import User from '../db/table'

class AdminEntity {
    // Change verification here
    static async createAccounts(usernames: string[] = [])
    : Promise<void>{
        if (usernames.length === 0) return;
        // Build placeholder list: $1, $2, $3, ...
        const placeholders = usernames.map((_, i) => `$${i + 1}`).join(", ");

        const sql = `
            UPDATE users
            SET verified = TRUE
            WHERE username IN (${placeholders});
        `;

        await pool.query(sql, usernames);   
    }

    static async viewAccounts(username: string = "", role_id: string = "", verified: boolean | null = null)
    :Promise<any[]>{
        const conditions: string[] = [];
        const values: any[] = [];

        // Add filters only if provided
        if (username) {
            values.push(username);
            conditions.push(`username = $${values.length}`);
        }

        if (role_id) {
            values.push(role_id);
            conditions.push(`role_id = $${values.length}`);
        }

        if (verified !== null) {
            values.push(verified);
            conditions.push(`verified = $${values.length}`);
        }

        // Build SQL
        const sql = `
            SELECT *
            FROM users
            ${conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : ""}
        `;

        const result = await pool.query(sql, values);
        return result.rows;
    }

    // Changes user role
    static async updateAccounts(username: string, role_id: string)
    :Promise<void>{
        const result = await pool.query(`
            UPDATE users
            SET role_id = $1
            WHERE username = $2
        `, [role_id, username]
        );

    }

    static async deleteAccounts(usernames: string[] = [])
    :Promise<void>{
        if (usernames.length === 0) return;
        // Build placeholder list: $1, $2, $3, ...
        const placeholders = usernames.map((_, i) => `$${i + 1}`).join(", ");

        const sql = `
            DELETE FROM users
            WHERE username IN (${placeholders});
        `;

        await pool.query(sql, usernames);   
    }

    static async readProductListings()
    :Promise<any[]>{
        const sql = `
        SELECT *
        FROM product_listing
        ORDER BY listing_id ASC;
        `;

        const result = await pool.query(sql);
        return result.rows;
    }

    static async deleteProductListings(listing_id: number)
    :Promise<void>{
        const sql = `
        DELETE FROM product_listing
        WHERE listing_id = $1
        `;

        await pool.query(sql, [listing_id]);
    }


}

export default AdminEntity;
