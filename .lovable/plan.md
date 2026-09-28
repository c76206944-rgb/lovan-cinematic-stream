# Advert banner and viewer freeze fix

## What will change
- Replace the empty outlined advertisement placeholder with a finished LOVAN sponsor banner, while keeping the existing Monetag page-level ads active for ordinary viewers.
- Remove the placeholder entirely for studio staff and after the daily limit is reached.
- Consolidate signed-in account checks so each page does one shared staff lookup instead of several competing checks.
- Defer account refreshes safely after sign-in changes to prevent the viewer interface becoming unresponsive.
- Keep all ads disabled for studio staff and keep film playback isolated from ad interactions.

## Technical details
- Use one shared account state subscription across the header, app shell, title page, and download controls.
- Preserve the current 15-per-day rule and existing Monetag zones.
- The supplied Monetag zones are page-level, push, vignette, and popunder formats, not an inline banner feed. The visible space will therefore use a polished in-house banner instead of pretending an external ad loaded there.

## Verification
- Check signed-out and signed-in viewer navigation on mobile and laptop widths.
- Confirm the banner appears only for eligible viewers.
- Confirm studio staff see no banner or Monetag scripts.
- Confirm opening and leaving playback remains responsive.
