import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Calendar,
  CalendarX,
  MessageSquare,
  Bell,
  Volleyball,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  type Notification,
  type NotificationType,
} from "@/integrations/supabase/notifications";
import { Spinner } from "@/components/ui/spinner";

// ─── Notification display config ─────────────────────────────────────────────

function getNotificationConfig(n: Notification): {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string | null;
} {
  const p = n.payload;

  switch (n.type as NotificationType) {
    case "club_join_request":
      return {
        icon: <UserPlus className="h-5 w-5 text-blue-500" />,
        title: "Join Request",
        description: `${p.requester_name ?? "Someone"} wants to join ${p.club_name ?? "your club"}`,
        href: "/manage-requests",
      };
    case "club_join_accepted":
      return {
        icon: <UserCheck className="h-5 w-5 text-emerald-500" />,
        title: "Request Accepted",
        description: `You've been accepted into ${p.club_name ?? "a club"}`,
        href: p.club_id ? `/clubs/${p.club_id}` : null,
      };
    case "club_join_rejected":
      return {
        icon: <UserX className="h-5 w-5 text-red-500" />,
        title: "Request Declined",
        description: `Your request to join ${p.club_name ?? "a club"} was declined`,
        href: null,
      };
    case "club_member_joined":
      return {
        icon: <Users className="h-5 w-5 text-blue-500" />,
        title: "New Member",
        description: `${p.member_name ?? "A member"} joined ${p.club_name ?? "your club"}`,
        href: p.club_id ? `/clubs/${p.club_id}` : null,
      };
    case "event_created":
      return {
        icon: <Calendar className="h-5 w-5 text-primary" />,
        title: "New Event",
        description: `${p.event_title ?? "An event"} — RSVP now!`,
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "event_cancelled":
      return {
        icon: <CalendarX className="h-5 w-5 text-red-500" />,
        title: "Event Cancelled",
        description: `${p.event_title ?? "An event"} has been cancelled`,
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "event_rsvp":
      return {
        icon: <MessageSquare className="h-5 w-5 text-primary" />,
        title: "RSVP Update",
        description: `${p.player_name ?? "Someone"} is ${p.rsvp_status ?? "attending"} ${p.event_title ?? "an event"}`,
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "rsvp_deadline_reminder":
      return {
        icon: <Bell className="h-5 w-5 text-amber-500" />,
        title: "RSVP Reminder",
        description: `Last day to RSVP for ${p.event_title ?? "an event"}`,
        href: p.event_id ? `/events/${p.event_id}` : null,
      };
    case "game_started":
      return {
        icon: <Volleyball className="h-5 w-5 text-emerald-500" />,
        title: "Game Started",
        description: `${p.event_title ?? "A game"} has started`,
        href: p.match_day_id ? `/game/${p.match_day_id}` : null,
      };
    default:
      return {
        icon: <Bell className="h-5 w-5 text-muted-foreground" />,
        title: "Notification",
        description: "",
        href: null,
      };
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetchNotifications(user!.id),
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });

  const handleTap = async (n: Notification) => {
    const config = getNotificationConfig(n);
    if (!n.read) {
      await markAsRead(n.id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    }
    if (config.href) {
      navigate(config.href);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background flex flex-col lg:ml-60">
      {/* ─── Header (Game Details style) ─────────────────────────────── */}
      <div className="border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="absolute right-4 text-xs text-muted-foreground h-8"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Read all
            </Button>
          )}
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 pb-24">
        <div className="max-w-2xl mx-auto px-4 pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">
                No notifications yet
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((n) => {
                const config = getNotificationConfig(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleTap(n)}
                    className={`w-full flex items-start gap-3 rounded-xl px-4 py-3.5 text-left transition-colors ${
                      n.read
                        ? "hover:bg-muted/50"
                        : "bg-primary/5 hover:bg-primary/10"
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{config.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm ${
                            n.read
                              ? "font-medium text-foreground"
                              : "font-semibold text-foreground"
                          }`}
                        >
                          {config.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {config.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(parseISO(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
