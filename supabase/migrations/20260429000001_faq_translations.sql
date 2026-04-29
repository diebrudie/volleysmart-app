-- Add translated columns for Spanish and German FAQ content
-- English remains in the existing question/answer columns

ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS question_es text,
  ADD COLUMN IF NOT EXISTS answer_es text,
  ADD COLUMN IF NOT EXISTS question_de text,
  ADD COLUMN IF NOT EXISTS answer_de text,
  ADD COLUMN IF NOT EXISTS category_es text,
  ADD COLUMN IF NOT EXISTS category_de text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HOMEPAGE FAQs — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Qué es VolleySmart?',
  answer_es = 'VolleySmart es una app gratuita para organizar partidos de voleibol. Crea un club, planifica eventos, permite que los jugadores confirmen asistencia y genera equipos equilibrados automáticamente según habilidad y posición — luego registra los resultados set por set.',
  category_es = 'General'
WHERE question = 'What is VolleySmart?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo empiezo?',
  answer_es = 'Regístrate con tu email, completa la evaluación rápida de habilidad durante el onboarding y luego crea tu propio club o únete a uno existente con un código de club. Desde ahí puedes planificar eventos e invitar a compañeros.',
  category_es = 'General'
WHERE question = 'How do I get started?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo funciona la generación de equipos?',
  answer_es = 'Cuando inicias un partido desde un evento, VolleySmart divide automáticamente a los jugadores asistentes en dos equipos equilibrados. El algoritmo considera la puntuación de habilidad y las posiciones preferidas de cada jugador para crear el enfrentamiento más justo posible. Siempre puedes ajustar los equipos manualmente después.',
  category_es = 'General'
WHERE question = 'How does team generation work?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_es = '¿Es gratis VolleySmart?',
  answer_es = 'Sí — VolleySmart es actualmente gratuito con todas las funciones incluidas. En el futuro podrían introducirse funciones premium, pero la experiencia principal siempre será accesible.',
  category_es = 'General'
WHERE question = 'Is VolleySmart free?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo usarlo en mi teléfono?',
  answer_es = 'Por supuesto. VolleySmart es una Progressive Web App (PWA) diseñada para móvil que funciona en cualquier dispositivo con navegador — iPhone, Android, tablet u ordenador. No necesitas descargar nada de la tienda de apps.',
  category_es = 'General'
WHERE question = 'Can I use it on my phone?' AND page_displayed = 'homepage_faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- HOMEPAGE FAQs — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Was ist VolleySmart?',
  answer_de = 'VolleySmart ist eine kostenlose App zum Organisieren von Volleyball-Spielen. Erstelle einen Club, plane Events, lass Spieler zusagen und generiere automatisch ausgeglichene Teams basierend auf Spielstärke und Position — dann verfolge die Ergebnisse Satz für Satz.',
  category_de = 'Allgemein'
WHERE question = 'What is VolleySmart?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_de = 'Wie fange ich an?',
  answer_de = 'Registriere dich mit deiner E-Mail, absolviere die kurze Spielstärke-Einschätzung beim Onboarding und erstelle dann deinen eigenen Club oder tritt einem bestehenden bei mit einem Club-Code. Von dort aus kannst du Events planen und Mitspieler einladen.',
  category_de = 'Allgemein'
WHERE question = 'How do I get started?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_de = 'Wie funktioniert die Teamgenerierung?',
  answer_de = 'Wenn du ein Spiel aus einem Event startest, teilt VolleySmart die teilnehmenden Spieler automatisch in zwei ausgeglichene Teams auf. Der Algorithmus berücksichtigt die Spielstärke und die bevorzugten Positionen jedes Spielers, um das fairste Matchup zu erstellen. Du kannst die Teams danach jederzeit manuell anpassen.',
  category_de = 'Allgemein'
