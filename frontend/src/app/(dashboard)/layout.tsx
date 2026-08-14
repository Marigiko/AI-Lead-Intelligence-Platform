"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
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
  Sparkles,
  SearchIcon,
  User,
} from "lucide-react";

/* ─── Navigation Configuration ─── */
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/revenue-agent", label: "Nexus AI", icon: Sparkles },
  { href: "/discovery", label: "Descubrimiento", icon: Search },
  { href: "/companies", label: "Empresas", icon: Building2 },
  { href: "/scoring", label: "Scoring", icon: Zap },
  { href: "/campaigns", label: "Campañas", icon: Send },
  { href: "/conversations", label: "Conversaciones", icon: MessageSquare },
  { href: "/deals", label: "Pipeline", icon: Briefcase },
  { href: "/analytics", label: "Analíticas", icon: BarChart3 },
  { href: "/deliverability", label: "Entregabilidad", icon: Mail },
  { href: "/scrapers", label: "Scrapers", icon: Globe },
  { href: "/settings", label: "Configuración", icon: Settings },
];

/* ─── Notification State (mock — replace with real store) ─── */
const NOTIFICATION_COUNT = 3;

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

  /* ─── Auth Loading State ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background bg-gradient-mesh">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-electric-500/30 border-t-electric-500" />
            <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-electric-400 animate-pulse" />
          </div>
          <span className="text-sm text-muted-foreground animate-pulse">
            Cargando Nexus...
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  /* ─── Active Route Check (fixed) ─── */
  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname === href || pathname.startsWith(href + "/");
    },
    [pathname]
  );

  /* ─── Logout Handler ─── */
  const handleLogout = useCallback(() => {
    logout();
    router.push("/login");
  }, [logout, router]);

  /* ─── Breadcrumb Generation ─── */
  const currentNav = navItems.find((item) => isActive(item.href));
  const pageTitle = currentNav?.label || "Dashboard";

  return (
    <div className="min-h-screen flex bg-background bg-gradient-mesh">
      {/* ── Mobile Menu Button ── */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={cn(
          "lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl",
          "glass-card border border-white/10 shadow-glass",
          "text-foreground hover:border-electric-500/30 hover:shadow-glow-sm",
          "transition-all duration-300"
        )}
        aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* ── Mobile Overlay ── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR — Premium Glassmorphism
          ═══════════════════════════════════════════════════════════ */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col",
          "glass-sidebar transition-all duration-500 ease-spring",
          sidebarCollapsed ? "w-[72px]" : "w-64",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Navegación principal"
      >
        {/* ── Logo Section ── */}
        <div
          className={cn(
            "flex items-center h-16 border-b border-white/10 px-4",
            sidebarCollapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-electric shadow-glow-sm">
            <Sparkles className="h-5 w-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-gradient-electric opacity-50 blur-md -z-10" />
          </div>
          {!sidebarCollapsed && (
            <span className="font-bold text-lg bg-gradient-electric bg-clip-text text-transparent animate-fade-in">
              Nexus
            </span>
          )}
        </div>

        {/* ── Navigation ── */}
        <nav
          className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin"
          role="navigation"
          aria-label="Secciones del dashboard"
        >
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  "transition-all duration-300 ease-spring",
                  active
                    ? "text-white shadow-glow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  sidebarCollapsed && "justify-center px-2"
                )}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                {/* Active Indicator Gradient Background */}
                {active && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-electric opacity-90 animate-fade-in">
                    <div className="absolute inset-0 rounded-xl bg-gradient-electric opacity-40 blur-md" />
                  </div>
                )}

                {/* Icon Container */}
                <span className="relative z-10 flex items-center justify-center">
                  <item.icon
                    size={18}
                    className={cn(
                      "transition-transform duration-300 group-hover:scale-110",
                      active ? "text-white" : "text-muted-foreground group-hover:text-electric-400"
                    )}
                  />
                </span>

                {/* Label */}
                {!sidebarCollapsed && (
                  <span className="relative z-10 animate-fade-in">
                    {item.label}
                  </span>
                )}

                {/* Tooltip cuando está colapsado */}
                {sidebarCollapsed && (
                  <span
                    className={cn(
                      "absolute left-full ml-3 px-3 py-1.5 rounded-lg",
                      "bg-card/95 backdrop-blur-md border border-white/10",
                      "text-sm font-medium text-foreground shadow-glass",
                      "opacity-0 pointer-events-none group-hover:opacity-100",
                      "translate-x-2 group-hover:translate-x-0",
                      "transition-all duration-200 ease-spring whitespace-nowrap z-50"
                    )}
                    role="tooltip"
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Collapse Toggle (desktop) ── */}
        <div className="hidden lg:block border-t border-white/10 p-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "w-full flex items-center justify-center p-2.5 rounded-xl",
              "text-muted-foreground hover:text-foreground hover:bg-white/5",
              "transition-all duration-300"
            )}
            aria-label={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          >
            <div className="transition-transform duration-500 ease-spring"
              style={{ transform: sidebarCollapsed ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              <ChevronLeft size={18} />
            </div>
          </button>
        </div>

        {/* ── User Section ── */}
        <div className={cn(
          "border-t border-white/10 p-3",
          sidebarCollapsed ? "px-2" : ""
        )}>
          <div className={cn(
            "flex items-center gap-3 rounded-xl p-2",
            "hover:bg-white/5 transition-all duration-300",
            sidebarCollapsed && "justify-center p-1"
          )}>
            {/* Premium Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-electric flex items-center justify-center text-white font-semibold text-sm shadow-glow-sm">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </div>
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-neon-teal rounded-full border-2 border-[#0a0a19]" />
            </div>

            {/* User Info */}
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-fade-in">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                  <User size={10} />
                  {user.role || "Usuario"}
                </p>
              </div>
            )}

            {/* Logout Button */}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className={cn(
                  "p-2 rounded-lg text-muted-foreground",
                  "hover:text-danger hover:bg-danger/10",
                  "transition-all duration-200"
                )}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════
          MAIN CONTENT AREA
          ═══════════════════════════════════════════════════════════ */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* ── Top Bar ── */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 lg:px-6 glass-sidebar">
          {/* Spacer for mobile menu button */}
          <div className="lg:hidden w-10" />

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Nexus
            </span>
            <ChevronRight size={14} className="text-muted-foreground/50" />
            <span className="text-foreground font-medium">{pageTitle}</span>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            {/* Search Field */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-electric-500/30 transition-all duration-300 focus-within:border-electric-500/50 focus-within:shadow-glow-sm">
              <SearchIcon size={14} className="text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-40 lg:w-56 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                aria-label="Buscar en el dashboard"
              />
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-[10px] text-muted-foreground font-mono">
                ⌘K
              </kbd>
            </div>

            {/* Notifications */}
            <button
              className={cn(
                "relative p-2.5 rounded-xl border border-white/10",
                "text-muted-foreground hover:text-foreground hover:border-electric-500/30 hover:bg-white/5",
                "transition-all duration-300"
              )}
              aria-label={NOTIFICATION_COUNT > 0 ? `${NOTIFICATION_COUNT} notificaciones pendientes` : "Sin notificaciones"}
            >
              <Bell size={18} />
              {NOTIFICATION_COUNT > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center">
                  <span className="absolute inline-flex h-4 w-4 rounded-full bg-danger opacity-75 animate-ping" />
                  <Badge
                    variant="danger"
                    size="sm"
                    className="relative h-4 w-4 p-0 flex items-center justify-center text-[9px] font-bold"
                  >
                    {NOTIFICATION_COUNT}
                  </Badge>
                </span>
              )}
            </button>

            {/* User Avatar (mobile) */}
            <div className="lg:hidden w-8 h-8 rounded-lg bg-gradient-electric flex items-center justify-center text-white font-semibold text-xs">
              {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in-up">
          {children}
        </div>
      </main>
    </div>
  );
}
