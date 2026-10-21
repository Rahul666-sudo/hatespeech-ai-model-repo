import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Strike rule: every flagged message adds 1 strike; reaching STRIKE_LIMIT blocks sending for BLOCK_HOURS, then strikes reset.
const STRIKE_LIMIT = 3;
const BLOCK_HOURS = 24;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function classify(text: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a hate speech detection AI for a chat app. Classify the message into exactly one category:
"hate_speech" - targets protected groups (race, ethnicity, religion, gender, sexual orientation, disability, etc.).
"offensive" - vulgar, insulting, abusive or inappropriate language not targeting protected groups.
"clean" - no hate speech or offensive language. Casual chat, greetings and normal talk are clean.`,
        },
        { role: "user", content: `Classify this chat message:\n\n"${text}"` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_speech",
          description: "Classify text for hate speech detection",
          parameters: {
            type: "object",
            properties: {
              classification: { type: "string", enum: ["hate_speech", "offensive", "clean"] },
              confidence: { type: "number" },
            },
            required: ["classification", "confidence"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "classify_speech" } },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    const err = new Error(res.status === 429 ? "Too many messages right now, try again shortly." : res.status === 402 ? "AI credits exhausted." : "Detector unavailable");
    (err as any).status = res.status === 429 || res.status === 402 ? res.status : 502;
    throw err;
  }
  const data = await res.json();
  const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) throw Object.assign(new Error("Detector returned no result"), { status: 502 });
  const r = JSON.parse(args);
  const c = ["hate_speech", "offensive", "clean"].includes(r.classification) ? r.classification : "clean";
  return { classification: c as string, confidence: Number(r.confidence) || null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const { receiverId, content } = await req.json();
    const text = typeof content === "string" ? content.trim() : "";
    if (!receiverId || typeof receiverId !== "string" || !text) return json({ error: "Message is empty" }, 400);
    if (text.length > 2000) return json({ error: "Message is too long (max 2000 characters)" }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: me } = await admin.from("profiles").select("strikes, blocked_until").eq("id", user.id).single();
    if (me?.blocked_until && new Date(me.blocked_until) > new Date()) {
      return json({ error: "blocked", blocked_until: me.blocked_until }, 403);
    }

    const { data: friendship } = await admin
      .from("friend_requests")
      .select("id")
      .eq("status", "accepted")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
      .maybeSingle();
    if (!friendship) return json({ error: "You can only message people who accepted your request" }, 403);

    const { classification, confidence } = await classify(text, Deno.env.get("LOVABLE_API_KEY")!);

    const { data: message, error } = await admin
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, content: text, classification, confidence })
      .select()
      .single();
    if (error) throw error;

    const flagged = classification !== "clean";
    let strikes = me?.strikes ?? 0;
    let blocked_until: string | null = null;
    if (flagged) {
      strikes += 1;
      if (strikes >= STRIKE_LIMIT) {
        blocked_until = new Date(Date.now() + BLOCK_HOURS * 3600_000).toISOString();
        strikes = 0;
      }
      await admin.from("profiles").update({ strikes, blocked_until }).eq("id", user.id);
    }

    return json({ message, flagged, strikes, strike_limit: STRIKE_LIMIT, blocked_until });
  } catch (e) {
    console.error("send-message error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, (e as any)?.status ?? 500);
  }
});
