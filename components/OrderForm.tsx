import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, DollarSign, Calculator, Save, User, Truck, MapPin, Package, Users, Hammer, Box, Briefcase, FileText, CheckCircle2, Wallet, Phone, ExternalLink, PaintBucket, TrendingUp, Printer } from 'lucide-react';
import { ServiceOrder, ExtraService, ProgressStage, formatCurrency, ServiceType, NoteColor } from '../types';
import { Input } from './ui/Input';
import { PdfExportModal } from './PdfExportModal';
import { InventoryGenerator } from './InventoryGenerator';
import { createPortal } from 'react-dom';

interface OrderFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (order: ServiceOrder) => void;
    onDelete: (id: string) => void;
    initialData?: ServiceOrder | null;
}

const emptyOrder: Omit<ServiceOrder, 'id' | 'createdAt'> = {
    clientName: '',
    whatsapp: '',
    origin: '',
    destination: '',
    isContractSigned: false,
    isPostedFretebras: false,
    paymentStatus: {
        deposit: false,
        pickup: false,
        delivery: false
    },
    isCostsPaid: false,
    progress: 20,
    financials: {
        totalValue: 0,
        driverCost: 0,
        extras: []
    },
    pickupDate: '',
    deliveryForecast: '',
    notes: [],
    noteTags: '#334155' // Default slate-700 hex equivalent
};

// Default structures for specific roles - Default Costs set to 0 as requested
const ROLE_CONFIGS = [
    { type: 'helper', label: 'Ajudantes', icon: <Users size={16} />, defaultCost: 0 },
    { type: 'assembler', label: 'Montadores', icon: <Hammer size={16} />, defaultCost: 0 },
    { type: 'packer', label: 'Embaladores', icon: <Box size={16} />, defaultCost: 0 },
];

const cleanPhone = (phone: string) => phone.replace(/\D/g, '');

const NoteColorPicker = ({ selected, onSelect }: { selected: NoteColor, onSelect: (c: NoteColor) => void }) => {
    // Strong Neon Presets
    const colors = [
        { hex: '#334155', label: 'Slate' }, // Default
        { hex: '#ef4444', label: 'Red' },   // Strong Red
        { hex: '#f59e0b', label: 'Amber' }, // Strong Amber
        { hex: '#10b981', label: 'Green' }, // Strong Emerald
        { hex: '#3b82f6', label: 'Blue' },  // Strong Blue
        { hex: '#8b5cf6', label: 'Purple' },// Strong Purple
        { hex: '#ec4899', label: 'Pink' },  // Strong Pink
    ];

    return (
        <div className="flex items-center gap-2">
            {colors.map(c => (
                <button
                    key={c.hex}
                    type="button"
                    onClick={() => onSelect(c.hex)}
                    className="w-6 h-6 rounded-full transition-all border border-white/10"
                    style={{
                        backgroundColor: c.hex,
                        transform: selected === c.hex ? 'scale(1.2)' : 'scale(1)',
                        boxShadow: selected === c.hex ? `0 0 10px ${c.hex}` : 'none'
                    }}
                    title={c.label}
                />
            ))}

            {/* Custom Color Input */}
            <div className="relative group ml-2">
                <input
                    type="color"
                    value={selected.startsWith('#') ? selected : '#000000'}
                    onChange={(e) => onSelect(e.target.value)}
                    className="w-8 h-8 opacity-0 absolute inset-0 cursor-pointer z-10"
                />
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white via-transparent to-black border border-white/20 flex items-center justify-center">
                    <PaintBucket size={14} className="text-white" />
                </div>
            </div>
        </div>
    )
}

