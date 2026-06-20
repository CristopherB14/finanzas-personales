import { cn } from "@/lib/utils";

/** Visible keyboard focus ring aligned with design tokens. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Base styles for clickable controls (not text fields). */
export const interactive =
  "cursor-pointer transition-colors motion-reduce:transition-none";

/** Secondary / helper copy with AA contrast in light and dark themes. */
export const mutedText = "text-muted-foreground";

/** Small metadata lines (dates, counts, hints). */
export const metaText = "text-xs text-muted-foreground";

/** Inline text links and link-styled controls. */
export const textLink = cn(
  interactive,
  focusRing,
  "rounded-sm font-medium text-accent underline-offset-4 hover:text-accent/90 hover:underline"
);

/** Native `<select>` styling used across filter panels. */
export const selectField = cn(
  interactive,
  focusRing,
  "flex h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
);

/** Table/list links that navigate to detail views. */
export const tableLink = cn(
  interactive,
  focusRing,
  "rounded-sm text-accent underline-offset-4 hover:text-accent/90 hover:underline"
);

/** Segmented pill toggles (categories, budget mode, tabs). */
export function choicePill(selected: boolean, compact = false) {
  return cn(
    interactive,
    focusRing,
    "rounded-full font-medium",
    compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
    selected
      ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/95"
      : "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70 dark:hover:bg-secondary/60"
  );
}

/** Full-width selectable cards (accounts, etc.). */
export function choiceCard(selected: boolean) {
  return cn(
    interactive,
    focusRing,
    "flex w-full min-w-0 items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium",
    selected
      ? "border-accent bg-accent/10 text-accent dark:bg-accent/20"
      : "border-border bg-card text-foreground hover:bg-muted/60 active:bg-muted/80"
  );
}

/** Compact icon grid pickers (category icons). */
export function choiceIcon(selected: boolean) {
  return cn(
    interactive,
    focusRing,
    "flex h-11 items-center justify-center rounded-xl border",
    selected
      ? "border-accent bg-accent/10 text-accent dark:bg-accent/20"
      : "border-border bg-card text-foreground hover:bg-muted/60 active:bg-muted/80"
  );
}

/** Sidebar navigation links. */
export function navLink(active: boolean) {
  return cn(
    interactive,
    focusRing,
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
    active
      ? "bg-accent/10 text-accent dark:bg-accent/20"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground active:bg-muted/80"
  );
}

/** Bottom mobile navigation links. */
export function mobileNavLink(active: boolean, highlight = false) {
  return cn(
    interactive,
    focusRing,
    "flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium rounded-lg",
    highlight &&
      "-mt-5 flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:bg-primary/95",
    !highlight &&
      (active
        ? "text-accent"
        : "text-muted-foreground hover:text-foreground active:text-foreground")
  );
}

/** Primary CTA styled like sidebar “Registrar gasto”. */
export const primaryActionLink = cn(
  interactive,
  focusRing,
  "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:bg-primary/95"
);

/** Ghost sidebar actions such as logout. */
export const ghostActionButton = cn(
  interactive,
  focusRing,
  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground active:bg-muted/80"
);

/** Compact “Nueva” actions inside forms. */
export const inlineAction = cn(
  interactive,
  focusRing,
  "h-8 gap-1 px-2 text-accent hover:bg-accent/10 hover:text-accent/90 active:bg-accent/15"
);

/** Brand / app title links. */
export const brandLink = cn(
  interactive,
  focusRing,
  "rounded-sm font-bold text-accent hover:text-accent/90"
);

/** Dashed empty-state panels. */
export const emptyPanel = cn(
  "rounded-xl border border-dashed border-border px-4 py-3 text-sm",
  mutedText
);

/** Semantic error copy. */
export const errorText = "text-sm text-destructive";
