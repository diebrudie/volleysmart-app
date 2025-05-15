
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ClubData } from '@/types/club-data';

interface UseFetchClubResult {
  clubData: ClubData | null;
  isLoading: boolean;
  error: Error | null;
  hasClub: boolean;
  hasCheckedClub: boolean;
}

export const useFetchClub = (userId: string | undefined): UseFetchClubResult => {
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const fetchClubData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!userId) {
          console.log("User ID not available. Skipping club data fetch.");
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('clubs')
          .select('*')
          .eq('created_by', userId)
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
    if (userId) {
      fetchClubData();
    }
  }, [userId]);

  return { 
    clubData, 
    isLoading, 
    error,
    hasClub: !!clubData,
    hasCheckedClub: !isLoading,
  };
};
