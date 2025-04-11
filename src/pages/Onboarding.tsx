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
    CardHeader,
    CardTitle,
    CardFooter, // Added CardFooter import
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
import { Label } from "@/components/ui/label"; // Added import

interface OnboardingProps {
    onComplete: () => void;
}

type OnboardingFormData = {
    full_name: string;
    gender: string;
    date_of_birth?: Date;
    native_language: string;
    learning_language: string;
    proficiency_level: string;
    bio: string; // Changed from learning_goal
    avatar_url: string;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const form = useForm<OnboardingFormData>({
        defaultValues: {
            full_name: "",
            gender: "",
            native_language: "",
            learning_language: "",
            proficiency_level: "",
            bio: "", // Changed from learning_goal
            avatar_url: "",
            date_of_birth: undefined as Date | undefined,
        },
        async validate(values) {
            const errors: Record<string, string> = {};
            if (!values.full_name) errors.full_name = "Name is required";
            if (!values.gender) errors.gender = "Gender is required";
            return errors;
        }
    });

    const navigate = useNavigate();
    const { toast } = useToast();

    const calculateAge = (dob: Date): number => {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();

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
                return !!values.full_name && !!values.gender;
            case 2:
                return !!values.nativeLanguage && !!values.learningLanguage && !!values.proficiencyLevel;
            case 3:
                return !!values.bio; // Changed from learningGoal
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
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                toast({
                    variant: "destructive",
                    title: "Authentication error",
                    description: "You must be logged in to complete onboarding.",
                });
                navigate("/auth");
                return;
            }

            console.log("Authenticated User ID:", user.id);

            console.log("Attempting to upsert profile for user ID:", user.id);
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id, // Use id from auth.users as the key in profiles
                    user_id: user.id, // Also set the user_id column
                    gender: formData.gender,
                    date_of_birth: formData.date_of_birth instanceof Date ?
                        formData.date_of_birth.toISOString().split('T')[0] :
                        null,
                    native_language: formData.nativeLanguage,
                    learning_language: formData.learningLanguage,
                    proficiency_level: formData.proficiencyLevel,
                    bio: formData.bio, // Changed from learningGoal
                    avatar_url: formData.avatarUrl,
                    full_name: formData.full_name,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                console.error('Error updating profile data:', profileError);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to complete onboarding. Please try again.",
                });
                return;
            }

            // Complete onboarding in database
            const { error: onboardingError } = await supabase
                .from('profiles')
                .update({ onboarding_completed: true })
                .eq('id', user.id);

            if (onboardingError) {
                console.error('Error updating onboarding status:', onboardingError);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to complete onboarding. Please try again.",
                });
                return;
            }

            // Show success message
            toast({
                title: "Welcome!",
                description: "Your profile has been successfully set up.",
            });

            // Set loading state and navigate
            setIsLoading(true);
            localStorage.setItem("onboarding_completed", "true");
            onComplete();
            // Small delay to ensure UI updates before navigation
            setTimeout(() => {
              navigate("/dashboard", { replace: true });
            }, 100);
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

    const uploadAvatar = async (file: File) => {
        try {
            setIsLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not logged in");
            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            form.setValue("avatarUrl", publicUrl);

            toast({
                title: "Avatar uploaded",
                description: "Your profile picture has been updated.",
            });
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: "Could not upload profile picture. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary relative">
            {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                        <p className="text-muted-foreground">Completing setup...</p>
                    </div>
                </div>
            )}
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
                                        name="full_name"
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
                                                        <SelectItem value="Rather not say">Rather not say</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid gap-2">
                                        <FormField
                                            control={form.control}
                                            name="date_of_birth"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Date of Birth (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="date"
                                                            {...field}
                                                            className="col-span-3"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
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
                                                            ))}
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
                                        name="bio" // Changed from learningGoal
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Bio</FormLabel>  {/* Changed Label */}
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Tell us about yourself"
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
                                                        {form.getValues("full_name")?.charAt(0)?.toUpperCase() || "?"}
                                                    </span>
                                                )}
                                            </div>
                                            <Button
                                                size="icon"
                                                className="absolute bottom-0 right-0 rounded-full"
                                                onClick={() => document.getElementById('avatar')?.click()}
                                            >
                                                <Upload className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Input
                                            type="file"
                                            id="avatar"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    uploadAvatar(file);
                                                }
                                            }}
                                        />

                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Upload a profile picture (optional)
                                            </p>
                                            <Button
                                                variant="outline"
                                                className="button-hover"
                                                onClick={() => document.getElementById('avatar')?.click()}
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
                                                <p className="font-medium">{form.getValues("full_name")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Gender</p>
                                                <p className="font-medium">{form.getValues("gender")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Date of Birth</p>
                                                <p className="font-medium">
                                                    {form.getValues("date_of_birth") ? format(form.getValues("date_of_birth")!, "PPP") : "Not set"}
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
                                            <p className="text-muted-foreground">Bio</p> {/* Changed Label */}
                                            <p className="text-sm">{form.getValues("bio")}</p> {/* Changed field */}
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
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex items-center">
                                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                    Redirecting...
                                </div>
                            ) : (
                                <>
                                    {step < 4 ? "Next" : "Complete Profile"}
                                    {step === 4 && <Check className="ml-2 h-4 w-4" />}
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default Onboarding;