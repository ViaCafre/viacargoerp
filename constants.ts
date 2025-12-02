import { ServiceOrder } from './types';

export const INITIAL_ORDERS: ServiceOrder[] = [
  {
    id: 'OS-2024-001',
    clientName: 'Roberto Silva',
    whatsapp: '11999999999',
    origin: 'Jardins, São Paulo - SP',
    destination: 'Batel, Curitiba - PR',
    isContractSigned: true,
    isPostedFretebras: true,
    paymentStatus: {
      deposit: true,
      pickup: true,
      delivery: true
    },
    isCostsPaid: true,
    progress: 100,
    financials: {
      totalValue: 5500,
      driverCost: 2200,
      extras: [
        { id: 'ex-1', type: 'helper', name: 'Ajudante', qty: 2, cost: 150 },
        { id: 'ex-2', type: 'packer', name: 'Embalador', qty: 1, cost: 200 }
      ]
    },
    pickupDate: '2023-10-25',
    deliveryForecast: '2023-10-27',
    notes: 'Cliente VIP. Cuidado extremo com o piano de cauda.',
    noteTags: 'emerald',
    createdAt: new Date().toISOString()
  },
  {
    id: 'OS-2024-002',
    clientName: 'Dra. Mariana Costa',
    whatsapp: '21988888888',
    origin: 'Barra da Tijuca, RJ',
    destination: 'Savassi, Belo Horizonte - MG',
    isContractSigned: true,
    isPostedFretebras: false,
    paymentStatus: {
      deposit: true,
      pickup: false,
      delivery: false
    },
    isCostsPaid: false,
    progress: 60,
    financials: {
      totalValue: 3800,
      driverCost: 1800,
      extras: [
        { id: 'ex-3', type: 'assembler', name: 'Montador', qty: 1, cost: 250 }
      ]
    },
    pickupDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days from now
    deliveryForecast: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    notes: 'Aguardando confirmação de pagamento da coleta.',
    noteTags: 'amber',
    createdAt: new Date().toISOString()
  },
  {
    id: 'OS-2024-003',
    clientName: 'Tech Solutions Ltda',
    whatsapp: '41977777777',
    origin: 'Centro Cívico, Curitiba - PR',
    destination: 'Jurerê Internacional, SC',
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
      totalValue: 8000,
      driverCost: 3500,
      extras: [
        { id: 'ex-4', type: 'helper', name: 'Ajudante', qty: 4, cost: 150 }
      ]
    },
    pickupDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
    deliveryForecast: new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0],
    notes: 'Mudança corporativa. Nota fiscal antecipada solicitada.',
    noteTags: 'blue',
    createdAt: new Date().toISOString()
  }
];