WHERE question = 'How does team generation work?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_de = 'Ist VolleySmart kostenlos?',
  answer_de = 'Ja — VolleySmart ist derzeit kostenlos mit allen Funktionen. In Zukunft könnten Premium-Funktionen eingeführt werden, aber die Kernfunktionen bleiben immer zugänglich.',
  category_de = 'Allgemein'
WHERE question = 'Is VolleySmart free?' AND page_displayed = 'homepage_faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich es auf meinem Handy nutzen?',
  answer_de = 'Auf jeden Fall. VolleySmart ist eine mobile-first Progressive Web App (PWA), die auf jedem Gerät mit Browser funktioniert — iPhone, Android, Tablet oder Desktop. Kein App-Store-Download nötig.',
  category_de = 'Allgemein'
WHERE question = 'Can I use it on my phone?' AND page_displayed = 'homepage_faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Getting Started — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Cómo creo una cuenta?',
  answer_es = 'Toca **Registrarse** en la página de inicio e ingresa tu email y contraseña. Recibirás un email de confirmación — haz clic en el enlace para verificar tu cuenta y luego completa el flujo de onboarding.',
  category_es = 'Primeros pasos'
WHERE question = 'How do I create an account?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Qué es la evaluación de habilidad?',
  answer_es = 'Durante el onboarding respondes algunas preguntas sobre tu experiencia en voleibol, frecuencia de juego y nivel auto-evaluado. VolleySmart usa tus respuestas para calcular una puntuación de habilidad inicial, que ayuda al generador de equipos a crear partidos equilibrados.',
  category_es = 'Primeros pasos'
WHERE question = 'What is the skill assessment?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo creo un club?',
  answer_es = 'Después de iniciar sesión, ve a la pestaña **Clubs** y toca **Crear Club**. Dale un nombre a tu club, opcionalmente agrega una descripción y ciudad, y comparte el código de club auto-generado con tus compañeros para que puedan unirse.',
  category_es = 'Primeros pasos'
WHERE question = 'How do I create a club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo me uno a un club existente?',
  answer_es = 'Ve a **Clubs** → **Unirse a Club** e ingresa el código de club que recibiste del administrador. Tu solicitud se envía al admin para aprobación — recibirás una notificación cuando seas aceptado.',
  category_es = 'Primeros pasos'
WHERE question = 'How do I join an existing club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo estar en varios clubs?',
  answer_es = 'Sí. Puedes crear o unirte a tantos clubs como quieras. Los eventos, miembros y partidos se organizan por club, así que todo se mantiene separado.',
  category_es = 'Primeros pasos'
WHERE question = 'Can I be in multiple clubs?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Getting Started — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Wie erstelle ich ein Konto?',
  answer_de = 'Tippe auf **Registrieren** auf der Startseite und gib deine E-Mail und ein Passwort ein. Du erhältst eine Bestätigungs-E-Mail — klicke auf den Link, um dein Konto zu verifizieren, und absolviere dann den Onboarding-Prozess.',
  category_de = 'Erste Schritte'
WHERE question = 'How do I create an account?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Was ist die Spielstärke-Einschätzung?',
  answer_de = 'Beim Onboarding beantwortest du einige Fragen zu deiner Volleyball-Erfahrung, Spielhäufigkeit und Selbsteinschätzung. VolleySmart nutzt deine Antworten, um eine initiale Spielstärke zu berechnen, die dem Team-Generator hilft, ausgeglichene Spiele zu erstellen.',
  category_de = 'Erste Schritte'
WHERE question = 'What is the skill assessment?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie erstelle ich einen Club?',
  answer_de = 'Nach dem Einloggen gehe zum **Clubs**-Tab und tippe auf **Club erstellen**. Gib deinem Club einen Namen, optional eine Beschreibung und Stadt, und teile den automatisch generierten Club-Code mit deinen Mitspielern, damit sie beitreten können.',
  category_de = 'Erste Schritte'
