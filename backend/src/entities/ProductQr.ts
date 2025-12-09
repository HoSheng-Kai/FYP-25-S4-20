// src/entities/ProductQr.ts
import pool from '../schema/database';

export class ProductQr {
  static async getQrCodeById(productId: number): Promise<Buffer | null> {
    const result = await pool.query(
      `
      SELECT qr_code
      FROM fyp_25_s4_20.product
      WHERE product_id = $1;
      `,
      [productId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];

    return row.qr_code || null;
  }
}
