"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchSession, getStoredStaffToken, loginWithCredentials, SessionUser, type TenantChoice } from "@/lib/auth-api";

export type UserRole = "owner" | "employee" | "superadmin";

export type AuthUser = SessionUser;

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<{ success: boolean; error?: string; requiresTenantSelection?: boolean; accounts?: TenantChoice[] }>;
  logout: () => void;
}

const TOKEN_KEY = "81cc_session_token";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hydrateSession = async () => {
      const storedToken = getStoredStaffToken();

      if (!storedToken) {
        setReady(true);
        return;
      }

      try {
        const session = await fetchSession(storedToken);
        setUser(session.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setReady(true);
      }
    };

    void hydrateSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    tenantId?: string,
  ): Promise<{ success: boolean; error?: string; requiresTenantSelection?: boolean; accounts?: TenantChoice[] }> => {
    try {
      const session = await loginWithCredentials(email, password, tenantId);
      if ("requiresTenantSelection" in session && session.requiresTenantSelection) {
        return {
          success: false,
          requiresTenantSelection: true,
          accounts: session.accounts,
        };
      }
      if ("user" in session && "token" in session) {
        setUser(session.user);
        localStorage.setItem(TOKEN_KEY, session.token);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "No se pudo iniciar sesion.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady: ready,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
