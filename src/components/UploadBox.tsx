import React, { useState, useRef } from 'react';
import { Upload, Sparkles, Clipboard } from 'lucide-react';

interface UploadBoxProps {
  onFileLoaded: (name: string, content: string, type: 'json' | 'csv' | 'txt') => void;
}

const SAMPLE_LOG = `{
  "transaction_id": "e8d7a124-94c6-4fb1-bca8-e9f0d148b52a",
  "timestamp": "2026-06-21T13:02:18Z",
  "client_ip": "198.51.100.75",
  "environment": "production",
  "user": {
    "id": "usr_102938475",
    "full_name": "Marcus Aurelius",
    "email": "marcus.aurelius@rome-corp.com",
    "phone": "+1 (312) 555-0143",
    "auth": {
      "token": "Bearer ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "stripe_key": "sk_test_51NzABC1234567890abcdef123"
    }
  },
  "billing": {
    "card_number": "4111222233334444",
    "card_brand": "Visa",
    "billing_address": "123 Via Sacra, Rome"
  },
  "action": "charge.success",
  "debug_info": "Connecting from IP 198.51.100.75; notification dispatched to marcus.aurelius@rome-corp.com"
}`;

export const UploadBox: React.FC<UploadBoxProps> = ({ onFileLoaded }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();
    let type: 'json' | 'csv' | 'txt' = 'txt';
    
    if (extension === 'json') type = 'json';
    else if (extension === 'csv') type = 'csv';

    reader.onload = (e) => {
      const content = e.target?.result as string;
      onFileLoaded(file.name, content, type);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const loadSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileLoaded('sample_transactions.json', SAMPLE_LOG, 'json');
  };

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    
    const trimmed = pasteText.trim();
    let type: 'json' | 'csv' | 'txt' = 'txt';
    
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      type = 'json';
    } else if (trimmed.includes(',') && trimmed.includes('\n')) {
      type = 'csv';
    }
    
    onFileLoaded('pasted_content.' + (type === 'json' ? 'json' : type === 'csv' ? 'csv' : 'txt'), pasteText, type);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Tab Selector */}
      <nav className="tab-nav">
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          Subir Archivo
        </button>
        <button 
          type="button" 
          className={`tab-btn ${activeTab === 'paste' ? 'active' : ''}`}
          onClick={() => setActiveTab('paste')}
        >
          Pegar Texto
        </button>
      </nav>

      {/* Tab 1: File Upload */}
      {activeTab === 'upload' && (
        <div 
          className={`upload-container ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input 
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            accept=".json,.csv,.txt"
            onChange={handleFileInput}
          />
          
          <div className="upload-icon">
            <Upload size={32} />
          </div>
          
          <div className="upload-text-group">
            <h3 className="upload-title">Arrastra y suelta tu archivo aquí</h3>
            <p className="upload-subtitle">Formatos: JSON, CSV, TXT (Logs)</p>
          </div>

          <button type="button" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
            Seleccionar archivo
          </button>
        </div>
      )}

      {/* Tab 2: Paste Text */}
      {activeTab === 'paste' && (
        <div className="paste-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <label htmlFor="raw-log-input" className="paste-label" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Introduce tus datos
            </label>
            <button 
              type="button" 
              className="btn-sample" 
              style={{ 
                padding: '0.25rem 0.5rem', 
                fontSize: '0.75rem', 
                border: '1px solid var(--border-subtle)', 
                background: 'var(--bg-card)', 
                cursor: 'pointer', 
                borderRadius: '4px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem', 
                color: 'var(--text-muted)' 
              }} 
              onClick={loadSample}
            >
              <Sparkles size={12} style={{ color: 'var(--color-primary)' }} />
              Cargar Ejemplo
            </button>
          </div>
          <textarea
            id="raw-log-input"
            className="paste-textarea"
            placeholder="Pega aquí tus logs, JSON estructurado, o listados CSV para sanitizar..."
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              type="button" 
              className={`btn-primary ${!pasteText.trim() ? 'btn-disabled' : ''}`}
              onClick={handlePasteSubmit}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <Clipboard size={14} />
              Escanear Datos
            </button>
          </div>
        </div>
      )}

      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '1.25rem', textAlign: 'center' }}>
        🔒 Todos los datos se procesan 100% de manera local. Nada se envía a servidores externos.
      </div>
    </div>
  );
};
