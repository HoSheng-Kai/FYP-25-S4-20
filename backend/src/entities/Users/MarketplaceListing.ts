import pool from "../../schema/database";

export type MarketplaceListingRow = {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  product_status: string; // registered / verified / suspicious
  registered_on: Date;

  price: string | null;
  currency: string | null;
  listing_status: string; // available / reserved / sold
  listing_created_on: Date;
  notes: string | null;    // Optional seller notes

  seller_id: number;
  seller_username: string;
  seller_role: string;
  seller_public_key: string | null;

  blockchain_status: "pending" | "on blockchain";
};

export class MarketplaceListing {
  static async findAvailable(): Promise<MarketplaceListingRow[]> {
    const r = await pool.query(
      `
      SELECT
        pl.listing_id,
        p.product_id,
        p.serial_no,
        p.model,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM fyp_25_s4_20.ownership o
            WHERE o.product_id = p.product_id
              AND o.end_on IS NOT NULL
          )
          THEN 'transferred'
          ELSE 'active'
        END AS product_status,
        p.registered_on,

        pl.price::text AS price,
        pl.currency::text AS currency,
        pl.status::text AS listing_status,
        pl.created_on AS listing_created_on,
        pl.notes,

        u.user_id AS seller_id,
        u.username AS seller_username,
        u.role_id AS seller_role,
        u.public_key AS seller_public_key,

        CASE
          WHEN p.tx_hash IS NULL OR p.tx_hash = '' THEN 'pending'
          ELSE 'on blockchain'
        END AS blockchain_status

      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.product p
        ON p.product_id = pl.product_id
      JOIN fyp_25_s4_20.users u
        ON u.user_id = pl.seller_id

      WHERE
        pl.status = 'available'
        AND u.role_id = 'consumer'

      ORDER BY pl.created_on DESC;
      `
    );

    return r.rows as MarketplaceListingRow[];
  }
}
