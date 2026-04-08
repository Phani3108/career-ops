import fs from "fs";
import { paths } from "../paths";

export function updateApplicationStatus(num: number, newStatus: string, newNotes?: string): boolean {
  if (!fs.existsSync(paths.applicationsMd)) return false;

  const content = fs.readFileSync(paths.applicationsMd, "utf-8");
  const lines = content.split("\n");
  let found = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 9) continue;
    const rowNum = parseInt(cells[0], 10);
    if (isNaN(rowNum) || rowNum !== num) continue;

    // Update status (column 5, 0-indexed)
    cells[5] = newStatus;
    if (newNotes !== undefined) {
      cells[8] = newNotes;
    }
    lines[i] = "| " + cells.join(" | ") + " |";
    found = true;
    break;
  }

  if (found) {
    fs.writeFileSync(paths.applicationsMd, lines.join("\n"), "utf-8");
  }
  return found;
}
