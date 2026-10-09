"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  Mail,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  Trash2,
  Copy,
  CheckCircle,
  History,
  Globe,
  Plus,
} from "lucide-react";
import { useAdminAuth } from "../layout";

interface AdminMember {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  is_super_admin: boolean;
  can_manage_tickets: boolean;
  can_view_users: boolean;
  can_view_analytics: boolean;
  can_invite_admins: boolean;
  last_login: string | null;
  created_at: string;
}

interface AuditEntry {
  id: number;
  admin_id: number | null;
  email: string | null;
  ip: string | null;
  user_agent: string | null;
  status: string;
  event: string;
  reason: string | null;
  created_at: string;
}

interface IpAllowlistEntry {
  id: number;
  cidr: string;
  label: string | null;
  created_by_id: number | null;
  created_at: string;
}

export default function SettingsPage() {
  const { token, user } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Delete admin state
  const [adminToDelete, setAdminToDelete] = useState<AdminMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePerms, setInvitePerms] = useState({
    can_manage_tickets: true,
    can_view_users: true,
    can_view_analytics: true,
    can_invite_admins: false,
  });
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Login activity (super admins only)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  // IP allowlist (super admins only)
  const [ipEntries, setIpEntries] = useState<IpAllowlistEntry[]>([]);
  const [ipLoading, setIpLoading] = useState(false);
  const [ipError, setIpError] = useState("");
  const [myIp, setMyIp] = useState<string | null>(null);
  const [newCidr, setNewCidr] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [isAddingIp, setIsAddingIp] = useState(false);
  const [ipToDelete, setIpToDelete] = useState<IpAllowlistEntry | null>(null);

  useEffect(() => {
    async function fetchAdmins() {
      if (!token) return;

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(`${apiUrl}/admin/auth/admins`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch admins");
        const data = await res.json();
        setAdmins(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load admins");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAdmins();
  }, [token]);

  useEffect(() => {
    async function fetchAuditLog() {
      if (!token || !user?.is_super_admin) return;
      setAuditLoading(true);
      setAuditError("");
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const res = await fetch(`${apiUrl}/admin/auth/login-audit?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load login activity");
        setAuditLog(await res.json());
      } catch (err) {
        setAuditError(err instanceof Error ? err.message : "Failed to load login activity");
      } finally {
        setAuditLoading(false);
      }
    }

    fetchAuditLog();
  }, [token, user?.is_super_admin]);

  useEffect(() => {
    async function fetchIpAllowlist() {
      if (!token || !user?.is_super_admin) return;
      setIpLoading(true);
      setIpError("");
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
        const [listRes, ipRes] = await Promise.all([
          fetch(`${apiUrl}/admin/auth/ip-allowlist`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/admin/auth/ip-allowed`).catch(() => null),
        ]);
        if (!listRes.ok) throw new Error("Failed to load IP allowlist");
        setIpEntries(await listRes.json());
        if (ipRes && ipRes.ok) {
          const data = await ipRes.json();
          setMyIp(data?.ip ?? null);
        }
      } catch (err) {
        setIpError(err instanceof Error ? err.message : "Failed to load IP allowlist");
      } finally {
        setIpLoading(false);
      }
    }

    fetchIpAllowlist();
  }, [token, user?.is_super_admin]);

  async function refreshIpAllowlist(apiUrl: string) {
    const res = await fetch(`${apiUrl}/admin/auth/ip-allowlist`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setIpEntries(await res.json());
  }

  async function handleAddIp(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newCidr.trim()) return;
    setIsAddingIp(true);
    setIpError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/auth/ip-allowlist`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cidr: newCidr.trim(), label: newLabel.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to add IP");
      }
      setNewCidr("");
      setNewLabel("");
      await refreshIpAllowlist(apiUrl);
    } catch (err) {
      setIpError(err instanceof Error ? err.message : "Failed to add IP");
    } finally {
      setIsAddingIp(false);
    }
  }

  async function handleDeleteIp() {
    if (!ipToDelete || !token) return;
    setIpError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/auth/ip-allowlist/${ipToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to remove IP");
      }
      setIpToDelete(null);
      await refreshIpAllowlist(apiUrl);
    } catch (err) {
      setIpError(err instanceof Error ? err.message : "Failed to remove IP");
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    // Validate email domain
    if (!inviteEmail.toLowerCase().endsWith("@suoops.com")) {
      setError("Only @suoops.com email addresses can be invited as admins");
      return;
    }

    setIsInviting(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/auth/invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          ...invitePerms,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to send invitation");
      }

      const data = await res.json();
      setInviteSuccess(data.invite_link);
      setInviteEmail("");
      setInviteName("");
      setShowInviteForm(false);

      // Refresh admins list
      const adminsRes = await fetch(`${apiUrl}/admin/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminsRes.ok) {
        setAdmins(await adminsRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite admin");
    } finally {
      setIsInviting(false);
    }
  }

  function copyInviteLink() {
    if (inviteSuccess) {
      navigator.clipboard.writeText(inviteSuccess);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  async function handleDeleteAdmin() {
    if (!adminToDelete || !token) return;

    setIsDeleting(true);
    setError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const res = await fetch(`${apiUrl}/admin/auth/admins/${adminToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to remove admin");
      }

      // Refresh admins list
      const adminsRes = await fetch(`${apiUrl}/admin/auth/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (adminsRes.ok) {
        setAdmins(await adminsRes.json());
      }

      setAdminToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage admin team and permissions</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-xl text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {inviteSuccess && (
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Invitation sent successfully!
              </p>
              <p className="text-sm text-green-700 mt-1">
                Share this link with the new admin:
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white rounded-lg text-xs text-slate-600 break-all border border-green-200">
                  {inviteSuccess}
                </code>
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                >
                  {copiedLink ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copiedLink ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <button
              onClick={() => setInviteSuccess(null)}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Admin Team */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Admin Team</h2>
          {user?.is_super_admin && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
            >
              <UserPlus className="h-4 w-4" />
              Invite Admin
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : admins.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">No admin users found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {admins
              .filter((admin) => {
                // Non-super admins shouldn't see super admin details
                if (!user?.is_super_admin && admin.is_super_admin) {
                  return false;
                }
                return true;
              })
              .map((admin) => (
              <div key={admin.id} className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {admin.name}
                    </span>
                    {admin.is_super_admin && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        <Shield className="h-3 w-3" />
                        Super Admin
                      </span>
                    )}
                    {!admin.is_active && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{admin.email}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>
                    Joined {new Date(admin.created_at).toLocaleDateString()}
                  </span>
                  {admin.last_login && (
                    <span>
                      Last login {new Date(admin.last_login).toLocaleDateString()}
                    </span>
                  )}
                  {/* Delete button - only visible to super admins, can't delete self or other super admins */}
                  {user?.is_super_admin && admin.id !== user.id && !admin.is_super_admin && (
                    <button
                      onClick={() => setAdminToDelete(admin)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove admin"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login Activity */}
      {user?.is_super_admin && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <History className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Login Activity</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">
              Recent admin sign-ins and login-code requests. Watch for activity from IP addresses you
              don&apos;t recognise.
            </p>
            {auditError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{auditError}</p>
              </div>
            )}
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="py-2 pr-4 font-medium">When</th>
                      <th className="py-2 pr-4 font-medium">Event</th>
                      <th className="py-2 pr-4 font-medium">Email</th>
                      <th className="py-2 pr-4 font-medium">IP address</th>
                      <th className="py-2 pr-4 font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditLog.map((entry) => {
                      const eventLabel =
                        entry.event === "login"
                          ? "Sign in"
                          : entry.event === "otp_requested"
                          ? "Code requested"
                          : entry.event === "invite_accepted"
                          ? "Invite accepted"
                          : entry.event;
                      const isFailure = entry.status !== "success";
                      return (
                        <tr key={entry.id} className={isFailure ? "bg-red-50/40" : undefined}>
                          <td className="py-2 pr-4 whitespace-nowrap text-slate-600">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-slate-700">{eventLabel}</td>
                          <td className="py-2 pr-4 text-slate-600">{entry.email || "—"}</td>
                          <td className="py-2 pr-4 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Globe className="h-3.5 w-3.5 text-slate-400" />
                              {entry.ip || "—"}
                            </span>
                          </td>
                          <td className="py-2 pr-4">
                            {isFailure ? (
                              <span className="inline-flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {entry.reason || "failed"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                                success
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Allowed IP Addresses */}
      {user?.is_super_admin && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Globe className="h-5 w-5 text-slate-500" />
            <h2 className="font-semibold text-slate-900">Allowed IP Addresses</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-1">
              Restrict who can reach the admin panel by network. Add the public IP addresses or
              ranges (CIDR) that are allowed to sign in.
            </p>
            <p className="text-sm mb-4">
              {ipEntries.length === 0 ? (
                <span className="text-amber-600">
                  No restrictions yet — the panel is reachable from any network.
                </span>
              ) : (
                <span className="text-emerald-600">
                  Restricted: only the {ipEntries.length} network
                  {ipEntries.length === 1 ? "" : "s"} below can access the admin panel.
                </span>
              )}
            </p>

            {myIp && (
              <p className="text-xs text-slate-400 mb-4">
                Your current IP address is <span className="font-mono text-slate-600">{myIp}</span>
              </p>
            )}

            {ipError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p className="text-sm">{ipError}</p>
              </div>
            )}

            {ipLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {ipEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5"
                  >
                    <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm text-slate-700">{entry.cidr}</p>
                      {entry.label && (
                        <p className="text-xs text-slate-400 truncate">{entry.label}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setIpToDelete(entry)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove IP"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddIp} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCidr}
                onChange={(e) => setNewCidr(e.target.value)}
                placeholder="203.0.113.10 or 203.0.113.0/24"
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (optional)"
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isAddingIp || !newCidr.trim()}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
              >
                {isAddingIp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              To avoid locking yourself out, add a range that includes your own IP before relying on
              the allowlist. Removing every entry reopens the panel to all networks.
            </p>
          </div>
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Invite Admin</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleInvite} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {[
                    { key: "can_manage_tickets", label: "Manage Tickets" },
                    { key: "can_view_users", label: "View Users" },
                    { key: "can_view_analytics", label: "View Analytics" },
                    { key: "can_invite_admins", label: "Invite Admins" },
                  ].map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={invitePerms[perm.key as keyof typeof invitePerms]}
                        onChange={(e) =>
                          setInvitePerms({
                            ...invitePerms,
                            [perm.key]: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-600">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
                >
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Remove Admin</h3>
                  <p className="text-sm text-slate-500">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Are you sure you want to remove <strong>{adminToDelete.name}</strong> ({adminToDelete.email}) from the admin team?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setAdminToDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAdmin}
                  disabled={isDeleting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IP Allowlist Delete Confirmation Modal */}
      {ipToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Remove allowed IP</h3>
                  <p className="text-sm text-slate-500">This network will lose access</p>
                </div>
              </div>

              <p className="text-slate-600 mb-6">
                Remove <strong className="font-mono">{ipToDelete.cidr}</strong>
                {ipToDelete.label ? ` (${ipToDelete.label})` : ""} from the allowlist? Admins on this
                network will no longer be able to reach the panel.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setIpToDelete(null)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteIp}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
