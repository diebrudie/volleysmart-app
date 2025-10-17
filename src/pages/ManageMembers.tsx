import { useEffect, useMemo } from "react";
import { useParams, Navigate } from "react-router-dom";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Role = ManageMemberRow["role"];

export default function ManageMembers() {
  const { clubId: clubIdFromCtx, setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const clubId = urlClubId ?? clubIdFromCtx ?? undefined;
  const asRole = (v: string): Role =>
    v === "admin" || v === "editor" || v === "member" ? v : "member";

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

  const approveMut = useMutation({
    mutationFn: (id: string) => approveMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Membership approved" });
    },
    onError: (e) => onUnknownError(e, "Approval failed"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectMembership(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Request rejected" });
    },
    onError: (e) => onUnknownError(e, "Reject failed"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Member removed" });
    },
    onError: (e) => onUnknownError(e, "Remove failed"),
  });

  const roleMut = useMutation({
    mutationFn: (p: { id: string; role: "admin" | "editor" | "member" }) =>
      changeMemberRole(p.id, p.role),
    onSuccess: async () => {
      await invalidateAll();
      toast({ title: "Role updated" });
    },
    onError: (e) => onUnknownError(e, "Role update failed"),
  });

  const rows = useMemo(() => {
    const order: Record<ManageMemberRow["status"], number> = {
      pending: 0,
      active: 1,
      removed: 2,
      rejected: 2,
    };
    return (data ?? [])
      .slice()
      .sort((a, b) => order[a.status] - order[b.status]);
  }, [data]);

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
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Manage Members</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="p-6 flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading members…
                </div>
              ) : error ? (
                <div className="text-destructive">Failed to load members.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="py-2 text-left">Name</th>
                        <th className="py-2 text-left">Email</th>
                        <th className="py-2 text-left">Role</th>
                        <th className="py-2 text-left">Status</th>
                        <th className="py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((m) => (
                        <tr
                          key={m.membership_id}
                          className="border-b last:border-0"
                        >
                          <td className="py-2">
                            {[m.first_name, m.last_name]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </td>
                          <td className="py-2">{m.email}</td>
                          <td className="py-2">
                            {m.status === "active" ? (
                              <Select
                                defaultValue={m.role}
                                onValueChange={(val) =>
                                  roleMut.mutate({
                                    id: m.membership_id,
                                    role: asRole(val),
                                  })
                                }
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">member</SelectItem>
                                  <SelectItem value="editor">editor</SelectItem>
                                  <SelectItem value="admin">admin</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="opacity-60">{m.role}</span>
                            )}
                          </td>
                          <td className="py-2 capitalize">{m.status}</td>
                          <td className="py-2">
                            <div className="flex gap-2">
                              {m.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      approveMut.mutate(m.membership_id)
                                    }
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      rejectMut.mutate(m.membership_id)
                                    }
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {m.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    removeMut.mutate(m.membership_id)
                                  }
                                >
                                  Remove
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
                            colSpan={5}
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
      </main>
    </div>
  );
}
