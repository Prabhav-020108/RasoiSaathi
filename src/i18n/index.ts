import hi from "./hi.json";
import en from "./en.json";
import kn from "./kn.json";
import ta from "./ta.json";
import te from "./te.json";
import mr from "./mr.json";

export type Dictionary = typeof en;

const dictionaries: Record<string, Dictionary> = {
  hi,
  en,
  kn,
  ta,
  te,
  mr,
};

export function getDictionary(lang: string): Dictionary {
  return dictionaries[lang] ?? hi;
}
