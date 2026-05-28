export type OgLang = "en" | "es" | "de";

const translations: Record<OgLang, Record<string, string>> = {
  en: {
    "eventType.friendly_game": "Friendly Game",
    "eventType.social_game": "Social Game",
    "eventType.training": "Training",
    "eventType.tournament": "Tournament",
    "activityType.indoor": "Indoor",
    "activityType.beach": "Beach",
    "rsvpBy": "RSVP by {{date}}",
    "members_one": "{{count}} Member",
    "members_other": "{{count}} Members",
    "gender.women_only": "Women Only",
    "gender.men_only": "Men Only",
    "gender.queer": "Queer",
    "gender.flinta": "FLINTA",
    "gender.mixed": "",
  },
  es: {
    "eventType.friendly_game": "Partido amistoso",
    "eventType.social_game": "Partido social",
    "eventType.training": "Entrenamiento",
    "eventType.tournament": "Torneo",
    "activityType.indoor": "Interior",
    "activityType.beach": "Playa",
    "rsvpBy": "RSVP antes del {{date}}",
    "members_one": "{{count}} Miembro",
    "members_other": "{{count}} Miembros",
    "gender.women_only": "Solo mujeres",
    "gender.men_only": "Solo hombres",
    "gender.queer": "Queer",
    "gender.flinta": "FLINTA",
    "gender.mixed": "",
  },
  de: {
    "eventType.friendly_game": "Freundschaftsspiel",
    "eventType.social_game": "Freizeitspiel",
    "eventType.training": "Training",
    "eventType.tournament": "Turnier",
    "activityType.indoor": "Halle",
    "activityType.beach": "Beach",
    "rsvpBy": "RSVP bis {{date}}",
    "members_one": "{{count}} Mitglied",
    "members_other": "{{count}} Mitglieder",
    "gender.women_only": "Nur Frauen",
    "gender.men_only": "Nur Männer",
    "gender.queer": "Queer",
    "gender.flinta": "FLINTA",
    "gender.mixed": "",
  },
};

export function t(lang: OgLang, key: string, vars?: Record<string, string | number>): string {
  const val = translations[lang]?.[key] ?? translations.en[key] ?? key;
  if (!vars) return val;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replace(`{{${k}}}`, String(v)),
    val,
  );
}

export function tPlural(
  lang: OgLang,
  key: string,
  count: number,
): string {
  const pluralKey = count === 1 ? `${key}_one` : `${key}_other`;
  return t(lang, pluralKey, { count });
}
