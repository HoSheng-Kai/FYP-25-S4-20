// src/components/transfers/TransferOwnershipModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { API_ROOT, USERS_API_BASE_URL, NOTIFICATIONS_API_BASE_URL } from "../../config/api";
import { getProvider, getProgram } from "../../lib/anchorClient";
import { deriveTransferPda } from "../../lib/pdas";

type TransferResult = { productId: number; ok: boolean; message: string };

type Props = {
  open: boolean;
  onClose: () => void;
  fromUserId: number;
  selectedProductIds: number[];
  title?: string;
  onTransferred?: (results: TransferResult[]) => void;
};

type UserOption = {
  user_id: number;
  username: string;
  public_key: string; // ✅ must exist from /users/list
  role?: string;
  role_id?: string;
};

const USERS_LIST_URL = `${USERS_API_BASE_URL}/list`;
const PRODUCT_INFO_URL = `${API_ROOT}/distributors/product`;
const PROPOSE_TRANSFER_URL = `${API_ROOT}/distributors/propose-transfer`;

const box: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 10,
  background: "#f9fafb",
  maxHeight: 200,
  overflow: "auto",
};

function buildTransferPayload(input: {
  kind: "TRANSFER_REQUEST";
  productId: number;
  fromUserId: number;
  toUserId: number;
  productPda: string;
  transferPda: string;
  proposeTx: string;
  fromOwnerPubkey: string;
  toOwnerPubkey: string;
}) {
  // store as machine-readable payload in message
  return JSON.stringify(input);
}

async function postProposeTransfer(payload: {
  product_id: number;
  from_user_id: number;
  to_public_key: string;
  tx_hash: string;
  product_pda?: string;
  transfer_pda?: string;
}) {
  const res = await axios.post(PROPOSE_TRANSFER_URL, payload, { withCredentials: true });
  const ok = res.data?.success ?? res.data?.ok ?? false;
  if (!ok) throw new Error(res.data?.details || res.data?.error || "Backend propose-transfer failed");
  return res.data;
}

