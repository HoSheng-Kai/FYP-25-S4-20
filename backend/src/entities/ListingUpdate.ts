import pool from '../schema/database';

export type ListingStatus = 'available' | 'reserved' | 'sold';

export interface ListingForEdit {
  listing_id: number;
  product_id: number;
  serial_no: string;
  model: string | null;
  price: string | null;     // NUMERIC(10,2) comes back as string
  currency: string | null;  // enum 'SGD' | 'USD' | 'EUR'
  status: ListingStatus;
  created_on: Date;
}

export interface UpdateListingInput {
  listingId: number;
  userId: number;
  price?: number;
  currency?: string;
  status?: ListingStatus;
}

export class ListingUpdate {
  /**
   * Load a listing for editing, enforcing:
   *  - user is the seller
   *  - user is CURRENT owner (ownership.end_on IS NULL)
   */
  static async getListingForUser(
  listingId: number,
  userId: number
  ): Promise<ListingForEdit> {
    const client = await pool.connect();
    try {
      // 1) Listing + product
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

      // 2) Check seller is the same user
      if (row.seller_id !== userId) {
        throw new Error('You are not the seller of this listing');
      }

      // 3) Check current ownership IF ownership data exists
      const ownershipRes = await client.query(
        `
        SELECT owner_id
        FROM fyp_25_s4_20.ownership o
        WHERE o.product_id = $1
          AND o.end_on IS NULL
        LIMIT 1;
        `,
        [row.product_id]
      );

      // If there IS an active owner recorded, enforce that it's this user
      if (ownershipRes.rows.length > 0) {
        const currentOwnerId = ownershipRes.rows[0].owner_id;
        if (currentOwnerId !== userId) {
          throw new Error('You no longer own this product and cannot modify its listing');
        }
      }
      // If there is NO ownership record yet, we allow the seller to manage the listing

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
   * Update listing fields (price / currency / status) for a user.
   */
  static async updateListingForUser(
    input: UpdateListingInput
  ): Promise<ListingForEdit> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1) Ensure user is allowed
      const existing = await this.getListingForUser(input.listingId, input.userId);

      // 2) Resolve new values
      const newPrice =
        typeof input.price === 'number' ? input.price : existing.price;
      const newCurrency =
        typeof input.currency === 'string' ? input.currency : existing.currency;
      const newStatus = input.status ?? existing.status;

      // 3) Update listing
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

      // 4) Fetch product info for UI
      const prodRes = await client.query(
        `
        SELECT serial_no, model
        FROM fyp_25_s4_20.product
        WHERE product_id = $1;
        `,
        [updated.product_id]
      );

      const prod = prodRes.rows[0];

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

  /**
   * Delete a listing for the user, with permission checks.
   */
  static async deleteListingForUser(
    listingId: number,
    userId: number
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await this.getListingForUser(listingId, userId);

      // optional: block deleting sold listings
      if (existing.status === 'sold') {
        throw new Error('Cannot delete a listing that has already been sold');
      }

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
