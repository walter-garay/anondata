import { useState, useEffect, useCallback } from 'react';
import { Activity, Globe, Cpu, Lock, LogOut, RefreshCw, ShieldCheck, Layers } from 'lucide-react';

interface AdminDashboardProps {
  onBack: () => void;
}

interface StatsSummary {
  totalRequests: number;
  webRequests: number;
  apiRequests: number;
  totalChars: number;
  totalDetections: number;
}

interface TimelineEntry {
  date: string;
  web: number;
  api: number;
  total: number;
}

interface RecentLog {
  id: string;
  created_at: string;
  source: 'web' | 'api';
  char_count: number;
  detections_count: number;
  file_type: 'json' | 'csv' | 'txt';
  categories_stats: Record<string, number>;
}

export function AdminDashboard({ onBack }: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Stats states
  const [summary, setSummary] = useState<StatsSummary>({
    totalRequests: 0,
    webRequests: 0,
    apiRequests: 0,
    totalChars: 0,
    totalDetections: 0,
  });
  const [categoriesStats, setCategoriesStats] = useState<Record<string, number>>({});
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [recent, setRecent] = useState<RecentLog[]>([]);

  // Check saved session on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('anon-admin-token');
    if (savedToken) {
      verifyAndLoad(savedToken);
    }
  }, []);

  const verifyAndLoad = async (pw: string) => {
    setLoading(true);
    setAuthError('');
    try {
      const apiBase = window.location.hostname.endsWith('github.io') || 
                       (window.location.hostname === 'localhost' && window.location.port === '5173')
        ? 'https://anondata.vercel.app'
        : '';

      const response = await fetch(`${apiBase}/api/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${pw}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setCategoriesStats(data.categoriesStats);
        setTimeline(data.timeline);
        setRecent(data.recent);
        setIsAuthenticated(true);
        sessionStorage.setItem('anon-admin-token', pw);
      } else {
        const err = await response.json();
        setAuthError(err.error || 'Contraseña incorrecta');
        sessionStorage.removeItem('anon-admin-token');
      }
    } catch (e) {
      console.error(e);
      setAuthError('Error de red al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setAuthError('Por favor ingresa la contraseña.');
      return;
    }
    verifyAndLoad(password);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('anon-admin-token');
    setIsAuthenticated(false);
    setPassword('');
  };

  const handleRefresh = useCallback(() => {
    const savedToken = sessionStorage.getItem('anon-admin-token');
    if (savedToken) {
      verifyAndLoad(savedToken);
    }
  }, []);

  const formatChars = (count: number) => {
    if (count < 1000) return `${count} ch`;
    if (count < 1000000) return `${(count / 1000).toFixed(1)} kch`;
    return `${(count / 1000000).toFixed(1)} mch`;
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    
    if (diffMin < 1) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Generate SVG path for timeline line chart
  const getTimelineSvgPath = () => {
    if (timeline.length < 2) {
      return { linePath: '', fillPath: '' };
    }
    const width = 600;
    const height = 140;
    const maxVal = Math.max(...timeline.map((t) => t.total), 5); // Fallback to 5 to avoid division by 0

    const points = timeline.map((t, index) => {
      const x = (index / (timeline.length - 1)) * width;
      const y = height - (t.total / maxVal) * (height - 20) - 10;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${points.join(' L ')}`;
    
    // Fill path connects down to the bottom coordinates
    const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return { linePath, fillPath };
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-screen animate-fade-in">
        <div className="login-card">
          <div className="login-card-header">
            <Lock className="login-icon" size={32} />
            <h2>Acceso Administrativo</h2>
            <p>AnonData Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="admin-pw-field">Contraseña de Administrador</label>
              <input
                id="admin-pw-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={loading}
              />
            </div>
            {authError && <div className="login-error-msg">{authError}</div>}
            
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={onBack}
                disabled={loading}
              >
                Volver
              </button>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 2 }}
                disabled={loading}
              >
                {loading ? 'Verificando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const svgPaths = getTimelineSvgPath();
  const maxCategoryCount = Math.max(...Object.values(categoriesStats), 1);

  // Category labels and nice colors matching the design system
  const categoryMeta: Record<string, { label: string; color: string }> = {
    api_key: { label: 'Claves API', color: 'var(--color-api-key)' },
    email: { label: 'Correos', color: 'var(--color-email)' },
    ip: { label: 'Direcciones IP', color: 'var(--color-ip)' },
    credit_card: { label: 'T. Crédito', color: 'var(--color-credit-card)' },
    uuid: { label: 'UUIDs', color: 'var(--color-uuid)' },
    phone: { label: 'Teléfonos', color: 'var(--color-phone)' },
    password: { label: 'Contraseñas', color: 'var(--color-danger)' }
  };

  const webPercent = summary.totalRequests > 0 ? Math.round((summary.webRequests / summary.totalRequests) * 100) : 0;
  const apiPercent = summary.totalRequests > 0 ? Math.round((summary.apiRequests / summary.totalRequests) * 100) : 0;

  return (
    <div className="admin-container animate-fade-in">
      {/* Top Header */}
      <div className="admin-header">
        <div className="admin-title-area">
          <Activity size={24} className="pulse-icon" />
          <div>
            <h2>Admin Metrics Panel</h2>
            <p>Monitoreo en tiempo real de AnonData</p>
          </div>
        </div>
        <div className="admin-actions">
          <button type="button" className="btn-secondary btn-icon-only" onClick={handleRefresh} title="Actualizar datos">
            <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
          </button>
          <button type="button" className="btn-danger-outline" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="admin-stats-grid">
        <div className="stats-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Total Solicitudes</span>
            <Layers className="kpi-icon color-primary" size={20} />
          </div>
          <div className="kpi-value">{summary.totalRequests}</div>
          <div className="kpi-footer">Histórico acumulado</div>
        </div>

        <div className="stats-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Peticiones Web UI</span>
            <Globe className="kpi-icon color-success" size={20} />
          </div>
          <div className="kpi-value">{summary.webRequests}</div>
          <div className="kpi-footer">
            <span className="badge-percent">{webPercent}%</span> del tráfico total
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Peticiones API</span>
            <Cpu className="kpi-icon color-warning" size={20} />
          </div>
          <div className="kpi-value">{summary.apiRequests}</div>
          <div className="kpi-footer">
            <span className="badge-percent">{apiPercent}%</span> del tráfico total
          </div>
        </div>

        <div className="stats-kpi-card">
          <div className="kpi-header">
            <span className="kpi-title">Texto Anonimizado</span>
            <ShieldCheck className="kpi-icon color-info" size={20} />
          </div>
          <div className="kpi-value">{formatChars(summary.totalChars)}</div>
          <div className="kpi-footer">Caracteres procesados</div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="admin-charts-grid">
        {/* Timeline Line Chart */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h4>Volumen de Peticiones (Últimos 30 días)</h4>
            <span className="chart-badge">Línea de Actividad</span>
          </div>
          <div className="chart-wrapper">
            {timeline.length > 0 ? (
              <div style={{ position: 'relative' }}>
                <svg viewBox="0 0 600 140" className="timeline-svg">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="600" y2="20" stroke="var(--border-subtle)" strokeDasharray="3" />
                  <line x1="0" y1="65" x2="600" y2="65" stroke="var(--border-subtle)" strokeDasharray="3" />
                  <line x1="0" y1="110" x2="600" y2="110" stroke="var(--border-subtle)" strokeDasharray="3" />

                  {/* SVG Paths */}
                  {svgPaths.fillPath && <path d={svgPaths.fillPath} fill="url(#areaGrad)" />}
                  {svgPaths.linePath && <path d={svgPaths.linePath} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />}
                </svg>
                {/* Timeline X Axis */}
                <div className="timeline-x-axis">
                  <span>{timeline[0]?.date}</span>
                  <span>{timeline[Math.floor(timeline.length / 2)]?.date}</span>
                  <span>{timeline[timeline.length - 1]?.date}</span>
                </div>
              </div>
            ) : (
              <div className="chart-empty-state">No hay suficientes datos.</div>
            )}
          </div>
        </div>

        {/* Category Breakdown Progress List */}
        <div className="admin-chart-card">
          <div className="chart-card-header">
            <h4>Distribución de PII Detectada</h4>
            <span className="chart-badge">Total: {summary.totalDetections} ítems</span>
          </div>
          <div className="categories-list-wrapper">
            {Object.keys(categoryMeta).map((catId) => {
              const count = categoriesStats[catId] || 0;
              const meta = categoryMeta[catId];
              const pct = maxCategoryCount > 0 ? Math.round((count / maxCategoryCount) * 100) : 0;
              
              return (
                <div key={catId} className="category-stat-row">
                  <div className="row-info">
                    <span className="row-label">{meta.label}</span>
                    <span className="row-value">{count}</span>
                  </div>
                  <div className="row-bar-bg">
                    <div
                      className="row-bar-fill"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: meta.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Logs Feed Table */}
      <div className="admin-table-card">
        <div className="table-card-header">
          <h4>Registro de Solicitudes Recientes</h4>
          <span className="table-count-badge">Mostrando últimas 15</span>
        </div>
        <div className="table-wrapper">
          {recent.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Origen</th>
                  <th>Formato</th>
                  <th>Caracteres</th>
                  <th>Detecciones</th>
                  <th>Categorías Principales</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((log) => {
                  const catsUsed = Object.keys(log.categories_stats || {})
                    .filter((c) => log.categories_stats[c] > 0)
                    .map((c) => categoryMeta[c]?.label || c);

                  return (
                    <tr key={log.id}>
                      <td className="cell-time">{formatRelativeTime(log.created_at)}</td>
                      <td>
                        <span className={`badge-source ${log.source}`}>
                          {log.source.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge-format">
                          {log.file_type.toUpperCase()}
                        </span>
                      </td>
                      <td>{log.char_count}</td>
                      <td className="cell-bold">{log.detections_count}</td>
                      <td className="cell-muted">
                        {catsUsed.length > 0 ? catsUsed.join(', ') : 'Ninguna'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="table-empty-state">No se registran solicitudes aún.</div>
          )}
        </div>
      </div>
    </div>
  );
}
