import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:3000/api/chats";

type Message = {
  message_id: number;
  thread_id: number;
  sender_id: number;
  content: string;
  created_on: string;
};

type ThreadDetails = {
  thread_id: number;
  listing_id: number;
  seller_id?: number | null;
  other_username?: string | null;
  other_user_role?: string | null;
  product_model?: string | null;
  serial_no?: string | null;
  listing_price?: string | null;
  listing_currency?: string | null;
  listing_status?: string | null;
};

export default function ChatThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const userId = useMemo(() => Number(localStorage.getItem("userId")), []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [thread, setThread] = useState<ThreadDetails | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Fraudulent activity");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!threadId || !userId) return;
    try {
      const res = await axios.get(`${API}/${threadId}/messages`, { params: { userId, limit: 200 } });
      if (res.data.success) {
        setMessages(res.data.messages);
        setThread(res.data.thread);
      } else setErr(res.data.error || "Failed to load messages");
    } catch (e) {
      setErr("Failed to load messages");
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 3000); // simple polling
    return () => clearInterval(id);
  }, [threadId, userId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !threadId) return;
    try {
      const res = await axios.post(`${API}/${threadId}/messages`, { userId, content });
      if (res.data.success) {
        setText("");
        await load();
      } else {
        setErr(res.data.error || "Failed to send");
      }
    } catch (e) {
      setErr("Failed to send message");
    }
  };

  const handlePurchase = async () => {
    if (!thread) return;
    
    const priceText = thread.listing_price && thread.listing_currency ? `${thread.listing_price} ${thread.listing_currency}` : "—";
    const confirm = window.confirm(
      `Purchase "${thread.product_model || 'this product'}" for ${priceText}?`
    );
    
    if (!confirm) return;

    setPurchasing(true);
    try {
      const res = await axios.post(
        `http://localhost:3000/api/products/listings/${thread.listing_id}/purchase`,
        { buyerId: userId }
      );

      if (res.data.success) {
        alert(`Purchase successful! You now own ${thread.product_model || 'this product'}`);
        setShowReviewForm(true);
        setThread((prev) => (prev ? { ...prev, listing_status: "sold" } : prev));
        await load();
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.error ||
        e?.response?.data?.details ||
        "Failed to complete purchase";
      alert(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this chat? This cannot be undone.")) return;
    
    try {
      const res = await axios.delete(`${API}/${threadId}`, { data: { userId } });
      if (res.data.success) {
        alert("Chat deleted successfully");
        window.location.href = "/consumer/chats"; // Redirect back to chats list
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to delete chat");
    }
  };

  const handleSubmitReview = async () => {
    if (!thread || reviewComment.trim().length === 0) return;
    
    setSubmittingReview(true);
    try {
      const res = await axios.post(
        `http://localhost:3000/api/reviews`,
        {
          owner_id: thread.seller_id,
          author_id: userId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        }
      );

      if (res.data.success) {
        alert("Review submitted successfully!");
        setHasReviewed(true);
        setShowReviewForm(false);
        setReviewComment("");
        setReviewRating(5);
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleReportSeller = async () => {
    if (!threadId || !reportReason) return;
    setReportSubmitting(true);
    try {
      const res = await axios.post(`http://localhost:3000/api/chats/${threadId}/report`, {
        userId,
        reason: reportReason,
      });
      if (res.data.success) {
        alert("Report sent to admin");
        setShowReportModal(false);
      }
    } catch (e: any) {
      alert(e?.response?.data?.error || "Failed to submit report");
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div style={{ height: "calc(100vh - 60px)", padding: 24, display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => navigate(-1)}
          title="return to previous"
          style={{
            border: "1px solid #e5e7eb",
            background: "white",
            borderRadius: 10,
            padding: "6px 10px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Back
        </button>
        {thread && (
          <button
            onClick={() => setShowReportModal(true)}
            style={{
              border: "1px solid #f87171",
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: 10,
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Report seller
          </button>
        )}
      </div>

      {thread && (
        <div style={{
          background: "white",
          padding: 12,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Chatting with</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginTop: 2 }}>
              @{thread.other_username}
            </div>
          </div>
        </div>
      )}

      {thread && (
        <div style={{ 
          background: "#f9fafb", 
          padding: 12, 
          borderRadius: 8,
          borderLeft: "3px solid #3b82f6"
        }}>
          <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            About This Listing
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 3 }}>
                {thread.product_model || "Unknown Product"}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                Serial: <strong>{thread.serial_no || "N/A"}</strong>
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Price</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                  {thread.listing_price && thread.listing_currency ? `${thread.listing_price} ${thread.listing_currency}` : "N/A"}
                </div>
              </div>
              {thread.listing_status === "sold" ? (
                <span style={{
                  background: "#e5e7eb",
                  color: "#374151",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  Sold
                </span>
              ) : (
                thread.seller_id !== userId && (
                  <button 
                    onClick={handlePurchase}
                    disabled={purchasing}
                    style={{
                      background: purchasing ? "#6c757d" : "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "7px 14px",
                      cursor: purchasing ? "not-allowed" : "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      opacity: purchasing ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!purchasing) {
                        (e.currentTarget as HTMLButtonElement).style.background = "#218838";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!purchasing) {
                        (e.currentTarget as HTMLButtonElement).style.background = "#28a745";
                      }
                    }}
                  >
                    {purchasing ? "Processing..." : "Buy Now"}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={listRef} style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, overflowY: "auto" }}>
        {messages.map((m) => (
          <div key={m.message_id} style={{ display: "flex", justifyContent: m.sender_id === userId ? "flex-end" : "flex-start", marginBottom: 6 }}>
            <div style={{
              maxWidth: 520,
              padding: "8px 12px",
              borderRadius: 12,
              background: m.sender_id === userId ? "#3b82f6" : "#f3f4f6",
              color: m.sender_id === userId ? "white" : "#111827",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {messages.length === 0 && <p style={{ color: "#6b7280" }}>No messages yet.</p>}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message" rows={2}
          style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #d1d5db", resize: "none" }}
          maxLength={1000}
        />
        <button onClick={send} style={{ background: "#3b82f6", color: "white", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer" }}>Send</button>
      </div>

      {showReviewForm && !hasReviewed && thread?.seller_id !== userId && (
        <div style={{
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: 12,
          padding: 16,
          marginTop: 8
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#166534", fontSize: 14, fontWeight: 600 }}>
            Leave a Review for {thread?.product_model}
          </h3>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>
              Rating
            </label>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              style={{
                width: "100%",
                padding: 8,
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 13,
              }}
            >
              <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
              <option value={4}>⭐⭐⭐⭐ Good</option>
              <option value={3}>⭐⭐⭐ Average</option>
              <option value={2}>⭐⭐ Poor</option>
              <option value={1}>⭐ Very Poor</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>
              Comment
            </label>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Share your experience with this seller..."
              rows={3}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 6,
                border: "1px solid #d1d5db",
                fontSize: 13,
                resize: "none",
                fontFamily: "inherit",
              }}
              maxLength={500}
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              {reviewComment.length}/500
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              style={{
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: submittingReview ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 600,
                opacity: submittingReview ? 0.6 : 1,
              }}
            >
              {submittingReview ? "Submitting..." : "Submit Review"}
            </button>
            <button
              onClick={() => {
                setShowReviewForm(false);
                setReviewComment("");
                setReviewRating(5);
              }}
              style={{
                background: "#e5e7eb",
                color: "#111827",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {showReportModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
        }}
          onClick={() => !reportSubmitting && setShowReportModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 10,
              width: 360,
              maxWidth: "90%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 12 }}>Report seller</h3>
            <label style={{ display: "block", fontSize: 13, marginBottom: 8, color: "#374151" }}>
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{ width: "100%", padding: 10, border: "1px solid #d1d5db", borderRadius: 8, marginBottom: 12 }}
            >
              <option>Fraudulent activity</option>
              <option>Harassment or abuse</option>
              <option>Scam or phishing</option>
              <option>Counterfeit product</option>
              <option>Other policy violation</option>
            </select>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowReportModal(false)}
                disabled={reportSubmitting}
                style={{
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReportSeller}
                disabled={reportSubmitting}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  cursor: reportSubmitting ? "not-allowed" : "pointer",
                }}
              >
                {reportSubmitting ? "Sending..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
