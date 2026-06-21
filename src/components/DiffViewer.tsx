import React, { useRef, useEffect } from 'react';
import { FileCode, HelpCircle } from 'lucide-react';
import { type DetectedEntity, type PIICategory } from '../utils/detector';
import { getFakeValue, getRedactedPlaceholder, sha256Sync } from '../utils/faker';

interface DiffViewerProps {
  fileName: string;
  originalText: string;
  findings: DetectedEntity[];
  rules: Record<PIICategory, 'redact' | 'hash' | 'fake' | 'keep'>;
}

const PREVIEW_LIMIT = 35000; // ~35KB for fluid performance

export const DiffViewer: React.FC<DiffViewerProps> = ({ 
  fileName, 
  originalText, 
  findings, 
  rules 
}) => {
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const scrollSourceRef = useRef<HTMLDivElement | null>(null);

  // Sync scroll positions between left and right pane
  useEffect(() => {
    const leftPane = leftPaneRef.current;
    const rightPane = rightPaneRef.current;

    if (!leftPane || !rightPane) return;

    const handleScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (scrollSourceRef.current && scrollSourceRef.current !== source) return;
      
      scrollSourceRef.current = source;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;

      // Clear source ref after a tiny timeout
      const clearSource = () => {
        if (scrollSourceRef.current === source) {
          scrollSourceRef.current = null;
        }
      };
      const timeoutId = setTimeout(clearSource, 50);
      return () => clearTimeout(timeoutId);
    };

    const onLeftScroll = () => handleScroll(leftPane, rightPane);
    const onRightScroll = () => handleScroll(rightPane, leftPane);

    leftPane.addEventListener('scroll', onLeftScroll);
    rightPane.addEventListener('scroll', onRightScroll);

    return () => {
      leftPane.removeEventListener('scroll', onLeftScroll);
      rightPane.removeEventListener('scroll', onRightScroll);
    };
  }, [originalText]);

  // Utility to get masked string
  const getMaskedValue = (category: PIICategory, value: string): string => {
    const action = rules[category];
    if (action === 'keep') return value;
    if (action === 'redact') return getRedactedPlaceholder(category);
    if (action === 'hash') return `sha256(${sha256Sync(value).slice(0, 8)})`;
    if (action === 'fake') return getFakeValue(category, value);
    return value;
  };

  // Truncate text for preview and adjust findings list
  const isTruncated = originalText.length > PREVIEW_LIMIT;
  const previewText = isTruncated ? originalText.slice(0, PREVIEW_LIMIT) : originalText;
  const activeFindings = findings.filter(f => f.end <= previewText.length);

  // Highlight original text
  const renderOriginalHighlighted = () => {
    if (activeFindings.length === 0) return previewText;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    activeFindings.forEach((finding, idx) => {
      // Non-overlapping check
      if (finding.start >= lastIndex) {
        // Text before the finding
        elements.push(previewText.slice(lastIndex, finding.start));
        // The finding itself
        elements.push(
          <span 
            key={`orig-${finding.id}-${idx}`}
            className="highlight-token"
            data-category={finding.category}
            title={`PII Detectado: ${finding.category.toUpperCase()}`}
          >
            {finding.value}
          </span>
        );
        lastIndex = finding.end;
      }
    });

    // Remainder text
    if (lastIndex < previewText.length) {
      elements.push(previewText.slice(lastIndex));
    }

    if (isTruncated) {
      elements.push(<span key="orig-trunc" style={{ color: 'var(--text-dim)' }}>\n\n[... TEXTO TRUNCADO EN VISTA PREVIA ...]</span>);
    }

    return elements;
  };

  // Highlight masked text
  const renderMaskedHighlighted = () => {
    if (activeFindings.length === 0) return previewText;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    activeFindings.forEach((finding, idx) => {
      // Non-overlapping check
      if (finding.start >= lastIndex) {
        // Text before the finding
        elements.push(previewText.slice(lastIndex, finding.start));
        // The masked replacement
        const masked = getMaskedValue(finding.category, finding.value);
        elements.push(
          <span 
            key={`masked-${finding.id}-${idx}`}
            className="highlight-token"
            data-category={finding.category}
            title={`Acción: ${rules[finding.category].toUpperCase()}`}
          >
            {masked}
          </span>
        );
        lastIndex = finding.end;
      }
    });

    // Remainder text
    if (lastIndex < previewText.length) {
      elements.push(previewText.slice(lastIndex));
    }

    if (isTruncated) {
      elements.push(<span key="mask-trunc" style={{ color: 'var(--text-dim)' }}>\n\n[... TEXTO TRUNCADO EN VISTA PREVIA ...]</span>);
    }

    return elements;
  };

  return (
    <div className="glass-panel editor-container">
      <div className="editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCode size={18} style={{ color: 'var(--color-primary)' }} />
          <span className="editor-title">Estudio de Comparación: <code>{fileName}</code></span>
        </div>
        {isTruncated && (
          <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <HelpCircle size={14} />
            Previsualización limitada por rendimiento (~35KB).
          </div>
        )}
      </div>

      <div className="diff-panes">
        <div className="pane">
          <div className="pane-header">
            <span>Datos Originales</span>
            <span className="brand-badge" style={{ textTransform: 'none' }}>Original</span>
          </div>
          <div className="pane-content" ref={leftPaneRef}>
            {renderOriginalHighlighted()}
          </div>
        </div>

        <div className="pane">
          <div className="pane-header">
            <span>Datos Anónimizados</span>
            <span className="brand-badge" style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)', textTransform: 'none' }}>Sanitizado</span>
          </div>
          <div className="pane-content" ref={rightPaneRef}>
            {renderMaskedHighlighted()}
          </div>
        </div>
      </div>
    </div>
  );
};
