"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth, UserRole } from "@/context/AuthContext";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    roles: ["owner", "employee"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/turnos",
    label: "Turnos",
    roles: ["owner", "employee"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    href: "/ordenes",
    label: "Órdenes",
    roles: ["owner", "employee"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Directorio",
    roles: ["owner", "employee"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4a2 2 0 11-4 0 2 2 0 014 0zM5 16a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
  },
  {
    href: "/finanzas",
    label: "Finanzas",
    roles: ["owner"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    href: "/equipo",
    label: "Equipo",
    roles: ["owner"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H6a4 4 0 01-4-4v-1m16-5a3 3 0 11-6 0 3 3 0 016 0zM9 10a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/sesiones",
    label: "Sesiones",
    roles: ["owner", "superadmin"] as UserRole[],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
];

const ROLE_LABEL: Record<UserRole, string> = {
  owner: "Dueño / Admin",
  employee: "Empleado",
  superadmin: "Super Admin",
};

const ROLE_COLOR: Record<UserRole, string> = {
  owner: "border border-amber-500/30 bg-amber-500/12 text-amber-200",
  employee: "border border-sky-500/30 bg-sky-500/12 text-sky-200",
  superadmin: "border border-violet-500/30 bg-violet-500/12 text-violet-200",
};

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <nav className="panel-shell sticky top-0 hidden h-screen w-full flex-col border-r border-white/10 bg-transparent p-4 md:flex md:w-72">
      <Link
        href="/"
        className="mb-6 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-2xl font-bold tracking-tight text-white transition-opacity hover:opacity-90"
      >
        <span data-display="true">81</span>
        <span className="text-amber-400">cc</span>
        <p className="mt-2 text-xs font-medium tracking-[0.24em] text-slate-400 uppercase">Cockpit operativo</p>
      </Link>

      <div className="mb-5 rounded-2xl border border-white/8 bg-white/4 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Taller activo</p>
        <p className="mt-2 text-sm font-semibold text-slate-100">{user?.tenantId ? "Espacio operativo conectado" : "Cuenta lista"}</p>
        <p className="mt-1 text-xs text-slate-400">Turnos, órdenes, clientes y caja en una sola consola.</p>
      </div>

      <div className="flex-1 space-y-1.5 font-medium">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl p-3 text-sm transition-all ${
                isActive
                  ? "border border-amber-500/30 bg-amber-500/12 font-semibold text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.10)]"
                  : "border border-transparent text-slate-400 hover:border-white/8 hover:bg-white/4 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/8 pt-4">
        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-slate-950 shadow-lg shadow-amber-900/30">
            {user?.avatar ?? "?"}
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <div className="truncate font-semibold text-white">{user?.name}</div>
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-bold ${user ? ROLE_COLOR[user.role] : ""}`}
            >
              {user ? ROLE_LABEL[user.role] : ""}
            </span>
          </div>
        </div>
        <button
          id="logout-btn"
          onClick={handleLogout}
          className="group flex w-full items-center gap-2 rounded-2xl border border-white/8 p-3 text-sm font-medium text-slate-400 transition-colors hover:border-red-500/25 hover:bg-red-500/10 hover:text-red-200"
        >
          <svg className="h-4 w-4 transition-colors group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const mobileItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role)).slice(0, 4);

  return (
    <nav className="panel-shell fixed bottom-0 z-50 flex w-full justify-around border-t border-white/10 bg-slate-950/90 p-2 pb-safe backdrop-blur md:hidden">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center p-2 transition-colors ${
              isActive ? "text-amber-300" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            {item.icon}
            <span className={`mt-1 text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>
              {item.label.split(" ")[0]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isReady, user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isSuperAdminPage = pathname.startsWith("/superadmin");
  const isLabPage = pathname.startsWith("/laboratorio");
  const isRegisterPage = pathname.startsWith("/registro");
  const isTeamInvitePage = pathname.startsWith("/registro-equipo");
  const isPortalPage = pathname.startsWith("/portal");

  useEffect(() => {
    if (!isReady) return;

    if (isPortalPage || isRegisterPage || isTeamInvitePage) {
      return;
    }

    if (!isAuthenticated && !isLoginPage) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isLoginPage) {
      router.replace(user?.role === "superadmin" ? "/superadmin" : "/");
      return;
    }

    if (isAuthenticated && user?.role === "superadmin" && !isSuperAdminPage && !isLabPage) {
      router.replace("/superadmin");
    }
  }, [isAuthenticated, isLabPage, isLoginPage, isPortalPage, isReady, isRegisterPage, isSuperAdminPage, isTeamInvitePage, router, user]);

  if (!isReady) {
    return <div className="min-h-full bg-background" />;
  }

  if (isLoginPage || isSuperAdminPage || isLabPage || isRegisterPage || isPortalPage || isTeamInvitePage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return <div className="min-h-full bg-background" />;
  }

  return (
    <div className="min-h-full bg-background text-foreground md:flex">
      <Sidebar />
      <main className="h-screen flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}
