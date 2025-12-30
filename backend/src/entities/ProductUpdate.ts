// src/entities/ProductUpdate.ts
import pool from "../schema/database";
import { QrCodeService } from "../service/QrCodeService";

export interface UpdateProductInput {
  productId: number;
  manufacturerId: number;
  serialNo?: string; // recommend NOT changing
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string; // YYYY-MM-DD
  description?: string;
}

export type UpdatedProductRow = {
  product_id: number;
  serial_no: string;
  model: string | null;
  batch_no: string | null;
  category: string | null;
  manufacture_date: Date | null;
  description: string | null;
  status: string;
  registered_on: Date;
  registered_by: number | null;
  tx_hash: string | null;
  product_pda: string | null;
  qr_payload: string;
};

export class ProductUpdate {
  static async updateProductWithQr(input: UpdateProductInput): Promise<UpdatedProductRow> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1) Lock product row
      const check = await client.query(
        `
        SELECT product_id, registered_by, serial_no, tx_hash
        FROM fyp_25_s4_20.product
        WHERE product_id = $1
        FOR UPDATE;
        `,
        [input.productId]
      );

      if (check.rows.length === 0) {
        const err: any = new Error("Product not found");
        err.status = 404;
        throw err;
      }

      const prod = check.rows[0];

      // 2) Manufacturer ownership check
      if (prod.registered_by !== input.manufacturerId) {
        const err: any = new Error("Not allowed (not the manufacturer who registered this product)");
        err.status = 403;
        throw err;
      }

      // 3) Block updates after blockchain confirmation
      if (prod.tx_hash) {
        const err: any = new Error("Cannot update product after it is confirmed on blockchain");
        err.status = 409;
        throw err;
      }

      // 4) Prevent changing serialNo (recommended)
      if (input.serialNo && input.serialNo !== prod.serial_no) {
        const err: any = new Error("serialNo cannot be changed (identity field). Create a new product instead.");
        err.status = 409;
        throw err;
      }

      // 5) Update product fields (keep serial same)
      const updated = await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET
          model = $1,
          batch_no = $2,
          category = $3,
          manufacture_date = $4,
          description = $5
        WHERE product_id = $6
        RETURNING
          product_id,
          serial_no,
          model,
          batch_no,
          category,
          manufacture_date,
          description,
          status,
          registered_on,
          registered_by,
          tx_hash,
          product_pda;
        `,
        [
          input.productName ?? null,
          input.batchNo ?? null,
          input.category ?? null,
          input.manufactureDate ?? null,
          input.description ?? null,
          input.productId,
        ]
      );

      const row = updated.rows[0];

      // 6) Generate NEW QR payload & QR image bytes, store in DB
      // QR payload ties to product_id + serial_no + manufacturerId (your existing logic)
      const qrPayload = QrCodeService.buildPayload(row.product_id, row.serial_no, input.manufacturerId);
      const qrBuffer = await QrCodeService.generatePngBuffer(qrPayload);

      await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET qr_code = $1
        WHERE product_id = $2;
        `,
        [qrBuffer, row.product_id]
      );

      await client.query("COMMIT");

      return {
        ...row,
        qr_payload: qrPayload,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
