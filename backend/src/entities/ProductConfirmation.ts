import pool from '../schema/database';

export interface ConfirmProductInput {
  productId: number;
  manufacturerId: number;
  txHash: string;
  fromPublicKey: string;
}

export class ProductConfirmation {
  static async confirmProduct(input: ConfirmProductInput) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('SET search_path TO fyp_25_s4_20;');

      // 1) Ensure product exists and belongs to manufacturer
      const productRes = await client.query(
        `
        SELECT product_id, status
        FROM product
        WHERE product_id = $1
          AND registered_by = $2;
        `,
        [input.productId, input.manufacturerId]
      );

      if (productRes.rows.length === 0) {
        throw new Error('Product not found or not owned by manufacturer');
      }

      // 2) Prevent double confirmation
      const existsRes = await client.query(
        `
        SELECT 1
        FROM blockchain_node
        WHERE product_id = $1
        LIMIT 1;
        `,
        [input.productId]
      );

      if (existsRes.rows.length > 0) {
        throw new Error('Product already confirmed on blockchain');
      }

      // 3) Insert blockchain node (mint / confirm)
      await client.query(
        `
        INSERT INTO blockchain_node (
          tx_hash,
          prev_tx_hash,
          from_user_id,
          from_public_key,
          to_user_id,
          to_public_key,
          product_id,
          block_slot
        )
        VALUES ($1, NULL, $2, $3, $2, $3, $4, $5);
        `,
        [
          input.txHash,
          input.manufacturerId,
          input.fromPublicKey,
          input.productId,
          Date.now(), // block_slot placeholder
        ]
      );

      // 4) Insert ownership (manufacturer becomes first owner)
      await client.query(
        `
        INSERT INTO ownership (
          owner_id,
          owner_public_key,
          product_id,
          start_on,
          end_on,
          tx_hash
        )
        VALUES ($1, $2, $3, NOW(), NULL, $4);
        `,
        [
          input.manufacturerId,
          input.fromPublicKey,
          input.productId,
          input.txHash,
        ]
      );

      // 5) Update product status
      await client.query(
        `
        UPDATE product
        SET status = 'verified'
        WHERE product_id = $1;
        `,
        [input.productId]
      );

      await client.query('COMMIT');

      return {
        productId: input.productId,
        blockchainStatus: 'on blockchain',
        txHash: input.txHash,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
