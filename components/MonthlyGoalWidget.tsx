import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Settings2, Target, Check, TrendingUp, X } from 'lucide-react';
import { formatCurrency } from '../types';

interface MonthlyGoalWidgetProps {
  currentRevenue: number;
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  goalValue: number;
  onSetGoal: (value: number) => void;
}

// Minimalist Confetti Component
const ConfettiBurst = () => {
  // Generate particles with random trajectories
  const particles = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300, // Spread horizontal
    y: (Math.random() - 1) * 150,   // Spread upward mostly
    r: Math.random() * 360,
    scale: Math.random() * 0.5 + 0.5,
    color: ['#10b981', '#34d399', '#fbbf24', '#ffffff'][Math.floor(Math.random() * 4)],
    delay: Math.random() * 0.2
  }));

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 w-full h-full overflow-visible">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ 
            x: p.x, 
            y: p.y, 
            rotate: p.r, 
            opacity: 0, 
            scale: p.scale 
          }}
          transition={{ 
            duration: 1.2, 
            ease: "easeOut",
            delay: p.delay 
          }}
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-sm shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  )
}

export const MonthlyGoalWidget: React.FC<MonthlyGoalWidgetProps> = ({
  currentRevenue,
  currentDate,
  onPrevMonth,
  onNextMonth,
  goalValue,
  onSetGoal
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState(goalValue.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Celebration State
  const [showConfetti, setShowConfetti] = useState(false);
  // Track celebrated keys to ensure it only happens once per specific goal/month combo
  const celebratedKeys = useRef<Set<string>>(new Set());

  // Sync temp goal only when opening edit mode
  useEffect(() => {
    if (isEditing) {
      setTempGoal(goalValue.toString());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, goalValue]);

  // Updated: Removed the 100% cap on percentage
  const percentage = Math.max(0, (currentRevenue / (goalValue || 1)) * 100);
  
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate);

  // --- Celebration Logic ---
  useEffect(() => {
    if (percentage >= 100) {
        const monthKey = `${currentDate.getMonth()}-${currentDate.getFullYear()}`;
        const uniqueKey = `${monthKey}-goal-${goalValue}`;
        
        // Only celebrate if we haven't celebrated this specific goal for this month yet
        if (!celebratedKeys.current.has(uniqueKey)) {
            celebratedKeys.current.add(uniqueKey);
            
            // Small delay to let the bar fill up visually first
            const timer = setTimeout(() => {
                setShowConfetti(true);
                // Hide confetti after animation finishes
                setTimeout(() => setShowConfetti(false), 2000);
            }, 500);

            return () => clearTimeout(timer);
        }
    }
  }, [percentage, currentDate, goalValue]);

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault(); 
    const val = parseFloat(tempGoal);
    if (!isNaN(val) && val > 0) {
      onSetGoal(val);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setIsEditing(false);
  };

  // Visual logic
  const isTargetMet = percentage >= 100;
  const progressColor = isTargetMet ? 'bg-emerald-400' : percentage > 50 ? 'bg-emerald-500' : 'bg-amber-500';
  const glowColor = isTargetMet ? 'shadow-[0_0_20px_rgba(52,211,153,0.6)]' : 'shadow-[0_0_15px_rgba(16,185,129,0.2)]';

  return (
    <div className="w-full relative z-20">
      <div className="glass-card rounded-xl border border-white/10 bg-gradient-to-r from-slate-900/60 to-slate-900/40 shadow-xl backdrop-blur-xl relative overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Confetti Overlay */}
        <AnimatePresence>
            {showConfetti && <ConfettiBurst />}
        </AnimatePresence>

        {/* --- MAIN ROW --- */}
        <div className="p-1 pr-4 flex items-center gap-4 md:gap-6 w-full relative z-10">
            {/* Navigation & Label */}
            <div className="flex items-center bg-slate-950/50 rounded-lg p-1 border border-white/5 relative z-10 shrink-0">
                <button 
                    onClick={onPrevMonth}
                    className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                >
                    <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-200 w-32 text-center select-none capitalize">
                    {monthName}
                </span>
                <button 
                    onClick={onNextMonth}
                    className="p-1.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white transition-colors"
                >
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Progress Bar Area */}
            <div className="flex-1 flex flex-col justify-center py-2 relative z-10 min-w-0">
                <div className="flex justify-between items-end px-1 mb-1.5">
                    <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-md transition-colors duration-500 ${isTargetMet ? 'bg-emerald-500 text-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-800 text-slate-400'}`}>
                            <Target size={12} />
                        </div>
                        <div className="hidden sm:block">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-0.5">Meta Mensal</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={`text-sm font-bold tracking-tight transition-colors duration-500 ${isTargetMet ? 'text-emerald-400 text-glow' : 'text-slate-200'}`}>
                                    {formatCurrency(currentRevenue)}
                                </span>
                                <span className="text-[10px] text-slate-600 font-medium">de {formatCurrency(goalValue)}</span>
                            </div>
                        </div>
                    </div>
                    {/* Percentage Display - Shows real value > 100% */}
                    <span className={`text-xs font-black transition-colors duration-500 ${isTargetMet ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {percentage.toFixed(1)}%
                    </span>
                </div>
                
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden relative shadow-inner border border-white/5">
                    {/* Stripe Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDNoMXYxSDF6IiBmaWxsPSIjZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')]"></div>
                    
                    {/* Progress Fill - Visual Capped at 100% width to prevent UI breakage */}
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, percentage)}%` }}
                        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                        className={`h-full rounded-full relative overflow-hidden transition-colors duration-500 ${progressColor} ${glowColor}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full -translate-x-full animate-[shimmer_2s_infinite]"></div>
                    </motion.div>
                </div>
            </div>

            {/* Config Button Toggle */}
            <div className="relative z-10 shrink-0">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                    className={`p-2.5 rounded-xl transition-all border ${isEditing ? 'bg-emerald-500 text-slate-900 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30'}`}
                >
                    {isEditing ? <X size={18} /> : <Settings2 size={18} />}
                </button>
            </div>
        </div>

        {/* --- EXPANDABLE SETTINGS ROW --- */}
        <AnimatePresence>
            {isEditing && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#0b1121]/50 border-t border-white/5"
                >
                    <div className="p-4 flex flex-col md:flex-row items-center gap-6 justify-between">
                        <div className="flex items-center gap-3">
                             <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                                <TrendingUp size={18} />
                             </div>
                             <div>
                                <h4 className="text-sm font-bold text-slate-200">Configurar Meta Mensal</h4>
                                <p className="text-[10px] text-slate-500">Define o objetivo de <strong className="text-slate-400">Faturamento Líquido</strong> para {monthName}.</p>
                             </div>
                        </div>
                        
                        <div className="flex items-end gap-2 w-full md:w-auto">
                            <div className="w-full md:w-48">
                                <label className="text-[9px] text-slate-500 font-bold uppercase mb-1 block">Valor Alvo (R$)</label>
                                <div className="relative">
                                    <input 
                                        ref={inputRef}
                                        type="number"
                                        value={tempGoal}
                                        onChange={(e) => setTempGoal(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder-slate-700"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => handleSave()}
                                className="bg-emerald-500 text-slate-950 rounded-lg h-[38px] px-4 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-900/20 flex items-center justify-center font-bold text-xs uppercase tracking-wide gap-1"
                            >
                                <Check size={14} /> Salvar
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

      </div>
    </div>
  );
};