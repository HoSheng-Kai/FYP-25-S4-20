// src/controllers/NotificationController.ts
import type { Request, Response } from "express";
import { Notification } from "../entities/Notification";

export class NotificationController {
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

      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to create notification",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // POST /api/notifications/transfer/accept
  // recipient accepted; notify sender "Transfer Accepted"
  async transferAccept(req: Request, res: Response): Promise<void> {
    try {
      const {
        notificationId,
        fromUserId,
        toUserId,
        productId,
        productPda,
        transferPda,
        acceptTx,
        fromOwnerPubkey,
        toOwnerPubkey,
      } = req.body;

      if (!fromUserId || !toUserId || !productId || !transferPda || !acceptTx) {
        res.status(400).json({ success: false, error: "Missing required fields for accept" });
        return;
      }

      // mark original request notification as read (optional)
      if (notificationId) {
        await Notification.markOneReadForUser(Number(notificationId), Number(toUserId));
      }

      // create sender notification
      const message = JSON.stringify({
        kind: "TRANSFER_ACCEPTED",
        productId: Number(productId),
        fromUserId: Number(fromUserId),
        toUserId: Number(toUserId),
        productPda: String(productPda),
        transferPda: String(transferPda),
        acceptTx: String(acceptTx),
        fromOwnerPubkey: String(fromOwnerPubkey),
        toOwnerPubkey: String(toOwnerPubkey),
      });

      await Notification.create({
        userId: Number(fromUserId),
        title: "Transfer Accepted",
        message,
        productId: Number(productId),
        txHash: String(acceptTx),
        isRead: false,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to process transfer accept",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // POST /api/notifications/transfer/execute
  // sender executed; finalize DB ownership + blockchain_node
  async transferExecute(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId, fromUserId, toUserId, productId, executeTx, fromPublicKey, toPublicKey } = req.body;

      if (!fromUserId || !toUserId || !productId || !executeTx || !fromPublicKey || !toPublicKey) {
        res.status(400).json({ success: false, error: "Missing required fields for execute" });
        return;
      }

      // mark execute notification as read (optional)
      if (notificationId) {
        await Notification.markOneReadForUser(Number(notificationId), Number(fromUserId));
      }

      // ✅ reuse your existing DB update logic by calling DistributorEntity pieces
      // We'll do minimal DB finalization here (no blockchain signing needed)
      const DistributorEntity = (await import("../entities/Distributor")).default;
      const { connection } = await import("../schema/solana");

      const latest_block = await DistributorEntity.viewLatestBlockchainNode(Number(productId));
      const current_date = new Date();

      let prev_owner_hash: string | null = null;
      if (latest_block) {
        prev_owner_hash = latest_block.tx_hash;
        const prev_owner = await DistributorEntity.getOwnership(prev_owner_hash);
        if (prev_owner) {
          prev_owner.end_on = current_date;
          await DistributorEntity.updateOwnership(prev_owner);
        }
      }

      const txInfo = await connection.getTransaction(String(executeTx), {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      const blockSlot = txInfo?.slot ?? 0;

      const blockchain_node_data = {
        tx_hash: String(executeTx),
        prev_tx_hash: prev_owner_hash,
        from_user_id: Number(fromUserId),
        from_public_key: String(fromPublicKey),
        to_user_id: Number(toUserId),
        to_public_key: String(toPublicKey),
        product_id: Number(productId),
        block_slot: blockSlot,
        created_on: current_date,
      };

      await DistributorEntity.createBlockchainNode(blockchain_node_data);

      const new_ownership = {
        owner_id: Number(toUserId),
        owner_public_key: String(toPublicKey),
        product_id: Number(productId),
        start_on: current_date,
        end_on: null,
        tx_hash: String(executeTx),
      };

      await DistributorEntity.createOwnership(new_ownership);

      // optionally notify recipient "Transfer Completed"
      await Notification.create({
        userId: Number(toUserId),
        title: "Transfer Completed",
        message: `Transfer completed for product #${productId}. Tx: ${executeTx}`,
        productId: Number(productId),
        txHash: String(executeTx),
        isRead: false,
      });

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({
        success: false,
        error: "Failed to finalize transfer execute",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
