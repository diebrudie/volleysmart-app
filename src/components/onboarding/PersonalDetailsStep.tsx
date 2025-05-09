
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const PersonalDetailsStep = () => {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const gender = watch("gender") || "male";
  const birthday = watch("birthday");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Just a few more details</h2>
      <p className="text-sm text-gray-500">
        Help us personalize your experience
      </p>

      <div className="space-y-6">
        {/* Gender Selection */}
        <div className="space-y-3">
          <FormLabel>Gender</FormLabel>
          <RadioGroup
            value={gender}
            onValueChange={(value: "male" | "female" | "diverse") => setValue("gender", value, { shouldValidate: true })}
            className="flex flex-col space-y-1"
          >
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="male" />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer">Male</FormLabel>
            </FormItem>
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="female" />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer">Female</FormLabel>
            </FormItem>
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="diverse" />
              </FormControl>
              <FormLabel className="font-normal cursor-pointer">Diverse</FormLabel>
            </FormItem>
          </RadioGroup>
        </div>

        {/* Birthday */}
        <div className="space-y-2">
          <FormLabel>Birthday</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !birthday && "text-muted-foreground"
                )}
              >
                {birthday ? (
                  format(birthday, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={birthday}
                onSelect={(date) => setValue("birthday", date, { shouldValidate: true })}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsStep;