WHERE question = 'How do I create a club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie trete ich einem bestehenden Club bei?',
  answer_de = 'Gehe zu **Clubs** → **Club beitreten** und gib den Club-Code ein, den du vom Admin erhalten hast. Deine Anfrage wird an den Admin zur Genehmigung gesendet — du erhältst eine Benachrichtigung, sobald du akzeptiert wirst.',
  category_de = 'Erste Schritte'
WHERE question = 'How do I join an existing club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich in mehreren Clubs sein?',
  answer_de = 'Ja. Du kannst so viele Clubs erstellen oder beitreten, wie du möchtest. Events, Mitglieder und Spiele sind pro Club organisiert, sodass alles getrennt bleibt.',
  category_de = 'Erste Schritte'
WHERE question = 'Can I be in multiple clubs?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Events & RSVP — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Cómo creo un evento?',
  answer_es = 'Desde la pestaña **Eventos**, toca el botón **+**. Elige un tipo de evento, selecciona tu club, establece la fecha, hora de inicio, hora de fin y ubicación, y publica. Todos los miembros del club serán notificados automáticamente.',
  category_es = 'Eventos y asistencia'
WHERE question = 'How do I create an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Qué tipos de eventos están disponibles?',
  answer_es = 'Puedes crear tres tipos de eventos:

- **Entrenamiento** — sesiones de práctica informales
- **Partido amistoso** — juegos informales entre jugadores
- **Partido de liga** — partidos competitivos y organizados',
  category_es = 'Eventos y asistencia'
WHERE question = 'What event types are available?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo funciona la asistencia (RSVP)?',
  answer_es = 'Abre cualquier evento y toca **Voy** o **No voy**. La página del evento muestra el conteo de asistentes en vivo y la lista. El creador del evento y todos los miembros del club pueden ver quién ha respondido.',
  category_es = 'Eventos y asistencia'
WHERE question = 'How does RSVP work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo establecer una fecha límite de asistencia?',
  answer_es = 'Sí. Al crear o editar un evento puedes establecer una fecha límite de asistencia opcional. Los jugadores que no hayan respondido recibirán una notificación de recordatorio el día de la fecha límite.',
  category_es = 'Eventos y asistencia'
WHERE question = 'Can I set an RSVP deadline?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo cancelo un evento?',
  answer_es = 'Abre el evento, toca el **menú de tres puntos** (esquina superior derecha) y selecciona **Cancelar evento**. Todos los miembros del club serán notificados de que el evento ha sido cancelado. Los eventos cancelados se mantienen como referencia pero están claramente marcados.',
  category_es = 'Eventos y asistencia'
WHERE question = 'How do I cancel an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo compartir un evento?',
  answer_es = 'Sí. Toca el **menú de tres puntos** en cualquier evento y selecciona **Compartir evento**. Un mensaje con un enlace al evento se comparte a través de la opción de compartir de tu dispositivo (o se copia al portapapeles). El mensaje se adapta según si el partido ha empezado o ya terminó.',
  category_es = 'Eventos y asistencia'
WHERE question = 'Can I share an event?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Events & RSVP — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Wie erstelle ich ein Event?',
  answer_de = 'Vom **Events**-Tab aus, tippe auf den **+**-Button. Wähle einen Event-Typ, wähle deinen Club, setze Datum, Startzeit, Endzeit und Ort fest und veröffentliche. Alle Club-Mitglieder werden automatisch benachrichtigt.',
  category_de = 'Events und Zusagen'
WHERE question = 'How do I create an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Welche Event-Typen gibt es?',
  answer_de = 'Du kannst drei Arten von Events erstellen:

- **Training** — informelle Trainingseinheiten
- **Freundschaftsspiel** — informelle Spiele zwischen Spielern
- **Ligaspiel** — organisierte Wettbewerbsspiele',
  category_de = 'Events und Zusagen'
