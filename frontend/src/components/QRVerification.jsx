// src/components/QRVerification.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const QRVerification = () => {
  const { hash } = useParams();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await api.get(`/api/verify/${hash}`);
        setVerification(response.data);
      } catch (error) {
        setVerification({ valid: false, message: 'Erreur de vérification' });
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, [hash]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50 }}>Vérification en cours...</div>;
  }

  if (!verification?.valid) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <XCircle size={64} color="#ef4444" />
        <h2>Bulletin invalide</h2>
        <p>Ce bulletin n'a pas été trouvé ou a été falsifié.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <CheckCircle size={64} color="#10b981" />
        <h1 style={{ color: '#10b981' }}>✓ Bulletin authentique</h1>
        <p>Ce document est officiel et certifié par NA²QUIZ</p>
      </div>
      
      <div style={{ background: '#f8fafc', borderRadius: 12, padding: 24 }}>
        <h3>Informations du bulletin</h3>
        <p><strong>Candidat:</strong> {verification.bulletin?.candidat}</p>
        <p><strong>Matricule:</strong> {verification.bulletin?.matricule}</p>
        <p><strong>Épreuve:</strong> {verification.bulletin?.epreuve}</p>
        <p><strong>Score:</strong> {verification.bulletin?.score} ({verification.bulletin?.pourcentage})</p>
        <p><strong>Statut:</strong> {verification.bulletin?.statut}</p>
        <p><strong>Note/20:</strong> {verification.bulletin?.note20}</p>
        <p><strong>Date:</strong> {new Date(verification.bulletin?.date).toLocaleDateString('fr-FR')}</p>
        <p><strong>Vérifié le:</strong> {new Date(verification.verifiedAt).toLocaleString('fr-FR')}</p>
      </div>
      
      <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.8rem', color: '#64748b' }}>
        <Shield size={16} style={{ display: 'inline', marginRight: 4 }} />
        Document certifié par NA²QUIZ - Système d'Évaluation Numérique
      </div>
    </div>
  );
};

export default QRVerification;