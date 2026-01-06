import pool from '../schema/database';
import { ownership, blockchain_node } from '../db/table'

class DistributorEntity {

    static async getUserById(userId: number) {
        const result = await pool.query(
            `SELECT user_id, username, public_key, private_key FROM fyp_25_s4_20.users WHERE user_id = $1`,
            [userId]
        );
        return result.rows[0] || null;
    }

    static async getProductById(productId: number) {
        const result = await pool.query(
            `SELECT product_id, serial_no, product_pda, registered_by, tx_hash, track FROM fyp_25_s4_20.product WHERE product_id = $1`,
            [productId]
        );
        return result.rows[0] || null;
    }

    static async endTracking(productId: number): Promise<void> {
        await pool.query(
            `UPDATE fyp_25_s4_20.product SET track = false WHERE product_id = $1`,
            [productId]
        );
    }

    static async getCurrentOwnership(productId: number): Promise<ownership | null> {
        const result = await pool.query(
            `SELECT * FROM fyp_25_s4_20.ownership WHERE product_id = $1 AND end_on IS NULL LIMIT 1`,
            [productId]
        );
        return result.rows[0] || null;
    }

    static async getUserByPublicKey(publicKey: string) {
        const result = await pool.query(
            `SELECT user_id, username, public_key FROM fyp_25_s4_20.users WHERE public_key = $1`,
            [publicKey]
        );
        return result.rows[0] || null;
    }

    static async updateProductPda(productId: number, productPda: string, txHash: string | null): Promise<void> {
        await pool.query(`
            UPDATE fyp_25_s4_20.product
            SET product_pda = $1, tx_hash = $2, status = 'verified'
            WHERE product_id = $3
        `, [productPda, txHash, productId]);
    }

    static async upsertProduct(data: {
        manufacturer_id: number;
        serial_no: string;
        product_name?: string;
        batch_no?: string;
        category?: string;
        manufacture_date?: string;
        description?: string;
        product_pda: string;
        tx_hash: string;
    }): Promise<number> {
        const result = await pool.query(`
            INSERT INTO fyp_25_s4_20.product (
                registered_by, serial_no, model, batch_no, category,
                manufacture_date, description, status, registered_on,
                product_pda, tx_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'verified', NOW(), $8, $9)
            ON CONFLICT (serial_no) DO UPDATE SET
                product_pda = EXCLUDED.product_pda,
                tx_hash = EXCLUDED.tx_hash,
                status = 'verified'
            RETURNING product_id
        `, [
            data.manufacturer_id,
            data.serial_no,
            data.product_name || null,
            data.batch_no || null,
            data.category || null,
            data.manufacture_date || null,
            data.description || null,
            data.product_pda,
            data.tx_hash
        ]);
        return result.rows[0].product_id;
    }
    static async viewLatestBlockchainNode(product_id: number)
    : Promise<blockchain_node | null>{
        const result = await pool.query(`
        SELECT *
        FROM fyp_25_s4_20.blockchain_node
        WHERE product_id = $1
        ORDER BY block_slot DESC, created_on DESC
        LIMIT 1
        `, [product_id]);
        
        return result.rows[0] || null;
    }

    static async getOwnership(tx_hash: string)
    : Promise<ownership | null>{
        const result = await pool.query(
            `SELECT *
            FROM fyp_25_s4_20.ownership
            WHERE tx_hash = $1
            LIMIT 1`,
            [tx_hash]
        );

        return result.rows[0] || null;
    }

    static async updateOwnership(ownership: ownership): Promise<void> {
        await pool.query(`
            UPDATE fyp_25_s4_20.ownership
            SET owner_id = $1,
                owner_public_key = $2,
                product_id = $3,
                start_on = $4,
                end_on = $5,
                tx_hash = $6
            WHERE ownership_id = $7
        `, [
            ownership.owner_id,
            ownership.owner_public_key,
            ownership.product_id,
            ownership.start_on,
            ownership.end_on,
            ownership.tx_hash,
            ownership.ownership_id
        ]);
    }
    
    static async createOwnership(ownership: ownership): Promise<void> {
        await pool.query(`
            INSERT INTO fyp_25_s4_20.ownership (
                owner_id, owner_public_key, product_id,
                start_on, end_on, tx_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            ownership.owner_id,
            ownership.owner_public_key,
            ownership.product_id,
            ownership.start_on,
            ownership.end_on,
            ownership.tx_hash
        ]);
    }

    static async createBlockchainNode(data: blockchain_node): Promise<void> {
            await pool.query(`
                INSERT INTO fyp_25_s4_20.blockchain_node (
                    tx_hash, prev_tx_hash, from_user_id, from_public_key,
                    to_user_id, to_public_key, product_id, block_slot, created_on
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                data.tx_hash,
                data.prev_tx_hash,
                data.from_user_id,
                data.from_public_key,
                data.to_user_id,
                data.to_public_key,
                data.product_id,
                data.block_slot,
                data.created_on
            ]);
        }

    static async getOwnershipHistory(product_id: number): Promise<any[]> {
        const result = await pool.query(`
            SELECT o.*, u.username
            FROM fyp_25_s4_20.ownership o
            JOIN fyp_25_s4_20.users u ON o.owner_id = u.user_id
            WHERE o.product_id = $1
            ORDER BY o.start_on ASC
        `, [product_id]);
        return result.rows;
    }

    static async getProductsByUserId(userId: number): Promise<any[]> {
        const result = await pool.query(
            `
            SELECT
            p.product_id,
            p.serial_no,
            p.model,
            p.batch_no,
            p.category,
            p.manufacture_date,
            p.description,
            p.status,
            p.stage,
            p.product_pda,
            p.tx_hash,
            p.track,
            p.registered_by,

            -- latest ownership row (current owner if end_on is null)
            o_latest.ownership_id,
            o_latest.owner_id AS latest_owner_id,
            o_latest.start_on AS latest_owned_since,
            o_latest.end_on   AS latest_end_on,

            CASE
                WHEN o_latest.end_on IS NULL AND o_latest.owner_id = $1 THEN 'owner'
                WHEN p.registered_by = $1 THEN 'manufacturer'
                ELSE NULL
            END AS relationship,

            CASE
                WHEN o_latest.end_on IS NULL AND o_latest.owner_id = $1 THEN o_latest.start_on
                ELSE NULL
            END AS owned_since

            FROM fyp_25_s4_20.product p

            -- pick ONE latest ownership row per product
            LEFT JOIN LATERAL (
            SELECT o.*
            FROM fyp_25_s4_20.ownership o
            WHERE o.product_id = p.product_id
            ORDER BY
                (o.end_on IS NULL) DESC,   -- prefer active row
                o.start_on DESC            -- newest first
            LIMIT 1
            ) o_latest ON TRUE

            -- show products you registered OR products you currently own
            WHERE p.registered_by = $1
            OR (o_latest.end_on IS NULL AND o_latest.owner_id = $1)

            ORDER BY p.product_id DESC;
            `,
            [userId]
        );

        return result.rows;
        }

}

export default DistributorEntity;