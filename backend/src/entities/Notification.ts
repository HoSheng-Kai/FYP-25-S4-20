// src/entities/Notification.ts
import pool from '../schema/database';

export interface NotificationRow {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_on: Date;
}

export class Notification {
  static async findByUser(
    userId: number,
    onlyUnread: boolean
  ): Promise<NotificationRow[]> {
    const query = `
      SELECT
        notification_id,
        user_id,
        title,
        message,
        is_read,
        created_on
      FROM fyp_25_s4_20.notification
      WHERE ${onlyUnread ? 'user_id = $1 AND is_read = FALSE' : 'user_id = $1'}
      ORDER BY created_on DESC;
    `;
    const result = await pool.query<NotificationRow>(query, [userId]);
    return result.rows;
  }

  // 🔹 Delete a single read notification for a user
  static async deleteOneReadForUser(
    notificationId: number,
    userId: number
  ): Promise<boolean> {
    const result = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.notification
      WHERE notification_id = $1
        AND user_id = $2
        AND is_read = TRUE;
      `,
      [notificationId, userId]
    );

    return result.rowCount > 0;
  }

  // 🔹 Delete all read notifications for a user
  static async deleteAllReadForUser(userId: number): Promise<number> {
    const result = await pool.query(
      `
      DELETE FROM fyp_25_s4_20.notification
      WHERE user_id = $1
        AND is_read = TRUE;
      `,
      [userId]
    );

    return result.rowCount; // how many were deleted
  }
}
