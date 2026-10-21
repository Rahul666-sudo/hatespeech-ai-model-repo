import { useState } from "react";
import { Shield, AlertTriangle, AlertOctagon, Loader2, Send } from "lucide-react";
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

const classificationConfig: Record<Classification, { label: string; icon: typeof Shield; colorClass: string; bgClass: string }> = {
  clean: { label: "No Hate Speech Detected", icon: Shield, colorClass: "text-safe", bgClass: "bg-safe/10 border-safe/20" },
  offensive: { label: "Offensive Language Detected", icon: AlertTriangle, colorClass: "text-warning", bgClass: "bg-warning/10 border-warning/20" },
  hate_speech: { label: "Hate Speech Detected", icon: AlertOctagon, colorClass: "text-destructive", bgClass: "bg-destructive/10 border-destructive/20" },
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

  const config = result ? classificationConfig[result.classification] : null;

  return (
    <section id="analyzer" className="py-20 px-4">
      <div className="container mx-auto max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Try the <span className="text-gradient">Analyzer</span>
        </h2>
        <p className="text-muted-foreground text-center mb-10">
          Enter any text below and our AI will classify it instantly.
        </p>

        <div className="relative">
          {/* Background offensive words */}
          <div className="absolute inset-0 -m-6 pointer-events-none select-none overflow-hidden rounded-3xl" aria-hidden="true">
            {[
              { text: "h*a*t*e", top: "2%", left: "2%", rotate: "-12deg" },
              { text: "s*t*u*p*i*d", top: "5%", right: "3%", rotate: "8deg" },
              { text: "i*d*i*o*t", bottom: "30%", left: "1%", rotate: "-6deg" },
              { text: "d*u*m*b", top: "40%", right: "1%", rotate: "15deg" },
              { text: "u*g*l*y", bottom: "12%", left: "5%", rotate: "10deg" },
              { text: "l*o*s*e*r", bottom: "5%", right: "4%", rotate: "-8deg" },
              { text: "f*o*o*l", top: "25%", left: "0%", rotate: "5deg" },
              { text: "t*r*a*s*h", top: "18%", right: "0%", rotate: "-10deg" },
              { text: "w*e*i*r*d", bottom: "45%", right: "2%", rotate: "6deg" },
              { text: "j*e*r*k", bottom: "50%", left: "3%", rotate: "-4deg" },
              { text: "s*c*u*m", top: "1%", left: "35%", rotate: "3deg" },
              { text: "c*r*e*e*p", top: "13%", left: "15%", rotate: "-8deg" },
              { text: "m*o*r*o*n", bottom: "3%", left: "18%", rotate: "7deg" },
              { text: "l*a*m*e", bottom: "22%", right: "0%", rotate: "-5deg" },
              { text: "p*u*n*k", top: "12%", left: "50%", rotate: "11deg" },
              { text: "g*r*o*s*s", bottom: "3%", right: "18%", rotate: "-9deg" },
            ].map((word, i) => (
              <span
                key={i}
                className="absolute text-xs md:text-sm font-mono px-2 py-1 rounded-md bg-destructive/10 border border-destructive/15 text-destructive/60"
                style={{
                  top: word.top,
                  bottom: word.bottom,
                  left: word.left,
                  right: word.right,
                  transform: `rotate(${word.rotate})`,
                  opacity: 0.65,
                }}
              >
                {word.text}
              </span>
            ))}
          </div>

          <div className="relative z-10 bg-card border border-border rounded-2xl p-6 md:p-8 shadow-glow">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste text here to analyze..."
            className="min-h-[140px] bg-muted/50 border-border/50 text-foreground placeholder:text-muted-foreground resize-none text-base mb-4"
            maxLength={2000}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length}/2000</span>
            <Button
              onClick={analyze}
              disabled={loading || !text.trim()}
              className="bg-gradient-primary hover:opacity-90 text-primary-foreground font-semibold px-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Analyze Text
                </>
              )}
            </Button>
          </div>
          </div>
        </div>

        {/* Result Card */}
        {result && config && (
          <div className={`mt-8 rounded-2xl border p-6 md:p-8 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500 ${config.bgClass}`}>
            <div className="flex items-center gap-3 mb-4">
              <config.icon className={`w-8 h-8 ${config.colorClass}`} />
              <div>
                <h3 className={`text-xl font-bold ${config.colorClass}`}>{config.label}</h3>
                <p className="text-sm text-muted-foreground">
                  Confidence: {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            <p className="text-foreground/80 leading-relaxed">{result.explanation}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default AnalyzerSection;
