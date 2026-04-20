import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Settings,
  UserPlus,
  Users,
  BarChart3,
  TrendingUp,
  Plus,
  Clock,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildImageUrl } from "@/utils/buildImageUrl";
import { fetchMemberCount } from "@/integrations/supabase/clubMembers";
import { EventCard } from "@/components/events/EventCard";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";
import ClubSettingsDialog from "@/components/clubs/ClubSettingsDialog";
import type { PlannedEvent } from "@/integrations/supabase/plannedEvents";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ────────────────────────────────────────────────────────────────
interface ClubDetails {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  slug: string;
  city: string | null;
  country: string | null;
}

interface MemberRow {
  user_id: string;
  role: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────
const ClubOverview: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Club details
  const { data: club, isLoading: clubLoading } = useQuery({
    queryKey: ["club-detail", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clubs")
        .select(
          "id, name, image_url, created_at, created_by, description, slug, city, country"
        )
        .eq("id", clubId!)
        .single();
      if (error) throw error;
      return data as ClubDetails;
    },
    enabled: !!clubId,
  });

  // Member count
  const { data: memberCount = 0 } = useQuery({
    queryKey: ["club-member-count", clubId],
    queryFn: () => fetchMemberCount(clubId!),
    enabled: !!clubId,
  });

  // User's role in this club
  const { data: userRole } = useQuery({
    queryKey: ["club-user-role", clubId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId!)
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .maybeSingle();
      return data?.role ?? null;
    },
    enabled: !!clubId && !!user?.id,
  });

  const isAdmin =
    userRole === "admin" || club?.created_by === user?.id;

  // Next upcoming event for this club
  const { data: nextEvent } = useQuery({
    queryKey: ["club-next-event", clubId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("planned_events")
        .select(
          `*, clubs!planned_events_club_id_fkey(id, name, image_url),
           locations!planned_events_location_id_fkey(name, address),
           event_rsvp(status, player_id)`
        )
        .eq("club_id", clubId!)
        .in("status", ["open", "confirmed"])
        .gte("date", today)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PlannedEvent | null;
    },
    enabled: !!clubId,
  });

  // Members list
  const { data: members = [] } = useQuery({
    queryKey: ["club-members-list", clubId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("club_members")
        .select("user_id, role, players!inner(first_name, last_name, image_url)")
        .eq("club_id", clubId!)
        .eq("is_active", true)
        .order("role");
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        first_name: m.players?.first_name ?? "",
        last_name: m.players?.last_name ?? "",
        image_url: m.players?.image_url ?? null,
      })) as MemberRow[];
    },
    enabled: !!clubId,
  });

  if (clubLoading || !club) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  const createdYear = format(parseISO(club.created_at), "yyyy");

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      {/* Hero */}
      <div className="relative h-48 sm:h-56">
        {club.image_url ? (
          <img
            src={buildImageUrl(club.image_url, { w: 1200 })}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/60 to-primary/20" />
        )}
        {/* Overlay for readability */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur flex items-center justify-center"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Settings (admin only) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur flex items-center justify-center"
            aria-label="Club settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Club info */}
      <div className="px-4 pt-5 space-y-3">
        <h1 className="text-2xl font-bold">{club.name}</h1>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Playing since {createdYear}
          </span>
          {club.city && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {club.city}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {memberCount} {memberCount === 1 ? "Member" : "Members"}
          </span>
        </div>

        {club.description && (
          <p className="text-sm text-muted-foreground">{club.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 pt-5">
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <ActionButton
            icon={<UserPlus className="h-5 w-5" />}
            label="Invite"
            onClick={() => setInviteOpen(true)}
          />
          <ActionButton
            icon={<Users className="h-5 w-5" />}
            label="Members"
            onClick={() => navigate(`/members/${clubId}`)}
          />
          <ActionButton
            icon={<BarChart3 className="h-5 w-5" />}
            label="Event Insights"
            disabled
          />
          <ActionButton
            icon={<TrendingUp className="h-5 w-5" />}
            label="Stats"
            disabled
          />
        </div>
      </div>

      {/* Upcoming Event */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Upcoming Event</h2>
          <button
            type="button"
            onClick={() => navigate("/events/new")}
            className="flex items-center gap-1 text-sm font-medium text-primary"
          >
            <Plus className="h-4 w-4" />
            Create an event
          </button>
        </div>

        {nextEvent ? (
          <EventCard
            event={nextEvent}
            onClick={() => navigate(`/events/${nextEvent.id}`)}
          />
        ) : (
          <div className="rounded-2xl border bg-card p-6 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming events
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => navigate("/events/new")}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create Event
            </Button>
          </div>
        )}
      </div>

      {/* Members list */}
      <div className="px-4 pt-6">
        <h2 className="text-lg font-bold mb-3">Members</h2>
        <div className="space-y-0">
          {members.map((m, idx) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => navigate(`/user/${m.user_id}`)}
              className={cn(
                "w-full flex items-center gap-3 py-3 text-left hover:bg-muted/50 transition-colors",
                idx < members.length - 1 && "border-b"
              )}
            >
              <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                {m.image_url ? (
                  <img
                    src={buildImageUrl(m.image_url, { w: 80 })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-medium">
                    {m.first_name?.[0]}
                    {m.last_name?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.first_name} {m.last_name}
                </p>
                {m.role === "admin" && (
                  <p className="text-xs text-muted-foreground">Admin</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Invite sheet */}
      <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Invite Members</SheetTitle>
          </SheetHeader>
          <ClubInviteSharePanel joinCode={club.slug} />
        </SheetContent>
      </Sheet>

      {/* Settings dialog */}
      {isAdmin && (
        <ClubSettingsDialog
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          club={{
            id: club.id,
            name: club.name,
            image_url: club.image_url,
            slug: club.slug,
            city: club.city,
            country: club.country,
          }}
        />
      )}
    </div>
  );
};

// ─── Action button ────────────────────────────────────────────────────────
const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick?: () => void;
}> = ({ icon, label, disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex flex-col items-center gap-1.5 min-w-[72px]",
      disabled && "opacity-40 cursor-not-allowed"
    )}
  >
    <div
      className={cn(
        "h-14 w-14 rounded-full border-2 border-muted flex items-center justify-center",
        "bg-muted/50 text-muted-foreground",
        !disabled && "hover:bg-muted transition-colors"
      )}
    >
      {icon}
    </div>
    <span className="text-[11px] font-medium text-center leading-tight">
      {label}
    </span>
  </button>
);

export default ClubOverview;
