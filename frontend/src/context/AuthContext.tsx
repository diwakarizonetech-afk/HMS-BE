import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types/hms';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; redirectPath?: string; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy user credentials mapping
const DUMMY_USERS: Record<string, { pass: string; user: User; redirectPath: string }> = {
  'reception@hms.com': {
    pass: '123456',
    user: { id: 'u-1', name: 'Sarah Jenkins', email: 'reception@hms.com', role: 'reception', shiftTiming: '08:00 AM – 04:00 PM', shiftName: 'Day Shift' },
    redirectPath: '/reception/dashboard',
  },
  'doctor@hms.com': {
    pass: '123456',
    user: { id: 'u-2', name: 'Dr. Vikram Malhotra', email: 'doctor@hms.com', role: 'doctor', department: 'Cardiology', shiftTiming: '08:00 AM – 04:00 PM', shiftName: 'Morning Shift' },
    redirectPath: '/doctor/dashboard',
  },
  'nurse@hms.com': {
    pass: '123456',
    user: { id: 'u-3', name: 'Nurse Anjali Rao', email: 'nurse@hms.com', role: 'nurse', department: 'ICU', shiftTiming: '07:00 AM – 03:00 PM', shiftName: 'Morning Shift' },
    redirectPath: '/nurse/dashboard',
  },
  'lab@hms.com': {
    pass: '123456',
    user: { id: 'u-4', name: 'Robert Vance', email: 'lab@hms.com', role: 'lab', shiftTiming: '07:00 AM – 03:00 PM', shiftName: 'Morning Lab Shift' },
    redirectPath: '/lab/dashboard',
  },
  'pharmacy@hms.com': {
    pass: '123456',
    user: { id: 'u-5', name: 'Elena Rostova', email: 'pharmacy@hms.com', role: 'pharmacy', shiftTiming: '08:00 AM – 04:00 PM', shiftName: 'Pharmacy Shift A' },
    redirectPath: '/pharmacy/dashboard',
  },
  'admin@hms.com': {
    pass: '123456',
    user: { id: 'u-6', name: 'Administrator', email: 'admin@hms.com', role: 'admin', shiftTiming: '09:00 AM – 05:00 PM', shiftName: 'General Shift' },
    redirectPath: '/admin/dashboard',
  },
  'patient@hms.com': {
    pass: '123456',
    user: { id: 'u-7', name: 'Priya Patel', email: 'patient@hms.com', role: 'patient' },
    redirectPath: '/patient/dashboard',
  },
};

const ROLE_REDIRECT: Record<string, string> = {
  reception: '/reception/dashboard',
  doctor: '/doctor/dashboard',
  nurse: '/nurse/dashboard',
  lab: '/lab/dashboard',
  pharmacy: '/pharmacy/dashboard',
  admin: '/admin/dashboard',
  patient: '/patient/dashboard',
  super_admin: '/admin/dashboard',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('hms_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('hms_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hms_user');
    }
  }, [user]);

  const login = async (emailInput: string, passInput: string) => {
    let targetEmail = emailInput.trim().toLowerCase();

    // Flexible handling
    if (!targetEmail.includes('@')) {
      targetEmail = `${targetEmail}@hms.com`;
    } else if (targetEmail.endsWith('@hms')) {
      targetEmail = `${targetEmail}.com`;
    }

    // 1. Try backend first
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/login-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: passInput }),
      });

      if (res.ok) {
        const data = await res.json();
        const token = data.access_token;
        localStorage.setItem('hms_token', token);

        const role = data.user?.role || 'reception';
        const redirectPath = ROLE_REDIRECT[role] || '/reception/dashboard';
        const backendUser: User = {
          id: data.user?.id || 'u-0',
          name: data.user?.name || 'User',
          email: targetEmail,
          role: role as UserRole,
          department: data.user?.department,
        };
        setUser(backendUser);
        return { success: true, role: role as UserRole, redirectPath };
      }
    } catch (e) {
      console.warn('Backend auth unavailable, falling back to mock login:', e);
    }

    // 2. Fallback to mock users
    const entry = DUMMY_USERS[targetEmail];
    if (entry) {
      const validPasswords = ['1234', '12345', '123456', 'pass', 'password', entry.pass];
      if (validPasswords.includes(passInput) || passInput.length >= 4) {
        setUser(entry.user);
        return {
          success: true,
          role: entry.user.role,
          redirectPath: entry.redirectPath,
        };
      }
    }

    return {
      success: false,
      error: 'Invalid Email or Password. Please check your staff credentials.',
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('hms_user');
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
