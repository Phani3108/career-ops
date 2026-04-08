import fs from "fs";
import yaml from "js-yaml";
import { paths } from "../paths";
import type { PortalsConfig } from "../types";

export function parsePortals(): PortalsConfig | null {
  if (!fs.existsSync(paths.portalsYml)) return null;
  const content = fs.readFileSync(paths.portalsYml, "utf-8");
  return yaml.load(content) as PortalsConfig;
}

export function portalsExist(): boolean {
  return fs.existsSync(paths.portalsYml);
}
