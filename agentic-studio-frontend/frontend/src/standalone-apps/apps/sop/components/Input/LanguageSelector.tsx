import React from 'react';
import { useThemeStore } from '../../store';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useThemeStore();

  return (
    <div className="psp-sop-language-selector">
      <div className="form-check form-check-inline">
        <input
          className="form-check-input"
          type="radio"
          name="language"
          id="englishRadio"
          value="english"
          checked={language === 'english'}
          onChange={() => setLanguage('english')}
        />
        <label className="form-check-label" htmlFor="englishRadio">
          English
        </label>
      </div>
      <div className="form-check form-check-inline">
        <input
          className="form-check-input"
          type="radio"
          name="language"
          id="spanishRadio"
          value="spanish"
          checked={language === 'spanish'}
          onChange={() => setLanguage('spanish')}
        />
        <label className="form-check-label" htmlFor="spanishRadio">
          Spanish
        </label>
      </div>
    </div>
  );
};
