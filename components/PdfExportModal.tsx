import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Truck, Users, Hammer, Box, Printer, FileText, MessageSquarePlus, Upload, Image as ImageIcon, ChevronLeft, Check, AlertCircle, PenTool, Eraser, FileSignature } from 'lucide-react';
import { ServiceOrder, DriverData } from '../types';
import { generateTeamPDF, generateDriverPDF, PdfRoleTarget } from '../utils/pdfGenerator';
import { Input } from './ui/Input';

interface PdfExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: ServiceOrder | null;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({ isOpen, onClose, order }) => {
    const [customNote, setCustomNote] = useState('');

    // Driver Form State
    const [view, setView] = useState<'menu' | 'driver-form'>('menu');
    const [driverData, setDriverData] = useState<DriverData>({
        fullName: '', cpf: '', cnh: '', ntrc: '', category: '',
        phone: '', uf: '', plate: '', vehicle: '', validity: '',
        inventoryList: '', issuerSignature: null
    });
    const [includeInventory, setIncludeInventory] = useState(false);

    // File Refs
    const cnhInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

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
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Generic PDF Generation (Helpers, etc)
    const handleGenerateGeneric = (role: PdfRoleTarget, label: string) => {
        generateTeamPDF(order, role, label, customNote);
        handleClose();
    };

    // Driver PDF Generation
    const handleGenerateDriver = async () => {
        // Validate required fields
        if (!driverData.fullName || !driverData.cpf || !driverData.cnh || !driverData.plate) {
            alert("Por favor, preencha todos os campos obrigatórios do motorista.");
            return;
        }

        setIsGenerating(true);
        // Allow UI to update before heavy PDF generation
        setTimeout(async () => {
            await generateDriverPDF(order, driverData);
            setIsGenerating(false);
            handleClose();
        }, 100);
    };

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
                                        {view === 'driver-form' ? 'Dados do Motorista' : 'Imprimir Ordem'}
                                    </h3>
                                </div>

                                <button onClick={handleClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900">

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
                                                    onClick={() => handleGenerateGeneric('ajudante', 'Ajudantes')}
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

                                            {/* Assemblers & Packers (Simplified for brevity in this view) */}
                                            {hasAssembler && (
                                                <button onClick={() => handleGenerateGeneric('montador', 'Montadores')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all group"
                                                >
                                                    <div className="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-amber-400"><Hammer size={18} /></div>
                                                    <span className="text-sm font-bold text-slate-200">Montadores</span>
                                                </button>
                                            )}
                                            {hasPacker && (
                                                <button onClick={() => handleGenerateGeneric('embalador', 'Embaladores')} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-violet-500/50 hover:bg-violet-500/10 transition-all group">
                                                    <div className="p-2 bg-slate-950 rounded-lg text-slate-500 group-hover:text-violet-400"><Box size={18} /></div>
                                                    <span className="text-sm font-bold text-slate-200">Embaladores</span>
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
                                            <Input label="Nome Completo" value={driverData.fullName} onChange={e => setDriverData({ ...driverData, fullName: e.target.value })} placeholder="Ex: Carlos Alberto da Silva" />

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
        </AnimatePresence>
    );
};