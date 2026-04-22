-- Migration: Replace all FAQ content with up-to-date questions and answers
-- Reflects current app features: events, RSVP, game flow, notifications, clubs, etc.

DELETE FROM public.faqs;

-- ═══════════════════════════════════════════════════════════════════════════════
-- HOMEPAGE FAQs (landing page — short, high-level)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('What is VolleySmart?',
'VolleySmart is a free app for organizing volleyball games. Create a club, plan events, let players RSVP, and automatically generate balanced teams based on skill and position — then track scores set by set.',
'General', 'General', 'homepage_faqs', 1),

('How do I get started?',
'Sign up with your email, complete the quick skill assessment during onboarding, then create your own club or join an existing one using a club code. From there you can start planning events and inviting teammates.',
'General', 'General', 'homepage_faqs', 2),

('How does team generation work?',
'When you start a game from an event, VolleySmart automatically splits the attending players into two balanced teams. The algorithm considers each player''s skill rating and preferred positions to create the fairest matchup possible. You can always adjust teams manually afterwards.',
'General', 'General', 'homepage_faqs', 3),

('Is VolleySmart free?',
'Yes — VolleySmart is currently free to use with all features included. Premium features may be introduced in the future, but the core experience will always remain accessible.',
'General', 'General', 'homepage_faqs', 4),

('Can I use it on my phone?',
'Absolutely. VolleySmart is a mobile-first Progressive Web App (PWA) that works on any device with a browser — iPhone, Android, tablet, or desktop. No app store download needed.',
'General', 'General', 'homepage_faqs', 5);


-- ═══════════════════════════════════════════════════════════════════════════════
-- FULL FAQs PAGE (categorized, detailed)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Getting Started ────────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('How do I create an account?',
'Tap **Sign Up** on the landing page and enter your email and a password. You''ll receive a confirmation email — click the link to verify your account, then complete the onboarding flow.',
'Getting Started', 'Getting Started', 'faqs', 1),

('What is the skill assessment?',
'During onboarding you answer a few questions about your volleyball experience, playing frequency, and self-assessed ability. VolleySmart uses your answers to calculate an initial skill score, which helps the team generator create balanced matchups.',
'Getting Started', 'Getting Started', 'faqs', 2),

('How do I create a club?',
'After signing in, go to the **Clubs** tab and tap **Create Club**. Give your club a name, optionally add a description and city, then share the auto-generated club code with your teammates so they can join.',
'Getting Started', 'Getting Started', 'faqs', 3),

('How do I join an existing club?',
'Go to **Clubs** → **Join Club** and enter the club code you received from the club admin. Your request is sent to the admin for approval — you''ll get a notification once accepted.',
'Getting Started', 'Getting Started', 'faqs', 4),

('Can I be in multiple clubs?',
'Yes. You can create or join as many clubs as you like. Events, members, and games are organized per club, so everything stays separate.',
'Getting Started', 'Getting Started', 'faqs', 5);


-- ─── Events & RSVP ─────────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('How do I create an event?',
'From the **Events** tab, tap the **+** button. Choose an event type, select your club, set the date, start time, end time, and location, then publish. All club members are notified automatically.',
'Events & RSVP', 'Events & RSVP', 'faqs', 10),

('What event types are available?',
'You can create three types of events:

- **Practice** — casual training sessions
- **Friendly Match** — informal games between players
- **League Match** — competitive, organized matches',
'Events & RSVP', 'Events & RSVP', 'faqs', 11),

('How does RSVP work?',
'Open any event and tap **Going** or **Not Going**. The event page shows the live attendee count and list. The event creator and all club members can see who has responded.',
'Events & RSVP', 'Events & RSVP', 'faqs', 12),

('Can I set an RSVP deadline?',
'Yes. When creating or editing an event you can set an optional RSVP deadline. Players who haven''t responded will receive a reminder notification on the deadline day.',
'Events & RSVP', 'Events & RSVP', 'faqs', 13),

('How do I cancel an event?',
'Open the event, tap the **three-dot menu** (top right), and select **Cancel Event**. All club members will be notified that the event has been cancelled. Cancelled events are kept for reference but clearly marked.',
'Events & RSVP', 'Events & RSVP', 'faqs', 14),

('Can I share an event?',
'Yes. Tap the **three-dot menu** on any event and select **Share Event**. A pre-written message with a link to the event is shared via your device''s share sheet (or copied to clipboard). The message adapts depending on whether the game has started or already finished.',
'Events & RSVP', 'Events & RSVP', 'faqs', 15);


