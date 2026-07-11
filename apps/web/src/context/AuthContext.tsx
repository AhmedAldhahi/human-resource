import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { UserResponseDto } from '@hrms/shared';
import { authApi, usersApi } from '../api/client';

interface AuthContextType {
  user: UserResponseDto | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check localStorage for existing session
  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem('hrms_token');
      const storedUser = localStorage.getItem('hrms_user');

      if (storedToken) {
        setToken(storedToken);
        try {
          const freshUser = await usersApi.getMe();
          setUser(freshUser);
          localStorage.setItem('hrms_user', JSON.stringify(freshUser));
        } catch {
          // Token invalid — clear everything
          localStorage.removeItem('hrms_token');
          localStorage.removeItem('hrms_user');
          setToken(null);
          setUser(null);
        }
      } else if (storedUser) {
        // Edge case cleanup
        localStorage.removeItem('hrms_user');
      }

      setLoading(false);
    };

    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('hrms_token', response.accessToken);
    localStorage.setItem('hrms_user', JSON.stringify(response.user));
    setToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hrms_token');
    localStorage.removeItem('hrms_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
