import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useClub } from "@/contexts/ClubContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  listManageMembers,
  approveMembership,
  rejectMembership,
  removeMember,
  changeMemberRole,
  type ManageMemberRow,
} from "@/integrations/supabase/members";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/layout/Navbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Role = ManageMemberRow["role"];

export default function ManageMembers() {
  const { clubId: clubIdFromCtx, setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const clubId = urlClubId ?? clubIdFromCtx ?? undefined;
  const navigate = useNavigate();
  const { user } = useAuth();

  const asRole = (v: string): Role =>
    v === "admin" || v === "editor" || v === "member" ? v : "member";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (urlClubId) setClubId(urlClubId);
  }, [urlClubId, setClubId]);

  const {
    data: isAdmin,
    isLoading: adminLoading,
    error: adminError,
  } = useIsAdmin(clubId);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["members.manage", clubId],
    enabled: !!clubId && isAdmin === true,
    queryFn: () => listManageMembers(clubId!),
  });

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["members.manage", clubId] }),
      queryClient.invalidateQueries({ queryKey: ["clubMembers", clubId] }),
    ]);
  };

  const onUnknownError = (e: unknown, title: string) => {
    const msg = e instanceof Error ? e.message : "Unknown error";
    toast({ title, description: msg, variant: "destructive" });
  };

  const requestRemove = (id: string) => {
    setPendingRemoveId(id);
    setConfirmOpen(true);
  };

  const confirmRemove = () => {
    if (pendingRemoveId) {
      removeMut.mutate(pendingRemoveId);
    }
    setConfirmOpen(false);
    setPendingRemoveId(null);
  };

  const approveMut = useMutation({
    mutationFn: (id: string) => approveMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Membership approved", duration: 1500 });
    },
    onError: (e) => onUnknownError(e, "Approval failed"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Request rejected", duration: 1500 });
    },
    onError: (e) => onUnknownError(e, "Reject failed"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Member removed", duration: 1500 });
    },
    onError: (e) => onUnknownError(e, "Remove failed"),
  });

  const roleMut = useMutation({
    mutationFn: (p: { id: string; role: "admin" | "editor" | "member" }) =>
      changeMemberRole(p.id, p.role),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Role updated", duration: 1500 });
    },
    onError: (e) => onUnknownError(e, "Role update failed"),
  });

  const rows = useMemo(() => {
    // Hide removed members and the current user (admin)
    // Sort priority:
    //  1) pending requests first (pinned at top)
    //  2) A→Z by first_name
    const currentUserId = user?.id ?? null;
    return (data ?? [])
      .filter((m) => m.status !== "removed" && m.user_id !== currentUserId)
      .slice()
      .sort((a, b) => {
        const aPending = a.status === "pending";
        const bPending = b.status === "pending";
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        return (a.first_name ?? "").localeCompare(b.first_name ?? "");
      });
  }, [data, user?.id]);

  if (adminLoading) {
    return (
      <div className="p-8 flex items-center gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Checking admin permissions…
      </div>
    );
  }

  if (adminError || isAdmin === false) {
    return <Navigate to={`/members/${clubId}`} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Heading row */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="mr-4"
                  onClick={() => navigate(`/members/${clubId}`)}
                  aria-label="Back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-4xl font-serif">Manage Members</h1>
              </div>
              <div />
            </div>
          </div>

          <Card>
            <CardContent>
              {isLoading ? (
                <div className="p-6 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading members…
                </div>
              ) : error ? (
                <div className="text-destructive">Failed to load members.</div>
              ) : (
                // Keep horizontal scroll for narrow screens
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="py-2 pt-5 text-left">Name</th>
                        <th className="py-2 pt-5 text-left">Status</th>
                        <th className="py-2 pt-5 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((m) => (
                        <tr
                          key={m.membership_id}
                          className="border-b last:border-0"
                        >
                          {/* Name (non-wrapping) */}
                          <td className="py-2 pr-4 whitespace-nowrap">
                            {[m.first_name, m.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </td>

                          {/* Status */}
                          <td className="py-2 pr-4 sm:pr-6 capitalize">
                            <span
                              className={
                                m.status === "pending"
                                  ? "text-yellow-600"
                                  : m.status === "active"
                                  ? "text-green-600"
                                  : "text-gray-500"
                              }
                            >
                              {m.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-2">
                            <div className="flex gap-2">
                              {m.status === "pending" && (
                                <>
                                  {/* Reject */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      rejectMut.mutate(m.membership_id)
                                    }
                                  >
                                    <span className="sm:hidden">✕</span>
                                    <span className="hidden sm:inline">
                                      Reject
                                    </span>
                                  </Button>

                                  {/* Approve */}
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() =>
                                      approveMut.mutate(m.membership_id)
                                    }
                                  >
                                    <span className="sm:hidden">✓</span>
                                    <span className="hidden sm:inline">
                                      Approve
                                    </span>
                                  </Button>
                                </>
                              )}

                              {m.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => requestRemove(m.membership_id)}
                                >
                                  <span className="sm:hidden">✕</span>
                                  <span className="hidden sm:inline">
                                    Remove
                                  </span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}

                      {rows.length === 0 && (
                        <tr>
                          <td
                            className="py-6 text-center opacity-60"
                            colSpan={3}
                          >
                            No memberships found for this club.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Confirm remove dialog */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Remove member</DialogTitle>
              <DialogDescription>
                This will revoke the member’s access to this club. Are you sure
                you want to continue?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmRemove}>
                Confirm remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
