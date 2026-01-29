import pool from "../schema/database";
import { Notification } from "./Notification";

export type Thread = {
  thread_id: number;
  listing_id: number;
  user_a: number;
  user_b: number;
  created_on: string;
};

export type ThreadSummary = Thread & {
  other_user_id: number;
  other_username: string;
  listing_id: number;
  unread_count: number;
  last_message?: string | null;
  last_message_on?: string | null;
  product_model?: string | null;
  serial_no?: string | null;
  listing_price?: string | null;
  listing_currency?: string | null;
  listing_status?: string | null;
  archived_by?: number | null;
  archived_on?: string | null;
};

export type Message = {
  message_id: number;
  thread_id: number;
  sender_id: number;
  content: string;
  created_on: string;
  read_by_other: boolean;
};

export default class ChatEntity {
  static async init(): Promise<void> {
    // Create tables if not exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_thread (
        thread_id SERIAL PRIMARY KEY,
        listing_id INTEGER NOT NULL REFERENCES fyp_25_s4_20.product_listing(listing_id) ON DELETE CASCADE,
        user_a INTEGER NOT NULL REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE,
        user_b INTEGER NOT NULL REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE,
        created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        archived_by INTEGER REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE,
        archived_on TIMESTAMPTZ,
        CONSTRAINT chat_thread_unique UNIQUE (listing_id, user_a, user_b)
      );
    `);

    // Add archived columns if they don't exist (migration for existing tables)
    try {
      await pool.query(`ALTER TABLE chat_thread ADD COLUMN archived_by INTEGER REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE`);
    } catch (e) {
      // Column likely already exists, ignore error
    }

    try {
      await pool.query(`ALTER TABLE chat_thread ADD COLUMN archived_on TIMESTAMPTZ`);
    } catch (e) {
      // Column likely already exists, ignore error
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_thread_users ON chat_thread(user_a, user_b);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_message (
        message_id SERIAL PRIMARY KEY,
        thread_id INTEGER NOT NULL REFERENCES chat_thread(thread_id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES fyp_25_s4_20.users(user_id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_on TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_by_other BOOLEAN NOT NULL DEFAULT FALSE
      );
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_message_thread ON chat_message(thread_id, created_on);
    `);
  }

  static normalizePair(a: number, b: number): [number, number] {
    return a < b ? [a, b] : [b, a];
  }

  static async getOrCreateThread(listingId: number, user1: number, user2: number): Promise<Thread> {
    const [user_a, user_b] = ChatEntity.normalizePair(user1, user2);

    // Ensure listing exists
    const l = await pool.query(`SELECT listing_id FROM product_listing WHERE listing_id = $1`, [listingId]);
    if (l.rowCount === 0) throw new Error("Listing not found");

    // Try get existing
    const existing = await pool.query<Thread>(
      `SELECT * FROM chat_thread WHERE listing_id = $1 AND user_a = $2 AND user_b = $3`,
      [listingId, user_a, user_b]
    );
    if (existing.rows.length > 0) return existing.rows[0];

    const created = await pool.query<Thread>(
      `INSERT INTO chat_thread(listing_id, user_a, user_b) VALUES ($1, $2, $3) RETURNING *`,
      [listingId, user_a, user_b]
    );
    return created.rows[0];
  }

  static async ensureParticipant(threadId: number, userId: number): Promise<Thread> {
    const r = await pool.query<Thread>(`SELECT * FROM chat_thread WHERE thread_id = $1`, [threadId]);
    if (r.rowCount === 0) throw new Error("Thread not found");
    const t = r.rows[0];
    if (t.user_a !== userId && t.user_b !== userId) throw new Error("Forbidden");
    return t;
  }

  static async listThreadsForUser(userId: number): Promise<ThreadSummary[]> {
    const r = await pool.query<ThreadSummary>(`
      SELECT 
        t.thread_id,
        t.listing_id,
        t.user_a,
        t.user_b,
        t.created_on,
        t.archived_by,
        t.archived_on,
        CASE WHEN t.user_a = $1 THEN t.user_b ELSE t.user_a END AS other_user_id,
        u.username AS other_username,
        COALESCE(m2.unread_count, 0) AS unread_count,
        lm.last_message,
        lm.last_message_on,
        p.model AS product_model,
        p.serial_no,
        pl.price AS listing_price,
        pl.currency AS listing_currency,
        pl.status AS listing_status
      FROM chat_thread t
      JOIN fyp_25_s4_20.users u ON u.user_id = CASE WHEN t.user_a = $1 THEN t.user_b ELSE t.user_a END
      LEFT JOIN fyp_25_s4_20.product_listing pl ON pl.listing_id = t.listing_id
      LEFT JOIN fyp_25_s4_20.product p ON p.product_id = pl.product_id
      LEFT JOIN (
        SELECT thread_id, COUNT(*) AS unread_count
        FROM chat_message
        WHERE read_by_other = FALSE AND sender_id <> $1
        GROUP BY thread_id
      ) m2 ON m2.thread_id = t.thread_id
      LEFT JOIN (
        SELECT DISTINCT ON (thread_id) thread_id, content AS last_message, created_on AS last_message_on
        FROM chat_message
        ORDER BY thread_id, created_on DESC
      ) lm ON lm.thread_id = t.thread_id
      WHERE t.user_a = $1 OR t.user_b = $1
      ORDER BY COALESCE(lm.last_message_on, t.created_on) DESC
    `, [userId]);
    return r.rows;
  }

  static async listMessages(threadId: number, userId: number, limit = 100): Promise<Message[]> {
    await ChatEntity.ensureParticipant(threadId, userId);
    const msgs = await pool.query<Message>(
      `SELECT * FROM chat_message WHERE thread_id = $1 ORDER BY created_on ASC LIMIT $2`,
      [threadId, limit]
    );

    // mark other user's messages as read
    await pool.query(
      `UPDATE chat_message SET read_by_other = TRUE WHERE thread_id = $1 AND sender_id <> $2 AND read_by_other = FALSE`,
      [threadId, userId]
    );

    return msgs.rows;
  }

  static async getThreadWithDetails(threadId: number, userId: number): Promise<any> {
    await ChatEntity.ensureParticipant(threadId, userId);
    const r = await pool.query(`
      SELECT 
        t.thread_id,
        t.listing_id,
        t.user_a,
        t.user_b,
        t.created_on,
        pl.seller_id,
        pl.status AS listing_status,
        CASE WHEN t.user_a = $2 THEN t.user_b ELSE t.user_a END AS other_user_id,
        u.username AS other_username,
        u.role_id AS other_user_role,
        p.model AS product_model,
        p.serial_no,
        pl.price AS listing_price,
        pl.currency AS listing_currency
      FROM chat_thread t
      LEFT JOIN fyp_25_s4_20.product_listing pl ON pl.listing_id = t.listing_id
      LEFT JOIN fyp_25_s4_20.product p ON p.product_id = pl.product_id
      LEFT JOIN fyp_25_s4_20.users u ON u.user_id = CASE WHEN t.user_a = $2 THEN t.user_b ELSE t.user_a END
      WHERE t.thread_id = $1
    `, [threadId, userId]);
    
    if (r.rows.length === 0) throw new Error("Thread not found");
    return r.rows[0];
  }

  static async addMessage(threadId: number, senderId: number, content: string): Promise<Message> {
    await ChatEntity.ensureParticipant(threadId, senderId);
    if (!content || content.trim().length === 0) throw new Error("Message cannot be empty");
    if (content.length > 1000) throw new Error("Message too long");

    const r = await pool.query<Message>(
      `INSERT INTO chat_message(thread_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [threadId, senderId, content.trim()]
    );

    const thread = await ChatEntity.ensureParticipant(threadId, senderId);
    const receiverId = thread.user_a === senderId ? thread.user_b : thread.user_a;
    const senderUser = await pool.query<{ username: string }>(`SELECT username FROM users WHERE user_id = $1`, [senderId]);
    const senderName = senderUser.rows[0]?.username || "someone";

    await Notification.create({
      userId: receiverId,
      title: "New message",
      message: `You have a new message from ${senderName}`,
      txHash: `thread:${threadId}`,
    });

    return r.rows[0];
  }

  static async deleteThread(threadId: number, userId: number): Promise<void> {
    // Verify user is a participant
    await ChatEntity.ensureParticipant(threadId, userId);
    
    // Delete all messages in the thread
    await pool.query(
      `DELETE FROM chat_message WHERE thread_id = $1`,
      [threadId]
    );
    
    // Delete the thread itself
    await pool.query(
      `DELETE FROM chat_thread WHERE thread_id = $1`,
      [threadId]
    );
  }

  static async archiveThread(threadId: number, userId: number): Promise<void> {
    // Verify user is a participant
    await ChatEntity.ensureParticipant(threadId, userId);
    
    // Archive the thread (mark archived_by and archived_on)
    await pool.query(
      `UPDATE chat_thread SET archived_by = $1, archived_on = NOW() WHERE thread_id = $2`,
      [userId, threadId]
    );
  }

  static async unarchiveThread(threadId: number, userId: number): Promise<void> {
    // Verify user is a participant
    await ChatEntity.ensureParticipant(threadId, userId);

    // Only allow the user who archived the thread to unarchive it
    const res = await pool.query(
      `UPDATE chat_thread SET archived_by = NULL, archived_on = NULL WHERE thread_id = $1 AND archived_by = $2`,
      [threadId, userId]
    );

    if (res.rowCount === 0) throw new Error("Thread is not archived by this user");
  }

  static async reportThread(threadId: number, reporterId: number, reason: string): Promise<void> {
    const thread = await ChatEntity.ensureParticipant(threadId, reporterId);

    const reporter = await pool.query<{ username: string }>(`SELECT username FROM users WHERE user_id = $1`, [reporterId]);
    const reporterName = reporter.rows[0]?.username || `user-${reporterId}`;

    const sellerId = thread.user_a === reporterId ? thread.user_b : thread.user_a;
    const seller = await pool.query<{ username: string }>(`SELECT username FROM users WHERE user_id = $1`, [sellerId]);
    const sellerName = seller.rows[0]?.username || `user-${sellerId}`;

    const admins = await pool.query<{ user_id: number }>(`SELECT user_id FROM users WHERE role_id = 'admin'`);
    const payload = {
      title: "Seller reported",
      message: `${reporterName} reported ${sellerName}: ${reason}`,
      txHash: `thread:${threadId}`,
    } as const;

    await Promise.all(admins.rows.map((a) => Notification.create({ ...payload, userId: a.user_id })));
  }
}
