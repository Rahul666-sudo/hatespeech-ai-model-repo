import { AlertOctagon, AlertTriangle, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const outputs = [
  {
    label: "Clean",
    detail: "No action required",
    icon: ShieldCheck,
    color: "text-primary",
  },
  {
    label: "Offensive",
    detail: "Warning label",
    icon: AlertTriangle,
    color: "text-warning",
  },
  {
    label: "Hate speech",
    detail: "Hidden in chat",
    icon: AlertOctagon,
    color: "text-destructive",
  },
];

const features = [
  {
    title: "AI classification",
    desc: "A hosted language model labels the text and returns a short, plain-language explanation.",
  },
  {
    title: "Real-time feedback",
    desc: "Results come back as soon as the model responds — no page reload, no extra steps.",
  },
  {
    title: "Three-tier output",
    desc: "Clean, offensive, or hate speech. Every result is labeled, explained, and easy to scan.",
  },
];

const HeroSection = () => {
  return (
    <section className="px-5 pb-16 pt-28 sm:px-8 sm:pt-32">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
        <div>
          <p className="eyebrow">AI-powered safety layer</p>
          <h1 className="display mt-5 max-w-4xl text-[clamp(2.9rem,7.2vw,6rem)] text-foreground">
            Detect hate speech.
            <br />
            Before it reaches
            <br />
            <span className="text-primary">the conversation.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            HateGuard AI reads a message in three tiers — hate speech, offensive, or clean — and
            explains the call in plain language.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#analyzer"
              className="inline-flex h-11 items-center gap-2 rounded-sm bg-primary px-5 font-heading text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              Try the analyzer
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <Link
              to="/chat"
              className="inline-flex h-11 items-center rounded-sm border border-border px-5 font-heading text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              Open chat
            </Link>
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            No account required for analysis
          </p>
        </div>

        <aside className="border border-border bg-card/40" aria-label="Detection output tiers">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="eyebrow">Detection output</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
              3 tiers
            </span>
          </div>

          <div className="divide-y divide-border">
            {outputs.map((item) => (
              <div key={item.label} className="flex items-center gap-4 px-5 py-4">
                <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-heading text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  0{outputs.indexOf(item) + 1}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 divide-x divide-border border-t border-border">
            <div className="p-5">
              <p className="font-heading text-4xl font-black tracking-tight text-foreground">03</p>
              <p className="eyebrow mt-2">Classes</p>
            </div>
            <div className="p-5">
              <p className="font-heading text-4xl font-black tracking-tight text-primary">24h</p>
              <p className="eyebrow mt-2">Block window</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mx-auto mt-20 grid max-w-6xl gap-px border border-border bg-border sm:grid-cols-3">
        {features.map((item, index) => (
          <article key={item.title} className="bg-background p-6 sm:p-8">
            <span className="font-mono text-[11px] text-muted-foreground">0{index + 1}</span>
            <h2 className="mt-5 font-heading text-lg font-semibold tracking-tight text-foreground">
              {item.title}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {item.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
