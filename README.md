# Lernzeit — German Learning App

The web MVP starts with a weekly **Learning Plan**. Users can add named learning blockers, remove them, and see their planned weekly hours. Plans are saved locally in the browser.

## Versioning

The app follows semantic versioning (`major.minor.patch`). The current version is shown in the website footer and stored in `package.json`.

- Patch: fixes and small visual changes
- Minor: new backwards-compatible features
- Major: incompatible product or data changes

Current version: **0.6.1**

Google Calendar supports secure read-only sign-in and on-demand busy-time import. Outlook secure sign-in and Apple Calendar iCalendar import are planned next.

Practice includes the first B1 vocabulary game, **Finden Sie das Gegenteil**, with Supabase-backed content maintenance in the administration area.

Signed-in practice time is accumulated into one daily calendar entry instead of creating a separate entry for every game.

Administration lists games before opening their question sets and supports reusable tab-separated `.txt` imports and exports.

Every new or restarted game session shuffles its questions into a fresh order.

The B1 game **Vergangenheitsformen der Verben** practices Präteritum and Perfekt across all six pronoun groups, highlights conjugation endings and auxiliaries, and includes dedicated verb administration with TXT import/export.

Verb stems use the normal text color while conjugation and participle endings are written in red.
