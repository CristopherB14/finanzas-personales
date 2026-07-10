import type { User } from "@supabase/supabase-js";

export interface UserDisplayInfo {
  name: string;
  email: string;
  initials: string;
}

export function getUserDisplayInfo(user: User | null): UserDisplayInfo {
  if (!user) {
    return { name: "", email: "", initials: "?" };
  }

  const displayName = user.user_metadata?.display_name;
  const name =
    (typeof displayName === "string" && displayName.trim()) ||
    user.email?.split("@")[0] ||
    "Usuario";
  const email = user.email ?? "";

  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  return { name, email, initials };
}
