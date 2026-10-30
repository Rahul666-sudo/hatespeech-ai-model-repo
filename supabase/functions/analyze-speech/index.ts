import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a multi-category content moderation AI model. Analyze the given text and classify it into one or more of the following specific categories:
1. "Hate Speech" - Content attacking, disparaging, or inciting hatred against protected groups based on race, ethnicity, religion, gender, sexual orientation, disability, nationality, etc.
2. "Personal Insults" - Targeted verbal abuse, derogatory name-calling, harassment, or personal attacks demeaning an individual.
3. "Threats" - Statements declaring intent to inflict bodily injury, physical violence, harm, or death against an individual or group.
4. "Non-harmful Content" - Content that does not contain any hate speech, personal insults, or threats (e.g. neutral communication, friendly conversation, constructive discussion).
5. "Offensive" - Profanity, vulgarity, or coarse language that is offensive or abrasive.
6. "Clean" - Completely benign, appropriate, and safe communication.

Classification rules:
- Text can belong to one or more categories simultaneously (e.g., both "Hate Speech" and "Personal Insults", or both "Personal Insults" and "Threats", or "Offensive").
- If any harmful/offensive category applies, assign all applicable categories to "categories" and do NOT include "Non-harmful Content" or "Clean".
- If and only if no harmful category applies, assign ["Non-harmful Content", "Clean"] or ["Non-harmful Content"].

Respond ONLY with valid JSON in this exact format:
{
  "categories": ["<category>", ...],
  "classification": "<comma-separated list of categories>",
  "confidence": <number between 0.0 and 1.0>,
  "explanation": "<brief factual explanation of why the text matches the categories>"
}`
          },
          { role: "user", content: `Analyze this text for content moderation:\n\n"${text}"` }
        ],
        tools: [
          {
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
                      enum: [
                        "Hate Speech",
                        "Personal Insults",
                        "Threats",
                        "Non-harmful Content",
                        "Offensive",
                        "Clean"
                      ]
                    },
                    description: "One or more matched moderation categories"
                  },
                  classification: {
                    type: "string",
                    description: "Comma-separated list of matched categories or primary category"
                  },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                  explanation: { type: "string" }
                },
                required: ["categories", "confidence", "explanation"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_speech" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let result: any;
    if (toolCall) {
      result = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try to parse from content
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    }

    if (!result) {
      throw new Error("Could not parse AI response");
    }

    // Normalize categories to ensure consistent array format
    if (!result.categories || !Array.isArray(result.categories) || result.categories.length === 0) {
      result.categories = result.classification ? [result.classification] : ["Non-harmful Content"];
    }
    if (!result.classification) {
      result.classification = result.categories.join(", ");
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-speech error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
