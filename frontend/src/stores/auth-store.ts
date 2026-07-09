import { create } from "zustand";
import { api } from "@/lib/api-client";
import type { User, TokenResponse } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, companyName: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const data = await api.post<TokenResponse>("/api/v1/auth/login", { email, password });
    api.setToken(data.access_token);
    const user = await api.get<User>("/api/v1/auth/me");
    set({ user, isAuthenticated: true });
  },

  register: async (email: string, password: string, fullName: string, companyName: string) => {
    const data = await api.post<TokenResponse>("/api/v1/auth/register", {
      email,
      password,
      full_name: fullName,
      company_name: companyName,
    });
    api.setToken(data.access_token);
    const user = await api.get<User>("/api/v1/auth/me");
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    api.setToken(null);
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      const token = api.getToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const user = await api.get<User>("/api/v1/auth/me");
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
