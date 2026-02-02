import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { OwnedProduct } from "../../pages/consumer/MyProductsPage";
import QuickListingModal from "../marketplace/QuickListingModal";
import { useAuth } from "../../auth/AuthContext";

interface MyProductCardProps {
  product: OwnedProduct;
}

// Badge color mapping for listing status
const getStatusBadgeStyle = (
  status: "none" | "available" | "reserved" | "sold"
): { bg: string; text: string; label: string } => {
  switch (status) {
    case "available":
    case "reserved":
      return {
        bg: "#d4edda",
        text: "#155724",
        label: "📌 Listed in Marketplace",
      };
    case "sold":
      return {
        bg: "#e2e3e5",
        text: "#383d41",
        label: "Not Listed",
      };
    case "none":
    default:
      return {
        bg: "#e2e3e5",
        text: "#383d41",
        label: "Not Listed",
      };
  }
};

export default function MyProductCard({ product }: MyProductCardProps) {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const authLoading = auth.loading;
  const user = auth.user;

  const [showModal, setShowModal] = useState(false);
  const statusStyle = getStatusBadgeStyle(product.listingStatus);

  const handleCreateListing = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (authLoading) {
      alert("Checking session… please try again.");
      return;
    }

    if (!user) {
      alert("Please log in to create a listing.");
      return;
    }

    setShowModal(true);
  };

  const handleViewDetails = () => {
    navigate(`/consumer/product/${product.productId}`);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    navigate("/consumer/my-listings");
  };

  return (
    <>
      <div
        style={{
          background: "white",
          border: "1px solid #e0e0e0",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          transition: "all 0.3s ease",
          cursor: "pointer",
        }}
        onClick={handleViewDetails}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 8px 16px rgba(0,0,0,0.12)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.boxShadow =
            "0 2px 8px rgba(0,0,0,0.08)";
          (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        }}
      >
        {/* Status Badge */}
        <div
          style={{
            padding: 12,
            background: statusStyle.bg,
            color: statusStyle.text,
            fontSize: 13,
            fontWeight: 600,
            borderBottom: `2px solid ${statusStyle.text}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{statusStyle.label}</span>
        </div>

        {/* Content */}
        <div style={{ padding: 16 }}>
          <h3
            style={{
              margin: "0 0 8px 0",
              fontSize: 16,
              fontWeight: 600,
              color: "#1a1a1a",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product.model || "Product"}
          </h3>

          <p
            style={{
              margin: "0 0 12px 0",
              fontSize: 13,
              color: "#888",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {product.serialNo}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
              fontSize: 12,
              color: "#666",
            }}
          >
            {product.category && (
              <div>
                <strong style={{ color: "#333" }}>Category:</strong>
                <br />
                {product.category}
              </div>
            )}
            {product.batchNo && (
              <div>
                <strong style={{ color: "#333" }}>Batch:</strong>
                <br />
                {product.batchNo}
              </div>
            )}
            <div>
              <strong style={{ color: "#333" }}>Owned Since:</strong>
              <br />
              {new Date(product.registeredOn).toLocaleDateString()}
            </div>
            <div>
              <strong style={{ color: "#333" }}>Status:</strong>
              <br />
              {product.status}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            {product.canCreateListing && (
              <button
                onClick={handleCreateListing}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#0056b3";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#007bff";
                }}
              >
                List for Sale
              </button>
            )}

            {product.listingStatus !== "none" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/consumer/my-listings");
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#545b62";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#6c757d";
                }}
              >
                View Listing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <QuickListingModal
          product={product}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </>
  );
}
