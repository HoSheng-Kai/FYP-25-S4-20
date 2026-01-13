import express from "express";
import ChatController from "../controller/ChatController";

const router = express.Router();

// very light in-memory rate limit for message sending
const rateMap = new Map<string, { count: number; ts: number }>();
const RATE_WINDOW_MS = 10_000; // 10s
const RATE_MAX = 20; // max 20 messages per window per IP

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  const now = Date.now();
  const rec = rateMap.get(ip);
  if (!rec || now - rec.ts > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, ts: now });
    return next();
  }
  if (rec.count >= RATE_MAX) return res.status(429).json({ success: false, error: "Too many messages, slow down" });
  rec.count += 1;
  next();
}

router.post("/create-thread", ChatController.createThread);
router.get("/threads", ChatController.listThreads);
router.get("/:threadId/messages", ChatController.listMessages);
router.post("/:threadId/messages", rateLimit, ChatController.sendMessage);
router.delete("/:threadId", ChatController.deleteThread);
router.post("/:threadId/archive", ChatController.archiveThread);
router.post("/:threadId/unarchive", ChatController.unarchiveThread);
router.post("/:threadId/report", ChatController.reportThread);

export default router;
