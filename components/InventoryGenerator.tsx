import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Download, List, FileText } from 'lucide-react';
import { ServiceOrder } from '../types';

// Declare html2pdf for TypeScript
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface InventoryGeneratorProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: ServiceOrder;
}

interface InventoryItem {
    id: string;
    qty: number;
    description: string;
}

export const InventoryGenerator: React.FC<InventoryGeneratorProps> = ({ isOpen, onClose, initialData }) => {
    // --- STATE ---
    // Fixed Company Data
    const companyData = {
        name: "VIACARGO INTERMEDIAÇÃO LOGÍSTICA & TRANSPORTES LTDA",
        cnpj: "54.826.258/0001-70",
        phone: "(41) 8747-1778"
    };

    // Client Data (Editable)
    const [clientName, setClientName] = useState(initialData.clientName || '');
    const [clientCpf, setClientCpf] = useState('');
    const [clientPhone, setClientPhone] = useState(initialData.whatsapp || '');

    // Route Data (Editable)
    const [originAddress, setOriginAddress] = useState(initialData.origin || '');
    const [destinationAddress, setDestinationAddress] = useState(initialData.destination || '');
    const [pickupDate, setPickupDate] = useState(initialData.pickupDate || '');

    // Driver Data (Editable)
    const [driverName, setDriverName] = useState('');
    const [driverCpf, setDriverCpf] = useState('');
    const [driverPlate, setDriverPlate] = useState('');
    const [driverModel, setDriverModel] = useState('');
    const [driverCnhRegister, setDriverCnhRegister] = useState('');
    const [driverRntrc, setDriverRntrc] = useState('');

    // Inventory Items
    const [items, setItems] = useState<InventoryItem[]>([
        { id: '1', qty: 0, description: '' }
    ]);

    // Free Text Mode
    const [isFreeTextMode, setIsFreeTextMode] = useState(false);
    const [freeTextContent, setFreeTextContent] = useState('');

    // Attached Images
    const [attachedImages, setAttachedImages] = useState<string[]>([]);

    // --- ACTIONS ---

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36).substr(2, 9), qty: 0, description: '' }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: string, field: keyof InventoryItem, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const imageUrls = files.map(file => URL.createObjectURL(file));
            setAttachedImages([...attachedImages, ...imageUrls]);
        }
    };

    const removeImage = (index: number) => {
        const newImages = [...attachedImages];
        newImages.splice(index, 1);
        setAttachedImages(newImages);
    };

    const handleDownload = async () => {
        const element = document.getElementById('documento-preview');
        if (!element) return;

        const opt = {
            margin: [5, 5, 5, 5] as [number, number, number, number],
            filename: `Declaracao_${clientName || 'Cliente'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, scrollY: 0, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
            pagebreak: { mode: ['css', 'legacy'] }
        };

        // @ts-ignore
        html2pdf().set(opt).from(element).save();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[99999] bg-black/80 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white w-full max-w-[1400px] h-[90vh] rounded-xl shadow-2xl flex overflow-hidden"
                    >
                        {/* LEFT: FORM INPUTS */}
                        <div className="w-1/3 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Gerador de Inventário</h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 flex-1">

                                {/* 1. Cliente */}
                                <section className="space-y-3">
                                    <h3 className="font-semibold text-gray-700 border-b pb-1">1. Dados do Cliente</h3>
                                    <input
                                        placeholder="Nome Completo"
                                        value={clientName} onChange={e => setClientName(e.target.value)}
                                        className="w-full border p-2 rounded text-sm mb-2"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="CPF / CNPJ"
                                            value={clientCpf} onChange={e => setClientCpf(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                        <input
                                            placeholder="Telefone"
                                            value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                </section>

                                {/* 2. Viagem */}
                                <section className="space-y-3">
                                    <h3 className="font-semibold text-gray-700 border-b pb-1">2. Dados da Viagem</h3>
                                    <input
                                        placeholder="Endereço de Origem"
                                        value={originAddress} onChange={e => setOriginAddress(e.target.value)}
                                        className="w-full border p-2 rounded text-sm mb-2"
                                    />
                                    <input
                                        placeholder="Endereço de Destino"
                                        value={destinationAddress} onChange={e => setDestinationAddress(e.target.value)}
                                        className="w-full border p-2 rounded text-sm mb-2"
                                    />
                                    <input
                                        type="date"
                                        value={pickupDate} onChange={e => setPickupDate(e.target.value)}
                                        className="w-full border p-2 rounded text-sm"
                                    />
                                </section>

                                {/* 3. Motorista */}
                                <section className="space-y-3">
                                    <h3 className="font-semibold text-gray-700 border-b pb-1">3. Dados do Motorista</h3>
                                    <input
                                        placeholder="Nome do Motorista"
                                        value={driverName} onChange={e => setDriverName(e.target.value)}
                                        className="w-full border p-2 rounded text-sm mb-2"
                                    />
                                    <div className="flex gap-2 mb-2">
                                        <input
                                            placeholder="CPF Motorista"
                                            value={driverCpf} onChange={e => setDriverCpf(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                        <input
                                            placeholder="Placa Veículo"
                                            value={driverPlate} onChange={e => setDriverPlate(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                    <input
                                        placeholder="Modelo Veículo"
                                        value={driverModel} onChange={e => setDriverModel(e.target.value)}
                                        className="w-full border p-2 rounded text-sm mb-2"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            placeholder="Nº Registro CNH"
                                            value={driverCnhRegister} onChange={e => setDriverCnhRegister(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                        <input
                                            placeholder="RNTRC"
                                            value={driverRntrc} onChange={e => setDriverRntrc(e.target.value)}
                                            className="w-full border p-2 rounded text-sm"
                                        />
                                    </div>
                                </section>

                                {/* 4. Inventário Toggle */}
                                <section className="space-y-3">
                                    <div className="flex justify-between items-center border-b pb-1">
                                        <h3 className="font-semibold text-gray-700">Itens do Inventário</h3>
                                        <button
                                            onClick={() => setIsFreeTextMode(!isFreeTextMode)}
                                            className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                            title={isFreeTextMode ? "Mudar para Lista Manual" : "Mudar para Texto Livre"}
                                        >
                                            {isFreeTextMode ? <List size={14} /> : <FileText size={14} />}
                                            {isFreeTextMode ? "Modo Lista" : "Modo Texto"}
                                        </button>
                                    </div>

                                    {isFreeTextMode ? (
                                        <textarea
                                            value={freeTextContent}
                                            onChange={(e) => setFreeTextContent(e.target.value)}
                                            placeholder="Cole aqui sua lista de itens..."
                                            className="w-full h-64 border p-3 rounded text-sm resize-none leading-relaxed custom-scrollbar focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    ) : (
                                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {items.map((item, idx) => (
                                                <div key={item.id} className="flex gap-2 mb-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Qtd"
                                                        value={item.qty || ''}
                                                        onChange={e => updateItem(item.id, 'qty', parseInt(e.target.value))}
                                                        className="w-16 border p-2 rounded text-sm text-center"
                                                    />
                                                    <input
                                                        placeholder="Descrição do Item"
                                                        value={item.description}
                                                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                                                        className="flex-1 border p-2 rounded text-sm uppercase"
                                                    />
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-red-400 hover:text-red-600 p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={addItem}
                                                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Plus size={16} /> Adicionar Item
                                            </button>
                                        </div>
                                    )}
                                </section>

                                {/* Image Upload */}
                                <section className="space-y-3">
                                    <h3 className="font-semibold text-gray-700 border-b pb-1">Anexar Imagens</h3>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                                    />
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {attachedImages.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square border rounded overflow-hidden group">
                                                <img src={img} alt="preview" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={handleDownload}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
                                >
                                    <Download size={20} />
                                    BAIXAR PDF
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: REAL-TIME PREVIEW (A4) */}
                        <div className="w-2/3 bg-gray-600 p-8 overflow-y-auto flex justify-center">

                            <div
                                id="documento-preview"
                                className="bg-white shadow-2xl relative"
                                style={{
                                    width: '210mm',
                                    minHeight: '297mm',
                                    padding: '15mm 15mm',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {/* --- DOCUMENT HEADER - PREMIUM --- */}
                                <div className="text-center mb-8">
                                    <h1 className="text-lg font-bold uppercase mb-2 leading-tight">DECLARAÇÃO DE TRANSPORTE DE MUDANÇA RESIDENCIAL<br />E INVENTÁRIO DE BENS</h1>

                                    <div className="text-xs font-bold uppercase tracking-wider mb-4">
                                        Empresa Responsável: {companyData.name}
                                    </div>

                                    <div className="w-full border-t border-black mb-1"></div>
                                    <div className="w-full border-t border-black mb-6"></div> {/* Double line effect */}
                                </div>

                                {/* --- DATA SECTIONS - COMPACT FORM STYLE --- */}
                                <div className="mb-8 border border-black text-xs">

                                    {/* 1. CLIENTE */}
                                    <div className="bg-gray-100 border-b border-black px-2 py-1 font-bold uppercase">1. Dados do Cliente / Proprietário</div>
                                    <div className="p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline mb-1">
                                        <span className="font-bold">NOME:</span>
                                        <span className="uppercase font-bold border-b border-gray-300 w-full block">{clientName}</span>
                                    </div>
                                    <div className="p-2 pt-0 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2 items-baseline">
                                        <span className="font-bold">CPF/CNPJ:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{clientCpf}</span>
                                        <span className="font-bold">TELEFONE:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{clientPhone}</span>
                                    </div>

                                    {/* 2. VIAGEM */}
                                    <div className="bg-gray-100 border-y border-black px-2 py-1 font-bold uppercase mt-1">2. Dados da Viagem</div>
                                    <div className="p-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline mb-1">
                                        <span className="font-bold">ORIGEM:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{originAddress}</span>
                                        <span className="font-bold">DESTINO:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{destinationAddress}</span>
                                    </div>
                                    <div className="p-2 pt-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline w-1/2">
                                        <span className="font-bold">DATA COLETA:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{pickupDate ? new Date(pickupDate).toLocaleDateString('pt-BR') : ''}</span>
                                    </div>

                                    {/* 3. MOTORISTA */}
                                    <div className="bg-gray-100 border-y border-black px-2 py-1 font-bold uppercase mt-1">3. Dados do Motorista</div>
                                    <div className="p-2 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2 items-baseline mb-1">
                                        <span className="font-bold">MOTORISTA:</span>
                                        <span className="uppercase font-bold border-b border-gray-300 w-full block">{driverName}</span>
                                        <span className="font-bold">CPF:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{driverCpf}</span>
                                    </div>
                                    <div className="p-2 pt-0 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2 items-baseline mb-1">
                                        <span className="font-bold">VEÍCULO:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{driverModel}</span>
                                        <span className="font-bold">PLACA:</span>
                                        <span className="uppercase font-bold border-b border-gray-300 w-full block">{driverPlate}</span>
                                    </div>
                                    <div className="p-2 pt-0 grid grid-cols-[auto_1fr_auto_1fr] gap-x-4 gap-y-2 items-baseline">
                                        <span className="font-bold">CNH REGISTRO:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{driverCnhRegister}</span>
                                        <span className="font-bold">RNTRC:</span>
                                        <span className="uppercase border-b border-gray-300 w-full block">{driverRntrc}</span>
                                    </div>

                                </div>

                                {/* 4. DECLARAÇÃO DE CONTEÚDO (MOVED UP) */}
                                <div className="mb-8 border border-black text-xs">
                                    <div className="bg-gray-100 border-b border-black px-2 py-1 font-bold uppercase">4. Declaração de Conteúdo</div>
                                    <div className="p-2 text-justify text-sm leading-relaxed font-serif text-black">
                                        Declaro, sob as penas da lei, que os bens relacionados no presente inventário são de minha exclusiva propriedade e compõem minha <span className="font-bold">MUDANÇA RESIDENCIAL</span>, tratando-se de itens usados para uso pessoal e doméstico. Declaro expressamente que a carga não possui destinação comercial ou industrial, não configurando fato gerador de ICMS (Não Incidência), servindo este documento para fins de transporte e fiscalização em todo o território nacional.
                                    </div>
                                </div>

                                {/* --- INVENTORY ITEMS --- */}
                                <div className="mb-8">
                                    <div className="bg-gray-100 border border-black px-2 py-1 mb-2 font-bold uppercase text-xs">
                                        Relatório de Inventário
                                    </div>

                                    {!isFreeTextMode ? (
                                        <table className="w-full text-xs border-collapse border border-black">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="border border-black px-2 py-1 w-16 text-center">QTD</th>
                                                    <th className="border border-black px-2 py-1 text-left">DESCRIÇÃO DOS BENS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.filter(i => i.qty > 0 || i.description.trim() !== '').map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black px-2 py-1 text-center font-bold">{item.qty}</td>
                                                        <td className="border border-black px-2 py-1 uppercase">{item.description}</td>
                                                    </tr>
                                                ))}
                                                {items.length === 0 && (
                                                    <tr>
                                                        <td className="border border-black px-2 py-6 text-center text-gray-400 italic" colSpan={2}>
                                                            Lista de itens vazia.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <div className="border border-black p-4 min-h-[300px] text-xs uppercase leading-relaxed whitespace-pre-wrap font-mono text-justify">
                                            {freeTextContent || <span className="text-gray-400 italic normal-case">Nenhum item informado.</span>}
                                        </div>
                                    )}
                                </div>

                                {/* --- ATTACHED IMAGES --- */}
                                {attachedImages.length > 0 && (
                                    <div className="mb-8 break-before-page">
                                        <div className="bg-gray-100 border border-black px-2 py-1 mb-4 font-bold uppercase text-xs">
                                            Anexos / Imagens
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {attachedImages.map((img, idx) => (
                                                <div key={idx} className="border border-gray-300 p-2">
                                                    <img src={img} alt={`Anexo ${idx + 1}`} className="w-full h-auto object-contain max-h-[400px]" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* --- LEGAL TEXT & SIGNATURES (PROTECTED BREAK) --- */}
                                <div style={{ pageBreakInside: 'avoid' }} className="mt-auto">

                                    {/* 5. TERMO HEADER */}
                                    <div className="bg-gray-100 px-2 py-1 mb-2 border border-black font-bold uppercase text-xs">
                                        5. Termo de Responsabilidade e Conferência
                                    </div>

                                    <div className="text-justify text-xs leading-relaxed mb-4 px-1 text-black font-medium">
                                        O cliente declara que conferiu a lista acima no momento da coleta e que os itens correspondem à totalidade dos bens embarcados. A Viacargo atua como intermediadora logística, conectando o cliente ao transportador autônomo identificado acima.
                                    </div>

                                    <div className="px-1 mb-12 font-bold text-xs uppercase">
                                        Curitiba, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                                    </div>

                                    {/* Signature Block - Tightened */}
                                    <div className="flex justify-between items-end gap-12 px-4 mb-8">

                                        <div className="flex-1 text-center">
                                            <div className="w-full border-t border-black mb-1"></div>
                                            <p className="text-[10px] uppercase font-bold text-black">{clientName || 'Assinatura do Cliente'}</p>
                                            <p className="text-[9px] font-bold text-black">CONTRATANTE</p>
                                        </div>

                                        <div className="flex-1 text-center">
                                            <div className="w-full border-t border-black mb-1"></div>
                                            <p className="text-[10px] uppercase font-bold text-black">{driverName || 'Assinatura do Motorista'}</p>
                                            <p className="text-[9px] font-bold text-black">TRANSPORTADOR</p>
                                        </div>

                                    </div>

                                    {/* Company Signature */}
                                    <div className="text-center">
                                        <p className="text-[9px] text-gray-500 uppercase tracking-widest">VIACARGO INTERMEDIAÇÃO LOGÍSTICA & TRANSPORTES LTDA</p>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
