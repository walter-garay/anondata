import React from 'react';
import { Shield } from 'lucide-react';
import { PII_RULES, type PIICategory } from '../utils/detector';

interface RulesPanelProps {
  counts: Record<PIICategory, number>;
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>;
  onChangeRule: (category: PIICategory, action: 'redact' | 'hash' | 'fake' | 'keep') => void;
}

export const RulesPanel: React.FC<RulesPanelProps> = ({ counts, rules, onChangeRule }) => {
  const actions: ('redact' | 'hash' | 'fake' | 'keep')[] = ['redact', 'hash', 'fake', 'keep'];

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'redact': return 'Redactar';
      case 'hash': return 'Hashear';
      case 'fake': return 'Simular';
      case 'keep': return 'Ignorar';
      default: return action;
    }
  };

  return (
    <div className="glass-panel sidebar-panel">
      <h3 className="panel-title">
        <Shield size={18} className="text-success" />
        Reglas de Anónimización
      </h3>
      
      <div className="rules-list">
        {PII_RULES.map((rule) => {
          const count = counts[rule.id] || 0;
          const currentAction = rules[rule.id];
          
          return (
            <div 
              key={rule.id} 
              className="rule-card" 
              style={{ '--category-color': rule.color } as React.CSSProperties}
            >
              <div className="rule-header">
                <span className="rule-name">{rule.label}</span>
                <span className="rule-count">
                  {count} {count === 1 ? 'detectado' : 'detectados'}
                </span>
              </div>
              
              <p className="rule-desc">{rule.description}</p>
              
              <div className="rule-actions">
                {actions.map((act) => (
                  <button
                    key={act}
                    type="button"
                    className={`action-chip ${currentAction === act ? 'active' : ''}`}
                    onClick={() => onChangeRule(rule.id, act)}
                    title={`${getActionLabel(act)} data type ${rule.label}`}
                  >
                    {getActionLabel(act)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
