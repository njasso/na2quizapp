// src/components/QCMBankInfo.jsx
import React from 'react';
import { Database, CheckCircle, Clock, XCircle, Info } from 'lucide-react';

const QCMBankInfo = () => {
  return (
    <div style={{
      background: 'rgba(15,23,42,0.7)',
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      border: '1px solid rgba(99,102,241,0.2)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Database size={24} color="#6366f1" />
        <h3 style={{ color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>📚 Banque des QCM</h3>
      </div>
      
      <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: 16 }}>
        Les questions créées sont stockées dans la <strong style={{ color: '#10b981' }}>Banque des QCM</strong> et disposent de deux statuts :
      </p>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Clock size={16} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.8rem' }}>En attente de Validation</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.7rem', lineHeight: 1.4 }}>
            La question est en attente d'examen par le Comité Pédagogique et Scientifique (CPS).
            Elle ne peut pas encore être utilisée dans une épreuve.
          </p>
        </div>
        
        <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: 12, border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <CheckCircle size={16} color="#10b981" />
            <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.8rem' }}>Validée</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.7rem', lineHeight: 1.4 }}>
            La question a été approuvée par le CPS. Elle est désormais éligible à l'insertion dans une épreuve.
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.05)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)' }}>
        <p style={{ color: '#a5b4fc', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={12} />
          <span>ℹ️ Seules les questions <strong style={{ color: '#10b981' }}>Validées</strong> peuvent être utilisées pour composer des épreuves.</span>
        </p>
      </div>
    </div>
  );
};

export default QCMBankInfo;