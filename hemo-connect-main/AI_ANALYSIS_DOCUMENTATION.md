# AI Analysis in HEMO LINK - Technical Documentation

## Overview

HEMO LINK uses AI in two primary areas:
1. **AI-Powered Donor Matching** - Intelligent analysis to suggest best donor matches for blood requests
2. **AI Chatbot** - Conversational assistant for answering questions about the platform

---

## 1. AI-Powered Donor Matching Analysis

### Location
**File**: `supabase/functions/suggest-donors/index.ts`

### How It Works

#### Step 1: Data Collection
```typescript
// 1. Fetch blood request details
- Patient information
- Blood group required
- Units needed
- Urgency level (normal/urgent/critical)
- Hospital ID

// 2. Fetch matching donors
- Hospital-managed donors (from 'donors' table)
- Registered donor users (from 'profiles' table)
- Both filtered by matching blood group (case-insensitive)
```

#### Step 2: Data Preparation & Enrichment
```typescript
// For each donor, calculate:
- daysSinceLastDonation: Number of days since last donation
- isEligible: Boolean (90 days for normal, 60 days for urgent/critical)
- donationCount: Total number of donations
- location: Donor's location
- isHospitalManaged: Type of donor (hospital-managed or registered user)
```

#### Step 3: Deduplication
- Uses `Set` data structures to track `user_id` and `phone` numbers
- Prevents the same donor from appearing twice (e.g., if they're both hospital-managed and registered)

#### Step 4: AI Prompt Construction
The system creates a structured prompt containing:

```
Blood Request Details:
- Patient name
- Blood group required
- Units needed
- Urgency level
- Contact information

Available Donors Data:
- All matching donors with:
  * Name, phone, location
  * Donation count
  * Days since last donation
  * Eligibility status
  * Donor type (hospital-managed or registered)
```

#### Step 5: AI Analysis Request
```typescript
AI Prompt Structure:
"You are an AI assistant helping to match blood donors for emergency requests.

Analyze these donors and rank the top 5 best matches based on:
1. Eligibility (must have waited at least 90 days since last donation)
2. Donation history (higher donation count = more reliable)
3. Recent availability (fewer days since last donation within eligible range)
4. Location proximity (if available)

Provide analysis with:
- Donor ID
- Reasoning for ranking (2-3 sentences)
- Match score (0-100)"
```

#### Step 6: AI Provider Selection
Supports three AI providers:
- **OpenAI**: `gpt-4o-mini` (default) or configurable model
- **Google Gemini**: `gemini-1.5-flash` (default) or configurable
- **Anthropic Claude**: `claude-3-5-sonnet-20241022` (default) or configurable

**Configuration:**
- Provider selected via `AI_PROVIDER` environment variable
- API key stored in `HEMO_AI_API_KEY` environment variable

#### Step 7: AI Response Processing
```typescript
// AI returns:
- Structured analysis of top 5 matches
- Reasoning for each recommendation
- Match scores (0-100)
- Detailed explanations

// System processes:
- Parses AI response
- Combines with donor data
- Sorts eligible donors first
- Returns enriched suggestions
```

#### Step 8: Fallback Sorting (if AI unavailable)
```typescript
// Heuristic-based sorting:
1. Eligibility priority (eligible donors first)
2. Donation count (higher = better)
3. Days since last donation (within eligible range, lower = better)
```

### Analysis Factors

The AI considers these factors:

1. **Eligibility Status**
   - Normal requests: 90+ days since last donation
   - Urgent/Critical: 60+ days since last donation
   - Never donated: Always eligible

2. **Donation History**
   - Total donation count (higher = more reliable/experienced)
   - Indicates commitment and reliability

3. **Recency**
   - Days since last donation (within eligible range)
   - Donors who are newly eligible may be more likely to respond

4. **Location**
   - Geographic proximity to hospital
   - Closer donors = faster response time

5. **Donor Type**
   - Hospital-managed vs. registered users
   - Historical response patterns (if available)

---

## 2. AI Chatbot Analysis

### Location
**File**: `supabase/functions/chat/index.ts`

### How It Works

#### Step 1: System Prompt Engineering
The system uses a comprehensive system prompt that includes:

```
1. Platform Identity
   - "You are HEMO LINK AI Assistant"
   - Scope limitation (only HEMO LINK topics)

2. Complete Feature Documentation
   - Donor Management (detailed description)
   - Real-Time Inventory (features)
   - Emergency Alerts (process)
   - Smart Matching (AI-powered)
   - Certificate Generation (automation)
   - Blood Request Management
   - Donation Recording
   - User Roles & Dashboards

3. Blood Donation Rules
   - Eligibility requirements (age, weight, health, intervals)
   - Blood group compatibility matrix
   - Alert eligibility (56-day rule)

4. Usage Instructions
   - How to use each portal
   - Registration procedures
   - Platform workflows
```

#### Step 2: Message Processing
```typescript
// Input: User's chat message
// Process:
1. Prepend system prompt to conversation
2. Maintain conversation history
3. Format according to provider requirements
```

#### Step 3: Provider-Specific Formatting

**OpenAI Format:**
```typescript
{
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ],
  stream: true
}
```

**Google Gemini Format:**
```typescript
{
  contents: [
    { role: "user", parts: [{ text: "System Instructions: ..." }] },
    { role: "user", parts: [{ text: userMessage }] }
  ]
}
```

**Anthropic Claude Format:**
```typescript
{
  model: "claude-3-5-sonnet-20241022",
  system: systemPrompt,
  messages: [{ role: "user", content: userMessage }],
  stream: true
}
```

#### Step 4: Streaming Response
- **OpenAI & Anthropic**: Native streaming support
- **Google Gemini**: Simulated streaming (chunked word-by-word)

#### Step 5: Response Filtering
The AI is instructed to:
- ✅ Answer questions about HEMO LINK features
- ✅ Provide blood donation information
- ✅ Explain eligibility rules
- ❌ Decline unrelated questions (general knowledge, other topics)

---

## Technical Implementation Details

### API Integration

#### OpenAI Integration
```typescript
Endpoint: https://api.openai.com/v1/chat/completions
Method: POST
Headers:
  - Authorization: Bearer {HEMO_AI_API_KEY}
  - Content-Type: application/json
Body:
  - model: OPENAI_MODEL (default: gpt-4o-mini)
  - messages: Array of {role, content}
  - stream: true (for streaming)
```

#### Google Gemini Integration
```typescript
Endpoint: https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
Method: POST
Headers:
  - Content-Type: application/json
Query: ?key={HEMO_AI_API_KEY}
Body:
  - contents: Array of {role, parts: [{text}]}
```

#### Anthropic Claude Integration
```typescript
Endpoint: https://api.anthropic.com/v1/messages
Method: POST
Headers:
  - x-api-key: {HEMO_AI_API_KEY}
  - anthropic-version: 2023-06-01
  - Content-Type: application/json
Body:
  - model: ANTHROPIC_MODEL (default: claude-3-5-sonnet-20241022)
  - system: systemPrompt
  - messages: Array of {role, content}
  - stream: true
```

### Environment Variables

```bash
AI_PROVIDER=openai|google|anthropic
HEMO_AI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o-mini (optional)
GOOGLE_MODEL=gemini-1.5-flash (optional)
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022 (optional)
```

### Error Handling

```typescript
// AI API errors:
- 401/403: Invalid API key
- 429: Rate limit exceeded
- 500: Server error

// Fallback behavior:
- Donor Matching: Falls back to heuristic-based sorting
- Chatbot: Returns error message to user
```

---

## Data Flow Diagram

### Donor Matching AI Analysis

```
1. Hospital creates blood request
   ↓
2. Hospital clicks "AI Match" button
   ↓
3. Frontend calls suggest-donors edge function
   ↓
4. Edge function:
   a. Fetches request details
   b. Fetches matching donors (hospital-managed + registered)
   c. Enriches data (calculates eligibility, days since donation)
   d. Deduplicates donors
   e. Constructs AI prompt with structured data
   ↓
5. Sends prompt to AI provider (OpenAI/Gemini/Claude)
   ↓
6. AI analyzes and returns:
   - Top 5 ranked matches
   - Reasoning for each match
   - Match scores
   ↓
7. Edge function:
   a. Parses AI response
   b. Combines with donor details
   c. Sorts results (eligible first)
   d. Returns to frontend
   ↓
8. Frontend displays:
   - AI analysis text
   - Ranked donor list
   - Donor details and match scores
```

### Chatbot AI Analysis

```
1. User types question in chat interface
   ↓
2. Frontend sends message to chat edge function
   ↓
3. Edge function:
   a. Prepends system prompt (with all HEMO LINK features)
   b. Formats messages for selected AI provider
   c. Adds conversation history
   ↓
4. Sends to AI provider (OpenAI/Gemini/Claude)
   ↓
5. AI processes:
   a. Checks if question is about HEMO LINK
   b. If yes: Answers using system prompt knowledge
   c. If no: Politely declines
   ↓
6. AI streams response back
   ↓
7. Frontend displays:
   - Streaming text (real-time)
   - Formatted response
```

---

## AI Analysis Strengths

1. **Context-Aware**: AI receives complete request context and donor data
2. **Multi-Factor Analysis**: Considers eligibility, history, location, and recency
3. **Explanatory**: Provides reasoning for recommendations (not just scores)
4. **Flexible**: Supports multiple AI providers
5. **Robust**: Falls back to heuristic sorting if AI unavailable
6. **Specialized**: Chatbot is trained only on HEMO LINK features

---

## Limitations & Considerations

1. **API Dependencies**: Requires valid API keys and internet connectivity
2. **Rate Limits**: Subject to provider rate limits
3. **Cost**: AI API calls incur usage costs
4. **Latency**: Network requests add delay (mitigated by streaming)
5. **Data Privacy**: Donor data sent to external AI providers (anonymized where possible)

---

## Future Enhancements

1. **Caching**: Cache AI responses for similar requests
2. **Local Models**: Consider on-premise models for data privacy
3. **Enhanced Scoring**: More sophisticated scoring algorithms
4. **Learning**: Track which matches succeed to improve recommendations
5. **Multi-language**: Support for multiple languages in chatbot

