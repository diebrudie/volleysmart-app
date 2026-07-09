/**
 * New Game / Generate Teams screen (native parity for the two web create-game
 * entry points: apps/web/src/pages/NewGame.tsx (club flow) and
 * apps/web/src/pages/EventDetail.tsx handleStartGame (event flow)).
 *
 * Entered as `/games/new?eventId=...` (from an event's Start Game) or
 * `/games/new?clubId=...` (from a club's New Game). The screen gathers the
 * eligible players, lets the user (de)select them + add temporary guests, then
 * drives useCreateGame — which runs the shared assignTeams algorithm and
 * persists the match day — and navigates to `/games/[id]`.
 *
 * SOURCING (no game-table Supabase queries in the screen — plan Cross-Cutting
 * rule; all data comes from core functions / existing hooks):
 *   - Event context: useEventDetail (club, date, location, opponent mode).
 *   - Event eligible players: core getGameStartPlayers RPC wrapper (attendees +
 *     positions + skill + gender), exactly like web EventDetail.
 *   - Club eligible players: core fetchActiveMembersBasic + getAllPlayers,
 *     filtered to the club's members (mirrors web NewGame's players query).
 *   - Club locations: a small saved-locations lookup (EventFormFields pattern).
 *
 * MODAL NESTING: the screen body is a plain ScrollView, not a Modal. The date
 * and Select pickers each open their own Sheet (RN Modal); only one is ever
 * open at a time, so none stack (phase-3 modal-nesting rule).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  fetchActiveMembersBasic,
  getAllPlayers,
  getGameStartPlayers,
  getSupabaseClient,
  formatShortName,
} from "@volleysmart/core";
import { KeyboardAwareScreen } from "@/components/ui/KeyboardAwareScreen";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Button } from "@/components/ui/Button";
import { Select, type SelectOption } from "@/components/ui/Select";
import { DateField } from "@/components/ui/DateField";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { toast } from "@/components/ui/Toast";
import { PlayerPickRow } from "@/components/games/PlayerPickRow";
import {
  GuestNameField,
  type GuestDraft,
} from "@/components/games/GuestNameField";
import { useEventDetail } from "@/hooks/useEventDetail";
import {
  useCreateGame,
  type CreateGameGuest,
  type CreateGameMember,
} from "@/hooks/useCreateGame";
import { useTheme } from "@/hooks/useTheme";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

/** Canonical volleyball positions offered for guests (web VOLLEYBALL_POSITIONS). */
const VOLLEYBALL_POSITIONS = [
  "Setter",
  "Outside Hitter",
  "Middle Blocker",
  "Opposite",
  "Libero",
] as const;
const DEFAULT_GUEST_POSITION = "Outside Hitter";
const GUEST_SKILL_RATING = 5;

/** A player that can be placed on a team (union of both sourcing shapes). */
type EligiblePlayer = {
  playerId: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  skillRating: number;
  gender: string | null;
  primaryPositionName: string | null;
  secondaryPositionNames: string[];
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/* ------------------------------------------------------------------ */
/* Sourcing helpers (module-level; no queries in the component body).  */
/* ------------------------------------------------------------------ */

type StartPlayerPosition = { is_primary: boolean; name: string };

/** Map a get_game_start_players row → EligiblePlayer (web EventDetail parity). */
function mapStartPlayer(p: {
  player_id: string;
  first_name: string | null;
  gender: string | null;
  skill_rating: number;
  positions: unknown;
}): EligiblePlayer {
  const positions = (p.positions ?? []) as StartPlayerPosition[];
  const primary = positions.find((pp) => pp.is_primary);
  const secondaries = positions
    .filter((pp) => !pp.is_primary && pp.name)
    .map((pp) => pp.name);
  return {
    playerId: p.player_id,
    firstName: p.first_name,
    lastName: null,
    imageUrl: null,
    skillRating: p.skill_rating ?? 50,
    gender: p.gender,
    primaryPositionName: primary?.name ?? null,
    secondaryPositionNames: secondaries,
  };
}

type ClubPlayerRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  skill_rating: number | null;
  gender: string | null;
  player_positions:
    | { is_primary: boolean | null; positions: { name: string | null } | null }[]
    | null;
};