WHERE question = 'What event types are available?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie funktionieren Zusagen (RSVP)?',
  answer_de = 'Öffne ein Event und tippe auf **Dabei** oder **Nicht dabei**. Die Event-Seite zeigt die aktuelle Teilnehmerzahl und -liste. Der Event-Ersteller und alle Club-Mitglieder können sehen, wer geantwortet hat.',
  category_de = 'Events und Zusagen'
WHERE question = 'How does RSVP work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich eine Zusage-Frist setzen?',
  answer_de = 'Ja. Beim Erstellen oder Bearbeiten eines Events kannst du eine optionale Zusage-Frist festlegen. Spieler, die nicht geantwortet haben, erhalten am Fristtag eine Erinnerungs-Benachrichtigung.',
  category_de = 'Events und Zusagen'
WHERE question = 'Can I set an RSVP deadline?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie storniere ich ein Event?',
  answer_de = 'Öffne das Event, tippe auf das **Drei-Punkte-Menü** (oben rechts) und wähle **Event absagen**. Alle Club-Mitglieder werden benachrichtigt, dass das Event abgesagt wurde. Abgesagte Events bleiben als Referenz erhalten, sind aber deutlich markiert.',
  category_de = 'Events und Zusagen'
WHERE question = 'How do I cancel an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich ein Event teilen?',
  answer_de = 'Ja. Tippe auf das **Drei-Punkte-Menü** bei jedem Event und wähle **Event teilen**. Eine vorgefertigte Nachricht mit einem Link zum Event wird über die Teilen-Funktion deines Geräts geteilt (oder in die Zwischenablage kopiert). Die Nachricht passt sich an, je nachdem ob das Spiel gestartet oder bereits beendet ist.',
  category_de = 'Events und Zusagen'
WHERE question = 'Can I share an event?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Games & Teams — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Cómo inicio un partido desde un evento?',
  answer_es = 'Abre el evento y toca **Iniciar partido** (visible para el creador del evento cuando al menos 4 jugadores asisten). VolleySmart crea los equipos automáticamente y te lleva a la página del partido donde puedes registrar los resultados.',
  category_es = 'Partidos y equipos'
WHERE question = 'How do I start a game from an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo funciona la generación automática de equipos?',
  answer_es = 'El algoritmo toma a todos los jugadores asistentes, considera sus puntuaciones de habilidad y posiciones preferidas, y los distribuye en dos equipos equilibrados. El objetivo es hacer que ambos lados sean lo más iguales posible en fuerza general y cobertura posicional.',
  category_es = 'Partidos y equipos'
WHERE question = 'How does automatic team generation work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo editar los equipos después de generarlos?',
  answer_es = 'Sí. En la página del partido, toca el **menú de tres puntos** y selecciona **Editar equipos**. Puedes intercambiar jugadores entre equipos o ajustar posiciones. Cualquier jugador del equipo que asiste al partido puede hacer esto, no solo el creador.',
  category_es = 'Partidos y equipos'
WHERE question = 'Can I edit teams after they''re generated?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo registro los resultados?',
  answer_es = 'En la página del partido verás cajas de set para cada set. Toca una caja de set para ingresar o actualizar el resultado de ambos equipos. También puedes usar la tabla **Editar resultados** para una vista completa. Los resultados se guardan automáticamente.',
  category_es = 'Partidos y equipos'
WHERE question = 'How do I track scores?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cualquier jugador puede editar resultados durante un partido?',
  answer_es = 'Sí. Cualquier jugador que esté en uno de los equipos puede agregar resultados, editar resultados existentes y agregar nuevos sets. No necesitas ser el creador del evento ni administrador del club — todos los jugadores del equipo tienen acceso completo de edición durante el partido.',
  category_es = 'Partidos y equipos'
WHERE question = 'Can any player edit scores during a game?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo agrego jugadores invitados?',
  answer_es = 'En la pantalla de **Editar equipos**, usa el selector de invitados para buscar jugadores invitados existentes o escribe un nombre nuevo para crear uno sobre la marcha. Los invitados son jugadores temporales que no necesitan una cuenta de VolleySmart.',
  category_es = 'Partidos y equipos'
