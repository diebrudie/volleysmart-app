import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { List, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchPublicEvents,
  type PlannedEvent,
} from "@/integrations/supabase/plannedEvents";
import { fetchUserClubIds } from "@/integrations/supabase/clubMembers";
import { EventCard } from "@/components/events/EventCard";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { supabase } from "@/integrations/supabase/client";

const DiscoverEvents: React.FC = () => {
  const { t } = useTranslation("events");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = React.useState<"list" | "map">("list");

  const { data: playerId } = useCurrentPlayerId();

  const { data: playerCity } = useQuery({
    queryKey: ["player-city", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("city")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data?.city || undefined;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: userClubIds = [] } = useQuery({
    queryKey: ["user-club-ids", user?.id],
    queryFn: () => fetchUserClubIds(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: publicEvents = [], isLoading } = useQuery({
    queryKey: ["public-events", playerCity],
    queryFn: () => fetchPublicEvents(playerCity),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const discoverEvents = React.useMemo(() => {
    const clubIdSet = new Set(userClubIds);
    return publicEvents.filter((e) => !clubIdSet.has(e.club_id));
  }, [publicEvents, userClubIds]);

  const handleEventClick = (eventId: string) => navigate(`/events/${eventId}`);

  return (
    <div className="px-4 py-4 pb-24">
      {/* View toggle */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">{t("discover.title")}</h1>
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <List className="h-3.5 w-3.5" />
            {t("discover.list")}
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
              view === "map"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            {t("discover.map")}
          </button>
        </div>
      </div>

      {view === "list" ? (
        isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-muted border-t-foreground" />
          </div>
        ) : discoverEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">{t("discover.noPublicEvents")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("discover.checkBack")}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {discoverEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                currentPlayerId={playerId}
                onClick={() => handleEventClick(event.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center rounded-2xl border bg-card">
          <MapPin className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium">{t("discover.mapComingSoon")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("discover.mapDescription")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoverEvents;
