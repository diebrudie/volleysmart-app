import { supabase } from "./client";

export async function getAllPositions() {
  const { data, error } = await supabase.from("positions").select("*");

  if (error) {
    console.error("Error fetching positions:", error);
    throw error;
  }

  return data;
}

export async function getPositionById(id: string) {
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching position:", error);
    throw error;
  }

  return data;
}

export async function getPositionByName(name: string) {
  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .ilike("name", name)
    .single();

  if (error) {
    console.error(`Error fetching position with name ${name}:`, error);
    return null; // Return null instead of throwing to make the function more resilient
  }

  return data;
}

export async function ensurePositionsExist() {
  // Check if positions exist
  const { count, error } = await supabase
    .from("positions")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error checking positions:", error);
    return false;
  }

  // If no positions exist, create the default ones
  if (count === 0) {
    const defaultPositions = [
      { name: "Setter" },
      { name: "Outside Hitter" },
      { name: "Middle Blocker" },
      { name: "Opposite" },
      { name: "Libero" },
    ];

    const { error: insertError } = await supabase
      .from("positions")
      .insert(defaultPositions);

    if (insertError) {
      console.error("Error creating default positions:", insertError);
      return false;
    }

    //console. log("Created default volleyball positions");
    return true;
  }

  return true;
}