WHERE question = 'How do I add guest players?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Games & Teams — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Wie starte ich ein Spiel aus einem Event?',
  answer_de = 'Öffne das Event und tippe auf **Spiel starten** (sichtbar für den Event-Ersteller, wenn mindestens 4 Spieler teilnehmen). VolleySmart erstellt die Teams automatisch und navigiert dich zur Spielseite, wo du die Ergebnisse verfolgen kannst.',
  category_de = 'Spiele und Teams'
WHERE question = 'How do I start a game from an event?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie funktioniert die automatische Teamgenerierung?',
  answer_de = 'Der Algorithmus nimmt alle teilnehmenden Spieler, berücksichtigt ihre Spielstärken und bevorzugten Positionen und verteilt sie auf zwei ausgeglichene Teams. Das Ziel ist es, beide Seiten in Gesamtstärke und Positionsabdeckung so gleich wie möglich zu machen.',
  category_de = 'Spiele und Teams'
WHERE question = 'How does automatic team generation work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich Teams nach der Generierung bearbeiten?',
  answer_de = 'Ja. Auf der Spielseite tippe auf das **Drei-Punkte-Menü** und wähle **Teams bearbeiten**. Du kannst Spieler zwischen Teams tauschen oder Positionen anpassen. Jeder Teamsspieler, der am Spiel teilnimmt, kann dies tun, nicht nur der Ersteller.',
  category_de = 'Spiele und Teams'
WHERE question = 'Can I edit teams after they''re generated?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie verfolge ich Ergebnisse?',
  answer_de = 'Auf der Spielseite siehst du Set-Boxen für jeden Satz. Tippe auf eine Set-Box, um das Ergebnis für beide Teams einzugeben oder zu aktualisieren. Du kannst auch die Tabelle **Ergebnisse bearbeiten** für eine vollständige Übersicht nutzen. Ergebnisse werden automatisch gespeichert.',
  category_de = 'Spiele und Teams'
WHERE question = 'How do I track scores?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann jeder Spieler während eines Spiels Ergebnisse bearbeiten?',
  answer_de = 'Ja. Jeder Spieler, der in einem der Teams ist, kann Ergebnisse hinzufügen, bestehende Ergebnisse bearbeiten und neue Sätze hinzufügen. Du musst nicht der Event-Ersteller oder Club-Admin sein — alle Teamspieler haben vollen Bearbeitungszugriff während des Spiels.',
  category_de = 'Spiele und Teams'
WHERE question = 'Can any player edit scores during a game?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie füge ich Gastspieler hinzu?',
  answer_de = 'Auf dem **Teams bearbeiten**-Bildschirm verwende den Gast-Selektor, um nach bestehenden Gastspielern zu suchen oder tippe einen neuen Namen ein, um spontan einen zu erstellen. Gäste sind temporäre Spieler, die kein VolleySmart-Konto benötigen.',
  category_de = 'Spiele und Teams'
WHERE question = 'How do I add guest players?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Clubs & Members — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Cómo gestiono los miembros del club?',
  answer_es = 'Ve a la página de tu club y desplázate a la sección de miembros. Los admins pueden entrar en **Modo gestión** para seleccionar y eliminar miembros. También puedes ver todos los miembros de tus clubs desde la pestaña **Miembros**.',
  category_es = 'Clubs y miembros'
WHERE question = 'How do I manage club members?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo funcionan las solicitudes de membresía?',
  answer_es = 'Cuando alguien ingresa tu código de club, su solicitud aparece en la página **Gestionar solicitudes** (visible solo para admins). Puedes aprobar o rechazar cada solicitud. El solicitante recibe una notificación en cualquier caso.',
  category_es = 'Clubs y miembros'
