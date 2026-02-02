import { useEffect, useState } from "react";
import axios from "axios";
import ReviewCard from "../../components/reviews/ReviewCard";
import type { Review } from "../consumer/UserReviewsPage";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

export default function RetailerReviewsPage() {
  const { auth } = useAuth();
  const ownerId = auth.user?.userId;

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (auth.loading) return;
      if (!ownerId) return;

      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<{ success: boolean; data?: Review[] }>(`${API_ROOT}/reviews`, {
          params: { owner_id: ownerId },
          withCredentials: true,
        });

        if (res.data.success && res.data.data) setReviews(res.data.data);
        else setReviews([]);
      } catch (e: any) {
        setError(e?.response?.data?.error || "Failed to load reviews");
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [auth.loading, ownerId]);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";

  if (auth.loading) return <div style={{ padding: 20 }}>Loading…</div>;
  if (!auth.user) return <div style={{ padding: 20 }}>Please log in.</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 8 }}>Reviews About You</h1>
        <p style={{ color: "#666", margin: 0 }}>
          View ratings and feedback left by consumers for your store.
        </p>
      </div>

      <div
        style={{
          background: "white",
          padding: 20,
          borderRadius: 12,
          marginBottom: 24,
          border: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Your Reputation</h2>
          <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#007bff" }}>
            {averageRating}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>Average Rating</div>
        </div>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading reviews...</div>}

      {error && (
        <div style={{ background: "#fee", border: "1px solid #f88", color: "#c00", padding: 16, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {!loading && !error && reviews.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, background: "#f9f9f9", borderRadius: 8, border: "1px dashed #ddd" }}>
          <p style={{ fontSize: 16, color: "#666" }}>No reviews yet.</p>
          <p style={{ color: "#999", fontSize: 14 }}>
            Once consumers leave feedback, it will appear here.
          </p>
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div style={{ display: "grid", gap: 16 }}>
          {reviews.map((review) => (
            <ReviewCard key={review.review_id} review={review} showDelete={false} />
          ))}
        </div>
      )}
    </div>
  );
}
