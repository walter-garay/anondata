import React from 'react';
import { Copy, Download, Trash2, Check, ShieldAlert, ShieldCheck } from 'lucide-react';
import { type PIICategory } from '../utils/detector';

interface StatsHeaderProps {
  fileName: string;
  fileSize: number; // in bytes
  totalDetections: number;
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>;
  counts: Record<PIICategory, number>;
  onDownload: () => void;
  onCopy: () => void;
  onClear: () => void;
  copySuccess: boolean;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  fileName,
  fileSize,
  totalDetections,
  rules,
  counts,
  onDownload,
  onCopy,
  onClear,
  copySuccess
}) => {
  // Calculate safety score: what percentage of detected PII is masked?
  const getSafetyScore = () => {
    if (totalDetections === 0) return 100;
    
    let keptCount = 0;
    (Object.keys(counts) as PIICategory[]).forEach(cat => {
      if (rules[cat] === 'keep') {
        keptCount += counts[cat] || 0;
      }
    });

    const maskedPercentage = Math.round(((totalDetections - keptCount) / totalDetections) * 100);
    return Math.max(0, Math.min(100, maskedPercentage));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const safetyScore = getSafetyScore();

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="stats-grid-card">
        <div className="stat-item">
          <span className="stat-label">Archivo de entrada</span>
          <span className="stat-value" title={fileName}>
            {fileName || 'pasted_text.txt'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Tamaño: {formatFileSize(fileSize)}
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Sensitivos Identificados</span>
          <span className={`stat-value ${totalDetections > 0 ? 'highlighted' : ''}`}>
            {totalDetections}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Registros sensibles escaneados
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-label">Nivel de Protección</span>
          <span className={`stat-value ${safetyScore === 100 ? 'safe' : 'highlighted'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {safetyScore === 100 ? <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} /> : <ShieldAlert size={18} style={{ color: 'var(--color-danger)' }} />}
            {safetyScore}%
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            de datos PII enmascarados
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={onCopy} title="Copiar texto sanitizado al portapapeles">
          {copySuccess ? <Check size={14} className="text-success" /> : <Copy size={14} />}
          {copySuccess ? '¡Copiado!' : 'Copiar Texto'}
        </button>

        <button type="button" className="btn-success" onClick={onDownload} title="Descargar archivo sanitizado">
          <Download size={14} />
          Descargar Archivo
        </button>

        <button 
          type="button" 
          className="btn-secondary" 
          style={{ borderColor: 'oklch(70% 0.1 25 / 0.2)', color: 'var(--color-danger)' }} 
          onClick={onClear} 
          title="Limpiar datos y volver a empezar"
        >
          <Trash2 size={14} />
          Limpiar
        </button>
      </div>
    </div>
  );
};
