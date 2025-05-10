
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SUPPORTED_LANGUAGES } from '@/utils/languageUtils';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter languages based on search term
  const filteredLanguages = SUPPORTED_LANGUAGES.filter((lang) => 
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Current language display
  const currentLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language) || 
                          { code: i18n.language, name: i18n.language, flag: '🌐' };

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        className="flex h-10 w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          {currentLanguage.flag} <span className="ml-2">{currentLanguage.name}</span>
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-[280px] rounded-md border bg-popover shadow-md">
          <div className="sticky top-0 bg-popover p-1">
            <div className="flex items-center border rounded-sm px-2">
              <Search className="h-4 w-4 mr-2 opacity-50" />
              <Input
                placeholder="Type to search..."
                className="border-0 focus-visible:ring-0 h-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => (
                <div
                  key={lang.code}
                  className={`flex items-center px-2 py-1.5 cursor-pointer rounded-sm hover:bg-accent ${
                    i18n.language === lang.code ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="mr-2">{lang.flag}</span>
                  <span>{lang.name}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-2 text-muted-foreground">No languages found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
