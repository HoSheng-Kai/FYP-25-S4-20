// src/entity/ManufacturerListing.ts
import pool from '../schema/database';

export type LifecycleStatus = 'active' | 'transferred';
export type BlockchainStatus = 'on blockchain' | 'pending';

export interface ManufacturerListingRow {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;

  price: string | null;
  currency: string | null;
  listing_status: string;
  listing_created_on: Date;

  lifecycle_status: LifecycleStatus;
  blockchain_status: BlockchainStatus;
}

export class ManufacturerListing {
  static async findByManufacturer(
    manufacturerId: number
  ): Promise<ManufacturerListingRow[]> {
    const result = await pool.query(
      `
      SELECT
        pl.listing_id,
        p.product_id,
        p.serial_no,
        p.model,
        pl.price,
        pl.currency,
        pl.status AS listing_status,
        pl.created_on AS listing_created_on,

        -- lifecycle status: is CURRENT owner still the manufacturer?
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM fyp_25_s4_20.ownership o
            WHERE o.product_id = p.product_id
              AND o.end_on IS NULL
              AND o.owner_id = p.registered_by
          ) THEN 'active'
          ELSE 'transferred'
        END AS lifecycle_status,

        -- blockchain status: any on-chain tx linked?
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM fyp_25_s4_20.ownership o2
            WHERE o2.product_id = p.product_id
              AND o2.onchain_tx_id IS NOT NULL
          ) THEN 'on blockchain'
          ELSE 'pending'
        END AS blockchain_status

      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.product p
        ON pl.product_id = p.product_id
      WHERE p.registered_by = $1
      ORDER BY pl.created_on DESC, p.product_id;
      `,
      [manufacturerId]
    );

    return result.rows;
  }
}
