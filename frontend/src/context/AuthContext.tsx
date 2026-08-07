import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/hms';
import { loginApi, fetchCurrentUser } from '../services/api';

export function getDefaultRouteForRole(role?: string): string {
  if (!role) return '/login';
  const r = role.toLowerCase().replace('userrole.', '').trim();
  switch (r) {
    case 'super_admin':
    case 'superadmin':
    case 'admin':
    case 'administrator':
      return '/super-admin/dashboard';
    case 'nurse':
      return '/nurse/dashboard';
    case 'store':
    case 'store_manager':
    case 'store manager':
    case 'store_manager_role':
      return '/store/dashboard';
    case 'pharmacy':
    case 'pharmacist':
      return '/pharmacy/dashboard';
    case 'doctor':
      return '/doctor/dashboard';
    case 'lab':
    case 'lab_technician':
    case 'lab technician':
      return '/lab/dashboard';
    case 'patient':
      return '/patient/dashboard';
    case 'reception':
    case 'receptionist':
      return '/reception/dashboard';
    default:
      return '/login';
  }
}


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; redirectPath?: string; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hms_user');
    const token = localStorage.getItem('hms_token');
    if (!token || !saved) return null;
    try {
      return JSON.parse(saved);
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
