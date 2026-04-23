import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, HelpCircle, X, Pencil, Cake, User, Ruler, Trash2, LogOut } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { updateMemberAssociation } from "@/integrations/supabase/members";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { useIsCompact } from "@/hooks/use-compact";

interface PlayerProfile {
  id: string;
  first_name: string;
  last_name: string;
  birthday: string | null;
  gender: string;
  height_cm: number | null;
  bio: string | null;
  image_url: string | null;
  skill_rating: number | null;
}

interface PlayerPosition {
  position_id: string;
  is_primary: boolean;
}

interface Position {
  id: string;
  name: string;
}

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const isCompact = useIsCompact();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<PlayerProfile | null>(
    null
  );
  const [positions, setPositions] = useState<Position[]>([]);
  const [playerPositions, setPlayerPositions] = useState<PlayerPosition[]>([]);
  const [originalPlayerPositions, setOriginalPlayerPositions] = useState<
    PlayerPosition[]
  >([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isPositionsHelpOpen, setIsPositionsHelpOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [userClubs, setUserClubs] = useState<
    { membership_id: string; club_id: string; name: string; role: string; joined_at: string | null; member_association: boolean }[]
  >([]);
  const [showLeaveDialog, setShowLeaveDialog] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const isOwnProfile = user?.id === userId;

  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  // Track if anything has changed
  const hasChanges = () => {
    if (!profile || !originalProfile) return false;
    const personalChanged =
      profile.first_name !== originalProfile.first_name ||
      profile.last_name !== originalProfile.last_name ||
      profile.birthday !== originalProfile.birthday ||
      profile.gender !== originalProfile.gender ||
      profile.height_cm !== originalProfile.height_cm ||
      profile.bio !== originalProfile.bio ||
      imageFile !== null;

    if (personalChanged) return true;

    if (playerPositions.length !== originalPlayerPositions.length) return true;
    const sortedCurrent = [...playerPositions].sort((a, b) =>
      a.position_id.localeCompare(b.position_id)
    );
    const sortedOriginal = [...originalPlayerPositions].sort((a, b) =>
      a.position_id.localeCompare(b.position_id)
    );
    return JSON.stringify(sortedCurrent) !== JSON.stringify(sortedOriginal);
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchPositions();
      fetchUserCreatedAt();
      fetchUserClubs();
    }
  }, [userId]);

  useEffect(() => {
    if (profile?.id) {
      fetchPlayerPositions();
    }
  }, [profile?.id]);

  // Get the email for the profile user
  useEffect(() => {
    if (isOwnProfile && user?.email) {
      setUserEmail(user.email);
    }
  }, [isOwnProfile, user?.email]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
          duration: 2000,
        });
        return;
      }

      setProfile(data);
      setOriginalProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCreatedAt = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("created_at")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setUserCreatedAt(data.created_at);
      }
    } catch (error) {
      console.error("Error fetching user creation date:", error);
    }
  };

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from("positions")
        .select("*")
        .order("name");

      if (!error && data) {
        setPositions(data);
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  };

  const fetchPlayerPositions = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from("player_positions")
        .select("position_id, is_primary")
        .eq("player_id", profile.id);

      if (!error && data) {
        setPlayerPositions(data);
        setOriginalPlayerPositions(data);
      }
    } catch (error) {
      console.error("Error fetching player positions:", error);
    }
  };

  const fetchUserClubs = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("club_members")
        .select("id, club_id, role, joined_at, member_association, clubs(name)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("status", "active");

      if (!error && data) {
        setUserClubs(
          data.map((m) => ({
            membership_id: m.id as string,
            club_id: m.club_id as string,
            name: (m.clubs as any)?.name ?? "Unknown",
            role: m.role as string,
            joined_at: m.joined_at as string | null,
            member_association: (m.member_association as boolean) ?? false,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching user clubs:", error);
    }
  };

  const handleLeaveClub = async (clubId: string) => {
    if (!userId) return;
    setIsLeaving(true);
    try {
      const { error } = await supabase
        .from("club_members")
        .update({ is_active: false, status: "removed" as any })
        .eq("club_id", clubId)
        .eq("user_id", userId);

      if (error) throw error;

      setUserClubs((prev) => prev.filter((c) => c.club_id !== clubId));
      toast({ title: "Left club", duration: 1500 });
    } catch (error) {
      console.error("Error leaving club:", error);
      toast({
        title: "Error",
        description: "Failed to leave club",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsLeaving(false);
      setShowLeaveDialog(null);
    }
  };

  const handleToggleAssociation = async (membershipId: string, newValue: boolean) => {
    try {
      await updateMemberAssociation(membershipId, newValue);
      setUserClubs((prev) =>
        prev.map((c) =>
          c.membership_id === membershipId ? { ...c, member_association: newValue } : c
        )
      );
      toast({ title: newValue ? "Marked as association member" : "Association membership removed", duration: 1500 });
    } catch (error) {
      console.error("Error updating member association:", error);
      toast({ title: "Error", description: "Failed to update", variant: "destructive", duration: 2000 });
    }
  };

  const handleSave = async () => {
    if (!profile || !isOwnProfile) return;

    setSaving(true);
    try {
      let imageUrl = profile.image_url;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("player-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          if (
            uploadError.message?.includes("bucket") ||
            uploadError.message?.includes("policy")
          ) {
            console.warn("Storage policy warning:", uploadError.message);
          } else {
            throw uploadError;
          }
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("player-images").getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      }

      // Update profile (skill_rating is NOT updated — it's automatic)
      const { error } = await supabase
        .from("players")
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          birthday: profile.birthday,
          gender: profile.gender,
          height_cm: profile.height_cm,
          bio: profile.bio,
          image_url: imageUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      // Update positions
      await supabase
        .from("player_positions")
        .delete()
        .eq("player_id", profile.id);

      if (playerPositions.length > 0) {
        const { error: positionsError } = await supabase
          .from("player_positions")
          .insert(
            playerPositions.map((pos) => ({
              player_id: profile.id,
              position_id: pos.position_id,
              is_primary: pos.is_primary,
            }))
          );
        if (positionsError) throw positionsError;
      }

      const updatedProfile = { ...profile, image_url: imageUrl };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setOriginalPlayerPositions([...playerPositions]);
      setImageFile(null);
      setIsEditing(false);

      toast({
        title: "Profile updated",
        description: "Your changes have been saved.",
        duration: 1500,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  const getPrimaryPositionId = () => {
    const primary = playerPositions.find((pos) => pos.is_primary);
    return primary?.position_id ?? "";
  };

  const getPrimaryPositionName = () => {
    const id = getPrimaryPositionId();
    return positions.find((p) => p.id === id)?.name ?? "";
  };

  const getSecondaryPositionIds = () =>
    playerPositions.filter((p) => !p.is_primary).map((p) => p.position_id);

  const updatePrimaryPosition = (positionId: string) => {
    const secondaries = playerPositions.filter((pos) => !pos.is_primary);
    // Remove from secondaries if it was there
    const filtered = secondaries.filter((s) => s.position_id !== positionId);
    filtered.push({ position_id: positionId, is_primary: true });
    setPlayerPositions(filtered);
  };

  const updateSecondaryPosition = (positionId: string) => {
    const primary = playerPositions.find((p) => p.is_primary);
    // If it's the primary, ignore
    if (primary?.position_id === positionId) return;

    const isAlreadySecondary = playerPositions.some(
      (p) => p.position_id === positionId && !p.is_primary
    );

    if (isAlreadySecondary) {
      // Remove it
      setPlayerPositions(
        playerPositions.filter((p) => p.position_id !== positionId || p.is_primary)
      );
    } else {
      // Add it
      setPlayerPositions([
        ...playerPositions,
        { position_id: positionId, is_primary: false },
      ]);
    }
  };

  const formatMemberSince = (createdAt: string) => {
    const date = new Date(createdAt);
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const handleCancelEdit = () => {
    setProfile(originalProfile ? { ...originalProfile } : null);
    setPlayerPositions([...originalPlayerPositions]);
    setImageFile(null);
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      // Block deletion if the user is admin of any club with 2+ members
      const { data: adminClubs } = await supabase
        .from("club_members")
        .select("club_id, clubs(name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("status", "active")
        .eq("role", "admin");

      if (adminClubs?.length) {
        // Check member counts for each admin club
        for (const ac of adminClubs) {
          const { count } = await supabase
            .from("club_members")
            .select("id", { count: "exact", head: true })
            .eq("club_id", ac.club_id)
            .eq("is_active", true)
            .eq("status", "active");

          if ((count ?? 0) >= 2) {
            const clubName = (ac.clubs as any)?.name ?? "a club";
            toast({
              title: "Can't delete account",
              description: `You are the admin of "${clubName}" which has other members. Transfer admin role or remove members first.`,
              variant: "destructive",
              duration: 2000,
            });
            setIsDeleting(false);
            setShowDeleteDialog(false);
            return;
          }
        }
      }

      // Delete profile image from storage if it exists
      if (profile?.image_url) {
        try {
          const url = new URL(profile.image_url);
          const pathParts = url.pathname.split("/player-images/");
          if (pathParts[1]) {
            await supabase.storage
              .from("player-images")
              .remove([decodeURIComponent(pathParts[1])]);
          }
        } catch {
          // Storage cleanup is best-effort
        }
      }

      // Call RPC to clear image_url and delete auth user
      const { error } = await (supabase as any).rpc("delete_own_account");
      if (error) throw error;

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
        duration: 2000,
      });

      await logout();
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center lg:ml-60">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background lg:ml-60">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <button
            onClick={handleBack}
            className="h-9 w-9 rounded-full border border-border flex items-center justify-center mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <p className="text-lg text-muted-foreground text-center mt-12">
            Profile not found
          </p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background lg:ml-60" style={{ paddingBottom: isEditing ? '5rem' : undefined }}>
      {/* Header bar */}
      <div className="fixed top-0 left-0 right-0 lg:left-60 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={isEditing ? handleCancelEdit : handleBack}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">Profile</h1>
          {isOwnProfile && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute right-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="h-14" />

      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar + Name + Email */}
        <div className="flex items-center gap-5 pt-6 pb-4">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={
                  imageFile
                    ? URL.createObjectURL(imageFile)
                    : profile.image_url ?? undefined
                }
                alt="Profile"
                className="object-cover"
              />
              <AvatarFallback className="text-xl bg-muted">
                {profile.first_name?.[0]}
                {profile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            {isEditing && (
              <label
                htmlFor="image-upload"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-sm"
              >
                <Upload className="h-3.5 w-3.5" />
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-foreground">
              {profile.first_name} {profile.last_name}
            </h2>
            {userEmail && (
              <p className="text-sm text-muted-foreground mt-0.5">{userEmail}</p>
            )}
          </div>
        </div>

        {/* Member since + Skill row */}
        <div className="flex items-end justify-between py-3 border-b border-border">
          {userCreatedAt && (
            <div>
              <p className="text-xs text-primary/70 font-medium">Member since</p>
              <p className="text-lg font-bold text-foreground">
                {formatMemberSince(userCreatedAt)}
              </p>
            </div>
          )}
          {profile.skill_rating != null && (
            <div className="text-right">
              <p className="text-xs text-primary/70 font-medium">Skill</p>
              <p className="text-lg font-bold text-foreground">{profile.skill_rating}</p>
            </div>
          )}
        </div>

        {/* ── Tabs ──────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="personal" className="flex-1 text-xs">Personal</TabsTrigger>
            <TabsTrigger value="volleyball" className="flex-1 text-xs">Volleyball</TabsTrigger>
            <TabsTrigger value="clubs" className="flex-1 text-xs">Clubs</TabsTrigger>
          </TabsList>

          {/* ── Personal Details Tab ─────────────────────────── */}
          <TabsContent value="personal">
            {!isEditing ? (
              <div className="py-4 space-y-6">
                {profile.birthday && (
                  <div className="flex items-start gap-3">
                    <Cake className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Birthday</p>
                      <p className="text-base text-foreground">
                        {new Date(profile.birthday).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
                {profile.height_cm && (
                  <div className="flex items-start gap-3">
                    <Ruler className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Height</p>
                      <p className="text-base text-foreground">{profile.height_cm} cm</p>
                    </div>
                  </div>
                )}
                {profile.gender && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="text-base text-foreground capitalize">{profile.gender}</p>
                    </div>
                  </div>
                )}
                {profile.bio && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1">Bio</p>
                    <p className="text-base text-foreground">{profile.bio}</p>
                  </div>
                )}

                {!profile.bio && !profile.gender && !profile.birthday && !profile.height_cm && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">No personal details yet.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs text-muted-foreground">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs text-muted-foreground">Last Name</Label>
                    <Input
                      id="lastName"
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value })
                      }
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="birthday" className="text-xs text-muted-foreground">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={profile.birthday || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, birthday: e.target.value })
                      }
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="height" className="text-xs text-muted-foreground">Height (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      min="100"
                      max="250"
                      value={profile.height_cm || ""}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          height_cm: e.target.value
                            ? parseInt(e.target.value)
                            : null,
                        })
                      }
                      placeholder="175"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 max-w-[calc(50%-0.375rem)]">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(value) =>
                      setProfile({ ...profile, gender: value })
                    }
                  >
                    <SelectTrigger className="bg-muted/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="diverse">Diverse</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio" className="text-xs text-muted-foreground">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, bio: e.target.value })
                    }
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="bg-muted/50 border-border"
                  />
                </div>

                {isOwnProfile && (
                  <div className="pt-6">
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete my account
                    </button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Volleyball Tab ───────────────────────────────── */}
          <TabsContent value="volleyball">
            {!isEditing ? (
              <div className="py-4 space-y-5">
                {(() => {
                  const primaryPos = playerPositions.find((pp) => pp.is_primary);
                  const secondaryPosItems = playerPositions.filter((pp) => !pp.is_primary);
                  const primaryName = primaryPos
                    ? positions.find((p) => p.id === primaryPos.position_id)?.name
                    : null;

                  return playerPositions.length > 0 ? (
                    <>
                      {primaryName && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Main Position</p>
                          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-base font-semibold text-primary">{primaryName}</span>
                          </div>
                        </div>
                      )}

                      {secondaryPosItems.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Secondary Positions</p>
                          <div className="space-y-2">
                            {secondaryPosItems.map((pp) => {
                              const pos = positions.find((p) => p.id === pp.position_id);
                              if (!pos) return null;
                              return (
                                <div
                                  key={pp.position_id}
                                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 mr-2"
                                >
                                  <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                                  <span className="text-base text-foreground">{pos.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIsPositionsHelpOpen(true)}
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          View court positions diagram
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">No positions set yet.</p>
                      <button
                        type="button"
                        onClick={() => setIsPositionsHelpOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                        View court positions diagram
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="py-4 space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Main Position</p>
                  <Select
                    value={getPrimaryPositionId()}
                    onValueChange={updatePrimaryPosition}
                  >
                    <SelectTrigger className="h-11 bg-muted/50 border-border">
                      <SelectValue placeholder="Select your main position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Secondary Positions</p>
                  <div className="flex flex-wrap gap-2">
                    {positions.map((position) => {
                      const isPrimary = getPrimaryPositionId() === position.id;
                      const isSecondary = getSecondaryPositionIds().includes(position.id);

                      if (isPrimary) return null;

                      return (
                        <button
                          key={position.id}
                          type="button"
                          onClick={() => updateSecondaryPosition(position.id)}
                          className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                            isSecondary
                              ? "border-primary/40 bg-primary/10 text-primary font-medium"
                              : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                          }`}
                        >
                          {position.name}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Tap to toggle secondary positions
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPositionsHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    View court positions diagram
                  </button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Clubs Tab ────────────────────────────────────── */}
          <TabsContent value="clubs">
            <div className="py-4">
              {userClubs.length > 0 ? (
                <div className="space-y-3">
                  {isOwnProfile && (
                    <div className="flex items-center gap-1.5 pb-1">
                      <p className="text-xs text-muted-foreground">
                        Manage your club member associations
                      </p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-muted-foreground"
                            aria-label="What does member association mean?"
                          >
                            ?
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="bottom"
                          align="center"
                          className="max-w-xs text-sm leading-snug text-popover-foreground"
                        >
                          Member Association means you are a paid member of the
                          club. If you are not sure, leave this unchecked.
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  {userClubs.map((club) => (
                    <div
                      key={club.club_id}
                      className="rounded-xl border border-border bg-card p-4 space-y-3"
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => navigate(`/clubs/${club.club_id}`)}
                      >
                        <p className="text-base font-semibold text-foreground">
                          {club.name}
                        </p>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {club.joined_at
                            ? `Member since ${new Date(club.joined_at).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}`
                            : "Member"}
                          {" · "}
                          <span className="capitalize">{club.role}</span>
                        </p>
                      </div>

                      {isOwnProfile && (
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <Label htmlFor={`assoc-${club.club_id}`} className="text-sm text-foreground">
                            Member Association
                          </Label>
                          <Switch
                            id={`assoc-${club.club_id}`}
                            checked={club.member_association}
                            onCheckedChange={(checked) =>
                              handleToggleAssociation(club.membership_id, checked)
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">Not a member of any club yet.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Positions helper drawer (mobile) / sheet (desktop) */}
      {(() => {
        const positionsContent = (
          <div className="px-4 pb-2">
            <div className="mx-auto w-full md:max-w-3xl">
              <img
                src="/positions-volleyball-players-en.png"
                alt="Volleyball player positions on court"
                className="w-full h-auto max-h-[70vh] md:max-h-[80vh] object-contain rounded-md border"
              />
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Use this diagram to confirm your primary and secondary
                roles.
              </p>
            </div>
          </div>
        );

        return isCompact ? (
          <Drawer
            open={isPositionsHelpOpen}
            onOpenChange={setIsPositionsHelpOpen}
            shouldScaleBackground
          >
            <DrawerContent className="pb-6">
              <DrawerClose
                aria-label="Close"
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full
                  border border-border bg-background/90 text-foreground shadow
                  hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <X className="h-4 w-4" />
              </DrawerClose>
              <DrawerHeader className="pt-8">
                <DrawerTitle>Volleyball court positions</DrawerTitle>
                <DrawerDescription>
                  Reference diagram to pick your positions.
                </DrawerDescription>
              </DrawerHeader>
              {positionsContent}
            </DrawerContent>
          </Drawer>
        ) : (
          <Sheet open={isPositionsHelpOpen} onOpenChange={setIsPositionsHelpOpen}>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Volleyball court positions</SheetTitle>
                <SheetDescription>
                  Reference diagram to pick your positions.
                </SheetDescription>
              </SheetHeader>
              {positionsContent}
            </SheetContent>
          </Sheet>
        );
      })()}

      {/* Delete Account Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and profile picture. You
              will lose access to the app. Your name and past activity will
              remain visible in event and game history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Club Confirmation */}
      <AlertDialog open={!!showLeaveDialog} onOpenChange={(open) => !open && setShowLeaveDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave club?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be a member of this club. You can request to join again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showLeaveDialog && handleLeaveClub(showLeaveDialog)}
              disabled={isLeaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLeaving ? "Leaving..." : "Leave Club"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fixed Save / Cancel bar (edit mode only) */}
      {isEditing && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-3 pb-[calc(theme(spacing.3)+env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancelEdit}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="flex-1"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
