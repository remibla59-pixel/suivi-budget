import React from 'react';
import { PRIORITIES, priorityOf } from '../../lib/budgetMeta';

export const PriorityBadge = ({ priority, className = '' }) => {
  const p = priorityOf(priority);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${p.badge} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  );
};

export const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p.id, label: p.label }));
