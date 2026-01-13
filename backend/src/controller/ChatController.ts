import { Request, Response } from "express";
import ChatEntity from "../entities/Chat";
import pool from "../schema/database";

export default class ChatController {
  static async createThread(req: Request, res: Response) {
    try {
      const { listingId, userId, otherUserId } = req.body;
      if (!listingId || !userId || !otherUserId) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }

      // Optional: validate both users exist
      const users = await pool.query(`SELECT user_id FROM users WHERE user_id IN ($1,$2)`, [userId, otherUserId]);
      if (users.rowCount !== 2) return res.status(404).json({ success: false, error: "User not found" });

      const thread = await ChatEntity.getOrCreateThread(Number(listingId), Number(userId), Number(otherUserId));
      res.json({ success: true, thread });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async listThreads(req: Request, res: Response) {
    try {
      const userId = Number(req.query.userId);
      if (!userId) return res.status(400).json({ success: false, error: "Missing userId" });
      const threads = await ChatEntity.listThreadsForUser(userId);
      res.json({ success: true, threads });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  static async listMessages(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const userId = Number(req.query.userId);
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      if (!threadId || !userId) return res.status(400).json({ success: false, error: "Missing parameters" });
      
      console.log(`Fetching threadId=${threadId}, userId=${userId}`);
      const messages = await ChatEntity.listMessages(threadId, userId, limit);
      const threadDetails = await ChatEntity.getThreadWithDetails(threadId, userId);
      console.log(`Success: ${messages.length} messages`);
      
      res.json({ success: true, messages, thread: threadDetails });
    } catch (e: any) {
      console.error("listMessages error:", e.message);
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async sendMessage(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const { userId, content } = req.body;
      if (!threadId || !userId || typeof content !== "string") {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }
      const message = await ChatEntity.addMessage(threadId, Number(userId), content);
      res.json({ success: true, message });
    } catch (e: any) {
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async deleteThread(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const userId = Number(req.body.userId);
      if (!threadId || !userId) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }
      await ChatEntity.deleteThread(threadId, userId);
      res.json({ success: true, message: "Chat deleted" });
    } catch (e: any) {
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async archiveThread(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const userId = Number(req.body.userId);
      if (!threadId || !userId) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }
      await ChatEntity.archiveThread(threadId, userId);
      res.json({ success: true, message: "Chat archived" });
    } catch (e: any) {
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async unarchiveThread(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const userId = Number(req.body.userId);
      if (!threadId || !userId) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }
      await ChatEntity.unarchiveThread(threadId, userId);
      res.json({ success: true, message: "Chat unarchived" });
    } catch (e: any) {
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }

  static async reportThread(req: Request, res: Response) {
    try {
      const threadId = Number(req.params.threadId);
      const userId = Number(req.body.userId);
      const reason = (req.body.reason || "Unspecified reason").toString().trim();
      if (!threadId || !userId) {
        return res.status(400).json({ success: false, error: "Missing parameters" });
      }
      await ChatEntity.reportThread(threadId, userId, reason);
      res.json({ success: true, message: "Report submitted" });
    } catch (e: any) {
      const status = e.message === "Forbidden" ? 403 : 500;
      res.status(status).json({ success: false, error: e.message });
    }
  }
}
