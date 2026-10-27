import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border px-5 py-8 sm:px-8">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-primary text-primary-foreground">
          <Shield className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="font-heading text-sm font-semibold text-foreground">HateGuard AI</span>
      </div>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        AI-assisted analysis. Results are advisory only — always use human judgment.
      </p>
    </div>
  </footer>
);

export default Footer;
