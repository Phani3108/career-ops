import fs from "fs";
import yaml from "js-yaml";
import { paths } from "../paths";
import type { CanonicalState } from "../types";

let _cache: CanonicalState[] | null = null;

export function parseStates(): CanonicalState[] {
  if (_cache) return _cache;
  if (!fs.existsSync(paths.statesYml)) return [];

  const content = fs.readFileSync(paths.statesYml, "utf-8");
  const doc = yaml.load(content) as { states: CanonicalState[] };
  _cache = doc.states || [];
  return _cache;
}

export function buildAliasMap(): Record<string, string> {
  const states = parseStates();
  const map: Record<string, string> = {};
  for (const s of states) {
    map[s.id] = s.label;
    map[s.label.toLowerCase()] = s.label;
    for (const alias of s.aliases) {
      map[alias.toLowerCase()] = s.label;
    }
  }
  return map;
}
