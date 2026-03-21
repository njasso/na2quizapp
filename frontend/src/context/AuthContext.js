// src/contexts/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';

// Création du contexte avec des valeurs par défaut
const AuthContext = createContext({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false
});

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    user: null,
    token: null,
    isAuthenticated: false
  });

  useEffect(() => {
    const initializeAuth = () => {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (token && user) {
        setAuthState({
          user,
          token,
          isAuthenticated: true
        });
      }
    };

    initializeAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setAuthState({
      user: userData,
      token,
      isAuthenticated: true
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false
    });
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé avec vérification de contexte
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  
  return context;
};