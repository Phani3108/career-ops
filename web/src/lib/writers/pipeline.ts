import fs from "fs";
import { paths } from "../paths";

export function addPipelineUrl(url: string): void {
  let content = "";
  if (fs.existsSync(paths.pipelineMd)) {
    content = fs.readFileSync(paths.pipelineMd, "utf-8");
  }

  // Find the "Pendientes" section or create it
  if (!content.includes("Pendientes") && !content.includes("Pending")) {
    content = `# Pipeline\n\n## Pending\n\n- [ ] ${url}\n\n## Processed\n`;
  } else {
    // Insert after the Pendientes/Pending heading
    const lines = content.split("\n");
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^##\s+(Pendientes|Pending)/i.test(lines[i])) {
        insertIndex = i + 1;
        // Skip empty lines after heading
        while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
          insertIndex++;
        }
        break;
      }
    }
    if (insertIndex === -1) {
      // Append after first heading
      content += `\n- [ ] ${url}\n`;
    } else {
      lines.splice(insertIndex, 0, `- [ ] ${url}`);
      content = lines.join("\n");
    }
  }

  fs.writeFileSync(paths.pipelineMd, content, "utf-8");
}

export function removePipelineUrl(lineIndex: number): void {
  if (!fs.existsSync(paths.pipelineMd)) return;
  const content = fs.readFileSync(paths.pipelineMd, "utf-8");
  const lines = content.split("\n");
  if (lineIndex >= 0 && lineIndex < lines.length) {
    lines.splice(lineIndex, 1);
    fs.writeFileSync(paths.pipelineMd, lines.join("\n"), "utf-8");
  }
}
