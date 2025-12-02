import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full group">
      {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-emerald-500 transition-colors">{label}</label>}
      <div className="relative">
        <input
          className={`w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all shadow-inner ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
        {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                {icon}
            </div>
        )}
      </div>
    </div>
  );
};