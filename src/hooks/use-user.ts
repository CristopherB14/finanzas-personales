"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const finish = (nextUser: User | null) => {
      if (cancelled) return;
      setUser(nextUser);
      setLoading(false);
    };

    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (error) {
          finish(null);
          return;
        }
        finish(data.user);
      })
      .catch(() => finish(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      finish(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
