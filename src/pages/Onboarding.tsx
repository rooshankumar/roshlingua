import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface OnboardingProps {
  onComplete: () => void;
}

type OnboardingFormData = {
  name: string;
  gender: string;
  dob?: Date;
  nativeLanguage: string;
  learningLanguage: string;
  proficiencyLevel: string;
  learningGoal: string;
  avatarUrl: string;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<OnboardingFormData>({
    defaultValues: {
      name: "",
      gender: "",
      nativeLanguage: "",
      learningLanguage: "",
      proficiencyLevel: "",
      learningGoal: "",
      avatarUrl: "",
    },
    // Basic validation to ensure required fields are filled
    // Alternatively, you could use zod or another schema validator
    async validate(values) {
      const errors: Record<string, string> = {};
      if (!values.name) errors.name = "Name is required";
      if (!values.gender) errors.gender = "Gender is required";
      if (!values.dob) errors.dob = "Date of birth is required";
      return errors;
    }
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to calculate age from DOB
  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDifference = today.getMonth() - dob.getMonth();

    // Adjust age if birthday hasn't occurred yet this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age;
  };

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
  ];

  const proficiencyLevels = [
    "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)", 
    "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
  ];

  const isStepValid = (step: number) => {
    const values = form.getValues();
    switch (step) {
      case 1:
        return !!values.name && !!values.gender && !!values.dob;
      case 2:
        return !!values.nativeLanguage && !!values.learningLanguage && !!values.proficiencyLevel;
      case 3:
        if (!values.learningGoal) return false;
        return (async () => {
          // Calculate age from DOB
          const age = values.dob ? calculateAge(values.dob) : null;

          // Update user profile with calculated age
          const { error: userError } = await supabase
            .from('users')
            .update({ 
              age: age,
              updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (userError) {
            console.error('Error updating user age:', userError);
            return false;
          }

          const { error: onboardingError } = await supabase
            .from('onboarding_status')
            .upsert({
              user_id: userId,
              is_complete: true,
              current_step: 'completed',
              updated_at: new Date().toISOString()
            });

          if (onboardingError) {
            console.error("Error updating onboarding status:", onboardingError);
            toast({
              variant: "destructive",
              title: "Error updating onboarding status",
              description: "Please try again.",
            });
            return false;
          }
          return true;
        })();
      default:
        return true;
    }
  };

  const handleNextStep = () => {
    if (isStepValid(step)) {
      if (step < 4) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    } else {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const formData = form.getValues();
      console.log("Submitting onboarding data:", formData);

      // Get the current user
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.user) {
        toast({
          variant: "destructive",
          title: "Authentication error",
          description: "You must be logged in to complete onboarding.",
        });
        navigate("/auth");
        return;
      }

      const userId = session.user.id;

      // First refresh the auth token to ensure we have a valid session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error refreshing session:", sessionError);
        toast({
          title: "Authentication Error",
          description: "Could not refresh session. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      if (!sessionData?.session) {
        console.error("No active session. Please log in again.");
        toast({
          title: "Authentication Error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        return;
      }


      // Update user profile using RPC  - ATTEMPTED FIX, MAY REQUIRE DATABASE/RPC FUNCTION CHANGES
      const { data, error: userError } = await supabase.rpc('update_user_profile', {
        user_id: userId,
        full_name: formData.name,
        gender: formData.gender,
        date_of_birth: formData.dob ? new Date(formData.dob).toISOString() : null,
        native_language: formData.nativeLanguage,
        learning_language: formData.learningLanguage,
        proficiency_level: formData.proficiencyLevel,
        bio: formData.learningGoal,
        avatar_url: formData.avatarUrl || null,
        onboarding_completed: true
      });

      if (userError) {
        console.error('Error updating profile:', userError);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (userError) {
        console.error("Error updating user data:", userError);
        toast({
          variant: "destructive",
          title: "Error updating profile",
          description: userError.message || "Failed to update your profile information.",
        });
        return;
      }

      if (!userError) {
        toast({
          title: "Profile created",
          description: "Your profile has been successfully set up!",
        });
      }

      // Check if profile exists, create if it doesn't
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error("Error checking profile:", profileCheckError);
      }

      if (!profileData) {
        // Create profile if it doesn't exist
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: formData.name.toLowerCase().replace(/\s+/g, '_'),
            bio: formData.learningGoal
          });

        if (profileCreateError) {
          console.error("Error creating profile:", profileCreateError);
          // Continue anyway, don't block the user
        }
      } else {
        // Update profile
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            username: formData.name.toLowerCase().replace(/\s+/g, '_'),
            bio: formData.learningGoal,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (profileUpdateError) {
          console.error("Error updating profile:", profileUpdateError);
          // Continue anyway, don't block the user
        }
      }


      // Update local storage for immediate effect
      localStorage.setItem("onboarding_completed", "true");

      // Call onComplete prop
      onComplete();

      // Force reload to trigger ProtectedRoute check
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        variant: "destructive",
        title: "Error completing onboarding",
        description: "There was an error setting up your profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadAvatar = () => {
    // In a real app, this would open a file picker and upload the image
    // For now, let's simulate uploading an avatar
    setTimeout(() => {
      form.setValue("avatarUrl", "/placeholder.svg");

      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      });
    }, 1000);
  };

  let userId = null;
  if (form.getValues().name){
    userId = "replace with user id logic"
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary">
      <div className="w-full max-w-md">
        <Card className="shadow-lg animate-fade-in">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Complete Your Profile</CardTitle>
                <CardDescription>
                  Step {step} of 4
                </CardDescription>
              </div>
              <div className="flex">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={cn(
                      "w-2.5 h-2.5 rounded-full mx-1",
                      s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Your full name"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dob"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
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
                        <FormDescription>
                          Required. We use this to calculate your age for profile display.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nativeLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Native Language</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your native language" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages.map((language) => (
                              <SelectItem key={language} value={language}>
                                {language}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="learningLanguage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Language You Want to Learn</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a language to learn" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {languages
                              .filter((lang) => lang !== form.getValues("nativeLanguage"))
                              .map((language) => (
                                <SelectItem key={language} value={language}>
                                  {language}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="proficiencyLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proficiency Level</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your proficiency level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {proficiencyLevels.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select your current level of proficiency in your target language.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="learningGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Goal</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What do you want to achieve with this language? (e.g., travel, work, cultural interest)"
                            className="min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This helps us match you with suitable language partners.
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                        {form.getValues("avatarUrl") ? (
                          <img 
                            src={form.getValues("avatarUrl")} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-semibold text-muted-foreground">
                            {form.getValues("name")?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                      <Button 
                        size="icon" 
                        className="absolute bottom-0 right-0 rounded-full"
                        onClick={uploadAvatar}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Upload a profile picture (optional)
                      </p>
                      <Button 
                        variant="outline" 
                        className="button-hover"
                        onClick={uploadAvatar}
                      >
                        Upload Avatar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="font-medium">Review Your Information</h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">{form.getValues("name")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gender</p>
                        <p className="font-medium">{form.getValues("gender")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {form.getValues("dob") ? format(form.getValues("dob")!, "PPP") : "Not set"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Native Language</p>
                        <p className="font-medium">{form.getValues("nativeLanguage")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Learning</p>
                        <p className="font-medium">{form.getValues("learningLanguage")}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Level</p>
                        <p className="font-medium">{form.getValues("proficiencyLevel")}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Learning Goal</p>
                      <p className="text-sm">{form.getValues("learningGoal")}</p>
                    </div>
                  </div>
                </div>
              )}
            </Form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevStep}
              disabled={step === 1}
              className="button-hover"
            >
              Back
            </Button>
            <Button 
              onClick={handleNextStep}
              className="button-hover"
            >
              {step < 4 ? "Next" : "Complete Profile"}
              {step === 4 && <Check className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;