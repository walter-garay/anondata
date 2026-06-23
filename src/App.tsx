import { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Lock, ArrowLeft, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { UploadBox } from './components/UploadBox';
import { RulesPanel } from './components/RulesPanel';
import { DiffViewer } from './components/DiffViewer';
import { StatsHeader } from './components/StatsHeader';
import { type PIICategory, scanRawText, isSecretKey, PII_RULES } from './utils/detector';
import { anonymizeFile } from './utils/masker';
import { ApiDocs } from './components/ApiDocs';
import { AdminDashboard } from './components/AdminDashboard';

export default function App() {
  // View mode: 'app' (masking tool), 'admin' (admin dashboard), 'docs' (API documentation)
  const [viewMode, setViewMode] = useState<'app' | 'admin' | 'docs'>('app');

  // Wizard steps: 1 = Intake / Upload, 2 = Configure Rules, 3 = Verify & Export
  const [step, setStep] = useState<number>(1);

  // Theme support: 'dark' or 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('anon-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  // Apply theme to document element
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('anon-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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

  // Send anonymous stats of web usage to server database
  const logMetadataToServer = () => {
    if (fileContent.length === 0 || !fileType) return;

    const totalDetections = Object.values(counts).reduce((a, b) => a + b, 0);

    const apiBase = window.location.hostname.endsWith('github.io') || 
                     (window.location.hostname === 'localhost' && window.location.port === '5173')
      ? 'https://anondata.vercel.app'
      : '';

    fetch(`${apiBase}/api/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        char_count: fileContent.length,
        detections_count: totalDetections,
        file_type: fileType,
        categories_stats: counts
      })
    }).catch((err) => {
      console.error('Failed to log metadata to server:', err);
    });
  };

  const handleGoToVerification = () => {
    setStep(3);
    logMetadataToServer();
  };

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

    // Automatically transition to configure step
    setStep(2);
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
    setStep(1);
  };

  const totalDetections = Object.values(counts).reduce((a, b) => a + b, 0);

  if (viewMode === 'docs') {
    return <ApiDocs onBack={() => setViewMode('app')} />;
  }

  if (viewMode === 'admin') {
    return <AdminDashboard onBack={() => setViewMode('app')} />;
  }

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand">
          <ShieldCheck size={26} className="brand-logo" />
          <h1 className="brand-title">AnonData</h1>
          <span className="brand-badge">Local-First</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-nav-links">
            <button
              type="button"
              className="header-nav-btn"
              onClick={() => setViewMode('docs')}
            >
              API Docs
            </button>
            <button
              type="button"
              className="header-nav-btn"
              onClick={() => setViewMode('admin')}
            >
              Login
            </button>
          </div>
          {/* Theme Toggle Button */}
          <button 
            type="button" 
            className="theme-toggle-btn" 
            onClick={toggleTheme} 
            title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
            aria-label="Cambiar tema de color"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Wizard Step Progress Tracker */}
      <div className="wizard-progress">
        <div className={`wizard-step ${step > 1 ? 'completed' : ''} ${step === 1 ? 'active' : ''}`}>
          <span className="step-number">{step > 1 ? '✓' : '1'}</span>
          <span className="step-label">Carga</span>
        </div>
        <div className="wizard-step-arrow">→</div>
        <div className={`wizard-step ${step > 2 ? 'completed' : ''} ${step === 2 ? 'active' : ''}`}>
          <span className="step-number">{step > 2 ? '✓' : '2'}</span>
          <span className="step-label">Reglas</span>
        </div>
        <div className="wizard-step-arrow">→</div>
        <div className={`wizard-step ${step === 3 ? 'active' : ''}`}>
          <span className="step-number">3</span>
          <span className="step-label">Exportar</span>
        </div>
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {step === 1 && (
          <div className="step-container landing-grid">
            {/* Left Column: Hero & Demonstration */}
            <div className="landing-hero">
              <h2 className="landing-title">Anónimiza logs y datos estructurados al instante</h2>
              <p className="landing-subtitle">
                Detecta y enmascara automáticamente información personal identificable (PII) antes de compartirla con IAs o subirla a soporte técnico.
              </p>

              {/* Dynamic / Static Visual Demo */}
              <div className="visual-demo-card">
                <div className="visual-demo-header">
                  <span>Demostración de Enmascarado</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--color-success)' }}>
                    <Lock size={12} />
                    <span>Local</span>
                  </div>
                </div>
                <div className="visual-demo-body">
                  {`{
  "user": "Marcus Aurelius",
  "email": `}<span className="demo-original">"marcus@rome.com"</span>{`,
  "client_ip": `}<span className="demo-original">"198.51.100.75"</span>{`,
  "api_key": `}<span className="demo-original">"sk_live_51NzAbC"</span>{`
}`}
                  <div style={{ margin: '0.6rem 0', borderTop: '1px dashed var(--border-subtle)' }} />
                  {`{
  "user": "Marcus Aurelius",
  "email": `}<span className="demo-masked">"m*****@*******.com"</span>{`,
  "client_ip": `}<span className="demo-masked">"sha256(198.51.100)"</span>{`,
  "api_key": `}<span className="demo-masked">"[REDACTADO]"</span>{`
}`}
                </div>
              </div>
            </div>
            
            {/* Right Column: Tabbed intake panel */}
            <UploadBox onFileLoaded={handleFileLoaded} />
          </div>
        )}

        {step === 2 && (
          <div className="step-container rules-container">
            <div className="rules-intro-card">
              <div className="rules-intro-text">
                <h2>Define las reglas de enmascaramiento</h2>
                <p>Personaliza cómo tratar cada tipo de información sensible encontrada en <code>{fileName}</code>.</p>
              </div>
              <span className="brand-badge" style={{ color: 'var(--color-primary)' }}>
                {totalDetections} {totalDetections === 1 ? 'detección' : 'detecciones'}
              </span>
            </div>

            <RulesPanel
              counts={counts}
              rules={rules}
              onChangeRule={handleChangeRule}
            />

            <div className="wizard-footer">
              <button type="button" className="btn-secondary" onClick={handleClear}>
                <ArrowLeft size={16} />
                Subir otro archivo
              </button>
              
              <button type="button" className="btn-primary" onClick={handleGoToVerification}>
                Continuar a verificación
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="step-container workspace-layout">
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

            <DiffViewer
              fileName={fileName}
              originalText={fileContent}
              findings={findings}
              rules={rules}
            />

            <div className="wizard-footer">
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                <ArrowLeft size={16} />
                Ajustar Reglas
              </button>
              
              <button type="button" className="btn-success" onClick={handleClear}>
                <RefreshCw size={16} />
                Comenzar de nuevo
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div>
          AnonData — Utilidad local-first de código abierto.
          <span className="footer-nav-divider">
            • <button type="button" className="footer-btn-link" onClick={() => setViewMode('docs')}>API Docs</button>
            • <button type="button" className="footer-btn-link" onClick={() => setViewMode('admin')}>Login</button>
          </span>
        </div>
        <div className="footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            Hecho con <Heart size={11} style={{ color: 'var(--color-danger)', fill: 'var(--color-danger)' }} /> para desarrolladores
          </span>
          <a
            href="https://wa.me/51934519338?text=Hola%2C%20necesito%20soporte%20con%20AnonData"
            target="_blank"
            rel="noopener noreferrer"
            className="whatsapp-support-btn"
            title="Contactar soporte por WhatsApp"
            aria-label="Soporte por WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.276 3.508 8.48-.005 6.654-5.34 11.993-11.953 11.993-2.007-.001-3.982-.503-5.735-1.46L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.052 14.124.99 11.5.99c-5.442 0-9.87 4.372-9.874 9.802-.001 1.762.478 3.48 1.385 5.017l-.95 3.47 3.589-.926zm12.39-7.1c-.27-.133-1.597-.777-1.845-.866-.247-.089-.427-.133-.608.133-.18.267-.697.866-.855 1.044-.158.177-.315.2-.585.067-.27-.133-1.14-.415-2.17-1.325-.8-0.706-1.34-1.579-1.497-1.846-.158-.267-.017-.41.118-.544.12-.12.27-.312.404-.467.135-.156.18-.267.27-.444.09-.178.045-.334-.022-.467-.067-.133-.608-1.446-.833-1.97-.218-.52-.459-.447-.608-.447-.14-.007-.3-.007-.46-.007-.16 0-.417.06-.635.294-.218.235-.833.801-.833 1.954 0 1.153.848 2.266.966 2.422.118.156 1.668 2.516 4.04 3.522.565.24 1.006.383 1.35.491.568.178 1.084.153 1.491.094.454-.067 1.597-.644 1.823-1.266.225-.622.225-1.155.158-1.266-.067-.11-.247-.2-.518-.334z" />
            </svg>
            <span className="whatsapp-support-text">Soporte</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
