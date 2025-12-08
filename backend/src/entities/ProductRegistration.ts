// src/entities/ProductRegistration.ts
import pool from '../schema/database';
import crypto from 'crypto';
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
  currency?: string;
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
    status: string;
    registered_on: Date;
    qr_payload: string; 
  };
  blockchain: {
    onchain_tx_id: number;
    tx_hash: string;
    status: string;
    created_on: Date;
  };
  ownership: {
    ownership_id: number;
    owner_id: number;
    product_id: number;
    start_on: Date;
    end_on: Date | null;
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

      // 1) Insert product WITHOUT qr_code first
      const productResult = await client.query(
        `
        INSERT INTO fyp_25_s4_20.product (
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
        RETURNING product_id, serial_no, model, batch_no, category,
                  manufacture_date, description, status, registered_on;
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

      let product = productResult.rows[0];

      // 2) Build unique QR payload based on product details
      const qrPayload = QrCodeService.buildPayload(
        product.product_id,
        product.serial_no,
        input.manufacturerId
      );

      // 3) Generate PNG image buffer
      const qrBuffer = await QrCodeService.generatePngBuffer(qrPayload);

      // 4) Update product with qr_code bytes
      await client.query(
        `
        UPDATE fyp_25_s4_20.product
        SET qr_code = $1
        WHERE product_id = $2;
        `,
        [qrBuffer, product.product_id]
      );

      // 5) Insert blockchain node
      const txHash =
        typeof crypto.randomUUID === 'function'
          ? `tx_${crypto.randomUUID()}`
          : `tx_${Date.now()}`;

      const blockchainResult = await client.query(
        `
        INSERT INTO fyp_25_s4_20.blockchain_node (
          prev_tx_hash,
          tx_hash,
          status,
          created_on
        )
        VALUES (NULL, $1, 'confirmed', NOW())
        RETURNING onchain_tx_id, tx_hash, status, created_on;
        `,
        [txHash]
      );
      const blockchain = blockchainResult.rows[0];

      // 6) Ownership (manufacturer)
      const ownershipResult = await client.query(
        `
        INSERT INTO fyp_25_s4_20.ownership (
          owner_id,
          product_id,
          onchain_tx_id,
          start_on,
          end_on
        )
        VALUES ($1, $2, $3, NOW(), NULL)
        RETURNING ownership_id, owner_id, product_id, start_on, end_on;
        `,
        [input.manufacturerId, product.product_id, blockchain.onchain_tx_id]
      );
      const ownership = ownershipResult.rows[0];

      // 7) Optional listing
      let initialListing: RegisteredProductResult['initial_listing'] = null;
      if (typeof input.price === 'number') {
        const listingResult = await client.query(
          `
          INSERT INTO fyp_25_s4_20.product_listing (
            product_id,
            seller_id,
            price,
            currency,
            status,
            created_on
          )
          VALUES ($1, $2, $3, $4, 'available', NOW())
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
        blockchain,
        ownership,
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
