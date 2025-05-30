import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface ClubContextType {
  clubId: string | null;
  setClubId: (id: string) => void;
  clearClubId: () => void;
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
  const [clubId, setClubIdState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("lastVisitedClub");
    if (stored) setClubIdState(stored);
  }, []);

  const setClubId = (id: string) => {
    localStorage.setItem("lastVisitedClub", id);
    setClubIdState(id);
  };

  const clearClubId = () => {
    localStorage.removeItem("lastVisitedClub");
    setClubIdState(null);
  };

  return (
    <ClubContext.Provider value={{ clubId, setClubId, clearClubId }}>
      {children}
    </ClubContext.Provider>
  );
};
