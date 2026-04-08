import fs from "fs";
import { paths } from "../paths";

export function writeCv(content: string): void {
  fs.writeFileSync(paths.cv, content, "utf-8");
}

export function readCv(): string {
  if (!fs.existsSync(paths.cv)) return "";
  return fs.readFileSync(paths.cv, "utf-8");
}
