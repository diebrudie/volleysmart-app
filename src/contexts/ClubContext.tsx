import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * ClubContext: holds the "current club" selection.
 * Only accepts a clubId if the authenticated user has ACTIVE membership in that club.
 */

type MembershipStatus = "pending" | "active" | "rejected";

interface ClubContextType {
  clubId: string | null;
  membershipStatus: MembershipStatus | null;
  setClubId: (id: string) => void; // Validates before persisting
  clearClubId: () => void;
  initialized: boolean;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error("useClub must be used within a ClubProvider");
  }
  return context;
};

export const ClubProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [clubId, setClubIdState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [membershipStatus, setMembershipStatus] =
    useState<MembershipStatus | null>(null);

  // Use a mounted ref instead of a "cancelled" flag to satisfy eslint prefer-const
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const membershipCache = useRef<Record<string, MembershipStatus>>({});

  /**
   * Query membership for a given clubId and current user.
   * Returns the status if a row exists and matches the union, otherwise null.
   */
  const fetchMembershipStatus = useCallback(
    async (clubIdToCheck: string): Promise<MembershipStatus | null> => {
      if (!user?.id) return null;

      // 1. Check in-memory cache first
      if (membershipCache.current[clubIdToCheck]) {
        return membershipCache.current[clubIdToCheck];
      }

      // 2. Otherwise, query Supabase
      const { data, error } = await supabase
        .from("club_members")
        .select("status")
        .eq("user_id", user.id)
        .eq("club_id", clubIdToCheck)
        .maybeSingle();

      if (error || !data) return null;

      // 3. Validate and store in cache
      if (
        data.status === "active" ||
        data.status === "pending" ||
        data.status === "rejected"
      ) {
        membershipCache.current[clubIdToCheck] = data.status;
        return data.status;
      }

      return null;
    },
    [user?.id]
  );

  /**
   * Validate any stored club on auth changes.
   * Only accept/persist ACTIVE memberships.
   */
  useEffect(() => {
    if (!user?.id) {
      localStorage.removeItem("lastVisitedClub");
      setClubIdState(null);
      setMembershipStatus(null);
      setInitialized(true);
      return;
    }

    const stored = localStorage.getItem("lastVisitedClub");
    if (!stored) {
      setClubIdState(null);
      setMembershipStatus(null);
      setInitialized(true); // ✅ finished initial resolution when no stored club
      return;
    }

    (async () => {
      const status = await fetchMembershipStatus(stored);
      if (!mountedRef.current) return;

      if (status === "active") {
        setClubIdState(stored);
        setMembershipStatus("active");
      } else {
        // Pending/rejected/unknown → do not accept this as current club
        localStorage.removeItem("lastVisitedClub");
        setClubIdState(null);
        setMembershipStatus(status);
      }
      setInitialized(true);
    })();
  }, [user?.id, fetchMembershipStatus]);

  /**
   * Public setter: validate before persisting.
   * Remains a sync signature; async is encapsulated inside.
   */
  const setClubId = (id: string) => {
    (async () => {
      const status = await fetchMembershipStatus(id);
      if (!mountedRef.current) return;

      if (status === "active") {
        localStorage.setItem("lastVisitedClub", id);
        setClubIdState(id);
        setMembershipStatus("active");
      } else {
        localStorage.removeItem("lastVisitedClub");
        setClubIdState(null);
        setMembershipStatus(status);
      }
    })();
  };

  const clearClubId = () => {
    localStorage.removeItem("lastVisitedClub");
    setClubIdState(null);
    setMembershipStatus(null);
  };

  return (
    <ClubContext.Provider
      value={{
        clubId,
        membershipStatus,
        setClubId,
        clearClubId,
        initialized,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};
