// frontend/src/components/reviews/CreateReviewModal.tsx

import { useState } from "react";
import axios from "axios";

const API = "https://fyp-25-s4-20.duckdns.org/api/reviews";

interface CreateReviewModalProps {
  targetUserId: number;
  targetUsername: string;
  currentUserId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateReviewModal({
  targetUserId,
  targetUsername,
  currentUserId,
  onClose,
  onSuccess,
}: CreateReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await axios.post(`${API}/create`, {
        owner_id: targetUserId,
        author_id: currentUserId,
        rating,
        comment: comment.trim() || null,
      });

      onSuccess();
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Failed to create review"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 32,
          maxWidth: 500,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, marginBottom: 8 }}>
            Write a Review
          </h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Share your experience with <strong>{targetUsername}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Rating */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 12,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Rating *
            </label>
            <div
              style={{
                display: "flex",
                gap: 8,
                fontSize: 40,
              }}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color:
                      star <= (hoveredRating || rating)
                        ? "#ffc107"
                        : "#e0e0e0",
                    transition: "color 0.2s",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: 13 }}>
              {rating}/5 - {["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
            </p>
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience..."
              rows={5}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #ddd",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
              }}
              maxLength={500}
            />
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: 12,
                color: "#999",
                textAlign: "right",
              }}
            >
              {comment.length}/500
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #f88",
                color: "#c00",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "12px 24px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
                opacity: submitting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "12px 24px",
                background: submitting ? "#ccc" : "#28a745",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: submitting ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
