import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, VerifyOtpResponse } from "../types/auth";
import { verifyOtp } from "../services/auth";

/* ─── Storage keys ────────────────────────────────────────── */
const STORAGE_KEYS = {
  USER: "@unichat/user",
  IS_AUTHENTICATED: "@unichat/is_authenticated",
} as const;

/* ─── Context shape ───────────────────────────────────────── */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true while restoring session from storage

  /**
   * Call verifyOtp, persist the session, and return the response
   * so the caller can decide navigation (new vs returning user).
   */
  loginWithOtp: (
    phoneNumber: string,
    otpCode: string,
  ) => Promise<VerifyOtpResponse>;

  /** Update the stored user (e.g. after profile setup). */
  updateUser: (patch: Partial<User>) => Promise<void>;

  /** Clear persisted session and sign the user out. */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ─── Provider ────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        const storedAuth = await AsyncStorage.getItem(
          STORAGE_KEYS.IS_AUTHENTICATED,
        );
        if (storedAuth === "true" && storedUser) {
          setUser(JSON.parse(storedUser) as User);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const loginWithOtp = useCallback(
    async (
      phoneNumber: string,
      otpCode: string,
    ): Promise<VerifyOtpResponse> => {
      const response = await verifyOtp(phoneNumber, otpCode);

      try {
        // Persist to storage so session survives app restarts
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify(response.user),
        );
        await AsyncStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
      } catch (err) {
        // Do not block login flow if persistence fails on device
        console.warn("Failed to persist auth session:", err);
      }

      // Update in-memory state. The calling screen should navigate
      // BEFORE this triggers a re-render, so we defer the state
      // update to the next tick to avoid unmounting the current screen.
      setUser(response.user);
      setIsAuthenticated(true);

      return response;
    },
    [],
  );

  const updateUser = useCallback(async (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated)).catch(
        console.warn,
      );
      return updated;
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.IS_AUTHENTICATED,
      ]);
    } catch (err) {
      console.warn("Failed to clear auth session:", err);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      loginWithOtp,
      updateUser,
      logout,
    }),
    [user, isAuthenticated, isLoading, loginWithOtp, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Convenience hook — throws if used outside AuthProvider */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