WHERE question = 'How do membership requests work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Un usuario rechazado puede volver a solicitar?',
  answer_es = 'Sí. Si una solicitud de membresía es rechazada, el usuario puede enviar una nueva solicitud para el mismo club. El rechazo anterior se borra y el admin ve la solicitud nueva.',
  category_es = 'Clubs y miembros'
WHERE question = 'Can a rejected user request again?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo eliminar un miembro de mi club?',
  answer_es = 'Sí. En la página del club, entra en **Modo gestión**, selecciona los miembros que quieres eliminar y confirma. Los miembros eliminados pueden solicitar unirse de nuevo más tarde.',
  category_es = 'Clubs y miembros'
WHERE question = 'Can I remove a member from my club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Qué pueden hacer los administradores del club?',
  answer_es = 'Los administradores del club pueden:

- Aprobar o rechazar solicitudes de membresía
- Eliminar miembros del club
- Editar configuración del club (nombre, descripción, ciudad)
- Crear y gestionar eventos
- Iniciar partidos desde eventos',
  category_es = 'Clubs y miembros'
WHERE question = 'What can club admins do?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Clubs & Members — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Wie verwalte ich Club-Mitglieder?',
  answer_de = 'Gehe zur Übersichtsseite deines Clubs und scrolle zum Mitglieder-Bereich. Admins können den **Verwaltungsmodus** aktivieren, um Mitglieder auszuwählen und zu entfernen. Du kannst auch alle Mitglieder über alle Clubs hinweg im **Mitglieder**-Tab einsehen.',
  category_de = 'Clubs und Mitglieder'
WHERE question = 'How do I manage club members?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie funktionieren Mitgliedschaftsanfragen?',
  answer_de = 'Wenn jemand deinen Club-Code eingibt, erscheint die Anfrage auf der Seite **Anfragen verwalten** (nur für Admins sichtbar). Du kannst jede Anfrage genehmigen oder ablehnen. Der Antragsteller erhält in jedem Fall eine Benachrichtigung.',
  category_de = 'Clubs und Mitglieder'
WHERE question = 'How do membership requests work?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ein abgelehnter Nutzer erneut anfragen?',
  answer_de = 'Ja. Wenn eine Mitgliedschaftsanfrage abgelehnt wird, kann der Nutzer eine neue Anfrage für denselben Club senden. Die vorherige Ablehnung wird gelöscht und der Admin sieht die neue Anfrage.',
  category_de = 'Clubs und Mitglieder'
WHERE question = 'Can a rejected user request again?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich ein Mitglied aus meinem Club entfernen?',
  answer_de = 'Ja. Auf der Club-Übersichtsseite aktiviere den **Verwaltungsmodus**, wähle die Mitglieder aus, die du entfernen möchtest, und bestätige. Entfernte Mitglieder können später erneut beitreten.',
  category_de = 'Clubs und Mitglieder'
WHERE question = 'Can I remove a member from my club?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Was können Club-Admins tun?',
  answer_de = 'Club-Admins können:

- Mitgliedschaftsanfragen genehmigen oder ablehnen
- Mitglieder aus dem Club entfernen
- Club-Einstellungen bearbeiten (Name, Beschreibung, Stadt)
- Events erstellen und verwalten
- Spiele aus Events starten',
  category_de = 'Clubs und Mitglieder'
WHERE question = 'What can club admins do?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Notifications — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Qué notificaciones recibiré?',
  answer_es = 'Recibirás notificaciones sobre:

- Nuevos eventos creados en tus clubs
- Cancelaciones de eventos
- Respuestas de asistencia de otros jugadores
- Recordatorios de fecha límite de asistencia
- Solicitudes de membresía (solo admins)
- Aprobaciones y rechazos de solicitudes
- Nuevos miembros que se unen a tu club
- Partidos que comienzan desde eventos',
  category_es = 'Notificaciones'
