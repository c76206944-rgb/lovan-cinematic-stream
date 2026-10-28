# Offline viewing
- [ ] Fix the blank cold offline opening by explicitly mounting the saved-downloads screen and verify playback with the connection disabled.
- [x] Correct the offline entry build configuration causing the app manifest failure; retain one Start entry and test static shell emission.
- [x] Enable downloads for every published title with an uploaded video.
- [x] Add a preview-safe offline app that opens saved downloads without data.
- [x] Verify local playback/removal with network disabled, eligibility/no-expiry tests, and zero preview workers.
- [ ] Verify cold reopening offline after publishing and an initial connected visit; blocked on publication.
- [ ] Verify signed-in acquisition from an actual catalogue video; blocked on an available preview account session.