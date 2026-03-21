import React, { createContext, useContext, useState, useEffect } from 'react';

// Créer le contexte
export const AuthContext = createContext();

// Hook personnalisé pour accéder facilement au contexte
export const useAuth = () => useContext(AuthContext);

// Composant fournisseur du contexte
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // ex: { email, role }

  // Simuler une récupération utilisateur (à remplacer avec backend réel)
  useEffect(() => {
    const storedUser = localStorage.getItem('na2_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = ({ email, role }) => {
    const userData = { email, role };
    localStorage.setItem('na2_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('na2_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};