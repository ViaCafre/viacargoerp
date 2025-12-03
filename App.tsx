import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid,
    Plus,
    TrendingUp,
    Wallet,
    PackageCheck,
    Search,
    Filter,
    AlertTriangle,
    CheckCircle2,
    X,
    ListFilter,
    ArrowRightLeft,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Siren,
    Clock,
    LayoutList,
    Grid3x3,
    Rows,
    AlignJustify,
    StretchHorizontal,
    Maximize2,
    LogOut
} from 'lucide-react';
import { INITIAL_ORDERS } from './constants';
import { ServiceOrder, calculateProfit, formatCurrency, calculateCosts, calculateReceivedAmount, ProgressStage, Transaction, ViewMode } from './types';
import { ServiceOrderCard } from './components/ServiceOrderCard';
import { OrderForm } from './components/OrderForm';
import { MonthlyGoalWidget } from './components/MonthlyGoalWidget';
import { TransactionModal } from './components/TransactionModal';
import { AnimatedCounter, MoneyRain } from './components/ui/Effects';
import { useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import {
    fetchServiceOrders,
    createServiceOrder,
    updateServiceOrder,
    deleteServiceOrder,
    fetchTransactions,
    createTransaction,
    fetchMonthlyGoals,
    setMonthlyGoal
} from './utils/supabaseService';

function App() {
    const { session, loading, signOut } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    // --- DATA FETCHING & STATE ---
    const [orders, setOrders] = useState<ServiceOrder[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});
    const [isLoadingData, setIsLoadingData] = useState(true);

    // UI States
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<ServiceOrder | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'critical'>('active');
    const [viewMode, setViewMode] = useState<ViewMode>('default');
    const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [urgentAlert, setUrgentAlert] = useState<{ count: number, names: string[], show: boolean }>({ count: 0, names: [], show: false });

    // Revenue Card UI
    const [showMoneyRain, setShowMoneyRain] = useState(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [revenueViewDate, setRevenueViewDate] = useState(new Date());
    const [viewDate, setViewDate] = useState(new Date());

    const fetchData = async () => {
        try {
            setIsLoadingData(true);
            const [fetchedOrders, fetchedTransactions, fetchedGoals] = await Promise.all([
                fetchServiceOrders(),
                fetchTransactions(),
                fetchMonthlyGoals()
            ]);
            setOrders(fetchedOrders);
            setTransactions(fetchedTransactions);
            setMonthlyGoals(fetchedGoals);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Erro ao carregar dados. Verifique sua conexão.');
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (session) {
            fetchData();
        }
    }, [session]);

    // --- URGENT ALERT LOGIC ---
    const isOrderCritical = (order: ServiceOrder): boolean => {
        if (order.progress === 100) return false;
        const now = new Date();
        const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const [year, month, day] = order.pickupDate.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day).getTime();
        const diffDays = Math.ceil((targetDate - nowMidnight) / (1000 * 60 * 60 * 24));
        return diffDays <= 5;
    };

    useEffect(() => {
        const checkCriticalOrders = () => {
            const criticalOrders = orders.filter(isOrderCritical);
            if (criticalOrders.length > 0) {
                const FIVE_HOURS = 5 * 60 * 60 * 1000;
                const lastAlertTime = localStorage.getItem('lastExpirationAlertTime');
                const now = Date.now();
                const shouldShow = !lastAlertTime || (now - parseInt(lastAlertTime)) > FIVE_HOURS;
                if (shouldShow) {
                    const clientNames = criticalOrders.map(o => o.clientName);
                    setUrgentAlert({ count: criticalOrders.length, names: clientNames, show: true });
                    localStorage.setItem('lastExpirationAlertTime', now.toString());
                }
            }
        };
        if (orders.length > 0) checkCriticalOrders();
        const interval = setInterval(checkCriticalOrders, 60000);
        return () => clearInterval(interval);
    }, [orders]);

    const handleUrgentAlertClick = () => {
        setFilter('critical');
        setUrgentAlert(prev => ({ ...prev, show: false }));
        const listElement = document.getElementById('orders-list-anchor');
        if (listElement) listElement.scrollIntoView({ behavior: 'smooth' });
        else window.scrollTo({ top: 400, behavior: 'smooth' });
    };

    const dismissUrgentAlert = (e: React.MouseEvent) => {
        e.stopPropagation();
        setUrgentAlert(prev => ({ ...prev, show: false }));
    };

    // --- REVENUE CARD LOGIC ---
    const handleRevenueMouseEnter = () => {
        hoverTimerRef.current = setTimeout(() => { setShowMoneyRain(true); }, 2000);
    };

    const handleRevenueMouseLeave = () => {
        if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
        setShowMoneyRain(false);
    };

    const handlePrevRevenueMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRevenueViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextRevenueMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setRevenueViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // --- MEMOS ---
    const monthlyRevenue = useMemo(() => {
        const key = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
        const monthOrders = orders.filter(order => order.pickupDate.startsWith(key));
        let cashIn = 0;
        let cashOut = 0;
        monthOrders.forEach(order => {
            const received = calculateReceivedAmount(order);
            cashIn += received;
            if (order.isCostsPaid) cashOut += calculateCosts(order.financials);
        });
        const monthTransactions = transactions.filter(t => t.date.startsWith(key));
        monthTransactions.forEach(t => {
            if (t.type === 'income') cashIn += t.amount;
            if (t.type === 'expense') cashOut += t.amount;
        });
        return cashIn - cashOut;
    }, [orders, transactions, viewDate]);

    const revenueViewValue = useMemo(() => {
        const key = `${revenueViewDate.getFullYear()}-${String(revenueViewDate.getMonth() + 1).padStart(2, '0')}`;
        const monthOrders = orders.filter(order => order.pickupDate.startsWith(key));
        let cashIn = 0;
        let cashOut = 0;
        monthOrders.forEach(order => {
            const received = calculateReceivedAmount(order);
            cashIn += received;
            if (order.isCostsPaid) cashOut += calculateCosts(order.financials);
        });
        const monthTransactions = transactions.filter(t => t.date.startsWith(key));
        monthTransactions.forEach(t => {
            if (t.type === 'income') cashIn += t.amount;
            if (t.type === 'expense') cashOut += t.amount;
        });
        return cashIn - cashOut;
    }, [orders, transactions, revenueViewDate]);

    const globalPending = useMemo(() => {
        let pendingReceivables = 0;
        orders.forEach(order => {
            const received = calculateReceivedAmount(order);
            pendingReceivables += (order.financials.totalValue - received);
        });
        return pendingReceivables;
    }, [orders]);

    // --- Actions ---

    const triggerSaveSuccess = () => {
        setIsFormOpen(false);
        setEditingOrder(null);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 1900);
    };

    const handleCreate = async (newOrder: ServiceOrder) => {
        try {
            await createServiceOrder(newOrder);
            await fetchData(); // Refresh data
            triggerSaveSuccess();
        } catch (error) {
            console.error('Error creating order:', error);
            alert('Erro ao criar ordem.');
        }
    };

    const handleUpdate = async (updatedOrder: ServiceOrder) => {
        try {
            await updateServiceOrder(updatedOrder);
            await fetchData(); // Refresh data
            triggerSaveSuccess();
        } catch (error) {
            console.error('Error updating order:', error);
            alert('Erro ao atualizar ordem.');
        }
    };

    const handleAddTransaction = async (newTransaction: Transaction) => {
        try {
            await createTransaction(newTransaction);
            await fetchData(); // Refresh data
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 1900);
        } catch (error) {
            console.error('Error adding transaction:', error);
            alert('Erro ao adicionar transação.');
        }
    };

    const onRequestDelete = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            try {
                await deleteServiceOrder(deleteId);
                await fetchData(); // Refresh data
                setDeleteId(null);
                setIsFormOpen(false);
                setEditingOrder(null);
            } catch (error) {
                console.error('Error deleting order:', error);
                alert('Erro ao excluir ordem.');
            }
        }
    };

    const openEdit = (order: ServiceOrder) => {
        setEditingOrder(order);
        setIsFormOpen(true);
    };

    const openNew = () => {
        setEditingOrder(null);
        setIsFormOpen(true);
    };

    // --- Monthly Goal Logic ---

    const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

    const handlePrevMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleSetGoal = async (val: number) => {
        try {
            await setMonthlyGoal(currentMonthKey, val);
            // Optimistic update or refresh
            setMonthlyGoals(prev => ({
                ...prev,
                [currentMonthKey]: val
            }));
        } catch (error) {
            console.error('Error setting goal:', error);
            alert('Erro ao definir meta.');
        }
    };

    // --- Filtering & Sorting & Counts ---

    const counts = useMemo(() => {
        return {
            all: orders.length,
            active: orders.filter(o => o.progress < 100).length,
            completed: orders.filter(o => o.progress === 100).length,
            critical: orders.filter(isOrderCritical).length
        }
    }, [orders]);

    const filteredOrders = useMemo(() => {
        let filtered = orders.filter(order => {
            if (filter === 'all') return true;
            if (filter === 'active') return order.progress < 100;
            if (filter === 'completed') return order.progress === 100;
            if (filter === 'critical') return isOrderCritical(order);
            return true;
        });

        return filtered.sort((a, b) => {
            return new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime();
        });
    }, [orders, filter]);

    const getContainerStyle = () => {
        switch (viewMode) {
            case 'grid': return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6';
            case 'compact': return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3';
            case 'list': return 'flex flex-col gap-2';
            case 'expanded': return 'flex flex-col gap-6';
            default: return 'flex flex-col gap-4';
        }
    };

    return (
        <div className="min-h-screen text-slate-200 font-sans selection:bg-emerald-500/30 pb-32">

            {/* Background Ambient Light */}
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-emerald-900/10 to-transparent pointer-events-none" />
            <div className="fixed -top-40 -right-40 w-96 h-96 bg-emerald-500/20 blur-[128px] pointer-events-none rounded-full" />
            <div className="fixed top-40 -left-20 w-72 h-72 bg-blue-600/10 blur-[100px] pointer-events-none rounded-full" />

            {/* Navbar */}
            <nav className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl transition-all duration-300">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-4">
                            {/* LOGO */}
                            <div className="relative group cursor-pointer flex items-center justify-center">
                                <div className="absolute inset-0 bg-emerald-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                                <img
                                    src="https://a.imagem.app/BEfcEJ.png"
                                    alt="ViaCargo Logo"
                                    onError={(e) => e.currentTarget.style.display = 'none'}
                                    className="relative h-10 w-auto object-contain filter drop-shadow-[0_0_5px_rgba(255,255,255,0.1)] transition-transform duration-300 group-hover:scale-105"
                                />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">
                                    ViaCargo
                                </h1>
                                <p className="text-[10px] text-emerald-500 font-bold tracking-[0.2em] uppercase">Sistema ViaCargo Transportadora V1.0</p>
                            </div>
                        </div>



                        <div className="flex items-center gap-4">
                            <button
                                onClick={signOut}
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Sair do Sistema"
                            >
                                <LogOut size={20} />
                            </button>
                            <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-full text-sm text-slate-400 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all mr-2">
                                <Search size={16} />
                                <input className="bg-transparent border-none focus:outline-none placeholder-slate-600 w-48 xl:w-64" placeholder="Buscar por cliente, ID..." />
                            </div>

                            {/* New Transaction Button (Secondary) */}
                            <button
                                onClick={() => setIsTransactionModalOpen(true)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 hover:border-emerald-500/30 text-slate-200 font-bold text-sm hover:bg-slate-800 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                                title="Adicionar entrada ou saída avulsa"
                            >
                                <ArrowRightLeft size={16} className="text-emerald-500/80" />
                                <span className="hidden sm:inline">Transação Avulsa</span>
                            </button>

                            {/* New Order Button (Primary) */}
                            <button
                                onClick={openNew}
                                className="group relative px-6 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-2 relative z-10">
                                    <Plus size={18} />
                                    <span className="hidden sm:inline">Nova Ordem</span>
                                    <span className="sm:hidden">Nova</span>
                                </div>
                            </button>
                        </div>
                    </div>

                </div>
            </nav>

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* COMPACT Dashboard Grid */}
                <section className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-500 ${focusedOrderId ? 'opacity-30 blur-[2px] grayscale-[0.5]' : 'opacity-100'}`}>

                    {/* Card 1: Revenue with Pagination */}
                    <div
                        className="relative overflow-hidden glass-card rounded-2xl p-6 md:col-span-2 group flex flex-col items-center justify-center min-h-[220px] cursor-default transition-all duration-500 hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] hover:border-emerald-500/50"
                        onMouseEnter={handleRevenueMouseEnter}
                        onMouseLeave={handleRevenueMouseLeave}
                    >
                        {/* Dynamic Money Rain */}
                        <AnimatePresence>
                            {showMoneyRain && <MoneyRain />}
                        </AnimatePresence>

                        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700 pointer-events-none" />

                        {/* Top Row: Title Left, Pagination Right */}
                        <div className="w-full flex items-center justify-between relative z-10 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Faturamento Líquido</p>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-lg border border-white/10 backdrop-blur-md transition-colors hover:bg-slate-900/60 z-30">
                                <button
                                    onClick={handlePrevRevenueMonth}
                                    className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <ChevronLeft size={14} />
                                </button>
                                <div className="px-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest min-w-[90px] text-center">
                                    {revenueViewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                </div>
                                <button
                                    onClick={handleNextRevenueMonth}
                                    className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>

                        {/* CENTERED VALUE */}
                        <div className="flex-1 flex flex-col items-center justify-center relative z-10 py-4">
                            <h2 className="text-5xl md:text-7xl font-black tracking-tight flex items-baseline gap-2 filter drop-shadow-[0_0_25px_rgba(16,185,129,0.4)]">
                                <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500">
                                    <AnimatedCounter value={revenueViewValue} />
                                </span>
                            </h2>
                            <p className="text-xs text-emerald-500/60 font-medium uppercase tracking-widest mt-2 flex items-center gap-2">
                                <Wallet size={12} />
                                Caixa Real + Transações
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Pending Receivables */}
                    <div className="glass-card rounded-2xl p-5 flex items-center justify-between group hover:border-amber-500/30 transition-colors">
                        <div>
                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">A Receber (Geral)</p>
                            <h3 className="text-2xl font-bold text-slate-200">
                                <AnimatedCounter value={globalPending} />
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-1">Pendente de clientes</p>
                        </div>
                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-white/5 text-amber-400 shadow-lg">
                            <TrendingUp size={18} />
                        </div>
                    </div>

                    {/* Card 3: Completed */}
                    <div className="glass-card rounded-2xl p-5 flex items-center justify-between group hover:border-violet-500/30 transition-colors">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">Concluídas</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-slate-200">{counts.completed}</h3>
                                <span className="text-[10px] text-slate-500">/ {counts.all}</span>
                            </div>
                            <div className="w-24 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-violet-500" style={{ width: `${(counts.completed / (counts.all || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="p-2.5 bg-slate-900/50 rounded-xl border border-white/5 text-violet-400 shadow-lg">
                            <PackageCheck size={18} />
                        </div>
                    </div>
                </section>

                {/* MONTHLY GOAL WIDGET */}
                <section className={`transition-opacity duration-500 ${focusedOrderId ? 'opacity-30 blur-[2px]' : 'opacity-100'}`}>
                    <MonthlyGoalWidget
                        currentDate={viewDate}
                        currentRevenue={monthlyRevenue}
                        goalValue={monthlyGoals[currentMonthKey] || 0}
                        onPrevMonth={handlePrevMonth}
                        onNextMonth={handleNextMonth}
                        onSetGoal={handleSetGoal}
                    />
                </section>

                {/* Board Header & Filters & View Modes */}
                <section id="orders-list-anchor">
                    <div className={`flex flex-col lg:flex-row items-end justify-between mb-6 gap-6 border-b border-white/5 pb-4 transition-all duration-500 ${focusedOrderId ? 'opacity-50' : 'opacity-100'}`}>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                                <ListFilter size={24} className="text-emerald-500" />
                                Ordens de Serviço
                            </h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Filter Group */}
                            <div className="flex p-1 bg-slate-900/80 backdrop-blur rounded-xl border border-white/5 gap-1">
                                {[
                                    { id: 'active', label: 'Em Andamento', count: counts.active },
                                    { id: 'completed', label: 'Finalizadas', count: counts.completed },
                                    { id: 'critical', label: 'Urgentes', count: counts.critical },
                                    { id: 'all', label: 'Todas', count: counts.all }
                                ].map((f) => {
                                    const isCritical = f.id === 'critical';
                                    const isActive = filter === f.id;

                                    let baseClass = "flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border";
                                    let activeClass = isActive
                                        ? "bg-slate-800 text-white shadow-lg border-white/10"
                                        : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5";

                                    // Special style for Critical tab
                                    if (isCritical && isActive) activeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
                                    if (isCritical && !isActive) activeClass = "text-rose-500/70 hover:text-rose-400 hover:bg-rose-500/5 border-transparent";

                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => setFilter(f.id as any)}
                                            className={`${baseClass} ${activeClass}`}
                                        >
                                            {isCritical && <AlertTriangle size={12} className={isActive ? 'animate-pulse' : ''} />}
                                            {f.label}
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] ${isActive
                                                ? (isCritical ? 'bg-rose-500 text-white' : 'bg-slate-700 text-white')
                                                : (isCritical ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-500')
                                                }`}>
                                                {f.count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* View Mode Switcher */}
                            <div className="flex p-1 bg-slate-900/80 backdrop-blur rounded-xl border border-white/5 gap-1">
                                <button
                                    onClick={() => setViewMode('default')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'default' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    title="Padrão (Detalhado)"
                                >
                                    <LayoutList size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('expanded')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'expanded' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    title="Completo (Financeiro + Detalhes)"
                                >
                                    <Maximize2 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    title="Grade (Cards)"
                                >
                                    <Grid3x3 size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('compact')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'compact' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    title="Compacto (Grade Densa)"
                                >
                                    <StretchHorizontal size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                    title="Lista (Linha)"
                                >
                                    <AlignJustify size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* List Container */}
                    <motion.div
                        layout
                        className={`relative ${getContainerStyle()}`}
                    >
                        <AnimatePresence>
                            {filteredOrders.map(order => (
                                <ServiceOrderCard
                                    key={order.id}
                                    order={order}
                                    onClick={openEdit}
                                    isDimmed={focusedOrderId !== null && focusedOrderId !== order.id}
                                    onHover={() => setFocusedOrderId(order.id)}
                                    onLeave={() => setFocusedOrderId(null)}
                                    viewMode={viewMode}
                                />
                            ))}
                        </AnimatePresence>

                        {filteredOrders.length === 0 && (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                                <div className="p-4 bg-slate-900 rounded-full text-slate-600 mb-4">
                                    <Filter size={24} />
                                </div>
                                <h3 className="text-lg font-medium text-slate-400">Nenhuma OS encontrada</h3>
                                <p className="text-xs text-slate-600 mt-1">Ajuste os filtros ou crie uma nova ordem.</p>
                            </div>
                        )}
                    </motion.div>
                </section>
            </main>

            <OrderForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={editingOrder ? handleUpdate : handleCreate}
                onDelete={onRequestDelete}
                initialData={editingOrder}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => setIsTransactionModalOpen(false)}
                onSubmit={handleAddTransaction}
            />

            {/* --- POPUPS / MODALS --- */}

            <AnimatePresence>

                {/* URGENT EXPIRATION ALERT (Bottom Right) */}
                {urgentAlert.show && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed bottom-6 right-6 z-[100] max-w-sm w-full"
                    >
                        <div
                            onClick={handleUrgentAlertClick}
                            className="cursor-pointer bg-slate-900/90 backdrop-blur-xl border border-rose-500/50 rounded-2xl p-5 shadow-[0_0_40px_-10px_rgba(244,63,94,0.5)] flex items-start gap-4 hover:scale-[1.02] transition-transform"
                        >
                            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-500 animate-pulse">
                                <Siren size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-white mb-1 flex items-center justify-between">
                                    Atenção Operacional
                                    <span className="text-[10px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full">{urgentAlert.count}</span>
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed mb-2">
                                    {urgentAlert.count === 1 ? 'O cliente abaixo está próximo do prazo:' : 'Os clientes abaixo estão próximos do prazo:'}
                                    <strong className="block text-rose-300 mt-1 font-mono text-[11px] truncate">
                                        {urgentAlert.names.slice(0, 2).join(', ')}
                                        {urgentAlert.count > 2 && ` e outros ${urgentAlert.count - 2}`}
                                    </strong>
                                    <span className="block text-rose-500 font-bold mt-1 text-[10px] uppercase">CONTRATAÇÃO DE MOTORISTA URGENTE.</span>
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold uppercase tracking-wide">
                                    <Clock size={10} />
                                    Clique para filtrar lista
                                </div>
                            </div>
                            <button onClick={dismissUrgentAlert} className="text-slate-500 hover:text-white p-1">
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {deleteId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60]"
                            onClick={() => setDeleteId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-[70] flex flex-col items-center text-center"
                        >
                            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-4">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Excluir Ordem?</h3>
                            <p className="text-sm text-slate-400 mb-6">Esta ação não pode ser desfeita. A OS será removida permanentemente do sistema.</p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors font-medium text-sm shadow-[0_0_15px_rgba(225,29,72,0.3)]"
                                >
                                    Sim, Excluir
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}

                {/* SAVE SUCCESS TOAST (Center, 1.9s) */}
                {showSuccessToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%', scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
                        exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.9 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl p-4 rounded-2xl shadow-2xl z-[80] flex items-center gap-3 pr-6"
                    >
                        <div className="bg-emerald-500 rounded-full p-1 text-slate-950">
                            <CheckCircle2 size={16} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-emerald-400">Sucesso!</h4>
                            <p className="text-xs text-emerald-500/80">Dados atualizados com sucesso.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div >
    );
}

export default App;