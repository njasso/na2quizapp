// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vérifier et rafraîchir le token (optionnel)
  const refreshToken = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      if (response && response.data) {
        const refreshedUser = {
          ...response.data,
          token: localStorage.getItem('userToken')
        };
        setUser(refreshedUser);
        localStorage.setItem('userInfo', JSON.stringify(refreshedUser));
        return true;
      }
    } catch (err) {
      console.warn('⚠️ Rafraîchissement token échoué:', err.message);
      return false;
    }
  }, []);

  // Charger la session au démarrage
  useEffect(() => {
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');
    const stored = localStorage.getItem('userInfo') || localStorage.getItem('userData');

    console.log('🔐 AuthContext - Chargement initial:');
    console.log('   Token présent:', !!token);
    console.log('   UserInfo présent:', !!stored);

    if (token && stored) {
      try {
        const parsed = JSON.parse(stored);
        // S'assurer que le token est bien stocké
        const userWithToken = { ...parsed, token };
        setUser(userWithToken);
        console.log('   ✅ Utilisateur chargé:', parsed.email, 'Rôle:', parsed.role);
        
        // Optionnel: vérifier que le token est toujours valide
        refreshToken().catch(() => {
          console.warn('⚠️ Token invalide ou expiré');
        });
      } catch (e) {
        console.error('   ❌ Erreur parsing userInfo:', e);
        localStorage.removeItem('userToken');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        localStorage.removeItem('userData');
      }
    } else {
      console.log('   ℹ️ Aucune session trouvée');
    }
    setLoading(false);
  }, [refreshToken]);

  // Écouter les changements de localStorage (déconnexion multi-onglets)
  useEffect(() => {
    const syncAuth = (event) => {
      // Vérifier si c'est un changement concernant l'authentification
      if (event.key === 'userToken' || event.key === 'token' || 
          event.key === 'userInfo' || event.key === 'userData') {
        console.log('🔐 Sync Auth - Changement détecté:', event.key);
        
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const stored = localStorage.getItem('userInfo') || localStorage.getItem('userData');
        
        if (token && stored) {
          try {
            setUser({ ...JSON.parse(stored), token });
          } catch (err) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };
    
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  // Intercepter les 401 pour déconnecter automatiquement
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (err) => {
        // Ne pas déconnecter pour les requêtes d'authentification
        const isAuthRequest = err.config?.url?.includes('/api/auth/');
        
        if (err.response?.status === 401 && !isAuthRequest) {
          console.warn('🔐 Token invalide ou expiré → déconnexion auto');
          // Éviter les boucles infinies
          if (user) {
            logout();
          }
        }
        return Promise.reject(err);
      }
    );
    
    return () => api.interceptors.response.eject(interceptor);
  }, [user]); // Dépendance user pour éviter les déconnexions en boucle

  const login = useCallback((userData, token) => {
    console.log('🔐 AuthContext - Login:', userData.email || userData.username);
    
    // Support des deux formats de données
    const userInfo = {
      id: userData._id || userData.id,
      email: userData.email,
      username: userData.username,
      name: userData.name,
      role: userData.role,
      matricule: userData.matricule,
      level: userData.level,
      grade: userData.grade,
      isAdmin: userData.isAdmin
    };
    
    const authToken = token || userData.token;
    
    // Stockage dans les deux formats pour compatibilité
    localStorage.setItem('userToken', authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('userData', JSON.stringify(userInfo));
    
    setUser({ ...userInfo, token: authToken });
    setError(null);
    
    return userInfo;
  }, []);

  const logout = useCallback(() => {
    console.log('🔐 AuthContext - Logout');
    
    // Appeler l'API de déconnexion si nécessaire
    try {
      api.post('/api/auth/logout').catch(() => {});
    } catch (err) {
      // Ignorer les erreurs
    }
    
    // Nettoyer le localStorage (tous les formats)
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userData');
    
    setUser(null);
    setError(null);
    
    // Optionnel: redirection vers login
    // if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
    //   window.location.href = '/login';
    // }
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const userRole = user.role;
    return Array.isArray(roles) ? roles.includes(userRole) : userRole === roles;
  }, [user]);

  const isAuthenticated = !!user && !!(localStorage.getItem('userToken') || localStorage.getItem('token'));
  
  const isTeacher = hasRole(['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME', 'OPERATEUR_EVALUATION']);
  const isStudent = hasRole('APPRENANT');
  const isAdmin = hasRole(['ADMIN_SYSTEME', 'ADMIN_DELEGUE']);

  // Mettre à jour les infos utilisateur (après modification du profil)
  const updateUser = useCallback((updatedData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    
    const storedInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    localStorage.setItem('userInfo', JSON.stringify({ ...storedInfo, ...updatedData }));
    localStorage.setItem('userData', JSON.stringify({ ...storedInfo, ...updatedData }));
  }, [user]);

  // Vérifier la validité du token
  const verifyToken = useCallback(async () => {
    if (!user?.token) return false;
    try {
      const response = await api.get('/api/auth/me');
      return !!response?.data;
    } catch (err) {
      console.warn('Token verification failed:', err.message);
      return false;
    }
  }, [user?.token]);

  const value = {
    // État
    user,
    loading,
    error,
    
    // Actions
    login,
    logout,
    updateUser,
    verifyToken,
    refreshToken,
    
    // Vérifications
    hasRole,
    isAuthenticated,
    isTeacher,
    isStudent,
    isAdmin,
    
    // Helpers
    getUser: () => user,
    getToken: () => user?.token || localStorage.getItem('userToken') || localStorage.getItem('token'),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personnalisé avec vérification d'authentification (pour routes protégées)
export const useRequireAuth = (redirectTo = '/login') => {
  const { isAuthenticated, loading } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setShouldRedirect(true);
    }
  }, [loading, isAuthenticated]);
  
  return { isAuthenticated, loading, shouldRedirect, redirectTo };
};

// Hook pour les rôles
export const useRequireRole = (allowedRoles, redirectTo = '/unauthorized') => {
  const { user, loading, hasRole } = useAuth();
  const [isAllowed, setIsAllowed] = useState(false);
  
  useEffect(() => {
    if (!loading && user) {
      setIsAllowed(hasRole(allowedRoles));
    } else if (!loading && !user) {
      setIsAllowed(false);
    }
  }, [loading, user, allowedRoles, hasRole]);
  
  return { isAllowed, loading, redirectTo };
};

export default AuthProvider;