// src/components/NetworkInfo.jsx
// Affiche les URLs réseau disponibles + QR code pour connexion depuis d'autres machines
// Usage : <NetworkInfo /> dans votre page admin ou dashboard

import React, { useState, useEffect, useRef } from 'react';
import ENV_CONFIG from '../config/env';

// ─── Petite lib QR Code inline (pas de dépendance externe) ───────────────────
// Utilise l'API Google Charts ou une URL data: selon les préférences
// Pour éviter les dépendances, on utilise l'API qrserver.com
const QRCodeImg = ({ value, size = 150 }) => {
  if (!value) return null;
  const encoded = encodeURIComponent(value);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  return (
    <img
      src={src}
      alt={`QR Code pour ${value}`}
      width={size}
      height={size}
      style={{ borderRadius: 8, border: '4px solid #fff', boxShadow: '0 2px 12px rgba(0,0,0,0.18)' }}
    />
  );
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NetworkInfo({ compact = false }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    let mounted = true;
    ENV_CONFIG.fetchNetworkInfo().then((data) => {
      if (mounted) {
        setInfo(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  // ── Styles inline (pas de Tailwind requis) ──────────────────────────────────
  const s = {
    card: {
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: 16,
      padding: compact ? '16px 20px' : '24px 28px',
      color: '#f1f5f9',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      maxWidth: compact ? 420 : 620,
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      border: '1px solid rgba(99,102,241,0.3)',
    },
    title: {
      margin: '0 0 16px 0',
      fontSize: compact ? 15 : 18,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: '#a5b4fc',
    },
    row: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '10px 14px',
      marginBottom: 8,
      cursor: 'pointer',
      transition: 'background 0.15s',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    label: { fontSize: 11, color: '#94a3b8', minWidth: 80, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
    url: { fontSize: 13, fontFamily: 'monospace', color: '#67e8f9', flex: 1, wordBreak: 'break-all' },
    badge: {
      background: '#22c55e',
      color: '#fff',
      borderRadius: 4,
      padding: '2px 7px',
      fontSize: 10,
      fontWeight: 700,
    },
    iface: { fontSize: 11, color: '#64748b', marginLeft: 'auto' },
    divider: { height: 1, background: 'rgba(255,255,255,0.08)', margin: '16px 0' },
    section: { fontSize: 11, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 },
    qrWrap: { display: 'flex', alignItems: 'center', gap: 20, marginTop: 16 },
    qrLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 6 },
    status: { display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: '#94a3b8', marginTop: 12 },
    dot: (ok) => ({ width: 8, height: 8, borderRadius: '50%', background: ok ? '#22c55e' : '#ef4444', display: 'inline-block' }),
  };

  if (loading) {
    return (
      <div style={s.card}>
        <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>⏳ Détection des interfaces réseau…</p>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={s.card}>
        <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>
          ⚠️ Impossible de récupérer les infos réseau. Le serveur est-il démarré ?
        </p>
      </div>
    );
  }

  const recommended = info.recommended || {};
  const allIPs = info.localIPs || [];

  return (
    <div style={s.card}>
      {/* Titre */}
      <h3 style={s.title}>
        📡 Accès réseau local
        <span style={{ ...s.badge, background: '#6366f1', marginLeft: 'auto' }}>
          {info.hostname}
        </span>
      </h3>

      {/* URL principale recommandée */}
      <div style={s.section}>🎯 URL recommandée (frontend)</div>
      <div
        style={{ ...s.row, borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.12)' }}
        onClick={() => copyToClipboard(recommended.frontend, 'main')}
        title="Cliquer pour copier"
      >
        <span style={s.label}>Frontend</span>
        <span style={s.url}>{recommended.frontend}</span>
        {copied === 'main'
          ? <span style={s.badge}>✓ Copié</span>
          : <span style={{ fontSize: 14 }}>📋</span>
        }
      </div>

      {!compact && (
        <>
          <div
            style={s.row}
            onClick={() => copyToClipboard(recommended.backend, 'backend')}
            title="Cliquer pour copier"
          >
            <span style={s.label}>Backend</span>
            <span style={s.url}>{recommended.backend}</span>
            {copied === 'backend' ? <span style={s.badge}>✓ Copié</span> : <span>📋</span>}
          </div>

          <div
            style={s.row}
            onClick={() => copyToClipboard(recommended.terminal, 'term')}
            title="Cliquer pour copier"
          >
            <span style={s.label}>Terminal</span>
            <span style={s.url}>{recommended.terminal}</span>
            {copied === 'term' ? <span style={s.badge}>✓ Copié</span> : <span>📋</span>}
          </div>

          {/* Divider */}
          {allIPs.length > 1 && (
            <>
              <div style={s.divider} />
              <div style={s.section}>📌 Toutes les interfaces réseau</div>
              {allIPs.map((entry, i) => (
                <div
                  key={i}
                  style={s.row}
                  onClick={() => copyToClipboard(entry.frontendUrl, `iface-${i}`)}
                  title="Cliquer pour copier"
                >
                  <span style={s.label}>{entry.ip}</span>
                  <span style={s.url}>{entry.frontendUrl}</span>
                  <span style={s.iface}>{entry.interface}</span>
                  {copied === `iface-${i}` && <span style={s.badge}>✓</span>}
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* QR Code */}
      <div style={s.divider} />
      <div style={s.qrWrap}>
        <div>
          <div style={s.qrLabel}>📱 Scanner depuis un mobile ou tablette</div>
          <QRCodeImg value={recommended.frontend || info.qrData} size={compact ? 100 : 130} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
            <strong style={{ color: '#f1f5f9' }}>Comment se connecter depuis une autre machine ?</strong>
            <ol style={{ margin: '8px 0 0 16px', padding: 0, fontSize: 12 }}>
              <li>Connectez-vous au <strong>même routeur/Wi-Fi</strong></li>
              <li>Ouvrez votre navigateur</li>
              <li>Tapez l'URL ci-dessus, ou scannez le QR code</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={s.status}>
        <span style={s.dot(true)} />
        Serveur actif · Uptime {Math.floor((info.uptime || 0) / 60)} min
        &nbsp;·&nbsp;
        <span style={s.dot(info.localIPs?.length > 0)} />
        {info.localIPs?.length || 0} interface(s) détectée(s)
      </div>
    </div>
  );
}

// ─── Usage dans un Dashboard ou modal Admin ───────────────────────────────────
//
//  import NetworkInfo from './components/NetworkInfo';
//
//  // Affichage complet (avec toutes les interfaces + terminal)
//  <NetworkInfo />
//
//  // Affichage compact (juste l'URL principale + QR code)
//  <NetworkInfo compact />
//
// ─────────────────────────────────────────────────────────────────────────────