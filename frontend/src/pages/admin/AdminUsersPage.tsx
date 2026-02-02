import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../auth/AuthContext";
import { USERS_API_BASE_URL, ADMIN_API_BASE_URL } from "../../config/api";

interface User {
  user_id: number;
  username: string;
  email: string;
  role_id: string;
  verified: boolean;
  created_on: string;
  banned?: boolean;
}

interface Role {
  role_id: string;
  role_name: string;
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

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  
  // Filters
  const [usernameFilter, setUsernameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");
  
  // Edit modal
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRoleId, setNewRoleId] = useState<string>("consumer");

  // Delete confirmation modal
  const [deleteModalUsers, setDeleteModalUsers] = useState<User[]>([]);
  const { logout } = useAuth();

  const roles: Role[] = [
    { role_id: "consumer", role_name: "Consumer" },
    { role_id: "manufacturer", role_name: "Manufacturer" },
    { role_id: "distributor", role_name: "Distributor" },
    { role_id: "retailer", role_name: "Retailer" },
    { role_id: "admin", role_name: "Admin" },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, usernameFilter, roleFilter, verifiedFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${ADMIN_API_BASE_URL}/view-accounts`, { withCredentials: true });
      if (res.data.success && res.data.data) {
        // Filter out admin accounts
        const nonAdminUsers = res.data.data.filter((user: User) => user.role_id !== "admin");
        setUsers(nonAdminUsers);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...users];

    if (usernameFilter) {
      result = result.filter(u => 
        u.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    if (roleFilter) {
      result = result.filter(u => u.role_id === roleFilter);
    }

    if (verifiedFilter !== "all") {
      const verified = verifiedFilter === "verified";
      result = result.filter(u => u.verified === verified);
    }

    setFilteredUsers(result);
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

  const toggleSelectUser = (userId: number) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.user_id)));
    }
  };

  // Ban single user
  const handleBanUser = async (user: User) => {
    if (!confirm(`Confirm ban ${user.username}?`)) {
      return;
    }

    try {
      await axios.post(`${ADMIN_API_BASE_URL}/ban-account`, {
        userId: user.user_id,
        banned: !user.banned,
      }, { withCredentials: true });
      alert(`Successfully ${user.banned ? "unbanned" : "banned"} ${user.username}`);
      await loadUsers();
    } catch (error: any) {
      console.error("Failed to update ban status:", error);
      alert(error.response?.data?.details || "Failed to update ban status");
    }
  };

  // Delete single or multiple users
  const handleDeleteUsers = async (usersToDelete: User[]) => {
    if (usersToDelete.length === 0) {
      alert("Please select users to delete");
      return;
    }

    const confirmMsg = usersToDelete.length === 1
      ? `Are you sure you want to delete ${usersToDelete[0].username}? This action cannot be undone.`
      : `Are you sure you want to delete ${usersToDelete.length} users? This action cannot be undone.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // Delete each user individually
      for (const user of usersToDelete) {
        await axios.delete(`${USERS_API_BASE_URL}/${user.user_id}`, { withCredentials: true });
      }
      alert(`Successfully deleted ${usersToDelete.length} user(s)`);
      await loadUsers();
      setSelectedUsers(new Set());
      setDeleteModalUsers([]);
    } catch (error: any) {
      console.error("Failed to delete users:", error);
      alert(error.response?.data?.details || "Failed to delete users");
    }
  };

  // Update user role
  const handleUpdateRole = async () => {
    if (!editingUser) return;

    try {
      await axios.post(`${ADMIN_API_BASE_URL}/update-accounts`, {
        username: editingUser.username,
        role_id: newRoleId,
      }, { withCredentials: true });
      alert("Successfully updated user role");
      await loadUsers();
      setEditingUser(null);
    } catch (error: any) {
      console.error("Failed to update user:", error);
      alert(error.response?.data?.details || "Failed to update user role");
    }
  };

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.role_id === roleId)?.role_name || "Unknown";
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
            User Management
          </h1>
          <p style={{ color: "#6b7280", fontSize: 15 }}>
            View, verify, update, and delete user accounts
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
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                Username
              </label>
              <input
                type="text"
                value={usernameFilter}
                onChange={(e) => setUsernameFilter(e.target.value)}
                placeholder="Search by username"
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
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="">All Roles</option>
                {roles.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                Verification Status
              </label>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
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
              {selectedUsers.size} user(s) selected
            </span>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => {
                  const usersToVerify = users.filter(u => selectedUsers.has(u.user_id));
                  const usernames = usersToVerify.map(u => u.username);
                  if (usernames.length === 0) {
                    alert("Please select users to verify");
                    return;
                  }
                  if (!confirm(`Verify ${usernames.length} user(s)?`)) {
                    return;
                  }
                  axios.post(`${ADMIN_API_BASE_URL}/create-accounts`, { usernames }, { withCredentials: true })
                    .then(() => {
                      alert(`Successfully verified ${usernames.length} user(s)`);
                      loadUsers();
                      setSelectedUsers(new Set());
                    })
                    .catch((error: any) => {
                      alert(error.response?.data?.details || "Failed to verify users");
                    });
                }}
                style={{
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Verify Selected
              </button>
              <button
                onClick={() => {
                  const usersToDelete = users.filter(u => selectedUsers.has(u.user_id));
                  setDeleteModalUsers(usersToDelete);
                }}
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
          </div>
        )}

        {/* Users Table */}
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
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Username
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Email
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Role
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Status
                  </th>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 14, fontWeight: 600 }}>
                    Created
                  </th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                      title="Select all for delete"
                    />
                  </th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 14, fontWeight: 600 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.user_id}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ padding: 16, fontSize: 14 }}>{user.username}</td>
                      <td style={{ padding: 16, fontSize: 14 }}>{user.email}</td>
                      <td style={{ padding: 16, fontSize: 14 }}>{getRoleName(user.role_id)}</td>
                      <td style={{ padding: 16 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {user.verified ? (
                            <span
                              style={{
                                background: "#d1fae5",
                                color: "#065f46",
                                padding: "4px 12px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                display: "inline-block",
                              }}
                            >
                              Verified
                            </span>
                          ) : (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                padding: "4px 12px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                display: "inline-block",
                              }}
                            >
                              Unverified
                            </span>
                          )}
                          {user.banned && (
                            <span
                              style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                padding: "4px 12px",
                                borderRadius: 12,
                                fontSize: 12,
                                fontWeight: 600,
                                display: "inline-block",
                              }}
                            >
                              Banned
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 16, fontSize: 14, color: "#6b7280" }}>
                        {new Date(user.created_on).toLocaleDateString()}
                      </td>
                      <td style={{ padding: 16, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedUsers.has(user.user_id)}
                          onChange={() => toggleSelectUser(user.user_id)}
                          style={{ cursor: "pointer" }}
                          title="Select for delete"
                        />
                      </td>
                      <td style={{ padding: 16, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setNewRoleId(user.role_id);
                            }}
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
                            Edit Role
                          </button>
                          <button
                            onClick={() => handleBanUser(user)}
                            style={{
                              background: user.banned ? "#10b981" : "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "6px 12px",
                              borderRadius: 6,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                            }}
                          >
                            {user.banned ? "Unban" : "Ban"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Total count */}
        <div style={{ marginTop: 16, color: "#6b7280", fontSize: 14 }}>
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </main>

      {/* Edit Role Modal */}
      {editingUser && (
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
          onClick={() => setEditingUser(null)}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 12,
              width: 400,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20 }}>
              Edit User Role
            </h2>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                Username
              </label>
              <input
                type="text"
                value={editingUser.username}
                disabled
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  background: "#f3f4f6",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: 14, color: "#374151" }}>
                New Role
              </label>
              <select
                value={newRoleId}
                onChange={(e) => setNewRoleId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                }}
              >
                {roles.map(role => (
                  <option key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setEditingUser(null)}
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
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                style={{
                  background: "#0066cc",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalUsers.length > 0 && (
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
          onClick={() => setDeleteModalUsers([])}
        >
          <div
            style={{
              background: "white",
              padding: 32,
              borderRadius: 12,
              width: 400,
              maxWidth: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, color: "#dc2626" }}>
              Delete {deleteModalUsers.length} User{deleteModalUsers.length > 1 ? "s" : ""}?
            </h2>

            <p style={{ marginBottom: 20, color: "#374151" }}>
              {deleteModalUsers.length === 1
                ? `This will permanently delete ${deleteModalUsers[0].username} and cannot be undone.`
                : `This will permanently delete ${deleteModalUsers.length} users and cannot be undone.`}
            </p>

            <div style={{ marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              {deleteModalUsers.map(u => (
                <div key={u.user_id} style={{ padding: "8px 12px", background: "#f3f4f6", borderRadius: 6, marginBottom: 8 }}>
                  {u.username}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteModalUsers([])}
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
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUsers(deleteModalUsers)}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
