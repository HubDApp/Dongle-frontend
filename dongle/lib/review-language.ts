export const REVIEW_LANGUAGES = {
  en: { name: "English", flag: "🇬🇧" },
  es: { name: "Spanish", flag: "🇪🇸" },
  fr: { name: "French", flag: "🇫🇷" },
  de: { name: "German", flag: "🇩🇪" },
  pt: { name: "Portuguese", flag: "🇵🇹" },
  it: { name: "Italian", flag: "🇮🇹" },
  nl: { name: "Dutch", flag: "🇳🇱" },
  ru: { name: "Russian", flag: "🇷🇺" },
  ar: { name: "Arabic", flag: "🇸🇦" },
  hi: { name: "Hindi", flag: "🇮🇳" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  ja: { name: "Japanese", flag: "🇯🇵" },
  ko: { name: "Korean", flag: "🇰🇷" },
  tr: { name: "Turkish", flag: "🇹🇷" },
  sv: { name: "Swedish", flag: "🇸🇪" },
} as const;

export type ReviewLanguageCode = keyof typeof REVIEW_LANGUAGES | "und";

const STOPWORDS: Record<Exclude<ReviewLanguageCode, "und">, string[]> = {
  en: ["the", "this", "with", "and", "is", "was", "for", "very", "project"],
  es: ["el", "la", "los", "las", "que", "con", "muy", "para", "una", "este"],
  fr: ["le", "la", "les", "des", "que", "avec", "très", "pour", "une", "est"],
  de: ["der", "die", "das", "und", "mit", "sehr", "für", "ist", "ein", "eine"],
  pt: ["que", "com", "muito", "para", "uma", "não", "este", "projeto", "mais", "bom"],
  it: ["che", "con", "molto", "per", "una", "questo", "progetto", "non", "ottimo", "sono"],
  nl: ["de", "het", "een", "en", "met", "voor", "dit", "goed", "zijn", "project"],
  ru: ["это", "как", "что", "для", "очень", "проект", "хороший", "удобный", "есть", "этот"],
  ar: ["هذا", "هذه", "الذي", "جدا", "من", "على", "مع", "في", "كان", "ممتاز"],
  hi: ["यह", "है", "और", "बहुत", "के", "का", "की", "लिए", "अच्छा", "एक"],
  zh: ["这个", "非常", "很好", "项目", "但是", "可以", "使用", "体验", "不错", "支持"],
  ja: ["です", "ます", "この", "とても", "プロジェクト", "便利", "良い", "使いやすい", "機能", "から"],
  ko: ["이", "그", "정말", "매우", "좋은", "프로젝트", "사용", "편리", "있습니다", "합니다"],
  tr: ["bir", "çok", "için", "ve", "ile", "bu", "güzel", "proje", "harika", "değil"],
  sv: ["och", "det", "att", "med", "för", "som", "är", "mycket", "bra", "projekt"],
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

export function normalizeReviewSearchText(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

function transliterateCyrillic(text: string): string {
  return [...text.toLocaleLowerCase()].map((character) => CYRILLIC_TO_LATIN[character] ?? character).join("");
}

export function reviewSearchMatches(comment: string, query: string): boolean {
  const normalizedQuery = normalizeReviewSearchText(query).trim();
  if (!normalizedQuery) return true;
  const commentForms = [normalizeReviewSearchText(comment), normalizeReviewSearchText(transliterateCyrillic(comment))];
  const queryForms = [normalizedQuery, normalizeReviewSearchText(transliterateCyrillic(query))];
  return commentForms.some((commentForm) => queryForms.some((queryForm) => commentForm.includes(queryForm)));
}

export function detectReviewLanguage(text: string): ReviewLanguageCode {
  const normalized = text.toLocaleLowerCase();
  if (!normalized.trim()) return "und";
  if (/[\u0600-\u06ff]/.test(normalized)) return "ar";
  if (/[\u0900-\u097f]/.test(normalized)) return "hi";
  if (/[\uac00-\ud7af]/.test(normalized)) return "ko";
  if (/[\u3040-\u30ff]/.test(normalized)) return "ja";
  if (/[\u4e00-\u9fff]/.test(normalized)) return "zh";
  if (/[\u0400-\u04ff]/.test(normalized)) return "ru";

  const folded = normalizeReviewSearchText(normalized);
  const scores = Object.fromEntries(
    (Object.keys(STOPWORDS) as Array<keyof typeof STOPWORDS>).map((language) => [
      language,
      STOPWORDS[language].reduce((score, word) => score + (new RegExp(`(?:^|\\W)${word}(?:$|\\W)`, "iu").test(normalized) ? 1 : 0), 0),
    ]),
  ) as Record<Exclude<ReviewLanguageCode, "und">, number>;

  if (/[ñ¿¡]/i.test(normalized)) scores.es += 3;
  if (/[ãõ]/i.test(normalized)) scores.pt += 3;
  if (/[ß]/i.test(normalized)) scores.de += 3;
  if (/[å]/i.test(normalized)) scores.sv += 3;
  if (/[şğı]/i.test(normalized)) scores.tr += 3;
  if (/[àâçèêëîïôùûüÿœ]/i.test(normalized)) scores.fr += 1;
  if (/[ò]/i.test(normalized)) scores.it += 1;
  if (/\b(the|this|with|was|are|have|from)\b/i.test(folded)) scores.en += 2;

  const ranked = (Object.entries(scores) as Array<[Exclude<ReviewLanguageCode, "und">, number]>)
    .sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === 0 || (ranked[0][1] < 2 && ranked[0][1] === ranked[1][1])) return "und";
  return ranked[0][0];
}

export function getReviewLanguageLabel(language?: string): string {
  if (!language || language === "und" || !(language in REVIEW_LANGUAGES)) return "🌐 Language unknown";
  const metadata = REVIEW_LANGUAGES[language as keyof typeof REVIEW_LANGUAGES];
  return `${metadata.flag} ${metadata.name}`;
}