export const OrderForm: React.FC<OrderFormProps> = ({ isOpen, onClose, onSubmit, onDelete, initialData }) => {
    const [formData, setFormData] = useState<any>(emptyOrder);
    const [extras, setExtras] = useState<ExtraService[]>([]);
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [showInventory, setShowInventory] = useState(false);

    // Initialize form state
    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
            setExtras(initialData.financials.extras);
        } else {
            setFormData(emptyOrder);
            setExtras([]);
        }
    }, [initialData, isOpen]);

    // --- Automatic Progress Sync Logic ---
    useEffect(() => {
        const calculateProgress = (): ProgressStage => {
            if (formData.paymentStatus.delivery) return 100;
            if (formData.paymentStatus.pickup) return 60;
            if (formData.paymentStatus.deposit) return 20;
            return 0 as any; // Pending/Lead
        };

        const newProgress = calculateProgress();
        if (formData.progress !== newProgress) {
            setFormData((prev: any) => ({ ...prev, progress: newProgress }));
        }
    }, [formData.paymentStatus]);

    // --- Specialized Operational Logic ---
    const getRoleData = (type: ServiceType) => {
        const items = extras.filter(e => e.type === type);
        const totalQty = items.reduce((acc, curr) => acc + curr.qty, 0);
        const unitCost = items.length > 0 ? items[0].cost : ROLE_CONFIGS.find(r => r.type === type)?.defaultCost || 0;
        return { totalQty, unitCost };
    };

    const updateRole = (type: ServiceType, field: 'qty' | 'cost', value: number) => {
        const safeValue = Math.max(0, value);
        const config = ROLE_CONFIGS.find(c => c.type === type);
        const otherExtras = extras.filter(e => e.type !== type);
        const currentData = getRoleData(type);
        let newQty = field === 'qty' ? safeValue : currentData.totalQty;
        let newCost = field === 'cost' ? safeValue : currentData.unitCost;

        // Se quantidade OU custo forem maiores que zero, mantemos o item.
        // Isso permite digitar o custo antes da quantidade.
        if (newQty > 0 || newCost > 0) {
            const newEntry: ExtraService = {
                id: `auto-${type}-${Date.now()}`,
                type: type as ServiceType,
                name: config?.label || type,
                qty: newQty,
                cost: newCost
            };
            setExtras([...otherExtras, newEntry]);
        } else {
            // Se ambos forem zero, removemos o item para limpar
            setExtras(otherExtras);
        }
    };

    const addGenericExtra = () => {
        const newExtra: ExtraService = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'other',
            name: '',
            qty: 1,
            cost: 0
        };
        setExtras([...extras, newExtra]);
    };

    const updateGenericExtra = (id: string, field: keyof ExtraService, value: any) => {
        let safeValue = value;
        if (field === 'cost' || field === 'qty') {
            safeValue = Math.max(0, Number(value));
        }
        setExtras(prev => prev.map(e => e.id === id ? { ...e, [field]: safeValue } : e));
    };

    const removeGenericExtra = (id: string) => {
        setExtras(extras.filter(e => e.id !== id));
    };

    const currentTotal = formData.financials.totalValue || 0;
    const currentDriver = formData.financials.driverCost || 0;
    const currentExtrasCost = extras.reduce((acc, curr) => acc + (curr.cost * curr.qty), 0);
    const currentCosts = currentDriver + currentExtrasCost;
    const currentProfit = currentTotal - currentCosts;
    const isProfitPositive = currentProfit >= 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalOrder: ServiceOrder = {
            ...formData,
            id: formData.id || `OS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
            createdAt: formData.createdAt || new Date().toISOString(),
            financials: {
                ...formData.financials,
                extras: extras
            }
        };
        onSubmit(finalOrder);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40"
                    />

                    <motion.div
                        initial={{ x: '100%', opacity: 0.5, scaleX: 0.98 }}
                        animate={{ x: 0, opacity: 1, scaleX: 1 }}
                        exit={{ x: '100%', opacity: 0, scaleX: 0.98 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 1 }}
                        className="fixed right-0 top-0 h-full w-full max-w-3xl bg-slate-900 border-l border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col origin-right"
                    >
                        {/* Form Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-slate-950 uppercase tracking-wide">
                                            {initialData ? 'Edição' : 'Cadastro'}
                                        </span>
                                        <span className="text-xs text-slate-500 font-mono">{initialData?.id || 'NOVA OS'}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight">
                                        Detalhes da Ordem
                                    </h2>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {initialData && (
                                    <button
                                        onClick={() => setIsPdfModalOpen(true)}
                                        className="p-2.5 rounded-full bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white hover:bg-emerald-500 hover:border-emerald-400 transition-all group"
                                        title="Gerar PDF da Equipe"
                                    >
                                        <Printer size={20} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">

                            {/* SECTION 1: Client & Identity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-emerald-500 mb-1 border-b border-white/5 pb-2">
                                        <User size={18} />
                                        <h3 className="text-sm font-bold uppercase tracking-widest">Cliente</h3>
                                    </div>
                                    <Input
                                        label="Nome Completo"
                                        value={formData.clientName}
                                        onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                        required
                                        placeholder="Ex: João da Silva"
                                    />
                                    <div className="relative flex items-end gap-2">
                                        <Input
                                            label="WhatsApp"
                                            value={formData.whatsapp}
                                            onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                                            placeholder="(00) 00000-0000"
                                            icon={<Phone size={16} />}
                                        />
                                        {formData.whatsapp && (
                                            <a
                                                href={`https://wa.me/55${cleanPhone(formData.whatsapp)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mb-1.5 p-3 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                                                title="Abrir WhatsApp Web"
                                            >
                                                <ExternalLink size={18} />
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Status Operacional */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-blue-400 mb-1 border-b border-white/5 pb-2">
                                        <Briefcase size={18} />
                                        <h3 className="text-sm font-bold uppercase tracking-widest">Status Inicial</h3>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5 cursor-pointer hover:border-emerald-500/30 transition-colors group">
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">Contrato Assinado</span>
                                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${formData.isContractSigned ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${formData.isContractSigned ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.isContractSigned} onChange={e => setFormData({ ...formData, isContractSigned: e.target.checked })} />
                                        </label>

                                        <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-white/5 cursor-pointer hover:border-blue-500/30 transition-colors group">
                                            <span className="text-xs font-bold text-slate-400 group-hover:text-blue-400 transition-colors">Postado Fretebras</span>
                                            <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${formData.isPostedFretebras ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${formData.isPostedFretebras ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <input type="checkbox" className="hidden" checked={formData.isPostedFretebras} onChange={e => setFormData({ ...formData, isPostedFretebras: e.target.checked })} />
                                        </label>

                                        <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-lg border border-dashed border-white/10">
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Etapa Atual</span>
                                            <span className="text-xs font-bold text-emerald-400">
                                                {formData.paymentStatus.delivery ? 'ENTREGA' :
                                                    formData.paymentStatus.pickup ? 'COLETA' :
                                                        formData.paymentStatus.deposit ? 'RESERVA' : 'AGUARDANDO'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: Routes & Dates */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-violet-500 mb-1 border-b border-white/5 pb-2">
                                    <MapPin size={18} />
                                    <h3 className="text-sm font-bold uppercase tracking-widest">Rota & Logística</h3>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                                    <div className="flex-grow">
                                        <Input
                                            label="Endereço de Origem"
                                            value={formData.origin}
                                            onChange={e => setFormData({ ...formData, origin: e.target.value })}
                                            placeholder="Rua, Número, Bairro, Cidade - UF"
                                            className="bg-slate-950/80"
                                        />
                                    </div>
                                    <div className="w-full md:w-48">
                                        <Input
                                            type="date"
                                            label="Data Coleta"
                                            value={formData.pickupDate}
                                            onChange={e => setFormData({ ...formData, pickupDate: e.target.value })}
                                            className="bg-slate-950/80"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 bg-slate-900/30 p-3 rounded-xl border border-white/5">
                                    <div className="flex-grow">
                                        <Input
                                            label="Endereço de Destino"
                                            value={formData.destination}
                                            onChange={e => setFormData({ ...formData, destination: e.target.value })}
                                            placeholder="Rua, Número, Bairro, Cidade - UF"
                                            className="bg-slate-950/80"
                                        />
                                    </div>
                                    <div className="w-full md:w-48">
                                        <Input
                                            type="date"
                                            label="Prev. Entrega"
                                            value={formData.deliveryForecast}
                                            onChange={e => setFormData({ ...formData, deliveryForecast: e.target.value })}
                                            className="bg-slate-950/80"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Financials */}
                            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-2xl">
                                <div className="bg-slate-950/50 px-6 py-4 border-b border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <Wallet size={20} />
                                        <h3 className="text-base font-bold uppercase tracking-widest">Financeiro</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase">Lucro Projetado</p>
                                        <p className={`text-lg font-bold ${isProfitPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(currentProfit)}</p>
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">

                                    {/* 3.1 Total Value - CENRALIZED AND LARGER */}
                                    <div>
                                        <label className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2 block text-center">Valor Total OS (Cobrado do Cliente)</label>
                                        <div className="flex items-center justify-center gap-4 bg-slate-950 p-8 rounded-2xl border border-emerald-500/30 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all shadow-inner">
                                            <DollarSign className="text-emerald-500" size={40} />
                                            <input
                                                type="number"
                                                min="0"
                                                value={formData.financials.totalValue || ''}
                                                onChange={e => setFormData({ ...formData, financials: { ...formData.financials, totalValue: Number(e.target.value) } })}
                                                className="bg-transparent border-none p-0 text-5xl md:text-6xl font-black text-white focus:outline-none w-full text-center placeholder-slate-800"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    {/* 3.2 Receipts Control */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <CheckCircle2 size={12} />
                                            O que o cliente já pagou?
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {[
                                                { key: 'deposit', label: 'Sinal / Reserva', pct: 0.20 },
                                                { key: 'pickup', label: 'Na Coleta', pct: 0.40 },
                                                { key: 'delivery', label: 'Na Entrega', pct: 0.40 },
                                            ].map((stage) => (
                                                <label key={stage.key} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.paymentStatus[stage.key] ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.paymentStatus[stage.key]}
                                                        onChange={e => setFormData({ ...formData, paymentStatus: { ...formData.paymentStatus, [stage.key]: e.target.checked } })}
                                                        className="w-5 h-5 rounded text-emerald-500 bg-slate-900 border-slate-600 focus:ring-emerald-500"
                                                    />
                                                    <div>
                                                        <span className={`text-xs font-bold block ${formData.paymentStatus[stage.key] ? 'text-emerald-400' : 'text-slate-400'}`}>{stage.label}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{formatCurrency(currentTotal * stage.pct)}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3.3 Operational Costs */}
                                    <div className="pt-6 border-t border-white/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2">
                                                    <TrendingUp size={12} className="rotate-180" />
                                                    Custos Operacionais
                                                </h4>
                                                <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                                                    Total: {formatCurrency(currentCosts)}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-slate-500 uppercase font-bold">Pago?</span>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <div className={`w-10 h-5 rounded-full p-1 transition-colors ${formData.isCostsPaid ? 'bg-rose-500' : 'bg-slate-700'}`}>
                                                        <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform ${formData.isCostsPaid ? 'translate-x-5' : 'translate-x-0'}`} />
                                                    </div>
                                                    <input type="checkbox" className="hidden" checked={formData.isCostsPaid} onChange={e => setFormData({ ...formData, isCostsPaid: e.target.checked })} />
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Driver Cost */}
                                            <div className="flex items-center gap-4 p-3 bg-slate-950/30 rounded-xl border border-white/5">
                                                <div className="p-2 bg-slate-900 rounded-lg text-slate-500"><Truck size={18} /></div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-300">Custo Motorista</p>
                                                </div>
                                                <div className="w-32">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={formData.financials.driverCost}
                                                        onChange={e => setFormData({ ...formData, financials: { ...formData.financials, driverCost: Math.max(0, Number(e.target.value)) } })}
                                                        className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-rose-400 w-full text-right focus:border-rose-500/50 focus:outline-none"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                            </div>

                                            {/* Extra Roles */}
                                            {ROLE_CONFIGS.map((role) => {
                                                const { totalQty, unitCost } = getRoleData(role.type as ServiceType);
                                                return (
                                                    <div key={role.type} className="flex items-center gap-4 p-3 bg-slate-950/30 rounded-xl border border-white/5">
                                                        <div className="p-2 bg-slate-900 rounded-lg text-slate-500">{role.icon}</div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-slate-300">{role.label}</p>
                                                            <p className="text-[10px] text-slate-500">Qtd & Valor Unit.</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 h-9">
                                                                <button type="button" onClick={() => updateRole(role.type as ServiceType, 'qty', Math.max(0, totalQty - 1))} className="px-2 text-slate-400 hover:text-white">-</button>
                                                                <span className="w-6 text-center text-xs font-bold text-white">{totalQty}</span>
                                                                <button type="button" onClick={() => updateRole(role.type as ServiceType, 'qty', totalQty + 1)} className="px-2 text-slate-400 hover:text-white">+</button>
                                                            </div>
                                                            <input
                                                                type="number"
                                                                value={unitCost}
                                                                onChange={(e) => updateRole(role.type as ServiceType, 'cost', Number(e.target.value))}
                                                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-sm font-bold text-rose-400 text-right focus:outline-none h-9"
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {/* Other Extras */}
                                            {extras.filter(e => e.type === 'other').map(extra => (
                                                <div key={extra.id} className="flex gap-2 items-center pl-12 animate-in fade-in slide-in-from-top-2">
                                                    <input
                                                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300"
                                                        placeholder="Outro serviço..."
                                                        value={extra.name}
                                                        onChange={e => updateGenericExtra(extra.id, 'name', e.target.value)}
                                                    />
                                                    <input
                                                        type="number" className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-rose-400 font-bold text-right"
                                                        min="0"
                                                        value={extra.cost}
                                                        onChange={e => updateGenericExtra(extra.id, 'cost', Number(e.target.value))}
                                                    />
                                                    <button type="button" onClick={() => removeGenericExtra(extra.id)} className="p-2 text-slate-600 hover:text-rose-500"><Trash2 size={14} /></button>
                                                </div>
                                            ))}

                                            <button type="button" onClick={addGenericExtra} className="text-xs flex items-center gap-1 text-slate-500 hover:text-emerald-400 transition-colors ml-14">
                                                <Plus size={12} /> Adicionar Custo Extra
                                            </button>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Notes & Color Tag with Real-time Preview */}
                            <div>
                                <div className="flex items-center justify-between text-slate-400 mb-2 border-b border-white/5 pb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText size={18} />
                                        <h3 className="text-sm font-bold uppercase tracking-widest">Observações (Kanban)</h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] uppercase font-bold flex items-center gap-1"><PaintBucket size={10} /> Cor da Nota</span>
                                        <NoteColorPicker selected={formData.noteTags || '#334155'} onSelect={(c) => setFormData({ ...formData, noteTags: c })} />
                                    </div>
                                </div>

                                {/* Notes List */}
                                <div className="space-y-3 mb-4">
                                    {formData.notes && Array.isArray(formData.notes) && formData.notes.map((note: any, index: number) => (
                                        <div
                                            key={note.id || index}
                                            className="p-3 rounded-lg border border-white/5 relative group transition-all hover:scale-[1.01]"
                                            style={{ backgroundColor: `${note.color}20`, borderColor: `${note.color}40` }}
                                        >
                                            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[10px] text-slate-500 font-mono" style={{ color: note.color }}>
                                                    {new Date(note.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newNotes = formData.notes.filter((_: any, i: number) => i !== index);
                                                        setFormData({ ...formData, notes: newNotes });
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-slate-900/50 text-slate-400 hover:text-rose-500 transition-all"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!formData.notes || formData.notes.length === 0) && (
                                        <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-600 text-xs">
                                            Nenhuma observação registrada.
                                        </div>
                                    )}
                                </div>

                                {/* Add New Note Input */}
                                <div className="flex gap-2 items-start">
                                    <textarea
                                        rows={2}
                                        id="new-note-input"
                                        className="flex-1 bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all text-sm resize-none"
                                        placeholder="Digite uma nova observação..."
                                        spellCheck={true}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                const content = e.currentTarget.value.trim();
                                                if (content) {
                                                    const newNote = {
                                                        id: `temp-${Date.now()}`,
                                                        content: content,
                                                        color: formData.noteTags || '#334155',
                                                        createdAt: new Date().toISOString()
                                                    };
                                                    setFormData({
                                                        ...formData,
                                                        notes: [...(formData.notes || []), newNote]
                                                    });
                                                    e.currentTarget.value = '';
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const input = document.getElementById('new-note-input') as HTMLTextAreaElement;
                                            const content = input.value.trim();
                                            if (content) {
                                                const newNote = {
                                                    id: `temp-${Date.now()}`,
                                                    content: content,
                                                    color: formData.noteTags || '#334155',
                                                    createdAt: new Date().toISOString()
                                                };
                                                setFormData({
                                                    ...formData,
                                                    notes: [...(formData.notes || []), newNote]
                                                });
                                                input.value = '';
                                            }
                                        }}
                                        className="p-3 bg-slate-800 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-colors"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-600 mt-2 ml-1">
                                    * Pressione Enter para adicionar. Use Shift+Enter para quebra de linha. A cor selecionada acima será aplicada à nova nota.
                                </p>
                            </div>

                        </form>

                        {/* Sticky Footer */}
                        <div className="p-6 border-t border-white/5 bg-slate-950 sticky bottom-0 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                            <div className="flex gap-4">
                                {initialData && (
                                    <button
                                        type="button"
                                        onClick={() => onDelete(formData.id)}
                                        className="px-5 py-3 rounded-xl border border-rose-900/50 text-rose-500 hover:bg-rose-950 hover:text-rose-400 transition-colors font-medium"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button
                                    onClick={handleSubmit}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    {initialData ? 'Salvar Alterações' : 'Criar Ordem'}
                                </button>
                            </div>
                        </div>

                    </motion.div>

                    {/* PDF Modal */}
                    <PdfExportModal
                        isOpen={isPdfModalOpen}
                        onClose={() => setIsPdfModalOpen(false)}
                        order={initialData || null}
                        onOpenInventory={() => setShowInventory(true)}
                    />

                    {/* Inventory Generator (Portal) */}
                    {createPortal(
                        <InventoryGenerator
                            isOpen={showInventory}
                            onClose={() => setShowInventory(false)}
                            initialData={formData}
                        />,
                        document.body
                    )}
                </>
            )}
        </AnimatePresence>
    );
};