-- ─── Games & Teams ──────────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('How do I start a game from an event?',
'Open the event and tap **Start Game** (visible to the event creator when at least 4 players are attending). VolleySmart creates teams automatically and navigates you to the game page where you can track scores.',
'Games & Teams', 'Games & Teams', 'faqs', 20),

('How does automatic team generation work?',
'The algorithm takes all attending players, considers their skill ratings and preferred positions, and distributes them into two balanced teams. The goal is to make both sides as equal as possible in overall strength and positional coverage.',
'Games & Teams', 'Games & Teams', 'faqs', 21),

('Can I edit teams after they''re generated?',
'Yes. On the game page, tap the **three-dot menu** and select **Edit Teams**. You can swap players between teams or adjust positions. Any team player who is attending the game can do this, not just the creator.',
'Games & Teams', 'Games & Teams', 'faqs', 22),

('How do I track scores?',
'On the game page you''ll see set boxes for each set. Tap a set box to enter or update the score for both teams. You can also use the **Edit Match Scores** table for a full overview. Scores auto-save.',
'Games & Teams', 'Games & Teams', 'faqs', 23),

('Can any player edit scores during a game?',
'Yes. Any player who is on one of the teams can add scores, edit existing scores, and add new sets. You don''t need to be the event creator or a club admin — all team players have full editing access during the game.',
'Games & Teams', 'Games & Teams', 'faqs', 24),

('How do I add guest players?',
'On the **Edit Teams** screen, use the guest selector to search for existing guest players or type a new name to create one on the fly. Guests are temporary players who don''t need a VolleySmart account.',
'Games & Teams', 'Games & Teams', 'faqs', 25);


-- ─── Clubs & Members ────────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('How do I manage club members?',
'Go to your club''s overview page and scroll to the members section. Admins can enter **Manage Mode** to select and remove members. You can also view all members across your clubs from the **Members** tab.',
'Clubs & Members', 'Clubs & Members', 'faqs', 30),

('How do membership requests work?',
'When someone enters your club code, their request appears on the **Manage Requests** page (visible to admins only). You can approve or reject each request. The requester receives a notification either way.',
'Clubs & Members', 'Clubs & Members', 'faqs', 31),

('Can a rejected user request again?',
'Yes. If a membership request is rejected, the user can submit a new request for the same club. The previous rejection is cleared and the admin sees the fresh request.',
'Clubs & Members', 'Clubs & Members', 'faqs', 32),

('Can I remove a member from my club?',
'Yes. On the club overview page, enter **Manage Mode**, select the members you want to remove, and confirm. Removed members can request to rejoin later.',
'Clubs & Members', 'Clubs & Members', 'faqs', 33),

('What can club admins do?',
'Club admins can:

- Approve or reject membership requests
- Remove members from the club
- Edit club settings (name, description, city)
- Create and manage events
- Start games from events',
'Clubs & Members', 'Clubs & Members', 'faqs', 34);


-- ─── Notifications ──────────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('What notifications will I receive?',
'You''ll be notified about:

- New events created in your clubs
- Event cancellations
- RSVP responses from other players
- RSVP deadline reminders
- Membership requests (admins only)
- Request approvals and rejections
- New members joining your club
- Games starting from events',
'Notifications', 'Notifications', 'faqs', 40),

('How do I mark notifications as read?',
'Open the **Notifications** page by tapping the bell icon. Tapping any notification marks it as read and navigates you to the relevant page. You can also tap **Read all** to mark everything as read at once.',
'Notifications', 'Notifications', 'faqs', 41);


-- ─── Account & Profile ──────────────────────────────────────────────────────

INSERT INTO public.faqs (question, answer, category, group_label, page_displayed, sort_order) VALUES

('How do I edit my profile?',
'Tap your **avatar** in the top-left corner to go to your profile page. Toggle **Edit Mode** to update your name, positions, and profile picture.',
'Account & Profile', 'Account & Profile', 'faqs', 50),

('Can I delete my account?',
'Yes, from your profile page. However, if you are the admin of a club with 2 or more members, you''ll need to transfer admin rights or remove members first before you can delete your account.',
'Account & Profile', 'Account & Profile', 'faqs', 51),

('How do I switch between dark and light mode?',
'Open the **menu** (hamburger icon in the top-right corner) and toggle the theme switch. Your preference is saved automatically.',
'Account & Profile', 'Account & Profile', 'faqs', 52);
