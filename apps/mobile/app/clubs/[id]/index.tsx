import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  fetchClubPublicEvents,
  fetchPendingRequestCount,
  getClubMemberCount,
  getDateLocale,
  getSupabaseClient,
  leaveClub,
} from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { toast } from "@/components/ui/Toast";
import { EventCard } from "@/components/EventCard";
import { ClubStatsTab } from "@/components/clubs/ClubStatsTab";
import { ClubSettingsSheet } from "@/components/clubs/ClubSettingsSheet";
import { GuestsSheet } from "@/components/clubs/GuestsSheet";
import { MemberManageBar } from "@/components/clubs/MemberManageBar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useClubRole } from "@/hooks/useClubRole";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import {
  useClubMembers,
  useRemoveMembers,
  useToggleCoach,
  type ClubMemberWithPlayer,
} from "@/hooks/useClubMembers";
import { useClubEvents } from "@/hooks/useClubEvents";
import { useJoinClub, type JoinRequestResult } from "@/hooks/useJoinClub";
import { queryKeys } from "@/constants/queryKeys";
import { icons, type IoniconsName } from "@/constants/icons";
import { palette } from "@/constants/colors";
import { radii, spacing, typography } from "@/constants/theme";

type ClubDetails = {
  id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  created_by: string;
  description: string | null;
  slug: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  is_club_discoverable: boolean;
};

