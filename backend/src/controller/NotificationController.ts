// src/controllers/NotificationController.ts
import type { Request, Response } from "express";
import { Notification } from "../entities/Notification";
import { addClient, removeClient, emitToUser } from "../service/NotificationSse";

export class NotificationController {

  // GET /api/notifications/stream?userId=2
  async stream(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.userId; // ✅ from cookie session, not query

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform"); // ✅ important
    res.setHeader("Connection", "keep-alive");

    // ✅ CORS for SSE + cookies
    res.setHeader("Access-Control-Allow-Origin", "https://fyp-25-s4-20-frontend.onrender.com");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Optional (nginx); harmless elsewhere
    res.setHeader("X-Accel-Buffering", "no");

    // ✅ Flush headers so the connection is established immediately
    (res as any).flushHeaders?.();

    // register client
    addClient(userId, res);

    // connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    // ✅ Heartbeat as COMMENT (best for keeping proxies happy)
    const heartbeat = setInterval(() => {
      res.write(`: ping ${Date.now()}\n\n`);
    }, 20000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeClient(userId, res);
      res.end();
    });
  }


  // GET /api/notifications?userId=2&onlyUnread=true
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.userId as string | undefined;
      const onlyUnreadParam = req.query.onlyUnread as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications?userId=2&onlyUnread=true",
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "Invalid 'userId' – must be a number" });
        return;
      }

      const onlyUnread = onlyUnreadParam === "true" || onlyUnreadParam === "1";
      const rows = await Notification.findByUser(userId, onlyUnread);

      res.json({
        success: true,
        data: rows.map((n) => ({
          notificationId: n.notification_id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          isRead: n.is_read,
          createdOn: n.created_on,
          productId: n.product_id,
          txHash: n.tx_hash,
        })),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch notifications",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/notifications/:notificationId/read?userId=2
  async markOneRead(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = Number(req.params.notificationId);
      const userIdParam = req.query.userId as string | undefined;

      if (Number.isNaN(notificationId)) {
        res.status(400).json({ success: false, error: "notificationId must be a number" });
        return;
      }
      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: `/api/notifications/${notificationId}/read?userId=2`,
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "Invalid 'userId' – must be a number" });
        return;
      }

      const ok = await Notification.markOneReadForUser(notificationId, userId);
      if (!ok) {
        res.status(404).json({
          success: false,
          error: "Notification not found (or not yours)",
        });
        return;
      }

      res.json({ success: true, message: "Notification marked as read" });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to mark notification as read",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // PUT /api/notifications/read?userId=2
  async markAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.userId as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications/read?userId=2",
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "Invalid 'userId' – must be a number" });
        return;
      }

      const updatedCount = await Notification.markAllReadForUser(userId);
      res.json({ success: true, data: { updatedCount } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to mark all notifications as read",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // DELETE /api/notifications/read?userId=2
  async deleteReadNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.userId as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications/read?userId=2",
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "Invalid 'userId' – must be a number" });
        return;
      }

      const deletedCount = await Notification.deleteReadByUser(userId);
      res.json({ success: true, data: { deletedCount } });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to delete read notifications",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // DELETE /api/notifications/:notificationId?userId=2
  async deleteOneReadNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = Number(req.params.notificationId);
      const userIdParam = req.query.userId as string | undefined;

      if (Number.isNaN(notificationId)) {
        res.status(400).json({ success: false, error: "notificationId must be a number" });
        return;
      }
      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: `/api/notifications/${notificationId}?userId=2`,
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({ success: false, error: "Invalid 'userId' – must be a number" });
        return;
      }

      const ok = await Notification.deleteOneReadForUser(notificationId, userId);
      if (!ok) {
        res.status(404).json({
          success: false,
          error: "Notification not found (or not read yet / not yours)",
          details: "You can only delete notifications that are marked as read.",
        });
        return;
      }

      res.json({ success: true, message: "Notification deleted" });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to delete notification",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
    // POST /api/notifications/create
  async createNotification(req: Request, res: Response): Promise<void> {
    try {
      const { userId, title, message, productId, txHash } = req.body;

      if (!userId || !title || !message) {
        res.status(400).json({ success: false, error: "Missing userId/title/message" });
        return;
      }

      const row = await Notification.create({
        userId: Number(userId),
        title: String(title),
        message: String(message),
        productId: productId ?? null,
        txHash: txHash ?? null,
        isRead: false,
      });

      emitToUser(Number(userId), "notification", { test: true });
      console.log("emitToUser fired for user", userId);

      emitToUser(Number(userId), "notification", {
        notificationId: row.notification_id,
        userId: row.user_id,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        createdOn: row.created_on,
        productId: row.product_id,
        txHash: row.tx_hash,
      });

      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to create notification",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
