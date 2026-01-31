import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

type Thread = {
  thread_id: number;
  listing_id: number;
  user_a: number;
  user_b: number;
  created_on: string;
  other_user_id: number;
  other_username: string;
  unread_count: number;
  last_message?: string | null;
  last_message_on?: string | null;
  product_model?: string | null;
  serial_no?: string | null;
  listing_price?: string | null;
  listing_currency?: string | null;
  archived_by?: number | null;
  archived_on?: string | null;
};

export default function ChatsPage() {
  const { auth } = useAuth();
  const userId = auth.user?.userId;
  const [threads, setThreads] = useState<Thread[]>([]);
  const [archivedThreads, setArchivedThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await axios.get(`${API_ROOT}/chats/threads`, { params: { userId }, withCredentials: true });
      if (res.data.success) {
        const all: Thread[] = res.data.threads || [];
        const active = all.filter((t) => t.archived_by !== userId);
        const archived = all.filter((t) => t.archived_by === userId);
        setThreads(active);
        setArchivedThreads(archived);
      }
      else setErr(res.data.error || "Failed to load chats");
    } catch (e) {
      setErr("Failed to load chats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [userId]);

  const handleDelete = async (threadId: number) => {
    if (!window.confirm("Are you sure you want to delete this chat permanently?")) return;
    
    try {
      await axios.delete(`${API_ROOT}/chats/${threadId}`, { data: { userId }, withCredentials: true });
      await load();
      setMenuOpen(null);
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to delete chat");
    }
  };

  const handleArchive = async (threadId: number) => {
    try {
      const res = await axios.post(`${API_ROOT}/chats/${threadId}/archive`, { userId }, { withCredentials: true });
      if (res.data.success) {
        await load();
        setMenuOpen(null);
        alert("Chat archived. You can unarchive it anytime from the Archives section.");
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to archive chat");
    }
  };

  const handleUnarchive = async (threadId: number) => {
    try {
      const res = await axios.post(`${API_ROOT}/chats/${threadId}/unarchive`, { userId }, { withCredentials: true });
      if (res.data.success) {
        await load();
        setMenuOpen(null);
        alert("Chat moved back to your active messages.");
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to unarchive chat");
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>Messages</h1>
      <p style={{ marginTop: 6, color: "#6b7280" }}>Conversations about your marketplace listings.</p>

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => setShowArchived(!showArchived)}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: showArchived ? "#e0f2fe" : "white",
            color: "#0f172a",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#3b82f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
          }}
        >
          Archived Chats ({archivedThreads.length})
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {threads.map((t) => (
          <div key={t.thread_id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              position: "relative",
            }}
          >
            <button onClick={() => navigate(`/consumer/chats/${t.thread_id}`)}
              style={{
                flex: 1,
                padding: 16,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.1)";
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#e5e7eb";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <strong style={{ fontSize: 15, color: "#111827" }}>@{t.other_username}</strong>
                    {t.unread_count > 0 && (
                      <span style={{ background: "#3b82f6", color: "white", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                        {t.unread_count} new
                      </span>
                    )}
                  </div>
                  
                  <div style={{ 
                    background: "#f9fafb", 
                    padding: 12, 
                    borderRadius: 8, 
                    marginBottom: 8,
                    borderLeft: "3px solid #3b82f6"
                  }}>
                    <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      About Listing
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                      {t.product_model || "Unknown Product"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Serial: {t.serial_no || "N/A"} • Price: {t.listing_price && t.listing_currency ? `${t.listing_price} ${t.listing_currency}` : "N/A"}
                    </div>
                  </div>

                  {t.last_message && (
                    <div style={{ color: "#6b7280", fontSize: 13, maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      💬 {t.last_message}
                    </div>
                  )}
                </div>
              </div>
            </button>
            
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMenuOpen(menuOpen === t.thread_id ? null : t.thread_id)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 18,
                  color: "#6b7280",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                ⋮
              </button>
              
              {menuOpen === t.thread_id && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  marginTop: 4,
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  zIndex: 10,
                  minWidth: 140,
                }}>
                  <button
                    onClick={() => handleArchive(t.thread_id)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid #f3f4f6",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 13,
                      color: "#111827",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    📦 Archive
                  </button>
                  <button
                    onClick={() => handleDelete(t.thread_id)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      fontSize: 13,
                      color: "#dc2626",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#fee2e2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && threads.length === 0 && <p style={{ color: "#6b7280" }}>No conversations yet.</p>}
      </div>

      {showArchived && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 18 }}>Archived</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {archivedThreads.map((t) => (
              <div key={t.thread_id} style={{ display: "flex", gap: 12, alignItems: "stretch", position: "relative", opacity: 0.9 }}>
                <button
                  onClick={() => navigate(`/consumer/chats/${t.thread_id}`)}
                  style={{
                    flex: 1,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <strong style={{ fontSize: 15, color: "#0f172a" }}>@{t.other_username}</strong>
                        <span style={{ background: "#e2e8f0", color: "#475569", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                          Archived
                        </span>
                      </div>
                      <div style={{ color: "#475569", fontSize: 13, maxWidth: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.last_message ? `💬 ${t.last_message}` : "No messages yet."}
                      </div>
                    </div>
                  </div>
                </button>

                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setMenuOpen(menuOpen === t.thread_id ? null : t.thread_id)}
                    style={{
                      padding: "8px 12px",
                      background: "transparent",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 18,
                      color: "#6b7280",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f3f4f6";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    ⋮
                  </button>

                  {menuOpen === t.thread_id && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      marginTop: 4,
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      zIndex: 10,
                      minWidth: 160,
                    }}>
                      <button
                        onClick={() => handleUnarchive(t.thread_id)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 16px",
                          background: "transparent",
                          border: "none",
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 13,
                          color: "#111827",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f9fafb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        ↩️ Unarchive
                      </button>
                      <button
                        onClick={() => handleDelete(t.thread_id)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 16px",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          fontSize: 13,
                          color: "#dc2626",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#fee2e2";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!loading && archivedThreads.length === 0 && (
              <p style={{ color: "#6b7280" }}>No archived conversations.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
