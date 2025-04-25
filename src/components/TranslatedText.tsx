
import { useTranslation } from 'react-i18next';

interface TranslatedTextProps {
  text: string;
  values?: Record<string, string>;
}

export const TranslatedText = ({ text, values }: TranslatedTextProps) => {
  const { t } = useTranslation();
  return <>{t(text, values)}</>;
};
