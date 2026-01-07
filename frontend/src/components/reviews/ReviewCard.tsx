// frontend/src/components/reviews/ReviewCard.tsx

import type { Review } from "../../pages/consumer/UserReviewsPage";

interface ReviewCardProps {
  review: Review;
  showDelete?: boolean;
  onDelete?: () => void;
}

const StarRating = ({ rating }: { rating: number }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        style={{
          color: i <= rating ? "#ffc107" : "#e0e0e0",
          fontSize: 18,
        }}
      >
        ★
      </span>
    );
  }
  return <div style={{ display: "flex", gap: 2 }}>{stars}</div>;
};

export default function ReviewCard({ review, showDelete, onDelete }: ReviewCardProps) {
  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e0e0e0",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* Header with Rating and Author */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <StarRating rating={review.rating} />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#333",
              }}
            >
              {review.rating}/5
            </span>
          </div>

          {review.author_username && (
            <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
              by <strong>{review.author_username}</strong>
            </p>
          )}
          {review.owner_username && (
            <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
              for <strong>{review.owner_username}</strong>
            </p>
          )}
        </div>

        {showDelete && onDelete && (
          <button
            onClick={onDelete}
            style={{
              padding: "6px 12px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#c82333";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "#dc3545";
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Comment */}
      {review.comment && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: "#f8f9fa",
            borderRadius: 8,
            fontSize: 14,
            color: "#333",
            lineHeight: 1.6,
          }}
        >
          "{review.comment}"
        </div>
      )}

      {/* Date */}
      <div
        style={{
          marginTop: 12,
          fontSize: 12,
          color: "#999",
        }}
      >
        {new Date(review.created_on).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>
  );
}
