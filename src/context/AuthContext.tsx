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
import { setAccessTokenMemory } from "../auth/accessTokenStore";
import { setUserIdMemory } from "../auth/userIdStore";
import { User, VerifyOtpResponse } from "../types/auth";
import { verifyOtp } from "../services/auth";
import { disconnectChatSocket, reconnectChatSocketWithToken } from "../services/chatSocket";
import {
  disconnectCallSocket,
  reconnectCallSocketWithToken,
  syncCallSocketWithAuth,
} from "../services/callSocket";

/* ─── Storage keys ────────────────────────────────────────── */
const STORAGE_KEYS = {
  USER: "@unichat/user",
  IS_AUTHENTICATED: "@unichat/is_authenticated",
  ACCESS_TOKEN: "@unichat/access_token",
} as const;

/* ─── Context shape ───────────────────────────────────────── */
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  /**
   * Verify OTP and store the user in memory (not yet authenticated).
   * The caller should navigate to ProfileSetup afterwards.
   */
  loginWithOtp: (
    phoneNumber: string,
    otpCode: string,
  ) => Promise<VerifyOtpResponse>;

  /**
   * Finalize authentication after profile completion.
   * Persists the user and sets isAuthenticated = true,
   * which causes the navigator to switch to the home stack.
   */
  completeAuthentication: (user: User, accessToken?: string | null) => Promise<void>;

  /** Update the stored user (e.g. after profile edits). */
  updateUser: (patch: Partial<User>) => Promise<void>;

  /** Clear persisted session and sign the user out. */
  logout: () => Promise<void>;

  /** JWT for API and Socket.IO; null before OTP verify or after logout. */
  accessToken: string | null;

  /**
   * Persist a refreshed JWT, update REST headers, and reconnect Socket.IO with `auth.token`.
   */
  updateAccessToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ─── Provider ────────────────────────────────────────────── */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
          if (storedToken) {
            setAccessToken(storedToken);
            setAccessTokenMemory(storedToken);
          }
        }
      } catch (err) {
        console.warn("Failed to restore auth session:", err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setUserIdMemory(user?.id ?? null);
  }, [user?.id]);

  useEffect(() => {
    syncCallSocketWithAuth(isAuthenticated, accessToken);
  }, [isAuthenticated, accessToken]);

  const loginWithOtp = useCallback(
    async (
      phoneNumber: string,
      otpCode: string,
    ): Promise<VerifyOtpResponse> => {
      const response = await verifyOtp(phoneNumber, otpCode);

      // Store user in memory so ProfileSetupScreen can read their data,
      // but do NOT set isAuthenticated — that happens after the user
      // reviews their profile and proceeds.
      setUser(response.user);
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setAccessTokenMemory(response.accessToken);
      }

      return response;
    },
    [],
  );

  const completeAuthentication = useCallback(
    async (completedUser: User, nextAccessToken?: string | null) => {
      const tokenToStore =
        nextAccessToken !== undefined && nextAccessToken !== null
          ? nextAccessToken
          : accessToken;

      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify(completedUser),
        );
        await AsyncStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, "true");
        if (tokenToStore) {
          await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenToStore);
        }
      } catch (err) {
        console.warn("Failed to persist auth session:", err);
      }

      setUser(completedUser);
      if (tokenToStore) {
        setAccessToken(tokenToStore);
        setAccessTokenMemory(tokenToStore);
      }
      setIsAuthenticated(true);
    },
    [accessToken],
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
    disconnectChatSocket();
    disconnectCallSocket();
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER,
        STORAGE_KEYS.IS_AUTHENTICATED,
        STORAGE_KEYS.ACCESS_TOKEN,
      ]);
    } catch (err) {
      console.warn("Failed to clear auth session:", err);
    } finally {
      setAccessToken(null);
      setAccessTokenMemory(null);
      setUserIdMemory(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const updateAccessToken = useCallback(async (token: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    } catch (err) {
      console.warn("Failed to persist access token:", err);
    }
    setAccessToken(token);
    setAccessTokenMemory(token);
    reconnectChatSocketWithToken(token);
    reconnectCallSocketWithToken(token);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      loginWithOtp,
      completeAuthentication,
      updateUser,
      logout,
      accessToken,
      updateAccessToken,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      loginWithOtp,
      completeAuthentication,
      updateUser,
      logout,
      accessToken,
      updateAccessToken,
    ],
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
