import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Account = { ready: boolean; email: string | null; userId: string | null; staff: boolean };

export function useAccount(): Account {
  const [state, setState] = useState<Account>({ ready: false, email: null, userId: null, staff: false });

  useEffect(() => {
    let active = true;
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
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") void load();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
