# LOVAN

**LOVAN — Global Cinematic Streaming Platform**  

Single consolidated specification (ready for implementation)

### Product

LOVAN is a worldwide legal streaming service for movies, series, documentaries, short films and other audiovisual content. It works with filmmakers, producers, distributors, studios and authorized rights holders.  

Countries are metadata only. Availability is determined solely by the rights held for each territory. The platform is never described as regional or continent-specific in UI, copy, SEO or sample data.

### Visual Identity (non-negotiable)

- Near-black background, deep charcoal surfaces, warm ivory text  

- Single accent: warm saffron amber `#F2A93B`  

- Large cinematic imagery, restrained radii (6–10 px), 1 px low-contrast borders, almost no shadows  

- Modern geometric sans (Sora / Outfit / Plus Jakarta Sans)  

- Public site = cinematic product; Admin = dense professional media-management tool  

- No copied Netflix / MUBI / Disney+ / Prime layouts, colors or assets  

- Zero emojis, zero em/en dashes, zero banned marketing phrases, zero decorative icons, zero gradient text / glassmorphism / identical icon-title-text cards

### Tech Stack

React + TypeScript + Tailwind  

Supabase (Postgres + Auth + Storage + Edge Functions)  

All authorization server-side (RLS + security-definer `has_role()` on separate `user_roles` table)  

Private storage only; playback exclusively via short-lived signed URLs from an edge function  

No provider names ever visible to users

### Core User Capabilities

Discover, search, browse by genre / country / language, view details, watch authorized titles, My List, Continue Watching, recently watched, rate/review (where enabled), subscribe to Premium, manage profile, receive recommendations.

### Public Navigation

**Desktop:** LOVAN logo · Home · Explore · Movies · Series · Genres · New Releases · Trending · My List · Search · Premium · Profile  

**Mobile bottom nav:** Home · Explore · Search · My List · Profile

### Key Screens

- **Landing (logged-out):** Hero “Cinema, wherever your story takes you.” + Discover / Watch / Create Your List / Go Premium sections, featured titles, pricing from admin plans, FAQ, legal, contact  

- **Homepage (logged-in):** Full-bleed hero + ordered rails (Continue Watching → Trending Worldwide → New on LOVAN → Popular in Your Region → Because You Watched… → Worldwide Cinema → International Movies → Top Rated → Critically Acclaimed → Hidden Gems → Short Watches → Coming Soon → Leaving Soon → Genre rails → Recommended For You)  

- **Explore, Search, Title Details, Custom HLS player, Profile, Subscription, Creator Hub (public form only)**  

- **Admin (separate protected area):** Overview, Titles, Upload, Users, Subscriptions & Pricing, Advertisements, Analytics, Reports, Complaints, Settings, Audit Logs  

Roles: `SUPER_ADMIN`, `CONTENT_ADMIN`, `AD_MANAGER`, `SUPPORT_ADMIN`. Upload restricted to authorized roles only. Normal users never see admin routes, storage URLs or internal data.

### Free vs Premium

Free: up to 5 ad placements per session (pre/mid/post-roll, banner, sponsored card) — configuration controlled in admin.  

Premium: ad-free, higher quality, early releases where licensed, multi-device, offline only when territory rights + plan allow it.  

Plans & prices are admin-configurable per country/currency. Payment layer is provider-agnostic (adapter pattern).

### Video Playback

Custom player with HLS.js adaptive bitrate, quality selector, multiple audio/subtitle tracks, closed captions, playback speed, resume, progress tracking. Signed expiring URLs only. No permanent storage paths ever exposed.

### Database (core entities with RLS)

users, profiles, user_roles, movies (incl. series/episodes), genres, movie_genres, cast, directors, producers, watch_history, watch_progress, watchlists, subscriptions, plans, plan_prices, payments, payment_providers, advertisements, ad_campaigns, ad_impressions, ad_clicks, territories, movie_territories, audit_logs, notifications.

(Licensing, rights profiles, territory rights grid, automatic expiration, full Creator Hub workflow, copyright claims and takedown system are deliberately deferred and will be added in a later phase.)

### Hard Style Rules (apply to every file and screen)

- No emojis anywhere  

- No em dashes or en dashes  

- Functional icons only, one consistent line set  

- Plain, short, literal copy  

- Imagery leads; strong type hierarchy; single saffron accent used sparingly  

- Minimal purposeful motion; honor reduced-motion  

- Placeholder artwork must look like real film stills (dark, moody, photographic)  

- Admin looks like professional media software, not a themed dashboard  

### Footer

LOVAN | Movies | Series | Premium | Creator Hub | Help | Contact | Terms | Privacy | Cookie Policy | © LOVAN. All rights reserved.

### Demo Content

Realistic sample titles from many countries and languages, clearly labelled “Demo content”. Generated / placeholder artwork only. No real copyrighted films, posters or trailers.

---

This is the single, clean, production-oriented specification for the core platform.  

Licensing, rights management, Creator Hub full workflow and copyright systems are out of scope for this phase and will be specified separately when you are ready.

Tell me the next concrete step you want (scaffold the full project, implement the homepage + rails, build the player into the app shell, set up Supabase schema, etc.) and I will execute it.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/574ff51b-bf2a-4d86-8735-6d7cea7f066b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
