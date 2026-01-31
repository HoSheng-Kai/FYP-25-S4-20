import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MarketplaceListing } from "../../pages/marketplace/MarketplacePage";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";
import PurchaseModal from "./PurchaseModal";
import { API_ROOT } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

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
  const [solAmount, setSolAmount] = useState(0);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const wallet = useWallet();

  const priceText =
    listing.price && listing.currency ? `${listing.price} ${listing.currency}` : "—";

  // Helper: Convert SGD to SOL (placeholder)
  const convertSgdToSol = async (sgd: number): Promise<number> => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=sgd"
      );
      const data = await res.json();
      const solPrice = data.solana?.sgd || 0;
      if (!solPrice) return 0;
      return sgd / solPrice;
    } catch {
      return 0;
    }
  };

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

    if (!wallet.connected || !wallet.publicKey) {
      setModalError("Please connect your Phantom wallet to purchase.");
      setModalOpen(true);
      return;
    }
    if (!listing.seller.publicKey) {
      setModalError("Seller has not connected their wallet. Cannot proceed.");
      setModalOpen(true);
      return;
    }

    const priceNum = parseFloat(listing.price || "0");
    if (!priceNum) {
      setModalError("Invalid price");
      setModalOpen(true);
      return;
    }

    setPurchasing(true);
    const sol = await convertSgdToSol(priceNum);
    setSolAmount(sol);
    setPurchasing(false);
    setModalOpen(true);
  };

  const handleModalConfirm = async () => {
    setPurchasing(true);
    setModalError(null);
    setModalSuccess(null);

    try {
      if (authLoading) throw new Error("Session loading");
      if (!buyerId) throw new Error("User not logged in");

      if (!wallet.connected || !wallet.publicKey) throw new Error("Wallet not connected");
      if (!listing.seller.publicKey) throw new Error("Seller wallet missing");

      // 1) Send SOL
      const connection = new Connection("https://api.devnet.solana.com");
      const toPubkey = new PublicKey(listing.seller.publicKey);
      const fromPubkey = wallet.publicKey;
      const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // @ts-ignore
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // 2) Call backend to transfer ownership (cookie auth + buyerId from auth)
      const res = await axios.post(
        `${API_ROOT}/listings/${listing.listingId}/purchase`,
        {
          buyerId,
          solTx: signature,
          buyerPublicKey: wallet.publicKey.toBase58(),
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        setModalSuccess(
          `Purchase successful! You now own ${listing.productName || "this product"}`
        );
        setTimeout(() => {
          setModalOpen(false);
          setModalSuccess(null);
          if (onPurchaseSuccess) onPurchaseSuccess();
        }, 1800);
      } else {
        throw new Error(res.data.error || "Ownership transfer failed");
      }
    } catch (e: any) {
      setModalError(e?.response?.data?.error || e?.message || "Failed to complete payment");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
      {/* ...your existing UI unchanged... */}

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/consumer/product/${listing.productId}`);
          }}
        >
          Timeline
        </button>

        <button
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
                `${API_ROOT}/api/chats/create-thread`,
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
        >
          Message
        </button>

        <button onClick={handleBuyNowClick} disabled={purchasing}>
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
          solAmount={solAmount}
          error={modalError}
          success={modalSuccess}
        />
      </div>
    </div>
  );
};

export default ListingCard;
