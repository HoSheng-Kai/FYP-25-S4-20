// src/entities/ProductDeletion.ts
import pool from "../schema/database";

export class ProductDeletion {
  static async deleteProductIfAllowed(
    productId: number,
    manufacturerId: number
  ): Promise<{ success: boolean; reason?: string }> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1) Lock product row so no confirm can happen concurrently
      const check = await client.query(
        `
        SELECT product_id, registered_by, tx_hash
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        FOR UPDATE;
        `,
        [productId]
      );

      if (check.rows.length === 0) {
        await client.query("ROLLBACK");
        return { success: false, reason: "Product not found" };
      }

      const p = check.rows[0];

      // 2) Must be manufacturer who created it
      if (p.registered_by !== manufacturerId) {
        await client.query("ROLLBACK");
        return { success: false, reason: "Not allowed (different manufacturer)" };
      }

      // 3) Must NOT be on-chain
      if (p.tx_hash) {
        await client.query("ROLLBACK");
        return { success: false, reason: "Already on blockchain (tx_hash exists)" };
      }

      // 4) Delete metadata (if you store metadata rows)
      // (Safe even if none exists)
      await client.query(
        `DELETE FROM fyp_25_s4_20.product_metadata WHERE product_id = $1;`,
        [productId]
      );

      // 5) Delete listings (optional, because product_listing has ON DELETE CASCADE)
      await client.query(
        `DELETE FROM fyp_25_s4_20.product_listing WHERE product_id = $1;`,
        [productId]
      );

      // 6) Delete the product itself
      await client.query(
        `DELETE FROM fyp_25_s4_20.product WHERE product_id = $1;`,
        [productId]
      );

      await client.query("COMMIT");
      return { success: true };
    } catch (err: any) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      return { success: false, reason: err?.message ?? String(err) };
    } finally {
      client.release();
    }
  }
}
