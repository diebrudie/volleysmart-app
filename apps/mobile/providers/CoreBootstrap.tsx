import { useEffect, useState, type PropsWithChildren } from "react";
import { setSupabaseClient } from "@volleysmart/core";
import { supabase } from "@/constants/supabase";

export function CoreBootstrap({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSupabaseClient(supabase as any);
    setReady(true);
  }, []);

  if (!ready) return null;

  return <>{children}</>;
}
