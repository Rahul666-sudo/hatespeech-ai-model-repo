import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const facts = [
  "Three-tier message classification",
  "Flagged messages hidden from the receiver",
  "Three strikes, then a 24-hour block",
];

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate("/chat");
  }, [user, navigate]);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const u = username.trim().toLowerCase();
        if (!/^[a-z0-9_]{3,20}$/.test(u))
          throw new Error("Username must be 3–20 characters: letters, numbers or _");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
            data: { username: u, display_name: username.trim() },
          },
        });
        if (error) {
          if (/database error/i.test(error.message)) throw new Error("That username is already taken");
          throw error;
        }
        if (!data.session)
          setNotice("Check your email and click the confirmation link to finish signing up.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="flex flex-col border-b border-border px-5 py-6 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-10">
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-heading text-sm font-bold tracking-tight text-foreground">
            HateGuard <span className="text-muted-foreground">AI</span>
          </span>
        </Link>

        <div className="hidden flex-1 flex-col justify-center py-16 lg:flex">
          <p className="eyebrow">Safer conversations</p>
          <h1 className="display mt-5 max-w-lg text-6xl text-foreground xl:text-7xl">
            A safer inbox
            <br />
            starts <span className="text-primary">here.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Every message in HateGuard Chat is checked by the detector before it lands. Flagged
            messages stay with the sender, and repeat strikes trigger a cooldown.
          </p>

          <ul className="mt-10 max-w-md space-y-3 border-t border-border pt-6">
            {facts.map((fact) => (
              <li key={fact} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {fact}
              </li>
            ))}
          </ul>
        </div>

        <p className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground lg:block">
          Analysis is advisory · Built with Supabase
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary lg:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to home
          </Link>

          <div className="grid grid-cols-2 gap-1 border border-border p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-sm px-3 py-2 font-heading text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                mode === "login"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-sm px-3 py-2 font-heading text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <h2 className="mt-8 font-heading text-2xl font-bold tracking-tight text-foreground">
            {mode === "login" ? "Welcome back." : "Create your account."}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {mode === "login"
              ? "Sign in to your HateGuard Chat account."
              : "Pick a username and start a safer conversation."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label
                  htmlFor="username"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. rahul_sunny"
                  autoComplete="username"
                  className="h-11"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  3–20 characters. Lowercase letters, numbers, or underscore.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-11"
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="h-11"
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm leading-relaxed text-destructive">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm leading-relaxed text-primary">
                {notice}
              </p>
            )}

            <Button type="submit" className="h-11 w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {mode === "login" ? "Log in" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>

          <Link
            to="/"
            className="mt-10 hidden items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary lg:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Auth;
