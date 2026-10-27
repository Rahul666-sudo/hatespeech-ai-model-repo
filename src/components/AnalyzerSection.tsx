import { useState } from "react";
import { AlertOctagon, AlertTriangle, Loader2, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Classification = "hate_speech" | "offensive" | "clean";

interface AnalysisResult {
  classification: Classification;
  confidence: number;
  explanation: string;
}

const classificationConfig: Record<
  Classification,
  {
    label: string;
    icon: typeof ShieldCheck;
    iconClass: string;
    panelClass: string;
  }
> = {
  clean: {
    label: "No hate speech detected",
    icon: ShieldCheck,
    iconClass: "text-primary",
    panelClass: "border-primary/40",
  },
  offensive: {
    label: "Offensive language detected",
    icon: AlertTriangle,
    iconClass: "text-warning",
    panelClass: "border-warning/40",
  },
  hate_speech: {
    label: "Hate speech detected",
    icon: AlertOctagon,
    iconClass: "text-destructive",
    panelClass: "border-destructive/40",
  },
};

const tiers = [
  { label: "Clean", className: "text-primary" },
  { label: "Offensive", className: "text-warning" },
  { label: "Hate speech", className: "text-destructive" },
];

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

  const config = result ? classificationConfig[result.classification] : null;
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
            Paste up to 2,000 characters. The model returns one of three labels and a short
            explanation. Results are advisory — they are a signal, not a verdict.
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
                placeholder="Type or paste a message to classify..."
                aria-describedby="analyzer-help"
                className="mt-3 min-h-[180px] resize-none bg-background px-4 py-3 text-base leading-relaxed"
                maxLength={2000}
              />

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p
                  id="analyzer-help"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Advisory classification
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

          {result && config && (
            <div
              role="status"
              aria-live="polite"
              className={`mt-4 border bg-card p-5 ${config.panelClass}`}
            >
              <div className="flex items-start gap-3">
                <config.icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconClass}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className={`font-heading text-lg font-semibold ${config.iconClass}`}>
                      {config.label}
                    </h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Reported confidence {confidence}
                    </span>
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
