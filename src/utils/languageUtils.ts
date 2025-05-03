
interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const getLanguageFlag = (language?: string): string => {
  if (!language) return "🌐";

  const supportedLang = SUPPORTED_LANGUAGES.find(
    lang => lang.name.toLowerCase() === language.toLowerCase()
  );

  if (supportedLang) {
    return supportedLang.flag;
  }

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

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

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
