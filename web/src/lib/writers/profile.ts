import fs from "fs";
import yaml from "js-yaml";
import { paths } from "../paths";
import type { Profile } from "../types";

export function writeProfile(profile: Profile): void {
  const content = yaml.dump(profile, { lineWidth: 100, noRefs: true });
  fs.mkdirSync(paths.profileYml.replace(/\/[^/]+$/, ""), { recursive: true });
  fs.writeFileSync(paths.profileYml, content, "utf-8");
}
