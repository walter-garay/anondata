import { useState } from 'react';
import { ShieldCheck, Heart, Lock, AlertTriangle } from 'lucide-react';
import { UploadBox } from './components/UploadBox';
import { RulesPanel } from './components/RulesPanel';
import { DiffViewer } from './components/DiffViewer';
import { StatsHeader } from './components/StatsHeader';
import { type PIICategory, scanRawText, isSecretKey, PII_RULES } from './utils/detector';
import { anonymizeFile } from './utils/masker';

export default function App() {
  // File state
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<'json' | 'csv' | 'txt' | null>(null);

  // Scan findings and PII rules
  const [findings, setFindings] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<PIICategory, number>>({
    email: 0,
    ip: 0,
    credit_card: 0,
    uuid: 0,
    api_key: 0,
    phone: 0,
    password: 0
  });

  const [rules, setRules] = useState<Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>>({
    api_key: 'redact',
    email: 'fake',
    ip: 'hash',
    credit_card: 'redact',
    uuid: 'keep',
    phone: 'fake',
    password: 'redact'
  });

  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Parse file and load findings
  const handleFileLoaded = (name: string, content: string, type: 'json' | 'csv' | 'txt') => {
    setFileName(name);
    setFileContent(content);
    setFileSize(new Blob([content]).size);
    setFileType(type);

    // Scan text regex PII findings
    const regexFindings = scanRawText(content);
    setFindings(regexFindings);

    // Initial counter setup
    const initialCounts: Record<PIICategory, number> = {
      api_key: 0,
      email: 0,
      ip: 0,
      credit_card: 0,
      uuid: 0,
      phone: 0,
      password: 0
    };

    regexFindings.forEach((f) => {
      initialCounts[f.category] = (initialCounts[f.category] || 0) + 1;
    });

    // If JSON, recursively search for password key heuristics to add to count
    if (type === 'json') {
      let passwordCount = 0;
      try {
        const parsed = JSON.parse(content);
        const countSecretKeys = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (Array.isArray(obj)) {
            obj.forEach(countSecretKeys);
            return;
          }
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (typeof val === 'string' && isSecretKey(key)) {
              passwordCount++;
            } else {
              countSecretKeys(val);
            }
          }
        };
        countSecretKeys(parsed);
      } catch (e) {
        // Invalid JSON fallback, count is left as is
      }
      initialCounts.password = passwordCount;
    }

    setCounts(initialCounts);

    // Set default actions based on rules configuration
    const defaultRules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'> = {
      api_key: 'redact',
      email: 'fake',
      ip: 'hash',
      credit_card: 'redact',
      uuid: 'keep',
      phone: 'fake',
      password: 'redact'
    };
    PII_RULES.forEach((r) => {
      defaultRules[r.id] = r.defaultAction;
    });
    setRules(defaultRules);
  };

  const handleChangeRule = (category: PIICategory, action: 'redact' | 'hash' | 'fake' | 'keep') => {
    setRules((prev) => ({
      ...prev,
      [category]: action
    }));
  };

  const handleCopy = () => {
    const maskedText = anonymizeFile(fileContent, fileType || 'txt', rules);
    navigator.clipboard.writeText(maskedText)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handleDownload = () => {
    const maskedText = anonymizeFile(fileContent, fileType || 'txt', rules);
    const blob = new Blob([maskedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    
    // Append '-anonymized' to original file name
    const dotIndex = fileName.lastIndexOf('.');
    const nameWithoutExt = dotIndex !== -1 ? fileName.slice(0, dotIndex) : fileName;
    const ext = dotIndex !== -1 ? fileName.slice(dotIndex) : '.txt';
    link.download = `${nameWithoutExt}-anonymized${ext}`;
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFileName('');
    setFileContent('');
    setFileSize(0);
    setFileType(null);
    setFindings([]);
    setCounts({
      email: 0,
      ip: 0,
      credit_card: 0,
      uuid: 0,
      api_key: 0,
      phone: 0,
      password: 0
    });
    setCopySuccess(false);
  };

  const totalDetections = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="glass-panel app-header">
        <div className="brand">
          <ShieldCheck size={28} className="brand-logo" />
          <h1 className="brand-title">AnonData</h1>
          <span className="brand-badge">v1.0 Local-First</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Lock size={14} className="text-success" />
          <span>Procesamiento 100% en Navegador</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
        {!fileContent ? (
          <>
            <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Anónimiza logs y datos estructurados al instante</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '600px', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Detecta y enmascara automáticamente información sensible (PII) antes de compartirla con IAs, subirla a servicios de soporte o guardarla en entornos inseguros.
              </p>
            </div>
            
            <UploadBox onFileLoaded={handleFileLoaded} />
            
            <div className="stats-grid" style={{ marginTop: '0.5rem' }}>
              <div className="stat-card" style={{ alignItems: 'center', textAlign: 'center' }}>
                <ShieldCheck size={24} className="text-success" style={{ marginBottom: '0.25rem' }} />
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Total Privacidad</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ningún byte sale de tu computadora</span>
              </div>
              <div className="stat-card" style={{ alignItems: 'center', textAlign: 'center' }}>
                <SparklesIcon size={24} className="text-success" style={{ marginBottom: '0.25rem' }} />
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Falsificación Coherente</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mantiene la coherencia de datos para pruebas</span>
              </div>
              <div className="stat-card" style={{ alignItems: 'center', textAlign: 'center' }}>
                <AlertTriangle size={24} className="text-success" style={{ marginBottom: '0.25rem' }} />
                <span className="stat-label" style={{ fontSize: '0.75rem' }}>Detección de Claves</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Heurística de claves para hashes y secretos</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <StatsHeader
              fileName={fileName}
              fileSize={fileSize}
              totalDetections={totalDetections}
              rules={rules}
              counts={counts}
              onDownload={handleDownload}
              onCopy={handleCopy}
              onClear={handleClear}
              copySuccess={copySuccess}
            />

            <div className="workspace-layout">
              <RulesPanel
                counts={counts}
                rules={rules}
                onChangeRule={handleChangeRule}
              />

              <DiffViewer
                fileName={fileName}
                originalText={fileContent}
                findings={findings}
                rules={rules}
              />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          AnonData es una herramienta digital de código abierto creada para la privacidad de datos.
        </div>
        <div className="footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            Hecho con <Heart size={12} style={{ color: 'oklch(62% 0.18 20)', fill: 'oklch(62% 0.18 20)' }} /> para desarrolladores
          </span>
        </div>
      </footer>
    </div>
  );
}

// Inline Sparkles icon fallback since lucide-react name is different or missing sometimes
function SparklesIcon({ size = 16, className = '', style = {} }: { size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      style={style}
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z"/>
      <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>
    </svg>
  );
}
