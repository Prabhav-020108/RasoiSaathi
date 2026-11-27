import hi from "./hi.json";
import en from "./en.json";
import kn from "./kn.json";

export type Dictionary = typeof en;

const dictionaries: Record<string, Dictionary> = {
  hi,
  en,
  kn,
};

export function getDictionary(lang: string): Dictionary {
  return dictionaries[lang] ?? hi;
}
