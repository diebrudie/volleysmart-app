import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserPlus,
  Users,
  Calendar,
  CalendarX,
  MessageSquare,
  Bell,
  Volleyball,
  Sparkles,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  fetchNotificationPreferences,
  getPref,
  upsertNotificationPreference,
} from "@/integrations/supabase/notificationPreferences";
import type { NotificationType } from "@/integrations/supabase/notifications";
import { cn } from "@/lib/utils";

interface PrefRow {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
  types: NotificationType[];
}

const clubRequestsRow: PrefRow = {
  titleKey: "preferences.row.clubRequests.title",
  descriptionKey: "preferences.row.clubRequests.description",
  icon: <UserPlus className="h-4 w-4 text-blue-500" />,
  types: ["club_join_request", "club_join_accepted", "club_join_rejected"],
};

const memberChangesRow: PrefRow = {
  titleKey: "preferences.row.memberChanges.title",
  descriptionKey: "preferences.row.memberChanges.description",
  icon: <Users className="h-4 w-4 text-blue-500" />,
  types: ["club_member_joined", "club_member_left", "club_member_removed"],
};

const clubActivityRows: PrefRow[] = [clubRequestsRow, memberChangesRow];

const eventRows: PrefRow[] = [
  {
    titleKey: "type.eventCreated.title",
    descriptionKey: "preferences.row.eventCreated.description",
    icon: <Calendar className="h-4 w-4 text-primary" />,
    types: ["event_created"],
  },
  {
    titleKey: "type.eventCancelled.title",
    descriptionKey: "preferences.row.eventCancelled.description",
    icon: <CalendarX className="h-4 w-4 text-red-500" />,
    types: ["event_cancelled"],
  },
  {
    titleKey: "type.rsvp.title",
    descriptionKey: "preferences.row.rsvp.description",
    icon: <MessageSquare className="h-4 w-4 text-primary" />,
    types: ["event_rsvp"],
  },
  {
    titleKey: "type.rsvpReminder.title",
    descriptionKey: "preferences.row.rsvpReminder.description",
    icon: <Bell className="h-4 w-4 text-amber-500" />,
    types: ["rsvp_deadline_reminder"],
  },
];

const gameRows: PrefRow[] = [
  {
    titleKey: "type.gameStarted.title",
    descriptionKey: "preferences.row.gameStarted.description",
    icon: <Volleyball className="h-4 w-4 text-emerald-500" />,
    types: ["game_started"],
  },
];

