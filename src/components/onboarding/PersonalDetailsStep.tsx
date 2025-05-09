
import { useFormContext } from "react-hook-form";
import { format, parse, isValid, differenceInYears } from "date-fns";
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
import { Input } from "@/components/ui/input";
import { useState } from "react";

const PersonalDetailsStep = () => {
  const { setValue, watch, formState: { errors } } = useFormContext();
  const [inputDateStr, setInputDateStr] = useState<string>("");
  const [dateError, setDateError] = useState<string | null>(null);
  
  const gender = watch("gender") || "male";
  const birthday = watch("birthday");
  
  // Function to validate the date is at least 18 years ago
  const validateAge = (date: Date): boolean => {
    const ageDiff = differenceInYears(new Date(), date);
    return ageDiff >= 18;
  };

  // Handle date input change
  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setInputDateStr(dateStr);
    
    // Try to parse the date in DD.MM.YYYY format
    if (dateStr.length === 10) {
      try {
        const parsedDate = parse(dateStr, "dd.MM.yyyy", new Date());
        
        if (isValid(parsedDate)) {
          // Check if user is at least 18 years old
          if (!validateAge(parsedDate)) {
            setDateError("You must be at least 18 years old");
            return;
          }
          
          setDateError(null);
          setValue("birthday", parsedDate, { shouldValidate: true });
        } else {
          setDateError("Please enter a valid date in DD.MM.YYYY format");
        }
      } catch (error) {
        setDateError("Please enter a valid date in DD.MM.YYYY format");
      }
    }
  };

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
          <FormLabel>Birthday (must be 18+)</FormLabel>
          <div className="flex gap-2">
            <div className="relative grow">
              <Input 
                placeholder="DD.MM.YYYY"
                value={inputDateStr}
                onChange={handleDateInputChange}
                className={dateError ? "border-red-500" : ""}
              />
              {dateError && (
                <p className="text-xs text-red-500 mt-1">{dateError}</p>
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("px-3")}
                >
                  <CalendarIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={birthday}
                  onSelect={(date) => {
                    if (date) {
                      // Check if user is at least 18 years old
                      if (!validateAge(date)) {
                        setDateError("You must be at least 18 years old");
                        return;
                      }
                      
                      setValue("birthday", date, { shouldValidate: true });
                      setInputDateStr(format(date, "dd.MM.yyyy"));
                      setDateError(null);
                    }
                  }}
                  disabled={(date) => {
                    // Disable dates less than 18 years ago or before 1900
                    const eighteenYearsAgo = new Date();
                    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
                    return date > eighteenYearsAgo || date < new Date("1900-01-01");
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetailsStep;
