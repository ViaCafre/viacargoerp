import React, { forwardRef } from 'react';
import { ServiceOrder, DriverData, formatCurrency } from '../types';

export type PrintRole = 'motorista' | 'ajudante' | 'embalador' | 'montador' | 'geral';

interface PrintableProps {
    order: ServiceOrder;
    role: PrintRole;
    config?: any; // Configuração de Mão de Obra (qty, valor, horário, endereço escolhido)
    driverData?: DriverData;
    customNote?: string;
}

export const PrintableServiceOrder = forwardRef<HTMLDivElement, PrintableProps>(({ order, role, config, driverData, customNote }, ref) => {

    // Lógica para definir qual endereço mostrar (apenas para Ajudantes/Montadores)
    const targetAddress = config?.workLocation === 'destination' ? order.destination : order.origin;
    const targetLabel = config?.workLocation === 'destination' ? 'DESTINO' : 'ORIGEM';

    return (
        // CONTAINER A4 (Safe Zone embutida no Padding)
        <div ref={ref} className="w-[794px] min-h-[1123px] bg-white p-10 text-slate-900 box-border relative print-container">

            {/* CABEÇALHO */}
            <header className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start print-safe-block">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">VIACARGO</h1>
                    <h2 className="text-sm font-bold text-amber-500 tracking-widest uppercase">Soluções em logística</h2>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-slate-600">OS: #{order.id}</p>
                    <p className="text-xs text-slate-500">Emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </header>

            {/* TÍTULO DINÂMICO */}
            <div className="bg-slate-900 text-white p-3 mb-6 rounded print-safe-block">
                <h2 className="text-center font-bold uppercase tracking-wider">
                    ORDEM DE SERVIÇO - {role.toUpperCase()}
                </h2>
            </div>

            {/* DADOS DO CLIENTE (Comum a todos) */}
            <section className="mb-8 print-safe-block">
                <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-3">Dados do Cliente</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="block font-bold text-slate-700">NOME</span>
                        <span className="block uppercase">{order.clientName}</span>
                    </div>
                    <div>
                        <span className="block font-bold text-slate-700">TELEFONE / WHATSAPP</span>
                        <span className="block bg-amber-100/50 px-2 py-0.5 rounded inline-block font-bold">
                            {/* Aplicar máscara se possível */}
                            {order.whatsapp}
                        </span>
                    </div>
                </div>
            </section>

            {/* LÓGICA DE EXIBIÇÃO: MÃO DE OBRA (Ajudante/Montador) */}
            {role !== 'motorista' && role !== 'geral' && (
                <section className="mb-8 bg-slate-50 p-6 rounded-xl border border-slate-200 print-safe-block">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-4">Detalhes do Serviço ({role})</h3>

                    <div className="mb-4">
                        <span className="text-xs font-bold text-amber-600 uppercase mb-1 block">Local de Apresentação ({targetLabel})</span>
                        <p className="text-lg font-medium text-slate-900">{targetAddress}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-4">
                        <div>
                            <span className="block text-xs font-bold text-slate-500 uppercase">Data e Hora</span>
                            <div className="text-base font-bold text-slate-800">
                                {new Date(config?.workDate || order.pickupDate).toLocaleDateString('pt-BR')} às {config?.scheduledTime || '08:00'}
                            </div>
                        </div>

                        <div className="bg-slate-900 text-white p-4 rounded-lg shadow-sm">
                            <span className="block text-xs text-slate-400 uppercase mb-1">Total a Receber</span>
                            <div className="flex justify-between items-end">
                                <span className="text-sm">{config?.quantity} Profissionais x (Custo Unitário)</span>
                                <span className="text-2xl font-bold text-amber-400">{formatCurrency(config?.calculatedCost || 0)}</span>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* LÓGICA DE EXIBIÇÃO: MOTORISTA */}
            {role === 'motorista' && (
                <>
                    <section className="mb-6 print-safe-block">
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">Origem / Coleta</h3>
                                <p className="text-sm font-medium text-slate-900">{order.origin}</p>
                                <p className="text-xs text-slate-500 mt-1">Data: {new Date(order.pickupDate).toLocaleDateString('pt-BR')}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-2">Destino / Entrega</h3>
                                <p className="text-sm font-medium text-slate-900">{order.destination}</p>
                                <p className="text-xs text-slate-500 mt-1">Previsão: {new Date(order.deliveryForecast).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>
                    </section>

                    {/* DADOS DO MOTORISTA */}
                    <section className="mb-6 bg-slate-50 p-4 rounded border border-slate-200 print-safe-block">
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Dados do Motorista</h3>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                            <div>
                                <span className="text-xs text-slate-500 block">Nome:</span>
                                <span className="font-bold">{driverData?.fullName}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">CPF:</span>
                                <span className="font-bold">{driverData?.cpf}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Veículo:</span>
                                <span className="font-bold">{driverData?.vehicle}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-500 block">Placa:</span>
                                <span className="font-bold uppercase">{driverData?.plate} ({driverData?.uf})</span>
                            </div>
                        </div>
                    </section>

                    {/* LISTA DE ITENS */}
                    {driverData?.inventoryList && (
                        <section className="mb-8">
                            <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-3">Lista de Itens</h3>
                            <div className="bg-slate-50 p-4 rounded border border-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed print-block">
                                {driverData.inventoryList}
                            </div>
                        </section>
                    )}
                </>

            )
            }

            {/* CNH SECTION - ADDED */}
            {role === 'motorista' && driverData?.cnhImage && (
                <section className="mb-8 border-t border-slate-200 pt-6 print-safe-block">
                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        Anexo: Carteira Nacional de Habilitação (CNH)
                    </h3>
                    <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex justify-center">
                        <img
                            src={driverData.cnhImage}
                            alt="CNH do Motorista"
                            className="max-w-full max-h-[400px] object-contain pdf-image"
                        />
                    </div>
                </section>
            )}

            {/* NOTAS PERSONALIZADAS */}
            {
                customNote && (
                    <section className="mb-8 print-safe-block">
                        <h3 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 pb-1 mb-3">Observações / Instruções</h3>
                        <p className="text-sm text-slate-700 italic border-l-4 border-amber-400 pl-4 py-2 bg-amber-50">
                            "{customNote}"
                        </p>
                    </section>
                )
            }

            {/* ESPAÇO PARA ASSINATURAS (Rodapé fixo ou fluido) */}
            <div className="mt-12 grid grid-cols-2 gap-10 print-safe-block">
                {/* Assinatura Cliente/Responsável */}
                <div className="flex flex-col justify-end">
                    <div className="border-t border-slate-400 pt-2 text-center">
                        <p className="text-xs font-bold uppercase">Responsável pela Equipe / Cliente</p>
                        <p className="text-[10px] text-slate-400">CPF: _________________</p>
                    </div>
                </div>

                {/* Assinatura Viacargo */}
                <div className="flex flex-col gap-4">
                    {/* Container Flex para evitar colisão da Imagem */}
                    <div className="h-20 flex items-end justify-center pb-2 relative">
                        {driverData?.issuerSignature ? (
                            <img src={driverData.issuerSignature} className="max-h-full object-contain" alt="Assinatura" />
                        ) : (
                            <div className="h-full w-full"></div> // Espaço vazio seguro
                        )}
                    </div>
                    <div className="border-t border-slate-400 pt-2 text-center">
                        <p className="text-xs font-bold uppercase">Viacargo Soluções em logística</p>
                        <p className="text-[10px] text-slate-400">Emissor Autorizado</p>
                    </div>
                </div>
            </div>

            {/* RODAPÉ LEGAL */}
            <footer className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4 print-safe-block">
                <p>CNPJ: 54.826.258/0001-70 • Contato: (41) 8747-1778</p>
            </footer>

        </div >
    );
});

PrintableServiceOrder.displayName = "PrintableServiceOrder";
