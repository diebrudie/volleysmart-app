import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserPlus,
  UserCheck,
  UserX,
  Users,
  UserMinus,
  Calendar,
  CalendarX,
  MessageSquare,
  Bell,
  Volleyball,
  Sparkles,
  CalendarPlus,
  Globe,
  Heart,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchNotificationPreferences,
  getPref,
  upsertNotificationPreference,
  type NotificationPref,
} from "@/integrations/supabase/notificationPreferences";
import type { NotificationType } from "@/integrations/supabase/notifications";
import { cn } from "@/lib/utils";

interface TypeConfig {
  type: NotificationType;
  titleKey: string;
  icon: React.ReactNode;
}

const clubActivityTypes: TypeConfig[] = [
  { type: "club_join_request", titleKey: "type.joinRequest.title", icon: <UserPlus className="h-4 w-4 text-blue-500" /> },
  { type: "club_join_accepted", titleKey: "type.joinAccepted.title", icon: <UserCheck className="h-4 w-4 text-emerald-500" /> },
  { type: "club_join_rejected", titleKey: "type.joinRejected.title", icon: <UserX className="h-4 w-4 text-red-500" /> },
  { type: "club_member_joined", titleKey: "type.memberJoined.title", icon: <Users className="h-4 w-4 text-blue-500" /> },
  { type: "club_member_left", titleKey: "type.memberLeft.title", icon: <UserMinus className="h-4 w-4 text-red-500" /> },
  { type: "club_member_removed", titleKey: "type.memberRemoved.title", icon: <UserX className="h-4 w-4 text-red-500" /> },
];

const eventTypes: TypeConfig[] = [
  { type: "event_created", titleKey: "type.eventCreated.title", icon: <Calendar className="h-4 w-4 text-primary" /> },
  { type: "event_cancelled", titleKey: "type.eventCancelled.title", icon: <CalendarX className="h-4 w-4 text-red-500" /> },
  { type: "event_rsvp", titleKey: "type.rsvp.title", icon: <MessageSquare className="h-4 w-4 text-primary" /> },
  { type: "rsvp_deadline_reminder", titleKey: "type.rsvpReminder.title", icon: <Bell className="h-4 w-4 text-amber-500" /> },
];

const gameTypes: TypeConfig[] = [
  { type: "game_started", titleKey: "type.gameStarted.title", icon: <Volleyball className="h-4 w-4 text-emerald-500" /> },
];

const engagementTypes: TypeConfig[] = [
  { type: "engagement_welcome", titleKey: "type.engagementWelcome.title", icon: <Sparkles className="h-4 w-4 text-primary" /> },
  { type: "engagement_create_club", titleKey: "type.engagementCreateClub.title", icon: <Users className="h-4 w-4 text-blue-500" /> },
  { type: "engagement_create_event", titleKey: "type.engagementCreateEvent.title", icon: <CalendarPlus className="h-4 w-4 text-primary" /> },
  { type: "engagement_public_event", titleKey: "type.engagementPublicEvent.title", icon: <Globe className="h-4 w-4 text-emerald-500" /> },
  { type: "engagement_come_back", titleKey: "type.engagementComeBack.title", icon: <Heart className="h-4 w-4 text-amber-500" /> },
];

export default function NotificationPreferences() {
  const { t } = useTranslation("notifications");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ["notification-preferences", user?.id];

  const { data: prefs } = useQuery({
    queryKey,
    queryFn: () => fetchNotificationPreferences(user!.id),
    enabled: !!user?.id,
  });

  const handleToggle = async (
    type: NotificationType,
    channel: "in_app" | "push" | "email",
    value: boolean
  ) => {
    if (!user?.id || !prefs) return;

    const previous = new Map(prefs);
    const currentPref = getPref(prefs, type);
    prefs.set(type, { ...currentPref, [channel]: value });
    queryClient.setQueryData(queryKey, new Map(prefs));

    try {
      await upsertNotificationPreference(user.id, type, channel, value);
      toast({ description: t("preferences.saved"), duration: 1500 });
    } catch {
      queryClient.setQueryData(queryKey, previous);
    }
  };

  const renderTypeRow = (config: TypeConfig, isLast: boolean) => {
    const pref = prefs ? getPref(prefs, config.type) : { in_app: true, push: true, email: true };

    return (
      <div
        key={config.type}
        className={cn(
          "flex items-center justify-between px-4 py-3",
          !isLast && "border-b border-border"
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            {config.icon}
          </div>
          <span className="text-sm font-medium text-foreground truncate">
            {t(config.titleKey)}
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0 ml-3">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">In-app</span>
            <Switch
              checked={pref.in_app}
              onCheckedChange={(val) => handleToggle(config.type, "in_app", val)}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Push</span>
            <Switch checked={pref.push} disabled />
            <span className="text-[9px] text-muted-foreground/60">Coming soon</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Email</span>
            <Switch checked={pref.email} disabled />
            <span className="text-[9px] text-muted-foreground/60">Coming soon</span>
          </div>
        </div>
      </div>
    );
  };

  const renderCategory = (label: string, types: TypeConfig[]) => (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
        {label}
      </h2>
      <div className="rounded-xl border border-border bg-card">
        {types.map((config, i) => renderTypeRow(config, i === types.length - 1))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">{t("preferences.title")}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-32">
        {renderCategory(t("preferences.category.clubActivity"), clubActivityTypes)}
        {renderCategory(t("preferences.category.events"), eventTypes)}
        {renderCategory(t("preferences.category.games"), gameTypes)}
        {renderCategory(t("preferences.category.engagement"), engagementTypes)}
      </div>
    </div>
  );
}
