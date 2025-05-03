
interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Spanish (Español)", flag: "🇪🇸" },
  { code: "fr", name: "French (Français)", flag: "🇫🇷" },
  { code: "ar", name: "Arabic (العربية)", flag: "🇸🇦" },
  { code: "zh", name: "Chinese (中文)", flag: "🇨🇳" },
  { code: "hi", name: "Hindi (हिन्दी)", flag: "🇮🇳" },
  { code: "de", name: "German (Deutsch)", flag: "🇩🇪" },
  { code: "pt", name: "Portuguese (Português)", flag: "🇵🇹" },
  { code: "ru", name: "Russian (Русский)", flag: "🇷🇺" },
  { code: "ja", name: "Japanese (日本語)", flag: "🇯🇵" },
  { code: "ko", name: "Korean (한국어)", flag: "🇰🇷" },
  { code: "bn", name: "Bengali (বাংলা)", flag: "🇧🇩" },
  { code: "ta", name: "Tamil (தமிழ்)", flag: "🇮🇳" },
  { code: "te", name: "Telugu (తెలుగు)", flag: "🇮🇳" },
  { code: "mr", name: "Marathi (मराठी)", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati (ગુજરાતી)", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam (മലയാളം)", flag: "🇮🇳" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi (ਪੰਜਾਬੀ)", flag: "🇮🇳" },
  { code: "ur", name: "Urdu (اردو)", flag: "🇵🇰" },
  { code: "tr", name: "Turkish (Türkçe)", flag: "🇹🇷" },
  { code: "vi", name: "Vietnamese (Tiếng Việt)", flag: "🇻🇳" },
  { code: "th", name: "Thai (ไทย)", flag: "🇹🇭" },
  { code: "id", name: "Indonesian (Bahasa Indonesia)", flag: "🇮🇩" },
  { code: "fa", name: "Persian (فارسی)", flag: "🇮🇷" },
  { code: "sw", name: "Swahili (Kiswahili)", flag: "🇹🇿" },
  { code: "it", name: "Italian (Italiano)", flag: "🇮🇹" },
  { code: "uk", name: "Ukrainian (Українська)", flag: "🇺🇦" },
  { code: "he", name: "Hebrew (עברית)", flag: "🇮🇱" },
  { code: "or", name: "Odia (ଓଡ଼ିଆ)", flag: "🇮🇳" }
];

export const getLanguageFlag = (language?: string): string => {
  if (!language) return "🌐";

  // Try to find in supported languages first
  const supportedLang = SUPPORTED_LANGUAGES.find(
    lang => lang.name.toLowerCase() === language.toLowerCase() || 
            lang.name.split(' ')[0].toLowerCase() === language.toLowerCase()
  );

  if (supportedLang) {
    return supportedLang.flag;
  }

  // Fallback mapping for legacy language names
  const languageToFlag: Record<string, string> = {
    'English': '🇬🇧',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Russian': '🇷🇺',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Chinese': '🇨🇳',
    'Arabic': '🇸🇦',
    'Hindi': '🇮🇳',
    'Turkish': '🇹🇷',
    'Dutch': '🇳🇱',
    'Swedish': '🇸🇪',
    'Polish': '🇵🇱',
    'Norwegian': '🇳🇴',
    'Danish': '🇩🇰',
    'Finnish': '🇫🇮',
    'Czech': '🇨🇿',
    'Greek': '🇬🇷',
    'Hungarian': '🇭🇺'
  };

  return languageToFlag[language] || '🌐';
};

export const getLanguageInfo = (code: string): LanguageOption => {
  return (
    SUPPORTED_LANGUAGES.find((lang) => lang.code === code) || 
    { code, name: code, flag: '🌐' }
  );
};

export const getProficiencyLabel = (level: string): string => {
  const labels = {
    beginner: 'A1-A2',
    intermediate: 'B1-B2',
    advanced: 'C1-C2'
  };
  return labels[level as keyof typeof labels] || level;
};

// Helper function to get language name by code
export const getLanguageNameByCode = (code: string): string => {
  const language = SUPPORTED_LANGUAGES.find(lang => lang.code === code);
  return language ? language.name : code;
};

// Convert language list to display format (for Select components)
export const getLanguageOptions = () => {
  return SUPPORTED_LANGUAGES.map(lang => ({
    value: lang.name,
    label: `${lang.flag} ${lang.name}`,
    code: lang.code
  }));
};
