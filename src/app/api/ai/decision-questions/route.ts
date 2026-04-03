import { generateDecisionCoachingQuestions } from "@/lib/ai/decision-questions";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const title =
    body && typeof body.title === "string" ? body.title.trim() : "";
  if (title.length < 2) {
    return NextResponse.json(
      { error: "Add a short title first (at least 2 characters)." },
      { status: 400 }
    );
  }

  const result = await generateDecisionCoachingQuestions({
    title,
    category: String(body.category ?? "other"),
    description:
      typeof body.description === "string" ? body.description : null,
    expectedOutcome:
      typeof body.expectedOutcome === "string" ? body.expectedOutcome : null,
  });

  if ("error" in result && typeof result.error === "string") {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result);
}
