import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Hand-rolled i18n: a context, two dictionaries and a `t()` with {placeholder}
 * interpolation.
 *
 * react-i18next would add ~40 kB gzipped and a plugin pipeline to translate ~60
 * strings with no pluralisation rules and no lazy-loaded namespaces. At this
 * size the library is the more complicated option, not the simpler one.
 *
 * Hebrew copy avoids gendered verb forms — it uses impersonal and plural
 * constructions so it reads correctly for any player.
 */

const STORAGE_KEY = 'bingo:lang'; // must match the pre-paint script in index.html

export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'he', label: 'עברית', dir: 'rtl' },
];

const DICTIONARY = {
  en: {
    'app.title': 'Summer',
    'app.titleAccent': 'Bingo',

    'join.subtitle':
      'Your card holds answers. The host asks a question — find the answer and tap it yourself.',
    'join.nameLabel': 'Your name',
    'join.namePlaceholder': 'e.g. Dana',
    'join.submit': 'Join the game',
    'join.connecting': 'Connecting…',

    'status.idle': 'Waiting',
    'status.running': 'Live',
    'status.paused': 'Paused',
    'status.finished': 'Finished',
    'status.connected': 'Connected',
    'status.offline': 'Offline',
    'topbar.playingAs': 'Playing as {name}',

    'question.label': 'Question {n}',
    'question.waiting': 'Waiting for the host to ask the first question…',
    'question.hint': 'Find the answer on your card and tap it.',
    'question.counter': '{asked} of {total}',

    'asked.title': 'Asked so far',
    'asked.empty': 'No questions yet.',
    'asked.expand': 'Show all',
    'asked.collapse': 'Show less',

    'cell.free': 'Free',
    'claim.button': 'Bingo!',
    'claim.marked': '{n} marked',

    'win.title': 'BINGO!',
    'win.you': 'You did it — verified by the server.',
    'win.other': 'Winner: {name}',
    'win.questions': 'Questions asked',
    'win.lines': 'Lines',
    'win.close': 'Back to the card',

    'error.NO_BINGO': 'No complete line yet.',
    'error.WRONG_MARKS': '{count} of your marks are wrong. Fix them, then call bingo.',
    'error.NOT_JOINED': 'You are not in the game. Refresh to rejoin.',
    'error.NOT_STARTED': 'No question has been asked yet.',
    'error.TOO_FAST': 'Easy there — one claim per second.',
    'error.generic': 'Claim failed. Try again.',

    'admin.controls': 'Host controls',
    'admin.next': 'Next question',
    'admin.pause': 'Pause',
    'admin.resume': 'Resume',
    'admin.reset': 'New round',
    'admin.unauthorized': 'Wrong admin key — the server rejected it.',
    'admin.answerKey': 'Answer key',
    'admin.answerKeyHint': 'Only you can see this.',
    'admin.noAnswers': 'No questions asked yet.',
    'admin.exhausted': 'All questions have been asked.',

    'roster.title': 'Players',
    'roster.online': '{count} online',
    'roster.empty': 'Nobody has joined yet.',
    'roster.marked': 'marked',
    'roster.closeToWin': 'One away',
    'roster.won': 'Won',
    'roster.disconnected': 'Offline',
    'roster.wrong': '{n} wrong',
    'roster.claims': 'Claims',

    'lang.switch': 'Language',
  },

  he: {
    'app.title': 'בינגו',
    'app.titleAccent': 'קיץ',

    'join.subtitle':
      'על הכרטיס שלכם יש תשובות. המנחה שואל שאלה — מצאו את התשובה וסמנו אותה בעצמכם.',
    'join.nameLabel': 'השם שלך',
    'join.namePlaceholder': 'לדוגמה: דנה',
    'join.submit': 'הצטרפות למשחק',
    'join.connecting': 'מתחבר…',

    'status.idle': 'ממתין',
    'status.running': 'פעיל',
    'status.paused': 'מושהה',
    'status.finished': 'הסתיים',
    'status.connected': 'מחובר',
    'status.offline': 'מנותק',
    'topbar.playingAs': 'משחקים בתור {name}',

    'question.label': 'שאלה {n}',
    'question.waiting': 'ממתינים למנחה שישאל את השאלה הראשונה…',
    'question.hint': 'מצאו את התשובה על הכרטיס וסמנו אותה.',
    'question.counter': '{asked} מתוך {total}',

    'asked.title': 'שאלות שנשאלו',
    'asked.empty': 'עדיין לא נשאלו שאלות.',
    'asked.expand': 'הצגת הכול',
    'asked.collapse': 'הצגה מצומצמת',

    'cell.free': 'חופשי',
    'claim.button': 'בינגו!',
    'claim.marked': '{n} מסומנים',

    'win.title': 'בינגו!',
    'win.you': 'הצלחתם — מאומת על ידי השרת.',
    'win.other': 'הזוכה: {name}',
    'win.questions': 'שאלות שנשאלו',
    'win.lines': 'קווים',
    'win.close': 'חזרה לכרטיס',

    'error.NO_BINGO': 'עדיין אין קו שלם.',
    'error.WRONG_MARKS': '{count} מהסימונים שלכם שגויים. תקנו אותם ואז הכריזו בינגו.',
    'error.NOT_JOINED': 'אינכם במשחק. יש לרענן את הדף כדי להצטרף מחדש.',
    'error.NOT_STARTED': 'עדיין לא נשאלה שאלה.',
    'error.TOO_FAST': 'רגע — הכרזה אחת בשנייה.',
    'error.generic': 'ההכרזה נכשלה. נסו שוב.',

    'admin.controls': 'בקרת המנחה',
    'admin.next': 'השאלה הבאה',
    'admin.pause': 'השהיה',
    'admin.resume': 'המשך',
    'admin.reset': 'סבב חדש',
    'admin.unauthorized': 'מפתח ניהול שגוי — השרת דחה אותו.',
    'admin.answerKey': 'מפתח התשובות',
    'admin.answerKeyHint': 'רק אתם רואים את זה.',
    'admin.noAnswers': 'עדיין לא נשאלו שאלות.',
    'admin.exhausted': 'כל השאלות כבר נשאלו.',

    'roster.title': 'שחקנים',
    'roster.online': '{count} מחוברים',
    'roster.empty': 'עדיין לא הצטרפו שחקנים.',
    'roster.marked': 'סומנו',
    'roster.closeToWin': 'סימון אחד מבינגו',
    'roster.won': 'ניצחו',
    'roster.disconnected': 'מנותק',
    'roster.wrong': '{n} שגויים',
    'roster.claims': 'הכרזות',

    'lang.switch': 'שפה',
  },
};

