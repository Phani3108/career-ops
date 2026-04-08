import fs from "fs";
import yaml from "js-yaml";
import { paths } from "../paths";
import type { Profile } from "../types";

export function parseProfile(): Profile | null {
  const filePath = fs.existsSync(paths.profileYml)
    ? paths.profileYml
    : null;
  if (!filePath) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  return yaml.load(content) as Profile;
}

export function profileExists(): boolean {
  return fs.existsSync(paths.profileYml);
}
