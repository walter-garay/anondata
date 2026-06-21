import React from 'react';
import { PII_RULES, type PIICategory } from '../utils/detector';

interface RulesPanelProps {
  counts: Record<PIICategory, number>;
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>;
  onChangeRule: (category: PIICategory, action: 'redact' | 'hash' | 'fake' | 'keep') => void;
}

export const RulesPanel: React.FC<RulesPanelProps> = ({ counts, rules, onChangeRule }) => {
  return (
    <div className="rules-grid">
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
              <div className="rule-title-group">
                <span className="rule-dot" />
                <span className="rule-name">{rule.label}</span>
              </div>
              <span className={`rule-count ${count > 0 ? 'detected' : ''}`}>
                {count} {count === 1 ? 'encontrado' : 'encontrados'}
              </span>
            </div>
            
            <p className="rule-desc">{rule.description}</p>
            
            <div className="rule-selector-container">
              <select
                id={`rule-select-${rule.id}`}
                className="rule-select-dropdown"
                value={currentAction}
                onChange={(e) => onChangeRule(rule.id, e.target.value as any)}
                aria-label={`Acción para ${rule.label}`}
              >
                <option value="redact">Redactar (Enmascarar con etiqueta)</option>
                <option value="hash">Hashear (Cifrado SHA-256 parcial)</option>
                <option value="fake">Simular (Reemplazar con datos realistas ficticios)</option>
                <option value="keep">Ignorar (Mantener valor original)</option>
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
};
