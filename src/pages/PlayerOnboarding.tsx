
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createPlayer } from "@/integrations/supabase/players";
import { getAllPositions } from "@/integrations/supabase/positions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Define the schema for the form
const formSchema = z.object({
  primaryPosition: z.string({
    required_error: "Please select your main position",
  }),
  secondaryPositions: z.array(z.string()).min(1, "Select at least one other position"),
  skillRating: z.number().min(1).max(10),
  imageUrl: z.string().optional(),
  gender: z.enum(["male", "female", "diverse"]),
  birthday: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, {
    message: "Please enter a valid date in DD.MM.YYYY format",
  }).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const PlayerOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      primaryPosition: "",
      secondaryPositions: [],
      skillRating: 5,
      imageUrl: "",
      gender: "male",
      birthday: "",
    },
  });

  useEffect(() => {
    // Load positions from database
    const loadPositions = async () => {
      try {
        const positionsData = await getAllPositions();
        setPositions(positionsData);
      } catch (error) {
        console.error("Error loading positions:", error);
        toast({
          title: "Error",
          description: "Failed to load player positions",
          variant: "destructive",
        });
      }
    };

    loadPositions();
  }, [toast]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // In a real implementation, you would upload the file to storage
      form.setValue("imageUrl", URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete onboarding",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createPlayer(user.id, {
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || '',
        bio: "",
        image_url: data.imageUrl,
        skill_rating: data.skillRating,
        primary_position: data.primaryPosition,
        secondary_positions: data.secondaryPositions,
        member_association: true,
        gender: data.gender,
        birthday: data.birthday ? convertDateFormat(data.birthday) : undefined,
      });

      toast({
        title: "Success",
        description: "Your player profile has been created",
      });

      // Navigate to the start page
      navigate("/start");
    } catch (error) {
      console.error("Error creating player profile:", error);
      toast({
        title: "Error",
        description: "Failed to create player profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to convert DD.MM.YYYY to YYYY-MM-DD for database
  const convertDateFormat = (date: string) => {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <Card className="border shadow-md">
          <CardHeader>
            <CardTitle>Complete Your Player Profile</CardTitle>
            <CardDescription>
              Help us match you with the right team and positions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* Question 1: Primary Position */}
                <FormField
                  control={form.control}
                  name="primaryPosition"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">
                        1. Which is your main position?
                      </FormLabel>
                      <FormDescription>
                        This is the position you'd like to play always or the one you feel more comfortable with.
                      </FormDescription>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            field.onChange(value);
                            // When primary position changes, remove it from secondary positions if present
                            const currentSecondary = form.getValues("secondaryPositions");
                            if (currentSecondary.includes(value)) {
                              form.setValue(
                                "secondaryPositions",
                                currentSecondary.filter(pos => pos !== value)
                              );
                            }
                          }}
                          defaultValue={field.value}
                          className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2"
                        >
                          {positions.map((position) => (
                            <FormItem key={position.id} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={position.id} />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {position.name}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question 2: Secondary Positions */}
                <FormField
                  control={form.control}
                  name="secondaryPositions"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        2. Which other positions can you play?
                      </FormLabel>
                      <FormDescription>
                        Please select at least one different position you feel comfortable playing besides your main position.
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                        {positions.map((position) => (
                          <FormField
                            key={position.id}
                            control={form.control}
                            name="secondaryPositions"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={position.id}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(position.id)}
                                      onCheckedChange={(checked) => {
                                        // Don't allow selecting primary position as secondary position
                                        if (position.id === form.getValues("primaryPosition")) {
                                          return;
                                        }
                                      
                                        return checked
                                          ? field.onChange([
                                              ...field.value,
                                              position.id,
                                            ])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== position.id
                                              )
                                            );
                                      }}
                                      disabled={position.id === form.getValues("primaryPosition")}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {position.name}
                                    {position.id === form.getValues("primaryPosition") && 
                                      <span className="text-gray-400 ml-1">(Primary)</span>
                                    }
                                  </FormLabel>
                                </FormItem>
                              );
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question 3: Skill Rating */}
                <FormField
                  control={form.control}
                  name="skillRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        3. From 1 to 10, how would you rate your level in Volleyball?
                      </FormLabel>
                      <FormDescription>
                        Try to rate yourself based on the team's general level
                      </FormDescription>
                      <FormControl>
                        <div className="space-y-4">
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            defaultValue={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Beginner (1)</span>
                            <span>Intermediate (5)</span>
                            <span>Advanced (10)</span>
                          </div>
                          <div className="text-center font-semibold">
                            Your rating: {field.value}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question 4: Image Upload */}
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    4. Please upload a profile picture
                  </FormLabel>
                  <FormDescription>
                    This will help teammates recognize you
                  </FormDescription>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="border border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 file:bg-gray-200 file:text-gray-700 file:border-0 file:mr-2 file:py-2 file:px-4 cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="mt-4">
                        <p className="mb-2 text-sm">Preview:</p>
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-full"
                        />
                      </div>
                    )}
                  </div>
                </FormItem>

                {/* Question 5: Gender */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base font-medium">
                        5. How do you identify yourself?
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="male" />
                            </FormControl>
                            <FormLabel className="font-normal">Male</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="female" />
                            </FormControl>
                            <FormLabel className="font-normal">Female</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="diverse" />
                            </FormControl>
                            <FormLabel className="font-normal">Diverse</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Question 6: Birthday */}
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        6. When is your birthday?
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DD.MM.YYYY"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Submitting..." : "Complete Profile"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlayerOnboarding;
