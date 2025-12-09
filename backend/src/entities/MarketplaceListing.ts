// src/entities/MarketplaceListing.ts
import pool from '../schema/database';

export type BlockchainStatus = 'on blockchain' | 'pending';

export interface MarketplaceListingRow {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  product_status: string;          // registered / verified / suspicious
  registered_on: Date;

  price: string | null;           // NUMERIC -> string from pg
  currency: string | null;
  listing_status: string;
  listing_created_on: Date;

  seller_id: number;
  seller_username: string;
  seller_role: string;

  blockchain_status: BlockchainStatus;
}

export class MarketplaceListing {
  /**
   * Returns all currently AVAILABLE listings for sale,
   * with product + seller + blockchain status info.
   */
  static async findAvailable(): Promise<MarketplaceListingRow[]> {
    const result = await pool.query(
      `
      SELECT
        pl.listing_id,
        pl.product_id,
        p.serial_no,
        p.model,
        p.status            AS product_status,
        p.registered_on,

        pl.price,
        pl.currency,
        pl.status           AS listing_status,
        pl.created_on       AS listing_created_on,

        s.user_id           AS seller_id,
        s.username          AS seller_username,
        s.role_id           AS seller_role,

        CASE
          WHEN EXISTS (
            SELECT 1
            FROM fyp_25_s4_20.ownership o
            WHERE o.product_id = p.product_id
              AND o.onchain_tx_id IS NOT NULL
          ) THEN 'on blockchain'
          ELSE 'pending'
        END AS blockchain_status

      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.product p
        ON pl.product_id = p.product_id
      JOIN fyp_25_s4_20.users s
        ON pl.seller_id = s.user_id

      WHERE pl.status = 'available'          -- only items for sale
      ORDER BY pl.created_on DESC;
      `
    );

    return result.rows as MarketplaceListingRow[];
  }
}
