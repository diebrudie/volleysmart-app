import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClub } from "@/contexts/ClubContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  listManageMembers,
  approveMembership,
  rejectMembership,
  type ManageMemberRow,
} from "@/integrations/supabase/members";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";

// Extended row with club info
interface RequestRow extends ManageMemberRow {
  club_name: string;
  club_id: string;
}

export default function ManageMembers() {
  const { t } = useTranslation("clubs");
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const { clubId: clubIdFromCtx, setClubId } = useClub();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // If we have a URL clubId, set it in context
  useEffect(() => {
    if (urlClubId) setClubId(urlClubId);
  }, [urlClubId, setClubId]);

  // Fetch all clubs where user is admin
  const { data: adminClubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ["admin-clubs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .eq("role", "admin");

      if (!memberships?.length) {
        // Also check clubs created by user
        const { data: created } = await supabase
          .from("clubs")
          .select("id, name")
          .eq("created_by", user.id)
          .eq("status", "active");
        return (created ?? []).map((c) => ({ club_id: c.id, name: c.name }));
      }

      const clubIds = memberships.map((m) => m.club_id).filter(Boolean) as string[];
      const { data: clubs } = await supabase
        .from("clubs")
        .select("id, name")
        .in("id", clubIds)
        .eq("status", "active");

      return (clubs ?? []).map((c) => ({ club_id: c.id, name: c.name }));
    },
    enabled: !!user?.id,
  });

  // Determine which clubs to fetch requests for
  const targetClubIds = useMemo(() => {
    if (urlClubId) return [urlClubId];
    return adminClubs.map((c) => c.club_id);
  }, [urlClubId, adminClubs]);

  const clubNameById = useMemo(() => {
    const map = new Map<string, string>();
    adminClubs.forEach((c) => map.set(c.club_id, c.name));
    return map;
  }, [adminClubs]);

  // Fetch pending requests from all admin clubs
  const { data: allRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["manage-requests-all", targetClubIds],
    queryFn: async (): Promise<RequestRow[]> => {
      if (!targetClubIds.length) return [];

      const results: RequestRow[] = [];

      await Promise.all(
        targetClubIds.map(async (clubId) => {
          try {
            const rows = await listManageMembers(clubId);
            // Only show pending requests
            const pending = rows.filter((r) => r.status === "pending");

            pending.forEach((r) => {
              results.push({
                ...r,
                club_name: clubNameById.get(clubId) ?? "Unknown Club",
                club_id: clubId,
              });
            });
          } catch (err) {
            console.error(`Error fetching requests for club ${clubId}:`, err);
          }
        })
      );

      // Sort by requested_at desc (newest first)
      results.sort((a, b) => {
        const aTime = a.requested_at ? new Date(a.requested_at).getTime() : 0;
        const bTime = b.requested_at ? new Date(b.requested_at).getTime() : 0;
        return bTime - aTime;
      });

      return results;
    },
    enabled: targetClubIds.length > 0,
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["manage-requests-all"] }),
      ...targetClubIds.map((id) =>
        queryClient.invalidateQueries({ queryKey: ["members.manage", id] })
      ),
      ...targetClubIds.map((id) =>
        queryClient.invalidateQueries({ queryKey: ["pendingRequestsCount", id] })
      ),
    ]);
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => approveMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: t("manageRequests.approved"), duration: 1500 });
    },
    onError: (e) => {
      toast({
        title: t("manageRequests.approvalFailed"),
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: t("manageRequests.rejected"), duration: 1500 });
    },
    onError: (e) => {
      toast({
        title: t("manageRequests.rejectFailed"),
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
        duration: 2000,
      });
    },
  });

  const isLoading = clubsLoading || requestsLoading;

  // If no admin clubs and not loading, redirect
  if (!clubsLoading && adminClubs.length === 0 && !urlClubId) {
    return <Navigate to="/members" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate("/members")}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">{t("manageRequests.title")}</h1>
        </div>
      </div>
      <div className="h-14" />

      {/* Content */}
      <main className="flex-grow">
        <div className="max-w-lg mx-auto px-4 py-6 pb-24">
          <h2 className="text-lg font-bold text-foreground mb-4">
            {t("manageRequests.allRequests")}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-7 w-7 rounded-full border-2 border-muted border-t-foreground" />
            </div>
          ) : allRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                {t("manageRequests.noPending")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {allRequests.map((req) => (
                <div
                  key={req.membership_id}
                  className="flex gap-3 rounded-xl border border-border bg-card p-3"
                >
                  {/* Profile image — rounded, 1:1 */}
                  <div className="w-14 h-14 shrink-0 rounded-full bg-muted overflow-hidden">
                    {req.image_url ? (
                      <img
                        src={req.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-base font-semibold">
                        {req.first_name?.[0]}
                        {req.last_name?.[0]}
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    {/* Top row: name + time ago */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {[req.first_name, req.last_name]
                            .filter(Boolean)
                            .join(" ") || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {req.club_name}
                        </p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                        {(() => {
                          if (!req.requested_at) return "";
                          const diffDays = Math.floor((Date.now() - new Date(req.requested_at).getTime()) / (1000 * 60 * 60 * 24));
                          if (diffDays === 0) return t("manageRequests.today");
                          if (diffDays === 1) return t("manageRequests.oneDayAgo");
                          return t("manageRequests.daysAgo", { count: diffDays });
                        })()}
                      </span>
                    </div>

                    {/* Action buttons — Reject first, Accept second */}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 flex-1 text-xs"
                        onClick={() => rejectMut.mutate(req.membership_id)}
                        disabled={approveMut.isPending || rejectMut.isPending}
                      >
                        {t("manageRequests.reject")}
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 flex-1 text-xs"
                        onClick={() => approveMut.mutate(req.membership_id)}
                        disabled={approveMut.isPending || rejectMut.isPending}
                      >
                        {t("manageRequests.accept")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
