import pool from '../schema/database';
import { ownership, blockchain_node } from '../db/table'

class DistributorEntity {
    static async viewLatestBlockchainNode(product_id: number)
    : Promise<blockchain_node | null>{
        const result = await pool.query(`
        SELECT *
        FROM blockchain_node
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
            FROM ownership 
            WHERE tx_hash = $1
            LIMIT 1`,
            [tx_hash]
        );

        return result.rows[0] || null;
    }

    static async updateOwnership(ownership: ownership): Promise<void> {
        await pool.query(`
            UPDATE ownership
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
            INSERT INTO ownership (
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
                INSERT INTO blockchain_node (
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
}

export default DistributorEntity;