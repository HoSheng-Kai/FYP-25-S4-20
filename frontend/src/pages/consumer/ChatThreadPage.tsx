import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

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
  const wallet = useWallet();
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
    if (!wallet.connected || !wallet.publicKey) {
      alert("Please connect your Phantom wallet to purchase.");
      return;
    }
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
    <div style={{ height: "calc(100vh - 60px)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "absolute", top: 18, right: 24, zIndex: 100 }}>
        <WalletMultiButton />
      </div>
      {/* Header with Back and Report buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          onClick={() => navigate(-1)}
          title="return to previous"
          style={{
            border: "1px solid #e5e7eb",
            background: "white",
            borderRadius: 10,
            padding: "8px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: "#374151",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "white";
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
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
            }}
          >
            Report seller
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: About This Listing - FIXED SIZE */}
        {thread && (
          <div style={{ 
            width: 340,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}>
            <div style={{
              background: "white",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4, fontWeight: 500 }}>Chatting with</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                }}></span>
                @{thread.other_username}
              </div>
            </div>

            <div style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
              padding: 18, 
              borderRadius: 12,
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
              color: "white",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.9 }}>
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
              <div style={{ 
                background: "rgba(255,255,255,0.15)", 
                backdropFilter: "blur(10px)",
                borderRadius: 10, 
                padding: 14,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 11, marginBottom: 4, opacity: 0.9 }}>Price</div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {thread.listing_price && thread.listing_currency ? `${thread.listing_currency} ${thread.listing_price}` : "N/A"}
                </div>
              </div>
              {thread.listing_status === "sold" ? (
                <div style={{
                  background: "rgba(255,255,255,0.25)",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                }}>
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
                    onMouseEnter={(e) => {
                      if (!purchasing) {
                        (e.currentTarget as HTMLButtonElement).style.background = "white";
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!purchasing) {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.95)";
                        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {purchasing ? "Processing..." : "Buy Now"}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* Right: Messages - FLEXIBLE SCROLLABLE */}
        <div style={{ 
          flex: 1, 
          display: "flex", 
          flexDirection: "column",
          gap: 12,
          minHeight: 0,
        }}>
          <div 
            ref={listRef} 
            style={{ 
              flex: 1,
              background: "#fafbfc", 
              border: "1px solid #e5e7eb", 
              borderRadius: 12, 
              padding: 20, 
              overflowY: "auto",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
            }}
          >
            {messages.map((m) => {
              const isOwn = m.sender_id === userId;
              return (
                <div key={m.message_id} style={{ 
                  display: "flex", 
                  justifyContent: isOwn ? "flex-end" : "flex-start", 
                  marginBottom: 12,
                  animation: "fadeIn 0.2s ease-in",
                }}>
                  <div style={{
                    maxWidth: "65%",
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
                  }}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            {messages.length === 0 && (
              <div style={{ 
                textAlign: "center", 
                color: "#9ca3af", 
                padding: "60px 20px",
                fontSize: 15,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>No messages yet</div>
                <div style={{ fontSize: 13 }}>Start the conversation!</div>
              </div>
            )}
          </div>

          <div style={{ 
            display: "flex", 
            gap: 10,
            background: "white",
            padding: 12,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}>
            <textarea 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              placeholder="Type your message..." 
              rows={2}
              style={{ 
                flex: 1, 
                padding: 12, 
                borderRadius: 10, 
                border: "1px solid #e5e7eb", 
                resize: "none",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#667eea";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLTextAreaElement).style.borderColor = "#e5e7eb";
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
                fontWeight: 600,
                fontSize: 14,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
              }}
            >
              Send
            </button>
          </div>
        </div>
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
