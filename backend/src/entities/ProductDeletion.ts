// src/entities/ProductDeletion.ts
import pool from '../schema/database';

export interface DeleteResult {
  success: boolean;
  reason?: string;
}

export class ProductDeletion {
  static async deleteProductIfAllowed(
    productId: number,
    manufacturerId: number
  ): Promise<DeleteResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1) Check product exists and who registered it
      const productResult = await client.query(
        `
        SELECT product_id, registered_by, status
        FROM product
        WHERE product_id = $1;
        `,
        [productId]
      );

      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'Product not found' };
      }

      const product = productResult.rows[0];

      // Must be registered by this manufacturer
      if (product.registered_by !== manufacturerId) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'You are not the registrant of this product',
        };
      }

      // Must still be in "registered" state (not yet verified/live)
      if (product.status !== 'registered') {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'Only products in status "registered" can be deleted',
        };
      }

      // 2) Check if there are other owners (ownership rows with owner_id != manufacturerId)
      const ownershipResult = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM ownership
        WHERE product_id = $1
          AND owner_id <> $2;
        `,
        [productId, manufacturerId]
      );
      const ownershipCount = ownershipResult.rows[0].count as number;

      if (ownershipCount > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'Product has been transferred to other owners and cannot be deleted',
        };
      }

      // 3) Check if there are any listings
      const listingResult = await client.query(
        `
        SELECT COUNT(*)::int AS count
        FROM product_listing
        WHERE product_id = $1;
        `,
        [productId]
      );
      const listingCount = listingResult.rows[0].count as number;

      if (listingCount > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          reason: 'Product has listings and cannot be deleted',
        };
      }

      // 4) Everything OK → delete product (cascades to ownership, etc. if set)
      await client.query(
        `
        DELETE FROM product
        WHERE product_id = $1;
        `,
        [productId]
      );

      await client.query('COMMIT');

      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
