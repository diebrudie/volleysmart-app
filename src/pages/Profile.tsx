import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import { Upload, Calendar } from "lucide-react";

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

  const isOwnProfile = user?.id === userId;

  // Track changes for Personal Info
  const hasPersonalInfoChanges = () => {
    if (!profile || !originalProfile) return false;
    return (
      profile.first_name !== originalProfile.first_name ||
      profile.last_name !== originalProfile.last_name ||
      profile.birthday !== originalProfile.birthday ||
      profile.gender !== originalProfile.gender ||
      profile.height_cm !== originalProfile.height_cm ||
      profile.bio !== originalProfile.bio ||
      imageFile !== null
    );
  };

  // Track changes for Skills
  const hasSkillsChanges = () => {
    if (!profile || !originalProfile) return false;

    // Check skill rating change
    if (profile.skill_rating !== originalProfile.skill_rating) return true;

    // Check positions changes
    if (playerPositions.length !== originalPlayerPositions.length) return true;

    // Check if positions content has changed
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

  // Fetch player positions after profile is loaded
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
      setOriginalProfile(data); // Store original for comparison
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
        setOriginalPlayerPositions(data); // Store original for comparison
      }
    } catch (error) {
      console.error("Error fetching player positions:", error);
    }
  };

  const handlePersonalInfoSave = async () => {
    if (!profile || !isOwnProfile) return;

    setSaving(true);
    try {
      let imageUrl = profile.image_url;

      // Upload image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("player-images") // ✅ Using your existing player-images bucket
          .upload(fileName, imageFile);

        if (uploadError) {
          // Handle bucket/policy errors gracefully
          if (
            uploadError.message?.includes("bucket") ||
            uploadError.message?.includes("policy")
          ) {
            console.warn("Storage policy warning:", uploadError.message);
            toast({
              title: "Notice",
              description:
                "Image upload failed, but profile will be updated without new image.",
              variant: "default",
            });
          } else {
            throw uploadError;
          }
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("player-images") // ✅ Using your existing player-images bucket
            .getPublicUrl(fileName);

          imageUrl = publicUrl;
        }
      }

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

      const updatedProfile = { ...profile, image_url: imageUrl };
      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setImageFile(null);

      toast({
        title: "Success",
        description: "Personal information updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update personal information",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkillsSave = async () => {
    if (!profile || !isOwnProfile) return;

    setSaving(true);
    try {
      // Delete existing positions
      await supabase
        .from("player_positions")
        .delete()
        .eq("player_id", profile.id);

      // Insert new positions
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

      // Update skill rating
      const { error: profileError } = await supabase
        .from("players")
        .update({
          skill_rating: profile.skill_rating,
        })
        .eq("id", profile.id);

      if (profileError) throw profileError;

      // Update original values after successful save
      setOriginalProfile({
        ...originalProfile!,
        skill_rating: profile.skill_rating,
      });
      setOriginalPlayerPositions([...playerPositions]);

      toast({
        title: "Success",
        description: "Volleyball skills updated successfully",
      });
    } catch (error) {
      console.error("Error updating skills:", error);
      toast({
        title: "Error",
        description: "Failed to update volleyball skills",
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

  const getSecondaryPositions = () => {
    return playerPositions
      .filter((pos) => !pos.is_primary)
      .map((pos) => positions.find((p) => p.id === pos.position_id)?.name)
      .filter(Boolean);
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
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Profile not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {profile.first_name} {profile.last_name}
          </h1>
          {userCreatedAt && (
            <p className="text-gray-600 mt-2">
              Member since {formatMemberSince(userCreatedAt)}
            </p>
          )}
          {!isOwnProfile && (
            <p className="text-gray-600 mt-1">Viewing player profile</p>
          )}
        </div>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="skills">Volleyball Info</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  {isOwnProfile
                    ? "Update your personal details"
                    : "Personal details"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                      src={
                        imageFile
                          ? URL.createObjectURL(imageFile)
                          : profile.image_url || ""
                      }
                      alt="Profile"
                      className="object-cover"
                    />
                    <AvatarFallback className="text-lg">
                      {profile.first_name?.[0]}
                      {profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isOwnProfile && (
                    <div>
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800">
                          <Upload className="h-4 w-4" />
                          <span>Upload new photo</span>
                        </div>
                      </Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                      disabled={!isOwnProfile}
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
                      disabled={!isOwnProfile}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="birthday">Birthday</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={profile.birthday || ""}
                      onChange={(e) =>
                        setProfile({ ...profile, birthday: e.target.value })
                      }
                      disabled={!isOwnProfile}
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
                      placeholder="e.g. 175"
                      disabled={!isOwnProfile}
                    />
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={profile.gender}
                      onValueChange={(value) =>
                        setProfile({ ...profile, gender: value })
                      }
                      disabled={!isOwnProfile}
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
                    disabled={!isOwnProfile}
                    rows={4}
                  />
                </div>

                {isOwnProfile && (
                  <Button
                    onClick={handlePersonalInfoSave}
                    disabled={saving || !hasPersonalInfoChanges()}
                    className="w-full"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <Card>
              <CardHeader>
                <CardTitle>Volleyball Information</CardTitle>
                <CardDescription>
                  {isOwnProfile
                    ? "Update your volleyball skills and preferences"
                    : "Volleyball skills and preferences"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.skill_rating && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-center">
                      <Label className="text-sm font-medium text-gray-600">
                        Overall Skill Level
                      </Label>
                      <div className="text-3xl font-bold text-blue-600 mt-1">
                        {profile.skill_rating}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        out of 100
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-base font-medium">Main Position</Label>
                  <Select
                    value={
                      getPrimaryPosition()
                        ? positions.find((p) => p.name === getPrimaryPosition())
                            ?.id
                        : ""
                    }
                    onValueChange={updatePrimaryPosition}
                    disabled={!isOwnProfile}
                  >
                    <SelectTrigger className="h-12">
                      {" "}
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
                    {" "}
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
                              ? "bg-gray-50 border-gray-200"
                              : isSecondary
                              ? "bg-blue-50 border-blue-200"
                              : "bg-white border-gray-200 hover:border-gray-300"
                          }`} /* ✅ Better styling with visual states */
                        >
                          <input
                            type="checkbox"
                            id={`secondary-${position.id}`}
                            checked={isSecondary}
                            disabled={isPrimary || !isOwnProfile}
                            onChange={(e) =>
                              toggleSecondaryPosition(
                                position.id,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" /* ✅ Better checkbox styling */
                          />
                          <Label
                            htmlFor={`secondary-${position.id}`}
                            className={`flex-1 text-sm font-medium cursor-pointer ${
                              isPrimary ? "text-gray-400" : "text-gray-700"
                            }`} /* ✅ Improved text styling */
                          >
                            {position.name}
                            {isPrimary && (
                              <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded-full">
                                Primary
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Select additional positions you can play effectively
                  </p>
                </div>

                {isOwnProfile && (
                  <Button
                    onClick={handleSkillsSave}
                    disabled={saving || !hasSkillsChanges()}
                    className="w-full h-12" /* ✅ Larger button */
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
