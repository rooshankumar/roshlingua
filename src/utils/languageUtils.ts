
interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "zh", name: "Mandarin Chinese", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "ar", name: "Modern Standard Arabic", flag: "🇸🇦" },
  { code: "bn", name: "Bengali", flag: "🇧🇩" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "ur", name: "Urdu", flag: "🇵🇰" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "de", name: "Standard German", flag: "🇩🇪" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "pcm", name: "Nigerian Pidgin", flag: "🇳🇬" },
  { code: "arz", name: "Egyptian Arabic", flag: "🇪🇬" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
  { code: "pnb", name: "Western Punjabi", flag: "🇵🇰" },
  { code: "wuu", name: "Wu Chinese (Shanghainese)", flag: "🇨🇳" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "yue", name: "Yue Chinese (Cantonese)", flag: "🇨🇳" },
  { code: "jv", name: "Javanese", flag: "🇮🇩" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "gu", name: "Gujarati", flag: "🇮🇳" },
  { code: "fa", name: "Iranian Persian (Farsi)", flag: "🇮🇷" },
  { code: "bho", name: "Bhojpuri", flag: "🇮🇳" },
  { code: "nan", name: "Southern Min (Hokkien)", flag: "🇨🇳" },
  { code: "hak", name: "Hakka", flag: "🇨🇳" },
  { code: "cjy", name: "Jin Chinese", flag: "🇨🇳" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "my", name: "Burmese", flag: "🇲🇲" },
  { code: "or", name: "Oriya (Odia)", flag: "🇮🇳" },
  { code: "mai", name: "Maithili", flag: "🇮🇳" },
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "uz", name: "Uzbek", flag: "🇺🇿" },
  { code: "sd", name: "Sindhi", flag: "🇵🇰" },
  { code: "am", name: "Amharic", flag: "🇪🇹" },
  { code: "ff", name: "Fula", flag: "🌍" },
  { code: "ro", name: "Romanian", flag: "🇷🇴" },
  { code: "om", name: "Oromo", flag: "🇪🇹" },
  { code: "ig", name: "Igbo", flag: "🇳🇬" },
  { code: "az", name: "Azerbaijani", flag: "🇦🇿" },
  { code: "awa", name: "Awadhi", flag: "🇮🇳" },
  { code: "gan", name: "Gan Chinese", flag: "🇨🇳" },
  { code: "ceb", name: "Cebuano", flag: "🇵🇭" },
  { code: "nl", name: "Dutch", flag: "🇳🇱" },
  { code: "ku", name: "Kurdish", flag: "🌍" },
  { code: "sh", name: "Serbo-Croatian", flag: "🌍" },
  { code: "mg", name: "Malagasy", flag: "🇲🇬" },
  { code: "skr", name: "Saraiki", flag: "🇵🇰" },
  { code: "ne", name: "Nepali", flag: "🇳🇵" },
  { code: "si", name: "Sinhala", flag: "🇱🇰" },
  { code: "ctg", name: "Chittagonian", flag: "🇧🇩" },
  { code: "za", name: "Zhuang", flag: "🇨🇳" },
  { code: "km", name: "Khmer", flag: "🇰🇭" },
  { code: "tk", name: "Turkmen", flag: "🇹🇲" },
  { code: "as", name: "Assamese", flag: "🇮🇳" },
  { code: "mad", name: "Madurese", flag: "🇮🇩" },
  { code: "so", name: "Somali", flag: "🇸🇴" },
  { code: "mwr", name: "Marwari", flag: "🇮🇳" },
  { code: "mag", name: "Magahi", flag: "🇮🇳" },
  { code: "bgc", name: "Haryanvi", flag: "🇮🇳" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "hne", name: "Chhattisgarhi", flag: "🇮🇳" },
  { code: "el", name: "Greek", flag: "🇬🇷" },
  { code: "ny", name: "Chewa", flag: "🇲🇼" },
  { code: "dcc", name: "Deccan", flag: "🇮🇳" },
  { code: "ak", name: "Akan", flag: "🇬🇭" },
  { code: "kk", name: "Kazakh", flag: "🇰🇿" },
  { code: "cdo", name: "Northern Min", flag: "🇨🇳" },
  { code: "syl", name: "Sylheti", flag: "🇧🇩" },
  { code: "zu", name: "Zulu", flag: "🇿🇦" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "rw", name: "Kinyarwanda", flag: "🇷🇼" },
  { code: "dhd", name: "Dhundhari", flag: "🇮🇳" },
  { code: "ht", name: "Haitian Creole", flag: "🇭🇹" },
  { code: "czh", name: "Eastern Min", flag: "🇨🇳" },
  { code: "ilo", name: "Ilocano", flag: "🇵🇭" },
  { code: "qu", name: "Quechua", flag: "🇵🇪" },
  { code: "rn", name: "Kirundi", flag: "🇧🇮" },
  { code: "sv", name: "Swedish", flag: "🇸🇪" },
  { code: "hil", name: "Hiligaynon", flag: "🇵🇭" },
  { code: "mos", name: "Mossi", flag: "🇧🇫" },
  { code: "xh", name: "Xhosa", flag: "🇿🇦" },
  { code: "be", name: "Belarusian", flag: "🇧🇾" },
  { code: "bal", name: "Balochi", flag: "🇵🇰" },
  { code: "kok", name: "Konkani", flag: "🇮🇳" },
  { code: "sn", name: "Shona", flag: "🇿🇼" },
  { code: "tt", name: "Tatar", flag: "🇷🇺" },
  { code: "ug", name: "Uyghur", flag: "🇨🇳" },
  { code: "he", name: "Hebrew", flag: "🇮🇱" },
  { code: "ps", name: "Pashto", flag: "🇦🇫" },
  { code: "ti", name: "Tigrinya", flag: "🇪🇷" },
  { code: "bg", name: "Bulgarian", flag: "🇧🇬" },
  { code: "da", name: "Danish", flag: "🇩🇰" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "fi", name: "Finnish", flag: "🇫🇮" }
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
