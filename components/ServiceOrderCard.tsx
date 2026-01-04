import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Truck,
    Clock,
    Users,
    Hammer,
    Box,
    FileText,
    MapPin,
    TrendingDown,
    Wallet,
    MoreHorizontal,
    CheckCircle2,
    Ban,
    Phone,
    ShieldCheck,
    FileSignature,
    Globe,
    Circle
} from 'lucide-react';
import { ServiceOrder, formatCurrency, calculateProfit, calculateCosts, ViewMode } from '../types';
import { InventoryGenerator } from './InventoryGenerator';

interface ServiceOrderCardProps {
    order: ServiceOrder;
    onClick: (order: ServiceOrder) => void;
    isDimmed?: boolean;
    onHover?: () => void;
    onLeave?: () => void;
    viewMode?: ViewMode;
}

// --- Helpers ---

const smartFormatText = (text: string): string => {
    if (!text) return "Nenhuma observação registrada.";
    let formatted = text.replace(/\s+/g, ' ').trim();
    formatted = formatted.replace(/\s([.,!?:;])/g, '$1');
    formatted = formatted.replace(/([.,!?:;])(?=[a-zA-Z])/g, '$1 ');
    formatted = formatted.replace(/(^\w|[.!?]\s*\w)/g, (c) => c.toUpperCase());
    if (!/[.!?]$/.test(formatted)) formatted += '.';
    return formatted;
};

const CountdownTimer = ({ targetDate, compact = false }: { targetDate: string, compact?: boolean }) => {
    const [status, setStatus] = useState<'normal' | 'warning' | 'critical' | 'late'>('normal');
    const [label, setLabel] = useState('');

    useEffect(() => {
        const calculate = () => {
            const now = new Date();
            const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
            const [y, m, d] = targetDate.split('-').map(Number);
            const targetMidnight = new Date(y, m - 1, d).getTime();
            const diff = Math.ceil((targetMidnight - nowMidnight) / (1000 * 60 * 60 * 24));

            if (diff < 0) { setStatus('late'); setLabel(`${Math.abs(diff)}d Atraso`); }
            else if (diff === 0) { setStatus('critical'); setLabel('Hoje'); }
            else if (diff <= 5) { setStatus('critical'); setLabel(`${diff} dias`); }
            else if (diff <= 10) { setStatus('warning'); setLabel(`${diff} dias`); }
            else { setStatus('normal'); setLabel(`${diff} dias`); }
        };
        calculate();
    }, [targetDate]);

    const styles = {
        normal: 'bg-slate-800 text-slate-400 border-slate-700',
        warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse',
        late: 'bg-rose-600 text-white border-rose-500 shadow-[0_0_10px_rgba(225,29,72,0.4)]',
    };

    return (
        <div className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 ${styles[status]}`}>
            {!compact && <Clock size={10} />}
            <span className="text-[10px] font-bold uppercase tracking-wide whitespace-nowrap">{label}</span>
        </div>
    );
};

// --- NEW VISUAL COMPONENTS ---

const NeonStatusIcon = ({ active, icon: Icon, label, color }: { active: boolean, icon: any, label: string, color: 'emerald' | 'blue' }) => {
    const activeClass = color === 'emerald'
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
        : 'text-blue-400 bg-blue-500/10 border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.25)]';

    const inactiveClass = 'text-slate-600 bg-slate-900/50 border-white/5 grayscale';

    return (
        <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-300 ${active ? activeClass : inactiveClass}`} title={label}>
            <Icon size={14} className={active ? 'animate-pulse' : ''} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? '' : 'text-slate-600'}`}>
                {label}
            </span>
            {!active && <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 ml-1" />}
            {active && <CheckCircle2 size={10} />}
        </div>
    );
};

const OrderTimeline = ({ progress }: { progress: number }) => {
    // Stages: 20% (Reserva), 60% (Coleta), 100% (Entrega)
    const steps = [
        { pct: 20, label: 'Reserva' },
        { pct: 60, label: 'Coleta' },
        { pct: 100, label: 'Entrega' }
    ];

    return (
        <div className="w-full mt-2">
            <div className="relative">
                {/* Background Line */}
                <div className="absolute top-1.5 left-0 w-full h-0.5 bg-slate-800 rounded-full"></div>

                {/* Active Progress Line */}
                <div
                    className="absolute top-1.5 left-0 h-0.5 bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse"></div>
                </div>

                {/* Steps Points */}
                <div className="relative flex justify-between w-full">
                    {steps.map((step) => {
                        const isCompleted = progress >= step.pct;
                        const isCurrent = progress === step.pct; // Simple exact check, logically >= works too

                        return (
                            <div key={step.label} className="flex flex-col items-center gap-1.5 group">
                                <div
                                    className={`
                                        w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all duration-500 z-10
                                        ${isCompleted
                                            ? 'bg-slate-900 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                                            : 'bg-slate-900 border-slate-700'
                                        }
                                    `}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-400' : 'bg-transparent'}`} />
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors ${isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}>
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const ServiceIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'helper': return <Users size={12} />;
        case 'assembler': return <Hammer size={12} />;
        case 'packer': return <Box size={12} />;
        default: return <Truck size={12} />;
    }
};

