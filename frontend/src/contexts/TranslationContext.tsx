import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface TranslationContextType {
    language: string;
    setLanguage: (lang: string) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState('en');

    return (
        <TranslationContext.Provider value={{ language, setLanguage }}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
};
