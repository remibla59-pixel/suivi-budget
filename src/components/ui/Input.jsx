import React from 'react';

export const Input = ({ label, icon: Icon, className = '', onFocus, onChange, value, ...props }) => {
  const handleFocus = (e) => {
    const val = e.target.value;
    if (val === '0' || (typeof val === 'string' && (val.includes('Nouveau') || val.includes('Nouvelle')))) {
      if (onChange) onChange({ target: { value: '' } });
    }
    if (onFocus) onFocus(e);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
            <Icon size={18} />
          </div>
        )}
        <input
          className={`
            w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 
            text-sm font-medium transition-all outline-none
            focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50
            placeholder:text-slate-400
            ${Icon ? 'pl-11' : ''}
          `}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          {...props}
        />
      </div>
    </div>
  );
};

export const Select = ({ label, options = [], className = '', ...props }) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 
          text-sm font-medium transition-all outline-none
          focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-50
          appearance-none
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