WHERE question = 'What notifications will I receive?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo marco las notificaciones como leídas?',
  answer_es = 'Abre la página de **Notificaciones** tocando el icono de campana. Tocar cualquier notificación la marca como leída y te lleva a la página relevante. También puedes tocar **Leer todo** para marcar todo como leído de una vez.',
  category_es = 'Notificaciones'
WHERE question = 'How do I mark notifications as read?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Notifications — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Welche Benachrichtigungen erhalte ich?',
  answer_de = 'Du wirst benachrichtigt über:

- Neue Events in deinen Clubs
- Event-Absagen
- Zusage-Antworten anderer Spieler
- Erinnerungen an Zusage-Fristen
- Mitgliedschaftsanfragen (nur Admins)
- Genehmigungen und Ablehnungen von Anfragen
- Neue Mitglieder, die deinem Club beitreten
- Spiele, die aus Events gestartet werden',
  category_de = 'Benachrichtigungen'
WHERE question = 'What notifications will I receive?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie markiere ich Benachrichtigungen als gelesen?',
  answer_de = 'Öffne die **Benachrichtigungen**-Seite durch Tippen auf das Glocken-Symbol. Das Tippen auf eine Benachrichtigung markiert sie als gelesen und navigiert dich zur relevanten Seite. Du kannst auch auf **Alle lesen** tippen, um alles auf einmal als gelesen zu markieren.',
  category_de = 'Benachrichtigungen'
WHERE question = 'How do I mark notifications as read?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Account & Profile — Spanish
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_es = '¿Cómo edito mi perfil?',
  answer_es = 'Toca tu **avatar** en la esquina superior izquierda para ir a tu página de perfil. Activa el **Modo edición** para actualizar tu nombre, posiciones y foto de perfil.',
  category_es = 'Cuenta y perfil'
WHERE question = 'How do I edit my profile?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Puedo eliminar mi cuenta?',
  answer_es = 'Sí, desde tu página de perfil. Sin embargo, si eres el administrador de un club con 2 o más miembros, necesitarás transferir los derechos de admin o eliminar miembros primero antes de poder eliminar tu cuenta.',
  category_es = 'Cuenta y perfil'
WHERE question = 'Can I delete my account?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_es = '¿Cómo cambio entre modo oscuro y claro?',
  answer_es = 'Abre el **menú** (icono de hamburguesa en la esquina superior derecha) y cambia el tema. Tu preferencia se guarda automáticamente.',
  category_es = 'Cuenta y perfil'
WHERE question = 'How do I switch between dark and light mode?' AND page_displayed = 'faqs';

-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs — Account & Profile — German
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.faqs SET
  question_de = 'Wie bearbeite ich mein Profil?',
  answer_de = 'Tippe auf deinen **Avatar** in der oberen linken Ecke, um zu deiner Profilseite zu gelangen. Aktiviere den **Bearbeitungsmodus**, um deinen Namen, Positionen und dein Profilbild zu aktualisieren.',
  category_de = 'Konto und Profil'
WHERE question = 'How do I edit my profile?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Kann ich mein Konto löschen?',
  answer_de = 'Ja, von deiner Profilseite aus. Wenn du jedoch Admin eines Clubs mit 2 oder mehr Mitgliedern bist, musst du zuerst die Admin-Rechte übertragen oder Mitglieder entfernen, bevor du dein Konto löschen kannst.',
  category_de = 'Konto und Profil'
WHERE question = 'Can I delete my account?' AND page_displayed = 'faqs';

UPDATE public.faqs SET
  question_de = 'Wie wechsle ich zwischen hellem und dunklem Modus?',
  answer_de = 'Öffne das **Menü** (Hamburger-Symbol oben rechts) und wechsle das Thema. Deine Einstellung wird automatisch gespeichert.',
  category_de = 'Konto und Profil'
WHERE question = 'How do I switch between dark and light mode?' AND page_displayed = 'faqs';
