import { useState, useEffect } from 'react';
import { ShieldCheck, Heart, Lock, ArrowLeft, ArrowRight, RefreshCw, Sun, Moon } from 'lucide-react';
import { UploadBox } from './components/UploadBox';
import { RulesPanel } from './components/RulesPanel';
import { DiffViewer } from './components/DiffViewer';
import { StatsHeader } from './components/StatsHeader';
import { type PIICategory, scanRawText, isSecretKey, PII_RULES } from './utils/detector';
import { anonymizeFile } from './utils/masker';

export default function App() {
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
          <div style={{ display: 'none', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            <Lock size={12} style={{ color: 'var(--color-success)' }} />
            <span>Procesamiento local</span>
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
              
              <button type="button" className="btn-primary" onClick={() => setStep(3)}>
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
        </div>
        <div className="footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            Hecho con <Heart size={11} style={{ color: 'var(--color-danger)', fill: 'var(--color-danger)' }} /> para desarrolladores
          </span>
        </div>
      </footer>
    </div>
  );
}
