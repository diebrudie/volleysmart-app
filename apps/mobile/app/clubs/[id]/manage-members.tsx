import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import type { ManageMemberRow } from "@volleysmart/core";
import { Screen } from "@/components/ui/Screen";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useUserClubs } from "@/hooks/useUserClubs";
import {
  useApproveRequest,
  usePendingRequests,
  useRejectRequest,
} from "@/hooks/useManageMembers";
import { queryKeys } from "@/constants/queryKeys";
import { radii, spacing, typography } from "@/constants/theme";

export default function ManageMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: clubs } = useUserClubs();
  const clubName = clubs?.find((c) => c.club_id === id)?.clubs?.name ?? "";

  const { data: requests = [], isLoading } = usePendingRequests(id);
  const approveMut = useApproveRequest(id);
  const rejectMut = useRejectRequest(id);
  const deciding = approveMut.isPending || rejectMut.isPending;

  const handleApprove = (membershipId: string) => {
    approveMut.mutate(membershipId, {
      onSuccess: () =>
        toast(
          t("manageRequests.approved", { defaultValue: "Membership approved" })
        ),
      onError: () =>
        toast(
          t("manageRequests.approvalFailed", {
            defaultValue: "Approval failed",
          }),
          "error"
        ),
    });
  };

  const handleReject = (membershipId: string) => {
    rejectMut.mutate(membershipId, {
      onSuccess: () =>
        toast(
          t("manageRequests.rejected", { defaultValue: "Request rejected" })
        ),
      onError: () =>
        toast(
          t("manageRequests.rejectFailed", { defaultValue: "Reject failed" }),
          "error"
        ),
    });
  };

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.members.manage(id),
    });
  }, [queryClient, id]);

  const timeAgo = (requestedAt: string | null) => {
    if (!requestedAt) return "";
    const diffDays = Math.floor(
      (Date.now() - new Date(requestedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return t("manageRequests.today", { defaultValue: "Today" });
    if (diffDays === 1)
      return t("manageRequests.oneDayAgo", { defaultValue: "1 day ago" });
    return t("manageRequests.daysAgo", {
      count: diffDays,
      defaultValue: "{{count}} days ago",
    });
  };

  const renderRequest = (req: ManageMemberRow) => {
    const name =
      [req.first_name, req.last_name].filter(Boolean).join(" ") ||
      t("manageRequests.unknown", { defaultValue: "Unknown" });

    return (
      <View
        key={req.membership_id}
        style={[
          styles.card,
          { backgroundColor: theme.card, borderColor: theme.cardBorder },
        ]}
      >
        <Avatar uri={req.image_url} name={name} size={56} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardNames}>
              <Text
                style={[styles.name, { color: theme.text }]}
                numberOfLines={1}
              >
                {name}
              </Text>
              {clubName ? (
                <Text
                  style={[styles.clubName, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {clubName}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.timeAgo, { color: theme.textSecondary }]}>
              {timeAgo(req.requested_at)}
            </Text>
          </View>

          {/* Reject first, Accept second (web ManageMembers order) */}
          <View style={styles.actions}>
            <Button
              title={t("manageRequests.reject", { defaultValue: "Reject" })}
              variant="outline"
              onPress={() => handleReject(req.membership_id)}
              disabled={deciding}
              style={styles.actionButton}
            />
            <Button
              title={t("manageRequests.accept", { defaultValue: "Accept" })}
              onPress={() => handleApprove(req.membership_id)}
              disabled={deciding}
              style={styles.actionButton}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t("manageRequests.title", {
            defaultValue: "Manage Requests",
          }),
          headerBackTitle: t("common:back", { defaultValue: "Back" }),
          headerTintColor: theme.primary,
          headerStyle: { backgroundColor: theme.background },
          headerTitleStyle: { color: theme.text },
        }}
      />
      <Screen safeTop={false} onRefresh={handleRefresh}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {t("manageRequests.allRequests", {
            defaultValue: "All Club Requests",
          })}
        </Text>

        {isLoading ? (
          <View style={styles.center}>
            <Spinner />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.empty, { color: theme.textSecondary }]}>
              {t("manageRequests.noPending", {
                defaultValue: "No pending requests.",
              })}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>{requests.map(renderRequest)}</View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    ...typography.h3,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  center: { alignItems: "center", paddingVertical: spacing.xxxl * 2 },
  empty: { ...typography.bodySm, textAlign: "center" },
  list: { gap: spacing.md },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  cardBody: { flex: 1, justifyContent: "space-between", minWidth: 0 },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardNames: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: "600" },
  clubName: { ...typography.caption, marginTop: 2 },
  timeAgo: { ...typography.caption },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: { flex: 1, height: 36 },
});
