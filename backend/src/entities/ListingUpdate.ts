// src/entity/ListingUpdate.ts
import pool from '../schema/database';

export type ListingStatus = 'available' | 'reserved' | 'sold';

export interface ListingForEdit {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  price: string | null;     // NUMERIC as string
  currency: string | null;
  status: ListingStatus;
  created_on: Date;
}

export interface UpdateListingInput {
  listingId: number;
  userId: number;           // user who is editing
  price?: number;
  currency?: string;
  status?: ListingStatus;
}

export class ListingUpdate {
  /**
   * Get listing + product info for a user, enforcing:
   *  - user must be the seller of the listing
   *  - AND must currently own the product (latest ownership)
   */
  static async getListingForUser(
    listingId: number,
    userId: number
  ): Promise<ListingForEdit> {
    const client = await pool.connect();
    try {
      // 1) Get listing + product
      const listingRes = await client.query(
        `
        SELECT
          pl.listing_id,
          pl.product_id,
          pl.seller_id,
          pl.price,
          pl.currency,
          pl.status,
          pl.created_on,
          p.serial_no,
          p.model
        FROM fyp_25_s4_20.product_listing pl
        JOIN fyp_25_s4_20.product p
          ON pl.product_id = p.product_id
        WHERE pl.listing_id = $1;
        `,
        [listingId]
      );

      if (listingRes.rows.length === 0) {
        throw new Error('Listing not found');
      }

      const row = listingRes.rows[0];

      // 2) Check seller
      if (row.seller_id !== userId) {
        throw new Error('You are not the seller of this listing');
      }

      // 3) Check current ownership (user must still own this product)
      const ownershipRes = await client.query(
        `
        SELECT 1
        FROM fyp_25_s4_20.ownership o
        WHERE o.product_id = $1
          AND o.owner_id = $2
          AND o.end_on IS NULL
        LIMIT 1;
        `,
        [row.product_id, userId]
      );

      if (ownershipRes.rows.length === 0) {
        throw new Error('You no longer own this product and cannot edit its listing');
      }

      return {
        listing_id: row.listing_id,
        product_id: row.product_id,
        serial_no: row.serial_no,
        model: row.model,
        price: row.price,
        currency: row.currency,
        status: row.status,
        created_on: row.created_on,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Update listing fields (price/currency/status) for a user,
   * enforcing same permissions as getListingForUser.
   */
  static async updateListingForUser(
    input: UpdateListingInput
  ): Promise<ListingForEdit> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1) Fetch existing listing with permission checks
      const existing = await this.getListingForUser(input.listingId, input.userId);

      // 2) Decide new values
      const newPrice =
        typeof input.price === 'number' ? input.price : existing.price;
      const newCurrency =
        typeof input.currency === 'string' ? input.currency : existing.currency;
      const newStatus = input.status ?? existing.status;

      // 3) Update listing row
      const updatedRes = await client.query(
        `
        UPDATE fyp_25_s4_20.product_listing
        SET price = $1,
            currency = $2,
            status = $3
        WHERE listing_id = $4
        RETURNING
          listing_id,
          product_id,
          price,
          currency,
          status,
          created_on;
        `,
        [newPrice, newCurrency, newStatus, input.listingId]
      );

      const updated = updatedRes.rows[0];

      // 4) Return with product info (serial/model) for UI
      const productRes = await client.query(
        `
        SELECT serial_no, model
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [updated.product_id]
      );

      const prod = productRes.rows[0];

      await client.query('COMMIT');

      return {
        listing_id: updated.listing_id,
        product_id: updated.product_id,
        serial_no: prod.serial_no,
        model: prod.model,
        price: updated.price,
        currency: updated.currency,
        status: updated.status,
        created_on: updated.created_on,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  static async deleteListingForUser(
  listingId: number,
  userId: number
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) Reuse existing permission checks
    const existing = await this.getListingForUser(listingId, userId);
    // existing.status is available/reserved/sold

    // Optional rule: prevent deleting sold listings
    if (existing.status === 'sold') {
      throw new Error('Cannot delete a listing that has already been sold');
    }

    // 2) Actually delete the listing
    await client.query(
      `
      DELETE FROM fyp_25_s4_20.product_listing
      WHERE listing_id = $1;
      `,
      [listingId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

}
