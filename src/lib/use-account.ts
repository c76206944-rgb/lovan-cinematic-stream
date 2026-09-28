import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Account = { ready: boolean; email: string | null; userId: string | null; staff: boolean };

const initialAccount: Account = { ready: false, email: null, userId: null, staff: false };
const AccountContext = createContext<Account>(initialAccount);

/**
 * Resolve the signed-in account once for the whole app. Keeping this at the
 * shell prevents every header, page and viewer control from making its own
 * staff lookup at the same time.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Account>(initialAccount);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | undefined;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user ?? null;
      let staff = false;
      if (user) {
        const { data: isStaff } = await supabase.rpc("is_staff", { _user_id: user.id });
        staff = Boolean(isStaff);
      }
      if (active) setState({ ready: true, email: user?.email ?? null, userId: user?.id ?? null, staff });
    };

    void load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Auth callbacks hold an internal lock. Refresh on the next task so a
      // session read cannot deadlock the signed-in viewer interface.
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void load(), 0);
    });

    return () => {
      active = false;
      window.clearTimeout(refreshTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ ready: state.ready, email: state.email, userId: state.userId, staff: state.staff }),
    [state.email, state.ready, state.staff, state.userId],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): Account {
  return useContext(AccountContext);
}
