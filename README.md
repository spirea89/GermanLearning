# Lernzeit — German Learning App

The web MVP starts with a weekly **Learning Plan**. Users can add named learning blockers, remove them, and see their planned weekly hours. Plans are saved locally in the browser.

## Versioning

The app follows semantic versioning (`major.minor.patch`). The current version is shown in the website footer and stored in `package.json`.

- Patch: fixes and small visual changes
- Minor: new backwards-compatible features
- Major: incompatible product or data changes

Current version: **0.2.0**

Calendar provider buttons currently explain the planned integration. Production Google and Outlook synchronization will require OAuth credentials and a backend; Apple Calendar will use an iCalendar feed or file.
