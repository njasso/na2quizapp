// src/components/ImageUploader.jsx
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ImageUploader = ({ value, onChange, onRemove, label = "Image" }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value);
  const [storageType, setStorageType] = useState(() => {
    if (value?.startsWith('data:image')) return 'base64';
    if (value) return 'url';
    return 'none';
  });
  const fileInputRef = useRef(null);

  // Upload de fichier (stockage local)
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await api.post('/api/upload/question-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.success) {
        const imageData = {
          url: response.imageUrl,
          base64: response.imageBase64,
          metadata: response.metadata,
          storageType: 'url'
        };
        setPreview(imageData.url);
        setStorageType('url');
        onChange(imageData.url, imageData.base64, imageData.metadata);
        toast.success('Image uploadée avec succès');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  // Upload Base64 direct (coller ou glisser)
  const handleBase64Upload = (base64Data) => {
    try {
      // Valider que c'est bien un Base64 valide
      if (!base64Data.startsWith('data:image')) {
        toast.error('Format d\'image invalide');
        return;
      }
      
      // Extraire les métadonnées
      const mimeType = base64Data.split(';')[0].split(':')[1];
      const size = Math.ceil(base64Data.length * 0.75);
      
      setPreview(base64Data);
      setStorageType('base64');
      onChange('', base64Data, {
        originalName: 'image_base64.png',
        mimeType,
        size,
        storageType: 'base64'
      });
      toast.success('Image Base64 enregistrée');
    } catch (error) {
      console.error('Erreur Base64:', error);
      toast.error('Format Base64 invalide');
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) handleFileUpload(file);
        break;
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setStorageType('none');
    onChange('', '', null);
    toast.success('Image supprimée');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: 4, display: 'block' }}>
        <ImageIcon size={12} style={{ display: 'inline', marginRight: 4 }} />
        {label}
      </label>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onPaste={handlePaste}
        style={{
          border: `2px dashed ${preview ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: 12,
          padding: 16,
          textAlign: 'center',
          background: preview ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
          transition: 'all 0.2s'
        }}
      >
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={preview}
              alt="Aperçu"
              style={{
                maxWidth: '100%',
                maxHeight: 150,
                borderRadius: 8,
                objectFit: 'contain'
              }}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'center' }}>
              <span style={{
                fontSize: '0.6rem',
                padding: '2px 6px',
                borderRadius: 4,
                background: storageType === 'url' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)',
                color: storageType === 'url' ? '#60a5fa' : '#a78bfa'
              }}>
                {storageType === 'url' ? '📁 Stockage local' : '💾 Stocké en Base64'}
              </span>
              <button
                onClick={handleRemove}
                style={{
                  padding: '2px 8px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: 4,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.7rem'
                }}
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={(e) => handleFileUpload(e.target.files[0])}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            
            {uploading ? (
              <div style={{ padding: '20px 0' }}>
                <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: 8 }}>Upload en cours...</p>
              </div>
            ) : (
              <>
                <Upload size={32} color="#64748b" style={{ marginBottom: 8 }} />
                <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  Glissez une image, collez (Ctrl+V) ou{' '}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      color: '#6366f1',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    cliquez pour choisir
                  </button>
                </p>
                <p style={{ color: '#64748b', fontSize: '0.65rem', marginTop: 4 }}>
                  JPG, PNG, GIF, WebP (max 5MB)
                </p>
                <p style={{ color: '#475569', fontSize: '0.6rem', marginTop: 8 }}>
                  💡 Astuce: Collez une image depuis le presse-papier (Ctrl+V)
                </p>
              </>
            )}
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUploader;