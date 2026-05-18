import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  fetchCurrentUser,
  getAuthToken,
  getAuthUser,
  isAuthSessionIdleExpired,
  loginUser,
  logoutUser,
  saveAuthSession,
  touchAuthSession,
} from "../services/api.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState(() => getAuthUser());
  const [isInitializing, setIsInitializing] = useState(true);

  const login = useCallback(async (credentials) => {
    const session = await loginUser(credentials);

    setToken(session.token);
    setUser(session.user);

    return session;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      if (!getAuthToken()) {
        setIsInitializing(false);
        return;
      }

      try {
        const currentUser = await fetchCurrentUser();

        if (isMounted) {
          setToken(getAuthToken());
          setUser(currentUser);
          saveAuthSession({ token: getAuthToken(), user: currentUser });
        }
      } catch (_error) {
        clearAuthSession();

        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function expireSession() {
      clearAuthSession();
      setToken(null);
      setUser(null);
    }

    function handleUserActivity() {
      touchAuthSession();
    }

    const activityEvents = ["click", "keydown", "mousemove", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleUserActivity, { passive: true }));
    window.addEventListener("goalverse:auth-expired", expireSession);
    const intervalId = window.setInterval(() => {
      if (isAuthSessionIdleExpired()) {
        expireSession();
      }
    }, 30_000);

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleUserActivity));
      window.removeEventListener("goalverse:auth-expired", expireSession);
      window.clearInterval(intervalId);
    };
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isInitializing,
      login,
      logout,
    }),
    [isInitializing, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
