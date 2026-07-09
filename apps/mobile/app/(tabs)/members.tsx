import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchInput } from "@/components/ui/SearchInput";
import { Sheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { MemberRow } from "@/components/MemberRow";
import { MemberCard } from "@/components/MemberCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import {
  useAdminClubs,
  useGlobalMembers,
  type GlobalMember,
} from "@/hooks/useGlobalMembers";
import { usePendingRequestsTotal } from "@/hooks/useManageMembers";
import { queryKeys } from "@/constants/queryKeys";
import { icons } from "@/constants/icons";
import { palette, radii, spacing, typography } from "@/constants/theme";

type ViewMode = "grid" | "list";

/** Same key the PWA uses in localStorage (MembersGlobal.tsx). */
const VIEW_MODE_KEY = "members-view-mode";

export default function MembersScreen() {
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: members = [], isLoading } = useGlobalMembers();
  const { adminClubs } = useAdminClubs();
  const adminClubIds = useMemo(
    () => adminClubs.map((c) => c.id),
    [adminClubs]
  );
  const { data: totalPending = 0 } = usePendingRequestsTotal(adminClubIds);

  const [search, setSearch] = useState("");
  // Grid is the PWA default; persisted choice is restored on mount.
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterClub, setFilterClub] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isClubPickerOpen, setIsClubPickerOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VIEW_MODE_KEY)
      .then((stored) => {
        if (stored === "grid" || stored === "list") setViewMode(stored);
      })
      .catch(() => {});
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    AsyncStorage.setItem(VIEW_MODE_KEY, mode).catch(() => {});
  };

  // All clubs represented in the aggregate (for the filter sheet).
  const clubs = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) =>
      m.clubs.forEach((c) => {
        if (!map.has(c.id)) map.set(c.id, c.name);
      })
    );
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const filtered = useMemo(() => {
    let result = members;
    if (filterClub.size > 0) {
      result = result.filter((m) => m.clubs.some((c) => filterClub.has(c.id)));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const cmp = a.first_name.localeCompare(b.first_name);
      return sortAsc ? cmp : -cmp;
    });
  }, [members, filterClub, search, sortAsc]);

  const toggleClubFilter = (clubId: string) => {
    setFilterClub((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId);
      else next.add(clubId);
      return next;
    });
  };

  const handleManageRequests = () => {
    if (adminClubs.length === 1) {
      router.push(`/clubs/${adminClubs[0].id}/manage-members`);
    } else if (adminClubs.length > 1) {
      setIsClubPickerOpen(true);
    }
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.members.global(user?.id),
    });
  }, [queryClient, user?.id]);

  // ── Item helpers ───────────────────────────────────────────────────────
  const displayFor = (m: GlobalMember) => {
    const rawPosition = m.player_positions?.find((p) => p.is_primary)
      ?.positions.name;
    const position = rawPosition
      ? t(`members.position.${rawPosition}`, { defaultValue: rawPosition })
      : t("members.noPosition", { defaultValue: "No position" });
    const lastInitial = m.last_name
      ? ` ${m.last_name.charAt(0).toUpperCase()}.`
      : "";
    return {
      name: `${m.first_name}${lastInitial}`,
      position,
      clubNames: m.clubs.map((c) => c.name).join(" · "),
      isYou: m.user_id === user?.id,
      adminSomewhere: m.clubs.some((c) => c.role === "admin"),
    };
  };

  const rowFor = (m: GlobalMember) => {
    const { name, position, clubNames, isYou, adminSomewhere } = displayFor(m);

    return (
      <View
        key={m.player_id}
        style={[styles.rowWrap, { borderBottomColor: theme.border }]}
      >
        <MemberRow
          name={name}
          imageUrl={m.image_url}
          subtitle={position}
          caption={clubNames}
          badgeLabel={
            isYou
              ? t("common:you", { defaultValue: "You" })
              : adminSomewhere
                ? t("adminBadge", { defaultValue: "Admin" })
                : null
          }
        />
      </View>
    );
  };

  const cardFor = (m: GlobalMember) => {
    const { name, position, isYou } = displayFor(m);
    return (
      <MemberCard
        key={m.player_id}
        name={name}
        imageUrl={m.image_url}
        subtitle={position}
        badgeLabel={isYou ? t("common:you", { defaultValue: "You" }) : null}
        style={styles.gridItem}
      />
    );
  };

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Screen scroll={false} safeTop={false}>
        <View style={styles.center}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────
  if (members.length === 0) {
    return (
      <Screen scroll={false} safeTop={false}>
        <View style={styles.center}>
          <EmptyState
            icon={
              <Ionicons name={icons.users} size={48} color={theme.icon} />
            }
            title={t("members.emptyTitle", { defaultValue: "No members yet" })}
            subtitle={t("members.emptyDescription", {
              defaultValue: "Members from all your clubs will appear here.",
            })}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      safeTop={false}
      onRefresh={handleRefresh}
      contentStyle={styles.screenContent}
    >
      {/* Headline + Manage Requests (web MembersGlobal mobile header) */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t("members.allMembers", { defaultValue: "All Members" })}
        </Text>
        {adminClubs.length > 0 && (
          <Pressable
            onPress={handleManageRequests}
            style={({ pressed }) => [
              styles.manageButton,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
          >
            <Ionicons name={icons.settings} size={14} color={theme.primary} />
            <Text style={[styles.manageText, { color: theme.primary }]}>
              {t("members.manageRequests", {
                defaultValue: "Manage Requests",
              })}
            </Text>
            {totalPending > 0 && (
              <View
                style={[styles.dot, { backgroundColor: theme.destructive }]}
              />
            )}
          </Pressable>
        )}
      </View>

      {/* Search */}
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder={t("members.searchPlaceholder", {
          defaultValue: "Search members...",
        })}
        style={styles.search}
      />

      {/* Controls row: sort + filter (left), view toggle (right) */}
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <Pressable
            onPress={() => setSortAsc((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={
              sortAsc
                ? t("members.sortZtoA", { defaultValue: "Sort Z to A" })
                : t("members.sortAtoZ", { defaultValue: "Sort A to Z" })
            }
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: theme.cardBorder },
              pressed && { backgroundColor: theme.surface },
            ]}
          >
            <Ionicons name={icons.arrowUpDown} size={15} color={theme.textSecondary} />
          </Pressable>

          {clubs.length > 1 && (
            <Chip
              label={t("members.filter", { defaultValue: "Filter" })}
              icon="filter"
              selected={filterClub.size > 0}
              count={filterClub.size > 0 ? filterClub.size : undefined}
              onPress={() => setIsFilterOpen(true)}
            />
          )}
        </View>

        {/* View toggle — icons only (web MembersGlobal grid/list buttons) */}
        <View style={[styles.viewToggle, { borderColor: theme.cardBorder }]}>
          <Pressable
            onPress={() => changeViewMode("grid")}
            accessibilityRole="button"
            accessibilityLabel={t("members.gridView", {
              defaultValue: "Grid view",
            })}
            style={[
              styles.viewToggleButton,
              viewMode === "grid" && { backgroundColor: theme.primary },
            ]}
          >
            <Ionicons
              name={icons.layoutGrid}
              size={15}
              color={viewMode === "grid" ? palette.white : theme.textSecondary}
            />
          </Pressable>
          <Pressable
            onPress={() => changeViewMode("list")}
            accessibilityRole="button"
            accessibilityLabel={t("members.listView", {
              defaultValue: "List view",
            })}
            style={[
              styles.viewToggleButton,
              viewMode === "list" && { backgroundColor: theme.primary },
            ]}
          >
            <Ionicons
              name={icons.listChecks}
              size={15}
              color={viewMode === "list" ? palette.white : theme.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* Members display */}
      {filtered.length === 0 ? (
        <Text style={[styles.noResults, { color: theme.textSecondary }]}>
          {t("members.noResults", {
            defaultValue: "No members match your search.",
          })}
        </Text>
      ) : viewMode === "grid" ? (
        <View style={styles.grid}>{filtered.map(cardFor)}</View>
      ) : (
        <View>{filtered.map(rowFor)}</View>
      )}

      {/* Count summary */}
      {filtered.length > 0 && (
        <Text style={[styles.count, { color: theme.textSecondary }]}>
          {t("members.count", {
            count: filtered.length,
            defaultValue: "{{count}} members",
          })}
          {filtered.length !== members.length
            ? ` ${t("members.filteredFrom", {
                total: members.length,
                defaultValue: "(filtered from {{total}})",
              })}`
            : ""}
        </Text>
      )}

      {/* Filter-by-club sheet */}
      <Sheet
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title={t("members.filterByClub", { defaultValue: "Filter by Club" })}
      >
        <Text style={[styles.sheetDescription, { color: theme.textSecondary }]}>
          {t("members.filterDescription", {
            defaultValue: "Select which clubs to show members from.",
          })}
        </Text>
        <View style={styles.chipWrap}>
          {clubs.map((club) => (
            <Chip
              key={club.id}
              label={club.name}
              selected={filterClub.has(club.id)}
              onPress={() => toggleClubFilter(club.id)}
            />
          ))}
        </View>
        {filterClub.size > 0 && (
          <Button
            title={t("members.clearAll", { defaultValue: "Clear all" })}
            variant="ghost"
            onPress={() => setFilterClub(new Set())}
            style={styles.clearButton}
          />
        )}
      </Sheet>

      {/* Admin-club picker for Manage Requests (multiple admin clubs) */}
      <Sheet
        visible={isClubPickerOpen}
        onClose={() => setIsClubPickerOpen(false)}
        title={t("members.manageRequests", { defaultValue: "Manage Requests" })}
      >
        <Text style={[styles.sheetDescription, { color: theme.textSecondary }]}>
          {t("members.pickClub", {
            defaultValue: "Choose a club to manage its join requests.",
          })}
        </Text>
        {adminClubs.map((club) => (
          <Pressable
            key={club.id}
            onPress={() => {
              setIsClubPickerOpen(false);
              router.push(`/clubs/${club.id}/manage-members`);
            }}
            style={({ pressed }) => [
              styles.clubPickRow,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.surface },
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.clubPickName, { color: theme.text }]}>
              {club.name}
            </Text>
            <Ionicons
              name={icons.chevronRight}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
        ))}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Consistent breathing room below the TopBar (matches Clubs tab).
  screenContent: { paddingTop: spacing.lg },
  center: { flex: 1, justifyContent: "center", paddingVertical: 80 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerTitle: { ...typography.h2 },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs,
  },
  manageText: { ...typography.label },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.full,
    marginLeft: 2,
  },
  search: { marginBottom: spacing.md },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  controlsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  viewToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  viewToggleButton: {
    height: 30,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: spacing.md,
  },
  gridItem: { width: "48%" },
  iconButton: {
    height: 32,
    width: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  noResults: {
    ...typography.bodySm,
    textAlign: "center",
    paddingVertical: spacing.xxxl * 2,
  },
  count: {
    ...typography.caption,
    textAlign: "right",
    marginTop: spacing.lg,
  },
  sheetDescription: {
    ...typography.bodySm,
    marginBottom: spacing.lg,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  clearButton: { marginTop: spacing.lg },
  clubPickRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clubPickName: { ...typography.body, fontWeight: "500" },
});
