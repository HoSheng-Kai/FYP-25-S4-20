import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

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
  const { auth } = useAuth();
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const userId = auth.user?.userId;

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

  const [isMobile, setIsMobile] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const apply = () => setIsMobile(mq.matches);
    apply();

    // Safari fallback: addListener/removeListener
    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    } else if (anyMq.addListener) {
      anyMq.addListener(apply);
      return () => anyMq.removeListener(apply);
    }
  }, []);

  // On mobile, default to Chat view
  useEffect(() => {
    if (isMobile) setShowDetails(false);
  }, [isMobile]);

  const load = async () => {
    if (!threadId || !userId) return;
    try {
      const res = await axios.get(`${API_ROOT}/chats/${threadId}/messages`, {
        params: { userId, limit: 200 },
        withCredentials: true,
      });
      if (res.data.success) {
        setMessages(res.data.messages);
        setThread(res.data.thread);
      } else setErr(res.data.error || "Failed to load messages");
    } catch {
      setErr("Failed to load messages");
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 3000); // simple polling
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, userId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !threadId) return;
    try {
      const res = await axios.post(
        `${API_ROOT}/chats/${threadId}/messages`,
        { userId, content },
        { withCredentials: true }
      );
      if (res.data.success) {
        setText("");
        await load();
      } else {
        setErr(res.data.error || "Failed to send");
      }
    } catch {
      setErr("Failed to send message");
    }
  };

  const handlePurchase = async () => {
    if (!userId) {
      alert("Please log in to purchase.");
      return;
    }
    if (!thread) return;

    const priceText =
      thread.listing_price && thread.listing_currency
        ? `${thread.listing_price} ${thread.listing_currency}`
        : "—";

    const confirm = window.confirm(
      `Send a purchase request for "${thread.product_model || "this product"}" at ${priceText}?`
    );
    if (!confirm) return;

    setPurchasing(true);
    try {
      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/propose`,
        { listingId: thread.listing_id, buyerId: userId },
        { withCredentials: true }
      );
      if (res.data.success) {
        alert(`Request sent! The seller will review it shortly.`);
        setThread((prev) => (prev ? { ...prev, listing_status: "reserved" } : prev));
        await load();
      }
    } catch (e: any) {
      const errorMsg =
        e?.response?.data?.error || e?.response?.data?.details || "Failed to send request";
      alert(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!thread || reviewComment.trim().length === 0) return;

    setSubmittingReview(true);
    try {
      const res = await axios.post(
        `${API_ROOT}/api/reviews`,
        {
          owner_id: thread.seller_id,
          author_id: userId,
          rating: reviewRating,
          comment: reviewComment.trim(),
        },
        { withCredentials: true }
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
      const res = await axios.post(
        `${API_ROOT}/chats/${threadId}/report`,
        { userId, reason: reportReason },
        { withCredentials: true }
      );
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

  // --- Reusable UI blocks ---
  const DetailsPanel = thread ? (
    <div
      style={{
        width: isMobile ? "100%" : 340,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          background: "white",
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>
          Chatting with
        </div>
        <div
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111827",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              display: "inline-block",
            }}
          />
          @{thread.other_username}
        </div>
      </div>

      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 18,
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
          color: "white",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 12,
            textTransform: "uppercase",
            letterSpacing: "1px",
            opacity: 0.9,
          }}
        >
          About This Listing
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            {thread.product_model || "Unknown Product"}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            Serial: <strong style={{ fontWeight: 600 }}>{thread.serial_no || "N/A"}</strong>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(10px)",
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.9 }}>Price</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {thread.listing_price && thread.listing_currency
              ? `${thread.listing_currency} ${thread.listing_price}`
              : "N/A"}
          </div>
        </div>

        {thread.listing_status === "sold" ? (
          <div
            style={{
              background: "rgba(255,255,255,0.25)",
              borderRadius: 8,
              padding: "10px 16px",
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            ✓ Sold
          </div>
        ) : (
          thread.seller_id !== userId && (
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              style={{
                background: purchasing ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.95)",
                color: purchasing ? "rgba(255,255,255,0.7)" : "#667eea",
                border: "none",
                borderRadius: 8,
                padding: "12px 20px",
                cursor: purchasing ? "not-allowed" : "pointer",
                fontSize: 14,
                fontWeight: 700,
                width: "100%",
                transition: "all 0.2s",
                opacity: purchasing ? 0.6 : 1,
              }}
            >
              {purchasing ? "Processing..." : "Buy Now"}
            </button>
          )
        )}
      </div>
    </div>
  ) : null;

  const ChatPanel = (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
      }}
    >
      <div
        ref={listRef}
        style={{
          flex: 1,
          background: "#fafbfc",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          overflowY: "auto",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
        }}
      >
        {messages.map((m) => {
          const isOwn = m.sender_id === userId;
          return (
            <div
              key={m.message_id}
              style={{
                display: "flex",
                justifyContent: isOwn ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: isMobile ? "92%" : "65%",
                  padding: "10px 16px",
                  borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isOwn
                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                    : "white",
                  color: isOwn ? "white" : "#111827",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 14,
                  lineHeight: 1.5,
                  boxShadow: isOwn
                    ? "0 2px 8px rgba(102, 126, 234, 0.25)"
                    : "0 1px 3px rgba(0,0,0,0.08)",
                  border: isOwn ? "none" : "1px solid #e5e7eb",
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#9ca3af", padding: "60px 20px", fontSize: 15 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No messages yet</div>
            <div style={{ fontSize: 13 }}>Start the conversation!</div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: isMobile ? "wrap" : "nowrap",
          background: "white",
          padding: 12,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message..."
          rows={2}
          style={{
            flex: 1,
            minWidth: 0,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            resize: "none",
            fontSize: 14,
            fontFamily: "inherit",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={1000}
        />
        <button
          onClick={send}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "12px 24px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            width: isMobile ? "100%" : "auto",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "calc(100vh - 60px)",
        padding: "clamp(12px, 3vw, 24px)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Top bar: Back / Details / Report / Wallet */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            border: "1px solid #e5e7eb",
            background: "white",
            borderRadius: 10,
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: 700,
            color: "#374151",
          }}
        >
          ← Back
        </button>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {isMobile && thread && (
            <button
              onClick={() => setShowDetails((v) => !v)}
              style={{
                border: "1px solid #e5e7eb",
                background: showDetails ? "#111827" : "white",
                color: showDetails ? "white" : "#111827",
                borderRadius: 10,
                padding: "8px 14px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              {showDetails ? "Show chat" : "Show details"}
            </button>
          )}

          {thread && (
            <button
              onClick={() => setShowReportModal(true)}
              style={{
                border: "1px solid #f87171",
                background: "#fef2f2",
                color: "#b91c1c",
                borderRadius: 10,
                padding: "8px 16px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Report seller
            </button>
          )}

          <WalletMultiButton />
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flex: 1,
          minHeight: 0,
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        {isMobile ? (showDetails ? DetailsPanel : ChatPanel) : (
          <>
            {DetailsPanel}
            {ChatPanel}
          </>
        )}
      </div>

      {showReviewForm && !hasReviewed && thread?.seller_id !== userId && (
        <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px 0", color: "#166534", fontSize: 14, fontWeight: 700 }}>
            Leave a Review for {thread?.product_model}
          </h3>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
              Rating
            </label>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
            >
              <option value={5}>⭐⭐⭐⭐⭐ Excellent</option>
              <option value={4}>⭐⭐⭐⭐ Good</option>
              <option value={3}>⭐⭐⭐ Average</option>
              <option value={2}>⭐⭐ Poor</option>
              <option value={1}>⭐ Very Poor</option>
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 700, marginBottom: 6 }}>
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                fontWeight: 700,
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
                fontWeight: 700,
              }}
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

      {showReportModal && (
        <div
          style={{
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
