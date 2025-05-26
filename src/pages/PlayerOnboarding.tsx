
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { createPlayer } from '@/integrations/supabase/players';
import { supabase } from '@/integrations/supabase/client';

interface Position {
  id: string;
  name: string;
}

const PlayerOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [skillRating, setSkillRating] = useState(5);
  const [primaryPosition, setPrimaryPosition] = useState('');
  const [secondaryPositions, setSecondaryPositions] = useState<string[]>([]);
  const [memberAssociation, setMemberAssociation] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'diverse'>('other');
  const [birthday, setBirthday] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Load user metadata to populate first and last names
    if (user) {
      const getUserMetadata = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.user_metadata) {
          setFirstName(authUser.user_metadata.first_name || '');
          setLastName(authUser.user_metadata.last_name || '');
        }
      };
      getUserMetadata();
    }

    fetchPositions();
  }, [user]);

  const fetchPositions = async () => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('name');

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast({
        title: "Error",
        description: "Failed to load positions",
        variant: "destructive",
      });
    }
  };

  const handleSecondaryPositionChange = (positionId: string, checked: boolean) => {
    if (checked) {
      setSecondaryPositions([...secondaryPositions, positionId]);
    } else {
      setSecondaryPositions(secondaryPositions.filter(id => id !== positionId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await createPlayer(user.id, {
        first_name: firstName,
        last_name: lastName,
        bio,
        skill_rating: skillRating,
        primary_position: primaryPosition,
        secondary_positions: secondaryPositions,
        member_association: memberAssociation,
        gender,
        birthday: birthday || undefined,
      });

      toast({
        title: "Success",
        description: "Player profile created successfully!",
      });

      navigate('/start');
    } catch (error) {
      console.error('Error creating player:', error);
      toast({
        title: "Error",
        description: "Failed to create player profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Player Profile</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={gender} onValueChange={(value: 'male' | 'female' | 'other' | 'diverse') => setGender(value)}>
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
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>

            <div>
              <Label>Main Position *</Label>
              <Select value={primaryPosition} onValueChange={setPrimaryPosition} required>
                <SelectTrigger>
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
              <Label>Secondary Positions</Label>
              <div className="mt-2 space-y-2">
                {positions.map((position) => (
                  <div key={position.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`secondary-${position.id}`}
                      checked={secondaryPositions.includes(position.id)}
                      disabled={primaryPosition === position.id}
                      onChange={(e) => handleSecondaryPositionChange(position.id, e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`secondary-${position.id}`} className={primaryPosition === position.id ? "text-gray-400" : ""}>
                      {position.name} {primaryPosition === position.id && "(Primary)"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Skill Level (1-10) *</Label>
              <RadioGroup
                value={skillRating.toString()}
                onValueChange={(value) => setSkillRating(parseInt(value))}
                className="flex flex-wrap gap-4 mt-2"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                  <div key={level} className="flex items-center space-x-2">
                    <RadioGroupItem value={level.toString()} id={`level-${level}`} />
                    <Label htmlFor={`level-${level}`}>{level}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="memberAssociation"
                checked={memberAssociation}
                onChange={(e) => setMemberAssociation(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="memberAssociation">
                I am a member of a volleyball association
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Profile...' : 'Complete Profile'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlayerOnboarding;
