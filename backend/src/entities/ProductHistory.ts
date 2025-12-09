// src/entities/ProductHistory.ts
import pool from '../schema/database';

// One row in the ownership chain
export interface OwnershipRow {
  owner_id: number;
  owner_username: string;
  owner_role: string;
  start_on: Date;
  end_on: Date | null;

  onchain_tx_id: number | null;
  tx_hash: string | null;
  tx_status: string | null;
  tx_created_on: Date | null;
}

// One listing row for the product
export interface ListingRow {
  listing_id: number;
  seller_id: number;
  seller_username: string;
  seller_role: string;
  price: string | null;    // NUMERIC → string in node-postgres
  currency: string | null;
  status: string;
  created_on: Date;
}

// Overall result returned by getBySerial
export interface ProductHistoryResult {
  product_id: number;
  serial_no: string;
  model: string | null;
  status: string;
  registered_on: Date;
  registered_by: {
    user_id: number;
    username: string;
    role_id: string;
  } | null;
  ownership_chain: OwnershipRow[];
  listings: ListingRow[];
}

export class ProductHistory {
  /**
   * Fetch product + full ownership chain + listings by serial number.
   */
  static async getBySerial(serial: string): Promise<ProductHistoryResult | null> {
    // 1) Base product + who registered it
    const productRes = await pool.query(
      `
      SELECT
        p.product_id,
        p.serial_no,
        p.model,
        p.status,
        p.registered_on,
        u.user_id   AS registered_by_id,
        u.username  AS registered_by_username,
        u.role_id   AS registered_by_role
      FROM fyp_25_s4_20.product p
      LEFT JOIN fyp_25_s4_20.users u
        ON p.registered_by = u.user_id
      WHERE p.serial_no = $1;
      `,
      [serial]
    );

    if (productRes.rows.length === 0) {
      return null;
    }

    const p = productRes.rows[0];

    // 2) Ownership chain in chronological order
    const ownershipRes = await pool.query(
      `
      SELECT
        o.owner_id,
        u.username          AS owner_username,
        u.role_id           AS owner_role,
        o.start_on,
        o.end_on,
        o.onchain_tx_id,
        bn.tx_hash,
        bn.status           AS tx_status,
        bn.created_on       AS tx_created_on,
        o.location          
      FROM fyp_25_s4_20.ownership o
      JOIN fyp_25_s4_20.users u
        ON o.owner_id = u.user_id
      LEFT JOIN fyp_25_s4_20.blockchain_node bn
        ON o.onchain_tx_id = bn.onchain_tx_id
      WHERE o.product_id = $1
      ORDER BY o.start_on ASC;
      `,
      [p.product_id]
    );

    const ownership_chain: OwnershipRow[] = ownershipRes.rows.map((row: any) => ({
      owner_id: row.owner_id,
      owner_username: row.owner_username,
      owner_role: row.owner_role,
      start_on: row.start_on,
      end_on: row.end_on,
      onchain_tx_id: row.onchain_tx_id,
      tx_hash: row.tx_hash,
      tx_status: row.tx_status,
      tx_created_on: row.tx_created_on,
    }));

    // 3) Listings for this product (in chronological order)
    const listingsRes = await pool.query(
      `
      SELECT
        pl.listing_id,
        pl.product_id,
        pl.seller_id,
        u.username AS seller_username,
        u.role_id  AS seller_role,
        pl.price,
        pl.currency,
        pl.status,
        pl.created_on
      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.users u
        ON pl.seller_id = u.user_id
      WHERE pl.product_id = $1
      ORDER BY pl.created_on ASC;
      `,
      [p.product_id]
    );

    const listings: ListingRow[] = listingsRes.rows.map((row: any) => ({
      listing_id: row.listing_id,
      seller_id: row.seller_id,
      seller_username: row.seller_username,
      seller_role: row.seller_role,
      price: row.price,
      currency: row.currency,
      status: row.status,
      created_on: row.created_on,
    }));

    return {
      product_id: p.product_id,
      serial_no: p.serial_no,
      model: p.model,
      status: p.status,
      registered_on: p.registered_on,
      registered_by: p.registered_by_id
        ? {
            user_id: p.registered_by_id,
            username: p.registered_by_username,
            role_id: p.registered_by_role,
          }
        : null,
      ownership_chain,
      listings,
    };
  }
}
