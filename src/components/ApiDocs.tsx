import { useState, useEffect } from 'react';
import { Copy, Check, Code, Terminal, ArrowLeft, Globe } from 'lucide-react';

interface ApiDocsProps {
  onBack: () => void;
}

export function ApiDocs({ onBack }: ApiDocsProps) {
  const [activeTab, setActiveTab] = useState<'curl' | 'js' | 'python'>('curl');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('https://anondata.dev');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const curlCode = `curl -X POST "${origin}/api/anonymize" \\
  -H "Content-Type: application/json" \\
  -d '{
    "content": "Contact mail@example.com or use sk_live_51NzAbC to connect.",
    "type": "txt",
    "rules": {
      "email": "fake",
      "api_key": "redact"
    }
  }'`;

  const jsCode = `const response = await fetch('${origin}/api/anonymize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    content: 'Contact mail@example.com or use sk_live_51NzAbC to connect.',
    type: 'txt',
    rules: {
      email: 'fake',
      api_key: 'redact'
    }
  })
});

const data = await response.json();
console.log(data.anonymizedContent);`;

  const pythonCode = `import requests

url = "${origin}/api/anonymize"
payload = {
    "content": "Contact mail@example.com or use sk_live_51NzAbC to connect.",
    "type": "txt",
    "rules": {
        "email": "fake",
        "api_key": "redact"
    }
}

response = requests.post(url, json=payload)
data = response.json()
print(data["anonymizedContent"])`;

  const responseJson = `{
  "success": true,
  "anonymizedContent": "Contact alex_novak@company.local or use [REDACTED_API_KEY] to connect.",
  "stats": {
    "char_count": 63,
    "detections_count": 2,
    "duration_ms": 12,
    "categories_stats": {
      "email": 1,
      "api_key": 1,
      "ip": 0,
      "credit_card": 0,
      "uuid": 0,
      "phone": 0,
      "password": 0
    }
  }
}`;

  const getCodeString = () => {
    if (activeTab === 'curl') return curlCode;
    if (activeTab === 'js') return jsCode;
    return pythonCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="docs-container animate-fade-in">
      {/* Docs Header */}
      <div className="docs-header">
        <button type="button" className="btn-back" onClick={onBack} aria-label="Volver a la aplicación">
          <ArrowLeft size={16} />
          <span>Volver</span>
        </button>
        <div className="docs-title-wrapper">
          <Globe className="docs-title-icon" size={24} />
          <div>
            <h2 className="docs-title">API Developer Portal</h2>
            <p className="docs-subtitle">Integra AnonData en tus flujos de desarrollo en segundos</p>
          </div>
        </div>
      </div>

      <div className="docs-layout">
        {/* Left Column: API Reference */}
        <div className="docs-reference">
          <section className="docs-section">
            <h3 className="section-title">Información General</h3>
            <p className="section-text">
              La API de AnonData te permite automatizar la detección y el enmascaramiento de información confidencial
              (PII, contraseñas, claves API, etc.) desde tus scripts, pipelines de CI/CD o servidores de aplicaciones.
            </p>
            <div className="api-endpoint-badge">
              <span className="badge-method">POST</span>
              <span className="badge-url">/api/anonymize</span>
            </div>
          </section>

          <section className="docs-section">
            <h3 className="section-title">Parámetros del Cuerpo (JSON)</h3>
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Parámetro</th>
                  <th>Tipo</th>
                  <th>Requerido</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code className="code-field">content</code></td>
                  <td>string</td>
                  <td>Sí</td>
                  <td>El texto o contenido del archivo que se desea anonimizar.</td>
                </tr>
                <tr>
                  <td><code className="code-field">type</code></td>
                  <td>string</td>
                  <td>No</td>
                  <td>El formato del contenido: <code className="code-inline">"txt"</code> (defecto), <code className="code-inline">"json"</code>, o <code className="code-inline">"csv"</code>.</td>
                </tr>
                <tr>
                  <td><code className="code-field">rules</code></td>
                  <td>object</td>
                  <td>No</td>
                  <td>Acción a tomar para cada categoría. Clave: ID de categoría. Valor: regla.</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="docs-section">
            <h3 className="section-title">Reglas de Enmascaramiento</h3>
            <p className="section-text">
              Puedes especificar qué acción tomar para cada categoría encontrada usando las siguientes directivas:
            </p>
            <ul className="docs-list">
              <li><strong><code className="code-inline">"redact"</code></strong>: Reemplaza el texto con un marcador genérico de la categoría.</li>
              <li><strong><code className="code-inline">"fake"</code></strong>: Genera datos ficticios consistentes (ej. nombres o IPs simuladas).</li>
              <li><strong><code className="code-inline">"hash"</code></strong>: Genera un hash SHA-256 del valor original.</li>
              <li><strong><code className="code-inline">"keep"</code></strong>: Conserva el valor original sin modificar.</li>
            </ul>
          </section>

          <section className="docs-section">
            <h3 className="section-title">Categorías Soportadas</h3>
            <div className="categories-grid">
              <div className="category-chip"><code>api_key</code> <span className="category-desc">Claves API</span></div>
              <div className="category-chip"><code>email</code> <span className="category-desc">Correos electrónicos</span></div>
              <div className="category-chip"><code>ip</code> <span className="category-desc">Direcciones IP</span></div>
              <div className="category-chip"><code>credit_card</code> <span className="category-desc">Tarjetas de Crédito</span></div>
              <div className="category-chip"><code>uuid</code> <span className="category-desc">UUIDs/GUIDs</span></div>
              <div className="category-chip"><code>phone</code> <span className="category-desc">Números de Teléfono</span></div>
              <div className="category-chip"><code>password</code> <span className="category-desc">Heurísticas de Contraseña (JSON)</span></div>
            </div>
          </section>
        </div>

        {/* Right Column: Code Snippets & Response */}
        <div className="docs-code-panel">
          <div className="snippet-container">
            <div className="snippet-header">
              <div className="snippet-tabs">
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'curl' ? 'active' : ''}`}
                  onClick={() => setActiveTab('curl')}
                >
                  <Terminal size={14} />
                  <span>cURL</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'js' ? 'active' : ''}`}
                  onClick={() => setActiveTab('js')}
                >
                  <Code size={14} />
                  <span>JavaScript</span>
                </button>
                <button
                  type="button"
                  className={`tab-btn ${activeTab === 'python' ? 'active' : ''}`}
                  onClick={() => setActiveTab('python')}
                >
                  <Code size={14} />
                  <span>Python</span>
                </button>
              </div>

              <button
                type="button"
                className={`btn-copy ${copied ? 'success' : ''}`}
                onClick={handleCopy}
                aria-label="Copiar código al portapapeles"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <pre className="snippet-body">
              <code>{getCodeString()}</code>
            </pre>
          </div>

          <div className="response-container">
            <div className="response-header">
              <span className="response-title">Ejemplo de Respuesta (JSON 200)</span>
            </div>
            <pre className="response-body">
              <code>{responseJson}</code>
            </pre>
          </div>
        </div>
      </div>

      <a
        href="https://wa.me/51934519338?text=Hola%2C%20necesito%20soporte%20con%20AnonData"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-support-btn"
        title="Contactar soporte por WhatsApp"
        aria-label="Soporte por WhatsApp"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="whatsapp-support-text">Soporte</span>
      </a>
    </div>
  );
}
