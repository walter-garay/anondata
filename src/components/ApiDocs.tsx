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
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.517 2.266 2.27 3.51 5.276 3.508 8.48-.005 6.654-5.34 11.993-11.953 11.993-2.007-.001-3.982-.503-5.735-1.46L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 2.052 14.124.99 11.5.99c-5.442 0-9.87 4.372-9.874 9.802-.001 1.762.478 3.48 1.385 5.017l-.95 3.47 3.589-.926zm12.39-7.1c-.27-.133-1.597-.777-1.845-.866-.247-.089-.427-.133-.608.133-.18.267-.697.866-.855 1.044-.158.177-.315.2-.585.067-.27-.133-1.14-.415-2.17-1.325-.8-0.706-1.34-1.579-1.497-1.846-.158-.267-.017-.41.118-.544.12-.12.27-.312.404-.467.135-.156.18-.267.27-.444.09-.178.045-.334-.022-.467-.067-.133-.608-1.446-.833-1.97-.218-.52-.459-.447-.608-.447-.14-.007-.3-.007-.46-.007-.16 0-.417.06-.635.294-.218.235-.833.801-.833 1.954 0 1.153.848 2.266.966 2.422.118.156 1.668 2.516 4.04 3.522.565.24 1.006.383 1.35.491.568.178 1.084.153 1.491.094.454-.067 1.597-.644 1.823-1.266.225-.622.225-1.155.158-1.266-.067-.11-.247-.2-.518-.334z" />
        </svg>
        <span className="whatsapp-support-text">Soporte</span>
      </a>
    </div>
  );
}
