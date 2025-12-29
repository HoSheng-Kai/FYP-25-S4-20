// src/entities/ProductRegistration.ts
import pool from "../schema/database";
import { QrCodeService } from "../service/QrCodeService";

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
    status: string;
    registered_on: Date;
    qr_payload: string;
    tx_hash: string | null;
    product_pda: string | null;
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
      await client.query("BEGIN");

      /**
       * 1) Insert pending product OR reuse existing pending product (same manufacturer, tx_hash IS NULL)
       *
       * - First time: inserts.
       * - If user cancels Phantom tx: product remains pending (tx_hash NULL).
       * - Retry same serial: we UPDATE (no duplicate error) and RETURN the same row.
       * - If serial belongs to different manufacturer OR already confirmed (tx_hash not null): RETURNING gives 0 rows.
       */
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
          registered_on,
          tx_hash,
          product_pda
        )
        VALUES ($1, $2, NULL, 'registered', $3, $4, $5, $6, $7, NOW(), NULL, NULL)
        ON CONFLICT (serial_no) DO UPDATE
        SET
          model = EXCLUDED.model,
          batch_no = EXCLUDED.batch_no,
          category = EXCLUDED.category,
          manufacture_date = EXCLUDED.manufacture_date,
          description = EXCLUDED.description
        WHERE
          fyp_25_s4_20.product.registered_by = EXCLUDED.registered_by
          AND fyp_25_s4_20.product.tx_hash IS NULL
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
          tx_hash,
          product_pda,
          qr_code;
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

      if (productResult.rows.length === 0) {
        // Serial exists but can't be reused:
        // - different manufacturer OR already confirmed on-chain
        throw new Error(
          "Serial number already exists (belongs to another manufacturer or already confirmed on-chain)"
        );
      }

      const productRow = productResult.rows[0];

      // 2) Always compute qr_payload for response
      const qrPayload = QrCodeService.buildPayload(
        productRow.product_id,
        productRow.serial_no,
        input.manufacturerId
      );

      // 3) Only generate/store QR bytes if qr_code is NULL
      if (!productRow.qr_code) {
        const qrBuffer = await QrCodeService.generatePngBuffer(qrPayload);

        await client.query(
          `
          UPDATE fyp_25_s4_20.product
          SET qr_code = $1
          WHERE product_id = $2;
          `,
          [qrBuffer, productRow.product_id]
        );
      }

      // 4) Optional initial listing (ONLY create once for this product)
      let initialListing: RegisteredProductResult["initial_listing"] = null;

      if (typeof input.price === "number") {
        // if listing already exists, don't create another
        const existingListing = await client.query(
          `
          SELECT listing_id, price, currency, status, created_on
          FROM fyp_25_s4_20.product_listing
          WHERE product_id = $1
          ORDER BY created_on ASC
          LIMIT 1;
          `,
          [productRow.product_id]
        );

        if (existingListing.rows.length > 0) {
          initialListing = existingListing.rows[0];
        } else {
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
            VALUES ($1, $2, $3, $4::fyp_25_s4_20.currency, 'available', NOW())
            RETURNING listing_id, price, currency, status, created_on;
            `,
            [
              productRow.product_id,
              input.manufacturerId,
              input.price,
              input.currency ?? "SGD",
            ]
          );

          initialListing = listingResult.rows[0];
        }
      }

      await client.query("COMMIT");

      return {
        product: {
          product_id: productRow.product_id,
          serial_no: productRow.serial_no,
          model: productRow.model ?? null,
          batch_no: productRow.batch_no ?? null,
          category: productRow.category ?? null,
          manufacture_date: productRow.manufacture_date ?? null,
          description: productRow.description ?? null,
          status: productRow.status,
          registered_on: productRow.registered_on,
          qr_payload: qrPayload,
          tx_hash: productRow.tx_hash ?? null,
          product_pda: productRow.product_pda ?? null,
        },
        initial_listing: initialListing,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
