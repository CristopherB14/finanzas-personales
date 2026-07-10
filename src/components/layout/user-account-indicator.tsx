"use client";

import { useUser } from "@/hooks/use-user";
import { getUserDisplayInfo } from "@/lib/user-display";
import { cn } from "@/lib/utils";

interface UserAccountIndicatorProps {
  variant?: "sidebar" | "compact";
  className?: string;
}

function UserAvatar({
  initials,
  size,
}: {
  initials: string;
  size: "sm" | "md";
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent font-semibold text-primary-foreground shadow-sm",
        size === "sm" ? "h-8 w-8 text-xs" : "h-9 w-9 text-sm"
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function UserAccountIndicator({
  variant = "sidebar",
  className,
}: UserAccountIndicatorProps) {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div
        className={cn(
          "animate-pulse rounded-xl bg-muted/60",
          variant === "compact" ? "h-8 w-24" : "h-14 w-full",
          className
        )}
        aria-hidden
      />
    );
  }

  if (!user) return null;

  const { name, email, initials } = getUserDisplayInfo(user);

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex max-w-[10rem] items-center gap-2 rounded-full border border-border bg-card px-2 py-1 shadow-sm",
          className
        )}
        aria-label={`Sesión iniciada como ${name}`}
      >
        <UserAvatar initials={initials} size="sm" />
        <span className="truncate text-sm font-medium text-foreground">
          {name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5",
        className
      )}
      aria-label={`Mi cuenta: ${name}`}
    >
      <UserAvatar initials={initials} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
        Mi cuenta
      </span>
    </div>
  );
}

/** Mobile-only top bar showing brand + signed-in user. */
export function AppMobileHeader() {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:hidden">
      <p className="text-xs font-medium text-muted-foreground">Tu espacio</p>
      <UserAccountIndicator variant="compact" />
    </header>
  );
}
