import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { uploadAvatar, deleteAvatar, getUserAvatar } from "@/services/avatarService";
import { useTheme } from "@/components/theme-provider";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { useRealtimeProfile } from "@/hooks/useRealtimeProfile";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Shield, Bell, Key, User, Lock, Mail, Save, LogOut, Moon, Sun, Globe, Wallet, Camera, AlertTriangle } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useResponsive } from "@/hooks/use-mobile";
import { SUPPORTED_LANGUAGES, getLanguageOptions } from "@/utils/languageUtils";
import { Search, ChevronsUpDown, Check } from "lucide-react";
import RoshLinguaLogo from "@/components/RoshLinguaLogo";


const Settings = () => {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, updateProfile } = useRealtimeProfile(user?.id);
  const navigate = useNavigate();
  const [localBio, setLocalBio] = useState(profile?.bio || "");
  const [localProfile, setLocalProfile] = useState<any>(profile || {});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [nativeLanguageInput, setNativeLanguageInput] = useState("");
  const [learningLanguageInput, setLearningLanguageInput] = useState("");
  const [showNativeLanguages, setShowNativeLanguages] = useState(false);
  const [showLearningLanguages, setShowLearningLanguages] = useState(false);
  const [nativeLanguageSearch, setNativeLanguageSearch] = useState("");
  const [learningLanguageSearch, setLearningLanguageSearch] = useState("");
  const nativeLanguageRef = useRef<HTMLDivElement>(null);
  const learningLanguageRef = useRef<HTMLDivElement>(null);
  const [languageOptions, setLanguageOptions] = useState<any[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  // Initialize language options safely
  useEffect(() => {
    try {
      const options = getLanguageOptions();
      console.log('Language options loaded:', options?.length || 0);
      setLanguageOptions(options || []);
    } catch (error) {
      console.error('Error loading language options:', error);
      setLanguageOptions([]);
    }
  }, []);

  const languages = [
    "English", "Spanish", "French", "German", "Italian",
    "Portuguese", "Chinese", "Japanese", "Korean", "Russian",
    "Arabic", "Hindi", "Turkish", "Dutch", "Swedish"
  ];

  const proficiencyLevels = [
    "Beginner (A1)", "Elementary (A2)", "Intermediate (B1)",
    "Upper Intermediate (B2)", "Advanced (C1)", "Proficient (C2)"
  ];

  const genders = ["Male", "Female", "Rather not say"];

  const handleProfileChange = (field: string, value: string) => {
    setLocalProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      if (!currentUser?.id) {
        throw new Error("User ID not found");
      }

      // Get current profile for the email
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', currentUser.id)
        .single();

      if (profileError) throw profileError;

      if (localProfile.email !== currentProfile.email && localProfile.email) {
        const { error: updateEmailError } = await supabase.auth.updateUser({
          email: localProfile.email
        });
        if (updateEmailError) throw updateEmailError;
      }

      // Language preferences are optional; warn but do not block save
      if (!localProfile.learning_language || !localProfile.native_language || !localProfile.proficiency_level) {
        toast({
          title: "Missing language preferences",
          description: "You can set your native, learning language and level later.",
        });
      }

      if (!currentUser?.id) {
        throw new Error("User ID not found");
      }

      const profileData = {
        id: currentUser.id,
        avatar_url: localProfile.avatar_url || null,
        bio: localBio || '',
        full_name: localProfile.full_name || '',
        gender: localProfile.gender?.toLowerCase() || 'rather not say',
        date_of_birth: localProfile.date_of_birth || null,
        country: localProfile.country || '',
        learning_language: localProfile.learning_language,
        native_language: localProfile.native_language,
        proficiency_level: localProfile.proficiency_level,
        streak_count: localProfile.streak_count || 0,
        email: currentUser.email,
        updated_at: new Date().toISOString()
      };

      // Single upsert operation
      const { error: secondProfileError } = await supabase
        .from('profiles')
        .upsert({
          ...profileData,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (secondProfileError) {
        throw secondProfileError;
      }

      // No RPC needed; realtime will broadcast the upserted change

      // Then update local state and show success
      if (updateProfile) {
        updateProfile(profileData);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      // Ensure date is properly formatted
      const formattedProfile = {
        ...profile,
        date_of_birth: profile.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : ''
      };
      setLocalProfile(formattedProfile);
      setLocalBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    const fetchBio = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('bio')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setLocalBio(data.bio || '');
      }
    };

    fetchBio();
  }, [user]);

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user?.id) return;

    try {
      setIsLoading(true);
      console.log('Starting avatar upload...');

      if (profile?.avatar_url) {
        await deleteAvatar(user.id, profile.avatar_url);
      }

      const { publicUrl } = await uploadAvatar(e.target.files[0], user.id);

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Update profile in database first
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Then update local state
      if (updateProfile) {
        await updateProfile({ ...profile, avatar_url: publicUrl });
      }
      setLocalProfile(prev => ({...prev, avatar_url: publicUrl}));

      // Force a refresh of the profile data
      await loadUserProfile();

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const [privacySettings, setPrivacySettings] = useState({
    showOnlineStatus: true,
    showLastActive: true,
    allowMessages: true,
    showProfileInSearch: true,
  });

  const handlePrivacyChange = (field: string, value: boolean) => {
    setPrivacySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePrivacy = () => {
    toast({
      title: "Privacy settings updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  const [notificationSettings, setNotificationSettings] = useState({
    newMessages: true,
    profileViews: true,
    learningReminders: true,
    streakReminders: true,
    marketingEmails: false,
  });

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notification settings updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleChangePassword = () => {
    toast({
      title: "Password change requested",
      description: "We've sent a password reset link to your email.",
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const genderOptions = ["Male", "Female", "Rather not say"];
  const formattedDate = localProfile?.date_of_birth ? new Date(localProfile.date_of_birth).toISOString().split('T')[0] : null;

  const handleNativeLanguageChange = (language: string) => {
    if (!language) {
      console.warn('Attempted to set empty native language');
      return;
    }
    setNativeLanguageInput(language);
    handleProfileChange("native_language", language);
    setShowNativeLanguages(false);
    setNativeLanguageSearch("");
  };

  const handleLearningLanguageChange = (language: string) => {
    if (!language) {
      console.warn('Attempted to set empty learning language');
      return;
    }
    setLearningLanguageInput(language);
    handleProfileChange("learning_language", language);
    setShowLearningLanguages(false);
    setLearningLanguageSearch("");
  };

  const loadUserProfile = async () => {
    //Implementation to fetch and update profile data.  Replace with your actual logic.
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if(data){
        const formattedProfile = {
          ...data,
          date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : ''
        };
        setLocalProfile(formattedProfile);
        setLocalBio(data.bio || "");
      }

    } catch (error) {
      console.error("Error loading user profile:", error);
      toast({ title: "Error", description: "Failed to load profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    setAvatarUrl(url);
    await updateProfile({ avatar_url: url });

    // Refresh avatar from storage to ensure we have the latest
    if (user?.id) {
      try {
        const latestAvatar = await getUserAvatar(user.id);
        if (latestAvatar) {
          setAvatarUrl(latestAvatar);
        }
      } catch (error) {
        console.warn('Failed to refresh avatar:', error);
      }
    }
  };


  useEffect(() => {
    loadUserProfile();
  }, []);

  // Set initial input values when profile loads
  useEffect(() => {
    if (localProfile) {
      setNativeLanguageInput(localProfile.native_language || "");
      setLearningLanguageInput(localProfile.learning_language || "");
    }
  }, [localProfile]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nativeLanguageRef.current && !nativeLanguageRef.current.contains(event.target as Node)) {
        setShowNativeLanguages(false);
      }
      if (learningLanguageRef.current && !learningLanguageRef.current.contains(event.target as Node)) {
        setShowLearningLanguages(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <div className="mobile-container max-w-6xl pb-12 animate-fade-in">
      <div className="space-y-2 mb-8 hidden md:block">
        <div className="flex items-center gap-3 mb-2">
          <RoshLinguaLogo size="md" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('settings.title')}
        </h1>
        <p className="text-muted-foreground text-lg">
          {t('settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-8">
        <TabsList className="grid w-full grid-cols-4 h-12 items-stretch gap-2 sm:gap-4 bg-transparent p-1">
          {[
            { id: "profile", icon: User, label: "Profile" },
            { id: "privacy", icon: Shield, label: "Privacy" },
            { id: "notifications", icon: Bell, label: "Notifications" },
            { id: "account", icon: Key, label: "Account" }
          ].map(tab => {
            // Use the responsive hook for dynamic sizing
            const { deviceSize } = useResponsive();
            const iconSize = deviceSize === 'xs' ? 16 : deviceSize === 'sm' ? 18 : 20;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all touch-target"
              >
                <tab.icon size={iconSize} />
                <span className="hidden sm:inline text-sm md:text-base">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-0 sm:border-2 shadow-lg sm:rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Profile Information</CardTitle>
              <CardDescription className="text-base">
                Update your personal information and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-32 w-32 ring-4 ring-primary/10">
                      <AvatarImage 
                        src={localProfile?.avatar_url || profile?.avatar_url} 
                        alt={localProfile?.full_name || profile?.full_name}
                        onError={(e) => {
                          console.log('Avatar failed to load, using fallback');
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback className="text-2xl">
                        {(localProfile?.full_name || profile?.full_name)?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                      onClick={() => document.getElementById('avatar')?.click()}
                      disabled={isLoading}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    type="file"
                    id="avatar"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadAvatar}
                    disabled={isLoading}
                  />
                </div>

                <div className="flex-1 space-y-6">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-base">Full Name</Label>
                      <Input
                        id="name"
                        value={localProfile?.full_name || ""}
                        onChange={(e) => handleProfileChange("full_name", e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-base">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="h-12 bg-muted/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-base">Gender</Label>
                      <Select
                        value={localProfile?.gender || ""}
                        onValueChange={(value) => handleProfileChange("gender", value)}
                      >
                        <SelectTrigger id="gender" className="h-12">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="Rather not say">Rather not say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth" className="text-base">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={localProfile?.date_of_birth ? new Date(localProfile.date_of_birth).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          handleProfileChange("date_of_birth", date?.toISOString().split('T')[0] || '');
                        }}
                        className="h-12"
                        placeholder="DD-MM-YYYY"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-base">Country of Residence</Label>
                      <Input
                        id="country"
                        type="text"
                        value={localProfile?.country || ""}
                        onChange={(e) => handleProfileChange("country", e.target.value)}
                        className="h-12"
                        placeholder="Enter your country of residence"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio" className="text-base">Bio</Label>
                      <Textarea
                        id="bio"
                        value={localBio}
                        onChange={(e) => setLocalBio(e.target.value)}
                        className="min-h-[120px] resize-none"
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-8" />

              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Language Settings</h3>
                <div className="grid gap-6 sm:grid-cols-2">

                  <div className="relative space-y-2">
                    <Label htmlFor="nativeLanguage" className="text-base">Native Language</Label>
                    <div className="relative" ref={nativeLanguageRef}>
                      <Input
                        id="nativeLanguage"
                        type="text"
                        value={nativeLanguageInput}
                        onChange={(e) => {
                          setNativeLanguageInput(e.target.value);
                          setNativeLanguageSearch(e.target.value);
                        }}
                        placeholder="Select or type your native language"
                        className="h-12"
                        onKeyDown={(e) => {
                          if(e.key === 'Enter' && nativeLanguageInput){
                            handleNativeLanguageChange(nativeLanguageInput)
                          }
                        }}
                      />
                      {showNativeLanguages && (
                        <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-gray-200 rounded-md shadow-md z-10 max-h-60 overflow-y-auto">
                          {Array.isArray(languageOptions) && languageOptions.length > 0 ? (
                            languageOptions
                              .filter((lang) => {
                                if (!lang) return false;
                                if (!nativeLanguageSearch) return true;

                                const search = nativeLanguageSearch.toLowerCase();
                                const name = lang.value ? lang.value.toLowerCase() : '';
                                const label = lang.label ? lang.label.toLowerCase() : '';
                                const code = lang.code ? lang.code.toLowerCase() : '';

                                return name.includes(search) || label.includes(search) || code.includes(search);
                              })
                              .map((lang) => (
                                <div
                                  key={lang.code || Math.random().toString()}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleNativeLanguageChange(lang.value)}
                                >
                                  {lang.label || lang.value}
                                </div>
                              ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">No language options available</div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => setShowNativeLanguages(!showNativeLanguages)}
                        className="absolute top-1/2 right-2 -translate-y-1/2"
                      >
                        <ChevronsUpDown size={16} />
                      </button>
                    </div>
                  </div>


                  <div className="relative space-y-2">
                    <Label htmlFor="learningLanguage" className="text-base">Learning Language</Label>
                    <div className="relative" ref={learningLanguageRef}>
                      <Input
                        id="learningLanguage"
                        type="text"
                        value={learningLanguageInput}
                        onChange={(e) => {
                          setLearningLanguageInput(e.target.value);
                          setLearningLanguageSearch(e.target.value);
                        }}
                        placeholder="Select or type your learning language"
                        className="h-12"
                        onKeyDown={(e) => {
                          if(e.key === 'Enter' && learningLanguageInput){
                            handleLearningLanguageChange(learningLanguageInput)
                          }
                        }}
                      />
                      {showLearningLanguages && (
                        <div className="absolute top-[calc(100%+0.5rem)] left-0 w-full bg-white border border-gray-200 rounded-md shadow-md z-10 max-h-60 overflow-y-auto">
                          {Array.isArray(languageOptions) && languageOptions.length > 0 ? (
                            languageOptions
                              .filter((lang) => {
                                if (!lang) return false;
                                if (!learningLanguageSearch) return true;

                                const search = learningLanguageSearch.toLowerCase();
                                const name = lang.value ? lang.value.toLowerCase() : '';
                                const label = lang.label ? lang.label.toLowerCase() : '';
                                const code = lang.code ? lang.code.toLowerCase() : '';

                                return name.includes(search) || label.includes(search) || code.includes(search);
                              })
                              .map((lang) => (
                                <div
                                  key={lang.code || Math.random().toString()}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleLearningLanguageChange(lang.value)}
                                >
                                  {lang.label || lang.value}
                                </div>
                              ))
                          ) : (
                            <div className="p-3 text-center text-gray-500">No language options available</div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => setShowLearningLanguages(!showLearningLanguages)}
                        className="absolute top-1/2 right-2 -translate-y-1/2"
                      >
                        <ChevronsUpDown size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="proficiencyLevel" className="text-base">Proficiency Level</Label>
                    <Select
                      value={localProfile?.proficiency_level || ""}
                      onValueChange={(value) => handleProfileChange("proficiency_level", value)}
                    >
                      <SelectTrigger id="proficiencyLevel" className="h-12">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {proficiencyLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveProfile} 
                disabled={isLoading}
                className="w-full h-12 text-base"
              >
                <Save className="h-5 w-5 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-0 sm:border-2 shadow-lg sm:rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Privacy Preferences</CardTitle>
              <CardDescription className="text-base">
                Control your visibility and interaction settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    id: "showOnlineStatus",
                    label: "Show online status",
                    description: "Let others see when you're active",
                    value: privacySettings.showOnlineStatus
                  },
                  {
                    id: "showLastActive",
                    label: "Show last active time",
                    description: "Display when you were last online",
                    value: privacySettings.showLastActive
                  },
                  {
                    id: "allowMessages",
                    label: "Allow messages",
                    description: "Receive direct messages from others",
                    value: privacySettings.allowMessages
                  },
                  {
                    id: "showProfileInSearch",
                    label: "Show profile in search",
                    description: "Allow others to find you",
                    value: privacySettings.showProfileInSearch
                  }
                ].map((setting, i) => (
                  <div key={setting.id}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={setting.id} className="text-base">{setting.label}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <CustomToggle
                        id={setting.id}
                        checked={setting.value}
                        onCheckedChange={(value) => handlePrivacyChange(setting.id, value)}
                      />
                    </div>
                    {i < 3 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePrivacy} className="w-full h-12 text-base">
                <Save className="h-5 w-5 mr-2" />
                Save Privacy Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-0 sm:border-2 shadow-lg sm:rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Notification Preferences</CardTitle>
              <CardDescription className="text-base">
                Manage how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  {
                    id: "newMessages",
                    label: "New messages",
                    description: "Get notified about new messages",
                    value: notificationSettings.newMessages
                  },
                  {
                    id: "profileViews",
                    label: "Profile views",
                    description: "Know when someone views your profile",
                    value: notificationSettings.profileViews
                  },
                  {
                    id: "learningReminders",
                    label: "Learning reminders",
                    description: "Daily practice reminders",
                    value: notificationSettings.learningReminders
                  },
                  {
                    id: "streakReminders",
                    label: "Streak reminders",
                    description: "Maintain your daily streak",
                    value: notificationSettings.streakReminders
                  },
                  {
                    id: "marketingEmails",
                    label: "Marketing emails",
                    description: "Receive updates and offers",
                    value: notificationSettings.marketingEmails
                  }
                ].map((setting, i) => (
                  <div key={setting.id}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor={setting.id} className="text-base">{setting.label}</Label>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                      </div>
                      <CustomToggle
                        id={setting.id}
                        checked={setting.value}
                        onCheckedChange={(value) => handleNotificationChange(setting.id, value)}
                      />
                    </div>
                    {i < 4 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} className="w-full h-12 text-base">
                <Save className="h-5 w-5 mr-2" />
                Save Notification Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <Card className="border-0 sm:border-2 shadow-lg sm:rounded-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Account Settings</CardTitle>
              <CardDescription className="text-base">
                Manage your account security and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-medium">Password</h4>
                    <p className="text-sm text-muted-foreground">
                      Change your account password
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleChangePassword} className="w-full sm:w-auto">
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-base font-medium">Email Address</h4>
                    <p className="text-sm text-muted-foreground break-all">{profile?.email}</p>
                  </div>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Mail className="h-4 w-4 mr-2" />
                    Update Email
                  </Button>
                </div>
                <div className="space-y-4">
                  <Label className="text-base">Interface Language</Label>
                  <LanguageSwitcher />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold">Theme</h3>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {/* Use responsive hook for icon sizing */}
                  {(() => {
                    const { iconSize } = useResponsive();
                    return (
                      <>
                        <Button
                          variant={theme === "light" ? "default" : "outline"}
                          className="flex-1 h-auto py-2 sm:py-4"
                          onClick={() => setTheme("light")}
                        >
                          <Sun size={iconSize.small} className="mr-1 sm:mr-2" />
                          <span className="text-sm sm:text-base">Light</span>
                        </Button>
                        <Button
                          variant={theme === "dark" ? "default" : "outline"}
                          className="flex-1 h-auto py-2 sm:py-4"
                          onClick={() => setTheme("dark")}
                        >
                          <Moon size={iconSize.small} className="mr-1 sm:mr-2" />
                          <span className="text-sm sm:text-base">Dark</span>
                        </Button>
                        <Button
                          variant={theme === "system" ? "default" : "outline"}
                          className="flex-1 h-auto py-2 sm:py-4"
                          onClick={() => setTheme("system")}
                        >
                          <Globe size={iconSize.small} className="mr-1 sm:mr-2" />
                          <span className="text-sm sm:text-base">System</span>
                        </Button>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="rounded-lg border-2 border-primary/10 p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xl font-semibold">Free Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      Current subscription status
                    </p>
                  </div>
                  <Button>
                    <Wallet className="h-4 w-4 mr-2" />
                    Upgrade
                  </Button>
                </div>
                <Separator />
                <div className="grid gap-4">
                  <div className="flex items-center text-sm">
                    <svg className="h-3.5 w-3.5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basic conversation features
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="h-3.5 w-3.5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Community access
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <svg className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Advanced learning tools (Premium)
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <svg className="h-3.5 w-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    AI-powered conversation practice (Premium)
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="text-destructive">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;