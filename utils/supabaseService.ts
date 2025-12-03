import { supabase } from './supabaseClient';
import { ServiceOrder, Transaction, Financials, ExtraService } from '../types';

// --- SERVICE ORDERS ---

export const fetchServiceOrders = async (): Promise<ServiceOrder[]> => {
    const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
      *,
      extra_services (*),
      order_notes (*)
    `)
        .order('pickup_date', { ascending: true });

    if (error) throw error;

    return orders.map((o: any) => ({
        id: o.id,
        clientName: o.client_name,
        whatsapp: o.whatsapp,
        origin: o.origin,
        destination: o.destination,
        isContractSigned: o.is_contract_signed,
        isPostedFretebras: o.is_posted_fretebras,
        paymentStatus: {
            deposit: o.payment_deposit,
            pickup: o.payment_pickup,
            delivery: o.payment_delivery
        },
        isCostsPaid: o.is_costs_paid,
        progress: o.progress,
        financials: {
            totalValue: o.total_value,
            driverCost: o.driver_cost,
            extras: o.extra_services.map((e: any) => ({
                id: e.id,
                type: e.type,
                name: e.name,
                qty: e.qty,
                cost: e.cost
            }))
        },
        pickupDate: o.pickup_date,
        deliveryForecast: o.delivery_forecast,
        notes: o.order_notes.map((n: any) => ({
            id: n.id,
            content: n.content,
            color: n.color,
            createdAt: n.created_at
        })),
        noteTags: o.note_tags,
        createdAt: o.created_at
    }));
};

export const createServiceOrder = async (order: ServiceOrder) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Insert Order
    const { error: orderError } = await supabase
        .from('service_orders')
        .insert({
            id: order.id,
            user_id: user.id,
            client_name: order.clientName,
            whatsapp: order.whatsapp,
            origin: order.origin,
            destination: order.destination,
            is_contract_signed: order.isContractSigned,
            is_posted_fretebras: order.isPostedFretebras,
            payment_deposit: order.paymentStatus.deposit,
            payment_pickup: order.paymentStatus.pickup,
            payment_delivery: order.paymentStatus.delivery,
            is_costs_paid: order.isCostsPaid,
            progress: order.progress,
            total_value: order.financials.totalValue,
            driver_cost: order.financials.driverCost,
            pickup_date: order.pickupDate,
            delivery_forecast: order.deliveryForecast,
            // notes: order.notes, // REMOVED: Now using separate table
            note_tags: order.noteTags
        });

    if (orderError) throw orderError;

    // 2. Insert Extras
    if (order.financials.extras.length > 0) {
        const extrasToInsert = order.financials.extras.map(e => ({
            id: e.id,
            service_order_id: order.id,
            type: e.type,
            name: e.name,
            qty: e.qty,
            cost: e.cost
        }));

        const { error: extrasError } = await supabase
            .from('extra_services')
            .insert(extrasToInsert);

        if (extrasError) throw extrasError;
    }

    // 3. Insert Notes
    if (order.notes && order.notes.length > 0) {
        const notesToInsert = order.notes.map(n => ({
            service_order_id: order.id,
            user_id: user.id,
            content: n.content,
            color: n.color
        }));

        const { error: notesError } = await supabase
            .from('order_notes')
            .insert(notesToInsert);

        if (notesError) throw notesError;
    }
};

export const updateServiceOrder = async (order: ServiceOrder) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // 1. Update Order
    const { error: orderError } = await supabase
        .from('service_orders')
        .update({
            client_name: order.clientName,
            whatsapp: order.whatsapp,
            origin: order.origin,
            destination: order.destination,
            is_contract_signed: order.isContractSigned,
            is_posted_fretebras: order.isPostedFretebras,
            payment_deposit: order.paymentStatus.deposit,
            payment_pickup: order.paymentStatus.pickup,
            payment_delivery: order.paymentStatus.delivery,
            is_costs_paid: order.isCostsPaid,
            progress: order.progress,
            total_value: order.financials.totalValue,
            driver_cost: order.financials.driverCost,
            pickup_date: order.pickupDate,
            delivery_forecast: order.deliveryForecast,
            // notes: order.notes, // REMOVED
            note_tags: order.noteTags,
            updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

    if (orderError) throw orderError;

    // 2. Sync Extras (Delete all and re-insert is simpler for this scale)
    const { error: deleteError } = await supabase
        .from('extra_services')
        .delete()
        .eq('service_order_id', order.id);

    if (deleteError) throw deleteError;

    if (order.financials.extras.length > 0) {
        const extrasToInsert = order.financials.extras.map(e => ({
            id: e.id,
            service_order_id: order.id,
            type: e.type,
            name: e.name,
            qty: e.qty,
            cost: e.cost
        }));

        const { error: insertError } = await supabase
            .from('extra_services')
            .insert(extrasToInsert);

        if (insertError) throw insertError;
    }

    // 3. Sync Notes (Delete all and re-insert)
    const { error: deleteNotesError } = await supabase
        .from('order_notes')
        .delete()
        .eq('service_order_id', order.id);

    if (deleteNotesError) throw deleteNotesError;

    if (order.notes && order.notes.length > 0) {
        const notesToInsert = order.notes.map(n => ({
            service_order_id: order.id,
            user_id: user.id,
            content: n.content,
            color: n.color
        }));

        const { error: insertNotesError } = await supabase
            .from('order_notes')
            .insert(notesToInsert);

        if (insertNotesError) throw insertNotesError;
    }
};

export const deleteServiceOrder = async (id: string) => {
    const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- TRANSACTIONS ---

export const fetchTransactions = async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw error;

    return data.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: t.amount,
        type: t.type,
        date: t.date,
        category: t.category
    }));
};

export const createTransaction = async (transaction: Transaction) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('transactions')
        .insert({
            id: transaction.id,
            user_id: user.id,
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
            category: transaction.category
        });

    if (error) throw error;
};

export const deleteTransaction = async (id: string) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

// --- MONTHLY GOALS ---

export const fetchMonthlyGoals = async (): Promise<Record<string, number>> => {
    const { data, error } = await supabase
        .from('monthly_goals')
        .select('month_key, goal_value');

    if (error) throw error;

    const goals: Record<string, number> = {};
    data.forEach((g: any) => {
        goals[g.month_key] = g.goal_value;
    });
    return goals;
};

export const setMonthlyGoal = async (monthKey: string, value: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
        .from('monthly_goals')
        .upsert({
            user_id: user.id,
            month_key: monthKey,
            goal_value: value
        }, { onConflict: 'user_id, month_key' });

    if (error) throw error;
};
