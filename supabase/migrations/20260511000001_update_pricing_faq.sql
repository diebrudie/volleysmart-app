-- Update the "Is VolleySmart free?" FAQ with current pricing info
UPDATE public.faqs SET
  question = 'Is VolleySmart free?',
  answer = 'Yes — VolleySmart''s core features are completely free: create and join clubs, plan events with RSVP, generate balanced teams, and track scores in real time. We also offer a Premium tier (coming soon) that unlocks personal analytics, club stats and trends, and more. Plus, our first 100 users get Premium free forever as an early adopter reward!',
  question_es = '¿Es gratis VolleySmart?',
  answer_es = 'Sí — las funciones principales de VolleySmart son completamente gratuitas: crea y únete a clubes, planifica eventos con confirmación de asistencia, genera equipos equilibrados y registra puntajes en tiempo real. También ofrecemos un plan Premium (próximamente) que desbloquea estadísticas personales, estadísticas del club y más. ¡Además, nuestros primeros 100 usuarios obtienen Premium gratis para siempre como recompensa de usuario pionero!',
  question_de = 'Ist VolleySmart kostenlos?',
  answer_de = 'Ja — die Kernfunktionen von VolleySmart sind komplett kostenlos: Clubs erstellen und beitreten, Events mit Zusagen planen, faire Teams generieren und Ergebnisse in Echtzeit verfolgen. Wir bieten auch ein Premium-Abo (demnächst), das persönliche Statistiken, Club-Statistiken und mehr freischaltet. Außerdem erhalten unsere ersten 100 Nutzer Premium kostenlos — für immer als Early-Adopter-Belohnung!'
WHERE question = 'Is VolleySmart free?' AND page_displayed = 'homepage_faqs';
