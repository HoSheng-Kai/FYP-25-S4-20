// src/router/notificationRouter.ts
import { Router } from 'express';
import notificationController from '../controller/NotificationController';

const router = Router();

// READ notifications
// GET /api/notifications?userId=8&onlyUnread=true
router.get('/', notificationController.getUserNotifications.bind(notificationController));

// DELETE a single read notification
// DELETE /api/notifications/5?userId=8
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

// DELETE all read notifications for a user
// DELETE /api/notifications?userId=8
router.delete('/', notificationController.deleteAllRead.bind(notificationController));

export default router;
