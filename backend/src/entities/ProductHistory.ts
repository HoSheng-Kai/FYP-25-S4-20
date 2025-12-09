// src/entities/ProductHistory.ts
import pool from '../schema/database';

export interface OwnershipRow {
  owner_id: number;
  owner_username: string;
  owner_role: string;
  owner_public_key: string;
  start_on: Date;
  end_on: Date | null;
  tx_hash: string | null;
  block_slot: number | null;
  tx_created_on: Date | null;
}

export interface ListingRow {
  listing_id: number;
  seller_id: number;
  seller_username: string;
  seller_role: string;
  price: string | null;
  currency: string | null;
  status: string;
  created_on: Date;
}

export interface TransactionEvent {
  type: 'manufactured' | 'shipped' | 'transferred' | 'sold';
  from: {
    user_id: number | null;
    username: string | null;
    role: string | null;
  } | null;
  to: {
    user_id: number;
    username: string;
    role: string;
  };
  dateTime: string;   // ISO string
  location: string | null; // still null for now
  txHash: string | null;
  blockSlot: number | null;
}

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
  events: TransactionEvent[];
}

export class ProductHistory {
  static async getBySerial(serial: string): Promise<ProductHistoryResult | null> {
    // 1) Product + registered_by user
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

    if (productRes.rows.length === 0) return null;

    const p = productRes.rows[0];

    // 2) Ownership chain, joined via tx_hash -> blockchain_node
    const ownershipRes = await pool.query(
      `
      SELECT
        o.owner_id,
        u.username             AS owner_username,
        u.role_id              AS owner_role,
        o.owner_public_key,
        o.start_on,
        o.end_on,
        o.tx_hash,
        bn.block_slot,
        bn.created_on          AS tx_created_on
      FROM fyp_25_s4_20.ownership o
      JOIN fyp_25_s4_20.users u
        ON o.owner_id = u.user_id
      LEFT JOIN fyp_25_s4_20.blockchain_node bn
        ON o.tx_hash = bn.tx_hash
      WHERE o.product_id = $1
      ORDER BY o.start_on ASC;
      `,
      [p.product_id]
    );

    const ownership_chain: OwnershipRow[] = ownershipRes.rows.map((row: any) => ({
      owner_id: row.owner_id,
      owner_username: row.owner_username,
      owner_role: row.owner_role,
      owner_public_key: row.owner_public_key,
      start_on: row.start_on,
      end_on: row.end_on,
      tx_hash: row.tx_hash,
      block_slot: row.block_slot,
      tx_created_on: row.tx_created_on,
    }));

    // 3) Listings (for listing history context)
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

    // 4) Build timeline events (manufactured, shipped, transferred, sold)
    const events: TransactionEvent[] = this.buildEventsFromOwnership(
      ownership_chain,
      p.registered_by_id ?? null
    );

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
      events,
    };
  }

  private static buildEventsFromOwnership(
    ownership: OwnershipRow[],
    registeredById: number | null
  ): TransactionEvent[] {
    const events: TransactionEvent[] = [];

    if (ownership.length === 0) {
      return events;
    }

    // We treat each ownership segment as a "to" side
    for (let i = 0; i < ownership.length; i++) {
      const current = ownership[i];
      const previous = i > 0 ? ownership[i - 1] : null;

      const toUser = {
        user_id: current.owner_id,
        username: current.owner_username,
        role: current.owner_role,
      };

      const fromUser = previous
        ? {
            user_id: previous.owner_id,
            username: previous.owner_username,
            role: previous.owner_role,
          }
        : null;

      // Determine event type
      let type: TransactionEvent['type'] = 'transferred';

      if (!previous) {
        // First ownership: treat as manufactured / registered
        type = 'manufactured';
      } else if (previous.owner_role !== current.owner_role) {
        // Simple heuristic based on roles
        if (
          (previous.owner_role === 'manufacturer' ||
            previous.owner_role === 'distributor') &&
          current.owner_role === 'retailer'
        ) {
          type = 'shipped';
        } else if (current.owner_role === 'consumer') {
          type = 'sold';
        } else {
          type = 'transferred';
        }
      }

      events.push({
        type,
        from: fromUser
          ? {
              user_id: fromUser.user_id,
              username: fromUser.username,
              role: fromUser.role,
            }
          : null,
        to: {
          user_id: toUser.user_id,
          username: toUser.username,
          role: toUser.role,
        },
        dateTime: current.start_on.toISOString(),
        location: null, // no location columns yet
        txHash: current.tx_hash,
        blockSlot: current.block_slot,
      });
    }

    return events;
  }
}
