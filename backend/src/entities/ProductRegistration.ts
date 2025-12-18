import pool from '../schema/database';
import { QrCodeService } from '../service/QrCodeService';

export interface RegisterProductInput {
  manufacturerId: number;
  serialNo: string;
  productName?: string;
  batchNo?: string;
  category?: string;
  manufactureDate?: string; // 'YYYY-MM-DD'
  description?: string;
  price?: number;
  currency?: string; // 'SGD' | 'USD' | 'EUR'
}

export interface RegisteredProductResult {
  product: {
    product_id: number;
    serial_no: string;
    model: string | null;
    batch_no: string | null;
    category: string | null;
    manufacture_date: Date | null;
    description: string | null;
    status: string;          // will be 'registered'
    registered_on: Date;
    qr_payload: string;
  };
  initial_listing?: {
    listing_id: number;
    price: string | null;
    currency: string | null;
    status: string;
    created_on: Date;
  } | null;
}

export class ProductRegistration {
  static async registerProduct(
    input: RegisterProductInput
  ): Promise<RegisteredProductResult> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Make sure schema is correct
      await client.query('SET search_path TO fyp_25_s4_20;');

      // 1) Insert product WITHOUT qr_code first (NO blockchain fields)
      const productResult = await client.query(
        `
        INSERT INTO product (
          registered_by,
          serial_no,
          qr_code,
          status,
          model,
          batch_no,
          category,
          manufacture_date,
          description,
          registered_on
        )
        VALUES ($1, $2, NULL, 'registered', $3, $4, $5, $6, $7, NOW())
        RETURNING
          product_id,
          serial_no,
          model,
          batch_no,
          category,
          manufacture_date,
          description,
          status,
          registered_on;
        `,
        [
          input.manufacturerId,
          input.serialNo,
          input.productName ?? null,
          input.batchNo ?? null,
          input.category ?? null,
          input.manufactureDate ?? null,
          input.description ?? null,
        ]
      );

      const product = productResult.rows[0];

      // 2) Build QR payload
      const qrPayload = QrCodeService.buildPayload(
        product.product_id,
        product.serial_no,
        input.manufacturerId
      );

      // 3) Generate PNG buffer and store into product.qr_code
      const qrBuffer = await QrCodeService.generatePngBuffer(qrPayload);

      await client.query(
        `
        UPDATE product
        SET qr_code = $1
        WHERE product_id = $2;
        `,
        [qrBuffer, product.product_id]
      );

      // 4) Optional initial listing
      let initialListing: RegisteredProductResult['initial_listing'] = null;
      if (typeof input.price === 'number') {
        const listingResult = await client.query(
          `
          INSERT INTO product_listing (
            product_id,
            seller_id,
            price,
            currency,
            status,
            created_on
          )
          VALUES ($1, $2, $3, $4::currency, 'available', NOW())
          RETURNING listing_id, price, currency, status, created_on;
          `,
          [
            product.product_id,
            input.manufacturerId,
            input.price,
            input.currency ?? 'SGD',
          ]
        );

        initialListing = listingResult.rows[0];
      }

      await client.query('COMMIT');

      return {
        product: {
          ...product,
          qr_payload: qrPayload,
        },
        initial_listing: initialListing,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
