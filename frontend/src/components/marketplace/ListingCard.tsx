import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";
import axios from "axios";
import PurchaseModal from "./PurchaseModal";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";
import "../../styles/marketplace.css";

type Props = {
  listing: MarketplaceListing;
  onPurchaseSuccess?: () => void;
};

const ListingCard: React.FC<Props> = ({ listing, onPurchaseSuccess }) => {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const authLoading = auth.loading;
  const buyerId = auth.user?.userId;

  const [purchasing, setPurchasing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const priceText =
    listing.price && listing.currency ? `${listing.price} ${listing.currency}` : "—";

  const handleBuyNowClick = async () => {
    setModalError(null);
    setModalSuccess(null);

    if (authLoading) {
      setModalError("Checking your session… please try again in a moment.");
      setModalOpen(true);
      return;
    }
    if (!buyerId) {
      setModalError("Please log in to purchase.");
      setModalOpen(true);
      return;
    }

    setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    setPurchasing(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      if (authLoading) throw new Error("Session loading");
      if (!buyerId) throw new Error("User not logged in");

      const res = await axios.post(
        `${API_ROOT}/products/marketplace/purchase/propose`,
        {
          listingId: listing.listingId,
          buyerId,
          offeredPrice: listing.price ? Number(listing.price) : undefined,
          offeredCurrency: listing.currency ?? undefined,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        setModalSuccess(
          "Purchase request sent. The seller can accept it from the Purchase Requests page."
        );
        setTimeout(() => {
          setModalOpen(false);
          setModalSuccess(null);
          onPurchaseSuccess?.();
        }, 2000);
      } else {
        throw new Error(res.data.error || "Failed to create purchase request");
      }
    } catch (e: any) {
      setModalError(e?.response?.data?.error || e?.message || "Failed to create purchase request");
    } finally {
      setPurchasing(false);
    }
  };

  const blockchainPillClass =
    listing.blockchainStatus === "on blockchain" ? "pill pill-success" : "pill pill-warning";

  return (
    <div className="marketplace-card">
      <div className="marketplace-card-header">
        <div>
          <h3 className="marketplace-card-title">
            {listing.productName ?? "Unknown Product"}
          </h3>
        </div>

        <span className={blockchainPillClass}>{listing.blockchainStatus}</span>
      </div>

      <div className="marketplace-card-meta">
        <div>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Price</p>
          <p style={{ margin: "4px 0 0 0", fontWeight: 700, fontSize: 16 }}>{priceText}</p>
        </div>

        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Seller</p>
          <p style={{ margin: "4px 0 0 0", fontSize: 14, fontWeight: 600 }}>
            {listing.seller.username} ({listing.seller.role})
          </p>
        </div>
      </div>

      {listing.notes && (
        <div className="marketplace-note">
          <p
            style={{
              margin: 0,
              fontSize: 11,
              color: "#6b7280",
              fontWeight: 700,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Seller Notes
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{listing.notes}</p>
        </div>
      )}

      <div className="marketplace-actions">
        <button
          className="btn btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/consumer/product/${listing.productId}`);
          }}
          title="View product journey timeline"
        >
          Timeline
        </button>

        <button
          className="btn btn-primary"
          onClick={async (e) => {
            e.stopPropagation();

            if (authLoading) {
              alert("Checking session… please try again.");
              return;
            }
            if (!buyerId) {
              alert("Please log in to chat");
              return;
            }

            try {
              const res = await axios.post(
                `${API_ROOT}/chats/create-thread`,
                {
                  listingId: listing.listingId,
                  userId: buyerId,
                  otherUserId: listing.seller.userId,
                },
                { withCredentials: true }
              );

              if (res.data.success) {
                navigate(`/consumer/chats/${res.data.thread.thread_id}`);
              } else {
                alert(res.data.error || "Failed to open chat");
              }
            } catch (err: any) {
              alert(err?.response?.data?.error || "Failed to open chat");
            }
          }}
          title="Chat with seller"
        >
          Message
        </button>

        <button
          className="btn btn-success"
          onClick={handleBuyNowClick}
          disabled={purchasing}
        >
          {purchasing ? "Processing..." : "Buy Now"}
        </button>

        <PurchaseModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setModalError(null);
            setModalSuccess(null);
          }}
          productName={listing.productName || "Unknown Product"}
          price={priceText}
          sellerName={listing.seller.username}
          onConfirm={handleModalConfirm}
          loading={purchasing}
          solAmount={0}
          error={modalError}
          success={modalSuccess}
        />
      </div>
    </div>
  );
};

export default ListingCard;
