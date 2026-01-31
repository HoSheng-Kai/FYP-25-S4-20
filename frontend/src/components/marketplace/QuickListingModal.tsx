import React, { useState } from "react";
import axios from "axios";
import type { OwnedProduct } from "../../pages/consumer/MyProductsPage";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

interface QuickListingModalProps {
  product: OwnedProduct;
  onClose: () => void;
  onSuccess: () => void;
}

export default function QuickListingModal({ product, onClose, onSuccess }: QuickListingModalProps) {
  const { auth } = useAuth();
  const authLoading = auth.loading;
  const userId = auth.user?.userId;

  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"SGD" | "USD" | "EUR">("SGD");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authLoading) {
      setError("Checking session… please try again.");
      return;
    }
    if (!userId) {
      setError("You are not logged in. Please login again.");
      return;
    }

    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError("Price must be greater than 0");
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post<{
        success: boolean;
        data?: any;
        error?: string;
        details?: string;
      }>(
        `${API_ROOT}/products/listings`,
        {
          userId,
          productId: product.productId,
          price: priceNum,
          currency,
          status: "available",
          notes: notes.trim() || null,
        },
        { withCredentials: true }
      );

      if (!res.data.success) {
        setError(res.data.error || res.data.details || "Failed to create listing");
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.details ||
          "Unable to create listing"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ...rest of your JSX unchanged
  return (
    <div onClick={onClose} style={{ /* unchanged */ }}>
      <div onClick={(e) => e.stopPropagation()} style={{ /* unchanged */ }}>
        <form onSubmit={handleSubmit}>
          {/* unchanged */}
        </form>
      </div>
    </div>
  );
}
