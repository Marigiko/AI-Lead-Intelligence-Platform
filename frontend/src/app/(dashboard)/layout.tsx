"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import {
  LayoutDashboard,
  Search,
  Building2,
  BarChart3,
  Send,
  MessageSquare,
  Briefcase,
  Settings,
  LogOut,
  Zap,
  Globe,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Mail,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/discovery", label: "Descubrimiento", icon: Search },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/scoring", label: "Scoring", icon: Zap },
  { href: "/campaigns", label: "Campanas", icon: Send },
  { href: "/conversations", label: "Conversaciones", icon: MessageSquare },
  { href: "/deals", label: "Pipeline", icon: Briefcase },
  { href: "/analytics", label: "Analiticas", icon: BarChart3 },
  { href: "/deliverability", label: "Entregabilidad", icon: Mail },
  { href: "/scrapers", label: "Scrapers", icon: Globe },
  { href: "/settings", label: "Configuracion", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.includes(href);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-card border shadow-md"
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 bg-card border-r transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center h-16 border-b px-4 ${sidebarCollapsed ? "justify-center" : ""}`}>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg text-foreground">Lead Intel</span>
            )}
            {sidebarCollapsed && <Zap className="text-primary" size={24} />}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <item.icon size={18} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:block border-t p-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-accent transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* User section */}
          <div className={`border-t p-3 ${sidebarCollapsed ? "px-2" : ""}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? "justify-center" : ""}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
              )}
              {!sidebarCollapsed && (
                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-accent transition-colors"
                  title="Cerrar sesion"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-card">
          <div className="lg:hidden w-8" />
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
