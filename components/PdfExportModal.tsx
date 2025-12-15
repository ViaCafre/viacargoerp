import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Users, Hammer, Box, Printer, FileText, MessageSquarePlus, Upload, Image as ImageIcon, ChevronLeft, Check, AlertCircle, PenTool, Eraser, FileSignature, Clock, MapPin, Calendar } from 'lucide-react';
import { ServiceOrder, DriverData, TeamOrderData } from '../types';
import { generateTeamPDF, generateDriverPDF, PdfRoleTarget } from '../utils/pdfGenerator';
import { Input } from './ui/Input';
import { PrintableServiceOrder, PrintRole } from './PrintableServiceOrder';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PdfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: ServiceOrder | null;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ isOpen, onClose, order }) => {
    const [customNote, setCustomNote] = useState('');

    // Driver Form State
    const [view, setView] = useState<'menu' | 'driver-form' | 'team-selection'>('menu');
    const [driverData, setDriverData] = useState<DriverData>({
        fullName: '', cpf: '', cnh: '', ntrc: '', category: '',
        phone: '', uf: '', plate: '', vehicle: '', validity: '',
        inventoryList: '', issuerSignature: null
    });
    const [includeInventory, setIncludeInventory] = useState(false);

    // Team Selection State
    const [selectedRole, setSelectedRole] = useState<PdfRoleTarget | null>(null);
    const [teamData, setTeamData] = useState<TeamOrderData>({
        quantity: 1,
        scheduledTime: '',
        unitCost: 0,
        calculatedCost: 0,
        workLocation: 'origin',
        workDate: new Date().toISOString().split('T')[0]
    });

    // File Refs
    const cnhInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Printing State to control what is rendered in the "Ghost Element"
    const [printingState, setPrintingState] = useState<{
        role: PrintRole;
        config?: any;
        driverData?: DriverData;
    } | null>(null);

    // Filenames for UI feedback
    const [cnhFileName, setCnhFileName] = useState<string | null>(null);
    const [signatureFileName, setSignatureFileName] = useState<string | null>(null);

    const [isGenerating, setIsGenerating] = useState(false);

    if (!order) return null;

    const resetForm = () => {
        setCustomNote('');
        setView('menu');
        setDriverData({
            fullName: '', cpf: '', cnh: '', ntrc: '', category: '',
            phone: '', uf: '', plate: '', vehicle: '', validity: '',
            inventoryList: '', issuerSignature: null
        });
        setIncludeInventory(false);
        setCnhFileName(null);
        setSignatureFileName(null);
        setIsGenerating(false);
        setSelectedRole(null);
        setTeamData({
            quantity: 1,
            scheduledTime: '',
            unitCost: 0,
            calculatedCost: 0,
            workLocation: 'origin',
            workDate: new Date().toISOString().split('T')[0],
            itemsList: ''
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Open Team Selection View
    const handleOpenTeamSelection = (role: PdfRoleTarget) => {
        // Get the extras for this role and calculate unit cost
        const extras = order.financials.extras.filter(e => {
            if (role === 'ajudante' && e.type === 'helper') return true;
            if (role === 'montador' && e.type === 'assembler') return true;
            if (role === 'embalador' && e.type === 'packer') return true;
            return false;
        });

        const totalQty = extras.reduce((acc, curr) => acc + curr.qty, 0);
        const unitCost = extras.length > 0 ? extras[0].cost : 0;

        setSelectedRole(role);
        setTeamData({
            quantity: totalQty > 0 ? totalQty : 1,
            scheduledTime: '',
            unitCost: unitCost,
            calculatedCost: unitCost * (totalQty > 0 ? totalQty : 1),
            workLocation: 'origin',
            workDate: new Date().toISOString().split('T')[0],
            itemsList: ''
        });
        setView('team-selection');
    };

    // --- DOM-BASED PDF GENERATION ENGINE ---
    const handleDownloadPDF = async () => {
        if (!printRef.current || !order) return;

        try {
            // 1. GHOST CONTAINER (Mundo ideal A4)
            // We create a temporary container to ensure the capture is clean
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.top = '-10000px';
            container.style.left = '-10000px';
            container.style.width = '794px'; // A4 width px
            container.style.zIndex = '-9999';
            document.body.appendChild(container);

            // 2. CLONE
            // We clone the React-rendered element to manipulate it freely
            const clone = printRef.current.cloneNode(true) as HTMLElement;
            clone.style.width = '794px';
            clone.style.height = 'auto'; // Let it grow
            clone.style.display = 'block'; // Ensure it's visible in the clone
            container.appendChild(clone);

            // --- CORREÇÃO DE IMAGENS ---
            // Seleciona todas as imagens dentro do clone
            const images = clone.querySelectorAll('img');
            const imagePromises = Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Resolve mesmo com erro para não travar
                });
            });

            // Aguarda todas carregarem ou timeout de 1s (segurança)
            await Promise.race([
                Promise.all(imagePromises),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            // ---------------------------

            // 3. SMART BREAK (Algoritmo Anti-Corte)
            const PAGE_HEIGHT = 1123; // A4 height px at 96 DPI
            const CONTENT_HEIGHT = 1050; // Usable safe height per page (leaving margins)

            // Query safe blocks (semantic sections)
            const blocks = clone.querySelectorAll('.print-safe-block, .print-block');
            let currentY = 0;

            blocks.forEach((el: any) => {
                const height = el.offsetHeight;
                const endY = currentY + height;

                const startPage = Math.floor(currentY / CONTENT_HEIGHT);
                const endPage = Math.floor(endY / CONTENT_HEIGHT);

                if (endPage > startPage) {
                    // This block would be cut! Push it to the next page.
                    const spacer = (startPage + 1) * CONTENT_HEIGHT - currentY;
                    el.style.marginTop = `${spacer + 30}px`; // Add margin + buffer
                    currentY += spacer + 30 + height;
                } else {
                    currentY += height;
                }
            });

            // 4. CAPTURE & GENERATE
            // Wait for images to load if needed (though React should have them)
            const canvas = await html2canvas(clone, {
                scale: 2, // 2x scale for Retina-like quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                windowWidth: 794
            });

            const imgData = canvas.toDataURL('image/png');
            const doc = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = 210;
            const pdfHeight = 297;

            // Convert px height to mm for PDF mapping
            const imgHeightMM = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = imgHeightMM;
            let position = 0;

            // Page Loop
            doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightMM);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeightMM; // Shift image up
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightMM);
                heightLeft -= pdfHeight;
            }

            const fileName = `OS-${order.id}-${printingState?.role || 'documento'}.pdf`;
            doc.save(fileName);

            // Cleanup
            document.body.removeChild(container);

        } catch (err) {
            console.error(err);
            alert("Erro ao gerar PDF. Verifique se as imagens (assinaturas) estão acessíveis.");
        } finally {
            setIsGenerating(false);
            setPrintingState(null); // Reset printing state
        }
    };

    // Trigger for Team PDF
    const handleGenerateTeam = () => {
        if (!teamData.scheduledTime) {
            alert('Por favor, informe o horário no local.');
            return;
        }
        if (!teamData.workDate) {
            alert('Por favor, informe a data.');
            return;
        }
        if (!selectedRole) return;

        // Map internal role to PrintRole
        const roleMapping: Record<string, PrintRole> = {
            'ajudante': 'ajudante',
            'montador': 'montador',
            'embalador': 'embalador',
            'motorista': 'motorista',
            'geral': 'geral'
        };

        setPrintingState({
            role: roleMapping[selectedRole] || 'geral',
            config: teamData
        });

        setIsGenerating(true);
    };

    // Trigger for Driver PDF
    const handleGenerateDriver = () => {
        // Validate required fields
        if (!driverData.fullName || !driverData.cpf || !driverData.cnh || !driverData.plate) {
            alert("Por favor, preencha todos os campos obrigatórios do motorista.");
            return;
        }

        setPrintingState({
            role: 'motorista',
            driverData: driverData
        });

        setIsGenerating(true);
    };

    // Effect to trigger print when printingState is ready
    useEffect(() => {
        if (printingState && isGenerating) {
            // Give React a moment to render the hidden component
            const timer = setTimeout(() => {
                handleDownloadPDF();
            }, 500); // 500ms delay to ensure rendering and image loading
            return () => clearTimeout(timer);
        }
    }, [printingState, isGenerating]);

    const handleCnhChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setCnhFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setDriverData(prev => ({ ...prev, cnhImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSignatureFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setDriverData(prev => ({ ...prev, issuerSignature: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const hasHelper = order.financials.extras.some(e => e.type === 'helper');
    const hasAssembler = order.financials.extras.some(e => e.type === 'assembler');
    const hasPacker = order.financials.extras.some(e => e.type === 'packer');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[80]"
                    />
                    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="p-5 text-center border-b border-white/5 bg-slate-950/50 flex items-center justify-between">
                                {view === 'driver-form' ? (
                                    <button onClick={() => setView('menu')} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
                                        <ChevronLeft size={20} />
                                    </button>
                                ) : <div className="w-9" />}

                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2 justify-center">
                                        <Printer size={18} className="text-emerald-400" />
                                        {view === 'driver-form' ? 'Dados do Motorista' : view === 'team-selection' ? 'Configurar Ordem' : 'Imprimir Ordem'}
                                    </h3>
                                </div>

                                <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900">

                                {/* --- TEAM SELECTION VIEW --- */}
                                {view === 'team-selection' && selectedRole && (
                                    <div className="p-6 space-y-6">
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                                            <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-400 uppercase">Configuração da Ordem</h4>
                                                <p className="text-[10px] text-blue-300/80 leading-relaxed mt-1">
                                                    Selecione a quantidade de profissionais e o horário no local.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Quantity Selector */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quantidade de Profissionais</label>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setTeamData(prev => {
                                                        const newQty = Math.max(1, prev.quantity - 1);
                                                        return { ...prev, quantity: newQty, calculatedCost: newQty * prev.unitCost };
                                                    })}
                                                    className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold text-lg"
                                                >
                                                    -
                                                </button>
                                                <div className="flex-1 text-center">
                                                    <div className="text-3xl font-bold text-white">{teamData.quantity}</div>
                                                    <div className="text-xs text-slate-500">profissionais</div>
                                                </div>
                                                <button
                                                    onClick={() => setTeamData(prev => {
                                                        const newQty = prev.quantity + 1;
                                                        return { ...prev, quantity: newQty, calculatedCost: newQty * prev.unitCost };
                                                    })}
                                                    className="w-10 h-10 rounded-lg bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold text-lg"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        {/* Address Selection */}
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <MapPin size={14} />
                                                Local de Atuação
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setTeamData(prev => ({ ...prev, workLocation: 'origin' }))}
                                                    className={`p-3 rounded-xl border-2 transition-all ${teamData.workLocation === 'origin'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold mb-1">ORIGEM / COLETA</div>
                                                    <div className="text-[10px] opacity-80 line-clamp-2">{order.origin}</div>
                                                </button>
                                                <button
                                                    onClick={() => setTeamData(prev => ({ ...prev, workLocation: 'destination' }))}
                                                    className={`p-3 rounded-xl border-2 transition-all ${teamData.workLocation === 'destination'
                                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                                                        }`}
                                                >
                                                    <div className="text-xs font-bold mb-1">DESTINO / ENTREGA</div>
                                                    <div className="text-[10px] opacity-80 line-clamp-2">{order.destination}</div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Date and Time */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    Data
                                                </label>
                                                <input
                                                    type="date"
                                                    value={teamData.workDate}
                                                    onChange={(e) => setTeamData(prev => ({ ...prev, workDate: e.target.value }))}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock size={14} />
                                                    Horário no Local
                                                </label>
                                                <input
                                                    type="time"
                                                    value={teamData.scheduledTime}
                                                    onChange={(e) => setTeamData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Items List (only for Montador/Embalador) */}
                                        {(selectedRole === 'montador' || selectedRole === 'embalador') && (
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Box size={14} />
                                                    {selectedRole === 'montador' ? 'Móveis para Montar/Desmontar' : 'Lista de Itens para Embalar'}
                                                </label>
                                                <textarea
                                                    value={teamData.itemsList}
                                                    onChange={(e) => setTeamData(prev => ({ ...prev, itemsList: e.target.value }))}
                                                    placeholder={selectedRole === 'montador' ? "Ex: 1 Guarda-roupa 6 portas, 1 Cama Box Casal..." : "Ex: Louças da cozinha, Roupas do quarto..."}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-all h-24 resize-none"
                                                />
                                            </div>
                                        )}

                                        {/* Cost Calculation Display */}
                                        <div className="bg-slate-950/50 border border-white/10 rounded-xl p-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Valor Unitário:</span>
                                                <span className="text-white font-bold">R$ {teamData.unitCost.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Quantidade:</span>
                                                <span className="text-white font-bold">{teamData.quantity}x</span>
                                            </div>
                                            <div className="h-px bg-white/10 my-2"></div>
                                            <div className="flex justify-between text-lg">
                                                <span className="text-emerald-400 font-bold">Valor Total:</span>
                                                <span className="text-emerald-400 font-bold">R$ {teamData.calculatedCost.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* --- MENU VIEW --- */}
                                {view === 'menu' && (
                                    <div className="p-6 space-y-6">
                                        {/* Custom Note Section */}
                                        <div className="pb-2">
                                            <div className="flex items-center gap-2 mb-2 text-emerald-500">
                                                <MessageSquarePlus size={16} />
                                                <span className="text-xs font-bold uppercase tracking-widest">Notificação Geral (Opcional)</span>
                                            </div>
                                            <textarea
                                                value={customNote}
                                                onChange={(e) => setCustomNote(e.target.value)}
                                                placeholder="Instrução pontual para o documento... (Ex: 'Cuidado com o cachorro')"
                                                className="w-full h-20 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 resize-none transition-all"
                                            />
                                        </div>

                                        <div className="h-px w-full bg-white/5"></div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Selecione o Destinatário</p>

                                            {/* Driver Button - Opens Form */}
                                            <button
                                                onClick={() => setView('driver-form')}
                                                className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-slate-950 rounded-lg text-slate-500 group-hover:text-blue-400 transition-colors border border-white/5">
                                                        <Truck size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <span className="block text-sm font-bold text-slate-200 group-hover:text-white">Motorista</span>
                                                        <span className="text-[10px] text-slate-500">Requer preenchimento de dados</span>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                                                    Formulário
                                                </div>
                                            </button>

                                            {/* Standard Buttons */}
                                            {hasHelper && (
                                                <button
                                                    onClick={() => handleOpenTeamSelection('ajudante')}
                                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-emerald-400 transition-colors">
                                                            <Users size={18} />
                                                        </div>
                                                        <span className="block text-sm font-bold text-slate-200 group-hover:text-white">Ajudantes</span>
                                                    </div>
                                                    <FileText size={16} className="text-slate-600 group-hover:text-emerald-500" />
                                                </button>
                                            )}

                                            {/* Assemblers & Packers */}
                                            {hasAssembler && (
                                                <button onClick={() => handleOpenTeamSelection('montador')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-amber-400"><Hammer size={18} /></div>
                                                        <span className="text-sm font-bold text-slate-200 group-hover:text-white">Montadores</span>
                                                    </div>
                                                    <FileText size={16} className="text-slate-600 group-hover:text-amber-500" />
                                                </button>
                                            )}
                                            {hasPacker && (
                                                <button onClick={() => handleOpenTeamSelection('embalador')} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-violet-400"><Box size={18} /></div>
                                                        <span className="text-sm font-bold text-slate-200 group-hover:text-white">Embaladores</span>
                                                    </div>
                                                    <FileText size={16} className="text-slate-600 group-hover:text-violet-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* --- DRIVER FORM VIEW --- */}
                                {view === 'driver-form' && (
                                    <div className="p-6 space-y-6">
                                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                                            <AlertCircle className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-400 uppercase">Preenchimento Obrigatório</h4>
                                                <p className="text-[10px] text-blue-300/80 leading-relaxed mt-1">
                                                    Os dados abaixo serão utilizados para preencher automaticamente o <strong>Termo de Responsabilidade</strong> do motorista.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2">
                                                    <Input label="Nome Completo" value={driverData.fullName} onChange={e => setDriverData({ ...driverData, fullName: e.target.value })} placeholder="Ex: Carlos Alberto da Silva" />
                                                </div>
                                                <Input label="Valor do Frete (R$)" value={driverData.freightValue || ''} onChange={e => setDriverData({ ...driverData, freightValue: e.target.value })} placeholder="0,00" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input label="CPF" value={driverData.cpf} onChange={e => setDriverData({ ...driverData, cpf: e.target.value })} placeholder="000.000.000-00" />
                                                <Input label="Celular" value={driverData.phone} onChange={e => setDriverData({ ...driverData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                                            </div>

                                            <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-4">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Habilitação (CNH)</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="Nº Registro CNH" value={driverData.cnh} onChange={e => setDriverData({ ...driverData, cnh: e.target.value })} />
                                                    <Input label="Categoria" value={driverData.category} onChange={e => setDriverData({ ...driverData, category: e.target.value })} placeholder="Ex: AE" />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="Validade" type="date" value={driverData.validity} onChange={e => setDriverData({ ...driverData, validity: e.target.value })} />
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Foto da CNH</label>
                                                        <input type="file" ref={cnhInputRef} accept="image/*" onChange={handleCnhChange} className="hidden" />
                                                        <button
                                                            type="button"
                                                            onClick={() => cnhInputRef.current?.click()}
                                                            className={`w-full py-2.5 rounded-xl border border-dashed flex items-center justify-center gap-2 transition-all ${cnhFileName ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                                                        >
                                                            {cnhFileName ? <Check size={16} /> : <Upload size={16} />}
                                                            <span className="text-xs font-bold">{cnhFileName ? 'Anexado' : 'Enviar Foto'}</span>
                                                        </button>
                                                        {cnhFileName && <p className="text-[9px] text-emerald-500/80 text-center truncate px-2">{cnhFileName}</p>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-4">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Veículo & Registro</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input label="RNTRC" value={driverData.ntrc} onChange={e => setDriverData({ ...driverData, ntrc: e.target.value })} />
                                                    <Input label="Placa" value={driverData.plate} onChange={e => setDriverData({ ...driverData, plate: e.target.value })} className="uppercase" />
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="col-span-2">
                                                        <Input label="Modelo Veículo" value={driverData.vehicle} onChange={e => setDriverData({ ...driverData, vehicle: e.target.value })} placeholder="Ex: Scania R450" />
                                                    </div>
                                                    <Input label="UF Placa" value={driverData.uf} onChange={e => setDriverData({ ...driverData, uf: e.target.value })} maxLength={2} className="uppercase" />
                                                </div>
                                            </div>

                                            {/* Inventory Toggle */}
                                            <div className="pt-2">
                                                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-slate-950/30 cursor-pointer hover:bg-slate-950/50">
                                                    <input
                                                        type="checkbox"
                                                        checked={includeInventory}
                                                        onChange={e => setIncludeInventory(e.target.checked)}
                                                        className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-offset-slate-900"
                                                    />
                                                    <span className="text-sm font-bold text-slate-300">Incluir Lista de Itens?</span>
                                                </label>

                                                {includeInventory && (
                                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 overflow-hidden">
                                                        <textarea
                                                            value={driverData.inventoryList}
                                                            onChange={(e) => setDriverData({ ...driverData, inventoryList: e.target.value })}
                                                            placeholder="Cole a lista de itens aqui (ex: 1 Geladeira, 1 Fogão, 10 Caixas...)"
                                                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none custom-scrollbar"
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Signature Upload for ISSUER (Via Cargo) */}
                                            <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-3">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-2">
                                                    <FileSignature size={12} /> Assinatura Via Cargo
                                                </p>
                                                <p className="text-[10px] text-slate-400">Faça o upload da imagem da assinatura digital do responsável.</p>

                                                <input type="file" ref={signatureInputRef} accept="image/*" onChange={handleSignatureChange} className="hidden" />
                                                <button
                                                    type="button"
                                                    onClick={() => signatureInputRef.current?.click()}
                                                    className={`w-full py-4 rounded-xl border border-dashed flex items-center justify-center gap-3 transition-all ${signatureFileName ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                                                >
                                                    {signatureFileName ? <Check size={20} /> : <Upload size={20} />}
                                                    <span className="text-sm font-bold">{signatureFileName ? 'Assinatura Anexada' : 'Upload Assinatura'}</span>
                                                </button>
                                                {signatureFileName && <p className="text-[9px] text-emerald-500/80 text-center truncate px-2">{signatureFileName}</p>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-950/50 border-t border-white/5 flex gap-3">
                                {view === 'driver-form' ? (
                                    <button
                                        onClick={handleGenerateDriver}
                                        disabled={isGenerating}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? 'Gerando...' : <><Printer size={18} /> Gerar PDF do Motorista</>}
                                    </button>
                                ) : view === 'team-selection' ? (
                                    <button
                                        onClick={handleGenerateTeam}
                                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Printer size={18} /> Gerar PDF
                                    </button>
                                ) : (
                                    <button onClick={handleClose} className="w-full py-3 text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-wider">
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}

            {/* --- GHOST ELEMENT FOR PRINTING --- */}
            {/* This element is rendered off-screen but exists in the DOM for html2canvas */}
            <div className="fixed top-0 left-0 pointer-events-none opacity-0 z-[-1] overflow-hidden" style={{ visibility: printingState ? 'visible' : 'hidden' }}>
                <div ref={printRef} className="inline-block">
                    {order && printingState && (
                        <PrintableServiceOrder
                            order={order}
                            role={printingState.role}
                            config={printingState.config}
                            driverData={printingState.driverData}
                            customNote={customNote}
                        />
                    )}
                </div>
            </div>
        </AnimatePresence>
    );
};