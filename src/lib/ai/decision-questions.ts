import { getOpenAI, AI_MODEL } from "@/lib/openai";

const SYSTEM = `You are an expert decision coach (trained on ideas from Annie Duke, Daniel Kahneman, pre-mortems, reversible vs irreversible choices, and clarity coaching).

Your job: produce sharp, specific coaching QUESTIONS about the user's decision — not advice, not answers.

Rules:
- Questions must clearly reference their situation (use their title/context; never generic "what do you want?" fluff).
- Each question is ONE sentence, ends with "?".
- Mix: stakes, blind spots, hidden assumptions, alternatives they may be ignoring, what would change their mind, reversibility, who is affected, time horizon, how they'll know if they were wrong, pre-mortem ("if this failed in a year, why?").
- Tone: warm, direct, curious — never shaming or clinical.
- Return ONLY valid JSON: { "questions": string[] } with exactly 7 questions (no duplicates, no numbering inside strings).`;

export type DecisionQuestionsResult = {
  questions: string[];
};

export async function generateDecisionCoachingQuestions(input: {
  title: string;
  category: string;
  description?: string | null;
  expectedOutcome?: string | null;
}): Promise<DecisionQuestionsResult | { error: string }> {
  const openai = getOpenAI();
  if (!openai) {
    return { error: "OpenAI is not configured. Add OPENAI_API_KEY." };
  }

  const user = `Decision title: ${input.title.trim()}
Category: ${input.category}
Context / what was going on: ${input.description?.trim() || "(not provided yet)"}
Expected outcome (if any): ${input.expectedOutcome?.trim() || "(not provided yet)"}

Generate 7 tailored coaching questions to help them think before they lock this in.`;

  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0.55,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return { error: "No response from model" };

  try {
    const parsed = JSON.parse(raw) as { questions?: unknown };
    if (!Array.isArray(parsed.questions)) {
      return { error: "Invalid model output" };
    }
    const questions = parsed.questions
      .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
      .map((q) => q.trim());
    if (questions.length < 3) {
      return { error: "Model returned too few questions" };
    }
    return { questions: questions.slice(0, 10) };
  } catch {
    return { error: "Could not parse AI response" };
  }
}
