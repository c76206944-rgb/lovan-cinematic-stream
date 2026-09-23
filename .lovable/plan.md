# Upload status, profile language, and badge

## What will change
- Add a clear status panel in the upload studio with separate video upload, poster upload, validation, and catalogue save stages.
- Keep successfully uploaded files available after a later step fails, show the failed stage and error, and provide a Retry action with live progress.
- Return and display the matching catalogue record when either an upload-key retry or a title/episode duplicate is detected, with a direct link to edit it.
- Add a preferred AI language setting to Profile and pass that saved choice into metadata enrichment so synopsis and explanatory text use the viewer's selected language while names and controlled genre labels remain accurate.
- Hide the Lovable badge on published deployments.

## Technical details
- Use the existing upload-key idempotency and cached uploaded paths, extending save responses to include a safe existing-record summary.
- Track each operation as idle, active, complete, or failed so retries resume from completed file stages instead of re-uploading them.
- Persist the language preference in the signed-in user's profile data with a secure owner-only policy, then read it in the upload studio.
- Preserve server-side staff checks, file validation, duplicate guarantees, and the existing AI review-before-apply workflow.

## Verification
- Check movie and episode duplicate paths, a failed upload/save followed by Retry, profile-language AI requests, mobile layout, route health, and the latest build report.
