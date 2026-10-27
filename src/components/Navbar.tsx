import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const sections = [
  { id: "analyzer", label: "Analyzer" },
  { id: "team", label: "Team" },
];

const Navbar = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 border-b bg-background transition-colors duration-200 ${
        scrolled ? "border-border" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-heading text-sm font-bold tracking-tight text-foreground">
            HateGuard <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-3">
          <div className="hidden items-center gap-1 sm:flex">
            {sections.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={activeSection === id ? "true" : undefined}
                className={`rounded-sm px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                  activeSection === id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </a>
            ))}
          </div>

          <span className="mx-1 hidden h-4 w-px bg-border sm:block" />

          <Link
            to={user ? "/chat" : "/auth"}
            className="inline-flex h-9 items-center rounded-sm bg-primary px-4 font-heading text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
          >
            {user ? "Open chat" : "Log in"}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
