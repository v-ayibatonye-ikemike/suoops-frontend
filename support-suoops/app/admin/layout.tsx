"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Ticket,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Settings,
  BarChart3,
  Briefcase,
  Zap,
  MessageSquare,
  Megaphone,
  Building2,
  Store,
  ShieldAlert,
  Scale,
  BrainCircuit,
} from "lucide-react";

// Simple auth context for admin
interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  token: string | null;
  requestOtp: (email: string) => Promise<{ ok: boolean; message: string }>;
  verifyOtp: (email: string, otp: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}

function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Validate session on mount using httpOnly cookie
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
    fetch(`${apiUrl}/admin/auth/me`, {
      credentials: "include",
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => {
        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          role: "admin",
          is_super_admin: data.is_super_admin || false,
        });
        // /me returns a fresh access_token so pages using Bearer header still work after refresh
        if (data.access_token) {
          setToken(data.access_token);
        }
      })
      .catch(() => {
        setUser(null);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const requestOtp = async (email: string): Promise<{ ok: boolean; message: string }> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const response = await fetch(`${apiUrl}/admin/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { ok: false, message: data.detail || "Could not send a login code. Please try again." };
      }
      return { ok: true, message: data.message || "If that address is an admin, a code has been sent." };
    } catch {
      return { ok: false, message: "Network error. Please try again." };
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<boolean> => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
      const response = await fetch(`${apiUrl}/admin/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const userData = data.user;

      // Store JWT in memory for pages that still use Authorization header
      setToken(data.access_token);
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        is_super_admin: userData.is_super_admin || false,
      });

      return true;
    } catch {
      return false;
    }
  };

  const logout = useCallback(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.suoops.com";
    fetch(`${apiUrl}/admin/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).finally(() => {
      setUser(null);
      setToken(null);
      router.push("/admin/login");
    });
  }, [router]);

  const authFetch = useCallback(async (url: string, options?: RequestInit): Promise<Response> => {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options?.headers,
      },
    });
    if (res.status === 401) {
      setUser(null);
      setToken(null);
      router.push("/admin/login");
    }
    return res;
  }, [router]);

  return (
    <AdminAuthContext.Provider value={{ user, token, requestOtp, verifyOtp, logout, isLoading, authFetch }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// Navigation items
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tickets", label: "Tickets", icon: Ticket },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/businesses", label: "Businesses", icon: Briefcase },
  { href: "/admin/storefronts", label: "Storefronts", icon: Store },
  { href: "/admin/fraud", label: "Trust & Safety", icon: ShieldAlert },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
  { href: "/admin/ai-governance", label: "AI Governance", icon: BrainCircuit },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/influencers", label: "Influencers", icon: Megaphone },
  { href: "/admin/onboard", label: "SME Onboard", icon: Building2 },
  { href: "/admin/tasks", label: "Tasks", icon: Zap },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAdminAuth();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
                S
              </div>
              <span className="text-lg font-semibold text-white">SuoOps Admin</span>
            </Link>
            <button
              onClick={onClose}
              className="lg:hidden text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-white font-medium">
                {user?.name?.charAt(0) || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email || "admin@suoops.com"}
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function AdminContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, isLoading } = useAdminAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (
      !isLoading &&
      !user &&
      !pathname.includes("/login") &&
      !pathname.includes("/accept-invite") &&
      !pathname.includes("/blocked")
    ) {
      router.push("/admin/login");
    }
  }, [user, isLoading, pathname, router]);

  // Don't show layout on login, accept-invite, or blocked pages
  if (
    pathname.includes("/login") ||
    pathname.includes("/accept-invite") ||
    pathname.includes("/blocked")
  ) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    return null;
  }

  // Get page title from path
  const getPageTitle = () => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/tickets")) return "Support Tickets";
    if (pathname.startsWith("/admin/users")) return "Users";
    return "Admin";
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-600 hover:text-slate-900"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="text-slate-500 hover:text-slate-900">
              Admin
            </Link>
            {pathname !== "/admin" && (
              <>
                <ChevronRight className="h-4 w-4 text-slate-400" />
                <span className="text-slate-900 font-medium">{getPageTitle()}</span>
              </>
            )}
          </nav>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminContent>{children}</AdminContent>
    </AdminAuthProvider>
  );
}
