import pool from '../schema/database';
import { QrCodeService } from '../service/QrCodeService';

export interface UpdateProductInput {
  productId: number;
  manufacturerId: number;
  serialNo?: string;
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string;
  description?: string;
}

export interface UpdatedProductResult {
  product_id: number;
  serial_no: string;
  model: string | null;
  batch_no: string | null;
  category: string | null;
  manufacture_date: Date | null;
  description: string | null;
  status: string;
  registered_on: Date;
  qr_payload: string;
}

export class ProductUpdate {
  static async updateProductWithQr(
    input: UpdateProductInput
  ): Promise<UpdatedProductResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1) Fetch product
      const productResult = await client.query(
        `
        SELECT product_id, registered_by, serial_no, model, batch_no,
               category, manufacture_date, description, status, registered_on
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [input.productId]
      );

      if (productResult.rows.length === 0) {
        throw new Error('Product not found');
      }

      const product = productResult.rows[0];

      // 2) Check manufacturer permission
      if (product.registered_by !== input.manufacturerId) {
        throw new Error('You do not have permission to update this product');
      }

      // 3) Determine updated values
      const newSerialNo = input.serialNo ?? product.serial_no;
      const newModel = input.productName ?? product.model;
      const newBatch = input.batchNo ?? product.batch_no;
      const newCategory = input.category ?? product.category;
      const newMfgDate = input.manufactureDate ?? product.manufacture_date;
      const newDescription = input.description ?? product.description;

      // 4) Build new QR payload
      const qrPayload = QrCodeService.buildPayload(
        input.productId,
        newSerialNo,
        input.manufacturerId
      );

      // 5) Generate PNG QR code
      const qrBuffer = await QrCodeService.generatePngBuffer(qrPayload);

      // 6) Update DB
      const updatedResult = await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET serial_no=$1, model=$2, batch_no=$3, category=$4,
            manufacture_date=$5, description=$6, qr_code=$7
        WHERE product_id=$8
        RETURNING product_id, serial_no, model, batch_no, category,
                  manufacture_date, description, status, registered_on;
        `,
        [
          newSerialNo,
          newModel,
          newBatch,
          newCategory,
          newMfgDate,
          newDescription,
          qrBuffer,
          input.productId,
        ]
      );

      await client.query('COMMIT');

      return {
        ...updatedResult.rows[0],
        qr_payload: qrPayload,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
