import {
  Gamepad2,
  Headphones,
  Home,
  Plug,
  Smartphone,
  Tag,
  Watch,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
  { keywords: ["audio", "sonido", "auricular", "parlante", "micro"], icon: Headphones },
  { keywords: ["smart", "tel", "cel", "movil", "phone"], icon: Smartphone },
  { keywords: ["gam", "tecl", "mouse", "raton", "perifer", "monitor"], icon: Gamepad2 },
  { keywords: ["watch", "reloj", "wear"], icon: Watch },
  { keywords: ["hogar", "home", "casa"], icon: Home },
  { keywords: ["accesor", "cable", "carga", "adapt"], icon: Plug },
];

/**
 * Devuelve un icono lineal acorde al nombre o slug de la categoría.
 */
export function getCategoryIcon(nameOrSlug: string): LucideIcon {
  const normalized = nameOrSlug.toLowerCase();
  const match = CATEGORY_ICON_RULES.find((rule) =>
    rule.keywords.some((kw) => normalized.includes(kw))
  );
  return match?.icon ?? Tag;
}
