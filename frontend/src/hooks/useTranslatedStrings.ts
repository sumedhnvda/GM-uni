import { useTranslation } from '../contexts/TranslationContext';

// Translation dictionary for common strings
const translations: { [key: string]: { [lang: string]: string } } = {
    // Home Page
    'Smart Farming with AI': {
        'en': 'Smart Farming with AI',
        'hi': 'एआई के साथ स्मार्ट खेती',
        'kn': 'AI ನೊಂದಿಗೆ ಸ್ಮಾರ್ಟ ಕೃಷಿ',
        'ta': 'AI உடன் ஸ்மார்ட் விவசாயம்',
        'te': 'AI తో స్మార్ట్ ఫార్మింగ్',
        'ml': 'AI ഉപയോഗിച്ച് സ്മാർട്ട് കൃഷി',
    },
    'Predict crop prices, analyze soil health, and get personalized farming advice using advanced AI models.': {
        'en': 'Predict crop prices, analyze soil health, and get personalized farming advice using advanced AI models.',
        'hi': 'फसल की कीमतों की भविष्यवाणी करें, मिट्टी के स्वास्थ्य का विश्लेषण करें, और उन्नत एआई मॉडल का उपयोग करके व्यक्तिगत कृषि सलाह प्राप्त करें।',
        'kn': 'ಬೆಳೆಯ ಬೆಲೆಗಳನ್ನು ಊಹಿಸಿ, ಮಣ್ಣಿನ ಆರೋಗ್ಯವನ್ನು ವಿಶ್ಲೇಷಿಸಿ ಮತ್ತು ಮುಂದುವರಿದ AI ಮಾದರಿಗಳನ್ನು ಬಳಸಿಕೊಂಡು ವ್ಯಕ್ತಿಗತಕೃತ ಕೃಷಿ ಸಲಹೆಯನ್ನು ಪಡೆಯಿರಿ।',
        'ta': 'பயிர் விலைகளை முன்னறிவிக்கவும், மண் ஆரோக்கியத்தை பகுப்பாய்வு செய்யவும், மற்றும் உন்নত AI மாதिரிகளைப் பயன்படுத்தி ব្ក्তિगத விவசாய ஆலோசனை பெறவும்.',
        'te': 'ఫసల్ ధరలను అంచనా వేయండి, నేల ఆరోగ్యాన్ని విశ్లేషించండి మరియు అధ్వాన్స్డ్ AI మోడల్‌లను ఉపయోగించి వ్యక్తిగත వ్యవసాయ సలహా పొందండి.',
        'ml': 'വിളയുടെ വിലകൾ പূর്വാভാസം നൽകുക, മണ്ണിന്റെ ആരോഗ്യം വിശകലനം ചെയ്യുക, കൂടാതെ വിപുലമായ AI മോഡലുകൾ ഉപയോഗിച്ച് വ്യക്തിപരമായ കൃഷി ഉപദേശം നേടുക.',
    },
    'Start Deep Analysis': {
        'en': 'Start Deep Analysis',
        'hi': 'गहन विश्लेषण शुरू करें',
        'kn': 'ಆಳವಾದ ವಿಶ್ಲೇಷಣೆ ಪ್ರಾರಂಭಿಸಿ',
        'ta': 'ஆழமான பகுப்பாய்வு தொடங்கவும்',
        'te': 'లోతైన విశ్లేషణ ప్రారంభించండి',
        'ml': 'ഗভീരമായ വിശകലനം ആരംഭിക്കുക',
    },
    'Quick Price Prediction': {
        'en': 'Quick Price Prediction',
        'hi': 'त्वरित मूल्य भविष्यवाणी',
        'kn': 'ತ್ವರಿತ ಬೆಲೆ ಊಹೆ',
        'ta': 'விரைவான விலை முன்னறிவிப்பு',
        'te': 'కూ విలువ అంచనా',
        'ml': 'ദ്രുത വിലയ്ക്കുള്ള പ്രവചനം',
    },
    // Login/Auth
    'Login with Google': {
        'en': 'Login with Google',
        'hi': 'गूगल के साथ लॉगिन करें',
        'kn': 'Google ನೊಂದಿಗೆ ಲಾಗಿನ್ ಮಾಡಿ',
        'ta': 'Google உடன் உள்நுழையவும்',
        'te': 'Google తో లాగిన్ చేయండి',
        'ml': 'Google ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക',
    },
    // Form
    'Enter your location': {
        'en': 'Enter your location',
        'hi': 'अपना स्थान दर्ज करें',
        'kn': 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು ನಮೂದಿಸಿ',
        'ta': 'உங்கள் இருப்பிடத்தை உள்ளிடவும்',
        'te': 'మీ స్థానాన్ని నమోదు చేయండి',
        'ml': 'നിങ്ങളുടെ സ്ഥാനം നൽകുക',
    },
    'Enter land size/details': {
        'en': 'Enter land size/details',
        'hi': 'भूमि का आकार/विवरण दर्ज करें',
        'kn': 'ಭೂಮಿಯ ಗಾತ್ರ/ವಿವರಣೆ ನಮೂದಿಸಿ',
        'ta': 'நிலத்தின் அளவு/விவரங்களை உள்ளிடவும்',
        'te': 'భూమి పరిమాణం/వివరాలను నమోదు చేయండి',
        'ml': 'ഭൂമിയുടെ വലുപ്പം/വിവരണം നൽകുക',
    },
    'Analyze': {
        'en': 'Analyze',
        'hi': 'विश्लेषण करें',
        'kn': 'ವಿಶ್ಲೇಷಿಸಿ',
        'ta': 'பகுப்பாய்வு செய்யவும்',
        'te': 'విశ్లేషించు',
        'ml': 'വിശകലനം ചെയ്യുക',
    },
    // Navigation
    'Home': {
        'en': 'Home',
        'hi': 'होम',
        'kn': 'ಮನೆ',
        'ta': 'முகப்பு',
        'te': 'హోమ్',
        'ml': 'ഹോം',
    },
    'Profile': {
        'en': 'Profile',
        'hi': 'प्रोफाइल',
        'kn': 'ಪ್ರೊಫೈಲ್',
        'ta': 'சுயவிவரம்',
        'te': 'ప్రొఫైల్',
        'ml': 'പ്രൊഫൈല്',
    },
    'Logout': {
        'en': 'Logout',
        'hi': 'लॉगआउट',
        'kn': 'ಲಾಗ್ ಔಟ್',
        'ta': 'வெளியேறு',
        'te': 'లాగ్‌అవుట్',
        'ml': 'ലോഗൌട്ട്',
    },
    'Language': {
        'en': 'Language',
        'hi': 'भाषा',
        'kn': 'ಭಾಷೆ',
        'ta': 'மொழி',
        'te': 'భాష',
        'ml': 'ഭാഷ',
    },
};

export const useTranslatedStrings = () => {
    const { language } = useTranslation();

    const t = (key: string): string => {
        if (translations[key] && translations[key][language]) {
            return translations[key][language];
        }
        // Return English if translation not found
        if (translations[key] && translations[key]['en']) {
            return translations[key]['en'];
        }
        // Return the key itself as fallback
        return key;
    };

    return { t };
};
