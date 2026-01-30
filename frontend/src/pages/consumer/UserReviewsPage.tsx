// frontend/src/pages/consumer/UserReviewsPage.tsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReviewCard from "../../components/reviews/ReviewCard";
import CreateReviewModal from "../../components/reviews/CreateReviewModal";

const API = "https://fyp-25-s4-20.duckdns.org:3000/api/reviews";

export type Review = {
  review_id: number;
  owner_id: number;
  author_id: number;
  rating: number;
  comment: string | null;
  created_on: string;
  author_username?: string;
  owner_username?: string;
};

export type UserOption = {
  user_id: number;
  username: string;
  role?: string;
};

export default function UserReviewsPage() {
  const currentUserId = useMemo(() => {
    const raw = localStorage.getItem("userId");
    return raw ? Number(raw) : NaN;
  }, []);

  const [activeTab, setActiveTab] = useState<"about-me" | "posted">("about-me");
  const [reviewsAboutMe, setReviewsAboutMe] = useState<Review[]>([]);
  const [reviewsPosted, setReviewsPosted] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load reviews about current user
  useEffect(() => {
    if (Number.isFinite(currentUserId)) {
      if (activeTab === "about-me") {
        loadReviewsAboutMe();
      } else {
        loadReviewsPosted();
      }
    }
  }, [currentUserId, activeTab]);

  const loadReviewsAboutMe = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: Review[] }>(API, {
        params: { owner_id: currentUserId },
      });

      if (res.data.success && res.data.data) {
        setReviewsAboutMe(res.data.data);
      } else {
        setReviewsAboutMe([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load reviews");
      setReviewsAboutMe([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewsPosted = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: Review[] }>(
        `${API}/author`,
        {
          params: { author_id: currentUserId },
        }
      );

      if (res.data.success && res.data.data) {
        setReviewsPosted(res.data.data);
      } else {
        setReviewsPosted([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load your reviews");
      setReviewsPosted([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewDeleted = async (reviewId: number) => {
    const ok = confirm("Are you sure you want to delete this review?");
    if (!ok) return;

    try {
      await axios.delete(`${API}/${reviewId}`, {
        params: { author_id: currentUserId },
      });

      // Refresh the list
      if (activeTab === "posted") {
        loadReviewsPosted();
      } else {
        loadReviewsAboutMe();
      }
      alert("Review deleted successfully");
    } catch (e: any) {
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Failed to delete review"
      );
    }
  };

  const displayReviews = activeTab === "about-me" ? reviewsAboutMe : reviewsPosted;
  const averageRating =
    displayReviews.length > 0
      ? (displayReviews.reduce((sum, r) => sum + r.rating, 0) / displayReviews.length).toFixed(1)
      : "N/A";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Reviews</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Manage your reputation and review history.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 24,
          borderBottom: "2px solid #e0e0e0",
        }}
      >
        <button
          onClick={() => setActiveTab("about-me")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "about-me" ? "3px solid #007bff" : "3px solid transparent",
            color: activeTab === "about-me" ? "#007bff" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 15,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (activeTab !== "about-me") {
              (e.currentTarget as HTMLButtonElement).style.color = "#007bff";
            }
          }}
        >
          Reviews About You
        </button>
        <button
          onClick={() => setActiveTab("posted")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "posted" ? "3px solid #007bff" : "3px solid transparent",
            color: activeTab === "posted" ? "#007bff" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 15,
            transition: "all 0.2s",
          }}
        >
          Reviews You Posted
        </button>
      </div>

      {/* About Me Tab */}
      {activeTab === "about-me" && (
        <div>
          {/* User Stats */}
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              marginBottom: 24,
              border: "1px solid #e0e0e0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>Your Reputation</h2>
              <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
                {reviewsAboutMe.length} review{reviewsAboutMe.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#007bff" }}>
                {averageRating}
              </div>
              <div style={{ fontSize: 13, color: "#666" }}>Average Rating</div>
            </div>
          </div>

          {/* Loading/Error */}
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              Loading reviews...
            </div>
          )}
          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #f88",
                color: "#c00",
                padding: 16,
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          {/* Reviews List */}
          {!loading && !error && reviewsAboutMe.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "#f9f9f9",
                borderRadius: 8,
                border: "1px dashed #ddd",
              }}
            >
              <p style={{ fontSize: 16, color: "#666" }}>
                No reviews yet.
              </p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Complete transactions and earn positive reviews from other users!
              </p>
            </div>
          )}

          {!loading && reviewsAboutMe.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {reviewsAboutMe.map((review) => (
                <ReviewCard
                  key={review.review_id}
                  review={review}
                  showDelete={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Posted Tab */}
      {activeTab === "posted" && (
        <div>
          {/* Stats */}
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              marginBottom: 24,
              border: "1px solid #e0e0e0",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 20 }}>Reviews You Posted</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
              {reviewsPosted.length} review{reviewsPosted.length !== 1 ? "s" : ""} written
            </p>
          </div>

          {/* Loading/Error */}
          {loading && (
            <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
              Loading your reviews...
            </div>
          )}
          {error && (
            <div
              style={{
                background: "#fee",
                border: "1px solid #f88",
                color: "#c00",
                padding: 16,
                borderRadius: 8,
              }}
            >
              {error}
            </div>
          )}

          {/* Reviews List */}
          {!loading && !error && reviewsPosted.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                background: "#f9f9f9",
                borderRadius: 8,
                border: "1px dashed #ddd",
              }}
            >
              <p style={{ fontSize: 16, color: "#666" }}>
                You haven't posted any reviews yet.
              </p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Complete transactions and share your experience with other users!
              </p>
            </div>
          )}

          {!loading && reviewsPosted.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {reviewsPosted.map((review) => (
                <ReviewCard
                  key={review.review_id}
                  review={review}
                  showDelete={true}
                  onDelete={() => handleReviewDeleted(review.review_id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
