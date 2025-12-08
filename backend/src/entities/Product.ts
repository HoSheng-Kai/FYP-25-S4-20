// src/entities/Product.ts
import pool from '../schema/database';

export type ProductStatus = 'registered' | 'verified' | 'suspicious';
export type Availability = 'available' | 'reserved' | 'sold';

export interface ProductDetails {
  product_id: number;
  serial_no: string;
  model: string | null;               // product name
  batch_no: string | null;
  category: string | null;
  manufacture_date: Date | null;
  description: string | null;
  status: ProductStatus;
  registered_on: Date | null;

  registered_by: {
    user_id: number;
    username: string;
    role_id: string;
  } | null;

  current_owner: {
    user_id: number;
    username: string;
    role_id: string;
    start_on: Date;
  } | null;

  latest_listing: {
    listing_id: number;
    price: string | null;             // NUMERIC comes back as string
    currency: string | null;
    status: string;                   // availability enum
    created_on: Date;
  } | null;
}

export class Product {
  static async findBySerialNo(serialNo: string): Promise<ProductDetails | null> {
    // 1) Base product + who registered it
    const productResult = await pool.query(
      `
      SELECT
        p.product_id,
        p.serial_no,
        p.model,
        p.batch_no,
        p.category,
        p.manufacture_date,
        p.description,
        p.status,
        p.registered_on,
        u.user_id   AS registered_by_id,
        u.username  AS registered_by_username,
        u.role_id   AS registered_by_role
      FROM product p
      LEFT JOIN users u
        ON p.registered_by = u.user_id
      WHERE p.serial_no = $1;
      `,
      [serialNo]
    );

    if (productResult.rows.length === 0) {
      return null;
    }

    const p = productResult.rows[0];

    // 2) Current owner (ownership where end_on IS NULL)
    const ownerResult = await pool.query(
      `
      SELECT
        u.user_id,
        u.username,
        u.role_id,
        o.start_on
      FROM ownership o
      JOIN users u
        ON o.owner_id = u.user_id
      WHERE o.product_id = $1
        AND o.end_on IS NULL
      ORDER BY o.start_on DESC
      LIMIT 1;
      `,
      [p.product_id]
    );
    const ownerRow = ownerResult.rows[0] || null;

    // 3) Latest listing (for price)
    const listingResult = await pool.query(
      `
      SELECT
        listing_id,
        price,
        currency,
        status,
        created_on
      FROM product_listing
      WHERE product_id = $1
      ORDER BY created_on DESC
      LIMIT 1;
      `,
      [p.product_id]
    );
    const listingRow = listingResult.rows[0] || null;

    return {
      product_id: p.product_id,
      serial_no: p.serial_no,
      model: p.model,
      batch_no: p.batch_no,
      category: p.category,
      manufacture_date: p.manufacture_date,
      description: p.description,
      status: p.status,
      registered_on: p.registered_on,

      registered_by: p.registered_by_id
        ? {
            user_id: p.registered_by_id,
            username: p.registered_by_username,
            role_id: p.registered_by_role,
          }
        : null,

      current_owner: ownerRow
        ? {
            user_id: ownerRow.user_id,
            username: ownerRow.username,
            role_id: ownerRow.role_id,
            start_on: ownerRow.start_on,
          }
        : null,

      latest_listing: listingRow
        ? {
            listing_id: listingRow.listing_id,
            price: listingRow.price,
            currency: listingRow.currency,
            status: listingRow.status,
            created_on: listingRow.created_on,
          }
        : null,
    };
  }
}
