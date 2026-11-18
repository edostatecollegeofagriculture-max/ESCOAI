import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, InstitutionSettings } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  settings: InstitutionSettings | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  devQuickLogin: (role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'INSTITUTION_ADMIN' | 'RECTOR' | 'REGISTRAR' | 'ADMISSIONS_OFFICER' | 'DEAN' | 'HOD' | 'LECTURER' | 'EXAM_OFFICER' | 'BURSAR' | 'CONTENT_EDITOR' | 'ICT_ADMIN' | 'SUPPORT_OFFICER' | 'STUDENT' | 'APPLICANT') => Promise<void>;
  registerApplicant: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success) {
        setSettings(res.settings);
      }
    } catch (e) {
      console.error('Failed to load institution settings', e);
    }
  };

  const refreshUserData = async () => {
    if (!api.getToken()) {
      setUser(null);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
      } else {
        api.setToken(null);
        setUser(null);
      }
    } catch {
      api.setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([refreshSettings(), refreshUserData()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
    }
  };

  const devQuickLogin = async (role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'INSTITUTION_ADMIN' | 'RECTOR' | 'REGISTRAR' | 'ADMISSIONS_OFFICER' | 'DEAN' | 'HOD' | 'LECTURER' | 'EXAM_OFFICER' | 'BURSAR' | 'CONTENT_EDITOR' | 'ICT_ADMIN' | 'SUPPORT_OFFICER' | 'STUDENT' | 'APPLICANT') => {
    const res = await api.devQuickLogin(role);
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
    }
  };

  const registerApplicant = async (data: { email: string; password: string; fullName: string; phone?: string }) => {
    const res = await api.registerApplicant(data);
    if (res.success && res.token) {
      api.setToken(res.token);
      setUser(res.user);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      if (api.getToken()) {
        await api.logout();
      }
    } catch (error) {
      // Local logout must still complete if the server is unavailable.
      console.warn('Server logout could not be confirmed.', error);
    } finally {
      api.setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        settings,
        isLoading,
        login,
        devQuickLogin,
        registerApplicant,
        logout,
        refreshUserData,
        refreshSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

