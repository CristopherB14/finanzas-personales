import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { focusRing, interactive } from "@/lib/a11y";

interface BrandLogoProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: "h-7 w-7 text-xs", word: "text-base" },
  md: { mark: "h-8 w-8 text-sm", word: "text-lg" },
  lg: { mark: "h-10 w-10 text-base", word: "text-xl" },
};

export function BrandLogo({
  href = "/dashboard",
  className,
  showWordmark = true,
  size = "md",
}: BrandLogoProps) {
  const sizes = sizeMap[size];

  const content = (
    <>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground shadow-sm",
          sizes.mark
        )}
        aria-hidden
      >
        K
      </span>
      {showWordmark && (
        <span className={cn("font-bold tracking-tight text-foreground", sizes.word)}>
          {BRAND_NAME}
        </span>
      )}
    </>
  );

  const classes = cn(
    "inline-flex items-center gap-2.5",
    interactive,
    focusRing,
    "rounded-lg",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes} aria-label={`${BRAND_NAME} — inicio`}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
