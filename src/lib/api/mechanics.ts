import { supabase } from '../supabase';
import { Mechanic, MechanicWorkingHour, MechanicAppointment } from '../../types/mechanic';
import { Appointment } from '../../types/appointment';

/**
 * Fetch all mechanics for a repair shop
 */
export async function getMechanicsByRepairShop(repairShopId: string): Promise<Mechanic[]> {
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .eq('repair_shop_id', repairShopId)
    .order('first_name');

  if (error) {
    throw new Error(`Error fetching mechanics: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch a single mechanic by ID
 */
export async function getMechanicById(mechanicId: string): Promise<Mechanic | null> {
  const { data, error } = await supabase
    .from('mechanics')
    .select('*')
    .eq('id', mechanicId)
    .single();

  if (error) {
    throw new Error(`Error fetching mechanic: ${error.message}`);
  }

  return data;
}

/**
 * Create a new mechanic
 */
export async function createMechanic(mechanic: Omit<Mechanic, 'id' | 'created_at' | 'updated_at'>): Promise<Mechanic> {
  const { data, error } = await supabase
    .from('mechanics')
    .insert([mechanic])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mechanic: ${error.message}`);
  }

  return data;
}

/**
 * Update a mechanic
 */
export async function updateMechanic(mechanicId: string, updates: Partial<Mechanic>): Promise<Mechanic> {
  const { data, error } = await supabase
    .from('mechanics')
    .update(updates)
    .eq('id', mechanicId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating mechanic: ${error.message}`);
  }

  return data;
}

/**
 * Delete a mechanic
 */
export async function deleteMechanic(mechanicId: string): Promise<void> {
  const { error } = await supabase
    .from('mechanics')
    .delete()
    .eq('id', mechanicId);

  if (error) {
    throw new Error(`Error deleting mechanic: ${error.message}`);
  }
}

/**
 * Fetch working hours for a mechanic
 */
export async function getMechanicWorkingHours(mechanicId: string): Promise<MechanicWorkingHour[]> {
  const { data, error } = await supabase
    .from('mechanic_working_hours')
    .select('*')
    .eq('mechanic_id', mechanicId)
    .order('day_of_week');

  if (error) {
    throw new Error(`Error fetching working hours: ${error.message}`);
  }

  return data || [];
}

/**
 * Update or create working hours for a mechanic
 */
export async function upsertMechanicWorkingHours(workingHours: Omit<MechanicWorkingHour, 'id' | 'created_at' | 'updated_at'>[]): Promise<MechanicWorkingHour[]> {
  const { data, error } = await supabase
    .from('mechanic_working_hours')
    .upsert(workingHours, { onConflict: 'mechanic_id,day_of_week' })
    .select();

  if (error) {
    throw new Error(`Error upserting working hours: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch appointments assigned to a mechanic
 */
export async function getMechanicAppointments(mechanicId: string): Promise<MechanicAppointment[]> {
  const { data, error } = await supabase
    .from('mechanic_appointments')
    .select(`
      *,
      appointment:appointments(*)
    `)
    .eq('mechanic_id', mechanicId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Error fetching mechanic appointments: ${error.message}`);
  }

  return data || [];
}

/**
 * Assign a mechanic to an appointment
 */
export async function assignMechanicToAppointment(appointmentId: string, mechanicId: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ assigned_mechanic_id: mechanicId })
    .eq('id', appointmentId);

  if (error) {
    throw new Error(`Error assigning mechanic to appointment: ${error.message}`);
  }
}

/**
 * Create a mechanic appointment record
 */
export async function createMechanicAppointment(mechanicAppointment: Omit<MechanicAppointment, 'id' | 'created_at' | 'updated_at'>): Promise<MechanicAppointment> {
  const { data, error } = await supabase
    .from('mechanic_appointments')
    .insert([mechanicAppointment])
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mechanic appointment: ${error.message}`);
  }

  return data;
}

/**
 * Update a mechanic appointment record
 */
export async function updateMechanicAppointment(mechanicAppointmentId: string, updates: Partial<MechanicAppointment>): Promise<MechanicAppointment> {
  const { data, error } = await supabase
    .from('mechanic_appointments')
    .update(updates)
    .eq('id', mechanicAppointmentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating mechanic appointment: ${error.message}`);
  }

  return data;
}

/**
 * Get available mechanics for a given date
 */
export async function getAvailableMechanics(repairShopId: string, date: string): Promise<Mechanic[]> {
  const { data, error } = await supabase
    .rpc('get_available_mechanics_for_shop', {
      shop_id: repairShopId,
      check_date: date
    });

  if (error) {
    throw new Error(`Error fetching available mechanics: ${error.message}`);
  }

  return data || [];
}