/** "Isabel B." / "Isabel C.B." — first name + initials of the remaining parts. */
function formatDisplayName(
  firstName: string | null,
  lastName: string | null
): string {
  const parts = `${firstName ?? ""} ${lastName ?? ""}`.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] ?? "";
  const initials = parts
    .slice(1)
    .map((p) => `${p[0]}.`)
    .join("");
  return `${parts[0]} ${initials}`;
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();

  const [activeTab, setActiveTab] = useState<"members" | "stats">("members");
  const [manageMode, setManageMode] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [joinStatus, setJoinStatus] = useState<JoinRequestResult | null>(null);

  // Club details — direct query so non-members (discovery) can view too.
  const { data: club, isLoading: clubLoading } = useQuery<ClubDetails>({
    queryKey: queryKeys.clubs.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clubs")
        .select(
          "id, name, image_url, created_at, created_by, description, slug, city, country, country_code, is_club_discoverable"
        )
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as ClubDetails;
    },
  });

  const { data: memberCount = 0 } = useQuery({
    queryKey: queryKeys.clubs.memberCount(id),
    enabled: !!id,
    queryFn: () => getClubMemberCount(id!),
  });

  const { data: role } = useClubRole(id);
  const isAdmin = role === "admin" || (!!club && club.created_by === user?.id);
  const isMember = (role !== undefined && role !== "none") || isAdmin;
  const canCreateEvent = isAdmin || role === "editor";

  const { data: members = [] } = useClubMembers(isMember ? id : undefined);
  const { data: events } = useClubEvents(id ?? "");
  const nextEvent = events?.[0] ?? null;

  const { data: publicEvents = [] } = useQuery({
    queryKey: queryKeys.clubs.publicEvents(id),
    enabled: !!id && !isMember,
    queryFn: () => fetchClubPublicEvents(id!),
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: queryKeys.clubs.pendingRequestsCount(id),
    enabled: !!id && isAdmin,
    queryFn: () => fetchPendingRequestCount(id!),
  });

  const joinMutation = useJoinClub(id);
  const toggleCoach = useToggleCoach(id);
  const removeMembers = useRemoveMembers(id);

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.members(id) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.memberCount(id),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.events(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.pendingRequestsCount(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allMine }),
    ]);
  };

  const handleJoin = () => {
    joinMutation.mutate(undefined, {
      onSuccess: (result) => {
        if (result === "pending_approval") {
          setJoinStatus("pending_approval");
          toast(
            t("overview.toasts.requestSentDescription", {
              defaultValue: "The club admin will review your request.",
            })
          );
        } else if (result === "already_member") {
          toast(
            t("overview.toasts.alreadyMember", {
              defaultValue: "Already a member",
            })
          );
        } else if (result === "already_pending") {
          setJoinStatus("pending_approval");
          toast(
            t("overview.toasts.requestPending", {
              defaultValue: "Request already pending",
            })
          );
        }
      },
      onError: () => {
        toast(
          t("overview.toasts.joinError", {
            defaultValue: "Failed to send join request.",
          }),
          "error"
        );
      },
    });
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      const result = await leaveClub(id!);
      if (result.result_status === "sole_admin") {
        toast(
          t("overview.toasts.cannotLeaveDescription", {
            defaultValue: "You're the only admin. Transfer the admin role first.",
          }),
          "error"
        );
      } else {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.members(id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.memberCount(id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allMine });
        toast(
          t("overview.toasts.leftClubDescription", {
            defaultValue: "You left {{name}}.",
            name: club?.name,
          })
        );
        router.replace("/(tabs)/clubs");
      }
    } catch {
      toast(
        t("overview.toasts.leaveError", {
          defaultValue: "Failed to leave the club.",
        }),
        "error"
      );
    } finally {
      setLeaving(false);
      setLeaveOpen(false);
    }
  };

  const handleRemoveConfirm = () => {
    removeMembers.mutate(selectedUserIds, {
      onSuccess: () => {
        toast(
          t("overview.toasts.removedDescription", {
            defaultValue: "{{count}} members removed.",
            count: selectedUserIds.length,
          })
        );
        setSelectedUserIds([]);
        setManageMode(false);
        setRemoveOpen(false);
      },
      onError: () => {
        toast(
          t("overview.toasts.removeError", {
            defaultValue: "Failed to remove members.",
          }),
          "error"
        );
        setRemoveOpen(false);
      },
    });
  };

  if (clubLoading || !club) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen scroll={false}>
          <View style={styles.loadingScreen}>
            <Spinner />
          </View>
        </Screen>
      </>
    );
  }

  const createdLabel = format(parseISO(club.created_at), "MMM. yyyy", {
    locale: getDateLocale(i18n.language),
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen padded={false} safeTop={false} onRefresh={handleRefresh}>
        {/* Hero */}
        <View style={styles.hero}>
          {club.image_url ? (
            <Image
              source={{ uri: club.image_url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: theme.primary + "4D" },
              ]}
            />
          )}
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: palette.black + "33" },
            ]}
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t("overview.backAriaLabel", {
              defaultValue: "Go back",
            })}
            style={[
              styles.heroButton,
              {
                top: insets.top + spacing.sm,
                left: spacing.lg,
                backgroundColor: theme.background + "CC",
              },
            ]}
          >
            <Ionicons name={icons.arrowLeft} size={20} color={theme.text} />
          </Pressable>
          {isAdmin ? (
            <Pressable
              onPress={() => setSettingsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={t("overview.settingsAriaLabel", {
                defaultValue: "Club settings",
              })}
              style={[
                styles.heroButton,
                {
                  top: insets.top + spacing.sm,
                  right: spacing.lg,
                  backgroundColor: theme.background + "CC",
                },
              ]}
            >
              <Ionicons name={icons.settings} size={20} color={theme.text} />
            </Pressable>
          ) : null}
        </View>

        {/* Club info */}
        <View style={styles.section}>
          <Text style={[styles.clubName, { color: theme.text }]}>
            {club.name}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons
                name={icons.calendarDays}
                size={13}
                color={theme.mutedForeground}
              />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {t("overview.createdIn", {
                  defaultValue: "Club created in {{date}}",
                  date: createdLabel,
                })}
              </Text>
            </View>
            {club.city ? (
              <View style={styles.metaItem}>
                <Ionicons
                  name={icons.mapPin}
                  size={13}
                  color={theme.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: theme.mutedForeground }]}
                >
                  {club.city}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaItem}>
              <Ionicons
                name={icons.users}
                size={13}
                color={theme.mutedForeground}
              />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {t("overview.member", {
                  defaultValue: "{{count}} Members",
                  count: memberCount,
                })}
              </Text>
            </View>
          </View>
          {club.description ? (
            <Text
              style={[styles.description, { color: theme.mutedForeground }]}
            >
              {club.description}
            </Text>
          ) : null}
        </View>

        {/* Action buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionsRow}
        >
          {isMember ? (
            <>
              <ActionCircle
                icon={icons.userPlus}
                label={t("overview.actions.invite", { defaultValue: "Invite" })}
                onPress={() => router.push(`/clubs/${id}/invite`)}
              />
              <ActionCircle
                icon={icons.users}
                label={t("overview.actions.members", {
                  defaultValue: "Members",
                })}
                onPress={() => setActiveTab("members")}
              />
              {isAdmin ? (
                <ActionCircle
                  icon={icons.shieldCheck}
                  label={t("overview.actions.guests", {
                    defaultValue: "Guests",
                  })}
                  onPress={() => setGuestsOpen(true)}
                />
              ) : null}
              <ActionCircle
                icon={icons.barChart}
                label={t("overview.actions.stats", { defaultValue: "Stats" })}
                onPress={() => setActiveTab("stats")}
              />
              {!isAdmin ? (
                <ActionCircle
                  icon={icons.logOut}
                  label={t("overview.actions.leave", { defaultValue: "Leave" })}
                  onPress={() => setLeaveOpen(true)}
                />
              ) : null}
            </>
          ) : (
            <>
              <ActionCircle
                icon={
                  joinStatus === "pending_approval"
                    ? icons.checkCircleOutline
                    : icons.userPlus
                }
                label={
                  joinStatus === "pending_approval"
                    ? t("overview.actions.pending", { defaultValue: "Pending" })
                    : t("overview.actions.join", { defaultValue: "Join" })
                }
                disabled={
                  joinMutation.isPending || joinStatus === "pending_approval"
                }
                onPress={handleJoin}
              />
              <ActionCircle
                icon={icons.messageSquare}
                label={t("overview.actions.message", {
                  defaultValue: "Message",
                })}
                disabled
                onPress={() => {}}
              />
            </>
          )}
        </ScrollView>

        {/* Pending join requests banner (admin) */}
        {isAdmin && pendingCount > 0 ? (
          <View style={styles.section}>
            <Pressable
              onPress={() =>
                router.push(`/clubs/${id}/manage-members`)
              }
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.pendingBanner,
                {
                  backgroundColor: theme.warning + "1A",
                  borderColor: theme.warning + "66",
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.pendingTextWrap}>
                <Text style={[styles.pendingText, { color: theme.text }]}>
                  {t("overview.pendingRequests", {
                    defaultValue:
                      "You have {{count}} request(s) to join your club.",
                    count: pendingCount,
                  })}
                </Text>
                <Text
                  style={[styles.pendingAction, { color: theme.primary }]}
                >
                  {t("overview.manageRequests", {
                    defaultValue: "Manage requests",
                  })}
                </Text>
              </View>
              <Ionicons
                name={icons.chevronRight}
                size={18}
                color={theme.mutedForeground}
              />
            </Pressable>
          </View>
        ) : null}

        {/* Upcoming event(s) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {isMember
                ? t("overview.upcomingEvent", {
                    defaultValue: "Upcoming Event",
                  })
                : t("overview.upcomingEvents", {
                    defaultValue: "Upcoming Events",
                  })}
            </Text>
            {isMember && canCreateEvent ? (
              <Pressable
                onPress={() =>
                  router.push(`/events/create?clubId=${id}`)
                }
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.createLink,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name={icons.plus} size={16} color={theme.primary} />
                <Text style={[styles.createLinkText, { color: theme.primary }]}>
                  {t("overview.createAnEvent", {
                    defaultValue: "Create an event",
                  })}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {isMember ? (
            nextEvent ? (
              <EventCard
                event={nextEvent}
                currentPlayerId={playerId}
                onPress={() => router.push(`/events/${nextEvent.id}`)}
              />
            ) : (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}
              >
                <Ionicons
                  name={icons.calendarDays}
                  size={36}
                  color={theme.mutedForeground}
                />
                <Text
                  style={[styles.emptyCardText, { color: theme.mutedForeground }]}
                >
                  {t("overview.noUpcomingEvents", {
                    defaultValue: "No upcoming events",
                  })}
                </Text>
                {canCreateEvent ? (
                  <Button
                    title={t("overview.createEvent", {
                      defaultValue: "Create Event",
                    })}
                    onPress={() =>
                      router.push(`/events/create?clubId=${id}`)
                    }
                    style={styles.emptyCardButton}
                  />
                ) : null}
              </View>
            )
          ) : publicEvents.length > 0 ? (
            <View style={styles.eventList}>
              {publicEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  currentPlayerId={playerId}
                  onPress={() => router.push(`/events/${ev.id}`)}
                />
              ))}
            </View>
          ) : (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Ionicons
                name={icons.calendarDays}
                size={36}
                color={theme.mutedForeground}
              />
              <Text
                style={[styles.emptyCardText, { color: theme.mutedForeground }]}
              >
                {t("overview.noUpcomingEvents", {
                  defaultValue: "No upcoming events",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Members / Stats tabs — members only */}
        {isMember ? (
          <View style={styles.section}>
            <SegmentedTabs
              segments={[
                {
                  key: "members",
                  label: t("overview.tabs.members", {
                    defaultValue: "Members",
                  }),
                },
                {
                  key: "stats",
                  label: t("overview.tabs.stats", { defaultValue: "Stats" }),
                },
              ]}
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as "members" | "stats")}
            />

            <View style={styles.tabContent}>
              {activeTab === "members" ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      {t("overview.membersSection.title", {
                        defaultValue: "Members",
                      })}
                    </Text>
                    {isAdmin ? (
                      <Pressable
                        onPress={() => {
                          setManageMode((v) => !v);
                          setSelectedUserIds([]);
                        }}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Text
                          style={[styles.manageLink, { color: theme.primary }]}
                        >
                          {manageMode
                            ? t("overview.membersSection.done", {
                                defaultValue: "Done",
                              })
                            : t("overview.membersSection.manage", {
                                defaultValue: "Manage",
                              })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View>
                    {members.map((m, idx) => (
                      <MemberListRow
                        key={m.user_id}
                        member={m}
                        isLast={idx === members.length - 1}
                        manageMode={manageMode}
                        isAdminViewer={isAdmin}
                        canSelect={
                          manageMode &&
                          m.role !== "admin" &&
                          m.user_id !== user?.id
                        }
                        selected={selectedUserIds.includes(m.user_id)}
                        onToggleSelect={() =>
                          setSelectedUserIds((prev) =>
                            prev.includes(m.user_id)
                              ? prev.filter((uid) => uid !== m.user_id)
                              : [...prev, m.user_id]
                          )
                        }
                        onToggleCoach={() =>
                          toggleCoach.mutate({
                            userId: m.user_id,
                            isCoach: !m.is_coach,
                          })
                        }
                      />
                    ))}
                  </View>

                  {manageMode ? (
                    <MemberManageBar
                      selectedCount={selectedUserIds.length}
                      onRemove={() => setRemoveOpen(true)}
                      removing={removeMembers.isPending}
                    />
                  ) : null}
                </>
              ) : (
                <ClubStatsTab clubId={club.id} />
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </Screen>

      {/* Remove members confirm */}
      <Dialog
        visible={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title={t("overview.removeDialog.title", {
          defaultValue: "Remove members?",
        })}
        message={
          selectedUserIds.length === 1
            ? t("overview.removeDialog.descriptionOne", {
                defaultValue: "This member will be removed from the club.",
              })
            : t("overview.removeDialog.descriptionMany", {
                defaultValue:
                  "{{count}} members will be removed from the club.",
                count: selectedUserIds.length,
              })
        }
        confirmLabel={t("overview.removeDialog.remove", {
          defaultValue: "Remove",
        })}
        destructive
        loading={removeMembers.isPending}
        onConfirm={handleRemoveConfirm}
      />

      {/* Leave club confirm */}
      <Dialog
        visible={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title={t("overview.leaveDialog.title", {
          defaultValue: "Leave {{name}}?",
          name: club.name,
        })}
        message={t("overview.leaveDialog.description", {
          defaultValue:
            "You will no longer be a member of this club. You can request to join again later.",
        })}
        confirmLabel={t("overview.leaveDialog.leave", {
          defaultValue: "Leave",
        })}
        destructive
        loading={leaving}
        onConfirm={handleLeave}
      />

      {/* Guests sheet (admin) */}
      {isAdmin ? (
        <GuestsSheet
          clubId={club.id}
          visible={guestsOpen}
          onClose={() => setGuestsOpen(false)}
        />
      ) : null}

      {/* Settings sheet (admin) */}
      {isAdmin ? (
        <ClubSettingsSheet
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          club={{
            id: club.id,
            name: club.name,
            description: club.description,
            image_url: club.image_url,
            city: club.city,
            country: club.country,
            country_code: club.country_code,
            is_club_discoverable: club.is_club_discoverable,
            created_by: club.created_by,
          }}
        />
      ) : null}
    </>
  );
}

/* ── Member row ─────────────────────────────────────────────────────── */

function MemberListRow({
  member,
  isLast,
  manageMode,
  isAdminViewer,
  canSelect,
  selected,
  onToggleSelect,
  onToggleCoach,
}: {
  member: ClubMemberWithPlayer;
  isLast: boolean;
  manageMode: boolean;
  isAdminViewer: boolean;
  canSelect: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onToggleCoach: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation("clubs");
  const name = formatDisplayName(member.first_name, member.last_name);

  return (
    <Pressable
      onPress={manageMode && canSelect ? onToggleSelect : undefined}
      disabled={!manageMode || !canSelect}
      accessibilityRole={manageMode && canSelect ? "button" : undefined}
      style={({ pressed }) => [
        styles.memberRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.border,
        },
        pressed && manageMode && canSelect && { backgroundColor: theme.muted },
      ]}
    >
      {manageMode ? (
        <Checkbox
          checked={selected}
          disabled={!canSelect}
          onChange={onToggleSelect}
        />
      ) : null}
      <Avatar
        uri={member.image_url}
        name={`${member.first_name ?? ""} ${member.last_name ?? ""}`.trim()}
        size={40}
      />
      <View style={styles.memberInfo}>
        <Text
          numberOfLines={1}
          style={[styles.memberName, { color: theme.text }]}
        >
          {name}
          {member.member_association ? " 🏐" : ""}
        </Text>
        {member.primary_position ? (
          <Text
            numberOfLines={1}
            style={[styles.memberPosition, { color: theme.mutedForeground }]}
          >
            {t(`profile:positions.name.${member.primary_position}`, {
              defaultValue: member.primary_position,
            })}
          </Text>
        ) : null}
      </View>
      <View style={styles.memberBadges}>
        {isAdminViewer && manageMode ? (
          <Pressable
            onPress={onToggleCoach}
            accessibilityRole="button"
            hitSlop={6}
            style={[
              styles.coachPill,
              member.is_coach
                ? {
                    backgroundColor: theme.primary + "1A",
                    borderColor: theme.primary + "4D",
                  }
                : {
                    borderColor: theme.mutedForeground + "4D",
                    borderStyle: "dashed",
                  },
            ]}
          >
            <Text
              style={[
                styles.coachPillText,
                {
                  color: member.is_coach
                    ? theme.primary
                    : theme.mutedForeground,
                },
              ]}
            >
              {member.is_coach
                ? t("overview.membersSection.coach", { defaultValue: "Coach" })
                : t("overview.membersSection.setCoach", {
                    defaultValue: "Coach",
                  })}
            </Text>
          </Pressable>
        ) : member.is_coach ? (
          <Text style={[styles.coachText, { color: theme.primary }]}>
            {t("overview.membersSection.coach", { defaultValue: "Coach" })}
          </Text>
        ) : null}
        {member.role === "admin" ? (
          <Text style={[styles.adminText, { color: theme.mutedForeground }]}>
            {t("overview.membersSection.admin", { defaultValue: "Admin" })}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/* ── Action circle button ───────────────────────────────────────────── */

function ActionCircle({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IoniconsName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.actionItem,
        disabled && styles.actionDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.actionCircle,
          { backgroundColor: theme.muted, borderColor: theme.border },
        ]}
      >
        <Ionicons name={icon} size={20} color={theme.mutedForeground} />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.actionLabel, { color: theme.text }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { height: 190 },
  heroButton: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  clubName: { ...typography.h1 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { ...typography.bodySm },
  description: { ...typography.bodySm, lineHeight: 19 },
  actionsRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  actionItem: { alignItems: "center", gap: 6, minWidth: 72 },
  actionDisabled: { opacity: 0.4 },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 11, fontWeight: "500" },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  pendingTextWrap: { flex: 1, gap: 2 },
  pendingText: { ...typography.bodySm },
  pendingAction: { ...typography.bodySm, fontWeight: "600" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: { ...typography.h3 },
  createLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  createLinkText: { ...typography.bodySm, fontWeight: "600" },
  eventList: { gap: spacing.md },
  emptyCard: {
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyCardText: { ...typography.bodySm, textAlign: "center" },
  emptyCardButton: { marginTop: spacing.sm, alignSelf: "center" },
  tabContent: { marginTop: spacing.lg, gap: spacing.md },
  manageLink: { ...typography.bodySm, fontWeight: "600" },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  memberInfo: { flex: 1, gap: 2 },
  memberName: { ...typography.bodySm, fontWeight: "500" },
  memberPosition: { ...typography.caption },
  memberBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  coachPill: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  coachPillText: { ...typography.caption, fontWeight: "500" },
  coachText: { ...typography.caption, fontWeight: "600" },
  adminText: { ...typography.caption },
  bottomSpacer: { height: spacing.xxxl },
  pressed: { opacity: 0.7 },
});
