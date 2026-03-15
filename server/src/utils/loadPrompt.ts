import fs from "fs";
import path from "path";

const promptsDir = path.resolve(__dirname, "../prompts");

export function loadPrompt(name: string, variables: Record<string, string> = {}): string {
  const filePath = path.join(promptsDir, `${name}.md`);
  let content = fs.readFileSync(filePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  return content;
}
