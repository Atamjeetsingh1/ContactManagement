import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user from token on app start
  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
      setIsAuthenticated(true);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const signup = async (name, email, password, role) => {
    const { data } = await authAPI.signup({ name, email, password, role });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    disconnectSocket();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateProfile = async (name) => {
    const { data } = await authAPI.updateProfile({ name });
    setUser(data.user);
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      signup,
      login,
      logout,
      updateProfile,
      loadUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;