export default function TransferOwnershipModal({
  open,
  onClose,
  fromUserId,
  selectedProductIds,
  title = "Ownership Transfer",
  onTransferred,
}: Props) {
  const wallet = useWallet();

  const [recipientUserId, setRecipientUserId] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<TransferResult[] | null>(null);

  const count = selectedProductIds.length;

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const res = await axios.get(USERS_LIST_URL);
        if (res.data?.success && Array.isArray(res.data.data)) setUsers(res.data.data);
        else setUsers([]);
      } catch {
        setUsers([]);
      }
    })();
  }, [open]);

  // Only show and allow selection of users with role 'consumer' (case-insensitive), supporting both 'role' and 'role_id' fields
  const filteredUsers = useMemo(() => {
    const q = userQuery.toLowerCase();
    return users
      .filter((u) => u.user_id !== fromUserId)
      .filter((u) => {
        const role = (u.role || u.role_id || "").toLowerCase();
        return role === "consumer";
      })
      .filter((u) => u.username.toLowerCase().includes(q))
      .slice(0, 30);
  }, [users, userQuery, fromUserId]);

  const canSubmit =
    !loading &&
    count > 0 &&
    !!recipientUserId &&
    !!selectedUser &&
    !!wallet.publicKey &&
    wallet.connected;

  if (!open) return null;

  const close = () => {
    if (loading) return;
    setRecipientUserId("");
    setSelectedUser(null);
    setUserQuery("");
    setDropdownOpen(false);
    setErr(null);
    setResults(null);
    onClose();
  };

  async function fetchProductPda(productId: number): Promise<string> {
    const res = await axios.get(`${PRODUCT_INFO_URL}/${productId}`);
    if (!res.data?.success) throw new Error(res.data?.error || "Failed to load product info");
    const pda = res.data?.data?.product_pda;
    if (!pda) throw new Error("Missing product_pda in backend response");
    return pda as string;
  }

  const handlePropose = async () => {
    try {
      setErr(null);
      setResults(null);

      if (!wallet.publicKey || !wallet.connected) {
        setErr("Wallet not connected. Please connect Phantom first.");
        return;
      }

      if (!fromUserId) {
        setErr("Missing sender user ID.");
        return;
      }

      const toId = Number(recipientUserId);
      if (!toId || toId === fromUserId || !selectedUser) {
        setErr("Invalid recipient.");
        return;
      }

      // recipient on-chain pubkey from DB
      const toOwnerPubkey = new PublicKey(selectedUser.public_key);

      setLoading(true);

      const provider = getProvider(wallet);
      const program = getProgram(provider);

      const out: TransferResult[] = [];

      for (const productId of selectedProductIds) {
        try {
          const productPdaStr = await fetchProductPda(productId);
          const productPda = new PublicKey(productPdaStr);

          const [transferPda] = await deriveTransferPda(productPda, wallet.publicKey, toOwnerPubkey);

          const proposeTx = await program.methods
            .proposeTransfer()
            .accounts({
              fromOwner: wallet.publicKey,
              product: productPda,
              toOwner: toOwnerPubkey,
              transferRequest: transferPda,
            })
            .rpc();

          // ✅ STEP 1B: persist propose in backend (NEW)
          await postProposeTransfer({
            product_id: productId,
            from_user_id: fromUserId,
            to_public_key: toOwnerPubkey.toBase58(),
            tx_hash: proposeTx,
            product_pda: productPda.toBase58(), // optional but recommended
            transfer_pda: transferPda.toBase58(), // optional but recommended
          });

          // Create notification to recipient (existing behavior)
          const payload = buildTransferPayload({
            kind: "TRANSFER_REQUEST",
            productId,
            fromUserId,
            toUserId: toId,
            productPda: productPda.toBase58(),
            transferPda: transferPda.toBase58(),
            proposeTx,
            fromOwnerPubkey: wallet.publicKey.toBase58(),
            toOwnerPubkey: toOwnerPubkey.toBase58(),
          });

          await axios.post(
            `${NOTIFICATIONS_API_BASE_URL}/create`,
            {
              userId: toId,
              title: "Transfer Request",
              message: payload,
              productId,
              txHash: proposeTx,
            },
            { withCredentials: true }
          );

          out.push({ productId, ok: true, message: `Proposed ✅ (tx: ${proposeTx})` });
        } catch (e: any) {
          out.push({
            productId,
            ok: false,
            message: e?.response?.data?.error || e?.response?.data?.details || e?.message || "Failed",
          });
        }
      }

      setResults(out);
      onTransferred?.(out);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={overlay} onMouseDown={close}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>

        {err && <div style={errBox}>{err}</div>}

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={hint}>
              Sender wallet:{" "}
              <span style={{ fontFamily: "monospace" }}>
                {wallet.publicKey ? wallet.publicKey.toBase58() : "Not connected"}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient dropdown */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label style={label}>Recipient User</label>
          <input
            style={input}
            value={selectedUser ? selectedUser.username : userQuery}
            onChange={(e) => {
              setUserQuery(e.target.value);
              setSelectedUser(null);
              setRecipientUserId("");
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search username..."
          />

          {dropdownOpen && (
            <div style={dropdown}>
              {filteredUsers.length === 0 ? (
                <div style={empty}>No users found</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    style={dropdownItem}
                    onClick={() => {
                      setSelectedUser(u);
                      setRecipientUserId(String(u.user_id));
                      setDropdownOpen(false);
                      setUserQuery("");
                    }}
                  >
                    <strong>{u.username}</strong>{" "}
                    <span style={{ color: "#6b7280" }}>#{u.user_id}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={label}>Selected Products</div>
          <div style={box}>
            {selectedProductIds.length === 0 ? (
              <div style={{ fontSize: 13, color: "#6b7280" }}>No products selected.</div>
            ) : (
              selectedProductIds.map((id) => (
                <div key={id} style={row}>
                  Product ID: {id}
                </div>
              ))
            )}
          </div>
        </div>

        {results && (
          <div style={{ marginBottom: 14 }}>
            <div style={label}>Results</div>
            <div style={{ ...box, background: "white" }}>
              {results.map((r) => (
                <div
                  key={r.productId}
                  style={{ fontSize: 13, padding: "6px 0", color: r.ok ? "#116a2b" : "#a11" }}
                >
                  Product {r.productId}: {r.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={footer}>
          <button onClick={close} disabled={loading} style={btn}>
            Cancel
          </button>
          <button onClick={() => void handlePropose()} disabled={!canSubmit} style={btnPrimary}>
            {loading ? "Submitting..." : "Propose Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- styles ---------------- */
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 18,
  boxSizing: "border-box",
  zIndex: 9999,
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  background: "white",
  borderRadius: 12,
  padding: 20,
  boxSizing: "border-box",
  overflow: "hidden",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
  display: "block",
};

const dropdown: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  background: "white",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  maxHeight: 220,
  overflowY: "auto",
  zIndex: 9999,
};

const dropdownItem: React.CSSProperties = {
  width: "100%",
  padding: 10,
  textAlign: "left",
  border: "none",
  background: "transparent",
  cursor: "pointer",
};

const empty: React.CSSProperties = {
  padding: 12,
  fontSize: 13,
  color: "#6b7280",
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 10,
};

const errBox: React.CSSProperties = {
  background: "#fee2e2",
  color: "#991b1b",
  padding: 10,
  borderRadius: 8,
  marginBottom: 12,
};

const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 };

const hint: React.CSSProperties = { fontSize: 12, color: "#6b7280" };

const row: React.CSSProperties = {
  padding: "6px 0",
  borderBottom: "1px solid #eee",
  fontFamily: "monospace",
  fontSize: 13,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  cursor: "pointer",
};
