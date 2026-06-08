// src/contexts/AuthContext.jsx - VERSION ULTIME
// Support complet: localhost, IP réseau (192.168.x.x), production (Render)
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { updateApiBaseUrl } from '../services/api';
import ENV_CONFIG from '../config/env';

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
  const [backendStatus, setBackendStatus] = useState('checking'); // checking, online, offline

  // ✅ Vérifier la connexion au backend
  const checkBackendConnection = useCallback(async () => {
    try {
      updateApiBaseUrl();
      const backendUrl = api.defaults.baseURL;
      console.log('[AuthContext] 🔍 Vérification backend:', backendUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('[AuthContext] ✅ Backend accessible');
        setBackendStatus('online');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      console.warn('[AuthContext] ❌ Backend inaccessible:', err.message);
      setBackendStatus('offline');
      return false;
    }
  }, []);

  // ✅ Rafraîchir le token avec mise à jour dynamique de l'URL
  const refreshToken = useCallback(async () => {
    try {
      // Forcer la mise à jour de l'URL avant l'appel
      updateApiBaseUrl();
      
      console.log('[AuthContext] 🔄 Rafraîchissement token vers:', api.defaults.baseURL);
      const response = await api.get('/api/auth/me');
      
      if (response && response.data) {
        const refreshedUser = {
          ...response.data,
          token: localStorage.getItem('userToken') || localStorage.getItem('token')
        };
        setUser(refreshedUser);
        localStorage.setItem('userInfo', JSON.stringify(refreshedUser));
        localStorage.setItem('userData', JSON.stringify(refreshedUser));
        console.log('[AuthContext] ✅ Token rafraîchi avec succès');
        return true;
      }
    } catch (err) {
      console.warn('[AuthContext] ⚠️ Rafraîchissement token échoué:', err.message);
      
      // Si erreur réseau, essayer de récupérer l'IP via network-info
      if (err.message === 'Network Error') {
        try {
          const currentHostname = window.location.hostname;
          const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(currentHostname);
          
          if (isLocalNetwork) {
            const networkInfoUrl = `http://${currentHostname}:5000/api/network-info`;
            console.log('[AuthContext] 🔍 Tentative de récupération network-info:', networkInfoUrl);
            
            const netRes = await fetch(networkInfoUrl);
            if (netRes.ok) {
              const netData = await netRes.json();
              if (netData.recommended?.backend) {
                console.log('[AuthContext] ✅ Backend détecté:', netData.recommended.backend);
                api.defaults.baseURL = netData.recommended.backend;
                localStorage.setItem('customBackendUrl', netData.recommended.backend);
                
                // Réessayer une fois
                const retryResponse = await api.get('/api/auth/me');
                if (retryResponse && retryResponse.data) {
                  const refreshedUser = {
                    ...retryResponse.data,
                    token: localStorage.getItem('userToken')
                  };
                  setUser(refreshedUser);
                  localStorage.setItem('userInfo', JSON.stringify(refreshedUser));
                  return true;
                }
              }
            }
          }
        } catch (e) {
          console.warn('[AuthContext] ⚠️ Récupération network-info échouée:', e.message);
        }
      }
      
      return false;
    }
  }, []);

  // ✅ Charger la session au démarrage
  useEffect(() => {
    const initAuth = async () => {
      // Mettre à jour l'URL avant tout
      updateApiBaseUrl();
      
      // Vérifier la connexion backend
      await checkBackendConnection();
      
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const stored = localStorage.getItem('userInfo') || localStorage.getItem('userData');

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔐 AuthContext - Chargement initial:');
      console.log(`   🌍 Environnement: ${ENV_CONFIG.environment}`);
      console.log(`   🖥️  Hostname: ${ENV_CONFIG.currentHostname}`);
      console.log(`   🔗 Backend URL: ${api.defaults.baseURL}`);
      console.log(`   🔑 Token présent: ${!!token}`);
      console.log(`   👤 UserInfo présent: ${!!stored}`);
      console.log('═══════════════════════════════════════════════════════════');

      if (token && stored) {
        try {
          const parsed = JSON.parse(stored);
          const userWithToken = { ...parsed, token };
          setUser(userWithToken);
          console.log(`   ✅ Utilisateur chargé: ${parsed.email} | Rôle: ${parsed.role}`);
          
          // Rafraîchir le token en arrière-plan
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
    };

    initAuth();
  }, [refreshToken, checkBackendConnection]);

  // ✅ Écouter les changements de localStorage (déconnexion multi-onglets)
  useEffect(() => {
    const syncAuth = (event) => {
      if (event.key === 'userToken' || event.key === 'token' || 
          event.key === 'userInfo' || event.key === 'userData') {
        console.log('[AuthContext] 🔄 Sync Auth - Changement détecté:', event.key);
        
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

  // ✅ Intercepter les 401 pour déconnecter automatiquement
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (err) => {
        const isAuthRequest = err.config?.url?.includes('/api/auth/');
        
        if (err.response?.status === 401 && !isAuthRequest) {
          console.warn('[AuthContext] 🔐 Token invalide ou expiré → déconnexion auto');
          if (user) {
            logout();
          }
        }
        return Promise.reject(err);
      }
    );
    
    return () => api.interceptors.response.eject(interceptor);
  }, [user]);

  // ✅ Login avec détection automatique de l'environnement
  const login = useCallback(async (userData, token) => {
    console.log('[AuthContext] 🔐 Tentative de login:', userData.email || userData.username);
    
    // Mettre à jour l'URL avant le login
    updateApiBaseUrl();
    console.log('[AuthContext] 📡 Backend cible:', api.defaults.baseURL);
    
    const userId = userData._id || userData.id;
    
    const userInfo = {
      _id: userId,
      id: userId,
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
    
    // ✅ Stocker l'URL backend utilisée pour cette session
    const currentBackendUrl = api.defaults.baseURL;
    if (currentBackendUrl && !currentBackendUrl.includes('localhost')) {
      localStorage.setItem('customBackendUrl', currentBackendUrl);
    }
    
    localStorage.setItem('userToken', authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
    localStorage.setItem('userData', JSON.stringify(userInfo));
    
    setUser({ ...userInfo, token: authToken });
    setError(null);
    
    console.log('[AuthContext] ✅ Login réussi - Rôle:', userInfo.role);
    console.log('[AuthContext] 📍 Backend utilisé:', currentBackendUrl);
    
    return userInfo;
  }, []);

  // ✅ Logout avec nettoyage complet
  const logout = useCallback(() => {
    console.log('[AuthContext] 🔐 Déconnexion');
    
    try {
      api.post('/api/auth/logout').catch(() => {});
    } catch (err) {
      // Ignorer
    }
    
    // ✅ Ne pas supprimer customBackendUrl pour garder la configuration
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userData');
    
    setUser(null);
    setError(null);
    
    // Rediriger vers login
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }, []);

  // ✅ Vérifier les rôles
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const userRole = user.role;
    return Array.isArray(roles) ? roles.includes(userRole) : userRole === roles;
  }, [user]);

  const hasAnyRole = useCallback((...roles) => {
    if (!user) return false;
    const userRole = user.role;
    return roles.flat().includes(userRole);
  }, [user]);

  // ✅ Mettre à jour l'utilisateur
  const updateUser = useCallback((updatedData) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    
    const storedInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    localStorage.setItem('userInfo', JSON.stringify({ ...storedInfo, ...updatedData }));
    localStorage.setItem('userData', JSON.stringify({ ...storedInfo, ...updatedData }));
  }, [user]);

  // ✅ Vérifier le token
  const verifyToken = useCallback(async () => {
    if (!user?.token) return false;
    try {
      updateApiBaseUrl();
      const response = await api.get('/api/auth/me');
      return !!response?.data;
    } catch (err) {
      console.warn('[AuthContext] Token verification failed:', err.message);
      return false;
    }
  }, [user?.token]);

  // ✅ Récupérer le token
  const getToken = useCallback(() => {
    return user?.token 
      || localStorage.getItem('userToken') 
      || localStorage.getItem('token')
      || localStorage.getItem('authToken');
  }, [user]);

  // ✅ Helpers de rôles
  const isAuthenticated = !!user && !!getToken();
  const isTeacher = hasRole(['ENSEIGNANT', 'ADMIN_DELEGUE', 'ADMIN_SYSTEME']);
  const isStudent = hasRole('APPRENANT');
  const isAdmin = hasRole(['ADMIN_SYSTEME', 'ADMIN_DELEGUE']);
  const isOperator = hasRole('OPERATEUR_EVALUATION');
  const isSaisisseur = hasRole('SAISISEUR');

  const value = {
    // État
    user,
    loading,
    error,
    backendStatus,
    
    // Actions
    login,
    logout,
    updateUser,
    verifyToken,
    refreshToken,
    checkBackendConnection,
    
    // Vérifications
    hasRole,
    hasAnyRole,
    isAuthenticated,
    isTeacher,
    isStudent,
    isAdmin,
    isOperator,
    isSaisisseur,
    
    // Helpers
    getUser: () => user,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ✅ Hook pour routes protégées
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

// ✅ Hook pour les rôles
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