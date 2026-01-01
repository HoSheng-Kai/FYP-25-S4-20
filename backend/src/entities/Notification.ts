// src/entities/Notification.ts
import pool from "../schema/database";

export type NotificationRow = {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_on: Date;

  product_id: number | null;
  tx_hash: string | null;
};

export class Notification {
  // READ notifications
  static async findByUser(userId: number, onlyUnread: boolean): Promise<NotificationRow[]> {
    const r = await pool.query(
      `
      SELECT
        notification_id,
        user_id,
        title,
        message,
        is_read,
        created_on,
        product_id,
        tx_hash
      FROM fyp_25_s4_20.notification
      WHERE user_id = $1
        AND ($2::boolean = false OR is_read = false)
      ORDER BY created_on DESC;
      `,
      [userId, onlyUnread]
    );

    return r.rows as NotificationRow[];
  }

  // CREATE notification (idempotent if tx_hash present)
  static async create(input: {
    userId: number;
    title: string;
    message: string;
    productId?: number | null;
    txHash?: string | null;
    isRead?: boolean;
  }): Promise<NotificationRow> {
    const r = await pool.query(
      `
      INSERT INTO fyp_25_s4_20.notification
        (user_id, title, message, is_read, product_id, tx_hash, created_on)
      VALUES
        ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, product_id, tx_hash)
      DO UPDATE SET
        title = EXCLUDED.title,
        message = EXCLUDED.message
      RETURNING
        notification_id, user_id, title, message, is_read, created_on, product_id, tx_hash;
      `,
      [
        input.userId,
        input.title,
        input.message,
        input.isRead ?? false,
        input.productId ?? null,
        input.txHash ?? null,
      ]
    );

    return r.rows[0] as NotificationRow;
  }

  // MARK ONE as read (ownership enforced)
  static async markOneReadForUser(notificationId: number, userId: number): Promise<boolean> {
    const r = await pool.query(
      `
      UPDATE fyp_25_s4_20.notification
      SET is_read = TRUE
      WHERE notification_id = $1
        AND user_id = $2
      RETURNING notification_id;
      `,
      [notificationId, userId]
    );

    return (r.rowCount ?? 0) > 0;
  }

  // MARK ALL as read
  static async markAllReadForUser(userId: number): Promise<number> {
    const r = await pool.query(
      `
      UPDATE fyp_25_s4_20.notification
      SET is_read = TRUE
      WHERE user_id = $1
        AND is_read = FALSE
      RETURNING notification_id;
      `,
      [userId]
    );

    return r.rowCount ?? 0;
  }

  // DELETE ALL READ notifications for a user
  static async deleteReadByUser(userId: number): Promise<number> {
    const r = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.notification
      WHERE user_id = $1
        AND is_read = TRUE
      RETURNING notification_id;
      `,
      [userId]
    );

    return r.rowCount ?? 0;
  }

  // DELETE ONE READ notification (ownership enforced)
  static async deleteOneReadForUser(notificationId: number, userId: number): Promise<boolean> {
    const r = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.notification
      WHERE notification_id = $1
        AND user_id = $2
        AND is_read = TRUE
      RETURNING notification_id;
      `,
      [notificationId, userId]
    );

    return (r.rowCount ?? 0) > 0;
  }
}
