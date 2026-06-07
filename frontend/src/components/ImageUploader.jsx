// src/components/ImageUploader.jsx
import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ImageUploader = ({ value, onChange, label = "Image" }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const [storageType, setStorageType] = useState(() => {
    if (!value) return 'none';
    if (value.startsWith('data:image')) return 'base64';
    if (value.startsWith('/uploads/') || value.startsWith('http')) return 'url';
    return 'none';
  });
  const fileInputRef = useRef(null);

  // ✅ Upload de fichier vers le serveur
  const handleFileUpload = async (file) => {
    if (!file) return;
    
    // Validation du type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    // Validation de la taille (5MB max)
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
      
      console.log('[ImageUploader] 📤 Réponse upload:', response);
      
      // ✅ Vérifier le format de réponse
      const responseData = response.data || response;
      
      if (responseData.success) {
        const imageUrl = responseData.imageUrl || responseData.url || '';
        const imageBase64 = responseData.imageBase64 || responseData.base64 || '';
        const metadata = responseData.metadata || responseData.imageMetadata || {
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          storageType: 'url'
        };
        
        setPreview(imageUrl);
        setStorageType('url');
        
        // ✅ Appeler onChange avec les 3 paramètres attendus par CreateQuestion
        onChange(imageUrl, imageBase64, metadata);
        toast.success('Image uploadée avec succès');
      } else {
        throw new Error(responseData.error || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('[ImageUploader] ❌ Erreur upload:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  // ✅ Conversion directe en Base64 (sans upload serveur)
  const handleDirectBase64 = (file) => {
    if (!file) return;
    
    // Validation
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }
    
    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target.result;
      const mimeType = file.type;
      const size = file.size;
      
      setPreview(base64);
      setStorageType('base64');
      
      // ✅ Appeler onChange avec Base64
      onChange('', base64, {
        originalName: file.name,
        mimeType: mimeType,
        size: size,
        storageType: 'base64'
      });
      
      toast.success('Image convertie en Base64');
      setUploading(false);
    };
    
    reader.onerror = () => {
      toast.error('Erreur lors de la conversion');
      setUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  // ✅ Gestion du collage (Ctrl+V)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Par défaut, on convertit en Base64 pour le collage
          handleDirectBase64(file);
        }
        break;
      }
    }
  };

  // ✅ Suppression de l'image
  const handleRemove = () => {
    setPreview('');
    setStorageType('none');
    onChange('', '', { storageType: 'none' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Image supprimée');
  };

  // ✅ Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleDirectBase64(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // ✅ Sélection de fichier via bouton
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleDirectBase64(file);
    }
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ 
        color: '#94a3b8', 
        fontSize: '0.75rem', 
        marginBottom: 6, 
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        <ImageIcon size={14} color="#60a5fa" />
        {label}
        {preview && (
          <span style={{
            fontSize: '0.6rem',
            padding: '2px 8px',
            borderRadius: 4,
            background: storageType === 'url' ? 'rgba(59,130,246,0.2)' : 'rgba(139,92,246,0.2)',
            color: storageType === 'url' ? '#60a5fa' : '#a78bfa',
            marginLeft: 8
          }}>
            {storageType === 'url' ? '📁 Stockage local' : '💾 Base64'}
          </span>
        )}
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
          transition: 'all 0.2s',
          cursor: 'pointer'
        }}
        onClick={() => !uploading && !preview && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div style={{ padding: '20px 0' }}>
            <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 8 }}>
              Traitement en cours...
            </p>
          </div>
        ) : preview ? (
          <div style={{ position: 'relative' }}>
            <img 
              src={preview}
              alt="Aperçu"
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                borderRadius: 8,
                objectFit: 'contain',
                background: 'rgba(0,0,0,0.2)'
              }}
              onError={(e) => {
                console.error('[ImageUploader] Erreur chargement preview:', preview?.substring(0, 50));
                e.target.style.display = 'none';
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: 6,
                background: 'rgba(239,68,68,0.9)',
                border: 'none',
                borderRadius: 6,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div>
            <Upload size={32} color="#64748b" style={{ marginBottom: 8 }} />
            <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              Glissez une image, collez (Ctrl+V) ou cliquez
            </p>
            <p style={{ color: '#64748b', fontSize: '0.65rem', marginTop: 4 }}>
              JPG, PNG, GIF, WebP (max 5MB)
            </p>
          </div>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ImageUploader;