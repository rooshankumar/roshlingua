
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface OnboardingProps {
  onComplete: () => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    dob: undefined as Date | undefined,
    nativeLanguage: "",
    learningLanguage: "",
    proficiencyLevel: "",
    learningGoal: "",
    avatarUrl: "",
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
  ];
  
  const proficiencyLevels = [
    "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)", 
    "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
  ];
  
  const handleChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value,
    });
  };
  
  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return !!formData.name && !!formData.gender && !!formData.dob;
      case 2:
        return !!formData.nativeLanguage && !!formData.learningLanguage && !!formData.proficiencyLevel;
      case 3:
        return !!formData.learningGoal;
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
  
  const handleSubmit = () => {
    // In a real app, this would be an API call to save the user profile
    console.log("Onboarding data:", formData);
    
    // Simulate saving the data
    setTimeout(() => {
      onComplete();
      navigate("/dashboard");
      
      toast({
        title: "Profile created",
        description: "Your profile has been successfully set up!",
      });
    }, 1000);
  };
  
  const uploadAvatar = () => {
    // In a real app, this would open a file picker and upload the image
    // For now, let's simulate uploading an avatar
    setTimeout(() => {
      handleChange("avatarUrl", "/placeholder.svg");
      
      toast({
        title: "Avatar uploaded",
        description: "Your profile picture has been updated.",
      });
    }, 1000);
  };
  
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
            {step === 1 && (
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                    />
                  </FormControl>
                </FormItem>
                
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange("gender", value)}
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
                
                <FormItem>
                  <FormLabel>Date of Birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.dob && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.dob ? (
                            format(formData.dob, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.dob}
                        onSelect={(date) => handleChange("dob", date)}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    We use this to calculate your age.
                  </FormDescription>
                </FormItem>
              </div>
            )}
            
            {step === 2 && (
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Native Language</FormLabel>
                  <Select 
                    value={formData.nativeLanguage}
                    onValueChange={(value) => handleChange("nativeLanguage", value)}
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
                
                <FormItem>
                  <FormLabel>Language You Want to Learn</FormLabel>
                  <Select 
                    value={formData.learningLanguage}
                    onValueChange={(value) => handleChange("learningLanguage", value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a language to learn" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languages
                        .filter((lang) => lang !== formData.nativeLanguage)
                        .map((language) => (
                          <SelectItem key={language} value={language}>
                            {language}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </FormItem>
                
                <FormItem>
                  <FormLabel>Proficiency Level</FormLabel>
                  <Select 
                    value={formData.proficiencyLevel}
                    onValueChange={(value) => handleChange("proficiencyLevel", value)}
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
              </div>
            )}
            
            {step === 3 && (
              <div className="space-y-4">
                <FormItem>
                  <FormLabel>Learning Goal</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What do you want to achieve with this language? (e.g., travel, work, cultural interest)"
                      className="min-h-[120px]"
                      value={formData.learningGoal}
                      onChange={(e) => handleChange("learningGoal", e.target.value)}
                    />
                  </FormControl>
                  <FormDescription>
                    This helps us match you with suitable language partners.
                  </FormDescription>
                </FormItem>
              </div>
            )}
            
            {step === 4 && (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                      {formData.avatarUrl ? (
                        <img 
                          src={formData.avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-semibold text-muted-foreground">
                          {formData.name?.charAt(0)?.toUpperCase() || "?"}
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
                      <p className="font-medium">{formData.name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium">{formData.gender}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">
                        {formData.dob ? format(formData.dob, "PPP") : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Native Language</p>
                      <p className="font-medium">{formData.nativeLanguage}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Learning</p>
                      <p className="font-medium">{formData.learningLanguage}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Level</p>
                      <p className="font-medium">{formData.proficiencyLevel}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Learning Goal</p>
                    <p className="text-sm">{formData.learningGoal}</p>
                  </div>
                </div>
              </div>
            )}
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
