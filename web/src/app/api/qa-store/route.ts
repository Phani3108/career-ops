import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { paths } from "@/lib/paths";
import type { QAEntry } from "@/lib/types";

const QA_PATH = path.join(paths.root, "data", "qa-store.json");

function readStore(): QAEntry[] {
  if (!fs.existsSync(QA_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(QA_PATH, "utf-8"));
    return raw.questions || [];
  } catch {
    return [];
  }
}

function writeStore(entries: QAEntry[]) {
  const dir = path.dirname(QA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(QA_PATH, JSON.stringify({ questions: entries }, null, 2), "utf-8");
}

export async function GET() {
  return NextResponse.json({ data: readStore() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern, answer, context } = body;
    if (!pattern || !answer) {
      return NextResponse.json({ error: "pattern and answer required" }, { status: 400 });
    }

    const entries = readStore();

    // Check for existing similar pattern
    const existing = entries.find(
      (e) => e.pattern.toLowerCase() === pattern.toLowerCase()
    );

    if (existing) {
      existing.answer = answer;
      existing.usedCount += 1;
      existing.lastUsed = new Date().toISOString();
      if (context) existing.context = context;
    } else {
      entries.push({
        id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        pattern,
        answer,
        context,
        usedCount: 1,
        lastUsed: new Date().toISOString(),
      });
    }

    writeStore(entries);
    return NextResponse.json({ data: entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save Q&A";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, answer } = body;
    if (!id || !answer) {
      return NextResponse.json({ error: "id and answer required" }, { status: 400 });
    }

    const entries = readStore();
    const entry = entries.find((e) => e.id === id);
    if (!entry) {
      return NextResponse.json({ error: "Q&A entry not found" }, { status: 404 });
    }

    entry.answer = answer;
    entry.lastUsed = new Date().toISOString();
    writeStore(entries);
    return NextResponse.json({ data: entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update Q&A";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    const entries = readStore().filter((e) => e.id !== id);
    writeStore(entries);
    return NextResponse.json({ data: entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete Q&A";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
