import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="py-12 px-4 border-t border-border/50">
    <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground">HateGuard AI — Making the internet safer</span>
      </div>
      <p className="text-xs text-muted-foreground">
        AI-powered analysis. Results are advisory only.
      </p>
    </div>
  </footer>
);

export default Footer;
