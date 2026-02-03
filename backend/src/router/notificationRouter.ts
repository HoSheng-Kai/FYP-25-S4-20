import { Router } from "express";
import { NotificationController } from "../controller/NotificationController";
import { requireAuth } from "../auth/auth";

const router = Router();
const c = new NotificationController();

// GET /api/notifications?userId=2&onlyUnread=true
router.get("/", c.getUserNotifications.bind(c));

router.get("/stream", requireAuth, c.stream.bind(c));

// PUT /api/notifications/:notificationId/read?userId=2
router.put("/:notificationId/read", c.markOneRead.bind(c));

// PUT /api/notifications/read?userId=2
router.put("/read", c.markAllRead.bind(c));

// DELETE /api/notifications/read?userId=2
router.delete("/read", c.deleteReadNotifications.bind(c));

// DELETE /api/notifications/:notificationId?userId=2
router.delete("/:notificationId", c.deleteOneReadNotification.bind(c));

router.post("/create", c.createNotification.bind(c));

export default router;
