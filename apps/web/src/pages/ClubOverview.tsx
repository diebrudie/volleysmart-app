import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Settings,
  UserPlus,
  Users,
  BarChart3,
  TrendingUp,
  Plus,
  CalendarDays,
  MapPin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildImageUrl } from "@/utils/buildImageUrl";
import { fetchMemberCount, deactivateMembersByUserIds } from "@/integrations/supabase/clubMembers";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
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
  primary_position: string | null;
}

/**
 * Format display name: "Isabel B." or "Isabel C.B." for multi-part names.
 * First name + first initial of remaining parts.
 */
function formatDisplayName(firstName: string, lastName: string): string {
  const parts = `${firstName} ${lastName}`.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "";
  const display = parts[0];
  const initials = parts.slice(1).map((p) => `${p[0]}.`).join("");
  return `${display} ${initials}`;
}

// ─── Component ────────────────────────────────────────────────────────────
const ClubOverview: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const membersSectionRef = React.useRef<HTMLDivElement>(null);
  const { data: currentPlayerId } = useCurrentPlayerId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [manageMode, setManageMode] = React.useState(false);
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

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

  // Members list — two queries because there's no FK from club_members to players
  const { data: members = [] } = useQuery({
    queryKey: ["club-members-list", clubId],
    queryFn: async () => {
      // 1. Get active club members
      const { data: rows, error } = await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", clubId!)
        .eq("is_active", true)
        .order("role");
      if (error) throw error;
      if (!rows?.length) return [] as MemberRow[];

      // 2. Get player data + positions by user_id
      const userIds = rows.map((r) => r.user_id);
      const { data: players, error: pErr } = await supabase
        .from("players")
        .select("user_id, first_name, last_name, image_url, player_positions(is_primary, positions(name))")
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const playerMap = new Map(
        (players ?? []).map((p: any) => [p.user_id, p])
      );

      // 3. Merge and sort by first name A→Z
      const merged = rows.map((m: any) => {
        const p = playerMap.get(m.user_id);
        const primaryPos = (p?.player_positions ?? []).find((pp: any) => pp.is_primary);
        return {
          user_id: m.user_id,
          role: m.role,
          first_name: p?.first_name ?? "",
          last_name: p?.last_name ?? "",
          image_url: p?.image_url ?? null,
          primary_position: primaryPos?.positions?.name ?? null,
        };
      }) as MemberRow[];
      merged.sort((a, b) => a.first_name.localeCompare(b.first_name));
      return merged;
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

  const createdLabel = format(parseISO(club.created_at), "MMM. yyyy");

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
            Club created in {createdLabel}
          </span>
          {club.city && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
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
            onClick={() => membersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
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
            currentPlayerId={currentPlayerId}
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
      <div className="px-4 pt-6" ref={membersSectionRef}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Members</h2>
          {isAdmin && (
            <button
              type="button"
              className="text-sm font-medium text-primary"
              onClick={() => {
                setManageMode((v) => !v);
                setSelectedUserIds([]);
              }}
            >
              {manageMode ? "Done" : "Manage"}
            </button>
          )}
        </div>
        <div className="space-y-0">
          {members.map((m, idx) => {
            const canSelect =
              manageMode && m.role !== "admin" && m.user_id !== user?.id;
            const isSelected = selectedUserIds.includes(m.user_id);
            const toggleSelect = () => {
              if (!canSelect) return;
              setSelectedUserIds((prev) =>
                isSelected
                  ? prev.filter((id) => id !== m.user_id)
                  : [...prev, m.user_id]
              );
            };
            return (
              <div
                key={m.user_id}
                role={manageMode && canSelect ? "button" : undefined}
                tabIndex={manageMode && canSelect ? 0 : undefined}
                onClick={manageMode ? toggleSelect : undefined}
                className={cn(
                  "w-full flex items-center gap-3 py-3 text-left",
                  manageMode && canSelect && "cursor-pointer hover:bg-muted/50 transition-colors",
                  idx < members.length - 1 && "border-b"
                )}
              >
                {manageMode && (
                  <Checkbox
                    checked={isSelected}
                    disabled={!canSelect}
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={toggleSelect}
                  />
                )}
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
                    {formatDisplayName(m.first_name, m.last_name)}
                  </p>
                  {m.primary_position && (
                    <p className="text-xs text-muted-foreground">{m.primary_position}</p>
                  )}
                </div>
                {m.role === "admin" && (
                  <span className="text-xs text-muted-foreground shrink-0">Admin</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Remove selected members */}
        {manageMode && selectedUserIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Remove {selectedUserIds.length}{" "}
            {selectedUserIds.length === 1 ? "member" : "members"}
          </Button>
        )}
      </div>

      {/* Confirm remove dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove members?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUserIds.length === 1
                ? "This member will be removed from the club."
                : `${selectedUserIds.length} members will be removed from the club.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setDeleting(true);
                try {
                  await deactivateMembersByUserIds(clubId!, selectedUserIds);
                  queryClient.invalidateQueries({
                    queryKey: ["club-members-list", clubId],
                  });
                  queryClient.invalidateQueries({
                    queryKey: ["club-member-count", clubId],
                  });
                  toast({
                    title: "Removed",
                    description: `${selectedUserIds.length} member${selectedUserIds.length > 1 ? "s" : ""} removed.`,
                    duration: 2000,
                  });
                  setSelectedUserIds([]);
                  setManageMode(false);
                } catch {
                  toast({
                    title: "Error",
                    description: "Failed to remove members.",
                    variant: "destructive",
                    duration: 2000,
                  });
                } finally {
                  setDeleting(false);
                  setConfirmOpen(false);
                }
              }}
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            description: club.description,
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
