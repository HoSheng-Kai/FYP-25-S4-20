import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { USERS_API_BASE_URL, ADMIN_API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

interface ProductListing {
  listing_id: number;
  product_id: number;
  seller_id: number;
  price: string;
  currency: string;
  status: string;
  created_on: string;
  updated_on: string;
  product_name?: string;
  serial_no?: string;
  seller_username?: string;
  current_owner_id?: number;
  current_owner_username?: string;
  current_owner_email?: string;
}

const linkBaseStyle: React.CSSProperties = {
  color: "white",
  textDecoration: "none",
  display: "block",
  padding: "10px 12px",
  borderRadius: 10,
};

const activeStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.12)",
};

export default function AdminListingsPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<ProductListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListings, setSelectedListings] = useState<Set<number>>(new Set());
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // View modal
  const [viewingListing, setViewingListing] = useState<ProductListing | null>(null);
  // logout
  const { logout } = useAuth();
  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [listings, statusFilter, searchQuery]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${ADMIN_API_BASE_URL}/read-product-listings`, { withCredentials: true });
      if (res.data.success && res.data.listings) {
        setListings(res.data.listings);
      }
    } catch (error) {
      console.error("Failed to load listings:", error);
      alert("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...listings];

    if (statusFilter !== "all") {
      result = result.filter(l => l.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.listing_id.toString().includes(query) ||
        l.product_id.toString().includes(query) ||
        l.product_name?.toLowerCase().includes(query) ||
        l.serial_no?.toLowerCase().includes(query) ||
        l.seller_username?.toLowerCase().includes(query)
      );
    }

    setFilteredListings(result);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      navigate("/login");
    }
  };

  const toggleSelectListing = (listingId: number) => {
    const newSet = new Set(selectedListings);
    if (newSet.has(listingId)) {
      newSet.delete(listingId);
    } else {
      newSet.add(listingId);
    }
    setSelectedListings(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedListings.size === filteredListings.length) {
      setSelectedListings(new Set());
    } else {
      setSelectedListings(new Set(filteredListings.map(l => l.listing_id)));
    }
  };

  // Delete single listing
  const handleDeleteListing = async (listingId: number) => {
    if (!confirm("Delete this listing? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${ADMIN_API_BASE_URL}/delete-product-listings`, {
        data: { listing_id: listingId },
        withCredentials: true,
      });
      alert("Successfully deleted listing");
      await loadListings();
      setSelectedListings(new Set());
    } catch (error: any) {
      console.error("Failed to delete listing:", error);
      alert(error.response?.data?.details || "Failed to delete listing");
    }
  };

  // Delete multiple listings
  const handleDeleteSelected = async () => {
    if (selectedListings.size === 0) {
      alert("Please select listings to delete");
      return;
    }

    if (!confirm(`Delete ${selectedListings.size} listing(s)? This cannot be undone.`)) {
      return;
    }

    try {
      // Delete each listing one by one
      for (const listingId of Array.from(selectedListings)) {
        await axios.delete(`${ADMIN_API_BASE_URL}/delete-product-listings`, {
          data: { listing_id: listingId },
          withCredentials: true,
        });
      }
      alert(`Successfully deleted ${selectedListings.size} listing(s)`);
      await loadListings();
      setSelectedListings(new Set());
    } catch (error: any) {
      console.error("Failed to delete listings:", error);
      alert(error.response?.data?.details || "Failed to delete some listings");
      await loadListings();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return { bg: "#d1fae5", text: "#065f46" };
      case "reserved":
        return { bg: "#fef3c7", text: "#92400e" };
      case "sold":
        return { bg: "#e5e7eb", text: "#374151" };
      default:
        return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside
        style={{
          width: 240,
          background: "#0d1b2a",
          color: "white",
          padding: 20,
          position: "relative",
        }}
      >
        <h2 style={{ marginBottom: 30 }}>Admin</h2>

        <nav>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
            <li>
              <NavLink
                to="/admin"
                end
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/users"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                User Management
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/listings"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Product Listings
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/admin/register"
                style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}
              >
                Register Company
              </NavLink>
            </li>
          </ul>
        </nav>

        <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
            }}
          >
            ➜ Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ padding: 40, flexGrow: 1, background: "#f9fafb" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ marginBottom: 8, fontSize: 32, color: "#111827" }}>
            Product Listings
          </h1>
          <p style={{ color: "#6b7280", fontSize: 15 }}>
            View and manage all product listings in the marketplace
          </p>
        </div>

        {/* Filters */}
        <div
          style={{
            background: "white",
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by listing ID, product ID, name, or serial number"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="all">All Status</option>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedListings.size > 0 && (
          <div
            style={{
              background: "#eff6ff",
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#1e40af", fontWeight: 600 }}>
              {selectedListings.size} listing(s) selected
            </span>
            <button
              onClick={handleDeleteSelected}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Delete Selected
            </button>
          </div>
        )}

        {/* Listings Table */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: 16, textAlign: "left" }}>
                    <input
                      type="checkbox"
                      checked={selectedListings.size === filteredListings.length && filteredListings.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Product ID
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Product Name
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Serial No
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Price
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Status
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Created
                  </th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                      No listings found
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => {
                    const statusColor = getStatusColor(listing.status);
                    return (
                      <tr
                        key={listing.listing_id}
                        style={{ borderBottom: "1px solid #e5e7eb" }}
                      >
                        <td style={{ padding: 16 }}>
                          <input
                            type="checkbox"
                            checked={selectedListings.has(listing.listing_id)}
                            onChange={() => toggleSelectListing(listing.listing_id)}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ padding: 16, fontSize: 14, fontWeight: 600 }}>#{listing.product_id}</td>
                        <td style={{ padding: 16, fontSize: 14 }}>
                          {listing.product_name || "N/A"}
                        </td>
                        <td style={{ padding: 16, fontSize: 14, fontFamily: "monospace" }}>
                          {listing.serial_no || "N/A"}
                        </td>
                        <td style={{ padding: 16, fontSize: 14 }}>
                          {listing.currency} {listing.price}
                        </td>
                        <td style={{ padding: 16 }}>
                          <span
                            style={{
                              background: statusColor.bg,
                              color: statusColor.text,
                              padding: "4px 12px",
                              borderRadius: 12,
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {listing.status}
                          </span>
                        </td>
                        <td style={{ padding: 16, fontSize: 14, color: "#6b7280" }}>
                          {new Date(listing.created_on).toLocaleDateString()}
                        </td>
                        <td style={{ padding: 16, textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                            <button
                              onClick={() => setViewingListing(listing)}
                              style={{
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteListing(listing.listing_id)}
                              style={{
                                background: "#ef4444",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Total count */}
        <div style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>
          Showing {filteredListings.length} of {listings.length} listings
        </div>
      </main>

      {/* View Listing Modal */}
      {viewingListing && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setViewingListing(null)}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 12,
              width: 500,
              maxWidth: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>
              Listing Details
            </h2>

            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Listing ID
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  #{viewingListing.listing_id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Product ID
                </div>
                <div style={{ fontSize: 16 }}>#{viewingListing.product_id}</div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Product Name
                </div>
                <div style={{ fontSize: 16 }}>
                  {viewingListing.product_name || "N/A"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Serial Number
                </div>
                <div style={{ fontSize: 16, fontFamily: "monospace" }}>
                  {viewingListing.serial_no || "N/A"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Seller ID
                </div>
                <div style={{ fontSize: 16 }}>#{viewingListing.seller_id}</div>
              </div>

              {viewingListing.seller_username && (
                <div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    Seller Username
                  </div>
                  <div style={{ fontSize: 16 }}>{viewingListing.seller_username}</div>
                </div>
              )}

              {/* Current Owner Section */}
              <div
                style={{
                  marginTop: 8,
                  padding: 16,
                  background: "#f0fdf4",
                  borderRadius: 8,
                  border: "1px solid #86efac",
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#166534", marginBottom: 12 }}>
                  Current Owner
                </div>
                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      Owner ID
                    </div>
                    <div style={{ fontSize: 16 }}>#{viewingListing.current_owner_id || "N/A"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                      Owner Username
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>
                      {viewingListing.current_owner_username || "Unknown"}
                    </div>
                  </div>
                  {viewingListing.current_owner_email && (
                    <div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        Owner Email
                      </div>
                      <div style={{ fontSize: 16 }}>
                        {viewingListing.current_owner_email}
                      </div>
                    </div>
                  )}
                  {viewingListing.current_owner_id !== viewingListing.seller_id && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#059669",
                        fontStyle: "italic",
                        marginTop: 4,
                      }}
                    >
                      ⓘ Ownership has been transferred
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Price
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {viewingListing.currency} {viewingListing.price}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Status
                </div>
                <div>
                  <span
                    style={{
                      background: getStatusColor(viewingListing.status).bg,
                      color: getStatusColor(viewingListing.status).text,
                      padding: "4px 12px",
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {viewingListing.status}
                  </span>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Created On
                </div>
                <div style={{ fontSize: 16 }}>
                  {new Date(viewingListing.created_on).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Updated On
                </div>
                <div style={{ fontSize: 16 }}>
                  {new Date(viewingListing.updated_on).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                onClick={() => setViewingListing(null)}
                style={{
                  background: "#e5e7eb",
                  color: "#374151",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDeleteListing(viewingListing.listing_id);
                  setViewingListing(null);
                }}
                style={{
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
