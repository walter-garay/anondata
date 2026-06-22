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
    </div>
  );
}
