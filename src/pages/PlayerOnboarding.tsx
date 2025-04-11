import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";

// Import the Supabase utility functions
import { getAllPositions } from "@/integrations/supabase/positions";
import { createPlayer } from "@/integrations/supabase/players";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';

const PlayerOnboarding = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [skillLevel, setSkillLevel] = useState(3);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [positions, setPositions] = useState<Array<{ id: string; name: string }>>([]);
  
  // Load positions on component mount
  useEffect(() => {
    const loadPositions = async () => {
      try {
        const positionsData = await getAllPositions();
        setPositions(positionsData);
      } catch (error) {
        console.error("Error loading positions:", error);
        toast({
          title: "Error",
          description: "Failed to load player positions.",
          variant: "destructive"
        });
      }
    };
    
    loadPositions();
  }, [toast]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (!user) {
        throw new Error("You must be logged in to create a player profile");
      }
      
      await createPlayer(user.id, {
        first_name: firstName,
        last_name: lastName,
        bio,
        skill_rating: skillLevel,
        positions: selectedPositions
      });
      
      toast({
        title: "Success",
        description: "Your player profile has been created successfully.",
      });
      
      // Redirect to dashboard after successful player creation
      navigate('/dashboard');
    } catch (error) {
      console.error("Error creating player profile:", error);
      toast({
        title: "Error",
        description: "Failed to create player profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Create Your Player Profile</CardTitle>
              <CardDescription>
                Tell us a bit about yourself to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about your volleyball experience..."
                  />
                </div>
                <div>
                  <Label>Skill Level (1-5)</Label>
                  <Slider
                    defaultValue={[skillLevel]}
                    max={5}
                    min={1}
                    step={1}
                    onValueChange={(value) => setSkillLevel(value[0])}
                  />
                  <p className="text-sm text-muted-foreground">
                    Selected skill level: {skillLevel}
                  </p>
                </div>
                <div>
                  <Label>Positions</Label>
                  <Select onValueChange={(value) => setSelectedPositions([...value])} multiple>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select your positions" />
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Create Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PlayerOnboarding;
