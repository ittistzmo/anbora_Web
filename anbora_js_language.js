const TRANSLATIONS = {
  en: {
    tagline: "A Little Care. A Stronger Connection.",
    install_app: "Install App",
    welcome_title: "A Little Care. A Stronger Connection.",
    welcome_subtitle: "Automated hourly safety check-ins, 24-hour cloud emergency escalation, and a warm AI companion in English, Tamil & Tanglish.",
    get_started: "Create Account",
    sign_in: "Sign In",
    register_title: "Create Your ANBORA Account",
    login_title: "Welcome Back to ANBORA",
    im_safe_now: "I'm Safe Now",
    ai_greeting: "Vanakkam! I am ANBORA, your caring companion. How are you feeling today? You can talk to me in English, தமிழ், or Tanglish."
  },
  ta: {
    tagline: "சிறிய அக்கறை. வலிமையான பிணைப்பு.",
    install_app: "செயலியை நிறுவுக",
    welcome_title: "சிறிய அக்கறை. வலிமையான பிணைப்பு.",
    welcome_subtitle: "மணிநேர பாதுகாப்பு சரிபார்ப்பு, 24-மணி நேர அவசர எச்சரிக்கை மற்றும் தமிழ், ஆங்கிலம், தங்கிலீஷில் அன்பான AI துணை.",
    get_started: "கணக்கை உருவாக்கவும்",
    sign_in: "உள்நுழையவும்",
    register_title: "உங்கள் ANBORA கணக்கை உருவாக்கவும்",
    login_title: "ANBORA-விற்கு மீண்டும் நல்வரவு",
    im_safe_now: "நான் பாதுகாப்பாக இருக்கிறேன்",
    ai_greeting: "வணக்கம்! நான் உங்கள் ANBORA துணை. இன்று நீங்கள் எப்படி உணர்கிறீர்கள்? தமிழில் அல்லது ஆங்கிலத்தில் என்னிடம் பேசலாம்."
  },
  tanglish: {
    tagline: "Oru Chinna Care. Oru Strong Connection.",
    install_app: "App Install Pannunga",
    welcome_title: "Oru Chinna Care. Oru Strong Connection.",
    welcome_subtitle: "Hourly safety check-ins, 24-hour cloud emergency escalation, apram English, Tamil & Tanglish-la pesura anbaana AI companion.",
    get_started: "Account Create Pannunga",
    sign_in: "Sign In Pannunga",
    register_title: "Unga ANBORA Account Create Pannunga",
    login_title: "ANBORA-ku Thirumba Vanakkam",
    im_safe_now: "Naan Safe-aa Irukken",
    ai_greeting: "Vanakkam! Naan unga ANBORA companion. Innaiku epdi feel panreenga? Neenga English, Tamil illana Tanglish-la enkitta pesalam."
  }
};

let currentLang = localStorage.getItem("anbora_lang") || "en";

export function getLanguage() {
  return currentLang;
}

export function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

export function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) lang = "en";
  currentLang = lang;
  localStorage.setItem("anbora_lang", lang);
  document.documentElement.lang = lang === "ta" ? "ta" : "en";
  applyTranslations();
}

export function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key);
  });
}
