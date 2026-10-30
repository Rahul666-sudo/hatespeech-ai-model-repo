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
          content: `You are a multi-category content moderation AI for a chat app. Analyze the message and classify it into one or more of these categories:
1. "Hate Speech" - targets protected groups (race, ethnicity, religion, gender, sexual orientation, disability, nationality, etc.).
2. "Personal Insults" - targeted verbal abuse, disparaging remarks, harassment, or derogatory comments aimed at demeaning a person.
3. "Threats" - statements declaring intent to inflict bodily injury, physical violence, harm, or death against an individual or group.
4. "Non-harmful Content" - friendly, benign, casual, or constructive communication.
5. "Offensive" - vulgarity, profanity, crude language, or abrasive comments.
6. "Clean" - benign, casual, or constructive communication.

Classification rules:
- Text can belong to one or more categories (e.g., both "Hate Speech" and "Personal Insults", or both "Personal Insults" and "Threats", or "Offensive").
- If harmful/offensive, assign all applicable categories. If benign, assign ["Non-harmful Content", "Clean"] or ["Non-harmful Content"].`,
        },
        { role: "user", content: `Classify this chat message:\n\n"${text}"` },
      ],
      tools: [{
        type: "function",
        function: {
          name: "classify_speech",
          description: "Classify text for content moderation into one or more categories",
          parameters: {
            type: "object",
            properties: {
              categories: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["Hate Speech", "Personal Insults", "Threats", "Non-harmful Content", "Offensive", "Clean"]
                },
                description: "All matching moderation categories"
              },
              classification: {
                type: "string",
                description: "Comma-separated list of matched categories"
              },
              confidence: { type: "number", minimum: 0, maximum: 1 },
            },
            required: ["categories", "confidence"],
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
  let parsed: any;
  if (args) {
    parsed = JSON.parse(args);
  } else {
    const content = data.choices?.[0]?.message?.content || "";
    const match = content.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  }
  if (!parsed) throw Object.assign(new Error("Detector returned no result"), { status: 502 });

  const rawCats: string[] = Array.isArray(parsed.categories) && parsed.categories.length > 0
    ? parsed.categories
    : parsed.classification
      ? [parsed.classification]
      : ["Non-harmful Content"];

  const categories = rawCats.filter((c: string) =>
    ["Hate Speech", "Personal Insults", "Threats", "Non-harmful Content", "Offensive", "Clean"].includes(c)
  );
  if (categories.length === 0) categories.push("Non-harmful Content");

  const classification = categories.join(", ");
  const confidence = Number(parsed.confidence) || null;
  return { classification, confidence, categories };
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

    const { classification, confidence, categories } = await classify(text, Deno.env.get("LOVABLE_API_KEY")!);

    let messageData: any;
    const { data: insertedMessage, error: insertError } = await admin
      .from("messages")
      .insert({ sender_id: user.id, receiver_id: receiverId, content: text, classification, confidence })
      .select()
      .single();

    if (insertError) {
      // Graceful fallback if database still enforces legacy check constraint ('clean','offensive','hate_speech')
      if (insertError.message?.includes("classification")) {
        const legacyClassification = categories.includes("Hate Speech")
          ? "hate_speech"
          : (categories.includes("Personal Insults") || categories.includes("Threats") || categories.includes("Offensive"))
            ? "offensive"
            : "clean";
        const retry = await admin
          .from("messages")
          .insert({ sender_id: user.id, receiver_id: receiverId, content: text, classification: legacyClassification, confidence })
          .select()
          .single();
        if (retry.error) throw retry.error;
        messageData = retry.data;
        messageData.classification = classification;
      } else {
        throw insertError;
      }
    } else {
      messageData = insertedMessage;
    }

    const flagged = categories.some((c: string) => c !== "Non-harmful Content" && c !== "Clean");
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

    return json({ message: messageData, flagged, strikes, strike_limit: STRIKE_LIMIT, blocked_until, categories });
  } catch (e) {
    console.error("send-message error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, (e as any)?.status ?? 500);
  }
});