/** Active club members with player details (mirrors web NewGame players query). */
async function fetchClubPlayers(clubId: string): Promise<EligiblePlayer[]> {
  const members = await fetchActiveMembersBasic(clubId);
  const userIds = new Set(
    members.map((m) => m.user_id).filter((id): id is string => !!id)
  );
  if (userIds.size === 0) return [];

  const all = (await getAllPlayers()) as unknown as ClubPlayerRow[];
  return all
    .filter((p) => p.user_id && userIds.has(p.user_id))
    .map((p) => {
      const positions = p.player_positions ?? [];
      const primary = positions.find((pp) => pp.is_primary);
      const secondaries = positions
        .filter((pp) => !pp.is_primary && pp.positions?.name)
        .map((pp) => pp.positions!.name!)
        .filter(Boolean);
      return {
        playerId: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        imageUrl: p.image_url,
        skillRating: p.skill_rating ?? 50,
        gender: p.gender,
        primaryPositionName: primary?.positions?.name ?? null,
        secondaryPositionNames: secondaries,
      };
    })
    .sort((a, b) => (a.firstName ?? "").localeCompare(b.firstName ?? ""));
}

type LocationOption = { id: string; name: string };

/** Saved locations for a club (EventFormFields fetchSavedLocations pattern). */
async function fetchClubLocations(clubId: string): Promise<LocationOption[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("club_id", clubId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as LocationOption[];
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function NewGameScreen() {
  const params = useLocalSearchParams<{ eventId?: string; clubId?: string }>();
  const eventId = params.eventId ? String(params.eventId) : null;
  const clubIdParam = params.clubId ? String(params.clubId) : null;

  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation("games");
  const { t: tProfile } = useTranslation("profile");

  // ── Context ──
  const eventQuery = useEventDetail(eventId ?? "");
  const event = eventQuery.data;
  const clubId = eventId ? event?.club_id ?? null : clubIdParam;

  const isOpponentMode = eventId ? !!event?.is_opponent_mode : false;
  const opponentTeamName = event?.opponent_team_name ?? null;
  const minPlayers = isOpponentMode ? 2 : 4;

  // ── Eligible players ──
  const eligibleQuery = useQuery<EligiblePlayer[]>({
    queryKey: eventId
      ? queryKeys.games.startPlayers(eventId)
      : ["new-game-club-players", clubId],
    enabled: eventId ? !!eventId : !!clubId,
    queryFn: async () => {
      if (eventId) {
        const rows = await getGameStartPlayers(eventId);
        return rows.map(mapStartPlayer);
      }
      return fetchClubPlayers(clubId!);
    },
  });
  const eligible = useMemo(() => eligibleQuery.data ?? [], [eligibleQuery.data]);

  // ── Club-flow location picker ──
  const locationsQuery = useQuery<LocationOption[]>({
    queryKey: queryKeys.clubs.locations(clubId ?? undefined),
    enabled: !eventId && !!clubId,
    queryFn: () => fetchClubLocations(clubId!),
  });

  // ── Selection + form state ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<GuestDraft[]>([]);
  const [date, setDate] = useState<Date | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const selectionSeeded = useRef(false);

  const createGame = useCreateGame();

  // Default the date: the event's date (fixed) or today for a club game.
  useEffect(() => {
    if (date) return;
    if (eventId) {
      if (event?.date) setDate(parseLocalDate(event.date));
    } else if (clubId) {
      setDate(new Date());
    }
  }, [date, eventId, event?.date, clubId]);

  // Event flow: pre-select every attendee once (they are the eligible list).
  useEffect(() => {
    if (eventId && eligibleQuery.data && !selectionSeeded.current) {
      setSelectedIds(new Set(eligibleQuery.data.map((p) => p.playerId)));
      selectionSeeded.current = true;
    }
  }, [eventId, eligibleQuery.data]);

  const positionOptions: SelectOption<string>[] = useMemo(
    () =>
      VOLLEYBALL_POSITIONS.map((name) => ({
        value: name,
        label: tProfile(`positions.name.${name}`, { defaultValue: name }),
      })),
    [tProfile]
  );

  const toggle = (playerId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });

  const addGuest = () =>
    setGuests((g) => [
      ...g,
      {
        id: `guest-${Date.now()}-${g.length}`,
        name: `Guest${g.length + 1}`,
        position: DEFAULT_GUEST_POSITION,
      },
    ]);
  const updateGuest = (id: string, patch: Partial<GuestDraft>) =>
    setGuests((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeGuest = (id: string) =>
    setGuests((g) => g.filter((x) => x.id !== id));

  const selectedCount = selectedIds.size + guests.length;
  const effectiveLocationId = eventId ? event?.location_id ?? null : locationId;
  const locationRequiredMissing = !eventId && !effectiveLocationId;
  const canSubmit =
    !!clubId &&
    !!date &&
    !locationRequiredMissing &&
    selectedCount >= minPlayers &&
    !createGame.isPending;

  const handleSubmit = async () => {
    if (!clubId || !date) {
      toast(
        t("game.newGame.missingInfo", { defaultValue: "Missing information" }),
        "error"
      );
      return;
    }
    if (locationRequiredMissing) {
      toast(
        t("game.newGame.locationRequired", {
          defaultValue: "Please select a location",
        }),
        "error"
      );
      return;
    }
    if (selectedCount < minPlayers) {
      toast(
        t("game.newGame.notEnoughPlayers", {
          defaultValue: "Select at least {{count}} players",
          count: minPlayers,
        }),
        "error"
      );
      return;
    }

    const members: CreateGameMember[] = eligible
      .filter((p) => selectedIds.has(p.playerId))
      .map((p) => ({
        playerId: p.playerId,
        skillRating: p.skillRating,
        primaryPositionName: p.primaryPositionName,
        secondaryPositionNames: p.secondaryPositionNames,
        gender: p.gender,
        firstName: p.firstName,
      }));

    const guestPayload: CreateGameGuest[] = guests.map((g) => ({
      name: g.name,
      skillRating: GUEST_SKILL_RATING,
      position: g.position,
    }));

    try {
      const { id } = await createGame.mutateAsync({
        clubId,
        date,
        locationId: effectiveLocationId,
        plannedEventId: eventId,
        isOpponentMode,
        opponentTeamName,
        members,
        guests: guestPayload,
      });
      // Replace so back returns to the source (event / club), not the form.
      router.replace(`/games/${id}` as never);
    } catch {
      toast(
        t("game.newGame.createFailed", {
          defaultValue: "Failed to create game. Please try again.",
        }),
        "error"
      );
    }
  };

  const headerTitle = t("game.newGame.title", { defaultValue: "New Game" });

  // ── Loading / error gates ──
  const contextLoading =
    (eventId && eventQuery.isLoading) || eligibleQuery.isLoading;

  if (contextLoading) {
    return (
      <>
        <ScreenHeader title={headerTitle} />
        <Spinner />
      </>
    );
  }

  if (!clubId) {
    return (
      <>
        <ScreenHeader title={headerTitle} />
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              icon={
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={theme.mutedForeground}
                />
              }
              title={t("game.newGame.noClubTitle", {
                defaultValue: "No club for this game",
              })}
              subtitle={t("game.newGame.noClubDescription", {
                defaultValue:
                  "Games can only be created for a club. This event isn't linked to one.",
              })}
            />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <ScreenHeader title={headerTitle} />
      <KeyboardAwareScreen safeTop={false} contentStyle={styles.content}>
        {/* Date + location */}
        <View style={styles.block}>
          {eventId ? (
            <View style={styles.metaRow}>
              <Ionicons
                name={icons.calendarDays}
                size={16}
                color={theme.mutedForeground}
              />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {date ? date.toLocaleDateString() : ""}
              </Text>
              {event?.locations?.name ? (
                <>
                  <Ionicons
                    name={icons.mapPin}
                    size={16}
                    color={theme.mutedForeground}
                    style={styles.metaIconSpacer}
                  />
                  <Text style={[styles.metaText, { color: theme.text }]}>
                    {event.locations.name}
                  </Text>
                </>
              ) : null}
            </View>
          ) : (
            <>
              <DateField
                label={t("game.newGame.dateLabel", {
                  defaultValue: "Game date *",
                })}
                placeholder={t("game.newGame.pickDate", {
                  defaultValue: "Pick a date",
                })}
                value={date}
                onChange={setDate}
              />
              <Select
                label={t("game.newGame.locationLabel", {
                  defaultValue: "Location *",
                })}
                placeholder={
                  locationsQuery.isLoading
                    ? t("game.newGame.loadingLocations", {
                        defaultValue: "Loading locations…",
                      })
                    : t("game.newGame.selectLocation", {
                        defaultValue: "Select a location",
                      })
                }
                options={(locationsQuery.data ?? []).map((l) => ({
                  value: l.id,
                  label: l.name,
                }))}
                value={locationId}
                onChange={setLocationId}
              />
            </>
          )}
        </View>

        {/* Opponent-mode banner */}
        {isOpponentMode ? (
          <View
            style={[
              styles.opponentBanner,
              { borderColor: theme.cardBorder, backgroundColor: theme.muted },
            ]}
          >
            <Ionicons name={icons.shield} size={16} color={theme.textSecondary} />
            <Text style={[styles.opponentText, { color: theme.text }]}>
              {t("game.newGame.opponentBanner", {
                defaultValue: "Opponent mode vs {{name}}",
                name:
                  opponentTeamName ||
                  t("game.newGame.opponentTeam", {
                    defaultValue: "Opponent Team",
                  }),
              })}
            </Text>
          </View>
        ) : null}

        {/* Player selection */}
        <View style={styles.block}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("game.newGame.selectPlayers", { defaultValue: "Select players" })}
            </Text>
            <Text
              style={[
                styles.selectedCount,
                {
                  color:
                    selectedCount >= minPlayers ? theme.success : theme.mutedForeground,
                },
              ]}
            >
              {t("game.newGame.selectedCount", {
                defaultValue: "{{count}} selected",
                count: selectedCount,
              })}
            </Text>
          </View>

          {eligible.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons
                  name={icons.users}
                  size={40}
                  color={theme.mutedForeground}
                />
              }
              title={t("game.newGame.noPlayersTitle", {
                defaultValue: "No players available",
              })}
              subtitle={t("game.newGame.noPlayersDescription", {
                defaultValue:
                  "Add guests below, or make sure the club has active members.",
              })}
            />
          ) : (
            <View style={styles.playerList}>
              {eligible.map((p) => {
                const name = formatShortName(p.firstName, p.lastName);
                const posLabel = p.primaryPositionName
                  ? tProfile(`positions.name.${p.primaryPositionName}`, {
                      defaultValue: p.primaryPositionName,
                    })
                  : t("game.noPosition", { defaultValue: "No Position" });
                return (
                  <PlayerPickRow
                    key={p.playerId}
                    name={name}
                    positionLabel={posLabel}
                    imageUri={p.imageUrl}
                    selected={selectedIds.has(p.playerId)}
                    onToggle={() => toggle(p.playerId)}
                  />
                );
              })}
            </View>
          )}
        </View>

        {/* Guests */}
        <View style={styles.block}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("game.newGame.guests", { defaultValue: "Guests (optional)" })}
          </Text>
          <View style={styles.guestList}>
            {guests.map((g, index) => (
              <GuestNameField
                key={g.id}
                value={g}
                index={index}
                positionOptions={positionOptions}
                onChange={(patch) => updateGuest(g.id, patch)}
                onRemove={() => removeGuest(g.id)}
              />
            ))}
          </View>
          <Button
            title={t("game.newGame.addGuest", { defaultValue: "+ Add guest" })}
            variant="outline"
            onPress={addGuest}
          />
        </View>

        {/* Submit */}
        <View style={styles.submitBlock}>
          <Button
            title={t("game.newGame.generateTeams", {
              defaultValue: "Generate Teams",
            })}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={createGame.isPending}
          />
          {selectedCount < minPlayers ? (
            <Text style={[styles.hint, { color: theme.mutedForeground }]}>
              {t("game.newGame.minPlayersHint", {
                defaultValue: "Select at least {{count}} players to continue",
                count: minPlayers,
              })}
            </Text>
          ) : null}
        </View>
      </KeyboardAwareScreen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: spacing.xxxl },
  block: { marginTop: spacing.lg, gap: spacing.md },
  submitBlock: { marginTop: spacing.xl, gap: spacing.sm, marginBottom: spacing.xxl },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  metaIconSpacer: { marginLeft: spacing.sm },
  metaText: { ...typography.bodySm, fontWeight: "500" },
  opponentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  opponentText: { ...typography.bodySm, fontWeight: "600", flex: 1 },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { ...typography.h3 },
  selectedCount: { ...typography.bodySm, fontWeight: "600" },
  playerList: { gap: spacing.sm },
  guestList: { gap: spacing.md },
  hint: { ...typography.caption, textAlign: "center" },
});
