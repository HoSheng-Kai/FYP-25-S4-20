// src/components/notifications/NotificationsPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_ROOT, NOTIFICATIONS_API_BASE_URL } from "../../config/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getProvider, getProgram } from "../../lib/anchorClient";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const TRANSFER_ACCEPT_URL = `${API_ROOT}/distributors/accept-transfer`;
const TRANSFER_EXECUTE_URL = `${API_ROOT}/distributors/execute-transfer`;
const http = axios.create({ withCredentials: true });

type ApiNotification = {
  notificationId: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdOn: string;
  productId: number | null;
  txHash: string | null;
};

type TransferPayload =
  | {
      kind: "TRANSFER_REQUEST";
      productId: number;
      fromUserId: number;
      toUserId: number;
      productPda: string;
      transferPda: string;
      proposeTx: string;
      fromOwnerPubkey: string;
      toOwnerPubkey: string;
    }
  | {
      kind: "TRANSFER_ACCEPTED";
      productId: number;
      fromUserId: number;
      toUserId: number;
      productPda: string;
      transferPda: string;
      acceptTx: string;
      fromOwnerPubkey: string;
      toOwnerPubkey: string;
    };

function formatWhen(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function shortKey(s: string, left = 6, right = 6) {
  if (!s) return "";
  if (s.length <= left + right + 3) return s;
  return `${s.slice(0, left)}...${s.slice(-right)}`;
}

function getUserIdFromStorage(): number | null {
  const direct = localStorage.getItem("userId");
  if (direct && !Number.isNaN(Number(direct))) return Number(direct);

  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      const id = u?.user_id ?? u?.userId ?? u?.id;
      if (id && !Number.isNaN(Number(id))) return Number(id);
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * ✅ Robust parser:
 * - Accepts valid JSON stringified payload
 * - ALSO accepts your current format: {kind:TRANSFER_REQUEST,productId:11,...}
 */
function parseTransferPayload(msg: string): TransferPayload | null {
  if (!msg) return null;

  // 1) Try real JSON first
  try {
    const obj = JSON.parse(msg);
    if (obj?.kind === "TRANSFER_REQUEST") return obj as TransferPayload;
    if (obj?.kind === "TRANSFER_ACCEPTED") return obj as TransferPayload;
  } catch {
    // fallthrough
  }

  // 2) Try parse pseudo-json: {k:v,k2:v2}
  // Works because your values don't contain commas.
  const raw = msg.trim();
  if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

  const inner = raw.slice(1, -1).trim();
  if (!inner) return null;

  const map: Record<string, string> = {};
  const parts = inner.split(",");

  for (const p of parts) {
    const idx = p.indexOf(":");
    if (idx === -1) continue;
    const key = p.slice(0, idx).trim();
    let val = p.slice(idx + 1).trim();

    // remove wrapping quotes if any
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    map[key] = val;
  }

  const kind = map.kind;
  if (kind !== "TRANSFER_REQUEST" && kind !== "TRANSFER_ACCEPTED") return null;

  const base = {
    kind: kind as any,
    productId: Number(map.productId ?? map.product_id),
    fromUserId: Number(map.fromUserId ?? map.from_user_id),
    toUserId: Number(map.toUserId ?? map.to_user_id),
    productPda: map.productPda ?? map.product_pda,
    transferPda: map.transferPda ?? map.transfer_pda,
    fromOwnerPubkey: map.fromOwnerPubkey ?? map.from_owner_pubkey ?? map.fromPublicKey ?? map.from_public_key,
    toOwnerPubkey: map.toOwnerPubkey ?? map.to_owner_pubkey ?? map.toPublicKey ?? map.to_public_key,
  };

  if (
    !base.productId ||
    !base.fromUserId ||
    !base.toUserId ||
    !base.productPda ||
    !base.transferPda ||
    !base.fromOwnerPubkey ||
    !base.toOwnerPubkey
  ) {
    return null;
  }

  if (kind === "TRANSFER_REQUEST") {
    const proposeTx = map.proposeTx ?? map.propose_tx ?? "";
    return { ...(base as any), proposeTx } as TransferPayload;
  }

  const acceptTx = map.acceptTx ?? map.accept_tx ?? "";
  return { ...(base as any), acceptTx } as TransferPayload;
}

function hasTransferActions(n: ApiNotification): boolean {
  if (n.isRead) return false;

  const payload = parseTransferPayload(n.message);

  const isRequest =
    n.title === "Transfer Request" || payload?.kind === "TRANSFER_REQUEST";

  const isAccepted =
    n.title === "Transfer Accepted" || payload?.kind === "TRANSFER_ACCEPTED";

  // If it's a transfer request => Accept/Deny exist
  if (isRequest) return true;

  // If it's transfer accepted => Execute exists
  if (isAccepted) return true;

  return false;
}

export default function NotificationsPanel(props: {
  title?: string;
  defaultOnlyUnread?: boolean;
  showHeader?: boolean;
  isAdmin?: boolean;
}) {
  const { title = "Notifications", defaultOnlyUnread = true, showHeader = true, isAdmin = false } = props;

  const wallet = useWallet();
  const userId = useMemo(() => getUserIdFromStorage(), []);

  const [onlyUnread, setOnlyUnread] = useState(defaultOnlyUnread);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ApiNotification[]>([]);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  async function fetchNotifications(nextOnlyUnread = onlyUnread) {
    if (!userId) {
      setError("No userId found. Store userId in localStorage or update getUserIdFromStorage().");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await http.get(NOTIFICATIONS_API_BASE_URL, {
        params: { userId, onlyUnread: nextOnlyUnread },
      });
      setItems(res.data?.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications(onlyUnread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlyUnread]);

  async function markOneRead(notificationId: number, opts?: { force?: boolean }) {
    if (!userId) return;

    const n = items.find((x) => x.notificationId === notificationId);

    // Block manual mark-read for transfer notifications, but allow forced mark-read from transfer actions
    if (!opts?.force && n && hasTransferActions(n)) {
      setError(
        "This notification requires a transfer action (Accept/Deny/Execute) and cannot be marked as read yet."
      );
      return;
    }

    setBusyId(notificationId);
    setError(null);

    // optimistic UI
    setItems((prev) =>
      prev.map((x) => (x.notificationId === notificationId ? { ...x, isRead: true } : x))
    );

    try {
      await http.put(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}/read`, null, {
        params: { userId },
      });

      if (onlyUnread) {
        setItems((prev) => prev.filter((x) => x.notificationId !== notificationId));
      }
    } catch (e: any) {
      // rollback
      setItems((prev) =>
        prev.map((x) => (x.notificationId === notificationId ? { ...x, isRead: false } : x))
      );
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to mark as read");
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    if (!userId) return;

    setLoading(true);
    setError(null);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await http.put(`${NOTIFICATIONS_API_BASE_URL}/read`, null, { params: { userId } });
      if (onlyUnread) setItems([]);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to mark all as read");
      await fetchNotifications(onlyUnread);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAllRead() {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      await http.delete(`${NOTIFICATIONS_API_BASE_URL}/read`, { params: { userId } });
      setItems((prev) => prev.filter((n) => !n.isRead));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to delete read notifications");
    } finally {
      setLoading(false);
    }
  }

  async function deleteOneRead(notificationId: number) {
    if (!userId) return;

    setBusyId(notificationId);
    setError(null);

    const snapshot = items;
    setItems((prev) => prev.filter((n) => n.notificationId !== notificationId));

    try {
      await http.delete(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}`, { params: { userId } });
    } catch (e: any) {
      setItems(snapshot);
      setError(e?.response?.data?.error ?? e?.message ?? "Failed to delete notification");
    } finally {
      setBusyId(null);
    }
  }

  function ensureWalletConnected(actionName: string): boolean {
    if (!wallet.connected || !wallet.publicKey) {
      setError(`Connect your Phantom wallet to ${actionName}.`);
      return false;
    }
    return true;
  }

  async function acceptTransfer(n: ApiNotification) {
    const payload = parseTransferPayload(n.message);
    if (!payload || payload.kind !== "TRANSFER_REQUEST") return;

    if (!ensureWalletConnected("accept this transfer")) return;

    if (wallet.publicKey!.toBase58() !== payload.toOwnerPubkey) {
      setError(`Wrong wallet connected. Expected recipient: ${payload.toOwnerPubkey}`);
      return;
    }

    setBusyId(n.notificationId);
    setError(null);

    try {
      const provider = getProvider(wallet);
      const program = getProgram(provider);

      const transferPda = new PublicKey(payload.transferPda);

      const acceptTx = await program.methods
        .acceptTransfer()
        .accounts({
          toOwner: wallet.publicKey!,
          transferRequest: transferPda,
        })
        .rpc();

      await http.post(TRANSFER_ACCEPT_URL, {
        product_id: payload.productId,
        to_user_id: payload.toUserId,
        to_public_key: payload.toOwnerPubkey,
        tx_hash: acceptTx,
        transfer_pda: payload.transferPda,
      });
      const acceptedPayload = JSON.stringify({
        kind: "TRANSFER_ACCEPTED",
        productId: payload.productId,
        fromUserId: payload.fromUserId,
        toUserId: payload.toUserId,
        productPda: payload.productPda,
        transferPda: payload.transferPda,
        acceptTx,
        fromOwnerPubkey: payload.fromOwnerPubkey,
        toOwnerPubkey: payload.toOwnerPubkey,
      });

      await http.post(`${NOTIFICATIONS_API_BASE_URL}/create`, {
        userId: payload.fromUserId,
        title: "Transfer Accepted",
        message: acceptedPayload,
        productId: payload.productId,
        txHash: acceptTx,
      });

      await markOneRead(n.notificationId, { force: true });
      await fetchNotifications(onlyUnread);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.details ?? e?.message ?? "Accept failed");
    } finally {
      setBusyId(null);
    }
  }

  async function executeTransfer(n: ApiNotification) {
    const payload = parseTransferPayload(n.message);
    if (!payload || payload.kind !== "TRANSFER_ACCEPTED") return;

    if (!ensureWalletConnected("execute this transfer")) return;

    if (wallet.publicKey!.toBase58() !== payload.fromOwnerPubkey) {
      setError(`Wrong wallet connected. Expected sender: ${payload.fromOwnerPubkey}`);
      return;
    }

    setBusyId(n.notificationId);
    setError(null);

    try {
      const provider = getProvider(wallet);
      const program = getProgram(provider);

      const productPda = new PublicKey(payload.productPda);
      const transferPda = new PublicKey(payload.transferPda);

      const executeTx = await program.methods
        .executeTransfer()
        .accounts({
          fromOwner: wallet.publicKey!,
          product: productPda,
          transferRequest: transferPda,
        })
        .rpc();

      await http.post(TRANSFER_EXECUTE_URL, {
        product_id: payload.productId,
        from_user_id: payload.fromUserId,
        from_public_key: payload.fromOwnerPubkey,
        to_user_id: payload.toUserId,
        to_public_key: payload.toOwnerPubkey,
        tx_hash: executeTx,
        block_slot: 0,
        transfer_pda: payload.transferPda,
        product_pda: payload.productPda,
      });

      await markOneRead(n.notificationId, { force: true });
      await fetchNotifications(onlyUnread);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.response?.data?.details ?? e?.message ?? "Execute failed");
    } finally {
      setBusyId(null);
    }
  }

  async function denyTransfer(n: ApiNotification) {
    // Simple deny: mark read (optional: backend "denied" notification)
    setBusyId(n.notificationId);
    setError(null);
    try {
      await markOneRead(n.notificationId, { force: true });
      await fetchNotifications(onlyUnread);
    } finally {
      setBusyId(null);
    }
  }

  function renderMessage(n: ApiNotification) {
    const payload = parseTransferPayload(n.message);

    if (payload?.kind === "TRANSFER_REQUEST") {
      return (
        <div style={{ marginTop: 6, color: "#4b5563", lineHeight: 1.5 }}>
          <div>
            Product <strong>#{payload.productId}</strong> — Transfer request
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            <span style={monoWrap}>toOwner: {shortKey(payload.toOwnerPubkey)}</span>
            {"  "}•{"  "}
            <span style={monoWrap}>transferPda: {shortKey(payload.transferPda)}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <span style={monoWrap}>proposeTx: {shortKey(payload.proposeTx)}</span>
          </div>
        </div>
      );
    }

    if (payload?.kind === "TRANSFER_ACCEPTED") {
      return (
        <div style={{ marginTop: 6, color: "#4b5563", lineHeight: 1.5 }}>
          <div>
            Product <strong>#{payload.productId}</strong> — Recipient accepted
          </div>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            <span style={monoWrap}>fromOwner: {shortKey(payload.fromOwnerPubkey)}</span>
            {"  "}•{"  "}
            <span style={monoWrap}>transferPda: {shortKey(payload.transferPda)}</span>
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            <span style={monoWrap}>acceptTx: {shortKey(payload.acceptTx)}</span>
          </div>
        </div>
      );
    }

    // Default fallback (also wrapped so it won't overflow)
    return (
      <div style={{ color: "#4b5563", marginTop: 6, lineHeight: 1.5, wordBreak: "break-word" }}>
        {n.message}
      </div>
    );
  }

  function renderTransferActions(n: ApiNotification) {
    const payload = parseTransferPayload(n.message);

    if (!n.isRead && (n.title === "Transfer Request" || payload?.kind === "TRANSFER_REQUEST")) {
      if (!payload || payload.kind !== "TRANSFER_REQUEST") return null;

      return (
        <>
          <button
            onClick={() => acceptTransfer(n)}
            disabled={busyId === n.notificationId}
            style={btnPrimary}
          >
            Accept
          </button>
          <button
            onClick={() => denyTransfer(n)}
            disabled={busyId === n.notificationId}
            style={btnLight}
          >
            Deny
          </button>
        </>
      );
    }

    // ✅ Execute for sender after accepted
    if (!n.isRead && (n.title === "Transfer Accepted" || payload?.kind === "TRANSFER_ACCEPTED")) {
      if (!payload || payload.kind !== "TRANSFER_ACCEPTED") return null;

      return (
        <button
          onClick={() => executeTransfer(n)}
          disabled={busyId === n.notificationId}
          style={btnPrimary}
        >
          Execute
        </button>
      );
    }

    return null;
  }

  return (
    <div style={panel}>
      {showHeader && (
        <div style={headerRow}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>{title}</h2>
            <span style={pill}>Unread: {unreadCount}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* ✅ WALLET CONNECT UI - Only for non-admin users */}
            {!isAdmin && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <WalletMultiButton />
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setOnlyUnread(true)} style={onlyUnread ? btnDark : btnLight}>
                Unread
              </button>
              <button onClick={() => setOnlyUnread(false)} style={!onlyUnread ? btnDark : btnLight}>
                All
              </button>
            </div>

            <button onClick={() => fetchNotifications(onlyUnread)} disabled={loading} style={btnLight}>
              Refresh
            </button>

            <button onClick={markAllRead} disabled={loading || items.length === 0} style={btnLight}>
              Mark all read
            </button>

            <button onClick={deleteAllRead} disabled={loading} style={btnLight} title="Deletes all read notifications">
              Delete read
            </button>
          </div>
        </div>
      )}

      {!isAdmin && (
        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
          Wallet:{" "}
          <span style={{ fontFamily: "monospace" }}>
            {wallet.publicKey ? wallet.publicKey.toBase58() : "Not connected"}
          </span>
        </div>
      )}

      {error && <div style={errBox}>{error}</div>}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#6b7280" }}>Loading notifications...</div>
        ) : items.length === 0 ? (
          <div style={{ color: "#6b7280" }}>{onlyUnread ? "No unread notifications" : "No notifications."}</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((n) => (
              <div key={n.notificationId} style={{ ...card, background: n.isRead ? "#fff" : "#f9fafb" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 700, color: "#111827" }}>{n.title}</div>
                      {!n.isRead && <span style={newPill}>NEW</span>}
                    </div>

                    {renderMessage(n)}

                    <div style={{ color: "#6b7280", fontSize: 12, marginTop: 10, wordBreak: "break-word" }}>
                      {formatWhen(n.createdOn)}
                      {n.productId ? <span> • Product #{n.productId}</span> : null}
                      {n.txHash ? <span> • Tx: {shortKey(n.txHash, 6, 6)}</span> : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                    {/* transfer buttons */}
                    {renderTransferActions(n)}

                    {/* deep links - only for non-admin */}
                    {!isAdmin && n.txHash?.startsWith("thread:") && (
                      <button
                        onClick={() => {
                          const tid = Number(n.txHash?.split(":")[1]);
                          if (!Number.isNaN(tid)) window.location.href = `/consumer/chats/${tid}`;
                        }}
                        style={btnLight}
                      >
                        Open chat
                      </button>
                    )}

                    {/* existing actions */}
                    {!n.isRead && !hasTransferActions(n) && (
                      <button
                        onClick={() => markOneRead(n.notificationId)}
                        disabled={busyId === n.notificationId}
                        style={btnLight}
                      >
                        Mark read
                      </button>
                    )}
                    {n.isRead && (
                      <button
                        onClick={() => deleteOneRead(n.notificationId)}
                        disabled={busyId === n.notificationId}
                        style={btnLight}
                        title="Only works if the notification is already read"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */
const panel: React.CSSProperties = {
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 24,
  marginBottom: 18,
};

const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const pill: React.CSSProperties = {
  fontSize: 12,
  padding: "4px 10px",
  borderRadius: 999,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  color: "#111827",
};

const newPill: React.CSSProperties = {
  fontSize: 12,
  padding: "2px 8px",
  borderRadius: 999,
  background: "#111827",
  color: "white",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
};

const errBox: React.CSSProperties = {
  marginTop: 12,
  padding: 12,
  borderRadius: 12,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};

const monoWrap: React.CSSProperties = {
  fontFamily: "monospace",
  wordBreak: "break-all",
};

const btnLight: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnDark: React.CSSProperties = {
  ...btnLight,
  background: "#111827",
  color: "white",
  border: "1px solid #111827",
};

const btnPrimary: React.CSSProperties = {
  ...btnDark,
};
