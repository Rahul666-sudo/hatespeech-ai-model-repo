import { useState } from "react";
import { AlertOctagon, AlertTriangle, Loader2, Send, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CategoryKey =
  | "hate_speech"
  | "personal_insults"
  | "threats"
  | "non_harmful"
  | "offensive"
  | "clean";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  icon: typeof ShieldCheck;
  iconClass: string;
  panelClass: string;
  badgeBorder: string;
  badgeBg: string;
  flagged: boolean;
  chatAction: string;
}

export const CATEGORY_DEFINITIONS: Record<CategoryKey, CategoryMeta> = {
  hate_speech: {
    key: "hate_speech",
    label: "Hate Speech",
    icon: AlertOctagon,
    iconClass: "text-destructive",
    panelClass: "border-destructive/40",
    badgeBorder: "border-destructive/60",
    badgeBg: "bg-destructive/10 text-destructive",
    flagged: true,
    chatAction: "Hidden from receiver in chat · Strike applied",
  },
  threats: {
    key: "threats",
    label: "Threats",
    icon: AlertOctagon,
    iconClass: "text-destructive",
    panelClass: "border-destructive/40",
    badgeBorder: "border-destructive/60",
    badgeBg: "bg-destructive/10 text-destructive",
    flagged: true,
    chatAction: "Hidden from receiver in chat · Critical strike applied",
  },
  personal_insults: {
    key: "personal_insults",
    label: "Personal Insults",
    icon: AlertTriangle,
    iconClass: "text-warning",
    panelClass: "border-warning/40",
    badgeBorder: "border-warning/60",
    badgeBg: "bg-warning/10 text-warning",
    flagged: true,
    chatAction: "Warning flag in chat · Strike penalty",
  },
  offensive: {
    key: "offensive",
    label: "Offensive",
    icon: AlertTriangle,
    iconClass: "text-warning",
    panelClass: "border-warning/40",
    badgeBorder: "border-warning/60",
    badgeBg: "bg-warning/10 text-warning",
    flagged: true,
    chatAction: "Warning flag in chat · Filtered for sensitive users",
  },
  non_harmful: {
    key: "non_harmful",
    label: "Non-harmful Content",
    icon: ShieldCheck,
    iconClass: "text-primary",
    panelClass: "border-primary/40",
    badgeBorder: "border-primary/60",
    badgeBg: "bg-primary/10 text-primary",
    flagged: false,
    chatAction: "Permitted in chat · No restrictions",
  },
  clean: {
    key: "clean",
    label: "Clean",
    icon: ShieldCheck,
    iconClass: "text-primary",
    panelClass: "border-primary/40",
    badgeBorder: "border-primary/60",
    badgeBg: "bg-primary/10 text-primary",
    flagged: false,
    chatAction: "Permitted in chat · No restrictions",
  },
};

const tiers = [
  { label: "Clean", className: "text-primary" },
  { label: "Non-harmful Content", className: "text-primary" },
  { label: "Offensive", className: "text-warning" },
  { label: "Personal Insults", className: "text-warning" },
  { label: "Threats", className: "text-destructive" },
  { label: "Hate Speech", className: "text-destructive" },
];

interface AnalysisResult {
  categories?: string[];
  classification?: string;
  confidence: number;
  explanation: string;
}

const normalizeCategoryKey = (raw: string): CategoryKey => {
  const s = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (s.includes("hate")) return "hate_speech";
  if (s.includes("threat")) return "threats";
  if (s.includes("insult")) return "personal_insults";
  if (s.includes("offensive")) return "offensive";
  if (s.includes("clean")) return "clean";
  if (s.includes("non_harm") || s.includes("nonharm")) return "non_harmful";
  return "non_harmful";
};

