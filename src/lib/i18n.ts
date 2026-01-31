"use client";

import { useReptileLogs } from "@/lib/store";
import en from "@/locales/en/translation.json";
import ko from "@/locales/ko/translation.json";

// Type-safe recursive key access
type Translations = typeof en;
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)];

export function useTranslation() {
    const { visualSettings } = useReptileLogs();
    const lang = visualSettings?.language || "ko";
    const translations = lang === "en" ? en : ko;

    const t = (key: NestedKeyOf<Translations>) => {
        const keys = key.split(".");
        let result: any = translations;
        for (const k of keys) {
            if (result && typeof result === "object" && k in result) {
                result = result[k as keyof typeof result];
            } else {
                return key; // Fallback to key if not found
            }
        }
        return result as string;
    };

    return { t, lang };
}
