import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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
import { ArrowLeft, Upload, HelpCircle, X, Pencil, Calendar } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
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
  const [isPositionsHelpOpen, setIsPositionsHelpOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwnProfile = user?.id === userId;

  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const last = localStorage.getItem("lastPrivatePath");
    if (last && last !== location.pathname) {
      navigate(last);
      return;
    }
    navigate("/clubs");
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
      profile.skill_rating !== originalProfile.skill_rating ||
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
    }
  }, [userId]);

  useEffect(() => {
    if (profile?.id) {
      fetchPlayerPositions();
    }
  }, [profile?.id]);

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

      // Update profile
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
          skill_rating: profile.skill_rating,
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

  const getPrimaryPosition = () => {
    const primary = playerPositions.find((pos) => pos.is_primary);
    return primary
      ? positions.find((p) => p.id === primary.position_id)?.name
      : "";
  };

  const updatePrimaryPosition = (positionId: string) => {
    const newPositions = playerPositions.filter((pos) => !pos.is_primary);
    newPositions.push({ position_id: positionId, is_primary: true });
    setPlayerPositions(newPositions);
  };

  const toggleSecondaryPosition = (positionId: string, checked: boolean) => {
    if (checked) {
      setPlayerPositions([
        ...playerPositions,
        { position_id: positionId, is_primary: false },
      ]);
    } else {
      setPlayerPositions(
        playerPositions.filter((pos) => pos.position_id !== positionId)
      );
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

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto py-6 px-4">
          <button
            onClick={handleBack}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center mb-6"
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
    <div className="min-h-screen bg-background pb-24">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={handleBack}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {isOwnProfile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="h-9 w-9 rounded-full bg-muted flex items-center justify-center"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Profile header (Strava style) */}
        <div className="flex items-center gap-5 py-4">
          <div className="relative">
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
            <h1 className="text-2xl font-bold text-foreground">
              {profile.first_name} {profile.last_name}
            </h1>
            {getPrimaryPosition() && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {getPrimaryPosition()}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 py-3 border-b border-border">
          {profile.skill_rating && (
            <div>
              <p className="text-xs text-muted-foreground">Skill</p>
              <p className="text-lg font-bold text-foreground">{profile.skill_rating}</p>
            </div>
          )}
          {profile.height_cm && !isEditing && (
            <div>
              <p className="text-xs text-muted-foreground">Height</p>
              <p className="text-lg font-bold text-foreground">{profile.height_cm} cm</p>
            </div>
          )}
          {userCreatedAt && (
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-lg font-bold text-foreground">
                {formatMemberSince(userCreatedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Bio section (view mode) */}
        {!isEditing && profile.bio && (
          <div className="py-4 border-b border-border">
            <p className="text-sm text-foreground">{profile.bio}</p>
          </div>
        )}

        {/* Edit form */}
        {isEditing ? (
          <div className="py-6 space-y-6">
            {/* Personal info */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">Personal Info</h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profile.first_name}
                    onChange={(e) =>
                      setProfile({ ...profile, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profile.last_name}
                    onChange={(e) =>
                      setProfile({ ...profile, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={profile.birthday || ""}
                    onChange={(e) =>
                      setProfile({ ...profile, birthday: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="height">Height (cm)</Label>
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
                  />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(value) =>
                      setProfile({ ...profile, gender: value })
                    }
                  >
                    <SelectTrigger>
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
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>
            </div>

            {/* Volleyball info */}
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-foreground">Volleyball Info</h2>

              <div>
                <Label>Skill Rating (1–100)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={profile.skill_rating || ""}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      skill_rating: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="50"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">Main Position</Label>
                  <button
                    type="button"
                    aria-label="Show court positions"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setIsPositionsHelpOpen(true)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>

                <Select
                  value={
                    getPrimaryPosition()
                      ? positions.find((p) => p.name === getPrimaryPosition())
                          ?.id
                      : ""
                  }
                  onValueChange={updatePrimaryPosition}
                >
                  <SelectTrigger className="h-12">
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

              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Secondary Positions
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {positions.map((position) => {
                    const isPrimary = playerPositions.some(
                      (p) => p.position_id === position.id && p.is_primary
                    );
                    const isSecondary = playerPositions.some(
                      (p) => p.position_id === position.id && !p.is_primary
                    );

                    return (
                      <div
                        key={position.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                          isPrimary
                            ? "bg-muted border-border"
                            : isSecondary
                            ? "bg-primary/5 border-primary/30"
                            : "bg-card border-border hover:border-muted-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          id={`secondary-${position.id}`}
                          checked={isSecondary}
                          disabled={isPrimary}
                          onChange={(e) =>
                            toggleSecondaryPosition(
                              position.id,
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 rounded border-border"
                        />
                        <Label
                          htmlFor={`secondary-${position.id}`}
                          className={`flex-1 text-sm font-medium cursor-pointer ${
                            isPrimary
                              ? "text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {position.name}
                          {isPrimary && (
                            <span className="ml-2 text-xs bg-muted px-2 py-1 rounded-full">
                              Primary
                            </span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select additional positions you can play effectively
                </p>
              </div>
            </div>

            {/* Save / Cancel buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving || !hasChanges()}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        ) : (
          /* View-only sections */
          <div className="py-4 space-y-1">
            {/* Positions */}
            {playerPositions.length > 0 && (
              <div className="py-3 border-b border-border">
                <p className="text-xs text-muted-foreground mb-2">Positions</p>
                <div className="flex flex-wrap gap-2">
                  {playerPositions.map((pp) => {
                    const pos = positions.find((p) => p.id === pp.position_id);
                    if (!pos) return null;
                    return (
                      <span
                        key={pp.position_id}
                        className={`text-sm px-3 py-1 rounded-full ${
                          pp.is_primary
                            ? "bg-primary/10 text-primary font-medium"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {pos.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            {(profile.gender || profile.birthday || profile.height_cm) && (
              <div className="py-3 border-b border-border space-y-2">
                <p className="text-xs text-muted-foreground">Details</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-foreground">
                  {profile.gender && (
                    <span className="capitalize">{profile.gender}</span>
                  )}
                  {profile.birthday && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(profile.birthday).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  {profile.height_cm && <span>{profile.height_cm} cm</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Positions helper drawer */}
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
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Profile;
