// Fix import statement for useAuth
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ClubData {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  created_by: string;
  slug: string | null;
}

interface UseClubDataResult {
  clubData: ClubData | null;
  isLoading: boolean;
  error: Error | null;
}

const useClubData = (): UseClubDataResult => {
  const { user } = useAuth();
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchClubData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!user?.id) {
          console.log("User ID not available. Skipping club data fetch.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('created_by', user.id)
          .single();

        if (error) {
          setError(error);
          console.error("Error fetching club data:", error);
        } else {
          setClubData(data);
        }
      } catch (err: any) {
        setError(err);
        console.error("Unexpected error fetching club data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    // Call the fetch function only if user is available
    if (user?.id) {
      fetchClubData();
    }
  }, [user?.id]);

  return { clubData, isLoading, error };
};

export default useClubData;
