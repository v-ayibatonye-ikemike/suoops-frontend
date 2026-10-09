"use client";

import { useEffect, useState } from "react";
import {
  Search,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  Receipt,
  AlertCircle,
  ChevronRight,
  Crown,
  Download,
  Trash2,
} from "lucide-react";
import { useAdminAuth } from "../layout";

interface UserInfo {
  id: number;
  email: string | null;
  name: string;  // Backend returns 'name' not 'full_name'
  phone: string;  // Backend returns 'phone' not 'phone_number'
  phone_verified: boolean;
  role: string;
  plan: string;
  invoices_this_month: number;
  created_at: string;
  last_login: string | null;
  business_name?: string | null;
}

interface UserActivity {
  total_invoices: number;
  revenue_invoices: number;
  expense_invoices: number;
  total_customers: number;
  has_logo: boolean;
  has_bank_details: boolean;
  wallet_balance_naira: number;
  invoice_balance: number;
  invoices_used: number;
  pack_purchases: Array<{
    reference: string;
    amount: number;
    invoices_added: number;
    date: string | null;
  }>;
}

const planColors: Record<string, string> = {
  free: "bg-slate-100 text-slate-700",
  starter: "bg-blue-100 text-blue-700",
  professional: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function UsersPage() {
  const { token } = useAdminAuth();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch users when search changes
  useEffect(() => {
    async function searchUsers() {
      if (!token || !searchQuery.trim()) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(
          `${apiUrl}/admin/users?search=${encodeURIComponent(searchQuery)}&limit=20`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) throw new Error("Failed to search users");
        const data = await res.json();
        setUsers(data.items || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsLoading(false);
      }
    }

    searchUsers();
  }, [token, searchQuery]);

  // Fetch user details
  async function fetchUserDetails(userId: number) {
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch user details");
      const data = await res.json();
      
      // Backend returns { user: {...}, activity: {...} }
      if (data.user) {
        setSelectedUser(data.user);
        setUserActivity(data.activity || null);
      } else {
        // If response is flat (from search), use as-is
        setSelectedUser(data);
        setUserActivity(null);
      }
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
  }

  // Export contacts as a Zoho Campaigns-ready CSV (marketing moved off Brevo)
  async function exportUsersCSV() {
    if (!token) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/users/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error("Failed to export users");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "suoops_contacts.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  // Delete user account
  async function deleteUser() {
    if (!token || !selectedUser) return;
    
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      setDeleteError("Type 'DELETE MY ACCOUNT' to confirm");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/users/admin/${selectedUser.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete user");
      }

      // Success - clear selection and remove from list
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      setSelectedUser(null);
      setUserActivity(null);
      setShowDeleteModal(false);
      setDeleteConfirmation("");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  // Credit a business's prepaid wallet (free invoice fees). Super-admin only
  // (enforced by the backend) + audited + capped at ₦500,000 per credit.
  async function creditWallet() {
    if (!token || !selectedUser) return;
    const raw = window.prompt("Amount to credit (₦), max 500,000:");
    if (!raw) return;
    const amount = Math.floor(Number(raw));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 500000) {
      setError("Enter a valid amount between ₦1 and ₦500,000.");
      return;
    }
    const reason = window.prompt("Reason for this credit (audited):");
    if (!reason || reason.trim().length < 3) {
      setError("A reason (min 3 characters) is required.");
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/users/${selectedUser.id}/credit-wallet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount_naira: amount, reason: reason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to credit wallet");
      }
      await fetchUserDetails(selectedUser.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Lookup</h1>
          <p className="text-slate-500">Search and view customer details</p>
        </div>
        <button
          onClick={exportUsersCSV}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Export CSV (Zoho)
        </button>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email, name, or phone..."
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Type at least 2 characters to search
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search results */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="font-medium text-slate-700 text-sm">
                {isLoading
                  ? "Searching..."
                  : users.length > 0
                  ? `${users.length} Results`
                  : searchQuery
                  ? "No Results"
                  : "Search Results"}
              </h2>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center">
                <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  {searchQuery
                    ? "No users found matching your search"
                    : "Enter a search query to find users"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      fetchUserDetails(user.id);
                    }}
                    className={`w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors ${
                      selectedUser?.id === user.id ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">
                          {user.name || "No Name"}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            planColors[user.plan] || planColors.free
                          }`}
                        >
                          {user.plan}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6">
              {/* Profile card */}
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-linear-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xl font-bold">
                      {(selectedUser.name || selectedUser.email || selectedUser.phone || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900">
                          {selectedUser.name || "No Name"}
                        </h2>
                        {selectedUser.role === "admin" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Crown className="h-3 w-3" />
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500">{selectedUser.email}</p>

                      <div className="flex items-center gap-4 mt-3">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${
                            planColors[selectedUser.plan] || planColors.free
                          }`}
                        >
                          {selectedUser.plan} Plan
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            selectedUser.phone_verified
                              ? "bg-green-100 text-green-700"
                              : selectedUser.phone
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {selectedUser.phone_verified
                            ? "Verified"
                            : selectedUser.phone
                            ? "Unverified"
                            : "No Phone"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border-2 border-red-200 bg-red-50">
                <div className="px-6 py-4 border-b border-red-200">
                  <h3 className="font-semibold text-red-700">Danger Zone</h3>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">Delete this user account</p>
                      <p className="text-sm text-slate-500">
                        Permanently delete this user and all their data. This cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDeleteModal(true);
                        setDeleteConfirmation("");
                        setDeleteError("");
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete User
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact & Business info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact */}
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">
                      Contact Information
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Email</p>
                        <a
                          href={`mailto:${selectedUser.email}`}
                          className="text-sm text-emerald-600 hover:text-emerald-700"
                        >
                          {selectedUser.email}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Phone</p>
                        <p className="text-sm text-slate-700">
                          {selectedUser.phone || "Not provided"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Joined</p>
                        <p className="text-sm text-slate-700">
                          {new Date(selectedUser.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedUser.last_login && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Last Login</p>
                          <p className="text-sm text-slate-700">
                            {new Date(
                              selectedUser.last_login
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business */}
                <div className="rounded-xl border border-slate-200 bg-white">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">
                      Business & Usage
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {selectedUser.business_name && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Business</p>
                          <p className="text-sm text-slate-700">
                            {selectedUser.business_name}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Invoices This Month</p>
                        <p className="text-sm text-slate-700">
                          {selectedUser.invoices_this_month}
                        </p>
                      </div>
                    </div>

                    {userActivity && (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Total Invoices</p>
                            <p className="text-sm text-slate-700">
                              {userActivity.total_invoices} ({userActivity.revenue_invoices} revenue, {userActivity.expense_invoices} expense)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Total Customers</p>
                            <p className="text-sm text-slate-700">{userActivity.total_customers}</p>
                          </div>
                        </div>

                        {/* Wallet & Invoices */}
                        <div className="mt-4 p-4 rounded-lg bg-linear-to-r from-purple-50 to-blue-50 border border-purple-100">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-slate-700">Invoice Wallet</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-purple-600">₦{(userActivity.wallet_balance_naira || 0).toLocaleString()}</span>
                              <button
                                onClick={creditWallet}
                                title="Credit wallet (free invoice fees)"
                                className="rounded-md bg-purple-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-purple-700"
                              >
                                Credit
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Invoices created</p>
                              <p className="font-medium text-slate-700">{userActivity.invoices_used}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Wallet balance</p>
                              <p className="font-medium text-purple-600">₦{(userActivity.wallet_balance_naira || 0).toLocaleString()}</p>
                            </div>
                          </div>
                          
                          {/* Wallet Top-up History */}
                          {userActivity.pack_purchases && userActivity.pack_purchases.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-purple-100">
                              <p className="text-xs font-medium text-slate-600 mb-2">Wallet Top-ups</p>
                              <div className="space-y-2">
                                {userActivity.pack_purchases.map((purchase, idx) => (
                                  <div key={idx} className="flex justify-between text-xs">
                                    <span className="text-slate-500">
                                      {purchase.date ? new Date(purchase.date).toLocaleDateString() : "Unknown"}
                                    </span>
                                    <span className="text-emerald-600 font-medium">
                                      +₦{purchase.amount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          {userActivity.has_logo && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              Has Logo
                            </span>
                          )}
                          {userActivity.has_bank_details && (
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                              Bank Details Set
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                No User Selected
              </h3>
              <p className="text-sm text-slate-500">
                Search for a user and select them to view their details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Delete User Account
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                You are about to permanently delete the account for:
              </p>
              <p className="mt-1 font-medium text-slate-700">
                {selectedUser.name || selectedUser.email || selectedUser.phone}
              </p>
              <p className="text-xs text-slate-400">
                ID: {selectedUser.id}
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700">
                <strong>⚠️ Warning:</strong> This will permanently delete:
              </p>
              <ul className="mt-2 text-sm text-red-600 list-disc list-inside space-y-1">
                <li>All invoices and customers</li>
                <li>Business profile and logo</li>
                <li>All associated data</li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type <span className="font-mono bg-slate-100 px-1 rounded-sm">DELETE MY ACCOUNT</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation("");
                  setDeleteError("");
                }}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={deleteUser}
                disabled={isDeleting || deleteConfirmation !== "DELETE MY ACCOUNT"}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
