// config/jwt.js
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// Configuration JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'secret_key_par_defaut',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  refreshExpiresIn: '7d'
};

// Génère un token JWT
export const generateToken = (payload) => {
  return jwt.sign(
    payload,
    JWT_CONFIG.secret,
    { expiresIn: JWT_CONFIG.expiresIn }
  );
};

// Génère un refresh token
export const generateRefreshToken = (payload) => {
  return jwt.sign(
    payload,
    JWT_CONFIG.secret + '_REFRESH', // Secret différent
    { expiresIn: JWT_CONFIG.refreshExpiresIn }
  );
};

// Vérifie un token JWT
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_CONFIG.secret);
  } catch (error) {
    throw new Error(
      error.name === 'TokenExpiredError' 
        ? 'Token expiré' 
        : 'Token invalide'
    );
  }
};

// Middleware d'authentification JWT
export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

// Rafraîchit un token expiré
export const refreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken, 
      JWT_CONFIG.secret + '_REFRESH'
    );
    
    return generateToken({
      userId: decoded.userId,
      role: decoded.role
    });

  } catch (error) {
    throw new Error('Refresh token invalide');
  }
};

// Décode un token sans vérification (pour usage limité)
export const decodeToken = (token) => {
  return jwt.decode(token);
};