import { createMiddleware } from '@tanstack/react-start'
import { supabase } from './client'

// Must be registered as a global functionMiddleware in src/start.ts.
// Proactively refreshes expired or near-expiry sessions before RPC calls.
export const attachSupabaseAuth = createMiddleware({ type: 'function' }).client(
  async ({ next }) => {
    let token: string | undefined
    try {
      const { data } = await supabase.auth.getSession()
      const session = data?.session
      const now = Math.floor(Date.now() / 1000)
      if (session?.access_token && session.expires_at && session.expires_at - now > 60) {
        token = session.access_token
      } else if (session?.refresh_token) {
        const { data: ref } = await supabase.auth.refreshSession()
        token = ref?.session?.access_token || session?.access_token
      } else {
        token = session?.access_token
      }
    } catch {
      // fallback to whatever session is in memory
    }
    return next({
      headers: token ? { Authorization:  } : {},
    })
  },
)
