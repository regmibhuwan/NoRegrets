"use client";

import {
  createDecision,
  updateDecision,
  type ActionState,
} from "@/app/actions/decisions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORIES,
  DECISION_STATUS,
  URGENCY,
} from "@/lib/constants";
import type { Database } from "@/lib/database.types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";

type Row = Database["public"]["Tables"]["decisions"]["Row"];

function SubmitRow({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-2 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}

type Props =
  | { mode: "create"; initial?: undefined }
  | { mode: "edit"; initial: Row };

export function DecisionForm(props: Props) {
  const { mode, initial } = props;
  const editId = mode === "edit" ? initial.id : "";
  const d = mode === "edit" ? initial : null;
  const router = useRouter();
  const [riskScore, setRiskScore] = useState<string>(
    d?.risk_score != null ? String(d.risk_score) : ""
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [coachingQuestions, setCoachingQuestions] = useState<string[] | null>(
    null
  );
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [state, action] = useFormState<ActionState, FormData>(
    mode === "create"
      ? createDecision
      : updateDecision.bind(null, editId),
    {}
  );

  useEffect(() => {
    if (state?.ok && state.id) {
      router.push(`/decisions/${state.id}`);
      router.refresh();
    }
  }, [state?.ok, state?.id, router]);

  async function runAnalyze(form: HTMLFormElement) {
    setAnalyzeError(null);
    setAiNote(null);
    const fd = new FormData(form);
    setAnalyzeLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fd.get("title"),
          category: fd.get("category"),
          description: fd.get("description"),
          expectedOutcome: fd.get("expectedOutcome"),
          confidenceLevel: fd.get("confidenceLevel"),
          urgency: fd.get("urgency"),
          peopleInvolved: fd.get("peopleInvolved"),
          feelingAtTime: fd.get("feelingAtTime"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error ?? "Analysis failed");
        return;
      }
      setRiskScore(String(data.risk_score ?? ""));
      setAiNote(
        `${data.summary}\n\nWhy this matters: ${data.why_this_matters}`
      );
    } catch {
      setAnalyzeError("Network error");
    } finally {
      setAnalyzeLoading(false);
    }
  }

  async function runCoachingQuestions(form: HTMLFormElement) {
    setQuestionsError(null);
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim();
    if (title.length < 2) {
      setQuestionsError("Add a decision title first (at least 2 characters).");
      return;
    }
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/ai/decision-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category: fd.get("category"),
          description: fd.get("description"),
          expectedOutcome: fd.get("expectedOutcome"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setQuestionsError(data.error ?? "Could not generate questions");
        return;
      }
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        setQuestionsError("No questions returned — try again.");
        return;
      }
      setCoachingQuestions(data.questions);
    } catch {
      setQuestionsError("Network error");
    } finally {
      setQuestionsLoading(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      id="decision-form-el"
      action={action}
      className="space-y-6 max-w-2xl"
    >
      <input type="hidden" name="riskScore" value={riskScore} />

      {state?.error && (
        <p className="text-sm text-danger bg-danger/5 border border-danger/15 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={mode === "edit" ? initial.title : undefined}
          className="mt-1"
          placeholder="What did you decide (or are you about to)?"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={mode === "edit" ? initial.category : "other"}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-card px-3 py-2.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={mode === "edit" ? initial.status : "pending"}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-card px-3 py-2.5 text-sm"
          >
            {DECISION_STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Context</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={d?.description ?? ""}
          className="mt-1"
          placeholder="What was going on? What were you optimizing for?"
        />
      </div>

      {mode === "create" && (
        <CardCoachingQuestions
          questions={coachingQuestions}
          questionsError={questionsError}
          questionsLoading={questionsLoading}
          onGenerate={() => {
            const form = document.getElementById(
              "decision-form-el"
            ) as HTMLFormElement | null;
            if (form) runCoachingQuestions(form);
          }}
        />
      )}

      <div>
        <Label htmlFor="expectedOutcome">Expected outcome</Label>
        <Textarea
          id="expectedOutcome"
          name="expectedOutcome"
          defaultValue={d?.expected_outcome ?? ""}
          className="mt-1"
          placeholder="What did you hope would happen?"
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="confidenceLevel">Confidence (1–5)</Label>
          <Input
            id="confidenceLevel"
            name="confidenceLevel"
            type="number"
            min={1}
            max={5}
            required
            defaultValue={d?.confidence_level ?? 3}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="urgency">Urgency</Label>
          <select
            id="urgency"
            name="urgency"
            defaultValue={d?.urgency ?? "medium"}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-card px-3 py-2.5 text-sm"
          >
            {URGENCY.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="decisionDate">Decision date</Label>
          <Input
            id="decisionDate"
            name="decisionDate"
            type="date"
            required
            defaultValue={d?.decision_date?.slice(0, 10) ?? today}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="followUpDate">Follow-up date</Label>
        <Input
          id="followUpDate"
          name="followUpDate"
          type="date"
          defaultValue={d?.follow_up_date?.slice(0, 10) ?? ""}
          className="mt-1"
        />
        <p className="text-xs text-muted mt-1">
          We will nudge you around this date to capture how things landed.
        </p>
      </div>

      <div>
        <Label htmlFor="peopleInvolved">People involved</Label>
        <Input
          id="peopleInvolved"
          name="peopleInvolved"
          defaultValue={d?.people_involved ?? ""}
          className="mt-1"
          placeholder="Names or roles — optional"
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={(d?.tags ?? []).join(", ")}
          className="mt-1"
          placeholder="e.g. career, negotiation"
        />
      </div>

      <div>
        <Label htmlFor="feelingAtTime">How you felt at the time</Label>
        <Textarea
          id="feelingAtTime"
          name="feelingAtTime"
          defaultValue={d?.feeling_at_time ?? ""}
          className="mt-1"
          placeholder="Emotions and body sense — helps later pattern reads."
        />
      </div>

      <CardAi
        riskScore={riskScore}
        analyzeError={analyzeError}
        analyzeLoading={analyzeLoading}
        aiNote={aiNote}
        onAnalyze={() => {
          const form = document.getElementById(
            "decision-form-el"
          ) as HTMLFormElement | null;
          if (form) runAnalyze(form);
        }}
      />

      <SubmitRow
        label={mode === "create" ? "Save decision" : "Update decision"}
      />
    </form>
  );
}

function CardCoachingQuestions({
  questions,
  questionsError,
  questionsLoading,
  onGenerate,
}: {
  questions: string[] | null;
  questionsError: string | null;
  questionsLoading: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="rounded-2xl border border-teal-200/70 dark:border-teal-800/60 bg-gradient-to-br from-teal-50/90 to-cyan-50/40 dark:from-teal-950/40 dark:to-slate-900/40 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
            Coaching questions (AI)
          </p>
          <p className="text-xs text-muted leading-relaxed max-w-xl">
            Get sharp, tailored questions to stress-test your thinking. Answer
            them in the fields below (context, expected outcome, feelings,
            etc.) — everything else on this page stays the same.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0 bg-white/80 dark:bg-slate-800/80 border-teal-200/80 dark:border-teal-800"
          onClick={onGenerate}
          disabled={questionsLoading}
        >
          {questionsLoading ? "Thinking…" : questions ? "Refresh questions" : "Generate questions"}
        </Button>
      </div>
      {questionsError && (
        <p className="text-sm text-danger">{questionsError}</p>
      )}
      {questions && questions.length > 0 && (
        <ol className="list-decimal list-inside space-y-2.5 text-sm text-foreground/95 marker:text-teal-600 dark:marker:text-teal-400">
          {questions.map((q, i) => (
            <li key={i} className="pl-1 leading-relaxed">
              {q}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CardAi({
  riskScore,
  analyzeError,
  analyzeLoading,
  aiNote,
  onAnalyze,
}: {
  riskScore: string;
  analyzeError: string | null;
  analyzeLoading: boolean;
  aiNote: string | null;
  onAnalyze: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-accent-soft/20 dark:bg-accent-soft/10 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Regret risk (AI)</p>
          <p className="text-xs text-muted">
            Optional — risk score + summary after your draft is filled in.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onAnalyze}
          disabled={analyzeLoading}
        >
          {analyzeLoading ? "Analyzing…" : "Analyze draft"}
        </Button>
      </div>
      {riskScore !== "" && (
        <p className="text-sm">
          Estimated risk score:{" "}
          <span className="font-semibold text-accent">{riskScore}</span> / 100
        </p>
      )}
      {analyzeError && (
        <p className="text-sm text-danger">{analyzeError}</p>
      )}
      {aiNote && (
        <pre className="text-xs whitespace-pre-wrap text-muted bg-card/80 rounded-lg p-3 border border-slate-200/60 dark:border-slate-700">
          {aiNote}
        </pre>
      )}
    </div>
  );
}
