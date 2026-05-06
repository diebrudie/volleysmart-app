-- Add skill score FAQs to the Account & Profile category

INSERT INTO public.faqs (
  question, answer,
  question_es, answer_es,
  question_de, answer_de,
  category, group_label,
  category_es, category_de,
  page_displayed, sort_order
) VALUES

(
  'Who can see my skill score?',
  'Only you can see your skill score — it is completely private and personal. No one else, not even club admins or other club members, can see it. The score is used behind the scenes by the team generator to create balanced matchups, but the actual number is never shown to anyone but you.',
  '¿Quién puede ver mi puntuación de habilidad?',
  'Solo tú puedes ver tu puntuación de habilidad — es completamente privada y personal. Nadie más, ni siquiera los administradores u otros miembros del club, puede verla. La puntuación se usa internamente por el generador de equipos para crear enfrentamientos equilibrados, pero el número real nunca se muestra a nadie más que a ti.',
  'Wer kann meinen Skill-Score sehen?',
  'Nur du kannst deinen Skill-Score sehen — er ist vollständig privat und persönlich. Niemand sonst, auch keine Club-Admins oder andere Clubmitglieder, kann ihn sehen. Der Score wird im Hintergrund vom Teamgenerator verwendet, um ausgeglichene Spiele zu erstellen, aber die tatsächliche Zahl wird niemandem außer dir angezeigt.',
  'Account & Profile', 'Account & Profile',
  'Cuenta y perfil', 'Konto & Profil',
  'faqs', 53
),

(
  'Can I change my skill score after onboarding?',
  'You cannot manually edit your skill score — it''s calculated automatically. The initial score is set during onboarding based on your self-assessment. After that, it improves over time as you play more games, so it reflects your actual playing activity rather than a self-reported number.',
  '¿Puedo cambiar mi puntuación de habilidad después del onboarding?',
  'No puedes editar manualmente tu puntuación de habilidad — se calcula automáticamente. La puntuación inicial se establece durante el onboarding según tu autoevaluación. Después, mejora con el tiempo a medida que juegas más partidos, reflejando tu actividad real en lugar de un número autorreportado.',
  'Kann ich meinen Skill-Score nach dem Onboarding ändern?',
  'Du kannst deinen Skill-Score nicht manuell bearbeiten — er wird automatisch berechnet. Der anfängliche Score wird beim Onboarding basierend auf deiner Selbsteinschätzung festgelegt. Danach verbessert er sich im Laufe der Zeit, je mehr Spiele du spielst, und spiegelt so deine tatsächliche Spielaktivität wider.',
  'Account & Profile', 'Account & Profile',
  'Cuenta y perfil', 'Konto & Profil',
  'faqs', 54
),

(
  'How does my skill score change over time? Can it decrease?',
  'Your skill score can only go up, never down. It starts with your onboarding assessment (up to 75 points) and then a gameplay bonus is added based on three factors: **number of games played** (the more you play, the higher the bonus), **win rate** (after at least 5 games), and **total hours played**. The bonus can add up to 15 extra points. Your score is recalculated each time you visit your profile, so keep playing to see it grow!',
  '¿Cómo cambia mi puntuación de habilidad con el tiempo? ¿Puede bajar?',
  'Tu puntuación de habilidad solo puede subir, nunca bajar. Comienza con tu evaluación del onboarding (hasta 75 puntos) y luego se añade un bonus por juego basado en tres factores: **cantidad de partidos jugados** (cuantos más juegues, mayor el bonus), **porcentaje de victorias** (después de al menos 5 partidos) y **horas totales jugadas**. El bonus puede sumar hasta 15 puntos extra. Tu puntuación se recalcula cada vez que visitas tu perfil, ¡así que sigue jugando para verla crecer!',
  'Wie verändert sich mein Skill-Score im Laufe der Zeit? Kann er sinken?',
  'Dein Skill-Score kann nur steigen, nie sinken. Er beginnt mit deiner Onboarding-Bewertung (bis zu 75 Punkte) und dann wird ein Spielbonus hinzugefügt, basierend auf drei Faktoren: **Anzahl der gespielten Spiele** (je mehr du spielst, desto höher der Bonus), **Gewinnrate** (nach mindestens 5 Spielen) und **gespielte Stunden insgesamt**. Der Bonus kann bis zu 15 zusätzliche Punkte bringen. Dein Score wird jedes Mal neu berechnet, wenn du dein Profil besuchst — also spiel weiter und sieh zu, wie er wächst!',
  'Account & Profile', 'Account & Profile',
  'Cuenta y perfil', 'Konto & Profil',
  'faqs', 55
);
