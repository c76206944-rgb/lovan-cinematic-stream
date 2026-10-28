<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Resolve authentication and staff status once in the root account provider; repeated per-component lookups can stall signed-in viewer pages.
- Share DownloadsView between /downloads and an independent static offline entry; the offline entry must not import account providers, server functions, ads or catalogue loaders, so saved playback never depends on network or authentication.
- Keep TanStack Start's single client entry; emit offline.html from its dynamically imported offline playback chunk with offlineShellPlugin, and explicitly invoke its exported mountOfflineApp function from both callers so production tree-shaking retains the UI.
- Generate /sw.js with vite-plugin-pwa and register only through offline-registration; guard previews/dev/iframes and exclude OAuth navigations, to avoid stale editor caches.
- Download eligibility follows published, non-archived uploaded video availability rather than the legacy offline_allowed flag; retain authenticated acquisition and signed private storage links.
- New video uploads go to Cloudflare R2 when its secrets exist; catalogue stores them as `r2/videos/...` and playback/downloads use short-lived signed links from `src/lib/r2.server.ts`. Why: zero streaming bandwidth cost while keeping files private.
