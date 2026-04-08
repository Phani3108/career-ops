import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  // Prevent path traversal  
  const safeName = path.basename(filename);
  const filePath = path.join(paths.outputDir, safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
