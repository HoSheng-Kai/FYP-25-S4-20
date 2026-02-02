import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { PRODUCTS_API_BASE_URL } from "../../config/api";
import TransactionHistory from "../../components/products/TransactionHistory";
import "../../styles/ProductDetails.css";

type BackendProduct = {
  product_id: number;
  serial_no: string;
  model: string | null;
  batch_no: string | null;
  category: string | null;
  manufacture_date: string | null;
  description: string | null;

  product_pda: string | null;
  tx_hash: string | null;
  registered_on: string;

  manufacturer_name: string | null;
  manufacturer_id: number | null;

  track: boolean | null;
  qr_code: string | null;
};

type BackendOwnershipRow = {
  ownership_id: number;
  owner_id: number;
  start_on: string;
  end_on: string | null;
  tx_hash: string | null;
  owner_name: string;
  owner_public_key: string;
};

type BackendListing = {
  listing_id: number;
  price: number;
  currency: string;
  status: string;
  created_on: string;
};

type ProductDetailsResponse = {
  success: boolean;
  data?: {
    product: BackendProduct;
    ownershipHistory: BackendOwnershipRow[];
    currentListing: BackendListing | null;
  };
  error?: string;
  details?: string;
};

const safeDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString();
};

const safeDateTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
};

export default function ProductDetailsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const id = useMemo(() => Number(productId), [productId]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [product, setProduct] = useState<BackendProduct | null>(null);
  const [ownership, setOwnership] = useState<BackendOwnershipRow[]>([]);
  const [listing, setListing] = useState<BackendListing | null>(null);

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError("Invalid product id in URL.");
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await axios.get<ProductDetailsResponse>(
          `${PRODUCTS_API_BASE_URL}/${id}/details`
        );

        if (!res.data.success || !res.data.data) {
          setError(res.data.details || res.data.error || "Failed to load product details.");
          return;
        }

        setProduct(res.data.data.product);
        setOwnership(res.data.data.ownershipHistory || []);
        setListing(res.data.data.currentListing || null);
      } catch (err: any) {
        setError(
          err?.response?.data?.details ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load product details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  if (loading) return <div className="pd-page"><div className="pd-container">Loading...</div></div>;

  if (error) {
    return (
      <div className="pd-page">
        <div className="pd-container">
          <div className="pd-topbar">
            <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>
          </div>
          <div className="pd-card">{error}</div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="pd-page"><div className="pd-container">No product found.</div></div>;

  const onChain = !!product.tx_hash;

  // Use PNG endpoint
  const qrImgSrc = `${PRODUCTS_API_BASE_URL}/${product.product_id}/qrcode`;

  return (
    <div className="pd-page">
      <div className="pd-container">
        <div className="pd-topbar">
          <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>

          <span className={`pd-pill ${onChain ? "pd-pill-success" : "pd-pill-warn"}`}>
            {onChain ? "On-Chain" : "Pending"}
          </span>
        </div>

        {/* Product info card */}
        <div className="pd-card">
          <h1 className="pd-title">{product.model || product.serial_no || "Product"}</h1>
          <p className="pd-subtitle">
            Product ID: <b>{product.product_id}</b> · Serial: <b>{product.serial_no}</b>
          </p>

          <div className="pd-split">
            {/* left: info */}
            <div>
              <div className="pd-section-title">Product Information</div>

              <div className="pd-info-grid">
                <div className="pd-label">Category</div>
                <div className="pd-value">{product.category || "—"}</div>

                <div className="pd-label">Batch No</div>
                <div className="pd-value">{product.batch_no || "—"}</div>

                <div className="pd-label">Manufacture Date</div>
                <div className="pd-value">{safeDate(product.manufacture_date)}</div>

                <div className="pd-label">Registered On</div>
                <div className="pd-value">{safeDate(product.registered_on)}</div>

                <div className="pd-label">Manufacturer</div>
                <div className="pd-value">{product.manufacturer_name || "—"}</div>

                <div className="pd-label">Product PDA</div>
                <div className="pd-mono">{product.product_pda || "—"}</div>

                <div className="pd-label">Blockchain Tx</div>
                <div className="pd-mono">{product.tx_hash || "—"}</div>

                {listing && (
                  <>
                    <div className="pd-label">Listing</div>
                    <div className="pd-value">
                      {listing.currency} {listing.price} · {listing.status}
                    </div>
                  </>
                )}

                <div className="pd-label">Description</div>
                <div className="pd-value">{product.description || "—"}</div>
              </div>
            </div>

            {/* right: QR */}
            <div className="pd-qr">
              <img src={qrImgSrc} alt="QR Code" />
              <div className="pd-qr-hint">Scan to verify authenticity</div>
            </div>
          </div>
        </div>

        {/* Ownership history card */}
        <div className="pd-card">
          <div className="pd-section-title">Ownership History</div>

          <div className="pd-table-wrap">
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Owner</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {ownership.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#6b7280", fontWeight: 600 }}>
                      No ownership records.
                    </td>
                  </tr>
                ) : (
                  ownership.map((o) => (
                    <tr key={o.ownership_id}>
                      <td>{o.owner_name}</td>
                      <td>{safeDateTime(o.start_on)}</td>
                      <td>{o.end_on ? safeDateTime(o.end_on) : "Current"}</td>
                      <td className="pd-mono">{o.tx_hash || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* History component */}
        <div className="pd-card">
          <TransactionHistory serial={product.serial_no} hideHeader defaultView="timeline" embedded />
        </div>
      </div>
    </div>
  );
}
