import { ServiceOrder, Transaction } from '../types';
import { INITIAL_ORDERS } from '../constants';

const STORAGE_ORDERS_KEY = 'vc_local_orders';
const STORAGE_TRANSACTIONS_KEY = 'vc_local_transactions';
const STORAGE_GOALS_KEY = 'vc_local_goals';

// --- HELPER FUNCTIONS ---

const getLocalOrders = (): ServiceOrder[] => {
    const data = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (!data) {
        localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
        return INITIAL_ORDERS;
    }
    try {
        return JSON.parse(data);
    } catch {
        return INITIAL_ORDERS;
    }
};

const saveLocalOrders = (orders: ServiceOrder[]) => {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
};

const getLocalTransactions = (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_TRANSACTIONS_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const saveLocalTransactions = (transactions: Transaction[]) => {
    localStorage.setItem(STORAGE_TRANSACTIONS_KEY, JSON.stringify(transactions));
};

const getLocalGoals = (): Record<string, number> => {
    const data = localStorage.getItem(STORAGE_GOALS_KEY);
    if (!data) return {};
    try {
        return JSON.parse(data);
    } catch {
        return {};
    }
};

const saveLocalGoals = (goals: Record<string, number>) => {
    localStorage.setItem(STORAGE_GOALS_KEY, JSON.stringify(goals));
};

// --- SERVICE ORDERS CRUD ---

export const fetchServiceOrders = async (): Promise<ServiceOrder[]> => {
    // Retorna as ordens ordenadas pela data de coleta
    const orders = getLocalOrders();
    return orders.sort((a, b) => new Date(a.pickupDate).getTime() - new Date(b.pickupDate).getTime());
};

export const createServiceOrder = async (order: ServiceOrder) => {
    const orders = getLocalOrders();
    orders.push(order);
    saveLocalOrders(orders);
};

export const updateServiceOrder = async (order: ServiceOrder) => {
    const orders = getLocalOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index !== -1) {
        orders[index] = order;
    } else {
        orders.push(order);
    }
    saveLocalOrders(orders);
};

export const deleteServiceOrder = async (id: string) => {
    const orders = getLocalOrders();
    saveLocalOrders(orders.filter(o => o.id !== id));
};

// --- TRANSACTIONS CRUD ---

export const fetchTransactions = async (): Promise<Transaction[]> => {
    const transactions = getLocalTransactions();
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const createTransaction = async (transaction: Transaction) => {
    const transactions = getLocalTransactions();
    transactions.push(transaction);
    saveLocalTransactions(transactions);
};

export const deleteTransaction = async (id: string) => {
    const transactions = getLocalTransactions();
    saveLocalTransactions(transactions.filter(t => t.id !== id));
};

// --- MONTHLY GOALS CRUD ---

export const fetchMonthlyGoals = async (): Promise<Record<string, number>> => {
    return getLocalGoals();
};

export const setMonthlyGoal = async (monthKey: string, value: number) => {
    const goals = getLocalGoals();
    goals[monthKey] = value;
    saveLocalGoals(goals);
};
