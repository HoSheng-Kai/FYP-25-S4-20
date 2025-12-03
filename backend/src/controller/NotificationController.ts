// src/controller/NotificationController.ts
import { Request, Response } from 'express';
import { Notification } from '../entities/Notification';

class NotificationController {
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.userId as string | undefined;
      const onlyUnreadParam = req.query.onlyUnread as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications?userId=8&onlyUnread=true"
        });
        return;
      }

      const userId = Number(userIdParam);
      if (Number.isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "Invalid 'userId' – must be a number"
        });
        return;
      }

      const onlyUnread =
        onlyUnreadParam === 'true' || onlyUnreadParam === '1';

      const notifications = await Notification.findByUser(userId, onlyUnread);

      res.json({
        success: true,
        data: notifications
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  }
  // Delete a single read notification
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const idParam = req.params.id;
      const userIdParam = req.query.userId as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications/5?userId=8"
        });
        return;
      }

      const notificationId = Number(idParam);
      const userId = Number(userIdParam);

      if (Number.isNaN(notificationId) || Number.isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "'id' (path) and 'userId' (query) must be numbers"
        });
        return;
      }

      const deleted = await Notification.deleteOneReadForUser(
        notificationId,
        userId
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Notification not found or not readable for deletion',
          details: 'Either it does not belong to this user OR it is not marked as read'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  }

  // Delete all read notifications for a user
  async deleteAllRead(req: Request, res: Response): Promise<void> {
    try {
      const userIdParam = req.query.userId as string | undefined;

      if (!userIdParam) {
        res.status(400).json({
          success: false,
          error: "Missing 'userId' query parameter",
          example: "/api/notifications?userId=8"
        });
        return;
      }

      const userId = Number(userIdParam);

      if (Number.isNaN(userId)) {
        res.status(400).json({
          success: false,
          error: "'userId' must be a number"
        });
        return;
      }

      const deletedCount = await Notification.deleteAllReadForUser(userId);

      res.json({
        success: true,
        message: 'Read notifications deleted',
        deletedCount
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete read notifications',
        details: err instanceof Error ? err.message : String(err)
      });
    }
  }
}

export default new NotificationController();
