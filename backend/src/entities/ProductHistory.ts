// src/entity/ProductHistory.ts
import pool from '../schema/database';

export type ProductStatus = 'registered' | 'verified' | 'suspicious';
export type Availability = 'available' | 'reserved' | 'sold';

export interface ProductHistoryEvent {
  type: 'registration' | 'ownership_transfer' | 'listing';
  eventDate: Date;
  details: any; // you can strongly type this later
}

export interface ProductHistoryResult {
  product_id: number;
  serial_no: string;
  model: string | null;
  status: ProductStatus;
  registered_on: Date;
  registered_by: {
    user_id: number;
    username: string;
    role_id: string;
  } | null;
  history: ProductHistoryEvent[];
}

export class ProductHistory {
  static async getBySerial(serial: string): Promise<ProductHistoryResult | null> {
    // 1) Find product + who registered it
    const productResult = await pool.query(
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

    if (productResult.rows.length === 0) {
      return null;
    }

    const p = productResult.rows[0];

    // 2) Ownership history
    const ownershipResult = await pool.query(
      `
      SELECT
        o.ownership_id,
        o.start_on,
        o.end_on,
        o.onchain_tx_id,
        u.user_id,
        u.username,
        u.role_id,
        bn.tx_hash,
        bn.status AS tx_status,
        bn.created_on AS tx_created_on
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

    // 3) Listing history
    const listingResult = await pool.query(
      `
      SELECT
        pl.listing_id,
        pl.price,
        pl.currency,
        pl.status,
        pl.created_on,
        u.user_id,
        u.username,
        u.role_id
      FROM fyp_25_s4_20.product_listing pl
      JOIN fyp_25_s4_20.users u
        ON pl.seller_id = u.user_id
      WHERE pl.product_id = $1
      ORDER BY pl.created_on ASC;
      `,
      [p.product_id]
    );

    const events: ProductHistoryEvent[] = [];

    // Registration event
    if (p.registered_on) {
      events.push({
        type: 'registration',
        eventDate: p.registered_on,
        details: {
          status: p.status,
          model: p.model,
          registeredOn: p.registered_on,
          registeredBy: p.registered_by_id
            ? {
                user_id: p.registered_by_id,
                username: p.registered_by_username,
                role_id: p.registered_by_role
              }
            : null
        }
      });
    }

    // Ownership events
    for (const row of ownershipResult.rows) {
      events.push({
        type: 'ownership_transfer',
        eventDate: row.start_on,
        details: {
          owner: {
            user_id: row.user_id,
            username: row.username,
            role_id: row.role_id
          },
          startOn: row.start_on,
          endOn: row.end_on,
          blockchain: row.onchain_tx_id
            ? {
                onchain_tx_id: row.onchain_tx_id,
                tx_hash: row.tx_hash,
                status: row.tx_status,
                created_on: row.tx_created_on
              }
            : null
        }
      });
    }

    // Listing events
    for (const row of listingResult.rows) {
      events.push({
        type: 'listing',
        eventDate: row.created_on,
        details: {
          listing_id: row.listing_id,
          seller: {
            user_id: row.user_id,
            username: row.username,
            role_id: row.role_id
          },
          price: row.price,
          currency: row.currency,
          status: row.status,
          created_on: row.created_on
        }
      });
    }

    // Sort all events by time
    events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

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
            role_id: p.registered_by_role
          }
        : null,
      history: events
    };
  }
}
