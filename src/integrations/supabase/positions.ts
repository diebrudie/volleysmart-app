
import { supabase } from "./client";

export async function getAllPositions() {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*');
      
    if (error) {
      console.error("Error fetching positions:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Exception in getAllPositions:", error);
    throw error;
  }
}

export async function getPositionById(id: string) {
  try {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching position:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getPositionById:", error);
    throw error;
  }
}
