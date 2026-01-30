import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TransactionHistory from '../../components/products/TransactionHistory';

const API_BASE = 'https://fyp-25-s4-20.duckdns.org:3000/api';

interface Product {
  product_id: number;
  serial_no: string;
  model: string;
  batch_no: string;
  category: string;
  manufacture_date: string;
  description: string;
  status: string;
  qr_code: string | null;
  product_pda: string | null;
  tx_hash: string | null;
  registered_on: string;
  track: boolean;
  manufacturer_name: string;
  manufacturer_id: number;
}

interface OwnershipRecord {
  ownership_id: number;
  owner_id: number;
  owner_name: string;
  owner_public_key: string;
  start_on: string;
  end_on: string | null;
  tx_hash: string | null;
}

interface Listing {
  listing_id: number;
  price: string;
  currency: string;
  status: string;
  created_on: string;
}

interface ProductDetails {
  product: Product;
  ownershipHistory: OwnershipRecord[];
  currentListing: Listing | null;
}

type ViewMode = 'timeline' | 'table';

export default function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProductDetails();
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/products/${productId}/details`);
      if (response.data.success) {
        setDetails(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load product details');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      registered: '#22c55e',
      verified: '#3b82f6',
      suspicious: '#ef4444'
    };
    return colors[status] || '#6b7280';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Loading product details...</div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
          <p style={{ color: '#991b1b', margin: 0 }}>{error || 'Product not found'}</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Back
        </button>
      </div>
    );
  }

  const { product, ownershipHistory, currentListing } = details;
  const currentOwner = ownershipHistory.find(o => !o.end_on);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px', background: '#f9fafb', minHeight: '100vh' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '20px',
          padding: '8px 16px',
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#374151'
        }}
      >
        Back
      </button>

      {/* Product Header Card */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
              {product.model || 'Product Details'}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Serial: {product.serial_no}</p>
          </div>
          <div style={{
            padding: '4px 12px',
            borderRadius: '4px',
            background: getStatusColor(product.status) + '20',
            color: getStatusColor(product.status),
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize'
          }}>
            {product.status}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#111827' }}>Product Information</h3>
            <div style={{ display: 'grid', gap: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Category</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>{product.category || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Batch No</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>{product.batch_no || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Manufacture Date</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>
                  {product.manufacture_date ? new Date(product.manufacture_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Manufacturer</span>
                <span style={{ color: '#111827', fontWeight: '500' }}>{product.manufacturer_name}</span>
              </div>
              {currentOwner && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ color: '#6b7280' }}>Current Owner</span>
                  <span style={{ color: '#2563eb', fontWeight: '500' }}>{currentOwner.owner_name}</span>
                </div>
              )}
            </div>
          </div>

          {product.qr_code && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <img
                src={`data:image/png;base64,${product.qr_code}`}
                alt="Product QR Code"
                style={{ width: '200px', height: '200px', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#6b7280' }}>Scan to verify authenticity</p>
            </div>
          )}
        </div>
      </div>

      {/* Current Listing Banner */}
      {currentListing && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>Currently Listed for Sale</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '700', color: '#78350f' }}>
                {currentListing.currency} ${currentListing.price}
              </p>
            </div>
            <span style={{ fontSize: '12px', color: '#92400e' }}>
              Listed {formatDate(currentListing.created_on)}
            </span>
          </div>
        </div>
      )}

      {/* Ownership History Section */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', border: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>Product Journey Timeline</h2>
        <TransactionHistory serial={product.serial_no} hideHeader={true} defaultView="timeline" embedded={true} />
      </div>
    </div>
  );
}
