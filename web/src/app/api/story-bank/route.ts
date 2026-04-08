import { NextResponse } from "next/server";
import fs from "fs";
import { paths } from "@/lib/paths";

export async function GET() {
  if (!fs.existsSync(paths.storyBank)) {
    return NextResponse.json({ data: "" });
  }
  const content = fs.readFileSync(paths.storyBank, "utf-8");
  return NextResponse.json({ data: content });
}
