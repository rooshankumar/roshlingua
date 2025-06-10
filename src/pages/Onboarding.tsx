import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Upload, Search, ChevronsUpDown } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/utils/languageUtils";
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
import RoshLinguaLogo from "@/components/RoshLinguaLogo";

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
    country: string;
    avatar_url: string;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [nativeLanguageOpen, setNativeLanguageOpen] = useState(false);
    const [learningLanguageOpen, setLearningLanguageOpen] = useState(false);
    const [nativeLanguageSearch, setNativeLanguageSearch] = useState("");
    const [learningLanguageSearch, setLearningLanguageSearch] = useState("");
    const comboboxRef = useRef<HTMLDivElement>(null);
    const nativeLanguageRef = useRef<HTMLDivElement>(null);
    const learningLanguageRef = useRef<HTMLDivElement>(null);


    // Close the dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
                setNativeLanguageOpen(false);
                setLearningLanguageOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;
            if (nativeLanguageRef.current && !nativeLanguageRef.current.contains(target)) {
                setNativeLanguageOpen(false);
            }
            if (learningLanguageRef.current && !learningLanguageRef.current.contains(target)) {
                setLearningLanguageOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [nativeLanguageRef, learningLanguageRef]);
    // Define schema for form validation
    const formSchema = z.object({
        full_name: z.string().min(1, "Name is required"),
        gender: z.string().min(1, "Gender is required"),
        native_language: z.string().min(1, "Native language is required"),
        learning_language: z.string().min(1, "Learning language is required"),
        proficiency_level: z.string().min(1, "Proficiency level is required"),
        country: z.string().min(1, "Country is required"),
        bio: z.string().optional(),
        avatar_url: z.string().optional(),
        date_of_birth: z.date().optional()
    });

    const form = useForm<OnboardingFormData>({
        defaultValues: {
            full_name: "",
            gender: "",
            native_language: "",
            learning_language: "",
            proficiency_level: "",
            bio: "", // Changed from learning_goal
            country: "",
            avatar_url: "",
            date_of_birth: undefined as Date | undefined,
        },
        resolver: zodResolver(formSchema)
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

    // Import language options from utils
    const languageOptions = SUPPORTED_LANGUAGES.map(lang => ({
        value: lang.name,
        label: `${lang.flag} ${lang.name}`,
        code: lang.code
    }));

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
                return !!values.native_language && !!values.learning_language && !!values.proficiency_level;
            case 3:
                return !!values.country; // Country is required, bio is optional
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
                setIsLoading(false);
                toast({
                    variant: "destructive",
                    title: "Authentication error",
                    description: "You must be logged in to complete onboarding.",
                });
                navigate("/auth");
                return;
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    user_id: user.id, // Add user_id field with user's ID
                    email: user.email,
                    gender: formData.gender,
                    date_of_birth: formData.date_of_birth ? new Date(formData.date_of_birth).toISOString().split('T')[0] : null,
                    native_language: formData.native_language,
                    learning_language: formData.learning_language,
                    proficiency_level: formData.proficiency_level,
                    country: formData.country,
                    bio: formData.bio,
                    avatar_url: formData.avatar_url,
                    full_name: formData.full_name,
                    onboarding_completed: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (profileError) {
                setIsLoading(false);
                console.error('Error updating profile data:', profileError);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to complete onboarding. Please try again.",
                });
                return;
            }

            toast({
                title: "Welcome!",
                description: "Your profile has been successfully set up.",
            });

            localStorage.setItem("onboarding_completed", "true");

            // Call onComplete first, then navigate
            onComplete();

            // Navigate after a short delay to ensure state updates
            setTimeout(() => {
                navigate("/dashboard", { replace: true });
            }, 300);
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
            
            // Validate file type
            if (!file.type.startsWith('image/')) {
                throw new Error("Please select an image file.");
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error("File size must be less than 5MB.");
            }

            const { uploadAvatar } = await import('@/services/avatarService');
            const result = await uploadAvatar(file, user.id);

            form.setValue("avatar_url", result.publicUrl);

            toast({
                title: "Avatar uploaded",
                description: "Your profile picture has been updated.",
            });
        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: error.message || "Could not upload profile picture. Please try again.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-secondary relative">
            <RoshLinguaLogo size="lg" className="mb-8" />
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
                                                    <FormLabel>Date of Birth</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="date"
                                                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                                            onChange={(e) => {
                                                                field.onChange(e.target.value ? new Date(e.target.value) : undefined);
                                                            }}
                                                            onBlur={field.onBlur}
                                                            name={field.name}
                                                            ref={field.ref}
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
                                        name="native_language"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Native Language</FormLabel>
                                                <div className="relative" ref={nativeLanguageRef}>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                placeholder="Search or select your native language"
                                                                className="w-full pr-10"
                                                                value={field.value}
                                                                onChange={(e) => {
                                                                    const searchTerm = e.target.value;
                                                                    field.onChange(searchTerm);
                                                                    setNativeLanguageSearch(searchTerm.toLowerCase());
                                                                    setNativeLanguageOpen(true);
                                                                }}
                                                                onClick={() => setNativeLanguageOpen(true)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        field.onChange(field.value);
                                                                        setNativeLanguageOpen(false);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="absolute right-0 top-0 h-full aspect-square p-0"
                                                                onClick={() => setNativeLanguageOpen(!nativeLanguageOpen)}
                                                            >
                                                                <ChevronsUpDown className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    {nativeLanguageOpen && (
                                                        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                                                            <div className="sticky top-0 bg-popover p-1">
                                                                <div className="flex items-center border rounded-sm px-2">
                                                                    <Search className="h-4 w-4 mr-2 opacity-50" />
                                                                    <Input
                                                                        placeholder="Search language..."
                                                                        className="border-0 focus-visible:ring-0 h-8"
                                                                        value={nativeLanguageSearch}
                                                                        onChange={(e) => setNativeLanguageSearch(e.target.value.toLowerCase())}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="mt-1">
                                                                {languageOptions
                                                                    .filter((lang) => 
                                                                        lang.label.toLowerCase().includes(nativeLanguageSearch) || 
                                                                        lang.value.toLowerCase().includes(nativeLanguageSearch)
                                                                    )
                                                                    .map((lang) => (
                                                                        <div
                                                                            key={lang.code}
                                                                            className={`flex items-center px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent ${
                                                                                field.value === lang.value ? "bg-accent" : ""
                                                                            }`}
                                                                            onClick={() => {
                                                                                field.onChange(lang.value);
                                                                                setNativeLanguageOpen(false);
                                                                            }}
                                                                        >
                                                                            <span className="mr-2">{lang.label.split(" ")[0]}</span>
                                                                            <span>{lang.value}</span>
                                                                            {field.value === lang.value && (
                                                                                <Check className="ml-auto h-4 w-4" />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                {languageOptions.filter((lang) => 
                                                                    lang.label.toLowerCase().includes(nativeLanguageSearch) || 
                                                                    lang.value.toLowerCase().includes(nativeLanguageSearch)
                                                                ).length === 0 && (
                                                                    <div 
                                                                        className="flex items-center justify-between px-2 py-2 cursor-pointer rounded-sm hover:bg-accent"
                                                                        onClick={() => {
                                                                            field.onChange(nativeLanguageSearch);
                                                                            setNativeLanguageOpen(false);
                                                                        }}
                                                                    >
                                                                        <span>Use "{nativeLanguageSearch}"</span>
                                                                        <Check className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <FormDescription>
                                                    You can select a language or type a custom one
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="learning_language"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel>Language You Want to Learn</FormLabel>
                                                <div className="relative" ref={comboboxRef}>
                                                    <FormControl>
                                                        <div className="relative">
                                                            <Input
                                                                placeholder="Search or select a language to learn"
                                                                className="w-full pr-10"
                                                                value={field.value}
                                                                onChange={(e) => {
                                                                    field.onChange(e.target.value);
                                                                    const searchTerm = e.target.value.toLowerCase();
                                                                    setLearningLanguageSearch(searchTerm);
                                                                }}
                                                                onClick={() => setLearningLanguageOpen(true)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        field.onChange(field.value);
                                                                        setLearningLanguageOpen(false);
                                                                    }
                                                                }}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="absolute right-0 top-0 h-full aspect-square p-0"
                                                                onClick={() => setLearningLanguageOpen(!learningLanguageOpen)}
                                                            >
                                                                <ChevronsUpDown className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    {learningLanguageOpen && (
                                                        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                                                            <div className="sticky top-0 bg-popover p-1">
                                                                <div className="flex items-center border rounded-sm px-2">
                                                                    <Search className="h-4 w-4 mr-2 opacity-50" />
                                                                    <Input
                                                                        placeholder="Search language..."
                                                                        className="border-0 focus-visible:ring-0 h-8"
                                                                        value={learningLanguageSearch}
                                                                        onChange={(e) => setLearningLanguageSearch(e.target.value.toLowerCase())}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="mt-1">
                                                                {languageOptions
                                                                    .filter((lang) => 
                                                                        lang.value !== form.getValues("native_language") &&
                                                                        (lang.label.toLowerCase().includes(learningLanguageSearch) || 
                                                                        lang.value.toLowerCase().includes(learningLanguageSearch))
                                                                    )
                                                                    .map((lang) => (
                                                                        <div
                                                                            key={lang.code}
                                                                            className={`flex items-center px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent ${
                                                                                field.value === lang.value ? "bg-accent" : ""
                                                                            }`}
                                                                            onClick={() => {
                                                                                field.onChange(lang.value);
                                                                                setLearningLanguageOpen(false);
                                                                            }}
                                                                        >
                                                                            <span className="mr-2">{lang.label.split(" ")[0]}</span>
                                                                            <span>{lang.value}</span>
                                                                            {field.value === lang.value && (
                                                                                <Check className="ml-auto h-4 w-4" />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                {languageOptions.filter((lang) => 
                                                                    lang.value !== form.getValues("native_language") &&
                                                                    (lang.label.toLowerCase().includes(learningLanguageSearch) || 
                                                                    lang.value.toLowerCase().includes(learningLanguageSearch))
                                                                ).length === 0 && (
                                                                    <div 
                                                                        className="flex items-center justify-between px-2 py-2 cursor-pointer rounded-sm hover:bg-accent"
                                                                        onClick={() => {
                                                                            field.onChange(learningLanguageSearch);
                                                                            setLearningLanguageOpen(false);
                                                                        }}
                                                                    >
                                                                        <span>Use "{learningLanguageSearch}"</span>
                                                                        <Check className="h-4 w-4" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <FormDescription>
                                                    You can select a language or type a custom one
                                                </FormDescription>
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="proficiency_level"
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
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your country"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Your country of residence
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

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
                                                {form.getValues("avatar_url") ? (
                                                    <img
                                                        src={form.getValues("avatar_url")}
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
                                                <p className="font-medium">{form.getValues("native_language")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Learning</p>
                                                <p className="font-medium">{form.getValues("learning_language")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Level</p>
                                                <p className="font-medium">{form.getValues("proficiency_level")}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted-foreground">Country</p>
                                                <p className="font-medium">{form.getValues("country")}</p>
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