import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, LogOut, Search, Send, Settings, Shield, ShieldAlert, UserPlus, X } from "lucide-react";
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
    const { data } = await supabase.from("friend_requests").select("*").order("created_at", { ascending: false });
    const rows = data ?? [];
    setRequests(rows);
    const ids = [...new Set(rows.map((r) => (r.sender_id === user.id ? r.receiver_id : r.sender_id)))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      setPeople((prev) => ({ ...prev, ...Object.fromEntries((ps ?? []).map((p) => [p.id, p])) }));
    }
  }, [user]);

  const loadMessages = useCallback(async (friendId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order("created_at");
    setMessages(data ?? []);
  }, [user]);

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
        if (other === activeRef.current) setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => loadRequests())
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
      const { data } = await supabase.from("profiles").select("*").ilike("username", `${q.replace(/[%_]/g, "\\$&")}%`).neq("id", user.id).limit(8);
      setResults(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, user]);

  const relation = (id: string) => requests.find((r) => r.sender_id === id || r.receiver_id === id);
  const friends = useMemo(
    () => requests.filter((r) => r.status === "accepted").map((r) => (r.sender_id === user?.id ? r.receiver_id : r.sender_id)),
    [requests, user]
  );
  const incoming = requests.filter((r) => r.status === "pending" && r.receiver_id === user?.id);
  const outgoing = requests.filter((r) => r.status === "pending" && r.sender_id === user?.id);

  const sendRequest = async (p: Profile) => {
    if (!user) return;
    setPeople((prev) => ({ ...prev, [p.id]: p }));
    const existing = relation(p.id);
    if (existing) {
      if (existing.status === "pending" && existing.receiver_id === user.id) return respond(existing, "accepted");
      if (existing.status === "declined") await supabase.from("friend_requests").delete().eq("id", existing.id);
      else return;
    }
    const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: p.id });
    if (error) toast({ title: "Couldn't send request", description: error.message, variant: "destructive" });
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
    const { data, error } = await supabase.functions.invoke("send-message", { body: { receiverId: activeId, content } });
    setSending(false);
    if (error) {
      let body: any = null;
      try { body = await (error as any).context?.json(); } catch { /* ignore */ }
      if (body?.error === "blocked") {
        toast({ title: "You're temporarily blocked", description: `Too many flagged messages. You can chat again after ${new Date(body.blocked_until).toLocaleString()}.`, variant: "destructive" });
        loadMe();
      } else toast({ title: "Message not sent", description: body?.error ?? error.message, variant: "destructive" });
      return;
    }
    setDraft("");
    setMessages((prev) => (prev.some((x) => x.id === data.message.id) ? prev : [...prev, data.message]));
    if (data.flagged) {
      toast({
        title: `⚠ Flagged as ${label(data.message.classification)}`,
        description: data.blocked_until
          ? `That was strike ${data.strike_limit}. You're blocked from sending until ${new Date(data.blocked_until).toLocaleString()}.`
          : `Your message is hidden from the receiver. Strike ${data.strikes} of ${data.strike_limit}.`,
        variant: "destructive",
      });
      loadMe();
    }
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  const active = activeId ? people[activeId] : null;
  const blocked = me?.blocked_until && new Date(me.blocked_until) > new Date();

  const PersonRow = ({ p, children, onClick }: { p: Profile; children?: React.ReactNode; onClick?: () => void }) => (
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${onClick ? "cursor-pointer hover:bg-secondary" : ""} ${activeId === p.id ? "bg-secondary" : ""}`}>
      <UserAvatar path={p.avatar_url} name={p.display_name || p.username} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{p.display_name || p.username}</p>
        <p className="text-xs text-muted-foreground truncate">@{p.username}</p>
      </div>
      {children}
    </div>
  );

  return (
    <div className="h-[100dvh] bg-background flex flex-col">
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>HateGuard Chat</span>
        </Link>
        <div className="flex items-center gap-1">
          {me && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary" aria-label="Settings">
              <UserAvatar path={me.avatar_url} name={me.display_name || me.username} size={28} />
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="Log out">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className={`${activeId ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-border flex-col min-h-0`}>
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by username" className="pl-9" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {query.trim() && (
              <section>
                <p className="text-xs uppercase tracking-wide text-muted-foreground px-3 mb-1">Search results</p>
                {results.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">No users found</p>}
                {results.map((p) => {
                  const r = relation(p.id);
                  return (
                    <PersonRow key={p.id} p={p}>
                      {r?.status === "accepted" ? (
                        <Button size="sm" variant="secondary" onClick={() => { setPeople((x) => ({ ...x, [p.id]: p })); setActiveId(p.id); setQuery(""); }}>Chat</Button>
                      ) : r?.status === "pending" && r.sender_id === user.id ? (
                        <span className="text-xs text-muted-foreground">Requested</span>
                      ) : (
                        <Button size="sm" onClick={() => sendRequest(p)} className="bg-gradient-primary text-primary-foreground">
                          <UserPlus className="w-4 h-4" /> {r?.status === "pending" ? "Accept" : "Add"}
                        </Button>
                      )}
                    </PersonRow>
                  );
                })}
              </section>
            )}

            {incoming.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-wide text-muted-foreground px-3 mb-1">Requests</p>
                {incoming.map((r) => people[r.sender_id] && (
                  <PersonRow key={r.id} p={people[r.sender_id]}>
                    <Button size="icon" className="h-8 w-8 bg-gradient-primary text-primary-foreground" onClick={() => respond(r, "accepted")} aria-label="Accept"><Check className="w-4 h-4" /></Button>
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => respond(r, "declined")} aria-label="Decline"><X className="w-4 h-4" /></Button>
                  </PersonRow>
                ))}
              </section>
            )}

            <section>
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-3 mb-1">Chats</p>
              {friends.length === 0 && <p className="text-sm text-muted-foreground px-3 py-2">Search a username above to send your first request.</p>}
              {friends.map((id) => people[id] && <PersonRow key={id} p={people[id]} onClick={() => setActiveId(id)} />)}
            </section>

            {outgoing.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-wide text-muted-foreground px-3 mb-1">Sent requests</p>
                {outgoing.map((r) => people[r.receiver_id] && (
                  <PersonRow key={r.id} p={people[r.receiver_id]}>
                    <span className="text-xs text-muted-foreground">Pending</span>
                  </PersonRow>
                ))}
              </section>
            )}
          </div>
        </aside>

        <main className={`${activeId ? "flex" : "hidden md:flex"} flex-1 flex-col min-h-0`}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <ShieldAlert className="w-10 h-10 text-primary mb-3" />
              <p className="text-foreground font-medium">Pick a chat to start talking</p>
              <p className="text-sm text-muted-foreground mt-1">Every message is checked by the HateGuard AI detector.</p>
            </div>
          ) : (
            <>
              <div className="h-14 border-b border-border flex items-center gap-3 px-3 shrink-0">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setActiveId(null)} aria-label="Back"><ArrowLeft className="w-4 h-4" /></Button>
                <UserAvatar path={active.avatar_url} name={active.display_name || active.username} size={34} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{active.display_name || active.username}</p>
                  <p className="text-xs text-muted-foreground">@{active.username}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && <p className="text-center text-sm text-muted-foreground mt-8">Say hi 👋</p>}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  const flagged = m.classification !== "clean";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[80%]">
                        <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                          flagged ? "border border-destructive/60 bg-destructive/10 text-foreground" : mine ? "bg-gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                        }`}>
                          {m.content}
                        </div>
                        {flagged && (
                          <p className={`text-[11px] text-destructive mt-1 flex items-center gap-1 ${mine ? "justify-end" : ""}`}>
                            <ShieldAlert className="w-3 h-3" />
                            {mine ? `Flagged as ${label(m.classification)} — hidden from receiver` : `Flagged as ${label(m.classification)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-3 border-t border-border flex gap-2 shrink-0">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  disabled={!!blocked}
                  placeholder={blocked ? `Blocked until ${new Date(me!.blocked_until!).toLocaleString()}` : "Type a message"}
                />
                <Button type="submit" size="icon" disabled={sending || !draft.trim() || !!blocked} className="bg-gradient-primary text-primary-foreground shrink-0" aria-label="Send">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </form>
            </>
          )}
        </main>
      </div>

      {me && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} me={me} onSaved={loadMe} />}
    </div>
  );
};

export default Chat;
