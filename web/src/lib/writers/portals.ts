import fs from "fs";
import yaml from "js-yaml";
import { paths } from "../paths";
import type { PortalsConfig } from "../types";

export function writePortals(config: PortalsConfig): void {
  const content = yaml.dump(config, { lineWidth: 100, noRefs: true });
  fs.writeFileSync(paths.portalsYml, content, "utf-8");
}
