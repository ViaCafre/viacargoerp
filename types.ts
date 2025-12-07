
export type ServiceType = 'helper' | 'assembler' | 'packer' | 'other';

export interface ExtraService {
  id: string;
  type: ServiceType;
  name: string; // "Ajudante", "Montador", etc.
  qty: number;
  cost: number; // Unit cost
}

export interface Financials {
  totalValue: number; // Valor Total OS
  driverCost: number; // Custo fixo motorista
  extras: ExtraService[];
}

export interface PaymentStatus {
  deposit: boolean;  // 20% (Reserva)
  pickup: boolean;   // 40% (Coleta)
  delivery: boolean; // 40% (Entrega)
}

// Progress: 20 (Reserva), 60 (Coleta), 100 (Entrega)
export type ProgressStage = 20 | 60 | 100;

// Changed to string to allow Hex codes for custom colors
export type NoteColor = string;

export type ViewMode = 'default' | 'grid' | 'compact' | 'list' | 'expanded';

export interface OrderNote {
  id: string;
  content: string;
  color: NoteColor;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  clientName: string;
  whatsapp: string;
  origin: string;
  destination: string;

  // Status Flags
  isContractSigned: boolean;
  isPostedFretebras: boolean;

  // Financial Status
  paymentStatus: PaymentStatus;
  isCostsPaid: boolean; // Se os custos (motorista + extras) já foram pagos pela empresa

  progress: ProgressStage;

  financials: Financials;

  pickupDate: string;
  deliveryForecast: string;
  notes: OrderNote[]; // Changed to array of notes
  noteTags: NoteColor; // Main color tag for the card (legacy/summary)
  createdAt: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category?: string;
}

// New Interface for Driver PDF Data
export interface DriverData {
  fullName: string;
  cpf: string;
  cnh: string;
  ntrc: string;
  category: string;
  phone: string;
  uf: string;
  plate: string;
  vehicle: string;
  validity: string;
  cnhImage?: string | null; // Base64 string
  inventoryList?: string;
  isValid: boolean;
  freightValue?: string; // Valor do frete
  issuerSignature?: string | null; // Base64 signature of Via Cargo Manager
}

// Interface for Team Order Data (Helpers, Assemblers, Packers)
export interface TeamOrderData {
  quantity: number;
  scheduledTime: string; // HH:MM format
  unitCost: number; // Cost per professional
  calculatedCost: number; // quantity * unitCost
  workLocation: 'origin' | 'destination'; // Where the team will work
  workDate: string; // Date for the work
  itemsList?: string; // List of items/furniture (for Montador/Embalador)
}

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const calculateCosts = (financials: Financials): number => {
  const extrasTotal = financials.extras.reduce((acc, curr) => acc + (curr.cost * curr.qty), 0);
  return financials.driverCost + extrasTotal;
};

export const calculateProfit = (financials: Financials): number => {
  return financials.totalValue - calculateCosts(financials);
};

// Helper to calc amount received based on checkpoints
export const calculateReceivedAmount = (order: ServiceOrder): number => {
  let received = 0;
  const total = order.financials.totalValue;
  if (order.paymentStatus.deposit) received += total * 0.20;
  if (order.paymentStatus.pickup) received += total * 0.40;
  if (order.paymentStatus.delivery) received += total * 0.40;
  return received;
};