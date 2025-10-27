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
  isValidatingClub: boolean;
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
  const [isValidatingClub, setIsValidatingClub] = useState(false);

  // Use a mounted ref instead of a "cancelled" flag to satisfy eslint prefer-const
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const CACHE_TTL_MS = 60_000; // 1 minute; adjust as needed
  type Cached = { status: MembershipStatus; ts: number };
  const membershipCache = useRef<Record<string, Cached>>({});

  /**
   * Query membership for a given clubId and current user, with short TTL caching.
   * If `force === true`, bypass cache for a fresh read (used on boot).
   */
  const fetchMembershipStatus = useCallback(
    async (
      clubIdToCheck: string,
      force = false
    ): Promise<MembershipStatus | null> => {
      if (!user?.id) return null;

      if (!force) {
        const cached = membershipCache.current[clubIdToCheck];
        const now = Date.now();
        if (cached && now - cached.ts <= CACHE_TTL_MS) {
          return cached.status;
        }
      }

      const { data, error } = await supabase
        .from("club_members")
        .select("status")
        .eq("user_id", user.id)
        .eq("club_id", clubIdToCheck)
        .maybeSingle();

      if (error || !data) {
        delete membershipCache.current[clubIdToCheck];
        return null;
      }

      if (
        data.status === "active" ||
        data.status === "pending" ||
        data.status === "rejected"
      ) {
        membershipCache.current[clubIdToCheck] = {
          status: data.status,
          ts: Date.now(),
        };
        return data.status;
      }

      delete membershipCache.current[clubIdToCheck];
      return null;
    },
    [user?.id]
  );

  /**
   * Validate any stored club on auth changes.
   * Only accept/persist ACTIVE memberships.
   */
  useEffect(() => {
    // Not authenticated → nothing to validate
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
      setInitialized(true);
      return;
    }

    // Force a fresh server read on boot to respect revocations immediately
    (async () => {
      setIsValidatingClub(true); // ✅ start validation

      const status = await fetchMembershipStatus(stored, true /* force */);
      if (!mountedRef.current) return;

      if (status === "active") {
        setClubIdState(stored);
        setMembershipStatus("active");
      } else {
        localStorage.removeItem("lastVisitedClub");
        setClubIdState(null);
        setMembershipStatus(status);
      }

      setInitialized(true);
      setIsValidatingClub(false); // ✅ end validation
    })();
  }, [user?.id, fetchMembershipStatus]);

  /**
   * Public setter: set clubId and remember it. No async validation here.
   * Validation is performed on boot (stored club) and revocations are handled
   * by RealtimeAppEffect → clears context & navigates away if membership is lost.
   */
  const setClubId = (id: string) => {
    if (clubId === id && membershipStatus === "active") return;
    localStorage.setItem("lastVisitedClub", id);
    setClubIdState(id);
    setMembershipStatus("active");
    // Do NOT toggle isValidatingClub or run fetches here.
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
        isValidatingClub, // NEW
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};