// --- Financial Block Component (Reusable) ---
const FinancialSummaryBlock = ({ profit, totalValue, costs }: { profit: number, totalValue: number, costs: number }) => {
    const isProfitPositive = profit >= 0;
    return (
        <div className="bg-slate-950/40 rounded-xl border border-white/5 p-3 flex flex-col gap-2 relative overflow-hidden">
            {/* Ambient Glow */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[50px] opacity-10 pointer-events-none ${isProfitPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />

            {/* Row 1: Revenue */}
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider">Faturamento</span>
                <span className="text-slate-200 font-mono font-medium">{formatCurrency(totalValue)}</span>
            </div>

            {/* Row 2: Costs (Grouped) */}
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-rose-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingDown size={10} /> Custos Ops.
                </span>
                <span className="text-rose-400/90 font-mono font-medium drop-shadow-[0_0_8px_rgba(244,63,94,0.25)]">
                    - {formatCurrency(costs)}
                </span>
            </div>

            {/* Separator */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-0.5"></div>

            {/* Row 3: Profit Highlight */}
            <div className="flex justify-between items-end">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isProfitPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                    Lucro Líquido
                </span>
                <span className={`text-lg font-black tracking-tight ${isProfitPositive ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.5)]' : 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.5)]'}`}>
                    {formatCurrency(profit)}
                </span>
            </div>
        </div>
    );
};

// --- MEGA OVERLAY CONTENT COMPONENT ---
const MegaOverlayContent = ({
    order,
    profit,
    totalValue,
    costs,
    onClose,
    onOpenInventory
}: {
    order: ServiceOrder,
    profit: number,
    totalValue: number,
    costs: number,
    onClose: () => void,
    onOpenInventory: () => void
}) => {

    // Helper sub-component
    const StatusItem = ({ active, label }: { active: boolean, label: string }) => (
        <div className={`flex items-center justify-between p-2 rounded-lg border ${active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-white/5'}`}>
            <span className={`text-xs font-bold ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</span>
            {active ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Ban size={16} className="text-slate-600" />}
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
            onClick={onClose} // Click backdrop to close
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

            {/* The Mega Card */}
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className="relative z-10 w-full max-w-5xl bg-[#0b1121] border border-white/10 rounded-3xl shadow-[0_0_100px_-20px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()} // Prevent close on card click
            >
                {/* Glowing Top Border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-violet-500 to-emerald-500 opacity-50"></div>

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{order.id}</span>
                            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{order.clientName}</h2>
                        {order.whatsapp && (
                            <div className="flex items-center gap-2 mt-1 text-slate-400 text-sm">
                                <Phone size={14} />
                                <span>{order.whatsapp}</span>
                            </div>
                        )}
                    </div>

                    {/* Big KPI Top Right */}
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado Líquido</p>
                        <div className={`text-4xl font-black ${profit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'text-rose-500'}`}>
                            {formatCurrency(profit)}
                        </div>
                        <button
                            onClick={onOpenInventory}
                            className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 justify-end ml-auto"
                        >
                            <FileText size={12} /> Gerar Inventário
                        </button>
                    </div>
                </div>

                {/* Content Grid - 3 Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 flex-1 overflow-y-auto custom-scrollbar p-8 gap-8 bg-gradient-to-b from-[#0b1121] to-[#020617]">

                    {/* Col 1: Financial Deep Dive */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                            <Wallet size={16} /> Raio-X Financeiro
                        </h3>

                        <div className="space-y-4">
                            <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                <span className="text-slate-300 font-bold text-sm">Valor Cobrado</span>
                                <span className="text-xl font-bold text-white">{formatCurrency(totalValue)}</span>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-rose-400 uppercase">Detalhamento de Custos</p>
                                <div className="bg-slate-900/40 rounded-xl border border-white/5 p-4 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400 flex items-center gap-2"><Truck size={14} /> Motorista</span>
                                        <span className="text-rose-400 font-bold">- {formatCurrency(order.financials.driverCost)}</span>
                                    </div>
                                    {order.financials.extras.map((ex, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-slate-400 flex items-center gap-2">
                                                <ServiceIcon type={ex.type} />
                                                {ex.qty}x {ex.name}
                                            </span>
                                            <span className="text-rose-400/80">- {formatCurrency(ex.qty * ex.cost)}</span>
                                        </div>
                                    ))}
                                    <div className="h-px bg-white/5 my-2"></div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-200 font-bold">Total Despesas</span>
                                        <span className="text-rose-500 font-bold">- {formatCurrency(costs)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Col 2: Logistics & Timeline */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-violet-500 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                            <MapPin size={16} /> Logística
                        </h3>

                        <div className="relative pl-6 space-y-10 border-l border-slate-800 ml-2">
                            {/* Origin */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0b1121] border-2 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                                <p className="text-xs font-bold text-emerald-500 uppercase mb-1">Origem • {new Date(order.pickupDate).toLocaleDateString()}</p>
                                <p className="text-lg text-white font-medium leading-snug">{order.origin}</p>
                            </div>

                            {/* Destination */}
                            <div className="relative">
                                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-[#0b1121] border-2 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"></div>
                                <p className="text-xs font-bold text-violet-500 uppercase mb-1">Destino • {new Date(order.deliveryForecast).toLocaleDateString()}</p>
                                <p className="text-lg text-white font-medium leading-snug">{order.destination}</p>
                            </div>
                        </div>

                        <div className="bg-slate-900/40 p-5 rounded-xl border border-white/5 mt-6">
                            <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-4">
                                <span>Timeline da Mudança</span>
                                <span className="text-emerald-400">{order.progress}%</span>
                            </div>
                            <OrderTimeline progress={order.progress} />
                        </div>
                    </div>

                    {/* Col 3: Status & Meta */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-blue-500 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                            <ShieldCheck size={16} /> Conformidade
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            <StatusItem active={order.isContractSigned} label="Contrato Assinado" />
                            <StatusItem active={order.isPostedFretebras} label="Anúncio Fretebras" />
                            <StatusItem active={order.isCostsPaid} label="Custos Pagos" />
                        </div>

                        <div className="space-y-2 mt-4">
                            <p className="text-xs font-bold text-slate-500 uppercase">Recebimentos do Cliente</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className={`p-2 rounded text-center border ${order.paymentStatus.deposit ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-600'}`}>
                                    <span className="text-[10px] font-bold block">SINAL</span>
                                    <span className="text-xs">20%</span>
                                </div>
                                <div className={`p-2 rounded text-center border ${order.paymentStatus.pickup ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-600'}`}>
                                    <span className="text-[10px] font-bold block">COLETA</span>
                                    <span className="text-xs">40%</span>
                                </div>
                                <div className={`p-2 rounded text-center border ${order.paymentStatus.delivery ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-600'}`}>
                                    <span className="text-[10px] font-bold block">ENTREGA</span>
                                    <span className="text-xs">40%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                {/* Footer Notes */}
                {order.notes && order.notes.length > 0 && (
                    <div className="p-6 bg-[#050a15] border-t border-white/5 flex items-start gap-4">
                        <FileText className="text-slate-500 shrink-0 mt-1" size={20} />
                        <div className="w-full">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Observações da Ordem</p>
                            <div className="grid gap-2">
                                {order.notes.map((note: any, idx: number) => (
                                    <div key={idx} className="p-3 rounded-lg border border-white/5 bg-slate-900/50 text-sm text-slate-300 leading-relaxed" style={{ borderLeft: `3px solid ${note.color || '#334155'}` }}>
                                        {note.content}
                                        <div className="mt-1 text-[10px] text-slate-600 font-mono text-right">
                                            {new Date(note.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

// --- Main Component ---

export const ServiceOrderCard: React.FC<ServiceOrderCardProps> = ({
    order,
    onClick,
    isDimmed = false,
    onHover,
    onLeave,
    viewMode = 'default'
}) => {
    const [showNotes, setShowNotes] = useState(false);
    const [showInventory, setShowInventory] = useState(false);
    const [isLongHovered, setIsLongHovered] = useState(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Math
    const profit = calculateProfit(order.financials);
    const costs = calculateCosts(order.financials);
    const totalValue = order.financials.totalValue;

    // View Modes
    const isExpanded = viewMode === 'expanded';
    const isList = viewMode === 'list';
    const isCompact = viewMode === 'compact';
    const isGrid = viewMode === 'grid';
    const isDefault = viewMode === 'default';

    // Hover Logic (1.5 seconds)
    const handleMouseEnter = () => {
        onHover?.();
        hoverTimerRef.current = setTimeout(() => {
            setIsLongHovered(true);
        }, 1500);
    };

    const handleMouseLeave = () => {
        onLeave?.();
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        // Note: We do NOT clear isLongHovered here immediately.
        // It must stay open until explicitly closed via backdrop click.
    };

    // Close the detailed overlay
    const closeDetailOverlay = () => {
        setIsLongHovered(false);
    };

    // Styles
    const cardBaseClasses = `
    relative w-full overflow-hidden transition-all duration-500 ease-out 
    border backdrop-blur-xl group cursor-pointer
    ${isExpanded ? 'rounded-2xl' : 'rounded-xl'}
    ${isDimmed
            ? 'bg-slate-950/40 border-white/5 opacity-40 scale-[0.99] grayscale-[0.8]'
            : 'bg-gradient-to-br from-slate-900/90 via-[#0f172a]/90 to-[#0b1121]/90 border-white/10 hover:border-emerald-500/30 hover:shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]'
        }
  `;

    const noteColor = order.noteTags?.startsWith('#') ? order.noteTags : '#64748b';

    return (
        <>
            <motion.div
                layoutId={order.id}
                layout
                className={cardBaseClasses}
                onClick={() => onClick(order)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {/* Glow Effect on Hover */}
                {!isDimmed && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                )}

                {/* --- NOTES OVERLAY (Click Action - Internal to card) --- */}
                <AnimatePresence>
                    {showNotes && (
                        <motion.div
                            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
                            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                            onClick={(e) => { e.stopPropagation(); setShowNotes(false); }}
                            className="absolute inset-0 z-50 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center"
                        >
                            {/* Neon Tag Indicator */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: 64 }}
                                className="h-1.5 rounded-full mb-6 shadow-[0_0_20px_currentColor]"
                                style={{ backgroundColor: noteColor, color: noteColor }}
                            />

                            <div className="space-y-3 max-w-lg w-full">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    Notas do Operador
                                </span>
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2 text-left w-full">
                                    {order.notes && order.notes.length > 0 ? (
                                        order.notes.map((note: any, idx: number) => (
                                            <div key={idx} className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm" style={{ borderLeft: `4px solid ${note.color || '#334155'}` }}>
                                                <p className="text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                                <p className="text-[10px] text-slate-500 mt-2 text-right font-mono">{new Date(note.createdAt || Date.now()).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-slate-500 italic text-center py-4">Nenhuma observação registrada.</p>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setShowNotes(false); }}
                                className="mt-8 px-6 py-2 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                            >
                                <span className="group-hover:text-emerald-400 transition-colors">Fechar</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- EXPANDED MODE (The "Hero" View) --- */}
                {isExpanded && (
                    <div className="flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-white/5">{order.id}</span>
                                {/* Updated Neon Indicators */}
                                <div className="flex gap-2">
                                    <NeonStatusIcon
                                        active={order.isContractSigned}
                                        icon={FileSignature}
                                        label="Contrato"
                                        color="emerald"
                                    />
                                    <NeonStatusIcon
                                        active={order.isPostedFretebras}
                                        icon={Globe}
                                        label="Fretebras"
                                        color="blue"
                                    />
                                </div>
                            </div>
                            <CountdownTimer targetDate={order.pickupDate} />
                        </div>

                        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-7 space-y-6">
                                <div>
                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Cliente</p>
                                    <h3 className="text-2xl font-bold text-white leading-tight break-words whitespace-normal">{order.clientName}</h3>
                                </div>
                                <div className="relative pl-4 border-l-2 border-slate-800 space-y-8">
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Coleta</p>
                                        <p className="text-base text-slate-200 font-medium break-words whitespace-normal">{order.origin}</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-900 border-2 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]"></div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Entrega</p>
                                        <p className="text-base text-slate-200 font-medium break-words whitespace-normal">{order.destination}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-5 flex flex-col gap-4">
                                <FinancialSummaryBlock profit={profit} totalValue={totalValue} costs={costs} />

                                <div className="bg-slate-900/50 rounded-xl p-4 border border-white/5 mt-auto">
                                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 mb-2">
                                        <span>Status em Tempo Real</span>
                                        <span className="text-emerald-400">{order.progress}%</span>
                                    </div>
                                    <OrderTimeline progress={order.progress} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DEFAULT MODE (Horizontal "Ticket" View) --- */}
                {isDefault && (
                    <div className="flex flex-col">
                        <div className="flex flex-col lg:flex-row h-full relative z-10">
                            <div className="flex-1 p-5 flex flex-col justify-between gap-4 border-b lg:border-b-0 lg:border-r border-white/5 relative">
                                <div className="absolute left-0 top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500 to-slate-800 rounded-r-full opacity-50"></div>

                                {/* Top Row: ID + Status + Countdown */}
                                <div className="pl-4 flex flex-wrap items-center gap-3 mb-1">
                                    <span className="font-mono text-[9px] text-slate-500">{order.id}</span>
                                    <div className="flex gap-2 scale-90 origin-left">
                                        <NeonStatusIcon
                                            active={order.isContractSigned}
                                            icon={FileSignature}
                                            label="Contrato"
                                            color="emerald"
                                        />
                                        <NeonStatusIcon
                                            active={order.isPostedFretebras}
                                            icon={Globe}
                                            label="Web"
                                            color="blue"
                                        />
                                    </div>
                                    <div className="ml-auto">
                                        <CountdownTimer targetDate={order.pickupDate} />
                                    </div>
                                </div>

                                <div className="pl-4">
                                    <h3 className="text-xl font-bold text-white mb-3 leading-tight break-words whitespace-normal group-hover:text-emerald-400 transition-colors">
                                        {order.clientName}
                                    </h3>

                                    {/* Timeline Replacement */}
                                    <div className="pr-4 mb-2">
                                        <OrderTimeline progress={order.progress} />
                                    </div>

                                    <div className="space-y-1 mt-4">
                                        <p className="text-xs text-slate-300 truncate w-full"><span className="text-emerald-500 font-bold">•</span> {order.origin}</p>
                                        <p className="text-xs text-slate-300 truncate w-full"><span className="text-violet-500 font-bold">•</span> {order.destination}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full lg:w-64 p-5 bg-gradient-to-l from-emerald-900/5 to-transparent flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/5">
                                <FinancialSummaryBlock profit={profit} totalValue={totalValue} costs={costs} />
                            </div>
                        </div>
                    </div>
                )}

                {/* --- GRID MODE --- */}
                {isGrid && (
                    <div className="flex flex-col h-full">
                        <div className="p-5 gap-5 flex flex-col relative z-10">
                            <div className="flex justify-between items-start">
                                <span className="font-mono text-[9px] text-slate-500">{order.id}</span>
                                <CountdownTimer targetDate={order.pickupDate} compact />
                            </div>
                            <h3 className="text-lg font-bold text-white leading-tight break-words whitespace-normal mb-2">{order.clientName}</h3>

                            <div className="mt-auto pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center text-[10px] mb-1">
                                    <span className="text-slate-500">Custos Ops.</span>
                                    <span className="text-rose-400 font-bold">-{formatCurrency(costs)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-[9px] font-bold uppercase text-slate-500">Lucro</div>
                                    <div className={`text-lg font-black drop-shadow-[0_0_8px_rgba(0,0,0,0.5)] ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(profit)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- COMPACT MODE --- */}
                {isCompact && (
                    <div className="flex flex-col h-full">
                        <div className="p-4 gap-3 flex flex-col relative z-10">
                            <div className="flex justify-between items-start">
                                <h3 className="text-sm font-bold text-white break-words whitespace-normal">{order.clientName}</h3>
                                <CountdownTimer targetDate={order.pickupDate} compact />
                            </div>
                            <div className="mt-auto pt-2 border-t border-white/5 flex justify-between items-center">
                                <div className={`text-xs font-black ${profit >= 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.4)]' : 'text-rose-400'}`}>{formatCurrency(profit)}</div>
                                <div className="text-[9px] text-rose-400/80 font-mono">-{formatCurrency(costs)}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- LIST MODE --- */}
                {isList && (
                    <div className="flex items-center gap-4 p-3 h-16">
                        <div className="w-1 h-8 rounded-full bg-slate-700" style={{ backgroundColor: profit >= 0 ? '#10b981' : '#f43f5e' }}></div>
                        <span className="font-mono text-[10px] text-slate-500 w-16 shrink-0">{order.id}</span>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white truncate">{order.clientName}</h3>
                        </div>
                        {/* Status Icons in List */}
                        <div className="hidden md:flex gap-2">
                            {order.isContractSigned && <FileSignature size={14} className="text-emerald-500" />}
                            {order.isPostedFretebras && <Globe size={14} className="text-blue-500" />}
                        </div>
                        <div className="hidden sm:flex flex-col items-end shrink-0 w-32">
                            <span className={`text-sm font-black ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(profit)}</span>
                            <span className="text-[9px] text-rose-500/80">Custos: {formatCurrency(costs)}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowNotes(true); }} className="p-2 text-slate-600 hover:text-white"><MoreHorizontal size={16} /></button>
                    </div>
                )}
            </motion.div>

            {/* --- THE MEGA OVERLAY (RENDERED VIA PORTAL TO BODY) --- */}
            {createPortal(
                <AnimatePresence>
                    {isLongHovered && (
                        <MegaOverlayContent
                            order={order}
                            profit={profit}
                            totalValue={totalValue}
                            costs={costs}
                            onClose={closeDetailOverlay}
                            onOpenInventory={() => setShowInventory(true)}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* --- INVENTORY GENERATOR PORTAL --- */}
            {createPortal(
                <InventoryGenerator
                    isOpen={showInventory}
                    onClose={() => setShowInventory(false)}
                    initialData={order}
                />,
                document.body
            )}
        </>
    );
};