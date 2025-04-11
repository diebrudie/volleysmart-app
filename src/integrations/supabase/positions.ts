
import { supabase } from "./client";

export async function getAllPositions() {
  const { data, error } = await supabase
    .from('positions')
    .select('*');
    
  if (error) {
    console.error("Error fetching positions:", error);
    throw error;
  }
  
  return data;
}

export async function getPositionById(id: string) {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('id', id)
    .single();
    
  if (error) {
    console.error("Error fetching position:", error);
    throw error;
  }
  
  return data;
}
