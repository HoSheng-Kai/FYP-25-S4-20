// frontend/src/pages/consumer/UserReviewsPage.tsx

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReviewCard from "../../components/reviews/ReviewCard";
import CreateReviewModal from "../../components/reviews/CreateReviewModal";

const API = "http://localhost:3000/api/reviews";

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

  const [activeTab, setActiveTab] = useState<"browse" | "my-reviews">("browse");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load all users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Get both consumers and retailers
        const [consumersRes, retailersRes] = await Promise.all([
          axios.get(`http://localhost:3000/api/admins/view-accounts`, {
            params: { role_id: "consumer" },
          }),
          axios.get(`http://localhost:3000/api/admins/view-accounts`, {
            params: { role_id: "retailer" },
          })
        ]);
        
        const allUsers: any[] = [];
        
        if (consumersRes.data.success && consumersRes.data.data) {
          allUsers.push(...consumersRes.data.data);
        }
        
        if (retailersRes.data.success && retailersRes.data.data) {
          allUsers.push(...retailersRes.data.data);
        }
        
        // Filter out current user
        const filteredUsers = allUsers.filter(
          (u: any) => u.user_id !== currentUserId
        );
        
        setUsers(
          filteredUsers.map((u: any) => ({
            user_id: u.user_id,
            username: u.username,
            role: u.role_id || 'consumer'
          }))
        );
      } catch (e: any) {
        console.error("Failed to load users:", e);
      }
    };

    if (Number.isFinite(currentUserId)) {
      loadUsers();
    }
  }, [currentUserId]);

  // Load reviews for selected user
  useEffect(() => {
    if (activeTab === "browse" && selectedUserId) {
      loadReviewsForUser(selectedUserId);
    }
  }, [activeTab, selectedUserId]);

  // Load my reviews
  useEffect(() => {
    if (activeTab === "my-reviews" && Number.isFinite(currentUserId)) {
      loadMyReviews();
    }
  }, [activeTab, currentUserId]);

  const loadReviewsForUser = async (userId: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: Review[] }>(API, {
        params: { owner_id: userId },
      });

      if (res.data.success && res.data.data) {
        setReviews(res.data.data);
      } else {
        setReviews([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMyReviews = async () => {
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
        setMyReviews(res.data.data);
      } else {
        setMyReviews([]);
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load your reviews");
      setMyReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCreated = () => {
    setShowCreateModal(false);
    if (selectedUserId) {
      loadReviewsForUser(selectedUserId);
    }
    loadMyReviews();
  };

  const handleReviewDeleted = async (reviewId: number) => {
    const ok = confirm("Are you sure you want to delete this review?");
    if (!ok) return;

    try {
      await axios.delete(`${API}/${reviewId}`, {
        params: { author_id: currentUserId },
      });

      // Refresh the list
      loadMyReviews();
      alert("Review deleted successfully");
    } catch (e: any) {
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Failed to delete review"
      );
    }
  };

  const selectedUser = users.find((u) => u.user_id === selectedUserId);
  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "N/A";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>User Reviews</h1>
        <p style={{ color: "#666", margin: 0 }}>
          View reviews of other users to assess trustworthiness, or manage your own reviews.
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
          onClick={() => setActiveTab("browse")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "browse" ? "3px solid #007bff" : "3px solid transparent",
            color: activeTab === "browse" ? "#007bff" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 15,
          }}
        >
          Browse Reviews
        </button>
        <button
          onClick={() => setActiveTab("my-reviews")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "my-reviews" ? "3px solid #007bff" : "3px solid transparent",
            color: activeTab === "my-reviews" ? "#007bff" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 15,
          }}
        >
          My Reviews
        </button>
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <div>
          {/* User Selection */}
          <div
            style={{
              background: "white",
              padding: 24,
              borderRadius: 12,
              marginBottom: 24,
              border: "1px solid #e0e0e0",
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Select a user to view their reviews:
            </label>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <select
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  fontSize: 14,
                }}
              >
                <option value="">-- Choose a user --</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.username} {user.role && `(${user.role})`}
                  </option>
                ))}
              </select>

              {selectedUserId && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: "12px 24px",
                    background: "#28a745",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  ✍️ Write Review
                </button>
              )}
            </div>
          </div>

          {/* Reviews Display */}
          {selectedUserId && (
            <div>
              {/* User Stats */}
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
                  <h2 style={{ margin: 0, fontSize: 20 }}>
                    Reviews for {selectedUser?.username}
                  </h2>
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
              {!loading && !error && reviews.length === 0 && (
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
                    No reviews yet for this user.
                  </p>
                  <p style={{ color: "#999", fontSize: 14 }}>
                    Be the first to write a review!
                  </p>
                </div>
              )}

              {!loading && reviews.length > 0 && (
                <div style={{ display: "grid", gap: 16 }}>
                  {reviews.map((review) => (
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

          {!selectedUserId && !loading && (
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
                Select a user from the dropdown to view their reviews
              </p>
            </div>
          )}
        </div>
      )}

      {/* My Reviews Tab */}
      {activeTab === "my-reviews" && (
        <div>
          <div
            style={{
              background: "white",
              padding: 20,
              borderRadius: 12,
              marginBottom: 24,
              border: "1px solid #e0e0e0",
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Your Reviews</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
              {myReviews.length} review{myReviews.length !== 1 ? "s" : ""} written
            </p>
          </div>

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

          {!loading && !error && myReviews.length === 0 && (
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
                You haven't written any reviews yet.
              </p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Switch to "Browse Reviews" to write your first review!
              </p>
            </div>
          )}

          {!loading && myReviews.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {myReviews.map((review) => (
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

      {/* Create Review Modal */}
      {showCreateModal && selectedUserId && (
        <CreateReviewModal
          targetUserId={selectedUserId}
          targetUsername={selectedUser?.username || "User"}
          currentUserId={currentUserId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleReviewCreated}
        />
      )}
    </div>
  );
}
