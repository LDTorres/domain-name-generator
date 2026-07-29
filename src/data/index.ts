import english from "@/data/roots/english.json";
import spanish from "@/data/roots/spanish.json";
import latin from "@/data/roots/latin.json";
import italian from "@/data/roots/italian.json";
import portuguese from "@/data/roots/portuguese.json";
import french from "@/data/roots/french.json";
import japanese from "@/data/roots/japanese.json";
import nordic from "@/data/roots/nordic.json";
import prefixes from "@/data/prefixes/prefixes.json";
import suffixes from "@/data/suffixes/suffixes.json";
import patterns from "@/data/phonetics/patterns.json";
import problematicTerms from "@/data/blacklists/problematic.json";
import knownBrands from "@/data/brands/known.json";
import presets from "@/data/presets/presets.json";
import type { LinguisticRoot } from "@/types/naming";

export const linguisticRoots = [
  ...english,
  ...spanish,
  ...latin,
  ...italian,
  ...portuguese,
  ...french,
  ...japanese,
  ...nordic
] as LinguisticRoot[];

export { prefixes, suffixes, patterns, problematicTerms, knownBrands, presets };