// A key present in one dictionary and missing from the other silently renders
// English to a Hebrew player. This is the one safety net a library would give us.
if (import.meta.env.DEV) {
  const en = Object.keys(DICTIONARY.en);
  const he = Object.keys(DICTIONARY.he);
  const missing = [
    ...en.filter((k) => !he.includes(k)).map((k) => `he:${k}`),
    ...he.filter((k) => !en.includes(k)).map((k) => `en:${k}`),
  ];
  if (missing.length) console.warn('[i18n] missing translations:', missing);
}

const dirOf = (code) => LANGUAGES.find((l) => l.code === code)?.dir ?? 'ltr';

function detectLanguage() {
  // The pre-paint script in index.html already resolved this and set <html dir>.
  // Preferring its answer means exactly one decision is made at runtime, so the
  // two copies of the logic can never disagree.
  if (window.__BINGO_LANG__) return window.__BINGO_LANG__;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && DICTIONARY[saved]) return saved;
  return navigator.language?.startsWith('he') ? 'he' : 'en';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(detectLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    window.__BINGO_LANG__ = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const template = DICTIONARY[lang]?.[key] ?? DICTIONARY.en[key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, dir: dirOf(lang), isRtl: dirOf(lang) === 'rtl' }),
    [lang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside <I18nProvider>');
  return context;
}
