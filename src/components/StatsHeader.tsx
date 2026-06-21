import React from 'react';
import { Copy, Download, Trash2, Check } from 'lucide-react';
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
    <div className="glass-panel stats-grid" style={{ padding: '1.25rem' }}>
      <div className="stat-card">
        <span className="stat-label">Archivo</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginTop: '0.2rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={fileName}>
            {fileName}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Tamaño: {formatFileSize(fileSize)}
          </span>
        </div>
      </div>

      <div className="stat-card">
        <span className="stat-label">Sensitivos Detectados</span>
        <span className="stat-value" style={{ color: totalDetections > 0 ? 'oklch(74% 0.15 45)' : 'var(--text-main)' }}>
          {totalDetections}
        </span>
      </div>

      <div className="stat-card">
        <span className="stat-label">Nivel de Privacidad</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
          <span className={`stat-value ${safetyScore === 100 ? 'secure' : ''}`} style={{ color: safetyScore < 100 ? 'oklch(74% 0.15 45)' : undefined }}>
            {safetyScore}%
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            protegido
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={onCopy} title="Copiar texto anonymizado">
          {copySuccess ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          {copySuccess ? '¡Copiado!' : 'Copiar'}
        </button>

        <button type="button" className="btn-primary" onClick={onDownload} title="Descargar archivo limpio">
          <Download size={16} />
          Descargar
        </button>

        <button type="button" className="btn-secondary" style={{ borderColor: 'oklch(40% 0.1 20 / 0.4)', color: 'oklch(75% 0.1 20)' }} onClick={onClear} title="Limpiar y subir otro archivo">
          <Trash2 size={16} />
          Limpiar
        </button>
      </div>
    </div>
  );
};
