import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/hms';
import { loginApi, fetchCurrentUser } from '../services/api';

export function getDefaultRouteForRole(role?: string, name?: string): string {
  const r = (role || '').toLowerCase().replace('userrole.', '').replace(/\s+/g, '_').trim();
  const n = (name || '').toLowerCase().trim();

  if (r.includes('billing') || r.includes('finance') || r.includes('cashier') || r.includes('accounts') || n.includes('billing') || n.includes('finance')) {
    return '/billing/dashboard';
  }
  if (r.includes('pharmacy') || r.includes('pharmacist') || n.includes('pharmacy')) {
    return '/pharmacy/dashboard';
  }
  if (r.includes('super') || r.includes('admin')) {
    return '/super-admin/dashboard';
  }
  if (r.includes('nurse')) {
    return '/nurse/dashboard';
  }
  if (r.includes('store')) {
    return '/store/dashboard';
  }
  if (r.includes('lab')) {
    return '/lab/dashboard';
  }
  if (r.includes('reception') || r.includes('cashier')) {
    return '/reception/dashboard';
  }
  if (r.includes('doctor') || r.includes('doc')) {
    return '/doctor/dashboard';
  }
  if (r.includes('patient')) {
    return '/patient/dashboard';
  }
  return '/login';
}


export interface LoginResult {
  success: boolean;
  role?: UserRole;
  redirectPath?: string;
  error?: string;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hms_user');
    const token = localStorage.getItem('hms_token');
    if (!token || !saved) return null;
    try {
      const parsed = JSON.parse(saved);
      return parsed;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('hms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hms_user');
    }
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('hms_token');
      if (token) {
        try {
          const currentUser = await fetchCurrentUser();
          setUser(currentUser);
        } catch (err) {
          console.warn('Saved token expired or invalid:', err);
          logout();
        }
      } else {
        setUser(null);
      }
    };
    checkAuth();

    const handleAuthChange = () => {
      const token = localStorage.getItem('hms_token');
      if (!token) {
        setUser(null);
      }
    };
    window.addEventListener('hms_auth_change', handleAuthChange);
    return () => window.removeEventListener('hms_auth_change', handleAuthChange);
  }, []);

  const login = async (emailInput: string, passInput: string) => {
    try {
      const apiRes = await loginApi(emailInput, passInput);
      if (apiRes && apiRes.user) {
        localStorage.setItem('hms_token', apiRes.access_token);
        setUser(apiRes.user);
        window.dispatchEvent(new Event('hms_auth_change'));
        const redirectPath = getDefaultRouteForRole(apiRes.user.role);
        return {
          success: true,
          role: apiRes.user.role as UserRole,
          redirectPath,
        };
      }
      return {
        success: false,
        error: 'Invalid response from backend server.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Invalid Email or Password. Please check your staff credentials.',
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hms_user');
    localStorage.removeItem('hms_token');
    window.dispatchEvent(new Event('hms_auth_change'));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    const savedUser = (() => {
      try {
        const saved = localStorage.getItem('hms_user');
        return saved ? JSON.parse(saved) : null;
      } catch {
        return null;
      }
    })();
    return {
      user: savedUser,
      isAuthenticated: !!savedUser,
      login: async () => ({ success: false, error: 'Auth context initializing...' }),
      logout: () => {
        localStorage.removeItem('hms_user');
        localStorage.removeItem('hms_token');
        window.dispatchEvent(new Event('hms_auth_change'));
      },
    };
  }
  return context;
};
