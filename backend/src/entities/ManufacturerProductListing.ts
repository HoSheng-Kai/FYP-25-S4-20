import pool from '../schema/database';

export type LifecycleStatus = 'active' | 'transferred';
export type BlockchainStatus = 'on blockchain' | 'pending';

export interface ManufacturerProductListingRow {
  product_id: number;
  serial_no: string;
  model: string | null;
  category: string | null;
  product_status: string;
  registered_on: Date;

  lifecycle_status: LifecycleStatus;
  blockchain_status: BlockchainStatus;

  price: string | null;           // latest listing price, if any
  currency: string | null;
  listing_status: string | null;
  listing_created_on: Date | null;
}

export class ManufacturerProductListing {
  /**
   * Returns all products registered by this manufacturer,
   * including products without listings, with:
   *  - lifecycle_status: 'active' | 'transferred'
   *  - blockchain_status: 'on blockchain' | 'pending'
   *  - latest listing info (if any)
   */
  static async findByManufacturer(
    manufacturerId: number
  ): Promise<ManufacturerProductListingRow[]> {
    const result = await pool.query(
      `
      SELECT
        p.product_id,
        p.serial_no,
        p.model,
        p.category             AS category,
        p.status               AS product_status,
        p.registered_on,

        -- lifecycle status: is current owner still manufacturer?
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

        -- blockchain status: any blockchain_node rows for this product?
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM fyp_25_s4_20.blockchain_node bn
            WHERE bn.product_id = p.product_id
          ) THEN 'on blockchain'
          ELSE 'pending'
        END AS blockchain_status,

        -- latest listing (if any)
        pl_latest.price,
        pl_latest.currency,
        pl_latest.status        AS listing_status,
        pl_latest.created_on    AS listing_created_on

      FROM fyp_25_s4_20.product p

      LEFT JOIN (
        SELECT DISTINCT ON (product_id)
          product_id,
          price,
          currency,
          status,
          created_on
        FROM fyp_25_s4_20.product_listing
        ORDER BY product_id, created_on DESC
      ) pl_latest
        ON pl_latest.product_id = p.product_id

      WHERE p.registered_by = $1
      ORDER BY p.product_id;
      `,
      [manufacturerId]
    );

    return result.rows as ManufacturerProductListingRow[];
  }
}
