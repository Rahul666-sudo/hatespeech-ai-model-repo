import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  LogOut,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import UserAvatar from "@/components/chat/UserAvatar";
import SettingsDialog from "@/components/chat/SettingsDialog";

type Profile = Tables<"profiles">;
type Request = Tables<"friend_requests">;
type Message = Tables<"messages">;

const label = (c: string) => (c === "hate_speech" ? "hate speech" : "offensive language");

const sectionLabel = "px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground";

const Chat = () => {
  const { user, loading } = useAuth();
  const [me, setMe] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [people, setPeople] = useState<Record<string, Profile>>({});
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const loadMe = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (data) setMe(data);
  }, [user]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("friend_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    setRequests(rows);
    const ids = [
      ...new Set(rows.map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id))),
    ];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      setPeople((prev) => ({
        ...prev,
        ...Object.fromEntries((ps ?? []).map((p) => [p.id, p])),
      }));
    }
  }, [user]);

  const loadMessages = useCallback(
    async (friendId: string) => {
      if (!user) return;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
        )
        .order("created_at");
      setMessages(data ?? []);
    },
    [user]
  );

  useEffect(() => {
    loadMe();
    loadRequests();
  }, [loadMe, loadRequests]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages, me?.detector_enabled]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("chat-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const m = payload.new as Message;
        const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (other === activeRef.current)
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () =>
        loadRequests()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadRequests]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || !user) return setResults([]);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", `${q.replace(/[%_]/g, "\\$&")}%`)
        .neq("id", user.id)
        .limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, user]);

  const relation = (id: string) => requests.find((r) => r.sender_id === id || r.receiver_id === id);
  const friends = useMemo(
    () =>
      requests
        .filter((r) => r.status === "accepted")
        .map((r) => (r.sender_id === user?.id ? r.receiver_id : r.sender_id)),
    [requests, user]
  );
  const incoming = requests.filter((r) => r.status === "pending" && r.receiver_id === user?.id);
  const outgoing = requests.filter((r) => r.status === "pending" && r.sender_id === user?.id);

  const sendRequest = async (p: Profile) => {
    if (!user) return;
    setPeople((prev) => ({ ...prev, [p.id]: p }));
    const existing = relation(p.id);
    if (existing) {
      if (existing.status === "pending" && existing.receiver_id === user.id)
        return respond(existing, "accepted");
      if (existing.status === "declined")
        await supabase.from("friend_requests").delete().eq("id", existing.id);
      else return;
    }
    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: p.id });
    if (error)
      toast({ title: "Couldn't send request", description: error.message, variant: "destructive" });
    else toast({ title: `Request sent to @${p.username}` });
    loadRequests();
  };

  const respond = async (r: Request, status: "accepted" | "declined") => {
    await supabase.from("friend_requests").update({ status }).eq("id", r.id);
    loadRequests();
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeId || sending) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-message", {
      body: { receiverId: activeId, content },
    });
    setSending(false);
    if (error) {
      let body: any = null;
      try {
        body = await (error as any).context?.json();
      } catch {
        /* ignore */
      }
      if (body?.error === "blocked") {
        toast({
          title: "You're temporarily blocked",
          description: `Too many flagged messages. You can chat again after ${new Date(
            body.blocked_until
          ).toLocaleString()}.`,
          variant: "destructive",
        });
        loadMe();
      } else
        toast({
          title: "Message not sent",
          description: body?.error ?? error.message,
          variant: "destructive",
        });
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((x) => x.id === data.message.id) ? prev : [...prev, data.message]));
    if (data.flagged) {
      toast({
        title: `Flagged as ${label(data.message.classification)}`,
        description: data.blocked_until
          ? `That was strike ${data.strike_limit}. You're blocked from sending until ${new Date(
              data.blocked_until
            ).toLocaleString()}.`
          : `Your message is hidden from the receiver. Strike ${data.strikes} of ${data.strike_limit}.`,
        variant: "destructive",
      });
      loadMe();
    }
  };

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;

  const active = activeId ? people[activeId] : null;
  const blocked = me?.blocked_until && new Date(me.blocked_until) > new Date();

  const PersonRow = ({
    p,
    children,
    onClick,
  }: {
    p: Profile;
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`flex items-center gap-3 rounded-sm border border-transparent px-2.5 py-2 transition-colors ${
        onClick ? "cursor-pointer hover:bg-secondary" : ""
      } ${
        activeId === p.id ? "border-border bg-secondary" : ""
      } ${onClick ? "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary" : ""}`}
    >
      <UserAvatar path={p.avatar_url} name={p.display_name || p.username} size={34} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-semibold text-foreground">
          {p.display_name || p.username}
        </p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">@{p.username}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-heading text-sm font-bold tracking-tight text-foreground">
            HateGuard <span className="text-muted-foreground">Chat</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {me && (
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              aria-label="Settings"
            >
              <UserAvatar path={me.avatar_url} name={me.display_name || me.username} size={26} />
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => supabase.auth.signOut()}
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`${
            activeId ? "hidden md:flex" : "flex"
          } w-full min-h-0 flex-col border-r border-border md:w-80`}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username"
                className="h-9 pl-9"
                aria-label="Search by username"
              />
            </div>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-2">
            {query.trim() && (
              <section>
                <p className={sectionLabel}>Search results</p>
                {results.length === 0 && (
                  <p className="px-2 py-2 text-sm text-muted-foreground">No users found</p>
                )}
                {results.map((p) => {
                  const r = relation(p.id);
                  return (
                    <PersonRow key={p.id} p={p}>
                      {r?.status === "accepted" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setPeople((x) => ({ ...x, [p.id]: p }));
                            setActiveId(p.id);
                            setQuery("");
                          }}
                        >
                          Chat
                        </Button>
                      ) : r?.status === "pending" && r.sender_id === user.id ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Requested
                        </span>
                      ) : (
                        <Button size="sm" onClick={() => sendRequest(p)}>
                          <UserPlus className="h-4 w-4" aria-hidden="true" />
                          {r?.status === "pending" ? "Accept" : "Add"}
                        </Button>
                      )}
                    </PersonRow>
                  );
                })}
              </section>
            )}

            {incoming.length > 0 && (
              <section>
                <p className={sectionLabel}>Requests</p>
                {incoming.map(
                  (r) =>
                    people[r.sender_id] && (
                      <PersonRow key={r.id} p={people[r.sender_id]}>
                        <Button
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => respond(r, "accepted")}
                          aria-label="Accept"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8"
                          onClick={() => respond(r, "declined")}
                          aria-label="Decline"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </PersonRow>
                    )
                )}
              </section>
            )}

            <section>
              <p className={sectionLabel}>Chats</p>
              {friends.length === 0 && (
                <p className="px-2 py-2 text-sm leading-relaxed text-muted-foreground">
                  Search a username above to send your first request.
                </p>
              )}
              {friends.map(
                (id) =>
                  people[id] && (
                    <PersonRow key={id} p={people[id]} onClick={() => setActiveId(id)} />
                  )
              )}
            </section>

            {outgoing.length > 0 && (
              <section>
                <p className={sectionLabel}>Sent requests</p>
                {outgoing.map(
                  (r) =>
                    people[r.receiver_id] && (
                      <PersonRow key={r.id} p={people[r.receiver_id]}>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          Pending
                        </span>
                      </PersonRow>
                    )
                )}
              </section>
            )}
          </div>
        </aside>

        <main className={`${activeId ? "flex" : "hidden md:flex"} min-h-0 flex-1 flex-col`}>
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-sm border border-border text-primary">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="mt-4 font-heading text-lg font-semibold text-foreground">
                Pick a chat to start talking
              </p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Every message is checked by the HateGuard detector before it reaches the other
                side.
              </p>
            </div>
          ) : (
            <>
              <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 md:hidden"
                  onClick={() => setActiveId(null)}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <UserAvatar
                  path={active.avatar_url}
                  name={active.display_name || active.username}
                  size={34}
                />
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-semibold text-foreground">
                    {active.display_name || active.username}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    @{active.username}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-6">
                {messages.length === 0 && (
                  <p className="mt-8 text-center text-sm text-muted-foreground">
                    No messages yet. Say hello.
                  </p>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  const flagged = m.classification !== "clean";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[85%]">
                        <div
                          className={`rounded-sm border px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                            flagged
                              ? "border-destructive/50 bg-card text-foreground"
                              : mine
                                ? "border-primary/40 bg-secondary text-foreground"
                                : "border-border bg-card text-foreground"
                          }`}
                        >
                          {m.content}
                        </div>
                        {flagged && (
                          <p
                            className={`mt-1 flex items-center gap-1 text-[11px] text-red-400 ${
                              mine ? "justify-end" : ""
                            }`}
                          >
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            {mine
                              ? `Flagged as ${label(m.classification)} — hidden from receiver`
                              : `Flagged as ${label(m.classification)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-border p-3">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  disabled={!!blocked}
                  aria-label="Message"
                  placeholder={
                    blocked ? `Blocked until ${new Date(me!.blocked_until!).toLocaleString()}` : "Type a message"
                  }
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sending || !draft.trim() || !!blocked}
                  className="h-10 w-10 shrink-0"
                  aria-label="Send"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Send className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              </form>
            </>
          )}
        </main>
      </div>

      {me && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          me={me}
          onSaved={loadMe}
        />
      )}
    </div>
  );
};

export default Chat;
