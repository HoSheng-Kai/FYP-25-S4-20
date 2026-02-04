import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ReviewCard from "../../components/reviews/ReviewCard";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

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

type CompletedPurchase = {
  request_id: number;
  product_id: number;
  listing_id: number | null;
  seller_id: number;
  buyer_id: number;
  offered_price: string;
  offered_currency: string;
  status: string;
  created_on: string;
  updated_on: string;
  serial_no: string;
  model: string | null;
  seller_username: string;
};

type UserOption = {
  user_id: number;
  username: string;
  role_id?: string;
};

export default function UserReviewsPage() {
  const { auth } = useAuth();
  const currentUserId = auth.user?.userId;

  const [activeTab, setActiveTab] = useState<"about-me" | "posted" | "purchased">("about-me");
  const [reviewsAboutMe, setReviewsAboutMe] = useState<Review[]>([]);
  const [reviewsPosted, setReviewsPosted] = useState<Review[]>([]);
  const [purchases, setPurchases] = useState<CompletedPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [ratingByRequest, setRatingByRequest] = useState<Record<number, number>>({});
  const [commentByRequest, setCommentByRequest] = useState<Record<number, string>>({});
  const [submittingByRequest, setSubmittingByRequest] = useState<Record<number, boolean>>({});
  const [submittedByRequest, setSubmittedByRequest] = useState<Record<number, boolean>>({});

  const loadReviewsAboutMe = async (ownerId: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: Review[] }>(`${API_ROOT}/reviews`, {
        params: { owner_id: ownerId },
        withCredentials: true,
      });

      if (res.data.success && res.data.data) setReviewsAboutMe(res.data.data);
      else setReviewsAboutMe([]);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load reviews");
      setReviewsAboutMe([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReviewsPosted = async (authorId: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: Review[] }>(`${API_ROOT}/reviews/author`, {
        params: { author_id: authorId },
        withCredentials: true,
      });

      if (res.data.success && res.data.data) setReviewsPosted(res.data.data);
      else setReviewsPosted([]);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load your reviews");
      setReviewsPosted([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedPurchases = async (buyerId: number) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<{ success: boolean; data?: CompletedPurchase[] }>(
        `${API_ROOT}/products/marketplace/purchase/completed`,
        { params: { buyerId }, withCredentials: true }
      );

      if (res.data.success && res.data.data) setPurchases(res.data.data);
      else setPurchases([]);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to load purchases");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth.loading) return;
    if (!currentUserId) return;

    if (activeTab === "about-me") void loadReviewsAboutMe(currentUserId);
    else if (activeTab === "posted") void loadReviewsPosted(currentUserId);
    else void loadCompletedPurchases(currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, currentUserId, activeTab]);

  useEffect(() => {
    if (auth.loading || !currentUserId) return;

    (async () => {
      try {
        const res = await axios.get<{ success: boolean; data?: UserOption[] }>(
          `${API_ROOT}/users/list`,
          { withCredentials: true }
        );
        if (res.data?.success && Array.isArray(res.data.data)) setAllUsers(res.data.data);
        else setAllUsers([]);
      } catch {
        setAllUsers([]);
      }
    })();
  }, [auth.loading, currentUserId]);

  const handleReviewDeleted = async (reviewId: number) => {
    if (auth.loading) {
      alert("Checking session… please try again.");
      return;
    }
    if (!currentUserId) {
      alert("You are not logged in. Please login again.");
      return;
    }

    const ok = confirm("Are you sure you want to delete this review?");
    if (!ok) return;

    try {
      await axios.delete(`${API_ROOT}/reviews/${reviewId}`, {
        params: { author_id: currentUserId },
        withCredentials: true,
      });

      if (activeTab === "posted") await loadReviewsPosted(currentUserId);
      else await loadReviewsAboutMe(currentUserId);

      alert("Review deleted successfully");
    } catch (e: any) {
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.details ||
          "Failed to delete review"
      );
    }
  };

  if (auth.loading) {
    return <div style={{ padding: 20 }}>Checking session…</div>;
  }

  if (!auth.user) {
    return <div style={{ padding: 20 }}>Please log in to view your reviews.</div>;
  }

  const filterQuery = userFilter.trim().toLowerCase();
  const displayReviews = activeTab === "about-me" ? reviewsAboutMe : reviewsPosted;
  const filteredReviews = displayReviews.filter((r) => {
    if (!filterQuery) return true;
    const name = activeTab === "about-me" ? r.author_username : r.owner_username;
    return (name || "").toLowerCase().includes(filterQuery);
  });

  const filteredPurchases = purchases.filter((p) => {
    if (!filterQuery) return true;
    return (p.seller_username || "").toLowerCase().includes(filterQuery);
  });

  const usernameSuggestions = useMemo(() => {
    const disallowed = new Set(["admin", "manufacturer", "distributor"]);
    const names = new Set<string>();

    allUsers
      .filter((u) => u.user_id !== currentUserId)
      .filter((u) => !u.role_id || !disallowed.has(u.role_id))
      .forEach((u) => names.add(u.username));

    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allUsers, currentUserId]);

  const filteredSuggestions = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (q.length < 2) return [];
    return usernameSuggestions
      .filter((name) => name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [userFilter, usernameSuggestions]);
  const averageRating =
    filteredReviews.length > 0
      ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length).toFixed(1)
      : "N/A";

  const handleSubmitProductReview = async (p: CompletedPurchase) => {
    if (!currentUserId) return;
    if (submittedByRequest[p.request_id]) return;

    const rating = ratingByRequest[p.request_id] ?? 5;
    const comment = (commentByRequest[p.request_id] || "").trim();

    setSubmittingByRequest((prev) => ({ ...prev, [p.request_id]: true }));
    try {
      const res = await axios.post(
        `${API_ROOT}/reviews`,
        {
          owner_id: p.seller_id,
          author_id: currentUserId,
          rating,
          comment,
        },
        { withCredentials: true }
      );

      if (!res.data?.success) throw new Error(res.data?.error || "Failed to submit review");

      setSubmittedByRequest((prev) => ({ ...prev, [p.request_id]: true }));
      await loadReviewsPosted(currentUserId);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || "Failed to submit review");
    } finally {
      setSubmittingByRequest((prev) => ({ ...prev, [p.request_id]: false }));
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 8 }}>Reviews</h1>
        <p style={{ color: "#666", margin: 0 }}>
          Manage your reputation and review history.
        </p>
      </div>

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

        <button
          onClick={() => setActiveTab("purchased")}
          style={{
            padding: "12px 24px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "purchased" ? "3px solid #007bff" : "3px solid transparent",
            color: activeTab === "purchased" ? "#007bff" : "#666",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 15,
            transition: "all 0.2s",
          }}
        >
          Review Purchases
        </button>
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", minWidth: 240 }}>
          <input
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search by username"
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 13,
              background: "white",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                zIndex: 20,
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {filteredSuggestions.map((name) => (
                <button
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setUserFilter(name);
                    setShowSuggestions(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 12px",
                    border: "none",
                    background: "white",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "white";
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeTab === "about-me" && (
        <div>
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

          {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading reviews...</div>}
          {error && (
            <div style={{ background: "#fee", border: "1px solid #f88", color: "#c00", padding: 16, borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredReviews.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#f9f9f9", borderRadius: 8, border: "1px dashed #ddd" }}>
              <p style={{ fontSize: 16, color: "#666" }}>No reviews yet.</p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Complete transactions and earn positive reviews from other users!
              </p>
            </div>
          )}

          {!loading && filteredReviews.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredReviews.map((review) => (
                <ReviewCard key={review.review_id} review={review} showDelete={false} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "posted" && (
        <div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 24, border: "1px solid #e0e0e0" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Reviews You Posted</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
              {reviewsPosted.length} review{reviewsPosted.length !== 1 ? "s" : ""} written
            </p>
          </div>

          {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading your reviews...</div>}
          {error && (
            <div style={{ background: "#fee", border: "1px solid #f88", color: "#c00", padding: 16, borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredReviews.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#f9f9f9", borderRadius: 8, border: "1px dashed #ddd" }}>
              <p style={{ fontSize: 16, color: "#666" }}>You haven't posted any reviews yet.</p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Complete transactions and share your experience with other users!
              </p>
            </div>
          )}

          {!loading && filteredReviews.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredReviews.map((review) => (
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

      {activeTab === "purchased" && (
        <div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, marginBottom: 24, border: "1px solid #e0e0e0" }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Review Your Purchases</h2>
            <p style={{ margin: "4px 0 0 0", color: "#666", fontSize: 14 }}>
              Leave feedback for sellers after completed purchases.
            </p>
          </div>

          {loading && <div style={{ textAlign: "center", padding: 40, color: "#999" }}>Loading purchases...</div>}
          {error && (
            <div style={{ background: "#fee", border: "1px solid #f88", color: "#c00", padding: 16, borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredPurchases.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#f9f9f9", borderRadius: 8, border: "1px dashed #ddd" }}>
              <p style={{ fontSize: 16, color: "#666" }}>No completed purchases yet.</p>
              <p style={{ color: "#999", fontSize: 14 }}>
                Once a purchase is completed, you can review the seller here.
              </p>
            </div>
          )}

          {!loading && filteredPurchases.length > 0 && (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredPurchases.map((p) => (
                <div
                  key={p.request_id}
                  style={{
                    background: "white",
                    border: "1px solid #e0e0e0",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {p.model || p.serial_no}
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Seller: {p.seller_username}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>
                      {p.offered_currency} {p.offered_price}
                    </div>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>
                      Rating
                    </label>
                    <select
                      value={ratingByRequest[p.request_id] ?? 5}
                      onChange={(e) =>
                        setRatingByRequest((prev) => ({ ...prev, [p.request_id]: Number(e.target.value) }))
                      }
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

                  <div style={{ marginTop: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 6 }}>
                      Comment
                    </label>
                    <textarea
                      value={commentByRequest[p.request_id] || ""}
                      onChange={(e) =>
                        setCommentByRequest((prev) => ({ ...prev, [p.request_id]: e.target.value }))
                      }
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
                      {(commentByRequest[p.request_id] || "").length}/500
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => void handleSubmitProductReview(p)}
                      disabled={!!submittingByRequest[p.request_id] || submittedByRequest[p.request_id]}
                      style={{
                        background: submittedByRequest[p.request_id] ? "#9ca3af" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor:
                          submittingByRequest[p.request_id] || submittedByRequest[p.request_id]
                            ? "not-allowed"
                            : "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        opacity: submittingByRequest[p.request_id] ? 0.7 : 1,
                      }}
                    >
                      {submittedByRequest[p.request_id]
                        ? "Review Submitted"
                        : submittingByRequest[p.request_id]
                        ? "Submitting..."
                        : "Submit Review"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
