import React from 'react';
import type { PIIType } from '../types';

const TYPE_ICONS: Record<PIIType, string> = {
  NAME: '👤',
  EMAIL: '📧',
  PHONE: '📞',
  ADDRESS: '📍',
  DATE_OF_BIRTH: '🎂',
  ID_NUMBER: '🪪',
  FINANCIAL: '💳',
  ORGANIZATION: '🏢',
  OTHER: '⚠️',
};

const TYPE_LABELS: Record<PIIType, string> = {
  NAME: 'Name',
  EMAIL: 'Email',
  PHONE: 'Phone',
  ADDRESS: 'Address',
  DATE_OF_BIRTH: 'Date of Birth',
  ID_NUMBER: 'ID Number',
  FINANCIAL: 'Financial',
  ORGANIZATION: 'Organization',
  OTHER: 'Other',
};

interface PIITypeBadgeProps {
  type: PIIType;
  showIcon?: boolean;
}

export const PIITypeBadge: React.FC<PIITypeBadgeProps> = ({ type, showIcon = true }) => (
  <span className={`span-card__type-badge type-${type}`}>
    {showIcon && <span>{TYPE_ICONS[type]}</span>}
    <span>{TYPE_LABELS[type]}</span>
  </span>
);

interface ConfidenceBarProps {
  value: number; // 0.0 - 1.0
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ value }) => {
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8
      ? 'var(--success)'
      : value >= 0.6
      ? 'var(--warning)'
      : 'var(--danger)';

  return (
    <div className="span-card__confidence">
      <div className="confidence-bar">
        <div
          className="confidence-bar__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="confidence-label" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};
