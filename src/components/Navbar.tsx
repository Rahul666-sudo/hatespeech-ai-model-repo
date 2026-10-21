import { Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const sections = [
  { id: "analyzer", label: "Try It Now" },
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

    const handleScroll = () => setScrolled(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border/50 transition-colors duration-300 ${scrolled ? "bg-background/95" : "bg-background/80"}`}>
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
            HateGuard AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`text-sm font-medium transition-colors ${
                activeSection === id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </a>
          ))}
          <Link
            to={user ? "/chat" : "/auth"}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-gradient-primary text-primary-foreground"
          >
            {user ? "Chat" : "Login"}
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