const getDetectedCategories = (result: AnalysisResult | null): CategoryMeta[] => {
  if (!result) return [];
  const rawList: string[] = [];
  if (Array.isArray(result.categories) && result.categories.length > 0) {
    rawList.push(...result.categories);
  } else if (result.classification) {
    rawList.push(...result.classification.split(",").map((c) => c.trim()));
  }

  const keys = Array.from(new Set(rawList.map(normalizeCategoryKey)));
  if (keys.length === 0) keys.push("non_harmful");

  // If harmful/offensive categories are detected alongside clean/non_harmful, prioritize the flagged ones
  const harmful = keys.filter((k) => k !== "non_harmful" && k !== "clean");
  const finalKeys = harmful.length > 0 ? harmful : keys;

  return finalKeys.map((k) => CATEGORY_DEFINITIONS[k]);
};

const getPrimarySeverity = (detected: CategoryMeta[]): CategoryMeta => {
  if (detected.some((c) => c.key === "threats" || c.key === "hate_speech")) {
    return detected.find((c) => c.key === "threats" || c.key === "hate_speech")!;
  }
  if (detected.some((c) => c.key === "personal_insults" || c.key === "offensive")) {
    return detected.find((c) => c.key === "personal_insults" || c.key === "offensive")!;
  }
  if (detected.some((c) => c.key === "non_harmful")) {
    return CATEGORY_DEFINITIONS.non_harmful;
  }
  return CATEGORY_DEFINITIONS.clean;
};

const AnalyzerSection = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to analyze.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-speech", {
        body: { text: text.trim() },
      });

      if (error) throw error;
      setResult(data as AnalysisResult);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const detectedCategories = getDetectedCategories(result);
  const primaryConfig = getPrimarySeverity(detectedCategories);
  const isAnyFlagged = detectedCategories.some((c) => c.flagged);
  const flaggedCategoryLabels = detectedCategories
    .filter((c) => c.flagged)
    .map((c) => c.label);
  const confidence =
    result && Number.isFinite(result.confidence)
      ? `${(result.confidence * 100).toFixed(1)}%`
      : "—";

  return (
    <section id="analyzer" className="scroll-mt-20 border-t border-border px-5 py-20 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Live analyzer</p>
          <h2 className="display mt-4 text-4xl text-foreground sm:text-5xl">
            Put a message
            <br />
            under the microscope.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            Paste up to 2,000 characters. The multi-category model evaluates content across Hate
            Speech, Personal Insults, Threats, and Non-harmful Content, as well as Clean and
            Offensive tiers. Live moderation rules reflect actual chat behavior in real time.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {tiers.map((tier) => (
              <span
                key={tier.label}
                className={`inline-flex items-center gap-2 border border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] ${tier.className}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {tier.label}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="border border-border bg-card/40">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Input
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {text.length} / 2000
              </span>
            </div>

            <div className="p-5">
              <label
                htmlFor="analyzer-input"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Message text
              </label>
              <Textarea
                id="analyzer-input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type or paste a message to classify across moderation categories..."
                aria-describedby="analyzer-help"
                className="mt-3 min-h-[180px] resize-none bg-background px-4 py-3 text-base leading-relaxed"
                maxLength={2000}
              />

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  id="analyzer-help"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Multi-category AI classification
                </p>
                <Button
                  onClick={analyze}
                  disabled={loading || !text.trim()}
                  className="h-10 px-5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Analyzing
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Analyze text
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {result && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-4 border bg-card p-5 ${primaryConfig.panelClass}`}
            >
              <div className="flex items-start gap-3">
                <primaryConfig.icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${primaryConfig.iconClass}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {detectedCategories.map((cat) => (
                        <span
                          key={cat.key}
                          className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${cat.badgeBorder} ${cat.badgeBg}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                          {cat.label}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Reported confidence {confidence}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      {isAnyFlagged ? (
                        <span className="flex items-center gap-1 text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Flagged as {flaggedCategoryLabels.join(", ")} — hidden from receiver in chat
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-primary">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Permitted in chat — no moderation flags
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                    {result.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AnalyzerSection;
