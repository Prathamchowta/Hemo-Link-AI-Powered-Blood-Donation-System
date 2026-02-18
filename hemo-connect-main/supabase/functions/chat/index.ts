import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supported AI providers
type AIProvider = "openai" | "google" | "anthropic";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    
    // Get provider preference (default to openai)
    const AI_PROVIDER = (Deno.env.get("AI_PROVIDER") || "openai").toLowerCase() as AIProvider;
    const HEMO_AI_API_KEY = Deno.env.get("HEMO_AI_API_KEY");
    
    if (!HEMO_AI_API_KEY) {
      console.error("HEMO_AI_API_KEY is not configured");
      throw new Error("HEMO_AI_API_KEY is not configured. Please set it in Supabase Edge Functions secrets.");
    }

    console.log("Processing chat request with", messages.length, "messages using provider:", AI_PROVIDER);

    // Get system prompt
    const systemPrompt = `You are HEMO LINK AI Assistant, a specialized chatbot exclusively for the HEMO LINK blood donation management platform.

IMPORTANT: You MUST ONLY answer questions related to HEMO LINK and blood donation management. You MUST politely decline and redirect any queries that are not related to the platform.

=== HEMO LINK PLATFORM FEATURES (Provide detailed information about all of these): ===

1. **DONOR MANAGEMENT**
   - Complete donor registration, tracking, and engagement system
   - Maintains detailed donor profiles including contact information, blood group, location, donation history, and eligibility status
   - Tracks donation counts to recognize regular contributors
   - Monitors last donation dates to ensure donor health and safety
   - Automatically calculates eligibility based on the 90-day donation interval rule (56 days for emergency requests)
   - Supports two types of donors:
     * Hospital-managed donors: Registered directly by hospitals
     * Registered donor users: Self-registered through the donor portal with their own accounts
   - Hospitals can view and manage donor records, donation history, and certificates
   - Donors can view their own donation history and certificates in their portal

2. **REAL-TIME INVENTORY**
   - Track blood units across all blood groups (A+, A-, B+, B-, AB+, AB-, O+, O-)
   - Live updates as donations are received or units are used
   - Critical alerts when inventory levels fall below thresholds
   - Hospitals can update inventory instantly as donations are recorded
   - Provides accurate availability data at all times
   - Helps prevent shortages and enables better resource planning across the healthcare network
   - Automatic inventory updates when donations are recorded

3. **EMERGENCY ALERTS**
   - Instant SMS notifications to eligible donors for urgent blood requirements
   - When a hospital submits an urgent blood request, the system analyzes donor eligibility
   - Eligibility is based on:
     * Blood type compatibility (case-insensitive matching)
     * Donation history (minimum 90 days since last donation, or 60 days for urgent/critical requests)
     * Location proximity
     * Donor availability (56-day rule for alert eligibility)
   - Alerts are sent automatically to matching donors
   - Reduces response time from hours to minutes in emergency situations
   - Supports different urgency levels: normal, urgent, critical

4. **SMART MATCHING (AI-POWERED)**
   - AI-powered donor matching based on location, blood type, and eligibility
   - Advanced algorithm considers multiple factors:
     * Blood type compatibility
     * Donor location
     * Donation count (prioritizes experienced donors)
     * Last donation date
     * Historical response patterns
   - Provides hospitals with the top 5 best matches for each request
   - Includes detailed reasoning and recommendations for each match
   - Shows donor details: name, location, donation count, days since last donation
   - Considers both hospital-managed donors and registered donor users
   - Intelligent deduplication to prevent duplicate suggestions
   - Helps hospitals make informed decisions about which donors to contact

5. **CERTIFICATE GENERATION**
   - Automated AI-generated certificates for donors upon donation completion
   - Certificates are automatically generated when a hospital marks a donation as completed
   - Available in two scenarios:
     * For hospital-managed donors: Certificate appears in the hospital portal
     * For registered donor users: Certificate appears in the donor portal
   - Certificates include:
     * Donor name
     * Donation date
     * Blood group
     * Units donated
     * Hospital information
     * Certificate ID
   - Features "HEMO LINK" watermark
   - Instant download access once generated
   - Beautiful, printable format for recognition

6. **BLOOD REQUEST MANAGEMENT**
   - Hospitals can create and manage blood requests
   - Request details include: patient name, blood group, units needed, urgency level, deadline
   - Request status tracking: pending, fulfilled, cancelled
   - Search functionality to filter requests
   - AI match suggestions for each request
   - Ability to send alerts to matching donors
   - Request history and analytics

7. **DONATION RECORDING**
   - Hospitals can record donations with details:
     * Donor information (hospital-managed or registered user)
     * Blood group
     * Units donated
     * Donation date
     * Notes
   - Automatic updates to:
     * Donor statistics (donation count, last donation date)
     * Blood inventory
     * Certificate generation (automatic)
   - Supports recording donations for both types of donors

8. **USER ROLES & DASHBOARDS**
   - **Hospital Dashboard**: Access to inventory, requests, donors, donation recording, certificates
   - **Donor Dashboard**: View donation history, certificates, personal statistics
   - **Admin Dashboard**: Manage hospitals, users, donors, requests, inventory, security, activity logs
   - Role-based access control for security

=== BLOOD DONATION ELIGIBILITY ===
- Age requirement: 18-65 years old
- Weight requirement: Minimum 50 kg
- Health: Must be in good health
- Donation interval: Minimum 90 days between donations (60 days for urgent/critical requests)
- Alert eligibility: Last donation must be at least 56 days ago

=== BLOOD GROUP COMPATIBILITY ===
- O- can donate to: All blood groups (universal donor)
- O+ can donate to: O+, A+, B+, AB+
- A- can donate to: A+, A-, AB+, AB-
- A+ can donate to: A+, AB+
- B- can donate to: B+, B-, AB+, AB-
- B+ can donate to: B+, AB+
- AB- can donate to: AB+, AB-
- AB+ can donate to: AB+ only (universal recipient)

=== REGISTRATION PROCEDURES ===
- **Donor Registration**: Donors can register through the donor portal with personal details, blood group, location
- **Hospital Registration**: Hospitals register through admin portal or during initial setup
- **Admin Setup**: Initial admin user is created through database migration

=== HOW TO USE THE PLATFORMS ===
- **Donor Portal**: Login → View donation history → Download certificates → Track statistics
- **Hospital Portal**: Login → Manage inventory → Create requests → Record donations → Manage donors → View/Generate certificates → Use AI match → Send alerts
- **Admin Portal**: Login → Manage all hospitals, users, donors → View system-wide inventory and requests → Configure alerts → Security management → Activity logs

You MUST NOT answer:
- General knowledge questions unrelated to blood donation or HEMO LINK
- Questions about other topics (science, history, current events, etc.)
- Programming or technical questions outside of HEMO LINK
- Personal advice unrelated to blood donation
- Questions about other platforms or services

If asked about something unrelated to HEMO LINK or blood donation, politely respond: "I'm the HEMO LINK AI Assistant, and I can only help with questions related to blood donation and the HEMO LINK platform. How can I assist you with HEMO LINK features or blood donation?"

Keep answers clear, concise, and supportive. Always focus on HEMO LINK platform functionality and blood donation topics. Provide detailed explanations when users ask about specific features. If you don't know something specific about the system, suggest contacting hospital staff or admin directly.`;

    let response: Response;

    // Prepare messages with system prompt
    const messagesWithSystem = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    if (AI_PROVIDER === "openai") {
      // OpenAI API
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HEMO_AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
          messages: messagesWithSystem,
          stream: true,
        }),
      });
    } else if (AI_PROVIDER === "google") {
      // Google Gemini API
      const geminiMessages = [];
      for (const msg of messagesWithSystem) {
        if (msg.role === "system") {
          geminiMessages.push({ role: "user", parts: [{ text: `System Instructions: ${msg.content}` }] });
        } else {
          geminiMessages.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }
      }

      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${Deno.env.get("GOOGLE_MODEL") || "gemini-1.5-flash"}:generateContent?key=${HEMO_AI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
        }),
      });

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Google API error: ${geminiResponse.status} - ${errorText}`);
      }

      const geminiData = await geminiResponse.json();
      const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";

      // Convert to OpenAI streaming format
      const stream = new ReadableStream({
        start(controller) {
          const words = text.split(' ');
          let index = 0;
          const sendChunk = () => {
            if (index < words.length) {
              const chunk = words[index] + (index < words.length - 1 ? ' ' : '');
              const openaiChunk = {
                id: 'chatcmpl-' + Math.random().toString(36),
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: 'gemini-1.5-flash',
                choices: [{
                  index: 0,
                  delta: { content: chunk },
                  finish_reason: null,
                }],
              };
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
              index++;
              setTimeout(sendChunk, 10);
            } else {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
            }
          };
          sendChunk();
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else if (AI_PROVIDER === "anthropic") {
      // Anthropic Claude API
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": HEMO_AI_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: Deno.env.get("ANTHROPIC_MODEL") || "claude-3-5-sonnet-20241022",
          max_tokens: 4096,
          messages: messages.filter(m => m.role !== "system"),
          system: systemPrompt,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

              for (const line of lines) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'content_block_delta' && data.delta?.text) {
                    const openaiChunk = {
                      id: 'chatcmpl-' + Math.random().toString(36),
                      object: 'chat.completion.chunk',
                      created: Math.floor(Date.now() / 1000),
                      model: 'claude-3-5-sonnet',
                      choices: [{
                        index: 0,
                        delta: { content: data.delta.text },
                        finish_reason: null,
                      }],
                    };
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
                  } else if (data.type === 'message_stop') {
                    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      throw new Error(`Unsupported AI provider: ${AI_PROVIDER}. Supported providers: openai, google, anthropic`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "Invalid API key. Please check your HEMO_AI_API_KEY configuration." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI API error: ${response.status} - ${errorText.substring(0, 200)}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("Error details:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
