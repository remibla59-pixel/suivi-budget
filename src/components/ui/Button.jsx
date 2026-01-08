import React from 'react';

const variants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  outline: 'bg-transparent text-slate-600 border border-slate-200 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
  dark: 'bg-slate-900 text-white hover:bg-black shadow-slate-200',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-4 text-base',
  icon: 'p-2',
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  icon: Icon, 
  loading = false,
  disabled = false,
  ...props 
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all 
        active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-sm
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
