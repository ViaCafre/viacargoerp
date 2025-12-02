import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpCircle, ArrowDownCircle, Calendar, FileText, DollarSign, Save } from 'lucide-react';
import { Transaction } from '../types';
import { Input } from './ui/Input';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Transaction) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      description,
      amount: Math.abs(parseFloat(amount)),
      type,
      date,
    };

    onSubmit(newTransaction);
    
    // Reset form
    setDescription('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60]"
          />

          {/* Modal Container - Flex Centered */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-950/50 border-b border-white/5">
                <h3 className="text-lg font-bold text-white">Nova Transação Avulsa</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                
                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-1.5 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      type === 'income' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <ArrowUpCircle size={16} />
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      type === 'expense' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <ArrowDownCircle size={16} />
                    Saída
                  </button>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                  <Input 
                    label="Descrição" 
                    placeholder="Ex: Venda de material, Conta de Luz..." 
                    icon={<FileText size={16} />}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Input 
                      label="Valor (R$)" 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00" 
                      icon={<DollarSign size={16} />}
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                    />
                    <Input 
                      label="Data" 
                      type="date"
                      icon={<Calendar size={16} />}
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                      type === 'income'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                    }`}
                  >
                    <Save size={18} />
                    Confirmar {type === 'income' ? 'Entrada' : 'Saída'}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};