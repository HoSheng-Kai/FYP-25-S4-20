import pool from "../../schema/database";

export type ManufacturerListingRow = {
  product_id: number;
  serial_no: string;
  model: string | null;
  category: string | null;

  // product_status: string;     // registered / verified / suspicious
  lifecycle_status: string;   // active / transferred
  blockchain_status: string;  // pending / on blockchain
  registered_on: Date;

  // latest listing (nullable)
  price: string | null;       // pg NUMERIC often comes back as string
  currency: string | null;
  listing_status: string | null;
  listing_created_on: Date | null;
};

export class ManufacturerProductListing {
  static async findByManufacturer(manufacturerId: number): Promise<ManufacturerListingRow[]> {
    const r = await pool.query(
      `
      SELECT
        v.product_id,
        v.serial_no,
        v.product_name AS model,
        v.category,

        v.product_status,
        v.lifecycle_status,
        v.blockchain_status,
        v.registered_on,

        v.price,
        v.currency,
        v.listing_status,
        v.listing_created_on
      FROM fyp_25_s4_20.v_product_read v
      WHERE v.manufacturer_id = $1
        AND v.track = TRUE
      ORDER BY v.registered_on DESC;
      `,
      [manufacturerId]
    );

    return r.rows as ManufacturerListingRow[];
  }
}