const engagementTypes: NotificationType[] = [
  "engagement_welcome",
  "engagement_create_club",
  "engagement_create_event",
  "engagement_public_event",
  "engagement_come_back",
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

  const handleToggleTypes = async (
    types: NotificationType[],
    channel: "in_app" | "push" | "email",
    value: boolean
  ) => {
    if (!user?.id || !prefs) return;

    const previous = new Map(prefs);
    for (const type of types) {
      const currentPref = getPref(prefs, type);
      prefs.set(type, { ...currentPref, [channel]: value });
    }
    queryClient.setQueryData(queryKey, new Map(prefs));

    try {
      await Promise.all(
        types.map((type) =>
          upsertNotificationPreference(user.id, type, channel, value)
        )
      );
      toast({ description: t("preferences.saved"), duration: 1500 });
    } catch {
      queryClient.setQueryData(queryKey, previous);
    }
  };

  const isRowOn = (types: NotificationType[]) =>
    prefs ? types.every((type) => getPref(prefs, type).in_app) : true;

  const isAllCategoryOn = (rows: PrefRow[]) =>
    rows.every((row) => isRowOn(row.types));

  const handleToggleAllCategory = async (rows: PrefRow[], value: boolean) => {
    const allTypes = rows.flatMap((r) => r.types);
    await handleToggleTypes(allTypes, "in_app", value);
  };

  const renderToggleColumn = (
    label: string,
    checked: boolean,
    disabled: boolean,
    comingSoon: boolean,
    onChange?: (val: boolean) => void
  ) => (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[10px] text-muted-foreground mb-1">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      {comingSoon && (
        <span className="text-[9px] text-muted-foreground/60 mt-1 whitespace-nowrap">
          {t("preferences.comingSoon")}
        </span>
      )}
    </div>
  );

  const renderToggles = (types: NotificationType[]) => {
    const on = isRowOn(types);
    const pushOn = prefs
      ? types.every((type) => getPref(prefs, type).push)
      : true;
    const emailOn = prefs
      ? types.every((type) => getPref(prefs, type).email)
      : true;

    return (
      <div className="flex items-start gap-2">
        {renderToggleColumn(
          t("preferences.channel.inApp"),
          on,
          false,
          false,
          (val) => handleToggleTypes(types, "in_app", val)
        )}
        {renderToggleColumn(t("preferences.channel.push"), pushOn, true, true)}
        {renderToggleColumn(
          t("preferences.channel.email"),
          emailOn,
          true,
          true
        )}
      </div>
    );
  };

  const renderRow = (row: PrefRow, isLast: boolean) => (
    <div
      key={row.types.join(",")}
      className={cn("px-4 py-3", !isLast && "border-b border-border")}
    >
      {/* Mobile: stacked */}
      <div className="lg:hidden">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            {row.icon}
          </div>
          <span className="text-sm font-medium text-foreground">
            {t(row.titleKey)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-3 pl-11">
          {t(row.descriptionKey)}
        </p>
        <div className="pl-11">{renderToggles(row.types)}</div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden lg:flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
            {row.icon}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-medium text-foreground">
              {t(row.titleKey)}
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(row.descriptionKey)}
            </p>
          </div>
        </div>
        <div className="shrink-0 w-56">{renderToggles(row.types)}</div>
      </div>
    </div>
  );

  const renderCategory = (label: string, rows: PrefRow[]) => {
    const allOn = isAllCategoryOn(rows);

    return (
      <div>
        <div className="flex items-center justify-between mb-3 mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            onClick={() => handleToggleAllCategory(rows, !allOn)}
          >
            {allOn ? t("preferences.disableAll") : t("preferences.enableAll")}
          </button>
        </div>
        <div className="rounded-xl border border-border bg-card">
          {rows.map((row, i) => renderRow(row, i === rows.length - 1))}
        </div>
      </div>
    );
  };

  const renderEngagement = () => {
    const allOn = isRowOn(engagementTypes);
    const pushOn = prefs
      ? engagementTypes.every((type) => getPref(prefs, type).push)
      : true;
    const emailOn = prefs
      ? engagementTypes.every((type) => getPref(prefs, type).email)
      : true;

    return (
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">
          {t("preferences.category.engagement")}
        </h2>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {t("preferences.row.engagement.title")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3 pl-11">
              {t("preferences.row.engagement.description")}
            </p>
            <div className="pl-11">
              <div className="flex items-start gap-2">
                {renderToggleColumn(
                  t("preferences.channel.inApp"),
                  allOn,
                  false,
                  false,
                  (val) => handleToggleTypes(engagementTypes, "in_app", val)
                )}
                {renderToggleColumn(
                  t("preferences.channel.push"),
                  pushOn,
                  true,
                  true
                )}
                {renderToggleColumn(
                  t("preferences.channel.email"),
                  emailOn,
                  true,
                  true
                )}
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">
                  {t("preferences.row.engagement.title")}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("preferences.row.engagement.description")}
                </p>
              </div>
            </div>
            <div className="shrink-0 w-56">
              <div className="flex items-start gap-2">
                {renderToggleColumn(
                  t("preferences.channel.inApp"),
                  allOn,
                  false,
                  false,
                  (val) => handleToggleTypes(engagementTypes, "in_app", val)
                )}
                {renderToggleColumn(
                  t("preferences.channel.push"),
                  pushOn,
                  true,
                  true
                )}
                {renderToggleColumn(
                  t("preferences.channel.email"),
                  emailOn,
                  true,
                  true
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
        {renderCategory(t("preferences.category.clubActivity"), clubActivityRows)}
        {renderCategory(t("preferences.category.events"), eventRows)}
        {renderCategory(t("preferences.category.games"), gameRows)}
        {renderEngagement()}
      </div>
    </div>
  );
}
