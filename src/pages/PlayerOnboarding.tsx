
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the schema for the form
const formSchema = z.object({
  positions: z.array(z.string()).min(1, "Select at least one position"),
  skillRating: z.number().min(1).max(10),
  imageUrl: z.string().optional(),
  gender: z.enum(["male", "female", "diverse"]),
  birthday: z.date().optional(),
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
      positions: [],
      skillRating: 5,
      imageUrl: "",
      gender: "male",
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
      // This is a placeholder for now
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
      // Create player profile
      await createPlayer(user.id, {
        first_name: user.name.split(' ')[0] || '',
        last_name: user.name.split(' ').slice(1).join(' ') || '',
        bio: "",
        image_url: data.imageUrl,
        skill_rating: data.skillRating,
        positions: data.positions,
        member_association: true,
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
                {/* Positions Selection */}
                <FormField
                  control={form.control}
                  name="positions"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">
                        Which positions do you play? (Select one or many)
                      </FormLabel>
                      <FormDescription>
                        Choose all positions you're comfortable playing
                      </FormDescription>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                        {positions.map((position) => (
                          <FormField
                            key={position.id}
                            control={form.control}
                            name="positions"
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
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">
                                    {position.name}
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

                {/* Skill Rating */}
                <FormField
                  control={form.control}
                  name="skillRating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        From 1 to 10, how would you rate your level in Volleyball?
                      </FormLabel>
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

                {/* Image Upload */}
                <FormItem>
                  <FormLabel>
                    Upload a picture for others to know who you are (optional)
                  </FormLabel>
                  <FormDescription>
                    This will help teammates recognize you
                  </FormDescription>
                  <div className="mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
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

                {/* Gender */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Gender</FormLabel>
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

                {/* Birthday */}
                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Birthday</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
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
