import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  banknote: Banknote,
  landmark: Landmark,
  "piggy-bank": PiggyBank,
  "credit-card": CreditCard,
  "trending-up": TrendingUp,
  wallet: Wallet,
};

export function AccountIcon({
  icon,
  className,
}: {
  icon: string | null;
  className?: string;
}) {
  const Icon = (icon && ICON_MAP[icon]) || Wallet;
  return <Icon className={className} />;
}
