import { Scissors, Package, Palette, Droplets, Sparkles, Smile, Paintbrush, Footprints, Heart, Gem, Crown, Wrench, type LucideIcon } from "lucide-react";

export interface Service {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number | string;
    discountPrice?: number | string | null;
}

export function isComboCategory(cat: string): boolean {
    const c = (cat || "").toLowerCase();
    return c.includes("combo") || c.includes("package") || c.includes("bundle");
}

export function parseComboIds(desc: string): string[] {
    const match = (desc || "").match(/\[combo:([^\]]*)\]/);
    if (!match) return [];
    return match[1].split(",").map((s) => s.trim()).filter(Boolean);
}

export function getComboSummary(desc: string, services: any[]): string {
    const ids = parseComboIds(desc);
    if (ids.length === 0) return "";
    const names = ids
        .map((id) => services.find((s) => s.id === id)?.name)
        .filter(Boolean);
    return names.join(" + ");
}

export const CATEGORY_IMAGES: Record<string, string> = {
    hair: "/images/hair_care.png",
    skin: "/images/skin_care.png",
    nail: "/images/nail_care.png",
    massage: "/images/massage.png",
    combo: "/images/combo_packages.png",
    bridal: "/images/hair_care.png", // Fallback to hair care if bridal is missing
    spa: "/images/massage.png",      // Fallback to massage for spa
    body: "/images/massage.png",     // Fallback to massage for body
};

export const mapServiceToIcon = (cat: string, name: string): { type: 'icon' | 'image'; icon?: any; url?: string } => {
    const n = name.toLowerCase();
    const c = cat.toLowerCase();

    if (c.includes("hair") || c.includes("cut")) return { type: 'image', url: CATEGORY_IMAGES.hair };
    if (c.includes("skin") || c.includes("facial")) return { type: 'image', url: CATEGORY_IMAGES.skin };
    if (c.includes("nail") || c.includes("mani") || c.includes("pedi")) return { type: 'image', url: CATEGORY_IMAGES.nail };
    if (c.includes("massage") || c.includes("body") || c.includes("spa") || c.includes("therapy")) return { type: 'image', url: CATEGORY_IMAGES.massage };
    if (isComboCategory(c)) return { type: 'image', url: CATEGORY_IMAGES.combo };
    if (c.includes("bridal")) return { type: 'image', url: CATEGORY_IMAGES.bridal };

    // Fallbacks to Lucide Icons
    if (n.includes("color") || n.includes("dye")) return { type: 'icon', icon: Palette };
    if (n.includes("wash") || n.includes("spa")) return { type: 'icon', icon: Droplets };

    return { type: 'icon', icon: Scissors };
};

export const mapCategoryToColor = (cat: string) => {
    switch (cat.toLowerCase()) {
        case "hair":
        case "hair care":
            return "#f43f5e";
        case "skin & facial":
        case "skin care":
            return "#fbbf24";
        case "nails":
        case "nail care":
            return "#ec4899";
        case "body & wax":
        case "body care":
        case "massage":
            return "#f97316";
        case "packages":
        case "combo":
            return "#8b5cf6";
        case "tools":
            return "#3b82f6";
        case "spa":
            return "#06b6d4";
        default:
            return "#a855f7";
    }
};
