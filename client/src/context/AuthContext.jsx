import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('placement_auth_token'));
  const [loading, setLoading] = useState(true);

  // Load user profile on app load if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await api.auth.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to load authenticated user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password, role) => {
    const res = await api.auth.login({ email, password, role });
    if (res.success && res.token) {
      localStorage.setItem('placement_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (studentData) => {
    const res = await api.auth.register(studentData);
    if (res.success && res.token) {
      localStorage.setItem('placement_auth_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const updateProfile = async (profileData) => {
    const res = await api.auth.updateProfile(profileData);
    if (res.success && res.user) {
      setUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Profile update failed');
  };

  const logout = () => {
    localStorage.removeItem('placement_auth_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isOfficer: user?.role === 'officer',
    isStudent: user?.role === 'student',
    login,
    register,
    updateProfile,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
